# Sistema de Perks de Eventos (P1-05)

## Descripción General

El sistema de Perks permite definir beneficios adicionales para los eventos, asignarlos automáticamente a los asistentes según su plan de membresía y gestionar su entrega desde el panel de administración.

## Características Principales

### 1. Definición de Perks en Sanity

Los perks se configuran directamente en cada evento desde Sanity Studio, en la pestaña "Perks y Bonos".

**Tipos de Perks disponibles:**
| Tipo | Descripción |
|------|-------------|
| `recording` | Grabación del evento |
| `transcript` | Transcripción del contenido |
| `workbook` | Material de trabajo/workbook |
| `bonus_meditation` | Meditación adicional |
| `personal_message` | Mensaje personalizado |
| `priority_qa` | Acceso prioritario a Q&A |

**Campos de cada Perk:**
- **Título**: Nombre descriptivo del perk
- **Descripción**: Explicación opcional del beneficio
- **Cupos Limitados** (cap): Número máximo de asignaciones (vacío = ilimitado)
- **Planes con Acceso Garantizado**: Miembros de estos planes siempre reciben el perk, incluso si se agotaron los cupos
- **Modo de Entrega**:
  - `Automático`: Se entrega inmediatamente con la URL configurada
  - `Manual`: Admin debe entregar manualmente
  - `Post-Evento`: Se entrega después del evento
- **URL del Recurso**: Link al archivo/recurso (opcional, requerido para entrega automática)

### 2. Asignación Automática

Cuando un usuario confirma su reserva (pago completado o gratis para miembros), el sistema:

1. Obtiene los perks definidos para el evento
2. Para cada perk:
   - Verifica si el usuario tiene un plan prioritario → **asignación garantizada**
   - Si no tiene plan prioritario y hay cupo limitado → verifica disponibilidad
   - Si hay cupo o es ilimitado → **asigna el perk**
   - Si no hay cupo → marca como **UNAVAILABLE**
3. Si el modo es `automatic` y tiene URL → marca como **DELIVERED** automáticamente

**Estados de Asignación:**
| Estado | Descripción |
|--------|-------------|
| `PENDING` | Asignado pero pendiente de entrega |
| `DELIVERED` | Entregado al usuario |
| `UNAVAILABLE` | No disponible (cupos agotados) |

### 3. Visualización para Usuarios

#### En la Página del Evento
Los perks se muestran en una sección "Incluye" con badges informativos:
- **Cupos limitados**: Muestra el número de cupos disponibles
- **Garantizado para [Plan]**: Indica qué planes tienen acceso garantizado
- **Post-evento**: Indica que se entrega después del evento

#### En el Dashboard del Usuario (`/mi-cuenta/eventos`)
Para cada reserva confirmada:
- Lista de perks asignados con su estado
- Botón de descarga si el perk está entregado
- Indicador "Pendiente de entrega" si aún no se ha entregado

### 4. Panel de Administración

Accesible en `/admin/events/[eventId]/perks`

**Funcionalidades:**
- **Cards de estadísticas** por tipo de perk (entregados, pendientes, no disponibles)
- **Tabla de asignaciones** con filtros por:
  - Búsqueda (email, nombre, perk)
  - Estado
  - Tipo de perk
- **Entrega individual**: Modal para ingresar URL y marcar como entregado
- **Entrega masiva**: Botón "Entregar todos" para entregar un tipo de perk a todos los pendientes

## Estructura de Archivos

```
├── prisma/
│   └── schema.prisma          # Modelo PerkAllocation
├── sanity/schemas/
│   └── event.ts               # Campo perks en schema de evento
├── types/
│   └── events.ts              # Tipos TypeScript para perks
├── lib/events/
│   └── perks.ts               # Lógica de asignación y entrega
├── lib/sanity/queries/
│   └── events.ts              # Query con perks incluidos
├── app/api/
│   ├── events/[eventId]/perks/
│   │   └── route.ts           # API para usuarios
│   └── admin/events/[eventId]/perks/
│       └── route.ts           # API para admin
├── components/eventos/
│   ├── EventPerksSection.tsx  # Sección de perks en página de evento
│   └── BookingPerksCard.tsx   # Card de perks en dashboard
└── app/admin/events/[eventId]/perks/
    ├── page.tsx               # Página admin de perks
    └── AdminPerksManager.tsx  # Componente de gestión
```

## Modelo de Datos

### PerkAllocation (Prisma)

```prisma
model PerkAllocation {
  id           String               @id @default(cuid())
  eventId      String               // Sanity event _id
  bookingId    String
  userId       String
  perkType     String               // Tipo de perk
  perkTitle    String               // Título (desnormalizado)
  perkIndex    Int                  // Orden en el array
  status       PerkAllocationStatus // PENDING | DELIVERED | UNAVAILABLE
  deliveredAt  DateTime?
  deliveredBy  String?              // Admin que entregó
  assetUrl     String?              // URL del recurso
  metadata     Json?                // Datos adicionales
  createdAt    DateTime
  updatedAt    DateTime

  @@unique([bookingId, perkType])
}
```

## API Endpoints

### Usuario

**GET `/api/events/[eventId]/perks`**
- Retorna los perks asignados a la reserva del usuario
- Requiere autenticación

### Admin

**GET `/api/admin/events/[eventId]/perks`**
- Query params: `perkType`, `status`
- Retorna estadísticas y asignaciones

**POST `/api/admin/events/[eventId]/perks`**
- Body: `{ action: 'deliver_single', allocationId, assetUrl }`
- Body: `{ action: 'deliver_bulk', perkType, assetUrl }`

## Flujos de Integración

### Booking de Evento (Gratis para Miembro)
```
POST /api/events/book
  → Crear Order + Booking
  → Si status = CONFIRMED
    → allocatePerks(bookingId)
```

### Pago de Evento (Webhook)
```
Webhook Wompi/ePayco
  → processApprovedPayment()
    → createEventBookingFromOrder()
      → Crear Booking + Entitlement
      → allocatePerks(bookingId)
```

## Ejemplo de Uso

### Configurar Perks en Sanity

1. Ir a Sanity Studio → Eventos → Editar evento
2. Ir a pestaña "Perks y Bonos"
3. Añadir perks:
   ```
   - Tipo: Grabación
     Título: "Grabación completa del taller"
     Modo: Post-Evento

   - Tipo: Workbook
     Título: "Material de trabajo PDF"
     Cupos: 50
     Planes garantizados: [Plan Divinidad]
     Modo: Automático
     URL: https://ejemplo.com/workbook.pdf
   ```

### Entregar Perks desde Admin

1. Ir a Admin → Eventos → Ver evento
2. Click en "Gestionar Perks"
3. Para entregar individualmente: Click en icono de envío → Ingresar URL
4. Para entrega masiva: Click en "Entregar todos" en la card del perk

## Consideraciones

- Los perks se asignan una sola vez por booking (idempotente)
- La asignación no falla si hay error (se registra en logs)
- Los usuarios con plan prioritario siempre reciben el perk, sin importar el cupo
- El cupo se verifica al momento de la asignación, no al mostrar
- Los perks con modo `automatic` requieren URL configurada para auto-entrega
