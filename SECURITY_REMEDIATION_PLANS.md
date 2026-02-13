# Planes de Remediación de Seguridad
## Energía y Divinidad

Cada plan está diseñado para ejecutarse en un chat independiente. Copia el contenido del plan y pégalo en un nuevo chat de Claude Code.

---

## PLAN 1: Corregir Fallback Inseguro en ePayco
**Severidad:** ALTA | **Tiempo estimado:** 15 min | **Archivos:** 1

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con pasarelas de pago Wompi y ePayco
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
En lib/epayco.ts línea 618, hay un fallback inseguro que usa 'sha256' como clave si EPAYCO_PRIVATE_KEY está vacía:

const expectedSignature = createHmac('sha256', EPAYCO_CONFIG.privateKey || 'sha256')

Esto permitiría a un atacante falsificar webhooks si la variable de entorno no está configurada.

TAREA:
1. Lee el archivo lib/epayco.ts
2. Modifica la función verifyEpaycoWebhookSignature para que:
   - Lance un error si EPAYCO_CONFIG.privateKey está vacío
   - No use ningún fallback
3. Aplica el mismo patrón de validación en generateEpaycoSignature si es necesario
4. Asegúrate de que el código compile sin errores

NO modifiques la lógica de negocio, solo agrega la validación de seguridad.
```

---

## PLAN 2: Implementar Rate Limiting en Autenticación
**Severidad:** ALTA | **Tiempo estimado:** 30 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con NextAuth v5
- Ya existe un módulo de rate limiting en lib/rate-limit.ts
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
El endpoint de login con credenciales (lib/auth.ts, función authorize) no tiene rate limiting, permitiendo ataques de fuerza bruta.

TAREA:
1. Lee lib/auth.ts y lib/rate-limit.ts para entender la implementación actual
2. Crea un nuevo archivo lib/auth-rate-limit.ts que:
   - Implemente un rate limiter específico para autenticación
   - Limite a 5 intentos por IP en 15 minutos
   - Limite a 10 intentos por email en 1 hora
   - Registre intentos fallidos
3. Modifica lib/auth.ts para usar este rate limiter en la función authorize
4. Si el rate limit se excede, lanza un error claro: "RATE_LIMIT_EXCEEDED"
5. Asegúrate de que el código compile sin errores

NOTA: El rate limiter actual usa memoria, lo cual es limitado en serverless. Esta es una solución temporal; la migración a Redis se hará en otro plan.
```

---

## PLAN 3: Agregar Rate Limiting a Formulario de Contacto
**Severidad:** ALTA | **Tiempo estimado:** 15 min | **Archivos:** 1

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Ya existe helper applyRateLimit en lib/rate-limit.ts
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
El endpoint app/api/contact/route.ts no tiene protección contra spam ni abuso.

TAREA:
1. Lee app/api/contact/route.ts y lib/rate-limit.ts
2. Modifica app/api/contact/route.ts para:
   - Importar applyRateLimit y getClientIP de lib/rate-limit
   - Aplicar rate limit de 3 requests por minuto por IP al inicio del handler POST
   - Retornar la respuesta de rate limit si se excede
3. Asegúrate de que el código compile sin errores

Usa el mismo patrón que ya existe en app/api/checkout/route.ts como referencia.
```

---

## PLAN 4: Agregar Rate Limiting a Newsletter
**Severidad:** ALTA | **Tiempo estimado:** 15 min | **Archivos:** 1

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Ya existe helper applyRateLimit en lib/rate-limit.ts
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
El endpoint app/api/newsletter/route.ts no tiene protección contra spam ni enumeración de emails.

TAREA:
1. Lee app/api/newsletter/route.ts
2. Modifica el archivo para:
   - Importar applyRateLimit de lib/rate-limit
   - Aplicar rate limit de 2 requests por minuto por IP
   - Mejorar la validación de email usando un regex más robusto
3. Asegúrate de que el código compile sin errores

Regex de email recomendado:
/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
```

---

## PLAN 5: Corregir Vulnerabilidades de Dependencias
**Severidad:** ALTA | **Tiempo estimado:** 20 min | **Archivos:** 1

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- npm audit reporta 21 vulnerabilidades (6 high, 15 moderate)
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDADES:
- glob: Command injection (high)
- node-tar: Path traversal (high)
- undici: Decompression DoS (moderate)
- lodash, @sanity/ui: Varias (moderate)

