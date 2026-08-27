# TRANSA-LOGISTICS / Transallendes TMS

Transport Management System para flota de carga internacional (Chile, Argentina, Brasil, Paraguay).

## Credenciales de Acceso

### Superadmin (gestiona tenants)
| Campo | Valor |
|-------|-------|
| Email | `admin@transallendes.com` |
| Password | `Admin123!` |
| Tenant | `__superadmin__` |
| Rol | `superadmin` |

### Admin de Empresa (gestiona la flota)
| Campo | Valor |
|-------|-------|
| Email | `admin@transallendes.cl` |
| Password | `Admin123!` |
| Tenant | `transallendes` |
| Rol | `admin` |

> **Nota:** El password por defecto es `Admin123!` (configurable via variable `SEED_PASSWORD`).

## URLs de Servicios

| Servicio | URL (Docker) | Puerto |
|----------|-------------|--------|
| Backend API | `http://localhost:3001` | 3001 |
| Frontend | `http://localhost:5174` | 5174 |
| Database (PostGIS) | `localhost:5433` | 5433 |
| Health Check | `http://localhost:3001/health` | - |

## Variables de Entorno

### Archivo `.env`

```
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transallendes

# JWT (CRITICAL - Cambiar en producción)
JWT_SECRET=CHANGEME_jwt_secret_key_min_32_chars_long
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Encryption (CRITICAL - Cambiar en producción)
ENCRYPTION_KEY=CHANGEME_encryption_key_16_chars

# HMAC Audit (CRITICAL - Cambiar en producción)
AUDIT_HMAC_SECRET=CHANGEME_audit_hmac_secret_32_chars_long

# Multi-tenant
DEFAULT_TENANT_ID=transallendes

# Frontend
FRONTEND_URL=http://localhost:5174

# Email (opcional)
EMAIL_PROVIDER=log
SENDGRID_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Stripe (opcional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# GPS Providers (opcional)
WIALON_API_KEY=
TRACCAR_API_KEY=
TELTONIKA_API_KEY=

# Sentry (opcional)
SENTRY_DSN=
```

### Credenciales Docker Compose

| Variable | Valor | Archivo |
|----------|-------|---------|
| `POSTGRES_USER` | `postgres` | `docker-compose.yml` |
| `POSTGRES_PASSWORD` | `postgres` | `docker-compose.yml` |
| `POSTGRES_DB` | `transallendes` | `docker-compose.yml` |
| `JWT_SECRET` | `dev_jwt_secret_key_min_32_chars_long` | `docker-compose.yml` |
| `ENCRYPTION_KEY` | `dev_encryption_key` | `docker-compose.yml` |
| `AUDIT_HMAC_SECRET` | `dev_audit_hmac_secret_32_chars_long` | `docker-compose.yml` |

### Hash de Contraseña (Seed)

El seed usa bcrypt con 12 rounds. Password por defecto: `Admin123!`

- Salt hardcoded en `crypto.service.ts`: `encryption-key-salt`
- Fallback HMAC en `crypto.service.ts`: `default-hmac-secret-change-in-production`

## Inicio Rápido

### Con Docker (Recomendado)

```bash
# 1. Levantar servicios
docker compose up -d --build

# 2. Seed automático (se ejecuta via docker-entrypoint.sh)
# El backend ejecuta seed al iniciar

# 3. Verificar salud
curl http://localhost:3001/health
```

### Sin Docker (Desarrollo Local)

```bash
# 1. Instalar PostgreSQL con PostGIS
# 2. Crear base de datos
createdb transallendes

# 3. Ejecutar init.sql
psql -d transallendes -f db/init.sql

# 4. Instalar dependencias backend
npm install

# 5. Ejecutar seed
npm run seed

# 6. Instalar dependencias frontend
cd frontend && npm install && cd ..

# 7. Iniciar backend
npm run dev

# 8. Iniciar frontend (otra terminal)
npm run dev:frontend
```

## Comandos Útiles

