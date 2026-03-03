import { useEffect, useCallback } from 'react'
import './Modal.css'

function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'medium',
    showCloseButton = true
}) {
    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }, [onClose])

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = ''
        }
    }, [isOpen, handleEscape])

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className={`modal modal--${size}`} role="dialog" aria-modal="true">
                <header className="modal__header">
                    {title && <h2 className="modal__title">{title}</h2>}
                    {showCloseButton && (
                        <button
                            type="button"
                            className="modal__close"
                            onClick={onClose}
                            aria-label="Tutup modal"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </header>
                <div className="modal__body">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Modal
