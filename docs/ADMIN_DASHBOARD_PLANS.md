# Planes de Implementación - Admin Dashboard

> Planes pragmáticos basados en el análisis del estado actual del proyecto.
> Fecha: 2026-01-18

## Resumen Ejecutivo

El proyecto ya cuenta con ~70% de la infraestructura necesaria:
- ✅ Auth con roles (NextAuth + ADMIN/USER)
- ✅ Prisma + PostgreSQL con modelos completos
- ✅ Webhooks idempotentes (WebhookEvent)
- ✅ Sistema de emails (Resend)
- ✅ Admin layout protegido
- ✅ Admin Bookings con UI (lista + filtros + modales)
- ✅ Pasarelas de pago (Wompi, ePayco)

Lo que falta:
- ❌ AuditLog (trazabilidad de acciones admin)
- ❌ EmailLog (trazabilidad de emails enviados)
- ❌ UI Orders (gestión de compras)
- ❌ UI Subscriptions (gestión de membresías)
- ❌ Dashboard con métricas de ventas
- ❌ Acciones admin con notificaciones por email

---

## Plan 0: AuditLog + EmailLog (Fundamentos de Trazabilidad)

### Objetivo
Agregar modelos de auditoría para trazabilidad completa de acciones administrativas y emails enviados.

### Archivos a modificar/crear

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `prisma/schema.prisma` | Modificar | Agregar modelos AuditLog y EmailLog |
| `lib/audit.ts` | Crear | Funciones helper para crear audit logs |
| `lib/email.ts` | Modificar | Agregar logging de emails enviados |

### Tareas

#### 1. Agregar modelos a Prisma

```prisma
// Agregar al final de schema.prisma

// ============================================
// BOUNDED CONTEXT: Audit & Logging
// ============================================

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String   // userId del admin que ejecutó la acción
  actorEmail String   // Email para referencia rápida

  entityType String   // "booking" | "order" | "subscription" | "user"
  entityId   String
  action     String   // "cancel" | "reschedule" | "refund" | "status_change" | "complete" | "no_show"

  before     Json?    // Estado anterior (snapshot)
  after      Json?    // Estado posterior (snapshot)
  reason     String?  // Motivo proporcionado por el admin
  metadata   Json?    // Datos adicionales (IP, user agent, etc.)

  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorId])
  @@index([createdAt])
  @@map("audit_logs")
}

model EmailLog {
  id                String   @id @default(cuid())
  to                String   // Email destinatario
  template          String   // "booking_confirmation" | "booking_cancelled" | "booking_rescheduled" | etc.
  subject           String?  // Asunto del email

  entityType        String?  // "booking" | "order" | "subscription"
  entityId          String?

  status            String   @default("PENDING") // "PENDING" | "SENT" | "FAILED"
  providerMessageId String?  // ID de Resend
  errorMessage      String?  // Mensaje de error si falló

  metadata          Json?    // Datos adicionales del email

  sentAt            DateTime?
  createdAt         DateTime @default(now())

  @@index([to])
  @@index([entityType, entityId])
  @@index([status])
  @@map("email_logs")
}
```

#### 2. Crear lib/audit.ts

```typescript
// lib/audit.ts
import { prisma } from '@/lib/prisma'

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

interface CreateAuditLogParams {
  actorId: string
  actorEmail: string
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  reason?: string
  metadata?: Record<string, unknown>
}

export async function createAuditLog(params: CreateAuditLogParams) {
  return prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      before: params.before ?? null,
      after: params.after ?? null,
      reason: params.reason,
      metadata: params.metadata,
    },
  })
}

export async function getAuditLogs(params: {
  entityType?: AuditEntityType
  entityId?: string
  actorId?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}) {
  const where: Record<string, unknown> = {}

  if (params.entityType) where.entityType = params.entityType
  if (params.entityId) where.entityId = params.entityId
  if (params.actorId) where.actorId = params.actorId
  if (params.from || params.to) {
    where.createdAt = {}
    if (params.from) (where.createdAt as Record<string, Date>).gte = params.from
    if (params.to) (where.createdAt as Record<string, Date>).lte = params.to
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params.limit ?? 50,
    skip: params.offset ?? 0,
  })
}
```

