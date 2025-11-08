/**
 * Valida se uma string é um UUID válido (v4)
 */
export function isValidUUID(str: string | undefined): boolean {
  if (!str) return false
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}
