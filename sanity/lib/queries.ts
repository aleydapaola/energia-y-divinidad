import { groq } from 'next-sanity'
import {
  pricingProjection,
  membershipAccessProjection,
  seoProjection,
  coverImageProjection,
} from './projections'

// ============================================
// Eventos
// ============================================
export const EVENTS_QUERY = groq`*[_type == "event" && published == true] | order(eventDate asc)`

export const EVENT_BY_SLUG_QUERY = groq`*[_type == "event" && slug.current == $slug][0]`

export const UPCOMING_EVENTS_QUERY = groq`*[
  _type == "event" &&
  published == true &&
  eventDate > now() &&
  status == "upcoming"
] | order(eventDate asc)[0...6]`

// Sesiones 1:1
export const SESSIONS_QUERY = groq`*[_type == "session" && published == true && status == "active"] | order(displayOrder asc)`

export const SESSION_BY_SLUG_QUERY = groq`*[_type == "session" && slug.current == $slug][0]`

export const FEATURED_SESSIONS_QUERY = groq`*[
  _type == "session" &&
  published == true &&
  status == "active" &&
  featured == true
] | order(displayOrder asc)[0...3]`

// Blog Posts
export const BLOG_POSTS_QUERY = groq`*[_type == "blogPost" && published == true] | order(publishedAt desc)`

export const BLOG_POST_BY_SLUG_QUERY = groq`*[_type == "blogPost" && slug.current == $slug][0]{
  ...,
  "relatedPosts": relatedPosts[]->{
    _id,
    title,
    slug,
    excerpt,
    mainImage,
    publishedAt
  }
}`

export const FEATURED_BLOG_POSTS_QUERY = groq`*[
  _type == "blogPost" &&
  published == true &&
  featured == true
] | order(publishedAt desc)[0...3]`

// Productos
export const PRODUCTS_QUERY = groq`*[_type == "product" && published == true && status == "active"] | order(displayOrder asc)`

export const PRODUCT_BY_SLUG_QUERY = groq`*[_type == "product" && slug.current == $slug][0]{
  ...,
  "relatedProducts": relatedProducts[]->{
    _id,
    title,
    slug,
    shortDescription,
    images,
    price,
    priceUSD
  }
}`

export const FEATURED_PRODUCTS_QUERY = groq`*[
  _type == "product" &&
  published == true &&
  status == "active" &&
  featured == true
] | order(displayOrder asc)[0...4]`

// Contenido Premium
export const PREMIUM_CONTENT_QUERY = groq`*[_type == "premiumContent" && published == true] | order(releaseDate desc)`

export const PREMIUM_CONTENT_BY_SLUG_QUERY = groq`*[_type == "premiumContent" && slug.current == $slug][0]`

export const FEATURED_PREMIUM_CONTENT_QUERY = groq`*[
  _type == "premiumContent" &&
  published == true &&
  featured == true &&
  releaseDate <= now()
] | order(displayOrder asc)[0...6]`

// Niveles de Membresía
export const MEMBERSHIP_TIERS_QUERY = groq`*[_type == "membershipTier" && active == true] | order(displayOrder asc)`

export const MEMBERSHIP_TIER_BY_SLUG_QUERY = groq`*[_type == "membershipTier" && slug.current == $slug][0]`

// Páginas
export const PAGES_QUERY = groq`*[_type == "page" && published == true]`

export const PAGE_BY_SLUG_QUERY = groq`*[_type == "page" && slug.current == $slug][0]`

export const MENU_PAGES_QUERY = groq`*[
  _type == "page" &&
  published == true &&
  showInMenu == true
] | order(menuOrder asc)`

export const FOOTER_PAGES_QUERY = groq`*[
  _type == "page" &&
  published == true &&
  showInFooter == true
] | order(footerColumn asc)`

// Páginas Legales
export const LEGAL_PAGE_BY_SLUG_QUERY = groq`*[
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
}`

