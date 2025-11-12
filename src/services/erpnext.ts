/**
 * ERPNext Integration Service
 * 
 * This service handles all communication with ERPNext backend.
 * Supports multi-company setup with shared customers.
 * 
 * For Website Item field reference, see: src/services/websiteItemFields.ts
 * Use getWebsiteItemAllFields() to fetch all fields from a Website Item for reference.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Configuration
const ERPNEXT_BASE_URL = process.env.EXPO_PUBLIC_ERPNEXT_URL || 'http://localhost:8000';
const API_VERSION = '/api/resource';

// Fixed timeout for all API calls
// Recommended: 15000ms (15s) for cloud/remote ERPNext
// Override via EXPO_PUBLIC_ERPNEXT_TIMEOUT environment variable if needed
const FIXED_TIMEOUT = process.env.EXPO_PUBLIC_ERPNEXT_TIMEOUT 
  ? parseInt(process.env.EXPO_PUBLIC_ERPNEXT_TIMEOUT, 10) 
  : 15000; // 15 seconds - same for all API calls

// Network state management for retry logic
let networkState: {
  isConnected: boolean | null;
  networkType: string | null;
} = {
  isConnected: null,
  networkType: null,
};

let networkListener: (() => void) | null = null;

/**
 * Check if network is stable (connected and not slow)
 * Used for retry logic
 */
const isNetworkStable = (): boolean => {
  if (networkState.isConnected === false) {
    return false;
  }
  
  // Consider network stable if connected (regardless of type)
  // We'll retry if network is connected
  return networkState.isConnected === true;
};

/**
 * Initialize network monitoring for retry logic
 * This monitors network state to determine if retries should be attempted
 * 
 * Note: Requires @react-native-community/netinfo package
 * Install with: npm install @react-native-community/netinfo
 * If not installed, will assume network is always stable for retries
 */
export const initializeNetworkAwareTimeout = async () => {
  try {
    // Dynamically import NetInfo to avoid issues if not installed
    // Note: @react-native-community/netinfo is optional
    // Install with: npm install @react-native-community/netinfo
    let NetInfo: any = null;
    try {
      // @ts-ignore - NetInfo is optional, handled gracefully if not installed
      NetInfo = await import('@react-native-community/netinfo');
    } catch (importError) {
      console.warn('NetInfo not available. Install with: npm install @react-native-community/netinfo');
      console.warn('Using fixed timeout:', FIXED_TIMEOUT, 'ms');
      // Assume network is stable if NetInfo not available
      networkState = { isConnected: true, networkType: 'unknown' };
      return;
    }
    
    if (!NetInfo || !NetInfo.default) {
      console.warn('NetInfo not available. Using fixed timeout:', FIXED_TIMEOUT);
      networkState = { isConnected: true, networkType: 'unknown' };
      return;
    }

    // Get initial network state
    const state = await NetInfo.default.fetch();
    networkState = {
      networkType: state?.type || null,
      isConnected: state?.isConnected ?? null,
    };
    
    console.log(`Network detected: ${networkState.networkType}, Connected: ${networkState.isConnected}, Timeout: ${FIXED_TIMEOUT}ms`);

    // Listen for network state changes
    networkListener = NetInfo.default.addEventListener((state: any) => {
      const networkType = state?.type || null;
      const isConnected = state?.isConnected ?? null;
      
      const wasConnected = networkState.isConnected;
      networkState = { networkType, isConnected };
      
      if (wasConnected !== isConnected) {
        console.log(`Network changed: ${networkType}, Connected: ${isConnected}`);
      }
    });
  } catch (error) {
    console.warn('Failed to initialize network monitoring:', error);
    // Assume network is stable for retries
    networkState = { isConnected: true, networkType: 'unknown' };
  }
};

/**
 * Cleanup network listener
 */
export const cleanupNetworkAwareTimeout = () => {
  if (networkListener) {
    networkListener();
    networkListener = null;
  }
};

/**
 * Get fixed timeout value (same for all API calls)
 */
export const getCurrentTimeout = (): number => {
  return FIXED_TIMEOUT;
};

// Base64 encoding utility for React Native
// Note: React Native doesn't have btoa by default
// If btoa is not available, you may need to install: npm install base-64
// and use: import { encode } from 'base-64'; encode(credentials)
const base64Encode = (str: string): string => {
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // Fallback: simple base64 implementation for React Native
  // For production, consider using the 'base-64' package
  try {
    // @ts-ignore - btoa may be polyfilled
    return btoa(str);
  } catch (e) {
    // If btoa is not available, throw an error suggesting to install base-64
    throw new Error(
      'Base64 encoding not available. Please install base-64: npm install base-64'
    );
  }
};

// Types
export interface ERPNextConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  defaultCompany?: string;
  defaultPriceList?: string; // Default price list for fetching prices
}

export interface ERPNextResponse<T> {
  data: T;
}

export interface ERPNextListResponse<T> {
  data: T[];
  keys: string[];
}

export interface ERPNextError {
  status?: number;
  message?: string;
  exc?: string;
  exc_type?: string;
  exception?: string;
  [key: string]: any; // Allow other properties
}

// API Client Class
class ERPNextClient {
  private client: AxiosInstance;
  private config: ERPNextConfig;

