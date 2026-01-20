'use client'

import { Check, X, Trophy, RotateCcw, Award } from 'lucide-react'
import Link from 'next/link'

interface GradedAnswer {
  questionIndex: number
  questionText: string
  selectedAnswer: string | string[]
  correctAnswer: string | string[]
  correct: boolean
  points: number
  earnedPoints: number
  explanation?: string
}

interface QuizResultsProps {
  score: number
  passed: boolean
  totalPoints: number
  earnedPoints: number
  passingScore: number
  answers: GradedAnswer[]
  timeSpent: number
  canRetake: boolean
  onRetake?: () => void
  courseSlug: string
  showCertificateCTA?: boolean
  onGetCertificate?: () => void
}

export function QuizResults({
  score,
  passed,
  totalPoints,
  earnedPoints,
  passingScore,
  answers,
  timeSpent,
  canRetake,
  onRetake,
  courseSlug,
  showCertificateCTA = false,
  onGetCertificate,
}: QuizResultsProps) {
  // Format time spent
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const correctCount = answers.filter((a) => a.correct).length

  return (
    <div className="space-y-8">
      {/* Score Card */}
      <div
        className={`
          p-8 rounded-2xl text-center
          ${passed ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}
        `}
      >
        {passed ? (
          <Trophy className="h-16 w-16 mx-auto text-green-500 mb-4" />
        ) : (
          <X className="h-16 w-16 mx-auto text-red-500 mb-4" />
        )}

        <h2
          className={`
            font-gazeta text-3xl mb-2
            ${passed ? 'text-green-700' : 'text-red-700'}
          `}
        >
          {passed ? '¡Felicitaciones!' : 'No aprobaste'}
        </h2>

        <p
          className={`
            font-dm-sans text-lg mb-6
            ${passed ? 'text-green-600' : 'text-red-600'}
          `}
        >
          {passed
            ? 'Has aprobado el quiz exitosamente'
            : `Necesitas ${passingScore}% para aprobar`}
        </p>

        {/* Score display */}
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div
              className={`
                text-5xl font-dm-sans font-bold
                ${passed ? 'text-green-600' : 'text-red-600'}
              `}
            >
              {Math.round(score)}%
            </div>
            <div className="text-sm text-gray-500">Tu puntuación</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-dm-sans font-bold text-gray-400">
              {earnedPoints}/{totalPoints}
            </div>
            <div className="text-sm text-gray-500">Puntos</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 text-sm text-gray-500">
          <div>
            <Check className="h-4 w-4 inline mr-1 text-green-500" />
            {correctCount} correctas
          </div>
          <div>
            <X className="h-4 w-4 inline mr-1 text-red-500" />
            {answers.length - correctCount} incorrectas
          </div>
          <div>Tiempo: {formatTime(timeSpent)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {!passed && canRetake && onRetake && (
          <button
            onClick={onRetake}
            className="flex items-center justify-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <RotateCcw className="h-5 w-5" />
            Intentar de nuevo
          </button>
        )}

        {passed && showCertificateCTA && onGetCertificate && (
          <button
            onClick={onGetCertificate}
            className="flex items-center justify-center gap-2 bg-[#8A4BAF] hover:bg-[#7a3f9e] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Award className="h-5 w-5" />
            Obtener Certificado
          </button>
        )}

        <Link
          href={`/academia/${courseSlug}/reproducir`}
          className="flex items-center justify-center gap-2 border-2 border-gray-300 hover:border-[#4944a4] text-gray-700 hover:text-[#4944a4] font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Volver al curso
        </Link>
      </div>

      {/* Detailed results */}
      <div className="space-y-4">
        <h3 className="font-gazeta text-xl text-[#654177]">Detalle de respuestas</h3>

        {answers.map((answer, index) => (
          <div
            key={index}
            className={`
              p-4 rounded-lg border
              ${answer.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
            `}
          >
            <div className="flex items-start gap-3">
              <div
                className={`
                  flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                  ${answer.correct ? 'bg-green-500' : 'bg-red-500'}
                `}
              >
                {answer.correct ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <X className="h-4 w-4 text-white" />
                )}
              </div>

              <div className="flex-1">
                <p className="font-dm-sans font-medium text-gray-800 mb-2">
                  {index + 1}. {answer.questionText}
                </p>

                <div className="space-y-1 text-sm">
                  <p className={answer.correct ? 'text-green-700' : 'text-red-700'}>
                    <strong>Tu respuesta:</strong>{' '}
                    {Array.isArray(answer.selectedAnswer)
                      ? answer.selectedAnswer.join(', ')
                      : answer.selectedAnswer || 'Sin respuesta'}
                  </p>

                  {!answer.correct && (
                    <p className="text-green-700">
                      <strong>Respuesta correcta:</strong>{' '}
                      {Array.isArray(answer.correctAnswer)
                        ? answer.correctAnswer.join(', ')
                        : answer.correctAnswer}
                    </p>
                  )}

                  {answer.explanation && (
                    <p className="text-gray-600 mt-2 italic">{answer.explanation}</p>
                  )}

                  <p className="text-gray-500">
                    {answer.earnedPoints}/{answer.points} puntos
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
