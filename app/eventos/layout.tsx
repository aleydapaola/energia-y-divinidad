import { ReactNode } from 'react'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { auth } from '@/lib/auth'

interface EventosLayoutProps {
  children: ReactNode
}

export default async function EventosLayout({ children }: EventosLayoutProps) {
  const session = await auth()

  return (
    <>
      <Header session={session} />
      <main>{children}</main>
      <Footer />
    </>
  )
}
