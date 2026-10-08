import { Paperclip, X } from 'lucide-react'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileAttachmentList({ files = [], onRemove }) {
  if (!files.length) return null
  return (
    <ul aria-label="Selected image attachments" className="mt-2 grid gap-2 sm:grid-cols-2">
      {files.map((file, index) => (
        <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs dark:border-stone-700 dark:bg-stone-950">
          <Paperclip aria-hidden="true" className="size-4 shrink-0 text-emerald-800 dark:text-emerald-300" />
          <span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span>
          <span className="shrink-0 text-stone-500">{formatSize(file.size)}</span>
          {onRemove && (
            <button type="button" aria-label={`Remove ${file.name}`} onClick={() => onRemove(index)} className="grid size-7 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40">
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

export default FileAttachmentList
