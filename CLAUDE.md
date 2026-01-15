# Energía y Divinidad - Contexto del Proyecto

## Reglas de Layout

- **Todas las páginas deben incluir Header y Footer**, excepto las páginas de pago (`/checkout`, `/pago`).
- El Header incluye navegación principal, logo, WhatsApp y botón de acceso/usuario.
- El Footer incluye logo, redes sociales, enlaces de navegación y contacto.

## Paleta de Colores

- Violeta principal: `#8A4BAF`
- Violeta oscuro: `#654177`
- Azul rey: `#2D4CC7`
- Azul botones: `#4944a4`
- Rosa claro (fondos): `#f8f0f5`
- Azul claro (fondos): `#eef1fa`

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

| Pasarela | Monedas | Métodos |
|----------|---------|---------|
| **Wompi** | Solo COP | Nequi, Tarjetas colombianas |
| **ePayco** | COP, USD | PayPal, Tarjetas internacionales |

### Métodos por Región

#### Colombia (COP)
- **Nequi** → Wompi
- **Tarjeta de crédito** → Wompi
- **PayPal** → ePayco

#### Internacional (USD)
- **Tarjeta de crédito** → ePayco
- **PayPal** → ePayco

### Restricciones Técnicas

- Wompi **solo opera en COP**
- ePayco puede operar en **COP y USD**
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
3. Según método seleccionado, orquestar hacia Wompi o ePayco
4. Validar pago mediante webhook antes de confirmar
5. Redirigir a página de confirmación

### Archivos Clave del Sistema de Pagos

| Archivo | Descripción |
|---------|-------------|
| `lib/wompi.ts` | Integración con Wompi (Colombia) |
| `lib/epayco.ts` | Integración con ePayco (Internacional) |
| `lib/membership-access.ts` | Detección de región y métodos disponibles |
| `components/pago/PaymentMethodSelector.tsx` | Modal de selección de método de pago |
| `app/api/checkout/wompi/route.ts` | API para crear pagos Wompi |
| `app/api/checkout/epayco/route.ts` | API para crear pagos ePayco |
| `app/api/webhooks/wompi/route.ts` | Webhook de Wompi |
| `app/api/webhooks/epayco/route.ts` | Webhook de ePayco |
| `app/pago/confirmacion/page.tsx` | Página de confirmación de pago |
| `app/pago/nequi-pending/page.tsx` | Página de espera para Nequi |

### Variables de Entorno Requeridas

```bash
# Wompi (Colombia)
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=
WOMPI_INTEGRITY_SECRET=
WOMPI_ENVIRONMENT=sandbox

# ePayco (Internacional)
NEXT_PUBLIC_EPAYCO_PUBLIC_KEY=
EPAYCO_PRIVATE_KEY=
EPAYCO_P_KEY=
EPAYCO_TEST_MODE=true
```
