import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '@/api/auth'
import { motion } from 'framer-motion'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar correo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)', padding: 20 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <h2 style={{ margin: '0 0 4px' }}>Recuperar contraseña</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Te enviaremos un enlace para restablecer tu contraseña</p>

        {sent ? (
          <div>
            <div style={{ padding: '10px 14px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              Correo enviado. Revisa tu bandeja de entrada.
            </div>
            <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
              <Link to="/login" style={{ color: 'var(--primary)' }}>Volver al inicio de sesión</Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
