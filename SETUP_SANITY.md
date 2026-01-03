# 🚀 Configuración de Sanity CMS

Este documento contiene las instrucciones para configurar Sanity CMS en el proyecto.

## ✅ Lo que ya está hecho

- ✅ Todos los schemas creados (Event, Session, BlogPost, Product, PremiumContent, MembershipTier, Page)
- ✅ Sanity Studio configurado y personalizado en español
- ✅ Estructura de navegación organizada por secciones
- ✅ Integración con Next.js lista (cliente, queries, utilidades)

## 📝 Pasos para completar la configuración

### 1. Crear proyecto en Sanity.io

Necesitas crear un proyecto en Sanity.io y obtener el Project ID:

```bash
cd /Users/xmonfort/Projects/energia-y-divinidad
npx sanity@latest login
```

Esto abrirá un navegador para que inicies sesión con:
- Google
- GitHub
- Email/Password

### 2. Crear el proyecto

Después de iniciar sesión, crea el proyecto:

```bash
npx sanity@latest projects create
```

Te pedirá:
- **Project name**: `Energía y Divinidad`
- **Dataset**: `production` (ya configurado)

El comando te dará un **Project ID** (algo como `abc123xyz`).

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Luego edita `.env.local` y reemplaza:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID="abc123xyz"  # ← Tu Project ID
NEXT_PUBLIC_SANITY_DATASET="production"
NEXT_PUBLIC_SANITY_API_VERSION="2024-01-01"
SANITY_API_TOKEN=""  # ← Opcional por ahora, lo crearás después
```

### 4. Iniciar Sanity Studio

Una vez configuradas las variables de entorno, inicia Sanity Studio:

```bash
npm run sanity
```

Esto iniciará Sanity Studio en `http://localhost:3333/studio`

### 5. Crear token de API (opcional, para preview en desarrollo)

Si quieres usar preview mode o escribir datos desde Next.js:

1. Ve a https://www.sanity.io/manage
2. Selecciona tu proyecto "Energía y Divinidad"
3. Ve a **API** → **Tokens**
4. Crea un nuevo token con permisos de **Editor** o **Read+Write**
5. Copia el token y agrégalo a `.env.local`:

```env
SANITY_API_TOKEN="skXXXXXXXXXXXXXXXXXXXXXXX"
```

### 6. Desplegar Sanity Studio (producción)

Cuando estés listo para producción:

```bash
npm run sanity:deploy
```

Esto desplegará tu Sanity Studio a una URL pública como:
`https://energia-y-divinidad.sanity.studio`

## 🎨 Estructura de Sanity Studio

El Studio está organizado en secciones:

```
📅 Servicios
  ├── Eventos Grupales (talleres, ceremonias, retiros)
  └── Sesiones 1:1 (canalizaciones individuales)

📝 Contenido
  ├── Artículos del Blog
  └── Contenido Premium

🛍️ Productos
  └── Productos digitales, físicos, cursos

💎 Membresías
  └── Niveles de membresía

📄 Páginas
  └── Páginas estáticas (Sobre Mí, Contacto, etc.)
```

## 📚 Schemas creados

### Event (Eventos Grupales)
Talleres, ceremonias, retiros, webinars grupales.
- Tipo de evento (presencial/online/híbrido)
- Fecha, ubicación, capacidad
- Precios (COP/USD)
- Requisitos de membresía

### Session (Sesiones 1:1)
Sesiones individuales de canalización, registros akáshicos, sanación.
- Tipo de sesión
- Duración (30, 45, 60, 90, 120 min)
- Método de entrega (presencial/videollamada/teléfono)
- Horarios de disponibilidad
- Formulario de ingreso
- Descuentos para miembros

### BlogPost
Artículos del blog con soporte de contenido premium.
- Categorías y etiquetas
- Contenido rich text
- Relación con sesiones/eventos/productos
- SEO optimizado

### Product
Productos digitales, físicos, cursos, paquetes de sesiones.
- Múltiples tipos de producto
- Inventario (opcional)
- Archivos digitales
- Contenido de curso
- Descuentos para miembros

### PremiumContent
Contenido exclusivo para miembros (videos, audios, masterclasses).
- Control de acceso por nivel de membresía
- Posibilidad de compra individual
- Series y episodios
- Descargas

### MembershipTier
Niveles de membresía con beneficios y precios.
- Precios mensuales/anuales (COP/USD)
- Características y beneficios
- Descuentos en sesiones y productos
- Acceso a contenido premium
- Período de prueba

### Page
Páginas estáticas del sitio.
- Hero sections
- Contenido modular (bloques, galerías, testimonios, FAQs)
- Sidebar configurable
- Control de navegación (menú/footer)

## 🔗 Integración con Next.js

Ya está todo listo para usar Sanity en Next.js:

```typescript
import { client, UPCOMING_EVENTS_QUERY } from '@/sanity/lib'

// En cualquier componente Server Component
const events = await client.fetch(UPCOMING_EVENTS_QUERY)
```

Queries disponibles en `sanity/lib/queries.ts`:
- EVENTS_QUERY, UPCOMING_EVENTS_QUERY
- SESSIONS_QUERY, FEATURED_SESSIONS_QUERY
- BLOG_POSTS_QUERY, FEATURED_BLOG_POSTS_QUERY
- PRODUCTS_QUERY, FEATURED_PRODUCTS_QUERY
- PREMIUM_CONTENT_QUERY
- MEMBERSHIP_TIERS_QUERY
- PAGES_QUERY, MENU_PAGES_QUERY, FOOTER_PAGES_QUERY

## ❓ Troubleshooting

### Error: "Invalid project ID"
Verifica que en `.env.local` tengas el Project ID correcto de Sanity.

### Error: "Dataset not found"
Asegúrate de que el dataset `production` existe en tu proyecto de Sanity.

### No puedo ver el Studio
Verifica que `npm run sanity` esté corriendo y ve a `http://localhost:3333/studio`

### Cambios en schemas no se reflejan
Reinicia el servidor de Sanity: Ctrl+C y `npm run sanity` de nuevo.

## 📖 Recursos

- [Documentación de Sanity](https://www.sanity.io/docs)
- [GROQ Query Language](https://www.sanity.io/docs/groq)
- [Next.js + Sanity](https://www.sanity.io/plugins/next-sanity)
