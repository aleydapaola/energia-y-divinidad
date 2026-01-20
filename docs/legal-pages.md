# Documentación: Páginas Legales y Sistema de Consentimiento (P0-01)

## Descripción General

Este módulo implementa las páginas legales obligatorias y el sistema de registro de consentimiento para cumplir con normativas de protección de datos (RGPD, LOPD).

---

## Funcionalidades Implementadas

### 1. Páginas Legales

Se crearon 4 páginas legales accesibles públicamente:

| Página | URL | Tipo en Sanity |
|--------|-----|----------------|
| Política de Privacidad | `/privacidad` | `privacy` |
| Términos y Condiciones | `/terminos` | `terms` |
| Política de Cookies | `/cookies` | `cookies` |
| Aviso Legal | `/aviso-legal` | `legal` |

**Características:**
- Contenido gestionado desde Sanity CMS
- Soporte para versionado de documentos
- Fecha de última actualización visible
- Estilos consistentes con el resto del sitio
- SEO optimizado con metadata dinámica

### 2. Gestión de Contenido en Sanity

Los documentos legales se crean en Sanity Studio usando el tipo de documento "Páginas" (`page`).

**Campos específicos para páginas legales:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `pageType` | string | Tipo de página (`terms`, `privacy`, `cookies`, `legal`) |
| `version` | string | Versión del documento (ej: "1.0", "2.0") |
| `lastUpdated` | datetime | Fecha de última actualización |
| `content` | portable text | Contenido del documento legal |

**Nota:** Los campos `version` y `lastUpdated` solo son visibles cuando `pageType` es uno de los tipos legales.

### 3. Sistema de Consentimiento

#### Base de Datos (Prisma)

Se añadieron dos campos al modelo `User`:

```prisma
model User {
  // ... otros campos
  acceptedTermsVersion String?   // Versión de términos aceptados
  acceptedTermsAt      DateTime? // Fecha y hora de aceptación
}
```

#### Flujo de Registro

1. El usuario completa el formulario de registro
2. Debe marcar el checkbox de aceptación de términos (obligatorio)
3. Al crear la cuenta, se guarda:
   - `acceptedTermsVersion`: Versión actual de términos (actualmente "1.0")
   - `acceptedTermsAt`: Timestamp del momento de aceptación

#### Validaciones

- **Frontend** (`app/auth/signup/page.tsx`): Validación antes de enviar el formulario
- **Backend** (`app/api/auth/register/route.ts`): Validación del campo `acceptedTerms`

---

## Estructura de Archivos

```
energia-y-divinidad/
├── app/
│   ├── privacidad/
│   │   └── page.tsx          # Página de Política de Privacidad
│   ├── terminos/
│   │   └── page.tsx          # Página de Términos y Condiciones
│   ├── cookies/
│   │   └── page.tsx          # Página de Política de Cookies
│   ├── aviso-legal/
│   │   └── page.tsx          # Página de Aviso Legal
│   ├── auth/
│   │   └── signup/
│   │       └── page.tsx      # Formulario con checkbox de consentimiento
│   └── api/
│       └── auth/
│           └── register/
│               └── route.ts  # API con validación y guardado de consentimiento
├── components/
│   └── legal/
│       └── LegalPageContent.tsx  # Componente reutilizable
├── sanity/
│   ├── schemas/
│   │   └── page.ts           # Schema con campos de versionado
│   └── lib/
│       └── queries.ts        # Query LEGAL_PAGE_BY_SLUG_QUERY
└── prisma/
    └── schema.prisma         # Campos de consentimiento en User
```

---

## Guía de Uso

### Crear Contenido Legal en Sanity

1. Acceder a Sanity Studio (`/studio`)
2. Ir a "Páginas"
3. Crear nuevo documento con:
   - **Título**: Nombre del documento (ej: "Política de Privacidad")
   - **Slug**: URL slug (ej: `privacidad`)
   - **Tipo de Página**: Seleccionar el tipo correspondiente
   - **Versión**: Número de versión (ej: "1.0")
   - **Última Actualización**: Fecha actual
   - **Contenido**: Texto legal en formato rich text
   - **Publicado**: Marcar como publicado

### Slugs Requeridos

Para que las páginas funcionen, los documentos deben tener estos slugs exactos:

| Página | Slug requerido |
|--------|----------------|
| Privacidad | `privacidad` |
| Términos | `terminos` |
| Cookies | `cookies` |
| Aviso Legal | `aviso-legal` |

### Actualizar Versión de Términos

Cuando se actualice el contenido legal:

1. Actualizar el contenido en Sanity
2. Incrementar el campo `version` (ej: "1.0" → "1.1" o "2.0")
3. Actualizar `lastUpdated` con la fecha actual
4. **Importante**: Actualizar `currentTermsVersion` en `app/api/auth/register/route.ts`

```typescript
// En app/api/auth/register/route.ts
const currentTermsVersion = '1.1'; // Actualizar cuando cambien los términos
```

---

## Consideraciones Técnicas

### Caché

Las páginas legales usan caché de Sanity con tags `['page', 'legal']`. Para invalidar:

```typescript
// Revalidar desde API Route
import { revalidateTag } from 'next/cache';
revalidateTag('legal');
```

### SEO

Cada página genera metadata dinámica desde Sanity:
- `metaTitle` y `metaDescription` desde el campo `seo`
- Fallback a valores por defecto si no están configurados

### Accesibilidad

- Los links a términos en el checkbox se abren en nueva pestaña (`target="_blank"`)
- El checkbox tiene label clickeable asociado
- Mensajes de error claros y descriptivos

---

## Futuras Mejoras Sugeridas

1. **Re-aceptación de términos**: Cuando cambie la versión, solicitar re-aceptación a usuarios existentes
2. **Historial de consentimientos**: Tabla separada para auditoría de todas las aceptaciones
3. **Banner de cookies**: Implementar banner de consentimiento de cookies (GDPR)
4. **Versión dinámica desde Sanity**: Obtener `currentTermsVersion` directamente desde Sanity en lugar de hardcodearlo

---

## Queries GROQ

### Obtener página legal por slug

```groq
*[
  _type == "page" &&
  slug.current == $slug &&
  pageType in ["terms", "privacy", "cookies", "legal"]
][0]{
  _id,
  title,
  slug,
  pageType,
  content,
  version,
  lastUpdated,
  seo
}
```

### Uso en código

```typescript
import { sanityFetch } from '@/sanity/lib/fetch'
import { LEGAL_PAGE_BY_SLUG_QUERY } from '@/sanity/lib/queries'

const page = await sanityFetch<LegalPage | null>({
  query: LEGAL_PAGE_BY_SLUG_QUERY,
  params: { slug: 'privacidad' },
  tags: ['page', 'legal'],
})
```
