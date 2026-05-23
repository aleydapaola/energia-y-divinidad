import { Prisma } from "@prisma/client";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";

const FROM_EMAIL = process.env.EMAIL_FROM || "Energía y Divinidad <noreply@energiaydivinidad.com>";
function resolveAppUrl(): string {
  const candidates = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];
  for (const url of candidates) {
    if (url && !url.includes("localhost") && !url.includes("127.0.0.1")) {
      return url.replace(/\/$/, "");
    }
  }
  return "https://energiaydivinidad.com";
}
const APP_URL = resolveAppUrl();
// Logo URL para emails - usando URL de producción en Vercel
const LOGO_URL = "https://energia-y-divinidad.vercel.app/images/logoNoBackground.png";

// Modo desarrollo: si está activo, se auto-verifica el email sin enviar correo real
const DEV_MODE = process.env.NODE_ENV === "development";
const DEV_AUTO_VERIFY = process.env.DEV_AUTO_VERIFY_EMAIL === "true";

// Lazy initialization para evitar errores en build
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY no está configurada");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Función auxiliar para verificar si debemos simular el envío en desarrollo
export function shouldSimulateEmail(): boolean {
  return DEV_MODE && DEV_AUTO_VERIFY;
}

// ============================================
// EMAIL LOGGING - Trazabilidad de emails enviados
// ============================================

interface SendEmailWithLoggingParams {
  to: string;
  subject: string;
  template: string;
  html: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Envía un email y registra el resultado en EmailLog para trazabilidad.
 * Usar esta función para emails que requieren auditoría (confirmaciones, notificaciones admin, etc.)
 */
export async function sendEmailWithLogging(params: SendEmailWithLoggingParams) {
  // Crear log en estado PENDING
  const emailLog = await prisma.emailLog.create({
    data: {
      to: params.to,
      template: params.template,
      subject: params.subject,
      entityType: params.entityType,
      entityId: params.entityId,
      status: "PENDING",
      metadata: params.metadata,
    },
  });

  // En modo desarrollo con auto-verify, simular envío
  if (DEV_MODE && DEV_AUTO_VERIFY) {
    console.log("\n========================================");
    console.log(`📧 EMAIL SIMULADO (${params.template})`);
    console.log("========================================");
    console.log(`Para: ${params.to}`);
    console.log(`Asunto: ${params.subject}`);
    console.log("========================================\n");

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "SENT",
        providerMessageId: "dev-mode-simulated",
        sentAt: new Date(),
      },
    });

    return { success: true, messageId: "dev-mode-simulated", emailLogId: emailLog.id };
  }

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: "FAILED",
          errorMessage: result.error.message,
        },
      });

      console.error("Error sending email:", result.error);
      return { success: false, error: result.error, emailLogId: emailLog.id };
    }

    // Actualizar log con éxito
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "SENT",
        providerMessageId: result.data?.id,
        sentAt: new Date(),
      },
    });

    return { success: true, messageId: result.data?.id, emailLogId: emailLog.id };
  } catch (error) {
    // Actualizar log con error
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    console.error("Error sending email:", error);
    return { success: false, error, emailLogId: emailLog.id };
  }
}

/**
 * Obtiene el historial de emails enviados a un destinatario
 */
