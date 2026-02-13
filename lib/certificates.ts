/**
 * Certificate Library
 * Handles certificate issuance, verification, and management
 */

import { Decimal } from '@prisma/client/runtime/library'

import { prisma } from '@/lib/prisma'
import { client } from '@/sanity/lib/client'

import { hasPassedFinalQuiz } from './quizzes'

// Types
export interface CertificateTemplate {
  _id: string
  title: string
  certificateTitle: string
  issuerName: string
  issuerTitle?: string
  templateImageUrl?: string
  logoImageUrl?: string
  signatureImageUrl?: string
  primaryColor: string
  secondaryColor: string
  showCourseHours?: boolean
  showCompletionDate?: boolean
  showQRCode?: boolean
  validityDuration?: number
  customText?: any[]
}

export interface CourseForCertificate {
  _id: string
  title: string
  totalDuration?: number
  instructor?: string
  certificate: CertificateTemplate | null
  finalQuizId?: string
  requiresFinalQuizToComplete?: boolean
}

export interface CertificateData {
  id: string
  certificateNumber: string
  studentName: string
  courseName: string
  courseHours?: number
  issuedAt: Date
  validUntil?: Date | null
  quizScore?: number | null
  template: CertificateTemplate
  verificationUrl: string
}

export interface CanIssueCertificateResult {
  canIssue: boolean
  reason?:
    | 'course_not_completed'
    | 'final_quiz_not_passed'
    | 'no_certificate_template'
    | 'already_issued'
    | 'course_not_found'
  existingCertificate?: {
    id: string
    certificateNumber: string
  }
  completionPercentage?: number
  quizPassed?: boolean
}

// Sanity Queries
const COURSE_FOR_CERTIFICATE_QUERY = `*[_type == "course" && _id == $id][0] {
  _id,
  title,
  totalDuration,
  instructor,
  "certificate": certificate-> {
    _id,
    title,
    certificateTitle,
    issuerName,
    issuerTitle,
    "templateImageUrl": templateImage.asset->url,
    "logoImageUrl": logoImage.asset->url,
    "signatureImageUrl": signatureImage.asset->url,
    primaryColor,
    secondaryColor,
    showCourseHours,
    showCompletionDate,
    showQRCode,
    validityDuration,
    customText
  },
  "finalQuizId": finalQuiz->._id,
  requiresFinalQuizToComplete
}`

const CERTIFICATE_TEMPLATE_QUERY = `*[_type == "certificate" && _id == $id][0] {
  _id,
  title,
  certificateTitle,
  issuerName,
  issuerTitle,
  "templateImageUrl": templateImage.asset->url,
  "logoImageUrl": logoImage.asset->url,
  "signatureImageUrl": signatureImage.asset->url,
  primaryColor,
  secondaryColor,
  showCourseHours,
  showCompletionDate,
  showQRCode,
  validityDuration,
  customText
}`

/**
 * Generate a unique certificate number
 * Format: CERT-YYYYMMDD-XXXXXX
 */
export function generateCertificateNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `CERT-${dateStr}-${random}`
}

/**
 * Check if a certificate can be issued for a user and course
 */
export async function canIssueCertificate(
  userId: string,
  courseId: string
): Promise<CanIssueCertificateResult> {
  // Check if certificate already exists
  const existingCertificate = await prisma.certificate.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: {
      id: true,
      certificateNumber: true,
    },
  })

  if (existingCertificate) {
    return {
      canIssue: false,
      reason: 'already_issued',
      existingCertificate,
    }
  }

  // Get course info from Sanity
  const course = await client.fetch<CourseForCertificate>(COURSE_FOR_CERTIFICATE_QUERY, {
    id: courseId,
  })

  if (!course) {
    return {
      canIssue: false,
      reason: 'course_not_found',
    }
  }

  // Check if course has a certificate template
  if (!course.certificate) {
    return {
      canIssue: false,
      reason: 'no_certificate_template',
    }
  }

  // Check course completion
  const courseProgress = await prisma.courseProgress.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  })

  const completionPercentage = courseProgress
    ? Number(courseProgress.completionPercentage)
    : 0

  if (completionPercentage < 100) {
    return {
      canIssue: false,
      reason: 'course_not_completed',
      completionPercentage,
    }
  }

  // Check final quiz if required
  if (course.requiresFinalQuizToComplete && course.finalQuizId) {
    const quizResult = await hasPassedFinalQuiz(userId, courseId)
    if (!quizResult.passed) {
      return {
        canIssue: false,
        reason: 'final_quiz_not_passed',
        completionPercentage,
        quizPassed: false,
      }
    }
  }

  return {
    canIssue: true,
    completionPercentage,
    quizPassed: true,
  }
}

/**
 * Issue a certificate to a user
 */
