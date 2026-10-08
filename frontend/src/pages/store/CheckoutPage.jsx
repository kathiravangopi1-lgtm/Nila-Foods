import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import Stepper from '@/components/Stepper'
import IndianPincodeField from '@/components/address/IndianPincodeField'
import LocationField from '@/components/address/LocationField'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useAuth } from '@/components/auth/authContext'
import { apiRequest } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import { CheckoutSkeleton } from '@/components/ui/Skeleton'

const createCheckoutSession = (forceNew = false) => {
  let id = null
  let storageAvailable = true
  if (!forceNew) {
    try {
      id = sessionStorage.getItem('nila-checkout-session')
    } catch {
      storageAvailable = false
    }
  }

  if (id) return { id, storageAvailable }

  const randomId = globalThis.crypto?.randomUUID?.()
  id = randomId?.replaceAll('-', '') || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    sessionStorage.setItem('nila-checkout-session', id)
  } catch {
    storageAvailable = false
  }
  return { id, storageAvailable }
}

const getCheckoutValue = (key) => {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true)
  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve(true)
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

const toCheckoutAddress = (address) => ({
  recipient: address?.recipient || '',
  phone: address?.phone || '',
  addressLine1: address?.addressLine1 || '',
  addressLine2: address?.addressLine2 || '',
  city: address?.city || '',
  state: address?.state || '',
  postalCode: address?.postalCode || '',
  country: 'India',
})

