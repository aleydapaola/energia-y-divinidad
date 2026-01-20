/**
 * Quiz Library
 * Handles quiz logic, grading, and attempt management
 */

import { prisma } from '@/lib/prisma'
import { client } from '@/sanity/lib/client'
import { Decimal } from '@prisma/client/runtime/library'
import { Prisma } from '@prisma/client'

// Types
export interface QuizQuestion {
  text: string
  type: 'multiple_choice' | 'true_false' | 'multiple_select'
  options?: string[]
  correctAnswer?: string
  correctAnswers?: string[]
  points: number
  explanation?: string
}

export interface Quiz {
  _id: string
  title: string
  description?: string
  passingScore: number
  maxAttempts?: number
  retakeDelayHours?: number
  timeLimit?: number
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
  showResultsImmediately?: boolean
  questions: QuizQuestion[]
}

export interface QuizForStudent {
  _id: string
  title: string
  description?: string
  passingScore: number
  timeLimit?: number
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
  showResultsImmediately?: boolean
  questions: Omit<QuizQuestion, 'correctAnswer' | 'correctAnswers' | 'explanation'>[]
  totalQuestions: number
  totalPoints: number
}

export interface QuizAnswer {
  questionIndex: number
  selectedAnswer: string | string[]
}

export interface GradedAnswer {
  questionIndex: number
  questionText: string
  selectedAnswer: string | string[]
  correctAnswer: string | string[]
  correct: boolean
  points: number
  earnedPoints: number
  explanation?: string
}

export interface QuizResult {
  score: number
  totalPoints: number
  earnedPoints: number
  passed: boolean
  answers: GradedAnswer[]
}

export interface CanTakeQuizResult {
  canTake: boolean
  reason?: 'max_attempts_reached' | 'retake_delay' | 'quiz_not_found'
  attemptsUsed?: number
  maxAttempts?: number
  nextAttemptAt?: Date
}

// Sanity Queries
const QUIZ_FULL_QUERY = `*[_type == "quiz" && _id == $id][0] {
  _id,
  title,
  description,
  passingScore,
  maxAttempts,
  retakeDelayHours,
  timeLimit,
  shuffleQuestions,
  shuffleOptions,
  showResultsImmediately,
  "questions": questions[] {
    text,
    type,
    options,
    correctAnswer,
    correctAnswers,
    points,
    explanation
  }
}`

const QUIZ_FOR_STUDENT_QUERY = `*[_type == "quiz" && _id == $id][0] {
  _id,
  title,
  description,
  passingScore,
  timeLimit,
  shuffleQuestions,
  shuffleOptions,
  showResultsImmediately,
  "questions": questions[] {
    text,
    type,
    options,
    points
  }
}`

/**
 * Get a quiz by ID (full version with correct answers - for grading)
 */
export async function getQuizById(quizId: string): Promise<Quiz | null> {
  const quiz = await client.fetch<Quiz>(QUIZ_FULL_QUERY, { id: quizId })
  return quiz
}

/**
 * Get a quiz for student view (without correct answers)
 */
export async function getQuizForStudent(quizId: string): Promise<QuizForStudent | null> {
  const quiz = await client.fetch(QUIZ_FOR_STUDENT_QUERY, { id: quizId })

  if (!quiz) return null

  const totalPoints = quiz.questions?.reduce(
    (sum: number, q: { points: number }) => sum + (q.points || 1),
    0
  ) || 0

  return {
    ...quiz,
    totalQuestions: quiz.questions?.length || 0,
    totalPoints,
  }
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Get quiz for student with shuffled questions/options if configured
 */
export async function getQuizForAttempt(quizId: string): Promise<QuizForStudent | null> {
  const quiz = await getQuizForStudent(quizId)
  if (!quiz) return null

  let questions = quiz.questions

  // Shuffle questions if configured
  if (quiz.shuffleQuestions) {
    questions = shuffleArray(questions)
  }

  // Shuffle options if configured
  if (quiz.shuffleOptions) {
    questions = questions.map((q) => ({
      ...q,
      options: q.options ? shuffleArray(q.options) : q.options,
    }))
  }

  return {
    ...quiz,
    questions,
  }
}

/**
 * Get user's quiz attempts
 */
export async function getUserQuizAttempts(userId: string, quizId: string) {
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      userId,
      quizId,
    },
    orderBy: {
      completedAt: 'desc',
    },
  })

  return attempts
}