TAREA:
1. Ejecuta npm audit para ver el estado actual
2. Ejecuta npm audit fix para corregir lo que se pueda sin breaking changes
3. Si quedan vulnerabilidades, revisa cuáles requieren --force
4. Para las que requieren major version bump, evalúa:
   - Lee el CHANGELOG de la dependencia
   - Determina si el breaking change afecta nuestro código
5. Ejecuta npm audit fix --force SOLO si es seguro
6. Ejecuta npm run build para verificar que todo compile
7. Documenta qué vulnerabilidades quedaron pendientes y por qué

NO hagas npm audit fix --force sin antes evaluar los breaking changes.
Reporta el resultado final del audit.
```

---

## PLAN 6: Agregar Security Headers
**Severidad:** ALTA | **Tiempo estimado:** 20 min | **Archivos:** 1

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Archivo de configuración: next.config.ts
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
No hay headers de seguridad configurados, exponiendo el sitio a clickjacking, MIME sniffing, y otros ataques.

TAREA:
1. Lee next.config.ts
2. Agrega la función async headers() con los siguientes headers para todas las rutas:
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin
   - X-XSS-Protection: 1; mode=block
   - Permissions-Policy: camera=(), microphone=(), geolocation=()
   - Strict-Transport-Security: max-age=31536000; includeSubDomains (solo para producción)
3. Asegúrate de mantener la configuración existente de images
4. Ejecuta npm run build para verificar que compile
5. Ejecuta npm run dev y verifica los headers con curl -I http://localhost:3000

NOTA: NO agregues Content-Security-Policy todavía, eso requiere un plan separado más extenso.
```

---

## PLAN 7: Validar Timestamp en Webhooks de Wompi
**Severidad:** MEDIA | **Tiempo estimado:** 15 min | **Archivos:** 1

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con integración Wompi
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
En lib/wompi.ts, la función verifyWompiWebhookSignature no valida que el timestamp sea reciente, permitiendo ataques de replay.

TAREA:
1. Lee lib/wompi.ts, específicamente la función verifyWompiWebhookSignature
2. Modifica la función para:
   - Parsear el timestamp como número
   - Validar que no tenga más de 5 minutos de antigüedad (300000 ms)
   - Retornar false si el webhook es muy antiguo
3. Actualiza también parseWompiWebhookEvent para pasar el timestamp correctamente
4. Asegúrate de que el código compile sin errores

El timestamp viene en milisegundos desde epoch.
```

---

## PLAN 8: Reducir Duración de Sesión JWT
**Severidad:** MEDIA | **Tiempo estimado:** 10 min | **Archivos:** 1

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con NextAuth v5
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Las sesiones JWT duran 30 días sin rotación, lo que aumenta el riesgo si un token es comprometido.

TAREA:
1. Lee lib/auth.ts
2. Modifica la configuración de session para:
   - Cambiar maxAge de 30 días a 7 días
   - Agregar un comentario explicando la decisión de seguridad
3. Asegúrate de que el código compile sin errores

CÓDIGO ACTUAL:
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 días
}

CÓDIGO DESEADO:
session: {
  strategy: "jwt",
  maxAge: 7 * 24 * 60 * 60, // 7 días - Reducido por seguridad
}
```

---

## PLAN 9: Sanitizar Comentarios de Membresía
**Severidad:** MEDIA | **Tiempo estimado:** 30 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con sistema de comentarios para membresía
- Los comentarios se guardan en Prisma como String @db.Text
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Los comentarios de membresía no se sanitizan, permitiendo XSS si se renderizan sin escape.

TAREA:
1. Instala la dependencia isomorphic-dompurify: npm install isomorphic-dompurify
2. Lee app/api/membership/posts/[slug]/comments/route.ts
3. Crea una utilidad en lib/sanitize.ts que:
   - Importe DOMPurify de isomorphic-dompurify
   - Exporte una función sanitizeHtml(input: string): string
   - Configure DOMPurify para permitir solo texto plano (ALLOWED_TAGS: [])
4. Modifica el endpoint de comentarios para sanitizar el contenido antes de guardarlo
5. Busca otros endpoints que acepten texto libre del usuario y aplica la misma sanitización
6. Asegúrate de que el código compile sin errores
```

---

## PLAN 10: Validar URLs de Imagen de Perfil
**Severidad:** MEDIA | **Tiempo estimado:** 20 min | **Archivos:** 1-2

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Los usuarios pueden actualizar su imagen de perfil
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
En app/api/users/me/route.ts, el campo image acepta cualquier URL sin validación, permitiendo SSRF o URLs maliciosas.

TAREA:
1. Lee app/api/users/me/route.ts
2. Crea una función de validación que:
   - Verifique que la URL sea HTTPS
   - Verifique que el dominio esté en una lista blanca:
     - cdn.sanity.io
     - lh3.googleusercontent.com (Google OAuth)
     - avatars.githubusercontent.com (GitHub OAuth)
     - res.cloudinary.com (si usan Cloudinary)
   - Retorne false para URLs no válidas
3. Aplica esta validación antes de actualizar el campo image
4. Retorna error 400 con mensaje "URL de imagen no válida" si falla
5. Asegúrate de que el código compile sin errores
```

