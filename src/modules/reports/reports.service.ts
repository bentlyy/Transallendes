import { query } from '../../shared/db.js'
import { NotFoundError, BadRequestError } from '../../utils/errors.js'

interface GenerateData {
  type: string
  format: string
  from?: string
  to?: string
  client_id?: number
  driver_id?: number
  truck_id?: number
  filters?: Record<string, unknown>
}

export const generate = async (tenant_id: string, userId: number, data: GenerateData) => {
  const { type, format, from, to, client_id, driver_id, truck_id, filters } = data
  const result = await query(
    `INSERT INTO reports (tenant_id, created_by, type, format, from_date, to_date, client_id, driver_id, truck_id, filters, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending') RETURNING *`,
    [
      tenant_id,
      userId,
      type,
      format,
      from || null,
      to || null,
      client_id || null,
      driver_id || null,
      truck_id || null,
      filters ? JSON.stringify(filters) : null,
    ],
  )
  return result.rows[0]
}

export const findAll = async (tenant_id: string) => {
  const result = await query('SELECT * FROM reports WHERE tenant_id = $1 ORDER BY created_at DESC', [tenant_id])
  return { data: result.rows, total: result.rows.length }
}

export const findById = async (tenant_id: string, id: number) => {
  const result = await query('SELECT * FROM reports WHERE id = $1 AND tenant_id = $2', [id, tenant_id])
  if (result.rows.length === 0) throw new NotFoundError('Informe no encontrado')
  return result.rows[0]
}

export const download = async (tenant_id: string, id: number) => {
  const report = await findById(tenant_id, id)
  if (!report.file_path) throw new BadRequestError('El archivo del informe aun no se ha generado')
  return report
}
