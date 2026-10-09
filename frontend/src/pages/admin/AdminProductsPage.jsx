import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/auth/authContext'
import { useToast } from '@/components/feedback/toastContext'
import SelectField from '@/components/ui/SelectField'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { apiRequest } from '@/lib/api'
import { resolveImageUrl } from '@/lib/format'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import FileAttachmentList from '@/components/ui/FileAttachmentList'
import Pagination from '@/components/ui/Pagination'
import Alert from '@/components/ui/Alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'

const emptyForm = { name: '', sku: '', description: '', price: '', stock: '', category: '', imageFiles: [], imageUrls: [] }

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
  const [productPage, setProductPage] = useState(1)
  const [catalogEdits, setCatalogEdits] = useState({})

  const productsQuery = useQuery({
    queryKey: ['products', 'admin', productPage],
    queryFn: () => apiRequest(`/products/admin/catalog?page=${productPage}&limit=10`, { token }),
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
        } else if (key === 'imageUrls' && editingId) {
          body.set('images', JSON.stringify(value))
        } else if (key === 'imageUrls') {
          return
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
  const updateCatalogItem = useMutation({
    mutationFn: ({ id, price, stock }) => apiRequest(`/products/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ price: Number(price), stock: Number(stock) }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      showToast('Price and stock saved.', 'Catalog updated', 'success')
    },
    onError: (mutationError) => showToast(mutationError.message, 'Could not update catalog', 'error'),
  })
  const setProductActive = useMutation({
    mutationFn: ({ id, isActive }) => apiRequest(`/products/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ isActive }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      showToast('Product visibility updated.', 'Catalog updated', 'success')
    },
    onError: (mutationError) => showToast(mutationError.message, 'Could not update product', 'error'),
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
      imageFiles: [],
      imageUrls: product.images || [],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const addImageFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''
    if (!selectedFiles.length) return
    if (selectedFiles.some((file) => file.size > 5 * 1024 * 1024)) {
      setError('Each product image must be 5 MB or smaller.')
      return
    }
    if (form.imageUrls.length + form.imageFiles.length + selectedFiles.length > 8) {
      setError('A product can have at most 8 images.')
      return
    }
    setError('')
    setForm((current) => ({ ...current, imageFiles: [...current.imageFiles, ...selectedFiles] }))
  }

  return (
    <section className="space-y-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-300">Admin</p><h1 className="mt-1 text-2xl font-black text-stone-950 dark:text-white sm:text-3xl">Products and categories</h1></div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <form onSubmit={(event) => { event.preventDefault(); saveProduct.mutate() }} className="space-y-4 rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{editingId ? 'Edit product' : 'Add a product'}</h2>{editingId && <button type="button" onClick={() => { setEditingId(''); setForm(emptyForm) }} className="text-sm font-semibold text-stone-500">Cancel edit</button>}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Product name<Input required name="name" value={form.name} onChange={updateField} className="mt-1" /></label>
            <label className="space-y-1.5 text-xs font-semibold">SKU<Input required name="sku" value={form.sku} onChange={updateField} className="mt-1 uppercase" /></label>
            <label className="space-y-1.5 text-xs font-semibold">Price (₹)<Input required name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={updateField} className="mt-1" /></label>
            <label className="space-y-1.5 text-xs font-semibold">Stock<Input name="stock" type="number" min="0" step="1" value={form.stock} onChange={updateField} className="mt-1" /></label>
            <SelectField label="Category" labelClassName="text-xs" value={form.category} options={(categoriesQuery.data || []).map((category) => ({ value: category._id, label: category.name }))} onChange={(category) => setForm((current) => ({ ...current, category }))} placeholder="Choose category" className="gap-1.5" />
            <label className="space-y-1.5 text-xs font-semibold sm:col-span-2">Description<Textarea required name="description" rows="3" value={form.description} onChange={updateField} className="mt-1" /></label>
            <label className="cursor-pointer space-y-1.5 text-xs font-semibold sm:col-span-2">Product photos<input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImageFiles} className="mt-1 block min-h-11 w-full cursor-pointer rounded-xl border border-stone-300 bg-white p-2 text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-800 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-emerald-900 dark:border-stone-700 dark:bg-stone-950" /><span className="block font-normal text-stone-500">Choose up to 8 images (JPEG, PNG, or WebP), 5 MB each. Existing photos are retained unless removed below.</span></label>
          </div>
          {form.imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {form.imageUrls.map((imageUrl) => (
                <div key={imageUrl} className="relative size-20 overflow-hidden rounded-lg border border-stone-300 dark:border-stone-700">
                  <img src={resolveImageUrl(imageUrl)} alt="Current product" className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove current product image"
                    onClick={() => setForm((current) => ({ ...current, imageUrls: current.imageUrls.filter((url) => url !== imageUrl) }))}
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-stone-950/80 text-xs font-bold text-white"
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <FileAttachmentList files={form.imageFiles} onRemove={(index) => setForm((current) => ({ ...current, imageFiles: current.imageFiles.filter((_, fileIndex) => fileIndex !== index) }))} />
          {error && <Alert variant="destructive">{error}</Alert>}
          <button disabled={saveProduct.isPending || !form.category} className="cursor-pointer inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white disabled:opacity-50"><Plus className="size-4" />{saveProduct.isPending ? 'Saving…' : editingId ? 'Save product' : 'Create product'}</button>
        </form>

        <form onSubmit={(event) => { event.preventDefault(); createCategory.mutate() }} className="rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-lg font-bold">Product categories</h2>
          <p className="mt-1 text-sm text-stone-500">Add a category before assigning products.</p>
          <div className="mt-4 flex gap-2">
            <Input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Herbal oils" className="min-w-0 flex-1" />
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
        {productsQuery.isLoading && <p role="status" className="text-sm text-stone-500">Loading products…</p>}
        {productsQuery.isError && <Alert variant="destructive">{productsQuery.error.message}</Alert>}
        {productsQuery.isSuccess && productsQuery.data.data.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500 dark:border-stone-700">
            No products are in the catalog yet.
          </p>
        )}
        {!!productsQuery.data?.data?.length && (
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Inventory</TableHead><TableHead>Price</TableHead><TableHead>Visibility</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {productsQuery.data.data.map((product) => (
                <TableRow key={product._id}>
                  <TableCell><div className="flex items-center gap-3">{product.images?.[0] ? <img src={resolveImageUrl(product.images[0])} alt="" className="size-12 rounded-lg object-cover" /> : <div className="grid size-12 place-items-center rounded-lg bg-emerald-50">🌿</div>}<div className="min-w-0"><p className="truncate font-bold">{product.name}</p><p className="text-xs text-stone-500">{product.sku}</p></div></div></TableCell>
                  <TableCell><Input aria-label={`Stock for ${product.name}`} type="number" min="0" step="1" value={catalogEdits[product._id]?.stock ?? product.stock} onChange={(event) => setCatalogEdits((current) => ({ ...current, [product._id]: { ...current[product._id], stock: event.target.value } }))} className="h-9 min-w-24" /></TableCell>
                  <TableCell><Input aria-label={`Price for ${product.name}`} type="number" min="0.01" step="0.01" value={catalogEdits[product._id]?.price ?? product.price} onChange={(event) => setCatalogEdits((current) => ({ ...current, [product._id]: { ...current[product._id], price: event.target.value } }))} className="h-9 min-w-28" /></TableCell>
                  <TableCell><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.isActive ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'}`}>{product.isActive ? 'Active' : 'Inactive'}</span></TableCell>
                  <TableCell><div className="flex gap-1"><button type="button" disabled={updateCatalogItem.isPending} onClick={() => updateCatalogItem.mutate({ id: product._id, price: catalogEdits[product._id]?.price ?? product.price, stock: catalogEdits[product._id]?.stock ?? product.stock })} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Save</button><button type="button" aria-label={`Edit details for ${product.name}`} onClick={() => editProduct(product)} className="grid size-9 place-items-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"><Pencil className="size-4" /></button>{product.isActive ? <button type="button" aria-label={`Deactivate ${product.name}`} onClick={() => setProductToDeactivate(product)} className="grid size-9 place-items-center rounded-lg text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="size-4" /></button> : <button type="button" onClick={() => setProductActive.mutate({ id: product._id, isActive: true })} className="rounded-lg px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300">Reactivate</button>}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination page={productsQuery.data?.pagination?.page || productPage} pages={productsQuery.data?.pagination?.pages || 1} onPageChange={setProductPage} />
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
