import { auth } from '@/lib/firebase/client'

interface ApiResult<T> {
  data: T
  ok: boolean
  status: number
  error?: string
}

/**
 * API client that automatically includes Firebase ID token in requests.
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

    const response = await fetch(endpoint, { ...options, headers, cache: 'no-store' })
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

/** GET - always fetches fresh data from server. */
export async function apiGet<T = unknown>(endpoint: string): Promise<ApiResult<T>> {
  return apiClient<T>(endpoint, { method: 'GET' })
}

/** POST */
export async function apiPost<T = unknown>(endpoint: string, body: unknown): Promise<ApiResult<T>> {
  return apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(body) })
}

/** PUT */
export async function apiPut<T = unknown>(endpoint: string, body: unknown): Promise<ApiResult<T>> {
  return apiClient<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) })
}

/** DELETE */
export async function apiDelete<T = unknown>(endpoint: string): Promise<ApiResult<T>> {
  return apiClient<T>(endpoint, { method: 'DELETE' })
}

/**
 * Helper for FormData uploads (images, files).
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
