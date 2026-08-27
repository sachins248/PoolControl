'use client'

import { Download } from 'lucide-react'
import type { Audit } from '@/types'

const AUDIT_DISPLAY: Record<string, string> = {
  scanning: 'Scanning',
  vat: 'VAT',
  cpr_skills: 'CPR / Skills',
  dispatch: 'Dispatch',
  supervisor_eavs: 'EAVS',
  guest_service: 'Guest Service',
  cleaning: 'Cleaning',
}

interface AuditLogDownloadProps {
  memberName: string
  audits: Audit[]
}

export function AuditLogDownload({ memberName, audits }: AuditLogDownloadProps) {
  function handleDownload() {
    const headers = ['Date', 'Audit Type', 'Zone', 'Score (%)', 'Result', 'Audit ID']
    const rows = audits.map((a) => [
      a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      AUDIT_DISPLAY[a.audit_type_name] ?? a.audit_type_name,
      a.zone ?? '',
      a.score !== null ? String(Math.round((a.score / 5) * 100)) : '',
      a.passed === true ? 'Pass' : a.passed === false ? 'Fail' : 'Pending',
      a.id,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const slug = memberName.toLowerCase().replace(/\s+/g, '-')
    link.href = url
    link.download = `audit-log-${slug}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (audits.length === 0) return null

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 px-4 py-2 border border-white/[0.10] text-white/60 hover:text-white hover:border-white/[0.20] text-sm font-medium rounded-lg transition-colors"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </button>
  )
}
