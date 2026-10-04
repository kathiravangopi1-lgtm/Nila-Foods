import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/auth/authContext'
import { useToast } from '@/components/feedback/toastContext'
import SelectField from '@/components/ui/SelectField'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { apiRequest } from '@/lib/api'
import { formatMoney, resolveImageUrl } from '@/lib/format'

const emptyForm = { name: '', sku: '', description: '', price: '', stock: '', category: '', imageFiles: null }

function AdminProductsPage() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [productToDeactivate, setProductToDeactivate] = useState(null)
  const [categoryToDeactivate, setCategoryToDeactivate] = useState(null)
  const [error, setError] = useState('')

  const productsQuery = useQuery({
    queryKey: ['products', 'admin'],
    queryFn: () => apiRequest('/products?limit=100', { token }).then((result) => result.data),
  })
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest('/categories').then((result) => result.data),
  })

  const saveProduct = useMutation({
    mutationFn: () => {
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'imageFiles') {
          Array.from(value || []).forEach((file) => body.append('images', file))
        } else if (value !== '' && value !== null) {
          body.append(key, value)
        }
      })
      body.set('currency', 'INR')
      return apiRequest(editingId ? `/products/${editingId}` : '/products', {
        method: editingId ? 'PATCH' : 'POST',
        token,
        body,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setForm(emptyForm)
      setEditingId('')
      setError('')
      showToast(editingId ? 'Product updated.' : 'Product created.', 'Catalog saved', 'success')
    },
    onError: (mutationError) => setError(mutationError.message),
  })
  const deleteProduct = useMutation({
    mutationFn: (id) => apiRequest(`/products/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setProductToDeactivate(null)
      showToast('The product is no longer visible in the shop.', 'Product deactivated', 'destructive')
    },
    onError: (mutationError) => showToast(mutationError.message, 'Could not deactivate product', 'error'),
  })
  const createCategory = useMutation({
    mutationFn: () => apiRequest('/categories', { method: 'POST', token, body: JSON.stringify({ name: categoryName }) }),
    onSuccess: () => {
      setCategoryName('')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      showToast('Category created.', 'Catalog updated', 'success')
    },
    onError: (mutationError) => setError(mutationError.message),
  })
  const deleteCategory = useMutation({
    mutationFn: (categoryId) => apiRequest(`/categories/${categoryId}`, { method: 'DELETE', token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      if (form.category === categoryToDeactivate?._id) {
        setForm((current) => ({ ...current, category: '' }))
      }
      setCategoryToDeactivate(null)
      showToast('Category removed from the active catalog.', 'Category deactivated', 'destructive')
    },
    onError: (mutationError) => showToast(mutationError.message, 'Could not delete category', 'error'),
  })

  const editProduct = (product) => {
    setEditingId(product._id)
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      category: typeof product.category === 'object' ? product.category._id : product.category,
      imageFiles: null,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  return (
    <section className="space-y-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">Admin</p><h1 className="mt-1 text-2xl font-black text-stone-950 dark:text-white sm:text-3xl">Products and categories</h1></div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <form onSubmit={(event) => { event.preventDefault(); saveProduct.mutate() }} className="space-y-4 rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{editingId ? 'Edit product' : 'Add a product'}</h2>{editingId && <button type="button" onClick={() => { setEditingId(''); setForm(emptyForm) }} className="text-sm font-semibold text-stone-500">Cancel edit</button>}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Product name<input required name="name" value={form.name} onChange={updateField} className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3 text-sm dark:border-stone-700 dark:bg-stone-950" /></label>
            <label className="space-y-1.5 text-xs font-semibold">SKU<input required name="sku" value={form.sku} onChange={updateField} className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3 text-sm uppercase dark:border-stone-700 dark:bg-stone-950" /></label>
            <label className="space-y-1.5 text-xs font-semibold">Price (₹)<input required name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={updateField} className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3 text-sm dark:border-stone-700 dark:bg-stone-950" /></label>
            <label className="space-y-1.5 text-xs font-semibold">Stock<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={updateField} className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3 text-sm dark:border-stone-700 dark:bg-stone-950" /></label>
            <SelectField label="Category" value={form.category} options={(categoriesQuery.data || []).map((category) => ({ value: category._id, label: category.name }))} onChange={(category) => setForm((current) => ({ ...current, category }))} placeholder="Choose category" />
            <label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Description<textarea required name="description" rows="3" value={form.description} onChange={updateField} className="mt-1 w-full rounded-xl border border-stone-300 p-3 text-sm dark:border-stone-700 dark:bg-stone-950" /></label>
            <label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Product photos<input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => setForm((current) => ({ ...current, imageFiles: event.target.files }))} className="mt-1 block min-h-11 w-full rounded-xl border border-stone-300 p-2 text-sm dark:border-stone-700" /><span className="block font-normal text-stone-500">Up to 8 images, 5 MB each. Existing photos are retained when editing.</span></label>
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
          <button disabled={saveProduct.isPending || !form.category} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white disabled:opacity-50"><Plus className="size-4" />{saveProduct.isPending ? 'Saving…' : editingId ? 'Save product' : 'Create product'}</button>
        </form>

        <form onSubmit={(event) => { event.preventDefault(); createCategory.mutate() }} className="rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-lg font-bold">Product categories</h2>
          <p className="mt-1 text-sm text-stone-500">Add a category before assigning products.</p>
          <div className="mt-4 flex gap-2">
            <input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Herbal oils" className="h-11 min-w-0 flex-1 rounded-xl border border-stone-300 px-3 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <button disabled={createCategory.isPending} className="rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white">Add</button>
          </div>
          <ul className="mt-4 space-y-2">
            {categoriesQuery.data?.map((category) => (
              <li key={category._id} className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2 text-sm dark:bg-stone-950">
                <span className="min-w-0 flex-1 truncate">{category.name}</span>
                <button
                  type="button"
                  aria-label={`Delete category ${category.name}`}
                  onClick={() => setCategoryToDeactivate(category)}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </form>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Catalog</h2>
        {productsQuery.isLoading && <p className="text-sm text-stone-500">Loading products…</p>}
        {productsQuery.isError && <p role="alert" className="text-sm text-rose-700">{productsQuery.error.message}</p>}
        {productsQuery.data?.map((product) => (
          <article key={product._id} className="flex items-center gap-3 rounded-xl border border-stone-300 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
            {product.images?.[0] ? <img src={resolveImageUrl(product.images[0])} alt="" className="size-14 rounded-lg object-cover" /> : <div className="grid size-14 place-items-center rounded-lg bg-emerald-50">🌿</div>}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-1 text-xs text-stone-500">{product.sku} · {product.stock} in stock · {formatMoney(product.price, product.currency)}</p></div>
            <button type="button" aria-label={`Edit ${product.name}`} onClick={() => editProduct(product)} className="grid size-9 place-items-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"><Pencil className="size-4" /></button>
            <button type="button" aria-label={`Deactivate ${product.name}`} onClick={() => setProductToDeactivate(product)} className="grid size-9 place-items-center rounded-lg text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="size-4" /></button>
          </article>
        ))}
      </section>
      <ConfirmationDialog
        open={Boolean(productToDeactivate)}
        title="Deactivate this product?"
        description={productToDeactivate ? `${productToDeactivate.name} will no longer appear in the shop. This does not permanently delete its data.` : ''}
        confirmLabel="Deactivate product"
        isPending={deleteProduct.isPending}
        onCancel={() => setProductToDeactivate(null)}
        onConfirm={() => productToDeactivate && deleteProduct.mutate(productToDeactivate._id)}
      />
      <ConfirmationDialog
        open={Boolean(categoryToDeactivate)}
        title="Delete this category?"
        description={categoryToDeactivate ? `${categoryToDeactivate.name} will be removed from active category choices. Products assigned to it will remain in the catalog and will not be deleted.` : ''}
        confirmLabel="Delete category"
        isPending={deleteCategory.isPending}
        onCancel={() => setCategoryToDeactivate(null)}
        onConfirm={() => categoryToDeactivate && deleteCategory.mutate(categoryToDeactivate._id)}
      />
    </section>
  )
}

export default AdminProductsPage
