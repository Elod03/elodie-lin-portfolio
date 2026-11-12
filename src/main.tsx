import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/effects.css'
import '@fontsource/funnel-display/latin-700.css'
import '@fontsource/funnel-display/latin-500.css'
import '@fontsource/zen-maru-gothic/latin-500.css'
import '@fontsource/zen-maru-gothic/latin-700.css'
import '@fontsource/nunito/latin-900.css'
import '@fontsource/noto-sans-sc/700.css'

const root = document.getElementById('root')!
const app = <StrictMode><App /></StrictMode>
if (root.querySelector('header')) hydrateRoot(root, app)
else createRoot(root).render(app)
