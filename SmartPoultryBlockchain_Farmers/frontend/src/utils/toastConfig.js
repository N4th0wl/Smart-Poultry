import toast from 'react-hot-toast'

// Custom toast styles configuration
export const toastConfig = {
    // Global options
    position: 'top-right',
    duration: 4000,

    // Default style for all toasts
    style: {
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(244, 247, 240, 0.95))',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 16px 48px rgba(15, 26, 18, 0.15)',
        border: '1px solid rgba(31, 59, 40, 0.1)',
        fontSize: '0.95rem',
        color: '#152416',
        maxWidth: '400px',
    },

    // Success specific
    success: {
        duration: 3000,
        iconTheme: {
            primary: '#2ea043',
            secondary: '#ffffff',
        },
        style: {
            background: 'linear-gradient(135deg, rgba(46, 160, 67, 0.12), rgba(26, 127, 55, 0.08))',
            border: '1px solid rgba(46, 160, 67, 0.25)',
        },
    },

    // Error specific
    error: {
        duration: 5000,
        iconTheme: {
            primary: '#c23b32',
            secondary: '#ffffff',
        },
        style: {
            background: 'linear-gradient(135deg, rgba(194, 59, 50, 0.12), rgba(180, 40, 32, 0.08))',
            border: '1px solid rgba(194, 59, 50, 0.25)',
        },
    },

    // Loading specific
    loading: {
        iconTheme: {
            primary: '#2f5a3c',
            secondary: 'rgba(47, 90, 60, 0.2)',
        },
    },
}

// Custom toast helper functions
export const showToast = {
    success: (message) => {
        toast.success(message, {
            ...toastConfig.success,
            style: { ...toastConfig.style, ...toastConfig.success.style },
        })
    },

    error: (message) => {
        toast.error(message, {
            ...toastConfig.error,
            style: { ...toastConfig.style, ...toastConfig.error.style },
        })
    },

    warning: (message) => {
        toast(message, {
            duration: 4000,
            icon: '⚠️',
            style: {
                ...toastConfig.style,
                background: 'linear-gradient(135deg, rgba(212, 163, 0, 0.12), rgba(180, 140, 0, 0.08))',
                border: '1px solid rgba(212, 163, 0, 0.25)',
            },
        })
    },

    info: (message) => {
        toast(message, {
            duration: 4000,
            icon: 'ℹ️',
            style: {
                ...toastConfig.style,
                background: 'linear-gradient(135deg, rgba(31, 136, 229, 0.12), rgba(20, 100, 180, 0.08))',
                border: '1px solid rgba(31, 136, 229, 0.25)',
            },
        })
    },

    loading: (message) => {
        return toast.loading(message, {
            ...toastConfig.loading,
            style: toastConfig.style,
        })
    },

    promise: (promise, messages) => {
        return toast.promise(
            promise,
            {
                loading: messages.loading || 'Memproses...',
                success: messages.success || 'Berhasil!',
                error: messages.error || 'Terjadi kesalahan',
            },
            {
                style: toastConfig.style,
                success: {
                    style: { ...toastConfig.style, ...toastConfig.success.style },
                },
                error: {
                    style: { ...toastConfig.style, ...toastConfig.error.style },
                },
            }
        )
    },

    dismiss: (toastId) => {
        toast.dismiss(toastId)
    },

    dismissAll: () => {
        toast.dismiss()
    },
}

export default showToast