---

## PLAN 11: Agregar Límites a Paginación
**Severidad:** BAJA | **Tiempo estimado:** 30 min | **Archivos:** 3-5

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con endpoints de admin que usan paginación
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Los endpoints de admin aceptan parámetros limit sin límite máximo, permitiendo DoS con limit=999999.

TAREA:
1. Busca todos los endpoints en app/api/admin/ que usen paginación
2. Para cada uno:
   - Agrega validación: limit debe ser entre 1 y 100
   - Agrega validación: offset debe ser >= 0
   - Si el valor está fuera de rango, usa el default (limit=20, offset=0)
3. Crea una utilidad en lib/pagination.ts que:
   - Exporte una función parsePaginationParams(searchParams)
   - Retorne { limit: number, offset: number } con valores validados
4. Refactoriza los endpoints para usar esta utilidad
5. Asegúrate de que el código compile sin errores

Archivos probables:
- app/api/admin/users/route.ts
- app/api/admin/orders/route.ts
- app/api/admin/subscriptions/route.ts
```

---

## PLAN 12: Mejorar Validación de Email Global
**Severidad:** MEDIA | **Tiempo estimado:** 30 min | **Archivos:** 4-6

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con múltiples endpoints que validan emails
- Actualmente usan regex básico: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
La validación de email es muy básica y no cumple con RFC 5322.

TAREA:
1. Instala zod si no está instalado (ya debería estar)
2. Crea o actualiza lib/validation.ts con:
   - Una función validateEmail(email: string) usando z.string().email()
   - Opcionalmente, una lista de dominios temporales/disposables para bloquear
3. Busca todos los archivos que usen el regex básico de email:
   - app/api/auth/register/route.ts
   - app/api/contact/route.ts
   - app/api/newsletter/route.ts
   - Otros que encuentres
4. Reemplaza el regex por la nueva función de validación
5. Asegúrate de que el código compile sin errores

NOTA: Zod ya está en el proyecto (ver package.json), úsalo.
```

---

## PLAN 13: Eliminar Logs que Exponen Emails
**Severidad:** BAJA | **Tiempo estimado:** 20 min | **Archivos:** 2-4

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Hay logs de console.log que exponen emails de usuarios
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Los logs en producción exponen emails de usuarios, violando principios de minimización de datos (RGPD).

TAREA:
1. Busca todos los console.log que contengan user.email, email, o ${user.email}
2. Modifica cada log para:
   - En desarrollo: mantener el email completo
   - En producción: mostrar solo los primeros 3 caracteres + "***@***"
3. Crea una utilidad en lib/logging.ts:
   - maskEmail(email: string): string
   - Retorna el email completo en dev, enmascarado en prod
4. Aplica esta utilidad en:
   - lib/auth.ts (eventos de signIn)
   - Cualquier otro archivo que loguee emails
5. Asegúrate de que el código compile sin errores

Ejemplo de máscara: "usuario@ejemplo.com" -> "usu***@***"
```

---

## PLAN 14: Bloqueo de Cuenta por Intentos Fallidos
**Severidad:** ALTA | **Tiempo estimado:** 45 min | **Archivos:** 3-4

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con NextAuth v5 y Prisma
- Ya existe rate limiting básico (Plan 2)
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
No hay mecanismo para bloquear cuentas después de múltiples intentos fallidos de login.

TAREA:
1. Modifica el schema de Prisma (prisma/schema.prisma):
   - Agrega a User: failedLoginAttempts Int @default(0)
   - Agrega a User: lockedUntil DateTime?
2. Ejecuta npx prisma migrate dev --name add_login_lockout
3. Modifica lib/auth.ts para:
   - Antes de validar password, verificar si lockedUntil > now()
   - Si está bloqueado, lanzar error "ACCOUNT_LOCKED"
   - Si password es incorrecto, incrementar failedLoginAttempts
   - Si failedLoginAttempts >= 5, establecer lockedUntil = now + 30 minutos
   - Si login exitoso, resetear failedLoginAttempts a 0
4. Crea endpoint app/api/auth/unlock-account/route.ts para auto-desbloqueo por email
5. Asegúrate de que el código compile y la migración se ejecute

NOTA: Este plan depende del Plan 2 (rate limiting en auth).
```

