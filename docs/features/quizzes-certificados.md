# Sistema de Quizzes y Certificados

## Descripción General

El sistema de Quizzes y Certificados permite evaluar el aprendizaje de los estudiantes y emitir certificados de completación para los cursos de la academia. Incluye evaluaciones configurables, control de intentos, y certificados PDF verificables con código QR.

---

## Funcionalidades de Quizzes

### Tipos de Preguntas

| Tipo | Descripción |
|------|-------------|
| **Opción Múltiple** | Una sola respuesta correcta entre varias opciones |
| **Verdadero/Falso** | Pregunta binaria (V o F) |
| **Selección Múltiple** | Varias respuestas correctas posibles |

### Configuración del Quiz

Los quizzes se configuran en Sanity CMS con las siguientes opciones:

| Campo | Descripción | Valor por Defecto |
|-------|-------------|-------------------|
| `passingScore` | Porcentaje mínimo para aprobar | 70% |
| `maxAttempts` | Número máximo de intentos (null = ilimitado) | Ilimitado |
| `retakeDelayHours` | Horas de espera entre intentos | 0 (sin espera) |
| `timeLimit` | Límite de tiempo en minutos (null = sin límite) | Sin límite |
| `shuffleQuestions` | Mostrar preguntas en orden aleatorio | false |
| `shuffleOptions` | Mostrar opciones en orden aleatorio | false |
| `showResultsImmediately` | Mostrar resultados tras cada pregunta | true |

### Tipos de Quiz

1. **Quiz de Lección**: Asociado a una lección específica
   - Puede ser opcional o requerido para completar la lección
   - Se configura en el campo `quiz` de `courseLesson`

2. **Examen Final**: Asociado al curso completo
   - Se configura en el campo `finalQuiz` de `course`
   - Puede ser requerido para obtener el certificado

### Flujo del Estudiante

```
1. Acceder al quiz desde la lección o curso
   ↓
2. Ver pantalla de inicio con información del quiz
   - Número de preguntas
   - Puntaje para aprobar
   - Tiempo límite (si aplica)
   - Intentos disponibles
   ↓
3. Responder preguntas una a la vez
   - Navegación anterior/siguiente
   - Timer visible (si hay límite)
   - Progreso visual
   ↓
4. Ver resultados al finalizar
   - Puntaje obtenido
   - Aprobado/Reprobado
   - Desglose de respuestas (si configurado)
   ↓
5. Reintentar (si hay intentos disponibles)
```

### Control de Intentos

El sistema verifica automáticamente:
- Si el usuario ha alcanzado el máximo de intentos
- Si debe esperar un tiempo antes de reintentar
- Si ya aprobó el quiz anteriormente

---

## Funcionalidades de Certificados

### Requisitos para Obtener Certificado

1. Completar el 100% de las lecciones del curso
2. Aprobar el examen final (si el curso lo requiere)
3. El curso debe tener una plantilla de certificado configurada

### Contenido del Certificado PDF

| Elemento | Descripción |
|----------|-------------|
| **Imagen de fondo** | Plantilla visual del certificado |
| **Logo** | Logo de Energía y Divinidad |
| **Nombre del estudiante** | Nombre completo del usuario |
| **Nombre del curso** | Título del curso completado |
| **Fecha de emisión** | Fecha de generación del certificado |
| **Número de certificado** | Código único (formato: `CERT-YYYYMMDD-XXXXXX`) |
| **Horas del curso** | Duración total (si está configurado) |
| **Código QR** | Enlace a página de verificación pública |
| **Firma** | Imagen de firma del instructor |

### Verificación Pública

Cualquier persona puede verificar la autenticidad de un certificado en:
```
/certificados/verificar/[numero-de-certificado]
```

La página muestra:
- Estado de validez (válido, expirado, no encontrado)
- Nombre del estudiante
- Nombre del curso
- Fecha de emisión
- Fecha de expiración (si aplica)

### Almacenamiento

- Los certificados se generan **on-demand** cuando se solicita la descarga
- Se almacena el registro en la base de datos (Prisma)
- El PDF se genera dinámicamente con `@react-pdf/renderer`

---

## Esquema de Base de Datos

### QuizAttempt

```prisma
model QuizAttempt {
  id           String   @id
  userId       String
  quizId       String   // ID de Sanity
  courseId     String   // ID de Sanity
  lessonId     String?  // null para examen final

  score        Decimal  // Porcentaje obtenido
  totalPoints  Int
  earnedPoints Int
  passed       Boolean
  answers      Json     // Respuestas detalladas

  startedAt    DateTime
  completedAt  DateTime
  timeSpent    Int      // Segundos
}
```

### Certificate

```prisma
model Certificate {
  id                String    @id
  userId            String
  courseId          String
  courseName        String
  studentName       String

  certificateNumber String    @unique
  issuedAt          DateTime
  validUntil        DateTime?

  quizScore         Decimal?  // Puntaje del examen final
  courseHours       Int?
}
```

---

## API Endpoints

