interface AlertBadgeProps {
  count: number
  size?: 'small' | 'medium'
}

export default function AlertBadge({ count, size = 'medium' }: AlertBadgeProps) {
  if (count === 0) return null

  const dimensions = size === 'small' ? { minWidth: 16, height: 16, fontSize: 10 } : { minWidth: 20, height: 20, fontSize: 11 }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...dimensions,
        padding: '0 4px',
        borderRadius: 999,
        backgroundColor: 'var(--danger)',
        color: '#fff',
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
