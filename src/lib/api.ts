// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mudhrobackend-e4hgcza0bsf4fbcu.centralindia-01.azurewebsites.net';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('accessToken');

    const headers: Record<string, string> = {};

    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else if (options.headers) {
      Object.assign(headers, options.headers);
    }

    const isFormData = options.body instanceof FormData;

    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      if (!response.ok) {
        // Create error object with response data for better error handling
        const error = new Error(data.message || data.error || `Request failed with status ${response.status}`) as any;
        error.response = {
          status: response.status,
          data: data,
        };
        error.status = response.status;
        error.expired = data.expired || false;
        
        // Handle validation errors
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => err.msg || err.message).join(', ');
          error.message = errorMessages || error.message;
        }
        
        throw error;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error or request failed');
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const requestBody = isFormData
      ? body
      : body !== undefined
        ? JSON.stringify(body)
        : undefined;

    return this.request<T>(endpoint, {
      method: 'POST',
      body: requestBody,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const requestBody = isFormData
      ? body
      : body !== undefined
        ? JSON.stringify(body)
        : undefined;

    return this.request<T>(endpoint, {
      method: 'PUT',
      body: requestBody,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

