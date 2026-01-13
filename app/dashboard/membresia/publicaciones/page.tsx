import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { PostsFeed } from '@/components/membership/posts-feed'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Publicaciones | Membresía',
  description: 'Feed exclusivo de publicaciones para miembros',
}

export default async function PublicacionesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  return (
    <div>
      {/* Header de la sección */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-[#e8d5e0]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-gazeta text-3xl sm:text-4xl text-[#8A4BAF] mb-2">
              Publicaciones
            </h1>
            <p className="text-[#654177]/70 font-dm-sans">
              Lo más reciente de tu membresía
            </p>
          </div>
        </div>
      </div>

      {/* Feed de publicaciones */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
          </div>
        }
      >
        <PostsFeed userId={session.user.id} />
      </Suspense>
    </div>
  )
}
