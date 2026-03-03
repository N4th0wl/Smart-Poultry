export default function StatCard({ label, value, hint }) {
  return (
    <div className="sp-card">
      <div className="sp-cardHeader">{label}</div>
      <div className="sp-cardBody">
        <div className="sp-statValue">{value}</div>
        {hint && <div className="sp-statHint">{hint}</div>}
      </div>
    </div>
  )
}
