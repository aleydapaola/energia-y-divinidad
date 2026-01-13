import { Resend } from 'resend';

const FROM_EMAIL = process.env.EMAIL_FROM || 'Energía y Divinidad <noreply@energiaydivinidad.com>';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Modo desarrollo: si está activo, se auto-verifica el email sin enviar correo real
const DEV_MODE = process.env.NODE_ENV === 'development';
const DEV_AUTO_VERIFY = process.env.DEV_AUTO_VERIFY_EMAIL === 'true';

// Lazy initialization para evitar errores en build
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY no está configurada');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Función auxiliar para verificar si debemos simular el envío en desarrollo
export function shouldSimulateEmail(): boolean {
  return DEV_MODE && DEV_AUTO_VERIFY;
}

interface SendVerificationEmailParams {
  email: string;
  name: string;
  token: string;
}

export async function sendVerificationEmail({ email, name, token }: SendVerificationEmailParams) {
  const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;

  // En modo desarrollo con auto-verify, solo mostramos el link en consola
  if (DEV_MODE) {
    console.log('\n========================================');
    console.log('📧 EMAIL DE VERIFICACIÓN (Modo Desarrollo)');
    console.log('========================================');
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`\n🔗 Link de verificación:`);
    console.log(verificationUrl);
    console.log('========================================\n');

    // Si auto-verify está activo, retornamos éxito sin intentar enviar
    if (DEV_AUTO_VERIFY) {
      console.log('⚠️  DEV_AUTO_VERIFY_EMAIL=true - El email NO se envía realmente.');
      console.log('    Copia el link de arriba para verificar manualmente.\n');
      return { success: true, data: { id: 'dev-mode-simulated' } };
    }
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verifica tu email - Energía y Divinidad',
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
                    <!-- Header -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <h1 style="margin: 0; font-size: 32px; color: #8A4BAF; font-weight: 400;">
                          Energía y Divinidad
                        </h1>
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
                          Si tienes preguntas, contáctanos en <a href="mailto:hola@energiaydivinidad.com" style="color: #8A4BAF;">hola@energiaydivinidad.com</a>
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
      console.error('Error sending verification email:', error);
      throw new Error('Error al enviar el email de verificación');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending verification email:', error);
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
      subject: 'Bienvenida a Energía y Divinidad',
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
                    <!-- Header -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <h1 style="margin: 0; font-size: 32px; color: #8A4BAF; font-weight: 400;">
                          Energía y Divinidad
                        </h1>
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
                          <strong style="color: #8A4BAF;">Aleyda</strong>
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
      console.error('Error sending welcome email:', error);
      // Don't throw - welcome email is not critical
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw - welcome email is not critical
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
  eventType: 'online' | 'in_person';
  orderNumber: string;
  seats: number;
  amount: number;
  currency: string;
  paymentStatus: 'PENDING' | 'COMPLETED';
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

  const isPending = paymentStatus === 'PENDING';
  const isOnline = eventType === 'online';

  const formattedDate = new Date(eventDate).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedAmount = currency === 'USD'
    ? `USD $${amount.toLocaleString('en-US')}`
    : `$${amount.toLocaleString('es-CO')} COP`;

  // Construir sección de ubicación/Zoom
  let locationSection = '';
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
          ${zoomId ? `<p style="margin: 0 0 5px; font-size: 14px; color: #1e40af;"><strong>ID:</strong> ${zoomId}</p>` : ''}
          ${zoomPassword ? `<p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>Contraseña:</strong> ${zoomPassword}</p>` : ''}
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
          ${venueName ? `<p style="margin: 0 0 5px; font-size: 14px; color: #15803d;"><strong>${venueName}</strong></p>` : ''}
          ${venueAddress ? `<p style="margin: 0 0 5px; font-size: 14px; color: #15803d;">${venueAddress}</p>` : ''}
          ${venueCity ? `<p style="margin: 0; font-size: 14px; color: #15803d;">${venueCity}</p>` : ''}
        </td>
      </tr>
    `;
  }

  // Sección de pago pendiente
  const pendingPaymentSection = isPending ? `
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
  ` : '';

  // En modo desarrollo, solo mostramos en consola
  if (DEV_MODE) {
    console.log('\n========================================');
    console.log('📧 EMAIL DE CONFIRMACIÓN DE EVENTO (Modo Desarrollo)');
    console.log('========================================');
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Evento: ${eventTitle}`);
    console.log(`Fecha: ${formattedDate}`);
    console.log(`Cupos: ${seats}`);
    console.log(`Total: ${formattedAmount}`);
    console.log(`Estado: ${isPending ? 'Pendiente de pago' : 'Confirmado'}`);
    if (zoomUrl) console.log(`Zoom: ${zoomUrl}`);
    console.log('========================================\n');

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: 'dev-mode-simulated' } };
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
            <title>${isPending ? 'Reserva Recibida' : 'Reserva Confirmada'}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f0f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <h1 style="margin: 0; font-size: 32px; color: #8A4BAF; font-weight: 400;">
                          Energía y Divinidad
                        </h1>
                      </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(138, 75, 175, 0.1);">
                        <!-- Status Badge -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding-bottom: 20px;">
                              <span style="display: inline-block; padding: 8px 20px; background-color: ${isPending ? '#fef3c7' : '#d1fae5'}; color: ${isPending ? '#92400e' : '#065f46'}; border-radius: 20px; font-size: 14px; font-weight: 600;">
                                ${isPending ? '⏳ Reserva Pendiente de Pago' : '✅ Reserva Confirmada'}
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 style="margin: 0 0 20px; font-size: 24px; color: #654177; font-weight: 600;">
                          ¡Hola ${name}!
                        </h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #666666; line-height: 1.6;">
                          ${isPending
                            ? 'Hemos recibido tu solicitud de reserva para el siguiente evento:'
                            : '¡Tu reserva ha sido confirmada! Te esperamos en el siguiente evento:'}
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
                          <strong style="color: #8A4BAF;">Aleyda</strong>
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
                          ¿Preguntas? <a href="mailto:hola@energiaydivinidad.com" style="color: #8A4BAF;">hola@energiaydivinidad.com</a>
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
      console.error('Error sending event booking email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending event booking email:', error);
    return { success: false, error };
  }
}

