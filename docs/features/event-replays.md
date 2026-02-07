# Sistema de Replays de Eventos

## Resumen

El sistema de replays permite a los usuarios que asistieron a eventos online acceder a las grabaciones con control de acceso basado en tiempo y plan de membresía.

## Funcionalidades

### 1. Control de Acceso a Replays

Los usuarios solo pueden ver grabaciones si:
- Tienen una reserva confirmada (`CONFIRMED` o `COMPLETED`) del evento
- El acceso no ha expirado

#### Lógica de Expiración (Híbrida)

El sistema usa la fecha **más temprana** entre:

1. **Fecha global** (`recording.availableUntil`): Límite absoluto configurado en Sanity
2. **Duración por plan**: Calculada desde la fecha del evento + días según el plan

```
Expiración = min(availableUntil, eventDate + durationDays)
```

#### Configuración de Duración por Plan

En Sanity, cada evento puede configurar:

| Campo | Descripción |
|-------|-------------|
| `replayDurationDays` | Días de acceso por defecto (usuarios sin membresía) |
| `replayByPlan[]` | Array de configuraciones por plan de membresía |
| `replayByPlan[].tier` | Referencia al plan de membresía |
| `replayByPlan[].durationDays` | Días de acceso (0 = permanente) |

**Ejemplo de configuración:**
- Usuarios sin membresía: 14 días
- Plan Esencia: 30 días
- Plan Divinidad: 0 días (permanente)

### 2. Tracking de Visualizaciones

El sistema registra métricas de visualización por cada reserva:

| Métrica | Descripción |
|---------|-------------|
| `viewCount` | Número de veces que el usuario inició el replay |
| `totalWatchedSeconds` | Segundos totales vistos (acumulativo) |
| `lastPosition` | Posición donde pausó (para continuar) |
| `lastWatchedAt` | Última vez que vio el replay |
| `firstViewedAt` | Primera vez que accedió |

#### Frecuencia de Reporte

- El progreso se reporta cada **30 segundos** durante la reproducción
- Se reporta inmediatamente al **pausar** o **terminar** el video
- Solo se envía si hay cambio significativo (>5 segundos)

### 3. Reproductor de Video

El componente `ReplayVideoPlayer` soporta múltiples fuentes:

| Tipo | Detección | Implementación |
|------|-----------|----------------|
| YouTube | URLs de youtube.com, youtu.be | YouTube IFrame API |
| Vimeo | URLs de vimeo.com | Iframe embed |
| Nativo | Cualquier otra URL | HTML5 `<video>` |

**Características:**
- Detección automática del tipo de URL
- Reanudación desde la última posición
- Tracking de progreso en segundo plano

### 4. Página de Replay

Ubicación: `/eventos/[slug]/replay`

**Elementos de UI:**
- Badge de días restantes (color según urgencia)
- Reproductor de video a pantalla completa
- Información del evento
- Contador de visualizaciones

**Colores del badge de expiración:**
- Verde: >7 días restantes
- Ámbar: 3-7 días restantes
- Rojo: <3 días restantes
- Morado: Acceso permanente

### 5. Dashboard de Eventos

La página `/mi-cuenta/eventos` muestra tres secciones:

1. **Próximos Eventos**: Eventos futuros con reserva confirmada
2. **Grabaciones Disponibles**: Eventos pasados con replay activo
3. **Eventos Pasados**: Eventos sin replay o con acceso expirado

**Indicadores en Grabaciones Disponibles:**
- Badge de días restantes
- Badge "Ya viste" si `viewCount > 0`
- Botón "Ver Grabación" enlazando a la página de replay

## API

### GET /api/events/[eventId]/replay

Verifica acceso y retorna URL del replay.

**Respuesta exitosa:**
```json
{
  "canAccess": true,
  "url": "https://youtube.com/...",
  "expiresAt": "2024-02-15T00:00:00.000Z",
  "bookingId": "clx...",
  "viewCount": 3,
  "totalWatchedSeconds": 1800,
  "lastPosition": 1650
}
```

**Respuesta de error:**
```json
{
  "canAccess": false,
  "reason": "expired", // o "no_booking", "no_recording", "event_not_found"
  "expiresAt": "2024-01-15T00:00:00.000Z"
}
```

### POST /api/events/[eventId]/replay

Registra progreso de visualización.

**Body:**
```json
{
  "bookingId": "clx...",
  "watchedSeconds": 1800,
  "lastPosition": 1650
}
```

**Respuesta:**
```json
{
  "success": true
}
```

## Modelo de Datos

### EventReplayView (Prisma)

```prisma
model EventReplayView {
  id                  String   @id @default(cuid())
  bookingId           String   @unique
  eventId             String
  userId              String
  viewCount           Int      @default(1)
  totalWatchedSeconds Int      @default(0)
  lastWatchedAt       DateTime @default(now())
  lastPosition        Int      @default(0)
  firstViewedAt       DateTime @default(now())
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([userId])
  @@index([eventId])
  @@index([eventId, userId])
  @@map("event_replay_views")
}
```

### Recording (Sanity)

```typescript
recording: {
  url: string              // URL de YouTube, Vimeo o video directo
  availableUntil?: string  // Fecha límite global (ISO date)
  replayDurationDays?: number  // Días por defecto
  replayByPlan?: Array<{
    tier: Reference        // Referencia a membershipTier
    durationDays: number   // 0 = permanente
  }>
}
```

## Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `lib/events/replay-access.ts` | Lógica de acceso y tracking |
| `app/api/events/[eventId]/replay/route.ts` | API endpoints |
| `app/eventos/[slug]/replay/page.tsx` | Página de reproducción |
| `components/eventos/ReplayVideoPlayer.tsx` | Componente de video |
| `app/mi-cuenta/eventos/page.tsx` | Dashboard con sección de replays |
| `sanity/schemas/event.ts` | Schema con campos de replay |
| `prisma/schema.prisma` | Modelo EventReplayView |

## Flujo de Usuario

```
1. Usuario asiste a evento online
2. Evento termina → Admin sube grabación en Sanity
3. Usuario va a /mi-cuenta/eventos
4. Ve sección "Grabaciones Disponibles" con días restantes
5. Click en "Ver Grabación" → /eventos/[slug]/replay
6. Sistema verifica acceso
7. Si válido: muestra reproductor + tracking de progreso
8. Si inválido: muestra mensaje de error apropiado
9. Usuario puede pausar y reanudar donde lo dejó
```

## Consideraciones de Seguridad

- La URL del video solo se entrega si el usuario tiene acceso válido
- El `bookingId` se verifica contra el `userId` de la sesión
- Las fechas de expiración se calculan en el servidor
- No se exponen URLs de video en respuestas de error
