import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Spacing } from '../constants/spacing';
import { UserAddress, PaymentMethod } from '../types';

// Mock data
const mockCartItems = [
  {
    id: '1',
    name: 'Summer Floral Maxi Dress',
    price: 49.99,
    quantity: 1,
    color: 'Blue Floral',
    size: 'S',
  },
  {
    id: '2',
    name: 'High-Waist Skinny Jeans',
    price: 39.99,
    quantity: 2,
    color: 'Light Blue',
    size: 'M',
  },
  {
    id: '3',
    name: 'Crop Top Blouse',
    price: 24.99,
    quantity: 1,
    color: 'White',
    size: 'S',
  },
];

const mockAddresses: UserAddress[] = [
  {
    id: '1',
    type: 'home',
    firstName: 'Sarah',
    lastName: 'Johnson',
    addressLine1: '123 Main Street',
    addressLine2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'United States',
    phone: '+1 (555) 123-4567',
    isDefault: true,
  },
  {
    id: '2',
    type: 'work',
    firstName: 'Sarah',
    lastName: 'Johnson',
    addressLine1: '456 Business Ave',
    addressLine2: 'Suite 200',
    city: 'New York',
    state: 'NY',
    zipCode: '10002',
    country: 'United States',
    phone: '+1 (555) 987-6543',
    isDefault: false,
  },
];

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'card',
    cardType: 'visa',
    lastFourDigits: '4242',
    expiryMonth: '12',
    expiryYear: '2025',
    cardholderName: 'Sarah Johnson',
    isDefault: true,
  },
  {
    id: '2',
    type: 'card',
    cardType: 'mastercard',
    lastFourDigits: '8888',
    expiryMonth: '08',
    expiryYear: '2026',
    cardholderName: 'Sarah Johnson',
    isDefault: false,
  },
];

