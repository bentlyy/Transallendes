import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: number
  text?: string
  fullPage?: boolean
}

export default function LoadingSpinner({ size = 40, text, fullPage }: LoadingSpinnerProps) {
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <motion.div
        style={{
          width: size,
          height: size,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      {text && <span style={{ color: 'var(--muted)', fontSize: 14 }}>{text}</span>}
    </div>
  )

  if (fullPage) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        {content}
      </div>
    )
  }

  return content
}
