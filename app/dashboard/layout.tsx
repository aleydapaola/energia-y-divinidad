import { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

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