---

## PLAN 15: Migrar Rate Limiter a Redis
**Severidad:** ALTA | **Tiempo estimado:** 45 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 desplegado en Vercel (serverless)
- Rate limiter actual usa memoria local (no funciona en serverless)
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
El rate limiter en memoria no funciona en entornos serverless porque cada instancia tiene su propio contador.

TAREA:
1. Instala @upstash/ratelimit y @upstash/redis:
   npm install @upstash/ratelimit @upstash/redis
2. Agrega las variables de entorno al .env.example:
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
3. Modifica lib/rate-limit.ts para:
   - Crear un RedisStore que implemente RateLimitStore
   - Usar Upstash Redis para almacenar los contadores
   - Mantener InMemoryStore como fallback para desarrollo local
   - Detectar automáticamente si Redis está configurado
4. Asegúrate de que el código compile sin errores
5. Documenta cómo obtener credenciales de Upstash

NOTA: Upstash tiene tier gratuito suficiente para este uso.
Ver: https://upstash.com/docs/redis/overall/getstarted
```

---

## PLAN 16: Implementar Content Security Policy
**Severidad:** MEDIA | **Tiempo estimado:** 60 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con Sanity CMS y pasarelas de pago externas
- Ya tiene otros security headers (Plan 6)
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
No hay CSP configurado, permitiendo carga de scripts/estilos maliciosos.

TAREA:
1. Lee next.config.ts y analiza qué dominios externos se usan:
   - Sanity CDN (cdn.sanity.io)
   - Google Fonts (si aplica)
   - Checkout Wompi (checkout.wompi.co)
   - Checkout ePayco (checkout.epayco.co, secure.epayco.co)
   - Vercel Analytics (si aplica)
2. Crea el header CSP con las siguientes directivas:
   - default-src 'self'
   - script-src 'self' 'unsafe-inline' 'unsafe-eval' checkout.wompi.co checkout.epayco.co
   - style-src 'self' 'unsafe-inline' fonts.googleapis.com
   - img-src 'self' data: cdn.sanity.io
   - font-src 'self' fonts.gstatic.com
   - frame-src checkout.wompi.co checkout.epayco.co
   - connect-src 'self' *.sanity.io *.wompi.co *.epayco.co
3. Agrega el header a next.config.ts
4. Prueba el sitio para asegurar que todo funcione
5. Ajusta las directivas según los errores de consola

NOTA: CSP requiere pruebas extensivas. Empieza en modo report-only.
```

---

## PLAN 17: Configurar CORS Explícito
**Severidad:** MEDIA | **Tiempo estimado:** 25 min | **Archivos:** 2

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- CORS no está configurado explícitamente
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Sin configuración CORS explícita, se depende de defaults que podrían ser muy permisivos.

TAREA:
1. Lee middleware.ts actual
2. Modifica o crea configuración CORS en el middleware para:
   - Permitir solo orígenes específicos (el dominio de producción)
   - Bloquear credenciales para orígenes no permitidos
   - Configurar headers permitidos
