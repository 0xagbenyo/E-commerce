import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Spacing } from '../constants/spacing';

export const RegisterScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistrationSuccess, setIsRegistrationSuccess] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const navigation = useNavigation();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^(\+233|233|0)?[235679][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhone(phoneNumber.trim())) {
      newErrors.phoneNumber = 'Please enter a valid Ghana phone number';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsRegistrationSuccess(true);
    }, 1000);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCloseSuccess = () => {
    setIsRegistrationSuccess(false);
    // Navigate to main app after successful registration
    navigation.navigate('Main' as never);
  };

  const renderSuccessOverlay = () => (
    <View style={styles.overlay}>
      <View style={styles.successCard}>
        <TouchableOpacity style={styles.closeButton} onPress={handleCloseSuccess}>
          <Ionicons name="close" size={24} color={Colors.BLACK} />
        </TouchableOpacity>
        
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={32} color={Colors.WHITE} />
          </View>
          <Text style={styles.successTitle}>Registration successful!</Text>
          <Text style={styles.successSubtitle}>
            Check your inbox for 100 points (100 points = GH₵1) reward!
            <Ionicons name="information-circle-outline" size={16} color={Colors.SHEIN_ORANGE} />
          </Text>
          
          <View style={styles.rewardCards}>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>Extra</Text>
              <Text style={styles.rewardAmount}>GH₵3.00</Text>
            </View>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>First Order</Text>
              <TouchableOpacity style={styles.useButton}>
                <Text style={styles.useButtonText}>USE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFreeShippingSection = () => (
    <View style={styles.freeShippingSection}>
      <Text style={styles.freeShippingTitle}>Free Shipping & New user sale</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productsScroll}>
        {[
          { name: 'White Crop Top', price: 'GH₵2.55', discount: '-15%', image: '👕' },
          { name: 'Maroon T-Shirt Set', price: 'GH₵29.00', image: '👚' },
          { name: 'Peach Sportswear', price: 'GH₵22.00', image: '🏃‍♀️' },
          { name: 'Wireless Earbuds', price: 'GH₵6.00', image: '🎧' },
        ].map((product, index) => (
          <View key={index} style={styles.productCard}>
            <Text style={styles.productEmoji}>{product.image}</Text>
            <Text style={styles.productPrice}>{product.price}</Text>
            {product.discount && (
              <View style={styles.discountTag}>
                <Text style={styles.discountText}>{product.discount}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={Colors.BLACK} />
            </TouchableOpacity>
            <Text style={styles.title}>Create your Glamora account</Text>
            <Text style={styles.subtitle}>It's quick and easy.</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                placeholder="Enter Ghana phone number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {password.length > 0 && (
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color={Colors.BLACK} 
                    />
                  </TouchableOpacity>
                )}
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              <Text style={styles.passwordRequirement}>8 characters minimum</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {confirmPassword.length > 0 && (
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color={Colors.BLACK} 
                    />
                  </TouchableOpacity>
                )}
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Register Button */}
            <TouchableOpacity 
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'REGISTERING...' : 'REGISTER'}
              </Text>
            </TouchableOpacity>

            <View style={styles.signinSection}>
              <Text style={styles.signinText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                <Text style={styles.signinLink}>Sign in</Text>
              </TouchableOpacity>
            </View>

            {/* Promo Banner */}
            <View style={styles.promoBanner}>
              <Ionicons name="pricetag" size={20} color={Colors.SHEIN_ORANGE} />
              <Text style={styles.promoText}>Get GH₵3 off your first order</Text>
            </View>
          </View>

          {/* Free Shipping Section */}
          {renderFreeShippingSection()}

          {/* Go Shopping Button */}
          <TouchableOpacity style={styles.goShoppingButton}>
            <Text style={styles.goShoppingText}>GO SHOPPING</Text>
          </TouchableOpacity>

          {/* Legal Text */}
          <Text style={styles.legalText}>
            By registering, you agree to our{' '}
            <Text style={styles.linkText}>Privacy & Cookie Policy</Text>
            {' '}and{' '}
            <Text style={styles.linkText}>Terms & Conditions</Text>.
          </Text>
        </ScrollView>

        {/* Success Overlay */}
        {isRegistrationSuccess && renderSuccessOverlay()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
  },
  formContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.TEXT_SECONDARY,
    marginBottom: 8,
  },
  emailInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.BLACK,
  },
  inputError: {
    borderColor: Colors.ERROR,
  },
  errorText: {
    color: Colors.ERROR,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.BLACK,
  },
  editButton: {
    padding: 4,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.BLACK,
  },
  clearButton: {
    marginLeft: 8,
  },
  eyeButton: {
    marginLeft: 8,
  },
  passwordRequirement: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 8,
  },
  registerButton: {
    backgroundColor: Colors.BLACK,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  signinSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  signinText: {
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
  },
  signinLink: {
    fontSize: 16,
    color: Colors.SHEIN_PINK,
    fontWeight: '500',
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  promoText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.SHEIN_ORANGE,
    fontWeight: '500',
  },
  freeShippingSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  freeShippingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 16,
  },
  productsScroll: {
    flexDirection: 'row',
  },
  productCard: {
    width: 80,
    marginRight: 12,
    alignItems: 'center',
  },
  productEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.BLACK,
  },
  discountTag: {
    backgroundColor: Colors.FLASH_SALE_RED,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  discountText: {
    fontSize: 12,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
  goShoppingButton: {
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BLACK,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  goShoppingText: {
    color: Colors.BLACK,
    fontSize: 16,
    fontWeight: 'bold',
  },
  legalText: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  linkText: {
    color: Colors.ELECTRIC_BLUE,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 350,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  rewardCards: {
    flexDirection: 'row',
    gap: 16,
  },
  rewardCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 8,
  },
  rewardLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 4,
  },
  rewardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.FLASH_SALE_RED,
  },
  useButton: {
    backgroundColor: Colors.FLASH_SALE_RED,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  useButtonText: {
    color: Colors.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