// ============================================
// Academia - Cursos
// ============================================

// Lista de cursos publicados para el catálogo
// Usa proyecciones para compatibilidad con campos legacy y nuevos objetos
export const COURSES_QUERY = groq`*[
  _type == "course" &&
  published == true &&
  status == "active"
] | order(displayOrder asc) {
  _id,
  title,
  "slug": slug.current,
  shortDescription,
  ${coverImageProjection},
  courseType,
  ${pricingProjection},
  ${membershipAccessProjection},
  difficulty,
  totalDuration,
  topics,
  instructor,
  featured
}`

// Curso completo con módulos y lecciones
// Usa proyecciones para compatibilidad con campos legacy y nuevos objetos
export const COURSE_BY_SLUG_QUERY = groq`*[_type == "course" && slug.current == $slug][0] {
  ...,
  ${coverImageProjection},
  ${pricingProjection},
  ${membershipAccessProjection},
  ${seoProjection},
  dripEnabled,
  defaultDripDays,
  "hasCertificate": defined(certificate),
  "finalQuizId": finalQuiz->._id,
  requiresFinalQuizToComplete,
  "modules": modules[]-> {
    _id,
    title,
    description,
    order,
    unlockDate,
    "lessons": lessons[]-> {
      _id,
      title,
      "slug": slug.current,
      description,
      order,
      lessonType,
      videoDuration,
      isFreePreview,
      published,
      dripMode,
      dripOffsetDays,
      availableAt,
      "quizId": quiz->._id,
      requiresQuizToComplete,
      "liveSession": liveSession {
        scheduledAt,
        estimatedDuration,
        recordingUrl
      }
    }
  } | order(order asc),
  "simpleLesson": simpleLesson-> {
    _id,
    title,
    "slug": slug.current,
    description,
    lessonType,
    videoDuration,
    isFreePreview,
    published,
    dripMode,
    dripOffsetDays,
    availableAt,
    "quizId": quiz->._id,
    requiresQuizToComplete,
    "liveSession": liveSession {
      scheduledAt,
      estimatedDuration,
      recordingUrl
    }
  }
}`

// Cursos por IDs (para el carrito)
export const COURSES_BY_IDS_QUERY = groq`*[_type == "course" && _id in $ids] {
  _id,
  title,
  "slug": slug.current,
  ${coverImageProjection},
  ${pricingProjection},
  status,
  published
}`

// Cursos destacados
export const FEATURED_COURSES_QUERY = groq`*[
  _type == "course" &&
  published == true &&
  status == "active" &&
  featured == true
] | order(displayOrder asc)[0...4] {
  _id,
  title,
  "slug": slug.current,
  shortDescription,
  ${coverImageProjection},
  ${pricingProjection},
  difficulty,
  totalDuration,
  instructor
}`

// Lección completa con recursos (para el reproductor)
export const LESSON_FULL_QUERY = groq`*[_type == "courseLesson" && slug.current == $slug][0] {
  ...,
  "resources": resources[] {
    title,
    resourceType,
    "fileUrl": file.asset->url,
    "fileName": file.asset->originalFilename,
    externalUrl,
    description
  }
}`

// Lección por ID
export const LESSON_BY_ID_QUERY = groq`*[_type == "courseLesson" && _id == $id][0] {
  ...,
  "resources": resources[] {
    title,
    resourceType,
    "fileUrl": file.asset->url,
    "fileName": file.asset->originalFilename,
    externalUrl,
    description
  }
}`

// ============================================
// Academia - Códigos de Descuento
// ============================================

// Código de descuento por código
export const DISCOUNT_CODE_BY_CODE_QUERY = groq`*[
  _type == "discountCode" &&
  upper(code) == upper($code)
][0] {
  _id,
  code,
  description,
  active,
  discountType,
  discountValue,
  currency,
  usageType,
  maxUses,
  validFrom,
  validUntil,
  minPurchaseAmount,
  "appliesToCourses": appliesToCourses[]-> {
    _id,
    title
  }
}`

