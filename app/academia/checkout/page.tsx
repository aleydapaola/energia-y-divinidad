import { Metadata } from 'next'

import { AcademiaCheckoutClient } from './AcademiaCheckoutClient'

export const metadata: Metadata = {
  title: 'Checkout | Academia',
  description: 'Completa tu compra de cursos en Academia Energía y Divinidad',
}

export default function AcademiaCheckoutPage() {
  return <AcademiaCheckoutClient />
}