interface EventReminderEmailParams {
  email: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  eventType: 'online' | 'in_person';
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

  const isOnline = eventType === 'online';
  const formattedDate = new Date(eventDate).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const timeMessage = hoursUntil <= 1
    ? '¡El evento comienza en menos de 1 hora!'
    : hoursUntil <= 24
      ? `El evento comienza en ${hoursUntil} horas`
      : `El evento es mañana`;

  if (DEV_MODE) {
    console.log('\n========================================');
    console.log('📧 RECORDATORIO DE EVENTO (Modo Desarrollo)');
    console.log('========================================');
    console.log(`Para: ${email}`);
    console.log(`Evento: ${eventTitle}`);
    console.log(`Fecha: ${formattedDate}`);
    console.log(`Mensaje: ${timeMessage}`);
    console.log('========================================\n');

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: 'dev-mode-simulated' } };
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
                        <h1 style="margin: 0; font-size: 32px; color: #8A4BAF;">Energía y Divinidad</h1>
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

                        ${isOnline && zoomUrl ? `
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 20px; background-color: #eef6ff; border-radius: 8px;">
                                <p style="margin: 0 0 10px; font-size: 16px; color: #2563eb; font-weight: 600;">
                                  🎥 Únete por Zoom:
                                </p>
                                <a href="${zoomUrl}" style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px;">
                                  Unirse ahora
                                </a>
                                ${zoomId ? `<p style="margin: 15px 0 0; font-size: 14px; color: #1e40af;">ID: ${zoomId}</p>` : ''}
                                ${zoomPassword ? `<p style="margin: 5px 0 0; font-size: 14px; color: #1e40af;">Contraseña: ${zoomPassword}</p>` : ''}
                              </td>
                            </tr>
                          </table>
                        ` : ''}

                        ${!isOnline ? `
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
                                <p style="margin: 0; font-size: 16px; color: #166534;">
                                  📍 <strong>${venueName || 'Evento Presencial'}</strong><br>
                                  ${venueAddress || ''}
                                </p>
                              </td>
                            </tr>
                          </table>
                        ` : ''}

                        <p style="margin: 30px 0 0; font-size: 14px; color: #999; text-align: center;">
                          ¡Te esperamos!<br>
                          <strong style="color: #8A4BAF;">Aleyda</strong>
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
      console.error('Error sending event reminder:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending event reminder:', error);
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
  currency: 'COP' | 'USD' | 'EUR';
}

