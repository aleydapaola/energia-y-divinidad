# Plan de Desarrollo - Energía y Divinidad

## 🎯 Objetivo
Crear una plataforma web profesional para sesiones de canalización, membresía y contenido premium, gestionable 100% desde CMS sin conocimientos técnicos.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│  SANITY CMS (Gestión de Contenido)     │
│  - Eventos/Sesiones                     │
│  - Blog                                 │
│  - Productos Digitales                  │
│  - Contenido Premium                    │
│  - Páginas Estáticas                    │
└─────────────────────────────────────────┘
                 ↓ API
┌─────────────────────────────────────────┐
│  NEXT.JS 15 (Frontend + API Routes)    │
│  - SSR/ISR para SEO                     │
│  - Autenticación (NextAuth)             │
│  - Control de Acceso (Entitlements)     │
│  - Procesamiento de Pagos               │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  PRISMA + POSTGRESQL (Transaccional)    │
│  - Users                                │
│  - Orders                               │
│  - Subscriptions                        │
│  - Entitlements                         │
│  - ManualPayments                       │
└─────────────────────────────────────────┘
```

## 📅 FASES DE DESARROLLO

### **FASE 1: Configuración Base (Día 1)**
**Duración estimada: 2-3 horas**

#### 1.1 Inicializar Proyecto
- [x] Crear proyecto Next.js 15 con App Router
- [ ] Configurar TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Configurar ESLint y Prettier
- [ ] Estructura de carpetas modular

#### 1.2 Estructura de Carpetas
```
energia-y-divinidad/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Rutas de autenticación
│   │   ├── (main)/            # Rutas principales
│   │   ├── (admin)/           # Panel admin
│   │   ├── api/               # API Routes
│   │   └── layout.tsx
│   ├── modules/               # Bounded Contexts
│   │   ├── payments/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   ├── membership/
│   │   ├── events/
│   │   └── entitlements/
│   ├── components/            # UI Components
│   │   ├── ui/               # Shadcn components
│   │   ├── layout/           # Header, Footer
│   │   └── features/         # Feature components
│   ├── lib/                  # Utilidades
│   │   ├── sanity/          # Sanity cliente
│   │   ├── prisma/          # Prisma cliente
│   │   └── auth/            # Auth config
│   └── shared/              # Código compartido
├── sanity/                   # Sanity Studio
│   ├── schemas/
│   └── sanity.config.ts
├── prisma/
│   └── schema.prisma
└── public/
    └── images/
