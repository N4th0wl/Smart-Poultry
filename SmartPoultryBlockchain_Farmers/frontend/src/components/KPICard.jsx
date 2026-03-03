import './KPICard.css'

function KPICard({
    title,
    value,
    subtitle,
    trend,
    trendType = 'neutral',
    icon,
    variant = 'default'
}) {
    const getTrendIcon = () => {
        if (!trend) return null
        if (trendType === 'up') return '↑'
        if (trendType === 'down') return '↓'
        return ''
    }

    return (
        <article className={`kpi-card kpi-card--${variant}`}>
            <div className="kpi-card__header">
                {icon && <span className="kpi-card__icon">{icon}</span>}
                <span className="kpi-card__title">{title}</span>
            </div>
            <div className="kpi-card__body">
                <strong className="kpi-card__value">{value}</strong>
                {trend && (
                    <span className={`kpi-card__trend kpi-card__trend--${trendType}`}>
                        {getTrendIcon()} {trend}
                    </span>
                )}
            </div>
            {subtitle && <p className="kpi-card__subtitle">{subtitle}</p>}
        </article>
    )
}

export default KPICard
