// Authentication utilities - Integrated with backend API
import { apiClient } from './api';

export interface User {
  id: number;
  email: string;
  fullName: string;
  country?: string;
  mobileNumber?: string;
  planId?: string;
  logo?: string;
  gstin?: string;
  pan?: string;
  currency?: string;
  emailVerified: boolean;
  isActive: boolean;
  isTwoFactorEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface SignUpPayload {
  fullName: string;
  email: string;
  password: string;
  country?: string;
  mobileNumber?: string;
  gstin?: string;
  pan?: string;
  currency?: string;
  logoFile?: File | null;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

const AUTH_KEY = 'mudhro_auth_user';
const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const authService = {
  async signUp(payload: SignUpPayload): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const formData = new FormData();
      formData.append('fullName', payload.fullName);
      formData.append('email', payload.email);
      formData.append('password', payload.password);

      if (payload.country) {
        formData.append('country', payload.country);
      }
      if (payload.mobileNumber) {
        formData.append('mobileNumber', payload.mobileNumber);
      }
      if (payload.gstin) {
        formData.append('gstin', payload.gstin);
      }
      if (payload.pan) {
        formData.append('pan', payload.pan);
      }
      if (payload.currency) {
        formData.append('currency', payload.currency);
      }
      if (payload.logoFile) {
        formData.append('logo', payload.logoFile);
      }

      const response = await apiClient.post<AuthResponse>('/api/auth/register', formData);

      if (response.success && response.user) {
        // Store user data
        localStorage.setItem(AUTH_KEY, JSON.stringify(response.user));
        return { success: true, user: response.user };
      }

      return { success: false, error: response.message || 'Registration failed' };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { 
        success: false, 
        error: error.message || 'Registration failed. Please try again.' 
      };
    }
  },

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });

      if (response.success && response.user && response.accessToken) {
        // Store tokens and user data
        localStorage.setItem(TOKEN_KEY, response.accessToken);
        if (response.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    }
        localStorage.setItem(AUTH_KEY, JSON.stringify(response.user));
        
        return { success: true, user: response.user };
      }

      return { success: false, error: response.message || 'Login failed' };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: error.message || 'Invalid email or password' 
      };
    }
  },

  async signOut(): Promise<void> {
    try {
      // Call backend logout endpoint to update session
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          await apiClient.post('/api/auth/logout');
        } catch (error) {
          // Continue with local cleanup even if backend call fails
          console.warn('Logout API call failed, continuing with local cleanup:', error);
        }
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Always clear local storage
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem(AUTH_KEY);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getAccessToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = authService.getCurrentUser();
    return !!(token && user);
  },

  async updateProfile(updateData: {
    fullName?: string;
    email?: string;
    country?: string;
    mobileNumber?: string;
    gstin?: string;
    pan?: string;
    currency?: string;
    logoFile?: File | null;
    logo?: string | null; // For explicitly removing logo (pass null)
  }): Promise<User> {
    try {
      const formData = new FormData();
      
      if (updateData.fullName) formData.append('fullName', updateData.fullName);
      if (updateData.email) formData.append('email', updateData.email);
      if (updateData.country !== undefined) formData.append('country', updateData.country || '');
      if (updateData.mobileNumber !== undefined) formData.append('mobileNumber', updateData.mobileNumber || '');
      if (updateData.gstin !== undefined) formData.append('gstin', updateData.gstin || '');
      if (updateData.pan !== undefined) formData.append('pan', updateData.pan || '');
      if (updateData.currency) formData.append('currency', updateData.currency);
      if (updateData.logoFile) {
        formData.append('logo', updateData.logoFile);
      } else if (updateData.logo === null) {
        // Explicitly remove logo
        formData.append('logo', 'null');
      }

      const response = await apiClient.put<{ success: boolean; message?: string; user?: User }>('/api/user/profile', formData);

      if (response.success && response.user) {
        // Update stored user data
        localStorage.setItem(AUTH_KEY, JSON.stringify(response.user));
        return response.user;
      }

      throw new Error(response.message || 'Failed to update profile');
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.message || 'Failed to update profile. Please try again.');
    }
  },
};