function CheckoutPage() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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
        ...JSON.parse(getCheckoutValue('nila-checkout-address') || '{}'),
        country: 'India',
      }
    } catch {
      try {
        sessionStorage.removeItem('nila-checkout-address')
      } catch {
        // The in-memory address remains usable when browser storage is unavailable.
      }
      return { recipient: user?.name || '', phone: user?.phone || '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India' }
    }
  })
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false)
  const [paymentOrder, setPaymentOrder] = useState(null)
  const [paymentState, setPaymentState] = useState('idle')
  const [paymentError, setPaymentError] = useState('')
  const [requiresSignIn, setRequiresSignIn] = useState(false)
  const [requiresFreshCheckout, setRequiresFreshCheckout] = useState(false)
  const creatingRef = useRef(false)
  const paymentVerificationStartedRef = useRef(false)
  const [checkoutSession, setCheckoutSession] = useState(createCheckoutSession)
  const checkoutSessionIdRef = useRef(checkoutSession.id)
  const checkoutSessionId = checkoutSession.id
  const [storageWarning, setStorageWarning] = useState(!checkoutSession.storageAvailable)
  const [hasExistingCheckoutOrder, setHasExistingCheckoutOrder] = useState(() => (
    Boolean(getCheckoutValue(`nila-checkout-created-${checkoutSessionId}`))
  ))

  const saveCheckoutValue = (key, value) => {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      setStorageWarning(true)
    }
  }

  const clearCheckoutValue = (key) => {
    try {
      sessionStorage.removeItem(key)
    } catch {
      setStorageWarning(true)
    }
  }

  const rotateCheckoutSession = () => {
    const nextSession = createCheckoutSession(true)
    checkoutSessionIdRef.current = nextSession.id
    setCheckoutSession(nextSession)
    setStorageWarning((current) => current || !nextSession.storageAvailable)
    return nextSession.id
  }

  const cancelUnpaidCheckout = async () => {
    if (!paymentOrder || paymentVerificationStartedRef.current) return
    setPaymentState('cancelling')
    setPaymentError('')
    try {
      const result = await apiRequest('/payments/cancel', {
        method: 'POST',
        token,
        body: JSON.stringify({ orderId: paymentOrder.orderId }),
      })
      clearCheckoutValue('nila-checkout-session')
      clearCheckoutValue(`nila-checkout-created-${checkoutSessionId}`)
      setPaymentOrder(null)
      setHasExistingCheckoutOrder(false)
      setRequiresFreshCheckout(true)
      setPaymentState('cancelled')
      setPaymentError(result.data?.alreadyCancelled
        ? 'This checkout was already cancelled. Your items are available in your cart; create a fresh payment order to try again.'
        : 'Payment was cancelled. Your items have been returned to your cart; create a fresh payment order to try again.')
      const nextSessionId = rotateCheckoutSession()
      clearCheckoutValue(`nila-checkout-created-${nextSessionId}`)
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      navigate('/cart', { replace: true })
    } catch (error) {
      setPaymentState('error')
      setPaymentError(`${error.message} Your order and stock were not changed.`)
    } finally {
      creatingRef.current = false
    }
  }

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
  const defaultSavedAddress = addressesQuery.data?.find((address) => address.isDefault) || addressesQuery.data?.[0]
  const matchingSavedAddress = addressesQuery.data?.find((address) => (
    address.addressLine1 === shippingAddress.addressLine1
    && address.city === shippingAddress.city
    && address.postalCode === shippingAddress.postalCode
  ))
  const effectiveShippingAddress = shippingAddress.addressLine1 || hasSelectedAddress
    ? shippingAddress
    : toCheckoutAddress(defaultSavedAddress)
  const effectiveSelectedAddressId = selectedAddressId || matchingSavedAddress?._id || (
    !hasSelectedAddress && !shippingAddress.addressLine1 ? defaultSavedAddress?._id || '' : ''
  )

  const updatePincodeLocation = ({ city, state }) => {
    setSelectedAddressId('')
    setHasSelectedAddress(true)
    setShippingAddress((current) => {
      const next = { ...(current.addressLine1 ? current : effectiveShippingAddress), city, state, country: 'India' }
      saveCheckoutValue('nila-checkout-address', JSON.stringify(next))
      return next
    })
  }

  const createPaymentOrder = async () => {
    if (creatingRef.current || paymentOrder) return
    if (requiresFreshCheckout) {
      const previousSessionId = checkoutSessionIdRef.current
      clearCheckoutValue(`nila-checkout-created-${previousSessionId}`)
      rotateCheckoutSession()
      setHasExistingCheckoutOrder(false)
    }
    creatingRef.current = true
    setPaymentState('creating')
    setPaymentError('')
    setRequiresSignIn(false)
    setRequiresFreshCheckout(false)
    try {
      const result = await apiRequest('/payments/create-order', {
        method: 'POST',
        token,
        body: JSON.stringify({
          shippingAddress: effectiveShippingAddress,
          checkoutSessionId: checkoutSessionIdRef.current,
        }),
      })
      setPaymentOrder(result.data)
      setPaymentState('ready')
      saveCheckoutValue(`nila-checkout-created-${checkoutSessionIdRef.current}`, 'true')
      setHasExistingCheckoutOrder(true)
    } catch (error) {
      if (error.status === 401) {
        setRequiresSignIn(true)
      }
      const cancelledSession = error.code === 'CHECKOUT_SESSION_CANCELLED'
        || error.message.toLowerCase().includes('checkout session has already been cancelled')
      const gatewayOrderFailed = error.code === 'RAZORPAY_ORDER_CREATION_FAILED'
        || error.message.toLowerCase().includes('razorpay could not create the payment order')
      const rolledBackOrder = cancelledSession || gatewayOrderFailed
      if (rolledBackOrder) {
        const previousSessionId = checkoutSessionIdRef.current
        rotateCheckoutSession()
        clearCheckoutValue(`nila-checkout-created-${previousSessionId}`)
        setHasExistingCheckoutOrder(false)
        setRequiresFreshCheckout(true)
        await queryClient.invalidateQueries({ queryKey: ['cart'] })
        await cartQuery.refetch()
        setPaymentError(cancelledSession
          ? 'The previous checkout was cancelled and your items were returned to your cart. Create a fresh payment order to continue.'
          : `${error.message} The failed reservation was released and your items were returned to your cart. Retry to create a new payment order.`)
      } else {
        setPaymentError(error.message)
      }
      setPaymentState('error')
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
          paymentVerificationStartedRef.current = true
          setPaymentState('processing')
          try {
            const verified = await apiRequest('/payments/verify', {
              method: 'POST',
              token,
              body: JSON.stringify(response),
            })
            clearCheckoutValue('nila-checkout-session')
            clearCheckoutValue(`nila-checkout-created-${checkoutSessionId}`)
            clearCheckoutValue('nila-checkout-address')
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
            if (!paymentVerificationStartedRef.current) {
              void cancelUnpaidCheckout()
            }
          },
        },
      })
      checkout.on('payment.failed', (response) => {
        setPaymentError(response.error?.description || 'Payment failed. Cancelling this unpaid checkout…')
        void cancelUnpaidCheckout()
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
  if (cartQuery.isLoading) return <CheckoutSkeleton />
  if (cartQuery.isError) return <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{cartQuery.error.message}</p>
  if (!cartItems.length && !hasExistingCheckoutOrder && !requiresFreshCheckout) return <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700"><p className="font-bold">Your cart is empty</p><Link to="/products" className="mt-3 inline-flex text-sm font-bold text-emerald-800">Browse products</Link></div>

  const updateAddress = (event) => {
    setSelectedAddressId('')
    setHasSelectedAddress(true)
    setShippingAddress((current) => {
      const next = { ...(current.addressLine1 ? current : effectiveShippingAddress), [event.target.name]: event.target.value }
      saveCheckoutValue('nila-checkout-address', JSON.stringify(next))
      return next
    })
  }
  const updatePostalCode = (postalCode) => {
    setSelectedAddressId('')
    setHasSelectedAddress(true)
    setShippingAddress((current) => {
      const base = current.addressLine1 ? current : effectiveShippingAddress
      const next = {
        ...base,
        postalCode,
        ...(postalCode !== base.postalCode ? { city: '', state: '' } : {}),
        country: 'India',
      }
      saveCheckoutValue('nila-checkout-address', JSON.stringify(next))
      return next
    })
  }
  const updateLocation = (field, value) => {
    setSelectedAddressId('')
    setHasSelectedAddress(true)
    setShippingAddress((current) => {
      const next = {
        ...(current.addressLine1 ? current : effectiveShippingAddress),
        [field]: value,
        ...(field === 'state' ? { city: '' } : {}),
        country: 'India',
      }
      saveCheckoutValue('nila-checkout-address', JSON.stringify(next))
      return next
    })
  }
  const selectSavedAddress = (addressId) => {
    setSelectedAddressId(addressId)
    setHasSelectedAddress(true)
    const address = addressesQuery.data?.find((item) => item._id === addressId)
    const next = address ? toCheckoutAddress(address) : {
      recipient: user?.name || '', phone: user?.phone || '', addressLine1: '', addressLine2: '',
      city: '', state: '', postalCode: '', country: 'India',
    }
    setShippingAddress(next)
    saveCheckoutValue('nila-checkout-address', JSON.stringify(next))
  }
  const addressValid = ['recipient', 'addressLine1', 'city', 'postalCode', 'country'].every((field) => effectiveShippingAddress[field].trim())
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      {storageWarning && (
        <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          This browser can’t save checkout details for later. Your account, cart, and saved addresses remain available.
        </p>
      )}
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
        nextButtonClassName="!rounded-xl !bg-emerald-800 !px-6 !py-3 !font-bold hover:!bg-emerald-900"
        backButtonClassName="!text-stone-600 dark:!text-stone-300"
        stepCircleContainerClassName="!max-w-none !rounded-2xl !bg-white !shadow-sm dark:!bg-stone-900"
        stepContainerClassName="!p-5 sm:!p-7"
        contentClassName="!px-5 !pb-3 sm:!px-7"
        footerClassName="!px-5 !pb-6 sm:!px-7"
        nextButtonProps={{ type: 'button', disabled: paymentState === 'creating' || paymentState === 'processing' || paymentState === 'cancelling' || (currentStep === 1 && !addressValid) || (currentStep === 2 && !paymentOrder) }}
        backButtonProps={{ type: 'button' }}
        backButtonText="Back"
      >
        <div className="space-y-4 p-4 sm:p-6">
          <div><h2 className="text-lg font-bold">1. Delivery address</h2><p className="mt-1 text-xs text-stone-500">We’ll use this address for your order.</p></div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <SearchableSelect
                label="Choose a saved address"
                value={effectiveSelectedAddressId}
                onValueChange={selectSavedAddress}
                options={(addressesQuery.data || []).map((address) => ({
                  value: address._id,
                  label: `${address.recipient} — ${address.addressLine1}, ${address.city}${address.isDefault ? ' (Default)' : ''}`,
                }))}
                placeholder="Search saved addresses…"
                emptyText="No saved addresses. Enter a new address below."
                disabled={Boolean(paymentOrder)}
              />
            </div>
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
                <Input name={name} required={required} disabled={Boolean(paymentOrder)} value={effectiveShippingAddress[name]} onChange={updateAddress} />
              </label>
            ))}
            <IndianPincodeField
              value={effectiveShippingAddress.postalCode}
              onValueChange={updatePostalCode}
              onLocationResolved={updatePincodeLocation}
              disabled={Boolean(paymentOrder)}
            />
            <LocationField
              level="state"
              label="State / province"
              value={effectiveShippingAddress.state}
              onValueChange={(value) => updateLocation('state', value)}
              disabled={Boolean(paymentOrder)}
            />
            <LocationField
              level="city"
              label="City"
              state={effectiveShippingAddress.state}
              value={effectiveShippingAddress.city}
              onValueChange={(value) => updateLocation('city', value)}
              required
              disabled={Boolean(paymentOrder)}
            />
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <div><h2 className="text-lg font-bold">2. Review order</h2><p className="mt-1 text-xs text-stone-500">The server calculates the total from current product prices.</p></div>
          <div className="space-y-2 px-1 py-2">
            {cartItems.map(({ product, quantity, lineTotal }) => <div key={product._id} className="flex justify-between gap-3 text-sm"><span className="truncate">{product.name} × {quantity}</span><strong>{formatMoney(lineTotal, product.currency)}</strong></div>)}
            <div className="border-t border-stone-300 pt-3 dark:border-stone-800">
              <div className="flex justify-between font-extrabold"><span>Estimated total</span><span>{formatMoney(subtotal, cartItems[0]?.product.currency || 'INR')}</span></div>
              <p className="mt-1 text-xs text-stone-500">Shipping and tax are currently ₹0. Payment is handled by Razorpay Test Mode.</p>
            </div>
          </div>
          {paymentState === 'creating' && <p role="status" className="text-sm text-stone-500">Creating your order and reserving stock…</p>}
          {paymentError && (
            <Alert variant="destructive" title="Payment setup needs attention">
              {paymentError}
              {requiresSignIn ? (
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    navigate('/login', { replace: true, state: { from: '/checkout' } })
                  }}
                  className="ml-2 cursor-pointer font-bold underline"
                >
                  Sign in again
                </button>
              ) : !paymentOrder && (
                <button type="button" onClick={createPaymentOrder} className="ml-2 cursor-pointer font-bold underline">
                  {requiresFreshCheckout ? 'Create a fresh payment order' : 'Retry preparation'}
                </button>
              )}
            </Alert>
          )}
          {!paymentOrder && paymentState !== 'creating' && !paymentError && <p className="text-sm text-stone-500">Your payment order is prepared securely when you continue from this step.</p>}
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <div><h2 className="text-lg font-bold">3. Secure payment</h2><p className="mt-1 text-xs text-stone-500">Choose UPI, card, or net banking in Razorpay Checkout.</p></div>
          {paymentOrder && <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/40"><p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Order total</p><p className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-200">{formatMoney(paymentOrder.amount / 100, paymentOrder.currency)}</p><p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">Order #{paymentOrder.orderId.slice(-8)}</p></div>}
          {paymentState === 'processing' && <p role="status" className="text-sm text-stone-600 dark:text-stone-300">Waiting for secure payment confirmation…</p>}
          {paymentState === 'cancelling' && <p role="status" className="text-sm text-stone-600 dark:text-stone-300">Cancelling checkout and returning items to your cart…</p>}
          {paymentOrder && paymentState !== 'processing' && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">Continue to the next step to open Razorpay Checkout.</p>}
          <button
            type="button"
            onClick={() => paymentOrder ? void cancelUnpaidCheckout() : navigate('/cart')}
            disabled={paymentState === 'cancelling'}
            className="block w-full cursor-pointer text-center text-xs font-semibold text-stone-500 hover:text-emerald-800 disabled:cursor-wait"
          >
            {paymentOrder ? 'Cancel payment and return to cart' : 'Return to cart'}
          </button>
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