// Todos los códigos activos (para admin)
export const DISCOUNT_CODES_QUERY = groq`*[_type == "discountCode"] | order(_createdAt desc) {
  _id,
  code,
  description,
  active,
  discountType,
  discountValue,
  currency,
  usageType,
  maxUses,
  validFrom,
  validUntil,
  minPurchaseAmount,
  "appliesToCourses": appliesToCourses[]-> {
    _id,
    title
  }
}`

// ============================================
// Academia - Quizzes
// ============================================

// Quiz completo (con respuestas - para calificación)
export const QUIZ_FULL_QUERY = groq`*[_type == "quiz" && _id == $id][0] {
  _id,
  title,
  description,
  passingScore,
  maxAttempts,
  retakeDelayHours,
  timeLimit,
  shuffleQuestions,
  shuffleOptions,
  showResultsImmediately,
  "questions": questions[] {
    text,
    type,
    options,
    correctAnswer,
    correctAnswers,
    points,
    explanation
  }
}`

// Quiz para estudiante (sin respuestas correctas)
export const QUIZ_FOR_STUDENT_QUERY = groq`*[_type == "quiz" && _id == $id][0] {
  _id,
  title,
  description,
  passingScore,
  timeLimit,
  shuffleQuestions,
  shuffleOptions,
  showResultsImmediately,
  "questions": questions[] {
    text,
    type,
    options,
    points
  }
}`

// Quiz info básica
export const QUIZ_INFO_QUERY = groq`*[_type == "quiz" && _id == $id][0] {
  _id,
  title,
  passingScore,
  maxAttempts,
  retakeDelayHours,
  timeLimit,
  "totalQuestions": count(questions)
}`

// ============================================
// Academia - Certificados
// ============================================

// Plantilla de certificado por ID
export const CERTIFICATE_TEMPLATE_QUERY = groq`*[_type == "certificate" && _id == $id][0] {
  _id,
  title,
  certificateTitle,
  issuerName,
  issuerTitle,
  "templateImageUrl": templateImage.asset->url,
  "logoImageUrl": logoImage.asset->url,
  "signatureImageUrl": signatureImage.asset->url,
  primaryColor,
  secondaryColor,
  showCourseHours,
  showCompletionDate,
  showQRCode,
  validityDuration,
  customText
}`

// Curso con certificado y quiz final
export const COURSE_WITH_CERTIFICATE_QUERY = groq`*[_type == "course" && _id == $id][0] {
  _id,
  title,
  totalDuration,
  instructor,
  "certificate": certificate-> {
    _id,
    title,
    certificateTitle,
    issuerName,
    issuerTitle,
    "templateImageUrl": templateImage.asset->url,
    "logoImageUrl": logoImage.asset->url,
    "signatureImageUrl": signatureImage.asset->url,
    primaryColor,
    secondaryColor,
    showCourseHours,
    showCompletionDate,
    showQRCode,
    validityDuration,
    customText
  },
  "finalQuiz": finalQuiz-> {
    _id,
    title,
    passingScore
  },
  requiresFinalQuizToComplete
}`

// Curso con quiz/certificado básico (para player)
export const COURSE_QUIZ_CERTIFICATE_INFO_QUERY = groq`*[_type == "course" && _id == $id][0] {
  _id,
  "hasCertificate": defined(certificate),
  "finalQuizId": finalQuiz->._id,
  requiresFinalQuizToComplete,
  "certificateId": certificate->._id
}`

// Lección con quiz
export const LESSON_WITH_QUIZ_QUERY = groq`*[_type == "courseLesson" && _id == $id][0] {
  _id,
  title,
  "quizId": quiz->._id,
  requiresQuizToComplete,
  "quiz": quiz-> {
    _id,
    title,
    passingScore
  }
}`
