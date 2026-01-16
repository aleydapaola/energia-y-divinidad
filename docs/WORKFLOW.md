# Flujo de Trabajo: Desarrollo y Producción

Este documento describe el proceso para subir cambios a desarrollo, verificarlos y pasarlos a producción.

## Ramas

| Rama | Entorno Vercel | URL |
|------|----------------|-----|
| `main` | Producción | energiaydivinidad.com |
| `dev` | Preview/Desarrollo | energia-y-divinidad-git-dev-*.vercel.app |

## Flujo de Trabajo

```
[Cambios locales] → [dev] → [Verificar en Preview] → [main] → [Producción]
```

---

## 1. Subir cambios a desarrollo (dev)

### Opción A: Trabajar directamente en dev

```bash
# Cambiar a la rama dev
git checkout dev

# Hacer cambios...

# Añadir y commitear
git add .
git commit -m "feat: descripción del cambio"

# Subir a dev
git push origin dev
```

### Opción B: Crear una rama feature y mergear a dev

```bash
# Crear rama desde dev
git checkout dev
git checkout -b feature/nombre-feature

# Hacer cambios...

# Commitear
git add .
git commit -m "feat: descripción del cambio"

# Volver a dev y mergear
git checkout dev
git merge feature/nombre-feature

# Subir
git push origin dev

# Opcional: eliminar la rama feature
git branch -d feature/nombre-feature
```

---

## 2. Verificar en el entorno de desarrollo

1. **Esperar el despliegue**: Vercel despliega automáticamente cuando hay push a `dev`
2. **Revisar el estado**: Ve a [Vercel Dashboard](https://vercel.com/dashboard) → Proyecto → Deployments
3. **Acceder al preview**: Haz clic en el deployment de la rama `dev` para ver la URL de preview
4. **Probar funcionalidades**: Verifica que todo funcione correctamente

---

## 3. Pasar cambios a producción

### Opción A: Merge directo (para cambios pequeños)

```bash
# Asegurarse de estar en main
git checkout main

# Traer últimos cambios
git pull origin main

# Mergear dev en main
git merge dev

# Subir a producción
git push origin main
```

### Opción B: Pull Request (recomendado para cambios grandes)

```bash
# Desde la línea de comandos con GitHub CLI
gh pr create --base main --head dev --title "Release: descripción" --body "## Cambios incluidos
- Cambio 1
- Cambio 2

## Testing
- [ ] Verificado en entorno dev
- [ ] Funcionalidades probadas"
```

O desde GitHub:
1. Ve a [github.com/aleydapaola/energia-y-divinidad](https://github.com/aleydapaola/energia-y-divinidad)
2. Haz clic en "Pull requests" → "New pull request"
3. Base: `main` ← Compare: `dev`
4. Añade título y descripción
5. Crea el PR y revisa los cambios
6. Mergea cuando esté listo

---

## 4. Sincronizar dev con main (después de producción)

Después de mergear a main, sincroniza dev para mantener las ramas alineadas:

```bash
git checkout dev
git pull origin main
git push origin dev
```

---

## Comandos rápidos

```bash
# Ver en qué rama estás
git branch

# Ver estado de cambios
git status

# Ver últimos commits
git log --oneline -5

# Cambiar de rama
git checkout main    # o dev

# Ver diferencias entre ramas
git log dev..main --oneline   # commits en main que no están en dev
git log main..dev --oneline   # commits en dev que no están en main
```

---

## Variables de entorno

Las variables de entorno en Vercel están configuradas para todos los entornos (Production, Preview, Development). Si necesitas añadir nuevas:

1. Ve a Vercel → Proyecto → Settings → Environment Variables
2. Añade la variable
3. Selecciona los entornos donde aplica
4. Redesplegar si es necesario

### Variables requeridas para Newsletter (Mailchimp)

```
MAILCHIMP_API_KEY=tu-api-key
MAILCHIMP_LIST_ID=tu-list-id
MAILCHIMP_SERVER_PREFIX=usX
```

---

## Resolución de problemas

### Las imágenes no cargan en dev

Verifica que `NEXT_PUBLIC_SANITY_PROJECT_ID` sea `81jpalr2` en Vercel para el entorno Preview.

### El build falla en Vercel

1. Revisa los logs en Vercel Dashboard → Deployments → Ver logs
2. Prueba el build localmente: `npm run build`

### Conflictos de merge

```bash
# Si hay conflictos al mergear
git status                    # Ver archivos en conflicto
# Editar archivos y resolver conflictos
git add .                     # Marcar como resueltos
git commit                    # Completar el merge
```

### Deshacer último commit (sin push)

```bash
git reset --soft HEAD~1       # Mantiene los cambios
git reset --hard HEAD~1       # Descarta los cambios
```

### Forzar actualización de dev desde main

```bash
git checkout main
git pull origin main
git branch -D dev             # Eliminar dev local
git checkout -b dev           # Crear dev desde main
git push origin dev --force   # Forzar actualización en remoto
```
