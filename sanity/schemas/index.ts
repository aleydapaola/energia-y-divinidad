// Objetos reutilizables
import seo from './objects/seo'
import pricing from './objects/pricing'
import membershipAccess from './objects/membershipAccess'
import coverImage from './objects/coverImage'
import videoEmbed from './objects/videoEmbed'
import displaySettings from './objects/displaySettings'

import event from './event'
import sessionConfig from './sessionConfig'
import blogPost from './blogPost'
import product from './product'
import freeContent from './freeContent'
import premiumContent from './premiumContent'
import membershipTier from './membershipTier'
import membershipPost from './membershipPost'
import page from './page'

// Academia
import course from './course'
import courseModule from './courseModule'
import courseLesson from './courseLesson'
import courseResource from './courseResource'
import quiz from './quiz'
import certificate from './certificate'
import discountCode from './discountCode'

export const schemaTypes = [
  // Objetos reutilizables (deben ir primero)
  seo,
  pricing,
  membershipAccess,
  coverImage,
  videoEmbed,
  displaySettings,

  // Sesiones (configuración unificada)
  sessionConfig,

  // Eventos
  event,

  // Contenido
  blogPost,
  freeContent,
  premiumContent,
  product,

  // Membresías
  membershipTier,
  membershipPost,

  // Academia
  course,
  courseModule,
  courseLesson,
  courseResource,
  quiz,
  certificate,
  discountCode,

  // Páginas Estáticas
  page,
]
