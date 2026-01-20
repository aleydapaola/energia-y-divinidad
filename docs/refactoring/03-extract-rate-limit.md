# Plan 03: Extraer Utilidad de Rate Limiting

## Objetivo
Extraer la función de rate limiting inline de `app/api/events/book/route.ts` a una utilidad reutilizable.

## Contexto
El rate limiting está implementado directamente en el archivo de eventos, pero debería estar disponible para otros endpoints que lo necesiten.

## Código Actual

En `app/api/events/book/route.ts` (líneas 24-44):

```typescript
// Rate limiting simple (en producción usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minuto
  const maxRequests = 5

  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}
```

## Pasos de Implementación

### Paso 1: Crear el archivo de utilidad

Crear `lib/rate-limit.ts`:

```typescript
/**
 * Rate Limiting Utilities
 *
 * Implementación simple de rate limiting en memoria.
 * Para producción con múltiples instancias, considerar usar Redis.
 */

interface RateLimitRecord {
  count: number
  resetTime: number
}

interface RateLimitStore {
  get(key: string): RateLimitRecord | undefined
  set(key: string, record: RateLimitRecord): void
  delete(key: string): void
}

// Store en memoria (por defecto)
class InMemoryStore implements RateLimitStore {
  private map = new Map<string, RateLimitRecord>()

  get(key: string): RateLimitRecord | undefined {
    return this.map.get(key)
  }

  set(key: string, record: RateLimitRecord): void {
    this.map.set(key, record)
  }

  delete(key: string): void {
    this.map.delete(key)
  }
}

// Store global para mantener estado entre requests
const defaultStore = new InMemoryStore()

export interface RateLimitOptions {
  /** Ventana de tiempo en milisegundos (default: 60000 = 1 minuto) */
  windowMs?: number
  /** Máximo de requests permitidos en la ventana (default: 5) */
  maxRequests?: number
  /** Store personalizado (default: en memoria) */
  store?: RateLimitStore
}

export interface RateLimitResult {
  /** Si el request está permitido */
  allowed: boolean
  /** Requests restantes en la ventana actual */
  remaining: number
  /** Timestamp cuando se resetea el límite */
  resetTime: number
  /** Tiempo en ms hasta el reset */
  retryAfter: number
}

/**
 * Verifica si un request está dentro del rate limit
 *
 * @param key - Identificador único (IP, userId, etc.)
 * @param options - Opciones de configuración
 * @returns Resultado con estado del rate limit
 *
 * @example
 * const result = checkRateLimit(clientIP)
 * if (!result.allowed) {
 *   return new Response('Too Many Requests', {
 *     status: 429,
 *     headers: { 'Retry-After': String(Math.ceil(result.retryAfter / 1000)) }
 *   })
 * }
 */
export function checkRateLimit(
  key: string,
  options?: RateLimitOptions
): RateLimitResult {
  const {
    windowMs = 60_000, // 1 minuto
    maxRequests = 5,
    store = defaultStore,
  } = options || {}

  const now = Date.now()
  const record = store.get(key)

  // Si no hay registro o expiró, crear nuevo
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs
    store.set(key, { count: 1, resetTime })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
      retryAfter: 0,
    }
  }

  // Si excede el límite
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: record.resetTime - now,
    }
  }

  // Incrementar contador
  record.count++
  store.set(key, record)

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
    retryAfter: 0,
  }
}

/**
 * Helper para obtener IP del cliente desde NextRequest
 */
export function getClientIP(request: Request): string {
  // Intentar headers comunes de proxies
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback
  return 'unknown'
}

/**
 * Crea headers de rate limit para la respuesta
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    ...(result.allowed ? {} : { 'Retry-After': String(Math.ceil(result.retryAfter / 1000)) }),
  }
}

/**
 * Middleware helper para aplicar rate limiting
 *
 * @example
 * const rateLimitResult = applyRateLimit(request, { maxRequests: 10 })
 * if (rateLimitResult) {
 *   return rateLimitResult // Response 429
 * }
 */
export function applyRateLimit(
  request: Request,
  options?: RateLimitOptions
): Response | null {
  const ip = getClientIP(request)
  const result = checkRateLimit(ip, options)

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.',
        retryAfter: Math.ceil(result.retryAfter / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...getRateLimitHeaders(result),
        },
      }
    )
  }

  return null
}
```

### Paso 2: Actualizar app/api/events/book/route.ts

**Antes** (líneas 24-44, eliminar completamente):
```typescript
// Rate limiting simple (en producción usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  // ... código a eliminar
}
```

**Agregar import**:
```typescript
import { applyRateLimit, getClientIP } from '@/lib/rate-limit'
```

**Actualizar el uso** (buscar donde se usa `checkRateLimit`):

```typescript
// Antes
const ip = request.headers.get('x-forwarded-for') ||
           request.headers.get('x-real-ip') ||
           'unknown'

if (!checkRateLimit(ip)) {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
    { status: 429 }
  )
}

// Después
const rateLimitResponse = applyRateLimit(request, { maxRequests: 5, windowMs: 60_000 })
if (rateLimitResponse) {
  return rateLimitResponse
}
```

### Paso 3: Identificar otros endpoints que podrían beneficiarse

```bash
# Buscar endpoints que podrían necesitar rate limiting
grep -r "429\|rate.*limit\|too.*many" --include="*.ts" app/api/ | grep -v node_modules
```

Endpoints candidatos para agregar rate limiting:
- `app/api/auth/register/route.ts`
- `app/api/bookings/route.ts`
- `app/api/contact/route.ts` (si existe)

### Paso 4: Verificar que compila
```bash
npm run build
```

### Paso 5: Probar funcionalidad

1. Hacer más de 5 requests en 1 minuto al endpoint de eventos
2. Verificar que el 6to request devuelve 429
3. Esperar 1 minuto y verificar que se puede hacer requests de nuevo

## Archivos a Crear
- ✅ `lib/rate-limit.ts`

## Archivos a Modificar
- 📝 `app/api/events/book/route.ts` - Eliminar implementación local, usar utilidad

## Archivos Opcionales para Mejorar (fuera de scope)
- `app/api/auth/register/route.ts` - Agregar rate limiting
- `app/api/bookings/route.ts` - Agregar rate limiting

## Criterios de Éxito
- [ ] El archivo `lib/rate-limit.ts` existe con funciones exportadas
- [ ] `app/api/events/book/route.ts` usa la utilidad importada
- [ ] No hay implementación de rate limiting duplicada
- [ ] `npm run build` completa sin errores
- [ ] El rate limiting funciona correctamente (429 después de 5 requests)

## Rollback
```bash
git checkout -- app/api/events/book/route.ts
rm lib/rate-limit.ts
```

## Riesgo
**Bajo** - Es una extracción de código existente con mejoras.

## Tiempo Estimado
30 minutos
