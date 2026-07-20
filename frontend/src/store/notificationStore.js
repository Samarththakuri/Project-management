import { create } from 'zustand'

const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }),
  markOneRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n,
      )
      return { notifications, unreadCount: notifications.filter((n) => !n.isRead).length }
    }),
  clearAll: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
  /** Drop everything — used on sign out so the next user starts clean. */
  reset: () => set({ notifications: [], unreadCount: 0 }),
}))

export default useNotificationStore
