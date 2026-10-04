import { Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './components/layout/RootLayout'
import RequireAdmin from './components/auth/RequireAdmin'
import RequireAuth from './components/auth/RequireAuth'
import {
  AccountPage,
  AdminDashboard,
  AdminOrdersPage,
  AdminProductsPage,
  CartPage,
  ChangePasswordPage,
  CheckoutPage,
  FavoritesPage,
  HomePage,
  LoginPage,
  OrderDetailsPage,
  OrdersPage,
  PagePlaceholder,
  ProductDetailsPage,
  ProductsPage,
  RegisterPage,
} from './routePages'

function lazyPage(Page) {
  return (
    <Suspense fallback={<p role="status" className="py-14 text-center text-sm text-stone-500">Loading page…</p>}>
      <Page />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: lazyPage(HomePage) },
      { path: 'products', element: lazyPage(ProductsPage) },
      { path: 'products/:productId', element: lazyPage(ProductDetailsPage) },
      { path: 'favorites', element: lazyPage(FavoritesPage) },
      { path: 'cart', element: lazyPage(CartPage) },
      {
        path: 'login',
        element: lazyPage(LoginPage),
      },
      {
        path: 'register',
        element: lazyPage(RegisterPage),
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
        path: 'admin',
        element: <RequireAdmin />,
        children: [
          { index: true, element: lazyPage(AdminDashboard) },
          { path: 'products', element: lazyPage(AdminProductsPage) },
          { path: 'orders', element: lazyPage(AdminOrdersPage) },
        ],
      },
      {
        path: '*',
        element: lazyPage(PagePlaceholder),
      },
    ],
  },
])
