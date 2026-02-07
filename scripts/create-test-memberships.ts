/**
 * Script para crear planes de membresía de prueba en Sanity
 *
 * Ejecutar con: npx ts-node scripts/create-test-memberships.ts
 */

import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const token = process.env.SANITY_API_TOKEN

console.log('📌 Proyecto Sanity:', projectId)
console.log('🔑 Token presente:', token ? 'Sí (' + token.substring(0, 10) + '...)' : 'No')

if (!projectId || !token) {
  console.error('❌ Falta NEXT_PUBLIC_SANITY_PROJECT_ID o SANITY_API_TOKEN en .env.local')
  process.exit(1)
}

const client = createClient({
  projectId: projectId,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: token,
  useCdn: false,
})

// Helper para crear bloques de texto
function createBlock(text: string, key: string) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: `${key}-span`,
        text: text,
        marks: [],
      },
    ],
    markDefs: [],
  }
}

// Helper para crear características
function createFeature(feature: string, description: string, included: boolean, key: string) {
  return {
    _type: 'object',
    _key: key,
    feature,
    description,
    included,
  }
}

const membershipTiers: any[] = [
  // NIVEL 1: Esencia - Plan básico (rosa/magenta)
  {
    _type: 'membershipTier',
    _id: 'membership-esencia',
    name: 'Esencia',
    slug: { _type: 'slug', current: 'esencia' },
    tierLevel: 1,
    tagline: 'Comienza tu camino espiritual',
    description: [
      createBlock('El primer paso hacia tu transformación espiritual. Accede a meditaciones guiadas, contenido exclusivo y una comunidad de apoyo.', 'd1'),
    ],
    color: '#C77DBA',
    pricing: {
      monthlyPrice: 49000,
      monthlyPriceUSD: 12,
      yearlyPrice: 490000,
      yearlyPriceUSD: 120,
      yearlyDiscount: 17,
    },
    features: [
      createFeature('Biblioteca de meditaciones', 'Acceso a +50 meditaciones guiadas', true, 'f1'),
      createFeature('Contenido mensual nuevo', 'Nuevas meditaciones cada mes', true, 'f2'),
      createFeature('Comunidad privada', 'Grupo de WhatsApp con otras miembros', true, 'f3'),
      createFeature('Eventos en vivo', 'Acceso a círculos de meditación mensuales', false, 'f4'),
      createFeature('Descuento en sesiones', 'Descuento en sesiones 1:1', false, 'f5'),
      createFeature('Cursos premium', 'Acceso a cursos de la Academia', false, 'f6'),
    ],
    benefits: {
      premiumContent: true,
      liveEvents: false,
      recordedEvents: false,
      sessionDiscount: 0,
      productDiscount: 5,
      prioritySupport: false,
      privateGroup: true,
      monthlyLiveSession: false,
      oneOnOneSessionsIncluded: 0,
    },
    limitations: {
      maxDownloadsPerMonth: 10,
      maxStorageGB: 0,
    },
    trialPeriod: {
      enabled: true,
      durationDays: 7,
      requiresPaymentMethod: false,
    },
    recommendedFor: [
      'Personas que comienzan en la meditación',
      'Quienes buscan apoyo en su práctica diaria',
      'Personas con poco tiempo disponible',
    ],
    popularityBadge: 'none',
    displayOrder: 1,
    ctaButtonText: 'Comenzar Prueba Gratis',
    active: true,
    featured: false,
  },

  // NIVEL 2: Divinidad - Plan premium (azul profundo)
  {
    _type: 'membershipTier',
    _id: 'membership-divinidad',
    name: 'Divinidad',
    slug: { _type: 'slug', current: 'divinidad' },
    tierLevel: 2,
    tagline: 'Tu transformación completa',
    description: [
      createBlock('La experiencia más completa y personalizada. Incluye sesiones 1:1 mensuales, acceso total a la Academia y los mayores descuentos. Para quienes buscan un acompañamiento profundo.', 'd1'),
    ],
    color: '#5C4D9B',
    pricing: {
      monthlyPrice: 297000,
      monthlyPriceUSD: 75,
      yearlyPrice: 2970000,
      yearlyPriceUSD: 750,
      yearlyDiscount: 17,
    },
    features: [
      createFeature('Todo de Esencia', 'Incluye todos los beneficios del plan Esencia', true, 'f1'),
      createFeature('1 sesión 1:1 mensual', 'Sesión de canalización individual incluida', true, 'f2'),
      createFeature('Todos los cursos', 'Acceso completo a la Academia sin costo adicional', true, 'f3'),
      createFeature('30% descuento en sesiones extra', 'El mayor descuento en sesiones adicionales', true, 'f4'),
      createFeature('Soporte prioritario', 'Respuestas en menos de 12 horas', true, 'f5'),
      createFeature('Acceso anticipado', 'Conoce contenido y eventos antes que nadie', true, 'f6'),
      createFeature('Grupo VIP', 'Comunidad exclusiva de miembros Divinidad', true, 'f7'),
    ],
    benefits: {
      premiumContent: true,
      liveEvents: true,
      recordedEvents: true,
      sessionDiscount: 30,
      productDiscount: 20,
      prioritySupport: true,
      privateGroup: true,
      monthlyLiveSession: true,
      oneOnOneSessionsIncluded: 1,
    },
    limitations: {
      maxDownloadsPerMonth: 0,
      maxStorageGB: 0,
    },
    trialPeriod: {
      enabled: false,
      durationDays: 0,
      requiresPaymentMethod: false,
    },
    recommendedFor: [
      'Quienes buscan transformación profunda',
      'Personas que valoran el acompañamiento personalizado',
      'Practicantes avanzados comprometidos con su evolución',
    ],
    popularityBadge: 'best_value',
    displayOrder: 2,
    ctaButtonText: 'Transformarme Ahora',
    active: true,
    featured: false,
  },
]

