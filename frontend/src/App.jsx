import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthProvider } from './components/auth/AuthProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FavoritesProvider } from './components/favorites/FavoritesProvider'
import { ToastProvider } from './components/feedback/ToastProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
