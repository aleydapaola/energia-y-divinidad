# Drip Content - Liberación Programada de Lecciones

## Descripción General

El sistema de Drip Content permite liberar lecciones de forma programada en los cursos, controlando cuándo los estudiantes pueden acceder a cada lección. Esto es útil para:

- Cursos que se liberan semana a semana
- Programas de formación con contenido secuencial
- Evitar que los estudiantes avancen demasiado rápido
- Crear expectativa y compromiso sostenido

## Configuración en Sanity Studio

### Nivel de Curso

En el editor de cursos, dentro del grupo "Contenido del Curso", encontrarás:

| Campo | Descripción |
|-------|-------------|
| **📅 Liberación Programada** | Activa/desactiva el drip content para todo el curso |
| **Días entre lecciones** | Intervalo por defecto entre liberación de lecciones (ej: 7 = semanal) |

### Nivel de Lección

En el editor de lecciones, dentro del grupo "Configuración", encontrarás:

| Campo | Descripción |
|-------|-------------|
| **📅 Modo de Liberación** | `Inmediato`, `Días desde inscripción`, o `Fecha fija` |
| **Días desde inscripción** | Número de días después de inscripción (solo si modo = offset) |
| **Fecha de liberación** | Fecha/hora específica (solo si modo = fixed) |

## Modos de Liberación

### 1. Inmediato (`immediate`)
La lección está disponible desde el momento de la inscripción.

### 2. Días desde inscripción (`offset`)
La lección se libera X días después de que el usuario se inscribió al curso.

**Ejemplo:** Si `dripOffsetDays = 7`, la lección estará disponible 7 días después de la inscripción.

### 3. Fecha fija (`fixed`)
La lección se libera en una fecha/hora específica, igual para todos los usuarios.

**Ejemplo:** Útil para eventos en vivo o lanzamientos coordinados.

## Lógica de Cálculo

### Prioridad de configuración

1. **Vista previa gratuita** (`isFreePreview`): Siempre disponible, ignora drip
2. **Fecha de desbloqueo del módulo** (`module.unlockDate`): Toma precedencia sobre drip de lección
3. **Configuración de lección**: Si tiene `dripMode` específico, se usa ese
4. **Configuración por defecto del curso**: Se usa `defaultDripDays * índice_global_lección`

### Fórmula de disponibilidad

```
fecha_disponible = fecha_inscripción + (defaultDripDays × índice_lección)
```

**Ejemplo con `defaultDripDays = 7`:**
- Lección 1 (índice 0): Disponible día 0 (inmediato)
- Lección 2 (índice 1): Disponible día 7
- Lección 3 (índice 2): Disponible día 14
- Lección 4 (índice 3): Disponible día 21

## Comportamiento en la UI

### Página del Curso (Listado de lecciones)

| Estado | Icono | Color | Texto |
|--------|-------|-------|-------|
| Disponible | Play/Video/Text | Azul | Título normal |
| Bloqueada (sin acceso) | Candado | Gris | Título gris |
| Drip bloqueada | Reloj | Ámbar | "Disponible en X días" |
| Vista previa | Ojo | Azul | "Gratis" / "Vista previa" |

### Reproductor del Curso (Sidebar)

Las lecciones drip-bloqueadas:
- Muestran icono de reloj (🕐) en lugar del tipo de lección
- Texto en color ámbar con countdown
- Están deshabilitadas (no se puede hacer clic)

### Navegación

Si un usuario intenta acceder directamente a una lección drip-bloqueada via URL:
- Se redirige automáticamente a la primera lección disponible
- No se muestra error, simplemente se carga la lección correcta

## API Endpoints

### GET `/api/courses/[courseId]/lessons/[lessonId]/access`

Verifica si el usuario puede acceder a una lección específica.

**Response:**
```json
{
  "canAccess": false,
  "reason": "drip_locked",
  "availableAt": "2024-02-15T00:00:00.000Z",
  "courseAccess": {
    "hasAccess": true,
    "reason": "purchase"
  },
  "startedAt": "2024-02-01T10:30:00.000Z"
}
```