async function createTestMemberships() {
  console.log('💎 Creando planes de membresía de prueba en Sanity...\n')

  try {
    for (const tier of membershipTiers) {
      console.log(`  📝 Creando: ${tier.name}...`)

      await client.createOrReplace(tier)

      const badge = tier.popularityBadge === 'popular' ? '🔥 Más Popular' :
                    tier.popularityBadge === 'best_value' ? '💎 Mejor Valor' : ''

      console.log(`     ✅ Creado - Nivel ${tier.tierLevel}`)
      console.log(`        Precio mensual: $${tier.pricing.monthlyPrice?.toLocaleString('es-CO')} COP / $${tier.pricing.monthlyPriceUSD} USD`)
      console.log(`        Precio anual: $${tier.pricing.yearlyPrice?.toLocaleString('es-CO')} COP / $${tier.pricing.yearlyPriceUSD} USD`)
      if (badge) console.log(`        Insignia: ${badge}`)
      console.log('')
    }

    console.log('🎉 ¡Todos los planes de membresía han sido creados!')
    console.log('\n📋 Resumen:')
    console.log(`   - ${membershipTiers.length} planes de membresía creados:`)
    console.log('')
    console.log('   ┌─────────────┬───────────────┬──────────────┬───────────────┐')
    console.log('   │ Plan        │ Mensual COP   │ Mensual USD  │ Insignia      │')
    console.log('   ├─────────────┼───────────────┼──────────────┼───────────────┤')
    console.log('   │ Esencia     │ $49.000       │ $12          │               │')
    console.log('   │ Divinidad   │ $297.000      │ $75          │ 💎 Mejor Valor │')
    console.log('   └─────────────┴───────────────┴──────────────┴───────────────┘')
    console.log('')
    console.log('✨ Puedes ver y editar los planes en Sanity Studio > Niveles de Membresía')

  } catch (error) {
    console.error('❌ Error al crear planes de membresía:', error)
    process.exit(1)
  }
}

createTestMemberships()
