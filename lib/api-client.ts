import { auth } from '@/lib/firebase/client'
import { getCachedResponse, setCachedResponse } from '@/lib/pwa/idb-cache'
import { queueMutation } from '@/lib/pwa/sync-queue'

interface ApiResult<T> {
  data: T
  ok: boolean
  status: number
  error?: string
  fromCache?: boolean
  queued?: boolean
}

/**
 * API client that automatically includes Firebase ID token in requests.
 * Enhanced with IndexedDB caching for offline support.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  try {
    const user = auth.currentUser
    if (!user) {
      return { data: null as T, ok: false, status: 401, error: 'Not authenticated' }
    }

    const token = await user.getIdToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    }

    const response = await fetch(endpoint, { ...options, headers })
    const data = await response.json()

    if (!response.ok) {
      return { data, ok: false, status: response.status, error: data.error || 'Request failed' }
    }

    return { data, ok: true, status: response.status }
  } catch (error) {
    console.error('API request failed:', error)
    return {
      data: null as T,
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Request failed',
    }
  }
}

/**
 * GET with stale-while-revalidate IndexedDB caching.
 * Returns cached data immediately if available, then updates in background.
 */
export async function apiGet<T = unknown>(endpoint: string): Promise<ApiResult<T>> {
  const userId = auth.currentUser?.uid

  // Try cache first
  if (userId) {
    const cached = await getCachedResponse<T>(endpoint, userId)
    if (cached) {
      // Return cached data immediately, refresh in background
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        apiClient<T>(endpoint, { method: 'GET' }).then((fresh) => {
          if (fresh.ok && userId) {
            setCachedResponse(endpoint, userId, fresh.data)
          }
        })
      }
      return { data: cached.data, ok: true, status: 200, fromCache: true }
    }
  }

  // No cache — try network
  const result = await apiClient<T>(endpoint, { method: 'GET' })

  // Cache successful responses
  if (result.ok && userId) {
    setCachedResponse(endpoint, userId, result.data)
  }

  return result
}

/**
 * POST with offline queueing support.
 */
export async function apiPost<T = unknown>(endpoint: string, body: unknown): Promise<ApiResult<T>> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueMutation(endpoint, 'POST', body)
    return { data: null as T, ok: true, status: 202, queued: true }
  }
  return apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(body) })
}

/**
 * PUT with offline queueing support.
 */
export async function apiPut<T = unknown>(endpoint: string, body: unknown): Promise<ApiResult<T>> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueMutation(endpoint, 'PUT', body)
    return { data: null as T, ok: true, status: 202, queued: true }
  }
  return apiClient<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) })
}

/**
 * DELETE with offline queueing support.
 */
export async function apiDelete<T = unknown>(endpoint: string): Promise<ApiResult<T>> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueMutation(endpoint, 'DELETE', null)
    return { data: null as T, ok: true, status: 202, queued: true }
  }
  return apiClient<T>(endpoint, { method: 'DELETE' })
}

/**
 * Helper for FormData uploads (images, files).
 * Does NOT work offline — requires network.
 */
export async function apiUpload<T = unknown>(
  endpoint: string,
  formData: FormData
): Promise<ApiResult<T>> {
  try {
    const user = auth.currentUser
    if (!user) {
      return { data: null as T, ok: false, status: 401, error: 'Not authenticated' }
    }

    const token = await user.getIdToken()

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      return { data, ok: false, status: response.status, error: data.error || 'Upload failed' }
    }

    return { data, ok: true, status: response.status }
  } catch (error) {
    console.error('Upload request failed:', error)
    return {
      data: null as T,
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}