export async function getEmailHistory(to: string, limit: number = 20) {
  return prisma.emailLog.findMany({
    where: { to },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Obtiene emails relacionados con una entidad específica
 */
export async function getEntityEmailHistory(entityType: string, entityId: string) {
  return prisma.emailLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}

interface SendVerificationEmailParams {
  email: string;
  name: string;
  token: string;
}

export async function sendVerificationEmail({ email, name, token }: SendVerificationEmailParams) {
  const verificationUrl = `${APP_URL}/auth/verify-email?token=${token}`;

  // En modo desarrollo con auto-verify, solo mostramos el link en consola
  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 EMAIL DE VERIFICACIÓN (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`\n🔗 Link de verificación:`);
    console.log(verificationUrl);
    console.log("========================================\n");

    // Si auto-verify está activo, retornamos éxito sin intentar enviar
    if (DEV_AUTO_VERIFY) {
      console.log("⚠️  DEV_AUTO_VERIFY_EMAIL=true - El email NO se envía realmente.");
      console.log("    Copia el link de arriba para verificar manualmente.\n");
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Verifica tu email - Energía y Divinidad",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verifica tu email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600;">
                          ¡Hola ${name}!
                        </h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          Gracias por registrarte en Energía y Divinidad. Para completar tu registro y comenzar tu viaje de transformación, por favor verifica tu email haciendo clic en el botón de abajo.
                        </p>

                        <!-- Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 30px 0;">
                              <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background-color: #8A4BAF; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                Verificar mi email
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0 0 10px; font-size: 14px; color: #999999; line-height: 1.6;">
                          Si el botón no funciona, copia y pega este enlace en tu navegador:
                        </p>
                        <p style="margin: 0 0 20px; font-size: 12px; color: #8A4BAF; word-break: break-all;">
                          ${verificationUrl}
                        </p>

                        <p style="margin: 0; font-size: 14px; color: #999999; line-height: 1.6;">
                          Este enlace expira en 24 horas. Si no solicitaste esta verificación, puedes ignorar este email.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          © ${new Date().getFullYear()} Energía y Divinidad. Todos los derechos reservados.
                        </p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">
                          Si tienes preguntas, contáctanos en <a href="mailto:contacto@energiaydivinidad.com" style="color: #8A4BAF;">contacto@energiaydivinidad.com</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending verification email:", error);
      throw new Error("Error al enviar el email de verificación");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}

interface SendWelcomeEmailParams {
  email: string;
  name: string;
}

export async function sendWelcomeEmail({ email, name }: SendWelcomeEmailParams) {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Bienvenida a Energía y Divinidad",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenida</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600;">
                          ¡Bienvenida ${name}!
                        </h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          Tu email ha sido verificado exitosamente. Ahora puedes acceder a todo lo que Energía y Divinidad tiene para ti.
                        </p>

                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          Explora nuestras sesiones de canalización, meditaciones y contenido exclusivo para comenzar tu camino de transformación.
                        </p>

                        <!-- Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 30px 0;">
                              <a href="${APP_URL}/mi-cuenta" style="display: inline-block; padding: 16px 40px; background-color: #8A4BAF; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                Ir a Mi Cuenta
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0; font-size: 14px; color: #999999; line-height: 1.6; text-align: center;">
                          Con amor y luz,<br>
                          <strong style="color: #8A4BAF;">Aleyda Paola</strong>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          © ${new Date().getFullYear()} Energía y Divinidad. Todos los derechos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      // Don't throw - welcome email is not critical
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    // Don't throw - welcome email is not critical
    return { success: false, error };
  }
}

// ============================================
// EMAILS DE RECUPERACIÓN DE CONTRASEÑA
// ============================================

interface SendPasswordResetEmailParams {
  email: string;
  name: string;
  token: string;
}

export async function sendPasswordResetEmail({ email, name, token }: SendPasswordResetEmailParams) {
  const resetLink = `${APP_URL}/auth/set-password?token=${token}`;

  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 EMAIL DE RECUPERACIÓN DE CONTRASEÑA (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`\n🔐 ENLACE DE RECUPERACIÓN:`);
    console.log(resetLink);
    console.log("\nExpira en 1 hora");
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Recupera tu contraseña - Energía y Divinidad",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperar Contraseña</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600; text-align: center;">
                          Recupera tu contraseña
                        </h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          Hola ${name},
                        </p>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña:
                        </p>

                        <!-- Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 30px 0;">
                              <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background-color: #4944a4; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                Restablecer contraseña
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0 0 15px; font-size: 14px; color: #999999; line-height: 1.6;">
                          Este enlace expira en <strong>1 hora</strong>.
                        </p>

                        <p style="margin: 0 0 20px; font-size: 14px; color: #999999; line-height: 1.6;">
                          Si no solicitaste restablecer tu contraseña, puedes ignorar este email. Tu contraseña actual seguirá siendo válida.
                        </p>

                        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />

                        <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.6;">
                          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                          <a href="${resetLink}" style="color: #8A4BAF; word-break: break-all;">${resetLink}</a>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          © ${new Date().getFullYear()} Energía y Divinidad. Todos los derechos reservados.
                        </p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">
                          ¿Preguntas? <a href="mailto:contacto@energiaydivinidad.com" style="color: #8A4BAF;">contacto@energiaydivinidad.com</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending password reset email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error };
  }
}

// ============================================
// EMAILS DE ACCESO A CURSOS
// ============================================

interface SendCourseAccessEmailParams {
  email: string;
  name: string;
  courseTitle: string;
  courseSlug?: string | null;
  setPasswordToken?: string;
}

export async function sendCourseAccessEmail({
  email,
  name,
  courseTitle,
  courseSlug,
  setPasswordToken,
}: SendCourseAccessEmailParams) {
  const courseUrl = courseSlug
    ? `${APP_URL}/academia/${courseSlug}/reproducir`
    : `${APP_URL}/mi-cuenta/cursos`;
  const setupUrl = setPasswordToken
    ? `${APP_URL}/auth/set-password?token=${setPasswordToken}`
    : courseUrl;
  const isInvitation = Boolean(setPasswordToken);
  const subject = isInvitation
    ? `Tu acceso al curso ${courseTitle} - Energía y Divinidad`
    : `Ya tienes acceso al curso ${courseTitle} - Energía y Divinidad`;

  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 EMAIL DE ACCESO A CURSO (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Curso: ${courseTitle}`);
    console.log(`Link: ${setupUrl}`);
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600;">
                          Hola ${name},
                        </h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          Aleyda te ha dado acceso al curso <strong>${courseTitle}</strong> en Energía y Divinidad.
                        </p>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          ${
                            isInvitation
                              ? "Para entrar, primero crea tu contraseña con el enlace de abajo. Después podrás acceder al curso desde tu cuenta."
                              : "Puedes entrar ahora desde tu cuenta y continuar el curso cuando quieras."
                          }
                        </p>
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 30px 0;">
                              <a href="${setupUrl}" style="display: inline-block; padding: 16px 40px; background-color: #4944a4; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                ${isInvitation ? "Crear mi contraseña" : "Entrar al curso"}
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 0 0 20px; font-size: 14px; color: #999999; line-height: 1.6;">
                          ${isInvitation ? "Este enlace expira en 7 días." : "Si el botón no funciona, entra desde Mis Cursos en tu cuenta."}
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.6;">
                          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                          <a href="${setupUrl}" style="color: #8A4BAF; word-break: break-all;">${setupUrl}</a>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          © ${new Date().getFullYear()} Energía y Divinidad. Todos los derechos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending course access email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending course access email:", error);
    return { success: false, error };
  }
}

// ============================================
// EMAILS DE EVENTOS
// ============================================

interface EventBookingEmailParams {
  email: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  eventType: "online" | "in_person";
  orderNumber: string;
  seats: number;
  amount: number;
  currency: string;
  paymentStatus: "PENDING" | "COMPLETED";
  // Solo para eventos online confirmados
  zoomUrl?: string;
  zoomId?: string;
  zoomPassword?: string;
  // Solo para eventos presenciales
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
}

export async function sendEventBookingConfirmation(params: EventBookingEmailParams) {
  const {
    email,
    name,
    eventTitle,
    eventDate,
    eventType,
    orderNumber,
    seats,
    amount,
    currency,
    paymentStatus,
    zoomUrl,
    zoomId,
    zoomPassword,
    venueName,
    venueAddress,
    venueCity,
  } = params;

  const isPending = paymentStatus === "PENDING";
  const isOnline = eventType === "online";

  const formattedDate = new Date(eventDate).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedAmount =
    currency === "USD"
      ? `USD $${amount.toLocaleString("en-US")}`
      : `$${amount.toLocaleString("es-CO")} COP`;

  // Construir sección de ubicación/Zoom
  let locationSection = "";
  if (isOnline && !isPending && zoomUrl) {
    locationSection = `
      <tr>
        <td style="padding: 20px; background-color: #eef6ff; border-radius: 8px; margin-top: 20px;">
          <h3 style="margin: 0 0 15px; font-size: 16px; color: #2563eb;">
            🎥 Acceso a Zoom
          </h3>
          <p style="margin: 0 0 10px; font-size: 14px; color: #1e40af;">
            <strong>Link:</strong> <a href="${zoomUrl}" style="color: #2563eb;">${zoomUrl}</a>
          </p>
          ${zoomId ? `<p style="margin: 0 0 5px; font-size: 14px; color: #1e40af;"><strong>ID:</strong> ${zoomId}</p>` : ""}
          ${zoomPassword ? `<p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>Contraseña:</strong> ${zoomPassword}</p>` : ""}
        </td>
      </tr>
    `;
  } else if (isOnline && isPending) {
    locationSection = `
      <tr>
        <td style="padding: 20px; background-color: #fef3c7; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            📍 <strong>Evento Online (Zoom)</strong><br>
            Recibirás el link de acceso una vez confirmemos tu pago.
          </p>
        </td>
      </tr>
    `;
  } else if (!isOnline) {
    locationSection = `
      <tr>
        <td style="padding: 20px; background-color: #f0fdf4; border-radius: 8px; margin-top: 20px;">
          <h3 style="margin: 0 0 10px; font-size: 16px; color: #166534;">
            📍 Ubicación
          </h3>
          ${venueName ? `<p style="margin: 0 0 5px; font-size: 14px; color: #15803d;"><strong>${venueName}</strong></p>` : ""}
          ${venueAddress ? `<p style="margin: 0 0 5px; font-size: 14px; color: #15803d;">${venueAddress}</p>` : ""}
          ${venueCity ? `<p style="margin: 0; font-size: 14px; color: #15803d;">${venueCity}</p>` : ""}
        </td>
      </tr>
    `;
  }

  // Sección de pago pendiente
  const pendingPaymentSection = isPending
    ? `
    <tr>
      <td style="padding: 20px; background-color: #fef3c7; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 10px; font-size: 16px; color: #92400e;">
          ⏳ Pago Pendiente
        </h3>
        <p style="margin: 0 0 15px; font-size: 14px; color: #78350f; line-height: 1.5;">
          Tu reserva está pendiente de confirmación de pago. Por favor realiza el pago por Nequi:
        </p>
        <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #78350f; line-height: 1.8;">
          <li>Abre tu app de Nequi</li>
          <li>Selecciona "Enviar dinero"</li>
          <li>Envía <strong>${formattedAmount}</strong> al número <strong>XXX XXX XXXX</strong></li>
          <li>En la descripción escribe: <strong>${orderNumber}</strong></li>
          <li>Guarda el comprobante</li>
        </ol>
        <p style="margin: 15px 0 0; font-size: 12px; color: #92400e;">
          Tu reserva será confirmada una vez verifiquemos el pago (máximo 24 horas hábiles).
        </p>
      </td>
    </tr>
  `
    : "";

  // En modo desarrollo, solo mostramos en consola
  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 EMAIL DE CONFIRMACIÓN DE EVENTO (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Evento: ${eventTitle}`);
    console.log(`Fecha: ${formattedDate}`);
    console.log(`Cupos: ${seats}`);
    console.log(`Total: ${formattedAmount}`);
    console.log(`Estado: ${isPending ? "Pendiente de pago" : "Confirmado"}`);
    if (zoomUrl) {
      console.log(`Zoom: ${zoomUrl}`);
    }
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: isPending
        ? `Reserva recibida: ${eventTitle} - Energía y Divinidad`
        : `¡Reserva confirmada! ${eventTitle} - Energía y Divinidad`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${isPending ? "Reserva Recibida" : "Reserva Confirmada"}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <!-- Status Badge -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <span style="display: inline-block; padding: 8px 20px; background-color: ${isPending ? "#fef3c7" : "#d1fae5"}; color: ${isPending ? "#92400e" : "#065f46"}; border-radius: 20px; font-size: 14px; font-weight: 600;">
                                ${isPending ? "⏳ Reserva Pendiente de Pago" : "✅ Reserva Confirmada"}
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600;">
                          ¡Hola ${name}!
                        </h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          ${
                            isPending
                              ? "Hemos recibido tu solicitud de reserva para el siguiente evento:"
                              : "¡Tu reserva ha sido confirmada! Te esperamos en el siguiente evento:"
                          }
                        </p>

                        <!-- Event Details -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f0f5; border-radius: 12px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <h3 style="margin: 0 0 15px; font-size: 20px; color: #8A4BAF;">
                                ${eventTitle}
                              </h3>
                              <p style="margin: 0 0 10px; font-size: 14px; color: #666666;">
                                📅 <strong>Fecha:</strong> ${formattedDate}
                              </p>
                              <p style="margin: 0 0 10px; font-size: 14px; color: #666666;">
                                👥 <strong>Cupos:</strong> ${seats}
                              </p>
                              <p style="margin: 0; font-size: 14px; color: #666666;">
                                💰 <strong>Total:</strong> ${formattedAmount}
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Order Number -->
                        <p style="margin: 0 0 20px; font-size: 14px; color: #999999; text-align: center;">
                          N° de orden: <strong>${orderNumber}</strong>
                        </p>

                        ${pendingPaymentSection}

                        <!-- Location/Zoom Section -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          ${locationSection}
                        </table>

                        <!-- Dashboard Link -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 30px 0;">
                              <a href="${APP_URL}/dashboard/eventos" style="display: inline-block; padding: 16px 40px; background-color: #4944a4; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                Ver mis reservas
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0; font-size: 14px; color: #999999; line-height: 1.6; text-align: center;">
                          Con amor y luz,<br>
                          <strong style="color: #8A4BAF;">Aleyda Paola</strong>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          © ${new Date().getFullYear()} Energía y Divinidad. Todos los derechos reservados.
                        </p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">
                          ¿Preguntas? <a href="mailto:contacto@energiaydivinidad.com" style="color: #8A4BAF;">contacto@energiaydivinidad.com</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending event booking email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending event booking email:", error);
    return { success: false, error };
  }
}

interface EventReminderEmailParams {
  email: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  eventType: "online" | "in_person";
  hoursUntil: number;
  zoomUrl?: string;
  zoomId?: string;
  zoomPassword?: string;
  venueName?: string;
  venueAddress?: string;
}