export async function issueCertificate(params: {
  userId: string
  courseId: string
  studentName: string
}): Promise<{
  success: boolean
  error?: string
  certificate?: Awaited<ReturnType<typeof prisma.certificate.create>>
}> {
  const { userId, courseId, studentName } = params

  // Verify eligibility
  const eligibility = await canIssueCertificate(userId, courseId)

  if (!eligibility.canIssue) {
    const errorMessages: Record<string, string> = {
      already_issued: 'Ya tienes un certificado para este curso',
      course_not_completed: 'Debes completar el curso al 100% para obtener el certificado',
      final_quiz_not_passed: 'Debes aprobar el examen final para obtener el certificado',
      no_certificate_template: 'Este curso no tiene certificado configurado',
      course_not_found: 'Curso no encontrado',
    }
    return {
      success: false,
      error: errorMessages[eligibility.reason!] || 'No puedes obtener el certificado',
    }
  }

  // Get course info
  const course = await client.fetch<CourseForCertificate>(COURSE_FOR_CERTIFICATE_QUERY, {
    id: courseId,
  })

  if (!course?.certificate) {
    return { success: false, error: 'Certificado no configurado' }
  }

  // Get quiz score if there was a final quiz
  let quizScore: Decimal | null = null
  if (course.requiresFinalQuizToComplete && course.finalQuizId) {
    const quizResult = await hasPassedFinalQuiz(userId, courseId)
    if (quizResult.score !== undefined) {
      quizScore = new Decimal(quizResult.score)
    }
  }

  // Calculate validity
  let validUntil: Date | null = null
  if (course.certificate.validityDuration) {
    validUntil = new Date()
    validUntil.setMonth(validUntil.getMonth() + course.certificate.validityDuration)
  }

  // Generate certificate number
  const certificateNumber = generateCertificateNumber()

  // Create certificate
  const certificate = await prisma.certificate.create({
    data: {
      userId,
      courseId,
      courseName: course.title,
      certificateNumber,
      studentName,
      validUntil,
      quizScore,
      courseHours: course.totalDuration ? Math.round(course.totalDuration / 60) : null,
    },
  })

  return {
    success: true,
    certificate,
  }
}

/**
 * Get certificate data for PDF generation
 */
export async function getCertificateData(
  certificateId: string,
  userId?: string
): Promise<CertificateData | null> {
  const certificate = await prisma.certificate.findFirst({
    where: {
      id: certificateId,
      ...(userId ? { userId } : {}),
    },
  })

  if (!certificate) {return null}

  // Get course with certificate template
  const course = await client.fetch<CourseForCertificate>(COURSE_FOR_CERTIFICATE_QUERY, {
    id: certificate.courseId,
  })

  if (!course?.certificate) {return null}

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://energiaydivinidad.com'
  const verificationUrl = `${baseUrl}/certificados/verificar/${certificate.certificateNumber}`

  return {
    id: certificate.id,
    certificateNumber: certificate.certificateNumber,
    studentName: certificate.studentName,
    courseName: certificate.courseName,
    courseHours: certificate.courseHours || undefined,
    issuedAt: certificate.issuedAt,
    validUntil: certificate.validUntil,
    quizScore: certificate.quizScore ? Number(certificate.quizScore) : null,
    template: course.certificate,
    verificationUrl,
  }
}

/**
 * Verify a certificate by its number (public endpoint)
 */
export async function verifyCertificate(certificateNumber: string): Promise<{
  valid: boolean
  expired?: boolean
  certificate?: {
    studentName: string
    courseName: string
    issuedAt: Date
    validUntil?: Date | null
    courseHours?: number | null
  }
}> {
  const certificate = await prisma.certificate.findUnique({
    where: {
      certificateNumber,
    },
    select: {
      studentName: true,
      courseName: true,
      issuedAt: true,
      validUntil: true,
      courseHours: true,
    },
  })

  if (!certificate) {
    return { valid: false }
  }

  // Check if expired
  const expired = certificate.validUntil
    ? new Date() > certificate.validUntil
    : false

  return {
    valid: !expired,
    expired,
    certificate,
  }
}

/**
 * Get all certificates for a user
 */
export async function getUserCertificates(userId: string) {
  const certificates = await prisma.certificate.findMany({
    where: {
      userId,
    },
    orderBy: {
      issuedAt: 'desc',
    },
  })

  // Enhance with course images
  if (certificates.length === 0) {return []}

  const courseIds = certificates.map((c) => c.courseId)
  const courses = await client.fetch<Array<{ _id: string; coverImage?: any }>>(
    `*[_type == "course" && _id in $ids] {
      _id,
      coverImage
    }`,
    { ids: courseIds }
  )

  const courseMap = new Map(courses.map((c) => [c._id, c]))

  return certificates.map((cert) => ({
    ...cert,
    courseImage: courseMap.get(cert.courseId)?.coverImage,
  }))
}

/**
 * Get certificate by ID for a user
 */
export async function getCertificateById(certificateId: string, userId: string) {
  const certificate = await prisma.certificate.findFirst({
    where: {
      id: certificateId,
      userId,
    },
  })

  return certificate
}

/**
 * Update certificate PDF URL (after caching)
 */
export async function updateCertificatePdfUrl(
  certificateId: string,
  pdfUrl: string
) {
  const certificate = await prisma.certificate.update({
    where: {
      id: certificateId,
    },
    data: {
      pdfUrl,
      pdfGeneratedAt: new Date(),
    },
  })

  return certificate
}

/**
 * Check if user has a certificate for a course
 */
export async function hasCertificate(
  userId: string,
  courseId: string
): Promise<{ has: boolean; certificateId?: string; certificateNumber?: string }> {
  const certificate = await prisma.certificate.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: {
      id: true,
      certificateNumber: true,
    },
  })

  return {
    has: !!certificate,
    certificateId: certificate?.id,
    certificateNumber: certificate?.certificateNumber,
  }
}
