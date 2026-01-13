import event from './event'
import session from './session'
import blogPost from './blogPost'
import product from './product'
import freeContent from './freeContent'
import premiumContent from './premiumContent'
import membershipTier from './membershipTier'
import membershipPost from './membershipPost'
import page from './page'
import bookingSettings from './bookingSettings'

export const schemaTypes = [
  // Eventos y Sesiones
  event,
  session,

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

  // Configuración
  bookingSettings,
]
