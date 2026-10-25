const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

if (!configuredBaseUrl) {
  console.warn('VITE_API_BASE_URL is not set; API requests will use the current origin.')
}

/** Backend base URL without trailing slash, e.g. `http://localhost:8000`. */
export const API_BASE_URL = (configuredBaseUrl ?? '').replace(/\/+$/, '')
