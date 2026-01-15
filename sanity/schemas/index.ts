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
import discountCode from './discountCode'

export const schemaTypes = [
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
  discountCode,

  // Páginas Estáticas
  page,
]
