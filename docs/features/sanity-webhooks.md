# Sanity Webhooks + ISR Revalidation

## Resumen

Sistema de revalidación automática de contenido que sincroniza los cambios realizados en Sanity CMS con el sitio web en producción. Cuando un editor publica, actualiza o elimina contenido en Sanity Studio, el webhook notifica automáticamente al servidor Next.js para invalidar la caché y regenerar las páginas afectadas.

## Problema que Resuelve

Antes de esta implementación, el contenido de Sanity se cacheaba indefinidamente en producción (`force-cache`). Los editores tenían que esperar un redeploy o intervención manual para ver sus cambios reflejados en el sitio.

**Ahora**: Los cambios se reflejan automáticamente en segundos tras publicar en Sanity Studio.

## Arquitectura

```
┌─────────────────┐     Webhook POST      ┌──────────────────────────┐
│  Sanity Studio  │ ─────────────────────►│  /api/webhooks/sanity    │
│  (CMS)          │                       │  (Next.js API Route)     │
└─────────────────┘                       └────────────┬─────────────┘
                                                       │
                                                       ▼
                                          ┌──────────────────────────┐
                                          │  lib/sanity/revalidate   │
                                          │  - revalidateTag()       │
                                          │  - revalidatePath()      │
                                          │  - Database sync         │
                                          └────────────┬─────────────┘
                                                       │
                                                       ▼
                                          ┌──────────────────────────┐
                                          │  Next.js ISR             │
                                          │  Regenera páginas        │
                                          │  en próxima visita       │
                                          └──────────────────────────┘
```

## Archivos del Sistema

| Archivo | Descripción |
|---------|-------------|
| `app/api/webhooks/sanity/route.ts` | Endpoint que recibe webhooks de Sanity |
| `lib/sanity/revalidate.ts` | Lógica de revalidación y mapeo de tipos |
| `sanity/lib/fetch.ts` | Wrapper de fetch con soporte de cache tags |

## Flujo de Trabajo

### 1. Editor publica contenido en Sanity

El editor realiza cambios en Sanity Studio y hace clic en "Publish".

### 2. Sanity envía webhook

Sanity envía una petición POST al endpoint configurado con:
- **Header** `sanity-webhook-signature`: Firma HMAC-SHA256 del payload
- **Header** `sanity-operation`: `create`, `update`, o `delete`
- **Body**: `{ _id, _type, _rev, slug }`

### 3. Verificación de seguridad

El webhook handler verifica:
1. La firma HMAC-SHA256 usando `SANITY_WEBHOOK_SECRET`
2. Que el payload contenga los campos requeridos (`_id`, `_type`, `_rev`)

### 4. Idempotencia

Para evitar procesamiento duplicado:
1. Se genera un `eventId` único: `sanity_{_id}_{_rev}`
2. Se verifica en la tabla `webhookEvent` si ya fue procesado
3. Se registra el evento antes de procesar

### 5. Revalidación

Según el tipo de documento, se invalidan:
- **Cache tags**: Para invalidación amplia (ej: todos los eventos)
- **Paths específicos**: Para páginas individuales (ej: `/eventos/mi-evento`)

### 6. Sincronización a DB (opcional)

Para algunos tipos de documento (ej: `membershipPost`), se sincronizan datos a Prisma para tracking de engagement.

## Mapeo de Tipos de Documento

| Tipo de Documento | Tags Invalidados | Paths Revalidados |
|-------------------|------------------|-------------------|
| `event` | `sanity`, `event` | `/`, `/eventos`, `/eventos/[slug]` |
| `course` | `sanity`, `course` | `/`, `/academia`, `/academia/[slug]` |
| `courseLesson` | `sanity`, `course`, `lesson` | (via tags) |
| `sessionConfig` | `sanity`, `session` | `/sesiones` |
| `membershipTier` | `sanity`, `membership` | `/membresia` |
| `membershipPost` | `sanity`, `membership-post` | + sync a Prisma |
| `page` | `sanity`, `page` | `/[slug]` |
| `blogPost` | `sanity`, `blog` | `/blog`, `/blog/[slug]` |
| `product` | `sanity`, `product` | `/tienda`, `/tienda/[slug]` |
| `freeContent` | `sanity`, `free-content` | (via tags) |
| `discountCode` | `sanity`, `discount` | (via tags) |

## Configuración

### 1. Variables de Entorno

```bash
# Generar un secret seguro
openssl rand -base64 32

# Agregar a .env.local
SANITY_WEBHOOK_SECRET="tu-secret-generado"
```

### 2. Configurar Webhook en Sanity