export async function sendEventReminder(params: EventReminderEmailParams) {
  const {
    email,
    name,
    eventTitle,
    eventDate,
    eventType,
    hoursUntil,
    zoomUrl,
    zoomId,
    zoomPassword,
    venueName,
    venueAddress,
  } = params;

  const isOnline = eventType === "online";
  const formattedDate = new Date(eventDate).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const timeMessage =
    hoursUntil <= 1
      ? "¡El evento comienza en menos de 1 hora!"
      : hoursUntil <= 24
        ? `El evento comienza en ${hoursUntil} horas`
        : `El evento es mañana`;

  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 RECORDATORIO DE EVENTO (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${email}`);
    console.log(`Evento: ${eventTitle}`);
    console.log(`Fecha: ${formattedDate}`);
    console.log(`Mensaje: ${timeMessage}`);
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `⏰ Recordatorio: ${eventTitle} - ${timeMessage}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <h2 style="margin: 0 0 10px; font-size: 24px; color: #654177;">
                          ⏰ ${timeMessage}
                        </h2>
                        <h3 style="margin: 0 0 20px; font-size: 20px; color: #8A4BAF;">
                          ${eventTitle}
                        </h3>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666;">
                          Hola ${name}, te recordamos que tu evento está por comenzar.
                        </p>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666;">
                          📅 <strong>${formattedDate}</strong>
                        </p>

                        ${
                          isOnline && zoomUrl
                            ? `
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 20px; background-color: #eef6ff; border-radius: 8px;">
                                <p style="margin: 0 0 10px; font-size: 16px; color: #2563eb; font-weight: 600;">
                                  🎥 Únete por Zoom:
                                </p>
                                <a href="${zoomUrl}" style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px;">
                                  Unirse ahora
                                </a>
                                ${zoomId ? `<p style="margin: 15px 0 0; font-size: 14px; color: #1e40af;">ID: ${zoomId}</p>` : ""}
                                ${zoomPassword ? `<p style="margin: 5px 0 0; font-size: 14px; color: #1e40af;">Contraseña: ${zoomPassword}</p>` : ""}
                              </td>
                            </tr>
                          </table>
                        `
                            : ""
                        }

                        ${
                          !isOnline
                            ? `
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
                                <p style="margin: 0; font-size: 16px; color: #166534;">
                                  📍 <strong>${venueName || "Evento Presencial"}</strong><br>
                                  ${venueAddress || ""}
                                </p>
                              </td>
                            </tr>
                          </table>
                        `
                            : ""
                        }

                        <p style="margin: 30px 0 0; font-size: 14px; color: #999; text-align: center;">
                          ¡Te esperamos!<br>
                          <strong style="color: #8A4BAF;">Aleyda Paola</strong>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending event reminder:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending event reminder:", error);
    return { success: false, error };
  }
}

// ============================================
// EMAILS DE PACKS DE SESIONES
// ============================================

interface SendPackCodeEmailParams {
  email: string;
  name: string;
  packCode: string;
  expiresAt: Date;
  sessionsTotal: number;
  amount: number;
  currency: "COP" | "USD" | "EUR";
}

