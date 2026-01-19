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

### Colores de Membresía (triada análoga)
Basados en una progresión armónica alrededor del violeta de marca:
- Rosa suave: `#C77DBA` (plan Esencia - accesible, cálido)
- Violeta: `#8A4BAF` (plan Armonía - color de marca, anclaje)
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

| Pasarela | Monedas | Métodos | Comisión |
|----------|---------|---------|----------|
| **Nequi API** | Solo COP | Nequi (Push) | 1.5% + IVA |
| **Wompi** | Solo COP | Tarjetas colombianas | 1.99% + IVA |
| **ePayco** | COP, USD | PayPal, Tarjetas internacionales | 2.68% + IVA + $900 |

### Métodos por Región

#### Colombia (COP)
- **Nequi** → Nequi API (directo) - *Pendiente de integrar*
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
# Nequi API Directa (Colombia - Pagos Nequi)
# Pendiente: obtener credenciales en https://negocios.nequi.co/registro/api_push
NEQUI_CLIENT_ID=
NEQUI_CLIENT_SECRET=
NEQUI_API_KEY=
NEQUI_AUTH_URI=https://oauth.sandbox.nequi.com/oauth2/token
NEQUI_API_BASE_PATH=https://api.sandbox.nequi.com
# Producción:
# NEQUI_AUTH_URI=https://oauth.nequi.com/oauth2/token
# NEQUI_API_BASE_PATH=https://api.nequi.com

# Wompi (Colombia - Tarjetas)
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

# Notificaciones Admin (ventas)
# Email donde se reciben las notificaciones de nuevas ventas
ADMIN_NOTIFICATION_EMAIL=admin@energiaydivinidad.com
```

### Integración ePayco

#### URLs oficiales
| Recurso | URL |
|---------|-----|
| Dashboard (Login) | https://dashboard.epayco.com/login |
| Documentación API | https://docs.epayco.com/docs/api |
| Documentación general | https://docs.epayco.com/ |

#### Cómo obtener credenciales
1. Iniciar sesión en https://dashboard.epayco.com/login
2. Ir a **Integraciones** → **Llaves API** (o Settings → Customizations → Secret Keys)
3. Obtener las siguientes credenciales:
   - **P_CUST_ID_CLIENTE** → `NEXT_PUBLIC_EPAYCO_PUBLIC_KEY`
   - **PRIVATE_KEY** → `EPAYCO_PRIVATE_KEY`
   - **P_KEY** → `EPAYCO_P_KEY`
4. Para modo pruebas usar `EPAYCO_TEST_MODE=true` (no genera costos)

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
