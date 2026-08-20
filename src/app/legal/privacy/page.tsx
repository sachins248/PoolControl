export const metadata = { title: 'Privacy Policy — PoolControl.ai' }

export default function PrivacyPage() {
  return (
    <>
      <p className="dp-legal-eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p className="dp-legal-updated">Last updated: August 2026</p>

      <h2>1. What We Collect</h2>
      <p>
        The Service stores information entered by each facility&apos;s authorized personnel: staff
        names and contact details, certification records, audit results and comments, remediation
        records, and facility configuration. Standard technical logs (authentication events, error
        reports) are collected to operate and secure the Service.
      </p>

      <h2>2. Facility Isolation</h2>
      <p>
        Every record belongs to exactly one facility. Row-level security policies enforced at the
        database layer ensure users can only access data belonging to their own facility. No
        facility&apos;s data is visible to, aggregated with, or exposed to any other facility.
      </p>

      <h2>3. How Data Is Used</h2>
      <ul>
        <li>To provide the Service to the facility that entered the data.</li>
        <li>To generate the facility&apos;s own analytics, schedules, and reports.</li>
        <li>To send notifications the facility has explicitly configured (e.g. Slack or Teams alerts).</li>
      </ul>
      <p>
        We do not sell client data. We do not share client data with third parties except the
        infrastructure subprocessors required to operate the Service, each bound by their own data
        protection terms.
      </p>

      <h2>4. Security Measures</h2>
      <ul>
        <li>All data encrypted in transit (TLS) and at rest.</li>
        <li>Row-level security isolating every facility&apos;s records at the database layer.</li>
        <li>Role-based access control within each facility (lifeguard / supervisor / manager).</li>
        <li>Immutable audit records — submitted audits cannot be altered, preserving evidentiary integrity.</li>
        <li>Staff accounts are created by facility administrators or via a facility-specific access code; access codes are managed and can be rotated by the facility at any time.</li>
        <li>Independent security certification (SOC 2) is on our compliance roadmap.</li>
      </ul>

      <h2>5. AI Processing</h2>
      <p>
        Certain features send audit context to an AI model to generate coaching guidance and training
        plans. Client data is <strong>not</strong> used to train AI models. See{' '}
        <a href="/legal/ai" style={{ textDecoration: 'underline' }}>AI &amp; Data Practices</a> for the
        full statement.
      </p>

      <h2>6. Retention &amp; Deletion</h2>
      <p>
        Records are retained for the life of the facility&apos;s account. Facilities may deactivate
        staff (preserving historical records for compliance purposes) and may request full account
        deletion, subject to any retention obligations that apply to the facility&apos;s own records.
      </p>

      <h2>7. Contact</h2>
      <p>
        Privacy questions: <strong>hello@poolcontrol.ai</strong>
      </p>

      <div className="dp-legal-foot">
        <span>PoolControl.ai</span>
        <span>Aquatics Performance Intelligence</span>
      </div>
    </>
  )
}
