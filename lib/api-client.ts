import { auth } from '@/lib/firebase/client'

/**
 * API client that automatically includes Firebase ID token in requests
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; ok: boolean; status: number; error?: string }> {
  try {
    // Get current user's ID token
    const user = auth.currentUser
    if (!user) {
      return {
        data: null as T,
        ok: false,
        status: 401,
        error: 'Not authenticated',
      }
    }

    const token = await user.getIdToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        data,
        ok: false,
        status: response.status,
        error: data.error || 'Request failed',
      }
    }

    return {
      data,
      ok: true,
      status: response.status,
    }
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
 * Helper for GET requests
 */
export function apiGet<T = unknown>(endpoint: string) {
  return apiClient<T>(endpoint, { method: 'GET' })
}

/**
 * Helper for POST requests
 */
export function apiPost<T = unknown>(endpoint: string, body: unknown) {
  return apiClient<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Helper for PUT requests
 */
export function apiPut<T = unknown>(endpoint: string, body: unknown) {
  return apiClient<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/**
 * Helper for DELETE requests
 */
export function apiDelete<T = unknown>(endpoint: string) {
  return apiClient<T>(endpoint, { method: 'DELETE' })
}
