interface EmptyStateProps {
  icon?: string
  title: string
  message?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon = '📭', title, message, action }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px', color: 'var(--foreground)' }}>{title}</h3>
      {message && <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 400 }}>{message}</p>}
      {action && (
        <button className="btn btn-primary" onClick={action.onClick} style={{ marginTop: 16 }}>
          {action.label}
        </button>
      )}
    </div>
  )
}
