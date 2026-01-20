# Plan de Refactorización - Energía y Divinidad

Este directorio contiene planes detallados para eliminar funcionalidades duplicadas en el proyecto.

## Índice de Planes

| # | Plan | Riesgo | Dependencias | Estado |
|---|------|--------|--------------|--------|
| 01 | [Eliminar session.ts](./01-cleanup-session-schema.md) | Bajo | Ninguna | ✅ Completado |
| 02 | [Extraer generateOrderNumber](./02-extract-order-utils.md) | Bajo | Ninguna | ✅ Completado |
| 03 | [Extraer Rate Limiting](./03-extract-rate-limit.md) | Bajo | Ninguna | ✅ Completado |
| 04 | [Servicio de Cancelación de Bookings](./04-booking-cancellation-service.md) | Medio | Ninguna | ✅ Completado |
| 05 | [Servicio de Cancelación de Suscripciones](./05-subscription-cancellation-service.md) | Medio | Ninguna | ✅ Completado |
| 06 | [Interfaz de Pasarelas de Pago](./06-payment-gateway-interface.md) | Medio | Ninguna | ✅ Completado |
| 07 | [Unificar Checkout](./07-unify-checkout.md) | Alto | Plan 06 | ✅ Completado |
| 08 | [Unificar Webhooks](./08-unify-webhooks.md) | Alto | Plan 06 | ✅ Completado |
| 09 | [Eliminar Stripe](./09-remove-stripe.md) | Medio | Ninguna | ✅ Completado |
| 09 | [Objetos Reutilizables Sanity](./09-sanity-reusable-objects.md) | Bajo | Ninguna | ✅ Completado |
| 10 | [Migrar Esquemas Sanity](./10-migrate-sanity-schemas.md) | Alto | Plan 09 | ✅ Completado |
| 11 | [Proyecciones GROQ](./11-sanity-query-projections.md) | Bajo | Plan 10 | ✅ Completado |

### Plan 09: Eliminar Stripe (Subplanes)

| # | Subplan | Descripción |
|---|---------|-------------|
| 09a | [Preparación](./09a-stripe-preparation.md) | Marcar código legacy, actualizar tipos |
| 09b | [Eliminar Rutas API](./09b-stripe-remove-api-routes.md) | Eliminar checkout/stripe y webhooks/stripe |
| 09c | [Actualizar Checkout](./09c-stripe-update-checkout-logic.md) | Eliminar lógica Stripe de checkout |
| 09d | [Actualizar Suscripciones](./09d-stripe-update-subscriptions.md) | Eliminar lógica Stripe de suscripciones |
| 09e | [Eliminar Páginas](./09e-stripe-remove-pages.md) | Eliminar páginas de UI de Stripe |
| 09f | [Limpieza Final](./09f-stripe-cleanup.md) | Eliminar lib/stripe.ts, desinstalar dependencia |

## Orden de Ejecución Recomendado

### Fase 1: Limpieza Rápida ✅ COMPLETADA
1. **Plan 01** - Eliminar session.ts ✅
2. **Plan 02** - Extraer generateOrderNumber ✅
3. **Plan 03** - Extraer Rate Limiting ✅

### Fase 2: Servicios de Cancelación ✅ COMPLETADA
4. **Plan 04** - Servicio de Cancelación de Bookings ✅
5. **Plan 05** - Servicio de Cancelación de Suscripciones ✅

### Fase 3: Sistema de Pagos ✅ COMPLETADA
6. **Plan 06** - Interfaz de Pasarelas de Pago ✅
7. **Plan 07** - Unificar Checkout ✅
8. **Plan 08** - Unificar Webhooks ✅
9. **Plan 09** - Eliminar Stripe ✅ (6 subplanes)

### Fase 4: Sanity ✅ COMPLETADA
10. **Plan 09** - Objetos Reutilizables Sanity ✅
11. **Plan 10** - Migrar Esquemas Sanity ✅
12. **Plan 11** - Proyecciones GROQ ✅

## Cómo Usar Estos Planes

Cada plan está diseñado para ejecutarse de forma independiente en un chat separado. Para usar un plan:

1. **Abre un nuevo chat**
2. **Copia el contenido del plan** o referencia el archivo
3. **Sigue los pasos en orden**
4. **Verifica los criterios de éxito** antes de considerar completado
5. **Haz commit de los cambios**

### Ejemplo de prompt para iniciar:

```
Ejecuta el plan de refactorización documentado en:
docs/refactoring/02-extract-order-utils.md

Sigue todos los pasos descritos en el documento.
```

## Consideraciones de Seguridad

### Para planes de pagos (06, 07, 08):
- Siempre probar en sandbox/development primero
- Verificar webhooks con herramientas de testing
- Mantener endpoints antiguos durante transición
- Monitorear logs después del deploy

### Para planes de Sanity (09, 10, 11):
- Hacer backup del dataset antes de migrar
- Probar en dataset de development primero
- Verificar que el Studio funciona después de cada cambio
- Verificar que el frontend muestra datos correctamente

## Rollback

Cada plan incluye instrucciones de rollback. En general:

```bash
# Para cambios de código
git checkout -- <archivos modificados>
rm <archivos nuevos>

# Para Sanity
npx sanity dataset import backup-YYYYMMDD.tar.gz production --replace
```

## Métricas de Éxito

Al completar todos los planes:

- ✅ Reducción de ~30% en código duplicado
- ✅ Un solo endpoint de checkout en lugar de 3
- ✅ Lógica de webhooks compartida
- ✅ Objetos Sanity reutilizables
- ✅ Queries GROQ consistentes
- ✅ Mejor mantenibilidad del código

## Contacto

Si tienes dudas sobre algún plan, revisa los comentarios en el código o consulta la documentación del proyecto en `CLAUDE.md`.
