import { prisma } from '../lib/prisma'
import { randomBytes } from 'crypto'

async function main() {
  const email = process.argv[2] || 'energiaydivinidad.test+checkout01@gmail.com'

  console.log(`Buscando usuario: ${email}`)

  // Buscar usuario
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, password: true, emailVerified: true }
  })

  if (!user) {
    console.log('❌ Usuario no encontrado')
    process.exit(1)
  }

  console.log('\n📧 Usuario encontrado:')
  console.log(`   ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Nombre: ${user.name || '(sin nombre)'}`)
  console.log(`   Tiene contraseña: ${user.password ? 'Sí' : 'No'}`)
  console.log(`   Email verificado: ${user.emailVerified ? 'Sí' : 'No'}`)

  if (user.password) {
    console.log('\n✅ Este usuario ya tiene contraseña establecida.')
    console.log('   Puede iniciar sesión normalmente en /auth/signin')
    process.exit(0)
  }

  // Buscar y eliminar tokens existentes
  const existingTokens = await prisma.verificationToken.findMany({
    where: { identifier: email.toLowerCase() }
  })

  if (existingTokens.length > 0) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: email.toLowerCase() }
    })
    console.log(`\n🗑️  ${existingTokens.length} token(s) antiguo(s) eliminado(s)`)
  }

  // Crear nuevo token
  const newToken = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días

  await prisma.verificationToken.create({
    data: {
      identifier: email.toLowerCase(),
      token: newToken,
      expires: expires
    }
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  console.log('\n' + '='.repeat(60))
  console.log('🔐 NUEVO TOKEN GENERADO')
  console.log('='.repeat(60))
  console.log('\nEnlace para establecer contraseña:')
  console.log(`\n${baseUrl}/auth/set-password?token=${newToken}`)
  console.log(`\nExpira: ${expires.toLocaleString('es-CO')}`)
  console.log('='.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
