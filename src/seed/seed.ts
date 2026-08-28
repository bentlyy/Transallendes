import { pool } from '../shared/db.js'
import bcrypt from 'bcrypt'
import { logger } from '../utils/logger.js'

const SUPERADMIN_TENANT_ID = '__superadmin__'
const COMPANY_TENANT_ID = 'transallendes'

let _HASH: string | null = null
const getHash = async (): Promise<string> => {
  if (!_HASH) _HASH = await bcrypt.hash(process.env.SEED_PASSWORD || 'Admin123!', 12)
  return _HASH
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

  // ==================== EXTRA CLIENTS (richer fields) ====================
  const extraClientData = [
    {
      name: 'Vinos del Valle Ltda.',
      rut: '76543213-8',
      email: 'contacto@vinosdelvalle.cl',
      phone: '+56225567893',
      address: 'Camino Real 456, Viña del Mar',
      city: 'Viña del Mar',
      country: 'Chile',
      contact_name: 'Roberto Fuentes',
      contact_email: 'r.fuentes@vinosdelvalle.cl',
      contact_phone: '+56966660001',
    },
    {
      name: 'Ferretería Central SpA.',
      rut: '76543214-6',
      email: 'compras@ferretera.cl',
      phone: '+56225567894',
      address: 'Av. Matta 890, Concepción',
      city: 'Concepción',
      country: 'Chile',
      contact_name: 'Daniela Rojas',
      contact_email: 'd.rojas@ferretera.cl',
      contact_phone: '+56966660002',
    },
    {
      name: 'Exportadora Patagonia S.A.',
      rut: '76543215-4',
      email: 'ops@exportpatagonia.cl',
      phone: '+56225567895',
      address: 'Ruta 5 Norte Km 1200, Puerto Montt',
      city: 'Puerto Montt',
      country: 'Chile',
      contact_name: 'Fernando Lagos',
      contact_email: 'f.lagos@exportpatagonia.cl',
      contact_phone: '+56966660003',
    },
    {
      name: 'Cemento Andino S.A.',
      rut: '76543216-2',
      email: 'log@cementoandino.cl',
      phone: '+56225567896',
      address: 'Avenida Industrial 234, Antofagasta',
      city: 'Antofagasta',
      country: 'Chile',
      contact_name: 'Paola Méndez',
      contact_email: 'p.mendez@cementoandino.cl',
      contact_phone: '+56966660004',
    },
    {
      name: 'Frutas del Maule SpA.',
      rut: '76543217-0',
      email: 'admin@frutasdelmaule.cl',
      phone: '+56225567897',
      address: 'Camino a San Clemente 500, Talca',
      city: 'Talca',
      country: 'Chile',
      contact_name: 'Claudio Torres',
      contact_email: 'c.torres@frutasdelmaule.cl',
      contact_phone: '+56966660005',
    },
  ]

  const extraClientIds: number[] = []
  for (const c of extraClientData) {
    const result = await pool.query(
      `INSERT INTO clients (name, rut, email, phone, address, city, country, contact_name, contact_email, contact_phone, status, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (tenant_id, email) DO UPDATE SET
         name = EXCLUDED.name, city = EXCLUDED.city, country = EXCLUDED.country,
         contact_name = EXCLUDED.contact_name, contact_email = EXCLUDED.contact_email,
         contact_phone = EXCLUDED.contact_phone, address = EXCLUDED.address
       RETURNING id`,
      [
        c.name,
        c.rut,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.country,
        c.contact_name,
        c.contact_email,
        c.contact_phone,
        'active',
        COMPANY_TENANT_ID,
      ],
    )
    if (result.rows.length > 0) extraClientIds.push(result.rows[0].id)
  }
  logger.info(`Extra clients ensured: ${extraClientData.length}`)

  // ==================== EXTRA DRIVERS ====================
  const extraDriverData = [
    {
      name: 'Luis Vega',
      email: 'luis.vega@transallendes.cl',
      phone: '+56966661111',
      license_type: 'A5',
      license_number: 'LIC-006',
      status: 'available',
      expiry: '2027-05-01',
    },
    {
      name: 'Carolina Díaz',
      email: 'carolina.diaz@transallendes.cl',
      phone: '+56966662222',
      license_type: 'A5',
      license_number: 'LIC-007',
      status: 'on_trip',
      expiry: '2026-11-15',
    },
    {
      name: 'Andrés Fuentes',
      email: 'andres.fuentes@transallendes.cl',
      phone: '+56966663333',
      license_type: 'A4',
      license_number: 'LIC-008',
      status: 'available',
      expiry: '2027-02-20',
    },
    {
      name: 'Valentina Paredes',
      email: 'valentina.paredes@transallendes.cl',
      phone: '+56966664444',
      license_type: 'A5',
      license_number: 'LIC-009',
      status: 'resting',
      expiry: '2028-01-10',
    },
    {
      name: 'Jorge Salinas',
      email: 'jorge.salinas@transallendes.cl',
      phone: '+56966665555',
      license_type: 'A3',
      license_number: 'LIC-010',
      status: 'available',
      expiry: '2026-09-30',
    },
  ]

  const extraDriverIds: number[] = []
  for (const d of extraDriverData) {
    const result = await pool.query(
      `INSERT INTO drivers (name, email, phone, license_type, license_number, license_expiry, current_location_lat, current_location_lng, status, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (tenant_id, email) DO UPDATE SET
         license_expiry = EXCLUDED.license_expiry,
         current_location_lat = COALESCE(drivers.current_location_lat, EXCLUDED.current_location_lat),
         current_location_lng = COALESCE(drivers.current_location_lng, EXCLUDED.current_location_lng)
       RETURNING id`,
      [
        d.name,
        d.email,
        d.phone,
        d.license_type,
        d.license_number,
        d.expiry,
        -33.4489 + extraDriverData.length * 0.01,
        -70.6693,
        d.status,
        COMPANY_TENANT_ID,
      ],
    )
    if (result.rows.length > 0) extraDriverIds.push(result.rows[0].id)
  }
  logger.info(`Extra drivers ensured: ${extraDriverData.length}`)

  // ==================== EXTRA TRUCKS ====================
  const extraTruckData = [
    {
      plate: 'FGHI-66',
      brand: 'Volvo',
      model: 'FH460',
      year: 2023,
      capacity_kg: 25000,
      capacity_m3: 88,
      fuel_type: 'Diesel',
      status: 'active',
      driverIdx: 0,
      lat: -33.4512,
      lng: -70.6631,
      speed: 74.2,
      direction: 130,
    },
    {
      plate: 'GHIJ-77',
      brand: 'MAN',
      model: 'TGX 18.480',
      year: 2024,
      capacity_kg: 26000,
      capacity_m3: 90,
      fuel_type: 'Diesel',
      status: 'in_maintenance',
      driverIdx: -1,
    },
    {
      plate: 'HIJK-88',
      brand: 'Scania',
      model: 'R520',
      year: 2025,
      capacity_kg: 28000,
      capacity_m3: 96,
      fuel_type: 'Diesel',
      status: 'active',
      driverIdx: 1,
      lat: -34.1721,
      lng: -70.744,
      speed: 58.9,
      direction: 200,
    },
    {
      plate: 'IJKL-99',
      brand: 'Renault',
      model: 'T520',
      year: 2022,
      capacity_kg: 24500,
      capacity_m3: 84,
      fuel_type: 'Diesel',
      status: 'active',
      driverIdx: 2,
      lat: -33.5943,
      lng: -71.6122,
      speed: 0.4,
      direction: 45,
    },
    {
      plate: 'JKLM-00',
      brand: 'Iveco',
      model: 'S-Way 500',
      year: 2024,
      capacity_kg: 25500,
      capacity_m3: 87,
      fuel_type: 'Diesel',
      status: 'active',
      driverIdx: 3,
      lat: -36.8201,
      lng: -73.0484,
      speed: 81.7,
      direction: 350,
    },
  ]

  const extraTruckIds: number[] = []
  for (const t of extraTruckData) {
    const gpsId = t.status === 'active' ? `gps-${t.plate.toLowerCase()}` : null
    const result = await pool.query(
      `INSERT INTO trucks (plate, brand, model, year, capacity_kg, capacity_m3, status, driver_id, gps_device_id, gps_provider, insurance_expiry, technical_review_expiry, permits, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (tenant_id, plate) DO UPDATE SET
         gps_device_id = COALESCE(EXCLUDED.gps_device_id, trucks.gps_device_id),
         gps_provider = COALESCE(EXCLUDED.gps_provider, trucks.gps_provider),
         insurance_expiry = EXCLUDED.insurance_expiry,
         technical_review_expiry = EXCLUDED.technical_review_expiry,
         permits = EXCLUDED.permits
       RETURNING id`,
      [
        t.plate,
        t.brand,
        t.model,
        t.year,
        t.capacity_kg,
        t.capacity_m3,
        t.status,
        t.driverIdx >= 0 ? extraDriverIds[t.driverIdx] : null,
        gpsId,
        gpsId ? 'mock' : null,
        '2027-03-15',
        '2027-01-20',
        JSON.stringify([{ type: 'circulacion', number: `PERM-${t.plate}`, expiry: '2027-06-30' }]),
        COMPANY_TENANT_ID,
      ],
    )
    if (result.rows.length > 0) extraTruckIds.push(result.rows[0].id)
  }
  logger.info(`Extra trucks ensured: ${extraTruckData.length}`)

  // ==================== extra geofences ====================
  const extraGeofenceData = [
    {
      name: 'Planta Viña del Mar',
      type: 'circle',
      center_lat: -33.03,
      center_lng: -71.55,
      radius_meters: 800,
      city: 'Viña del Mar',
    },
    {
      name: 'Terminal Concepción',
      type: 'circle',
      center_lat: -36.82,
      center_lng: -73.05,
      radius_meters: 1200,
      city: 'Concepción',
    },
    {
      name: 'Puerto San Antonio Norte',
      type: 'circle',
      center_lat: -33.59,
      center_lng: -71.62,
      radius_meters: 2000,
      city: 'San Antonio',
    },
    {
      name: 'Bodega Antofagasta',
      type: 'circle',
      center_lat: -23.65,
      center_lng: -70.4,
      radius_meters: 1000,
      city: 'Antofagasta',
    },
    {
      name: 'Zona Industrial Talca',
      type: 'circle',
      center_lat: -35.43,
      center_lng: -71.67,
      radius_meters: 900,
      city: 'Talca',
    },
  ]

  const geofenceCountCheck = await pool.query('SELECT COUNT(*) FROM geofences WHERE tenant_id = $1', [
    COMPANY_TENANT_ID,
  ])
  if (Number(geofenceCountCheck.rows[0].count) === 0) {
    for (const g of extraGeofenceData) {
      await pool.query(
        'INSERT INTO geofences (name, type, center_lat, center_lng, radius_meters, city, active, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [g.name, g.type, g.center_lat, g.center_lng, g.radius_meters, g.city, true, COMPANY_TENANT_ID],
      )
    }
  }
  logger.info(`Extra geofences ensured: ${extraGeofenceData.length}`)

  // ==================== SET LIVE GPS POSITIONS ON TRUCKS (Mapa) ====================
  const dat = [
    { plate: 'ABCD-11', lat: -33.4489, lng: -70.6693, speed: 0.8, direction: 90 },
    { plate: 'BCDE-22', lat: -33.452, lng: -70.667, speed: 64.5, direction: 150 },
    { plate: 'DEFG-44', lat: -34.1708, lng: -70.7445, speed: 55.2, direction: 210 },
    { plate: 'FGHI-66', lat: -33.4512, lng: -70.6631, speed: 74.2, direction: 130 },
    { plate: 'HIJK-88', lat: -34.1721, lng: -70.744, speed: 58.9, direction: 200 },
    { plate: 'IJKL-99', lat: -33.5943, lng: -71.6122, speed: 0.4, direction: 45 },
    { plate: 'JKLM-00', lat: -36.8201, lng: -73.0484, speed: 81.7, direction: 350 },
  ]
  for (const p of dat) {
    const recorded = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const pos = JSON.stringify({
      lat: p.lat,
      lng: p.lng,
      speed: p.speed,
      direction: p.direction,
      ignition: p.speed > 1,
      recorded_at: recorded,
      timestamp: recorded,
    })
    await pool.query(
      'UPDATE trucks SET last_gps_position = $2 WHERE plate = $1 AND tenant_id = $3 AND last_gps_position IS NULL',
      [p.plate, pos, COMPANY_TENANT_ID],
    )
  }
  logger.info('Truck GPS positions ensured')

  // ==================== EXTRA TRIPS + BILLING + GPS POSITIONS ====================
  const allClientIds = [...clientIds, ...extraClientIds]
  const allDriverIds = [...driverIds, ...extraDriverIds]
  const allTruckIds = [...truckIds, ...extraTruckIds]

  const extraTripData = [
    {
      trip_number: 'TMS-004',
      clientIdx: 3,
      driverIdx: 5,
      truckIdx: 5,
      origin: 'Santiago',
      destination: 'Valparaíso',
      status: 'completed',
      departure_at: addDays(today, -9),
      estimated_arrival_at: addDays(today, -8),
      actual_arrival_at: addDays(today, -8),
      distance_km: 115,
      cargo_description: 'Vinos embotellados',
      cargo_weight_kg: 18000,
      cargo_value: 45000000,
      fuel_consumed: 38,
      cost: 420000,
      billing_status: 'paid',
    },
    {
      trip_number: 'TMS-005',
      clientIdx: 4,
      driverIdx: 6,
      truckIdx: 1,
      origin: 'Concepción',
      destination: 'Santiago',
      status: 'delayed',
      departure_at: addDays(today, -2),
      estimated_arrival_at: addDays(today, 1),
      actual_arrival_at: null,
      distance_km: 510,
      cargo_description: 'Ferretería y herramientas',
      cargo_weight_kg: 16500,
      cargo_value: 28000000,
      fuel_consumed: 168,
      cost: 950000,
      billing_status: 'invoiced',
    },
    {
      trip_number: 'TMS-006',
      clientIdx: 5,
      driverIdx: 7,
      truckIdx: 7,
      origin: 'Puerto Montt',
      destination: 'Osorno',
      status: 'completed',
      departure_at: addDays(today, -14),
      estimated_arrival_at: addDays(today, -13),
      actual_arrival_at: addDays(today, -13),
      distance_km: 110,
      cargo_description: 'Productos del mar congelados',
      cargo_weight_kg: 21000,
      cargo_value: 60000000,
      fuel_consumed: 36,
      cost: 400000,
      billing_status: 'paid',
    },
    {
      trip_number: 'TMS-007',
      clientIdx: 6,
      driverIdx: 8,
      truckIdx: 8,
      origin: 'Antofagasta',
      destination: 'Calama',
      status: 'completed',
      departure_at: addDays(today, -21),
      estimated_arrival_at: addDays(today, -20),
      actual_arrival_at: addDays(today, -20),
      distance_km: 220,
      cargo_description: 'Cemento a granel',
      cargo_weight_kg: 24000,
      cargo_value: 18000000,
      fuel_consumed: 80,
      cost: 520000,
      billing_status: 'overdue',
    },
    {
      trip_number: 'TMS-008',
      clientIdx: 7,
      driverIdx: 9,
      truckIdx: 9,
      origin: 'Talca',
      destination: 'Santiago',
      status: 'cancelled',
      departure_at: addDays(today, 1),
      estimated_arrival_at: addDays(today, 1),
      actual_arrival_at: null,
      distance_km: 260,
      cargo_description: 'Frutas estacionales',
      cargo_weight_kg: 20000,
      cargo_value: 15000000,
      fuel_consumed: 0,
      cost: 0,
      billing_status: 'pending',
    },
    {
      trip_number: 'TMS-009',
      clientIdx: 0,
      driverIdx: 0,
      truckIdx: 0,
      origin: 'Santiago',
      destination: 'Rancagua',
      status: 'pending',
      departure_at: addDays(today, 3),
      estimated_arrival_at: addDays(today, 3),
      actual_arrival_at: null,
      distance_km: 87,
      cargo_description: 'Alimentos refrigerados',
      cargo_weight_kg: 14000,
      cargo_value: 20000000,
      fuel_consumed: 0,
      cost: 0,
      billing_status: 'pending',
    },
  ]

  for (const t of extraTripData) {
    const existing = await pool.query('SELECT id FROM trips WHERE trip_number = $1 AND tenant_id = $2', [
      t.trip_number,
      COMPANY_TENANT_ID,
    ])
    if (existing.rows.length > 0) continue
    await pool.query(
      `INSERT INTO trips (trip_number, client_id, driver_id, truck_id, origin_city, destination_city, status, departure_at, estimated_arrival_at, actual_arrival_at, distance_km, cargo_description, cargo_weight_kg, cargo_value, fuel_consumed, cost, billing_status, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        t.trip_number,
        allClientIds[t.clientIdx],
        allDriverIds[t.driverIdx],
        allTruckIds[t.truckIdx],
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
        t.fuel_consumed,
        t.cost,
        t.billing_status,
        COMPANY_TENANT_ID,
      ],
    )
  }
  logger.info(`Extra trips ensured: ${extraTripData.length}`)

  // ==================== BILLING ====================
  const billingCheck = await pool.query('SELECT COUNT(*) FROM billing WHERE tenant_id = $1', [COMPANY_TENANT_ID])
  if (Number(billingCheck.rows[0].count) === 0) {
    const billingData = [
      {
        invoice: 'FAC-2026-001',
        clientIdx: 0,
        total: 25000000,
        status: 'paid',
        due: addDays(today, -6),
        paid: addDays(today, -5),
      },
      {
        invoice: 'FAC-2026-002',
        clientIdx: 1,
        total: 85000000,
        status: 'invoiced',
        due: addDays(today, 20),
        paid: null,
      },
      {
        invoice: 'FAC-2026-003',
        clientIdx: 2,
        total: 12000000,
        status: 'paid',
        due: addDays(today, -8),
        paid: addDays(today, -7),
      },
      {
        invoice: 'FAC-2026-004',
        clientIdx: 5,
        total: 60000000,
        status: 'overdue',
        due: addDays(today, -2),
        paid: null,
      },
      {
        invoice: 'FAC-2026-005',
        clientIdx: 6,
        total: 18000000,
        status: 'paid',
        due: addDays(today, -10),
        paid: addDays(today, -9),
      },
      { invoice: 'FAC-2026-006', clientIdx: 7, total: 0, status: 'cancelled', due: addDays(today, 5), paid: null },
    ]
    for (const b of billingData) {
      await pool.query(
        'INSERT INTO billing (tenant_id, client_id, invoice_number, total, currency, status, due_date, paid_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [COMPANY_TENANT_ID, allClientIds[b.clientIdx], b.invoice, b.total, 'CLP', b.status, b.due, b.paid],
      )
    }
  }
  logger.info('Billing ensured')

  // ==================== GPS POSITIONS (telemetry / fuel KPI) ====================
  const gpsCheck = await pool.query('SELECT COUNT(*) FROM gps_positions WHERE tenant_id = $1', [COMPANY_TENANT_ID])
  if (Number(gpsCheck.rows[0].count) === 0) {
    const gpsTripIds = await pool.query(
      'SELECT id, truck_id, driver_id FROM trips WHERE tenant_id = $1 AND status = $2 ORDER BY id ASC LIMIT 3',
      [COMPANY_TENANT_ID, 'in_progress'],
    )
    for (let i = 0; i < 6; i++) {
      const minutesAgo = (30 - i * 4) * 60 * 1000
      const recorded = new Date(Date.now() - minutesAgo).toISOString()
      const row = gpsTripIds.rows[i % Math.max(gpsTripIds.rows.length, 1)] ?? null
      if (row) {
        await pool.query(
          `INSERT INTO gps_positions (truck_id, driver_id, trip_id, latitude, longitude, speed_kmh, direction, ignition, odometer_km, fuel_level, fuel_consumption, temperature, recorded_at, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            row.truck_id,
            row.driver_id,
            row.id,
            -33.45 + i * 0.01,
            -70.67 + i * 0.005,
            60 + i * 5,
            120 + i * 20,
            true,
            120000 + i * 120,
            65 - i * 3,
            14.2 + i * 2.1,
            18.5,
            recorded,
            COMPANY_TENANT_ID,
          ],
        )
      }
    }
  }
  logger.info('GPS positions ensured')

  // ==================== MAINTENANCE ====================
  const maintCheck = await pool.query('SELECT COUNT(*) FROM maintenance WHERE tenant_id = $1', [COMPANY_TENANT_ID])
  if (Number(maintCheck.rows[0].count) === 0) {
    const maintenanceData = [
      {
        truckPlate: 'ABCD-11',
        type: 'preventive',
        description: 'Cambio de aceite y filtros',
        scheduled: addDays(today, 5),
        completed: null,
        odometer: 154200,
        cost: 350000,
        provider: 'Taller Scania Santiago',
        status: 'scheduled',
        notes: 'Servicio preventivo 120.000 km',
      },
      {
        truckPlate: 'BCDE-22',
        type: 'oil_change',
        description: 'Cambio de aceite motor',
        scheduled: addDays(today, -3),
        completed: addDays(today, -2),
        odometer: 98000,
        cost: 280000,
        provider: 'Servicio Volvo',
        status: 'completed',
        notes: 'Aceite sintético 5W-30',
      },
      {
        truckPlate: 'CDEF-33',
        type: 'corrective',
        description: 'Reparación del sistema de frenos',
        scheduled: addDays(today, -1),
        completed: null,
        odometer: 210300,
        cost: 620000,
        provider: 'Mecánica El Sur',
        status: 'in_progress',
        notes: 'Cambio discos y pastillas',
      },
      {
        truckPlate: 'DEFG-44',
        type: 'inspection',
        description: 'Revisión técnica y alineación',
        scheduled: addDays(today, 12),
        completed: null,
        odometer: 76000,
        cost: 145000,
        provider: 'Revisión Técnica RM',
        status: 'scheduled',
        notes: 'Alteración menor detectada',
      },
      {
        truckPlate: 'GHIJ-77',
        type: 'tire_change',
        description: 'Cambio de neumáticos traseros',
        scheduled: addDays(today, -2),
        completed: addDays(today, -1),
        odometer: 132500,
        cost: 940000,
        provider: 'Neumáticos Pacífico',
        status: 'completed',
        notes: '4 cubiertas 315/80 R22.5',
      },
      {
        truckPlate: 'EFGH-55',
        type: 'corrective',
        description: 'Reparación de transmisión',
        scheduled: addDays(today, 18),
        completed: null,
        odometer: 240000,
        cost: 1850000,
        provider: 'Maestranza Norte',
        status: 'scheduled',
        notes: 'Fuera de servicio hasta reparación',
      },
    ]
    for (const m of maintenanceData) {
      const tr = await pool.query('SELECT id FROM trucks WHERE plate = $1 AND tenant_id = $2', [
        m.truckPlate,
        COMPANY_TENANT_ID,
      ])
      if (tr.rows.length === 0) continue
      await pool.query(
        `INSERT INTO maintenance (truck_id, type, description, scheduled_date, completed_date, odometer_at_km, cost, provider, status, notes, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          tr.rows[0].id,
          m.type,
          m.description,
          m.scheduled,
          m.completed,
          m.odometer,
          m.cost,
          m.provider,
          m.status,
          m.notes,
          COMPANY_TENANT_ID,
        ],
      )
    }
  }
  logger.info('Maintenance ensured')

  // ==================== ALERTS ====================
  const alertsCheck = await pool.query('SELECT COUNT(*) FROM alerts WHERE tenant_id = $1', [COMPANY_TENANT_ID])
  if (Number(alertsCheck.rows[0].count) === 0) {
    const byPlate = new Map<string, number>()
    for (const id of [...truckIds, ...extraTruckIds]) {
      const r = await pool.query('SELECT plate FROM trucks WHERE id = $1', [id])
      if (r.rows[0]) byPlate.set(r.rows[0].plate, id)
    }
    const byEmail = new Map<string, number>()
    for (const id of [...driverIds, ...extraDriverIds]) {
      const r = await pool.query('SELECT email FROM drivers WHERE id = $1', [id])
      if (r.rows[0]) byEmail.set(r.rows[0].email, id)
    }
    const alertRows = await pool.query(
      'SELECT id, trip_number FROM trips WHERE tenant_id = $1 AND status = $2 ORDER BY id ASC',
      [COMPANY_TENANT_ID, 'in_progress'],
    )
    const inProgressTripIds = alertRows.rows.map((r: any) => r.id)
    const t1 = byPlate.get('ABCD-11') ?? allTruckIds[0]
    const t2 = byPlate.get('BCDE-22') ?? allTruckIds[1]
    const t3 = byPlate.get('FGHI-66') ?? extraTruckIds[0] ?? allTruckIds[0]
    const d1 = allDriverIds[0]
    const d2 = allDriverIds[5] ?? allDriverIds[0]
    const geofenceFirst = await pool.query('SELECT id FROM geofences WHERE tenant_id = $1 ORDER BY id ASC LIMIT 1', [
      COMPANY_TENANT_ID,
    ])
    const g1 = geofenceFirst.rows[0]?.id ?? null

    const alertData = [
      {
        type: 'speeding',
        severity: 'warning',
        title: 'Exceso de velocidad',
        description: 'El vehículo BCDE-22 superó los 90 km/h en ruta 5',
        truck_id: t2,
        driver_id: d1,
        trip_id: inProgressTripIds[0] ?? null,
        geofence_id: null,
        client_id: null,
      },
      {
        type: 'geofence_exit',
        severity: 'critical',
        title: 'Salida de geocerca',
        description: 'Camión FGHI-66 abandonó la zona autorizada',
        truck_id: t3,
        driver_id: d2,
        trip_id: null,
        geofence_id: g1,
        client_id: allClientIds[0],
      },
      {
        type: 'extended_stop',
        severity: 'info',
        title: 'Detención prolongada',
        description: 'IJKL-99 detenido más de 30 minutos sin motivo',
        truck_id: byPlate.get('IJKL-99') ?? allTruckIds[0],
        driver_id: null,
        trip_id: null,
        geofence_id: null,
        client_id: null,
      },
      {
        type: 'low_fuel',
        severity: 'warning',
        title: 'Nivel de combustible bajo',
        description: 'Combustible bajo el 15% en DEFG-44',
        truck_id: byPlate.get('DEFG-44') ?? allTruckIds[2],
        driver_id: null,
        trip_id: null,
        geofence_id: null,
        client_id: null,
      },
      {
        type: 'panic',
        severity: 'emergency',
        title: 'Botón de pánico',
        description: 'Se activó el botón de pánico en viaje TMS-002',
        truck_id: t1,
        driver_id: d1,
        trip_id: inProgressTripIds[0] ?? null,
        geofence_id: null,
        client_id: null,
      },
      {
        type: 'temperature',
        severity: 'warning',
        title: 'Alerta de temperatura',
        description: 'Temperatura de carga fuera de rango en HIJK-88',
        truck_id: byPlate.get('HIJK-88') ?? allTruckIds[0],
        driver_id: null,
        trip_id: null,
        geofence_id: null,
        client_id: null,
      },
    ]
    for (let i = 0; i < alertData.length; i++) {
      const a = alertData[i]
      const created = new Date(Date.now() - (30 - i * 5) * 60 * 1000).toISOString()
      await pool.query(
        `INSERT INTO alerts (type, severity, title, description, truck_id, driver_id, trip_id, geofence_id, client_id, acknowledged, resolved, created_at, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          a.type,
          a.severity,
          a.title,
          a.description,
          a.truck_id,
          a.driver_id,
          a.trip_id,
          a.geofence_id,
          a.client_id,
          i < 2,
          i % 2 === 0,
          created,
          COMPANY_TENANT_ID,
        ],
      )
    }
  }
  logger.info('Alerts ensured')

  // ==================== REPORTS ====================
  const reportsCheck = await pool.query('SELECT COUNT(*) FROM reports WHERE tenant_id = $1', [COMPANY_TENANT_ID])
  if (Number(reportsCheck.rows[0].count) === 0) {
    const reportData = [
      { type: 'fleet_summary', format: 'pdf', status: 'completed', from: addDays(today, -30), to: today },
      { type: 'trip_report', format: 'xlsx', status: 'completed', from: addDays(today, -30), to: today },
      { type: 'driver_report', format: 'pdf', status: 'completed', from: addDays(today, -60), to: today },
      { type: 'client_report', format: 'csv', status: 'completed', from: addDays(today, -90), to: today },
      { type: 'fuel_report', format: 'pdf', status: 'completed', from: addDays(today, -30), to: today },
      { type: 'maintenance_report', format: 'pdf', status: 'pending', from: addDays(today, -15), to: today },
    ]
    for (const r of reportData) {
      await pool.query(
        `INSERT INTO reports (tenant_id, created_by, type, format, from_date, to_date, status, file_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          COMPANY_TENANT_ID,
          companyAdminResult.rows[0]?.id ?? null,
          r.type,
          r.format,
          r.from,
          r.to,
          r.status,
          r.status === 'completed' ? `/reports/${r.type}-seed.${r.format}` : null,
        ],
      )
    }
  }
  logger.info('Reports ensured')

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
