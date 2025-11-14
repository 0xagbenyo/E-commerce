import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
	Dimensions,
	Image,
	ScrollView,
	ActivityIndicator,
	RefreshControl,
	Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import type { NavigationProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { useNewArrivals, useProductsByCategory, useForYouProducts, usePricingRuleFields, usePricingRules, useWishlistActions, useWishlist, useCartActions, useDealProducts, useTopCustomers, useProductBundles } from '../hooks/erpnext';
import { useUserSession } from '../context/UserContext';
import { ProductCard } from '../components/ProductCard';
import { LoadingScreen } from '../components/LoadingScreen';
import { CategoryTabs } from '../components/CategoryTabs';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import { PriceFilter, SortOption } from '../components/PriceFilter';
import { TopCustomerAward } from '../components/TopCustomerAward';
import { getProductDiscount } from '../utils/pricingRules';
import { Product } from '../types';
import { getERPNextClient } from '../services/erpnext';
import { mapERPWebsiteItemToProduct } from '../services/mappers';

const { width } = Dimensions.get('window');

// Mock data for products
const superDeals = [
	{ id: '1', name: 'Grey Long-Sleeve Shirt', price: 'GH₵7.00', discount: '-53%', image: '👔' },
	{ id: '2', name: 'Portable Blender', price: 'GH₵1.70', image: '🥤' },
	{ id: '3', name: 'Black Polo Shirt', price: 'GH₵15.00', image: '👕' },
	{ id: '4', name: 'Sanitary Pad Organizers', price: 'GH₵0.75', image: '👜' },
];

const buy6Get60 = [
	{ id: '1', name: 'Blue Floral Dress', price: 'GH₵23.00', image: '👗' },
	{ id: '2', name: 'Gold Layered Necklace', price: 'GH₵2.00', image: '💍' },
];

const discount10to50 = [
	{ id: '1', name: "Men's Light Blue Outfit", price: 'GH₵15.30', image: '👔' },
	{ id: '2', name: 'Brown Brooklyn Sweatshirt', price: 'GH₵10.01', image: '🧥' },
];

const mainProducts = [
	{ id: '1', name: 'Baseball Caps', price: 'GH₵12.00', image: '🧢', tag: 'Trends' },
	{ id: '2', name: 'Brown Dress and Shirt', price: 'GH₵45.00', image: '👗' },
];

const categories = ['All', 'Women', 'Kids', 'Men', 'Curve'];

// Map UI category names to ERPNext item_group names
// You may need to adjust these based on your actual ERPNext item group names
const mapCategoryToItemGroup = (category: string): string | null => {
  const categoryMap: Record<string, string> = {
    'Women': 'Women',
    'Men': 'Men',
    'Kids': 'Kids',
    'Curve': 'Curve',
  };
  return category === 'All' ? null : (categoryMap[category] || null);
};
const filterTabs = [
	{ id: '1', name: 'For You', icon: null, active: true },
	{ id: '2', name: 'New In', icon: 'sparkles' },
	{ id: '3', name: 'Deals', icon: 'pricetag' },
	{ id: '4', name: 'Best Sellers', icon: 'trophy' },
];

export const HomeScreen: React.FC = () => {
	const insets = useSafeAreaInsets();
	const [selectedCategory, setSelectedCategory] = useState('All');
	const [selectedFilter, setSelectedFilter] = useState('For You');
	const [shouldScrollToFilterTabs, setShouldScrollToFilterTabs] = useState(false);
	const forYouListRef = useRef<FlatList>(null);
	const mainListRef = useRef<FlatList>(null);
	const navigation = useNavigation<NavigationProp<RootStackParamList>>();
	
	// Handle category selection - switch active tab on homepage
	const handleCategorySelect = useCallback((category: string) => {
		setSelectedCategory(category);
		// Only navigate to CategoryProductsScreen if user wants to see full category page
		// For now, just switch the active tab indicator on homepage
	}, []);
	const { user } = useUserSession();
	const { wishlistItems, refresh: refreshWishlist } = useWishlist(user?.email || null);
	const { toggleWishlist } = useWishlistActions(refreshWishlist);
	const { addToCart: addItemToCart } = useCartActions();
	
	// Optimistic state for immediate UI updates
	const [optimisticWishlist, setOptimisticWishlist] = useState<Set<string>>(new Set());
	const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
	
	// Toast state
	const [toastVisible, setToastVisible] = useState(false);
	const [toastMessage, setToastMessage] = useState('');
	const [sortOption, setSortOption] = useState<SortOption>('default');
	
	// Create a Set of wishlisted product IDs for quick lookup
	const wishlistedProductIds = useMemo(() => {
		const baseSet = new Set(wishlistItems.map(item => item.productId));
		// Merge with optimistic updates
		optimisticWishlist.forEach(id => baseSet.add(id));
		return baseSet;
	}, [wishlistItems, optimisticWishlist]);
	
	// Sync optimistic state with actual wishlist when it updates
	// Only sync when not currently performing operations to avoid infinite loops
	useEffect(() => {
		if (pendingOperations.size > 0) {
			return; // Don't sync while operations are pending
		}
		
		const actualSet = new Set(wishlistItems.map(item => item.productId));
		setOptimisticWishlist(prev => {
			// Clear optimistic state and sync with actual wishlist
			// This ensures we start fresh after operations complete
			const newSet = new Set(actualSet);
			
			// Only update if there's a change to prevent unnecessary re-renders
			if (newSet.size !== prev.size || Array.from(newSet).some(id => !prev.has(id)) || Array.from(prev).some(id => !newSet.has(id))) {
				return newSet;
			}
			return prev; // Return same reference if no change
		});
	}, [wishlistItems, pendingOperations.size]);
	
	// Map category to item group name
	const itemGroupName = mapCategoryToItemGroup(selectedCategory);
	
	// Fetch pricing rule fields (logs all available fields) - Commented out to reduce API calls
	// const { data: pricingRuleFields } = usePricingRuleFields();
	
	// Fetch pricing rules for discounts
	const { data: pricingRules = [], loading: pricingRulesLoading } = usePricingRules();
	
	// Fetch top customer of the month
	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const currentMonth = currentDate.getMonth() + 1;
	const { data: topCustomersData, loading: topCustomersLoading, error: topCustomersError } = useTopCustomers(currentYear, currentMonth);
	const topCustomer = topCustomersData?.top_customers?.[0]; // Get the #1 customer
	
	// Fetch Product Bundles
	const { data: productBundles, loading: bundlesLoading, error: bundlesError } = useProductBundles(10);
	
	// Fetch trending products from top items
	const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
	const [trendingProductsLoading, setTrendingProductsLoading] = useState(false);
	
	useEffect(() => {
		let isMounted = true;
		let abortController = new AbortController();
		
		const fetchTrendingProducts = async () => {
			if (!topCustomersData?.top_items || topCustomersData.top_items.length === 0) {
				if (isMounted) {
					setTrendingProducts([]);
				}
				return;
			}
			
			if (isMounted) {
				setTrendingProductsLoading(true);
			}
			
			try {
				const client = getERPNextClient();
				const topItems = topCustomersData.top_items.slice(0, 10); // Limit to 10
				
				// Fetch products in parallel with Promise.all for better performance
				const productPromises = topItems.map(async (topItem: any) => {
					try {
						const websiteItems = await client.searchItems(topItem.item_name);
						if (websiteItems && websiteItems.length > 0) {
							const exactMatch = websiteItems.find(
								(wi: any) => wi.item_name === topItem.item_name || wi.web_item_name === topItem.item_name
							);
							const productItem = exactMatch || websiteItems[0];
							return mapERPWebsiteItemToProduct(productItem);
						}
					} catch (error) {
						// Silently fail for individual items to prevent breaking the whole list
						if (error instanceof Error && !error.message.includes('aborted')) {
							console.warn(`Failed to fetch product for ${topItem.item_name}:`, error.message);
						}
					}
					return null;
				});
				
				const fetchedProducts = await Promise.all(productPromises);
				const validProducts = fetchedProducts.filter((p): p is Product => p !== null);
				
				if (isMounted) {
					setTrendingProducts(validProducts);
				}
			} catch (error) {
				if (isMounted && error instanceof Error && !error.message.includes('aborted')) {
					console.error('Error fetching trending products:', error);
				}
			} finally {
				if (isMounted) {
					setTrendingProductsLoading(false);
				}
			}
		};
		
		fetchTrendingProducts();
		
		return () => {
			isMounted = false;
			abortController.abort();
		};
	}, [topCustomersData?.top_items]);
	
	// Debug top customer data
	useEffect(() => {
		if (topCustomersData) {
			console.log('🏆 TOP CUSTOMERS DATA:', topCustomersData);
			console.log('🏆 TOP CUSTOMER:', topCustomer);
		}
		if (topCustomersError) {
			console.error('🏆 TOP CUSTOMERS ERROR:', topCustomersError);
		}
	}, [topCustomersData, topCustomer, topCustomersError]);
	
	// Log pricing rule fields when available - Commented out to reduce API calls
	// useEffect(() => {
	// 	if (pricingRuleFields) {
	// 		console.log('💰 PRICING RULE FIELDS:', pricingRuleFields);
	// 	}
	// }, [pricingRuleFields]);
	
	// Log pricing rules when available
	useEffect(() => {
		if (pricingRules && pricingRules.length > 0) {
			console.log('💰 PRICING RULES FETCHED:', pricingRules.length, 'rules');
			pricingRules.slice(0, 3).forEach((rule: any) => {
				console.log(`  - ${rule.name}: ${rule.discount_percentage}% (${rule.item_code || rule.item_group})`);
			});
		}
	}, [pricingRules]);
	
	// Fetch new arrivals from API with infinite scroll
	const { 
		products: newArrivals, 
		loading: newArrivalsLoading, 
		loadingMore: newArrivalsLoadingMore,
		error: newArrivalsError, 
		hasMore: newArrivalsHasMore,
		loadMore: newArrivalsLoadMore,
		refresh: refreshNewArrivals
	} = useNewArrivals(20);
	
	// Fetch products by category when a category is selected (not "All")
	// Convert sortOption to server-side sorting parameter
	const sortByPrice = sortOption === 'lowToHigh' ? 'asc' : sortOption === 'highToLow' ? 'desc' : undefined;
	const { data: categoryProducts, loading: categoryLoading, error: categoryError, refresh: refreshCategoryProducts } = useProductsByCategory(
		itemGroupName || '',
		itemGroupName ? 50 : 0, // Only fetch if category is selected
		sortByPrice
	);
	
	// Fetch "For You" products with infinite scroll
	const { 
		products: forYouProducts, 
		loading: forYouLoading, 
		loadingMore: forYouLoadingMore,
		error: forYouError, 
		hasMore: forYouHasMore,
		loadMore: forYouLoadMore,
		refresh: refreshForYouProducts
	} = useForYouProducts(20);
	
	// No client-side sorting needed for category products - server-side sorting is already applied
	const sortedCategoryProducts = useMemo(() => {
		return categoryProducts || [];
	}, [categoryProducts]);
	
	// Sort "For You" products by price (client-side for now, can be updated later)
	const sortedForYouProducts = useMemo(() => {
		if (!forYouProducts || forYouProducts.length === 0) return [];
		
		const sorted = [...forYouProducts];
		switch (sortOption) {
			case 'lowToHigh':
				return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
			case 'highToLow':
				return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
			default:
				return sorted;
		}
	}, [forYouProducts, sortOption]);
	
	// Pull-to-refresh state
	const [refreshing, setRefreshing] = useState(false);
	
	// Handle pull-to-refresh
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			// Refresh all data sources
			await Promise.all([
				refreshNewArrivals(),
				refreshCategoryProducts(),
				refreshForYouProducts(),
				refreshWishlist(),
			]);
		} catch (error) {
			console.error('Error refreshing data:', error);
		} finally {
			setRefreshing(false);
		}
	}, [refreshNewArrivals, refreshCategoryProducts, refreshForYouProducts, refreshWishlist]);
	
	// Products to display - only show when a specific category is selected
	const displayedProducts = selectedCategory === 'All' 
		? [] 
		: (categoryProducts || []);
	
	const isLoadingProducts = categoryLoading;
	const productsError = categoryError;

	// Fetch products grouped by pricing rules (for Super Deals section)
	const [productsByRule, setProductsByRule] = useState<Record<string, any[]>>({});
	const [allDealProducts, setAllDealProducts] = useState<any[]>([]);
	const [loadingDeals, setLoadingDeals] = useState(false);
	
	// State for infinite scroll deals
	const [dealProducts, setDealProducts] = useState<any[]>([]);
	const [dealProductsOffset, setDealProductsOffset] = useState(0);
	const [dealProductsLoadingMore, setDealProductsLoadingMore] = useState(false);
	const dealPageSize = 20;
	
	// Check if page is initially loading (fresh load - no data loaded yet)
	const isInitialLoading = (!newArrivals && newArrivalsLoading) && 
		(!pricingRules || pricingRules.length === 0);

	useEffect(() => {
		let isMounted = true;
		let abortController = new AbortController();
		
		const fetchDealProducts = async () => {
			if (!pricingRules || pricingRules.length === 0) {
				if (isMounted) {
					setProductsByRule({});
					setAllDealProducts([]);
					setDealProducts([]);
					setDealProductsOffset(0);
				}
				return;
			}

			if (isMounted) {
				setLoadingDeals(true);
			}
			
			try {
				const client = getERPNextClient();
				const productsByRuleMap: Record<string, any[]> = {};
				const allProducts: any[] = [];

				// Limit processing to prevent too many API calls and improve performance
				const MAX_RULES = 5;
				const MAX_ITEMS_PER_RULE = 10;
				const MAX_GROUPS_PER_RULE = 2;
				const MAX_ITEMS_PER_GROUP = 20;

				// Extract item codes and item groups from pricing rules (limit rules)
				for (const rule of pricingRules.slice(0, MAX_RULES)) {
					const ruleAny = rule as any;
					const ruleName = rule.name || ruleAny.name || 'Unknown';
					const ruleProducts: any[] = [];
					
					// Fetch products by item codes - limit items and batch fetch
					if (ruleAny.items && Array.isArray(ruleAny.items)) {
						const limitedItems = ruleAny.items.slice(0, MAX_ITEMS_PER_RULE);
						const itemCodes = limitedItems
							.filter((item: any) => item && item.item_code)
							.map((item: any) => item.item_code);
						
						// Fetch items in parallel (but limited)
						const itemPromises = itemCodes.map(async (itemCode: string) => {
							try {
								const websiteItem = await client.getItem(itemCode);
								if (websiteItem) {
									const product = mapERPWebsiteItemToProduct(websiteItem);
									const calculatedDiscount = getProductDiscount(product, pricingRules);
									const ruleDiscount = ruleAny.discount_percentage || 0;
									const discount = calculatedDiscount > 0 ? calculatedDiscount : ruleDiscount;
									
									if (discount > 0 || ruleDiscount > 0) {
										return {
											...product,
											discount: discount > 0 ? discount : ruleDiscount,
											ruleName
										};
									}
								}
							} catch (error: any) {
								if (error?.message && !error.message.includes('not found') && !error.message.includes('DoesNotExistError')) {
									console.warn(`Failed to fetch product ${itemCode}:`, error.message);
								}
							}
							return null;
						});
						
						const fetchedProducts = await Promise.all(itemPromises);
						const validProducts = fetchedProducts.filter((p): p is any => p !== null);
						ruleProducts.push(...validProducts);
						allProducts.push(...validProducts);
					}

					// Fetch products by item groups - limit groups and items
					if (ruleAny.item_groups && Array.isArray(ruleAny.item_groups)) {
						const limitedGroups = ruleAny.item_groups.slice(0, MAX_GROUPS_PER_RULE);
						for (const itemGroup of limitedGroups) {
							if (itemGroup && itemGroup.item_group) {
								try {
									const websiteItems = await client.getItemsByGroup(itemGroup.item_group, MAX_ITEMS_PER_GROUP);
									const products = websiteItems.map((item: any) => {
										const product = mapERPWebsiteItemToProduct(item);
										const discount = getProductDiscount(product, pricingRules);
										return {
											...product,
											discount,
											ruleName
										};
									}).filter((p: any) => p.discount > 0);
									ruleProducts.push(...products);
									allProducts.push(...products);
								} catch (error) {
									console.warn(`Failed to fetch products for group ${itemGroup.item_group}:`, error);
								}
							}
						}
					}

					if (ruleProducts.length > 0) {
						// Remove duplicates within this rule and sort by discount
						const uniqueRuleProducts = Array.from(
							new Map(ruleProducts.map((p: any) => [p.id, p])).values()
						).sort((a: any, b: any) => b.discount - a.discount);
						
						productsByRuleMap[ruleName] = uniqueRuleProducts;
					}
				}

				// Remove duplicates from all products
				const uniqueAllProducts = Array.from(
					new Map(allProducts.map((p: any) => [p.id, p])).values()
				);
				
				// Shuffle to mix products from different pricing rules
				const shuffledProducts = [...uniqueAllProducts];
				for (let i = shuffledProducts.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[shuffledProducts[i], shuffledProducts[j]] = [shuffledProducts[j], shuffledProducts[i]];
				}

				if (isMounted) {
					setProductsByRule(productsByRuleMap);
					setAllDealProducts(shuffledProducts);
					
					// Initialize deal products for infinite scroll (first page)
					setDealProducts(shuffledProducts.slice(0, dealPageSize));
					setDealProductsOffset(dealPageSize);
				}
			} catch (error) {
				if (isMounted && error instanceof Error && !error.message.includes('aborted')) {
					console.error('Error fetching deal products:', error);
				}
				if (isMounted) {
					setProductsByRule({});
					setAllDealProducts([]);
					setDealProducts([]);
					setDealProductsOffset(0);
				}
			} finally {
				if (isMounted) {
					setLoadingDeals(false);
				}
			}
		};

		fetchDealProducts();
	}, [pricingRules]);
	
	// Load more deal products for infinite scroll
	const loadMoreDealProducts = useCallback(() => {
		if (dealProductsLoadingMore || dealProductsOffset >= allDealProducts.length) {
			return;
		}
		
		setDealProductsLoadingMore(true);
		
		// Simulate async load (in case we need to fetch more later)
		setTimeout(() => {
			const nextProducts = allDealProducts.slice(dealProductsOffset, dealProductsOffset + dealPageSize);
			setDealProducts((prev) => [...prev, ...nextProducts]);
			setDealProductsOffset((prev) => prev + dealPageSize);
			setDealProductsLoadingMore(false);
		}, 100);
	}, [dealProductsLoadingMore, dealProductsOffset, allDealProducts.length, dealPageSize]);
	
	const dealProductsHasMore = dealProductsOffset < allDealProducts.length;
	const dealProductsError: Error | null = null; // No error state needed since we use cached data

	// Track when user switches from "For You" to another filter
	const prevFilterRef = useRef(selectedFilter);
	const wasForYouRef = useRef(false);
	
	// Track if we're transitioning from "For You" to another filter
	useEffect(() => {
		if (selectedFilter === 'For You') {
			wasForYouRef.current = true;
		} else if (wasForYouRef.current && selectedFilter !== 'For You' && selectedCategory === 'All') {
			// We just switched from "For You" to another filter
			setShouldScrollToFilterTabs(true);
			wasForYouRef.current = false;
		}
		prevFilterRef.current = selectedFilter;
	}, [selectedFilter, selectedCategory]);
	
	// Use a stable key that doesn't change when filter changes (only when category changes)
	// This prevents the list from remounting unnecessarily
	const mainListKey = useMemo(() => `main-list-${selectedCategory}`, [selectedCategory]);

	// Generate dynamic sections based on pricing rules
	const pricingRuleSections = useMemo(() => {
		if (!pricingRules || pricingRules.length === 0) {
			return [];
		}
		return pricingRules.map((rule: any) => {
			const discount = rule.discount_percentage || 0;
			let title = rule.title || `${discount}% Off`;
			
			// Make title more descriptive based on what the rule applies to
			// For item_groups: show percentage and group name
			// For item_codes: show only percentage (no item names)
			if (rule.item_groups && rule.item_groups.length > 0) {
				const groupNames = rule.item_groups.map((ig: any) => ig.item_group).filter(Boolean).join(', ');
				if (groupNames) {
					title = `${discount}% Off - ${groupNames}`;
				}
			} else if (rule.items && rule.items.length > 0) {
				// For item codes, just show the percentage
				title = `${discount}% Off`;
			}
			
			return {
				type: 'pricingRule',
				id: rule.name || rule.id || `rule-${Math.random()}`,
				ruleName: rule.name,
				ruleTitle: title,
				discountPercent: discount
			};
		});
	}, [pricingRules]);

	// Show full homepage when "All" is selected, otherwise only header and tabs
	// Filter sections based on selectedFilter
	// IMPORTANT: Always include all sections to prevent remounting, but conditionally render content
	const getSections = (): Array<{ type: string; id: string; ruleName?: string; ruleTitle?: string; discountPercent?: number }> => {
		if (selectedCategory !== 'All') {
			return [
				{ type: 'header', id: 'header' },
				{ type: 'categoryTabs', id: 'categoryTabs' },
			];
		}
		
		// Always return the same sections structure to prevent remounting
		// The renderSection function will conditionally render content based on selectedFilter
		const baseSections: Array<{ type: string; id: string; ruleName?: string; ruleTitle?: string; discountPercent?: number }> = [
			{ type: 'header', id: 'header' },
			{ type: 'priceFilter', id: 'priceFilter' },
			{ type: 'categoryTabs', id: 'categoryTabs' },
			{ type: 'shippingBanner', id: 'shippingBanner' },
			{ type: 'topCustomerAward', id: 'topCustomerAward' },
			{ type: 'superDeals', id: 'superDeals' },
			...pricingRuleSections,
			{ type: 'filterTabs', id: 'filterTabs' },
			{ type: 'mainProducts', id: 'mainProducts' }, // Always include, renderSection will conditionally show
			{ type: 'forYouProducts', id: 'forYouProducts' }, // Always include, renderSection will conditionally show
			{ type: 'newInProducts', id: 'newInProducts' }, // Always include, renderSection will conditionally show
			{ type: 'dealProducts', id: 'dealProducts' }, // Always include, renderSection will conditionally show
		];
		
		return baseSections;
	};
	
	const sections = getSections();

	// Find the index of the header section for sticky header
	const stickyHeaderIndex = useMemo(() => {
		const index = sections.findIndex(section => section.type === 'header');
		return index >= 0 ? index : undefined;
	}, [sections]);

	// Store section layout positions to scroll directly to them
	const sectionLayouts = useRef<{ [key: string]: number }>({});
	const filterTabsLayoutRef = useRef<View>(null);
	const mainProductsLayoutRef = useRef<View>(null);

	// Reset scroll flag when filter changes away from "For You"
	useEffect(() => {
		if (selectedFilter !== 'For You' && prevFilterRef.current === 'For You') {
			// Flag is set in renderFilterTabs onPress, layout handler will scroll
		}
		prevFilterRef.current = selectedFilter;
	}, [selectedFilter]);

	const renderHeader = () => (
		<View style={[styles.stickyHeaderWrapper, { paddingTop: insets.top - Spacing.PADDING_MD }]}>
			<Header 
				onCalendarPress={() => {
					if (productBundles && productBundles.length > 0) {
						(navigation as any).navigate('ProductBundles');
					}
				}}
			/>
				</View>
	);


	const bannerScrollRef = useRef<ScrollView>(null);
	const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

	// Calculate banner count for auto-scroll
	const latestRule = pricingRules && pricingRules.length > 0 ? pricingRules[0] : null;
	const discountPercent = latestRule?.discount_percentage || (latestRule as any)?.discount_percentage || 0;
	const showDiscountBanner = discountPercent > 0 || allDealProducts.length > 0;
	const showTopCustomerBanner = topCustomer && topCustomersData && !topCustomersLoading && !topCustomersError;
	const bannerCount = (showDiscountBanner ? 1 : 0) + (showTopCustomerBanner ? 1 : 0);

	// Auto-scroll effect
	useEffect(() => {
		if (bannerCount <= 1) return; // No need to scroll if only one banner

		const interval = setInterval(() => {
			setCurrentBannerIndex((prevIndex) => {
				const nextIndex = (prevIndex + 1) % bannerCount;
				bannerScrollRef.current?.scrollTo({
					x: nextIndex * width,
					animated: true,
				});
				return nextIndex;
			});
		}, 3000); // Change banner every 3 seconds

		return () => clearInterval(interval);
	}, [bannerCount]);

	const renderShippingBanner = () => {
		// Get the latest pricing rule (first one in the array)
		const latestRuleName = latestRule?.name || (latestRule as any)?.name;
		const latestRuleProducts = latestRuleName ? (productsByRule[latestRuleName] || []) : [];
		
		const handleBannerPress = () => {
			// Use latestRuleProducts if available, otherwise fallback to allDealProducts
			const dealsToShow = latestRuleProducts.length > 0 ? latestRuleProducts : allDealProducts;
			if (dealsToShow.length > 0) {
				(navigation as any).navigate('AllDeals', { deals: dealsToShow });
			}
		};
		
		if (!showDiscountBanner && !showTopCustomerBanner) {
			return null;
		}
		
		// Get month name
		const getMonthName = (monthNum: string) => {
			const months = ['January', 'February', 'March', 'April', 'May', 'June', 
				'July', 'August', 'September', 'October', 'November', 'December'];
			const monthIndex = parseInt(monthNum) - 1;
			return months[monthIndex] || monthNum;
		};
		
		return (
			<ScrollView 
				ref={bannerScrollRef}
				horizontal
				showsHorizontalScrollIndicator={false}
				pagingEnabled
				contentContainerStyle={styles.bannerCarouselContainer}
				scrollEventThrottle={16}
				onMomentumScrollEnd={(event) => {
					const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
					setCurrentBannerIndex(newIndex);
				}}
			>
				{showDiscountBanner && (
					<View style={styles.bannerCarouselItem}>
						<View style={styles.shippingBannerContainer}>
							<TouchableOpacity
								style={styles.shippingBanner}
								onPress={handleBannerPress}
								activeOpacity={0.7}
								disabled={allDealProducts.length === 0 && latestRuleProducts.length === 0}
							>
								<Ionicons name="pricetag" size={14} color={Colors.BLACK} />
								<Text style={styles.shippingText}>Get {discountPercent}% Off</Text>
					</TouchableOpacity>
				</View>
			</View>
				)}
				{showTopCustomerBanner && (
					<View style={styles.bannerCarouselItem}>
						<View style={styles.shippingBannerContainer}>
							<View style={styles.topCustomerBanner}>
								<View style={styles.topCustomerLeft}>
									<View style={styles.trophyIconContainer}>
										<Ionicons name="trophy" size={16} color={Colors.GOLD} />
		</View>
									<View style={styles.topCustomerTextContainer}>
										<Text style={styles.topCustomerBannerText}>Top Customer</Text>
										<Text style={styles.topCustomerBannerSubtext}>
											{getMonthName(topCustomersData.month)} {topCustomersData.year}
										</Text>
				</View>
			</View>
								<View style={styles.topCustomerRight}>
									<Ionicons name="star" size={14} color={Colors.GOLD} />
									<Text style={styles.topCustomerBannerName}>{topCustomer.customer}</Text>
									<Ionicons name="star" size={14} color={Colors.GOLD} />
						</View>
					</View>
			</View>
		</View>
				)}
			</ScrollView>
		);
	};

	const renderSuperDeals = () => {
		const firstTenDeals = allDealProducts.slice(0, 10);
		
		if (loadingDeals) {
			return null; // Don't show anything while loading deals
		}

		if (firstTenDeals.length === 0) {
			return null;
		}

		return (
		<View style={styles.section}>
			{allDealProducts.length > 0 && (
				<View style={styles.superDealsTitleContainer}>
					<View style={styles.titleWithIcon}>
						<Ionicons name="flash" size={12} color={Colors.WHITE} />
						<Text style={styles.superDealsTitle}>Super Deals</Text>
				</View>
					<TouchableOpacity 
						onPress={() => {
							navigation.navigate('PricingRules');
						}}
					>
						<Text style={styles.viewMoreTextWhite}>View more {'>'}</Text>
			</TouchableOpacity>
			</View>
			)}
			<FlatList
					data={firstTenDeals}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.productsList}
					renderItem={({ item }: { item: any }) => (
						<TouchableOpacity 
							style={styles.productCard}
							onPress={() => (navigation as any).navigate('ProductDetails', { productId: item.id })}
						>
						<View style={styles.productImage}>
								{item.images && item.images.length > 0 && item.images[0] ? (
									<Image 
										source={{ uri: item.images[0] }} 
										style={styles.productImageContent}
										resizeMode="cover"
									/>
								) : (
									<View style={styles.productImagePlaceholder}>
										<Ionicons name="image-outline" size={24} color={Colors.TEXT_SECONDARY} />
									</View>
								)}
								{item.discount > 0 && (
								<View style={styles.discountTag}>
										<Text style={styles.discountText}>-{Math.round(item.discount)}%</Text>
								</View>
							)}
						</View>
							<Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
							<View style={styles.priceRow}>
								<Text style={styles.productPrice}>GH₵{(item.price * (1 - item.discount / 100)).toFixed(2)}</Text>
								{item.discount > 0 && (
									<Text style={styles.originalPrice}>GH₵{item.price.toFixed(2)}</Text>
								)}
					</View>
						</TouchableOpacity>
				)}
				keyExtractor={(item) => item.id}
			/>
		</View>
	);
	};

	// Render dynamic deal section for a pricing rule
	const renderDealSection = (ruleName: string, ruleTitle: string, discountPercent: number) => {
		const ruleProducts = productsByRule[ruleName] || [];
		const firstFive = ruleProducts.slice(0, 5);

		if (loadingDeals) {
			return null; // Don't show anything while loading deals
		}

		if (firstFive.length === 0) {
			return null;
		}

		return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<View style={styles.sectionTitleContainer}>
						<Text style={styles.sectionTitle}>{ruleTitle}</Text>
						{ruleProducts.length > 5 && (
							<TouchableOpacity onPress={() => {
								const dealsToNavigate = Array.isArray(ruleProducts) ? ruleProducts : [];
								(navigation as any).navigate('AllDeals', { deals: dealsToNavigate });
							}}>
								<Text style={styles.viewMoreText}>View more {'>'}</Text>
							</TouchableOpacity>
						)}
				</View>
					<Text style={styles.sectionSubtitle}>{discountPercent}% off</Text>
			</View>
			<FlatList
					data={firstFive}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.productsList}
					renderItem={({ item }: { item: any }) => (
						<TouchableOpacity 
							style={styles.productCard}
							onPress={() => (navigation as any).navigate('ProductDetails', { productId: item.id })}
						>
						<View style={styles.productImage}>
								{item.images && item.images.length > 0 && item.images[0] ? (
									<Image 
										source={{ uri: item.images[0] }} 
										style={styles.productImageContent}
										resizeMode="cover"
									/>
								) : (
									<View style={styles.productImagePlaceholder}>
										<Ionicons name="image-outline" size={24} color={Colors.TEXT_SECONDARY} />
						</View>
								)}
								{item.discount > 0 && (
									<View style={styles.discountTag}>
										<Text style={styles.discountText}>-{Math.round(item.discount)}%</Text>
					</View>
				)}
		</View>
							<Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
							<View style={styles.priceRow}>
								<Text style={styles.productPrice}>GH₵{(item.price * (1 - item.discount / 100)).toFixed(2)}</Text>
								{item.discount > 0 && (
									<Text style={styles.originalPrice}>GH₵{item.price.toFixed(2)}</Text>
								)}
				</View>
						</TouchableOpacity>
				)}
				keyExtractor={(item) => item.id}
			/>
		</View>
	);
	};

	const renderFilterTabs = () => (
		<View 
			ref={filterTabsLayoutRef}
			style={styles.filterTabs}
			onLayout={(e) => {
				const { y } = e.nativeEvent.layout;
				sectionLayouts.current['filterTabs'] = y;
			}}
		>
			{filterTabs.map((tab) => (
				<TouchableOpacity
					key={tab.id}
					style={[
						styles.filterTab,
						selectedFilter === tab.name && styles.filterTabActive
					]}
					onPress={() => {
						// If switching from "For You" to another filter, set flag to scroll
						if (selectedFilter === 'For You' && tab.name !== 'For You' && selectedCategory === 'All') {
							setShouldScrollToFilterTabs(true);
						}
						setSelectedFilter(tab.name);
					}}
				>
					{tab.icon && (
						<Ionicons 
							name={tab.icon as any} 
							size={16} 
							color={selectedFilter === tab.name ? Colors.WHITE : Colors.BLACK} 
						/>
					)}
					<Text style={[
						styles.filterTabText,
						selectedFilter === tab.name && styles.filterTabTextActive
					]}>
						{tab.name}
					</Text>
				</TouchableOpacity>
			))}
		</View>
	);

	// Memoized renderItem for "New In" products (New Arrivals)
	const renderNewInItem = useCallback(({ item, index }: { item: any; index: number }) => {
		const isLeftColumn = index % 2 === 0;
		const row = Math.floor(index / 2);
		const patterns = [
			['tall', 'short'],
			['medium', 'tall'],
			['short', 'medium'],
			['tall', 'short'],
			['medium', 'tall'],
		];
		const patternIndex = row % patterns.length;
		const variant = (isLeftColumn 
			? patterns[patternIndex][0] 
			: patterns[patternIndex][1]
		) as 'tall' | 'medium' | 'short';
		
		// Get discount from pricing rules
		const discount = getProductDiscount(item, pricingRules);
		
		return (
						<ProductCard
							product={item}
							onPress={(productId) => {
								(navigation as any).navigate('ProductDetails', { productId });
							}}
				onCartPress={async (productId) => {
					if (!user?.email) {
						Alert.alert('Login Required', 'Please log in to add items to your cart.');
						return;
					}
					
					try {
						const itemCode = item.itemCode || productId;
						const success = await addItemToCart(itemCode, 1);
						if (success) {
							setToastMessage('Item added to cart!');
							setToastVisible(true);
						}
					} catch (error) {
						console.error('Error adding to cart:', error);
						Alert.alert('Error', 'Failed to add item to cart. Please try again.');
					}
				}}
				onWishlistPress={async (productId) => {
					// Prevent multiple simultaneous operations on the same item
					if (pendingOperations.has(productId)) {
						return;
					}
					
					const isWishlisted = wishlistedProductIds.has(productId);
					
					// Mark operation as pending
					setPendingOperations(prev => new Set(prev).add(productId));
					
					// Optimistic update - immediately update UI
					setOptimisticWishlist(prev => {
						const newSet = new Set(prev);
						if (isWishlisted) {
							newSet.delete(productId);
						} else {
							newSet.add(productId);
						}
						return newSet;
					});
					
					try {
						const success = await toggleWishlist(productId, isWishlisted);
						if (!success) {
							// Revert optimistic update on failure
							setOptimisticWishlist(prev => {
								const newSet = new Set(prev);
								if (isWishlisted) {
									newSet.add(productId); // Re-add if removal failed
								} else {
									newSet.delete(productId); // Remove if add failed
								}
								return newSet;
							});
						}
						// refreshWishlist is called automatically by useWishlistActions
					} finally {
						// Remove from pending immediately after operation completes
						// This allows immediate toggling back and forth
						setPendingOperations(prev => {
							const newSet = new Set(prev);
							newSet.delete(productId);
							return newSet;
						});
					}
				}}
				isWishlisted={wishlistedProductIds.has(item.id)}
				style={styles.newInProductCard}
				variant={variant}
				pricingDiscount={discount}
			/>
		);
	}, [navigation, wishlistedProductIds, toggleWishlist, pricingRules, user, addItemToCart, pendingOperations]);

	// Memoized renderItem for "Deals" products
	const renderDealItem = useCallback(({ item, index }: { item: any; index: number }) => {
		const isLeftColumn = index % 2 === 0;
		const row = Math.floor(index / 2);
		const patterns = [
			['tall', 'short'],
			['medium', 'tall'],
			['short', 'medium'],
			['tall', 'short'],
			['medium', 'tall'],
		];
		const patternIndex = row % patterns.length;
		const variant = (isLeftColumn 
			? patterns[patternIndex][0] 
			: patterns[patternIndex][1]
		) as 'tall' | 'medium' | 'short';
		
		// Get discount from pricing rules (item already has discount from the hook)
		const discount = item.discount || getProductDiscount(item, pricingRules);
		
		return (
			<ProductCard
				product={item}
				onPress={(productId) => {
					(navigation as any).navigate('ProductDetails', { productId });
				}}
				onCartPress={async (productId) => {
					if (!user?.email) {
						Alert.alert('Login Required', 'Please log in to add items to your cart.');
						return;
					}
					
					try {
						const itemCode = item.itemCode || productId;
						const success = await addItemToCart(itemCode, 1);
						if (success) {
							setToastMessage('Item added to cart!');
							setToastVisible(true);
						}
					} catch (error) {
						console.error('Error adding to cart:', error);
						Alert.alert('Error', 'Failed to add item to cart. Please try again.');
					}
				}}
				onWishlistPress={async (productId) => {
					// Prevent multiple simultaneous operations on the same item
					if (pendingOperations.has(productId)) {
						return;
					}
					
					const isWishlisted = wishlistedProductIds.has(productId);
					
					// Mark operation as pending
					setPendingOperations(prev => new Set(prev).add(productId));
					
					// Optimistic update - immediately update UI
					setOptimisticWishlist(prev => {
						const newSet = new Set(prev);
						if (isWishlisted) {
							newSet.delete(productId);
						} else {
							newSet.add(productId);
						}
						return newSet;
					});
					
					try {
						const success = await toggleWishlist(productId, isWishlisted);
						if (!success) {
							// Revert optimistic update on failure
							setOptimisticWishlist(prev => {
								const newSet = new Set(prev);
								if (isWishlisted) {
									newSet.add(productId); // Re-add if removal failed
								} else {
									newSet.delete(productId); // Remove if add failed
								}
								return newSet;
							});
						}
						// refreshWishlist is called automatically by useWishlistActions
					} finally {
						// Remove from pending immediately after operation completes
						// This allows immediate toggling back and forth
						setPendingOperations(prev => {
							const newSet = new Set(prev);
							newSet.delete(productId);
							return newSet;
						});
					}
				}}
				isWishlisted={wishlistedProductIds.has(item.id)}
				style={styles.dealProductCard}
				variant={variant}
				pricingDiscount={discount}
			/>
		);
	}, [navigation, wishlistedProductIds, toggleWishlist, pricingRules, user, addItemToCart, pendingOperations]);

	const renderMainProducts = () => {
		// Only show main products when "For You" is not selected
		if (selectedFilter === 'For You') {
			return null;
		}

		return (
			<View 
				ref={mainProductsLayoutRef}
				style={styles.mainProducts}
				onLayout={(e) => {
					const { y } = e.nativeEvent.layout;
					sectionLayouts.current['mainProducts'] = y;
				}}
			>
				<FlatList
					data={categoryProducts || []}
					numColumns={2}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.productsList}
					scrollEnabled={false}
					renderItem={({ item, index }) => {
						const isLeftColumn = index % 2 === 0;
						const row = Math.floor(index / 2);
						const patterns = [
							['tall', 'short'],
							['medium', 'tall'],
							['short', 'medium'],
							['tall', 'short'],
							['medium', 'tall'],
						];
						const patternIndex = row % patterns.length;
						const variant = (isLeftColumn 
							? patterns[patternIndex][0] 
							: patterns[patternIndex][1]
						) as 'tall' | 'medium' | 'short';
						
						// Get discount from pricing rules
						const discount = getProductDiscount(item, pricingRules);
						
						return (
							<ProductCard
								product={item}
								onPress={(productId) => {
									(navigation as any).navigate('ProductDetails', { productId });
								}}
								onCartPress={async (productId) => {
									if (!user?.email) {
										Alert.alert('Login Required', 'Please log in to add items to your cart.');
										return;
									}
									
									try {
										// Use item.itemCode if available, otherwise fallback to productId
										const itemCode = item.itemCode || productId;
										const success = await addItemToCart(itemCode, 1);
										if (success) {
											// Show a subtle success feedback (you can enhance this later)
											console.log('Item added to cart:', itemCode);
										}
									} catch (error) {
										console.error('Error adding to cart:', error);
										Alert.alert('Error', 'Failed to add item to cart. Please try again.');
									}
								}}
								onWishlistPress={async (productId) => {
									// Prevent multiple simultaneous operations on the same item
									if (pendingOperations.has(productId)) {
										return;
									}
									
									const isWishlisted = wishlistedProductIds.has(productId);
									
									// Mark operation as pending
									setPendingOperations(prev => new Set(prev).add(productId));
									
									// Optimistic update - immediately update UI
									setOptimisticWishlist(prev => {
										const newSet = new Set(prev);
										if (isWishlisted) {
											newSet.delete(productId);
										} else {
											newSet.add(productId);
										}
										return newSet;
									});
									
									try {
										const success = await toggleWishlist(productId, isWishlisted);
										if (!success) {
											// Revert optimistic update on failure
											setOptimisticWishlist(prev => {
												const newSet = new Set(prev);
												if (isWishlisted) {
													newSet.add(productId); // Re-add if removal failed
												} else {
													newSet.delete(productId); // Remove if add failed
												}
												return newSet;
											});
										}
										// refreshWishlist is called automatically by useWishlistActions
									} finally {
										// Remove from pending immediately after operation completes
										// This allows immediate toggling back and forth
										setPendingOperations(prev => {
											const newSet = new Set(prev);
											newSet.delete(productId);
											return newSet;
										});
									}
								}}
								isWishlisted={wishlistedProductIds.has(item.id)}
								style={styles.mainProductCard}
								variant={variant}
								pricingDiscount={discount}
							/>
						);
					}}
					keyExtractor={(item) => item.id}
				/>
			</View>
		);
	};

	const renderCategoryProducts = () => {
		// Only show category products when a specific category is selected (not "All")
		if (selectedCategory === 'All') {
			return null;
		}

		return (
			<View style={styles.categoryView}>
				{isLoadingProducts ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={Colors.SHEIN_RED} />
						<Text style={styles.loadingText}>Loading {selectedCategory} items...</Text>
					</View>
				) : productsError ? (
					<View style={styles.errorContainer}>
						<Ionicons name="alert-circle-outline" size={24} color={Colors.ERROR} />
						<Text style={styles.errorText}>Failed to load {selectedCategory} items</Text>
						<Text style={styles.errorSubtext}>{productsError.message}</Text>
					</View>
				) : displayedProducts && displayedProducts.length > 0 ? (
					<FlatList
						key={`category-${selectedCategory}`}
						data={displayedProducts}
						numColumns={2}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.categoryProductsList}
						columnWrapperStyle={styles.categoryProductRow}
						renderItem={({ item, index }) => {
							const isLeftColumn = index % 2 === 0;
							const row = Math.floor(index / 2);
							const patterns = [
								['tall', 'short'],
								['medium', 'tall'],
								['short', 'medium'],
							];
							const patternIndex = row % patterns.length;
							const variant = (isLeftColumn 
								? patterns[patternIndex][0] 
								: patterns[patternIndex][1]
							) as 'tall' | 'medium' | 'short';
							
							return (
							<ProductCard
								product={item}
								onPress={(productId) => {
									(navigation as any).navigate('ProductDetails', { productId });
								}}
								onCartPress={async (productId) => {
									if (!user?.email) {
										Alert.alert('Login Required', 'Please log in to add items to your cart.');
										return;
									}
									
									try {
										const itemCode = item.itemCode || productId;
										const success = await addItemToCart(itemCode, 1);
										if (success) {
											console.log('Item added to cart:', itemCode);
										}
									} catch (error) {
										console.error('Error adding to cart:', error);
										Alert.alert('Error', 'Failed to add item to cart. Please try again.');
									}
								}}
								onWishlistPress={async (productId) => {
									const isWishlisted = wishlistedProductIds.has(productId);
									const success = await toggleWishlist(productId, isWishlisted);
									if (success) {
										refreshWishlist(); // Refresh wishlist to update UI
									}
								}}
								isWishlisted={wishlistedProductIds.has(item.id)}
								style={styles.categoryProductCard}
								variant={variant}
								pricingDiscount={getProductDiscount(item, pricingRules)}
							/>
							);
						}}
						keyExtractor={(item) => item.id}
					/>
				) : (
					<View style={styles.emptyContainer}>
						<Ionicons name="grid-outline" size={48} color={Colors.TEXT_SECONDARY} />
						<Text style={styles.emptyText}>No items found in {selectedCategory}</Text>
					</View>
				)}
			</View>
		);
	};

	type SectionItem = { 
		type: string; 
		id: string; 
		data?: any;
		ruleName?: string;
		ruleTitle?: string;
		discountPercent?: number;
	};
	
	// Memoized renderItem for "For You" products FlatList
	const renderForYouItem = useCallback(({ item, index }: { item: any; index: number }) => {
		const isLeftColumn = index % 2 === 0;
		const row = Math.floor(index / 2);
		const patterns = [
			['tall', 'short'],
			['medium', 'tall'],
			['short', 'medium'],
			['tall', 'short'],
			['medium', 'tall'],
		];
		const patternIndex = row % patterns.length;
		const variant = (isLeftColumn 
			? patterns[patternIndex][0] 
			: patterns[patternIndex][1]
		) as 'tall' | 'medium' | 'short';
		
		return (
		<ProductCard
			product={item}
			onPress={(productId) => {
				(navigation as any).navigate('ProductDetails', { productId });
			}}
			onCartPress={async (productId) => {
				if (!user?.email) {
					Alert.alert('Login Required', 'Please log in to add items to your cart.');
					return;
				}
				
				try {
					const itemCode = item.itemCode || productId;
					const success = await addItemToCart(itemCode, 1);
					if (success) {
						console.log('Item added to cart:', itemCode);
					}
				} catch (error) {
					console.error('Error adding to cart:', error);
					Alert.alert('Error', 'Failed to add item to cart. Please try again.');
				}
			}}
			onWishlistPress={async (productId) => {
				// Prevent multiple simultaneous operations on the same item
				if (pendingOperations.has(productId)) {
					return;
				}
				
				const isWishlisted = wishlistedProductIds.has(productId);
				
				// Mark operation as pending
				setPendingOperations(prev => new Set(prev).add(productId));
				
				// Optimistic update - immediately update UI
				setOptimisticWishlist(prev => {
					const newSet = new Set(prev);
					if (isWishlisted) {
						newSet.delete(productId);
					} else {
						newSet.add(productId);
					}
					return newSet;
				});
				
				try {
					const success = await toggleWishlist(productId, isWishlisted);
					if (!success) {
						// Revert optimistic update on failure
						setOptimisticWishlist(prev => {
							const newSet = new Set(prev);
							if (isWishlisted) {
								newSet.add(productId); // Re-add if removal failed
							} else {
								newSet.delete(productId); // Remove if add failed
							}
							return newSet;
						});
					}
					// refreshWishlist is called automatically by useWishlistActions
				} finally {
					// Remove from pending immediately after operation completes
					// This allows immediate toggling back and forth
					setPendingOperations(prev => {
						const newSet = new Set(prev);
						newSet.delete(productId);
						return newSet;
					});
				}
			}}
			isWishlisted={wishlistedProductIds.has(item.id)}
			style={styles.forYouProductCard}
			variant={variant}
		/>
	);
	}, [navigation, wishlistedProductIds, toggleWishlist, refreshWishlist]);
	
	const renderSection = useCallback(({ item }: { item: SectionItem }) => {
		// Hide all sections except header and category tabs when a category is selected
		if (selectedCategory !== 'All' && item.type !== 'header' && item.type !== 'categoryTabs') {
			return null;
		}

		switch (item.type) {
			case 'header':
				return renderHeader();
			case 'topCustomerAward':
				// Show loading state or error for debugging
				if (topCustomersLoading) {
					return (
						<View style={{ padding: 20, alignItems: 'center' }}>
							<Text style={{ color: Colors.TEXT_SECONDARY }}>Loading top customer...</Text>
						</View>
					);
				}
				if (topCustomersError) {
					return (
						<View style={{ padding: 20, alignItems: 'center' }}>
							<Text style={{ color: Colors.ERROR }}>Error loading top customer: {topCustomersError instanceof Error ? topCustomersError.message : 'Unknown error'}</Text>
						</View>
					);
				}
				if (!topCustomer || !topCustomersData) {
					return (
						<View style={{ padding: 20, alignItems: 'center' }}>
							<Text style={{ color: Colors.TEXT_SECONDARY }}>No top customer data available</Text>
						</View>
					);
				}
				return (
					<View style={styles.topCustomerSection}>
						{topCustomersData?.top_items && topCustomersData.top_items.length > 0 && (
							<View style={styles.trendingItemsSection}>
								<View style={styles.superDealsTitleContainer}>
									<View style={styles.titleWithIcon}>
										<Ionicons name="trending-up" size={12} color={Colors.WHITE} />
										<Text style={styles.superDealsTitle}>Trending Items and Combos</Text>
									</View>
								</View>
								{trendingProductsLoading ? (
									<View style={styles.trendingLoadingContainer}>
										<ActivityIndicator size="small" color={Colors.SHEIN_RED} />
									</View>
								) : trendingProducts.length > 0 ? (
									<FlatList
										data={trendingProducts}
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.trendingProductsList}
										renderItem={({ item }: { item: Product }) => {
											const discount = getProductDiscount(item, pricingRules);
											return (
												<ProductCard
													product={item}
													onPress={(productId) => {
														(navigation as any).navigate('ProductDetails', { productId });
													}}
													onCartPress={async (productId) => {
														try {
															await addItemToCart(productId, 1);
															setToastMessage('Added to cart!');
															setToastVisible(true);
														} catch (error) {
															setToastMessage('Failed to add to cart');
															setToastVisible(true);
														}
													}}
													onWishlistPress={async (productId) => {
														const isCurrentlyWishlisted = wishlistedProductIds.has(productId);
														setOptimisticWishlist(prev => {
															const newSet = new Set(prev);
															if (isCurrentlyWishlisted) {
																newSet.delete(productId);
															} else {
																newSet.add(productId);
															}
															return newSet;
														});
														setPendingOperations(prev => new Set(prev).add(productId));
														try {
															const success = await toggleWishlist(productId, isCurrentlyWishlisted);
															if (success) {
																setToastMessage(isCurrentlyWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
																setToastVisible(true);
															}
														} catch (error) {
															setOptimisticWishlist(prev => {
																const newSet = new Set(prev);
																if (isCurrentlyWishlisted) {
																	newSet.add(productId);
																} else {
																	newSet.delete(productId);
																}
																return newSet;
															});
															setToastMessage('Failed to update wishlist');
															setToastVisible(true);
														} finally {
															setPendingOperations(prev => {
																const newSet = new Set(prev);
																newSet.delete(productId);
																return newSet;
															});
														}
													}}
													isWishlisted={wishlistedProductIds.has(item.id)}
													style={styles.trendingProductCard}
													pricingDiscount={discount}
												/>
											);
										}}
										keyExtractor={(item) => item.id}
									/>
								) : null}
							</View>
						)}
					</View>
				);
			case 'topItemsCarousel':
				// This case is now handled within topCustomerAward case
				return null;
			case 'categoryTabs':
				return (
					<CategoryTabs 
						selectedCategory={selectedCategory}
						onSelectCategory={handleCategorySelect}
						variant="red"
						showMenuIcon={true}
					/>
				);
			case 'shippingBanner':
				return renderShippingBanner();
			case 'superDeals':
				return renderSuperDeals();
			case 'pricingRule':
				return renderDealSection(
					item.ruleName || '',
					item.ruleTitle || 'Deal',
					item.discountPercent || 0
				);
			case 'filterTabs':
				return renderFilterTabs();
			case 'mainProducts':
				// Only render mainProducts when filter is "Best Sellers"
				if (selectedFilter === 'For You' || selectedFilter === 'New In' || selectedFilter === 'Deals') {
					return null;
				}
				return renderMainProducts();
			case 'forYouProducts':
				// Only render forYouProducts when filter IS "For You"
				if (selectedFilter !== 'For You' || selectedCategory !== 'All') {
					return null;
				}
				// Render "For You" products in a grid
				return (
					<View style={styles.forYouProductsSection}>
						<FlatList
							data={sortedForYouProducts}
							numColumns={2}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={styles.forYouProductsList}
							columnWrapperStyle={styles.forYouProductRow}
							scrollEnabled={false}
							renderItem={renderForYouItem}
							keyExtractor={(item) => item.id}
							removeClippedSubviews={true}
							initialNumToRender={6}
							maxToRenderPerBatch={4}
							windowSize={10}
							ListEmptyComponent={
							forYouError ? (
									<View style={styles.errorContainer}>
										<Ionicons name="alert-circle-outline" size={24} color={Colors.ERROR} />
										<Text style={styles.errorText}>Failed to load products</Text>
										<Text style={styles.errorSubtext}>{forYouError.message}</Text>
									</View>
								) : (
									<View style={styles.emptyContainer}>
										<Text style={styles.emptyText}>No products available</Text>
									</View>
								)
							}
							ListFooterComponent={
							!forYouHasMore && forYouProducts.length > 0 ? (
									<View style={styles.loadMoreContainer}>
										<Text style={styles.loadMoreText}>No more products</Text>
									</View>
								) : null
							}
						/>
					</View>
				);
			case 'newInProducts':
				// Only render newInProducts when filter IS "New In"
				if (selectedFilter !== 'New In' || selectedCategory !== 'All') {
					return null;
				}
				// Render "New In" products (New Arrivals) in a grid
				return (
					<View style={styles.newInProductsSection}>
						<FlatList
							data={newArrivals || []}
							numColumns={2}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={styles.newInProductsList}
							columnWrapperStyle={styles.newInProductRow}
							scrollEnabled={false}
							renderItem={renderNewInItem}
							keyExtractor={(item) => item.id}
							removeClippedSubviews={true}
							initialNumToRender={6}
							maxToRenderPerBatch={4}
							windowSize={10}
							ListEmptyComponent={
							newArrivalsError ? (
									<View style={styles.errorContainer}>
										<Ionicons name="alert-circle-outline" size={24} color={Colors.ERROR} />
										<Text style={styles.errorText}>Failed to load new arrivals</Text>
										<Text style={styles.errorSubtext}>{newArrivalsError.message}</Text>
									</View>
								) : (
									<View style={styles.emptyContainer}>
										<Text style={styles.emptyText}>No new arrivals available</Text>
									</View>
								)
							}
							ListFooterComponent={
							!newArrivalsHasMore && newArrivals.length > 0 ? (
									<View style={styles.loadMoreContainer}>
										<Text style={styles.loadMoreText}>No more products</Text>
									</View>
								) : null
							}
						/>
					</View>
				);
			case 'dealProducts':
				// Only render dealProducts when filter IS "Deals"
				if (selectedFilter !== 'Deals' || selectedCategory !== 'All') {
					return null;
				}
				// Render "Deals" products in a grid
				return (
					<View style={styles.dealProductsSection}>
						<FlatList
							data={dealProducts || []}
							numColumns={2}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={styles.dealProductsList}
							columnWrapperStyle={styles.dealProductRow}
							scrollEnabled={false}
							renderItem={renderDealItem}
							keyExtractor={(item) => item.id}
							removeClippedSubviews={true}
							initialNumToRender={6}
							maxToRenderPerBatch={4}
							windowSize={10}
							ListEmptyComponent={
							dealProductsError ? (
									<View style={styles.errorContainer}>
										<Ionicons name="alert-circle-outline" size={24} color={Colors.ERROR} />
										<Text style={styles.errorText}>Failed to load deals</Text>
										<Text style={styles.errorSubtext}>Please try again later</Text>
									</View>
								) : (
									<View style={styles.emptyContainer}>
										<Text style={styles.emptyText}>No deals available</Text>
									</View>
								)
							}
							ListFooterComponent={
							!dealProductsHasMore && dealProducts.length > 0 ? (
									<View style={styles.loadMoreContainer}>
										<Text style={styles.loadMoreText}>No more products</Text>
									</View>
								) : null
							}
						/>
					</View>
				);
			default:
				return null;
		}
	}, [
		selectedCategory,
		selectedFilter,
		renderHeader,
		renderShippingBanner,
		renderSuperDeals,
		renderDealSection,
		renderFilterTabs,
		renderMainProducts,
		renderForYouItem,
		renderNewInItem,
		renderDealItem,
		forYouProducts,
		dealProducts,
		forYouLoading,
		forYouError,
		forYouLoadingMore,
		forYouHasMore,
		forYouLoadMore,
		newArrivals,
		newArrivalsError,
		newArrivalsHasMore,
		newArrivalsLoadingMore,
		newArrivalsLoading,
		dealProducts,
		dealProductsHasMore,
		dealProductsLoadingMore,
		dealProductsError,
		allDealProducts,
		pricingRules,
		productsByRule,
		topCustomer,
		topCustomersData,
		topCustomersLoading,
		topCustomersError,
		navigation,
	]);

	// NOTE: We now use a single FlatList for all filters to prevent remounting and scroll resets
	// The "For You" products are rendered as a section in the main list instead of a separate FlatList

	// Calculate approximate heights for getItemLayout
	// This helps FlatList scroll to the correct position immediately
	// MUST be defined before useEffect that uses it
	const getItemLayout = useCallback((data: any, index: number) => {
		// Approximate section heights (in pixels)
		const sectionHeights: { [key: string]: number } = {
			'header': 60,
			'categoryTabs': 50,
			'shippingBanner': 40,
			'latestCarousel': 280,
			'newArrivals': 200,
			'topCustomerAward': 200, // Increased to account for carousel
			'superDeals': 150,
			'pricingRule': 150, // Dynamic pricing rule sections
			'filterTabs': 50,
			'mainProducts': 200,
			'forYouProducts': 0, // Height varies, will be calculated dynamically
			'newInProducts': 0, // Height varies, will be calculated dynamically
			'dealProducts': 0, // Height varies, will be calculated dynamically
		};

		let offset = 0;
		for (let i = 0; i < index; i++) {
			const section = sections[i];
			if (section.id === 'forYouProducts' && selectedFilter === 'For You') {
				// Estimate height based on number of products (2 columns, variable heights)
				const estimatedRows = Math.ceil(forYouProducts.length / 2);
				offset += estimatedRows * 250; // Average row height
			} else if (section.id === 'newInProducts' && selectedFilter === 'New In') {
				// Estimate height based on number of new arrivals (2 columns, variable heights)
				const estimatedRows = Math.ceil((newArrivals?.length || 0) / 2);
				offset += estimatedRows * 250; // Average row height
			} else if (section.id === 'dealProducts' && selectedFilter === 'Deals') {
				// Estimate height based on number of deal products (2 columns, variable heights)
				const estimatedRows = Math.ceil((dealProducts?.length || 0) / 2);
				offset += estimatedRows * 250; // Average row height
			} else if (section.type === 'pricingRule') {
				offset += sectionHeights['pricingRule'] || 150;
			} else {
				offset += sectionHeights[section.id] || 200; // Default to 200 if unknown
			}
		}

		const currentSection = sections[index];
		let length = currentSection?.type === 'pricingRule' 
			? (sectionHeights['pricingRule'] || 150)
			: (sectionHeights[currentSection?.id] || 200);
		
		// Special handling for forYouProducts (dynamic height)
		if (currentSection?.id === 'forYouProducts' && selectedFilter === 'For You') {
			const estimatedRows = Math.ceil(forYouProducts.length / 2);
			length = estimatedRows * 250; // Average row height
		}
		
		// Special handling for newInProducts (dynamic height)
		if (currentSection?.id === 'newInProducts' && selectedFilter === 'New In') {
			const estimatedRows = Math.ceil((newArrivals?.length || 0) / 2);
			length = estimatedRows * 250; // Average row height
		}
		
		// Special handling for dealProducts (dynamic height)
		if (currentSection?.id === 'dealProducts' && selectedFilter === 'Deals') {
			const estimatedRows = Math.ceil((dealProducts?.length || 0) / 2);
			length = estimatedRows * 250; // Average row height
		}

		return {
			length,
			offset,
			index,
		};
	}, [sections, selectedFilter, forYouProducts.length, newArrivals?.length, dealProducts?.length]);

	// Store scroll position to restore when switching filters
	const scrollPositionRef = useRef<number>(0);
	const isScrollingRef = useRef<boolean>(false);

	// Handle scroll position when switching from "For You" to another filter
	// Use a ref to track if we need to scroll, and do it in onLayout of the first visible item
	const needsScrollRef = useRef(false);
	const targetScrollOffsetRef = useRef<number | null>(null);

	useEffect(() => {
		if (shouldScrollToFilterTabs && selectedFilter !== 'For You' && selectedCategory === 'All') {
			const filterTabsIndex = sections.findIndex(s => s.id === 'filterTabs');
			if (filterTabsIndex >= 0) {
				const layout = getItemLayout(null, filterTabsIndex);
				targetScrollOffsetRef.current = layout.offset;
				needsScrollRef.current = true;
				setShouldScrollToFilterTabs(false);
				
				// Try to scroll immediately if list is already mounted
				if (mainListRef.current) {
					// Use multiple strategies to scroll before paint
					const scrollNow = () => {
						if (mainListRef.current && targetScrollOffsetRef.current !== null) {
							mainListRef.current.scrollToOffset({ 
								offset: targetScrollOffsetRef.current,
								animated: false
							});
							needsScrollRef.current = false;
							targetScrollOffsetRef.current = null;
						}
					};
					
					// Try synchronously first (may not work if content not laid out)
					scrollNow();
					
					// Then try on next frame
					requestAnimationFrame(scrollNow);
					
					// And as a final fallback
					setTimeout(scrollNow, 0);
				}
			}
		}
	}, [shouldScrollToFilterTabs, selectedFilter, selectedCategory, sections, getItemLayout]);

	// Handle scroll when content size changes - this is our main opportunity to scroll
	const handleContentSizeChange = useCallback((contentWidth: number, contentHeight: number) => {
		if (needsScrollRef.current && targetScrollOffsetRef.current !== null && mainListRef.current) {
			// Content is now laid out, scroll immediately
			mainListRef.current.scrollToOffset({ 
				offset: targetScrollOffsetRef.current,
				animated: false
			});
			needsScrollRef.current = false;
			targetScrollOffsetRef.current = null;
		}
	}, []);

	// Handle infinite scroll for "For You", "New In", and "Deals" products
	const handleEndReached = useCallback(() => {
		if (selectedFilter === 'For You' && forYouHasMore && !forYouLoadingMore && !forYouLoading) {
			forYouLoadMore();
		} else if (selectedFilter === 'New In' && newArrivalsHasMore && !newArrivalsLoadingMore && !newArrivalsLoading) {
			newArrivalsLoadMore();
		} else if (selectedFilter === 'Deals' && dealProductsHasMore && !dealProductsLoadingMore) {
			loadMoreDealProducts();
		}
	}, [selectedFilter, forYouHasMore, forYouLoadingMore, forYouLoading, forYouLoadMore, newArrivalsHasMore, newArrivalsLoadingMore, newArrivalsLoading, newArrivalsLoadMore, dealProductsHasMore, dealProductsLoadingMore, loadMoreDealProducts]);

	// Track scroll position to maintain it when switching filters
	const handleScroll = useCallback((event: any) => {
		if (!isScrollingRef.current) {
			scrollPositionRef.current = event.nativeEvent.contentOffset.y;
		}
	}, []);

	// Show loading screen on initial load
	if (isInitialLoading) {
		return <LoadingScreen />;
	}

	return (
		<SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
			<Toast
				message={toastMessage}
				type="success"
				visible={toastVisible}
				onHide={() => setToastVisible(false)}
			/>
			<FlatList
				ref={mainListRef}
				key={mainListKey}
				data={sections}
				renderItem={renderSection}
				keyExtractor={(item) => item.id}
				showsVerticalScrollIndicator={false}
				ListFooterComponent={renderCategoryProducts}
				getItemLayout={getItemLayout}
				onContentSizeChange={handleContentSizeChange}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				stickyHeaderIndices={stickyHeaderIndex !== undefined ? [stickyHeaderIndex] : []}
				onEndReached={(selectedFilter === 'For You' || selectedFilter === 'New In' || selectedFilter === 'Deals') ? handleEndReached : undefined}
				onEndReachedThreshold={(selectedFilter === 'For You' || selectedFilter === 'New In' || selectedFilter === 'Deals') ? 0.5 : undefined}
				removeClippedSubviews={true}
				initialNumToRender={5}
				maxToRenderPerBatch={3}
				updateCellsBatchingPeriod={50}
				windowSize={10}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={Colors.SHEIN_PINK}
						colors={[Colors.SHEIN_PINK]}
					/>
				}
				maintainVisibleContentPosition={
					// Prevent scroll jumps when content changes
					needsScrollRef.current ? undefined : {
						minIndexForVisible: 0,
						autoscrollToTopThreshold: 100,
					}
				}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.BACKGROUND,
	},
	stickyHeaderWrapper: {
		backgroundColor: '#DC143C',
		zIndex: 2000,
	},
	topCustomerSection: {
		marginBottom: 0,
		width: '100%',
		overflow: 'visible',
	},
	curvyBanner: {
		width: '100%',
		height: 30,
		marginVertical: Spacing.MARGIN_SM,
		overflow: 'hidden',
	},
	waveSvg: {
		position: 'absolute',
		top: 0,
		left: 0,
	},
	trendingItemsSection: {
		width: '100%',
		marginBottom: 0,
	},
	trendingItemsTitle: {
		fontSize: Typography.FONT_SIZE_MD,
		fontWeight: Typography.FONT_WEIGHT_BOLD,
		color: Colors.TEXT_PRIMARY,
		marginBottom: Spacing.MARGIN_XS,
	},
	trendingProductsList: {
		paddingLeft: Spacing.SCREEN_PADDING,
		paddingTop: Spacing.PADDING_SM,
		paddingRight: Spacing.SCREEN_PADDING,
	},
	trendingProductCard: {
		width: (width - Spacing.SCREEN_PADDING * 3) / 2,
		marginRight: Spacing.MARGIN_SM,
	},
	trendingLoadingContainer: {
		paddingVertical: Spacing.PADDING_MD,
		alignItems: 'center',
		justifyContent: 'center',
	},
	topCustomerScrollContent: {
		alignItems: 'center',
		paddingRight: Spacing.SCREEN_PADDING,
		gap: Spacing.MARGIN_MD,
	},
	categoryTabs: {
		paddingVertical: 0,
		borderBottomWidth: 1,
		borderBottomColor: Colors.BORDER,
	},
	categoryTab: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		marginHorizontal: 4,
		borderRadius: 20,
	},
	categoryTabActive: {
		backgroundColor: Colors.BLACK,
	},
	categoryTabText: {
		fontSize: 14,
		color: Colors.TEXT_SECONDARY,
		fontWeight: '500',
	},
	categoryTabTextActive: {
		color: Colors.WHITE,
	},
	bannerCarouselContainer: {
		alignItems: 'center',
		paddingVertical: 0,
		marginVertical: 0,
	},
	bannerCarouselItem: {
		width: width,
		justifyContent: 'center',
		alignItems: 'center',
		marginVertical: 0,
		paddingVertical: 0,
	},
	shippingBannerContainer: {
		paddingHorizontal: 0,
		paddingVertical: 0,
		width: '100%',
	},
	shippingBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFE5E5',
		paddingVertical: Spacing.PADDING_XS,
		paddingHorizontal: Spacing.PADDING_MD,
		gap: 6,
		width: '100%',
		height: 36,
	},
	shippingText: {
		fontSize: Typography.FONT_SIZE_SM,
		color: Colors.BLACK,
		fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
	},
	topCustomerBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFF5E6',
		paddingVertical: Spacing.PADDING_SM,
		paddingHorizontal: Spacing.PADDING_MD,
		width: '100%',
		height: 40,
		borderLeftWidth: 3,
		borderLeftColor: Colors.GOLD,
		shadowColor: Colors.BLACK,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	topCustomerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.MARGIN_SM,
		flex: 1,
	},
	trophyIconContainer: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: Colors.WHITE,
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: Colors.GOLD,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.3,
		shadowRadius: 2,
		elevation: 2,
	},
	topCustomerTextContainer: {
		flexDirection: 'column',
		gap: 1,
	},
	topCustomerBannerText: {
		fontSize: Typography.FONT_SIZE_SM,
		color: Colors.BLACK,
		fontWeight: Typography.FONT_WEIGHT_BOLD,
		letterSpacing: 0.3,
	},
	topCustomerBannerSubtext: {
		fontSize: Typography.FONT_SIZE_XS,
		color: Colors.TEXT_SECONDARY,
		fontWeight: Typography.FONT_WEIGHT_MEDIUM,
	},
	topCustomerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.MARGIN_XS,
		flexShrink: 1,
	},
	topCustomerBannerName: {
		fontSize: Typography.FONT_SIZE_SM,
		color: Colors.BLACK,
		fontWeight: Typography.FONT_WEIGHT_BOLD,
		fontStyle: 'italic',
		textAlign: 'right',
	},
	section: {
		paddingVertical: 16,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		marginBottom: 12,
		gap: Spacing.MARGIN_SM,
	},
	superDealsHeaderContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
		gap: Spacing.MARGIN_SM,
	},
	headerRightActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.MARGIN_SM,
	},
	viewMoreButton: {
		paddingHorizontal: Spacing.PADDING_SM,
	},
	sectionTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	superDealsTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 2,
		backgroundColor: Colors.BLACK,
		paddingHorizontal: Spacing.PADDING_SM,
		paddingVertical: 2,
		borderRadius: 0,
		width: '100%',
		marginBottom: Spacing.MARGIN_SM,
	},
	titleWithIcon: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	superDealsTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		color: Colors.WHITE,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		color: Colors.BLACK,
	},
	sectionSubtitle: {
		fontSize: 14,
		color: Colors.TEXT_SECONDARY,
	},
	viewMoreText: {
		fontSize: 14,
		color: Colors.SHEIN_PINK,
		fontWeight: '500',
	},
	viewMoreTextWhite: {
		fontSize: 12,
		color: Colors.WHITE,
		fontWeight: '500',
	},
	productsList: {
		paddingHorizontal: 16,
	},
	productCard: {
		width: 100,
		marginRight: 12,
	},
	productImage: {
		width: 100,
		height: 120,
		backgroundColor: Colors.LIGHT_GRAY,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 8,
		position: 'relative',
	},
	productEmoji: {
		fontSize: 40,
	},
	discountTag: {
		position: 'absolute',
		top: 8,
		left: 8,
		backgroundColor: Colors.FLASH_SALE_RED,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	discountText: {
		fontSize: 12,
		color: Colors.WHITE,
		fontWeight: 'bold',
	},
	productImageContent: {
		width: '100%',
		height: '100%',
		borderRadius: 8,
	},
	productImagePlaceholder: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.LIGHT_GRAY,
		borderRadius: 8,
	},
	productName: {
		fontSize: 12,
		color: Colors.TEXT_PRIMARY,
		textAlign: 'center',
		marginBottom: 4,
		minHeight: 32,
	},
	productPrice: {
		fontSize: 14,
		fontWeight: '500',
		color: Colors.BLACK,
		textAlign: 'center',
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	originalPrice: {
		fontSize: 12,
		color: Colors.TEXT_SECONDARY,
		textDecorationLine: 'line-through',
		textAlign: 'center',
		marginLeft: 4,
	},
	filterTabs: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.BORDER,
	},
	filterTab: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
		marginRight: 12,
		borderRadius: 20,
		gap: 4,
	},
	filterTabActive: {
		backgroundColor: Colors.DARK_GRAY,
	},
	filterTabText: {
		fontSize: 14,
		color: Colors.BLACK,
		fontWeight: '500',
	},
	filterTabTextActive: {
		color: Colors.WHITE,
	},
	mainProducts: {
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	mainProductCard: {
		marginBottom: 16,
	},
	mainProductImage: {
		width: '100%',
		height: 200,
		backgroundColor: Colors.LIGHT_GRAY,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 8,
		position: 'relative',
	},
	mainProductEmoji: {
		fontSize: 60,
	},
	productTag: {
		position: 'absolute',
		bottom: 8,
		left: 8,
		backgroundColor: Colors.SHEIN_PINK,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	productTagText: {
		fontSize: 12,
		color: Colors.WHITE,
		fontWeight: 'bold',
	},
	mainProductPrice: {
		fontSize: 16,
		fontWeight: '500',
		color: Colors.BLACK,
	},
	newArrivalsList: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	newArrivalCard: {
		marginRight: 12,
		width: 160,
	},
	loadingContainer: {
		padding: 60,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 14,
		color: Colors.TEXT_SECONDARY,
		fontWeight: '500',
	},
	errorContainer: {
		padding: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	errorText: {
		marginTop: 12,
		fontSize: 16,
		color: Colors.ERROR,
		fontWeight: '600',
	},
	errorSubtext: {
		marginTop: 8,
		fontSize: 12,
		color: Colors.TEXT_SECONDARY,
		textAlign: 'center',
	},
	emptyContainer: {
		padding: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyText: {
		fontSize: 14,
		color: Colors.TEXT_SECONDARY,
	},
	categoryView: {
		flex: 1,
		paddingTop: 16,
	},
	categoryProductsList: {
		paddingHorizontal: Spacing.SCREEN_PADDING,
		paddingTop: Spacing.PADDING_MD,
		paddingBottom: 100,
	},
	categoryProductRow: {
		justifyContent: 'space-between',
		marginBottom: Spacing.MARGIN_SM,
		gap: Spacing.MARGIN_XS,
	},
	categoryProductCard: {
		width: ((width - Spacing.SCREEN_PADDING * 2 - Spacing.MARGIN_SM) / 2) * 0.85,
		marginBottom: 0, // Row spacing handled by columnWrapperStyle
	},
	emptyPageContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 100,
	},
	emptyPageText: {
		fontSize: 16,
		color: Colors.TEXT_SECONDARY,
		marginTop: 16,
		textAlign: 'center',
	},
	forYouSection: {
		paddingVertical: 16,
	},
	forYouProductsSection: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 100,
	},
	forYouProductsList: {
		paddingHorizontal: Spacing.SCREEN_PADDING,
		paddingTop: Spacing.PADDING_MD,
		paddingBottom: 16,
	},
	forYouProductRow: {
		justifyContent: 'space-between',
		marginBottom: Spacing.MARGIN_SM,
	},
	forYouProductCard: {
		width: (width - Spacing.SCREEN_PADDING * 2 - Spacing.MARGIN_SM) / 2,
		marginBottom: 0, // Row spacing handled by columnWrapperStyle
	},
	newInProductsSection: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 100,
	},
	newInProductsList: {
		paddingHorizontal: Spacing.SCREEN_PADDING,
		paddingTop: Spacing.PADDING_MD,
		paddingBottom: 16,
	},
	newInProductRow: {
		justifyContent: 'space-between',
		marginBottom: Spacing.MARGIN_SM,
	},
	newInProductCard: {
		width: (width - Spacing.SCREEN_PADDING * 2 - Spacing.MARGIN_SM) / 2,
		marginBottom: 0, // Row spacing handled by columnWrapperStyle
	},
	dealProductsSection: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 100,
	},
	dealProductsList: {
		paddingHorizontal: Spacing.SCREEN_PADDING,
		paddingTop: Spacing.PADDING_MD,
		paddingBottom: 16,
	},
	dealProductRow: {
		justifyContent: 'space-between',
		marginBottom: Spacing.MARGIN_SM,
	},
	dealProductCard: {
		width: (width - Spacing.SCREEN_PADDING * 2 - Spacing.MARGIN_SM) / 2,
		marginBottom: 0, // Row spacing handled by columnWrapperStyle
	},
	loadMoreContainer: {
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadMoreText: {
		marginTop: 8,
		fontSize: 14,
		color: Colors.TEXT_SECONDARY,
	},
	filterContainer: {
		paddingHorizontal: Spacing.PADDING_MD,
		paddingVertical: Spacing.PADDING_SM,
		backgroundColor: Colors.WHITE,
		borderBottomWidth: 1,
		borderBottomColor: Colors.BORDER,
	},
	comboDealsButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.WHITE,
		borderWidth: 1,
		borderColor: Colors.SHEIN_RED,
		borderRadius: Spacing.BORDER_RADIUS_SM,
		paddingVertical: Spacing.PADDING_XS,
		paddingHorizontal: Spacing.PADDING_SM,
		gap: 4,
	},
	comboDealsText: {
		fontSize: Typography.FONT_SIZE_SM,
		fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
		color: Colors.SHEIN_RED,
	},
});

