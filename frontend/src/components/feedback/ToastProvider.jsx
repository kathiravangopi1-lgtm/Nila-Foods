import { useCallback, useEffect, useMemo, useState } from 'react'
import SwipeToast from '@/components/SwipeToast'
import { ToastContext } from './toastContext'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [toastTop, setToastTop] = useState(88)

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])
  const showToast = useCallback((message, title = 'Nila Foods', variant = 'info') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, message, title, variant }])
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])
  useEffect(() => {
    const onRestock = (event) => showToast(`${event.detail.join(', ')} ${event.detail.length === 1 ? 'is' : 'are'} back in stock.`, 'Restock update')
    window.addEventListener('nila-restock-available', onRestock)
    return () => window.removeEventListener('nila-restock-available', onRestock)
  }, [showToast])
  useEffect(() => {
    const header = document.querySelector('[data-site-header]')
    if (!header) return undefined

    const updateToastPosition = () => {
      setToastTop(Math.ceil(header.getBoundingClientRect().bottom) + 12)
    }
    updateToastPosition()
    const resizeObserver = new ResizeObserver(updateToastPosition)
    resizeObserver.observe(header)
    window.addEventListener('scroll', updateToastPosition, { passive: true })
    window.addEventListener('resize', updateToastPosition)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', updateToastPosition)
      window.removeEventListener('resize', updateToastPosition)
    }
  }, [])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-3 z-[100] flex w-[min(356px,calc(100vw-1.5rem))] flex-col items-end gap-2 sm:right-6"
        style={{ top: toastTop }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full">
            <SwipeToast
              title={toast.title}
              description={toast.message}
              background={{
                success: '#166534',
                destructive: '#991b1b',
                error: '#991b1b',
                warning: '#92400e',
                info: '#292524',
              }[toast.variant] || '#292524'}
              fuseColor={{
                success: '#86efac',
                destructive: '#fca5a5',
                error: '#fca5a5',
                warning: '#fcd34d',
                info: '#a8a29e',
              }[toast.variant] || '#a8a29e'}
              open
              duration={4500}
              closeButton
              inline
              onClose={() => dismissToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
