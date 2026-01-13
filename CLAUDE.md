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

## Métodos de Pago por Región

**IMPORTANTE**: Los métodos de pago se determinan por la ubicación del usuario:

### Colombia (COP)
- **Nequi** - Método principal y obligatorio para usuarios colombianos
- Nequi soporta pagos únicos y recurrentes (débito automático para membresías)
- API: Nequi API Conecta

### Internacional (USD)
- **Stripe** - Método principal para pagos internacionales
- **PayPal** - Alternativa para usuarios internacionales
- Soporta tarjetas de crédito/débito internacionales

### Aplicación
Esta regla aplica a TODOS los productos de pago:
- Sesiones de canalización (individuales y packs)
- Membresía (pagos recurrentes)
- Eventos (entradas)
- Productos digitales (cursos, meditaciones premium, etc.)
- Cualquier otro producto de pago

### Implementación
- Detectar país del usuario (por IP o selección manual)
- Mostrar solo los métodos de pago disponibles para su región
- Los precios se muestran en COP para Colombia, USD para internacional
- La moneda determina qué pasarela de pago usar