#### 3. Modificar lib/email.ts para logging

Agregar función wrapper que registre cada envío:

```typescript
// Agregar a lib/email.ts

import { prisma } from '@/lib/prisma'

interface SendEmailWithLoggingParams {
  to: string
  subject: string
  template: string
  html: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export async function sendEmailWithLogging(params: SendEmailWithLoggingParams) {
  // Crear log en estado PENDING
  const emailLog = await prisma.emailLog.create({
    data: {
      to: params.to,
      template: params.template,
      subject: params.subject,
      entityType: params.entityType,
      entityId: params.entityId,
      status: 'PENDING',
      metadata: params.metadata,
    },
  })

  try {
    // Enviar email usando Resend
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })

    // Actualizar log con éxito
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'SENT',
        providerMessageId: result.data?.id,
        sentAt: new Date(),
      },
    })

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    // Actualizar log con error
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    console.error('Error sending email:', error)
    return { success: false, error }
  }
}
```

### Criterios de Aceptación

- [ ] Migración de Prisma ejecutada sin errores
- [ ] `createAuditLog()` crea registros correctamente
- [ ] `sendEmailWithLogging()` registra emails enviados y fallidos
- [ ] Los logs se pueden consultar por entidad y fecha

### Comandos

```bash
# Generar migración
npx prisma migrate dev --name add_audit_and_email_logs

# Verificar modelos
npx prisma studio
```

---

## Plan 1: Acciones Admin en Bookings con Audit + Email

### Objetivo
Mejorar las acciones administrativas existentes en bookings para que:
1. Registren audit logs
2. Envíen notificaciones por email al usuario
3. Manejen todos los casos de uso (reschedule, cancel, complete, no-show)

### Archivos a modificar/crear

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `app/api/admin/bookings/[id]/reschedule/route.ts` | Crear | Endpoint admin para reprogramar |
| `app/api/admin/bookings/[id]/cancel/route.ts` | Crear | Endpoint admin para cancelar |
| `app/api/admin/bookings/[id]/complete/route.ts` | Crear | Endpoint admin para completar |
| `app/api/admin/bookings/[id]/no-show/route.ts` | Crear | Endpoint admin para marcar no-show |
| `app/api/admin/bookings/[id]/status/route.ts` | Modificar | Agregar audit log |
| `lib/email.ts` | Modificar | Agregar templates de notificación |
| `app/admin/bookings/AdminBookingsList.tsx` | Modificar | Usar nuevos endpoints admin |

### Tareas

#### 1. Crear endpoint reschedule admin

```typescript
// app/api/admin/bookings/[id]/reschedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { sendBookingRescheduledEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { newDate, reason } = await request.json()

  if (!newDate) {
    return NextResponse.json({ error: 'Nueva fecha requerida' }, { status: 400 })
  }

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!booking) {
    return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
  }

  // Snapshot del estado anterior
  const before = {
    scheduledAt: booking.scheduledAt,
    status: booking.status,
    rescheduleCount: booking.rescheduleCount,
  }

  // Actualizar booking
  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: {
      previousScheduledAt: booking.scheduledAt,
      scheduledAt: new Date(newDate),
      rescheduledAt: new Date(),
      rescheduledBy: session.user.id,
      rescheduleCount: { increment: 1 },
      rescheduleReason: reason,
      status: 'CONFIRMED',
    },
  })

  // Crear audit log
  await createAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    entityType: 'booking',
    entityId: params.id,
    action: 'reschedule',
    before,
    after: {
      scheduledAt: updated.scheduledAt,
      status: updated.status,
      rescheduleCount: updated.rescheduleCount,
    },
    reason,
  })

  // Enviar email al usuario
  await sendBookingRescheduledEmail({
    to: booking.user.email,
    userName: booking.user.name || 'Usuario',
    resourceName: booking.resourceName,
    oldDate: booking.scheduledAt!,
    newDate: updated.scheduledAt!,
    reason,
  })

  return NextResponse.json({ success: true, booking: updated })
}
```

