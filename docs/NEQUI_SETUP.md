# Guía para Activar el Botón Nequi (Pagos Push)

Esta guía es para **Aleyda** (o quien administre el negocio en Colombia) para registrar el negocio en Nequi y obtener las credenciales necesarias para el pago automático.

---

## ¿Qué es el Botón Nequi?

Es un sistema de pago donde:
1. El cliente ingresa su número de celular en la web
2. Recibe una **notificación push** en su app Nequi
3. Aprueba el pago directamente en la app
4. El pago se confirma automáticamente

**No requiere QR ni transferencias manuales.**

---

## Proceso de Vinculación (5 pasos)

### Paso 1: Pre-registro

1. Ir a **[nequi.com.co/negocios/vinculacion](https://www.nequi.com.co/negocios/vinculacion)**
2. Seleccionar el producto **"API Push"** (pagos con notificación)
3. Hacer clic en el link de **pre-registro**
4. Completar el formulario con los datos del negocio

Alternativamente, ir directo a: **[negocios.nequi.co/registro/api_push](https://negocios.nequi.co/registro/api_push)**

---

### Paso 2: Enviar Documentación

En **1 día hábil** recibirás un email solicitando documentos.

**Para Persona Natural (emprendedor individual):**
- RUT
- Cédula de ciudadanía
- Cuenta Nequi activa o certificación Bancolombia
- Autorización de tratamiento de datos

**Para Persona Jurídica (empresa):**
- Cámara de Comercio
- Cédula del representante legal
- Formulario de composición accionaria
- Certificación bancaria
- Autorización de tratamiento de datos

---

### Paso 3: Esperar Aprobación

El equipo de Nequi revisa la solicitud y responde en **3 días hábiles**.

---

### Paso 4: Verificación y Firma

Una vez aprobado:
1. Verificar identidad
2. Firmar términos y condiciones electrónicamente (vía Zapsign)
3. Recibirás instrucciones detalladas por email

---

### Paso 5: Obtener Credenciales

Una vez completada la firma, recibirás acceso al portal de desarrolladores.

Ir a: **[conecta.nequi.com.co](https://conecta.nequi.com.co)** (o el link que te envíen)

Obtener:
- **Access Key ID**
- **Secret Key**
- **API Key**

```
NEQUI_CLIENT_ID=tu-access-key-id
NEQUI_CLIENT_SECRET=tu-secret-key
NEQUI_API_KEY=tu-api-key
```

---

## Enviar Credenciales al Desarrollador

Una vez tengas las credenciales, envíalas al desarrollador por un canal seguro (WhatsApp privado, email).

El desarrollador las configurará y activará el Botón Nequi en la web.

---

## Ambiente de Pruebas (Opcional)

Nequi ofrece un ambiente sandbox para probar antes de ir a producción:

1. Descargar la **app de pruebas** (solo Android)
   - ⚠️ No se puede tener la app real y la de pruebas al mismo tiempo
2. Crear cuenta de prueba
3. Números de prueba:
   - `3991111111` → Transacción aprobada
   - `3992222222` → Transacción rechazada

---

## Proceso de Certificación

Antes de ir a producción, Nequi requiere:

1. Enviar casos de prueba en formato JSON a: `certificacion@conecta.nequi.com`
2. Incluir video/gif/imágenes de la experiencia de usuario
3. Esperar aprobación

El desarrollador se encargará de esta parte técnica.

---

## Soporte Nequi

- **Documentación técnica:** [docs.conecta.nequi.com.co](https://docs.conecta.nequi.com.co/)
- **Portal Nequi Negocios:** [nequi.com.co/negocios](https://www.nequi.com.co/negocios)
- **Email certificación:** certificacion@conecta.nequi.com

---

## Estado Actual del Sistema

**Mientras no estén las credenciales**, el sistema funciona en **modo manual**:
- El cliente ve instrucciones para transferir al número Nequi de Aleyda
- Aleyda verifica manualmente el pago
- Confirma la reserva desde el panel de administración

Una vez configuradas las credenciales, el sistema cambiará automáticamente al **modo push** (automático).

---

## Resumen de URLs importantes

| Recurso | URL |
|---------|-----|
| Vinculación negocios | https://www.nequi.com.co/negocios/vinculacion |
| Registro API Push | https://negocios.nequi.co/registro/api_push |
| Documentación APIs | https://docs.conecta.nequi.com.co/ |
| Portal Nequi Conecta | https://conecta.nequi.com.co/ |

---

*Documento creado para el proyecto Energía y Divinidad*
*Última actualización: Enero 2025*
