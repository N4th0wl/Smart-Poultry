import './EmptyState.css'

function EmptyState({ message = 'Belum ada data', icon = '📭' }) {
    return (
        <div className="empty-state">
            <span className="empty-icon">{icon}</span>
            <p>{message}</p>
        </div>
    )
}

export default EmptyState
