# Plan 09f: Limpieza Final de Stripe

## Objetivo
Eliminar la biblioteca de Stripe, desinstalar la dependencia y limpiar variables de entorno.

## Prerequisito
Completar Plan 09e (eliminar páginas)

## Cambios

### 1. Eliminar `lib/stripe.ts`

```bash
rm lib/stripe.ts
```

### 2. Desinstalar dependencia de Stripe

```bash
npm uninstall stripe
```

Esto:
- Elimina `stripe` de `package.json`
- Actualiza `package-lock.json`
- Elimina archivos de `node_modules/stripe/`

### 3. Actualizar `.env.example`

**Eliminar sección de Stripe (líneas 47-51):**

```bash
# ELIMINAR ESTAS LÍNEAS:
# Stripe (LEGACY - Solo para migraciones)
# Se mantiene para suscripciones existentes
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

**Archivo `.env.example` actualizado:**

```bash
# Database (Neon PostgreSQL - https://neon.tech)
# Para desarrollo local: usa tu instancia local de PostgreSQL
# Para Vercel: configura Neon y usa la connection string con pooler
DATABASE_URL="postgresql://user:password@localhost:5432/energia_y_divinidad"

# Neon Pooled Connection (para serverless en Vercel)
# Obtener en: Neon Dashboard > Connection Details > Pooled connection
# DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/energia_y_divinidad?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# Google OAuth (obtener en https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"
NEXT_PUBLIC_SANITY_DATASET="production"
NEXT_PUBLIC_SANITY_API_VERSION="2024-01-01"
SANITY_API_TOKEN="your-sanity-token"
# Webhook secret for ISR revalidation (generate with: openssl rand -base64 32)
SANITY_WEBHOOK_SECRET="your-sanity-webhook-secret"

# ===========================================
# PASARELAS DE PAGO
# ===========================================

# Wompi (Colombia - COP)
# Obtener credenciales en: https://comercios.wompi.co/
# Documentación: https://docs.wompi.co/
NEXT_PUBLIC_WOMPI_PUBLIC_KEY="pub_test_..."
WOMPI_PRIVATE_KEY="prv_test_..."
WOMPI_EVENTS_SECRET="your-wompi-events-secret"
WOMPI_INTEGRITY_SECRET="your-wompi-integrity-secret"
WOMPI_ENVIRONMENT="sandbox" # sandbox | production

# ePayco (Internacional - USD y COP)
# Obtener credenciales en: https://dashboard.epayco.co/
# Documentación: https://docs.epayco.co/
NEXT_PUBLIC_EPAYCO_PUBLIC_KEY="your-epayco-public-key"
EPAYCO_PRIVATE_KEY="your-epayco-private-key"
EPAYCO_P_KEY="your-epayco-p-key"
EPAYCO_TEST_MODE="true" # true | false

# Nequi API Conecta (via Wompi o API directa)
# Documentación: https://docs.conecta.nequi.com.co/
NEQUI_API_URL="https://api.conecta.nequi.com.co"
NEQUI_CLIENT_ID="your-nequi-client-id"
NEQUI_CLIENT_SECRET="your-nequi-client-secret"
NEQUI_WEBHOOK_SECRET="your-nequi-webhook-secret"

# Resend (Para envío de emails)
# Obtener API key en: https://resend.com/api-keys
RESEND_API_KEY="re_..."
EMAIL_FROM="Energía y Divinidad <noreply@energiaydivinidad.com>"

# Site
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Feature Flags
NEXT_PUBLIC_EVENTS_ENABLED="true"
```

### 4. Limpiar variables en Vercel (Manual)

Si el proyecto está desplegado en Vercel, eliminar manualmente:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Pasos:**
1. Ir a https://vercel.com/[tu-proyecto]/settings/environment-variables
2. Eliminar las 3 variables de Stripe
3. Redesplegar para aplicar cambios

## Verificación Final

```bash
# 1. Verificar que no existe lib/stripe.ts
ls lib/stripe.ts 2>&1 | grep "No such file"

# 2. Verificar que stripe no está en package.json
grep -c '"stripe"' package.json  # Debe retornar 0

# 3. Verificar que no hay imports de stripe en todo el proyecto
grep -r "from 'stripe'" --include="*.ts" --include="*.tsx" .
grep -r "from '@/lib/stripe'" --include="*.ts" --include="*.tsx" .
# Ambos deben retornar vacío

# 4. Build completo
npm run build

# 5. Build de Sanity
cd sanity && npm run build
```

## Checklist Final

- [ ] `lib/stripe.ts` eliminado
- [ ] `app/api/checkout/stripe/` eliminado
- [ ] `app/api/webhooks/stripe/` eliminado
- [ ] `app/pago/stripe/` eliminado
- [ ] `app/checkout/success/page.tsx` refactorizado
- [ ] `lib/services/subscription-cancellation.ts` actualizado
- [ ] `app/api/subscriptions/reactivate/route.ts` actualizado
- [ ] `app/api/checkout/session/route.ts` actualizado
- [ ] `app/api/checkout/pack-code/route.ts` actualizado
- [ ] `app/api/events/book/route.ts` actualizado
- [ ] `app/api/bookings/route.ts` actualizado
- [ ] Dependencia `stripe` desinstalada
- [ ] `.env.example` actualizado
- [ ] Variables de Vercel eliminadas (manual)
- [ ] Build exitoso
- [ ] Sanity build exitoso

## Datos Históricos Preservados

Los siguientes permanecen en el schema de Prisma para datos históricos:
- `PaymentMethod.STRIPE` (enum value)
- `StripePayment` (modelo completo)
- `Subscription.stripeSubscriptionId`
- `Subscription.stripeCustomerId`
- `Booking.stripeSessionId`

Estos campos NO se eliminan para:
1. No perder datos de transacciones históricas
2. Mostrar correctamente órdenes antiguas en admin
3. Evitar migraciones de base de datos innecesarias
