# Plan 09e: Eliminar Páginas de Stripe

## Objetivo
Eliminar páginas de UI relacionadas con Stripe y actualizar la página de éxito de checkout.

## Prerequisito
Completar Plan 09d (actualizar suscripciones)

## Cambios

### 1. Eliminar directorio `app/pago/stripe/`

```bash
rm -rf app/pago/stripe/
```

Archivo eliminado:
- `app/pago/stripe/[orderId]/page.tsx`

### 2. Refactorizar `app/checkout/success/page.tsx`

Esta página actualmente solo funciona con Stripe. Necesita ser refactorizada para funcionar con cualquier pasarela o ser eliminada.

**Opción A: Eliminar y redirigir a `/pago/confirmacion`**

Si ya existe una página de confirmación genérica en `/pago/confirmacion`, eliminar esta:

```bash
rm -rf app/checkout/success/
```

**Opción B: Refactorizar para usar datos de DB en lugar de Stripe**

Reemplazar contenido completo de `app/checkout/success/page.tsx`:

```typescript
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { prisma } from '@/lib/prisma'

interface PageProps {
  searchParams: Promise<{ order_id?: string; subscription_id?: string }>
}

async function CheckoutSuccess({
  orderId,
  subscriptionId
}: {
  orderId?: string
  subscriptionId?: string
}) {
  try {
    let membershipTierName = 'Premium'
    let billingInterval = 'monthly'

    if (subscriptionId) {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      })

      if (subscription) {
        membershipTierName = subscription.membershipTierName
        billingInterval = subscription.billingInterval.toLowerCase()
      }
    } else if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      })

      if (order) {
        membershipTierName = order.itemName
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
        <div className="max-w-2xl w-full bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8">
          {/* Icono de éxito */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-3xl font-bold text-center text-neutral-900 dark:text-white mb-4">
            ¡Bienvenido a la Membresía!
          </h1>

          {/* Mensaje de confirmación */}
          <p className="text-center text-neutral-600 dark:text-neutral-400 mb-8">
            Tu suscripción a{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {membershipTierName}
            </span>{' '}
            ha sido activada exitosamente.
          </p>

          {/* Detalles */}
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-neutral-900 dark:text-white mb-4">
              Detalles de tu membresía:
            </h2>
            <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex justify-between">
                <span>Plan:</span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {membershipTierName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Facturación:</span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {billingInterval === 'yearly' ? 'Anual' : 'Mensual'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estado:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  Activa
                </span>
              </div>
            </div>
          </div>

          {/* Qué puedes hacer ahora */}
          <div className="mb-8">
            <h2 className="font-semibold text-neutral-900 dark:text-white mb-4">
              ¿Qué puedes hacer ahora?
            </h2>
            <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
              <li className="flex items-start">
                <span className="text-amber-600 dark:text-amber-400 mr-2">✓</span>
                <span>Accede a todas las publicaciones exclusivas del feed de membresía</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-600 dark:text-amber-400 mr-2">✓</span>
                <span>Explora la biblioteca completa de contenido premium</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-600 dark:text-amber-400 mr-2">✓</span>
                <span>Participa en encuestas y comenta en las publicaciones</span>
              </li>
              <li className="flex items-start">
                <span className="text-amber-600 dark:text-amber-400 mr-2">✓</span>
                <span>Gestiona tu suscripción desde tu panel de control</span>
              </li>
            </ul>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard/membresia/publicaciones"
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
            >
              Ver Publicaciones
            </Link>
            <Link
              href="/dashboard/membresia/biblioteca"
              className="flex-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
            >
              Explorar Biblioteca
            </Link>
          </div>

          {/* Link secundario */}
          <div className="text-center mt-6">
            <Link
              href="/dashboard"
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              Ir al Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error recuperando datos de suscripción:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            Error al verificar tu suscripción
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Hubo un problema al verificar tu suscripción. Por favor contacta a soporte.
          </p>
          <Link
            href="/dashboard"
            className="text-amber-600 dark:text-amber-400 hover:underline"
          >
            Ir al Dashboard
          </Link>
        </div>
      </div>
    )
  }
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { order_id, subscription_id } = params

  if (!order_id && !subscription_id) {
    redirect('/membresia')
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-neutral-600 dark:text-neutral-400">
              Verificando tu suscripción...
            </p>
          </div>
        </div>
      }
    >
      <CheckoutSuccess orderId={order_id} subscriptionId={subscription_id} />
    </Suspense>
  )
}
```

### 3. Actualizar `app/checkout/pack-success/PackSuccessContent.tsx`

**Modificar comentario en línea 33:**

```typescript
// ANTES:
// Obtener datos del pack code asociado a esta sesión de Stripe

// DESPUÉS:
// Obtener datos del pack code asociado a este booking
```

## Verificación

```bash
# Verificar que no existen páginas de stripe
ls app/pago/stripe/ 2>&1 | grep "No such file"

# Verificar que no hay imports de stripe en páginas
grep -r "from '@/lib/stripe'" app/checkout/
grep -r "from '@/lib/stripe'" app/pago/

# Build
npm run build
```

## Siguiente Plan
09f-stripe-cleanup.md
