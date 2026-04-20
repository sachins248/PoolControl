import { requireUser } from '@/lib/auth'
import { WelcomeClient } from './welcome-client'

export default async function WelcomePage() {
  const profile = await requireUser()
  return <WelcomeClient profile={profile} />
}