### Quizzes

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/quizzes/[quizId]` | GET | Obtener quiz (sin respuestas correctas) |
| `/api/quizzes/[quizId]/submit` | POST | Enviar respuestas del quiz |
| `/api/quizzes/[quizId]/results` | GET | Obtener resultados de intentos previos |

### Certificados

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/certificates` | GET | Listar certificados del usuario |
| `/api/certificates/[courseId]/generate` | POST | Generar certificado para un curso |
| `/api/certificates/[certificateId]/download` | GET | Descargar PDF del certificado |
| `/api/certificates/verify/[number]` | GET | Verificar certificado (público) |

---

## Configuración en Sanity

### Quiz (`sanity/schemas/quiz.ts`)

Crear un nuevo quiz:
1. Ir a Sanity Studio → Quizzes → Crear
2. Completar información básica (título, descripción)
3. Agregar preguntas con sus opciones y respuestas correctas
4. Configurar puntaje para aprobar, intentos, tiempo límite

### Certificado (`sanity/schemas/certificate.ts`)

Crear plantilla de certificado:
1. Ir a Sanity Studio → Certificados → Crear
2. Subir imagen de fondo (recomendado: 1920x1080px, horizontal)
3. Subir logo y firma
4. Configurar colores de texto
5. Configurar validez (permanente o con expiración)

### Asignar Quiz a Lección

1. Editar la lección en Sanity
2. En el campo "Quiz de la Lección", seleccionar el quiz
3. Marcar "Requiere Quiz para Completar" si es obligatorio

### Asignar Examen Final y Certificado a Curso

1. Editar el curso en Sanity
2. En "Contenido del Curso":
   - Seleccionar "Examen Final"
   - Seleccionar "Certificado"
   - Marcar "Requiere Examen Final" si es obligatorio

---

## Componentes UI

### Quiz

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `QuizContainer` | `components/academia/quiz/` | Contenedor principal del quiz |
| `QuizQuestion` | `components/academia/quiz/` | Pregunta individual con opciones |
| `QuizProgress` | `components/academia/quiz/` | Barra de progreso |
| `QuizTimer` | `components/academia/quiz/` | Temporizador (si hay límite) |
| `QuizResults` | `components/academia/quiz/` | Pantalla de resultados |
| `QuizNavigation` | `components/academia/quiz/` | Navegación entre preguntas |

### Certificados

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `CertificateCard` | `components/academia/certificate/` | Tarjeta de certificado en lista |
| `CertificateDownloadButton` | `components/academia/certificate/` | Botón de descarga |
| `CourseCertificateCTA` | `components/academia/certificate/` | CTA al completar curso |

---

## Integración con CoursePlayer

El `CoursePlayer` muestra automáticamente:

1. **Quiz de Lección**: Botón "Tomar Quiz" debajo del contenido de la lección
2. **Certificado CTA**: Banner cuando el curso está completado al 100%
   - Si hay examen final pendiente: "Tomar Examen Final"
   - Si ya existe certificado: "Descargar Certificado"
   - Si está listo para generar: "Obtener Certificado"

---

## Funciones de Librería

### `lib/quizzes.ts`

| Función | Descripción |
|---------|-------------|
| `getQuizById(quizId)` | Obtener quiz completo (con respuestas) |
| `getQuizForStudent(quizId)` | Quiz sin respuestas correctas |
| `getQuizForAttempt(quizId)` | Quiz preparado para intento (con shuffle) |
| `canTakeQuiz(userId, quizId)` | Verificar si puede tomar el quiz |
| `submitQuizAttempt(params)` | Calificar y guardar intento |
| `gradeQuiz(questions, answers)` | Calificar respuestas |
| `hasPassedQuiz(userId, quizId)` | Verificar si aprobó |
| `hasPassedFinalQuiz(userId, courseId)` | Verificar examen final |

### `lib/certificates.ts`

| Función | Descripción |
|---------|-------------|
| `canIssueCertificate(userId, courseId)` | Verificar requisitos |
| `issueCertificate(params)` | Crear registro de certificado |
| `getCertificateData(certificateId)` | Obtener datos para PDF |
| `verifyCertificate(certificateNumber)` | Verificación pública |
| `getUserCertificates(userId)` | Listar certificados del usuario |
| `hasCertificate(userId, courseId)` | Verificar si ya tiene certificado |

### `lib/certificate-pdf.tsx`

| Función | Descripción |
|---------|-------------|
| `generateCertificatePdfBuffer(data)` | Generar PDF como Buffer |
| `CertificateDocument` | Componente React-PDF |

---

## Dependencias

```json
{
  "@react-pdf/renderer": "^3.x",
  "qrcode": "^1.x",
  "@types/qrcode": "^1.x"
}
```

---

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/academia/[slug]/quiz/[quizId]` | Página para tomar un quiz |
| `/certificados/verificar/[number]` | Verificación pública de certificado |
| `/mi-cuenta/cursos` | Lista de cursos con certificados disponibles |

---

## Consideraciones de Seguridad

1. **Respuestas correctas**: Nunca se envían al cliente, solo al servidor para calificación
2. **Verificación de acceso**: Se verifica acceso al curso antes de mostrar el quiz
3. **Propiedad del certificado**: Solo el dueño puede descargar su certificado
4. **Verificación pública**: No requiere autenticación, pero solo muestra información básica
