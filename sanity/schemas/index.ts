import event from './event'
import session from './session'
import blogPost from './blogPost'
import product from './product'
import premiumContent from './premiumContent'
import membershipTier from './membershipTier'
import page from './page'

export const schemaTypes = [
  // Eventos y Sesiones
  event,
  session,

  // Contenido
  blogPost,
  product,
  premiumContent,

  // Membresías
  membershipTier,

  // Páginas Estáticas
  page,
]
