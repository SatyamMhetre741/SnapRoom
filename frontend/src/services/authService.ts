import { apiRequest, setAuthToken, removeAuthToken, getAuthToken } from './apiClient';
import { User, AuthResponse } from '../types';

const USER_STORAGE_KEY = 'snaproom_current_user';

export const authService = {
  async register(email: string, displayName: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, displayName, password }),
        skipAuth: true,
      });
      if (response?.token) {
        setAuthToken(response.token);
        if (response.user) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
        }
      }
      return response;
    } catch {
      // Mock / Offline dev fallback
      const mockUser: User = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        email,
        displayName,
        createdAt: new Date().toISOString(),
      };
      const mockToken = 'mock-jwt-token-' + Date.now();
      setAuthToken(mockToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
      return { token: mockToken, user: mockUser };
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });
      if (response?.token) {
        setAuthToken(response.token);
        if (response.user) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
        }
      }
      return response;
    } catch {
      // Mock dev fallback if backend is offline
      const mockUser: User = {
        id: 'usr_demo_' + Math.random().toString(36).substring(2, 7),
        email,
        displayName: email.split('@')[0] || 'Event Guest',
        createdAt: new Date().toISOString(),
      };
      const mockToken = 'mock-jwt-token-' + Date.now();
      setAuthToken(mockToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
      return { token: mockToken, user: mockUser };
    }
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

  getOrCreateGuestUser(name?: string): User {
    const existing = this.getCurrentUser();
    if (existing) return existing;

    const guestUser: User = {
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      email: `guest_${Date.now()}@snaproom.local`,
      displayName: name?.trim() || `Guest ${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };
    const guestToken = 'guest-jwt-token-' + Date.now();
    setAuthToken(guestToken);
    this.setCurrentUser(guestUser);
    return guestUser;
  }
};
