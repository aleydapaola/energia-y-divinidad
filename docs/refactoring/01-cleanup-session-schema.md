# Plan 01: Eliminar Esquema Session.ts No Utilizado

## Objetivo
Eliminar el archivo `sanity/schemas/session.ts` que ya no se utiliza (fue reemplazado por `sessionConfig.ts`).

## Contexto
- El archivo `sanity/schemas/session.ts` tiene 365 líneas
- El archivo `sanity/schemas/sessionConfig.ts` (689 líneas) es el esquema activo
- En `sanity/schemas/index.ts` solo se importa `sessionConfig`, no `session`
- El archivo `session.ts` es código muerto que genera confusión

## Verificación Previa (OBLIGATORIA)

Antes de eliminar, ejecutar estas búsquedas para confirmar que no hay referencias:

```bash
# Buscar imports del esquema session (excluyendo sessionConfig)
grep -r "from.*['\"].*session['\"]" --include="*.ts" --include="*.tsx" . | grep -v sessionConfig | grep -v node_modules

# Buscar referencias al tipo session en queries GROQ
grep -r "_type.*==.*['\"]session['\"]" --include="*.ts" --include="*.tsx" . | grep -v sessionConfig | grep -v node_modules

# Buscar imports directos del archivo
grep -r "schemas/session" --include="*.ts" --include="*.tsx" . | grep -v sessionConfig | grep -v node_modules
```

**Resultado esperado**: No debe haber resultados, o solo comentarios/documentación.

## Pasos de Implementación

### Paso 1: Verificar que sessionConfig está funcionando
```bash
# Iniciar Sanity Studio y verificar que las sesiones se muestran correctamente
cd sanity && npm run dev
```

Verificar en el Studio que:
- [ ] El tipo "Configuración de Sesiones" aparece en el menú
- [ ] Los documentos existentes de sesiones se cargan correctamente
- [ ] Se pueden crear/editar sesiones sin errores

### Paso 2: Eliminar el archivo
```bash
rm sanity/schemas/session.ts
```

### Paso 3: Verificar que el proyecto compila
```bash
npm run build
```

### Paso 4: Verificar Sanity Studio
```bash
cd sanity && npm run build
```

## Archivos a Modificar
- ❌ **Eliminar**: `sanity/schemas/session.ts`

## Archivos que NO deben modificarse
- `sanity/schemas/sessionConfig.ts` - Este es el esquema activo
- `sanity/schemas/index.ts` - Ya no importa session.ts
- `lib/sanity/queries/sessions.ts` - Usa sessionConfig
- `lib/sanity/queries/sessionConfig.ts` - Queries del esquema activo

## Criterios de Éxito
- [ ] El archivo `sanity/schemas/session.ts` ha sido eliminado
- [ ] `npm run build` completa sin errores
- [ ] Sanity Studio inicia correctamente
- [ ] Las sesiones existentes se muestran en el Studio
- [ ] Se pueden crear nuevas sesiones

## Rollback
Si algo falla, restaurar el archivo desde git:
```bash
git checkout -- sanity/schemas/session.ts
```

## Riesgo
**Bajo** - El archivo no está siendo utilizado.

## Tiempo Estimado
15 minutos
