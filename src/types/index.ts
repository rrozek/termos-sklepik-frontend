export enum UserRole {
  ADMIN = 'admin',
  PARENT = 'parent',
  STAFF = 'staff',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  portal_user_id?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Kid {
  id: string;
  name: string;
  parent_id: string;
  rfid_token: string[];
  monthly_spending_limit?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductGroup {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  ingredients?: string;
  barcode?: string;
  image_url?: string;
  price: number;
  product_group_id?: string;
  product_group?: ProductGroup;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_applied?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  kid_id: string;
  parent_id: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  kid?: Kid;
  order_items?: OrderItem[];
  created_at?: string;
  updated_at?: string;
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y',
  BUNDLE = 'bundle',
}

export enum DiscountTarget {
  PRODUCT = 'product',
  PRODUCT_GROUP = 'product_group',
  ORDER = 'order',
  USER = 'user',
  KID = 'kid',
}

export interface Discount {
  id: string;
  name: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  target_type: DiscountTarget;
  target_id?: string;

  // Time-based restrictions
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;

  // Day-based restrictions
  monday_enabled?: boolean;
  tuesday_enabled?: boolean;
  wednesday_enabled?: boolean;
  thursday_enabled?: boolean;
  friday_enabled?: boolean;
  saturday_enabled?: boolean;
  sunday_enabled?: boolean;

  // Special conditions
  minimum_purchase_amount?: number;
  minimum_quantity?: number;
  buy_quantity?: number;
  get_quantity?: number;

  is_stackable?: boolean;
  priority?: number;

  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}