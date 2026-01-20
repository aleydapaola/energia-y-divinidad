# Plan 09b: Eliminar Rutas API de Stripe

## Objetivo
Eliminar endpoints de checkout y webhook de Stripe.

## Prerequisito
Completar Plan 09a (preparación)

## Cambios

### 1. Eliminar directorio `app/api/checkout/stripe/`

```bash
rm -rf app/api/checkout/stripe/
```

Archivo eliminado:
- `app/api/checkout/stripe/route.ts`

### 2. Eliminar directorio `app/api/webhooks/stripe/`

```bash
rm -rf app/api/webhooks/stripe/
```

Archivo eliminado:
- `app/api/webhooks/stripe/route.ts`

## Verificación

```bash
# Verificar que los directorios no existen
ls app/api/checkout/stripe/ 2>&1 | grep "No such file"
ls app/api/webhooks/stripe/ 2>&1 | grep "No such file"

# Verificar build
npm run build
```

## Siguiente Plan
09c-stripe-update-checkout-logic.md