export async function sendPackCodeEmail(params: SendPackCodeEmailParams) {
  const { email, name, packCode, expiresAt, sessionsTotal, amount, currency } = params;

  const formattedExpiration = expiresAt.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedAmount =
    currency === "COP"
      ? `$${amount.toLocaleString("es-CO")} COP`
      : currency === "EUR"
        ? `€${amount.toLocaleString("es-ES")} EUR`
        : `$${amount.toLocaleString("en-US")} USD`;

  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 EMAIL DE CÓDIGO DE PACK (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Código: ${packCode}`);
    console.log(`Sesiones: ${sessionsTotal}`);
    console.log(`Total pagado: ${formattedAmount}`);
    console.log(`Expira: ${formattedExpiration}`);
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Tu Pack de ${sessionsTotal} Sesiones está listo - Energía y Divinidad`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tu Pack de Sesiones</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <!-- Success Badge -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <span style="display: inline-block; padding: 8px 20px; background-color: #d1fae5; color: #065f46; border-radius: 20px; font-size: 14px; font-weight: 600;">
                                ✅ Compra Confirmada
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600;">
                          ¡Hola ${name}!
                        </h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          Tu Pack de ${sessionsTotal} Sesiones está listo. Guarda este código para reservar tus sesiones cuando quieras:
                        </p>

                        <!-- Code Box -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 30px 20px; background: linear-gradient(135deg, #8A4BAF 0%, #654177 100%); border-radius: 12px;">
                              <p style="margin: 0 0 10px; font-size: 14px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 2px;">
                                Tu código
                              </p>
                              <p style="margin: 0; font-size: 36px; color: #ffffff; font-weight: 700; letter-spacing: 4px; font-family: monospace;">
                                ${packCode}
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Pack Details -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 25px;">
                          <tr>
                            <td style="padding: 20px; background-color: #f8f0f5; border-radius: 12px;">
                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(138, 75, 175, 0.1);">
                                    <span style="font-size: 14px; color: #666;">Sesiones incluidas:</span>
                                    <span style="float: right; font-size: 14px; color: #654177; font-weight: 600;">${sessionsTotal} sesiones</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(138, 75, 175, 0.1);">
                                    <span style="font-size: 14px; color: #666;">Total pagado:</span>
                                    <span style="float: right; font-size: 14px; color: #654177; font-weight: 600;">${formattedAmount}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="font-size: 14px; color: #666;">Válido hasta:</span>
                                    <span style="float: right; font-size: 14px; color: #654177; font-weight: 600;">${formattedExpiration}</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Instructions -->
                        <h3 style="margin: 30px 0 15px; font-size: 18px; color: #654177;">
                          ¿Cómo usar tu código?
                        </h3>
                        <ol style="margin: 0 0 25px; padding-left: 20px; font-size: 14px; color: #666666; line-height: 2;">
                          <li>Ve a la página de <strong>Sesiones</strong></li>
                          <li>Haz clic en <strong>"¿Tienes un código?"</strong></li>
                          <li>Ingresa tu código: <strong>${packCode}</strong></li>
                          <li>Selecciona la fecha y hora que prefieras</li>
                          <li>¡Listo! Tu sesión quedará reservada</li>
                        </ol>

                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${APP_URL}/sesiones" style="display: inline-block; padding: 16px 40px; background-color: #4944a4; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                Agendar mi primera sesión
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0; font-size: 14px; color: #999999; line-height: 1.6; text-align: center;">
                          Con amor y luz,<br>
                          <strong style="color: #8A4BAF;">Aleyda Paola</strong>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          © ${new Date().getFullYear()} Energía y Divinidad. Todos los derechos reservados.
                        </p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">
                          ¿Preguntas? <a href="mailto:contacto@energiaydivinidad.com" style="color: #8A4BAF;">contacto@energiaydivinidad.com</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending pack code email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending pack code email:", error);
    return { success: false, error };
  }
}

// ============================================
// EMAILS DE REPROGRAMACIÓN Y CANCELACIÓN
// ============================================

interface SendRescheduleEmailParams {
  email: string;
  name: string;
  sessionName: string;
  previousDate: Date | null;
  newDate: Date;
  rescheduledBy: "client" | "admin";
  reason?: string;
}

export async function sendRescheduleEmail(params: SendRescheduleEmailParams) {
  const { email, name, sessionName, previousDate, newDate, rescheduledBy, reason } = params;

  const formatDate = (date: Date) =>
    date.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formattedPreviousDate = previousDate ? formatDate(previousDate) : "No programada";
  const formattedNewDate = formatDate(newDate);

  const rescheduledByText =
    rescheduledBy === "admin"
      ? "Tu sesión ha sido reprogramada por Aleyda Paola."
      : "Has reprogramado tu sesión exitosamente.";

  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 EMAIL DE REPROGRAMACIÓN (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Sesión: ${sessionName}`);
    console.log(`Fecha anterior: ${formattedPreviousDate}`);
    console.log(`Nueva fecha: ${formattedNewDate}`);
    console.log(`Reprogramado por: ${rescheduledBy}`);
    if (reason) {
      console.log(`Motivo: ${reason}`);
    }
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Sesión reprogramada: ${sessionName} - Energía y Divinidad`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sesión Reprogramada</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <!-- Status Badge -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <span style="display: inline-block; padding: 8px 20px; background-color: #dbeafe; color: #1e40af; border-radius: 20px; font-size: 14px; font-weight: 600;">
                                🔄 Sesión Reprogramada
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600;">
                          ¡Hola ${name}!
                        </h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          ${rescheduledByText}
                        </p>

                        <!-- Session Details -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f0f5; border-radius: 12px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <h3 style="margin: 0 0 15px; font-size: 18px; color: #8A4BAF;">
                                ${sessionName}
                              </h3>

                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="padding: 10px 0; border-bottom: 1px solid rgba(138, 75, 175, 0.1);">
                                    <span style="font-size: 14px; color: #999;">Fecha anterior:</span>
                                    <p style="margin: 5px 0 0; font-size: 14px; color: #666; text-decoration: line-through;">
                                      ${formattedPreviousDate}
                                    </p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 10px 0;">
                                    <span style="font-size: 14px; color: #065f46; font-weight: 600;">✅ Nueva fecha:</span>
                                    <p style="margin: 5px 0 0; font-size: 16px; color: #065f46; font-weight: 600;">
                                      ${formattedNewDate}
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        ${
                          reason
                            ? `
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 15px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 20px;">
                              <p style="margin: 0; font-size: 14px; color: #92400e;">
                                <strong>Motivo:</strong> ${reason}
                              </p>
                            </td>
                          </tr>
                        </table>
                        `
                            : ""
                        }

                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 30px 0;">
                              <a href="${APP_URL}/mi-cuenta/sesiones" style="display: inline-block; padding: 16px 40px; background-color: #4944a4; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                Ver mis sesiones
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0; font-size: 14px; color: #999999; line-height: 1.6; text-align: center;">
                          Con amor y luz,<br>
                          <strong style="color: #8A4BAF;">Aleyda Paola</strong>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          © ${new Date().getFullYear()} Energía y Divinidad. Todos los derechos reservados.
                        </p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">
                          ¿Preguntas? <a href="mailto:contacto@energiaydivinidad.com" style="color: #8A4BAF;">contacto@energiaydivinidad.com</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending reschedule email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending reschedule email:", error);
    return { success: false, error };
  }
}

// ============================================
// EMAILS DE CONTACTO
// ============================================

interface SendContactEmailParams {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export async function sendContactEmail(params: SendContactEmailParams) {
  const { name, email, phone, subject, message } = params;

  // Email del destinatario (Aleyda)
  const CONTACT_EMAIL = "contacto@energiaydivinidad.com";

  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 EMAIL DE CONTACTO (Modo Desarrollo)");
    console.log("========================================");
    console.log(`De: ${name} <${email}>`);
    console.log(`Teléfono: ${phone || "No proporcionado"}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Mensaje: ${message}`);
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `[Contacto Web] ${subject} - ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nuevo mensaje de contacto</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                        <p style="margin: 10px 0 0; font-size: 14px; color: #666;">
                          Nuevo mensaje desde el formulario de contacto
                        </p>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <!-- Subject Badge -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <span style="display: inline-block; padding: 8px 20px; background-color: #f8f0f5; color: #8A4BAF; border-radius: 20px; font-size: 14px; font-weight: 600;">
                                📩 ${subject}
                              </span>
                            </td>
                          </tr>
                        </table>

                        <!-- Contact Info -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f0f5; border-radius: 12px; margin-bottom: 25px;">
                          <tr>
                            <td style="padding: 20px;">
                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(138, 75, 175, 0.1);">
                                    <span style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Nombre</span>
                                    <p style="margin: 5px 0 0; font-size: 16px; color: #654177; font-weight: 600;">
                                      ${name}
                                    </p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(138, 75, 175, 0.1);">
                                    <span style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Email</span>
                                    <p style="margin: 5px 0 0; font-size: 16px; color: #654177;">
                                      <a href="mailto:${email}" style="color: #8A4BAF; text-decoration: none;">${email}</a>
                                    </p>
                                  </td>
                                </tr>
                                ${
                                  phone
                                    ? `
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Teléfono/WhatsApp</span>
                                    <p style="margin: 5px 0 0; font-size: 16px; color: #654177;">
                                      <a href="https://wa.me/${phone.replace(/[^0-9]/g, "")}" style="color: #25D366; text-decoration: none;">${phone}</a>
                                    </p>
                                  </td>
                                </tr>
                                `
                                    : ""
                                }
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Message -->
                        <h3 style="margin: 0 0 15px; font-size: 16px; color: #654177;">
                          Mensaje:
                        </h3>
                        <div style="padding: 20px; background-color: #fafafa; border-radius: 8px; border-left: 4px solid #8A4BAF;">
                          <p style="margin: 0; font-size: 15px; color: #4A4A4A; line-height: 1.7; white-space: pre-wrap;">
${message}
                          </p>
                        </div>

                        <!-- Reply Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 30px 0 0;">
                              <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" style="display: inline-block; padding: 14px 35px; background-color: #4944a4; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                                Responder a ${name.split(" ")[0]}
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          Este mensaje fue enviado desde el formulario de contacto de energiaydivinidad.com
                        </p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">
                          ${new Date().toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" })}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending contact email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending contact email:", error);
    return { success: false, error };
  }
}

// ============================================
// EMAILS DE CONFIRMACIÓN DE RESERVA (CRÉDITOS)
// ============================================

interface SendBookingConfirmationEmailParams {
  email: string;
  name: string;
  sessionName: string;
  scheduledAt: Date;
  duration: number;
  deliveryMethod: string;
  bookingId: string;
  paidWithCredit?: boolean;
  meetingLink?: string;
}

export async function sendBookingConfirmationEmail(params: SendBookingConfirmationEmailParams) {
  const {
    email,
    name,
    sessionName,
    scheduledAt,
    duration,
    deliveryMethod,
    bookingId,
    paidWithCredit,
    meetingLink,
  } = params;

  const formattedDate = scheduledAt.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const paymentNote = paidWithCredit
    ? "✨ Esta sesión fue reservada con un crédito de tu membresía."
    : "";

  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 EMAIL DE CONFIRMACIÓN DE RESERVA (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Sesión: ${sessionName}`);
    console.log(`Fecha: ${formattedDate}`);
    console.log(`Duración: ${duration} minutos`);
    console.log(`Método: ${deliveryMethod}`);
    console.log(`ID Reserva: ${bookingId}`);
    if (paidWithCredit) {
      console.log(`Pagado con crédito: Sí`);
    }
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `¡Sesión confirmada! ${sessionName} - Energía y Divinidad`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reserva Confirmada</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <!-- Status Badge -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <span style="display: inline-block; padding: 8px 20px; background-color: #d1fae5; color: #065f46; border-radius: 20px; font-size: 14px; font-weight: 600;">
                                ✅ Reserva Confirmada
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600;">
                          ¡Hola ${name}!
                        </h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          Tu sesión ha sido confirmada. Nos vemos pronto.
                        </p>

                        <!-- Session Details -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f0f5; border-radius: 12px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <h3 style="margin: 0 0 15px; font-size: 18px; color: #8A4BAF;">
                                ${sessionName}
                              </h3>
                              <p style="margin: 0 0 8px; font-size: 14px; color: #654177;">
                                📅 <strong>Fecha:</strong> ${formattedDate}
                              </p>
                              <p style="margin: 0 0 8px; font-size: 14px; color: #654177;">
                                ⏱️ <strong>Duración:</strong> ${duration} minutos
                              </p>
                              <p style="margin: 0; font-size: 14px; color: #654177;">
                                📍 <strong>Modalidad:</strong> ${deliveryMethod}
                              </p>
                            </td>
                          </tr>
                        </table>

                        ${
                          paidWithCredit
                            ? `
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 15px; background-color: #ede9fe; border-radius: 8px;">
                              <p style="margin: 0; font-size: 14px; color: #5b21b6;">
                                ${paymentNote}
                              </p>
                            </td>
                          </tr>
                        </table>
                        `
                            : ""
                        }

                        <p style="margin: 0 0 10px; font-size: 14px; color: #999999; line-height: 1.6;">
                          <strong>ID de reserva:</strong> ${bookingId}
                        </p>

                        <!-- Enlace de reunión -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 16px 20px; background-color: #eef1fa; border-radius: 12px; border-left: 4px solid #4944a4;">
                              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #4944a4;">
                                🔗 Enlace de conexión
                              </p>
                              ${
                                meetingLink
                                  ? `<a href="${meetingLink}" style="font-size: 14px; color: #4944a4; word-break: break-all;">${meetingLink}</a>`
                                  : `<p style="margin: 0; font-size: 14px; color: #654177; font-style: italic;">Aleyda te enviará el enlace poco antes de tu sesión.</p>`
                              }
                            </td>
                          </tr>
                        </table>

                        <!-- Instrucciones de preparación -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                          <tr>
                            <td style="padding: 20px; background-color: #fdf8ff; border-radius: 12px; border: 1px solid #e9d8f4;">
                              <p style="margin: 0 0 14px; font-size: 15px; color: #654177; line-height: 1.6;">
                                ${name.split(" ")[0]}, te envío la siguiente información para que la tengas presente para tu <strong>Consulta de Canalización</strong>:
                              </p>
                              <p style="margin: 0 0 8px; font-size: 14px; color: #654177; line-height: 1.7;">
                                🌿 Busca un lugar tranquilo y seguro, donde puedas estar en calma y sin interrupciones.
                              </p>
                              <p style="margin: 0 0 8px; font-size: 14px; color: #654177; line-height: 1.7;">
                                🕊️ Respira profundo unos minutos y permite que tu mente se aquiete.
                              </p>
                              <p style="margin: 0 0 8px; font-size: 14px; color: #654177; line-height: 1.7;">
                                🤍 Ten preparadas tus preguntas desde el corazón.
                              </p>
                              <p style="margin: 0 0 8px; font-size: 14px; color: #654177; line-height: 1.7;">
                                ✨ Llega con el corazón abierto y la mente en paz.
                              </p>
                              <p style="margin: 0 0 14px; font-size: 14px; color: #654177; line-height: 1.7;">
                                🌟 Permite que los Seres de Luz te acompañen y te entreguen la orientación que necesitas en este momento de tu camino.
                              </p>
                              <p style="margin: 0; font-size: 14px; color: #8A4BAF; font-style: italic;">
                                Todo llega con amor, claridad y guía divina 💫
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 10px 0 30px;">
                              <a href="${APP_URL}/mi-cuenta" style="display: inline-block; padding: 16px 40px; background-color: #4944a4; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                Ver mis reservas
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0; font-size: 14px; color: #999999; line-height: 1.6; text-align: center;">
                          Con amor y luz,<br>
                          <strong style="color: #8A4BAF;">Aleyda Paola</strong>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 0; text-align: center;">
                        <p style="margin: 0 0 10px; font-size: 12px; color: #999999;">
                          Si necesitas reprogramar o cancelar tu sesión, hazlo con al menos 24 horas de anticipación.
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          ${new Date().getFullYear()} Energía y Divinidad. Todos los derechos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending booking confirmation email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
    return { success: false, error };
  }
}

// ============================================
// EMAILS DE CONFIRMACIÓN DE PAGO
// ============================================

interface SendPaymentConfirmationEmailParams {
  email: string;
  name: string;
  orderNumber: string;
  orderType: "PRODUCT" | "SESSION" | "EVENT" | "MEMBERSHIP" | "PREMIUM_CONTENT" | "COURSE";
  itemName: string;
  amount: number;
  currency: "COP" | "USD" | "EUR";
  paymentMethod: string;
  transactionId?: string;
  // Links específicos según tipo de producto
  productLink?: string;
  // Datos adicionales según tipo
  sessionDate?: Date;
  meetingLink?: string;
  membershipPlan?: string;
  eventDate?: Date;
  // Token para establecer contraseña (solo para nuevos usuarios de guest checkout)
  setPasswordToken?: string;
}

