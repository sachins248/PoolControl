export const metadata = { title: 'AI & Data Practices — PoolControl.ai' }

export default function AIPage() {
  return (
    <>
      <p className="dp-legal-eyebrow">Legal</p>
      <h1>AI &amp; Data Practices</h1>
      <p className="dp-legal-updated">Last updated: August 2026</p>

      <div className="dp-legal-callout">
        <p>
          <strong>Your data does not train AI models.</strong> Audit context processed by our AI
          features is used to generate a response for your facility, and for nothing else.
        </p>
      </div>

      <h2>1. Where AI Is Used</h2>
      <ul>
        <li><strong>Coach PC</strong> — real-time observation guidance while a supervisor conducts an audit.</li>
        <li><strong>Coaching points</strong> — talking points generated from a completed audit&apos;s failed criteria.</li>
        <li><strong>Training plans</strong> — in-service lesson plans generated from the facility&apos;s recent audit patterns.</li>
      </ul>

      <h2>2. What the Model Sees</h2>
      <p>
        AI requests include only the minimum context needed for the feature: the audit criterion being
        evaluated, the lifeguard&apos;s first name and recent failure patterns at your facility, the
        zone, and the certifying body&apos;s standards. Requests are scoped to a single facility —
        the model never receives another client&apos;s data in your requests.
      </p>

      <h2>3. No Training on Client Data</h2>
      <p>
        AI processing is performed via the Anthropic API. Under its commercial terms, API inputs and
        outputs are <strong>not used to train Anthropic&apos;s models</strong>. PoolControl.ai does
        not train, fine-tune, or build models on client data, and does not permit any subprocessor to
        do so.
      </p>

      <h2>4. Human in the Loop</h2>
      <p>
        AI output in the Service is advisory. Audit scores are determined by the supervisor&apos;s
        own pass/fail judgments — never by the model. Generated coaching points are editable by the
        supervisor before delivery, and generated training plans are reviewed by management before
        use.
      </p>

      <h2>5. No Cross-Client Exposure</h2>
      <p>
        Facility isolation applies to AI features exactly as it does to the rest of the Service: the
        context for your requests is drawn only from your facility&apos;s records, and generated
        output is stored only in your facility&apos;s account.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions about AI practices: <strong>poolcontrolnate@gmail.com</strong>
      </p>

      <div className="dp-legal-foot">
        <span>PoolControl.ai</span>
        <span>Aquatics Performance Intelligence</span>
      </div>
    </>
  )
}
