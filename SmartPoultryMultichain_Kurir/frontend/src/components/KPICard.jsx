import './KPICard.css'

function KPICard({ label, value, accent }) {
    return (
        <div className={`kpi-card ${accent ? 'kpi-accent' : ''}`}>
            <p className="kpi-label">{label}</p>
            <p className="kpi-value">{value ?? '—'}</p>
        </div>
    )
}

export default KPICard
