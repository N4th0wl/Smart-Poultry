export default function Topbar({ title, onMenuClick }) {
  return (
    <div className="sp-topbar">
      <button className="sp-topbarMenu" onClick={onMenuClick} aria-label="Menu">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      <div className="sp-topbarTitle">{title}</div>
    </div>
  )
}