```

#### 1.3 Configuración Inicial
- [ ] Variables de entorno (.env.local)
- [ ] Git ignore
- [ ] Package.json scripts

---

### **FASE 2: Sanity CMS (Día 1-2)**
**Duración estimada: 4-5 horas**

#### 2.1 Instalación y Configuración
```bash
npm install @sanity/client @sanity/image-url next-sanity
npm install -D @sanity/vision sanity
```

#### 2.2 Schemas de Contenido

##### **Event Schema** (Sesiones de Canalización)
```typescript
{
  name: 'event',
  title: 'Eventos/Sesiones',
  fields: [
    { name: 'title', type: 'string', required },
    { name: 'slug', type: 'slug' },
    { name: 'description', type: 'text' },
    { name: 'longDescription', type: 'array', blockContent },
    { name: 'eventType', type: 'string', options: ['canalizacion', 'chamanismo', 'terapia'] },
    { name: 'date', type: 'datetime' },
    { name: 'duration', type: 'number' }, // minutos
    { name: 'priceCOP', type: 'number' },
    { name: 'priceUSD', type: 'number' },
    { name: 'image', type: 'image' },
    { name: 'capacity', type: 'number' },
    { name: 'isActive', type: 'boolean' },
    { name: 'isPremium', type: 'boolean' }, // Solo para miembros
  ]
}
```

##### **BlogPost Schema**
```typescript
{
  name: 'post',
  title: 'Blog / Artículos',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'excerpt', type: 'text' },
    { name: 'body', type: 'array', blockContent },
    { name: 'mainImage', type: 'image' },
    { name: 'categories', type: 'array', of: reference('category') },
    { name: 'publishedAt', type: 'datetime' },
    { name: 'isPremium', type: 'boolean' },
    { name: 'author', type: 'reference', to: 'author' }
  ]
}
```

##### **Product Schema** (Productos Digitales)
```typescript
{
  name: 'product',
  title: 'Productos Digitales',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'description', type: 'text' },
    { name: 'longDescription', type: 'array', blockContent },
    { name: 'productType', type: 'string', options: ['meditacion', 'curso', 'guia', 'ebook'] },
    { name: 'priceCOP', type: 'number' },
    { name: 'priceUSD', type: 'number' },
    { name: 'image', type: 'image' },
    { name: 'downloadFile', type: 'file' }, // URL del archivo
    { name: 'isPremium', type: 'boolean' },
    { name: 'isActive', type: 'boolean' }
  ]
}
```

##### **PremiumContent Schema** (Solo Miembros)
```typescript
{
  name: 'premiumContent',
  title: 'Contenido Premium',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'contentType', type: 'string', options: ['video', 'audio', 'article', 'guide'] },
    { name: 'description', type: 'text' },
    { name: 'body', type: 'array', blockContent },
    { name: 'mediaUrl', type: 'url' }, // Vimeo, YouTube, etc.
    { name: 'thumbnail', type: 'image' },
    { name: 'requiredTier', type: 'reference', to: 'membershipTier' },
    { name: 'publishedAt', type: 'datetime' }
  ]
}
```

##### **MembershipTier Schema**
```typescript
{
  name: 'membershipTier',
  title: 'Planes de Membresía',
  fields: [
    { name: 'name', type: 'string' }, // "Básica", "Premium"
    { name: 'slug', type: 'slug' },
    { name: 'description', type: 'text' },
    { name: 'benefits', type: 'array', of: string },
    { name: 'priceCOP', type: 'number' },
    { name: 'priceUSD', type: 'number' },
    { name: 'billingPeriod', type: 'string', options: ['monthly', 'yearly'] },
    { name: 'stripePriceId', type: 'string' },
    { name: 'isActive', type: 'boolean' }
  ]
}
```

##### **Page Schema** (Páginas Estáticas)
```typescript
{
  name: 'page',
  title: 'Páginas',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'body', type: 'array', blockContent },
    { name: 'seo', type: 'seo' }
  ]
}
```

#### 2.3 Sanity Studio Personalizado
- [ ] Configurar interfaz en español
- [ ] Personalizar tema con colores de marca
- [ ] Agregar vista previa en vivo
- [ ] Configurar roles y permisos para Aleyda

---

### **FASE 3: Prisma + PostgreSQL (Día 2)**
**Duración estimada: 3-4 horas**

#### 3.1 Instalación
```bash
npm install prisma @prisma/client
npm install -D prisma
npx prisma init
```

#### 3.2 Schema Prisma (Modelos Transaccionales)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTENTICACIÓN
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?   // Hashed
  image         String?
  role          Role      @default(USER)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relaciones
  orders        Order[]
  entitlements  Entitlement[]
  subscription  Subscription?
  manualPayments ManualPayment[]

  @@index([email])
}

enum Role {
  USER
  ADMIN
}

// ============================================
// PAGOS
// ============================================

model Order {
  id                  String      @id @default(cuid())
  userId              String?
  user                User?       @relation(fields: [userId], references: [id], onDelete: SetNull)

  kind                OrderKind
  status              OrderStatus @default(PENDING)

  currency            String      @default("COP")
  subtotalCents       Int
  totalCents          Int

  provider            PaymentProvider
  externalPaymentId   String?     @unique

  // Metadata
  sanityEventId       String?     // ID del evento en Sanity
  sanityProductId     String?     // ID del producto en Sanity

  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  @@index([userId, createdAt])
  @@index([status])
}

enum OrderKind {
  EVENT
  PRODUCT
}

enum OrderStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum PaymentProvider {
  MANUAL_NEQUI
  MANUAL_DAVIPLATA
  MANUAL_BANCOLOMBIA
  STRIPE
}

// ============================================
// PAGOS MANUALES (Nequi, Daviplata, etc.)
// ============================================

model ManualPayment {
  id              String              @id @default(cuid())
  userId          String
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  kind            ManualPaymentKind
  resourceId      String              // sanityEventId o membershipTierId

  status          ManualPaymentStatus @default(PENDING)

  amountCents     Int
  currency        String              @default("COP")
  paymentMethod   String              // "NEQUI", "DAVIPLATA", etc.

  // Comprobante
  proofUrl        String?
  proofUploadedAt DateTime?

  // Revisión admin
  reviewedBy      String?
  reviewedAt      DateTime?
  adminNotes      String?

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([userId, status])
}

enum ManualPaymentKind {
  EVENT
  MEMBERSHIP
  PRODUCT
}

enum ManualPaymentStatus {
  PENDING
  APPROVED
  REJECTED
}

// ============================================
// MEMBRESÍA
// ============================================

model Subscription {
  id                      String              @id @default(cuid())
  userId                  String              @unique
  user                    User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  sanityTierId            String              // ID del tier en Sanity

  provider                PaymentProvider
  externalSubscriptionId  String?             @unique

  status                  SubscriptionStatus  @default(INCOMPLETE)
  currentPeriodStart      DateTime?
  currentPeriodEnd        DateTime?

  createdAt               DateTime            @default(now())
  updatedAt               DateTime            @updatedAt

  @@index([status])
}

enum SubscriptionStatus {
  INCOMPLETE
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}

// ============================================
// ENTITLEMENTS (Control de Acceso)
// ============================================

model Entitlement {
  id          String            @id @default(cuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        EntitlementType
  resourceId  String            // sanityEventId, sanityProductId o sanityTierId

  status      EntitlementStatus @default(ACTIVE)
  validFrom   DateTime          @default(now())
  validTo     DateTime?

  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([userId, type, resourceId])
  @@index([userId, type, status])
}

enum EntitlementType {
  EVENT
  PRODUCT
  MEMBERSHIP_TIER
  PREMIUM_CONTENT
}

enum EntitlementStatus {
  ACTIVE
  EXPIRED
  REVOKED
}

// ============================================
// AUDITORÍA
// ============================================

model WebhookEvent {
  id        String          @id @default(cuid())
  provider  PaymentProvider
  eventId   String
  createdAt DateTime        @default(now())

  @@unique([provider, eventId])
  @@index([provider, createdAt])
}
```

