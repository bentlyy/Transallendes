import { useState, useEffect } from 'react'
import { getTruckStats } from '@/api/trucks'
import { getTripStats } from '@/api/trips'
import { getAlertStats } from '@/api/alerts'
import { getExecutiveDashboard, getOperationalDashboard } from '@/api/analytics'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatNumber, formatDistance, formatCurrency } from '@/utils/formatters'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

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

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444']

export default function AdminDashboardPage() {
  const [truckStats, setTruckStats] = useState<any>(null)
  const [tripStats, setTripStats] = useState<any>(null)
  const [alertStats, setAlertStats] = useState<any>(null)
  const [execDash, setExecDash] = useState<any>(null)
  const [opDash, setOpDash] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      try {
        const [ts, trs, als, exec, op] = await Promise.all([
          getTruckStats().catch(() => null),
          getTripStats().catch(() => null),
          getAlertStats().catch(() => null),
          getExecutiveDashboard().catch(() => null),
          getOperationalDashboard().catch(() => null),
        ])
        setTruckStats(ts)
        setTripStats(trs)
        setAlertStats(als)
        setExecDash(exec)
        setOpDash(op)
      } catch {
        setError('Error al cargar datos del dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) return <LoadingSpinner fullPage text="Cargando dashboard..." />
  if (error) return <div className="card" style={{ padding: 24, color: 'var(--danger)' }}>{error}</div>

  const fleetData = truckStats
    ? [
        { name: 'En movimiento', value: truckStats.moving, color: COLORS[0] },
        { name: 'Detenidos', value: truckStats.stopped, color: COLORS[1] },
        { name: 'Inactivos', value: truckStats.idle, color: COLORS[2] },
        { name: 'Alerta', value: truckStats.alert, color: COLORS[3] },
        { name: 'Desconectados', value: truckStats.disconnected, color: COLORS[4] },
      ].filter((d) => d.value > 0)
    : []

  const totalFleet = fleetData.reduce((s, d) => s + d.value, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Ejecutivo</h1>
          <p className="page-subtitle">Resumen operativo de la flota en tiempo real</p>
        </div>
      </div>

      <div className="grid-5">
        <KpiCard
          icon="🚛"
          label="Vehículos activos"
          value={execDash?.active_trucks ?? truckStats?.moving ?? 0}
          sub={`de ${truckStats?.total ?? 0} totales`}
          color="#22c55e"
        />
        <KpiCard
          icon="🛣️"
          label="Viajes en curso"
          value={execDash?.in_progress_trips ?? tripStats?.inProgress ?? 0}
          sub={`${execDash?.todays_completed_trips ?? tripStats?.completed ?? 0} completados hoy`}
          color="#3b82f6"
        />
        <KpiCard
          icon="🔔"
          label="Alertas críticas"
          value={alertStats?.critical ?? 0}
          sub={`${alertStats?.pending ?? 0} pendientes`}
          color={alertStats?.critical > 0 ? '#ef4444' : undefined}
        />
        <KpiCard
          icon="📍"
          label="Distancia total"
          value={formatDistance(execDash?.total_distance_km ?? 0)}
          sub="últimos 30 días"
          color="#a855f7"
        />
        <KpiCard
          icon="⛽"
          label="Rendimiento"
          value={execDash ? `${execDash.avg_speed_kmh} km/h` : '-'}
          sub={`${execDash?.total_fuel_liters ?? 0} L consumidos`}
          color="#f59e0b"
        />
      </div>

      {opDash && (
        <div className="grid-3">
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="card-header">
              <span className="card-title">KPIs Operacionales</span>
            </div>
            <div className="grid-3" style={{ marginTop: 16 }}>
              <div style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{opDash.fleet_utilization_pct}%</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Utilización flota</div>
              </div>
              <div style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{opDash.on_time_delivery_pct}%</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Entrega a tiempo</div>
              </div>
              <div style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#a855f7' }}>{opDash.avg_trip_duration_min} min</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Duración promedio</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Estado de Flota</span>
            </div>
            {fleetData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={fleetData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {fleetData.map((entry, idx) => (
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
                  {fleetData.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: item.color }} />
                      <span style={{ color: 'var(--muted)' }}>{item.name}</span>
                      <span style={{ fontWeight: 600 }}>{totalFleet > 0 ? Math.round(item.value / totalFleet * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Sin datos de flota</div>
            )}
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top Clientes</span>
          </div>
          {opDash?.top_clients_by_trips?.length > 0 ? (
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th style={{ textAlign: 'right' }}>Viajes</th>
                </tr>
              </thead>
              <tbody>
                {opDash.top_clients_by_trips.map((c: any) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(c.trips)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Sin datos de clientes</div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Top Conductores</span>
          </div>
          {opDash?.top_drivers_by_trips?.length > 0 ? (
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Conductor</th>
                  <th style={{ textAlign: 'right' }}>Viajes</th>
                </tr>
              </thead>
              <tbody>
                {opDash.top_drivers_by_trips.map((d: any) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(d.trips)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Sin datos de conductores</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
