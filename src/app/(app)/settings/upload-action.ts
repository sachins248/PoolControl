'use server'

import { requireUserForAction, isManager } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

export interface CSVRow {
  name: string
  email: string
  role: string
  hire_date?: string
  employee_id?: string
  phone?: string
}

export interface ParseResult {
  rows: CSVRow[]
  errors: string[]
}

export interface BulkCreateResult {
  created: number
  skipped: number
  errors: string[]
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, '_')
}

function parseFileToRows(file: File, buffer: ArrayBuffer): { headers: string[]; rows: string[][] } {
  const name = file.name.toLowerCase()
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')

  if (isExcel) {
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
    if (data.length < 2) return { headers: [], rows: [] }
    const headers = (data[0] as string[]).map(normalizeHeader)
    const rows = (data.slice(1) as string[][]).map((r) => r.map((c) => String(c ?? '').trim()))
    return { headers, rows }
  }

  // CSV fallback
  const text = new TextDecoder().decode(buffer)
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
      else { current += ch }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseCSVLine(lines[0]).map(normalizeHeader)
  const rows = lines.slice(1).map(parseCSVLine)
  return { headers, rows }
}

export async function parseAndPreviewCSV(formData: FormData): Promise<ParseResult> {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role)) throw new Error('Unauthorized')

  const file = formData.get('file') as File | null
  if (!file) return { rows: [], errors: ['No file provided'] }

  const buffer = await file.arrayBuffer()
  const { headers, rows: dataRows } = parseFileToRows(file, buffer)

  if (headers.length === 0) return { rows: [], errors: ['File must have a header row and at least one data row'] }

  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'full_name')
  const emailIdx = headers.findIndex((h) => h === 'email' || h === 'email_address')
  const roleIdx = headers.findIndex((h) => h === 'role' || h === 'position')
  const hireDateIdx = headers.findIndex((h) => h === 'hire_date' || h === 'start_date')
  const employeeIdIdx = headers.findIndex((h) => h === 'employee_id' || h === 'id')
  const phoneIdx = headers.findIndex((h) => h === 'phone' || h === 'phone_number')

  const errors: string[] = []

  if (nameIdx === -1) errors.push('Missing required column: name')
  if (emailIdx === -1) errors.push('Missing required column: email')
  if (roleIdx === -1) errors.push('Missing required column: role')
  if (errors.length > 0) return { rows: [], errors }

  const rows: CSVRow[] = []
  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i]
    const name = cols[nameIdx]?.trim()
    const email = cols[emailIdx]?.trim().toLowerCase()
    const role = cols[roleIdx]?.trim().toLowerCase()

    if (!name && !email) continue // skip fully empty rows (common in Excel)
    if (!name || !email) {
      errors.push(`Row ${i + 2}: missing name or email — skipped`)
      continue
    }
    if (!['lifeguard', 'supervisor', 'manager'].includes(role)) {
      errors.push(`Row ${i + 2}: invalid role "${role}" (must be lifeguard, supervisor, or manager) — skipped`)
      continue
    }

    rows.push({
      name,
      email,
      role,
      hire_date: hireDateIdx >= 0 ? cols[hireDateIdx]?.trim() || undefined : undefined,
      employee_id: employeeIdIdx >= 0 ? cols[employeeIdIdx]?.trim() || undefined : undefined,
      phone: phoneIdx >= 0 ? cols[phoneIdx]?.trim() || undefined : undefined,
    })
  }

  return { rows, errors }
}

export async function bulkCreateUsers(
  rows: CSVRow[],
  facilityId: string
): Promise<BulkCreateResult> {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || profile.facility_id !== facilityId) {
    throw new Error('Unauthorized')
  }

  const serviceClient = createServiceClient()
  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
        email: row.email,
        email_confirm: true,
      })

      if (createError) {
        if (createError.message?.includes('already been registered')) {
          skipped++
          continue
        }
        errors.push(`${row.email}: ${createError.message}`)
        continue
      }

      const { error: profileError } = await serviceClient.from('user_profiles').insert({
        id: newUser.user.id,
        name: row.name,
        email: row.email,
        role: row.role,
        facility_id: facilityId,
        hire_date: row.hire_date || null,
        is_first_login: true,
      })

      if (profileError) {
        await serviceClient.auth.admin.deleteUser(newUser.user.id)
        errors.push(`${row.email}: ${profileError.message}`)
        continue
      }

      // Send OTP code so new user can log in without a link
      const { createClient: createAnonClient } = await import('@supabase/supabase-js')
      const anonClient = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      await anonClient.auth.signInWithOtp({
        email: row.email,
        options: { shouldCreateUser: false },
      })

      created++
    } catch (err: any) {
      errors.push(`${row.email}: ${err.message ?? 'Unknown error'}`)
    }
  }

  revalidatePath('/settings')
  return { created, skipped, errors }
}
