interface AuditFailurePayload {
  lifeguardName: string
  auditTypeName: string
  zone: string
  score: number
  failedCriteria: string[]
  auditId: string
  facilityName: string
}

function buildSlackPayload(p: AuditFailurePayload): object {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const failList = p.failedCriteria.length > 0
    ? p.failedCriteria.map((c) => `• ${c}`).join('\n')
    : 'No specific criteria flagged'

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `⚠️ Audit Failed — ${p.lifeguardName}` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${p.auditTypeName}* audit at *${p.zone}* · Score: *${p.score.toFixed(1)}*\n_${p.facilityName}_`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Failed Criteria:*\n${failList}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Audit Result' },
            url: `${appUrl}/audits/result/${p.auditId}`,
            style: 'danger',
          },
        ],
      },
    ],
  }
}

function buildTeamsPayload(p: AuditFailurePayload): object {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const failList = p.failedCriteria.length > 0
    ? p.failedCriteria.join(', ')
    : 'No specific criteria flagged'

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    summary: `Audit Failed — ${p.lifeguardName}`,
    themeColor: 'FF4444',
    title: `⚠️ Audit Failed — ${p.lifeguardName}`,
    sections: [
      {
        facts: [
          { name: 'Facility', value: p.facilityName },
          { name: 'Audit Type', value: p.auditTypeName },
          { name: 'Zone', value: p.zone },
          { name: 'Score', value: p.score.toFixed(1) },
          { name: 'Failed Criteria', value: failList },
        ],
      },
    ],
    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'View Audit Result',
        targets: [{ os: 'default', uri: `${appUrl}/audits/result/${p.auditId}` }],
      },
    ],
  }
}


export interface WebhookUrls {
  slack?: string | null
  teams?: string | null
}

/**
 * Single transport for every alert type. Each event only has to supply its two
 * payload builders; previously each one re-implemented this same fetch loop.
 * Delivery is best-effort by design — a webhook outage must never block the
 * write that triggered it.
 */
async function dispatch(
  urls: WebhookUrls,
  buildSlack: () => object,
  buildTeams: () => object,
): Promise<void> {
  const sends: Promise<void>[] = []
  if (urls.slack) {
    sends.push(
      fetch(urls.slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSlack()),
      })
        .then(() => {})
        .catch((err) => console.warn('[webhooks] slack delivery failed:', err)),
    )
  }
  if (urls.teams) {
    sends.push(
      fetch(urls.teams, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTeams()),
      })
        .then(() => {})
        .catch((err) => console.warn('[webhooks] teams delivery failed:', err)),
    )
  }
  await Promise.allSettled(sends)
}

export async function sendAuditFailureWebhooks(
  webhookUrls: WebhookUrls,
  payload: AuditFailurePayload,
): Promise<void> {
  await dispatch(webhookUrls, () => buildSlackPayload(payload), () => buildTeamsPayload(payload))
}

interface SchedulePublishedPayload {
  startDate: string
  endDate: string
  facilityName: string
}

function buildScheduleSlackPayload(p: SchedulePublishedPayload): object {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📅 New Shift Schedule Published' },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Shifts for *${p.startDate} – ${p.endDate}* are live.\n_${p.facilityName}_`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Schedule' },
            url: `${appUrl}/shifts`,
          },
        ],
      },
    ],
  }
}

function buildScheduleTeamsPayload(p: SchedulePublishedPayload): object {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    summary: 'New Shift Schedule Published',
    themeColor: '45E0CE',
    title: '📅 New Shift Schedule Published',
    sections: [
      {
        facts: [
          { name: 'Facility', value: p.facilityName },
          { name: 'Range', value: `${p.startDate} – ${p.endDate}` },
        ],
      },
    ],
    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'View Schedule',
        targets: [{ os: 'default', uri: `${appUrl}/shifts` }],
      },
    ],
  }
}

export async function sendSchedulePublishedWebhooks(
  webhookUrls: WebhookUrls,
  payload: SchedulePublishedPayload,
): Promise<void> {
  await dispatch(webhookUrls, () => buildScheduleSlackPayload(payload), () => buildScheduleTeamsPayload(payload))
}

