'use server'

import { requireUserForAction, isManager } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'
import type { ShiftType } from '@/types'

export interface ParsedCell {
  raw: string
  kind: 'off' | 'code' | 'custom' | 'unrecognized'
  shiftCode?: string
  startTime?: string
  endTime?: string
}

export interface ImportPreviewRow {
  rawName: string
  lifeguardId: string | null
  cells: ParsedCell[]
}

export interface ImportPreviewResult {
  dates: string[]
  rows: ImportPreviewRow[]
  warnings: string[]
}

const OFF_TOKENS = new Set(['', 'OFF', 'X', '-', '—', 'N/A'])

function parseDateCell(cell: unknown): string | null {
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    return cell.toISOString().slice(0, 10)
  }
  const str = String(cell ?? '').trim()
  if (!str) return null

  // "8/25", "8/25/2026"
  const slash = str.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (slash) {
    const month = parseInt(slash[1], 10)
    const day = parseInt(slash[2], 10)
    const year = slash[3] ? (slash[3].length === 2 ? 2000 + parseInt(slash[3], 10) : parseInt(slash[3], 10)) : new Date().getFullYear()
    const d = new Date(year, month - 1, day)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }

  // Fallback to native parsing, e.g. "Mon 8/25", "August 25 2026"
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)

  return null
}

function to24h(hour: number, minute: number, meridiem: string | undefined, assumePM: boolean): string {
  let h = hour % 12
  if (meridiem?.toUpperCase() === 'PM') h += 12
  else if (!meridiem && assumePM) h += 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseCell(raw: string, shiftTypes: ShiftType[]): ParsedCell {
  const trimmed = raw.trim()
  const upper = trimmed.toUpperCase()

  if (OFF_TOKENS.has(upper)) return { raw, kind: 'off' }

  const byCode = shiftTypes.find((s) => s.code.toUpperCase() === upper || s.label.toUpperCase() === upper)
  if (byCode) return { raw, kind: 'code', shiftCode: byCode.code }

  const timeRange = trimmed.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?$/,
  )
  if (timeRange) {
    const [, sh, sm, smer, eh, em, emer] = timeRange
    const startTime = to24h(parseInt(sh, 10), sm ? parseInt(sm, 10) : 0, smer, false)
    const endTime = to24h(parseInt(eh, 10), em ? parseInt(em, 10) : 0, emer, true)
    return { raw, kind: 'custom', startTime, endTime }
  }

  return { raw, kind: 'unrecognized' }
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function parseSchedulePreview(formData: FormData): Promise<ImportPreviewResult> {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) throw new Error('Unauthorized')

  const file = formData.get('file') as File | null
  if (!file) return { dates: [], rows: [], warnings: ['No file provided'] }

  const service = createServiceClient()
  const { data: staff } = await service
    .from('user_profiles')
    .select('id, name')
    .eq('facility_id', profile.facility_id)
    .in('role', ['lifeguard', 'supervisor'])
    .eq('is_active', true)

  const { data: facility } = await service
    .from('facilities')
    .select('config')
    .eq('id', profile.facility_id)
    .single()
  const shiftTypes = ((facility?.config as any)?.shift_types ?? []) as ShiftType[]

  const nameToId = new Map((staff ?? []).map((s) => [normalizeName(s.name), s.id]))

  const buffer = await file.arrayBuffer()
  const name = file.name.toLowerCase()
  const warnings: string[] = []

  let grid: unknown[][]
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  } else {
    const text = new TextDecoder().decode(buffer)
    grid = text.split(/\r?\n/).filter((l) => l.trim()).map((line) => line.split(','))
  }

  if (grid.length < 2) return { dates: [], rows: [], warnings: ['File must have a header row and at least one data row'] }

  const headerRow = grid[0]
  const dates: string[] = []
  const dateColIndexes: number[] = []
  for (let c = 1; c < headerRow.length; c++) {
    const date = parseDateCell(headerRow[c])
    if (date) {
      dates.push(date)
      dateColIndexes.push(c)
    }
  }
  if (dates.length === 0) {
    return { dates: [], rows: [], warnings: ['Could not find any date columns in the header row'] }
  }

  const rows: ImportPreviewRow[] = []
  for (let r = 1; r < grid.length; r++) {
    const dataRow = grid[r]
    const rawName = String(dataRow[0] ?? '').trim()
    if (!rawName) continue

    const lifeguardId = nameToId.get(normalizeName(rawName)) ?? null
    if (!lifeguardId) warnings.push(`Row ${r + 1}: "${rawName}" doesn't match anyone on your active roster`)

    const cells = dateColIndexes.map((c) => parseCell(String(dataRow[c] ?? ''), shiftTypes))
    cells.forEach((cell, i) => {
      if (cell.kind === 'unrecognized' && cell.raw.trim()) {
        warnings.push(`Row ${r + 1}, ${dates[i]}: couldn't interpret "${cell.raw}" — left blank`)
      }
    })

    rows.push({ rawName, lifeguardId, cells })
  }

  return { dates, rows, warnings }
}

export async function confirmScheduleImport(
  assignments: { lifeguardId: string; date: string; shiftCode: string | null; startTime?: string; endTime?: string }[],
): Promise<{ imported: number }> {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) throw new Error('Unauthorized')

  if (assignments.length === 0) return { imported: 0 }

  const service = createServiceClient()
  const rows = assignments.map((a) => ({
    facility_id: profile.facility_id,
    lifeguard_id: a.lifeguardId,
    work_date: a.date,
    shift_code: a.shiftCode,
    start_time: a.startTime ?? null,
    end_time: a.endTime ?? null,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await service
    .from('shift_assignments')
    .upsert(rows, { onConflict: 'facility_id,lifeguard_id,work_date' })

  if (error) throw new Error(error.message)

  revalidatePath('/shifts')
  return { imported: rows.length }
}
