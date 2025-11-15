import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { useShoppingCart, useCartActions } from '../hooks/erpnext';
import { useUserSession } from '../context/UserContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { getERPNextClient } from '../services/erpnext';
import { ModernAlert } from '../components/ModernAlert';

const mtnMomoImage = require('../assets/images/mtn momo.png');
const telecelCashImage = require('../assets/images/telecel cash.png');

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useUserSession();
  const { cartItems, loading, refresh } = useShoppingCart(user?.email || null);
  const { updateQuantity } = useCartActions(refresh);
  const [selectedPayment, setSelectedPayment] = useState<'mtn' | 'telecel' | null>(null);
  const [paymentNumber, setPaymentNumber] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState<{ [key: string]: string }>({});
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [problematicItems, setProblematicItems] = useState<Array<{ name: string; reason: string; itemCode: string }>>([]);

  const formatPrice = (price: number) => {
    return `GH₵${price.toFixed(2)}`;
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      if (item.product) {
        return total + (item.product.price * item.quantity);
      }
      return total;
    }, 0);
  };

  const calculateShipping = () => {
    return 0; // Free shipping
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping();
  };

  const handleQuantityChange = async (itemCode: string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty < 1) return;
    try {
      await updateQuantity(itemCode, newQty);
      // Clear the input value for this item to show the updated quantity
      setQuantityInputs(prev => {
        const updated = { ...prev };
        delete updated[itemCode];
        return updated;
      });
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleQuantityInputChange = (itemCode: string, value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setQuantityInputs(prev => ({
      ...prev,
      [itemCode]: numericValue,
    }));
  };

  const handleQuantityInputBlur = async (itemCode: string, currentQty: number) => {
    const inputValue = quantityInputs[itemCode];
    if (!inputValue) {
      // Clear the input if empty
      setQuantityInputs(prev => {
        const updated = { ...prev };
        delete updated[itemCode];
        return updated;
      });
      return;
    }

    const newQty = parseInt(inputValue, 10);
    if (isNaN(newQty) || newQty < 1) {
      // Invalid input, reset to current quantity
      setQuantityInputs(prev => {
        const updated = { ...prev };
        delete updated[itemCode];
        return updated;
      });
      return;
    }

    if (newQty !== currentQty) {
      try {
        await updateQuantity(itemCode, newQty);
        // Clear the input value after successful update
        setQuantityInputs(prev => {
          const updated = { ...prev };
          delete updated[itemCode];
          return updated;
        });
      } catch (error) {
        console.error('Error updating quantity:', error);
        // Reset to current quantity on error
        setQuantityInputs(prev => {
          const updated = { ...prev };
          delete updated[itemCode];
          return updated;
        });
      }
    } else {
      // Same quantity, just clear the input
      setQuantityInputs(prev => {
        const updated = { ...prev };
        delete updated[itemCode];
        return updated;
      });
    }
  };

  const validateCartItems = async () => {
    const client = getERPNextClient();
    const problematicItems: Array<{ name: string; reason: string; itemCode: string }> = [];

    // Check stock for each cart item
    for (const item of cartItems) {
      if (!item.product || !item.itemCode) continue;

      try {
        // Fetch current stock for the item
        // getItem will find the Website Item by item_code and fetch stock
        const websiteItem = await client.getItem(item.itemCode);
        const availableStock = websiteItem?.available_stock ?? 0;

        if (availableStock === 0) {
          problematicItems.push({
            name: item.product.name || item.itemCode,
            reason: 'out of stock',
            itemCode: item.itemCode,
          });
        } else if (availableStock < item.quantity) {
          problematicItems.push({
            name: item.product.name || item.itemCode,
            reason: `only ${availableStock} available (requested ${item.quantity})`,
            itemCode: item.itemCode,
          });
        }
      } catch (error) {
        console.error(`Error checking stock for ${item.itemCode}:`, error);
        // If we can't check stock, assume it's problematic
        problematicItems.push({
          name: item.product.name || item.itemCode,
          reason: 'unable to verify stock',
          itemCode: item.itemCode,
        });
      }
    }

    return problematicItems;
  };

  const handlePlaceOrder = async () => {
    if (!selectedPayment) {
      Alert.alert('Payment Required', 'Please select a payment method');
      return;
    }

    if (!paymentNumber || paymentNumber.trim() === '') {
      const paymentType = selectedPayment === 'mtn' ? 'MTN Mobile Money' : 'Telecel Cash';
      Alert.alert('Payment Number Required', `Please enter your ${paymentType} number`);
      return;
    }

    // Validate cart items before checkout
    setIsPlacingOrder(true);
    try {
      const problematicItems = await validateCartItems();

      if (problematicItems.length > 0) {
        setIsPlacingOrder(false);
        setProblematicItems(problematicItems);
        setShowStockAlert(true);
        return;
      }

      // All items are valid, proceed with order placement
      try {
        const client = getERPNextClient();
        
        // Get customer name from session - it should be stored during login
        // The customer name is the 'name' field from ERPNext Customer doctype (e.g., "CUST-00001")
        let customerId = user?.user || ''; // This should be the customer name stored in session
        
        // If customer name is not in session, try to get it by email
        if (!customerId && user?.email) {
          const customer = await client.getCustomerByEmail(user.email);
          if (customer) {
            customerId = customer.name; // Customer name is the ID in ERPNext
          } else {
            Alert.alert('Error', 'Customer not found. Please contact support.');
            setIsPlacingOrder(false);
            return;
          }
        }
        
        if (!customerId) {
          Alert.alert('Error', 'Unable to identify customer. Please log in again.');
          setIsPlacingOrder(false);
          return;
        }

        // Get company - use default or from config
        // For now, we'll use a default company or get it from the first item
        // TODO: Get from ERPNext config or user settings
        const company = cartItems[0]?.product?.company || 'Your Company';

        // Build order items with required fields
        const orderItems = cartItems.map((item) => {
          if (!item.product || !item.itemCode) {
            throw new Error(`Invalid item: ${item.itemCode}`);
          }
          
          const rate = item.product.price;
          const qty = item.quantity;
          const amount = rate * qty; // Calculate amount (optional, ERPNext will calculate if not provided)
          
          return {
            item_code: item.itemCode,
            qty: qty,
            rate: rate,
            amount: amount,
          };
        });

        // Calculate delivery date (2 weeks after transaction date)
        const transactionDate = new Date();
        const deliveryDate = new Date(transactionDate);
        deliveryDate.setDate(deliveryDate.getDate() + 14); // Add 14 days (2 weeks)

        // Create sales order with required fields
        const orderData = {
          customer: customerId,
          company: company,
          transaction_date: transactionDate.toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
          delivery_date: deliveryDate.toISOString().split('T')[0], // 2 weeks from today in YYYY-MM-DD format
          items: orderItems,
        };

        console.log('Creating Sales Order with data:', orderData);
        const createdOrder = await client.createSalesOrder(orderData);
        
        console.log('Sales Order created successfully:', createdOrder);

        // Navigate to success screen with order number
        setIsPlacingOrder(false);
        navigation.navigate('OrderSuccess' as never, { orderNumber: createdOrder.name } as never);
      } catch (error: any) {
        setIsPlacingOrder(false);
        console.error('Error creating sales order:', error);
        
        // Extract error message from ERPNext response
        let errorMessage = 'Failed to create order. Please try again.';
        if (error?.response?.data) {
          const errorData = error.response.data;
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.exc) {
            // Try to parse exception message
            try {
              const excMessages = JSON.parse(errorData.exc);
              if (Array.isArray(excMessages) && excMessages.length > 0) {
                errorMessage = excMessages[0];
              }
            } catch {
              errorMessage = errorData.exc || errorMessage;
            }
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        Alert.alert('Order Failed', errorMessage);
      }
    } catch (error) {
      setIsPlacingOrder(false);
      console.error('Error validating cart items:', error);
      Alert.alert('Error', 'Unable to verify item availability. Please try again.');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={20} color={Colors.BLACK} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Order Confirmation</Text>
      <TouchableOpacity style={styles.supportButton}>
        <Ionicons name="headset-outline" size={18} color={Colors.BLACK} />
      </TouchableOpacity>
    </View>
  );

  const renderShippingBanner = () => (
    <View style={styles.shippingBanner}>
      <Ionicons name="checkmark-circle" size={12} color={Colors.SUCCESS} />
      <Text style={styles.shippingBannerText}>Enjoy free shipping! Order now!</Text>
    </View>
  );

  const renderShippingAddress = () => {
    // Mock address - in real app, fetch from user profile
    const address = {
      name: user?.fullName || 'Deborah Agbenyo',
      id: '257420075',
      address: 'University of Mines and Technology, Essikado Sekondi-Takorad Ghana 0000',
    };

    return (
      <View style={styles.section}>
        <View style={styles.addressContainer}>
          <Ionicons name="location" size={16} color={Colors.BLACK} />
          <View style={styles.addressDetails}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressName}>{address.name}</Text>
              <Text style={styles.addressId}>{address.id}</Text>
            </View>
            <Text style={styles.addressText}>{address.address}</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="chevron-forward" size={16} color={Colors.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>
        <View style={styles.decorativeLine} />
      </View>
    );
  };

  const renderOrderItems = () => {
    if (!cartItems || cartItems.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order items ({cartItems.length})</Text>
        {cartItems.map((item) => {
          if (!item.product) return null;
          
          const product = item.product;
          const color = product.colors && product.colors.length > 0 ? product.colors[0].name : 'N/A';
          const size = product.sizes && product.sizes.length > 0 ? product.sizes[0].name : 'N/A';
          const itemPrice = product.price;

          const handleImagePress = () => {
            const productId = product.id || item.productId || item.itemCode;
            if (productId) {
              (navigation as any).navigate('ProductDetails', { productId });
            }
          };

          return (
            <View key={item.id} style={styles.orderItem}>
              <TouchableOpacity
                onPress={handleImagePress}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: product.image || product.images?.[0] || 'https://via.placeholder.com/100' }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.itemSpecs}>
                  {color} / {size}
                </Text>
                <View style={styles.itemPriceRow}>
                  <Text style={styles.itemPrice}>{formatPrice(itemPrice)}</Text>
                  <View style={styles.quantitySelector}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(item.itemCode, item.quantity, -1)}
                    >
                      <Ionicons name="remove" size={10} color={Colors.BLACK} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityInput}
                      value={quantityInputs[item.itemCode] !== undefined ? quantityInputs[item.itemCode] : item.quantity.toString()}
                      onChangeText={(value) => handleQuantityInputChange(item.itemCode, value)}
                      onBlur={() => handleQuantityInputBlur(item.itemCode, item.quantity)}
                      keyboardType="numeric"
                      selectTextOnFocus
                      maxLength={3}
                    />
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(item.itemCode, item.quantity, 1)}
                    >
                      <Ionicons name="add" size={10} color={Colors.BLACK} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderShippingMethod = () => (
    <View style={styles.section}>
      <View style={styles.shippingMethodRow}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.SUCCESS} />
        <View style={styles.shippingMethodDetails}>
          <View style={styles.shippingMethodHeader}>
            <Text style={styles.shippingMethodName}>Express Shipping</Text>
            <Text style={styles.shippingFree}>Free Shipping</Text>
          </View>
          <Text style={styles.shippingPrice}>
            GH₵0.00
            <Text style={styles.shippingStrikethrough}> GH₵14.99</Text>
          </Text>
          <Text style={styles.shippingDelivery}>
            Estimated delivery: Tuesday, Dec 9 - Sunday, Dec 14
          </Text>
        </View>
      </View>
      <Text style={styles.customsNote}>
        Due to the customs policy, your package may incur tariff. Please note that you are responsible for paying the tariff.
      </Text>
    </View>
  );


  const renderPaymentMethods = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Method</Text>
      
      <TouchableOpacity
        style={[
          styles.paymentOption,
          selectedPayment === 'mtn' && styles.paymentOptionSelected
        ]}
        onPress={() => {
          setSelectedPayment('mtn');
          setPaymentNumber(''); // Clear number when switching payment methods
        }}
      >
        <View style={styles.paymentOptionContent}>
          <View style={styles.radioButton}>
            {selectedPayment === 'mtn' && (
              <View style={styles.radioButtonSelected} />
            )}
          </View>
          <Image 
            source={mtnMomoImage} 
            style={styles.paymentImage}
            resizeMode="contain"
          />
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentName}>MTN Mobile Money</Text>
            <Text style={styles.paymentDescription}>Pay with your MTN mobile money account</Text>
          </View>
        </View>
        {selectedPayment === 'mtn' && (
          <Ionicons name="checkmark-circle" size={16} color={Colors.SHEIN_PINK} />
        )}
      </TouchableOpacity>

      {selectedPayment === 'mtn' && (
        <View style={styles.paymentNumberContainer}>
          <Text style={styles.paymentNumberLabel}>MTN Mobile Money Number</Text>
          <TextInput
            style={styles.paymentNumberInput}
            placeholder="Enter your MTN Mobile Money number"
            placeholderTextColor={Colors.TEXT_SECONDARY}
            value={paymentNumber}
            onChangeText={setPaymentNumber}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.paymentOption,
          selectedPayment === 'telecel' && styles.paymentOptionSelected
        ]}
        onPress={() => {
          setSelectedPayment('telecel');
          setPaymentNumber(''); // Clear number when switching payment methods
        }}
      >
        <View style={styles.paymentOptionContent}>
          <View style={styles.radioButton}>
            {selectedPayment === 'telecel' && (
              <View style={styles.radioButtonSelected} />
            )}
          </View>
          <Image 
            source={telecelCashImage} 
            style={styles.paymentImage}
            resizeMode="contain"
          />
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentName}>Telecel Cash</Text>
            <Text style={styles.paymentDescription}>Pay with your Telecel cash account</Text>
          </View>
        </View>
        {selectedPayment === 'telecel' && (
          <Ionicons name="checkmark-circle" size={16} color={Colors.SHEIN_PINK} />
        )}
      </TouchableOpacity>

      {selectedPayment === 'telecel' && (
        <View style={styles.paymentNumberContainer}>
          <Text style={styles.paymentNumberLabel}>Telecel Cash Number</Text>
          <TextInput
            style={styles.paymentNumberInput}
            placeholder="Enter your Telecel Cash number"
            placeholderTextColor={Colors.TEXT_SECONDARY}
            value={paymentNumber}
            onChangeText={setPaymentNumber}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
      )}
    </View>
  );

  const renderOrderSummary = () => {
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping();
    const total = calculateTotal();

    return (
      <View style={styles.section}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Retail Price: {cartItems.length} Items</Text>
          <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping Fee:</Text>
          <View style={styles.shippingFreeContainer}>
            <Text style={styles.shippingStrikethrough}>{formatPrice(14.99)}</Text>
            <Text style={styles.shippingFree}>FREE</Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Order Total</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.emptyText}>Your cart is empty</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderShippingBanner()}
        {renderShippingAddress()}
        {renderOrderItems()}
        {renderShippingMethod()}
        {renderPaymentMethods()}
        {renderOrderSummary()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedPayment && styles.continueButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={!selectedPayment || isPlacingOrder}
        >
          {isPlacingOrder ? (
            <ActivityIndicator size="small" color={Colors.WHITE} />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modern Alert Modal */}
      <ModernAlert
        visible={showStockAlert}
        title="Items Need Attention"
        message="The following items in your cart are out of stock or don't have enough quantity available. Please remove these items before proceeding to checkout."
        items={problematicItems.map(item => ({
          name: item.name,
          reason: item.reason,
        }))}
        onClose={() => setShowStockAlert(false)}
        buttonText="Got It"
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  supportButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shippingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 4,
    gap: 5,
  },
  shippingBannerText: {
    fontSize: 11,
    color: Colors.SUCCESS,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  addressDetails: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  addressName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.BLACK,
  },
  addressId: {
    fontSize: 11,
    color: Colors.TEXT_SECONDARY,
  },
  addressText: {
    fontSize: 11,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 16,
  },
  decorativeLine: {
    height: 2,
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.BORDER,
    marginTop: 8,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 6,
  },
  itemImage: {
    width: 50,
    height: 60,
    borderRadius: 3,
    backgroundColor: Colors.LIGHT_GRAY,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.BLACK,
    marginBottom: 2,
    lineHeight: 12,
  },
  itemSpecs: {
    fontSize: 9,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 3,
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 3,
    backgroundColor: Colors.WHITE,
  },
  quantityButton: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.BLACK,
    paddingHorizontal: 5,
    minWidth: 24,
    textAlign: 'center',
  },
  quantityInput: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.BLACK,
    paddingHorizontal: 5,
    minWidth: 24,
    textAlign: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  shippingMethodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  shippingMethodDetails: {
    flex: 1,
  },
  shippingMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  shippingMethodName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.BLACK,
  },
  shippingFree: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.SUCCESS,
  },
  shippingPrice: {
    fontSize: 11,
    color: Colors.BLACK,
    marginBottom: 2,
  },
  shippingStrikethrough: {
    fontSize: 9,
    color: Colors.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
    marginLeft: 3,
  },
  shippingDelivery: {
    fontSize: 10,
    color: Colors.TEXT_SECONDARY,
  },
  customsNote: {
    fontSize: 10,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: Colors.WHITE,
  },
  paymentOptionSelected: {
    borderColor: Colors.SHEIN_PINK,
    backgroundColor: '#FFF0F5',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  radioButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.SHEIN_PINK,
  },
  paymentImage: {
    width: 35,
    height: 25,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.BLACK,
    marginBottom: 2,
  },
  paymentDescription: {
    fontSize: 10,
    color: Colors.TEXT_SECONDARY,
  },
  paymentNumberContainer: {
    marginTop: 12,
    marginHorizontal: 4,
    padding: 12,
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 8,
  },
  paymentNumberLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.BLACK,
    marginBottom: 8,
  },
  paymentNumberInput: {
    fontSize: 12,
    color: Colors.BLACK,
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.TEXT_SECONDARY,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.BLACK,
  },
  shippingFreeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shippingStrikethrough: {
    fontSize: 11,
    color: Colors.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
  },
  shippingFree: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.SUCCESS,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.BORDER,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.SHEIN_RED,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    backgroundColor: Colors.WHITE,
  },
  continueButton: {
    backgroundColor: Colors.BLACK,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: Colors.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
    marginTop: 16,
  },
});
