import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styling/base.css'
import './styling/header.css'
import './styling/hero.css'
import './styling/catalog.css'
import './styling/footer.css'
import './styling/overlays.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
