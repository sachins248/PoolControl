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
}

export interface FacilityConfig {
  remediation_deadline_hours: number // default 48
  audit_cadence: Record<AuditTypeName, number> // days between required audits
  zones: string[]
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
  // computed
  initials?: string
  avatar_color?: string
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
