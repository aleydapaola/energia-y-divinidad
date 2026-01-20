# Plan 02: Extraer Utilidad de Generación de Números de Orden

## Objetivo
Consolidar la función `generateOrderNumber()` que está duplicada en dos archivos, creando una utilidad compartida.

## Contexto
La misma función existe en dos lugares con solo el prefijo diferente:
- `app/api/bookings/route.ts` (líneas 5-14) → prefijo `ORD-`
- `app/api/events/book/route.ts` (líneas 13-22) → prefijo `EVT-`

Ambas generan: `{PREFIX}-YYYYMMDD-XXXX`

## Código Actual Duplicado

```typescript
// En app/api/bookings/route.ts
function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ORD-${year}${month}${day}-${random}`
}

// En app/api/events/book/route.ts (idéntico excepto prefijo)
function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `EVT-${year}${month}${day}-${random}`
}
```

## Pasos de Implementación

### Paso 1: Crear el archivo de utilidad

Crear `lib/order-utils.ts`:

```typescript
/**
 * Utilidades para generación de números de orden
 */

export type OrderPrefix = 'ORD' | 'EVT' | 'MEM' | 'CRS' | 'SUB'

/**
 * Genera un número de orden único con formato: PREFIX-YYYYMMDD-XXXX
 *
 * @param prefix - Prefijo del tipo de orden (ORD, EVT, MEM, CRS, SUB)
 * @returns Número de orden formateado
 *
 * @example
 * generateOrderNumber('ORD') // "ORD-20240115-4829"
 * generateOrderNumber('EVT') // "EVT-20240115-1234"
 */
export function generateOrderNumber(prefix: OrderPrefix = 'ORD'): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `${prefix}-${year}${month}${day}-${random}`
}

/**
 * Extrae información de un número de orden
 *
 * @param orderNumber - Número de orden a parsear
 * @returns Objeto con prefix, date y random, o null si formato inválido
 */
export function parseOrderNumber(orderNumber: string): {
  prefix: string
  date: Date
  random: string
} | null {
  const match = orderNumber.match(/^([A-Z]+)-(\d{8})-(\d{4})$/)
  if (!match) return null

  const [, prefix, dateStr, random] = match
  const year = parseInt(dateStr.slice(0, 4))
  const month = parseInt(dateStr.slice(4, 6)) - 1
  const day = parseInt(dateStr.slice(6, 8))

  return {
    prefix,
    date: new Date(year, month, day),
    random,
  }
}
```

### Paso 2: Actualizar app/api/bookings/route.ts

**Antes** (líneas 1-14):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Helper to generate order number: ORD-YYYYMMDD-XXXX
function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `ORD-${year}${month}${day}-${random}`
}
```

**Después**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { generateOrderNumber } from '@/lib/order-utils'
```

Y en el uso dentro del archivo, cambiar:
```typescript
// Antes
orderNumber: generateOrderNumber(),

// Después (sin cambios - la función ya devuelve 'ORD-' por defecto)
orderNumber: generateOrderNumber('ORD'),
```

### Paso 3: Actualizar app/api/events/book/route.ts

**Antes** (líneas 1-22):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getEventById } from '@/lib/sanity/queries/events'
import { auth } from '@/lib/auth'
import { sendEventBookingConfirmation, sendWaitlistJoinedEmail } from '@/lib/email'
import {
  getAvailableSpots,
  addToWaitlist,
  getWaitlistEntry,
} from '@/lib/events/seat-allocation'

// Helper to generate order number: EVT-YYYYMMDD-XXXX
function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `EVT-${year}${month}${day}-${random}`
}
```

**Después**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getEventById } from '@/lib/sanity/queries/events'
import { auth } from '@/lib/auth'
import { sendEventBookingConfirmation, sendWaitlistJoinedEmail } from '@/lib/email'
import {
  getAvailableSpots,
  addToWaitlist,
  getWaitlistEntry,
} from '@/lib/events/seat-allocation'
import { generateOrderNumber } from '@/lib/order-utils'
```

Y en el uso dentro del archivo:
```typescript
// Antes
orderNumber: generateOrderNumber(),

// Después
orderNumber: generateOrderNumber('EVT'),
```

### Paso 4: Buscar otros usos potenciales

```bash
# Buscar otros lugares donde se generen números de orden
grep -r "generateOrderNumber\|ORD-\|EVT-\|MEM-\|CRS-" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v order-utils
```

Si hay otros archivos que generan números de orden manualmente, actualizarlos también.

### Paso 5: Verificar que compila
```bash
npm run build
```

### Paso 6: Probar funcionalidad

1. Crear una reserva de sesión y verificar que el número de orden tiene formato `ORD-YYYYMMDD-XXXX`
2. Crear una reserva de evento y verificar que el número de orden tiene formato `EVT-YYYYMMDD-XXXX`

## Archivos a Crear
- ✅ `lib/order-utils.ts`

## Archivos a Modificar
- 📝 `app/api/bookings/route.ts` - Eliminar función local, importar utilidad
- 📝 `app/api/events/book/route.ts` - Eliminar función local, importar utilidad

## Criterios de Éxito
- [ ] El archivo `lib/order-utils.ts` existe con la función exportada
- [ ] `app/api/bookings/route.ts` usa `generateOrderNumber('ORD')`
- [ ] `app/api/events/book/route.ts` usa `generateOrderNumber('EVT')`
- [ ] No hay funciones `generateOrderNumber` locales duplicadas
- [ ] `npm run build` completa sin errores
- [ ] Los números de orden se generan correctamente

## Rollback
```bash
git checkout -- app/api/bookings/route.ts app/api/events/book/route.ts
rm lib/order-utils.ts
```

## Riesgo
**Bajo** - Es una extracción simple de código existente.

## Tiempo Estimado
30 minutos
