/**
 * Certificate PDF Generator
 * Uses @react-pdf/renderer to generate PDF certificates
 */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import QRCode from 'qrcode'
import React from 'react'

import type { CertificateData } from './certificates'

// Register fonts (using system fonts for now)
Font.register({
  family: 'DMSans',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/dmsans/v11/rP2Hp2ywxg089UriCZOIHQ.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/dmsans/v11/rP2Cp2ywxg089UriASitCBamCw.ttf',
      fontWeight: 700,
    },
  ],
})

// Styles
const createStyles = (primaryColor: string, secondaryColor: string) =>
  StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#FFFFFF',
      padding: 40,
      fontFamily: 'DMSans',
    },
    backgroundImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 700,
      color: primaryColor,
      marginBottom: 10,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: secondaryColor,
      marginBottom: 30,
      textAlign: 'center',
    },
    certifiesText: {
      fontSize: 14,
      color: '#666666',
      marginBottom: 10,
    },
    studentName: {
      fontSize: 28,
      fontWeight: 700,
      color: primaryColor,
      marginBottom: 20,
      textAlign: 'center',
    },
    completedText: {
      fontSize: 14,
      color: '#666666',
      marginBottom: 10,
    },
    courseName: {
      fontSize: 20,
      fontWeight: 700,
      color: secondaryColor,
      marginBottom: 20,
      textAlign: 'center',
      maxWidth: 400,
    },
    detailsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 30,
      gap: 30,
    },
    detail: {
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 10,
      color: '#999999',
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 12,
      color: '#333333',
      fontWeight: 700,
    },
    signatureContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    signatureImage: {
      width: 120,
      height: 40,
      marginBottom: 5,
    },
    signatureLine: {
      width: 200,
      height: 1,
      backgroundColor: '#CCCCCC',
      marginBottom: 5,
    },
    issuerName: {
      fontSize: 12,
      fontWeight: 700,
      color: '#333333',
    },
    issuerTitle: {
      fontSize: 10,
      color: '#666666',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 'auto',
      paddingTop: 20,
    },
    certificateNumber: {
      fontSize: 10,
      color: '#999999',
    },
    qrCode: {
      width: 60,
      height: 60,
    },
    verificationText: {
      fontSize: 8,
      color: '#999999',
      marginTop: 4,
      textAlign: 'center',
    },
  })

interface CertificateDocumentProps {
  data: CertificateData
  qrCodeDataUrl?: string
}

function CertificateDocument({ data, qrCodeDataUrl }: CertificateDocumentProps) {
  const styles = createStyles(
    data.template.primaryColor || '#8A4BAF',
    data.template.secondaryColor || '#654177'
  )

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Background Image */}
        {data.template.templateImageUrl && (
          <Image src={data.template.templateImageUrl} style={styles.backgroundImage} />
        )}

        <View style={styles.container}>
          {/* Logo */}
          {data.template.logoImageUrl && (
            <Image src={data.template.logoImageUrl} style={styles.logo} />
          )}

          {/* Title */}
          <Text style={styles.title}>
            {data.template.certificateTitle || 'Certificado de Completación'}
          </Text>
          <Text style={styles.subtitle}>Energía y Divinidad</Text>

          {/* Student Name */}
          <Text style={styles.certifiesText}>Se certifica que</Text>
          <Text style={styles.studentName}>{data.studentName}</Text>

          {/* Course */}
          <Text style={styles.completedText}>ha completado satisfactoriamente el curso</Text>
          <Text style={styles.courseName}>{data.courseName}</Text>

          {/* Details */}
          <View style={styles.detailsContainer}>
            {data.template.showCompletionDate !== false && (
              <View style={styles.detail}>
                <Text style={styles.detailLabel}>FECHA DE EMISIÓN</Text>
                <Text style={styles.detailValue}>{formatDate(data.issuedAt)}</Text>
              </View>
            )}

            {data.template.showCourseHours && data.courseHours && (
              <View style={styles.detail}>
                <Text style={styles.detailLabel}>DURACIÓN</Text>
                <Text style={styles.detailValue}>{data.courseHours} horas</Text>
              </View>
            )}

            {data.quizScore !== null && data.quizScore !== undefined && (
              <View style={styles.detail}>
                <Text style={styles.detailLabel}>CALIFICACIÓN</Text>
                <Text style={styles.detailValue}>{Math.round(data.quizScore)}%</Text>
              </View>
            )}
          </View>

          {/* Signature */}
          <View style={styles.signatureContainer}>
            {data.template.signatureImageUrl ? (
              <Image src={data.template.signatureImageUrl} style={styles.signatureImage} />
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.issuerName}>
              {data.template.issuerName || 'Aleyda'}
            </Text>
            {data.template.issuerTitle && (
              <Text style={styles.issuerTitle}>{data.template.issuerTitle}</Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.certificateNumber}>
            N° {data.certificateNumber}
          </Text>

          {data.template.showQRCode !== false && qrCodeDataUrl && (
            <View style={{ alignItems: 'center' }}>
              <Image src={qrCodeDataUrl} style={styles.qrCode} />
              <Text style={styles.verificationText}>
                Verifica este certificado
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}

/**
 * Generate QR Code as data URL
 */
export async function generateQRCodeDataUrl(url: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
      color: {
        dark: '#333333',
        light: '#FFFFFF',
      },
    })
    return qrDataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    return ''
  }
}

/**
 * Generate Certificate PDF as a React element (for streaming)
 */
export async function createCertificatePdfElement(
  data: CertificateData
): Promise<React.ReactElement> {
  let qrCodeDataUrl: string | undefined

  if (data.template.showQRCode !== false) {
    qrCodeDataUrl = await generateQRCodeDataUrl(data.verificationUrl)
  }

  return <CertificateDocument data={data} qrCodeDataUrl={qrCodeDataUrl} />
}

/**
 * Generate Certificate PDF as a Buffer (for downloads/storage)
 */
export async function generateCertificatePdfBuffer(
  data: CertificateData
): Promise<Buffer> {
  // Dynamically import renderToBuffer to avoid SSR issues
  const { renderToBuffer } = await import('@react-pdf/renderer')

  let qrCodeDataUrl: string | undefined

  if (data.template.showQRCode !== false) {
    qrCodeDataUrl = await generateQRCodeDataUrl(data.verificationUrl)
  }

  const pdfDocument = <CertificateDocument data={data} qrCodeDataUrl={qrCodeDataUrl} />
  const buffer = await renderToBuffer(pdfDocument)

  return Buffer.from(buffer)
}

export { CertificateDocument }
