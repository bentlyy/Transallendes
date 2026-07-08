import { motion } from 'framer-motion'
import EmptyState from '@/components/EmptyState'

export default function ClientDocumentsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Documentos</h2>
      <EmptyState
        icon="📄"
        title="Sin documentos"
        message="Los documentos de tus viajes aparecerán aquí"
      />
    </motion.div>
  )
}
