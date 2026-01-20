'use client'

interface QuizProgressProps {
  currentQuestion: number
  totalQuestions: number
  answeredQuestions: number[]
}

export function QuizProgress({
  currentQuestion,
  totalQuestions,
  answeredQuestions,
}: QuizProgressProps) {
  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#4944a4] to-[#8A4BAF] rounded-full transition-all duration-300"
          style={{
            width: `${(answeredQuestions.length / totalQuestions) * 100}%`,
          }}
        />
      </div>

      {/* Question dots */}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: totalQuestions }, (_, i) => (
          <div
            key={i}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-dm-sans font-medium
              transition-all duration-200
              ${
                i === currentQuestion
                  ? 'bg-[#4944a4] text-white ring-2 ring-[#4944a4]/30'
                  : answeredQuestions.includes(i)
                    ? 'bg-[#8A4BAF]/20 text-[#8A4BAF]'
                    : 'bg-gray-100 text-gray-400'
              }
            `}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Progress text */}
      <p className="text-sm text-gray-500 font-dm-sans">
        {answeredQuestions.length} de {totalQuestions} preguntas respondidas
      </p>
    </div>
  )
}
