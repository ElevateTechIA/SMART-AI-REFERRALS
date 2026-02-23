import { openDB } from 'idb'

export interface QueuedMutation {
  id: string
  endpoint: string
  method: 'POST' | 'PUT' | 'DELETE'
  body: string | null
  createdAt: number
  retryCount: number
  status: 'pending' | 'syncing' | 'failed'
}

const DB_NAME = 'smart-referrals-sync'
const DB_VERSION = 1
const STORE_NAME = 'mutations'

function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    },
  })
}

export async function queueMutation(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: unknown
): Promise<string> {
  const db = await getDb()
  const id = crypto.randomUUID()
  await db.put(STORE_NAME, {
    id,
    endpoint,
    method,
    body: body ? JSON.stringify(body) : null,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'pending',
  } satisfies QueuedMutation)
  return id
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const db = await getDb()
  const all: QueuedMutation[] = await db.getAll(STORE_NAME)
  return all.filter((m) => m.status === 'pending')
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}

export async function updateMutationStatus(
  id: string,
  status: QueuedMutation['status'],
  retryCount?: number
): Promise<void> {
  const db = await getDb()
  const mutation: QueuedMutation | undefined = await db.get(STORE_NAME, id)
  if (mutation) {
    mutation.status = status
    if (retryCount !== undefined) mutation.retryCount = retryCount
    await db.put(STORE_NAME, mutation)
  }
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingMutations()
  return pending.length
}
