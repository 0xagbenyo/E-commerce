import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';

// Mock data for profile
const userMetrics = [
  { id: '1', label: '4 Coupons', value: '4' },
  { id: '2', label: '0 Points', value: '0' },
  { id: '3', label: 'Wallet', icon: 'wallet' },
  { id: '4', label: 'Gift Card', icon: 'gift' },
];

const orderStatuses = [
  { id: '1', label: 'Unpaid', icon: 'document-outline' },
  { id: '2', label: 'Processing', icon: 'cube-outline' },
  { id: '3', label: 'Shipped', icon: 'car-outline' },
  { id: '4', label: 'Review', icon: 'chatbubble-outline' },
  { id: '5', label: 'Returns', icon: 'arrow-undo-outline' },
];

const activities = [
  { id: '1', label: 'Following', icon: 'person-add-outline', value: '0 following' },
  { id: '2', label: 'History', icon: 'time-outline', value: '33 item' },
  { id: '3', label: 'Wishlist', icon: 'heart-outline', value: '0 item' },
];

const services = [
  { id: '1', label: 'Customer Service', icon: 'headset-outline' },
  { id: '2', label: 'Check In', icon: 'checkmark-circle-outline' },
  { id: '3', label: 'Survey Center', icon: 'document-text-outline' },
  { id: '4', label: 'Share&Earn', icon: 'share-outline' },
];

const promotionalProducts = [
  {
    id: '1',
    name: 'Glamora Plus Size Shirt',
    price: 'GH₵6.55',
    originalPrice: 'GH₵13.10',
    discount: '-50%',
    image: '👕',
    brand: 'GLAMORA',
    category: 'CURVE',
    timer: '23:59:49:9',
    bestseller: '#1 Bestseller in Yellow Plus Size Shirts',
    colors: ['#007AFF', '#F4A460', '#FF69B4', '#FF0000'],
  },
  {
    id: '2',
    name: 'Glamora Women\'s Solid Color Skirt',
    price: 'GH₵4.00',
    image: '👗',
    discount: '50% OFF Now!',
    isFave: true,
  },
];

