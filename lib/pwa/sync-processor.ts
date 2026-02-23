import { getPendingMutations, removeMutation, updateMutationStatus } from './sync-queue'
import { auth } from '@/lib/firebase/client'

const MAX_RETRIES = 3

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  const mutations = await getPendingMutations()
  let synced = 0
  let failed = 0

  for (const mutation of mutations) {
    try {
      const user = auth.currentUser
      if (!user) {
        failed++
        continue
      }
      const token = await user.getIdToken()

      const response = await fetch(mutation.endpoint, {
        method: mutation.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: mutation.body,
      })

      if (response.ok) {
        await removeMutation(mutation.id)
        synced++
      } else if (mutation.retryCount >= MAX_RETRIES) {
        await updateMutationStatus(mutation.id, 'failed')
        failed++
      } else {
        await updateMutationStatus(mutation.id, 'pending', mutation.retryCount + 1)
        failed++
      }
    } catch {
      if (mutation.retryCount >= MAX_RETRIES) {
        await updateMutationStatus(mutation.id, 'failed')
      }
      failed++
    }
  }

  return { synced, failed }
}
