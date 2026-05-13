'use client'

import { useState } from 'react'
import { Printer, Download } from 'lucide-react'

export function ReportActions({ fileName }: { fileName: string }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const element = document.getElementById('report-content')
      if (!element) return

      await html2pdf().set({
        margin: [12, 12, 12, 12],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(element).save()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Download className="w-4 h-4" />
        {downloading ? 'Generating PDF...' : 'Download PDF'}
      </button>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Printer className="w-4 h-4" />
        Print
      </button>
    </div>
  )
}
