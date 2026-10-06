import nodemailer, { Transporter } from 'nodemailer'
import { logger } from '../utils/logger.js'
import { tenantService } from './multi-tenant.service.js'

let sgMail: any = null
let sgMailLoaded = false
const loadSendGrid = async (): Promise<any> => {
  if (sgMailLoaded) return sgMail
  sgMailLoaded = true
  try {
    const mod = await import('@sendgrid/mail' as string)
    sgMail = (mod as any).default || mod
  } catch {
    sgMail = null
    logger.warn('[Email] @sendgrid/mail not installed; SendGrid provider unavailable')
  }
  return sgMail
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  tenantId?: string
}

export interface EmailResult {
  sent: boolean
  error?: string
}

type EmailProvider = 'sendgrid' | 'smtp' | 'log'

let provider: EmailProvider = 'log'
let transporter: Transporter | null = null
const DEFAULT_FROM_NAME = 'Transporte'

const getFromName = (tenantId?: string): string => {
  if (tenantId) {
    const tenant = tenantService.getById(tenantId)
    if (tenant?.config?.email_from_name) return String(tenant.config.email_from_name)
  }
  return DEFAULT_FROM_NAME
}

const getFromEmail = (tenantId?: string): string => {
  if (tenantId) {
    const tenant = tenantService.getById(tenantId)
    if (tenant?.config?.email_from_address) return String(tenant.config.email_from_address)
  }
  return process.env.EMAIL_USER || 'noreply@transallendes.com'
}

const initSendGrid = async (): Promise<boolean> => {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) return false

  const mod = await loadSendGrid()
  if (!mod) return false

  try {
    mod.setApiKey(apiKey)
    provider = 'sendgrid'
    logger.info('[Email] SendGrid provider configured')
    return true
  } catch (err) {
    const error = err as Error
    logger.error('[Email] Error configuring SendGrid:', { error: error.message })
    return false
  }
}

const initSMTP = (): boolean => {
  const emailUser = process.env.EMAIL_USER
  const emailPass = process.env.EMAIL_PASS

  if (!emailUser || !emailPass) return false

  try {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: emailUser, pass: emailPass },
    })
    provider = 'smtp'
    logger.info('[Email] SMTP (Gmail) provider configured')
    return true
  } catch (err) {
    const error = err as Error
    logger.error('[Email] Error creating SMTP transport:', { error: error.message })
    return false
  }
}

export const validateEmailConfig = async (): Promise<void> => {
  const sgOk = await initSendGrid()
  if (!sgOk) initSMTP()

  if (provider === 'smtp' && transporter) {
    transporter.verify((err: Error | null) => {
      if (err) {
        logger.error('[Email] SMTP verification failed:', { error: (err as Error).message })
      } else {
        logger.info('[Email] SMTP connection verified')
      }
    })
  }

  if (provider === 'log') {
    logger.warn('[Email] No provider configured. Emails will be logged to console.')
    logger.warn('[Email] Set SENDGRID_API_KEY or EMAIL_USER + EMAIL_PASS environment variables.')
  }
}

const sendViaSendGrid = async ({ to, subject, html, tenantId }: EmailOptions): Promise<EmailResult> => {
  const mod = await loadSendGrid()
  if (!mod) return { sent: false, error: 'SendGrid not installed' }
  try {
    await mod.send({
      to,
      from: { email: getFromEmail(tenantId), name: getFromName(tenantId) },
      subject,
      html,
    })
    return { sent: true }
  } catch (err) {
    const error = err as Error
    logger.error('[Email] SendGrid error:', { error: error.message, to, subject })
    return { sent: false, error: error.message }
  }
}

const sendViaSMTP = async ({ to, subject, html, tenantId }: EmailOptions): Promise<EmailResult> => {
  if (!transporter) return { sent: false, error: 'SMTP not initialized' }

  try {
    await transporter.sendMail({
      from: `"${getFromName(tenantId)}" <${getFromEmail(tenantId)}>`,
      to,
      subject,
      html,
    })
    return { sent: true }
  } catch (err) {
    const error = err as Error
    logger.error('[Email] SMTP error:', { error: error.message, stack: error.stack, to, subject })
    return { sent: false, error: error.message }
  }
}

export const sendEmail = async (options: EmailOptions): Promise<EmailResult> => {
  if (provider === 'log') {
    logger.info(`[Email] Log mode — To: ${options.to} | Subject: ${options.subject}`)
    return { sent: true }
  }

  if (provider === 'sendgrid') return sendViaSendGrid(options)
  if (provider === 'smtp') return sendViaSMTP(options)

  logger.warn('[Email] No provider — log mode')
  return { sent: true }
}
