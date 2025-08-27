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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    // Ghana phone number validation (supports various formats)
    const phoneRegex = /^(\+233|233|0)?[235679][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    const trimmedText = text.trim();
    if (trimmedText) {
      const isEmail = trimmedText.includes('@');
      const valid = isEmail ? validateEmail(trimmedText) : validatePhone(trimmedText);
      setIsValid(valid);
    } else {
      setIsValid(false);
    }
  };

  const handleContinue = async () => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      alert('Please enter your email or mobile number');
      return;
    }

    // Check if it's an email or phone number
    const isEmail = trimmedEmail.includes('@');
    
    if (isEmail && !validateEmail(trimmedEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    if (!isEmail && !validatePhone(trimmedEmail)) {
      alert('Please enter a valid Ghana phone number (e.g., 0201234567 or +233201234567)');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      console.log('Login successful with:', { email: trimmedEmail });
      // Navigate to main app
      navigation.navigate('Main' as never);
    }, 1000);
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
  };

  const handleRegister = () => {
    navigation.navigate('Register' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={Colors.BLACK} />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>GLAMORA</Text>
              <Text style={styles.logoSuffix}>GH</Text>
            </View>
            <View style={styles.securityInfo}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.SUCCESS} />
              <Text style={styles.securityText}>Your data is protected.</Text>
            </View>
          </View>

          {/* Promo Banner */}
          <View style={styles.promoBanner}>
            <Ionicons name="pricetag" size={20} color={Colors.SHEIN_ORANGE} />
                          <Text style={styles.promoText}>Get GH₵3 off your first order</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mobile number or email address</Text>
              <TextInput
                style={[
                  styles.input,
                  email.trim() && !isValid && styles.inputError
                ]}
                placeholder=""
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {email.trim() && !isValid && (
                <Text style={styles.errorText}>
                  {email.includes('@') ? 'Please enter a valid email address' : 'Please enter a valid Ghana phone number'}
                </Text>
              )}
            </View>

            <TouchableOpacity 
              style={[
                styles.continueButton, 
                (isLoading || !isValid) && styles.continueButtonDisabled
              ]}
              onPress={handleContinue}
              disabled={isLoading || !isValid}
            >
              <Text style={styles.continueButtonText}>
                {isLoading ? 'CONTINUING...' : 'CONTINUE'}
              </Text>
            </TouchableOpacity>

            <View style={styles.signupSection}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register' as never)}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or join with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleSocialLogin('google')}
              >
                <Text style={styles.googleLogo}>G</Text>
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleSocialLogin('facebook')}
              >
                <Text style={styles.facebookLogo}>f</Text>
                <Text style={styles.socialButtonText}>Continue with Facebook</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.locationButton}>
              <Ionicons name="location" size={16} color={Colors.BLACK} />
              <Text style={styles.locationText}>Ghana</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.BLACK} />
            </TouchableOpacity>
          </View>

          {/* Legal Text */}
          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text style={styles.linkText}>Privacy & Cookie Policy</Text>
            {' '}and{' '}
            <Text style={styles.linkText}>Terms & Conditions</Text>.
          </Text>
        </ScrollView>
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  logoSuffix: {
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
    marginLeft: 4,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.SUCCESS,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 30,
  },
  promoText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.SHEIN_ORANGE,
    fontWeight: '500',
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
  input: {
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  continueButton: {
    backgroundColor: Colors.BLACK,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 30,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.BORDER,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  socialButtons: {
    gap: 12,
    marginBottom: 30,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  googleLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    color: Colors.WHITE,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  facebookLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    color: Colors.WHITE,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 16,
    color: Colors.BLACK,
    fontWeight: '500',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 30,
  },
  locationText: {
    marginHorizontal: 8,
    fontSize: 14,
    color: Colors.BLACK,
    fontWeight: '500',
  },
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signupText: {
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
  },
  signupLink: {
    fontSize: 16,
    color: Colors.SHEIN_PINK,
    fontWeight: '500',
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
});

