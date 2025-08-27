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
import { Colors } from '../constants/colors';

// Mock order data
const orders = [
  {
    id: '1',
    orderNumber: 'GLM-2024-001',
    date: '2024-01-15',
    status: 'delivered',
    total: 'GH₵45.60',
    items: [
      { id: '1', name: 'Glamora Plus Size Dress', image: '👗', price: 'GH₵25.00' },
      { id: '2', name: 'Glamora Blouse', image: '👚', price: 'GH₵20.60' },
    ],
    trackingNumber: 'GH123456789',
  },
  {
    id: '2',
    orderNumber: 'GLM-2024-002',
    date: '2024-01-10',
    status: 'shipped',
    total: 'GH₵32.00',
    items: [
      { id: '3', name: 'Glamora Jeans', image: '👖', price: 'GH₵32.00' },
    ],
    trackingNumber: 'GH987654321',
  },
  {
    id: '3',
    orderNumber: 'GLM-2024-003',
    date: '2024-01-05',
    status: 'processing',
    total: 'GH₵18.50',
    items: [
      { id: '4', name: 'Glamora T-Shirt', image: '👕', price: 'GH₵18.50' },
    ],
  },
  {
    id: '4',
    orderNumber: 'GLM-2023-045',
    date: '2023-12-20',
    status: 'delivered',
    total: 'GH₵67.80',
    items: [
      { id: '5', name: 'Glamora Winter Coat', image: '🧥', price: 'GH₵45.00' },
      { id: '6', name: 'Glamora Scarf', image: '🧣', price: 'GH₵22.80' },
    ],
  },
];

const statusConfig = {
  pending: { color: Colors.WARNING, icon: 'time-outline', label: 'Pending' },
  confirmed: { color: Colors.INFO, icon: 'checkmark-circle-outline', label: 'Confirmed' },
  processing: { color: Colors.INFO, icon: 'cube-outline', label: 'Processing' },
  shipped: { color: Colors.SUCCESS, icon: 'car-outline', label: 'Shipped' },
  delivered: { color: Colors.SUCCESS, icon: 'checkmark-circle', label: 'Delivered' },
  cancelled: { color: Colors.ERROR, icon: 'close-circle', label: 'Cancelled' },
  returned: { color: Colors.ERROR, icon: 'arrow-undo', label: 'Returned' },
};

export const OrderHistoryScreen: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => console.log('Back pressed')}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.BLACK} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>My Orders</Text>
      <TouchableOpacity style={styles.searchButton}>
        <Ionicons name="search" size={24} color={Colors.BLACK} />
      </TouchableOpacity>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterTabs}>
      {['All', 'Pending', 'Processing', 'Shipped', 'Delivered'].map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterTab,
            selectedFilter === filter && styles.filterTabActive
          ]}
          onPress={() => setSelectedFilter(filter)}
        >
          <Text style={[
            styles.filterTabText,
            selectedFilter === filter && styles.filterTabTextActive
          ]}>
            {filter}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOrderItem = ({ item }: { item: any }) => {
    const status = statusConfig[item.status as keyof typeof statusConfig];
    
    return (
      <TouchableOpacity style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>{item.orderNumber}</Text>
            <Text style={styles.orderDate}>{item.date}</Text>
          </View>
          <View style={styles.statusContainer}>
            <Ionicons name={status.icon as any} size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.itemsContainer}>
          {item.items.map((product: any, index: number) => (
            <View key={product.id} style={styles.productItem}>
              <Text style={styles.productEmoji}>{product.image}</Text>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.productPrice}>{product.price}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>{item.total}</Text>
          </View>
          
          <View style={styles.actionButtons}>
            {item.status === 'delivered' && (
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Review</Text>
              </TouchableOpacity>
            )}
            {item.status === 'shipped' && item.trackingNumber && (
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Track</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                View Details
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredOrders = selectedFilter === 'All' 
    ? orders 
    : orders.filter(order => {
        const status = statusConfig[order.status as keyof typeof statusConfig];
        return status.label.toLowerCase() === selectedFilter.toLowerCase();
      });

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderFilterTabs()}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.ordersList}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  searchButton: {
    padding: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: Colors.SHEIN_PINK,
  },
  filterTabText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: Colors.WHITE,
  },
  ordersList: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemsContainer: {
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    color: Colors.BLACK,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.SHEIN_PINK,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    paddingTop: 12,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: Colors.BLACK,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.SHEIN_PINK,
    borderColor: Colors.SHEIN_PINK,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.BLACK,
  },
  primaryButtonText: {
    color: Colors.WHITE,
  },
});
