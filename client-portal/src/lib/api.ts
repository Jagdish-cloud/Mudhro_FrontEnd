import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mudhrobackend-e4hgcza0bsf4fbcu.centralindia-01.azurewebsites.net';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('client_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 || error.response?.status === 401) {
      // Token expired or invalid
      sessionStorage.removeItem('client_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
