# Energía y Divinidad - Contexto del Proyecto

## Reglas de Layout

- **Todas las páginas deben incluir Header y Footer**, excepto las páginas de pago (`/checkout`, `/pago`).
- El Header incluye navegación principal, logo, WhatsApp y botón de acceso/usuario.
- El Footer incluye logo, redes sociales, enlaces de navegación y contacto.

## Paleta de Colores

### Colores Principales
- Violeta principal: `#8A4BAF`
- Violeta oscuro: `#654177`
- Azul rey: `#2D4CC7`
- Azul botones: `#4944a4`
- Rosa claro (fondos): `#f8f0f5`
- Azul claro (fondos): `#eef1fa`

### Colores de Membresía
Hay 2 niveles de membresía con colores diferenciados:
- Rosa suave: `#C77DBA` (plan Esencia - accesible, cálido)
- Índigo profundo: `#5C4D9B` (plan Divinidad - premium, sofisticado)

## Tipografía

- **Títulos**: `font-gazeta` (Gazeta)
- **Cuerpo/UI**: `font-dm-sans` (DM Sans)
- **Logo**: `font-rightland` (Rightland)

## Estilos de Títulos (Coherencia entre páginas)

Los títulos deben mantener coherencia visual en todas las páginas:

- **H1 (página)**: `font-gazeta text-4xl sm:text-5xl lg:text-6xl text-[#4b316c]` o `text-[#654177]`
- **H2 (secciones)**: `font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF]`
- **H3 (subsecciones)**: `font-gazeta text-xl text-[#8A4BAF]` o `text-[#654177]`

Esta regla aplica a todas las páginas del sitio para mantener consistencia visual.

## Estilos de Botones

**IMPORTANTE**: Los botones de acción principal deben usar azul rey en toda la web:

- **Botón primario**: `bg-[#4944a4] hover:bg-[#3d3a8a] text-white`
- **Botón secundario/outline**: `border-[#4944a4] text-[#4944a4] hover:bg-[#4944a4] hover:text-white`

El violeta (`#8A4BAF`) se reserva para:
- Títulos y textos destacados
- Enlaces de texto
- Iconos decorativos
- Bordes y acentos sutiles

## Componentes de Layout

- Header: `components/layout/Header.tsx`
- Footer: `components/layout/Footer.tsx`

## Páginas Existentes

- `/` - Home (con Header y Footer)
- `/sobre-mi` - Sobre Mí (biografía de Aleyda)
- `/sesiones` - Sesiones
- `/meditaciones` - Meditaciones
- `/eventos` - Eventos (condicional con feature flag)
- `/membresia` - Membresía
- `/auth/signin` - Login

## Páginas Sin Header/Footer

- `/checkout/*` - Proceso de pago
- `/pago/*` - Confirmación de pago

## Estrategia de Pagos

**IMPORTANTE**: Sistema de checkout inteligente con selección automática de pasarela según país.

### Pasarelas de Pago

| Pasarela | Monedas | Métodos | Comisión | Estado |
|----------|---------|---------|----------|--------|
| **Wompi** | Solo COP | Tarjetas colombianas | 1.99% + IVA | ✅ Activo |
| **PayPal** | COP, USD | PayPal, Tarjetas internacionales | ~3.4% + comisión fija | ✅ Activo |
| **Bre-B Manual** | Solo COP | Transferencia con llave Bancolombia | **0% (sin comisión)** | ✅ Activo |
| **Nequi API** | Solo COP | Nequi (Push) | 1.5% + IVA | ⏳ Pendiente credenciales |

### Métodos por Región

#### Colombia (COP)
- **Tarjeta de crédito** → Wompi
- **Bre-B (Llave Bancolombia)** → Pago manual con confirmación admin
- **PayPal** → PayPal Directo

> **Nota**: Nequi no está disponible actualmente. Se habilitará cuando tengamos las credenciales de Nequi API.

#### Internacional (USD)

#### Internacional (USD)
- **Tarjeta de crédito** → PayPal
- **PayPal** → PayPal Directo

### Restricciones Técnicas

