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
