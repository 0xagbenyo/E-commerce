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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { useNewArrivals, useProductsByCategory, useForYouProducts, usePricingRuleFields, usePricingRules, useWishlistActions, useWishlist, useCartActions } from '../hooks/erpnext';
import { useUserSession } from '../context/UserContext';
import { ProductCard } from '../components/ProductCard';
import { LoadingScreen } from '../components/LoadingScreen';
import { CategoryTabs } from '../components/CategoryTabs';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
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
	const [selectedCategory, setSelectedCategory] = useState('All');
	const [selectedFilter, setSelectedFilter] = useState('For You');
	const [shouldScrollToFilterTabs, setShouldScrollToFilterTabs] = useState(false);
	const forYouListRef = useRef<FlatList>(null);
	const mainListRef = useRef<FlatList>(null);
	const navigation = useNavigation();
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
	
	// Fetch pricing rule fields (logs all available fields)
	const { data: pricingRuleFields } = usePricingRuleFields();
	
	// Fetch pricing rules for discounts
	const { data: pricingRules = [], loading: pricingRulesLoading } = usePricingRules();
	
	// Log pricing rule fields when available
	useEffect(() => {
		if (pricingRuleFields) {
			console.log('💰 PRICING RULE FIELDS:', pricingRuleFields);
		}
	}, [pricingRuleFields]);
	
	// Log pricing rules when available
	useEffect(() => {
		if (pricingRules && pricingRules.length > 0) {
			console.log('💰 PRICING RULES FETCHED:', pricingRules.length, 'rules');
			pricingRules.slice(0, 3).forEach((rule: any) => {
				console.log(`  - ${rule.name}: ${rule.discount_percentage}% (${rule.item_code || rule.item_group})`);
			});
		}
	}, [pricingRules]);
	
	// Fetch new arrivals from API (only when "All" is selected)
	const { data: newArrivals, loading: newArrivalsLoading, error: newArrivalsError, refresh: refreshNewArrivals } = useNewArrivals(20);
	
	// Fetch products by category when a category is selected (not "All")
	const { data: categoryProducts, loading: categoryLoading, error: categoryError, refresh: refreshCategoryProducts } = useProductsByCategory(
		itemGroupName || '',
		itemGroupName ? 50 : 0 // Only fetch if category is selected
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

	// Fetch products grouped by pricing rules
	const [productsByRule, setProductsByRule] = useState<Record<string, any[]>>({});
	const [allDealProducts, setAllDealProducts] = useState<any[]>([]);
	const [loadingDeals, setLoadingDeals] = useState(false);
	
	// Check if page is initially loading (fresh load - no data loaded yet)
	const isInitialLoading = (!newArrivals && newArrivalsLoading) && 
		(!pricingRules || pricingRules.length === 0);

	useEffect(() => {
		const fetchDealProducts = async () => {
			if (!pricingRules || pricingRules.length === 0) {
				setProductsByRule({});
				setAllDealProducts([]);
				return;
			}

			setLoadingDeals(true);
			try {
				const client = getERPNextClient();
				const productsByRuleMap: Record<string, any[]> = {};
				const allProducts: any[] = [];

				// Extract item codes and item groups from pricing rules
				for (const rule of pricingRules) {
					const ruleAny = rule as any;
					const ruleName = rule.name || ruleAny.name || 'Unknown';
					const ruleProducts: any[] = [];
					
					// Fetch products by item codes
					if (ruleAny.items && Array.isArray(ruleAny.items)) {
						for (const item of ruleAny.items) {
							if (item && item.item_code) {
								try {
									// Use getItem which handles both name and item_code lookup
									const websiteItem = await client.getItem(item.item_code);
									
									if (websiteItem) {
										const product = mapERPWebsiteItemToProduct(websiteItem);
										// Use rule's discount percentage if product is in the rule
										// Fallback to calculated discount if available
										const calculatedDiscount = getProductDiscount(product, pricingRules);
										const ruleDiscount = ruleAny.discount_percentage || 0;
										const discount = calculatedDiscount > 0 ? calculatedDiscount : ruleDiscount;
										
										// If product is in a pricing rule, show it even if discount calculation fails
										if (discount > 0 || ruleDiscount > 0) {
											const productWithDiscount = {
												...product,
												discount: discount > 0 ? discount : ruleDiscount,
												ruleName
											};
											ruleProducts.push(productWithDiscount);
											allProducts.push(productWithDiscount);
										}
									}
								} catch (error: any) {
									// Silently skip items that don't exist - this is expected for some item codes
									// Only log if it's not a "not found" error
									if (error?.message && !error.message.includes('not found') && !error.message.includes('DoesNotExistError')) {
										console.warn(`Failed to fetch product ${item.item_code}:`, error.message);
									}
								}
							}
						}
					}

					// Fetch products by item groups
					if (ruleAny.item_groups && Array.isArray(ruleAny.item_groups)) {
						for (const itemGroup of ruleAny.item_groups) {
							if (itemGroup && itemGroup.item_group) {
								try {
									const websiteItems = await client.getItemsByGroup(itemGroup.item_group, 50);
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

				// Remove duplicates from all products and sort by discount
				const uniqueAllProducts = Array.from(
					new Map(allProducts.map((p: any) => [p.id, p])).values()
				).sort((a: any, b: any) => b.discount - a.discount);

				setProductsByRule(productsByRuleMap);
				setAllDealProducts(uniqueAllProducts);
			} catch (error) {
				console.error('Error fetching deal products:', error);
				setProductsByRule({});
				setAllDealProducts([]);
			} finally {
				setLoadingDeals(false);
			}
		};

		fetchDealProducts();
	}, [pricingRules]);

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
			{ type: 'categoryTabs', id: 'categoryTabs' },
			{ type: 'shippingBanner', id: 'shippingBanner' },
			{ type: 'newArrivals', id: 'newArrivals' },
			{ type: 'superDeals', id: 'superDeals' },
			...pricingRuleSections,
			{ type: 'filterTabs', id: 'filterTabs' },
			{ type: 'mainProducts', id: 'mainProducts' }, // Always include, renderSection will conditionally show
			{ type: 'forYouProducts', id: 'forYouProducts' }, // Always include, renderSection will conditionally show
		];
		
		return baseSections;
	};
	
	const sections = getSections();

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

	const renderHeader = () => <Header />;


	const renderShippingBanner = () => {
		// Get the latest pricing rule (first one in the array)
		const latestRule = pricingRules && pricingRules.length > 0 ? pricingRules[0] : null;
		const latestRuleName = latestRule?.name || (latestRule as any)?.name;
		const latestRuleProducts = latestRuleName ? (productsByRule[latestRuleName] || []) : [];
		const discountPercent = latestRule?.discount_percentage || (latestRule as any)?.discount_percentage || 0;
		
		const handleBannerPress = () => {
			if (latestRuleProducts.length > 0) {
				(navigation as any).navigate('AllDeals', { deals: latestRuleProducts });
			}
		};
		
		// Show banner only if there's a discount
		if (discountPercent === 0 && latestRuleProducts.length === 0) {
			return null;
		}
		
		return (
					<TouchableOpacity
				style={styles.shippingBanner}
				onPress={handleBannerPress}
				activeOpacity={0.7}
				disabled={latestRuleProducts.length === 0}
			>
				<Ionicons name="pricetag" size={16} color={Colors.BLACK} />
				<Text style={styles.shippingText}>Get {discountPercent}% Off</Text>
					</TouchableOpacity>
		);
	};

	const renderSuperDeals = () => {
		const firstFiveDeals = allDealProducts.slice(0, 5);
		
		if (loadingDeals) {
			return null; // Don't show anything while loading deals
		}

		if (firstFiveDeals.length === 0) {
			return null;
		}

		return (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<View style={styles.sectionTitleContainer}>
					<Ionicons name="flash" size={20} color={Colors.FLASH_SALE_RED} />
					<Text style={styles.sectionTitle}>Super Deals</Text>
				</View>
					{allDealProducts.length > 5 && (
						<TouchableOpacity onPress={() => {
							(navigation as any).navigate('AllDeals', { deals: allDealProducts });
						}}>
				<Text style={styles.viewMoreText}>View more {'>'}</Text>
			</TouchableOpacity>
					)}
			</View>
			<FlatList
					data={firstFiveDeals}
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
								(navigation as any).navigate('AllDeals', { deals: ruleProducts });
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

	const renderNewArrivals = () => (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<View style={styles.sectionTitleContainer}>
					<Ionicons name="sparkles" size={20} color={Colors.SHEIN_PINK} />
					<Text style={styles.sectionTitle}>New Arrivals</Text>
				</View>
				<TouchableOpacity>
					<Text style={styles.viewMoreText}>View more {'>'}</Text>
				</TouchableOpacity>
			</View>
		{newArrivalsError ? (
				<View style={styles.errorContainer}>
					<Ionicons name="alert-circle-outline" size={24} color={Colors.ERROR} />
					<Text style={styles.errorText}>Failed to load new arrivals</Text>
					<Text style={styles.errorSubtext}>{newArrivalsError.message}</Text>
				</View>
			) : newArrivals && newArrivals.length > 0 ? (
				<FlatList
					data={newArrivals}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.newArrivalsList}
					renderItem={({ item }) => {
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
							style={styles.newArrivalCard}
								pricingDiscount={discount}
						/>
						);
					}}
					keyExtractor={(item) => item.id}
				/>
			) : (
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyText}>No new arrivals available</Text>
				</View>
			)}
		</View>
	);


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
				<View style={styles.categoryHeader}>
					<Text style={styles.categoryTitle}>{selectedCategory}</Text>
					<TouchableOpacity onPress={() => setSelectedCategory('All')}>
						<Ionicons name="close" size={24} color={Colors.BLACK} />
					</TouchableOpacity>
				</View>

				{productsError ? (
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
			case 'categoryTabs':
				return (
					<CategoryTabs 
						selectedCategory={selectedCategory}
						onSelectCategory={setSelectedCategory}
						variant="red"
						showMenuIcon={true}
					/>
				);
			case 'shippingBanner':
				return renderShippingBanner();
			case 'newArrivals':
				return renderNewArrivals();
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
				// Only render mainProducts when filter is NOT "For You"
				if (selectedFilter === 'For You') {
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
							data={forYouProducts}
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
			default:
				return null;
		}
	}, [
		selectedCategory,
		selectedFilter,
		renderHeader,
		renderShippingBanner,
		renderNewArrivals,
		renderSuperDeals,
		renderDealSection,
		renderFilterTabs,
		renderMainProducts,
		renderForYouItem,
		forYouProducts,
		forYouLoading,
		forYouError,
		forYouLoadingMore,
		forYouHasMore,
		forYouLoadMore,
		pricingRules,
		productsByRule,
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
			'superDeals': 150,
			'pricingRule': 150, // Dynamic pricing rule sections
			'filterTabs': 50,
			'mainProducts': 200,
			'forYouProducts': 0, // Height varies, will be calculated dynamically
		};

		let offset = 0;
		for (let i = 0; i < index; i++) {
			const section = sections[i];
			if (section.id === 'forYouProducts' && selectedFilter === 'For You') {
				// Estimate height based on number of products (2 columns, variable heights)
				const estimatedRows = Math.ceil(forYouProducts.length / 2);
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

		return {
			length,
			offset,
			index,
		};
	}, [sections, selectedFilter, forYouProducts.length]);

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

	// Handle infinite scroll for "For You" products
	const handleEndReached = useCallback(() => {
		if (selectedFilter === 'For You' && forYouHasMore && !forYouLoadingMore && !forYouLoading) {
			forYouLoadMore();
		}
	}, [selectedFilter, forYouHasMore, forYouLoadingMore, forYouLoading, forYouLoadMore]);

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
		<SafeAreaView style={styles.container}>
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
				onEndReached={selectedFilter === 'For You' ? handleEndReached : undefined}
				onEndReachedThreshold={selectedFilter === 'For You' ? 0.5 : undefined}
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
	categoryTabs: {
		paddingVertical: 12,
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
	shippingBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.LIGHT_GRAY,
		paddingVertical: 12,
		gap: 8,
	},
	shippingText: {
		fontSize: 14,
		color: Colors.BLACK,
		fontWeight: '500',
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
	},
	sectionTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	sectionTitle: {
		fontSize: 18,
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
	categoryHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.BORDER,
	},
	categoryTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: Colors.BLACK,
	},
	categoryProductsList: {
		paddingHorizontal: Spacing.SCREEN_PADDING,
		paddingTop: Spacing.PADDING_MD,
		paddingBottom: 100,
	},
	categoryProductRow: {
		justifyContent: 'space-between',
		marginBottom: Spacing.MARGIN_SM,
	},
	categoryProductCard: {
		width: (width - Spacing.SCREEN_PADDING * 2 - Spacing.MARGIN_SM) / 2,
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
});

