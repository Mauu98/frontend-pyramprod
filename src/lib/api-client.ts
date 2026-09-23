import axios from 'axios'

// Calls below always use paths like '/auth/login', '/items' — never '/api/...' — so the
// '/api' prefix has to live here. Locally VITE_API_URL is unset, giving '/api' (matches the
// Vite dev proxy rule). On Vercel VITE_API_URL is the bare backend origin, so it becomes
// '<origin>/api'.
export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
})

apiClient.interceptors.request.use((config) => {
  const isAuthEndpoint = config.url?.includes('/auth/')
  const token = localStorage.getItem('pyramid_token')
  if (token && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('pyramid_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
