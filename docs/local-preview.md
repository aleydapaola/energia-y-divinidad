# Desarrollo local de Energía y Divinidad

Trabajar en `preview`. `main` queda reservada para una versión concreta aprobada para producción.

Antes de iniciar la web, ejecutar `npm run local:check`. Esta comprobación no conecta a la base de datos.
Los comandos npm de desarrollo, compilación, servidor local, migraciones y Prisma Studio comparten la
misma comprobación y el mismo entorno resuelto. Solo aceptan la base Neon Preview verificada de este
proyecto, no la de Amor Sanación Alquimia ni una conexión arbitraria. Los scripts `vercel-build` y
`postinstall` conservan su funcionamiento en Vercel.

Si aparece «Inicio bloqueado», no ejecutar Next o Prisma directamente para evitarlo. Tampoco ejecutar
Sanity Studio ni utilidades administrativas con las claves originales. La protección añadida comprueba
la base de datos y los comandos npm indicados; no audita cualquier programa que pueda ejecutarse en el
equipo ni valida por sí sola todas las credenciales de servicios.

## Preparar una configuración completa de pruebas

1. Conservar los archivos originales en una copia privada, fuera de las rutas que cargan Next y Prisma
   y fuera de Git. No publicar ni mostrar sus valores.
2. Sustituir las conexiones de base de datos de `.env` y `.env.local` por las de la rama Neon `preview`
   de Aleyda. Revisar también variables heredadas del terminal y otros archivos `.env.*`, porque pueden
   tener prioridad. El comando protegido transmite a Prisma el mismo entorno que ha validado.
3. Usar una clave de sesión local independiente y URLs `http://localhost:3000` para NextAuth y la app.
4. Configurar únicamente credenciales verificadas de sandbox y la clave Resend de Preview con
   `PREVIEW_EMAIL_RECIPIENT=aleydapaola@proton.me`. Retirar claves reales, enlaces de pago real y planes
   reales de suscripción de la configuración local. Los servicios sin recursos de prueba quedan sin
   credenciales; no copiar todo el entorno Production de Vercel.
5. Mantener Calendar, Mailchimp y escritura de Sanity sin activar hasta contar con recursos separados
   de pruebas. No reutilizar el calendario, audiencia ni dataset de escritura de producción.
6. Repetir `npm run local:check` antes de iniciar la web. Después validar cada servicio de prueba.

La configuración local original aún necesita esta sustitución. El bloqueo actual es esperado y no
significa que la separación de servicios ya esté terminada. `.env.example` es una referencia con
marcadores, no contiene credenciales utilizables y no debe copiarse sobre los originales sin revisarlos.

Las pruebas `npm run test:preview` usan entradas ficticias y no conectan a las bases de datos ni a los
proveedores de pago. Publicar cambios en producción requiere la aprobación de la versión probada.