#### 2. Crear endpoint cancel admin

```typescript
// app/api/admin/bookings/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { sendBookingCancelledEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { reason } = await request.json()

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!booking) {
    return NextResponse.json({ error: 'Booking no encontrado' }, { status: 404 })
  }

  const before = { status: booking.status }

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason || 'Cancelada por administrador',
    },
  })

  await createAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    entityType: 'booking',
    entityId: params.id,
    action: 'cancel',
    before,
    after: { status: updated.status },
    reason,
  })

  await sendBookingCancelledEmail({
    to: booking.user.email,
    userName: booking.user.name || 'Usuario',
    resourceName: booking.resourceName,
    scheduledAt: booking.scheduledAt!,
    reason,
  })

  return NextResponse.json({ success: true, booking: updated })
}
```

#### 3. Crear endpoints complete y no-show

Similar estructura para `complete/route.ts` y `no-show/route.ts`.

#### 4. Agregar templates de email

```typescript
// Agregar a lib/email.ts

export async function sendBookingRescheduledEmail(params: {
  to: string
  userName: string
  resourceName: string
  oldDate: Date
  newDate: Date
  reason?: string
}) {
  const formatDate = (date: Date) =>
    date.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const html = `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #654177; font-family: Gazeta, serif;">
        Tu sesión ha sido reprogramada
      </h1>
      <p>Hola ${params.userName},</p>
      <p>Tu sesión de <strong>${params.resourceName}</strong> ha sido reprogramada:</p>

      <div style="background: #f8f0f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; color: #999; text-decoration: line-through;">
          Fecha anterior: ${formatDate(params.oldDate)}
        </p>
        <p style="margin: 8px 0 0; color: #654177; font-weight: bold;">
          Nueva fecha: ${formatDate(params.newDate)}
        </p>
      </div>

      ${params.reason ? `<p><em>Motivo: ${params.reason}</em></p>` : ''}

      <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
      <p>Con amor,<br>Aleyda</p>
    </div>
  `

  return sendEmailWithLogging({
    to: params.to,
    subject: `Tu sesión de ${params.resourceName} ha sido reprogramada`,
    template: 'booking_rescheduled',
    html,
    entityType: 'booking',
    metadata: { oldDate: params.oldDate, newDate: params.newDate },
  })
}

export async function sendBookingCancelledEmail(params: {
  to: string
  userName: string
  resourceName: string
  scheduledAt: Date
  reason?: string
}) {
  // Similar estructura...
}
```

#### 5. Actualizar AdminBookingsList para usar endpoints admin

Cambiar las llamadas de `/api/bookings/` a `/api/admin/bookings/`:

