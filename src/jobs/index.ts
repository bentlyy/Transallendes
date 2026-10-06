import { startAlertEngine } from './alert-engine.job.js'
import { startGpsPolling } from './gps-polling.job.js'
import { startGeofenceDetection } from './geofence-detection.job.js'
import { startTripUpdate } from './trip-update.job.js'
import { startMaintenanceReminder } from './maintenance-reminder.job.js'
import { startDocumentExpiry } from './document-expiry.job.js'
import { startReportGenerator } from './report-generator.job.js'
import { startPartitionEnsure } from './partition-ensure.job.js'
import { logger } from '../utils/logger.js'

export function startAllJobs() {
  startAlertEngine()
  startGpsPolling()
  startGeofenceDetection()
  startTripUpdate()
  startMaintenanceReminder()
  startDocumentExpiry()
  startReportGenerator()
  startPartitionEnsure()
  logger.info('All background jobs registered')
}
