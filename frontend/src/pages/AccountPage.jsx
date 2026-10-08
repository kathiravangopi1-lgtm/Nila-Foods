import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/components/auth/authContext'
import { useToast } from '@/components/feedback/toastContext'
import { apiRequest } from '@/lib/api'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import LocationField from '@/components/address/LocationField'
import IndianPincodeField from '@/components/address/IndianPincodeField'

const EMPTY_ADDRESS = {
  recipient: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
}

const addressFields = [
  ['recipient', 'Full name', true],
  ['phone', 'Phone number', true],
  ['addressLine1', 'Address line 1', true],
  ['addressLine2', 'Address line 2', false],
]

function AccountPage() {
  const { user, token, updateProfile } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [addressToRemove, setAddressToRemove] = useState(null)
  const [form, setForm] = useState(EMPTY_ADDRESS)
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
  })

  const addressesQuery = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiRequest('/auth/addresses', { token }).then((result) => result.data),
    enabled: Boolean(token),
  })

  const saveProfile = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      showToast('Your profile details were updated.', 'Profile saved', 'success')
    },
    onError: (error) => showToast(error.message, 'Could not update profile', 'error'),
  })

  const saveAddress = useMutation({
    mutationFn: () => apiRequest(
      editingId ? `/auth/addresses/${editingId}` : '/auth/addresses',
      {
        method: editingId ? 'PATCH' : 'POST',
        token,
        body: JSON.stringify(form),
      },
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      setIsAddressFormOpen(false)
      setEditingId(null)
      setForm(EMPTY_ADDRESS)
      showToast(editingId ? 'Address updated.' : 'Address saved.', 'Address book', 'success')
    },
    onError: (error) => showToast(error.message, 'Could not save address', 'error'),
  })

  const deleteAddress = useMutation({
    mutationFn: (addressId) => apiRequest(`/auth/addresses/${addressId}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      setAddressToRemove(null)
    },
    onError: (error) => showToast(error.message, 'Could not remove address', 'error'),
  })

  const setDefaultAddress = useMutation({
    mutationFn: (address) => apiRequest(`/auth/addresses/${address._id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ ...address, isDefault: true }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (error) => showToast(error.message, 'Could not update default address', 'error'),
  })

  const beginAddAddress = () => {
    setEditingId(null)
    setForm(EMPTY_ADDRESS)
    setIsAddressFormOpen(true)
  }

  const beginEditAddress = (address) => {
    setEditingId(address._id)
    setForm({
      ...Object.fromEntries(addressFields.map(([name]) => [name, address[name] || ''])),
      city: address.city || '',
      state: address.state || '',
      country: address.country || 'India',
    })
    setIsAddressFormOpen(true)
  }

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const updateLocation = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'state' ? { city: '' } : {}),
    }))
  }

  const updatePincodeLocation = useCallback(({ city, state }) => {
    setForm((current) => ({ ...current, city, state, country: 'India' }))
  }, [])
  const updatePostalCode = (postalCode) => {
    setForm((current) => ({
      ...current,
      postalCode,
      ...(postalCode !== current.postalCode ? { city: '', state: '' } : {}),
      country: 'India',
    }))
  }

  const submitAddress = (event) => {
    event.preventDefault()
    saveAddress.mutate()
  }

  const addresses = addressesQuery.data || []

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">Your Nila Foods account</p>
        <h1 className="mt-1 text-2xl font-black text-stone-950 dark:text-white sm:text-3xl">Hello, {user.name}</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { title: 'Your orders', text: 'Track and revisit your orders.', to: '/orders' },
          { title: 'Favourites', text: 'Products saved for later.', to: '/favorites' },
          { title: 'Change password', text: 'Keep your account secure.', to: '/change-password' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="rounded-2xl border border-stone-300 bg-white p-5 transition hover:border-emerald-300 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:hover:border-emerald-900">
            <h2 className="font-bold text-stone-950 dark:text-white">{item.title}</h2>
            <p className="mt-1 text-sm text-stone-500">{item.text}</p>
          </Link>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          saveProfile.mutate(profileForm)
        }}
        className="rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
      >
        <h2 className="font-bold">Account details</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['name', 'Full name', 'text'],
            ['email', 'Email address', 'email'],
            ['phone', 'Phone number', 'tel'],
          ].map(([name, label, type]) => (
            <label key={name} className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
              {label}
              <input
                type={type}
                required={name !== 'phone'}
                autoComplete={name}
                value={profileForm[name]}
                onChange={(event) => setProfileForm((current) => ({ ...current, [name]: event.target.value }))}
                className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-700 dark:border-stone-700 dark:bg-stone-950 dark:text-white"
              />
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={saveProfile.isPending}
          className="mt-4 min-h-10 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          {saveProfile.isPending ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <section className="rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900" aria-labelledby="saved-addresses-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="saved-addresses-heading" className="font-bold">Saved addresses</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Manage delivery addresses for checkout.</p>
          </div>
          {!isAddressFormOpen && (
            <button type="button" onClick={beginAddAddress} className="min-h-10 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900">
              Add address
            </button>
          )}
        </div>

        {addressesQuery.isLoading && <p role="status" className="py-6 text-sm text-stone-500">Loading addresses…</p>}
        {addressesQuery.isError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{addressesQuery.error.message}</p>}
        {addressesQuery.isSuccess && addresses.length === 0 && !isAddressFormOpen && (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
            You have no saved addresses yet.
          </p>
        )}

        {isAddressFormOpen && (
          <form onSubmit={submitAddress} className="mt-5 space-y-4 rounded-xl border border-stone-300 p-4 dark:border-stone-700">
            <h3 className="font-semibold">{editingId ? 'Edit address' : 'Add a delivery address'}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {addressFields.map(([name, label, required]) => (
                <label key={name} className={`flex min-w-0 flex-col gap-2 ${name.startsWith('addressLine') ? 'sm:col-span-2' : ''}`}>
                  <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{label}{required ? ' *' : ''}</span>
                  <input
                    name={name}
                    type="text"
                    autoComplete={name}
                    required={required}
                    value={form[name]}
                    onChange={updateField}
                    className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 dark:border-stone-700 dark:bg-stone-950 dark:text-white"
                  />
                </label>
              ))}
              <IndianPincodeField
                value={form.postalCode}
                onValueChange={updatePostalCode}
                onLocationResolved={updatePincodeLocation}
              />
              <LocationField
                level="state"
                label="State / province"
                value={form.state}
                onValueChange={(value) => updateLocation('state', value)}
              />
              <LocationField
                level="city"
                label="City"
                state={form.state}
                value={form.city}
                onValueChange={(value) => updateLocation('city', value)}
                required
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => { setIsAddressFormOpen(false); setEditingId(null) }} className="min-h-10 rounded-xl border border-stone-300 px-4 text-sm font-semibold dark:border-stone-700">
                Cancel
              </button>
              <button type="submit" disabled={saveAddress.isPending} className="min-h-10 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white disabled:opacity-50">
                {saveAddress.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Save address'}
              </button>
            </div>
          </form>
        )}

        {addresses.length > 0 && (
          <ul className="mt-4 space-y-3">
            {addresses.map((address) => (
              <li key={address._id} className="rounded-xl border border-stone-300 p-4 dark:border-stone-700">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{address.recipient}</h3>
                      {address.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">Default</span>}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">
                      {[address.addressLine1, address.addressLine2, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ')}
                    </p>
                    {address.phone && <p className="mt-1 text-sm text-stone-500">{address.phone}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {!address.isDefault && (
                      <button type="button" disabled={setDefaultAddress.isPending} onClick={() => setDefaultAddress.mutate(address)} className="text-xs font-semibold text-emerald-800 hover:underline dark:text-emerald-300">
                        Set default
                      </button>
                    )}
                    <button type="button" onClick={() => beginEditAddress(address)} className="text-xs font-semibold text-stone-600 hover:underline dark:text-stone-300">
                      Edit
                    </button>
                    <button type="button" disabled={deleteAddress.isPending} onClick={() => setAddressToRemove(address)} className="text-xs font-semibold text-rose-700 hover:underline dark:text-rose-300">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ConfirmationDialog
        open={Boolean(addressToRemove)}
        title="Remove this saved address?"
        description={addressToRemove ? `The address for ${addressToRemove.recipient} will be removed from your account.` : ''}
        confirmLabel="Remove address"
        isPending={deleteAddress.isPending}
        onCancel={() => setAddressToRemove(null)}
        onConfirm={() => addressToRemove && deleteAddress.mutate(addressToRemove._id)}
      />
    </section>
  )
}

export default AccountPage
