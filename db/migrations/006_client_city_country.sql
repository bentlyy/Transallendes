-- Agregar columnas city y country a la tabla clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country TEXT;