#### 3.3 Migraciones
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### **FASE 4: Autenticación (Día 3)**
**Duración estimada: 3 horas**

#### 4.1 NextAuth.js Setup
```bash
npm install next-auth @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

#### 4.2 Configuración
- [ ] `/src/app/api/auth/[...nextauth]/route.ts`
- [ ] Providers: Credentials (email/password)
- [ ] Adapter: Prisma
- [ ] Session strategy: JWT
- [ ] Callbacks personalizados

#### 4.3 Páginas de Auth
- [ ] `/app/(auth)/login/page.tsx`
- [ ] `/app/(auth)/register/page.tsx`
- [ ] `/app/(auth)/forgot-password/page.tsx`

---

### **FASE 5: Módulo Entitlements (Día 3)**
**Duración estimada: 2 horas**

#### 5.1 Funciones de Control de Acceso
```typescript
// src/modules/entitlements/application/canAccess.ts
export async function canAccess(userId: string, rule: AccessRule): Promise<boolean>
export async function requireAccess(userId: string, rule: AccessRule): Promise<void>
```

#### 5.2 Middleware de Protección
```typescript
// src/middleware.ts
export function middleware(request: NextRequest)
```

---

### **FASE 6: Módulo Payments (Día 4-5)**
**Duración estimada: 6-8 horas**

#### 6.1 Abstracción de Pagos
```typescript
// src/modules/payments/domain/PaymentProvider.ts
interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>
}
```

#### 6.2 Implementaciones
- [ ] ManualPaymentProvider (Nequi/Daviplata)
- [ ] StripeProvider (internacional)

#### 6.3 Use Cases
- [ ] CreateManualPayment
- [ ] ApproveManualPayment (admin)
- [ ] CreateStripeCheckout
- [ ] HandleStripeWebhook

#### 6.4 API Routes
- [ ] `/api/payments/manual/create`
- [ ] `/api/payments/manual/upload-proof`
- [ ] `/api/payments/stripe/create-checkout`
- [ ] `/api/webhooks/stripe`

---

### **FASE 7: Componentes UI (Día 5-6)**
**Duración estimada: 6-8 horas**

#### 7.1 Instalación Shadcn/ui
```bash
npx shadcn-ui@latest init
```

#### 7.2 Header Component
```typescript
// src/components/layout/Header.tsx
- Logo centrado
- Menú: INICIO | SESIONES | SOBRE MÍ | MEMBRESÍA | CONTACTO | ACADEMIA
- Iconos sociales: Instagram, Facebook, YouTube, TikTok
- Responsive (mobile menu)
```

#### 7.3 Footer Component
```typescript
// src/components/layout/Footer.tsx
- Logo centrado
- Menú secundario
- Links legales: Política privacidad, Aviso Legal, Cookies
- Iconos sociales
- Copyright
- Botón WhatsApp flotante
```

#### 7.4 Componentes Reutilizables
- [ ] Button
- [ ] Card
- [ ] Modal
- [ ] Form components
- [ ] Loading states
- [ ] Error boundaries

---

### **FASE 8: Páginas Dinámicas (Día 6-7)**
**Duración estimada: 8-10 horas**

#### 8.1 Páginas Principales

##### **Inicio** - `/app/page.tsx`
- Hero section con imagen de fondo
- Introducción a Aleyda
- Servicios destacados
- Testimonios
- Call to action

##### **Sesiones** - `/app/sesiones/page.tsx`
- Lista de eventos desde Sanity
- Filtros por tipo (canalización, chamanismo, terapia)
- Detalle de evento: `/app/sesiones/[slug]/page.tsx`
- Botón "Reservar"

##### **Sobre Mí** - `/app/sobremi/page.tsx`
- Contenido desde Sanity
- Foto de Aleyda
- Historia y formación

##### **Membresía** - `/app/membresia/page.tsx`
- Planes desde Sanity
- Comparación de beneficios
- Botón "Suscribirse"

##### **Contacto** - `/app/contacto/page.tsx`
- Formulario de contacto
- Información de contacto
- Mapa (opcional)

##### **Academia** - `/app/academia/page.tsx`
- Submenu:
  - Aprende a canalizar
  - Guías prácticas
  - Cursos y talleres

#### 8.2 Blog
- `/app/blog/page.tsx` - Lista de posts
- `/app/blog/[slug]/page.tsx` - Detalle de post
- Categorías y filtros

#### 8.3 Productos Digitales
- `/app/productos/page.tsx` - Lista de productos
- `/app/productos/[slug]/page.tsx` - Detalle de producto
- Descarga protegida

---

### **FASE 9: Membresía Premium (Día 8)**
**Duración estimada: 6 horas**

#### 9.1 Área de Miembros
- `/app/miembros/page.tsx` - Dashboard
- `/app/miembros/contenido/page.tsx` - Contenido premium
- `/app/miembros/mi-suscripcion/page.tsx` - Gestión de suscripción

#### 9.2 Protección de Contenido
```typescript
// Middleware que verifica Entitlement antes de mostrar contenido premium
```

#### 9.3 Flujo de Suscripción
1. Usuario selecciona plan
2. Opción A: Pago manual (sube comprobante)
3. Opción B: Pago Stripe (automático)
4. Admin aprueba (manual) o webhook activa (Stripe)
5. Se crea Entitlement con validTo
6. Usuario accede a contenido premium

---

### **FASE 10: Panel Admin (Día 9)**
**Duración estimada: 6 horas**

#### 10.1 Dashboard Admin
- `/app/admin/page.tsx`
- Estadísticas generales
- Ventas recientes
- Pagos pendientes de aprobar

#### 10.2 Gestión de Pagos Manuales
- `/app/admin/pagos-manuales/page.tsx`
- Lista de pagos PENDING
- Ver comprobante
- Botones: Aprobar / Rechazar
- Al aprobar: crea Order + Entitlement

#### 10.3 Gestión de Usuarios
- `/app/admin/usuarios/page.tsx`
- Lista de usuarios
- Ver entitlements activos
- Gestionar suscripciones

---

## 🎨 DISEÑO Y ESTILOS

### ⚠️ REQUISITO CRÍTICO: 100% RESPONSIVE
**Mobile-First Approach** - El diseño debe ser perfecto en:
- 📱 **Móvil** (320px - 767px): Diseño optimizado para pantallas pequeñas
- 📱 **Tablet** (768px - 1023px): Layout adaptado para tablets
- 💻 **Desktop** (1024px+): Diseño completo con todas las características

### Breakpoints Tailwind CSS
```css
/* Mobile First */
sm: '640px'   // Móviles grandes
md: '768px'   // Tablets
lg: '1024px'  // Laptops
xl: '1280px'  // Desktops
2xl: '1536px' // Pantallas grandes
```

### Paleta de Colores (según imágenes)
```css
--primary: #8B6F47 (marrón/dorado)
--background: #FFF8F0 (beige claro)
--text: #5C4033 (marrón oscuro)
--accent: #D4A574 (dorado claro)
```

### Tipografía
- Títulos: "Roboto Slab" o similar (serifada)
- Texto: "Open Sans" o similar (sans-serif)

### Componentes Responsive
Todos los componentes deben incluir:
- [ ] Menú hamburguesa en móvil
- [ ] Grid adaptativo (1 columna móvil, 2-3 columnas desktop)
- [ ] Imágenes responsive con next/image
- [ ] Texto legible en todas las pantallas
- [ ] Touch-friendly (botones mínimo 44px)
- [ ] Navegación optimizada para dedos en móvil

---

## 📦 DEPENDENCIAS PRINCIPALES

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@sanity/client": "latest",
    "@sanity/image-url": "latest",
    "next-sanity": "latest",
    "@prisma/client": "latest",
    "next-auth": "latest",
    "@auth/prisma-adapter": "latest",
    "stripe": "latest",
    "zod": "latest",
    "bcryptjs": "latest",
    "tailwindcss": "latest"
  },
  "devDependencies": {
    "prisma": "latest",
    "typescript": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "sanity": "latest"
  }
}
```

