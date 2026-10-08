import type { RoleCode, User } from '@/types/auth';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(
    JSON.parse(localStorage.getItem('user') || 'null')
  );

  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed<RoleCode>(() => user.value?.roleCode || 'EMPLOYEE');
  const userName = computed(() => user.value?.fullName || 'User');
  const userInitial = computed(() => userName.value.charAt(0).toUpperCase());

  function hasRole(...roles: RoleCode[]): boolean {
    return roles.includes(userRole.value);
  }

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /** Dipanggil setelah password diganti — hapus flag wajib ganti */
  function clearMustChangePassword() {
    if (user.value) {
      user.value = { ...user.value, mustChangePassword: false };
      localStorage.setItem('user', JSON.stringify(user.value));
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    userRole,
    userName,
    userInitial,
    hasRole,
    setAuth,
    clearMustChangePassword,
    logout,
  };
});