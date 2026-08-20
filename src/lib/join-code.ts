import { createServiceClient } from '@/lib/supabase/server'

// 29 symbols, no 0/O, 1/I/L, or 2/Z — avoids glyphs that are easy to misread
// aloud or in the mono auth typeface. 8 chars ⇒ ~5×10¹¹ combinations.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXY3456789'
const CODE_LENGTH = 8

function randomCode(): string {
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return out
}

/**
 * Generates a unique join code and writes it onto the given facility column,
 * retrying on the rare unique-index collision. Works whether the column is
 * currently null (first generate) or already set (regenerate).
 */
export async function generateJoinCode(
  facilityId: string,
  column: 'lifeguard_join_code' | 'supervisor_join_code',
): Promise<string> {
  const service = createServiceClient()
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode()
    const { error } = await service
      .from('facilities')
      .update({ [column]: code })
      .eq('id', facilityId)
    if (!error) return code
    if (error.code !== '23505') throw new Error(error.message)
  }
  throw new Error('Could not generate a unique join code — try again')
}

export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}
