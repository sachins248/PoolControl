'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { parseSchedulePreview, confirmScheduleImport } from './import-actions'
import type { ImportPreviewResult } from './import-actions'
import type { UserProfile } from '@/types'

interface Props {
  staff: UserProfile[]
  onClose: () => void
  onImported: () => void
}

export function ScheduleImportModal({ staff, onClose, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [overrides, setOverrides] = useState<Record<number, string>>({})
  const [skipped, setSkipped] = useState<Record<number, boolean>>({})

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setPreview(null)
    setOverrides({})
    setSkipped({})
    try {
      const formData = new FormData()
      formData.set('file', file)
      const result = await parseSchedulePreview(formData)
      setPreview(result)
      if (result.dates.length === 0) {
        toast.error(result.warnings[0] ?? 'Could not read this file')
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to parse file')
    } finally {
      setParsing(false)
    }
  }

  function resolveLifeguardId(rowIndex: number): string | null {
    return overrides[rowIndex] ?? preview!.rows[rowIndex].lifeguardId
  }

  async function handleConfirm() {
    if (!preview) return
    const assignments: { lifeguardId: string; date: string; shiftCode: string | null; startTime?: string; endTime?: string }[] = []

    preview.rows.forEach((row, ri) => {
      if (skipped[ri]) return
      const lifeguardId = resolveLifeguardId(ri)
      if (!lifeguardId) return
      row.cells.forEach((cell, ci) => {
        if (cell.kind === 'off' || cell.kind === 'unrecognized') return
        assignments.push({
          lifeguardId,
          date: preview.dates[ci],
          shiftCode: cell.kind === 'code' ? cell.shiftCode! : null,
          startTime: cell.kind === 'custom' ? cell.startTime : undefined,
          endTime: cell.kind === 'custom' ? cell.endTime : undefined,
        })
      })
    })

    if (assignments.length === 0) {
      toast.error('Nothing to import — match at least one row to a roster member.')
      return
    }

    setImporting(true)
    try {
      const result = await confirmScheduleImport(assignments)
      toast.success(`Imported ${result.imported} shift${result.imported !== 1 ? 's' : ''}.`)
      onImported()
    } catch (err: any) {
      toast.error(err.message ?? 'Import failed')
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Import Schedule from Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {!preview && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Upload a spreadsheet with staff names down the first column and dates across the
                header row (e.g. one row per lifeguard, one column per day). Cells can contain a
                shift code, a shift label, or a time range like &quot;9-5&quot;.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              {parsing && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Reading file...
                </div>
              )}
            </div>
          )}

          {preview && preview.dates.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Found <b>{preview.dates.length}</b> day{preview.dates.length !== 1 ? 's' : ''} and{' '}
                <b>{preview.rows.length}</b> row{preview.rows.length !== 1 ? 's' : ''}.
              </p>

              {preview.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}

              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-3 py-2 font-semibold text-gray-400 uppercase">Name</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-400 uppercase">Match</th>
                      {preview.dates.map((d) => (
                        <th key={d} className="px-2 py-2 font-semibold text-gray-400 uppercase text-center">
                          {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, ri) => {
                      const resolvedId = resolveLifeguardId(ri)
                      const isSkipped = skipped[ri]
                      return (
                        <tr key={ri} className={`border-b border-gray-50 last:border-0 ${isSkipped ? 'opacity-40' : ''}`}>
                          <td className="px-3 py-2 font-medium text-gray-900">{row.rawName}</td>
                          <td className="px-3 py-2">
                            {row.lifeguardId ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                              </span>
                            ) : (
                              <>
                                <select
                                  value={overrides[ri] ?? ''}
                                  onChange={(e) =>
                                    setOverrides((o) => ({ ...o, [ri]: e.target.value }))
                                  }
                                  className="border border-gray-300 rounded px-1.5 py-1 text-xs"
                                >
                                  <option value="">Unmatched — pick one</option>
                                  {staff.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                                {resolvedId && (
                                  <span className="ml-1.5 text-emerald-600">
                                    <CheckCircle2 className="w-3.5 h-3.5 inline" />
                                  </span>
                                )}
                              </>
                            )}
                            <button
                              onClick={() => setSkipped((sk) => ({ ...sk, [ri]: !sk[ri] }))}
                              className="ml-2 text-gray-400 hover:text-gray-600 underline"
                            >
                              {isSkipped ? 'include' : 'skip'}
                            </button>
                          </td>
                          {row.cells.map((cell, ci) => (
                            <td key={ci} className="px-2 py-2 text-center text-gray-600">
                              {cell.kind === 'off' || cell.kind === 'unrecognized' ? (
                                <span className="text-gray-300">—</span>
                              ) : cell.kind === 'code' ? (
                                <span className="font-bold">{cell.shiftCode}</span>
                              ) : (
                                <span className="text-[10px]">{cell.startTime}–{cell.endTime}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {preview && preview.dates.length > 0 && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {importing && <Loader2 className="w-4 h-4 animate-spin" />}
              {importing ? 'Importing…' : 'Confirm Import'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
