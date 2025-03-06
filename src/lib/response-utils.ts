import { ApiResponse } from '@/types';

/**
 * Helper function to extract data from the standardized API response
 * Handles various data structures returned by the API
 *
 * @param response - The standardized API response
 * @returns The data from the response, properly extracted
 */
export function extractResponseData<T>(response: ApiResponse<any>): T {
    // If response doesn't have data property, return the response itself
    if (!response.hasOwnProperty('data')) {
      return response as unknown as T;
    }

    // Handle common response data patterns
    const data = response.data;

    // Case: If data is null or undefined, return empty array or object based on expected type
    if (data === null || data === undefined) {
      // Try to determine if we expect an array or object
      const emptyResult = Array.isArray(data) || typeof data === 'object' ? {} : [];
      return emptyResult as unknown as T;
    }

    // Case: If data is already the expected type
    if (!hasNestedEntityData(data)) {
      return data as T;
    }

    // Try to find the main entity in the response
    // Common patterns like {kids: []}, {orders: []}, etc.
    const entityKey = findMainEntityKey(data);
    if (entityKey) {
      return data[entityKey] as T;
    }

    // Fallback to returning the data as is
    return data as T;
  }

  /**
   * Check if the data object has nested entity data
   * Example: { kids: [] } or { orders: { items: [] } }
   */
  function hasNestedEntityData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;

    // Check for common entity patterns
    const entityKeys = ['kids', 'orders', 'products', 'product_groups', 'discounts', 'schools', 'users', 'items'];
    return entityKeys.some(key => data.hasOwnProperty(key) && (Array.isArray(data[key]) || typeof data[key] === 'object'));
  }

  /**
   * Find the main entity key in a response object
   * Example: In { kids: [] }, 'kids' is the entity key
   */
  function findMainEntityKey(data: any): string | null {
    if (!data || typeof data !== 'object') return null;

    // Common entity keys in our API responses
    const entityKeys = ['kids', 'orders', 'products', 'product_groups', 'discounts', 'schools', 'users', 'items'];

    // Find the first key that exists in the data
    for (const key of entityKeys) {
      if (data.hasOwnProperty(key)) {
        return key;
      }
    }

    // If no common keys found, look for any array property
    const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
    if (arrayKey) {
      return arrayKey;
    }

    return null;
  }

  /**
   * Extract pagination information from a standardized API response
   */
  export function extractPaginationData(response: ApiResponse<any>) {
    return {
      page: response.page || 1,
      limit: response.limit || 10,
      totalPages: response.totalPages || 1,
      totalItems: response.totalItems || 0,
      hasNextPage: response.hasNextPage || false,
      hasPrevPage: response.hasPrevPage || false
    };
  }

  /**
   * Handle errors from API responses in a standardized way
   */
  export function handleApiError(error: any): { message: string; status?: number } {
    // If the error is from axios
    if (error.response) {
      // The server responded with a status code other than 2xx
      const responseData = error.response.data;

      // If the response follows our standard format
      if (responseData && responseData.hasOwnProperty('success') && responseData.hasOwnProperty('message')) {
        return {
          message: responseData.message || 'An error occurred',
          status: error.response.status
        };
      }

      // Otherwise use the status text or a default message
      return {
        message: error.response.statusText || 'An error occurred',
        status: error.response.status
      };
    }

    // The request was made but no response was received
    if (error.request) {
      return {
        message: 'No response received from server. Please try again later.',
      };
    }

    // Something else happened in setting up the request
    return {
      message: error.message || 'An unknown error occurred',
    };
  }
