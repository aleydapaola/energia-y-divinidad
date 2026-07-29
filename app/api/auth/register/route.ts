import { randomBytes } from "crypto";

import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";

import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, acceptedTerms } = body;

    // Validación de campos requeridos
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Validación de aceptación de términos
    if (!acceptedTerms) {
      return NextResponse.json(
        { error: "Debes aceptar los Términos y Condiciones y la Política de Privacidad" },
        { status: 400 }
      );
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "El email no es válido" }, { status: 400 });
    }

    // Validación de contraseña
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // Si el usuario existe pero no está verificado, indicarlo para permitir reenvío
      if (!existingUser.emailVerified) {
        return NextResponse.json(
          {
            error: "Este email ya está registrado pero no verificado",
            code: "EMAIL_NOT_VERIFIED",
            email: existingUser.email,
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: "Este email ya está registrado" }, { status: 400 });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Versión inicial de términos (se puede obtener de Sanity en el futuro)
    const currentTermsVersion = "1.0";

    const normalizedEmail = email.toLowerCase();
    const verificationToken = randomBytes(32).toString("hex");
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Expira en 24 horas

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        emailVerified: null, // No verificado aún
        acceptedTermsVersion: currentTermsVersion,
        acceptedTermsAt: new Date(),
      },
    });

    try {
      await prisma.verificationToken.create({
        data: {
          identifier: user.email,
          token: verificationToken,
          expires: tokenExpiry,
        },
      });

      await sendVerificationEmail({
        email: user.email,
        name: user.name || "Usuario",
        token: verificationToken,
      });
    } catch (emailError) {
      console.error("Error enviando email de verificación:", emailError);

      try {
        await prisma.verificationToken.deleteMany({
          where: { identifier: user.email },
        });
        await prisma.user.delete({
          where: { id: user.id },
        });
      } catch (cleanupError) {
        console.error("Error limpiando usuario tras fallo de email:", cleanupError);
      }

      return NextResponse.json(
        {
          error:
            "No hemos podido enviar el email de verificación. Por favor intenta de nuevo en unos minutos.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Cuenta creada exitosamente. Por favor verifica tu email.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