1. Ir a [sanity.io/manage](https://sanity.io/manage)
2. Seleccionar tu proyecto → API → Webhooks
3. Crear nuevo webhook:

| Campo | Valor |
|-------|-------|
| Name | ISR Revalidation |
| URL | `https://tu-dominio.com/api/webhooks/sanity` |
| Dataset | production |
| Trigger on | Create, Update, Delete |
| Filter (opcional) | `_type in ["event", "course", "page", ...]` |
| Secret | (copiar el valor de SANITY_WEBHOOK_SECRET) |
| HTTP headers | Habilitar "Include sanity-operation header" |

### 3. Configurar Payload (opcional)

Por defecto, Sanity envía el documento completo. Para optimizar, puedes configurar un payload personalizado:

```json
{
  "_id": "{{_id}}",
  "_type": "{{_type}}",
  "_rev": "{{_rev}}",
  "slug": "{{slug}}"
}
```

## Uso en Queries

Todas las funciones de query deben usar `sanityFetch` con tags apropiados:

```typescript
import { sanityFetch } from '@/sanity/lib/fetch'

// ✅ Correcto: usa sanityFetch con tags
export async function getEvents() {
  return sanityFetch({
    query: EVENTS_QUERY,
    tags: ['event']  // Tag para invalidación
  })
}

// ❌ Incorrecto: no usa cache tags
export async function getEvents() {
  return client.fetch(EVENTS_QUERY)
}
```

### Excepción: Datos en Tiempo Real

Para operaciones que requieren datos frescos (ej: verificar disponibilidad al reservar), usa `client.fetch()` directamente:

```typescript
// Operaciones de booking - necesitan datos en tiempo real
export async function getEventById(id: string) {
  return client.fetch(query, { id })  // Sin cache
}
```

## Monitoreo

### Verificar eventos procesados

```sql
-- Ver últimos webhooks de Sanity
SELECT
  event_id,
  event_type,
  processed,
  failed,
  error_message,
  created_at
FROM webhook_events
WHERE provider = 'sanity'
ORDER BY created_at DESC
LIMIT 20;
```

### Logs del servidor

Los logs usan prefijos estructurados:
- `[WEBHOOK/SANITY]` - Handler del webhook
- `[REVALIDATE]` - Lógica de revalidación

```
[WEBHOOK/SANITY] Successfully processed event.update
[REVALIDATE] Processing event (update) - ID: abc123
[REVALIDATE] Tag invalidated: event
[REVALIDATE] Path invalidated: /eventos
[REVALIDATE] Slug path invalidated: /eventos/mi-evento
[REVALIDATE] Completed for event (update)
```

## Testing

### Test local con curl

```bash
# Variables
SECRET="tu-sanity-webhook-secret"
BODY='{"_id":"test-123","_type":"event","_rev":"abc","slug":{"current":"mi-evento"}}'

# Generar firma
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Enviar webhook
curl -X POST http://localhost:3000/api/webhooks/sanity \
  -H "Content-Type: application/json" \
  -H "sanity-webhook-signature: $SIG" \
  -H "sanity-operation: update" \
  -d "$BODY"
```

### Respuestas esperadas

```json
// Éxito
{ "received": true, "processed": true }

// Ya procesado (idempotente)
{ "received": true, "processed": false }

// Error de firma
{ "error": "Invalid signature" }

// Error de procesamiento
{ "error": "Processing failed" }
```

### Test en Sanity Studio

1. Ir a Sanity Studio
2. Editar cualquier documento
3. Publicar cambios
4. Verificar en logs del servidor que el webhook fue recibido
5. Visitar la página afectada y verificar que muestra el contenido actualizado

## Seguridad

### Verificación de firma

El webhook verifica la autenticidad usando HMAC-SHA256:

```typescript
function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret || !signature) return false

  const hmac = createHmac('sha256', secret)
  hmac.update(body)
  const expectedSignature = hmac.digest('hex')

  // Comparación timing-safe para prevenir timing attacks
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
```

### Idempotencia

El sistema previene procesamiento duplicado usando la tabla `webhookEvent`:
- Cada evento tiene un ID único basado en `_id` y `_rev`
- Si el evento ya fue procesado, se retorna sin re-procesar
- Esto protege contra retries de Sanity y condiciones de carrera

## Troubleshooting

### El contenido no se actualiza

1. Verificar que el webhook esté configurado correctamente en Sanity
2. Revisar logs del servidor para ver si el webhook llegó
3. Verificar que `SANITY_WEBHOOK_SECRET` coincida en ambos lados
4. Comprobar que la query use `sanityFetch` con tags

### Error de firma inválida

1. Regenerar el secret: `openssl rand -base64 32`
2. Actualizar en `.env` y en configuración de Sanity
3. Asegurar que no hay espacios extra en el secret

### Webhook no llega

1. Verificar URL del webhook (debe ser HTTPS en producción)
2. Revisar filtros configurados en Sanity
3. Usar el botón "Test" en la configuración del webhook de Sanity
4. Verificar que el servidor esté accesible desde internet

### Revalidación parcial

Si solo algunas páginas se actualizan:
1. Verificar que todos los queries usen los tags correctos
2. Revisar el mapeo en `DOCUMENT_TAG_MAP` y `DOCUMENT_PATH_MAP`
3. Agregar logs para debug si es necesario

## Extensibilidad

### Agregar nuevo tipo de documento

1. Agregar al mapeo en `lib/sanity/revalidate.ts`:

```typescript
const DOCUMENT_TAG_MAP: Record<string, string[]> = {
  // ... existentes
  nuevoTipo: ['nuevo-tag'],
}

const DOCUMENT_PATH_MAP: Record<string, string[]> = {
  // ... existentes
  nuevoTipo: ['/nueva-ruta'],
}
```

2. Actualizar `getSlugPaths()` si aplica:

```typescript
function getSlugPaths(documentType: string, slug: string): string[] {
  switch (documentType) {
    // ... existentes
    case 'nuevoTipo':
      return [`/nueva-ruta/${slug}`]
  }
}
```

3. Usar tags en las queries del nuevo tipo:

```typescript
export async function getNuevoTipo() {
  return sanityFetch({
    query: QUERY,
    tags: ['nuevo-tag']
  })
}
```

### Agregar sincronización a DB

Para sincronizar datos a Prisma cuando cambie un documento:

```typescript
async function handleDatabaseSync(params: RevalidateParams): Promise<void> {
  const { documentId, documentType, operation, slug } = params

  if (documentType === 'nuevoTipo' && operation !== 'delete') {
    await syncNuevoTipo(documentId, slug)
  }
}
```
