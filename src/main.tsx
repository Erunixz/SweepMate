import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { UpdatePrompt } from './components/UpdatePrompt'

// UpdatePrompt sits outside App so tests that render App never touch the service worker.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <UpdatePrompt />
  </StrictMode>,
)
