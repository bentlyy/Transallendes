import { useState, useEffect } from 'react'
import { getClientDashboard } from '@/api/analytics'
import { getTripStats, type TripStats } from '@/api/trips'
import StatCard from '@/components/StatCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const MONTHLY_DATA = [
  { name: 'Ene', viajes: 12, km: 3400 },
  { name: 'Feb', viajes: 18, km: 4200 },
  { name: 'Mar', viajes: 15, km: 3800 },
  { name: 'Abr', viajes: 22, km: 5100 },
  { name: 'May', viajes: 20, km: 4900 },
  { name: 'Jun', viajes: 17, km: 4500 },
]

export default function ClientDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [tripStats, setTripStats] = useState<TripStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const [dash, ts] = await Promise.all([
          getClientDashboard(user?.tenantId ?? '').catch(() => null),
          getTripStats().catch(() => null),
        ])
        setStats(dash)
        setTripStats(ts)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [user?.tenantId])

  if (loading) return <LoadingSpinner fullPage text="Cargando dashboard..." />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Mi Dashboard</h2>

      <div className="grid-4">
        <StatCard icon="🛣️" label="Viajes totales" value={tripStats?.total ?? 0} />
        <StatCard icon="🚛" label="En curso" value={tripStats?.inProgress ?? 0} color="#22c55e" />
        <StatCard icon="✅" label="Completados" value={tripStats?.completed ?? 0} color="#10b981" />
        <StatCard icon="📏" label="Total km" value={(stats as Record<string, number>)?.totalDistance ? `${(stats as Record<string, number>).totalDistance} km` : '—'} />
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Actividad mensual</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={MONTHLY_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
            <YAxis stroke="var(--muted)" fontSize={12} />
            <Tooltip />
            <Bar dataKey="viajes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