  constructor(config: ERPNextConfig) {
    this.config = config;
    // Create axios instance with dynamic timeout
    // Timeout will be updated based on network conditions
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: getCurrentTimeout(), // Dynamic timeout based on network conditions
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // DO NOT use withCredentials for resource API calls
      // Resource API calls should use API key/secret authentication, not session cookies
      withCredentials: false,
    });

    // Set fixed timeout for all requests (same for every API call)
    this.client.interceptors.request.use((config) => {
      // Use fixed timeout - same for all API calls regardless of network
      config.timeout = getCurrentTimeout();
      return config;
    });

    // Add authentication interceptor
    // IMPORTANT: Always use API key/secret for resource API calls
    // Do NOT use session cookies - login is separate from resource API access
    this.client.interceptors.request.use((config) => {
      // Always use API key authentication for resource API calls
      if (this.config.apiKey && this.config.apiSecret) {
        // Base64 encode credentials for Basic Auth
        const credentials = `${this.config.apiKey}:${this.config.apiSecret}`;
        const auth = base64Encode(credentials);
        config.headers.Authorization = `Basic ${auth}`;
      }
      // Ensure cookies are not sent with resource API calls
      config.withCredentials = false;
      return config;
    });

    // Add retry logic with error interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ERPNextError>) => {
        const originalRequest = error.config as any;

        // Check if this is a retryable error and we haven't exceeded max retries
        // Only retry network/timeout errors, not server-side parsing errors (500 with JSONDecodeError)
        const errorData = error.response?.data as ERPNextError | undefined;
        const isJsonDecodeError = errorData?.exc_type === 'JSONDecodeError' || errorData?.exception?.includes('JSONDecodeError');
        const isRetryableError = 
          (error.code === 'ECONNABORTED' || // Timeout
          error.code === 'ECONNREFUSED' || // Connection refused
          error.code === 'ENOTFOUND' || // DNS error
          error.message === 'Network Error') && // Network error
          !isJsonDecodeError; // Don't retry JSON decode errors - these are server-side issues

        const maxRetries = 3;
        const retryCount = originalRequest._retryCount || 0;

        // Retry if: error is retryable, network is stable, and we haven't exceeded max retries
        if (isRetryableError && isNetworkStable() && retryCount < maxRetries) {
          originalRequest._retryCount = retryCount + 1;
          
          // Exponential backoff: wait 1s, 2s, 4s before retrying
          const delay = Math.pow(2, retryCount) * 1000;
          
          console.log(`Retrying request (attempt ${retryCount + 1}/${maxRetries}) after ${delay}ms:`, originalRequest.url);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Retry the request
          return this.client(originalRequest);
        }

        // Better error logging for network errors
        if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
          console.error('ERPNext Network Error:', {
            message: error.message,
            code: error.code,
            url: error.config?.url,
            timeout: error.config?.timeout,
            retryCount,
            networkStable: isNetworkStable(),
          });
        } else if (error.response) {
          // Suppress "not found" errors - these are expected when items don't exist
          const errorData = error.response?.data as any;
          const serverMessages = errorData?._server_messages;
          const isNotFoundError = 
            errorData?.exc_type === 'DoesNotExistError' ||
            (typeof errorData === 'string' && errorData.includes('not found')) ||
            (serverMessages && 
              typeof serverMessages === 'string' && 
              (serverMessages as string).includes('not found'));
          
          if (!isNotFoundError) {
            console.error('ERPNext API Error:', errorData);
          }
        } else {
          console.error('ERPNext Request Error:', {
            message: error.message,
            code: error.code,
            url: error.config?.url,
            retryCount,
          });
        }
        
        throw error;
      }
    );
  }

  // AUTHENTICATION
  // Note: Login uses session-based auth (cookies) for user authentication
  // But resource API calls (/api/resource/*) should use API key/secret authentication
  async login(email: string, password: string): Promise<{ message?: string; full_name?: string; [key: string]: any }> {
    try {
      // Create a separate axios instance for login to avoid cookie interference
      // Login endpoint uses session-based authentication (cookies)
      const loginClient = axios.create({
        baseURL: this.config.baseUrl,
        timeout: getCurrentTimeout(),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        withCredentials: true, // Enable cookies for login only
      });

      // ERPNext password-based authentication endpoint
      // Uses /api/method/login with usr and pwd fields
      // ERPNext sets a session cookie after successful login
      const response = await loginClient.post('/api/method/login', {
        usr: email,
        pwd: password,
      });
      
      // Check if login was successful
      if (response.data && (response.data.message === 'Logged In' || response.data.message === 'No App')) {
        // Optionally verify the logged-in user
        try {
          const userInfoResponse = await loginClient.get('/api/method/frappe.auth.get_logged_user');
          console.log('User info response:', userInfoResponse.data);
          
          // Extract user info from response
          const userInfo = userInfoResponse?.data?.message;
          const userName = userInfo?.user || email;
          const fullName = userInfo?.full_name || userInfo?.name || undefined;
          
          return {
            ...response.data,
            user: userName,
            full_name: fullName,
          };
        } catch (userInfoError) {
          // If getting user info fails, still return login success
          console.warn('Login successful but could not fetch user info:', userInfoError);
          return {
            ...response.data,
            user: email,
            full_name: undefined,
          };
        }
      }
      
      return response.data;
    } catch (error: any) {
      // Extract meaningful error message from ERPNext response
      const errorMessage = this.extractLoginErrorMessage(error);
      const loginError = new Error(errorMessage);
      (loginError as any).originalError = error;
      throw loginError;
    }
  }

  private extractLoginErrorMessage(error: any): string {
    // Log full error for debugging
    console.error('Login error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    // Check for ERPNext login-specific error messages
    if (error.response?.data) {
      const responseData = error.response.data;
      
      // Check message field first
      if (responseData.message) {
        const message = responseData.message;
        // ERPNext login errors often come in the message field
        if (message && message !== 'Logged In') {
          // Common ERPNext login error messages
          if (message.includes('Invalid Login') || message.includes('Invalid User') || message.includes('Invalid Password')) {
            return 'Invalid email or password. Please check your credentials and try again.';
          }
          if (message.includes('Not Allowed')) {
            return 'Login not allowed. Please contact support.';
          }
          if (message.includes('User disabled')) {
            return 'Your account has been disabled. Please contact support.';
          }
          if (message.includes('Incorrect password')) {
            return 'Incorrect password. Please check your password and try again.';
          }
          return message;
        }
      }

      // Check exc_type for specific error types
      if (responseData.exc_type) {
        if (responseData.exc_type.includes('AuthenticationError') || responseData.exc_type.includes('InvalidLogin')) {
          return 'Invalid email or password. Please check your credentials and try again.';
        }
      }
    }

    // Check for ERPNext server messages
    if (error.response?.data?._server_messages) {
      try {
        const serverMessages = JSON.parse(error.response.data._server_messages);
        if (Array.isArray(serverMessages) && serverMessages.length > 0) {
          const firstMessage = JSON.parse(serverMessages[0]);
          if (firstMessage?.message) {
            return firstMessage.message;
          }
        }
      } catch (parseError) {
        // If parsing fails, try to extract message from string
        const serverMessages = error.response.data._server_messages;
        if (typeof serverMessages === 'string') {
          const match = serverMessages.match(/"message":\s*"([^"]+)"/);
          if (match && match[1]) {
            return match[1];
          }
        }
      }
    }

    // Check HTTP status codes
    if (error.response?.status === 401) {
      // For 401, try to get more specific error message
      const responseData = error.response?.data;
      if (responseData) {
        // Check if there's a specific error message
        if (responseData.message && responseData.message !== 'Logged In') {
          return responseData.message;
        }
        // Check exc for error details
        if (responseData.exc) {
          try {
            const excMessages = JSON.parse(responseData.exc);
            if (Array.isArray(excMessages) && excMessages.length > 0) {
              const excText = excMessages[0];
              if (excText.includes('Invalid Login') || excText.includes('Invalid User') || excText.includes('Invalid Password')) {
                return 'Invalid email or password. Please check your credentials and try again.';
              }
              if (excText.includes('Incorrect password')) {
                return 'Incorrect password. Please check your password and try again.';
              }
            }
          } catch (parseError) {
            // If parsing fails, check if exc is a string
            if (typeof responseData.exc === 'string') {
              if (responseData.exc.includes('Invalid Login') || responseData.exc.includes('Invalid User')) {
                return 'Invalid email or password. Please check your credentials and try again.';
              }
            }
          }
        }
      }
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (error.response?.status === 403) {
      return 'Access denied. Please contact support.';
    }
    if (error.response?.status === 404) {
      return 'Login endpoint not found. Please check your server configuration.';
    }
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.';
    }

    // Network/timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Connection timeout. Please check your internet connection and try again.';
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return 'Cannot connect to server. Please check your internet connection.';
    }
    if (error.message === 'Network Error') {
      return 'Network error. Please check your internet connection and try again.';
    }

    // Default error message
    return error.message || 'Login failed. Please check your credentials and try again.';
  }

  // USERS
  async createUser(userData: {
    email: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    send_welcome_email?: boolean;
  }): Promise<any> {
    try {
      // ERPNext User doctype fields - matching exact API structure
      const userPayload: any = {
        email: userData.email.trim(),
        first_name: userData.first_name.trim(),
        last_name: userData.last_name.trim(),
        send_welcome_email: userData.send_welcome_email !== false ? 1 : 0, // 1 = true, 0 = false
        role_profile_name: 'Customer',
        roles: [
          { role: 'Customer' }
        ],
      };

      // Add middle name if provided
      if (userData.middle_name?.trim()) {
        userPayload.middle_name = userData.middle_name.trim();
      }

      const response = await this.client.post(`${API_VERSION}/User`, userPayload);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserByPhone(phone: string): Promise<any> {
    try {
      // Normalize phone number (remove spaces, handle country codes)
      const normalizedPhone = phone.replace(/\s/g, '').replace(/^\+233/, '0').replace(/^233/, '0');
      const phoneVariants = [
        normalizedPhone,
        phone.replace(/\s/g, ''), // Original format
        `+233${normalizedPhone.slice(1)}`, // With +233
        `233${normalizedPhone.slice(1)}`, // With 233
        normalizedPhone.slice(-9), // Last 9 digits
      ];
      
      // Try each phone variant
      for (const phoneVariant of phoneVariants) {
        try {
          const response = await this.client.get(`${API_VERSION}/User`, {
            params: {
              fields: JSON.stringify(['name', 'email', 'mobile_no']),
              filters: JSON.stringify([
                ['mobile_no', '=', phoneVariant]
              ]),
              limit_page_length: 1,
            },
          });
          
          if (response.data.data && response.data.data.length > 0) {
            return response.data.data[0];
          }
        } catch (variantError) {
          // Continue to next variant
          continue;
        }
      }
      
      // If not found with exact match, try partial match with last 9 digits
      try {
        const last9Digits = normalizedPhone.slice(-9);
        const searchResponse = await this.client.get(`${API_VERSION}/User`, {
          params: {
            fields: JSON.stringify(['name', 'email', 'mobile_no']),
            filters: JSON.stringify([
              ['mobile_no', 'like', `%${last9Digits}%`]
            ]),
            limit_page_length: 1,
          },
        });
        
        if (searchResponse.data.data && searchResponse.data.data.length > 0) {
          return searchResponse.data.data[0];
        }
      } catch (searchError) {
        // Ignore search errors
      }
      
      return null;
    } catch (error) {
      // If user not found, return null instead of throwing
      if ((error as any)?.response?.status === 404 || (error as any)?.response?.status === 417) {
        return null;
      }
      throw this.handleError(error);
    }
  }

  // CUSTOMERS
  async getCustomer(customerId: string): Promise<any> {
    try {
      const response = await this.client.get(`${API_VERSION}/Customer/${customerId}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCustomer(customerData: {
    customer_name: string;
    email: string;
    phone?: string;
    mobile_no?: string;
    customer_type: 'Company' | 'Individual';
  }): Promise<any> {
    try {
      const response = await this.client.post(`${API_VERSION}/Customer`, customerData);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCustomer(customerId: string, customerData: any): Promise<any> {
    try {
      const response = await this.client.put(
        `${API_VERSION}/Customer/${customerId}`,
        customerData
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ITEMS/PRODUCTS - Website Item based (Primary for marketplace)
  async getWebsiteItems(filters?: any, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const fields = [
        "name",
        "web_item_name",
        "route",
        "published",
        "item_code",
        "item_name",
        "item_group",
        "stock_uom",
        "custom_company",
        "brand",
        "description",
        "website_image",
        "website_image_alt",
        "thumbnail",
        "website_warehouse",
        "on_backorder",
        "short_description",
        "web_long_description",
        "ranking"
      ];

      let url = `${API_VERSION}/Website Item?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=${limit}&limit_start=${offset}`;
      
      // Add published filter by default
      const defaultFilters = [['Website Item', 'published', '=', 1]];
      const mergedFilters = filters ? [...defaultFilters, ...filters] : defaultFilters;
      
      url += `&filters=${encodeURIComponent(JSON.stringify(mergedFilters))}`;
      url += `&order_by=ranking%20desc`;

      const response = await this.client.get(url);
      const websiteItems = response.data.data;
      
      // Fetch prices and stock for items in parallel
      // Use Promise.allSettled to handle failures gracefully
      const itemsWithPricesAndStock = await Promise.allSettled(
        websiteItems.map(async (item: any) => {
          // Fetch price if item_code is available
          if (item.item_code) {
            try {
              const price = await this.getItemPrice(item.item_code);
              if (price > 0) {
                item.price_list_rate = price;
              }
            } catch (error) {
              // Price fetch failed - will use fallback (0 or standard_rate if available)
              console.warn(`Failed to fetch price for ${item.item_code}:`, error);
            }
          }
          
          // Fetch stock using the website_warehouse field from Website Item
          // The website_warehouse field specifies which warehouse to check for stock
          if (item.website_warehouse && item.item_code) {
            try {
              const stockData = await this.getWarehouseStock(
                item.website_warehouse, // Use the warehouse specified in website_warehouse field
                item.item_code
              );
              
              if (stockData && Array.isArray(stockData) && stockData.length > 0) {
                // Calculate total available stock (actual_qty - reserved_qty)
                const totalStock = stockData.reduce((sum: number, bin: any) => {
                  const available = (bin.actual_qty || 0) - (bin.reserved_qty || 0);
                  return sum + available;
                }, 0);
                item.available_stock = Math.max(0, totalStock);
              } else {
                item.available_stock = 0;
              }
            } catch (error) {
              // Stock fetch failed - set to 0
              console.warn(`Failed to fetch stock for ${item.item_code} from warehouse ${item.website_warehouse}:`, error);
              item.available_stock = 0;
            }
          } else {
            // No website_warehouse specified - cannot fetch stock
            if (!item.website_warehouse) {
              console.warn(`Website Item ${item.name || item.item_code} has no website_warehouse field set`);
            }
            item.available_stock = 0;
          }
          
          return item;
        })
      );
      
      // Extract successful results
      return itemsWithPricesAndStock
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getWebsiteItem(websiteItemName: string): Promise<any> {
    try {
      // Use wildcard to get all fields, or specify fields for better performance
      // For reference, see: src/services/websiteItemFields.ts
      const fields = [
        "name",
        "web_item_name",
        "route",
        "published",
        "item_code",
        "item_name",
        "item_group",
        "stock_uom",
        "custom_company",
        "brand",
        "description",
        "website_image",
        "website_image_alt",
        "thumbnail",
        "slideshow",
        "website_warehouse",
        "on_backorder",
        "short_description",
        "web_long_description",
        "ranking",
        "website_specifications",
        "show_tabbed_section",
        "tabs",
        "recommended_items",
        "offers",
        "website_item_groups",
        "creation",
        "modified"
      ];

      // Request slideshow child table if it exists as a child table in Website Item
      // In some ERPNext setups, slideshow might be a child table directly in Website Item
      const fieldsWithSlideshow = [
        ...fields,
        // Try to get slideshow child table if it exists
        // Child tables are typically included when fetching with "*" or specific table names
      ];
      
      const response = await this.client.get(
        `${API_VERSION}/Website Item/${websiteItemName}?fields=${encodeURIComponent(JSON.stringify(fieldsWithSlideshow))}`
      );
      const websiteItem = response.data.data;
      
      // Fetch price from Item Price doctype if item_code is available
      if (websiteItem.item_code) {
        try {
          const price = await this.getItemPrice(websiteItem.item_code);
          if (price > 0) {
            websiteItem.price_list_rate = price;
            console.log(`Fetched price for ${websiteItem.item_code}: ${price}`);
          }
        } catch (error) {
          console.warn(`Failed to fetch price for item ${websiteItem.item_code}:`, error);
        }
      }
      
      // Fetch stock from Bin using the website_warehouse field from Website Item
      // The website_warehouse field specifies which warehouse to check for stock
      if (websiteItem.website_warehouse && websiteItem.item_code) {
        try {
          const stockData = await this.getWarehouseStock(
            websiteItem.website_warehouse, // Use the warehouse specified in website_warehouse field
            websiteItem.item_code
          );
          
          if (stockData && Array.isArray(stockData) && stockData.length > 0) {
            // Calculate total available stock (actual_qty - reserved_qty)
            const totalStock = stockData.reduce((sum: number, bin: any) => {
              const available = (bin.actual_qty || 0) - (bin.reserved_qty || 0);
              return sum + available;
            }, 0);
            websiteItem.available_stock = Math.max(0, totalStock);
            console.log(`[getWebsiteItem] Fetched stock for ${websiteItem.item_code} from warehouse ${websiteItem.website_warehouse}: ${websiteItem.available_stock}`);
          } else {
            websiteItem.available_stock = 0;
            console.log(`[getWebsiteItem] No stock data returned for ${websiteItem.item_code}, setting to 0`);
          }
        } catch (error) {
          console.warn(`[getWebsiteItem] Failed to fetch stock for item ${websiteItem.item_code} from warehouse ${websiteItem.website_warehouse}:`, error);
          websiteItem.available_stock = 0;
        }
      } else {
        // No website_warehouse specified - cannot fetch stock
        if (!websiteItem.website_warehouse) {
          console.warn(`[getWebsiteItem] Website Item ${websiteItem.name || websiteItem.item_code} has no website_warehouse field set`);
        }
        websiteItem.available_stock = 0;
        console.log(`[getWebsiteItem] No warehouse/item_code, setting available_stock to 0`);
      }
      
      // Check if slideshow is a Link field pointing to a Website Slideshow document
      // The slideshow field contains the name of the linked Website Slideshow document
      if (websiteItem.slideshow) {
        if (typeof websiteItem.slideshow === 'string' && websiteItem.slideshow.trim() !== '') {
          // slideshow is a Link field - fetch the linked Website Slideshow document
          console.log(`Website Item "${websiteItemName}" is linked to slideshow: "${websiteItem.slideshow}"`);
          try {
            const slideshowDoc = await this.getSlideshow(websiteItem.slideshow);
            if (slideshowDoc) {
              websiteItem.slideshow_data = slideshowDoc;
              console.log(`Successfully fetched Website Slideshow: "${websiteItem.slideshow}"`);
            }
          } catch (error: any) {
            // Website Slideshow document might not exist or might not be accessible
            console.warn(`Failed to fetch linked Website Slideshow "${websiteItem.slideshow}":`, error?.message || error);
            // Continue without slideshow data - will check for child table in mapper as fallback
          }
        } else {
          console.log(`Website Item "${websiteItemName}" has slideshow field but it's not a valid link:`, websiteItem.slideshow);
        }
      } else {
        console.log(`Website Item "${websiteItemName}" has no slideshow link field`);
      }
      
      return websiteItem;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  /**
   * Fetch Website Slideshow document with its child table
   * The child table contains Image, Heading, and Description fields
   */
  async getSlideshow(slideshowName: string): Promise<any> {
    try {
      // Fetch Website Slideshow document with all fields (child tables are included automatically)
      // Using wildcard to ensure all fields and child tables are fetched
      const response = await this.client.get(
        `${API_VERSION}/Website Slideshow/${slideshowName}?fields=["*"]`
      );
      const slideshowData = response.data.data;
      
      // Debug: log what we received
      console.log('Website Slideshow fetched:', slideshowName);
      console.log('Slideshow keys:', Object.keys(slideshowData || {}));
      
      // Check for child tables
      for (const key in slideshowData) {
        if (Array.isArray(slideshowData[key])) {
          console.log(`Found array key in slideshow: ${key} with ${slideshowData[key].length} items`);
          if (slideshowData[key].length > 0) {
            console.log(`First item in ${key}:`, slideshowData[key][0]);
          }
        }
      }
      
      return slideshowData;
    } catch (error) {
      console.error('Error fetching Website Slideshow:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get all fields from a Website Item (for reference/debugging)
   * Use this to discover available fields
   */
  async getWebsiteItemAllFields(websiteItemName: string): Promise<any> {
    try {
      // Fetch with wildcard to get all fields
      const response = await this.client.get(
        `${API_VERSION}/Website Item/${websiteItemName}?fields=["*"]`
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchWebsiteItems(query: string, company?: string): Promise<any[]> {
    try {
      const filters: any = [['Website Item', 'published', '=', 1]];
      
      if (query) {
        filters.push(['Website Item', 'web_item_name', 'like', `%${query}%`]);
      }
      
      if (company) {
        filters.push(['Website Item', 'custom_company', '=', company]);
      }

      // Use getWebsiteItems which already handles prices and stock
      // But we need more fields for search results
      const fields = [
        "name", 
        "web_item_name", 
        "item_code",
        "website_image", 
        "short_description",
        "website_warehouse",
        "brand",
        "item_group",
        "custom_company"
      ];
      let url = `${API_VERSION}/Website Item?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=50`;
      url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;

      const response = await this.client.get(url);
      const websiteItems = response.data.data;
      
      // Fetch prices and stock for search results
      const itemsWithPricesAndStock = await Promise.allSettled(
        websiteItems.map(async (item: any) => {
          // Fetch price if item_code is available
          if (item.item_code) {
            try {
              const price = await this.getItemPrice(item.item_code);
              if (price > 0) {
                item.price_list_rate = price;
              }
    } catch (error) {
              // Price fetch failed
            }
          }
          
          // Fetch stock if warehouse is available
          if (item.website_warehouse && item.item_code) {
            try {
              const stockData = await this.getWarehouseStock(
                item.website_warehouse,
                item.item_code
              );
              
              if (stockData && Array.isArray(stockData) && stockData.length > 0) {
                const totalStock = stockData.reduce((sum: number, bin: any) => {
                  const available = (bin.actual_qty || 0) - (bin.reserved_qty || 0);
                  return sum + available;
                }, 0);
                item.available_stock = Math.max(0, totalStock);
              } else {
                item.available_stock = 0;
              }
            } catch (error) {
              item.available_stock = 0;
            }
          } else {
            item.available_stock = 0;
          }
          
          return item;
        })
      );
      
      // Extract successful results
      return itemsWithPricesAndStock
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);
    } catch (error) {
      throw this.handleError(error);
    }
  }


  async getWebsiteItemsByCompany(company: string, limit: number = 50): Promise<any[]> {
    // Use getWebsiteItems with company filter - it already handles prices and stock
    const filters = [
      ['Website Item', 'custom_company', '=', company]
    ];
    return this.getWebsiteItems(filters, limit, 0);
  }

  // ITEMS/PRODUCTS - Legacy Item doctype (now delegates to Website Item)
  async getItems(filters?: any, limit: number = 20, offset: number = 0): Promise<any[]> {
    // Use Website Item instead of Item for better eCommerce support
    return this.getWebsiteItems(filters, limit, offset);
  }

  // Retry helper with exponential backoff
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        // Only retry on network errors or timeouts
        const isNetworkError = 
          error.code === 'ECONNABORTED' ||
          error.message === 'Network Error' ||
          error.code === 'ERR_NETWORK' ||
          error.code === 'ETIMEDOUT';
        
        if (!isNetworkError || attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Network error on attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // Get latest Website Items (new arrivals) sorted by creation date
  async getNewArrivals(limit: number = 20): Promise<any[]> {
    return this.retryRequest(async () => {
      // Fetch more items than needed, then sort and limit client-side
      const fetchLimit = limit * 3;
      
      // Website Item fields for eCommerce
      const fields = [
        'name',
        'web_item_name',
        'route',
        'published',
        'item_code',
        'item_name',
        'item_group',
        'stock_uom',
        'custom_company',
        'brand',
        'description',
        'short_description',
        'web_long_description',
        'website_image',
        'website_image_alt',
        'thumbnail',
        'website_warehouse',
        'on_backorder',
        'ranking',
        'creation',
        'modified'
      ];
      
      // Filter for published items only
      const filters = [
        ['Website Item', 'published', '=', 1]
      ];
      
      let url = `${API_VERSION}/Website Item?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=${fetchLimit}`;
      url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;

      const response = await this.client.get(url);
      let items = response.data.data || [];
      
      // Filter out unpublished items
      items = items.filter((item: any) => item.published === 1);
      
      // Fetch prices and stock for items in parallel
      const itemsWithPricesAndStock = await Promise.allSettled(
        items.map(async (item: any) => {
          // Fetch price if item_code is available
          if (item.item_code) {
            try {
              const price = await this.getItemPrice(item.item_code);
              if (price > 0) {
                item.price_list_rate = price;
              }
            } catch (error) {
              // Price fetch failed - will use fallback
              console.warn(`Failed to fetch price for ${item.item_code}:`, error);
            }
          }
          
          // Fetch stock if warehouse is available
          if (item.website_warehouse && item.item_code) {
            try {
              const stockData = await this.getWarehouseStock(
                item.website_warehouse,
                item.item_code
              );
              
              if (stockData && Array.isArray(stockData) && stockData.length > 0) {
                const totalStock = stockData.reduce((sum: number, bin: any) => {
                  const available = (bin.actual_qty || 0) - (bin.reserved_qty || 0);
                  return sum + available;
                }, 0);
                item.available_stock = Math.max(0, totalStock);
              } else {
                item.available_stock = 0;
              }
            } catch (error) {
              console.warn(`Failed to fetch stock for ${item.item_code}:`, error);
              item.available_stock = 0;
            }
          } else {
            item.available_stock = 0;
          }
          
          return item;
        })
      );
      
      // Extract successful results
      const validItems = itemsWithPricesAndStock
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);
      
      // Sort by ranking (higher first) or creation date (descending)
      validItems.sort((a: any, b: any) => {
        // First sort by ranking if available
        if (a.ranking && b.ranking) {
          return b.ranking - a.ranking;
        }
        // Then by creation date
        const dateA = a.creation ? new Date(a.creation).getTime() : 0;
        const dateB = b.creation ? new Date(b.creation).getTime() : 0;
        return dateB - dateA;
      });
      
      return validItems.slice(0, limit);
    }).catch((error: any) => {
      console.error('Error fetching new arrivals:', error);
      throw this.handleError(error);
    });
  }

  // Get Website Items by group/category
  async getWebsiteItemsByGroup(groupName: string, limit: number = 50): Promise<any[]> {
    // Use getWebsiteItems with item_group filter - it already handles prices and stock
    const filters = [['Website Item', 'item_group', '=', groupName]];
    return this.getWebsiteItems(filters, limit, 0);
  }

  // Legacy method - kept for backward compatibility
  async _getWebsiteItemsByGroupLegacy(groupName: string, limit: number = 50): Promise<any[]> {
    return this.retryRequest(async () => {
      const filters = [
        ['Website Item', 'item_group', '=', groupName],
        ['Website Item', 'published', '=', 1]
      ];
      
      const fields = [
        'name',
        'web_item_name',
        'route',
        'published',
        'item_code',
        'item_name',
        'item_group',
        'stock_uom',
        'custom_company',
        'brand',
        'description',
        'short_description',
        'web_long_description',
        'website_image',
        'website_image_alt',
        'thumbnail',
        'website_warehouse',
        'on_backorder',
        'ranking',
        'creation',
        'modified'
      ];
      
      let url = `${API_VERSION}/Website Item?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=${limit}`;
      url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;

      const response = await this.client.get(url);
      let items = response.data.data || [];
      
      // Filter out unpublished items
      items = items.filter((item: any) => item.published === 1);
      
      // Sort by ranking or creation date
      items.sort((a: any, b: any) => {
        if (a.ranking && b.ranking) {
          return b.ranking - a.ranking;
        }
        const dateA = a.creation ? new Date(a.creation).getTime() : 0;
        const dateB = b.creation ? new Date(b.creation).getTime() : 0;
        return dateB - dateA;
      });
      
      return items.slice(0, limit);
    }).catch((error: any) => {
      throw this.handleError(error);
    });
  }

  async getItem(itemCode: string): Promise<any> {
    // Use Website Item instead of Item for better eCommerce support
    // Try to find Website Item by item_code first, then by name, then by search
    try {
      // First, try to get Website Item by name (assuming itemCode is the Website Item name)
      return await this.getWebsiteItem(itemCode);
    } catch (error) {
      // If not found by name, try to find by item_code filter
      try {
        const filters = [['Website Item', 'item_code', '=', itemCode]];
        const items = await this.getWebsiteItems(filters, 1);
        if (items.length > 0) {
          return await this.getWebsiteItem(items[0].name);
        }
      } catch (filterError) {
        // If filter search fails, try text search as last resort
        try {
          const searchResults = await this.searchWebsiteItems(itemCode);
          if (searchResults && searchResults.length > 0) {
            // Find exact match by item_code (case-insensitive)
            const searchCode = itemCode.toLowerCase();
            const exactMatch = searchResults.find((wi: any) => {
              const wiCode = (wi.item_code || '').toLowerCase();
              const wiName = (wi.name || '').toLowerCase();
              return wiCode === searchCode || wiName === searchCode;
            });
            if (exactMatch) {
              return await this.getWebsiteItem(exactMatch.name);
            }
            // If no exact match, use first result
            if (searchResults[0]) {
              return await this.getWebsiteItem(searchResults[0].name);
            }
          }
        } catch (searchError) {
          // All methods failed, throw original error
          throw this.handleError(error);
      }
      }
      // If we get here, nothing was found
      throw this.handleError(error);
    }
  }

  async searchItems(query: string, company?: string): Promise<any[]> {
    // Use Website Item for better eCommerce search
    return this.searchWebsiteItems(query, company);
  }

  // SALES ORDERS
  async createSalesOrder(orderData: {
    customer: string;
    company: string;
    items: Array<{
      item_code: string;
      qty: number;
      rate?: number;
    }>;
    delivery_date?: string;
  }): Promise<any> {
    try {
      const response = await this.client.post(`${API_VERSION}/Sales Order`, orderData);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSalesOrder(orderName: string): Promise<any> {
    try {
      const response = await this.client.get(`${API_VERSION}/Sales Order/${orderName}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSalesOrders(
    customerId: string,
    company?: string,
    limit: number = 20
  ): Promise<any[]> {
    try {
      const filters = [['Sales Order', 'customer', '=', customerId]];
      if (company) {
        filters.push(['Sales Order', 'company', '=', company]);
      }

      let url = `${API_VERSION}/Sales Order?fields=["name","customer","company","status","total","posting_date"]&limit_page_length=${limit}`;
      url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;

      const response = await this.client.get(url);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateSalesOrder(orderName: string, orderData: any): Promise<any> {
    try {
      const response = await this.client.put(
        `${API_VERSION}/Sales Order/${orderName}`,
        orderData
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // INVOICES
  async createInvoice(invoiceData: {
    customer: string;
    company: string;
    items: Array<{
      item_code: string;
      qty: number;
      rate: number;
    }>;
    due_date?: string;
  }): Promise<any> {
    try {
      const response = await this.client.post(
        `${API_VERSION}/Sales Invoice`,
        invoiceData
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getInvoice(invoiceName: string): Promise<any> {
    try {
      const response = await this.client.get(`${API_VERSION}/Sales Invoice/${invoiceName}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // STOCK
  async getItemStock(itemCode: string, warehouse?: string): Promise<any> {
    try {
      let url = `${API_VERSION}/Item/${itemCode}`;
      const response = await this.client.get(url);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getWarehouseStock(warehouse: string, itemCode?: string): Promise<any> {
    try {
      // Build filters array - escape special characters in values
      const filters: any[] = [['Bin', 'warehouse', '=', warehouse]];
      if (itemCode) {
        filters.push(['Bin', 'item_code', '=', itemCode]);
      }

      // Use the same URL building approach as getWebsiteItems (which works)
      const fields = ['item_code', 'warehouse', 'actual_qty', 'reserved_qty', 'ordered_qty'];
      const fieldsStr = JSON.stringify(fields);
      const filtersStr = JSON.stringify(filters);
      
      // Build URL exactly like getWebsiteItems does
      let url = `${API_VERSION}/Bin?fields=${encodeURIComponent(fieldsStr)}`;
      url += `&filters=${encodeURIComponent(filtersStr)}`;

      const response = await this.client.get(url);
      if (response.data && response.data.data) {
      return response.data.data;
      }
      return [];
    } catch (error: any) {
      const errorData = error?.response?.data as ERPNextError | undefined;
      // Log the actual error for debugging
      if (errorData?.exc_type === 'JSONDecodeError') {
        console.warn(`ERPNext JSON decode error for Bin query. Warehouse: ${warehouse}, Item: ${itemCode}`);
        console.warn(`This might indicate an ERPNext server configuration issue or API version mismatch.`);
        return [];
      }
      console.error(`Error fetching warehouse stock for warehouse: ${warehouse}, item: ${itemCode}`, error);
      // Don't throw - return empty array so app can continue
      return [];
    }
  }

  // PRICE LISTS
  async getPriceLists(): Promise<any[]> {
    try {
      const response = await this.client.get(
        `${API_VERSION}/Price List?fields=["name","price_list_name","currency"]`
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get item price from Item Price doctype
   * Tries multiple price lists: configured default, then "Standard Selling", then any available
   */
  async getItemPrice(
    itemCode: string,
    priceListName?: string,
    quantity: number = 1
  ): Promise<number> {
    try {
      // Try configured price list first, then default to "Standard Selling"
      const priceListsToTry = priceListName 
        ? [priceListName]
        : this.config.defaultPriceList
        ? [this.config.defaultPriceList, 'Standard Selling']
        : ['Standard Selling'];
      
      for (const priceList of priceListsToTry) {
        try {
          // Use only price_list field (not price_list_name)
          const filters = [['Item Price', 'item_code', '=', itemCode], ['Item Price', 'price_list', '=', priceList]];
          const fields = ['name', 'price_list_rate', 'price_list', 'item_code'];
          const fieldsStr = JSON.stringify(fields);
          const filtersStr = JSON.stringify(filters);
          
          // Build URL exactly like getWebsiteItems does
          let url = `${API_VERSION}/Item Price?fields=${encodeURIComponent(fieldsStr)}`;
          url += `&filters=${encodeURIComponent(filtersStr)}`;
          url += `&limit_page_length=1`;

          const response = await this.client.get(url);
          if (response.data && response.data.data && response.data.data.length > 0) {
            // Get the first matching price
            const itemPrice = response.data.data[0];
            const price = itemPrice.price_list_rate;
            if (price !== null && price !== undefined && price > 0) {
              console.log(`Found price for ${itemCode} in price list ${priceList}: ${price}`);
              return price;
            }
          }
        } catch (error: any) {
          const errorData = error?.response?.data as ERPNextError | undefined;
          // If it's a JSON decode error, skip this price list
          if (errorData?.exc_type === 'JSONDecodeError') {
            continue;
          }
          // Log error but try next price list
          console.warn(`Failed to fetch price from price list ${priceList} for ${itemCode}:`, error?.message || error);
          continue;
        }
      }
      
      // If no price found in any price list, try to get any price for this item
      try {
        // Use only price_list field (not price_list_name)
        const fields = ['name', 'price_list_rate', 'price_list', 'item_code'];
        const filters = [['Item Price', 'item_code', '=', itemCode]];
        const fieldsStr = JSON.stringify(fields);
        const filtersStr = JSON.stringify(filters);
        
        // Build URL exactly like getWebsiteItems does
        let url = `${API_VERSION}/Item Price?fields=${encodeURIComponent(fieldsStr)}`;
        url += `&filters=${encodeURIComponent(filtersStr)}`;
        url += `&limit_page_length=1`;
        url += `&order_by=modified%20desc`;

        const response = await this.client.get(url);
        if (response.data && response.data.data && response.data.data.length > 0) {
          // Get the most recent price
          const itemPrice = response.data.data[0];
          const price = itemPrice.price_list_rate;
          if (price !== null && price !== undefined && price > 0) {
            console.log(`Found price for ${itemCode} in any price list: ${price} (from ${itemPrice.price_list || 'unknown'})`);
            return price;
          }
        }
      } catch (error: any) {
        const errorData = error?.response?.data as ERPNextError | undefined;
        // If it's a JSON decode error, it's likely an ERPNext server configuration issue
        if (errorData?.exc_type !== 'JSONDecodeError') {
          console.warn(`No price found for item ${itemCode}:`, error?.message || error);
        }
      }
      
      return 0;
    } catch (error) {
      console.warn(`Error fetching price for item ${itemCode}:`, error);
      return 0;
    }
  }

  // PAYMENT ENTRIES
  async createPaymentEntry(paymentData: {
    payment_type: 'Receive' | 'Pay';
    party_type: 'Customer' | 'Supplier';
    party: string;
    company: string;
    posting_date: string;
    amount: number;
    mode_of_payment?: string;
    reference_no?: string;
  }): Promise<any> {
    try {
      const response = await this.client.post(
        `${API_VERSION}/Payment Entry`,
        paymentData
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ADDRESSES
  async createAddress(addressData: {
    address_type: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
    email?: string;
    is_primary_address?: number;
    is_shipping_address?: number;
    links?: Array<{
      link_doctype: string;
      link_name: string;
    }>;
  }): Promise<any> {
    try {
      const response = await this.client.post(`${API_VERSION}/Address`, addressData);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // CATEGORIES / ITEM GROUPS
  async getItemGroups(): Promise<any[]> {
    try {
      const response = await this.client.get(
        `${API_VERSION}/Item Group?fields=["name","item_group_name","image","description","is_group","parent_item_group"]`
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // PRICING RULES
  /**
   * Fetch all available fields from Pricing Rule doctype
   * Use this to see what fields are available in your ERPNext instance
   */
  async getPricingRuleAllFields(): Promise<any> {
    try {
      const response = await this.client.get(`${API_VERSION}/Pricing Rule`);
      console.log('📋 Pricing Rule Fields Available:', JSON.stringify(response.data.data[0], null, 2));
      return response.data.data[0];
    } catch (error) {
      console.error('Error fetching Pricing Rule fields:', error);
      return null;
    }
  }

  async getPricingRules(): Promise<any[]> {
    try {
      // First, get list of pricing rules
      const listResponse = await this.client.get(`${API_VERSION}/Pricing Rule?limit_page_length=500`);
      const ruleNames = (listResponse.data.data || [])
        .filter((rule: any) => !rule.disable)
        .map((rule: any) => rule.name);
      
      // Fetch each rule individually to get full details
      const fullRules: any[] = [];
      for (const ruleName of ruleNames) {
        try {
          const ruleResponse = await this.client.get(`${API_VERSION}/Pricing Rule/${ruleName}`);
          if (ruleResponse.data.data) {
            fullRules.push(ruleResponse.data.data);
          }
        } catch (error) {
          console.warn(`Could not fetch pricing rule details for ${ruleName}`);
        }
      }
      
      if (fullRules.length > 0) {
        console.log('💰 PRICING RULES AVAILABLE:', fullRules.length);
        fullRules.forEach((rule: any) => {
          console.log(`\n📌 ${rule.name}: ${rule.discount_percentage}% discount`);
          console.log(`   Apply On: ${rule.apply_on}, Valid: ${rule.valid_from} to ${rule.valid_upto || 'No Expiry'}`);
          
          // Show matching criteria
          if (rule.apply_on === 'Item Group' && rule.item_groups && rule.item_groups.length > 0) {
            console.log(`   📋 Item Groups (${rule.item_groups.length}):`);
            rule.item_groups.forEach((ig: any) => {
              console.log(`      - ${ig.item_group}`);
            });
          }
          
          if (rule.apply_on === 'Item Code' && rule.items && rule.items.length > 0) {
            console.log(`   📋 Item Codes (${rule.items.length}):`);
            rule.items.forEach((item: any) => {
              console.log(`      - ${item.item_code}`);
            });
          }
        });
      }
      
      return fullRules;
    } catch (error) {
      console.warn('Error fetching pricing rules:', error);
      return [];
    }
  }

  async getItemsByGroup(groupName: string, limit: number = 50): Promise<any[]> {
    // Use Website Item instead of Item for better eCommerce support
    return this.getWebsiteItemsByGroup(groupName, limit);
  }

  /**
   * Get a session-based axios client for user-specific operations
   * Uses cookies/session instead of API key for user permissions
   */
  private getSessionClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseUrl,
      timeout: getCurrentTimeout(),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true, // Use session cookies for user-specific operations
    });
  }

  // WISHLIST
  /**
   * Get wishlist for a specific user
   * Fetches the Wishlist document with items child table
   * Uses session-based authentication (user's login session)
   * Parent DocType: Wishlist
   *   - user (Link field)
   *   - items (Table/Child Table)
   * Child Table: Wishlist Item
   *   - item (Link field)
   *   - qty (Int field)
   *   - notes (Data field, optional)
   */
  async getWishlist(userEmail: string): Promise<any> {
    try {
      // Use session client for user-specific operations
      const sessionClient = this.getSessionClient();
      
      // Fetch wishlist by user email
      // Note: Child tables need to be expanded explicitly in ERPNext API
      const response = await sessionClient.get(`${API_VERSION}/Wishlist`, {
        params: {
          fields: JSON.stringify(['name', 'user', 'items']),
          filters: JSON.stringify([
            ['Wishlist', 'user', '=', userEmail]
          ]),
          limit_page_length: 1,
        },
      });
      
      if (response.data.data && response.data.data.length > 0) {
        const wishlist = response.data.data[0];
        
        // If items is not an array or is empty, ensure it's initialized
        if (!wishlist.items || !Array.isArray(wishlist.items)) {
          wishlist.items = [];
        }
        
        return wishlist;
      }
      
      return null;
    } catch (error) {
      // If wishlist doesn't exist, return null instead of throwing
      if ((error as any)?.response?.status === 404 || (error as any)?.response?.status === 417) {
        return null;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Create a new wishlist for a user
   * Creates a Wishlist document with:
   *   - user: userEmail (Link field)
   *   - items: [] (Child table - empty initially)
   * 
   * Child table structure (Wishlist Item):
   *   - item: Link to Item doctype
   *   - qty: Integer (quantity)
   *   - notes: Data/Text (optional notes)
   */
  async createWishlist(userEmail: string): Promise<any> {
    try {
      // Use session client for user-specific operations
      const sessionClient = this.getSessionClient();
      
      const wishlistData = {
        user: userEmail, // Link field to User doctype
        items: [], // Child table - empty array initially
      };
      
      console.log('Creating wishlist for user:', userEmail);
      const response = await sessionClient.post(`${API_VERSION}/Wishlist`, wishlistData);
      console.log('Wishlist created successfully:', response.data.data?.name);
      
      // Ensure items array is initialized
      if (!response.data.data.items) {
        response.data.data.items = [];
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error creating wishlist:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Add item to wishlist
   * If wishlist doesn't exist, creates it first
   * 
   * Structure:
   *   Parent DocType: Wishlist
   *     - user: userEmail (Link field)
   *     - items: Child table array
   *   
   *   Child Table Row (Wishlist Item):
   *     - item: itemCode (Link to Item doctype)
   *     - qty: qty (Integer)
   *     - notes: notes (Data/Text, optional)
   */
  async addToWishlist(userEmail: string, itemCode: string, qty: number = 1, notes?: string): Promise<any> {
    try {
      // Get existing wishlist or create new one
      let wishlist = await this.getWishlist(userEmail);
      
      if (!wishlist) {
        console.log('Wishlist not found, creating new wishlist for user:', userEmail);
        wishlist = await this.createWishlist(userEmail);
      }
      
      // Ensure items array exists
      if (!wishlist.items || !Array.isArray(wishlist.items)) {
        wishlist.items = [];
      }
      
      // Check if item already exists in wishlist
      // Note: ERPNext child table uses 'item_code' field name, not 'item'
      const existingItem = wishlist.items.find((item: any) => 
        (item.item_code || item.item) === itemCode
      );
      
      if (existingItem) {
        // Update existing item in child table
        const updatedItems = wishlist.items.map((item: any) => 
          (item.item_code || item.item) === itemCode 
            ? { 
                ...item, 
                item_code: itemCode, // Link field (ERPNext uses item_code)
                qty: qty, // Int field
                notes: notes || item.notes || '' // Data field (optional)
              }
            : item
        );
        
        // Use session client for user-specific operations
        const sessionClient = this.getSessionClient();
        
        console.log('Updating existing wishlist item:', itemCode);
        const response = await sessionClient.put(`${API_VERSION}/Wishlist/${wishlist.name}`, {
          items: updatedItems, // Child table array
        });
        
        // Ensure response has items array
        if (response.data.data && !response.data.data.items) {
          response.data.data.items = updatedItems;
        }
        
        return response.data.data;
      } else {
        // Add new item to child table
        // Note: ERPNext child table uses 'item_code' field name
        const newItem = {
          item_code: itemCode, // Link field to Item doctype (ERPNext uses item_code)
          qty: qty, // Int field
          notes: notes || '', // Data field (optional)
        };
        
        const updatedItems = [...wishlist.items, newItem];
        
        // Use session client for user-specific operations
        const sessionClient = this.getSessionClient();
        
        console.log('Adding new item to wishlist:', itemCode, 'Total items:', updatedItems.length);
        const response = await sessionClient.put(`${API_VERSION}/Wishlist/${wishlist.name}`, {
          items: updatedItems, // Child table array
        });
        
        // Ensure response has items array
        if (response.data.data && !response.data.data.items) {
          response.data.data.items = updatedItems;
        }
        
        return response.data.data;
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Remove item from wishlist
   * Removes an item from the items child table
   */
  async removeFromWishlist(userEmail: string, itemCode: string): Promise<any> {
    try {
      const wishlist = await this.getWishlist(userEmail);
      
      if (!wishlist) {
        throw new Error('Wishlist not found');
      }
      
      // Ensure items array exists
      if (!wishlist.items || !Array.isArray(wishlist.items)) {
        wishlist.items = [];
      }
      
      // Filter out the item from child table
      // Note: ERPNext child table uses 'item_code' field name, not 'item'
      const updatedItems = wishlist.items.filter((item: any) => 
        (item.item_code || item.item) !== itemCode
      );
      
      // Use session client for user-specific operations
      const sessionClient = this.getSessionClient();
      
      console.log('Removing item from wishlist:', itemCode, 'Remaining items:', updatedItems.length);
      const response = await sessionClient.put(`${API_VERSION}/Wishlist/${wishlist.name}`, {
        items: updatedItems, // Child table array
      });
      
      // Ensure response has items array
      if (response.data.data && !response.data.data.items) {
        response.data.data.items = updatedItems;
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Clear entire wishlist
   */
  async clearWishlist(userEmail: string): Promise<any> {
    try {
      const wishlist = await this.getWishlist(userEmail);
      
      if (!wishlist) {
        return null;
      }
      
      // Use session client for user-specific operations
      const sessionClient = this.getSessionClient();
      
      const response = await sessionClient.put(`${API_VERSION}/Wishlist/${wishlist.name}`, {
        items: [],
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // UTILITIES
  private handleError(error: any): Error {
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout. The server took too long to respond. Please try again.');
    }
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      return new Error('Network error. Please check your internet connection and try again.');
    }
    if (error.code === 'ERR_CANCELED') {
      return new Error('Request was cancelled.');
    }
    
    // Handle API response errors
    if (error.response?.data) {
      const erpError = error.response.data as ERPNextError;
      
      // Try to extract message from _server_messages
      if (erpError._server_messages) {
        try {
          const serverMessages = JSON.parse(erpError._server_messages);
          if (Array.isArray(serverMessages) && serverMessages.length > 0) {
            const firstMessage = JSON.parse(serverMessages[0]);
            if (firstMessage?.message) {
              return new Error(firstMessage.message);
            }
          }
        } catch (parseError) {
          // If parsing fails, try to extract message from string
          const serverMessages = erpError._server_messages;
          if (typeof serverMessages === 'string') {
            const match = serverMessages.match(/"message":\s*"([^"]+)"/);
            if (match && match[1]) {
              return new Error(match[1]);
            }
          }
        }
      }
      
      return new Error(
        erpError.message || erpError.exc || 'ERPNext API Error'
      );
    }
    
    // Handle other errors
    if (error.message) {
      return error instanceof Error ? error : new Error(error.message);
    }
    
    return new Error('Unknown error occurred. Please try again.');
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test connection using Website Item (primary doctype for eCommerce)
      const response = await this.client.get(`${API_VERSION}/Website Item?limit_page_length=1`);
      return response.status === 200;
    } catch (error) {
      console.error('ERPNext connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let erpNextClient: ERPNextClient | null = null;

export const initializeERPNext = (config: ERPNextConfig): ERPNextClient => {
  erpNextClient = new ERPNextClient(config);
  return erpNextClient;
};

export const getERPNextClient = (): ERPNextClient => {
  if (!erpNextClient) {
    throw new Error('ERPNext client not initialized. Call initializeERPNext first.');
  }
  return erpNextClient;
};

export default ERPNextClient;
