import { apiRequest, setAuthToken, removeAuthToken, getAuthToken } from './apiClient';
import { User, AuthResponse } from '../types';

const USER_STORAGE_KEY = 'snaproom_current_user';

export const authService = {
  async register(email: string, displayName: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, displayName, password }),
        skipAuth: true,
    });
    if (response.token) {
      setAuthToken(response.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      }
    return response;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
    });
    if (response.token) {
      setAuthToken(response.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      }
    return response;
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },

  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  logout(): void {
    removeAuthToken();
  },

};
