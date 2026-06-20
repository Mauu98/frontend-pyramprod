import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LoginResponse } from '@/types/api.types'

interface AuthState {
  token: string | null
  userId: number | null
  companyId: number | null
  role: string | null
  login: (response: LoginResponse) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      userId: null,
      companyId: null,
      role: null,

      login: (response) => {
        localStorage.setItem('pyramid_token', response.token)
        set({
          token: response.token,
          userId: response.userId,
          companyId: response.companyId,
          role: response.role,
        })
      },

      logout: () => {
        localStorage.removeItem('pyramid_token')
        set({ token: null, userId: null, companyId: null, role: null })
      },

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'pyramid_auth',
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        companyId: state.companyId,
        role: state.role,
      }),
    },
  ),
)
