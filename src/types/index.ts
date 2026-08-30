export type UserRole = 'lifeguard' | 'supervisor' | 'manager' | 'director' | 'corporate' | 'super_admin'

export type CertBody =
  | 'ellis'
  | 'red_cross'
  | 'starguard'
  | 'ymca'
  | 'jeff_ellis'

export type AuditTypeName =
  | 'scanning'
  | 'vat'
  | 'cpr_skills'
  | 'dispatch'
  | 'supervisor_eavs'
  | 'guest_service'
  | 'cleaning'

export type CriterionResult = 'pass' | 'needs_attention' | 'fail'

export type AuditStatus = 'in_progress' | 'completed' | 'remediated' | 'closed'

export type RemediationStatus =
  | 'assigned'
  | 'acknowledged'
  | 'in_deck'
  | 'verified'
  | 'escalated'

export type CellStatus = 'ok' | 'due_today' | 'overdue' | 'done'

export type Priority = 'HIGH' | 'MED' | 'ON TRACK'

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Facility {
  id: string
  name: string
  cert_body: CertBody
  timezone: string
  config: FacilityConfig
  created_at: string
  lifeguard_join_code?: string | null
  supervisor_join_code?: string | null
}

export interface FacilityConfig {
  remediation_deadline_hours: number // default 48
  audit_cadence: Record<AuditTypeName, number> // days between required audits
  zones: string[]
  shift_types?: ShiftType[]
  liability_model?: LiabilityModel
  chem_defaults?: ChemDefaults
  slack_webhook_url?: string | null
  teams_webhook_url?: string | null
}

/**
 * Facility-supplied actuarial inputs for the liability projection.
 * Absent by default and never defaulted to a made-up number — the panel
 * shows dollars only once a facility enters figures it can stand behind.
 */
export interface LiabilityModel {
  /** Average cost of a defended aquatic claim, in USD. */
  avg_claim_cost: number
  /** Claim-probability reduction per corrected deficiency, 0–1. */
  claim_probability_reduction: number
  /** Where the facility got these numbers (carrier, broker, internal history). */
  source?: string
  updated_at: string
  updated_by_name?: string
}

export interface ShiftType {
  code: string
  label: string
  start: string // "HH:MM"
  end: string
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose'
}

export interface ShiftAssignment {
  id: string
  facility_id: string
  lifeguard_id: string
  work_date: string
  shift_code: string | null
  start_time: string | null
  end_time: string | null
  is_published: boolean
}

export interface UserProfile {
  id: string
  facility_id: string
  role: UserRole
  name: string
  employee_id: string
  photo_url: string | null
  hire_date: string
  phone: string | null
  email: string
  created_at: string
  /** Per-lifeguard audit frequency overrides (days). Falls back to facility cadence. */
  audit_cadence_override?: Partial<Record<AuditTypeName, number>> | null
  is_first_login: boolean
  is_active: boolean
  // computed
  initials?: string
  avatar_color?: string
}

// ─── Water bodies ─────────────────────────────────────────────────────────────

export type WaterBodyKind =
  | 'lap_pool' | 'leisure_pool' | 'wave_pool' | 'lazy_river'
  | 'kiddie_pool' | 'spa' | 'splash_pad' | 'slide_plunge' | 'other'

