import { ReactNode } from 'react'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { auth } from '@/lib/auth'

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth()

  return (
    <>
      <Header session={session} />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
