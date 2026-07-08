import { useState, useEffect } from 'react'
import { getTruckStats } from '@/api/trucks'
import { getTripStats } from '@/api/trips'
import { getAlertStats } from '@/api/alerts'
import { getOperationalDashboard } from '@/api/analytics'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatNumber, formatDistance, formatCurrency } from '@/utils/formatters'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

const MONTHLY_DATA = [
  { name: 'Ene', viajes: 45, km: 1200, ingresos: 85000, combustible: 32000 },
  { name: 'Feb', viajes: 52, km: 1500, ingresos: 92000, combustible: 38000 },
  { name: 'Mar', viajes: 48, km: 1100, ingresos: 78000, combustible: 29000 },
  { name: 'Abr', viajes: 70, km: 1800, ingresos: 120000, combustible: 45000 },
  { name: 'May', viajes: 63, km: 1600, ingresos: 105000, combustible: 41000 },
  { name: 'Jun', viajes: 58, km: 1400, ingresos: 95000, combustible: 35000 },
]

const PIE_DATA = [
  { name: 'En movimiento', value: 45, color: '#22c55e' },
  { name: 'Detenidos', value: 25, color: '#3b82f6' },
  { name: 'Inactivos', value: 18, color: '#f59e0b' },
  { name: 'Mantención', value: 8, color: '#a855f7' },
  { name: 'Desconectados', value: 4, color: '#ef4444' },
]

function KpiCard({ icon, label, value, sub, color, trend }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string; trend?: { value: number; dir: 'up' | 'down' }
}) {
  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: color ? `${color}15` : 'var(--primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{icon}</div>
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={color ? { color } : undefined}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        {trend && (
          <span className={`kpi-trend kpi-trend--${trend.dir}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {trend.dir === 'up'
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />
              }
            </svg>
            {trend.value}%
          </span>
        )}
        {sub && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</span>}
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [truckStats, setTruckStats] = useState<any>(null)
  const [tripStats, setTripStats] = useState<any>(null)
  const [alertStats, setAlertStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const [ts, trs, als] = await Promise.all([
          getTruckStats().catch(() => null),
          getTripStats().catch(() => null),
          getAlertStats().catch(() => null),
        ])
        setTruckStats(ts)
        setTripStats(trs)
        setAlertStats(als)
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    fetch()
  }, [])

  if (loading) return <LoadingSpinner fullPage text="Cargando dashboard..." />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Ejecutivo</h1>
          <p className="page-subtitle">Resumen operativo de la flota en tiempo real</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            Exportar
          </button>
          <button className="btn btn-secondary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Hoy
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-5">
        <KpiCard
          icon="🚛"
          label="Vehículos activos"
          value={truckStats?.moving ?? 0}
          sub={`de ${truckStats?.total ?? 0} totales`}
          color="#22c55e"
          trend={{ value: 12, dir: 'up' }}
        />
        <KpiCard
          icon="🛣️"
          label="Viajes en curso"
          value={tripStats?.inProgress ?? 0}
          sub={`${tripStats?.completed ?? 0} completados`}
          color="#3b82f6"
        />
        <KpiCard
          icon="🔔"
          label="Alertas críticas"
          value={alertStats?.critical ?? 0}
          sub={`${alertStats?.pending ?? 0} pendientes`}
          color={alertStats?.critical > 0 ? '#ef4444' : undefined}
          trend={alertStats?.critical > 0 ? { value: 8, dir: 'up' } : undefined}
        />
        <KpiCard
          icon="📍"
          label="Distancia total"
          value={formatDistance(tripStats?.completed * 87 || 1800)}
          sub="últimos 30 días"
          color="#a855f7"
        />
        <KpiCard
          icon="💰"
          label="Ingresos estimados"
          value={formatCurrency(125000)}
          sub="este mes"
          color="#f59e0b"
          trend={{ value: 8, dir: 'up' }}
        />
      </div>

      {/* Charts row */}
      <div className="grid-3">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <span className="card-title">Viajes e Ingresos</span>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--primary)' }} />
                Viajes
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#22c55e' }} />
                Ingresos
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="viajes" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Estado de Flota</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {PIE_DATA.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 8 }}>
              {PIE_DATA.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: item.color }} />
                  <span style={{ color: 'var(--muted)' }}>{item.name}</span>
                  <span style={{ fontWeight: 600 }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Kilómetros recorridos</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Area type="monotone" dataKey="km" stroke="#a855f7" strokeWidth={2} fill="#a855f720" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Consumo de combustible</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="combustible" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}
