import { defineStore } from 'pinia'
import { userApi } from '../api'

export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: null,
    isLoggedIn: false
  }),

  getters: {
    userId: (state) => state.currentUser?.id || null,
    blockedUserIds: (state) => state.currentUser?.blockedUsers || []
  },

  actions: {
    async login(username, phone) {
      try {
        const result = await userApi.login({ username, phone })
        if (result.success) {
          if (!result.user.blockedUsers) {
            result.user.blockedUsers = []
          }
          this.currentUser = result.user
          this.isLoggedIn = true
          localStorage.setItem('userId', result.user.id)
          localStorage.setItem('userData', JSON.stringify(result.user))
        }
        return result
      } catch (e) {
        throw e
      }
    },

    restoreSession() {
      const userData = localStorage.getItem('userData')
      if (userData) {
        try {
          const parsed = JSON.parse(userData)
          if (!parsed.blockedUsers) {
            parsed.blockedUsers = []
          }
          this.currentUser = parsed
          this.isLoggedIn = true
        } catch (e) {
          this.logout()
        }
      }
    },

    async refreshUser() {
      if (this.userId) {
        try {
          const user = await userApi.getUser(this.userId)
          if (!user.blockedUsers) {
            user.blockedUsers = []
          }
          this.currentUser = user
          localStorage.setItem('userData', JSON.stringify(user))
        } catch (e) {
          console.error('刷新用户信息失败', e)
        }
      }
    },

    async updateUser(data) {
      if (this.userId) {
        const result = await userApi.updateUser(this.userId, data)
        if (result.success) {
          if (!result.user.blockedUsers) {
            result.user.blockedUsers = []
          }
          this.currentUser = result.user
          localStorage.setItem('userData', JSON.stringify(result.user))
        }
        return result
      }
    },

    isBlocked(userId) {
      return this.blockedUserIds.includes(userId)
    },

    async blockUser(targetUserId) {
      if (!this.userId) return null
      const result = await userApi.blockUser(this.userId, targetUserId)
      if (result.success) {
        if (!result.user.blockedUsers) {
          result.user.blockedUsers = []
        }
        this.currentUser = result.user
        localStorage.setItem('userData', JSON.stringify(result.user))
      }
      return result
    },

    async unblockUser(targetUserId) {
      if (!this.userId) return null
      const result = await userApi.unblockUser(this.userId, targetUserId)
      if (result.success) {
        if (!result.user.blockedUsers) {
          result.user.blockedUsers = []
        }
        this.currentUser = result.user
        localStorage.setItem('userData', JSON.stringify(result.user))
      }
      return result
    },

    logout() {
      this.currentUser = null
      this.isLoggedIn = false
      localStorage.removeItem('userId')
      localStorage.removeItem('userData')
    }
  }
})