3. Para los webhooks (app/api/webhooks/*), permite POST desde cualquier origen (las pasarelas lo necesitan)
4. Agrega los headers CORS apropiados:
   - Access-Control-Allow-Origin: https://energiaydivinidad.com (o variable de entorno)
   - Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   - Access-Control-Allow-Headers: Content-Type, Authorization
5. Asegúrate de que el código compile y las APIs funcionen

NOTA: Los webhooks de pago DEBEN poder recibir POST desde los servidores de Wompi/ePayco.
```

---

## PLAN 18: Implementar Derecho al Olvido (RGPD)
**Severidad:** MEDIA | **Tiempo estimado:** 60 min | **Archivos:** 3-5

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con Prisma
- Usuarios pueden tener: orders, bookings, subscriptions, comments, etc.
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
No existe mecanismo para que usuarios soliciten eliminación de sus datos (RGPD Art. 17).

TAREA:
1. Lee prisma/schema.prisma para entender todas las relaciones de User
2. Crea endpoint app/api/users/me/delete-account/route.ts que:
   - Requiera autenticación
   - Requiera confirmación (password o código por email)
   - Elimine o anonimice los datos del usuario
3. Decide qué datos eliminar vs anonimizar:
   - ELIMINAR: datos personales, comentarios, preferencias
   - ANONIMIZAR: órdenes (requeridas para contabilidad), pero quitar datos personales
4. Implementa la lógica de eliminación/anonimización
5. Envía email de confirmación de eliminación
6. Asegúrate de que el código compile

NOTA: Las órdenes completadas deben mantenerse por requisitos legales/contables, pero sin datos personales identificables.
```

---

## PLAN 19: Implementar Exportación de Datos (RGPD)
**Severidad:** MEDIA | **Tiempo estimado:** 45 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con Prisma
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
No existe mecanismo para que usuarios exporten sus datos (RGPD Art. 20 - Portabilidad).

TAREA:
1. Crea endpoint app/api/users/me/export-data/route.ts que:
   - Requiera autenticación
   - Recopile todos los datos del usuario:
     - Perfil básico
     - Órdenes
     - Bookings
     - Suscripciones
     - Comentarios
     - Progreso de cursos
   - Genere un JSON estructurado
   - Opcionalmente, genere un ZIP con el JSON
2. Agrega rate limiting (1 request por hora por usuario)
3. Considera enviar el archivo por email en lugar de descarga directa
4. Asegúrate de que el código compile

Formato de exportación recomendado:
{
  "exportDate": "ISO date",
  "user": { ... },
  "orders": [ ... ],
  "bookings": [ ... ],
  ...
}
```

---

## PLAN 20: Agregar Captcha a Formularios Públicos
**Severidad:** MEDIA | **Tiempo estimado:** 45 min | **Archivos:** 4-6

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Formularios públicos: contacto, newsletter, registro
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Los formularios públicos son vulnerables a bots y spam automatizado.

TAREA:
1. Elige entre hCaptcha (más privacidad) o Cloudflare Turnstile (más simple):
   - Recomendación: Cloudflare Turnstile (gratuito, buen UX)
2. Instala la dependencia necesaria
3. Agrega variables de entorno:
   - NEXT_PUBLIC_TURNSTILE_SITE_KEY=
   - TURNSTILE_SECRET_KEY=
4. Crea componente components/ui/Captcha.tsx
5. Crea lib/captcha.ts con función verifyCaptcha(token: string)
6. Integra el captcha en:
   - Formulario de contacto (componente + API)
   - Formulario de newsletter (componente + API)
   - Formulario de registro (componente + API)
7. Asegúrate de que el código compile y el captcha funcione

Documentación Turnstile: https://developers.cloudflare.com/turnstile/
```

---

## PLAN 21: Mejorar Logging de Seguridad
**Severidad:** BAJA | **Tiempo estimado:** 30 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Ya existe modelo AuditLog en Prisma
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
No se registran eventos de seguridad importantes para análisis forense.

TAREA:
1. Lee lib/audit.ts si existe, o créalo
2. Implementa funciones para registrar:
   - logAuthEvent(type: 'login_success' | 'login_failed' | 'logout', userId?, ip, userAgent)
   - logSecurityEvent(type: 'rate_limit_hit' | 'invalid_webhook' | 'csrf_attempt', details)
3. Modifica lib/auth.ts para usar logAuthEvent
4. Modifica lib/rate-limit.ts para registrar cuando se bloquea una IP
5. Modifica los procesadores de webhook para registrar intentos inválidos
6. Asegúrate de que el código compile

Los eventos deben incluir:
- Timestamp
- IP
- User Agent
- User ID (si aplica)
- Detalles del evento
```

---

## PLAN 22: Validar Entrada de Metadatos JSON
**Severidad:** MEDIA | **Tiempo estimado:** 30 min | **Archivos:** 3-4

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Varios modelos de Prisma tienen campos metadata: Json?
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Los campos metadata aceptan cualquier JSON sin validación, permitiendo inyección de datos maliciosos o DoS por objetos muy grandes.

TAREA:
1. Identifica todos los endpoints que aceptan metadata:
   - app/api/checkout/route.ts
   - Otros endpoints que escriban metadata
2. Crea lib/metadata-validator.ts con:
   - validateMetadata(data: unknown): { valid: boolean, error?: string }
   - Límite de tamaño (ej: 10KB máximo)
   - Límite de profundidad de anidación (ej: 3 niveles)
   - Lista de keys prohibidas
3. Aplica la validación antes de guardar metadata
4. Retorna error 400 si la validación falla
5. Asegúrate de que el código compile

Configuración sugerida:
- MAX_SIZE: 10 * 1024 (10KB)
- MAX_DEPTH: 3
- FORBIDDEN_KEYS: ['__proto__', 'constructor', 'prototype']
```

---

## PLAN 23: Proteger Endpoints de Admin con IP Whitelist
**Severidad:** MEDIA | **Tiempo estimado:** 30 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Endpoints de admin en app/api/admin/*
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Los endpoints de admin solo verifican rol, pero no IP, permitiendo acceso desde cualquier ubicación.

TAREA:
1. Agrega variable de entorno ADMIN_ALLOWED_IPS (opcional, separadas por coma)
2. Crea lib/admin-security.ts con:
   - isAdminIPAllowed(ip: string): boolean
   - Si ADMIN_ALLOWED_IPS no está configurado, permite todas las IPs
   - Si está configurado, solo permite las IPs listadas
3. Crea middleware para endpoints /api/admin/* que:
   - Verifique la IP antes de procesar
   - Retorne 403 si la IP no está permitida
4. Registra intentos de acceso bloqueados en AuditLog
5. Asegúrate de que el código compile

NOTA: Esta es una capa adicional, no reemplaza la verificación de rol.
```

---

## PLAN 24: Implementar Timeout en Operaciones de Pago
**Severidad:** MEDIA | **Tiempo estimado:** 25 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con Wompi y ePayco
- Los fetch a las pasarelas no tienen timeout explícito
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Las operaciones de pago pueden quedarse colgadas indefinidamente si las pasarelas no responden, causando timeout de Vercel y mala UX.

TAREA:
1. Crea lib/fetch-with-timeout.ts:
   - fetchWithTimeout(url, options, timeoutMs = 30000)
   - Usa AbortController para cancelar después del timeout
2. Modifica lib/wompi.ts para usar fetchWithTimeout en todas las llamadas a API
3. Modifica lib/epayco.ts para usar fetchWithTimeout en todas las llamadas a API
4. Timeout recomendado: 30 segundos para crear pagos, 10 segundos para consultas
5. Asegúrate de que el código compile

Esto previene que las funciones serverless se queden colgadas hasta el timeout de Vercel (10s en hobby, 60s en pro).
```

---

## PLAN 25: Agregar Validación de Monto en Checkout
**Severidad:** MEDIA | **Tiempo estimado:** 25 min | **Archivos:** 2

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con checkout unificado
- El monto viene del frontend
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
El checkout confía en el monto enviado por el frontend. Un atacante podría modificar el monto a $0 o $0.01.

TAREA:
1. Lee app/api/checkout/route.ts y lib/checkout/checkout-service.ts
2. Modifica el flujo de checkout para:
   - Obtener el precio real del producto desde Sanity/Prisma
   - Comparar con el monto enviado por el frontend
   - Rechazar si hay discrepancia (tolerancia: 0.01 para redondeos)
3. Crea función lib/pricing.ts:
   - getProductPrice(productType, productId): Promise<{ price: number, currency: string }>
   - Consulta Sanity para sesiones, eventos, membresías
4. Integra la validación en el checkout
5. Asegúrate de que el código compile

El servidor NUNCA debe confiar en el precio enviado por el cliente.
```

---

## PLAN 26: Validar Firma de Webhook Sanity
**Severidad:** MEDIA | **Tiempo estimado:** 20 min | **Archivos:** 2

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con Sanity CMS
- Existe endpoint app/api/webhooks/sanity/route.ts
- Variable SANITY_WEBHOOK_SECRET definida en .env.example
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Verificar si el webhook de Sanity valida la firma. Si no, un atacante podría enviar webhooks falsos para invalidar cache o manipular datos.

TAREA:
1. Lee app/api/webhooks/sanity/route.ts
2. Verifica si se valida el header de firma de Sanity
3. Si no se valida, implementa la verificación:
   - Sanity envía header 'sanity-webhook-signature'
   - La firma es un HMAC-SHA256 del body con el secret
4. Lee el body como texto raw para calcular la firma
5. Compara la firma calculada con la recibida
6. Rechaza con 401 si no coinciden
7. Asegúrate de que el código compile

Documentación: https://www.sanity.io/docs/webhooks
```

---

## PLAN 27: Prevenir Enumeración de Usuarios
**Severidad:** MEDIA | **Tiempo estimado:** 20 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con registro y login
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Los endpoints de registro y login revelan si un email existe o no, permitiendo enumeración de usuarios.

TAREA:
1. Lee app/api/auth/register/route.ts
2. Modifica el mensaje cuando el email ya existe:
   - ACTUAL: "Este email ya está registrado"
   - NUEVO: "Si este email está registrado, recibirás un correo" (igual que si fuera nuevo)
3. Lee lib/auth.ts
4. Asegúrate de que el login devuelva el mismo mensaje genérico para:
   - Usuario no existe
   - Contraseña incorrecta
   - ACTUAL: Comportamiento por defecto de NextAuth (null)
   - NUEVO: Mensaje genérico "Credenciales inválidas"
5. Aplica el mismo tiempo de respuesta para ambos casos (previene timing attacks)
6. Asegúrate de que el código compile

El objetivo es que un atacante no pueda distinguir entre "email no existe" y "contraseña incorrecta".
```

---

## PLAN 28: Agregar Verificación de Integridad en Pagos
**Severidad:** MEDIA | **Tiempo estimado:** 25 min | **Archivos:** 2

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con Wompi
- Wompi soporta firma de integridad
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Verificar si se usa la firma de integridad de Wompi para validar que el monto no fue alterado en el redirect.

TAREA:
1. Lee lib/wompi.ts, específicamente generateWompiIntegritySignature
2. Lee app/pago/confirmacion/page.tsx o donde se recibe el redirect de Wompi
3. Verifica si se valida la firma de integridad cuando el usuario vuelve del checkout
4. Si no se valida, implementa:
   - Extraer referencia, monto y firma de los parámetros de URL
   - Calcular la firma esperada con generateWompiIntegritySignature
   - Comparar con la firma recibida
   - Rechazar si no coinciden
5. Asegúrate de que el código compile

La verificación debe hacerse en server-side, no en el cliente.
```

---

## PLAN 29: Configurar Dependabot
**Severidad:** BAJA | **Tiempo estimado:** 15 min | **Archivos:** 1

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 en GitHub
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
No hay monitoreo automático de vulnerabilidades en dependencias.

TAREA:
1. Crea el directorio .github si no existe
2. Crea el archivo .github/dependabot.yml con:
   - Actualizaciones de npm (package-ecosystem: npm)
   - Frecuencia diaria para security updates
   - Frecuencia semanal para version updates
   - Límite de 5 PRs abiertas simultáneamente
3. El archivo debe configurar:
   - Actualizaciones para npm (package.json)
   - Actualizaciones para GitHub Actions si hay workflows
4. Haz commit del archivo

Ejemplo de configuración:
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

---

## PLAN 30: Agregar ESLint Security Plugin
**Severidad:** BAJA | **Tiempo estimado:** 20 min | **Archivos:** 2

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con ESLint
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
No hay análisis estático de seguridad en el proceso de desarrollo.

TAREA:
1. Instala eslint-plugin-security:
   npm install --save-dev eslint-plugin-security
2. Lee la configuración actual de ESLint (eslint.config.js o .eslintrc.*)
3. Agrega el plugin de seguridad a la configuración
4. Ejecuta npm run lint para ver los warnings de seguridad
5. Revisa los warnings y corrige los que sean críticos
6. Asegúrate de que el lint pase sin errores críticos

El plugin detecta:
- eval() y similares
- Inyección de comandos
- Path traversal
- Regex inseguros
```

---

## PLAN 31: Deshabilitar X-Powered-By
**Severidad:** BAJA | **Tiempo estimado:** 5 min | **Archivos:** 1

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
El header X-Powered-By revela que el sitio usa Next.js, facilitando ataques dirigidos.

TAREA:
1. Lee next.config.ts
2. Agrega la opción poweredByHeader: false a la configuración
3. Verifica con curl -I que el header ya no aparece
4. Asegúrate de que el build funcione

Esta es una medida de "seguridad por obscuridad" menor, pero es una buena práctica.
```

---

## PLAN 32: Implementar Logout de Todas las Sesiones
**Severidad:** BAJA | **Tiempo estimado:** 30 min | **Archivos:** 3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con NextAuth v5 y JWT
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
No hay forma de invalidar todas las sesiones de un usuario (por ejemplo, si sospecha que su cuenta fue comprometida).

TAREA:
1. Modifica prisma/schema.prisma:
   - Agrega a User: tokenVersion Int @default(0)
2. Ejecuta npx prisma migrate dev --name add_token_version
3. Modifica lib/auth.ts:
   - En el callback jwt, incluir tokenVersion del usuario
   - En el callback session, verificar que tokenVersion coincida
4. Crea endpoint app/api/auth/logout-all/route.ts:
   - Incrementa tokenVersion del usuario
   - Esto invalida todos los JWTs anteriores
5. Asegúrate de que el código compile y la migración se ejecute

Esta técnica usa "versioning" de tokens para invalidar todos los JWTs existentes.
```

---

## PLAN 33: Validar Tipos de Archivo en Uploads
**Severidad:** MEDIA | **Tiempo estimado:** 30 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Hay modelo ManualPayment con campo screenshot (URL de comprobante)
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Si hay un endpoint de upload de archivos, verificar que valide:
- Tipo MIME
- Extensión
- Magic bytes

TAREA:
1. Busca endpoints que manejen uploads de archivos:
   - Comprobantes de pago manual
   - Imágenes de perfil
   - Otros uploads
2. Si existen, verifica que se valide:
   - Tipo MIME (application/pdf, image/png, image/jpeg)
   - Extensión del archivo
   - Magic bytes (primeros bytes del archivo)
3. Si no hay validación, implementa lib/file-validation.ts:
   - validateFileType(buffer: Buffer, allowedTypes: string[])
   - Usa magic-bytes o file-type para verificar
4. Limita el tamaño máximo de archivos (ej: 5MB)
5. Asegúrate de que el código compile

Si no hay uploads directos (todo va a Sanity/Vercel Blob), documéntalo.
```

---

## PLAN 34: Agregar Alerta por Webhook Inválido
**Severidad:** BAJA | **Tiempo estimado:** 25 min | **Archivos:** 2-3

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15 con webhooks de Wompi y ePayco
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
Los webhooks inválidos se rechazan silenciosamente. No hay alerta cuando alguien intenta falsificar webhooks.

TAREA:
1. Crea lib/alerts.ts con:
   - sendSecurityAlert(type: string, details: object)
   - Por ahora, envía email al admin usando Resend
   - En el futuro, puede integrarse con Slack/PagerDuty
2. Modifica lib/payments/webhook-processor.ts:
   - Cuando verificationResult.valid === false, llamar sendSecurityAlert
3. Incluye en la alerta:
   - Timestamp
   - IP del request
   - Headers relevantes
   - Payload (truncado si es muy grande)
4. Agrega rate limiting a las alertas (máx 5 por hora por tipo)
5. Asegúrate de que el código compile

Variable de entorno necesaria: ADMIN_ALERT_EMAIL
```

---

## PLAN 35: Documentar Arquitectura de Seguridad
**Severidad:** BAJA | **Tiempo estimado:** 30 min | **Archivos:** 1-2

```
CONTEXTO DEL PROYECTO:
- Proyecto Next.js 15
- Múltiples medidas de seguridad implementadas
- Ubicación: /Users/xmonfort/Projects/energia-y-divinidad

VULNERABILIDAD:
No hay documentación de la arquitectura de seguridad para nuevos desarrolladores.

TAREA:
1. Crea el archivo SECURITY.md en la raíz del proyecto con:

   ## Arquitectura de Seguridad

   ### Autenticación
   - Stack: NextAuth v5 con JWT
   - Duración de sesión: X días
   - Rate limiting: X intentos por Y minutos
   - Bloqueo de cuenta: después de X intentos

   ### Pagos
   - Pasarelas: Wompi (COP), ePayco (USD)
   - Verificación de webhooks: HMAC-SHA256
   - Validación de integridad: Sí/No

   ### Headers de Seguridad
   - CSP: [configuración]
   - HSTS: [configuración]
   - Otros: [lista]

   ### Rate Limiting
   - Store: Redis/Memoria
   - Límites por endpoint: [tabla]

   ### Cumplimiento
   - RGPD: [estado]
   - PCI-DSS: [estado]

   ### Monitorización
   - Logging: [configuración]
   - Alertas: [configuración]

2. Actualiza CLAUDE.md para referenciar SECURITY.md
3. Asegúrate de que la documentación refleje el estado actual
```

---

## RESUMEN DE EJECUCIÓN

| Prioridad | Planes | Tiempo Total Estimado |
|-----------|--------|----------------------|
| ALTA | 1-6, 14-15 | ~4.5 horas |
| MEDIA | 7, 9-10, 12, 16-28 | ~8.5 horas |
| BAJA | 8, 11, 13, 21, 29-35 | ~3.5 horas |
| **TOTAL** | **35 planes** | **~16.5 horas** |

### Orden Recomendado de Ejecución

**Semana 1 (Críticos):**
1. Plan 1: Fallback ePayco
2. Plan 5: npm audit fix
3. Plan 6: Security Headers
4. Plan 2: Rate Limit Login
5. Plan 3: Rate Limit Contacto
6. Plan 4: Rate Limit Newsletter

**Semana 2 (Importantes):**
7. Plan 15: Redis Rate Limiter
8. Plan 14: Bloqueo de Cuenta
9. Plan 7: Timestamp Wompi
10. Plan 25: Validación Monto

**Semana 3+ (Mejoras):**
- Ejecutar planes restantes según disponibilidad
