import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'smart-referrals-cache'
const DB_VERSION = 1
const STORE_NAME = 'api-cache'

interface CacheEntry {
  key: string
  data: unknown
  timestamp: number
  userId: string
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('by-user', 'userId')
      },
    })
  }
  return dbPromise
}

export async function getCachedResponse<T>(
  endpoint: string,
  userId: string
): Promise<{ data: T; timestamp: number } | null> {
  try {
    const db = await getDb()
    const cacheKey = `${userId}:${endpoint}`
    const entry = (await db.get(STORE_NAME, cacheKey)) as CacheEntry | undefined
    if (!entry) return null
    return { data: entry.data as T, timestamp: entry.timestamp }
  } catch {
    return null
  }
}

export async function setCachedResponse(
  endpoint: string,
  userId: string,
  data: unknown
): Promise<void> {
  try {
    const db = await getDb()
    const cacheKey = `${userId}:${endpoint}`
    await db.put(STORE_NAME, {
      key: cacheKey,
      data,
      timestamp: Date.now(),
      userId,
    })
  } catch {
    // Silently fail — cache is best-effort
  }
}

export async function clearUserCache(userId: string): Promise<void> {
  try {
    const db = await getDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const index = tx.store.index('by-user')
    let cursor = await index.openCursor(userId)
    while (cursor) {
      await cursor.delete()
      cursor = await cursor.continue()
    }
    await tx.done
  } catch {
    // Silently fail
  }
}
