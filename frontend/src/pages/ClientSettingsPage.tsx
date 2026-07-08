import { useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { changePassword } from '@/api/auth'
import { motion } from 'framer-motion'

export default function ClientSettingsPage() {
  const { user } = useAuth()
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (passForm.newPassword !== passForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }
    setSaving(true)
    try {
      await changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword })
      setMessage({ type: 'success', text: 'Contraseña actualizada' })
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cambiar contraseña' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Ajustes</h2>

      <div className="card">
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Mi Perfil</h3>
        <div className="info-row"><span>Nombre</span><span>{user?.name}</span></div>
        <div className="info-row"><span>Email</span><span>{user?.email}</span></div>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Cambiar contraseña</h3>
        {message && (
          <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#16a34a' : '#dc2626' }}>
            {message.text}
          </div>
        )}
        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label className="form-label">Contraseña actual</label>
            <input className="input" type="password" value={passForm.currentPassword} onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nueva contraseña</label>
              <input className="input" type="password" value={passForm.newPassword} onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar</label>
              <input className="input" type="password" value={passForm.confirmPassword} onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 8 }}>{saving ? 'Guardando...' : 'Cambiar contraseña'}</button>
        </form>
      </div>
    </motion.div>
  )
}
