import { config } from 'dotenv'
config({ path: '.env.local' })

import { sendPaymentConfirmationEmail } from '../lib/email'

async function main() {
  console.log('Enviando email de prueba de confirmación de pago...')

  const result = await sendPaymentConfirmationEmail({
    email: 'xmonfau@gmail.com',
    name: 'Xavier Monfort Faure',
    orderNumber: 'EYD-TEST-2026-001',
    orderType: 'SESSION',
    itemName: 'Sesión de Canalización Individual',
    amount: 150000,
    currency: 'COP',
    paymentMethod: 'WOMPI_CARD',
    transactionId: 'TEST-TXN-123456789',
  })

  if (result.success) {
    console.log('✅ Email enviado correctamente!')
    console.log('ID:', result.data?.id)
  } else {
    console.error('❌ Error enviando email:', result.error)
  }
}

main().catch(console.error)