```typescript
// En AdminBookingsList.tsx, cambiar:
const response = await fetch(`/api/bookings/${selectedBooking.id}/reschedule`, ...)
// Por:
const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/reschedule`, ...)
```

### Criterios de Aceptación

- [ ] Reprogramar booking: actualiza fecha, crea audit log, envía email
- [ ] Cancelar booking: actualiza status, crea audit log, envía email
- [ ] Completar booking: actualiza status a COMPLETED, crea audit log
- [ ] Marcar no-show: actualiza status a NO_SHOW, crea audit log
- [ ] Todos los emails quedan registrados en EmailLog
- [ ] El usuario recibe notificación de cambios

---

## Plan 2: UI Admin Orders

### Objetivo
Crear página de gestión de órdenes/compras con:
- Lista filtrable por fecha, estado, tipo, moneda, pasarela
- Detalle de orden con items y timeline de pagos
- Acciones: reenviar confirmación, registrar reembolso manual

### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `app/admin/orders/page.tsx` | Página principal de órdenes |
| `app/admin/orders/AdminOrdersList.tsx` | Componente cliente con tabla y filtros |
| `app/admin/orders/[id]/page.tsx` | Detalle de orden |
| `app/api/admin/orders/route.ts` | GET lista de órdenes |
| `app/api/admin/orders/[id]/route.ts` | GET detalle de orden |
| `app/api/admin/orders/[id]/resend-confirmation/route.ts` | POST reenviar email |
| `app/api/admin/orders/[id]/refund/route.ts` | POST registrar reembolso |

### Tareas

#### 1. Crear página principal

```typescript
// app/admin/orders/page.tsx
import { prisma } from "@/lib/prisma"
import { AdminOrdersList } from "./AdminOrdersList"

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const serializedOrders = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    userName: o.user?.name,
    userEmail: o.user?.email || o.guestEmail,
    orderType: o.orderType,
    itemName: o.itemName,
    amount: Number(o.amount),
    currency: o.currency,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    discountCode: o.discountCode,
    discountAmount: o.discountAmount ? Number(o.discountAmount) : null,
    createdAt: o.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-gazeta text-3xl text-[#654177]">Gestión de Ventas</h1>
        <p className="text-gray-600 font-dm-sans mt-1">
          Administra todas las compras y pagos
        </p>
      </div>
      <AdminOrdersList initialOrders={serializedOrders} />
    </div>
  )
}
```

#### 2. Crear componente AdminOrdersList

```typescript
// app/admin/orders/AdminOrdersList.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  Download,
  Mail,
  Eye,
  RefreshCw,
  DollarSign,
} from 'lucide-react'

// Interfaz, filtros, tabla con:
// - Buscador por email/número de orden
// - Filtro por estado (PENDING, COMPLETED, FAILED, REFUNDED)
// - Filtro por tipo (SESSION, EVENT, MEMBERSHIP, COURSE)
// - Filtro por moneda (COP, USD)
// - Filtro por pasarela (WOMPI_*, EPAYCO_*)
// - Rango de fechas
// - Acciones: ver detalle, reenviar email
```

#### 3. Crear endpoints API

```typescript
// app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const currency = searchParams.get('currency')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const q = searchParams.get('q')

  const where: Record<string, unknown> = {}

  if (status) where.paymentStatus = status
  if (type) where.orderType = type
  if (currency) where.currency = currency
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from)
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to)
  }
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { guestEmail: { contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const orders = await prisma.order.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(orders)
}
```

#### 4. Agregar enlace en sidebar admin

```typescript
// Modificar app/admin/layout.tsx para incluir enlace a /admin/orders
```

### Criterios de Aceptación

- [ ] Página `/admin/orders` muestra lista de órdenes
- [ ] Filtros funcionan correctamente (status, tipo, moneda, fecha, búsqueda)
- [ ] Click en orden abre detalle con timeline
- [ ] Botón "Reenviar email" envía confirmación y registra en EmailLog
- [ ] Métricas de resumen (total ventas por moneda) visibles

---

## Plan 3: Dashboard Mejorado con Métricas

### Objetivo
Mejorar el dashboard existente con:
- Widget ventas hoy/7 días por moneda (COP y USD)
- Widget sesiones próximas (mejorado)
- Widget eventos próximos con cupos
- Panel de alertas (pagos fallidos, cancelaciones recientes)

### Archivos a modificar

| Archivo | Descripción |
|---------|-------------|
| `app/admin/page.tsx` | Agregar widgets de métricas |
| `lib/admin-stats.ts` | Crear funciones de estadísticas |

### Tareas

#### 1. Crear lib/admin-stats.ts

```typescript
// lib/admin-stats.ts
import { prisma } from '@/lib/prisma'

export async function getSalesStats(days: number = 7) {
  const from = new Date()
  from.setDate(from.getDate() - days)
  from.setHours(0, 0, 0, 0)

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from },
      paymentStatus: 'COMPLETED',
    },
    select: {
      amount: true,
      currency: true,
      createdAt: true,
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const stats = {
    today: { COP: 0, USD: 0, count: 0 },
    week: { COP: 0, USD: 0, count: 0 },
  }

  for (const order of orders) {
    const amount = Number(order.amount)
    const isToday = order.createdAt >= today

    stats.week[order.currency as 'COP' | 'USD'] += amount
    stats.week.count++

    if (isToday) {
      stats.today[order.currency as 'COP' | 'USD'] += amount
      stats.today.count++
    }
  }

  return stats
}

