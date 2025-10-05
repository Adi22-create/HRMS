import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Set up axios defaults
axios.defaults.baseURL = API_BASE_URL;

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,

      // Set auth token in axios headers
      setToken: (token) => {
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          delete axios.defaults.headers.common['Authorization'];
        }
      },

      login: async (email, password) => {
        try {
          set({ loading: true });
          const response = await axios.post('/api/auth/login', {
            email,
            password,
          });

          const { access_token, user } = response.data;
          
          // Set token in store and axios headers
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            loading: false,
          });
          
          get().setToken(access_token);
          return { success: true };
        } catch (error) {
          set({ loading: false });
          return {
            success: false,
            error: error.response?.data?.detail || 'Login failed',
          };
        }
      },

      register: async (userData) => {
        try {
          set({ loading: true });
          await axios.post('/api/auth/register', userData);
          set({ loading: false });
          return { success: true };
        } catch (error) {
          set({ loading: false });
          return {
            success: false,
            error: error.response?.data?.detail || 'Registration failed',
          };
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        get().setToken(null);
      },

      // Initialize auth on app start
      initialize: () => {
        const { token } = get();
        if (token) {
          get().setToken(token);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth on store creation
useAuthStore.getState().initialize();

export { useAuthStore };
