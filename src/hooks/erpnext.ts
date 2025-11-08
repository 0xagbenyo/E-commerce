/**
 * Custom Hooks for ERPNext Data Fetching
 * Updated to use Website Item doctype for better eCommerce support
 */

import { useState, useEffect, useCallback } from 'react';
import { getERPNextClient } from '../services/erpnext';
import {
  mapERPItemToProduct,
  mapERPWebsiteItemToProduct,
  mapERPSalesOrderToOrder,
  mapERPItemGroupToCategory,
  mapERPCustomerToUser,
} from '../services/mappers';
import { Product, Order, Category, User } from '../types';

// Types
interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// Simple cache for API responses (5 minute TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCached = (key: string): any | null => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCached = (key: string, data: any): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Hook for fetching new arrivals (latest Website Items)
 */
export const useNewArrivals = (limit: number = 20) => {
  const [state, setState] = useState<UseAsyncState<Product[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const [retryCount, setRetryCount] = useState(0);

  const fetchNewArrivals = useCallback(async (forceRefresh = false) => {
    const cacheKey = `newArrivals_${limit}`;
    
    // Clear cache if force refresh
    if (forceRefresh) {
      cache.delete(cacheKey);
    }
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = getCached(cacheKey);
      if (cachedData) {
        setState({ data: cachedData, loading: false, error: null });
        // Still fetch in background to update cache, but don't show loading
        try {
          const client = getERPNextClient();
          const websiteItems = await client.getNewArrivals(limit);
          const products = websiteItems.map((item) => mapERPWebsiteItemToProduct(item));
          setCached(cacheKey, products);
          setState({ data: products, loading: false, error: null });
        } catch (error) {
          // Silently fail if we have cached data
          console.warn('Failed to refresh new arrivals, using cached data:', error);
        }
        return;
      }
    }

    // No cache or force refresh - fetch with loading state
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const client = getERPNextClient();
      const websiteItems = await client.getNewArrivals(limit);
      const products = websiteItems.map((item) => mapERPWebsiteItemToProduct(item));
      setCached(cacheKey, products);
      setState({ data: products, loading: false, error: null });
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to load items. Please check your connection.'),
      });
    }
  }, [limit]);

  useEffect(() => {
    fetchNewArrivals();
  }, [fetchNewArrivals, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    fetchNewArrivals(true);
  }, [fetchNewArrivals]);

  return { ...state, retry };
};

/**
 * Hook for fetching products by category
 */
export const useProductsByCategory = (categoryId: string, limit: number = 50) => {
  const [state, setState] = useState<UseAsyncState<Product[]>>({
    data: null,
    loading: false,
    error: null,
  });
  const [retryCount, setRetryCount] = useState(0);

  const fetchProducts = useCallback(async (forceRefresh = false) => {
    // Don't fetch if categoryId is empty
    if (!categoryId || categoryId.trim() === '') {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const cacheKey = `category_${categoryId}_${limit}`;
    
    // Clear cache if force refresh
    if (forceRefresh) {
      cache.delete(cacheKey);
    }
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = getCached(cacheKey);
      if (cachedData) {
        setState({ data: cachedData, loading: false, error: null });
        // Still fetch in background to update cache, but don't show loading
        try {
          const client = getERPNextClient();
          const websiteItems = await client.getItemsByGroup(categoryId, limit);
          const products = websiteItems.map((item) => mapERPWebsiteItemToProduct(item));
          setCached(cacheKey, products);
          setState({ data: products, loading: false, error: null });
        } catch (error) {
          // Silently fail if we have cached data
          console.warn(`Failed to refresh category ${categoryId}, using cached data:`, error);
        }
        return;
      }
    }

    // No cache or force refresh - fetch with loading state
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const client = getERPNextClient();
      const websiteItems = await client.getItemsByGroup(categoryId, limit);
      const products = websiteItems.map((item) => mapERPWebsiteItemToProduct(item));
      setCached(cacheKey, products);
      setState({ data: products, loading: false, error: null });
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to load items. Please check your connection.'),
      });
    }
  }, [categoryId, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    fetchProducts(true);
  }, [fetchProducts]);

  return { ...state, retry };
};

/**
 * Hook for fetching products with pagination and filtering
 */
export const useProducts = (
  filters?: any,
  limit: number = 20,
  offset: number = 0
) => {
  const [state, setState] = useState<UseAsyncState<Product[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const websiteItems = await client.getWebsiteItems(filters, limit, offset);
        const products = websiteItems.map((item) => mapERPWebsiteItemToProduct(item));
        setState({ data: products, loading: false, error: null });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    };

    fetchProducts();
  }, [filters, limit, offset]);

  return state;
};

