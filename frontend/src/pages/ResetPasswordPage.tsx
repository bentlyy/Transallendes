import { useState, type FormEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '@/api/auth'
import { motion } from 'framer-motion'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const token = searchParams.get('token')
  const email = searchParams.get('email') || ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!token) {
      setError('Token inválido')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      await resetPassword({ token, password, email })
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al restablecer contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)', padding: 20 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ width: '100%', maxWidth: 400, padding: 32, textAlign: 'center' }}>
          <h3>Enlace inválido</h3>
          <p style={{ color: 'var(--muted)' }}>El enlace de restablecimiento no es válido o ha expirado.</p>
          <Link to="/forgot-password" className="btn btn-primary" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>
            Solicitar nuevo enlace
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)', padding: 20 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '10px 14px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              Contraseña restablecida exitosamente
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>Iniciar sesión</button>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '0 0 4px' }}>Nueva contraseña</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Ingresa tu nueva contraseña</p>
            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nueva contraseña</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar contraseña</label>
                <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