- Wompi **solo opera en COP**
- PayPal opera en **COP y USD**
- Next.js **no procesa pagos**, solo orquesta, redirige y valida vía webhooks
- **NO exponer API keys** en el cliente
- **NO confiar solo en redirecciones**, usar webhooks para validar pagos

### Aplicación

Esta estrategia aplica a TODOS los productos de pago:
- Sesiones de canalización (individuales y packs)
- Membresía (pagos recurrentes)
- Eventos (entradas)
- Productos digitales (cursos, meditaciones premium, etc.)
- Cualquier otro producto de pago

### Flujo de Checkout

1. Detectar país del usuario (por IP o selección manual)
2. Mostrar solo los métodos de pago disponibles para su región
3. Según método seleccionado, orquestar hacia Wompi (COP) o PayPal (USD/COP)
4. Validar pago mediante webhook antes de confirmar
5. Redirigir a página de confirmación

### Archivos Clave del Sistema de Pagos

| Archivo | Descripción |
|---------|-------------|
| `lib/wompi.ts` | Integración con Wompi (Colombia) |
| `lib/paypal.ts` | Integración con PayPal (Internacional) |
| `lib/payments/adapters/paypal-adapter.ts` | Adaptador PayPal para el sistema de gateways |
| `lib/membership-access.ts` | Detección de región y métodos disponibles |
| `components/pago/PaymentMethodSelector.tsx` | Modal de selección de método de pago |
| `components/pago/PayPalCheckout.tsx` | Componente de checkout PayPal |
| `app/api/checkout/wompi/route.ts` | API para crear pagos Wompi |
| `app/api/checkout/paypal/route.ts` | API para crear órdenes PayPal |
| `app/api/checkout/paypal/capture/route.ts` | API para capturar pagos PayPal |
| `app/api/webhooks/wompi/route.ts` | Webhook de Wompi |
| `app/api/webhooks/paypal/route.ts` | Webhook de PayPal |
| `app/pago/confirmacion/page.tsx` | Página de confirmación de pago |
| `app/pago/nequi-pending/page.tsx` | Página de espera para Nequi |
| `app/pago/breb-pending/page.tsx` | Página de instrucciones Bre-B |
| `app/api/checkout/breb/route.ts` | API para crear órdenes Bre-B |
| `components/pago/BrebPaymentInstructions.tsx` | Instrucciones de pago Bre-B |
| `app/api/admin/orders/[id]/confirm-payment/route.ts` | API para confirmar pagos manuales |

### Variables de Entorno Requeridas

```bash
# Nequi API Directa (Colombia - Pagos Nequi) - Pendiente
# Pendiente: obtener credenciales en https://negocios.nequi.co/registro/api_push
NEQUI_CLIENT_ID=
NEQUI_CLIENT_SECRET=
NEQUI_API_KEY=
NEQUI_AUTH_URI=https://oauth.sandbox.nequi.com/oauth2/token
NEQUI_API_BASE_PATH=https://api.sandbox.nequi.com
# Producción:
# NEQUI_AUTH_URI=https://oauth.nequi.com/oauth2/token
# NEQUI_API_BASE_PATH=https://api.nequi.com

# Wompi (Colombia - Tarjetas, Nequi, PSE)
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=
WOMPI_INTEGRITY_SECRET=
WOMPI_ENVIRONMENT=sandbox

# PayPal (Internacional - PayPal, Tarjetas)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_ENVIRONMENT=sandbox

# Notificaciones Admin (ventas)
# Email donde se reciben las notificaciones de nuevas ventas
ADMIN_NOTIFICATION_EMAIL=admin@energiaydivinidad.com
```

### Integración PayPal

#### URLs oficiales
| Recurso | URL |
|---------|-----|
| Dashboard Developer | https://developer.paypal.com/dashboard/ |
| Documentación API | https://developer.paypal.com/docs/api/orders/v2/ |
| Sandbox Accounts | https://developer.paypal.com/dashboard/accounts |