export const ProfileScreen: React.FC = () => {
  const [showCouponAlert, setShowCouponAlert] = useState(true);
  const navigation = useNavigation();

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.profileInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>I</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.usernameRow}>
            <Text style={styles.username}>isabelquarshie7</Text>
            <View style={styles.googleBadge}>
              <Text style={styles.googleText}>G</Text>
            </View>
            <View style={styles.membershipBadge}>
              <Text style={styles.membershipText}>S0</Text>
            </View>
          </View>
          <View style={styles.profileEditRow}>
            <Text style={styles.profileLabel}>My Profile</Text>
            <Ionicons name="pencil" size={16} color={Colors.BLACK} />
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="grid" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => console.log('Settings pressed')}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderUserMetrics = () => (
    <View style={styles.metricsContainer}>
      {userMetrics.map((metric) => (
        <View key={metric.id} style={styles.metricItem}>
          {metric.icon ? (
            <Ionicons name={metric.icon as any} size={24} color={Colors.BLACK} />
          ) : (
            <Text style={styles.metricValue}>{metric.value}</Text>
          )}
          <Text style={styles.metricLabel}>{metric.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderCouponAlert = () => (
    showCouponAlert && (
      <View style={styles.couponAlert}>
        <Text style={styles.couponAlertText}>
          You have 4 coupon(s) that will expire!
        </Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setShowCouponAlert(false)}
        >
          <Ionicons name="close" size={20} color={Colors.BLACK} />
        </TouchableOpacity>
      </View>
    )
  );

  const renderOrdersSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Orders</Text>
        <TouchableOpacity onPress={() => console.log('OrderHistory pressed')}>
          <Text style={styles.viewAllText}>View all {'>'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.orderStatuses}>
        {orderStatuses.map((status) => (
          <View key={status.id} style={styles.orderStatus}>
            <Ionicons name={status.icon as any} size={24} color={Colors.BLACK} />
            <Text style={styles.orderStatusLabel}>{status.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderActivitiesSection = () => (
    <View style={styles.section}>
      <View style={styles.activitiesContainer}>
        {activities.map((activity, index) => (
          <View key={activity.id} style={styles.activityItem}>
            <View style={styles.activityContent}>
              <Ionicons name={activity.icon as any} size={20} color={Colors.BLACK} />
              <Text style={styles.activityLabel}>{activity.label}</Text>
              <Text style={styles.activityValue}>{activity.value}</Text>
            </View>
            {index < activities.length - 1 && (
              <Ionicons name="chevron-forward" size={16} color={Colors.TEXT_SECONDARY} />
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const renderServicesSection = () => (
    <View style={styles.section}>
      <View style={styles.servicesContainer}>
        {services.map((service) => (
          <TouchableOpacity key={service.id} style={styles.serviceItem}>
            <Ionicons name={service.icon as any} size={24} color={Colors.BLACK} />
            <Text style={styles.serviceLabel}>{service.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPromotionalProducts = () => (
    <View style={styles.section}>
      <View style={styles.productsContainer}>
        {promotionalProducts.map((product) => (
          <View key={product.id} style={styles.productCard}>
            {product.isFave && (
              <View style={styles.faveBanner}>
                <Text style={styles.faveText}>Your faves are on sale!</Text>
              </View>
            )}
            <View style={styles.productImage}>
              <Text style={styles.productEmoji}>{product.image}</Text>
              {product.brand && (
                <View style={styles.brandInfo}>
                  <Text style={styles.brandName}>{product.brand}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{product.category}</Text>
                  </View>
                </View>
              )}
              {product.timer && (
                <View style={styles.timerContainer}>
                  <Text style={styles.timerText}>{product.timer} | {product.discount}</Text>
                </View>
              )}
              {product.colors && (
                <View style={styles.colorSwatches}>
                  {product.colors.map((color, index) => (
                    <View 
                      key={index} 
                      style={[styles.colorSwatch, { backgroundColor: color }]} 
                    />
                  ))}
                </View>
              )}
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
              {product.bestseller && (
                <Text style={styles.bestsellerText} numberOfLines={1}>{product.bestseller}</Text>
              )}
              <Text style={styles.productPrice}>{product.price}</Text>
              {product.originalPrice && (
                <Text style={styles.originalPrice}>{product.originalPrice}</Text>
              )}
              <Text style={styles.estimatedText}>Estimated</Text>
              <TouchableOpacity style={styles.addToCartButton}>
                <Ionicons name="add" size={20} color={Colors.WHITE} />
              </TouchableOpacity>
            </View>
            {product.discount && !product.timer && (
              <View style={styles.discountTag}>
                <Text style={styles.discountText}>{product.discount}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderUserMetrics()}
        {renderCouponAlert()}
        {renderOrdersSection()}
        {renderActivitiesSection()}
        {renderServicesSection()}
        {renderPromotionalProducts()}
      </ScrollView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  userInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginRight: 8,
  },
  googleBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  googleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.WHITE,
  },
  membershipBadge: {
    backgroundColor: Colors.SHEIN_PINK,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  membershipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.WHITE,
  },
  profileEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileLabel: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
  },
  couponAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  couponAlertText: {
    flex: 1,
    fontSize: 14,
    color: Colors.SHEIN_ORANGE,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.SHEIN_PINK,
    fontWeight: '500',
  },
  orderStatuses: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  orderStatus: {
    flex: 1,
    alignItems: 'center',
  },
  orderStatusLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 4,
  },
  activitiesContainer: {
    paddingHorizontal: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityLabel: {
    fontSize: 14,
    color: Colors.BLACK,
    flex: 1,
  },
  activityValue: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  servicesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  serviceItem: {
    flex: 1,
    alignItems: 'center',
  },
  serviceLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },
  productsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.WHITE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  faveBanner: {
    backgroundColor: Colors.SHEIN_ORANGE,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  faveText: {
    fontSize: 10,
    color: Colors.WHITE,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productEmoji: {
    fontSize: 50,
  },
  brandInfo: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  categoryBadge: {
    backgroundColor: Colors.SHEIN_PINK,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  categoryText: {
    fontSize: 8,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
  timerContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  timerText: {
    fontSize: 10,
    color: Colors.FLASH_SALE_RED,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  colorSwatches: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  colorSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.WHITE,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 12,
    color: Colors.BLACK,
    marginBottom: 4,
    lineHeight: 16,
  },
  bestsellerText: {
    fontSize: 10,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 2,
  },
  originalPrice: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  estimatedText: {
    fontSize: 10,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 8,
  },
  addToCartButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.SHEIN_PINK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.SHEIN_ORANGE,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
});

