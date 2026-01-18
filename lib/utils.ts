import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Obtiene la URL base de la aplicación de forma segura.
 * Valida que la URL tenga el protocolo correcto (http:// o https://).
 * En producción usa HTTPS, en desarrollo usa HTTP.
 */
export function getAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL

  // Default para desarrollo
  const defaultUrl = 'http://localhost:3000'

  if (!envUrl) {
    return defaultUrl
  }

  // Validar que la URL tenga protocolo correcto
  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
    // Remover trailing slash si existe
    return envUrl.replace(/\/$/, '')
  }

  // Si no tiene protocolo, agregar https:// para producción o http:// para localhost
  if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
    return `http://${envUrl}`.replace(/\/$/, '')
  }

  return `https://${envUrl}`.replace(/\/$/, '')
}
