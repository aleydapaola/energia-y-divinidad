'use client'

import { Check, X } from 'lucide-react'
import { useState } from 'react'

interface QuizQuestionProps {
  questionNumber: number
  totalQuestions: number
  question: {
    text: string
    type: 'multiple_choice' | 'true_false' | 'multiple_select'
    options?: string[]
    points: number
  }
  selectedAnswer: string | string[] | null
  onAnswer: (answer: string | string[]) => void
  showResult?: boolean
  isCorrect?: boolean
  correctAnswer?: string | string[]
  explanation?: string
}

export function QuizQuestion({
  questionNumber,
  totalQuestions,
  question,
  selectedAnswer,
  onAnswer,
  showResult = false,
  isCorrect,
  correctAnswer,
  explanation,
}: QuizQuestionProps) {
  // Get options for the question type
  const options =
    question.type === 'true_false'
      ? ['Verdadero', 'Falso']
      : question.options || []

  // Handle answer selection
  const handleSelect = (option: string) => {
    if (showResult) {return} // Don't allow changes after showing result

    if (question.type === 'multiple_select') {
      const currentAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : []
      if (currentAnswers.includes(option)) {
        onAnswer(currentAnswers.filter((a) => a !== option))
      } else {
        onAnswer([...currentAnswers, option])
      }
    } else {
      // For true_false, convert to the expected format
      if (question.type === 'true_false') {
        onAnswer(option === 'Verdadero' ? 'true' : 'false')
      } else {
        onAnswer(option)
      }
    }
  }

  // Check if an option is selected
  const isSelected = (option: string) => {
    if (question.type === 'true_false') {
      const boolValue = option === 'Verdadero' ? 'true' : 'false'
      return selectedAnswer === boolValue
    }
    if (question.type === 'multiple_select' && Array.isArray(selectedAnswer)) {
      return selectedAnswer.includes(option)
    }
    return selectedAnswer === option
  }

  // Check if an option is the correct answer
  const isCorrectOption = (option: string) => {
    if (!showResult || !correctAnswer) {return false}
    if (question.type === 'true_false') {
      const boolValue = option === 'Verdadero' ? 'true' : 'false'
      return correctAnswer === boolValue
    }
    if (Array.isArray(correctAnswer)) {
      return correctAnswer.includes(option)
    }
    return correctAnswer === option
  }

  return (
    <div className="space-y-6">
      {/* Question header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-dm-sans">
          Pregunta {questionNumber} de {totalQuestions}
        </span>
        <span className="text-sm text-[#8A4BAF] font-dm-sans font-medium">
          {question.points} {question.points === 1 ? 'punto' : 'puntos'}
        </span>
      </div>

      {/* Question text */}
      <h2 className="font-gazeta text-xl text-[#654177]">{question.text}</h2>

      {/* Instructions for multiple select */}
      {question.type === 'multiple_select' && !showResult && (
        <p className="text-sm text-gray-500 italic">
          Selecciona todas las respuestas correctas
        </p>
      )}

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, index) => {
          const selected = isSelected(option)
          const correct = isCorrectOption(option)
          const showCorrect = showResult && correct
          const showWrong = showResult && selected && !correct

          return (
            <button
              key={index}
              onClick={() => handleSelect(option)}
              disabled={showResult}
              className={`
                w-full p-4 text-left rounded-lg border-2 transition-all
                font-dm-sans
                ${
                  showCorrect
                    ? 'border-green-500 bg-green-50'
                    : showWrong
                      ? 'border-red-500 bg-red-50'
                      : selected
                        ? 'border-[#4944a4] bg-[#4944a4]/5'
                        : 'border-gray-200 hover:border-[#4944a4]/50 hover:bg-gray-50'
                }
                ${showResult ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox/Radio indicator */}
                <div
                  className={`
                    flex-shrink-0 w-6 h-6 rounded-${question.type === 'multiple_select' ? 'md' : 'full'}
                    border-2 flex items-center justify-center
                    ${
                      showCorrect
                        ? 'border-green-500 bg-green-500'
                        : showWrong
                          ? 'border-red-500 bg-red-500'
                          : selected
                            ? 'border-[#4944a4] bg-[#4944a4]'
                            : 'border-gray-300'
                    }
                  `}
                >
                  {(selected || showCorrect) && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                  {showWrong && <X className="h-4 w-4 text-white" />}
                </div>

                {/* Option text */}
                <span
                  className={`
                    ${showCorrect ? 'text-green-700' : ''}
                    ${showWrong ? 'text-red-700' : ''}
                    ${!showResult && selected ? 'text-[#4944a4]' : ''}
                  `}
                >
                  {option}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Result feedback */}
      {showResult && (
        <div
          className={`
            p-4 rounded-lg
            ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <>
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-dm-sans font-semibold text-green-700">
                  ¡Correcto!
                </span>
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-red-600" />
                <span className="font-dm-sans font-semibold text-red-700">
                  Incorrecto
                </span>
              </>
            )}
          </div>
          {explanation && (
            <p className="font-dm-sans text-sm text-gray-600">{explanation}</p>
          )}
        </div>
      )}
    </div>
  )
}
