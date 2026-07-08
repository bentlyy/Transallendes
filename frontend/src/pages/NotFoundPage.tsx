import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)', padding: 20 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>404</div>
        <h2 style={{ margin: '8px 0' }}>Página no encontrada</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>La página que buscas no existe o ha sido movida.</p>
        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>Ir al inicio</Link>
      </motion.div>
    </div>
  )
}
