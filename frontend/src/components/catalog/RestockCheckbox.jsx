import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import Checkbox from '@/components/ui/Checkbox'
import { useAuth } from '@/components/auth/authContext'
import { useToast } from '@/components/feedback/toastContext'

function RestockCheckbox({ product, compact = false }) {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const isSubscribed = user?.restockProductIds?.includes(product._id) || false
  const updateSubscription = useMutation({
    mutationFn: (enabled) => {
      const ids = new Set(user?.restockProductIds || [])
      if (enabled) ids.add(product._id)
      else ids.delete(product._id)
      return updateProfile({ restockProductIds: [...ids] })
    },
    onSuccess: (_, enabled) => showToast(
      enabled ? 'Your preference is saved. Email delivery is not configured yet.' : 'Your restock email preference was removed.',
      enabled ? 'Restock preference saved' : 'Restock preference removed',
      'success',
    ),
    onError: (error) => showToast(error.message, 'Could not save restock preference', 'error'),
  })

  return (
    <div className={compact ? 'min-w-0' : 'min-w-0 flex-1'}>
      <label className={`flex cursor-pointer items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-200 ${compact ? 'min-h-10' : 'min-h-12 rounded-xl border border-stone-300 bg-stone-50 px-3 dark:border-stone-700 dark:bg-stone-950'}`}>
        <Checkbox
          checked={isSubscribed}
          disabled={updateSubscription.isPending}
          onCheckedChange={(checked) => {
            if (!user) {
              navigate('/login', { state: { from: { pathname: `${location.pathname}${location.search}` } } })
              return
            }
            updateSubscription.mutate(Boolean(checked))
          }}
        />
        <span className="min-w-0">{updateSubscription.isPending ? 'Saving…' : 'Email me when back in stock'}</span>
      </label>
      {!compact && <p className="mt-1.5 text-xs text-stone-500">Preference saved to your account. Email delivery needs a mail service to be configured.</p>}
    </div>
  )
}

export default RestockCheckbox
