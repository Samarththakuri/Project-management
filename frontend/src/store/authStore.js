import { create } from 'zustand'
import { getCurrentUser } from '../api/auth.api'

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  // True until the first setUser/clearUser resolves, so consumers can tell
  // "not fetched yet" apart from "definitely signed out".
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),
  /** Re-read the authenticated user from the API — the source of truth for
   *  profile fields like isEmailVerified. Resolves to the user, or null. */
  refreshUser: async () => {
    try {
      const res = await getCurrentUser()
      const user = res.data.data
      set({ user, isAuthenticated: !!user, isLoading: false })
      return user
    } catch {
      set({ isLoading: false })
      return null
    }
  },
}))

export default useAuthStore
