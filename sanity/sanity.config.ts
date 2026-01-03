import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Energía y Divinidad - CMS',

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,

  basePath: '/studio',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Contenido')
          .items([
            // Sección de Servicios
            S.listItem()
              .title('📅 Servicios')
              .child(
                S.list()
                  .title('Servicios')
                  .items([
                    S.listItem()
                      .title('Eventos Grupales')
                      .icon(() => '📅')
                      .child(
                        S.documentTypeList('event')
                          .title('Eventos Grupales')
                      ),
                    S.listItem()
                      .title('Sesiones 1:1')
                      .icon(() => '🔮')
                      .child(
                        S.documentTypeList('session')
                          .title('Sesiones 1:1')
                      ),
                  ])
              ),

            // Divisor
            S.divider(),

            // Sección de Contenido
            S.listItem()
              .title('📝 Contenido')
              .child(
                S.list()
                  .title('Contenido')
                  .items([
                    S.listItem()
                      .title('Artículos del Blog')
                      .icon(() => '📝')
                      .child(
                        S.documentTypeList('blogPost')
                          .title('Artículos del Blog')
                      ),
                    S.listItem()
                      .title('Contenido Premium')
                      .icon(() => '👑')
                      .child(
                        S.documentTypeList('premiumContent')
                          .title('Contenido Premium')
                      ),
                  ])
              ),

            // Divisor
            S.divider(),

            // Productos
            S.listItem()
              .title('🛍️ Productos')
              .icon(() => '🛍️')
              .child(
                S.documentTypeList('product')
                  .title('Productos')
              ),

            // Divisor
            S.divider(),

            // Membresías
            S.listItem()
              .title('💎 Membresías')
              .icon(() => '💎')
              .child(
                S.documentTypeList('membershipTier')
                  .title('Niveles de Membresía')
              ),

            // Divisor
            S.divider(),

            // Páginas
            S.listItem()
              .title('📄 Páginas')
              .icon(() => '📄')
              .child(
                S.documentTypeList('page')
                  .title('Páginas')
              ),
          ])
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  // Configuración en español
  document: {
    newDocumentOptions: (prev, { creationContext }) => {
      if (creationContext.type === 'global') {
        return prev.filter(
          (templateItem) => templateItem.templateId !== '__initial__'
        )
      }
      return prev
    },
  },
})
