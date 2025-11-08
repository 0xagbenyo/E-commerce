import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { useNewArrivals, useProductsByCategory } from '../hooks/erpnext';
import { ProductCard } from '../components/ProductCard';
import { Product } from '../types';

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

// Latest items carousel (uses sample images in assets/images)
const latestItems = [
	{ id: 'l1', image: require('../assets/images/download.jpg') },
	{ id: 'l2', image: require('../assets/images/download (1).jpg') },
	{ id: 'l3', image: require('../assets/images/download (2).jpg') },
	{ id: 'l4', image: require('../assets/images/download (3).jpg') },
	{ id: 'l5', image: require('../assets/images/download (4).jpg') },
	{ id: 'l6', image: require('../assets/images/download (5).jpg') },
	{ id: 'l7', image: require('../assets/images/download (6).jpg') },
	{ id: 'l8', image: require('../assets/images/download (7).jpg') },
	{ id: 'l9', image: require('../assets/images/download (8).jpg') },
];

const categories = ['All', 'Women', 'Kids', 'Men', 'Curve', 'Home'];

// Map UI category names to ERPNext item_group names
// You may need to adjust these based on your actual ERPNext item group names
const mapCategoryToItemGroup = (category: string): string | null => {
  const categoryMap: Record<string, string> = {
    'Women': 'Women',
    'Men': 'Men',
    'Kids': 'Kids',
    'Curve': 'Curve',
    'Home': 'Home',
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
	const [selectedFilter, setSelectedFilter] = useState('All');
	const [carouselIndex, setCarouselIndex] = useState(0);
	const carouselRef = useRef<FlatList>(null);
	const navigation = useNavigation();
	
	// Map category to item group name
	const itemGroupName = mapCategoryToItemGroup(selectedCategory);
	
	// Fetch new arrivals from API (only when "All" is selected) - reduced limit for faster loading
	const { data: newArrivals, loading: newArrivalsLoading, error: newArrivalsError, retry: retryNewArrivals } = useNewArrivals(12);
	
	// Fetch products by category when a category is selected (not "All")
	const { data: categoryProducts, loading: categoryLoading, error: categoryError, retry: retryCategoryProducts } = useProductsByCategory(
		itemGroupName || '',
		itemGroupName ? 50 : 0 // Only fetch if category is selected
	);
	
	// Products to display - only show when a specific category is selected
	const displayedProducts = selectedCategory === 'All' 
		? [] 
		: (categoryProducts || []);
	
	const isLoadingProducts = categoryLoading;
	const productsError = categoryError;

	// Auto-scroll carousel (only when "All" category is selected)
	useEffect(() => {
		if (selectedCategory !== 'All') {
			return; // Don't auto-scroll when viewing a category
		}

		const interval = setInterval(() => {
			if (carouselRef.current) {
				setCarouselIndex((prevIndex) => {
					const nextIndex = (prevIndex + 1) % latestItems.length;
					carouselRef.current?.scrollToIndex({ index: nextIndex, animated: true });
					return nextIndex;
				});
			}
		}, 3000); // Change slide every 3 seconds

		return () => clearInterval(interval);
	}, [selectedCategory]); // Only depend on selectedCategory, use functional update for carouselIndex

	const renderHeader = () => (
		<View style={styles.header}>
			<View style={styles.headerTop}>
				<TouchableOpacity style={styles.headerIcon}>
					<Ionicons name="mail-outline" size={24} color={Colors.BLACK} />
				</TouchableOpacity>
				
				<View style={styles.searchContainer}>
					<Ionicons name="search" size={20} color={Colors.TEXT_SECONDARY} />
					<Text style={styles.searchPlaceholder}>Search</Text>
					<TouchableOpacity style={styles.cameraButton}>
						<Ionicons name="camera" size={20} color={Colors.BLACK} />
					</TouchableOpacity>
				</View>
				
				<View style={styles.headerActions}>
					<TouchableOpacity style={styles.headerIcon}>
						<Ionicons name="heart-outline" size={24} color={Colors.BLACK} />
					</TouchableOpacity>
					<TouchableOpacity style={styles.headerIcon}>
						<Ionicons name="menu" size={24} color={Colors.BLACK} />
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);

	const renderLatestCarousel = () => (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<View style={styles.sectionTitleContainer}>
					<Ionicons name="sparkles" size={20} color={Colors.SHEIN_PINK} />
					<Text style={styles.sectionTitle}>Latest</Text>
				</View>
				<TouchableOpacity>
					<Text style={styles.viewMoreText}>View more {'>'}</Text>
				</TouchableOpacity>
			</View>
			<FlatList
				ref={carouselRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				data={latestItems}
				renderItem={({ item }) => (
					<View key={item.id} style={{ width }}>
						<View style={styles.carouselImageFrame}>
							<Image source={item.image} style={styles.carouselImage} resizeMode="cover" />
						</View>
					</View>
				)}
				keyExtractor={(item) => item.id}
				onScroll={(e) => {
					const x = e.nativeEvent.contentOffset.x;
					setCarouselIndex(Math.round(x / width));
				}}
				scrollEventThrottle={16}
				onScrollToIndexFailed={(info) => {
					// Handle scroll to index failure gracefully
					const wait = new Promise(resolve => setTimeout(resolve, 500));
					wait.then(() => {
						carouselRef.current?.scrollToIndex({ index: info.index, animated: true });
					});
				}}
			/>
			<View style={styles.carouselDots}>
				{latestItems.map((_, idx) => (
					<View key={idx} style={[styles.carouselDot, idx === carouselIndex && styles.carouselDotActive]} />
				))}
			</View>
		</View>
	);

	const renderCategoryTabs = () => (
		<View style={styles.categoryTabs}>
			<ScrollView horizontal showsHorizontalScrollIndicator={false}>
				{categories.map((category) => (
					<TouchableOpacity
						key={category}
						style={[
							styles.categoryTab,
							selectedCategory === category && styles.categoryTabActive
						]}
						onPress={() => setSelectedCategory(category)}
					>
						<Text style={[
							styles.categoryTabText,
							selectedCategory === category && styles.categoryTabTextActive
						]}>
							{category}
						</Text>
					</TouchableOpacity>
				))}
			</ScrollView>
		</View>
	);

	const renderShippingBanner = () => (
		<View style={styles.shippingBanner}>
			<Ionicons name="car" size={16} color={Colors.BLACK} />
			<Text style={styles.shippingText}>Buy GH₵69.00 more to enjoy FREE SHIPPING</Text>
		</View>
	);

	const renderSuperDeals = () => (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<View style={styles.sectionTitleContainer}>
					<Ionicons name="flash" size={20} color={Colors.FLASH_SALE_RED} />
					<Text style={styles.sectionTitle}>Super Deals</Text>
				</View>
							<TouchableOpacity>
				<Text style={styles.viewMoreText}>View more {'>'}</Text>
			</TouchableOpacity>
			</View>
			<FlatList
				data={superDeals}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.productsList}
				renderItem={({ item }) => (
					<View style={styles.productCard}>
						<View style={styles.productImage}>
							<Text style={styles.productEmoji}>{item.image}</Text>
							{item.discount && (
								<View style={styles.discountTag}>
									<Text style={styles.discountText}>{item.discount}</Text>
								</View>
							)}
						</View>
						<Text style={styles.productPrice}>{item.price}</Text>
					</View>
				)}
				keyExtractor={(item) => item.id}
			/>
		</View>
	);

	const renderBuy6Get60 = () => (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<View style={styles.sectionTitleContainer}>
					<Text style={styles.sectionTitle}>Buy 6 Get 60% Off</Text>
					<Ionicons name="chevron-forward" size={16} color={Colors.BLACK} />
				</View>
				<Text style={styles.sectionSubtitle}>Buy more, save more.</Text>
			</View>
			<FlatList
				data={buy6Get60}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.productsList}
				renderItem={({ item }) => (
					<View style={styles.productCard}>
						<View style={styles.productImage}>
							<Text style={styles.productEmoji}>{item.image}</Text>
						</View>
						<Text style={styles.productPrice}>{item.price}</Text>
					</View>
				)}
				keyExtractor={(item) => item.id}
			/>
		</View>
	);

	const renderDiscount10to50 = () => (
		<View style={styles.section}>
			<View style={styles.sectionHeader}>
				<View style={styles.sectionTitleContainer}>
					<Text style={styles.sectionTitle}>10%-50% off</Text>
					<Ionicons name="chevron-forward" size={16} color={Colors.BLACK} />
				</View>
				<Text style={styles.sectionSubtitle}>Shop now</Text>
			</View>
			<FlatList
				data={discount10to50}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.productsList}
				renderItem={({ item }) => (
					<View style={styles.productCard}>
						<View style={styles.productImage}>
							<Text style={styles.productEmoji}>{item.image}</Text>
						</View>
						<Text style={styles.productPrice}>{item.price}</Text>
					</View>
				)}
				keyExtractor={(item) => item.id}
			/>
		</View>
	);

	const renderFilterTabs = () => (
		<View style={styles.filterTabs}>
			{filterTabs.map((tab) => (
				<TouchableOpacity
					key={tab.id}
					style={[
						styles.filterTab,
						selectedFilter === tab.name && styles.filterTabActive
					]}
					onPress={() => setSelectedFilter(tab.name)}
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
			{newArrivalsLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.SHEIN_PINK} />
					<Text style={styles.loadingText}>Loading new arrivals...</Text>
				</View>
			) : newArrivalsError ? (
				<View style={styles.errorContainer}>
					<Ionicons name="alert-circle-outline" size={32} color={Colors.ERROR} />
					<Text style={styles.errorText}>Failed to load new arrivals</Text>
					<Text style={styles.errorSubtext}>{newArrivalsError.message}</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={retryNewArrivals}
					>
						<Ionicons name="refresh" size={20} color={Colors.WHITE} />
						<Text style={styles.retryButtonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : newArrivals && newArrivals.length > 0 ? (
			<FlatList
				data={newArrivals}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.newArrivalsList}
				renderItem={renderNewArrivalItem}
				keyExtractor={(item) => item.id}
			/>
			) : (
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyText}>No new arrivals available</Text>
				</View>
			)}
		</View>
	);

	const renderMainProducts = () => (
		<View style={styles.mainProducts}>
			{mainProducts.map((product) => (
				<View key={product.id} style={styles.mainProductCard}>
					<View style={styles.mainProductImage}>
						<Text style={styles.mainProductEmoji}>{product.image}</Text>
						{product.tag && (
							<View style={styles.productTag}>
								<Text style={styles.productTagText}>{product.tag}</Text>
							</View>
						)}
					</View>
					<Text style={styles.mainProductPrice}>{product.price}</Text>
				</View>
			))}
		</View>
	);

	const handleProductPress = useCallback((productId: string) => {
		(navigation as any).navigate('ProductDetails', { productId });
	}, [navigation]);

	const handleWishlistPress = useCallback((productId: string) => {
		console.log('Toggle wishlist for:', productId);
	}, []);

	const renderCategoryProductItem = ({ item }: { item: Product }) => (
		<ProductCard
			product={item}
			onPress={handleProductPress}
			onWishlistPress={handleWishlistPress}
			style={styles.categoryProductCard}
		/>
	);

	const renderNewArrivalItem = ({ item }: { item: Product }) => (
		<ProductCard
			product={item}
			onPress={handleProductPress}
			onWishlistPress={handleWishlistPress}
			style={styles.newArrivalCard}
		/>
	);

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

				{isLoadingProducts ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={Colors.SHEIN_PINK} />
						<Text style={styles.loadingText}>Loading {selectedCategory} items...</Text>
					</View>
				) : productsError ? (
					<View style={styles.errorContainer}>
						<Ionicons name="alert-circle-outline" size={32} color={Colors.ERROR} />
						<Text style={styles.errorText}>Failed to load {selectedCategory} items</Text>
						<Text style={styles.errorSubtext}>{productsError.message}</Text>
						<TouchableOpacity
							style={styles.retryButton}
							onPress={retryCategoryProducts}
						>
							<Ionicons name="refresh" size={20} color={Colors.WHITE} />
							<Text style={styles.retryButtonText}>Retry</Text>
						</TouchableOpacity>
					</View>
				) : displayedProducts && displayedProducts.length > 0 ? (
					<FlatList
						data={displayedProducts}
						numColumns={2}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.categoryProductsList}
						renderItem={renderCategoryProductItem}
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

	// Show full homepage when "All" is selected, otherwise only header and tabs
	const sections = useMemo(() => selectedCategory === 'All' ? [
		{ type: 'header', id: 'header' },
		{ type: 'categoryTabs', id: 'categoryTabs' },
		{ type: 'shippingBanner', id: 'shippingBanner' },
		{ type: 'latestCarousel', id: 'latestCarousel' },
		{ type: 'newArrivals', id: 'newArrivals' },
		{ type: 'superDeals', id: 'superDeals' },
		{ type: 'buy6Get60', id: 'buy6Get60' },
		{ type: 'discount10to50', id: 'discount10to50' },
		{ type: 'filterTabs', id: 'filterTabs' },
		{ type: 'mainProducts', id: 'mainProducts' },
	] : [
		{ type: 'header', id: 'header' },
		{ type: 'categoryTabs', id: 'categoryTabs' },
	], [selectedCategory]);

	const renderSectionMemo = ({ item }: { item: { type: string; data?: any } }) => {
		// Hide all sections except header and category tabs when a category is selected
		if (selectedCategory !== 'All' && item.type !== 'header' && item.type !== 'categoryTabs') {
			return null;
		}

		switch (item.type) {
			case 'header':
				return renderHeader();
			case 'categoryTabs':
				return renderCategoryTabs();
			case 'shippingBanner':
				return renderShippingBanner();
			case 'latestCarousel':
				return renderLatestCarousel();
			case 'newArrivals':
				return renderNewArrivals();
			case 'superDeals':
				return renderSuperDeals();
			case 'buy6Get60':
				return renderBuy6Get60();
			case 'discount10to50':
				return renderDiscount10to50();
			case 'filterTabs':
				return renderFilterTabs();
			case 'mainProducts':
				return renderMainProducts();
			default:
				return null;
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<FlatList
				data={sections}
				renderItem={renderSectionMemo}
				keyExtractor={(item) => item.id}
				showsVerticalScrollIndicator={false}
				ListFooterComponent={renderCategoryProducts}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.BACKGROUND,
	},
	header: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.BORDER,
	},
	headerTop: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	headerIcon: {
		width: 40,
		height: 40,
		justifyContent: 'center',
		alignItems: 'center',
	},
	searchContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.LIGHT_GRAY,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	searchPlaceholder: {
		flex: 1,
		marginLeft: 8,
		fontSize: 16,
		color: Colors.TEXT_SECONDARY,
	},
	cameraButton: {
		marginLeft: 8,
	},
	headerActions: {
		flexDirection: 'row',
		gap: 8,
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
	carouselImage: {
		width: '100%',
		height: '100%',
		backgroundColor: Colors.LIGHT_GRAY,
	},
	carouselImageFrame: {
		width: width - 32,
		height: 260,
		marginHorizontal: 16,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: Colors.LIGHT_GRAY,
	},
	carouselDots: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 8,
		gap: 6,
	},
	carouselDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: Colors.BORDER,
	},
	carouselDotActive: {
		backgroundColor: Colors.SHEIN_PINK,
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
	productPrice: {
		fontSize: 14,
		fontWeight: '500',
		color: Colors.BLACK,
		textAlign: 'center',
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
		padding: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		marginTop: 12,
		fontSize: 14,
		color: Colors.TEXT_SECONDARY,
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
		marginBottom: 20,
		fontSize: 12,
		color: Colors.TEXT_SECONDARY,
		textAlign: 'center',
	},
	retryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.SHEIN_PINK,
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		marginTop: 16,
	},
	retryButtonText: {
		color: Colors.WHITE,
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 8,
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
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 100,
	},
	categoryProductCard: {
		marginHorizontal: 4,
		marginBottom: 16,
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
});

