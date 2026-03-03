import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="sp-modalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sp-modal">
        <div className="sp-modalHeader">
          <div className="sp-modalTitle">{title}</div>
          <button className="sp-modalClose" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div className="sp-modalBody">{children}</div>
        {footer && <div className="sp-modalFooter">{footer}</div>}
      </div>
    </div>
  )
}