export async function getAlerts() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const [failedPayments, recentCancellations] = await Promise.all([
    prisma.order.count({
      where: {
        paymentStatus: 'FAILED',
        createdAt: { gte: yesterday },
      },
    }),
    prisma.booking.count({
      where: {
        status: 'CANCELLED',
        cancelledAt: { gte: yesterday },
      },
    }),
  ])

  return { failedPayments, recentCancellations }
}
```

#### 2. Actualizar app/admin/page.tsx

```typescript
// Agregar a app/admin/page.tsx

import { getSalesStats, getAlerts } from '@/lib/admin-stats'
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'

// En el componente:
const [salesStats, alerts] = await Promise.all([
  getSalesStats(7),
  getAlerts(),
])

// Agregar widgets:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Widget Ventas Hoy */}
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-green-50 rounded-lg">
        <DollarSign className="w-6 h-6 text-green-600" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-[#654177]">
          ${salesStats.today.COP.toLocaleString('es-CO')}
        </p>
        <p className="text-sm text-gray-500 font-dm-sans">Ventas Hoy (COP)</p>
      </div>
    </div>
    {salesStats.today.USD > 0 && (
      <p className="mt-2 text-sm text-gray-500">
        + ${salesStats.today.USD.toFixed(2)} USD
      </p>
    )}
  </div>

  {/* Widget Ventas 7 días */}
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-blue-50 rounded-lg">
        <TrendingUp className="w-6 h-6 text-blue-600" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-[#654177]">
          ${salesStats.week.COP.toLocaleString('es-CO')}
        </p>
        <p className="text-sm text-gray-500 font-dm-sans">Últimos 7 días (COP)</p>
      </div>
    </div>
    {salesStats.week.USD > 0 && (
      <p className="mt-2 text-sm text-gray-500">
        + ${salesStats.week.USD.toFixed(2)} USD
      </p>
    )}
  </div>

  {/* ... otros widgets existentes ... */}
</div>

{/* Panel de Alertas */}
{(alerts.failedPayments > 0 || alerts.recentCancellations > 0) && (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="w-5 h-5 text-amber-600" />
      <h3 className="font-medium text-amber-800">Alertas</h3>
    </div>
    <ul className="space-y-1 text-sm text-amber-700">
      {alerts.failedPayments > 0 && (
        <li>{alerts.failedPayments} pago(s) fallido(s) en las últimas 24h</li>
      )}
      {alerts.recentCancellations > 0 && (
        <li>{alerts.recentCancellations} cancelación(es) en las últimas 24h</li>
      )}
    </ul>
  </div>
)}
```

### Criterios de Aceptación

- [ ] Dashboard muestra ventas del día actual por moneda
- [ ] Dashboard muestra ventas de últimos 7 días por moneda
- [ ] Panel de alertas visible cuando hay pagos fallidos o cancelaciones
- [ ] Métricas se calculan correctamente

---

## Plan 4: UI Admin Subscriptions

### Objetivo
Crear página de gestión de membresías/suscripciones con:
- Lista filtrable por estado
- Detalle con historial
- Acciones: cancelar, reenviar acceso

### Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `app/admin/subscriptions/page.tsx` | Página principal |
| `app/admin/subscriptions/AdminSubscriptionsList.tsx` | Componente cliente |
| `app/api/admin/subscriptions/route.ts` | GET lista |
| `app/api/admin/subscriptions/[id]/cancel/route.ts` | POST cancelar |
| `app/api/admin/subscriptions/[id]/resend-access/route.ts` | POST reenviar acceso |

### Tareas

#### 1. Crear página principal

```typescript
// app/admin/subscriptions/page.tsx
import { prisma } from "@/lib/prisma"
import { AdminSubscriptionsList } from "./AdminSubscriptionsList"

export default async function AdminSubscriptionsPage() {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const serialized = subscriptions.map((s) => ({
    id: s.id,
    userId: s.userId,
    userName: s.user.name,
    userEmail: s.user.email,
    membershipTierName: s.membershipTierName,
    status: s.status,
    billingInterval: s.billingInterval,
    amount: Number(s.amount),
    currency: s.currency,
    paymentProvider: s.paymentProvider,
    currentPeriodEnd: s.currentPeriodEnd.toISOString(),
    cancelledAt: s.cancelledAt?.toISOString() || null,
    createdAt: s.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-gazeta text-3xl text-[#654177]">Gestión de Membresías</h1>
        <p className="text-gray-600 font-dm-sans mt-1">
          Administra las suscripciones activas
        </p>
      </div>
      <AdminSubscriptionsList initialSubscriptions={serialized} />
    </div>
  )
}
```

#### 2. Crear endpoint de cancelación

```typescript
// app/api/admin/subscriptions/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { sendSubscriptionCancelledEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { mode, reason } = await request.json()
  // mode: 'end_of_period' | 'immediate'

  const subscription = await prisma.subscription.findUnique({
    where: { id: params.id },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!subscription) {
    return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
  }

  const before = { status: subscription.status }

  const updated = await prisma.subscription.update({
    where: { id: params.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  })

  await createAuditLog({
    actorId: session.user.id,
    actorEmail: session.user.email!,
    entityType: 'subscription',
    entityId: params.id,
    action: 'cancel',
    before,
    after: { status: updated.status },
    reason,
    metadata: { mode },
  })

  await sendSubscriptionCancelledEmail({
    to: subscription.user.email,
    userName: subscription.user.name || 'Usuario',
    tierName: subscription.membershipTierName,
    endDate: mode === 'immediate' ? new Date() : subscription.currentPeriodEnd,
    reason,
  })

  return NextResponse.json({ success: true, subscription: updated })
}
```

### Criterios de Aceptación

- [ ] Página `/admin/subscriptions` muestra lista de suscripciones
- [ ] Filtros por estado funcionan (ACTIVE, CANCELLED, PAST_DUE, EXPIRED)
- [ ] Cancelar suscripción: actualiza status, crea audit, envía email
- [ ] Reenviar acceso: envía email con instrucciones

---

## Resumen de Planes

| Plan | Descripción | Dependencias | Complejidad |
|------|-------------|--------------|-------------|
| **P0** | AuditLog + EmailLog | Ninguna | Baja |
| **P1** | Acciones Admin Bookings | P0 | Media |
| **P2** | UI Admin Orders | P0 | Media |
| **P3** | Dashboard Métricas | Ninguna | Baja |
| **P4** | UI Admin Subscriptions | P0, P1 | Media |

### Orden de Ejecución Recomendado

1. **P0** (AuditLog + EmailLog) - Fundamento para todo lo demás
2. **P3** (Dashboard Métricas) - Puede ejecutarse en paralelo con P0
3. **P1** (Acciones Admin Bookings) - Requiere P0
4. **P2** (UI Admin Orders) - Requiere P0
5. **P4** (UI Admin Subscriptions) - Requiere P0 y P1

### Estimación Total

Con la infraestructura existente, estos 5 planes representan aproximadamente:
- **P0**: 2-3 horas
- **P1**: 3-4 horas
- **P2**: 4-5 horas
- **P3**: 2-3 horas
- **P4**: 3-4 horas

**Total estimado**: 14-19 horas de desarrollo
