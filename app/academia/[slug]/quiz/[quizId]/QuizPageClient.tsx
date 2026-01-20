'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Clock, RotateCcw } from 'lucide-react'
import { QuizContainer } from '@/components/academia/quiz'

interface QuizData {
  _id: string
  title: string
  description?: string
  passingScore: number
  timeLimit?: number
  showResultsImmediately?: boolean
  questions: Array<{
    text: string
    type: 'multiple_choice' | 'true_false' | 'multiple_select'
    options?: string[]
    points: number
  }>
  totalQuestions: number
  totalPoints: number
}

interface QuizPageClientProps {
  quiz: QuizData
  courseId: string
  courseSlug: string
  lessonId?: string
  canTake: boolean
  canTakeReason?: string
  attemptsUsed?: number
  maxAttempts?: number
  nextAttemptAt?: Date | string
  showCertificateCTA: boolean
}

export function QuizPageClient({
  quiz,
  courseId,
  courseSlug,
  lessonId,
  canTake,
  canTakeReason,
  attemptsUsed,
  maxAttempts,
  nextAttemptAt,
  showCertificateCTA,
}: QuizPageClientProps) {
  const router = useRouter()
  const [isStarted, setIsStarted] = useState(false)

  const handleComplete = () => {
    // Refresh the page data when quiz is completed
    router.refresh()
  }

  const handleGetCertificate = () => {
    router.push(`/academia/${courseSlug}/reproducir`)
  }

  // If cannot take quiz
  if (!canTake) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-8 text-center">
        <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />

        {canTakeReason === 'max_attempts_reached' && (
          <>
            <h2 className="font-gazeta text-2xl text-amber-700 mb-2">
              Máximo de intentos alcanzado
            </h2>
            <p className="font-dm-sans text-gray-600">
              Has usado todos tus intentos para este quiz.
              {maxAttempts && (
                <span className="block mt-2">
                  Intentos: {attemptsUsed} de {maxAttempts}
                </span>
              )}
            </p>
          </>
        )}

        {canTakeReason === 'retake_delay' && nextAttemptAt && (
          <>
            <h2 className="font-gazeta text-2xl text-amber-700 mb-2">
              Debes esperar para reintentar
            </h2>
            <p className="font-dm-sans text-gray-600 mb-4">
              Podrás intentar de nuevo a partir de:
            </p>
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-dm-sans font-medium">
              <Clock className="h-5 w-5" />
              {new Date(nextAttemptAt).toLocaleString('es-CO', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </div>
          </>
        )}

        <div className="mt-6">
          <button
            onClick={() => router.push(`/academia/${courseSlug}/reproducir`)}
            className="inline-flex items-center gap-2 border-2 border-gray-300 hover:border-[#4944a4] text-gray-700 hover:text-[#4944a4] font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Volver al curso
          </button>
        </div>
      </div>
    )
  }

  // Start screen
  if (!isStarted) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="font-gazeta text-3xl text-[#654177] mb-4">{quiz.title}</h1>

          {quiz.description && (
            <p className="font-dm-sans text-gray-600 mb-6">{quiz.description}</p>
          )}

          {/* Quiz Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-dm-sans text-2xl font-bold text-[#8A4BAF]">
                {quiz.totalQuestions}
              </div>
              <div className="font-dm-sans text-sm text-gray-500">Preguntas</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-dm-sans text-2xl font-bold text-[#8A4BAF]">
                {quiz.passingScore}%
              </div>
              <div className="font-dm-sans text-sm text-gray-500">Para aprobar</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-dm-sans text-2xl font-bold text-[#8A4BAF]">
                {quiz.totalPoints}
              </div>
              <div className="font-dm-sans text-sm text-gray-500">Puntos</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-dm-sans text-2xl font-bold text-[#8A4BAF]">
                {quiz.timeLimit ? `${quiz.timeLimit} min` : '∞'}
              </div>
              <div className="font-dm-sans text-sm text-gray-500">Tiempo</div>
            </div>
          </div>

          {/* Attempts info */}
          {maxAttempts && (
            <p className="font-dm-sans text-sm text-gray-500 mb-6">
              Intentos disponibles: {maxAttempts - (attemptsUsed || 0)} de {maxAttempts}
            </p>
          )}

          {/* Warning if has time limit */}
          {quiz.timeLimit && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="font-dm-sans text-amber-700 text-sm">
                <strong>⏱️ Nota:</strong> Este quiz tiene un límite de tiempo de{' '}
                {quiz.timeLimit} minutos. Una vez que comiences, el temporizador no
                se puede pausar.
              </p>
            </div>
          )}

          <button
            onClick={() => setIsStarted(true)}
            className="inline-flex items-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
          >
            Comenzar Quiz
          </button>
        </div>
      </div>
    )
  }

  // Quiz in progress
  return (
    <QuizContainer
      quiz={quiz}
      courseId={courseId}
      courseSlug={courseSlug}
      lessonId={lessonId}
      canRetake={
        maxAttempts ? (attemptsUsed || 0) + 1 < maxAttempts : true
      }
      onComplete={handleComplete}
      showCertificateCTA={showCertificateCTA}
      onGetCertificate={handleGetCertificate}
    />
  )
}
