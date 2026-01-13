import { auth } from "@/lib/auth"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <>
      <Header session={session} />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
