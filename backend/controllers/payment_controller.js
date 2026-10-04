const Order = require('../models/order');
const { createCheckoutOrder } = require('../services/checkout_service');
const {
  createGatewayOrder,
  fetchPayment,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} = require('../services/razorpay_service');

const requiredAddressFields = ['recipient', 'addressLine1', 'city', 'postalCode', 'country'];

const createPaymentOrder = async (req, res, next) => {
  const { shippingAddress, checkoutSessionId } = req.body || {};
  if (
    !shippingAddress
    || requiredAddressFields.some((field) => (
      typeof shippingAddress[field] !== 'string' || !shippingAddress[field].trim()
    ))
  ) {
    return res.status(400).json({
      error: `shippingAddress must include ${requiredAddressFields.join(', ')}.`,
    });
  }
  if (
    typeof checkoutSessionId !== 'string'
    || !/^[a-zA-Z0-9_-]{16,100}$/.test(checkoutSessionId)
  ) {
    return res.status(400).json({ error: 'A valid checkoutSessionId is required.' });
  }

  try {
    if (
      !process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')
      || !process.env.RAZORPAY_KEY_SECRET
    ) {
      const error = new Error('Razorpay Test Mode credentials are not configured.');
      error.status = 503;
      throw error;
    }
    const { order } = await createCheckoutOrder({
      userId: req.user.id,
      shippingAddress,
      checkoutSessionId,
    });
    if (order.paymentStatus === 'paid') {
      return res.status(200).json({
        message: 'This order has already been paid.',
        data: { orderId: order._id, paymentStatus: order.paymentStatus },
      });
    }

    let gatewayOrderId = order.razorpayOrderId;
    if (!gatewayOrderId) {
      const amount = Math.round(order.total * 100);
      if (!Number.isSafeInteger(amount) || amount < 100) {
        return res.status(400).json({ error: 'Order total must be at least ₹1.00.' });
      }
      const gatewayOrder = await createGatewayOrder({
        amount,
        receipt: `nila-${order._id}`,
        notes: { orderId: order._id.toString(), customerId: req.user.id },
      });
      gatewayOrderId = gatewayOrder.id;
      order.razorpayOrderId = gatewayOrderId;
      await order.save();
    }

    return res.status(201).json({
      data: {
        orderId: order._id,
        razorpayOrderId: gatewayOrderId,
        amount: Math.round(order.total * 100),
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        prefill: {
          name: shippingAddress.recipient,
          contact: shippingAddress.phone || '',
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  const { razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: signature } = req.body || {};
  if (
    typeof razorpayOrderId !== 'string'
    || typeof razorpayPaymentId !== 'string'
    || typeof signature !== 'string'
  ) {
    return res.status(400).json({ error: 'Razorpay order, payment, and signature values are required.' });
  }

  try {
    const order = await Order.findOne({
      user: req.user.id,
      razorpayOrderId,
    });
    if (!order) {
      return res.status(404).json({ error: 'Payment order not found for this account.' });
    }
    if (order.paymentStatus === 'paid') {
      if (order.razorpayPaymentId !== razorpayPaymentId) {
        return res.status(409).json({ error: 'This order is already paid with a different payment.' });
      }
      return res.status(200).json({ message: 'Payment already verified.', data: order });
    }
    if (!verifyCheckoutSignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature })) {
      return res.status(400).json({ error: 'Razorpay payment signature is invalid.' });
    }

    const payment = await fetchPayment(razorpayPaymentId);
    if (
      payment.order_id !== razorpayOrderId
      || payment.amount !== Math.round(order.total * 100)
      || payment.currency !== 'INR'
    ) {
      return res.status(400).json({ error: 'Payment details do not match the order.' });
    }
    if (payment.status !== 'captured') {
      return res.status(409).json({ error: 'Payment has not been captured yet. Please wait for confirmation.' });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, user: req.user.id, paymentStatus: { $ne: 'paid' } },
      {
        $set: {
          paymentStatus: 'paid',
          paymentMethod: payment.method,
          razorpayPaymentId,
          paymentSignature: signature,
          paidAt: new Date(),
          status: 'confirmed',
        },
      },
      { new: true, runValidators: true },
    );
    if (!updatedOrder) {
      const currentOrder = await Order.findOne({ _id: order._id, user: req.user.id });
      if (currentOrder?.razorpayPaymentId === razorpayPaymentId && currentOrder.paymentStatus === 'paid') {
        return res.status(200).json({ message: 'Payment already verified.', data: currentOrder });
      }
      return res.status(409).json({ error: 'Order payment state changed; reload and check your orders.' });
    }
    return res.status(200).json({ message: 'Payment verified.', data: updatedOrder });
  } catch (error) {
    return next(error);
  }
};

const processPaymentWebhook = async (req, res, next) => {
  const signature = req.get('x-razorpay-signature');
  try {
    if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) {
      return res.status(400).json({ error: 'Invalid Razorpay webhook signature.' });
    }
  } catch (error) {
    return next(error);
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch (error) {
    return res.status(400).json({ error: 'Invalid Razorpay webhook payload.' });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment || !['payment.captured', 'payment.failed'].includes(event.event)) {
    return res.status(200).json({ received: true, ignored: true });
  }
  if (typeof payment.order_id !== 'string' || typeof payment.id !== 'string') {
    return res.status(400).json({ error: 'Razorpay webhook is missing payment identifiers.' });
  }

  try {
    const order = await Order.findOne({ razorpayOrderId: payment.order_id });
    if (!order) {
      return res.status(200).json({ received: true, ignored: true });
    }
    if (event.event === 'payment.captured') {
      if (payment.amount !== Math.round(order.total * 100) || payment.currency !== 'INR') {
        return res.status(400).json({ error: 'Captured payment amount does not match the order.' });
      }
      await Order.updateOne(
        { _id: order._id, paymentStatus: { $ne: 'paid' } },
        {
          $set: {
            paymentStatus: 'paid',
            paymentMethod: payment.method,
            razorpayPaymentId: payment.id,
            paidAt: new Date(payment.created_at * 1000),
            status: 'confirmed',
          },
        },
      );
    } else {
      await Order.updateOne(
        { _id: order._id, paymentStatus: { $nin: ['paid', 'refunded'] } },
        { $set: { paymentStatus: 'failed' } },
      );
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createPaymentOrder, verifyPayment, processPaymentWebhook };
