import { motion } from 'framer-motion'
import EmptyState from '@/components/EmptyState'

export default function ClientReportsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Reportes</h2>
      <EmptyState
        icon="📊"
        title="Sin reportes"
        message="Solicita reportes personalizados a tu operador logístico"
      />
    </motion.div>
  )
}
