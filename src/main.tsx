import './utils/initAuth';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.tsx'
import { antdTheme } from './theme/tokens'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={antdTheme}>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
