import { Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './components/layout/RootLayout'
import RequireAdmin from './components/auth/RequireAdmin'
import RequireAuth from './components/auth/RequireAuth'
import RequireGuest from './components/auth/RequireGuest'
import AdminLayout from './components/layout/AdminLayout'
import Skeleton from './components/ui/Skeleton'
import ErrorPage from './pages/ErrorPage'
import {
  AccountPage,
  AdminDashboard,
  AdminOrdersPage,
  AdminProductsPage,
  CartPage,
  ChangePasswordPage,
  CheckoutPage,
  FavoritesPage,
  EmailVerificationPage,
  ForgotPasswordPage,
  HomePage,
  LoginPage,
  OrderDetailsPage,
  OrdersPage,
  ProductDetailsPage,
  ProductsPage,
  RegisterPage,
} from './routePages'

function lazyPage(Page) {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading page" className="mx-auto w-full max-w-5xl space-y-5 py-6"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-5 w-2/3" /><div className="grid gap-5 md:grid-cols-2"><div className="space-y-4 rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-32 w-full" /></div><div className="space-y-4 rounded-2xl border border-stone-300 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-24 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div></div></div>}>
      <Page />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: lazyPage(HomePage) },
      { path: 'products', element: lazyPage(ProductsPage) },
      { path: 'products/:productId', element: lazyPage(ProductDetailsPage) },
      { path: 'favorites', element: lazyPage(FavoritesPage) },
      { path: 'cart', element: lazyPage(CartPage) },
      {
        element: <RequireGuest />,
        children: [
          { path: 'login', element: lazyPage(LoginPage) },
          { path: 'register', element: lazyPage(RegisterPage) },
          { path: 'verify-email', element: lazyPage(EmailVerificationPage) },
          { path: 'forgot-password', element: lazyPage(ForgotPasswordPage) },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: 'checkout', element: lazyPage(CheckoutPage) },
          { path: 'orders', element: lazyPage(OrdersPage) },
          { path: 'orders/:orderId', element: lazyPage(OrderDetailsPage) },
          { path: 'account', element: lazyPage(AccountPage) },
          { path: 'change-password', element: lazyPage(ChangePasswordPage) },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [{
          path: 'admin',
          element: <AdminLayout />,
          children: [
            { index: true, element: lazyPage(AdminDashboard) },
            { path: 'products', element: lazyPage(AdminProductsPage) },
            { path: 'orders', element: lazyPage(AdminOrdersPage) },
          ],
        }],
      },
      {
        path: '*',
        element: <ErrorPage notFound inLayout />,
      },
    ],
  },
])
