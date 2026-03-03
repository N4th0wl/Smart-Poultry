import './LoadingState.css'

function LoadingState({ message = 'Memuat data...' }) {
    return (
        <div className="loading-state">
            <div className="loading-spinner" />
            <p>{message}</p>
        </div>
    )
}

export default LoadingState
