import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function useToast() {
  return useContext(ToastContext)
}

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback(({ title, description, status = 'info', duration = 4000 }) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, title, description, status }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="sp-toastContainer">
        {toasts.map((t) => (
          <div key={t.id} className={`sp-toast ${t.status}`}>
            <div>
              <div className="sp-toastTitle">{t.title}</div>
              {t.description && <div className="sp-toastDesc">{t.description}</div>}
            </div>
            <button className="sp-toastClose" onClick={() => removeToast(t.id)}>&times;</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
