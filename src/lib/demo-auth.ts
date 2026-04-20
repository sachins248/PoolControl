// TEMPORARY: hardcoded demo profile for UI testing — no auth required
// Replace with real supabase.auth.getUser() before production

export async function getDemoUser() {
  return {
    id: 'demo-director-id',
    facility_id: 'a1b2c3d4-0001-0001-0001-000000000001',
    role: 'director' as const,
    name: 'You (Director)',
    email: 'sxs230344@utdallas.edu',
    avatar_color: '#6366f1',
    employee_id: null,
    photo_url: null,
    hire_date: null,
    phone: null,
    created_at: new Date().toISOString(),
  }
}
