import event from './event'
import sessionConfig from './sessionConfig'
import blogPost from './blogPost'
import product from './product'
import freeContent from './freeContent'
import premiumContent from './premiumContent'
import membershipTier from './membershipTier'
import membershipPost from './membershipPost'
import page from './page'

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

  // Páginas Estáticas
  page,
]
