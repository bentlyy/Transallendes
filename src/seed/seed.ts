import { pool } from '../shared/db.js'
import bcrypt from 'bcrypt'
import { logger } from '../utils/logger.js'

const SUPERADMIN_TENANT_ID = '__superadmin__'
const COMPANY_TENANT_ID = 'transallendes'

let _HASH: string | null = null
const getHash = async (): Promise<string> => {
  if (!_HASH) _HASH = await bcrypt.hash(process.env.SEED_PASSWORD || 'Admin123!', 12)
  return _HASH!
}

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const today = new Date()

export const seed = async (): Promise<void> => {
  const HASH = await getHash()

  // ==================== GLOBAL SUPERADMIN TENANT ====================
  await pool.query(
    'INSERT INTO tenants (id, name, domain, locale, timezone, active) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
    [SUPERADMIN_TENANT_ID, 'Super Admin', 'admin.localhost', 'es', 'UTC', true],
  )
  logger.info('Superadmin tenant ensured')

  // ==================== SUPERADMIN USER ====================
  const adminResult = await pool.query(
    `INSERT INTO users (email, password, name, role, phone, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, email) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name RETURNING id`,
    ['admin@transallendes.com', HASH, 'Super Admin', 'superadmin', '+56912345678', SUPERADMIN_TENANT_ID],
  )
  logger.info('Superadmin user ensured', { id: adminResult.rows[0]?.id })

  // Remove superadmin from company tenant if they existed there before
  await pool.query('DELETE FROM users WHERE tenant_id = $1 AND role = $2 AND email = $3 AND id != $4', [
    COMPANY_TENANT_ID,
    'superadmin',
    'admin@transallendes.com',
    adminResult.rows[0]?.id ?? -1,
  ])

  // ==================== COMPANY TENANT (Transallendes) ====================
  await pool.query(
    'INSERT INTO tenants (id, name, domain, locale, timezone, active) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
    [COMPANY_TENANT_ID, 'Transallendes', 'localhost', 'es', 'America/Santiago', true],
  )
  logger.info('Company tenant ensured')

  // ==================== COMPANY ADMIN USER ====================
  const companyAdminResult = await pool.query(
    `INSERT INTO users (email, password, name, role, phone, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, email) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name RETURNING id`,
    ['admin@transallendes.cl', HASH, 'Admin Transallendes', 'admin', '+56987654321', COMPANY_TENANT_ID],
  )
  logger.info('Company admin ensured', { id: companyAdminResult.rows[0]?.id })

  // ==================== CLIENTS ====================
  const clientData = [
    {
      name: 'Distribuidora del Sur Ltda.',
      rut: '76543210-5',
      email: 'contacto@distribuidorasur.cl',
      phone: '+56225567890',
      address: 'Av. Vicuña Mackenna 1234, Santiago',
    },
    {
      name: 'Minera del Norte S.A.',
      rut: '76543211-3',
      email: 'logistica@mineranorte.cl',
      phone: '+56225567891',
      address: 'Av. Apoquindo 5678, Santiago',
    },
    {
      name: 'Agroindustrial Los Ríos SpA.',
      rut: '76543212-1',
      email: 'operaciones@agrorios.cl',
      phone: '+56225567892',
      address: 'Ruta 5 Sur Km 345, Rancagua',
    },
  ]

  const clientIds: number[] = []
  for (const c of clientData) {
    const result = await pool.query(
      'INSERT INTO clients (name, rut, email, phone, address, status, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO NOTHING RETURNING id',
      [c.name, c.rut, c.email, c.phone, c.address, 'active', COMPANY_TENANT_ID],
    )
    if (result.rows.length > 0) clientIds.push(result.rows[0].id)
  }
  logger.info(`Clients ensured: ${clientData.length}`)

  // ==================== DRIVERS ====================
  const driverData = [
    {
      name: 'Carlos Muñoz',
      email: 'carlos.munoz@transallendes.cl',
      phone: '+56911111111',
      license_type: 'A5',
      license_number: 'LIC-001',
      status: 'available',
    },
    {
      name: 'María González',
      email: 'maria.gonzalez@transallendes.cl',
      phone: '+56922222222',
      license_type: 'A5',
      license_number: 'LIC-002',
      status: 'on_trip',
    },
    {
      name: 'José Martínez',
      email: 'jose.martinez@transallendes.cl',
      phone: '+56933333333',
      license_type: 'A4',
      license_number: 'LIC-003',
      status: 'available',
    },
    {
      name: 'Ana Rodríguez',
      email: 'ana.rodriguez@transallendes.cl',
      phone: '+56944444444',
      license_type: 'A5',
      license_number: 'LIC-004',
      status: 'resting',
    },
    {
      name: 'Pedro Silva',
      email: 'pedro.silva@transallendes.cl',
      phone: '+56955555555',
      license_type: 'A4',
      license_number: 'LIC-005',
      status: 'inactive',
    },
  ]

  const driverIds: number[] = []
  for (const d of driverData) {
    const result = await pool.query(
      'INSERT INTO drivers (name, email, phone, license_type, license_number, status, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO NOTHING RETURNING id',
      [d.name, d.email, d.phone, d.license_type, d.license_number, d.status, COMPANY_TENANT_ID],
    )
    if (result.rows.length > 0) driverIds.push(result.rows[0].id)
  }
  logger.info(`Drivers ensured: ${driverData.length}`)

  // ==================== TRUCKS ====================
  const truckData = [
    {
      plate: 'ABCD-11',
      brand: 'Scania',
      model: 'R460',
      year: 2023,
      capacity_kg: 26000,
      capacity_m3: 90,
      fuel_type: 'Diesel',
      status: 'active',
      driverIdx: 0,
    },
    {
      plate: 'BCDE-22',
      brand: 'Volvo',
      model: 'FH540',
      year: 2024,
      capacity_kg: 28000,
      capacity_m3: 95,
      fuel_type: 'Diesel',
      status: 'active',
      driverIdx: 1,
    },
    {
      plate: 'CDEF-33',
      brand: 'Mercedes-Benz',
      model: 'Actros 2651',
      year: 2022,
      capacity_kg: 25000,
      capacity_m3: 85,
      fuel_type: 'Diesel',
      status: 'in_maintenance',
      driverIdx: -1,
    },
    {
      plate: 'DEFG-44',
      brand: 'Scania',
      model: 'R500',
      year: 2024,
      capacity_kg: 27000,
      capacity_m3: 92,
      fuel_type: 'Diesel',
      status: 'active',
      driverIdx: 2,
    },
    {
      plate: 'EFGH-55',
      brand: 'Freightliner',
      model: 'Cascadia 126',
      year: 2021,
      capacity_kg: 24000,
      capacity_m3: 82,
      fuel_type: 'Diesel',
      status: 'out_of_service',
      driverIdx: -1,
    },
  ]

  const truckIds: number[] = []
  for (const t of truckData) {
    const gpsId = t.status === 'active' ? `gps-${t.plate.toLowerCase()}` : null
    const result = await pool.query(
      'INSERT INTO trucks (plate, brand, model, year, capacity_kg, capacity_m3, status, driver_id, gps_device_id, gps_provider, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (tenant_id, plate) DO UPDATE SET gps_device_id = COALESCE(EXCLUDED.gps_device_id, trucks.gps_device_id), gps_provider = COALESCE(EXCLUDED.gps_provider, trucks.gps_provider) RETURNING id',
      [
        t.plate,
        t.brand,
        t.model,
        t.year,
        t.capacity_kg,
        t.capacity_m3,
        t.status,
        t.driverIdx >= 0 ? driverIds[t.driverIdx] : null,
        gpsId,
        gpsId ? 'mock' : null,
        COMPANY_TENANT_ID,
      ],
    )
    if (result.rows.length > 0) truckIds.push(result.rows[0].id)
  }
  logger.info(`Trucks ensured: ${truckData.length}`)

  // ==================== GEOFENCES ====================
  const geofenceData = [
    {
      name: 'Terminal Santiago Centro',
      type: 'circle',
      center_lat: -33.4489,
      center_lng: -70.6693,
      radius_meters: 500,
      city: 'Santiago',
    },
    {
      name: 'Zona Franca Rancagua',
      type: 'circle',
      center_lat: -34.1708,
      center_lng: -70.7445,
      radius_meters: 1000,
      city: 'Rancagua',
    },
    {
      name: 'Puerto San Antonio',
      type: 'circle',
      center_lat: -33.5941,
      center_lng: -71.6218,
      radius_meters: 1500,
      city: 'San Antonio',
    },
  ]

  for (const g of geofenceData) {
    await pool.query(
      'INSERT INTO geofences (name, type, center_lat, center_lng, radius_meters, city, active, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
      [g.name, g.type, g.center_lat, g.center_lng, g.radius_meters, g.city, true, COMPANY_TENANT_ID],
    )
  }
  logger.info(`Geofences ensured: ${geofenceData.length}`)

  // ==================== TRIPS ====================
  if (clientIds.length > 0 && driverIds.length > 0 && truckIds.length > 0) {
    const tripData = [
      {
        trip_number: 'TMS-001',
        clientIdx: 0,
        driverIdx: 0,
        truckIdx: 0,
        origin: 'Santiago',
        destination: 'Rancagua',
        status: 'completed',
        departure_at: addDays(today, -5),
        estimated_arrival_at: addDays(today, -4),
        actual_arrival_at: addDays(today, -4),
        distance_km: 87,
        cargo_description: 'Alimentos no perecibles',
        cargo_weight_kg: 15000,
        cargo_value: 25000000,
        billing_status: 'paid',
      },
      {
        trip_number: 'TMS-002',
        clientIdx: 1,
        driverIdx: 1,
        truckIdx: 1,
        origin: 'Antofagasta',
        destination: 'Santiago',
        status: 'in_progress',
        departure_at: addDays(today, -1),
        estimated_arrival_at: addDays(today, 1),
        actual_arrival_at: null,
        distance_km: 1365,
        cargo_description: 'Cobre refinado',
        cargo_weight_kg: 22000,
        cargo_value: 85000000,
        billing_status: 'pending',
      },
      {
        trip_number: 'TMS-003',
        clientIdx: 2,
        driverIdx: 2,
        truckIdx: 3,
        origin: 'Rancagua',
        destination: 'Talca',
        status: 'pending',
        departure_at: addDays(today, 2),
        estimated_arrival_at: addDays(today, 2),
        actual_arrival_at: null,
        distance_km: 185,
        cargo_description: 'Fertilizantes agrícolas',
        cargo_weight_kg: 20000,
        cargo_value: 12000000,
        billing_status: 'pending',
      },
    ]

    for (const t of tripData) {
      const existing = await pool.query('SELECT id FROM trips WHERE trip_number = $1 AND tenant_id = $2', [
        t.trip_number,
        COMPANY_TENANT_ID,
      ])
      if (existing.rows.length > 0) continue

      await pool.query(
        `INSERT INTO trips (trip_number, client_id, driver_id, truck_id, origin_city, destination_city, status, departure_at, estimated_arrival_at, actual_arrival_at, distance_km, cargo_description, cargo_weight_kg, cargo_value, billing_status, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          t.trip_number,
          clientIds[t.clientIdx],
          driverIds[t.driverIdx],
          truckIds[t.truckIdx],
          t.origin,
          t.destination,
          t.status,
          t.departure_at,
          t.estimated_arrival_at,
          t.actual_arrival_at,
          t.distance_km,
          t.cargo_description,
          t.cargo_weight_kg,
          t.cargo_value,
          t.billing_status,
          COMPANY_TENANT_ID,
        ],
      )
    }
    logger.info(`Trips ensured: ${tripData.length}`)
  }

  logger.info('Seed completed successfully')
}

seed()
  .catch((err) => {
    logger.error('Seed failed', { error: (err as Error).message, stack: (err as Error).stack })
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
