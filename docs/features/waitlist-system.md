# Sistema de Lista de Espera y Gestión de Cupos

## Descripción General

El sistema de Waitlist permite gestionar eventos con capacidad limitada, ofreciendo a los usuarios la posibilidad de unirse a una lista de espera cuando los cupos están agotados. Cuando se libera un cupo (por cancelación), el sistema automáticamente ofrece la plaza al siguiente usuario en la lista.

## Flujo de Usuario

### 1. Reserva Normal (Hay Cupos)
```
Usuario visita evento → Hay cupos disponibles → Reserva normal → Pago → Confirmación
```

### 2. Evento Agotado (Sin Cupos)
```
Usuario visita evento → Cupos agotados → Se muestra botón "Unirse a lista de espera"
→ Usuario se une → Recibe email de confirmación con posición
→ Espera notificación de cupo disponible
```

### 3. Cupo Liberado
```
Usuario cancela reserva → Se libera cupo → Sistema busca siguiente en waitlist
→ Se envía oferta por email → Usuario tiene 24h para aceptar
→ Si acepta: Se crea reserva
→ Si no responde: Oferta expira, pasa al siguiente
```

## Arquitectura

### Base de Datos (Prisma)

#### SeatAllocation
Rastrea los cupos confirmados por evento.

```prisma
model SeatAllocation {
  id          String   @id @default(cuid())
  eventId     String   // ID del evento en Sanity
  bookingId   String   @unique
  userId      String
  seats       Int      @default(1)
  status      SeatAllocationStatus @default(ACTIVE)
  allocatedAt DateTime @default(now())
  releasedAt  DateTime?
}

enum SeatAllocationStatus {
  ACTIVE    // Cupo ocupado
  RELEASED  // Cupo liberado (cancelación)
}
```

#### WaitlistEntry
Gestiona la cola de espera.

```prisma
model WaitlistEntry {
  id                  String   @id @default(cuid())
  eventId             String
  userId              String
  position            Int      // Posición en la cola (1-based)
  seatsRequested      Int      @default(1)
  status              WaitlistStatus @default(WAITING)
  offerSentAt         DateTime?
  offerExpiresAt      DateTime?
  reminderSentAt      DateTime?
  respondedAt         DateTime?
  resultingBookingId  String?
  userEmail           String
  userName            String?
  createdAt           DateTime @default(now())
}

enum WaitlistStatus {
  WAITING       // Esperando en cola
  OFFER_PENDING // Oferta enviada, esperando respuesta
  ACCEPTED      // Usuario aceptó, reserva creada
  DECLINED      // Usuario rechazó
  EXPIRED       // Oferta expiró sin respuesta
  CANCELLED     // Usuario canceló su entrada
}
```

### Servicio Principal

**Ubicación:** `lib/events/seat-allocation.ts`

#### Funciones de Disponibilidad

| Función | Descripción |
|---------|-------------|
| `getAvailableSpots(eventId)` | Retorna cupos disponibles (null = ilimitado) |
| `getEventAvailability(eventId)` | Info completa: capacidad, ocupados, disponibles, waitlist |
| `hasAvailableSpots(eventId, seats)` | Verifica si hay cupos suficientes |

#### Funciones de Asignación

| Función | Descripción |
|---------|-------------|
| `allocateSeats(tx, params)` | Asigna cupos dentro de transacción |
| `releaseSeats(bookingId)` | Libera cupos y procesa waitlist |

#### Funciones de Waitlist

| Función | Descripción |
|---------|-------------|
| `addToWaitlist(params)` | Añade usuario a la cola |
| `getWaitlistPosition(eventId, userId)` | Obtiene posición del usuario |
| `getWaitlistEntry(eventId, userId)` | Obtiene entrada completa |
| `cancelWaitlistEntry(entryId, userId)` | Cancela entrada en waitlist |
| `offerSeatFromWaitlist(eventId, seats)` | Ofrece cupo al siguiente elegible |
| `acceptWaitlistOffer(entryId, userId)` | Acepta oferta y crea reserva |
| `declineWaitlistOffer(entryId, userId)` | Rechaza oferta |
| `expireWaitlistOffer(entryId)` | Expira oferta no respondida |
| `getUserWaitlistEntries(userId)` | Lista entradas activas del usuario |

### API Endpoints

#### Disponibilidad
```
GET /api/events/[eventId]/availability
```
Retorna:
```json
{
  "eventId": "abc123",
  "capacity": 20,
  "allocatedSeats": 18,
  "availableSpots": 2,
  "waitlistCount": 5,
  "hasWaitlist": true,
  "isSoldOut": false,
  "userWaitlistPosition": null
}
```

#### Gestión de Waitlist
```
POST /api/events/[eventId]/waitlist
Body: { "seats": 1 }
```
Respuesta exitosa:
```json
{
  "success": true,
  "waitlistEntryId": "entry123",
  "position": 3,
  "seatsRequested": 1,
  "message": "Te has unido a la lista de espera en posición 3"
}
```

