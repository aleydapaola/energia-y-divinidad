/**
 * Migración: page → objetos reutilizables
 *
 * Este script migra las páginas existentes para usar el nuevo tipo seo
 * y extrae keywords como campo separado.
 *
 * Ejecutar con:
 * cd sanity && npx sanity exec migrations/migrate-page-to-objects.ts --with-user-token
 *
 * Para producción:
 * cd sanity && npx sanity exec migrations/migrate-page-to-objects.ts --with-user-token --dataset production
 */

import { getCliClient } from 'sanity/cli'

interface LegacyPage {
  _id: string
  title?: string
  seo?: {
    _type?: string
    metaTitle?: string
    metaDescription?: string
    keywords?: string[]
    ogImage?: {
      asset?: { _ref: string }
    }
  }
  keywords?: string[]
}

const client = getCliClient()

async function migratePages() {
  console.log('🔍 Buscando páginas para migrar...')

  const pages = await client.fetch<LegacyPage[]>(`*[_type == "page"]`)
  console.log(`📦 Encontradas ${pages.length} páginas`)

  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const page of pages) {
    const patch = client.patch(page._id)
    let hasChanges = false

    // Verificar si ya tiene el objeto seo migrado (con _type)
    const alreadyMigrated = page.seo?._type === 'seo'

    // Migrar SEO si tiene el formato inline (sin _type)
    if (!alreadyMigrated && page.seo && !page.seo._type) {
      // Extraer keywords a campo separado si existen
      if (page.seo.keywords && page.seo.keywords.length > 0 && !page.keywords) {
        patch.set({
          keywords: page.seo.keywords,
        })
        hasChanges = true
      }

      // Actualizar SEO con el _type correcto
      patch.set({
        seo: {
          _type: 'seo',
          metaTitle: page.seo.metaTitle,
          metaDescription: page.seo.metaDescription,
          ogImage: page.seo.ogImage,
        },
      })
      hasChanges = true
    }

    if (hasChanges) {
      try {
        await patch.commit()
        console.log(`✓ Migrado: ${page.title || page._id}`)
        migratedCount++
      } catch (error) {
        console.error(`✗ Error migrando ${page._id}:`, error)
        errorCount++
      }
    } else {
      console.log(`⏭ Omitido (ya migrado o sin datos): ${page.title || page._id}`)
      skippedCount++
    }
  }

  console.log('\n📊 Resumen de migración:')
  console.log(`   ✓ Migrados: ${migratedCount}`)
  console.log(`   ⏭ Omitidos: ${skippedCount}`)
  console.log(`   ✗ Errores: ${errorCount}`)
  console.log('\n✅ Migración completada!')
}

migratePages().catch(console.error)
