import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'

const getInitialTheme = () => {
  const savedTheme = window.localStorage.getItem('fake-kart-theme')
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function RootLayout() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('fake-kart-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-5 transition-colors sm:px-6 lg:px-8">
        <Outlet context={{ theme }} />
      </main>
      <Footer />
    </div>
  )
}

export default RootLayout