```bash
# Backend
npm run dev          # Desarrollo
npm run build        # Build producción
npm run typecheck    # Verificar tipos
npm run lint         # Linting
npm run test         # Tests
npm run seed         # Seed base de datos
npm run simulate     # Simulador GPS

# Docker
docker compose up -d           # Levantar
docker compose down            # Detener
docker compose logs backend    # Logs backend
docker compose logs frontend   # Logs frontend
docker compose exec backend npm run seed  # Re-seed
```

## Cuentas de Seed (Datos de Prueba)

### Usuarios
| Email | Rol | Tenant |
|-------|-----|--------|
| `admin@transallendes.com` | superadmin | `__superadmin__` |
| `admin@transallendes.cl` | admin | `transallendes` |

### Clientes (Tenant: transallendes)
| Nombre | RUT | Email |
|--------|-----|-------|
| Distribuidora del Sur Ltda. | 76543210-5 | contacto@distribuidorasur.cl |
| Minera del Norte S.A. | 76543211-3 | logistica@mineranorte.cl |
| Agroindustrial Los Ríos SpA. | 76543212-1 | operaciones@agrorios.cl |

### Conductores (Tenant: transallendes)
| Nombre | Email | Licencia | Estado |
|--------|-------|----------|--------|
| Carlos Muñoz | carlos.munoz@transallendes.cl | A5 | available |
| María González | maria.gonzalez@transallendes.cl | A5 | on_trip |
| José Martínez | jose.martinez@transallendes.cl | A4 | available |
| Ana Rodríguez | ana.rodriguez@transallendes.cl | A5 | resting |
| Pedro Silva | pedro.silva@transallendes.cl | A4 | inactive |

### Vehículos (Tenant: transallendes)
| Placa | Marca | Modelo | Estado | GPS |
|-------|-------|--------|--------|-----|
| ABCD-11 | Scania | R460 | active | gps-abcd-11 |
| BCDE-22 | Volvo | FH540 | active | gps-bcde-22 |
| CDEF-33 | Mercedes-Benz | Actros 2651 | in_maintenance | - |
| DEFG-44 | Scania | R500 | active | gps-defg-44 |
| EFGH-55 | Freightliner | Cascadia 126 | out_of_service | - |

### Geocercas
| Nombre | Ciudad | Radio |
|--------|--------|-------|
| Terminal Santiago Centro | Santiago | 500m |
| Zona Franca Rancagua | Rancagua | 1000m |
| Puerto San Antonio | San Antonio | 1500m |

### Viajes
| Número | Origen | Destino | Estado |
|--------|--------|---------|--------|
| TMS-001 | Santiago | Rancagua | completed |
| TMS-002 | Antofagasta | Santiago | in_progress |
| TMS-003 | Rancagua | Talca | pending |

## API Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/trucks` | Listar camiones |
| GET | `/api/trips` | Listar viajes |
| GET | `/api/drivers` | Listar conductores |
| GET | `/api/clients` | Listar clientes |
| GET | `/api/geofences` | Listar geocercas |
| GET | `/api/alerts` | Listar alertas |
| GET | `/api/analytics/dashboard` | Dashboard ejecutivo |
| GET | `/api/map/data` | Datos del mapa |
| GET | `/api/billing` | Facturación |
| GET | `/api/maintenance` | Mantención |
| GET | `/api/reports` | Reportes |
| GET | `/api/notifications` | Notificaciones |

## Seguridad

- JWT con access/refresh tokens
- TOTP 2FA habilitado
- Rate limiting global y por endpoint de auth
- Helmet, CORS, HPP
- Validación con Zod
- Audit logs con HMAC
- Multi-tenancy completo

## Estado MVP

### Completado
- Multi-tenancy con middleware
- Auth JWT + refresh tokens + 2FA
- 15 módulos API
- 8 background jobs
- DB particionada (GPS positions por mes)
- Seed con datos chilenos
- Docker Compose funcional
- Typecheck limpio (backend y frontend)
- 25 tests pasando

### Pendiente para MVP
- Tests de integración (coverage actual: 11.25%)
- Secrets reales (los actuales son placeholders)
- Integración frontend completa (CRUDs)
- Conexión GPS real (solo mock provider)
- Email transaccional (SendGrid/SMTP)
- Documentación API (Swagger)
- CI/CD pipeline