/**
 * Check if user can take a quiz
 */
export async function canTakeQuiz(
  userId: string,
  quizId: string
): Promise<CanTakeQuizResult> {
  // Get quiz settings from Sanity
  const quiz = await client.fetch<Pick<Quiz, 'maxAttempts' | 'retakeDelayHours'>>(
    `*[_type == "quiz" && _id == $id][0] {
      maxAttempts,
      retakeDelayHours
    }`,
    { id: quizId }
  )

  if (!quiz) {
    return {
      canTake: false,
      reason: 'quiz_not_found',
    }
  }

  // Get user's attempts
  const attempts = await getUserQuizAttempts(userId, quizId)
  const attemptsCount = attempts.length

  // Check max attempts
  if (quiz.maxAttempts && attemptsCount >= quiz.maxAttempts) {
    return {
      canTake: false,
      reason: 'max_attempts_reached',
      attemptsUsed: attemptsCount,
      maxAttempts: quiz.maxAttempts,
    }
  }

  // Check retake delay
  if (attemptsCount > 0 && quiz.retakeDelayHours && quiz.retakeDelayHours > 0) {
    const lastAttempt = attempts[0]
    const delayMs = quiz.retakeDelayHours * 60 * 60 * 1000
    const nextAttemptAt = new Date(lastAttempt.completedAt.getTime() + delayMs)

    if (new Date() < nextAttemptAt) {
      return {
        canTake: false,
        reason: 'retake_delay',
        attemptsUsed: attemptsCount,
        maxAttempts: quiz.maxAttempts || undefined,
        nextAttemptAt,
      }
    }
  }

  return {
    canTake: true,
    attemptsUsed: attemptsCount,
    maxAttempts: quiz.maxAttempts || undefined,
  }
}

/**
 * Grade quiz answers
 */
export function gradeQuiz(questions: QuizQuestion[], answers: QuizAnswer[]): QuizResult {
  const gradedAnswers: GradedAnswer[] = []
  let totalPoints = 0
  let earnedPoints = 0

  questions.forEach((question, index) => {
    const points = question.points || 1
    totalPoints += points

    const answer = answers.find((a) => a.questionIndex === index)
    const selectedAnswer = answer?.selectedAnswer || (question.type === 'multiple_select' ? [] : '')

    let correct = false
    let correctAnswer: string | string[]

    if (question.type === 'true_false') {
      correctAnswer = question.correctAnswer || 'true'
      correct = selectedAnswer === correctAnswer
    } else if (question.type === 'multiple_select') {
      correctAnswer = question.correctAnswers || []
      const selected = Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer]
      // All correct answers must be selected, and no incorrect answers
      correct =
        selected.length === correctAnswer.length &&
        selected.every((s) => correctAnswer.includes(s))
    } else {
      // multiple_choice
      correctAnswer = question.correctAnswer || ''
      correct = selectedAnswer === correctAnswer
    }

    const questionEarnedPoints = correct ? points : 0
    earnedPoints += questionEarnedPoints

    gradedAnswers.push({
      questionIndex: index,
      questionText: question.text,
      selectedAnswer,
      correctAnswer,
      correct,
      points,
      earnedPoints: questionEarnedPoints,
      explanation: question.explanation,
    })
  })

  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

  return {
    score,
    totalPoints,
    earnedPoints,
    passed: false, // Will be set by caller based on passingScore
    answers: gradedAnswers,
  }
}

/**
 * Submit a quiz attempt
 */
