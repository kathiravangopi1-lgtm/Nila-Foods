import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isPending = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [onCancel, open])

  return (
    <dialog
      ref={dialogRef}
      onClose={() => { if (open) onCancel() }}
      onClick={(event) => { if (event.target === event.currentTarget) onCancel() }}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-stone-300 bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="confirmation-dialog-title" className="text-lg font-bold">{title}</h2>
            <p id="confirmation-dialog-description" className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="min-h-11 rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            disabled={isPending}
            className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white transition hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default ConfirmationDialog