/**
 * Hook for searching products
 */
export const useSearchProducts = (query: string) => {
  const [state, setState] = useState<UseAsyncState<Product[]>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!query.trim()) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    const searchProducts = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const websiteItems = await client.searchItems(query);
        const products = websiteItems.map((item) => mapERPWebsiteItemToProduct(item));
        setState({ data: products, loading: false, error: null });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    };

    const debounceTimer = setTimeout(searchProducts, 500);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  return state;
};

/**
 * Hook for fetching a single product
 */
export const useProduct = (productId: string) => {
  const [state, setState] = useState<UseAsyncState<Product>>({
    data: null,
    loading: true,
    error: null,
  });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!productId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let isMounted = true;

    const fetchProduct = async () => {
      try {
        if (isMounted) {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        }
        const client = getERPNextClient();
        const websiteItem = await client.getWebsiteItem(productId);
        const product = mapERPWebsiteItemToProduct(websiteItem);
        if (isMounted) {
          setState({ data: product, loading: false, error: null });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
          });
        }
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [productId, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  return { ...state, retry, refetch: retry };
};

/**
 * Hook for fetching categories/item groups
 */
export const useCategories = () => {
  const [state, setState] = useState<UseAsyncState<Category[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const erpGroups = await client.getItemGroups();
        const categories = erpGroups.map((group) =>
          mapERPItemGroupToCategory(group)
        );
        setState({ data: categories, loading: false, error: null });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    };

    fetchCategories();
  }, []);

  return state;
};

/**
 * Hook for fetching user orders
 */
export const useOrders = (customerId: string, company?: string) => {
  const [state, setState] = useState<UseAsyncState<Order[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const erpOrders = await client.getSalesOrders(customerId, company);
        const orders = erpOrders.map((order) => mapERPSalesOrderToOrder(order));
        setState({ data: orders, loading: false, error: null });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    };

    if (customerId) {
      fetchOrders();
    }
  }, [customerId, company]);

  return state;
};

/**
 * Hook for fetching a single order
 */
export const useOrder = (orderId: string) => {
  const [state, setState] = useState<UseAsyncState<Order>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const erpOrder = await client.getSalesOrder(orderId);
        const order = mapERPSalesOrderToOrder(erpOrder);
        setState({ data: order, loading: false, error: null });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  return state;
};

/**
 * Hook for creating a new order
 */
export const useCreateOrder = () => {
  const [state, setState] = useState<UseAsyncState<Order>>({
    data: null,
    loading: false,
    error: null,
  });

  const createOrder = useCallback(
    async (orderData: {
      customer: string;
      company: string;
      items: Array<{
        item_code: string;
        qty: number;
        rate?: number;
      }>;
    }) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const erpOrder = await client.createSalesOrder(orderData);
        const order = mapERPSalesOrderToOrder(erpOrder);
        setState({ data: order, loading: false, error: null });
        return order;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState({ data: null, loading: false, error: err });
        throw err;
      }
    },
    []
  );

  return { ...state, createOrder };
};

/**
 * Hook for fetching user data
 */
export const useUser = (customerId: string) => {
  const [state, setState] = useState<UseAsyncState<User>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const erpCustomer = await client.getCustomer(customerId);
        const user = mapERPCustomerToUser(erpCustomer);
        setState({ data: user, loading: false, error: null });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    };

    if (customerId) {
      fetchUser();
    }
  }, [customerId]);

  return state;
};

/**
 * Hook for updating user data
 */
export const useUpdateUser = () => {
  const [state, setState] = useState<UseAsyncState<User>>({
    data: null,
    loading: false,
    error: null,
  });

  const updateUser = useCallback(
    async (customerId: string, userData: any) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const erpCustomer = await client.updateCustomer(customerId, userData);
        const user = mapERPCustomerToUser(erpCustomer);
        setState({ data: user, loading: false, error: null });
        return user;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState({ data: null, loading: false, error: err });
        throw err;
      }
    },
    []
  );

  return { ...state, updateUser };
};

/**
 * Hook for testing ERPNext connection
 */
export const useERPNextConnection = () => {
  const [state, setState] = useState<UseAsyncState<boolean>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const testConnection = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const connected = await client.testConnection();
        setState({ data: connected, loading: false, error: null });
      } catch (error) {
        setState({
          data: false,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    };

    testConnection();
  }, []);

  return state;
};
