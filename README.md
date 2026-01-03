# 🌟 Energía y Divinidad

Plataforma web profesional para sesiones de canalización, membresía y contenido premium.

## 🚀 Estado del Proyecto

### ✅ FASE 1 COMPLETADA: Configuración Base

**Logros:**
- ✅ Proyecto Next.js 15 inicializado con App Router
- ✅ TypeScript configurado
- ✅ Tailwind CSS configurado con tema personalizado
- ✅ Estructura de carpetas modular establecida
- ✅ Variables de entorno configuradas
- ✅ Paleta de colores de marca implementada
- ✅ Tipografías (Open Sans + Roboto Slab)
- ✅ Configuración responsive (Mobile-First)
- ✅ Servidor de desarrollo funcionando

## 📁 Estructura del Proyecto

```
energia-y-divinidad/
├── app/                    # Next.js App Router
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página de inicio
├── components/            # Componentes UI (próximamente)
├── lib/                   # Librerías y utilidades
├── modules/               # Bounded Contexts (próximamente)
├── public/                # Archivos públicos
│   └── images/           # Logo e imágenes
├── sanity/               # Sanity CMS (próximamente)
├── prisma/               # Prisma ORM (próximamente)
├── package.json          # Dependencias
├── tsconfig.json         # TypeScript config
├── tailwind.config.ts    # Tailwind config
├── next.config.ts        # Next.js config
├── PLAN_DESARROLLO.md    # Plan detallado
└── README.md             # Este archivo
```

## 🎨 Diseño

### Paleta de Colores
- **Primary**: `#8B6F47` (marrón/dorado)
- **Background**: `#FFF8F0` (beige claro)
- **Text**: `#5C4033` (marrón oscuro)
- **Accent**: `#D4A574` (dorado claro)

### Responsive Design
- 📱 **Móvil**: 320px - 767px
- 📱 **Tablet**: 768px - 1023px
- 💻 **Desktop**: 1024px+

## 🛠️ Tecnologías

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Estilos**: Tailwind CSS
- **CMS**: Sanity (próximamente)
- **Base de Datos**: Prisma + PostgreSQL (próximamente)
- **Autenticación**: NextAuth.js (próximamente)
- **Pagos**: Stripe + Manual (Nequi/Daviplata) (próximamente)
- **Deployment**: Vercel

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build
npm start

# Linting
npm run lint

# Sanity CMS (cuando esté configurado)
npm run sanity
npm run sanity:deploy

# Prisma (cuando esté configurado)
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## 🚧 Próximos Pasos

### ✅ FASE 2 COMPLETADA: Sanity CMS

**Logros:**
- ✅ Schema de Event (eventos grupales/talleres) creado
- ✅ Schema de Session (sesiones 1:1) creado
- ✅ Schema de BlogPost creado
- ✅ Schema de Product creado
- ✅ Schema de PremiumContent creado
- ✅ Schema de MembershipTier creado
- ✅ Schema de Page creado
- ✅ Sanity Studio configurado y personalizado en español
- ✅ Estructura de navegación organizada
- ✅ Integración con Next.js (client, queries, utilidades)

**⚠️ Acción Requerida:**
Ver `SETUP_SANITY.md` para completar la inicialización del proyecto en Sanity.io

### FASE 3: Prisma + PostgreSQL
- [ ] Configurar Prisma
- [ ] Crear modelos (User, Order, ManualPayment, Subscription, Entitlement)
- [ ] Ejecutar migraciones
- [ ] Configurar PostgreSQL

### FASE 4-10: Ver PLAN_DESARROLLO.md

## 🔐 Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```bash
cp .env.example .env.local
```

Luego edita `.env.local` con tus valores reales.

## 👤 Autor

**Xavier Monfort** - Desarrollo Web

## 📝 Cliente

**Aleyda Vargas** - Energía y Divinidad
Canalizadora Profesional y Chamana

## 📄 Licencia

Proyecto privado - Todos los derechos reservados
