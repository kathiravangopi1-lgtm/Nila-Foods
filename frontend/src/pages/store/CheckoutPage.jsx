import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import Stepper from '@/components/Stepper'
import IndianPincodeField from '@/components/address/IndianPincodeField'
import LocationField from '@/components/address/LocationField'
import { useAuth } from '@/components/auth/authContext'
import { apiRequest } from '@/lib/api'
import { formatMoney } from '@/lib/format'

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true)
  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve(true)
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

function CheckoutPage() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [shippingAddress, setShippingAddress] = useState(() => {
    try {
      return {
        recipient: user?.name || '',
        phone: user?.phone || '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        ...JSON.parse(sessionStorage.getItem('nila-checkout-address') || '{}'),
        country: 'India',
      }
    } catch {
      sessionStorage.removeItem('nila-checkout-address')
      return { recipient: user?.name || '', phone: user?.phone || '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India' }
    }
  })
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [paymentOrder, setPaymentOrder] = useState(null)
  const [paymentState, setPaymentState] = useState('idle')
  const [paymentError, setPaymentError] = useState('')
  const creatingRef = useRef(false)
  const [checkoutSessionId] = useState(() => (
    sessionStorage.getItem('nila-checkout-session') || crypto.randomUUID().replaceAll('-', '')
  ))
  const [hasExistingCheckoutOrder, setHasExistingCheckoutOrder] = useState(() => (
    Boolean(sessionStorage.getItem(`nila-checkout-created-${checkoutSessionId}`))
  ))

  useEffect(() => {
    sessionStorage.setItem('nila-checkout-session', checkoutSessionId)
  }, [checkoutSessionId])

  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiRequest('/cart', { token }).then((result) => result.data),
    enabled: Boolean(user),
  })
  const addressesQuery = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiRequest('/auth/addresses', { token }).then((result) => result.data),
    enabled: Boolean(user),
  })
  const cartItems = cartQuery.data?.items || []
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0)

  const updatePincodeLocation = useCallback(({ city, state }) => {
    setSelectedAddressId('')
    setShippingAddress((current) => {
      const next = { ...current, city, state, country: 'India' }
      sessionStorage.setItem('nila-checkout-address', JSON.stringify(next))
      return next
    })
  }, [])

  const createPaymentOrder = async () => {
    if (creatingRef.current || paymentOrder) return
    creatingRef.current = true
    setPaymentState('creating')
    setPaymentError('')
    sessionStorage.setItem(`nila-checkout-created-${checkoutSessionId}`, 'true')
    setHasExistingCheckoutOrder(true)
    try {
      const result = await apiRequest('/payments/create-order', {
        method: 'POST',
        token,
        body: JSON.stringify({ shippingAddress, checkoutSessionId }),
      })
      setPaymentOrder(result.data)
      setPaymentState('ready')
    } catch (error) {
      setPaymentState('error')
      setPaymentError(error.message)
    } finally {
      creatingRef.current = false
    }
  }

  const startPayment = async () => {
    if (!paymentOrder || creatingRef.current) return
    creatingRef.current = true
    setPaymentState('opening')
    setPaymentError('')
    try {
      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Could not load Razorpay Checkout. Check your network and try again.')
      const checkout = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Nila Foods',
        description: 'Herbal products order',
        order_id: paymentOrder.razorpayOrderId,
        prefill: {
          name: paymentOrder.prefill.name,
          email: user.email,
          contact: paymentOrder.prefill.contact,
        },
        notes: { orderId: paymentOrder.orderId },
        theme: { color: '#166534' },
        handler: async (response) => {
          setPaymentState('processing')
          try {
            const verified = await apiRequest('/payments/verify', {
              method: 'POST',
              token,
              body: JSON.stringify(response),
            })
            sessionStorage.removeItem('nila-checkout-session')
            sessionStorage.removeItem(`nila-checkout-created-${checkoutSessionId}`)
            sessionStorage.removeItem('nila-checkout-address')
            navigate(`/orders/${paymentOrder.orderId}?paid=1`, { replace: true, state: { order: verified.data } })
          } catch (error) {
            setPaymentState('error')
            setPaymentError(error.message)
          } finally {
            creatingRef.current = false
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentState('cancelled')
            setPaymentError('Checkout was closed before payment confirmation.')
            creatingRef.current = false
          },
        },
      })
      checkout.on('payment.failed', (response) => {
        setPaymentState('failed')
        setPaymentError(response.error?.description || 'Payment failed. Please try again.')
        creatingRef.current = false
      })
      checkout.open()
      setPaymentState('processing')
    } catch (error) {
      setPaymentState('error')
      setPaymentError(error.message)
      creatingRef.current = false
    }
  }

  if (!user) return <div className="rounded-2xl border border-stone-300 bg-white p-6 text-center dark:border-stone-800 dark:bg-stone-900"><p className="font-bold">Sign in to checkout</p><Link to="/login" className="mt-3 inline-flex rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white">Sign in</Link></div>
  if (cartQuery.isLoading) return <p className="py-14 text-center text-sm text-stone-500">Loading checkout…</p>
  if (cartQuery.isError) return <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{cartQuery.error.message}</p>
  if (!cartItems.length && !hasExistingCheckoutOrder) return <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700"><p className="font-bold">Your cart is empty</p><Link to="/products" className="mt-3 inline-flex text-sm font-bold text-emerald-800">Browse products</Link></div>

  const updateAddress = (event) => {
    setSelectedAddressId('')
    setShippingAddress((current) => {
      const next = { ...current, [event.target.name]: event.target.value }
      sessionStorage.setItem('nila-checkout-address', JSON.stringify(next))
      return next
    })
  }
  const updatePostalCode = (postalCode) => {
    setSelectedAddressId('')
    setShippingAddress((current) => {
      const next = {
        ...current,
        postalCode,
        ...(postalCode !== current.postalCode ? { city: '', state: '' } : {}),
        country: 'India',
      }
      sessionStorage.setItem('nila-checkout-address', JSON.stringify(next))
      return next
    })
  }
  const updateLocation = (field, value) => {
    setSelectedAddressId('')
    setShippingAddress((current) => {
      const next = {
        ...current,
        [field]: value,
        ...(field === 'state' ? { city: '' } : {}),
        country: 'India',
      }
      sessionStorage.setItem('nila-checkout-address', JSON.stringify(next))
      return next
    })
  }
  const selectSavedAddress = (event) => {
    const addressId = event.target.value
    setSelectedAddressId(addressId)
    const address = addressesQuery.data?.find((item) => item._id === addressId)
    if (!address) return
    const next = {
      recipient: address.recipient || '',
      phone: address.phone || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: 'India',
    }
    setShippingAddress(next)
    sessionStorage.setItem('nila-checkout-address', JSON.stringify(next))
  }
  const addressValid = ['recipient', 'addressLine1', 'city', 'postalCode', 'country'].every((field) => shippingAddress[field].trim())
  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-black text-stone-950 dark:text-white sm:text-3xl">Checkout</h1>
        <p className="mt-1 text-sm text-stone-500">Add a delivery address, review your order, and pay securely.</p>
      </div>
      <Stepper
        initialStep={1}
        className="!min-h-0 !flex-none !items-stretch !justify-start !p-0 !aspect-auto sm:!aspect-auto md:!aspect-auto"
        onStepChange={(step) => { setCurrentStep(step); if (step === 2) createPaymentOrder() }}
        onFinalStepCompleted={startPayment}
        disableStepIndicators
        nextButtonText="Continue"
        completeButtonText="Pay now"
        nextButtonClassName="!bg-emerald-800 !px-5 !py-2.5 !font-bold hover:!bg-emerald-900"
        backButtonClassName="!text-stone-600 dark:!text-stone-300"
        stepCircleContainerClassName="!max-w-full !rounded-2xl !bg-white !shadow-sm dark:!bg-stone-900"
        stepContainerClassName="!p-4 sm:!p-6"
        contentClassName="!px-4 !pb-2 sm:!px-6"
        footerClassName="!px-4 !pb-5 sm:!px-6"
        nextButtonProps={{ type: 'button', disabled: paymentState === 'creating' || paymentState === 'processing' || (currentStep === 1 && !addressValid) || (currentStep === 2 && !paymentOrder) }}
        backButtonProps={{ type: 'button' }}
        backButtonText="Back"
      >
        <div className="space-y-4">
          <div><h2 className="text-lg font-bold">1. Delivery address</h2><p className="mt-1 text-xs text-stone-500">We’ll use this address for your order.</p></div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 space-y-2">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">Choose a saved address</span>
              <select
                value={selectedAddressId}
                onChange={selectSavedAddress}
                disabled={Boolean(paymentOrder)}
                className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 dark:border-stone-700 dark:bg-stone-950 dark:text-white"
              >
                <option value="">Choose saved address or enter a new one</option>
                {(addressesQuery.data || []).map((address) => (
                  <option key={address._id} value={address._id}>
                    {address.recipient} — {address.addressLine1}, {address.city}{address.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <Link to="/account" className="min-h-11 inline-flex items-center text-xs font-semibold text-emerald-800 hover:underline dark:text-emerald-300">
              Manage saved addresses
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['recipient', 'Full name', true], ['phone', 'Phone number', false],
              ['addressLine1', 'Address line 1', true], ['addressLine2', 'Address line 2', false],
            ].map(([name, label, required]) => (
              <label key={name} className={`space-y-1.5 ${name.startsWith('addressLine') ? 'sm:col-span-2' : ''}`}>
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{label}{required ? ' *' : ''}</span>
                <input name={name} required={required} disabled={Boolean(paymentOrder)} value={shippingAddress[name]} onChange={updateAddress} className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 disabled:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:text-white dark:disabled:bg-stone-900" />
              </label>
            ))}
            <IndianPincodeField
              value={shippingAddress.postalCode}
              onValueChange={updatePostalCode}
              onLocationResolved={updatePincodeLocation}
              disabled={Boolean(paymentOrder)}
            />
            <LocationField
              level="state"
              label="State / province"
              value={shippingAddress.state}
              onValueChange={(value) => updateLocation('state', value)}
              disabled={Boolean(paymentOrder)}
            />
            <LocationField
              level="city"
              label="City"
              state={shippingAddress.state}
              value={shippingAddress.city}
              onValueChange={(value) => updateLocation('city', value)}
              required
              disabled={Boolean(paymentOrder)}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div><h2 className="text-lg font-bold">2. Review order</h2><p className="mt-1 text-xs text-stone-500">The server calculates the total from current product prices.</p></div>
          <div className="space-y-2 rounded-xl bg-stone-50 p-4 dark:bg-stone-950">
            {cartItems.map(({ product, quantity, lineTotal }) => <div key={product._id} className="flex justify-between gap-3 text-sm"><span className="truncate">{product.name} × {quantity}</span><strong>{formatMoney(lineTotal, product.currency)}</strong></div>)}
            <div className="border-t border-stone-300 pt-3 dark:border-stone-800">
              <div className="flex justify-between font-extrabold"><span>Estimated total</span><span>{formatMoney(subtotal, cartItems[0]?.product.currency || 'INR')}</span></div>
              <p className="mt-1 text-xs text-stone-500">Shipping and tax are currently ₹0. Payment is handled by Razorpay Test Mode.</p>
            </div>
          </div>
          {paymentState === 'creating' && <p role="status" className="text-sm text-stone-500">Creating your order and reserving stock…</p>}
          {paymentError && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{paymentError}{!paymentOrder && <button type="button" onClick={createPaymentOrder} className="ml-2 font-bold underline">Retry</button>}</div>}
          {!paymentOrder && <button type="button" onClick={createPaymentOrder} disabled={!addressValid || paymentState === 'creating'} className="min-h-11 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white disabled:opacity-40">{paymentState === 'creating' ? 'Preparing…' : 'Prepare secure payment'}</button>}
        </div>
        <div className="space-y-4">
          <div><h2 className="text-lg font-bold">3. Secure payment</h2><p className="mt-1 text-xs text-stone-500">Choose UPI, card, or net banking in Razorpay Checkout.</p></div>
          {paymentOrder && <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/40"><p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Order total</p><p className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-200">{formatMoney(paymentOrder.amount / 100, paymentOrder.currency)}</p><p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">Order #{paymentOrder.orderId.slice(-8)}</p></div>}
          {paymentState === 'processing' && <p role="status" className="text-sm text-stone-600 dark:text-stone-300">Waiting for secure payment confirmation…</p>}
          {paymentOrder && paymentState !== 'processing' && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">Continue to the next step to open Razorpay Checkout.</p>}
          <Link to="/cart" className="block text-center text-xs font-semibold text-stone-500 hover:text-emerald-800">Return to cart</Link>
        </div>
      </Stepper>
      {['failed', 'cancelled', 'error'].includes(paymentState) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
          <p role="alert" className="text-sm text-rose-800 dark:text-rose-200">{paymentError}</p>
          <button type="button" onClick={startPayment} disabled={!paymentOrder} className="mt-3 min-h-11 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white disabled:opacity-40">Try payment again</button>
        </div>
      )}
      {paymentState === 'processing' && <p role="status" className="text-center text-sm text-stone-500">Waiting for Razorpay payment confirmation…</p>}
    </section>
  )
}

export default CheckoutPage