export async function sendPaymentConfirmationEmail(params: SendPaymentConfirmationEmailParams) {
  const {
    email,
    name,
    orderNumber,
    orderType,
    itemName,
    amount,
    currency,
    paymentMethod,
    transactionId,
    productLink,
    sessionDate,
    meetingLink,
    membershipPlan,
    eventDate,
    setPasswordToken,
  } = params;

  const formattedAmount =
    currency === "COP"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(amount)
      : currency === "EUR"
        ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
        : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  // Determinar el texto y link según tipo de producto
  let productTypeText = "";
  let ctaText = "";
  let ctaLink = productLink || APP_URL;
  let additionalInfo = "";

  switch (orderType) {
    case "SESSION":
      productTypeText = "Sesión de Canalización";
      ctaText = "Ver mis sesiones";
      ctaLink = productLink || `${APP_URL}/mi-cuenta/sesiones`;
      if (sessionDate) {
        additionalInfo = `
          <tr>
            <td style="padding: 8px 0;">
              <span style="font-size: 14px; color: #666;">Fecha programada:</span>
              <span style="float: right; font-size: 14px; color: #654177; font-weight: 600;">
                ${sessionDate.toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </td>
          </tr>
        `;
      }
      break;
    case "MEMBERSHIP":
      productTypeText = "Membresía";
      ctaText = "Ir a mi cuenta";
      ctaLink = productLink || `${APP_URL}/mi-cuenta`;
      if (membershipPlan) {
        additionalInfo = `
          <tr>
            <td style="padding: 8px 0;">
              <span style="font-size: 14px; color: #666;">Plan:</span>
              <span style="float: right; font-size: 14px; color: #654177; font-weight: 600;">${membershipPlan}</span>
            </td>
          </tr>
        `;
      }
      break;
    case "EVENT":
      productTypeText = "Evento";
      ctaText = "Ver mis reservas";
      ctaLink = productLink || `${APP_URL}/dashboard/eventos`;
      if (eventDate) {
        additionalInfo = `
          <tr>
            <td style="padding: 8px 0;">
              <span style="font-size: 14px; color: #666;">Fecha del evento:</span>
              <span style="float: right; font-size: 14px; color: #654177; font-weight: 600;">
                ${eventDate.toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </td>
          </tr>
        `;
      }
      break;
    case "PREMIUM_CONTENT":
      productTypeText = "Contenido Premium";
      ctaText = "Ver mi contenido";
      ctaLink = productLink || `${APP_URL}/mi-cuenta/contenido`;
      break;
    case "COURSE":
      productTypeText = "Curso";
      ctaText = "Ir a mis cursos";
      ctaLink = productLink || `${APP_URL}/mi-cuenta/cursos`;
      break;
    default:
      productTypeText = "Producto";
      ctaText = "Ir a mi cuenta";
      ctaLink = productLink || `${APP_URL}/mi-cuenta`;
  }

  // Mapear método de pago a texto legible
  const paymentMethodText =
    paymentMethod === "WOMPI_CARD"
      ? "Tarjeta de crédito"
      : paymentMethod === "WOMPI_NEQUI"
        ? "Nequi"
        : paymentMethod === "PAYPAL_DIRECT"
          ? "PayPal"
          : paymentMethod === "PAYPAL_CARD"
            ? "Tarjeta de crédito (PayPal)"
            : paymentMethod;

  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 EMAIL DE CONFIRMACIÓN DE PAGO (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Orden: ${orderNumber}`);
    console.log(`Tipo: ${productTypeText}`);
    console.log(`Producto: ${itemName}`);
    console.log(`Total: ${formattedAmount}`);
    console.log(`Método: ${paymentMethodText}`);
    if (transactionId) {
      console.log(`Transacción: ${transactionId}`);
    }
    console.log(`Link: ${ctaLink}`);
    if (setPasswordToken) {
      console.log(`\n🔐 SET PASSWORD LINK:`);
      console.log(`${APP_URL}/auth/set-password?token=${setPasswordToken}`);
    }
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `¡Pago confirmado! ${itemName} - Energía y Divinidad`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmación de Pago</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <!-- Success Badge -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <table role="presentation" style="border-collapse: collapse; margin: 0 auto;">
                                <tr>
                                  <td style="width: 80px; height: 80px; background-color: #d1fae5; border-radius: 50%; text-align: center; vertical-align: middle;">
                                    <span style="font-size: 36px; color: #065f46; font-weight: bold; line-height: 80px;">&#10003;</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <span style="display: inline-block; padding: 8px 20px; background-color: #d1fae5; color: #065f46; border-radius: 20px; font-size: 14px; font-weight: 600;">
                                Pago Confirmado
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600; text-align: center;">
                          ¡Gracias por tu compra, ${name}!
                        </h2>
                        <p style="margin: 0 0 25px; font-size: 16px; color: #666666; line-height: 1.6; text-align: center;">
                          Tu pago ha sido procesado exitosamente. Aquí están los detalles de tu compra:
                        </p>

                        <!-- Order Details -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f0f5; border-radius: 12px; margin-bottom: 25px;">
                          <tr>
                            <td style="padding: 25px;">
                              <h3 style="margin: 0 0 20px; font-size: 18px; color: #8A4BAF;">
                                ${itemName}
                              </h3>
                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(138, 75, 175, 0.1);">
                                    <span style="font-size: 14px; color: #666;">Tipo:</span>
                                    <span style="float: right; font-size: 14px; color: #654177; font-weight: 600;">${productTypeText}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(138, 75, 175, 0.1);">
                                    <span style="font-size: 14px; color: #666;">N° de orden:</span>
                                    <span style="float: right; font-size: 14px; color: #654177; font-weight: 600;">${orderNumber}</span>
                                  </td>
                                </tr>
                                ${additionalInfo}
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(138, 75, 175, 0.1);">
                                    <span style="font-size: 14px; color: #666;">Método de pago:</span>
                                    <span style="float: right; font-size: 14px; color: #654177; font-weight: 600;">${paymentMethodText}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 12px 0 0;">
                                    <span style="font-size: 16px; color: #654177; font-weight: 600;">Total pagado:</span>
                                    <span style="float: right; font-size: 18px; color: #065f46; font-weight: 700;">${formattedAmount}</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        ${
                          transactionId
                            ? `
                        <p style="margin: 0 0 25px; font-size: 12px; color: #999; text-align: center;">
                          ID de transacción: ${transactionId}
                        </p>
                        `
                            : ""
                        }

                        ${
                          orderType === "SESSION" && sessionDate
                            ? `
                        <!-- Enlace de reunión -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 16px 20px; background-color: #eef1fa; border-radius: 12px; border-left: 4px solid #4944a4;">
                              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #4944a4;">
                                🔗 Enlace de conexión
                              </p>
                              ${
                                meetingLink
                                  ? `<a href="${meetingLink}" style="font-size: 14px; color: #4944a4; word-break: break-all;">${meetingLink}</a>`
                                  : `<p style="margin: 0; font-size: 14px; color: #654177; font-style: italic;">Aleyda te enviará el enlace poco antes de tu sesión.</p>`
                              }
                            </td>
                          </tr>
                        </table>

                        <!-- Instrucciones de preparación -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                          <tr>
                            <td style="padding: 20px; background-color: #fdf8ff; border-radius: 12px; border: 1px solid #e9d8f4;">
                              <p style="margin: 0 0 14px; font-size: 15px; color: #654177; line-height: 1.6;">
                                ${name.split(" ")[0]}, te envío la siguiente información para que la tengas presente para tu <strong>Consulta de Canalización</strong>:
                              </p>
                              <p style="margin: 0 0 8px; font-size: 14px; color: #654177; line-height: 1.7;">
                                🌿 Busca un lugar tranquilo y seguro, donde puedas estar en calma y sin interrupciones.
                              </p>
                              <p style="margin: 0 0 8px; font-size: 14px; color: #654177; line-height: 1.7;">
                                🕊️ Respira profundo unos minutos y permite que tu mente se aquiete.
                              </p>
                              <p style="margin: 0 0 8px; font-size: 14px; color: #654177; line-height: 1.7;">
                                🤍 Ten preparadas tus preguntas desde el corazón.
                              </p>
                              <p style="margin: 0 0 8px; font-size: 14px; color: #654177; line-height: 1.7;">
                                ✨ Llega con el corazón abierto y la mente en paz.
                              </p>
                              <p style="margin: 0 0 14px; font-size: 14px; color: #654177; line-height: 1.7;">
                                🌟 Permite que los Seres de Luz te acompañen y te entreguen la orientación que necesitas en este momento de tu camino.
                              </p>
                              <p style="margin: 0; font-size: 14px; color: #8A4BAF; font-style: italic;">
                                Todo llega con amor, claridad y guía divina 💫
                              </p>
                            </td>
                          </tr>
                        </table>
                        `
                            : ""
                        }

                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${ctaLink}" style="display: inline-block; padding: 16px 40px; background-color: #4944a4; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                ${ctaText}
                              </a>
                            </td>
                          </tr>
                        </table>

                        ${
                          setPasswordToken
                            ? `
                        <!-- Set Password Section -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 25px;">
                          <tr>
                            <td style="background-color: #eef1fa; border-radius: 12px; padding: 20px; border-left: 4px solid #8A4BAF;">
                              <h4 style="margin: 0 0 12px; font-size: 16px; color: #654177; font-weight: 600;">
                                🔐 Establece tu contraseña
                              </h4>
                              <p style="margin: 0 0 15px; font-size: 14px; color: #666666; line-height: 1.5;">
                                Hemos creado una cuenta para ti con este email. Para acceder a tus compras y gestionar tu cuenta, establece tu contraseña:
                              </p>
                              <a href="${APP_URL}/auth/set-password?token=${setPasswordToken}" style="display: inline-block; padding: 12px 24px; background-color: #8A4BAF; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                                Crear mi contraseña
                              </a>
                              <p style="margin: 12px 0 0; font-size: 12px; color: #999999;">
                                Este enlace expira en 7 días.
                              </p>
                            </td>
                          </tr>
                        </table>
                        `
                            : ""
                        }

                        <p style="margin: 25px 0 0; font-size: 14px; color: #999999; line-height: 1.6; text-align: center;">
                          Con amor y luz,<br>
                          <strong style="color: #8A4BAF;">Aleyda Paola</strong>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          © ${new Date().getFullYear()} Energía y Divinidad. Todos los derechos reservados.
                        </p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">
                          ¿Preguntas? <a href="mailto:contacto@energiaydivinidad.com" style="color: #8A4BAF;">contacto@energiaydivinidad.com</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending payment confirmation email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending payment confirmation email:", error);
    return { success: false, error };
  }
}

// ============================================
// EMAILS DE CANCELACIÓN DE SESIONES
// ============================================

interface SendCancellationEmailParams {
  email: string;
  name: string;
  sessionName: string;
  scheduledDate: Date | null;
  cancelledBy: "client" | "admin";
  reason?: string;
  packSessionReturned?: boolean;
  creditRefunded?: boolean;
}

export async function sendCancellationEmail(params: SendCancellationEmailParams) {
  const {
    email,
    name,
    sessionName,
    scheduledDate,
    cancelledBy,
    reason,
    packSessionReturned,
    creditRefunded,
  } = params;

  const formattedDate = scheduledDate
    ? scheduledDate.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No programada";

  const cancelledByText =
    cancelledBy === "admin"
      ? "Tu sesión ha sido cancelada por Aleyda Paola."
      : "Has cancelado tu sesión.";

  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 EMAIL DE CANCELACIÓN (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Sesión: ${sessionName}`);
    console.log(`Fecha: ${formattedDate}`);
    console.log(`Cancelado por: ${cancelledBy}`);
    if (reason) {
      console.log(`Motivo: ${reason}`);
    }
    if (packSessionReturned) {
      console.log(`Sesión devuelta al pack: Sí`);
    }
    if (creditRefunded) {
      console.log(`Crédito reembolsado: Sí`);
    }
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Sesión cancelada: ${sessionName} - Energía y Divinidad`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sesión Cancelada</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <a href="${APP_URL}" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Energía y Divinidad" style="max-width: 200px; height: auto;" />
                        </a>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <!-- Status Badge -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <span style="display: inline-block; padding: 8px 20px; background-color: #fee2e2; color: #991b1b; border-radius: 20px; font-size: 14px; font-weight: 600;">
                                ❌ Sesión Cancelada
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600;">
                          Hola ${name}
                        </h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          ${cancelledByText}
                        </p>

                        <!-- Session Details -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef2f2; border-radius: 12px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <h3 style="margin: 0 0 15px; font-size: 18px; color: #991b1b; text-decoration: line-through;">
                                ${sessionName}
                              </h3>
                              <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
                                📅 ${formattedDate}
                              </p>
                            </td>
                          </tr>
                        </table>

                        ${
                          reason
                            ? `
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 15px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 20px;">
                              <p style="margin: 0; font-size: 14px; color: #92400e;">
                                <strong>Motivo:</strong> ${reason}
                              </p>
                            </td>
                          </tr>
                        </table>
                        `
                            : ""
                        }

                        ${
                          packSessionReturned
                            ? `
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                          <tr>
                            <td style="padding: 15px; background-color: #d1fae5; border-radius: 8px;">
                              <p style="margin: 0; font-size: 14px; color: #065f46;">
                                ✅ <strong>Buenas noticias:</strong> La sesión ha sido devuelta a tu pack. Puedes usarla para reservar en otra fecha.
                              </p>
                            </td>
                          </tr>
                        </table>
                        `
                            : ""
                        }

                        ${
                          creditRefunded
                            ? `
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                          <tr>
                            <td style="padding: 15px; background-color: #d1fae5; border-radius: 8px;">
                              <p style="margin: 0; font-size: 14px; color: #065f46;">
                                ✅ <strong>Buenas noticias:</strong> Tu crédito de sesión ha sido reembolsado. Puedes usarlo para reservar en otra fecha.
                              </p>
                            </td>
                          </tr>
                        </table>
                        `
                            : ""
                        }

                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 30px 0;">
                              <a href="${APP_URL}/sesiones" style="display: inline-block; padding: 16px 40px; background-color: #4944a4; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                Reservar nueva sesión
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0; font-size: 14px; color: #999999; line-height: 1.6; text-align: center;">
                          Con amor y luz,<br>
                          <strong style="color: #8A4BAF;">Aleyda Paola</strong>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">
                          © ${new Date().getFullYear()} Energía y Divinidad. Todos los derechos reservados.
                        </p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">
                          ¿Preguntas? <a href="mailto:contacto@energiaydivinidad.com" style="color: #8A4BAF;">contacto@energiaydivinidad.com</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending cancellation email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending cancellation email:", error);
    return { success: false, error };
  }
}

// ============================================
// NOTIFICACIONES AL ADMINISTRADOR
// ============================================

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "admin@energiaydivinidad.com";

type SaleType =
  | "SESSION"
  | "SESSION_PACK"
  | "MEMBERSHIP"
  | "EVENT"
  | "COURSE"
  | "PREMIUM_CONTENT"
  | "PRODUCT";

interface AdminNotificationParams {
  saleType: SaleType;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemName: string;
  amount: number;
  currency: "COP" | "USD" | "EUR";
  paymentMethod: string;
  orderNumber: string;
  transactionId?: string;
  // Datos específicos según tipo
  sessionDate?: Date;
  sessionCount?: number; // Para packs
  membershipPlan?: string;
  membershipInterval?: "monthly" | "yearly";
  eventDate?: Date;
  eventSeats?: number;
  eventType?: "online" | "in_person";
}

/**
 * Envía una notificación al administrador cuando se confirma una venta.
 * Incluye todos los detalles relevantes según el tipo de producto.
 */
export async function sendAdminNotificationEmail(params: AdminNotificationParams) {
  const {
    saleType,
    customerName,
    customerEmail,
    customerPhone,
    itemName,
    amount,
    currency,
    paymentMethod,
    orderNumber,
    transactionId,
    sessionDate,
    sessionCount,
    membershipPlan,
    membershipInterval,
    eventDate,
    eventSeats,
    eventType,
  } = params;

  const formattedAmount =
    currency === "COP"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(amount)
      : currency === "EUR"
        ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
        : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Configurar textos según tipo de venta
  const saleTypeConfig: Record<SaleType, { emoji: string; label: string; color: string }> = {
    SESSION: { emoji: "🔮", label: "Sesión de Canalización", color: "#8A4BAF" },
    SESSION_PACK: { emoji: "📦", label: "Pack de Sesiones", color: "#654177" },
    MEMBERSHIP: { emoji: "⭐", label: "Membresía", color: "#C77DBA" },
    EVENT: { emoji: "📅", label: "Evento", color: "#2D4CC7" },
    COURSE: { emoji: "📚", label: "Curso", color: "#059669" },
    PREMIUM_CONTENT: { emoji: "🎬", label: "Contenido Premium", color: "#7c3aed" },
    PRODUCT: { emoji: "🛍️", label: "Producto", color: "#d97706" },
  };

  const config = saleTypeConfig[saleType];

  // Mapear método de pago a texto legible
  const paymentMethodText =
    paymentMethod === "WOMPI_CARD"
      ? "Tarjeta (Wompi)"
      : paymentMethod === "WOMPI_NEQUI"
        ? "Nequi (Wompi)"
        : paymentMethod === "PAYPAL_DIRECT"
          ? "PayPal"
          : paymentMethod === "PAYPAL_CARD"
            ? "Tarjeta (PayPal)"
            : paymentMethod === "STRIPE"
              ? "Stripe"
              : paymentMethod === "NEQUI_PUSH"
                ? "Nequi Push"
                : paymentMethod;

  // Construir detalles específicos según tipo
  let specificDetails = "";

  if (saleType === "SESSION" && sessionDate) {
    specificDetails = `
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #eee;">
          <span style="color: #666;">📅 Fecha programada:</span>
          <strong style="float: right; color: #333;">${formatDate(sessionDate)}</strong>
        </td>
      </tr>
    `;
  }

  if (saleType === "SESSION_PACK" && sessionCount) {
    specificDetails = `
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #eee;">
          <span style="color: #666;">📦 Sesiones en pack:</span>
          <strong style="float: right; color: #333;">${sessionCount} sesiones</strong>
        </td>
      </tr>
    `;
  }

  if (saleType === "MEMBERSHIP") {
    specificDetails = `
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #eee;">
          <span style="color: #666;">⭐ Plan:</span>
          <strong style="float: right; color: #333;">${membershipPlan || itemName}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #eee;">
          <span style="color: #666;">🔄 Frecuencia:</span>
          <strong style="float: right; color: #333;">${membershipInterval === "yearly" ? "Anual" : "Mensual"}</strong>
        </td>
      </tr>
    `;
  }

  if (saleType === "EVENT") {
    specificDetails = `
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #eee;">
          <span style="color: #666;">📅 Fecha del evento:</span>
          <strong style="float: right; color: #333;">${eventDate ? formatDate(eventDate) : "Por definir"}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #eee;">
          <span style="color: #666;">👥 Cupos reservados:</span>
          <strong style="float: right; color: #333;">${eventSeats || 1}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #eee;">
          <span style="color: #666;">📍 Modalidad:</span>
          <strong style="float: right; color: #333;">${eventType === "online" ? "Online (Zoom)" : "Presencial"}</strong>
        </td>
      </tr>
    `;
  }

  const subject = `${config.emoji} Nueva venta: ${itemName} - ${formattedAmount}`;

  if (DEV_MODE) {
    console.log("\n========================================");
    console.log("📧 NOTIFICACIÓN ADMIN (Modo Desarrollo)");
    console.log("========================================");
    console.log(`Para: ${ADMIN_EMAIL}`);
    console.log(`Tipo: ${config.label}`);
    console.log(`Cliente: ${customerName} <${customerEmail}>`);
    if (customerPhone) {
      console.log(`Teléfono: ${customerPhone}`);
    }
    console.log(`Producto: ${itemName}`);
    console.log(`Total: ${formattedAmount}`);
    console.log(`Método: ${paymentMethodText}`);
    console.log(`Orden: ${orderNumber}`);
    if (transactionId) {
      console.log(`Transacción: ${transactionId}`);
    }
    console.log("========================================\n");

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: "dev-mode-simulated" } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nueva Venta</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 550px; border-collapse: collapse;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, ${config.color} 0%, #654177 100%); border-radius: 12px 12px 0 0; padding: 25px; text-align: center;">
                        <span style="font-size: 40px;">${config.emoji}</span>
                        <h1 style="margin: 10px 0 5px; font-size: 22px; color: #ffffff; font-weight: 600;">
                          ¡Nueva Venta!
                        </h1>
                        <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">
                          ${config.label}
                        </p>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; padding: 25px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
                        <!-- Amount highlight -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                          <tr>
                            <td align="center" style="padding: 20px; background-color: #f0fdf4; border-radius: 10px; border: 2px solid #86efac;">
                              <p style="margin: 0 0 5px; font-size: 14px; color: #166534; text-transform: uppercase; letter-spacing: 1px;">
                                Total Recibido
                              </p>
                              <p style="margin: 0; font-size: 32px; color: #15803d; font-weight: 700;">
                                ${formattedAmount}
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Product -->
                        <h2 style="margin: 0 0 20px; font-size: 18px; color: #333; border-bottom: 2px solid ${config.color}; padding-bottom: 10px;">
                          ${itemName}
                        </h2>

                        <!-- Customer Info -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fafafa; border-radius: 8px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 15px; border-bottom: 1px solid #eee;">
                              <strong style="color: #654177;">👤 Cliente</strong>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 15px; border-bottom: 1px solid #eee;">
                              <span style="color: #666;">Nombre:</span>
                              <strong style="float: right; color: #333;">${customerName}</strong>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 15px; ${customerPhone ? "border-bottom: 1px solid #eee;" : ""}">
                              <span style="color: #666;">Email:</span>
                              <a href="mailto:${customerEmail}" style="float: right; color: #8A4BAF; text-decoration: none;">${customerEmail}</a>
                            </td>
                          </tr>
                          ${
                            customerPhone
                              ? `
                          <tr>
                            <td style="padding: 10px 15px;">
                              <span style="color: #666;">Teléfono:</span>
                              <a href="https://wa.me/${customerPhone.replace(/[^0-9]/g, "")}" style="float: right; color: #25D366; text-decoration: none;">${customerPhone}</a>
                            </td>
                          </tr>
                          `
                              : ""
                          }
                        </table>

                        <!-- Order Details -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fafafa; border-radius: 8px; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 15px; border-bottom: 1px solid #eee;">
                              <strong style="color: #654177;">📋 Detalles de la Venta</strong>
                            </td>
                          </tr>
                          ${specificDetails}
                          <tr>
                            <td style="padding: 10px 15px; border-bottom: 1px solid #eee;">
                              <span style="color: #666;">Método de pago:</span>
                              <strong style="float: right; color: #333;">${paymentMethodText}</strong>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 15px; ${transactionId ? "border-bottom: 1px solid #eee;" : ""}">
                              <span style="color: #666;">N° de orden:</span>
                              <strong style="float: right; color: #333; font-family: monospace;">${orderNumber}</strong>
                            </td>
                          </tr>
                          ${
                            transactionId
                              ? `
                          <tr>
                            <td style="padding: 10px 15px;">
                              <span style="color: #666;">ID Transacción:</span>
                              <span style="float: right; color: #666; font-family: monospace; font-size: 12px;">${transactionId}</span>
                            </td>
                          </tr>
                          `
                              : ""
                          }
                        </table>

                        <!-- Quick Actions -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding: 10px 0;">
                              <a href="${APP_URL}/admin" style="display: inline-block; padding: 12px 30px; background-color: #4944a4; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                Ver en Dashboard
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9fafb; border-radius: 0 0 12px 12px; padding: 20px; text-align: center; border: 1px solid #eee; border-top: none;">
                        <p style="margin: 0; font-size: 12px; color: #999;">
                          Notificación automática de Energía y Divinidad
                        </p>
                        <p style="margin: 5px 0 0; font-size: 12px; color: #999;">
                          ${new Date().toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" })}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending admin notification email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending admin notification email:", error);
    return { success: false, error };
  }
}

// ============================================
// EMAILS DE LISTA DE ESPERA
// ============================================

interface WaitlistJoinedEmailParams {
  email: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  position: number;
  seatsRequested: number;
}

/**
 * Send email when user joins waitlist
 */
export async function sendWaitlistJoinedEmail(params: WaitlistJoinedEmailParams) {
  const { email, name, eventTitle, eventDate, position, seatsRequested } = params;

  const formattedDate = new Date(eventDate).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const seatsText = seatsRequested > 1 ? `${seatsRequested} cupos` : "1 cupo";

  return sendEmailWithLogging({
    to: email,
    subject: `Te has unido a la lista de espera - ${eventTitle}`,
    template: "waitlist_joined",
    entityType: "event",
    metadata: { eventTitle, position, seatsRequested },
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8f0f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
            <tr>
              <td style="background-color: white; border-radius: 12px; padding: 0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="background: linear-gradient(135deg, #8A4BAF 0%, #654177 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                      <img src="${LOGO_URL}" alt="Energía y Divinidad" style="width: 60px; height: auto; margin-bottom: 15px;">
                      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                        Lista de Espera
                      </h1>
                    </td>
                  </tr>
                </table>

                <!-- Content -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 30px;">
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                        Hola <strong>${name}</strong>,
                      </p>
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                        Te has unido a la lista de espera para el evento:
                      </p>

                      <!-- Event Info Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #f8f0f5; border-radius: 8px; padding: 20px; border-left: 4px solid #8A4BAF;">
                            <h2 style="margin: 0 0 10px; font-size: 18px; color: #654177;">
                              ${eventTitle}
                            </h2>
                            <p style="margin: 0 0 8px; font-size: 14px; color: #666;">
                              📅 ${formattedDate}
                            </p>
                            <p style="margin: 0; font-size: 14px; color: #666;">
                              🎟️ ${seatsText} solicitado(s)
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Position Info -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #eef1fa; border-radius: 8px; padding: 20px; text-align: center;">
                            <p style="margin: 0 0 5px; font-size: 14px; color: #2D4CC7;">
                              Tu posición en la lista:
                            </p>
                            <p style="margin: 0; font-size: 48px; font-weight: bold; color: #2D4CC7;">
                              #${position}
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 20px 0; font-size: 14px; color: #666; line-height: 1.6;">
                        Te notificaremos por email cuando haya un cupo disponible para ti.
                        Tendrás <strong>24 horas</strong> para confirmar tu reserva una vez recibas la notificación.
                      </p>

                      <!-- CTA Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 20px 0; text-align: center;">
                            <a href="${APP_URL}/mi-cuenta/eventos" style="display: inline-block; background-color: #4944a4; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                              Ver mis eventos
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Footer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="background-color: #f9fafb; border-radius: 0 0 12px 12px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #999;">
                        Con amor y luz,<br>Aleyda Paola y Energía y Divinidad
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

interface WaitlistOfferEmailParams {
  email: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  seats: number;
  expiresAt: Date;
}

/**
 * Send email when a spot becomes available from waitlist
 */
export async function sendWaitlistOfferEmail(params: WaitlistOfferEmailParams) {
  const { email, name, eventTitle, eventDate, seats, expiresAt } = params;

  const formattedDate = new Date(eventDate).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedExpiry = expiresAt.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const seatsText = seats > 1 ? `${seats} cupos` : "1 cupo";

  return sendEmailWithLogging({
    to: email,
    subject: `🎉 ¡Cupo disponible! - ${eventTitle}`,
    template: "waitlist_offer",
    entityType: "event",
    metadata: { eventTitle, seats, expiresAt: expiresAt.toISOString() },
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8f0f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
            <tr>
              <td style="background-color: white; border-radius: 12px; padding: 0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                      <img src="${LOGO_URL}" alt="Energía y Divinidad" style="width: 60px; height: auto; margin-bottom: 15px;">
                      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                        🎉 ¡Cupo Disponible!
                      </h1>
                    </td>
                  </tr>
                </table>

                <!-- Content -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 30px;">
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                        ¡Hola <strong>${name}</strong>! 🌟
                      </p>
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                        ¡Buenas noticias! Se ha liberado un cupo para el evento al que estabas esperando:
                      </p>

                      <!-- Event Info Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; border-left: 4px solid #22c55e;">
                            <h2 style="margin: 0 0 10px; font-size: 18px; color: #166534;">
                              ${eventTitle}
                            </h2>
                            <p style="margin: 0 0 8px; font-size: 14px; color: #15803d;">
                              📅 ${formattedDate}
                            </p>
                            <p style="margin: 0; font-size: 14px; color: #15803d;">
                              🎟️ ${seatsText} disponible(s) para ti
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Urgency Alert -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #fef3c7; border-radius: 8px; padding: 20px; border-left: 4px solid #f59e0b;">
                            <p style="margin: 0 0 5px; font-size: 14px; color: #92400e; font-weight: bold;">
                              ⏰ Tienes hasta:
                            </p>
                            <p style="margin: 0; font-size: 16px; color: #78350f; font-weight: bold;">
                              ${formattedExpiry}
                            </p>
                            <p style="margin: 10px 0 0; font-size: 13px; color: #92400e;">
                              Si no confirmas tu cupo antes de esta fecha, pasará a la siguiente persona en la lista.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 20px 0; text-align: center;">
                            <a href="${APP_URL}/mi-cuenta/eventos" style="display: inline-block; background-color: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                              ✨ Aceptar mi cupo
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 20px 0 0; font-size: 13px; color: #666; text-align: center;">
                        Si no deseas este cupo, puedes ignorar este email o rechazarlo en tu panel.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Footer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="background-color: #f9fafb; border-radius: 0 0 12px 12px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #999;">
                        Con amor y luz,<br>Aleyda Paola y Energía y Divinidad
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

interface WaitlistOfferReminderEmailParams {
  email: string;
  name: string;
  eventTitle: string;
  hoursRemaining: number;
}

/**
 * Send reminder email when waitlist offer is about to expire
 */
export async function sendWaitlistOfferReminderEmail(params: WaitlistOfferReminderEmailParams) {
  const { email, name, eventTitle, hoursRemaining } = params;

  return sendEmailWithLogging({
    to: email,
    subject: `⏰ Recordatorio: Tu cupo expira en ${hoursRemaining}h - ${eventTitle}`,
    template: "waitlist_reminder",
    entityType: "event",
    metadata: { eventTitle, hoursRemaining },
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8f0f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
            <tr>
              <td style="background-color: white; border-radius: 12px; padding: 0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                      <img src="${LOGO_URL}" alt="Energía y Divinidad" style="width: 60px; height: auto; margin-bottom: 15px;">
                      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                        ⏰ Recordatorio
                      </h1>
                    </td>
                  </tr>
                </table>

                <!-- Content -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 30px;">
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                        Hola <strong>${name}</strong>,
                      </p>
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                        Te recordamos que tu cupo reservado para <strong>${eventTitle}</strong> expira pronto.
                      </p>

                      <!-- Urgency Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #fef3c7; border-radius: 8px; padding: 25px; text-align: center; border: 2px solid #f59e0b;">
                            <p style="margin: 0 0 5px; font-size: 14px; color: #92400e;">
                              Tiempo restante:
                            </p>
                            <p style="margin: 0; font-size: 48px; font-weight: bold; color: #d97706;">
                              ${hoursRemaining}h
                            </p>
                            <p style="margin: 10px 0 0; font-size: 13px; color: #92400e;">
                              Después de este tiempo, el cupo pasará a otra persona
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 20px 0; text-align: center;">
                            <a href="${APP_URL}/mi-cuenta/eventos" style="display: inline-block; background-color: #f59e0b; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                              Confirmar mi cupo ahora
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Footer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="background-color: #f9fafb; border-radius: 0 0 12px 12px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #999;">
                        Con amor y luz,<br>Aleyda Paola y Energía y Divinidad
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

interface WaitlistOfferExpiredEmailParams {
  email: string;
  name: string;
  eventTitle: string;
}

/**
 * Send email when waitlist offer has expired
 */
export async function sendWaitlistOfferExpiredEmail(params: WaitlistOfferExpiredEmailParams) {
  const { email, name, eventTitle } = params;

  return sendEmailWithLogging({
    to: email,
    subject: `Tu cupo ha expirado - ${eventTitle}`,
    template: "waitlist_expired",
    entityType: "event",
    metadata: { eventTitle },
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8f0f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
            <tr>
              <td style="background-color: white; border-radius: 12px; padding: 0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="background: linear-gradient(135deg, #8A4BAF 0%, #654177 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                      <img src="${LOGO_URL}" alt="Energía y Divinidad" style="width: 60px; height: auto; margin-bottom: 15px;">
                      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                        Cupo Expirado
                      </h1>
                    </td>
                  </tr>
                </table>

                <!-- Content -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 30px;">
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                        Hola <strong>${name}</strong>,
                      </p>
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                        Lamentamos informarte que el cupo que habíamos reservado para ti en
                        <strong>${eventTitle}</strong> ha expirado al no recibir confirmación a tiempo.
                      </p>
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                        El cupo ha sido ofrecido a la siguiente persona en la lista de espera.
                      </p>

                      <!-- Info Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #eef1fa; border-radius: 8px; padding: 20px;">
                            <p style="margin: 0; font-size: 14px; color: #2D4CC7; line-height: 1.6;">
                              💡 Si aún te interesa asistir a este u otros eventos, puedes volver a unirte a la lista de espera
                              o explorar otros eventos disponibles.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 20px 0; text-align: center;">
                            <a href="${APP_URL}/eventos" style="display: inline-block; background-color: #4944a4; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                              Ver todos los eventos
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Footer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="background-color: #f9fafb; border-radius: 0 0 12px 12px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #999;">
                        Con amor y luz,<br>Aleyda Paola y Energía y Divinidad
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

// ============================================
// MEMBRESÍA RECURRENTE — Renovación y fallos
// ============================================

interface MembershipRenewalSuccessParams {
  email: string;
  name: string;
  plan: string;
  amount: number;
  currency: "COP" | "USD" | "EUR";
  nextRenewalDate: Date;
  transactionId?: string;
}

export async function sendMembershipRenewalSuccessEmail(params: MembershipRenewalSuccessParams) {
  const { email, name, plan, amount, currency, nextRenewalDate, transactionId } = params;

  const formattedAmount =
    currency === "COP"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(amount)
      : new Intl.NumberFormat(currency === "EUR" ? "es-ES" : "en-US", {
          style: "currency",
          currency,
        }).format(amount);

  const formattedDate = nextRenewalDate.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await sendEmailWithLogging({
    to: email,
    subject: `✨ Tu membresía ${plan} ha sido renovada`,
    template: "membership_renewal_success",
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f8f0f5;font-family:'DM Sans',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;"><tr><td style="background:linear-gradient(135deg,#8A4BAF,#4944a4);padding:32px;text-align:center;"><img src="${LOGO_URL}" alt="Energía y Divinidad" style="height:48px;margin-bottom:12px;" /><h1 style="color:#fff;font-size:22px;margin:0;">¡Membresía renovada!</h1></td></tr><tr><td style="padding:32px;"><p style="color:#4b316c;font-size:16px;">Hola <strong>${name}</strong>,</p><p style="color:#555;font-size:15px;line-height:1.6;">Tu membresía <strong>${plan}</strong> ha sido renovada automáticamente.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1fa;border-radius:12px;margin:20px 0;"><tr><td style="padding:20px;"><p style="margin:0 0 8px;color:#4944a4;font-size:13px;font-weight:bold;">DETALLE DEL COBRO</p><p style="margin:4px 0;color:#333;font-size:15px;">Plan: <strong>${plan}</strong></p><p style="margin:4px 0;color:#333;font-size:15px;">Monto: <strong>${formattedAmount}</strong></p><p style="margin:4px 0;color:#333;font-size:15px;">Próxima renovación: <strong>${formattedDate}</strong></p>${transactionId ? `<p style="margin:4px 0;color:#888;font-size:13px;">Ref: ${transactionId}</p>` : ""}</td></tr></table><p style="color:#555;font-size:14px;line-height:1.6;">Puedes cancelar en cualquier momento desde tu perfil.</p><p style="color:#8A4BAF;font-size:14px;margin-top:24px;">Con amor y luz,<br><strong>Aleyda Paola y Energía y Divinidad</strong></p></td></tr></table></td></tr></table></body></html>`,
    entityType: "subscription",
    metadata: { plan, transactionId },
  });
}

