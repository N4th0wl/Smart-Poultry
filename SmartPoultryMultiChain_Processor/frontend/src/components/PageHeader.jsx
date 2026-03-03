export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="sp-pageHeader">
      <div>
        <div className="sp-pageTitle">{title}</div>
        {subtitle && <div className="sp-pageSubtitle">{subtitle}</div>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  )
}
