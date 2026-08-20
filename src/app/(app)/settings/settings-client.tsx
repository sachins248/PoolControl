'use client'

import { useState, useTransition, useRef } from 'react'
import { Users, Upload, UserPlus, Trash2, CheckCircle, AlertCircle, X, Loader2, Bell, Copy, RefreshCw } from 'lucide-react'
import { addStaffMember, removeStaffMember, saveWebhookSettings, regenerateJoinCode } from './actions'
import { parseAndPreviewCSV, bulkCreateUsers } from './upload-action'
import type { UserProfile } from '@/types'
import type { CSVRow } from './upload-action'

interface Props {
  facility: {
    id: string
    name: string
    cert_body: string
    config: any
    lifeguard_join_code: string | null
    supervisor_join_code: string | null
  } | null
  staff: UserProfile[]
  facilityId: string
  currentUserId: string
  currentUser: UserProfile
}

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  lifeguard: 'Lifeguard — own profile & remediations only',
  supervisor: 'Supervisor — conducts audits, sees lifeguard schedules',
  manager: 'Manager — full facility access incl. supervisor metrics',
  director: 'Manager — full facility access incl. supervisor metrics',
  corporate: 'Corporate — multi-facility reporting',
  super_admin: 'Platform Administrator',
}

const ROLE_LABELS: Record<string, string> = {
  lifeguard: 'Lifeguard',
  supervisor: 'Supervisor',
  manager: 'Manager',
  director: 'Manager',
}

const ROLE_COLORS: Record<string, string> = {
  lifeguard: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-amber-100 text-amber-700',
  manager: 'bg-purple-100 text-purple-700',
  director: 'bg-purple-100 text-purple-700',
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm ${
      type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  )
}

