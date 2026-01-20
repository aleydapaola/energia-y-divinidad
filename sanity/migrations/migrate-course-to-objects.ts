/**
 * Migración: course → objetos reutilizables
 *
 * Este script migra los cursos existentes para usar los nuevos objetos:
 * - pricing: Agrupa price, priceUSD, memberDiscount en un objeto
 * - membershipAccess: Agrupa includedInMembership, membershipTiers
 *
 * Ejecutar con:
 * cd sanity && npx sanity exec migrations/migrate-course-to-objects.ts --with-user-token
 *
 * Para producción:
 * cd sanity && npx sanity exec migrations/migrate-course-to-objects.ts --with-user-token --dataset production
 */

import { getCliClient } from 'sanity/cli'

interface LegacyCourse {
  _id: string
  title?: string
  price?: number
  priceUSD?: number
  compareAtPrice?: number
  compareAtPriceUSD?: number
  memberDiscount?: number
  isFree?: boolean
  includedInMembership?: boolean
  membershipTiers?: Array<{ _ref: string }>
  pricing?: {
    _type: string
    price?: number
  }
  membershipAccess?: {
    _type: string
    includedInMembership?: boolean
  }
}

const client = getCliClient()

async function migrateCourses() {
  console.log('🔍 Buscando cursos para migrar...')

  const courses = await client.fetch<LegacyCourse[]>(`*[_type == "course"]`)
  console.log(`📦 Encontrados ${courses.length} cursos`)

  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const course of courses) {
    const patch = client.patch(course._id)
    let hasChanges = false

    // Verificar si ya tiene los objetos migrados
    const alreadyHasPricing = course.pricing?._type === 'pricing'
    const alreadyHasMembershipAccess = course.membershipAccess?._type === 'membershipAccess'

    // Migrar pricing si hay campos legacy y no está migrado
    if (!alreadyHasPricing && (course.price !== undefined || course.priceUSD !== undefined)) {
      patch.set({
        pricing: {
          _type: 'pricing',
          price: course.price || 0,
          priceUSD: course.priceUSD || 0,
          compareAtPrice: course.compareAtPrice,
          compareAtPriceUSD: course.compareAtPriceUSD,
          memberDiscount: course.memberDiscount || 0,
          isFree: course.isFree || false,
        },
      })
      hasChanges = true
    }

    // Migrar membershipAccess si hay campos legacy y no está migrado
    if (!alreadyHasMembershipAccess && course.includedInMembership !== undefined) {
      patch.set({
        membershipAccess: {
          _type: 'membershipAccess',
          includedInMembership: course.includedInMembership || false,
          membershipTiers: course.membershipTiers || [],
          memberOnlyPurchase: false,
        },
      })
      hasChanges = true
    }

    if (hasChanges) {
      try {
        await patch.commit()
        console.log(`✓ Migrado: ${course.title || course._id}`)
        migratedCount++
      } catch (error) {
        console.error(`✗ Error migrando ${course._id}:`, error)
        errorCount++
      }
    } else {
      console.log(`⏭ Omitido (ya migrado o sin campos legacy): ${course.title || course._id}`)
      skippedCount++
    }
  }

  console.log('\n📊 Resumen de migración:')
  console.log(`   ✓ Migrados: ${migratedCount}`)
  console.log(`   ⏭ Omitidos: ${skippedCount}`)
  console.log(`   ✗ Errores: ${errorCount}`)
  console.log('\n✅ Migración completada!')
}

migrateCourses().catch(console.error)