export const CheckoutScreen: React.FC = () => {
  const [selectedAddress, setSelectedAddress] = useState<UserAddress>(mockAddresses[0]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(mockPaymentMethods[0]);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [useNewPayment, setUseNewPayment] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  // New address form state
  const [newAddress, setNewAddress] = useState({
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
  });

  // New payment form state
  const [newPayment, setNewPayment] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });

  const formatPrice = (price: number) => {
    return `GH₵${price.toFixed(2)}`;
  };

  const calculateSubtotal = () => {
    return mockCartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return subtotal > 50 ? 0 : 5.99;
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return subtotal * 0.08; // 8% tax rate
  };

  const calculateDiscount = () => {
    // Mock promo code logic
    if (promoCode.toLowerCase() === 'save10') {
      return calculateSubtotal() * 0.1; // 10% discount
    }
    return 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping() + calculateTax() - calculateDiscount();
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Shipping Address', 'Please select a shipping address.');
      return;
    }

    if (!selectedPayment) {
      Alert.alert('Payment Method', 'Please select a payment method.');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('OrderSuccess' as never);
    }, 2000);
  };

  const renderAddressSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="location-outline" size={24} color={Colors.TEXT_PRIMARY} />
        <Text style={styles.sectionTitle}>Shipping Address</Text>
      </View>

      {!useNewAddress ? (
        <>
          {mockAddresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.addressCard,
                selectedAddress?.id === address.id && styles.selectedCard,
              ]}
              onPress={() => setSelectedAddress(address)}
            >
              <View style={styles.addressHeader}>
                <Text style={styles.addressType}>
                  {address.type.charAt(0).toUpperCase() + address.type.slice(1)}
                </Text>
                {address.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.addressName}>
                {address.firstName} {address.lastName}
              </Text>
              <Text style={styles.addressText}>
                {address.addressLine1}
                {address.addressLine2 && `, ${address.addressLine2}`}
              </Text>
              <Text style={styles.addressText}>
                {address.city}, {address.state} {address.zipCode}
              </Text>
              <Text style={styles.addressText}>{address.phone}</Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={() => setUseNewAddress(true)}
          >
            <Ionicons name="add" size={20} color={Colors.VIBRANT_PINK} />
            <Text style={styles.addNewText}>Add New Address</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>First Name</Text>
              <TextInput
                style={styles.formInput}
                value={newAddress.firstName}
                onChangeText={(text) => setNewAddress({ ...newAddress, firstName: text })}
                placeholder="Enter first name"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Last Name</Text>
              <TextInput
                style={styles.formInput}
                value={newAddress.lastName}
                onChangeText={(text) => setNewAddress({ ...newAddress, lastName: text })}
                placeholder="Enter last name"
              />
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Address Line 1</Text>
            <TextInput
              style={styles.formInput}
              value={newAddress.addressLine1}
              onChangeText={(text) => setNewAddress({ ...newAddress, addressLine1: text })}
              placeholder="Enter street address"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Address Line 2 (Optional)</Text>
            <TextInput
              style={styles.formInput}
              value={newAddress.addressLine2}
              onChangeText={(text) => setNewAddress({ ...newAddress, addressLine2: text })}
              placeholder="Apartment, suite, etc."
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>City</Text>
              <TextInput
                style={styles.formInput}
                value={newAddress.city}
                onChangeText={(text) => setNewAddress({ ...newAddress, city: text })}
                placeholder="Enter city"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>State</Text>
              <TextInput
                style={styles.formInput}
                value={newAddress.state}
                onChangeText={(text) => setNewAddress({ ...newAddress, state: text })}
                placeholder="Enter state"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>ZIP Code</Text>
              <TextInput
                style={styles.formInput}
                value={newAddress.zipCode}
                onChangeText={(text) => setNewAddress({ ...newAddress, zipCode: text })}
                placeholder="Enter ZIP code"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                value={newAddress.phone}
                onChangeText={(text) => setNewAddress({ ...newAddress, phone: text })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.formActions}>
            <Button
              title="Save Address"
              onPress={() => setUseNewAddress(false)}
              variant="primary"
              size="medium"
            />
            <Button
              title="Cancel"
              onPress={() => setUseNewAddress(false)}
              variant="outline"
              size="medium"
            />
          </View>
        </View>
      )}
    </View>
  );

  const renderPaymentSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="card-outline" size={24} color={Colors.TEXT_PRIMARY} />
        <Text style={styles.sectionTitle}>Payment Method</Text>
      </View>

      {!useNewPayment ? (
        <>
          {mockPaymentMethods.map((payment) => (
            <TouchableOpacity
              key={payment.id}
              style={[
                styles.paymentCard,
                selectedPayment?.id === payment.id && styles.selectedCard,
              ]}
              onPress={() => setSelectedPayment(payment)}
            >
              <View style={styles.paymentHeader}>
                <View style={styles.cardInfo}>
                  <Ionicons
                    name={payment.cardType === 'visa' ? 'card' : 'card-outline'}
                    size={24}
                    color={Colors.TEXT_PRIMARY}
                  />
                  <Text style={styles.cardType}>
                    {payment.cardType.charAt(0).toUpperCase() + payment.cardType.slice(1)}
                  </Text>
                </View>
                {payment.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardNumber}>•••• •••• •••• {payment.lastFourDigits}</Text>
              <Text style={styles.cardholderName}>{payment.cardholderName}</Text>
              <Text style={styles.cardExpiry}>
                Expires {payment.expiryMonth}/{payment.expiryYear}
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={() => setUseNewPayment(true)}
          >
            <Ionicons name="add" size={20} color={Colors.VIBRANT_PINK} />
            <Text style={styles.addNewText}>Add New Payment Method</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Card Number</Text>
            <TextInput
              style={styles.formInput}
              value={newPayment.cardNumber}
              onChangeText={(text) => setNewPayment({ ...newPayment, cardNumber: text })}
              placeholder="1234 5678 9012 3456"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Expiry Month</Text>
              <TextInput
                style={styles.formInput}
                value={newPayment.expiryMonth}
                onChangeText={(text) => setNewPayment({ ...newPayment, expiryMonth: text })}
                placeholder="MM"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Expiry Year</Text>
              <TextInput
                style={styles.formInput}
                value={newPayment.expiryYear}
                onChangeText={(text) => setNewPayment({ ...newPayment, expiryYear: text })}
                placeholder="YYYY"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>CVV</Text>
              <TextInput
                style={styles.formInput}
                value={newPayment.cvv}
                onChangeText={(text) => setNewPayment({ ...newPayment, cvv: text })}
                placeholder="123"
                keyboardType="numeric"
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Cardholder Name</Text>
            <TextInput
              style={styles.formInput}
              value={newPayment.cardholderName}
              onChangeText={(text) => setNewPayment({ ...newPayment, cardholderName: text })}
              placeholder="Enter cardholder name"
            />
          </View>

          <View style={styles.formActions}>
            <Button
              title="Save Payment Method"
              onPress={() => setUseNewPayment(false)}
              variant="primary"
              size="medium"
            />
            <Button
              title="Cancel"
              onPress={() => setUseNewPayment(false)}
              variant="outline"
              size="medium"
            />
          </View>
        </View>
      )}
    </View>
  );

  const renderOrderSummary = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="receipt-outline" size={24} color={Colors.TEXT_PRIMARY} />
        <Text style={styles.sectionTitle}>Order Summary</Text>
      </View>

      {mockCartItems.map((item) => (
        <View key={item.id} style={styles.orderItem}>
          <View style={styles.orderItemInfo}>
            <Text style={styles.orderItemName}>{item.name}</Text>
            <Text style={styles.orderItemDetails}>
              {item.color} • Size {item.size} • Qty {item.quantity}
            </Text>
          </View>
          <Text style={styles.orderItemPrice}>
            {formatPrice(item.price * item.quantity)}
          </Text>
        </View>
      ))}

      <View style={styles.promoSection}>
        <TextInput
          style={styles.promoInput}
          value={promoCode}
          onChangeText={setPromoCode}
          placeholder="Enter promo code"
        />
        <Button
          title="Apply"
          onPress={() => {
            if (promoCode.toLowerCase() === 'save10') {
              Alert.alert('Success', 'Promo code applied! 10% discount added.');
            } else {
              Alert.alert('Invalid Code', 'Please enter a valid promo code.');
            }
          }}
          variant="outline"
          size="small"
        />
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>{formatPrice(calculateSubtotal())}</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Shipping</Text>
        <Text style={styles.summaryValue}>
          {calculateShipping() === 0 ? 'Free' : formatPrice(calculateShipping())}
        </Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Tax</Text>
        <Text style={styles.summaryValue}>{formatPrice(calculateTax())}</Text>
      </View>
      
      {calculateDiscount() > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Discount</Text>
          <Text style={[styles.summaryValue, styles.discountValue]}>
            -{formatPrice(calculateDiscount())}
          </Text>
        </View>
      )}
      
      <View style={styles.summaryDivider} />
      
      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatPrice(calculateTotal())}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {renderAddressSection()}
        {renderPaymentSection()}
        {renderOrderSummary()}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={`Place Order • ${formatPrice(calculateTotal())}`}
          onPress={handlePlaceOrder}
          variant="primary"
          size="large"
          fullWidth
          loading={isLoading}
        />
      </View>
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
    paddingHorizontal: Spacing.PADDING_LG,
    paddingVertical: Spacing.PADDING_MD,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  section: {
    marginHorizontal: Spacing.PADDING_LG,
    marginVertical: Spacing.MARGIN_LG,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.MARGIN_LG,
  },
  sectionTitle: {
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
    marginLeft: Spacing.MARGIN_SM,
  },
  addressCard: {
    backgroundColor: Colors.SURFACE,
    borderRadius: Spacing.BORDER_RADIUS_LG,
    padding: Spacing.PADDING_LG,
    marginBottom: Spacing.MARGIN_MD,
    borderWidth: 2,
    borderColor: Colors.BORDER,
  },
  selectedCard: {
    borderColor: Colors.VIBRANT_PINK,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.MARGIN_SM,
  },
  addressType: {
    fontSize: Typography.FONT_SIZE_SM,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
  },
  defaultBadge: {
    backgroundColor: Colors.VIBRANT_PINK,
    paddingHorizontal: Spacing.PADDING_SM,
    paddingVertical: Spacing.PADDING_XS,
    borderRadius: Spacing.BORDER_RADIUS_SM,
  },
  defaultText: {
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_XS,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
  },
  addressName: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_XS,
  },
  addressText: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    marginBottom: Spacing.MARGIN_XS,
  },
  paymentCard: {
    backgroundColor: Colors.SURFACE,
    borderRadius: Spacing.BORDER_RADIUS_LG,
    padding: Spacing.PADDING_LG,
    marginBottom: Spacing.MARGIN_MD,
    borderWidth: 2,
    borderColor: Colors.BORDER,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.MARGIN_SM,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardType: {
    fontSize: Typography.FONT_SIZE_SM,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    marginLeft: Spacing.MARGIN_SM,
  },
  cardNumber: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_XS,
  },
  cardholderName: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    marginBottom: Spacing.MARGIN_XS,
  },
  cardExpiry: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.PADDING_LG,
    borderWidth: 2,
    borderColor: Colors.BORDER,
    borderStyle: 'dashed',
    borderRadius: Spacing.BORDER_RADIUS_LG,
    backgroundColor: Colors.SURFACE,
  },
  addNewText: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.VIBRANT_PINK,
    marginLeft: Spacing.MARGIN_SM,
  },
  formContainer: {
    backgroundColor: Colors.SURFACE,
    borderRadius: Spacing.BORDER_RADIUS_LG,
    padding: Spacing.PADDING_LG,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.MARGIN_MD,
  },
  formField: {
    flex: 1,
    marginBottom: Spacing.MARGIN_MD,
  },
  formLabel: {
    fontSize: Typography.FONT_SIZE_SM,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_XS,
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: Spacing.BORDER_RADIUS_MD,
    padding: Spacing.PADDING_MD,
    fontSize: Typography.FONT_SIZE_MD,
    backgroundColor: Colors.WHITE,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.MARGIN_MD,
    marginTop: Spacing.MARGIN_LG,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.PADDING_MD,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_XS,
  },
  orderItemDetails: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
  },
  orderItemPrice: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
  },
  promoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.MARGIN_MD,
    marginVertical: Spacing.MARGIN_LG,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: Spacing.BORDER_RADIUS_MD,
    padding: Spacing.PADDING_MD,
    fontSize: Typography.FONT_SIZE_MD,
    backgroundColor: Colors.WHITE,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.MARGIN_MD,
  },
  summaryLabel: {
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.TEXT_SECONDARY,
  },
  summaryValue: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
  },
  discountValue: {
    color: Colors.SUCCESS,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.BORDER,
    marginVertical: Spacing.MARGIN_MD,
  },
  totalLabel: {
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
  },
  totalValue: {
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.VIBRANT_PINK,
  },
  footer: {
    paddingHorizontal: Spacing.PADDING_LG,
    paddingVertical: Spacing.PADDING_LG,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    backgroundColor: Colors.WHITE,
  },
});
