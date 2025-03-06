/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse } from '@/types';

// Default API config
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Debug config
const DEBUG = true;

// Helper for logging in debug mode
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[API] ${message}`, data || '');
  }
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        log('Adding auth token to request');
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    log('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    log('Response received:', {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  async (error: AxiosError) => {
    if (typeof window !== 'undefined') {
      const originalRequest = error.config;

      if (!originalRequest) {
        log('No original request found in error', error);
        return Promise.reject(error);
      }

      // If error is 401 and we haven't tried to refresh the token yet
      if (error.response?.status === 401 && !(originalRequest as any)._retry) {
        log('Unauthorized error, attempting token refresh');
        (originalRequest as any)._retry = true;

        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            log('No refresh token found, redirecting to login');
            window.location.href = '/login';
            return Promise.reject(error);
          }

          // Call refresh token endpoint
          log('Refreshing token...');
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken: `Bearer ${refreshToken}`,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          log('Token refreshed successfully');

          // Update tokens in localStorage
          const cleanAccessToken = accessToken.replace('Bearer ', '');
          const cleanRefreshToken = newRefreshToken.replace('Bearer ', '');

          localStorage.setItem('auth_token', cleanAccessToken);
          localStorage.setItem('refresh_token', cleanRefreshToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${cleanAccessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          log('Token refresh failed', refreshError);
          // Refresh token failed, redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    log('Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Generic API calls with improved error handling
const apiService = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    log(`GET request to ${url}`);
    try {
      const response: AxiosResponse<ApiResponse<T>> = await api.get(url, config);
      return response.data;
    } catch (error) {
      log(`GET request to ${url} failed`, error);
      // Handle 404s specially for GET requests to return empty data instead of throwing
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        if (url.includes('/kid')) {
          // For kid endpoints, return empty array on 404
          return { success: true, message: 'No data found', data: [] as unknown as T };
        }
      }
      throw error;
    }
  },

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    log(`POST request to ${url}`, data);
    try {
      const response: AxiosResponse<ApiResponse<T>> = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      log(`POST request to ${url} failed`, error);
      throw error;
    }
  },

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    log(`PUT request to ${url}`, data);
    try {
      const response: AxiosResponse<ApiResponse<T>> = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      log(`PUT request to ${url} failed`, error);
      throw error;
    }
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    log(`DELETE request to ${url}`);
    try {
      const response: AxiosResponse<ApiResponse<T>> = await api.delete(url, config);
      return response.data;
    } catch (error) {
      log(`DELETE request to ${url} failed`, error);
      throw error;
    }
  }
};

// Domain-specific API calls
export const authApi = {
  login: async (email: string, password: string) => {
    log('Login attempt', { email });
    return apiService.post('/auth/signin', { email, password });
  },

  register: async (name: string, email: string, password: string) => {
    log('Register attempt', { name, email });
    return apiService.post('/auth/signup', { name, email, password });
  },

  refreshToken: async (refreshToken: string) => {
    log('Token refresh attempt');
    return apiService.post('/auth/refresh', { refreshToken });
  },

  getUserProfile: async () => {
    log('Getting user profile');
    return apiService.get('/user/profile');
  }
};

// Updating the kidsApi section of your api.ts file
export const kidsApi = {
  getKids: async () => {
    try {
      log('Getting kids list');
      const response = await apiService.get('/kid');
      // Ensure we always return an array even if the backend returns null or undefined
      if (!response.data && response.success !== false) {
        return { ...response, data: [] };
      }
      return response;
    } catch (error) {
      log('Error fetching kids list:', error);
      // If there's an error, return an empty array instead of throwing
      // This will help prevent infinite loops in the frontend
      return { success: true, message: 'No kids found', data: [] };
    }
  },

  getKidById: async (id: string) => {
    log(`Getting kid details: ${id}`);
    return apiService.get(`/kid/${id}`);
  },

  createKid: async (data: { name: string, rfid_token?: string[], monthly_spending_limit?: number }) => {
    log('Creating kid', data);
    return apiService.post('/kid', data);
  },

  updateKid: async (id: string, data: { name?: string, rfid_token?: string[], monthly_spending_limit?: number, is_active?: boolean }) => {
    log(`Updating kid: ${id}`, data);
    return apiService.put(`/kid/${id}`, data);
  },

  deleteKid: async (id: string) => {
    log(`Deleting kid: ${id}`);
    return apiService.delete(`/kid/${id}`);
  }
};

export const ordersApi = {
  getParentOrders: async (page = 1, limit = 10, startDate?: string, endDate?: string) => {
    let url = `/order/parent?page=${page}&limit=${limit}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    log('Getting parent orders', { page, limit, startDate, endDate });
    return apiService.get(url);
  },

  getKidOrders: async (kidId: string, page = 1, limit = 10, startDate?: string, endDate?: string) => {
    let url = `/order/kid/${kidId}?page=${page}&limit=${limit}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    log(`Getting kid orders: ${kidId}`, { page, limit, startDate, endDate });
    return apiService.get(url);
  },

  getOrderById: async (id: string) => {
    log(`Getting order details: ${id}`);
    return apiService.get(`/order/${id}`);
  },

  createOrder: async (data: { kid_id: string, items: { product_id: string, quantity: number }[] }) => {
    log('Creating order', data);
    return apiService.post('/order', data);
  }
};

export const productsApi = {
  getProducts: async () => {
    log('Getting products list');
    return apiService.get('/product');
  },

  getProductById: async (id: string) => {
    log(`Getting product details: ${id}`);
    return apiService.get(`/product/${id}`);
  },

  createProduct: async (data: {
    name: string,
    description?: string,
    ingredients?: string,
    barcode?: string,
    image_url?: string,
    price: number,
    product_group_id?: string,
    is_active?: boolean
  }) => {
    log('Creating product', data);
    return apiService.post('/product', data);
  },

  updateProduct: async (id: string, data: {
    name?: string,
    description?: string,
    ingredients?: string,
    barcode?: string,
    image_url?: string,
    price?: number,
    product_group_id?: string,
    is_active?: boolean
  }) => {
    log(`Updating product: ${id}`, data);
    return apiService.put(`/product/${id}`, data);
  },

  deleteProduct: async (id: string) => {
    log(`Deleting product: ${id}`);
    return apiService.delete(`/product/${id}`);
  },

  getProductsByGroup: async (groupId: string) => {
    log(`Getting products by group: ${groupId}`);
    return apiService.get(`/product/group/${groupId}`);
  }
};

export const productGroupsApi = {
  getProductGroups: async () => {
    log('Getting product groups');
    return apiService.get('/product-group');
  },

  getProductGroupById: async (id: string) => {
    log(`Getting product group details: ${id}`);
    return apiService.get(`/product-group/${id}`);
  },

  createProductGroup: async (data: { name: string, description?: string, is_active?: boolean }) => {
    log('Creating product group', data);
    return apiService.post('/product-group', data);
  },

  updateProductGroup: async (id: string, data: { name?: string, description?: string, is_active?: boolean }) => {
    log(`Updating product group: ${id}`, data);
    return apiService.put(`/product-group/${id}`, data);
  },

  deleteProductGroup: async (id: string) => {
    log(`Deleting product group: ${id}`);
    return apiService.delete(`/product-group/${id}`);
  }
};

export const discountsApi = {
  getDiscounts: async () => {
    log('Getting discounts');
    return apiService.get('/discount');
  },

  getActiveDiscounts: async () => {
    log('Getting active discounts');
    return apiService.get('/discount/active');
  },

  getDiscountById: async (id: string) => {
    log(`Getting discount details: ${id}`);
    return apiService.get(`/discount/${id}`);
  },

  createDiscount: async (data: Omit<import('@/types').Discount, 'id' | 'created_at' | 'updated_at'>) => {
    log('Creating discount', data);
    return apiService.post('/discount', data);
  },

  updateDiscount: async (id: string, data: Partial<Omit<import('@/types').Discount, 'id' | 'created_at' | 'updated_at'>>) => {
    log(`Updating discount: ${id}`, data);
    return apiService.put(`/discount/${id}`, data);
  },

  deleteDiscount: async (id: string) => {
    log(`Deleting discount: ${id}`);
    return apiService.delete(`/discount/${id}`);
  },

  getDiscountsByTarget: async (targetType: string, targetId: string) => {
    log(`Getting discounts by target: ${targetType}/${targetId}`);
    return apiService.get(`/discount/target/${targetType}/${targetId}`);
  }
};

export default apiService;