export function SettingsClient({ facility, staff, facilityId, currentUserId, currentUser }: Props) {
  const [tab, setTab] = useState<'roster' | 'upload' | 'notifications'>('roster')
  const [showAddForm, setShowAddForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Access codes
  const [codes, setCodes] = useState({
    lifeguard: facility?.lifeguard_join_code ?? null,
    supervisor: facility?.supervisor_join_code ?? null,
  })
  const [regeneratingKind, setRegeneratingKind] = useState<'lifeguard' | 'supervisor' | null>(null)

  // Webhook state
  const config = (facility?.config ?? {}) as Record<string, string>
  const [slackUrl, setSlackUrl] = useState(config.slack_webhook_url ?? '')
  const [teamsUrl, setTeamsUrl] = useState(config.teams_webhook_url ?? '')
  const [webhookPending, startWebhookTransition] = useTransition()

  // CSV state
  const [csvRows, setCSVRows] = useState<CSVRow[]>([])
  const [csvErrors, setCSVErrors] = useState<string[]>([])
  const [csvParsed, setCSVParsed] = useState(false)
  const [csvPending, startCSVTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleAddStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await addStaffMember(formData)
        showToast('Staff member added and invite sent.', 'success')
        setShowAddForm(false)
        ;(e.target as HTMLFormElement).reset()
      } catch (err: any) {
        showToast(err.message ?? 'Failed to add staff member.', 'error')
      }
    })
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the roster? This cannot be undone.`)) return
    setRemovingId(userId)
    try {
      await removeStaffMember(userId)
      showToast(`${name} has been removed.`, 'success')
    } catch (err: any) {
      showToast(err.message ?? 'Failed to remove staff member.', 'error')
    } finally {
      setRemovingId(null)
    }
  }

  async function handleRegenerateCode(kind: 'lifeguard' | 'supervisor') {
    setRegeneratingKind(kind)
    try {
      const code = await regenerateJoinCode(kind)
      setCodes((c) => ({ ...c, [kind]: code }))
      showToast(`${kind === 'lifeguard' ? 'Lifeguard' : 'Supervisor'} code regenerated.`, 'success')
    } catch (err: any) {
      showToast(err.message ?? 'Failed to regenerate code.', 'error')
    } finally {
      setRegeneratingKind(null)
    }
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code)
    showToast('Code copied.', 'success')
  }

  async function handleSaveWebhooks(e: React.FormEvent) {
    e.preventDefault()
    startWebhookTransition(async () => {
      try {
        await saveWebhookSettings(slackUrl, teamsUrl)
        showToast('Notification settings saved.', 'success')
      } catch (err: any) {
        showToast(err.message ?? 'Failed to save settings.', 'error')
      }
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCSVParsed(false)
    setCSVRows([])
    setCSVErrors([])
    const formData = new FormData()
    formData.set('file', file)
    startCSVTransition(async () => {
      try {
        const result = await parseAndPreviewCSV(formData)
        setCSVRows(result.rows)
        setCSVErrors(result.errors)
        setCSVParsed(true)
      } catch (err: any) {
        showToast(err.message ?? 'Failed to parse file.', 'error')
      }
    })
  }

  async function handleBulkConfirm() {
    if (csvRows.length === 0) return
    startCSVTransition(async () => {
      try {
        const result = await bulkCreateUsers(csvRows, facilityId)
        showToast(
          `Done: ${result.created} created, ${result.skipped} skipped${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}.`,
          result.errors.length > 0 ? 'error' : 'success'
        )
        setCSVRows([])
        setCSVErrors([])
        setCSVParsed(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (err: any) {
        showToast(err.message ?? 'Bulk create failed.', 'error')
      }
    })
  }

  return (
    <div className="px-8 py-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-gray-500 text-sm mb-6">{facility?.name ?? 'Your Facility'}</p>

      {/* Account card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Signed in as</p>
          <p className="text-sm font-semibold text-gray-900">{currentUser.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{currentUser.email}</p>
          <p className="text-xs text-gray-400 mt-2">
            <span className="inline-block px-2 py-0.5 border border-gray-300 rounded text-[10px] font-semibold uppercase tracking-wide text-gray-600 mr-2">
              {currentUser.role.replace('_', ' ')}
            </span>
            {ACCESS_LEVEL_LABELS[currentUser.role] ?? ''}
          </p>
        </div>
        <div className="shrink-0 text-right space-y-2">
          <p className="text-xs text-gray-400">{facility?.name}</p>
          <div className="text-[10px] text-gray-400 space-x-2">
            <a href="/legal/terms" className="hover:text-gray-600 underline underline-offset-2">Terms</a>
            <a href="/legal/privacy" className="hover:text-gray-600 underline underline-offset-2">Privacy</a>
            <a href="/legal/ai" className="hover:text-gray-600 underline underline-offset-2">AI &amp; Data</a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'roster', label: 'Roster', icon: <Users className="w-4 h-4" /> },
          { key: 'upload', label: 'Bulk Upload', icon: <Upload className="w-4 h-4" /> },
          { key: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === key
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">{icon}{label}</span>
          </button>
        ))}
      </div>

      {/* Roster Tab */}
      {tab === 'roster' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{staff.length} staff member{staff.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Person
            </button>
          </div>

          {/* Access codes */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Access Codes</h3>
            <p className="text-xs text-gray-500 mb-4">
              Staff can join your facility themselves at <span className="font-mono">/join</span> using one of these codes.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {(['lifeguard', 'supervisor'] as const).map((kind) => (
                <div key={kind} className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-2 capitalize">{kind} code</p>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="flex-1 text-sm font-mono font-semibold text-gray-900 tracking-wider bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                      {codes[kind] ?? '—'}
                    </code>
                    {codes[kind] && (
                      <button
                        onClick={() => handleCopyCode(codes[kind]!)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRegenerateCode(kind)}
                      disabled={regeneratingKind === kind}
                      className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors"
                      title={codes[kind] ? 'Regenerate code' : 'Generate code'}
                    >
                      {regeneratingKind === kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Anyone with this code can join as {kind} — regenerate if it&apos;s been shared too widely.
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form onSubmit={handleAddStaff} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-5 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Add New Staff Member</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                  <input
                    name="name"
                    required
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="jane@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                  <select
                    name="role"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">Select role...</option>
                    <option value="lifeguard">Lifeguard</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hire Date</label>
                  <input
                    name="hire_date"
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isPending ? 'Adding...' : 'Add & Send Invite'}
                </button>
              </div>
            </form>
          )}

          {/* Staff grouped by role hierarchy */}
          {(() => {
            const managers = staff.filter((s) => ['manager', 'director'].includes(s.role))
            const supervisors = staff.filter((s) => s.role === 'supervisor')
            const lifeguards = staff.filter((s) => s.role === 'lifeguard')

            const groups = [
              { label: 'Managers', members: managers },
              { label: 'Supervisors', members: supervisors },
              { label: 'Lifeguards', members: lifeguards },
            ].filter((g) => g.members.length > 0)

            return (
              <div className="space-y-5">
                {groups.map(({ label, members }) => (
                  <div key={label}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      {label} ({members.length})
                    </h3>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hire Date</th>
                            <th className="px-5 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member, i) => (
                            <tr key={member.id} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                              <td className="px-5 py-3 font-medium text-gray-900">{member.name}</td>
                              <td className="px-5 py-3 text-gray-500">{member.email}</td>
                              <td className="px-5 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {ROLE_LABELS[member.role] ?? member.role}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-gray-500">
                                {member.hire_date ? new Date(member.hire_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </td>
                              <td className="px-5 py-3 text-right">
                                {member.id !== currentUserId && (
                                  <button
                                    onClick={() => handleRemove(member.id, member.name)}
                                    disabled={removingId === member.id}
                                    className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors rounded"
                                    title="Remove from roster"
                                  >
                                    {removingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* Bulk Upload Tab */}
      {tab === 'upload' && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">CSV / Spreadsheet Format</p>
            <p className="text-blue-600">Required columns: <code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">email</code>, <code className="bg-blue-100 px-1 rounded">role</code> (lifeguard / supervisor / director)</p>
            <p className="text-blue-600 mt-0.5">Optional: <code className="bg-blue-100 px-1 rounded">hire_date</code>, <code className="bg-blue-100 px-1 rounded">employee_id</code>, <code className="bg-blue-100 px-1 rounded">phone</code></p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV or Excel file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
          </div>

          {csvPending && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Parsing file...
            </div>
          )}

          {csvErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
              <p className="text-sm font-medium text-amber-800">Warnings ({csvErrors.length})</p>
              {csvErrors.map((e, i) => (
                <p key={i} className="text-xs text-amber-700">{e}</p>
              ))}
            </div>
          )}

          {csvParsed && csvRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">{csvRows.length} valid row{csvRows.length !== 1 ? 's' : ''} ready to import</p>
                <button
                  onClick={handleBulkConfirm}
                  disabled={csvPending}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {csvPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {csvPending ? 'Creating...' : `Confirm & Import ${csvRows.length} Users`}
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hire Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                        <td className="px-5 py-3 font-medium text-gray-900">{row.name}</td>
                        <td className="px-5 py-3 text-gray-500">{row.email}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[row.role] ?? 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[row.role] ?? row.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{row.hire_date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {csvParsed && csvRows.length === 0 && csvErrors.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No valid rows found in file.</p>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="max-w-xl space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Audit Failure Alerts</h2>
            <p className="text-sm text-gray-500">
              When a lifeguard fails an audit, PoolControl will send an instant notification to your team channel with the guard&apos;s info, score, and failed criteria.
            </p>
          </div>

          <form onSubmit={handleSaveWebhooks} className="space-y-5">
            {/* Slack */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#4A154B] rounded flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">#</span>
                </div>
                <span className="font-medium text-sm text-gray-900">Slack</span>
                {slackUrl && <span className="ml-auto text-[10px] font-medium px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Connected</span>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Incoming Webhook URL</label>
                <input
                  type="url"
                  value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Create one at <span className="font-medium">api.slack.com/apps</span> → Incoming Webhooks
                </p>
              </div>
            </div>

            {/* Teams */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#5059C9] rounded flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">T</span>
                </div>
                <span className="font-medium text-sm text-gray-900">Microsoft Teams</span>
                {teamsUrl && <span className="ml-auto text-[10px] font-medium px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Connected</span>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Incoming Webhook URL</label>
                <input
                  type="url"
                  value={teamsUrl}
                  onChange={(e) => setTeamsUrl(e.target.value)}
                  placeholder="https://outlook.office.com/webhook/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Add via <span className="font-medium">Apps → Incoming Webhook</span> in your Teams channel
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-400">Notifications fire automatically on every failed audit submission.</p>
              <button
                type="submit"
                disabled={webhookPending}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {webhookPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {webhookPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
