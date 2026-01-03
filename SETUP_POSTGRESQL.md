# 🐘 Configuración de PostgreSQL

Tienes dos opciones para configurar PostgreSQL: **local** (en tu Mac) o **cloud** (gratis con Supabase/Neon).

---

## Opción 1: PostgreSQL Local (Recomendado para desarrollo)

### Instalar PostgreSQL con Homebrew

```bash
brew install postgresql@16
brew services start postgresql@16
```

### Crear la base de datos

```bash
createdb energia_y_divinidad
```

### Configurar `.env.local`

Edita el archivo `.env.local` y actualiza la URL de conexión:

```env
DATABASE_URL="postgresql://TU_USUARIO@localhost:5432/energia_y_divinidad"
```

Donde `TU_USUARIO` es tu usuario de Mac (puedes verlo con `whoami` en la terminal).

---

## Opción 2: PostgreSQL en la Nube (Gratis)

### A. Usar Supabase (Recomendado)

1. Ve a https://supabase.com
2. Crea una cuenta gratuita
3. Click en "New Project"
4. Nombre: **Energía y Divinidad**
5. Contraseña de base de datos: guárdala
6. Región: **South America (São Paulo)**
7. Espera 2 minutos a que se cree

8. Ve a **Settings → Database**
9. Copia el **Connection String** (modo "Session")
10. Pega en `.env.local`:

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
```

### B. Usar Neon (Alternativa)

1. Ve a https://neon.tech
2. Crea una cuenta gratuita
3. Click en "Create a project"
4. Nombre: **Energía y Divinidad**
5. Región: **AWS / South America (São Paulo)**
6. Copia el **Connection String**
7. Pega en `.env.local`

---

## Ejecutar Migraciones de Prisma

Una vez configurada la base de datos (local o cloud), ejecuta:

```bash
npx prisma migrate dev --name init
```

Esto creará todas las tablas en tu base de datos.

---

## Verificar que funciona

```bash
npx prisma studio
```

Esto abrirá un navegador en http://localhost:5555 donde podrás ver y editar datos de la base de datos.

---

## Modelos creados en Prisma

El schema incluye:

### 👤 User Management
- **User**: Usuarios de la plataforma
- **Account**: Cuentas de OAuth (Google, GitHub)
- **Session**: Sesiones de NextAuth
- **VerificationToken**: Tokens de verificación de email

### 💳 Payments & Orders
- **Order**: Órdenes de compra
- **ManualPayment**: Pagos manuales (Nequi, Daviplata, Bancolombia)
- **StripePayment**: Pagos con Stripe

### 💎 Memberships
- **Subscription**: Suscripciones a membresías

### 🔐 Entitlements (Access Control)
- **Entitlement**: Permisos de acceso a contenido/eventos/sesiones

### 📅 Bookings
- **Booking**: Reservas de sesiones 1:1 y eventos

### 🔔 Webhooks
- **WebhookEvent**: Eventos de webhooks (idempotencia)

---

## Troubleshooting

### Error: "Can't reach database server"
- Si es local: verifica que PostgreSQL esté corriendo con `brew services list`
- Si es cloud: verifica que la URL de conexión sea correcta

### Error: "password authentication failed"
- Verifica el usuario y contraseña en DATABASE_URL

### Error: "database does not exist"
- Si es local: ejecuta `createdb energia_y_divinidad`
- Si es cloud: el proyecto debería crearlo automáticamente
