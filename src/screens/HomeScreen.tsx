import React, { useState, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
	Dimensions,
	Image,
	ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';

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
	const navigation = useNavigation();

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

	const renderSection = ({ item }: { item: { type: string; data?: any } }) => {
		switch (item.type) {
			case 'header':
				return renderHeader();
			case 'categoryTabs':
				return renderCategoryTabs();
			case 'shippingBanner':
				return renderShippingBanner();
			case 'latestCarousel':
				return renderLatestCarousel();
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

	const sections = [
		{ type: 'header', id: 'header' },
		{ type: 'categoryTabs', id: 'categoryTabs' },
		{ type: 'shippingBanner', id: 'shippingBanner' },
		{ type: 'latestCarousel', id: 'latestCarousel' },
		{ type: 'superDeals', id: 'superDeals' },
		{ type: 'buy6Get60', id: 'buy6Get60' },
		{ type: 'discount10to50', id: 'discount10to50' },
		{ type: 'filterTabs', id: 'filterTabs' },
		{ type: 'mainProducts', id: 'mainProducts' },
	];

	return (
		<SafeAreaView style={styles.container}>
			<FlatList
				data={sections}
				renderItem={renderSection}
				keyExtractor={(item) => item.id}
				showsVerticalScrollIndicator={false}
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
});

