import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

// Tipos para el sistema de auditoría
export type AuditEntityType = 'booking' | 'order' | 'subscription' | 'user'

export type AuditAction =
  | 'cancel'
  | 'reschedule'
  | 'refund'
  | 'status_change'
  | 'complete'
  | 'no_show'
  | 'create'
  | 'update'
  | 'delete'
  | 'resend_email'
  | 'role_change'

interface CreateAuditLogParams {
  actorId: string
  actorEmail: string
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  before?: Prisma.InputJsonValue
  after?: Prisma.InputJsonValue
  reason?: string
  metadata?: Prisma.InputJsonValue
}

/**
 * Crea un registro de auditoría para una acción administrativa
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  return prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      before: params.before,
      after: params.after,
      reason: params.reason,
      metadata: params.metadata,
    },
  })
}

interface GetAuditLogsParams {
  entityType?: AuditEntityType
  entityId?: string
  actorId?: string
  action?: AuditAction
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

/**
 * Obtiene registros de auditoría con filtros opcionales
 */
export async function getAuditLogs(params: GetAuditLogsParams = {}) {
  const where: Record<string, unknown> = {}

  if (params.entityType) {where.entityType = params.entityType}
  if (params.entityId) {where.entityId = params.entityId}
  if (params.actorId) {where.actorId = params.actorId}
  if (params.action) {where.action = params.action}

  if (params.from || params.to) {
    where.createdAt = {}
    if (params.from) {(where.createdAt as Record<string, Date>).gte = params.from}
    if (params.to) {(where.createdAt as Record<string, Date>).lte = params.to}
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params.limit ?? 50,
    skip: params.offset ?? 0,
  })
}

/**
 * Obtiene el historial de auditoría para una entidad específica
 */
export async function getEntityAuditHistory(
  entityType: AuditEntityType,
  entityId: string
) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Cuenta registros de auditoría con filtros opcionales
 */
export async function countAuditLogs(params: Omit<GetAuditLogsParams, 'limit' | 'offset'> = {}) {
  const where: Record<string, unknown> = {}

  if (params.entityType) {where.entityType = params.entityType}
  if (params.entityId) {where.entityId = params.entityId}
  if (params.actorId) {where.actorId = params.actorId}
  if (params.action) {where.action = params.action}

  if (params.from || params.to) {
    where.createdAt = {}
    if (params.from) {(where.createdAt as Record<string, Date>).gte = params.from}
    if (params.to) {(where.createdAt as Record<string, Date>).lte = params.to}
  }

  return prisma.auditLog.count({ where })
}