export interface WaterBody {
  id: string
  facility_id: string
  name: string
  kind: WaterBodyKind
  config: { chem_thresholds?: ChemThresholds; test_interval_minutes?: number }
  is_active: boolean
  sort_order: number
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export type IncidentKind =
  | 'save' | 'assist' | 'first_aid' | 'medical_emergency' | 'guest_injury' | 'other'
export type IncidentSeverity = 'minor' | 'moderate' | 'severe'
export type IncidentStatus = 'draft' | 'submitted' | 'under_review' | 'closed'
export type ResponderRole =
  | 'primary_rescuer' | 'assist' | 'first_aid' | 'supervisor' | 'witness'

export interface Incident {
  id: string
  facility_id: string
  water_body_id: string | null
  occurred_at: string
  kind: IncidentKind
  severity: IncidentSeverity
  guest_name: string | null
  guest_age: number | null
  narrative: string
  actions_taken: string | null
  ems_called: boolean
  ems_arrival_at: string | null
  outcome: string | null
  witnesses: string | null
  status: IncidentStatus
  reported_by_id: string
  submitted_at: string | null
  reviewed_by_id: string | null
  review_notes: string | null
  corrective_action: string | null
  closed_at: string | null
  created_at: string
}

export interface IncidentResponder {
  id: string
  incident_id: string
  user_id: string
  role: ResponderRole
}

export interface IncidentAmendment {
  id: string
  incident_id: string
  seq: number
  body: string
  author_id: string
  created_at: string
}

// ─── Staff advisements ────────────────────────────────────────────────────────

export type AdvisementKind =
  | 'medical_restriction' | 'duty_restriction' | 'written_advisement'
  | 'accommodation' | 'return_to_duty'

export interface StaffAdvisement {
  id: string
  facility_id: string
  user_id: string
  kind: AdvisementKind
  restriction: string
  issued_by: string | null
  effective_from: string
  effective_to: string | null
  recorded_by_id: string
  created_at: string
}

// ─── Water chemistry ──────────────────────────────────────────────────────────

export type ChemParam =
  | 'free_chlorine' | 'combined_chlorine' | 'ph' | 'total_alkalinity'
  | 'calcium_hardness' | 'cyanuric_acid' | 'water_temp_f' | 'turbidity_ntu'

export type ChemReadingStatus = 'ok' | 'out_of_range' | 'closure_required'

export interface ChemBound {
  min?: number
  max?: number
  /** Health-code closure trigger — distinct from merely out of range. */
  close_below?: number
  close_above?: number
  unit?: string
}

export type ChemThresholds = Partial<Record<ChemParam, ChemBound>>

export interface ChemDefaults {
  test_interval_minutes: number
  thresholds: ChemThresholds
}

export interface ChemBreach {
  param: ChemParam
  value: number
  bound: 'min' | 'max' | 'close_below' | 'close_above'
  limit: number
}

export interface ChemistryReading {
  id: string
  facility_id: string
  water_body_id: string
  tested_at: string
  tested_by_id: string
  free_chlorine: number | null
  combined_chlorine: number | null
  ph: number | null
  total_alkalinity: number | null
  calcium_hardness: number | null
  cyanuric_acid: number | null
  water_temp_f: number | null
  turbidity_ntu: number | null
  status: ChemReadingStatus
  breaches: ChemBreach[]
  thresholds_snapshot: ChemThresholds
  notes: string | null
  corrected_at: string | null
  corrected_by_id: string | null
  corrective_note: string | null
  retest_of: string | null
  created_at: string
}

export interface Certification {
  id: string
  user_id: string
  body: CertBody
  expiry: string
  issued_at: string
}

export interface AuditCriterion {
  id: string
  label: string
  description: string
  liability_weight: 'critical' | 'high' | 'standard'
  what_to_look_for: string[]
  common_failures: string[]
}

export interface AuditType {
  id: string
  name: AuditTypeName
  display_name: string
  cert_body: CertBody
  criteria: AuditCriterion[]
  pass_threshold: number // e.g. 0.7 = 70% score to pass
  icon: string
  director_only: boolean
}

export interface Audit {
  id: string
  facility_id: string
  lifeguard_id: string
  supervisor_id: string
  audit_type_id: string
  audit_type_name: AuditTypeName
  status: AuditStatus
  score: number | null
  passed: boolean | null
  zone: string | null
  notes: string | null
  submitted_at: string | null
  created_at: string
  // joins
  lifeguard?: UserProfile
  supervisor?: UserProfile
  audit_type?: AuditType
  criteria_results?: AuditCriterionResult[]
}

export interface AuditCriterionResult {
  id: string
  audit_id: string
  criterion_id: string
  criterion_label: string
  result: CriterionResult
  comment: string | null
}

export interface RemediationTask {
  id: string
  audit_id: string
  facility_id: string
  lifeguard_id: string
  assigned_by_id: string
  deadline: string
  status: RemediationStatus
  coaching_notes: string | null
  verified_by_id: string | null
  verified_at: string | null
  created_at: string
  // joins
  lifeguard?: UserProfile
  assigned_by?: UserProfile
  audit?: Audit
}

export interface TrainingSession {
  id: string
  facility_id: string
  scheduled_date: string
  topic: string
  why_this_topic: string
  lesson_plan: LessonPlan
  is_ai_generated: boolean
  priority: 'High' | 'Medium' | 'Low'
  ai_generated_version: LessonPlan | null
  created_at: string
}

export interface LessonPlan {
  steps: LessonStep[]
  total_duration_minutes: number
}

export interface LessonStep {
  order: number
  title: string
  description: string
  duration_minutes: number
  drill_type: string
}

// ─── Schedule/Dashboard types ─────────────────────────────────────────────────

export interface ScheduleCell {
  status: CellStatus
  last_audit_date: string | null
  days_ago: number | null
  completed_time: string | null // e.g. "9:14am" if done today
  audit_id: string | null
}

export interface ScheduleRow {
  lifeguard: UserProfile
  cells: Record<AuditTypeName, ScheduleCell>
  priority: Priority
  overdue_count: number
}

export interface DailySchedule {
  facility: Facility
  date: string
  on_shift: number
  due_today: number
  overdue: number
  done: number
  total: number
  rows: ScheduleRow[]
}

// ─── LPR (Lifeguard Performance Rating) ──────────────────────────────────────

export interface LPRBreakdown {
  overall: number // 1.0 – 5.0
  by_type: Record<AuditTypeName, number | null>
  trend_30d: number // delta since 30 days ago, positive = improving
  strengths: AuditTypeName[]
  weaknesses: AuditTypeName[]
}

export interface LifeguardProfile extends UserProfile {
  lpr: LPRBreakdown
  current_status: 'active' | 'on_hot_seat' | 'remediation_overdue' | 'inactive'
  certifications: Certification[]
  recent_audits: Audit[]
  open_remediations: RemediationTask[]
  repeat_failures: string[] // criterion labels flagged for escalation
}

// ─── Coach PC ─────────────────────────────────────────────────────────────────

export interface CoachPCRequest {
  criterion: AuditCriterion
  audit_type: AuditTypeName
  cert_body: CertBody
  current_results: Array<{ criterion_id: string; result: CriterionResult }>
  lifeguard_name: string
  zone: string | null
}

export interface CoachingPoint {
  title: string
  description: string
  remediation_activity: string
}

// ─── Notification log ─────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  facility_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  metadata: Record<string, unknown>
  ip: string | null
  created_at: string
}
