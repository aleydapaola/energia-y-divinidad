import { Suspense } from 'react'
import PackSuccessContent from './PackSuccessContent'

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f0f5] px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8A4BAF] mx-auto mb-4"></div>
        <p className="text-[#654177]">
          Procesando tu compra...
        </p>
      </div>
    </div>
  )
}

export default function PackSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PackSuccessContent />
    </Suspense>
  )
}
