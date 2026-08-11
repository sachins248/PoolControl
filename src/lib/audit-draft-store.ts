import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'poolcontrol-drafts'
const STORE_NAME = 'audit-drafts'
const DB_VERSION = 1
const EXPIRY_MS = 24 * 60 * 60 * 1000

export interface AuditDraft {
  supervisorId: string
  facilityId: string
  step: 2 | 3
  selectedTypeId: string
  selectedLifeguardId: string
  selectedZone: string
  criteriaResults: Array<{
    criterionId: string
    result: 'pass' | 'needs_attention' | 'fail' | null
    comment: string
  }>
  auditNotes: string
  auditId: string | null
  savedAt: number
}

function draftKey(supervisorId: string, facilityId: string) {
  return `${supervisorId}:${facilityId}`
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
      },
    })
  }
  return dbPromise
}

export async function saveDraft(draft: AuditDraft): Promise<void> {
  try {
    const db = await getDb()
    await db.put(STORE_NAME, { ...draft, savedAt: Date.now() }, draftKey(draft.supervisorId, draft.facilityId))
  } catch {}
}

export async function loadDraft(supervisorId: string, facilityId: string): Promise<AuditDraft | null> {
  try {
    const db = await getDb()
    const draft = await db.get(STORE_NAME, draftKey(supervisorId, facilityId)) as AuditDraft | undefined
    if (!draft) return null
    if (Date.now() - draft.savedAt > EXPIRY_MS) {
      await db.delete(STORE_NAME, draftKey(supervisorId, facilityId))
      return null
    }
    return draft
  } catch {
    return null
  }
}

export async function clearDraft(supervisorId: string, facilityId: string): Promise<void> {
  try {
    const db = await getDb()
    await db.delete(STORE_NAME, draftKey(supervisorId, facilityId))
  } catch {}
}
