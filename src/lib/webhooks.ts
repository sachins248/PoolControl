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

function isTeamsUrl(url: string): boolean {
  return url.includes('outlook.office.com') || url.includes('webhook.office.com') || url.includes('office365.com')
}

export async function sendAuditFailureWebhooks(
  webhookUrls: { slack?: string | null; teams?: string | null },
  payload: AuditFailurePayload,
): Promise<void> {
  const sends: Promise<void>[] = []

  if (webhookUrls.slack) {
    sends.push(
      fetch(webhookUrls.slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSlackPayload(payload)),
      }).then(() => {}).catch(() => {}),
    )
  }

  if (webhookUrls.teams) {
    sends.push(
      fetch(webhookUrls.teams, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTeamsPayload(payload)),
      }).then(() => {}).catch(() => {}),
    )
  }

  await Promise.allSettled(sends)
}