**Valores de `reason`:**
- `available`: Lección disponible
- `free_preview`: Disponible como vista previa
- `drip_locked`: Bloqueada por drip content
- `module_locked`: Módulo no desbloqueado
- `no_course_access`: Sin acceso al curso

## Funciones de Librería

### `calculateDripAvailability()`

Calcula la fecha de disponibilidad de una lección.

```typescript
import { calculateDripAvailability } from '@/lib/course-access'

const availableAt = calculateDripAvailability(
  lesson,           // LessonWithDrip
  course,           // CourseWithDrip
  startedAt,        // Date (fecha de inscripción)
  globalLessonIndex // number (índice global de la lección)
)
// Retorna: Date | null (null = disponible inmediatamente)
```

### `canAccessLesson()`

Verifica si un usuario puede acceder a una lección.

```typescript
import { canAccessLesson } from '@/lib/course-access'

const result = await canAccessLesson(
  userId,           // string | null
  courseId,         // string
  lesson,           // LessonWithDrip
  course,           // CourseWithDrip
  moduleUnlockDate, // string | null (opcional)
  globalLessonIndex // number (default: 0)
)
// Retorna: LessonAccessResult
```

### `getCourseStartDate()`

Obtiene o crea la fecha de inscripción del usuario.

```typescript
import { getCourseStartDate } from '@/lib/course-access'

const startedAt = await getCourseStartDate(userId, courseId)
// Retorna: Date
```

## Tipos TypeScript

```typescript
type DripMode = 'immediate' | 'offset' | 'fixed'

interface LessonWithDrip {
  _id: string
  order?: number
  isFreePreview?: boolean
  dripMode?: DripMode
  dripOffsetDays?: number
  availableAt?: string
}

interface CourseWithDrip {
  _id: string
  dripEnabled?: boolean
  defaultDripDays?: number
}

interface LessonAccessResult {
  canAccess: boolean
  reason: 'available' | 'drip_locked' | 'module_locked' | 'no_course_access' | 'free_preview'
  availableAt?: Date
}
```

## Casos de Uso Comunes

### Curso semanal de 4 semanas

**Configuración del curso:**
- `dripEnabled`: true
- `defaultDripDays`: 7

**Resultado:**
- Semana 1: Lecciones 1-3 disponibles al inscribirse
- Semana 2: Lecciones 4-6 disponibles
- Semana 3: Lecciones 7-9 disponibles
- Semana 4: Lecciones 10-12 disponibles

### Curso con lección de bienvenida + drip

**Configuración:**
- Lección 1: `dripMode: 'immediate'`
- Lección 2-10: `dripMode: 'offset'` con días progresivos

### Lanzamiento coordinado

**Configuración:**
- Todas las lecciones con `dripMode: 'fixed'`
- Cada lección con su `availableAt` específico

## Consideraciones Importantes

1. **Vista previa siempre disponible**: Las lecciones marcadas como `isFreePreview` ignoran todas las restricciones de drip.

2. **Fecha de inscripción**: Se registra automáticamente la primera vez que el usuario accede al curso (via `CourseProgress.startedAt`).

3. **Módulos con fecha de desbloqueo**: Si un módulo tiene `unlockDate`, esa fecha toma precedencia sobre el drip de las lecciones individuales dentro del módulo.

4. **Sin configuración = inmediato**: Si `dripEnabled` es true pero una lección no tiene configuración específica y no hay `defaultDripDays`, la lección estará disponible inmediatamente.

5. **Índice global**: El cálculo usa el índice global de la lección (contando todas las lecciones de todos los módulos), no el índice dentro de un módulo específico.

## Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `sanity/schemas/course.ts` | Campos drip en schema de curso |
| `sanity/schemas/courseLesson.ts` | Campos drip en schema de lección |
| `sanity/lib/queries.ts` | Query con campos drip |
| `lib/course-access.ts` | Lógica de cálculo y verificación |
| `components/academia/CourseContent.tsx` | UI en página del curso |
| `components/academia/LessonList.tsx` | UI en sidebar del reproductor |
| `app/api/courses/[courseId]/lessons/[lessonId]/access/route.ts` | API de acceso |
| `app/academia/[slug]/reproducir/page.tsx` | Verificación server-side |