export async function sendPackCodeEmail(params: SendPackCodeEmailParams) {
  const {
    email,
    name,
    packCode,
    expiresAt,
    sessionsTotal,
    amount,
    currency,
  } = params;

  const formattedExpiration = expiresAt.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedAmount = currency === 'COP'
    ? `$${amount.toLocaleString('es-CO')} COP`
    : currency === 'EUR'
      ? `€${amount.toLocaleString('es-ES')} EUR`
      : `$${amount.toLocaleString('en-US')} USD`;

  if (DEV_MODE) {
    console.log('\n========================================');
    console.log('📧 EMAIL DE CÓDIGO DE PACK (Modo Desarrollo)');
    console.log('========================================');
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Código: ${packCode}`);
    console.log(`Sesiones: ${sessionsTotal}`);
    console.log(`Total pagado: ${formattedAmount}`);
    console.log(`Expira: ${formattedExpiration}`);
    console.log('========================================\n');

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: 'dev-mode-simulated' } };
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
                    <!-- Header -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <h1 style="margin: 0; font-size: 32px; color: #8A4BAF; font-weight: 400;">
                          Energía y Divinidad
                        </h1>
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
                          <strong style="color: #8A4BAF;">Aleyda</strong>
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
                          ¿Preguntas? <a href="mailto:hola@energiaydivinidad.com" style="color: #8A4BAF;">hola@energiaydivinidad.com</a>
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
      console.error('Error sending pack code email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending pack code email:', error);
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
  rescheduledBy: 'client' | 'admin';
  reason?: string;
}

export async function sendRescheduleEmail(params: SendRescheduleEmailParams) {
  const {
    email,
    name,
    sessionName,
    previousDate,
    newDate,
    rescheduledBy,
    reason,
  } = params;

  const formatDate = (date: Date) => date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedPreviousDate = previousDate ? formatDate(previousDate) : 'No programada';
  const formattedNewDate = formatDate(newDate);

  const rescheduledByText = rescheduledBy === 'admin'
    ? 'Tu sesión ha sido reprogramada por Aleyda.'
    : 'Has reprogramado tu sesión exitosamente.';

  if (DEV_MODE) {
    console.log('\n========================================');
    console.log('📧 EMAIL DE REPROGRAMACIÓN (Modo Desarrollo)');
    console.log('========================================');
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Sesión: ${sessionName}`);
    console.log(`Fecha anterior: ${formattedPreviousDate}`);
    console.log(`Nueva fecha: ${formattedNewDate}`);
    console.log(`Reprogramado por: ${rescheduledBy}`);
    if (reason) console.log(`Motivo: ${reason}`);
    console.log('========================================\n');

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: 'dev-mode-simulated' } };
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
                    <!-- Header -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <h1 style="margin: 0; font-size: 32px; color: #8A4BAF; font-weight: 400;">
                          Energía y Divinidad
                        </h1>
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

                        ${reason ? `
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 15px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 20px;">
                              <p style="margin: 0; font-size: 14px; color: #92400e;">
                                <strong>Motivo:</strong> ${reason}
                              </p>
                            </td>
                          </tr>
                        </table>
                        ` : ''}

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
                          <strong style="color: #8A4BAF;">Aleyda</strong>
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
                          ¿Preguntas? <a href="mailto:hola@energiaydivinidad.com" style="color: #8A4BAF;">hola@energiaydivinidad.com</a>
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
      console.error('Error sending reschedule email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending reschedule email:', error);
    return { success: false, error };
  }
}

interface SendCancellationEmailParams {
  email: string;
  name: string;
  sessionName: string;
  scheduledDate: Date | null;
  cancelledBy: 'client' | 'admin';
  reason?: string;
  packSessionReturned?: boolean;
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
  } = params;

  const formattedDate = scheduledDate
    ? scheduledDate.toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'No programada';

  const cancelledByText = cancelledBy === 'admin'
    ? 'Tu sesión ha sido cancelada por Aleyda.'
    : 'Has cancelado tu sesión.';

  if (DEV_MODE) {
    console.log('\n========================================');
    console.log('📧 EMAIL DE CANCELACIÓN (Modo Desarrollo)');
    console.log('========================================');
    console.log(`Para: ${email}`);
    console.log(`Nombre: ${name}`);
    console.log(`Sesión: ${sessionName}`);
    console.log(`Fecha: ${formattedDate}`);
    console.log(`Cancelado por: ${cancelledBy}`);
    if (reason) console.log(`Motivo: ${reason}`);
    if (packSessionReturned) console.log(`Sesión devuelta al pack: Sí`);
    console.log('========================================\n');

    if (DEV_AUTO_VERIFY) {
      return { success: true, data: { id: 'dev-mode-simulated' } };
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
                    <!-- Header -->
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <h1 style="margin: 0; font-size: 32px; color: #8A4BAF; font-weight: 400;">
                          Energía y Divinidad
                        </h1>
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

                        ${reason ? `
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 15px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 20px;">
                              <p style="margin: 0; font-size: 14px; color: #92400e;">
                                <strong>Motivo:</strong> ${reason}
                              </p>
                            </td>
                          </tr>
                        </table>
                        ` : ''}

                        ${packSessionReturned ? `
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                          <tr>
                            <td style="padding: 15px; background-color: #d1fae5; border-radius: 8px;">
                              <p style="margin: 0; font-size: 14px; color: #065f46;">
                                ✅ <strong>Buenas noticias:</strong> La sesión ha sido devuelta a tu pack. Puedes usarla para reservar en otra fecha.
                              </p>
                            </td>
                          </tr>
                        </table>
                        ` : ''}

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
                          <strong style="color: #8A4BAF;">Aleyda</strong>
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
                          ¿Preguntas? <a href="mailto:hola@energiaydivinidad.com" style="color: #8A4BAF;">hola@energiaydivinidad.com</a>
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
      console.error('Error sending cancellation email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return { success: false, error };
  }
}
