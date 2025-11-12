/**
 * Custom Hooks for ERPNext Data Fetching
 * Updated to use Website Item doctype for better eCommerce support
 */

import { useState, useEffect, useCallback } from 'react';
import { getERPNextClient } from '../services/erpnext';
import { useUserSession } from '../context/UserContext';
import {
  mapERPItemToProduct,
  mapERPWebsiteItemToProduct,
  mapERPSalesOrderToOrder,
  mapERPItemGroupToCategory,
  mapERPCustomerToUser,
  mapERPWishlistToWishlistItems,
} from '../services/mappers';
import { Product, Order, Category, User, WishlistItem } from '../types';

// Types
interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching new arrivals (latest Website Items)
 */
export const useNewArrivals = (limit: number = 20) => {
  const [state, setState] = useState<UseAsyncState<Product[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchNewArrivals = async () => {
      try {
        if (isMounted) {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        }
        const client = getERPNextClient();
        const websiteItems = await client.getNewArrivals(limit);
        // Use Website Item mapper for better eCommerce support
        const products = websiteItems.map((item) => mapERPWebsiteItemToProduct(item));
        if (isMounted) {
          setState({ data: products, loading: false, error: null });
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

    fetchNewArrivals();

    return () => {
      isMounted = false;
    };
  }, [limit, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return { ...state, refresh };
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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Don't fetch if categoryId is empty
    if (!categoryId || categoryId.trim() === '') {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let isMounted = true;

    const fetchProducts = async () => {
      try {
        if (isMounted) {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        }
        const client = getERPNextClient();
        // getItemsByGroup now uses Website Item internally
        const websiteItems = await client.getItemsByGroup(categoryId, limit);
        // Use Website Item mapper for better eCommerce support
        const products = websiteItems.map((item) => mapERPWebsiteItemToProduct(item));
        if (isMounted) {
          setState({ data: products, loading: false, error: null });
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

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [categoryId, limit, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return { ...state, refresh };
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
        
        // Log raw API response to debug parent_item_group values
        console.log('📚 Raw API Response (first 3):');
        erpGroups.slice(0, 3).forEach((group: any) => {
          console.log(`  ${group.name}:`, {
            parent_item_group: group.parent_item_group,
            is_group: group.is_group,
            item_group_name: group.item_group_name
          });
        });
        
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
 * Hook for fetching pricing rule sample to see all available fields
 */
export const usePricingRuleFields = () => {
  const [state, setState] = useState<UseAsyncState<any>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchFields = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const fields = await client.getPricingRuleAllFields();
        setState({ data: fields, loading: false, error: null });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    };

    fetchFields();
  }, []);

  return state;
};

/**
 * Hook for fetching pricing rules
 */
export const usePricingRules = () => {
  const [state, setState] = useState<UseAsyncState<any[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchPricingRules = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const client = getERPNextClient();
        const rules = await client.getPricingRules();
        setState({ data: rules, loading: false, error: null });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    };

    fetchPricingRules();
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

/**
 * Hook for fetching "For You" products with infinite scroll
 * Loads random items from the system with pagination
 */
export const useForYouProducts = (pageSize: number = 20) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  // Shuffle array function for randomizing items
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Load initial products
  useEffect(() => {
    const loadInitialProducts = async () => {
      if (!initialLoad) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const client = getERPNextClient();
        // Fetch first batch of products
        const websiteItems = await client.getWebsiteItems(undefined, pageSize, 0);
        const mappedProducts = websiteItems.map((item) => mapERPWebsiteItemToProduct(item));
        
        // Randomize the order for "For You" section
        const shuffledProducts = shuffleArray(mappedProducts);
        
        setProducts(shuffledProducts);
        setOffset(pageSize);
        setHasMore(websiteItems.length === pageSize);
        setInitialLoad(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadInitialProducts();
  }, [initialLoad, pageSize]);

  // Load more products (for infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || initialLoad) return;

    setLoadingMore(true);
    setError(null);

    try {
      const client = getERPNextClient();
      const websiteItems = await client.getWebsiteItems(undefined, pageSize, offset);
      const mappedProducts = websiteItems.map((item) => mapERPWebsiteItemToProduct(item));
      
      // Randomize the new batch and append to existing products
      const shuffledProducts = shuffleArray(mappedProducts);
      
      setProducts((prev) => [...prev, ...shuffledProducts]);
      setOffset((prev) => prev + pageSize);
      setHasMore(websiteItems.length === pageSize);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, offset, pageSize, initialLoad]);

  // Refresh function to reload from start
  const refresh = useCallback(() => {
    setProducts([]);
    setOffset(0);
    setHasMore(true);
    setInitialLoad(true);
    setError(null);
  }, []);

  return {
    products,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  };
};

/**
 * Hook for fetching user wishlist
 */
export const useWishlist = (userEmail: string | null) => {
  const [state, setState] = useState<UseAsyncState<WishlistItem[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchWishlist = async () => {
      if (!userEmail) {
        if (isMounted) {
          setState({ data: [], loading: false, error: null });
        }
        return;
      }

      try {
        if (isMounted) {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        }
        const client = getERPNextClient();
        const erpWishlist = await client.getWishlist(userEmail);
        
        if (!erpWishlist || !erpWishlist.items || erpWishlist.items.length === 0) {
          if (isMounted) {
            setState({ data: [], loading: false, error: null });
          }
          return;
        }

        // Map ERPNext wishlist to app WishlistItem array
        const wishlistItems = await mapERPWishlistToWishlistItems(erpWishlist, client);
        
        if (isMounted) {
          setState({ data: wishlistItems, loading: false, error: null });
        }
      } catch (error) {
        console.error('Error fetching wishlist:', error);
        if (isMounted) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error('Failed to fetch wishlist'),
          });
        }
      }
    };

    fetchWishlist();
    return () => {
      isMounted = false;
    };
  }, [userEmail, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    wishlistItems: state.data || [],
    loading: state.loading,
    error: state.error,
    refresh,
  };
};

/**
 * Hook for managing wishlist operations (add/remove)
 * Accepts an optional refresh callback to update wishlist state immediately
 */
export const useWishlistActions = (onSuccess?: () => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useUserSession();

  const addToWishlist = useCallback(async (itemCode: string) => {
    if (!user?.email) {
      setError(new Error('Please log in to add items to wishlist'));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = getERPNextClient();
      await client.addToWishlist(user.email, itemCode, 1);
      
      // Call refresh callback immediately after success
      if (onSuccess) {
        onSuccess();
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to wishlist';
      setError(new Error(errorMessage));
      console.error('Error adding to wishlist:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, onSuccess]);

  const removeFromWishlist = useCallback(async (itemCode: string) => {
    if (!user?.email) {
      setError(new Error('Please log in to remove items from wishlist'));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = getERPNextClient();
      await client.removeFromWishlist(user.email, itemCode);
      
      // Call refresh callback immediately after success
      if (onSuccess) {
        onSuccess();
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from wishlist';
      setError(new Error(errorMessage));
      console.error('Error removing from wishlist:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, onSuccess]);

  const toggleWishlist = useCallback(async (itemCode: string, isCurrentlyWishlisted: boolean) => {
    if (isCurrentlyWishlisted) {
      return await removeFromWishlist(itemCode);
    } else {
      return await addToWishlist(itemCode);
    }
  }, [addToWishlist, removeFromWishlist]);

  return {
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isLoading,
    error,
  };
};

/**
 * Hook to check if a product is in the wishlist
 */
export const useIsWishlisted = (productId: string | null) => {
  const { user } = useUserSession();
  const { wishlistItems } = useWishlist(user?.email || null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (!productId || !wishlistItems) {
      setIsWishlisted(false);
      return;
    }

    // Check if product is in wishlist by comparing productId with wishlist item's productId
    const found = wishlistItems.some(item => item.productId === productId);
    setIsWishlisted(found);
  }, [productId, wishlistItems]);

  return isWishlisted;
};
