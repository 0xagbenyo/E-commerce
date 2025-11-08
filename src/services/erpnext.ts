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
}

export interface ERPNextResponse<T> {
  data: T;
}

export interface ERPNextListResponse<T> {
  data: T[];
  keys: string[];
}

export interface ERPNextError {
  status: number;
  message: string;
  exc: string;
}

// API Client Class
class ERPNextClient {
  private client: AxiosInstance;
  private config: ERPNextConfig;

  constructor(config: ERPNextConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000, // 30 seconds for slower networks
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Allow self-signed certificates in development (remove in production)
      // For React Native, you may need to configure SSL pinning separately
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    // Add request interceptor for authentication and debugging
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication
        if (this.config.apiKey && this.config.apiSecret) {
          // Base64 encode credentials for Basic Auth
          const credentials = `${this.config.apiKey}:${this.config.apiSecret}`;
          const auth = base64Encode(credentials);
          config.headers.Authorization = `Basic ${auth}`;
        }
        
        // Debug logging
        console.log(`[ERPNext] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
      },
      (error) => {
        console.error('[ERPNext] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add error interceptor with better error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[ERPNext] Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error: AxiosError<ERPNextError>) => {
        // Log more detailed error information
        console.error('[ERPNext] Error Details:', {
          code: error.code,
          message: error.message,
          baseURL: error.config?.baseURL,
          url: error.config?.url,
          method: error.config?.method,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          } : null,
        });

        if (error.code === 'ECONNABORTED') {
          console.error('ERPNext API Error: Request timeout - server took too long to respond');
        } else if (error.code === 'ERR_NETWORK') {
          console.error('ERPNext API Error: Network error - cannot reach server');
          console.error('  - Check if server is running:', error.config?.baseURL);
          console.error('  - Check internet connection');
          console.error('  - Check if URL is correct (not localhost for mobile devices)');
        } else if (error.code === 'ERR_CERT_AUTHORITY_INVALID' || error.code === 'ERR_SSL') {
          console.error('ERPNext API Error: SSL certificate issue - using HTTPS with invalid cert?');
        } else if (error.response) {
          console.error('ERPNext API Error:', error.response.status, error.response.statusText);
          console.error('Response data:', error.response.data);
        } else {
          console.error('ERPNext API Error:', error.message || 'Unknown error');
        }
        throw error;
      }
    );
  }

  // AUTHENTICATION
  async login(email: string, password: string): Promise<{ user: string; sid: string }> {
    try {
      const response = await axios.post(`${this.config.baseUrl}/api/auth/login`, {
        email,
        password,
      });
      return response.data;
    } catch (error) {
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
      return response.data.data;
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
      
      // Check if slideshow is a Link field pointing to a Website Slideshow document
      // The slideshow field contains the name of the linked Website Slideshow document
      if (websiteItem.slideshow) {
        if (typeof websiteItem.slideshow === 'string' && websiteItem.slideshow.trim() !== '') {
          try {
            // Fetch slideshow - keep it synchronous for product details page
            const slideshowDoc = await this.getSlideshow(websiteItem.slideshow);
            if (slideshowDoc) {
              websiteItem.slideshow_data = slideshowDoc;
            }
          } catch (error: any) {
            // Silently fail - slideshow is optional, continue without it
            // Will check for child table in mapper as fallback
          }
        }
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

      const fields = ["name", "web_item_name", "website_image", "short_description"];
      let url = `${API_VERSION}/Website Item?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=50`;
      url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;

      const response = await this.client.get(url);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }


  async getWebsiteItemsByCompany(company: string, limit: number = 50): Promise<any[]> {
    try {
      const filters = [
        ['Website Item', 'published', '=', 1],
        ['Website Item', 'custom_company', '=', company]
      ];

      const fields = [
        "name", "web_item_name", "website_image", "short_description", 
        "item_code", "brand", "item_group"
      ];

      let url = `${API_VERSION}/Website Item?fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=${limit}`;
      url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
      url += `&order_by=ranking%20desc`;

      const response = await this.client.get(url);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ITEMS/PRODUCTS - Legacy Item doctype (now delegates to Website Item)
  async getItems(filters?: any, limit: number = 20, offset: number = 0): Promise<any[]> {
    // Use Website Item instead of Item for better eCommerce support
    return this.getWebsiteItems(filters, limit, offset);
  }

  // Get latest Website Items (new arrivals) sorted by creation date
  async getNewArrivals(limit: number = 20): Promise<any[]> {
    try {
      // Fetch exactly what we need - no extra items for better performance
      const fetchLimit = limit;
      
      // Website Item fields for eCommerce - optimized for listings (minimal fields)
      const fields = [
        'name',
        'web_item_name',
        'route',
        'published',
        'item_code',
        'item_name',
        'item_group',
        'custom_company',
        'brand',
        'website_image',
        'thumbnail',
        'short_description',
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
      
      // Sort by ranking (higher first) or creation date (descending)
      items.sort((a: any, b: any) => {
        // First sort by ranking if available
        if (a.ranking && b.ranking) {
          return b.ranking - a.ranking;
        }
        // Then by creation date
        const dateA = a.creation ? new Date(a.creation).getTime() : 0;
        const dateB = b.creation ? new Date(b.creation).getTime() : 0;
        return dateB - dateA;
      });
      
      return items.slice(0, limit);
    } catch (error) {
      console.error('Error fetching new arrivals:', error);
      throw this.handleError(error);
    }
  }

  // Get Website Items by group/category
  async getWebsiteItemsByGroup(groupName: string, limit: number = 50): Promise<any[]> {
    try {
      const filters = [
        ['Website Item', 'item_group', '=', groupName],
        ['Website Item', 'published', '=', 1]
      ];
      
      // Reduced fields for better performance - only essential fields for listings
      const fields = [
        'name',
        'web_item_name',
        'route',
        'published',
        'item_code',
        'item_name',
        'item_group',
        'custom_company',
        'brand',
        'website_image',
        'thumbnail',
        'short_description',
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
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getItem(itemCode: string): Promise<any> {
    // Use Website Item instead of Item for better eCommerce support
    // Try to find Website Item by item_code first, then by name
    try {
      // First, try to get Website Item by name (assuming itemCode is the Website Item name)
      return await this.getWebsiteItem(itemCode);
    } catch (error) {
      // If not found by name, try to find by item_code
      try {
        const filters = [['Website Item', 'item_code', '=', itemCode]];
        const items = await this.getWebsiteItems(filters, 1);
        if (items.length > 0) {
          return await this.getWebsiteItem(items[0].name);
        }
        throw error;
      } catch (err) {
        throw this.handleError(err);
      }
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
      const filters = [['Bin', 'warehouse', '=', warehouse]];
      if (itemCode) {
        filters.push(['Bin', 'item_code', '=', itemCode]);
      }

      let url = `${API_VERSION}/Bin?fields=["item_code","warehouse","actual_qty","reserved_qty","ordered_qty"]`;
      url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;

      const response = await this.client.get(url);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
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

  async getItemPrice(
    itemCode: string,
    priceListName: string,
    quantity: number = 1
  ): Promise<number> {
    try {
      const url = `${API_VERSION}/Price List Item?fields=["name","price_list_rate"]&filters=${encodeURIComponent(
        JSON.stringify([
          ['Price List Item', 'item_code', '=', itemCode],
          ['Price List Item', 'price_list_name', '=', priceListName],
        ])
      )}`;

      const response = await this.client.get(url);
      if (response.data.data.length > 0) {
        return response.data.data[0].price_list_rate;
      }
      return 0;
    } catch (error) {
      throw this.handleError(error);
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
        `${API_VERSION}/Item Group?fields=["name","item_group_name","image","description"]`
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getItemsByGroup(groupName: string, limit: number = 50): Promise<any[]> {
    // Use Website Item instead of Item for better eCommerce support
    return this.getWebsiteItemsByGroup(groupName, limit);
  }

  // UTILITIES
  private handleError(error: any): Error {
    if (error.response?.data) {
      const erpError = error.response.data as ERPNextError;
      return new Error(
        erpError.message || erpError.exc || 'ERPNext API Error'
      );
    }
    if (error.message) {
      return error;
    }
    return new Error('Unknown error occurred');
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
