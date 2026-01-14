# Entorno de Desarrollo Online - Energía y Divinidad

## Arquitectura de Entornos

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Desarrollo    │     │    Preview      │     │   Producción    │
│   (Local/IDE)   │────▶│   (Vercel)      │────▶│   (Vercel)      │
│                 │     │   rama: dev/*   │     │   rama: main    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  PostgreSQL     │     │  Neon Branch    │     │  Neon Main      │
│  (local)        │     │  (dev branch)   │     │  (production)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Paso 1: Configurar Neon PostgreSQL (Gratis)

### 1.1 Crear cuenta en Neon
1. Ir a [neon.tech](https://neon.tech) y crear cuenta gratuita
2. Crear un nuevo proyecto: `energia-y-divinidad`
3. Seleccionar región: `US East (N. Virginia)` - más cercana a Vercel

### 1.2 Crear branches de base de datos
Neon permite crear "branches" de la base de datos (como git pero para BD):

1. **main** - Branch principal (producción)
2. **dev** - Branch de desarrollo/preview

Para crear el branch de desarrollo:
```bash
# En el dashboard de Neon:
# Project > Branches > Create Branch
# Name: dev
# Parent: main
```

### 1.3 Obtener connection strings
En Neon Dashboard > Connection Details, copia:

**Para producción (main):**
```
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

**Para preview (dev branch):**
```
DATABASE_URL="postgresql://user:pass@ep-xxx-dev.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

---

## Paso 2: Configurar Vercel

### 2.1 Conectar repositorio
1. Ir a [vercel.com](https://vercel.com) y crear cuenta (si no tienes)
2. "Add New Project" > Importar desde GitHub
3. Seleccionar el repositorio `energia-y-divinidad`

### 2.2 Configurar variables de entorno

En Vercel Dashboard > Project > Settings > Environment Variables:

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `DATABASE_URL` | Neon main | Neon dev branch | - |
| `NEXTAUTH_URL` | https://energiaydivinidad.com | (auto) | - |
| `NEXTAUTH_SECRET` | [generar] | [mismo] | - |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | [tu-id] | [tu-id] | - |
| `NEXT_PUBLIC_SANITY_DATASET` | production | production | - |
| `SANITY_API_TOKEN` | [tu-token] | [tu-token] | - |
| `STRIPE_SECRET_KEY` | sk_live_... | sk_test_... | - |
| `STRIPE_WEBHOOK_SECRET` | whsec_... | whsec_... | - |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | pk_live_... | pk_test_... | - |
| `RESEND_API_KEY` | re_... | re_... | - |

**Importante:** Para Preview, puedes usar las mismas credenciales de Stripe en modo test.

### 2.3 Configurar branch deployments
Por defecto, Vercel despliega:
- **Production**: desde `main`
- **Preview**: desde cualquier otra rama

Puedes personalizar esto en Settings > Git > Production Branch.

---

## Paso 3: Flujo de Trabajo

### Desarrollo de nuevas features

```bash
# 1. Crear rama de feature
git checkout -b feature/nueva-funcionalidad

# 2. Hacer cambios y commit
git add .
git commit -m "feat: implementar nueva funcionalidad"

# 3. Push a GitHub
git push -u origin feature/nueva-funcionalidad

# 4. Vercel crea automáticamente un preview deployment
# URL: https://energia-y-divinidad-git-feature-xxx.vercel.app

# 5. Probar en el preview deployment

# 6. Si funciona, crear PR y merge a main
# 7. Vercel despliega automáticamente a producción
```

### Migraciones de base de datos

```bash
# 1. Hacer cambios en prisma/schema.prisma

# 2. Crear migración localmente
npx prisma migrate dev --name nombre_migracion

# 3. Commit y push
git add prisma/
git commit -m "db: add migration nombre_migracion"
git push

# 4. En el preview de Vercel, la migración se aplica al branch dev de Neon

# 5. Cuando haces merge a main, necesitas aplicar la migración a producción:
# Opción A: Automático con Vercel (recomendado)
# Opción B: Manual con npx prisma migrate deploy
```

---

## Paso 4: Integración con Neon (Opcional pero Recomendado)

### Neon + Vercel Integration
Vercel tiene integración nativa con Neon que:
- Crea branches automáticamente para cada preview deployment
- Borra branches cuando cierras PRs
- Configura DATABASE_URL automáticamente

Para activar:
1. Vercel Dashboard > Project > Settings > Integrations
2. Buscar "Neon" > Add Integration
3. Conectar tu proyecto de Neon
4. Habilitar "Create a branch for every preview deployment"

---

## Comandos Útiles

```bash
# Ver estado de la base de datos
npx prisma studio

# Aplicar migraciones a producción
DATABASE_URL="[production-url]" npx prisma migrate deploy

# Generar cliente después de cambios en schema
npx prisma generate

# Resetear base de datos de desarrollo (CUIDADO)
npx prisma migrate reset
```

---

## Costos (Plan Gratuito)

### Vercel (Hobby)
- Deployments ilimitados
- Preview deployments ilimitados
- 100GB bandwidth/mes
- Funciones serverless: 100GB-hrs/mes

### Neon (Free Tier)
- 1 proyecto
- 10 branches
- 3GB storage
- 1GB RAM por branch
- Autoscaling a 0 (no cuesta cuando no se usa)

### Sanity (Free Tier)
- 100K API requests/mes
- 10GB bandwidth
- 2 usuarios

**Total: $0/mes para desarrollo y staging**

---

## Troubleshooting

### Error: "prepared statement already exists"
Agregar `?pgbouncer=true` a la DATABASE_URL de Neon:
```
DATABASE_URL="postgresql://...?sslmode=require&pgbouncer=true"
```

### Error: "Connection terminated unexpectedly"
Usar la connection string con pooler de Neon (termina en `-pooler`).

### Migraciones fallan en Vercel
Asegúrate de que `prisma generate` corre antes de `next build` (ya configurado en vercel.json).

---

## Próximos Pasos

1. [ ] Crear cuenta en Neon
2. [ ] Crear proyecto y branches
3. [ ] Conectar repositorio a Vercel
4. [ ] Configurar variables de entorno
5. [ ] Hacer primer deploy
6. [ ] Probar preview deployments