#### Cómo obtener credenciales
1. Iniciar sesión en https://developer.paypal.com/dashboard/
2. Ir a **Apps & Credentials** → **Create App**
3. Obtener las siguientes credenciales:
   - **Client ID** → `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
   - **Secret** → `PAYPAL_CLIENT_SECRET`
4. Configurar webhooks en **Webhooks** y obtener:
   - **Webhook ID** → `PAYPAL_WEBHOOK_ID`
5. Para modo pruebas usar `PAYPAL_ENVIRONMENT=sandbox`

#### Eventos de Webhook configurados
- `CHECKOUT.ORDER.APPROVED` - Orden aprobada por el usuario
- `PAYMENT.CAPTURE.COMPLETED` - Pago capturado exitosamente
- `PAYMENT.CAPTURE.DENIED` - Pago rechazado
- `PAYMENT.CAPTURE.REFUNDED` - Pago reembolsado

### Integración Bre-B Manual (Colombia)

Bre-B es el sistema de pagos instantáneos del Banco de la República de Colombia. Esta integración permite a los clientes colombianos pagar usando su llave Bancolombia desde cualquier app bancaria compatible (Bancolombia, Nequi, Davivienda, etc.).

#### Características
- **Sin comisiones** - El cliente paga el monto exacto
- **Solo para pagos no recurrentes** - Sesiones, eventos, cursos (NO membresías)
- **Confirmación manual** - El admin confirma cuando verifica el pago
- **Solo Colombia (COP)**

#### Flujo de pago
```
1. Cliente selecciona "Bre-B (Llave Bancolombia)" en checkout
2. Sistema crea orden con estado PENDING
3. Cliente ve instrucciones con llave y monto a pagar
4. Cliente realiza transferencia desde su app bancaria
5. Admin verifica pago en extracto bancario
6. Admin confirma pago desde panel de órdenes
7. Sistema activa entitlement y envía confirmación por email
```

#### Variables de entorno requeridas
```bash
# Bre-B / Llave Bancolombia Negocios
NEXT_PUBLIC_BANCOLOMBIA_BREB_KEY=  # Llave Bre-B del negocio (ej: celular registrado)
NEXT_PUBLIC_BANCOLOMBIA_BUSINESS_NAME=Energía y Divinidad
```

#### Confirmación de pagos (Admin)
Los pagos Bre-B se confirman manualmente desde:
1. `/admin/orders` → Buscar orden pendiente con método "Bre-B (Manual)"
2. Click en "Ver detalle" de la orden
3. Click en botón "Confirmar Pago Manual"
4. Ingresar referencia de transacción (opcional)
5. Confirmar

La confirmación:
- Cambia el estado a COMPLETED
- Crea el entitlement/booking correspondiente
- Registra la acción en AuditLog
- Envía email de confirmación al cliente

### Integración Nequi API (Pendiente)

**Estado**: Pendiente de credenciales

#### URLs oficiales
| Recurso | URL |
|---------|-----|
| Registro API Push | https://negocios.nequi.co/registro/api_push |
| Documentación técnica | https://docs.conecta.nequi.com.co/ |
| Portal Nequi Negocios | https://www.nequi.com.co/negocios |
| Certificación | certificacion@conecta.nequi.com |

#### Proceso para obtener credenciales
1. Registrarse en https://negocios.nequi.co/registro/api_push
2. Enviar documentación del negocio
3. Esperar aprobación (3 días hábiles)
4. Firmar contrato electrónicamente via Zapsign
5. Recibir las llaves (Client ID, Client Secret, API Key)
6. Probar en sandbox
7. Certificar enviando casos de prueba JSON a certificacion@conecta.nequi.com
8. Pasar a producción

#### Archivos a crear cuando tengamos credenciales
| Archivo | Descripción |
|---------|-------------|
| `lib/nequi-conecta.ts` | Integración con Nequi API |
| `app/api/checkout/nequi/route.ts` | API para crear pagos Nequi |
| `app/api/webhooks/nequi/route.ts` | Webhook de Nequi |

#### Flujo de pago Push
```
Usuario selecciona Nequi → Servidor envía Push a Nequi API →
Nequi envía notificación al celular → Usuario aprueba en app →
Webhook confirma pago → Se crea el booking
```
