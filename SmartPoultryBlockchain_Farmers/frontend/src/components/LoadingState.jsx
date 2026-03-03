import './LoadingState.css'

function LoadingState({
    variant = 'spinner',
    size = 'medium',
    text = 'Memuat data...',
    count = 3
}) {
    if (variant === 'skeleton') {
        return (
            <div className={`loading-skeleton loading-skeleton--${size}`}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="skeleton-item">
                        <div className="skeleton-line skeleton-line--short" />
                        <div className="skeleton-line skeleton-line--long" />
                        <div className="skeleton-line skeleton-line--medium" />
                    </div>
                ))}
            </div>
        )
    }

    if (variant === 'dots') {
        return (
            <div className={`loading-dots loading-dots--${size}`}>
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
                {text && <p className="loading-text">{text}</p>}
            </div>
        )
    }

    // Default: spinner
    return (
        <div className={`loading-spinner loading-spinner--${size}`}>
            <div className="spinner" />
            {text && <p className="loading-text">{text}</p>}
        </div>
    )
}

export default LoadingState
