import { logger } from '../utils/logger.js'

export interface JobContext {
  tenantId: string
  jobName: string
  startedAt: Date
}

export interface JobResult {
  success: boolean
  processed: number
  errors: number
  duration: number
  details?: Record<string, unknown>
}

export abstract class BaseJob {
  abstract name: string
  abstract execute(ctx: JobContext): Promise<JobResult>

  async run(): Promise<JobResult> {
    const startTime = Date.now()
    const ctx: JobContext = {
      tenantId: process.env.DEFAULT_TENANT_ID || 'default',
      jobName: this.name,
      startedAt: new Date(),
    }
    try {
      const result = await this.execute(ctx)
      result.duration = Date.now() - startTime
      logger.info(`Job ${this.name} completed`, result)
      return result
    } catch (error) {
      logger.error(`Job ${this.name} failed`, { error })
      throw error
    }
  }
}
