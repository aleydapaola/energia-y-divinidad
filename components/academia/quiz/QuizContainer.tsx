'use client'

import { ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { useState, useCallback } from 'react'

import { QuizProgress } from './QuizProgress'
import { QuizQuestion } from './QuizQuestion'
import { QuizResults } from './QuizResults'
import { QuizTimer } from './QuizTimer'

interface Question {
  text: string
  type: 'multiple_choice' | 'true_false' | 'multiple_select'
  options?: string[]
  points: number
}

interface QuizData {
  _id: string
  title: string
  description?: string
  passingScore: number
  timeLimit?: number
  showResultsImmediately?: boolean
  questions: Question[]
  totalQuestions: number
  totalPoints: number
}

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

interface QuizResult {
  score: number
  totalPoints: number
  earnedPoints: number
  passed: boolean
  answers: GradedAnswer[]
}

interface QuizContainerProps {
  quiz: QuizData
  courseId: string
  courseSlug: string
  lessonId?: string
  canRetake: boolean
  onComplete: () => void
  showCertificateCTA?: boolean
  onGetCertificate?: () => void
}

export function QuizContainer({
  quiz,
  courseId,
  courseSlug,
  lessonId,
  canRetake,
  onComplete,
  showCertificateCTA = false,
  onGetCertificate,
}: QuizContainerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<(string | string[] | null)[]>(
    Array(quiz.questions.length).fill(null)
  )
  const [startedAt] = useState(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [timeSpent, setTimeSpent] = useState(0)
  const [showImmediateResult, setShowImmediateResult] = useState(false)
  const [immediateAnswer, setImmediateAnswer] = useState<GradedAnswer | null>(null)

  // Get answered question indices
  const answeredQuestions = answers
    .map((a, i) => (a !== null ? i : -1))
    .filter((i) => i !== -1)

  // Handle answer selection
  const handleAnswer = (answer: string | string[]) => {
    const newAnswers = [...answers]
    newAnswers[currentQuestion] = answer
    setAnswers(newAnswers)
  }

  // Navigation
  const goToPrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      setShowImmediateResult(false)
      setImmediateAnswer(null)
    }
  }

  const goToNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setShowImmediateResult(false)
      setImmediateAnswer(null)
    }
  }

  // Handle time up
  const handleTimeUp = useCallback(() => {
    // Auto-submit when time is up
    handleSubmit()
  }, [answers])

  // Submit quiz
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setTimeSpent(Math.round((Date.now() - startedAt.getTime()) / 1000))

    try {
      const formattedAnswers = answers.map((answer, index) => ({
        questionIndex: index,
        selectedAnswer: answer || (quiz.questions[index].type === 'multiple_select' ? [] : ''),
      }))

      const response = await fetch(`/api/quizzes/${quiz._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonId,
          answers: formattedAnswers,
          startedAt: startedAt.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Error al enviar el quiz')
      }

      const data = await response.json()
      setResult(data.result)
      setTimeSpent(data.attempt.timeSpent)
      onComplete()
    } catch (error) {
      console.error('Error submitting quiz:', error)
      alert('Error al enviar el quiz. Por favor intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle retake
  const handleRetake = () => {
    setAnswers(Array(quiz.questions.length).fill(null))
    setCurrentQuestion(0)
    setResult(null)
    setShowImmediateResult(false)
    setImmediateAnswer(null)
  }

  // Check if all questions are answered
  const allAnswered = answers.every((a) => a !== null)

  // If we have results, show them
  if (result) {
    return (
      <QuizResults
        score={result.score}
        passed={result.passed}
        totalPoints={result.totalPoints}
        earnedPoints={result.earnedPoints}
        passingScore={quiz.passingScore}
        answers={result.answers}
        timeSpent={timeSpent}
        canRetake={canRetake}
        onRetake={canRetake ? handleRetake : undefined}
        courseSlug={courseSlug}
        showCertificateCTA={showCertificateCTA}
        onGetCertificate={onGetCertificate}
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-gazeta text-2xl text-[#654177]">{quiz.title}</h1>
          {quiz.description && (
            <p className="font-dm-sans text-gray-600 mt-1">{quiz.description}</p>
          )}
        </div>

        {quiz.timeLimit && (
          <QuizTimer
            timeLimit={quiz.timeLimit}
            startedAt={startedAt}
            onTimeUp={handleTimeUp}
          />
        )}
      </div>

      {/* Progress */}
      <QuizProgress
        currentQuestion={currentQuestion}
        totalQuestions={quiz.questions.length}
        answeredQuestions={answeredQuestions}
      />

      {/* Question */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <QuizQuestion
          questionNumber={currentQuestion + 1}
          totalQuestions={quiz.questions.length}
          question={quiz.questions[currentQuestion]}
          selectedAnswer={answers[currentQuestion]}
          onAnswer={handleAnswer}
          showResult={showImmediateResult}
          isCorrect={immediateAnswer?.correct}
          correctAnswer={immediateAnswer?.correctAnswer}
          explanation={immediateAnswer?.explanation}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevious}
          disabled={currentQuestion === 0}
          className={`
            flex items-center gap-2 font-dm-sans font-medium py-2 px-4 rounded-lg transition-colors
            ${
              currentQuestion === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-[#4944a4] hover:bg-gray-100'
            }
          `}
        >
          <ChevronLeft className="h-5 w-5" />
          Anterior
        </button>

        <div className="flex gap-3">
          {currentQuestion === quiz.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className={`
                flex items-center gap-2 font-dm-sans font-semibold py-2 px-6 rounded-lg transition-colors
                ${
                  allAnswered && !isSubmitting
                    ? 'bg-[#4944a4] hover:bg-[#3d3a8a] text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Send className="h-5 w-5" />
              {isSubmitting ? 'Enviando...' : 'Enviar Quiz'}
            </button>
          ) : (
            <button
              onClick={goToNext}
              className="flex items-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Siguiente
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Submit warning */}
      {!allAnswered && currentQuestion === quiz.questions.length - 1 && (
        <p className="text-center text-amber-600 font-dm-sans text-sm">
          Debes responder todas las preguntas antes de enviar el quiz
        </p>
      )}
    </div>
  )
}
