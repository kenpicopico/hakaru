import '@fontsource/noto-sans-jp/400.css'
import '@fontsource/noto-sans-jp/500.css'
import '@fontsource/noto-sans-jp/700.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './styles/_index.scss'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ClientProvider } from './contexts/ClientContext.tsx'
import { ProjectProvider } from './contexts/ProjectContext.tsx'
import { SelectionProvider } from './contexts/SelectionContext.tsx'
import { TrackingProvider } from './contexts/TrackingContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrackingProvider>
      <ClientProvider>
        <ProjectProvider>
          <SelectionProvider>
            <App />
          </SelectionProvider>
        </ProjectProvider>
      </ClientProvider>
    </TrackingProvider>
  </StrictMode>,
)
