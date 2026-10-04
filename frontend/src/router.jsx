import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './components/layout/RootLayout'
import HomePage from './pages/store/HomePage'
import PagePlaceholder from './pages/PagePlaceholder'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'products',
        element: <PagePlaceholder title="Shop all products" />,
      },
      {
        path: 'products/:productId',
        element: <PagePlaceholder title="Product details" />,
      },
      {
        path: 'cart',
        element: <PagePlaceholder title="Your cart" />,
      },
      {
        path: 'login',
        element: <PagePlaceholder title="Welcome back" />,
      },
      {
        path: 'register',
        element: <PagePlaceholder title="Create your account" />,
      },
      {
        path: 'admin',
        element: <PagePlaceholder title="Admin dashboard" />,
      },
      {
        path: '*',
        element: <PagePlaceholder title="Page not found" />,
      },
    ],
  },
])
