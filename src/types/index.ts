export type UserRole = 'superadmin' | 'admin' | 'client_admin' | 'client_viewer' | 'driver' | 'user'

export type TruckStatus = 'active' | 'in_maintenance' | 'out_of_service' | 'retired'

export type DriverStatus = 'available' | 'on_trip' | 'resting' | 'inactive'

export type TripStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'delayed'

export type BillingStatus = 'pending' | 'invoiced' | 'paid' | 'overdue'

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency'

export type GeofenceType = 'circle' | 'polygon' | 'corridor'

export type MaintenanceType = 'preventive' | 'corrective' | 'inspection' | 'tire_change' | 'oil_change' | 'other'

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export type DocumentStatus = 'active' | 'expired' | 'archived'

export interface User {
  id: number
  email: string
  password: string
  role: UserRole
  name: string
  phone?: string
  tenant_id: string
  client_id?: number
  blocked_until?: Date
  created_at: Date
  updated_at: Date
}

export interface Truck {
  id: number
  license_plate: string
  brand: string
  model: string
  year: number
  vin: string
  capacity_kg: number
  capacity_m3: number
  fuel_type: string
  status: TruckStatus
  driver_id?: number
  tenant_id: string
  gps_device_id?: string
  last_gps_position?: GpsPosition
  created_at: Date
  updated_at: Date
}

export interface Driver {
  id: number
  user_id?: number
  name: string
  email: string
  phone: string
  license_number: string
  license_expiry: Date
  status: DriverStatus
  tenant_id: string
  current_trip_id?: number
  current_truck_id?: number
  last_gps_position?: GpsPosition
  created_at: Date
  updated_at: Date
}

export interface Client {
  id: number
  name: string
  business_name: string
  tax_id: string
  email: string
  phone: string
  address: string
  contact_name?: string
  contact_phone?: string
  tenant_id: string
  billing_address?: string
  payment_terms?: string
  credit_limit?: number
  status: string
  created_at: Date
  updated_at: Date
}

export interface Trip {
  id: number
  trip_number: string
  client_id: number
  driver_id?: number
  truck_id?: number
  origin: string
  origin_lat?: number
  origin_lng?: number
  destination: string
  destination_lat?: number
  destination_lng?: number
  scheduled_start: Date
  scheduled_end: Date
  actual_start?: Date
  actual_end?: Date
  status: TripStatus
  distance_km?: number
  estimated_duration_min?: number
  cargo_description?: string
  cargo_weight_kg?: number
  cargo_value?: number
  notes?: string
  tenant_id: string
  billing_status?: BillingStatus
  invoice_id?: number
  created_at: Date
  updated_at: Date
}

export interface GpsPosition {
  lat: number
  lng: number
  altitude?: number
  speed?: number
  heading?: number
  accuracy?: number
  timestamp: Date
}

export interface Geofence {
  id: number
  name: string
  type: GeofenceType
  geometry: Record<string, unknown>
  tenant_id: string
  active: boolean
  alert_on_entry: boolean
  alert_on_exit: boolean
  created_at: Date
  updated_at: Date
}

export interface Alert {
  id: number
  type: string
  severity: AlertSeverity
  title: string
  message: string
  resource_type?: string
  resource_id?: number
  driver_id?: number
  truck_id?: number
  trip_id?: number
  geofence_id?: number
  acknowledged: boolean
  acknowledged_by?: number
  acknowledged_at?: Date
  tenant_id: string
  created_at: Date
}

export interface Maintenance {
  id: number
  truck_id: number
  type: MaintenanceType
  status: MaintenanceStatus
  description: string
  scheduled_date: Date
  completed_date?: Date
  cost?: number
  vendor?: string
  notes?: string
  mileage_at_service?: number
  tenant_id: string
  created_at: Date
  updated_at: Date
}

export interface Document {
  id: number
  name: string
  type: string
  file_url: string
  file_size?: number
  mime_type?: string
  status: DocumentStatus
  expiry_date?: Date
  resource_type: string
  resource_id: number
  tenant_id: string
  uploaded_by?: number
  created_at: Date
  updated_at: Date
}

export interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  type: string
  read: boolean
  read_at?: Date
  tenant_id: string
  created_at: Date
}

export interface AuditLog {
  id: number
  user_id?: number
  action: string
  resource_type: string
  resource_id?: number
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  tenant_id?: string
  created_at: Date
}

export interface Tenant {
  id: string
  name: string
  domain: string
  locale: string
  timezone: string
  config: Record<string, unknown>
  active: boolean
  created_at: Date
  updated_at: Date
}

export interface RefreshToken {
  id: number
  user_id: number
  token_hash: string
  expires_at: Date
  revoked: boolean
  created_at: Date
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface GpsData {
  device_id: string
  lat: number
  lng: number
  altitude?: number
  speed?: number
  heading?: number
  accuracy?: number
  timestamp: string
  ignition?: boolean
  odometer?: number
  fuel_level?: number
  battery_voltage?: number
  engine_status?: string
  extra?: Record<string, unknown>
}
