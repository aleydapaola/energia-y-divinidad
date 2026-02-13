/**
 * Utilidades para generación de números de orden
 */

export type OrderPrefix = 'ORD' | 'EVT' | 'MEM' | 'CRS' | 'SUB'

/**
 * Genera un número de orden único con formato: PREFIX-YYYYMMDD-XXXX
 *
 * @param prefix - Prefijo del tipo de orden (ORD, EVT, MEM, CRS, SUB)
 * @returns Número de orden formateado
 *
 * @example
 * generateOrderNumber('ORD') // "ORD-20240115-4829"
 * generateOrderNumber('EVT') // "EVT-20240115-1234"
 */
export function generateOrderNumber(prefix: OrderPrefix = 'ORD'): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `${prefix}-${year}${month}${day}-${random}`
}

/**
 * Extrae información de un número de orden
 *
 * @param orderNumber - Número de orden a parsear
 * @returns Objeto con prefix, date y random, o null si formato inválido
 */
export function parseOrderNumber(orderNumber: string): {
  prefix: string
  date: Date
  random: string
} | null {
  const match = orderNumber.match(/^([A-Z]+)-(\d{8})-(\d{4})$/)
  if (!match) {return null}

  const [, prefix, dateStr, random] = match
  const year = parseInt(dateStr.slice(0, 4))
  const month = parseInt(dateStr.slice(4, 6)) - 1
  const day = parseInt(dateStr.slice(6, 8))

  return {
    prefix,
    date: new Date(year, month, day),
    random,
  }
}
