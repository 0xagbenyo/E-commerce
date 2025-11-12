import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { useUserSession } from '../context/UserContext';
import { useSalesInvoices } from '../hooks/erpnext';
import { SalesInvoice } from '../types';

const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
  'Draft': { color: Colors.TEXT_SECONDARY, icon: 'document-outline', label: 'Draft' },
  'Submitted': { color: Colors.INFO, icon: 'checkmark-circle-outline', label: 'Submitted' },
  'Paid': { color: Colors.SUCCESS, icon: 'checkmark-circle', label: 'Paid' },
  'Unpaid': { color: Colors.WARNING, icon: 'time-outline', label: 'Unpaid' },
  'Overdue': { color: Colors.ERROR, icon: 'alert-circle', label: 'Overdue' },
  'Cancelled': { color: Colors.ERROR, icon: 'close-circle', label: 'Cancelled' },
};

export const OrderHistoryScreen: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const navigation = useNavigation();
  const { user } = useUserSession();
  
  // Fetch sales invoices for the logged-in user (session-based, no customer filter needed)
  const { data: invoices, loading, error } = useSalesInvoices(user?.email || '');
  
  // Debug logging
  useEffect(() => {
    console.log('📄 OrderHistoryScreen - Invoices state:', {
      invoicesCount: invoices?.length || 0,
      loading,
      error: error?.message,
      userEmail: user?.email,
    });
    if (invoices && invoices.length > 0) {
      console.log('📄 First invoice:', invoices[0]);
    }
  }, [invoices, loading, error, user?.email]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => (navigation as any).goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.BLACK} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>My Invoices</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderFilterTabs = () => {
    const filters = ['All', 'Unpaid', 'Paid', 'Overdue', 'Cancelled'];
    
    return (
      <View style={styles.filterTabs}>
        {filters.map((filter) => (
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
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `GH₵${amount.toFixed(2)}`;
  };

  const renderInvoiceItem = ({ item }: { item: SalesInvoice }) => {
    if (!item || !item.id) {
      console.warn('Invalid invoice item:', item);
      return null;
    }
    
    const status = statusConfig[item.status] || statusConfig['Draft'];
    // Items count will be 0 for list queries (items only available in full document)
    // Show "View details" to see items
    const itemCount = item.items?.length || 0;
    
    return (
      <TouchableOpacity 
        style={styles.invoiceCard}
        onPress={() => (navigation as any).navigate('InvoiceDetails', { invoiceId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>{item.invoiceNumber || item.id}</Text>
            <Text style={styles.invoiceDate}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.statusContainer}>
            <Ionicons name={status.icon as any} size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceDetails}>
          <Text style={styles.itemCount}>
            {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : 'View items'}
          </Text>
          <Text style={styles.totalAmount}>{formatCurrency(item.grandTotal)}</Text>
        </View>

        <View style={styles.invoiceFooter}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => (navigation as any).navigate('InvoiceDetails', { invoiceId: item.id })}
          >
            <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
              View Details
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredInvoices = invoices && selectedFilter !== 'All'
    ? invoices.filter(invoice => {
        const status = invoice.status || 'Draft';
        if (selectedFilter === 'Unpaid') return status === 'Unpaid';
        if (selectedFilter === 'Paid') return status === 'Paid';
        if (selectedFilter === 'Overdue') return status === 'Overdue';
        if (selectedFilter === 'Cancelled') return status === 'Cancelled';
        return true;
      })
    : invoices || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderFilterTabs()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.SHEIN_PINK} />
          <Text style={styles.loadingText}>Loading invoices...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderFilterTabs()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.ERROR} />
          <Text style={styles.errorText}>Error loading invoices</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderFilterTabs()}
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.emptyText}>No invoices found</Text>
          <Text style={styles.emptySubtext}>Your invoices will appear here</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderFilterTabs()}
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.invoicesList}
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
  placeholder: {
    width: 32,
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
  invoicesList: {
    padding: 16,
  },
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 4,
  },
  invoiceDate: {
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
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  itemCount: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  invoiceFooter: {
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 10,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
  },
});
