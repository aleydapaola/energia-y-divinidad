import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getMembershipPostBySlug } from '@/lib/sanity/queries/membership'
import { getPostEngagement } from '@/lib/membership-posts'
import { PostDetailView } from '@/components/membership/post-detail-view'
import { Loader2 } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const post = await getMembershipPostBySlug(slug)

  if (!post) {
    return {
      title: 'Publicación no encontrada',
    }
  }

  return {
    title: `${post.title} | Membresía`,
    description: post.excerpt || 'Contenido exclusivo para miembros',
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  // Obtener post desde Sanity
  const post = await getMembershipPostBySlug(slug)

  if (!post) {
    notFound()
  }

  // Obtener engagement desde Prisma
  const engagement = await getPostEngagement(post._id, session.user.id)

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      }
    >
      <PostDetailView
        post={post}
        engagement={engagement}
        userId={session.user.id}
      />
    </Suspense>
  )
}
