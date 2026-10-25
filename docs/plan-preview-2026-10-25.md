# Plan de cierre de Preview — 25/10/2026

Autorizado por Xavier: preparar el plan y ponerlo en marcha. Trabajar en `preview` y conservar los cambios locales de la política de sesiones. Production requiere aprobar una versión concreta después de revisar Preview.

| Orden | Trabajo | Criterio de cierre | Estado |
| --- | --- | --- | --- |
| 1 | Recuperar Neon Preview y el despliegue | Proyecto y rama aislada verificados; consulta de lectura correcta; build Ready; Mis Sesiones accesible | Conexiones de lectura y Mis Sesiones recuperados; versión Ready actual verificada; pendiente nuevo despliegue de política |
| 2 | Política de sesiones y términos | Máximo 2 cambios con ≥24 h; cuatro supuestos confirmados; devolución manual clara; página de términos accesible | Código preparado y 79 pruebas correctas; pendiente verificación remota y términos |
| 3 | Compras y entrega | Sesiones, cursos, eventos y productos digitales probados con PayPal sandbox y Bre-B simulado; entrega única; correos y calendario comprobados | Pendiente |
| 4 | Newsletter aislada | Cuenta y audiencia de pruebas verificadas; alta de prueba sin tocar contactos reales | Pendiente de revisar el estado de activación del nuevo servicio |
| 5 | Revisión editorial y de regresión | Enlaces, contenido, horarios, cuenta y panel comprobados; material de pruebas identificado | Pendiente |
| 6 | Preparación de Production | Clave y destinatario Global66 confirmados por Aleyda; commit y contenido revisados; referencia de reversión; aprobación explícita | Pendiente de validación y aprobación; no publicar |

## Límites de ejecución

- Usar solo la base Neon Preview de EYD; nunca sustituirla por Production para resolver el fallo de conexión.
- Probar únicamente con datos ficticios. PayPal sandbox y Bre-B simulado; sin transferencias ni devoluciones reales.
- Correos de Preview limitados a aleydapaola@proton.me. No enviar mensajes adicionales a Aleyda para pedir decisiones sin instrucción expresa.
- Reembolsos monetarios gestionados manualmente por Aleyda; ≥24 h reconoce el derecho íntegro. No activar automatización financiera.
- No crear credenciales ni ampliar permisos innecesariamente. Si un servicio exige contraseña, CAPTCHA, términos o verificación personal, completar primero el trabajo independiente y señalar el paso concreto que requiere intervención.

## Registro de avance

- Punto de partida: rama preview en 5a4437bf; cambios de política locales preservados. El despliegue anterior revisado falló por P1001 al conectar con Neon Preview. Mis Sesiones daba error de servidor y /terminos devolvía 404.
- Conectividad de Neon recuperada sin modificar configuración: SELECT 1 correcto tanto por endpoint pooled como directo, con el script protegido scripts/check-preview-database.mjs. No se han ejecutado migraciones ni escrito datos en este diagnóstico.
- Vercel CLI verificado como aleydapaola-5322, equipo aleyda-paola-vargas-projects. El alias estable de Preview apunta al despliegue Ready dpl_Bp15oN1Hw5qzwoYTmypHpWWQKGS7. Mis Sesiones vuelve a mostrar la reserva ficticia del 26/10 y sus dos reprogramaciones, sin modificarla. Las ramas remotas main y preview conservan 7b9a7ac3 y 5a4437bf respectivamente antes de publicar esta política.
- Sanity público 81jpalr2: la consulta de documentos _type=page devuelve cero tanto en preview como en production. No hay términos generales originales para copiar: preparar el documento es un pendiente editorial independiente. No se ha modificado Sanity ni se ha inventado un texto legal completo a partir de la política limitada a sesiones.
