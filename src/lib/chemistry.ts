import type {
  ChemBound, ChemBreach, ChemDefaults, ChemParam, ChemReadingStatus,
  ChemThresholds, WaterBody, WaterBodyKind,
} from '@/types'

export const CHEM_PARAMS: { key: ChemParam; label: string; unit: string; step: string }[] = [
  { key: 'free_chlorine', label: 'Free chlorine', unit: 'ppm', step: '0.1' },
  { key: 'combined_chlorine', label: 'Combined chlorine', unit: 'ppm', step: '0.1' },
  { key: 'ph', label: 'pH', unit: '', step: '0.1' },
  { key: 'total_alkalinity', label: 'Total alkalinity', unit: 'ppm', step: '1' },
  { key: 'calcium_hardness', label: 'Calcium hardness', unit: 'ppm', step: '1' },
  { key: 'cyanuric_acid', label: 'Cyanuric acid', unit: 'ppm', step: '1' },
  { key: 'water_temp_f', label: 'Water temp', unit: '°F', step: '0.5' },
  { key: 'turbidity_ntu', label: 'Turbidity', unit: 'NTU', step: '0.1' },
]

export const CHEM_LABEL: Record<ChemParam, string> =
  Object.fromEntries(CHEM_PARAMS.map((p) => [p.key, p.label])) as Record<ChemParam, string>

/** Sensible starting limits per kind of water. Seeded onto a body at creation. */
export const THRESHOLD_TEMPLATES: Partial<Record<WaterBodyKind, ChemThresholds>> = {
  // Spas run hotter and burn off chlorine faster, so the floor is higher.
  spa: {
    free_chlorine: { min: 2.0, max: 10.0, close_below: 1.5, unit: 'ppm' },
    ph: { min: 7.2, max: 7.8, close_below: 7.0, close_above: 8.0 },
    water_temp_f: { min: 90, max: 104, close_above: 104, unit: '°F' },
  },
  // Higher fecal-contamination risk, so a stricter chlorine floor than a lap pool.
  kiddie_pool: {
    free_chlorine: { min: 2.0, max: 8.0, close_below: 1.0, unit: 'ppm' },
    ph: { min: 7.2, max: 7.8, close_below: 7.0, close_above: 8.0 },
  },
  splash_pad: {
    free_chlorine: { min: 1.0, max: 8.0, close_below: 1.0, unit: 'ppm' },
    // No filtration buffer, so stabiliser is capped tighter.
    cyanuric_acid: { max: 40, unit: 'ppm' },
  },
}

const BUILTIN: ChemDefaults = {
  test_interval_minutes: 240,
  thresholds: {
    free_chlorine: { min: 1.0, max: 8.0, close_below: 1.0, unit: 'ppm' },
    combined_chlorine: { max: 0.4, unit: 'ppm' },
    ph: { min: 7.2, max: 7.8, close_below: 7.0, close_above: 8.0 },
    total_alkalinity: { min: 60, max: 180, unit: 'ppm' },
    calcium_hardness: { min: 150, max: 1000, unit: 'ppm' },
    cyanuric_acid: { max: 100, unit: 'ppm' },
    water_temp_f: { min: 70, max: 104, close_above: 104, unit: '°F' },
    turbidity_ntu: { max: 1.0, unit: 'NTU' },
  },
}

type BodyLike = Pick<WaterBody, 'kind' | 'config'>

/**
 * Per-body override falls back to the facility default, then to a built-in.
 * Deliberately the same shape as getEffectiveCadence() in src/lib/schedule.ts —
 * the codebase already has one tested answer to "override, else facility".
 */
export function resolveThresholds(
  facilityDefaults: ChemDefaults | undefined,
  body: BodyLike | undefined,
): { thresholds: ChemThresholds; source: 'body' | 'facility' | 'builtin' } {
  const bodyOverride = body?.config?.chem_thresholds
  if (bodyOverride && Object.keys(bodyOverride).length > 0) {
    return { thresholds: { ...BUILTIN.thresholds, ...bodyOverride }, source: 'body' }
  }
  if (facilityDefaults?.thresholds && Object.keys(facilityDefaults.thresholds).length > 0) {
    return { thresholds: { ...BUILTIN.thresholds, ...facilityDefaults.thresholds }, source: 'facility' }
  }
  return { thresholds: BUILTIN.thresholds, source: 'builtin' }
}

export function resolveTestInterval(
  facilityDefaults: ChemDefaults | undefined,
  body: BodyLike | undefined,
): { minutes: number; source: 'body' | 'facility' | 'builtin' } {
  if (body?.config?.test_interval_minutes) {
    return { minutes: body.config.test_interval_minutes, source: 'body' }
  }
  if (facilityDefaults?.test_interval_minutes) {
    return { minutes: facilityDefaults.test_interval_minutes, source: 'facility' }
  }
  return { minutes: BUILTIN.test_interval_minutes, source: 'builtin' }
}

/**
 * Grades a reading. "Out of range" and "must close the pool" are legally
 * distinct states, so this returns three, not a boolean.
 */
export function evaluateReading(
  values: Partial<Record<ChemParam, number | null>>,
  thresholds: ChemThresholds,
): { status: ChemReadingStatus; breaches: ChemBreach[] } {
  const breaches: ChemBreach[] = []
  let closure = false

  for (const { key } of CHEM_PARAMS) {
    const value = values[key]
    if (value === null || value === undefined || Number.isNaN(value)) continue
    const b: ChemBound | undefined = thresholds[key]
    if (!b) continue

    if (b.close_below !== undefined && value < b.close_below) {
      breaches.push({ param: key, value, bound: 'close_below', limit: b.close_below }); closure = true
    } else if (b.close_above !== undefined && value > b.close_above) {
      breaches.push({ param: key, value, bound: 'close_above', limit: b.close_above }); closure = true
    } else if (b.min !== undefined && value < b.min) {
      breaches.push({ param: key, value, bound: 'min', limit: b.min })
    } else if (b.max !== undefined && value > b.max) {
      breaches.push({ param: key, value, bound: 'max', limit: b.max })
    }
  }

  return {
    status: closure ? 'closure_required' : breaches.length > 0 ? 'out_of_range' : 'ok',
    breaches,
  }
}

/** "pH 8.2 above 7.8 (closure)" — used in alerts and the log UI. */
export function describeBreach(b: ChemBreach): string {
  const label = CHEM_LABEL[b.param] ?? b.param
  const dir = b.bound === 'min' || b.bound === 'close_below' ? 'below' : 'above'
  const closure = b.bound.startsWith('close_') ? ' (closure)' : ''
  return `${label} ${b.value} ${dir} ${b.limit}${closure}`
}

/** Minutes until this body is next due, negative when overdue. */
export function minutesUntilDue(lastTestedAt: string | null, intervalMinutes: number): number | null {
  if (!lastTestedAt) return null // never tested
  const elapsed = (Date.now() - new Date(lastTestedAt).getTime()) / 60000
  return Math.round(intervalMinutes - elapsed)
}