export async function submitQuizAttempt(params: {
  userId: string
  quizId: string
  courseId: string
  lessonId?: string
  answers: QuizAnswer[]
  startedAt: Date
}): Promise<{
  success: boolean
  error?: string
  attempt?: Awaited<ReturnType<typeof prisma.quizAttempt.create>>
  result?: QuizResult
}> {
  const { userId, quizId, courseId, lessonId, answers, startedAt } = params

  // Check if user can take the quiz
  const canTake = await canTakeQuiz(userId, quizId)
  if (!canTake.canTake) {
    return {
      success: false,
      error:
        canTake.reason === 'max_attempts_reached'
          ? 'Has alcanzado el número máximo de intentos'
          : canTake.reason === 'retake_delay'
            ? `Debes esperar hasta ${canTake.nextAttemptAt?.toLocaleString()} para reintentar`
            : 'Quiz no encontrado',
    }
  }

  // Get full quiz for grading
  const quiz = await getQuizById(quizId)
  if (!quiz) {
    return { success: false, error: 'Quiz no encontrado' }
  }

  // Grade the quiz
  const result = gradeQuiz(quiz.questions, answers)
  result.passed = result.score >= quiz.passingScore

  const completedAt = new Date()
  const timeSpent = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)

  // Save attempt to database
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      courseId,
      lessonId,
      score: new Decimal(result.score),
      totalPoints: result.totalPoints,
      earnedPoints: result.earnedPoints,
      passed: result.passed,
      answers: result.answers as unknown as Prisma.InputJsonValue,
      startedAt,
      completedAt,
      timeSpent,
    },
  })

  return {
    success: true,
    attempt,
    result,
  }
}

/**
 * Get the best quiz attempt for a user
 */
export async function getBestQuizAttempt(userId: string, quizId: string) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: {
      userId,
      quizId,
    },
    orderBy: {
      score: 'desc',
    },
  })

  return attempt
}

/**
 * Check if user has passed a quiz
 */
export async function hasPassedQuiz(userId: string, quizId: string): Promise<boolean> {
  const passedAttempt = await prisma.quizAttempt.findFirst({
    where: {
      userId,
      quizId,
      passed: true,
    },
  })

  return !!passedAttempt
}

/**
 * Get quiz results for a specific attempt
 */
export async function getQuizAttemptResults(attemptId: string, userId: string) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: {
      id: attemptId,
      userId, // Ensure user owns this attempt
    },
  })

  if (!attempt) return null

  // Get quiz info for context
  const quiz = await client.fetch<Pick<Quiz, '_id' | 'title' | 'passingScore'>>(
    `*[_type == "quiz" && _id == $id][0] {
      _id,
      title,
      passingScore
    }`,
    { id: attempt.quizId }
  )

  return {
    attempt,
    quiz,
  }
}

/**
 * Get all quiz attempts for a course
 */
export async function getCourseQuizAttempts(userId: string, courseId: string) {
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      userId,
      courseId,
    },
    orderBy: {
      completedAt: 'desc',
    },
  })

  return attempts
}

/**
 * Check if user has passed the final quiz for a course
 */
export async function hasPassedFinalQuiz(
  userId: string,
  courseId: string
): Promise<{ passed: boolean; quizId?: string; score?: number }> {
  // Get course with final quiz reference
  const course = await client.fetch(
    `*[_type == "course" && _id == $id][0] {
      "finalQuizId": finalQuiz->._id,
      requiresFinalQuizToComplete
    }`,
    { id: courseId }
  )

  if (!course?.finalQuizId || !course?.requiresFinalQuizToComplete) {
    // No final quiz required
    return { passed: true }
  }

  const passedAttempt = await prisma.quizAttempt.findFirst({
    where: {
      userId,
      quizId: course.finalQuizId,
      courseId,
      lessonId: null, // Final quiz has no lesson
      passed: true,
    },
    orderBy: {
      score: 'desc',
    },
  })

  return {
    passed: !!passedAttempt,
    quizId: course.finalQuizId,
    score: passedAttempt ? Number(passedAttempt.score) : undefined,
  }
}

/**
 * Check if user has passed a lesson quiz
 */
export async function hasPassedLessonQuiz(
  userId: string,
  lessonId: string,
  courseId: string
): Promise<{ passed: boolean; quizId?: string }> {
  // Get lesson with quiz reference
  const lesson = await client.fetch(
    `*[_type == "courseLesson" && _id == $id][0] {
      "quizId": quiz->._id,
      requiresQuizToComplete
    }`,
    { id: lessonId }
  )

  if (!lesson?.quizId || !lesson?.requiresQuizToComplete) {
    // No quiz required for this lesson
    return { passed: true }
  }

  const passedAttempt = await prisma.quizAttempt.findFirst({
    where: {
      userId,
      quizId: lesson.quizId,
      courseId,
      lessonId,
      passed: true,
    },
  })

  return {
    passed: !!passedAttempt,
    quizId: lesson.quizId,
  }
}
