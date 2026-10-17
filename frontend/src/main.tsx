import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.tsx'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'

// Below Tailwind's md breakpoint the bottom of the screen holds the tab bar and the keyboard
const isMobile = window.matchMedia('(max-width: 767px)').matches

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position={isMobile ? 'top-center' : 'bottom-right'}
          containerStyle={{
            top: 'max(12px, env(safe-area-inset-top))',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
            left: 16,
            right: 16,
          }}
          toastOptions={{
            style: {
              maxWidth: '100%',
              background: '#fff7ed',
              color: '#c2410c',
              border: '1px solid #fed7aa',
              borderRadius: '12px',
            },
            success: {
              style: {
                color: '#15803d',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
              }
            }
          }}
        />
        <App />
        <Analytics />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