---

## 🚀 DEPLOYMENT

### Vercel
- [ ] Conectar repositorio GitHub
- [ ] Configurar variables de entorno
- [ ] Deploy automático en cada push

### Base de Datos
- [ ] Vercel Postgres o Supabase
- [ ] Ejecutar migraciones: `npx prisma migrate deploy`

### Sanity
- [ ] Deploy Sanity Studio: `npm run sanity deploy`

---

## ✅ CHECKLIST PRE-LANZAMIENTO

- [ ] SEO optimizado (meta tags, sitemap, robots.txt)
- [ ] Performance (Lighthouse score > 90)
- [ ] Accesibilidad (WCAG AA)
- [ ] Seguridad (HTTPS, CSP, rate limiting)
- [ ] Analytics (Google Analytics / Plausible)
- [ ] Política de privacidad y cookies
- [ ] Términos y condiciones
- [ ] Testing en móviles y tablets
- [ ] Testing de pagos (sandbox)
- [ ] Backup automático de BD
- [ ] Monitoreo de errores (Sentry)

---

## 📊 MÉTRICAS DE ÉXITO

- Tiempo de carga < 2 segundos
- Tasa de conversión de visitantes a miembros
- Satisfacción de Aleyda con el CMS (facilidad de uso)
- Uptime > 99.9%

---

## 🔄 MANTENIMIENTO POST-LANZAMIENTO

### Mensual
- Revisar analytics
- Actualizar dependencias
- Backup manual de contenido Sanity

### Trimestral
- Auditoría de seguridad
- Optimización de performance
- Review de UX con feedback de usuarios

---

## 📞 CONTACTO Y SOPORTE

**Desarrollador**: Xavier Monfort
**Cliente**: Aleyda Vargas (Energía y Divinidad)
