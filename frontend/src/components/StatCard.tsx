interface StatCardProps {
  icon?: string
  label: string
  value: string | number
  sub?: string
  color?: string
  trend?: { value: number; direction: 'up' | 'down' }
  onClick?: () => void
}

export default function StatCard({ icon, label, value, sub, color, trend, onClick }: StatCardProps) {
  return (
    <div
      className="kpi-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      {icon && (
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: color ? `${color}15` : 'var(--primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12,
        }}>
          {icon}
        </div>
      )}
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={color ? { color } : undefined}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        {trend && (
          <span className={`kpi-trend kpi-trend--${trend.direction === 'up' ? 'up' : 'down'}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {trend.direction === 'up'
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />
              }
            </svg>
            {trend.value}%
          </span>
        )}
        {sub && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</span>}
      </div>
    </div>
  )
}
