import { driveConfig } from "@/lib/digital-products/drive-config";
import { prisma } from "@/lib/prisma";

export default async function ProductDrivePage({ searchParams }: { searchParams: Promise<{ connection?: string }> }) {
  const result = await searchParams;
  let configured = false;
  let connected = false;
  try {
    const config = driveConfig();
    configured = true;
    connected = !!await prisma.productDriveConnection.findUnique({ where: { environment: config.environment } });
  } catch { /* Configuration readiness must not disclose credentials. */ }
  return <section className="max-w-2xl rounded-xl bg-white p-5 space-y-5 break-words">
    <h1 className="text-2xl font-gazeta">Archivos de productos · Google Drive</h1>
    <p>{connected ? "Cuenta propietaria conectada." : "Conexión de la cuenta propietaria pendiente."}</p>
    {!configured && <p role="alert">Falta configurar el cliente OAuth de Drive de este entorno. No actives facturación ni reutilices las credenciales del inicio de sesión.</p>}
    {result.connection === "failed" && <p role="alert">No se completó la conexión. Comprueba la cuenta propietaria, el consentimiento y la configuración del callback.</p>}
    {result.connection === "ok" && <p role="status">Conexión de Google Drive completada.</p>}
    <p>La propietaria autoriza únicamente archivos creados por esta integración. Los permisos de los compradores se conceden manualmente en Drive, carpeta por carpeta.</p>
    <form method="POST" action="/api/admin/product-drive/connect">
      <button disabled={!configured} className="min-h-11 rounded-full bg-[#654177] px-5 py-3 text-white disabled:opacity-50">{connected ? "Volver a conectar Google Drive" : "Conectar Google Drive"}</button>
    </form>
    <p>En pruebas, Google puede pedir renovar el consentimiento a los siete días. La conexión no cambia el acceso de compradores ni Calendar.</p>
  </section>;
}