// ─── Chemistry out-of-range / closure ────────────────────────────────────────

export interface ChemistryAlertPayload {
  facilityName: string
  waterBodyName: string
  status: 'out_of_range' | 'closure_required' | 'cleared'
  /** e.g. ["pH 8.2 above 7.8", "Free chlorine 0.6 below 1.0"] */
  breachLines: string[]
  testedBy: string
  testedAt: string
}

const CHEM_TITLE: Record<ChemistryAlertPayload['status'], string> = {
  closure_required: '🚨 CLOSURE REQUIRED — water chemistry',
  out_of_range: '⚠️ Water chemistry out of range',
  cleared: '✅ Water chemistry back in range',
}

export async function sendChemistryWebhooks(
  webhookUrls: WebhookUrls,
  p: ChemistryAlertPayload,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const title = CHEM_TITLE[p.status]
  const detail = p.breachLines.length > 0 ? p.breachLines.map((l) => `• ${l}`).join('\n') : 'All parameters within range'

  await dispatch(
    webhookUrls,
    () => ({
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: title } },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${p.waterBodyName}* · tested by ${p.testedBy} at ${p.testedAt}\n_${p.facilityName}_`,
          },
        },
        { type: 'section', text: { type: 'mrkdwn', text: detail } },
        {
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'Open chemistry log' },
            url: `${appUrl}/chemistry`,
            ...(p.status === 'closure_required' ? { style: 'danger' } : {}),
          }],
        },
      ],
    }),
    () => ({
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: title,
      themeColor: p.status === 'closure_required' ? 'FF4444' : p.status === 'cleared' ? '45E0CE' : 'FFB020',
      title,
      sections: [{
        facts: [
          { name: 'Facility', value: p.facilityName },
          { name: 'Water body', value: p.waterBodyName },
          { name: 'Tested by', value: p.testedBy },
          { name: 'Detail', value: p.breachLines.join('; ') || 'In range' },
        ],
      }],
      potentialAction: [{
        '@type': 'OpenUri', name: 'Open chemistry log',
        targets: [{ os: 'default', uri: `${appUrl}/chemistry` }],
      }],
    }),
  )
}

// ─── Incident filed ──────────────────────────────────────────────────────────

export interface IncidentAlertPayload {
  facilityName: string
  kindLabel: string
  severity: string
  waterBodyName: string
  reportedBy: string
  occurredAt: string
  emsCalled: boolean
  incidentId: string
}

export async function sendIncidentWebhooks(
  webhookUrls: WebhookUrls,
  p: IncidentAlertPayload,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const title = `${p.severity === 'severe' ? '🚨' : '📋'} Incident filed — ${p.kindLabel}`

  await dispatch(
    webhookUrls,
    () => ({
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: title } },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${p.waterBodyName}* · ${p.occurredAt}\nSeverity: *${p.severity}*${p.emsCalled ? ' · *EMS called*' : ''}\nFiled by ${p.reportedBy} · _${p.facilityName}_`,
          },
        },
        {
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'View incident' },
            url: `${appUrl}/incidents/${p.incidentId}`,
            ...(p.severity === 'severe' ? { style: 'danger' } : {}),
          }],
        },
      ],
    }),
    () => ({
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: title,
      themeColor: p.severity === 'severe' ? 'FF4444' : 'FFB020',
      title,
      sections: [{
        facts: [
          { name: 'Facility', value: p.facilityName },
          { name: 'Type', value: p.kindLabel },
          { name: 'Severity', value: p.severity },
          { name: 'Location', value: p.waterBodyName },
          { name: 'EMS called', value: p.emsCalled ? 'Yes' : 'No' },
          { name: 'Filed by', value: p.reportedBy },
        ],
      }],
      potentialAction: [{
        '@type': 'OpenUri', name: 'View incident',
        targets: [{ os: 'default', uri: `${appUrl}/incidents/${p.incidentId}` }],
      }],
    }),
  )
}