interface MembershipPaymentFailedParams {
  email: string;
  name: string;
  plan: string;
  retryDate: Date | null;
  isLastAttempt: boolean;
}

export async function sendMembershipPaymentFailedEmail(params: MembershipPaymentFailedParams) {
  const { email, name, plan, retryDate, isLastAttempt } = params;

  const retryText = retryDate
    ? `Reintentaremos el cobro el ${retryDate.toLocaleDateString("es-CO", { day: "numeric", month: "long" })}.`
    : "";

  const subject = isLastAttempt
    ? `⚠️ Tu membresía ${plan} ha sido suspendida`
    : `⚠️ No pudimos renovar tu membresía ${plan}`;

  await sendEmailWithLogging({
    to: email,
    subject,
    template: "membership_payment_failed",
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f8f0f5;font-family:'DM Sans',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;"><tr><td style="background:linear-gradient(135deg,#8A4BAF,#4944a4);padding:32px;text-align:center;"><img src="${LOGO_URL}" alt="Energía y Divinidad" style="height:48px;margin-bottom:12px;" /><h1 style="color:#fff;font-size:22px;margin:0;">Problema con tu pago</h1></td></tr><tr><td style="padding:32px;"><p style="color:#4b316c;font-size:16px;">Hola <strong>${name}</strong>,</p><p style="color:#555;font-size:15px;line-height:1.6;">${isLastAttempt ? `Después de 3 intentos, no pudimos renovar tu membresía <strong>${plan}</strong>. Tu acceso ha sido suspendido.` : `No pudimos procesar el cobro de tu membresía <strong>${plan}</strong>. ${retryText}`}</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff3f3;border:1px solid #ffcccc;border-radius:12px;margin:20px 0;"><tr><td style="padding:20px;"><p style="margin:0;color:#c0392b;font-size:14px;line-height:1.6;">${isLastAttempt ? "Para reactivar tu membresía, vuelve a suscribirte desde la página de membresías." : "Verifica que tu tarjeta tenga fondos suficientes o actualiza tu método de pago."}</p></td></tr></table><div style="text-align:center;margin:28px 0;"><a href="${APP_URL}/membresia" style="background:#4944a4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;">${isLastAttempt ? "Reactivar membresía" : "Ir a mi perfil"}</a></div><p style="color:#8A4BAF;font-size:14px;margin-top:24px;">Con amor y luz,<br><strong>Aleyda Paola y Energía y Divinidad</strong></p></td></tr></table></td></tr></table></body></html>`,
    entityType: "subscription",
    metadata: { plan, isLastAttempt },
  });
}
