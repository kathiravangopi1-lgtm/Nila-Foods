var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI must be set in backend/.env.');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters in backend/.env.');
}
var app = express();
const healthRouter = require('./routers/heath_route');
const authRouter = require('./routers/auth_route');
const productRouter = require('./routers/fetch_products');
const categoryRouter = require('./routers/category_route');
const cartRouter = require('./routers/cart_route');
const orderRouter = require('./routers/order_route');
const paymentRouter = require('./routers/payment_route');
const { processPaymentWebhook } = require('./controllers/payment_controller');
const { uploadsDirectory } = require('./middleware/upload_images');

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : '*';

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

app.use(logger('dev'));
app.use(cors({ origin: allowedOrigins }));
app.post(
  '/api/payments/webhook',
  bodyParser.raw({ type: 'application/json' }),
  processPaymentWebhook,
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDirectory));

app.use('/', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/payments', paymentRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 500;
  if (err.name === 'ValidationError' || err.name === 'CastError' || err instanceof SyntaxError) {
    status = 400;
  } else if (err.code === 11000) {
    status = 409;
  } else if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  } else if (err.message && err.message.startsWith('Only JPEG, PNG, WebP, and GIF')) {
    status = 400;
  }
  if (status >= 500) {
    console.error(err);
  }

  return res.status(status).json({
    error: status >= 500 && req.app.get('env') === 'production'
      ? 'Internal Server Error'
      : err.message,
  });
});

module.exports = app;
