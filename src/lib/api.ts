/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, Kid, KidSchool, Order, Product, School, SpendingReport, SchoolReport } from '@/types';

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

// Generic API calls with standardized response handling
const apiService = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    log(`GET request to ${url}`);
    try {
      const response: AxiosResponse = await api.get(url, config);
      // The response should already be in the standardized format
      return response.data;
    } catch (error) {
      log(`GET request to ${url} failed`, error);
      // Handle 404s specially for GET requests to return empty data instead of throwing
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          success: true,
          message: 'No results found',
          data: Array.isArray(error.response.data) ? [] : {}
        } as ApiResponse<T>;
      }
      throw error;
    }
  },

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    log(`POST request to ${url}`, data);
    try {
      const response: AxiosResponse = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      log(`POST request to ${url} failed`, error);
      throw error;
    }
  },

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    log(`PUT request to ${url}`, data);
    try {
      const response: AxiosResponse = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      log(`PUT request to ${url} failed`, error);
      throw error;
    }
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    log(`DELETE request to ${url}`);
    try {
      const response: AxiosResponse = await api.delete(url, config);
      return response.data;
    } catch (error) {
      log(`DELETE request to ${url} failed`, error);
      throw error;
    }
  }
};

// Helper to build query string from params
const buildQueryString = (params: Record<string, any>): string => {
  if (!params) return '';

  const queryParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${key}=${encodeURIComponent(v)}`).join('&');
      }
      return `${key}=${encodeURIComponent(value)}`;
    })
    .join('&');

  return queryParams ? `?${queryParams}` : '';
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

// Kids API
export const kidsApi = {
  getAllKids: async (params?: any) => {
    const queryString = buildQueryString(params);
    return apiService.get<{ data: Kid[] }>(`/kid/all${queryString}`);
  },
  getMyKids: async (params?: any) => {
    const queryString = buildQueryString(params);
    return apiService.get<{ data: Kid[] }>(`/kid/my${queryString}`);
  },
  getKidById: async (id: string, params?: any) => {
    const queryString = buildQueryString(params);
    return apiService.get<{ data: Kid }>(`/kid/${id}${queryString}`);
  },
  createKid: async (data: Partial<Kid>) => {
    return apiService.post<Kid>('/kid', data);
  },
  updateKid: async (id: string, data: Partial<Kid>) => {
    return apiService.put<Kid>(`/kid/${id}`, data);
  },
  deleteKid: async (id: string) => {
    return apiService.delete<void>(`/kid/${id}`);
  },
  getKidByRfid: async (rfid: string) => {
    return apiService.get<{ data: Kid }>(`/kid/rfid/${rfid}`);
  },
  addRfidToken: async (id: string, token: string) => {
    return apiService.post<Kid>(`/kid/${id}/rfid`, { token });
  },
  removeRfidToken: async (id: string, token: string) => {
    return apiService.delete<Kid>(`/kid/${id}/rfid/${token}`);
  },
  updateKidSchools: async (kidId: string, schoolIds: string[]) => {
    return apiService.put<School[]>(`/kid/${kidId}/schools`, { school_ids: schoolIds });
  },
  addKidToSchool: async (kidId: string, schoolId: string) => {
    return apiService.post<KidSchool>(`/kid/${kidId}/school/${schoolId}`);
  },
  removeKidFromSchool: async (kidId: string, schoolId: string) => {
    return apiService.delete<void>(`/kid/${kidId}/school/${schoolId}`);
  },
  getKidMonthlySpending: (kidId: string, month?: number, year?: number) =>
    apiService.get<ApiResponse<{
      kid_id: string;
      kid_name: string;
      monthly_records: Array<{
        id: string;
        kid_id: string;
        year: number;
        month: number;
        spending_amount: string;
        created_at: string;
        updated_at: string;
      }>;
      orders: Array<{
        id: string;
        date: string;
        total_amount: string;
        items_count: number;
      }>;
      spending_by_product_group: Array<{
        product_group_id: string;
        product_group_name: string;
        amount: number;
      }>;
      spending_by_product: Array<{
        product_id: string;
        product_name: string;
        amount: number;
      }>;
      total_orders: number;
      total_spent: number;
    }>>(`/kid/${kidId}/spending`, {
      params: { month, year }
    }),
  getRemainingBudget: (kidId: string) =>
    apiService.get<ApiResponse<{
      kid_id: string;
      kid_name: string;
      year: number;
      month: number;
      current_spending: number;
      spending_limit: number;
      remaining_budget: number;
      has_limit: boolean;
    }>>(`/kid/${kidId}/budget`),
};

// Orders API
export const ordersApi = {
  getOrders: async (params?: any) => {
    const queryString = buildQueryString(params);
    return apiService.get<{ data: Order[] }>(`/order${queryString}`);
  },
  getParentOrders: async (page = 1, limit = 10, startDate?: string, endDate?: string) => {
    let url = `/order/parent?page=${page}&limit=${limit}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    log('Getting parent orders', { page, limit, startDate, endDate });
    return apiService.get<{ data: Order[], total: number }>(`${url}`);
  },
  getKidOrders: async (kidId: string, page = 1, limit = 10, startDate?: string, endDate?: string) => {
    let url = `/order/kid/${kidId}?page=${page}&limit=${limit}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    log(`Getting kid orders: ${kidId}`, { page, limit, startDate, endDate });
    return apiService.get<{ data: Order[] }>(`${url}`);
  },
  getOrderById: async (id: string) => {
    log(`Getting order details: ${id}`);
    return apiService.get<{ data: Order }>(`/order/${id}`);
  },
  createOrder: async (data: { kid_id: string, items: { product_id: string, quantity: number }[] }) => {
    log('Creating order', data);
    return apiService.post<Order>('/order', data);
  }
};

// Products API
export const productsApi = {
  getProducts: async (params?: any) => {
    const queryString = buildQueryString(params);
    return apiService.get<{ data: Product[] }>(`/product${queryString}`);
  },
  getProductById: async (id: string) => {
    log(`Getting product details: ${id}`);
    return apiService.get<{ data: Product }>(`/product/${id}`);
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
    return apiService.post<Product>('/product', data);
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
    return apiService.put<Product>(`/product/${id}`, data);
  },
  deleteProduct: async (id: string) => {
    log(`Deleting product: ${id}`);
    return apiService.delete<void>(`/product/${id}`);
  },
  getProductsByGroup: async (groupId: string) => {
    log(`Getting products by group: ${groupId}`);
    return apiService.get<{ data: Product[] }>(`/product/group/${groupId}`);
  }
};

// Product Groups API
export const productGroupsApi = {
  getProductGroups: async () => {
    log('Getting product groups');
    return apiService.get<{ data: Product[] }>('/product-group');
  },
  getProductGroupById: async (id: string) => {
    log(`Getting product group details: ${id}`);
    return apiService.get<Product>(`/product-group/${id}`);
  },
  createProductGroup: async (data: { name: string, description?: string, is_active?: boolean }) => {
    log('Creating product group', data);
    return apiService.post<Product>('/product-group', data);
  },
  updateProductGroup: async (id: string, data: { name?: string, description?: string, is_active?: boolean }) => {
    log(`Updating product group: ${id}`, data);
    return apiService.put<Product>(`/product-group/${id}`, data);
  },
  deleteProductGroup: async (id: string) => {
    log(`Deleting product group: ${id}`);
    return apiService.delete<void>(`/product-group/${id}`);
  }
};

// Discounts API
export const discountsApi = {
  getDiscounts: async () => {
    log('Getting discounts');
    return apiService.get<{ discounts: import('@/types').Discount[] }>('/discount');
  },
  getActiveDiscounts: async () => {
    log('Getting active discounts');
    return apiService.get<{ discounts: import('@/types').Discount[] }>('/discount/active');
  },
  getDiscountById: async (id: string) => {
    log(`Getting discount details: ${id}`);
    return apiService.get<{ discount: import('@/types').Discount }>(`/discount/${id}`);
  },
  createDiscount: async (data: Omit<import('@/types').Discount, 'id' | 'created_at' | 'updated_at'>) => {
    log('Creating discount', data);
    return apiService.post<import('@/types').Discount>('/discount', data);
  },
  updateDiscount: async (id: string, data: Partial<Omit<import('@/types').Discount, 'id' | 'created_at' | 'updated_at'>>) => {
    log(`Updating discount: ${id}`, data);
    return apiService.put<import('@/types').Discount>(`/discount/${id}`, data);
  },
  deleteDiscount: async (id: string) => {
    log(`Deleting discount: ${id}`);
    return apiService.delete<void>(`/discount/${id}`);
  },
  getDiscountsByTarget: async (targetType: string, targetId: string) => {
    log(`Getting discounts by target: ${targetType}/${targetId}`);
    return apiService.get<{ discounts: import('@/types').Discount[] }>(`/discount/target/${targetType}/${targetId}`);
  }
};

// Schools API
export const schoolsApi = {
  getSchools: async (params?: any) => {
    const queryString = buildQueryString(params);
    return apiService.get<{ data: School[] }>(`/school${queryString}`);
  },
  getSchoolById: async (id: string) => {
    return apiService.get<{ data: School }>(`/school/${id}`);
  },
  createSchool: async (data: Partial<School>) => {
    return apiService.post<School>('/school', data);
  },
  updateSchool: async (id: string, data: Partial<School>) => {
    return apiService.put<School>(`/school/${id}`, data);
  },
  deleteSchool: async (id: string) => {
    return apiService.delete<void>(`/school/${id}`);
  },
  getSchoolKids: async (schoolId: string, params?: any) => {
    const queryString = buildQueryString(params);
    return apiService.get<{ data: Kid[] }>(`/school/${schoolId}/kids${queryString}`);
  }
};

// Pagination helper functions
export const getPaginationParams = (query: any) => {
  const page = parseInt(query.page?.toString() || '1', 10);
  const limit = parseInt(query.limit?.toString() || '10', 10);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// Add reporting API
export const reportingApi = {
  getKidSpendingHistory: (kidId: string, period: string, startDate?: string, endDate?: string) =>
    apiService.get<ApiResponse<SpendingReport>>(`/kid/${kidId}/spending`, {
      params: { period, start_date: startDate, end_date: endDate }
    }),

  getSchoolDailyReport: (schoolId: string, date?: string) =>
    apiService.get<ApiResponse<SchoolReport>>(`/school/${schoolId}/report/daily`, {
      params: { date }
    }),

  getSchoolMonthlyReport: (schoolId: string, month?: number, year?: number) =>
    apiService.get<ApiResponse<SchoolReport>>(`/school/${schoolId}/report/monthly`, {
      params: { month, year }
    }),

  getTopProducts: (schoolId: string, limit?: number, period?: string) =>
    apiService.get<ApiResponse<Array<{product_id: string, product_name: string, quantity: number}>>>
      (`/school/${schoolId}/top-products`, {
        params: { limit, period }
      }),
};

// Export all APIs
export default apiService;