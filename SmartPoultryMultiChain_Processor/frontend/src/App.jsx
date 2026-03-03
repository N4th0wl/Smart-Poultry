import AppRouter from './routes/AppRouter'
import { ToastProvider } from './components/ToastProvider'

export default function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  )
}
