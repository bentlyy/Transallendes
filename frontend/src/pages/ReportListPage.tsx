import { useState, useEffect, type FormEvent } from 'react'
import { getReports, generateReport, downloadReport, type Report } from '@/api/reports'
import DataTable, { type Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import { usePagination } from '@/hooks/usePagination'
import { formatDateTime } from '@/utils/formatters'
import { motion } from 'framer-motion'

const REPORT_TYPES = [
  { value: 'fleet_summary', label: 'Resumen de flota' },
  { value: 'trip_report', label: 'Reporte de viajes' },
  { value: 'driver_report', label: 'Reporte de conductores' },
  { value: 'client_report', label: 'Reporte de clientes' },
  { value: 'fuel_report', label: 'Reporte de combustible' },
  { value: 'maintenance_report', label: 'Reporte de mantenimiento' },
  { value: 'alert_report', label: 'Reporte de alertas' },
]

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
]

export default function ReportListPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [genModalOpen, setGenModalOpen] = useState(false)
  const [genForm, setGenForm] = useState({ type: 'fleet_summary', format: 'pdf' })
  const [generating, setGenerating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const pag = usePagination()

  async function fetch() {
    setLoading(true)
    try {
      const res = await getReports({ page: String(pag.page), limit: String(pag.pageSize) })
      setReports(res.data)
      pag.setTotal(res.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [pag.page, pag.pageSize])

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    setGenerating(true)
    try {
      await generateReport({
        type: genForm.type,
        format: genForm.format,
        params: {},
      })
      setGenModalOpen(false)
      await fetch()
    } catch {
      // ignore
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownload(id: string) {
    setDownloadingId(id)
    try {
      const blob = await downloadReport(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setDownloadingId(null)
    }
  }

  const columns: Column<Report>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
    { key: 'type', header: 'Tipo', render: (r) => REPORT_TYPES.find((t) => t.value === r.type)?.label || r.type },
    { key: 'format', header: 'Formato', render: (r) => r.format.toUpperCase() },
    { key: 'status', header: 'Estado', render: (r) => <StatusBadge status={r.status === 'completed' ? 'completed' : r.status === 'generating' ? 'in_progress' : 'planned'} type="trip" label={r.status === 'completed' ? 'Completado' : r.status === 'generating' ? 'Generando' : 'Pendiente'} /> },
    { key: 'generatedAt', header: 'Generado', render: (r) => r.generatedAt ? formatDateTime(r.generatedAt) : '—' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Reportes</h2>
        <button className="btn btn-primary" onClick={() => setGenModalOpen(true)}>+ Generar reporte</button>
      </div>

      <DataTable
        columns={columns}
        data={reports}
        keyExtractor={(r) => r.id}
        loading={loading}
        pagination={{ ...pag, onPageChange: pag.setPage, onPageSizeChange: pag.setPageSize }}
        actions={(r) => (
          r.status === 'completed' ? (
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); handleDownload(r.id) }} disabled={downloadingId === r.id}>
              {downloadingId === r.id ? '⏳' : '⬇️'}
            </button>
          ) : null
        )}
      />

      <Modal open={genModalOpen} onClose={() => setGenModalOpen(false)} title="Generar reporte" size="small">
        <form onSubmit={handleGenerate}>
          <div className="form-group">
            <label className="form-label">Tipo de reporte</label>
            <select className="input" value={genForm.type} onChange={(e) => setGenForm({ ...genForm, type: e.target.value })}>
              {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Formato</label>
            <select className="input" value={genForm.format} onChange={(e) => setGenForm({ ...genForm, format: e.target.value })}>
              {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setGenModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={generating}>{generating ? 'Generando...' : 'Generar'}</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
