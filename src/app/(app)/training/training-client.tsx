'use client'

import { useState } from 'react'
import { Sparkles, BookOpen, Clock, Trash2, ChevronDown, ChevronUp, Flame, Minus, TrendingUp, X, CalendarDays, Loader2 } from 'lucide-react'
import { saveTrainingSession, deleteTrainingSession } from './actions'
import type { TrainingSession, LessonPlan, LessonStep, UserRole } from '@/types'

const DRILL_TYPE_COLORS: Record<string, string> = {
  briefing: 'bg-blue-500/[0.10] text-blue-400 border-blue-500/[0.20]',
  demonstration: 'bg-purple-500/[0.10] text-purple-400 border-purple-500/[0.20]',
  practice: 'bg-emerald-500/[0.10] text-emerald-400 border-emerald-500/[0.20]',
  scenario: 'bg-orange-500/[0.10] text-orange-400 border-orange-500/[0.20]',
  debrief: 'bg-white/[0.05] text-white/50 border-white/[0.10]',
  assessment: 'bg-red-500/[0.10] text-red-400 border-red-500/[0.20]',
}

const PRIORITY_STYLES: Record<string, string> = {
  High: 'bg-red-500/[0.12] text-red-400',
  Medium: 'bg-amber-500/[0.12] text-amber-400',
  Low: 'bg-emerald-500/[0.12] text-emerald-400',
}

interface GeneratedPlan {
  topic: string
  why_this_topic: string
  priority: 'High' | 'Medium' | 'Low'
  lesson_plan: LessonPlan
}

interface Props {
  initialSessions: TrainingSession[]
  userRole: UserRole
}

export function TrainingClient({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<TrainingSession[]>(initialSessions)
  const [generating, setGenerating] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setGeneratedPlan(null)
    try {
      const res = await fetch('/api/training/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate plan. Please try again.')
        return
      }
      setGeneratedPlan(data)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!generatedPlan) return
    setSaving(true)
    try {
      await saveTrainingSession({
        topic: generatedPlan.topic,
        why_this_topic: generatedPlan.why_this_topic,
        priority: generatedPlan.priority,
        lesson_plan: generatedPlan.lesson_plan,
        scheduled_date: scheduledDate,
      })
      // Optimistically add to top of list
      const newSession: TrainingSession = {
        id: crypto.randomUUID(),
        facility_id: '',
        topic: generatedPlan.topic,
        why_this_topic: generatedPlan.why_this_topic,
        priority: generatedPlan.priority,
        lesson_plan: generatedPlan.lesson_plan,
        scheduled_date: scheduledDate,
        is_ai_generated: true,
        ai_generated_version: null,
        created_at: new Date().toISOString(),
      }
      setSessions((prev) => [newSession, ...prev])
      setGeneratedPlan(null)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteTrainingSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  const PriorityIcon = ({ priority }: { priority: string }) =>
    priority === 'High' ? <Flame className="w-3 h-3" /> :
    priority === 'Medium' ? <Minus className="w-3 h-3" /> :
    <TrendingUp className="w-3 h-3" />

  return (
    <div className="px-8 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Training Plans</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Lesson plans generated from your team&apos;s live performance data.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing team data...</>
            : <><Sparkles className="w-4 h-4" /> Generate Training Plan</>
          }
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Generated plan preview */}
      {generatedPlan && (
        <div className="border border-emerald-500/[0.25] bg-emerald-500/[0.05] rounded-2xl overflow-hidden">
          {/* Preview header */}
          <div className="bg-emerald-500 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">AI-Generated Plan — Review Before Saving</span>
            </div>
            <button onClick={() => setGeneratedPlan(null)} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_STYLES[generatedPlan.priority]}`}>
                    <PriorityIcon priority={generatedPlan.priority} />
                    {generatedPlan.priority} Priority
                  </span>
                  <span className="text-xs text-gray-400">{generatedPlan.lesson_plan.total_duration_minutes} min session</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{generatedPlan.topic}</h2>
                <p className="text-sm text-gray-600 mt-1">{generatedPlan.why_this_topic}</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {generatedPlan.lesson_plan.steps.map((step: LessonStep) => (
                <StepCard key={step.order} step={step} />
              ))}
            </div>

            {/* Save controls */}
            <div className="flex items-center gap-3 pt-2 border-t border-emerald-500/[0.15]">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                <label className="text-xs font-medium text-gray-600">Schedule for:</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setGeneratedPlan(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Save to Training History'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session history */}
      {sessions.length === 0 && !generatedPlan ? (
        <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-gray-200 rounded-2xl">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
            <BookOpen className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-600">No training plans yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Generate your first AI training plan above. It analyzes your team&apos;s audit data and builds a targeted session around your biggest weakness.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Training History ({sessions.length})
          </h2>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              expanded={expandedId === session.id}
              onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
              onDelete={() => handleDelete(session.id)}
              deleting={deletingId === session.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StepCard({ step }: { step: LessonStep }) {
  const colorClass = DRILL_TYPE_COLORS[step.drill_type] ?? 'bg-gray-50 text-gray-600 border-gray-200'
  return (
    <div className="flex gap-3 bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/[0.07] flex items-center justify-center text-xs font-bold text-gray-500 mt-0.5">
        {step.order}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{step.title}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${colorClass}`}>
            {step.drill_type}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {step.duration_minutes} min
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.description}</p>
      </div>
    </div>
  )
}

function SessionCard({
  session,
  expanded,
  onToggle,
  onDelete,
  deleting,
}: {
  session: TrainingSession
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const steps = session.lesson_plan?.steps ?? []
  const duration = session.lesson_plan?.total_duration_minutes ?? 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {session.is_ai_generated && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_STYLES[session.priority]}`}>
              {session.priority}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {duration} min
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{steps.length} steps</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{session.topic}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Scheduled: {new Date(session.scheduled_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            disabled={deleting}
            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-3">
          {session.why_this_topic && (
            <p className="text-sm text-gray-600 bg-white/[0.03] rounded-lg px-4 py-3 border border-white/[0.06]">
              <span className="font-semibold text-gray-700">Why this topic: </span>
              {session.why_this_topic}
            </p>
          )}
          <div className="space-y-2">
            {steps.map((step: LessonStep) => (
              <StepCard key={step.order} step={step} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