```
GET /api/events/[eventId]/waitlist
```
Retorna estado del usuario en waitlist.

```
DELETE /api/events/[eventId]/waitlist
```
Elimina al usuario de la waitlist.

#### Aceptar/Rechazar Ofertas
```
POST /api/waitlist/[entryId]/accept
POST /api/waitlist/[entryId]/decline
```

#### Cancelación de Reservas
```
PATCH /api/events/[eventId]/cancel-booking
Body: { "bookingId": "booking123", "reason": "opcional" }
```

### Cron Job

**Ubicación:** `app/api/cron/expire-waitlist-offers/route.ts`

**Configuración Vercel:** Ejecuta cada hora (`0 * * * *`)

**Acciones:**
1. Busca ofertas con `offerExpiresAt < now()` → las marca como EXPIRED
2. Por cada oferta expirada → ofrece al siguiente en la cola
3. Busca ofertas que expiran en 6h sin reminder → envía email de recordatorio

## Componentes UI

### WaitlistButton
**Ubicación:** `components/eventos/WaitlistButton.tsx`

Se muestra en la página del evento cuando está agotado. Estados:
- **No autenticado:** Botón para iniciar sesión
- **Disponible para unirse:** Formulario con selector de cupos
- **En cola (WAITING):** Muestra posición y opción de salir
- **Oferta pendiente:** Botón para aceptar con countdown

### WaitlistEntryCard
**Ubicación:** `components/eventos/WaitlistEntryCard.tsx`

Tarjeta para el dashboard del usuario mostrando:
- Información del evento
- Estado en la waitlist
- Botones de acción según estado

## Emails

| Template | Cuándo se envía |
|----------|-----------------|
| `waitlist_joined` | Usuario se une a la lista |
| `waitlist_offer` | Se ofrece cupo disponible |
| `waitlist_reminder` | 6h antes de expirar oferta |
| `waitlist_expired` | Oferta expiró sin respuesta |

## Configuración

### Variables de Entorno

```bash
# Requerido para cron job
CRON_SECRET=<string-seguro-aleatorio>

# Opcionales (tienen valores por defecto)
WAITLIST_OFFER_HOURS=24      # Horas para aceptar oferta
WAITLIST_REMINDER_HOURS=6    # Horas antes de expirar para reminder
```

### Vercel Cron

En `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/expire-waitlist-offers",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Reglas de Negocio

### Posiciones
- Las posiciones se asignan secuencialmente al unirse
- Las posiciones NO se recalculan cuando otros salen
- Un usuario solo puede tener una entrada activa por evento

### Ofertas
- Duración: 24 horas por defecto
- Se envía recordatorio 6 horas antes de expirar
- Si no responde, pasa automáticamente al siguiente

### Multi-asiento
- Si un usuario solicita 3 cupos pero solo hay 1 disponible:
  - Se **salta** a ese usuario
  - Se ofrece al siguiente que pueda caber
  - El usuario original mantiene su posición para cuando haya más cupos

### Cancelaciones
- Clientes: mínimo 24h antes del evento
- Admins: sin restricciones
- Al cancelar: cupos se liberan y se procesa waitlist automáticamente

## Integración con Booking Flow

El flujo de reserva (`/api/events/book`) fue modificado para:

1. **Verificar disponibilidad** usando `getAvailableSpots()` (Prisma, no Sanity)
2. **Si hay cupos:** Crear reserva + SeatAllocation en transacción
3. **Si no hay cupos:**
   - Verificar si usuario ya está en waitlist
   - Si no: añadir a waitlist y enviar email
   - Retornar respuesta con `waitlist: true` y posición

## Páginas Modificadas

### `/eventos/[slug]` (Detalle de Evento)
- Muestra `WaitlistButton` cuando está agotado
- Reemplaza el botón "Cupos Agotados" estático

### `/mi-cuenta/eventos` (Dashboard)
- Nueva sección "Cupos Disponibles" (ofertas pendientes)
- Nueva sección "En Lista de Espera"
- Las ofertas pendientes se muestran con urgencia visual

## Testing Manual

1. **Reservar hasta agotar:** Crear reservas hasta llenar capacidad
2. **Unirse a waitlist:** Verificar posición y email
3. **Cancelar reserva:** Verificar que se ofrece al siguiente
4. **Aceptar oferta:** Verificar creación de reserva
5. **Dejar expirar:** Ejecutar cron y verificar que pasa al siguiente
6. **Rechazar oferta:** Verificar que pasa al siguiente

## Consideraciones de Escalabilidad

- El conteo de cupos usa Prisma como fuente de verdad (no Sanity)
- Las transacciones previenen condiciones de carrera
- El cron job procesa ofertas de forma secuencial para evitar conflictos
- Rate limiting en endpoints de reserva (5 req/min por IP)
