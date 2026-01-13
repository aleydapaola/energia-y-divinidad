import { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

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
