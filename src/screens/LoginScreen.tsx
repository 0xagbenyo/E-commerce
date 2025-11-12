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
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { getERPNextClient } from '../services/erpnext';
import { useUserSession } from '../context/UserContext';

export const LoginScreen: React.FC = () => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const navigation = useNavigation();
  const { setUser } = useUserSession();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    // Ghana phone number validation (supports various formats)
    const phoneRegex = /^(\+233|233|0)?[235679][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleEmailOrPhoneChange = (text: string) => {
    setEmailOrPhone(text);
    const trimmedText = text.trim();
    if (trimmedText) {
      const isEmail = trimmedText.includes('@');
      const valid = isEmail ? validateEmail(trimmedText) : validatePhone(trimmedText);
      setIsValid(valid && password.length > 0);
    } else {
      setIsValid(false);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    const trimmedEmailOrPhone = emailOrPhone.trim();
    if (trimmedEmailOrPhone && text.length > 0) {
      const isEmail = trimmedEmailOrPhone.includes('@');
      const valid = isEmail ? validateEmail(trimmedEmailOrPhone) : validatePhone(trimmedEmailOrPhone);
      setIsValid(valid);
    } else {
      setIsValid(false);
    }
  };

  const handleContinue = async () => {
    const trimmedEmailOrPhone = emailOrPhone.trim();
    
    if (!trimmedEmailOrPhone) {
      alert('Please enter your email or mobile number');
      return;
    }

    if (!password) {
      alert('Please enter your password');
      return;
    }

    // Check if it's an email or phone number
    const isEmail = trimmedEmailOrPhone.includes('@');
    
    if (isEmail && !validateEmail(trimmedEmailOrPhone)) {
      alert('Please enter a valid email address');
      return;
    }

    if (!isEmail && !validatePhone(trimmedEmailOrPhone)) {
      alert('Please enter a valid Ghana phone number (e.g., 0201234567 or +233201234567)');
      return;
    }

    setIsLoading(true);
    
    try {
      const client = getERPNextClient();
      let loginIdentifier = trimmedEmailOrPhone;
      
      // If user entered phone number, look up their email first
      if (!isEmail) {
        console.log('Looking up user by phone:', trimmedEmailOrPhone);
        const userByPhone = await client.getUserByPhone(trimmedEmailOrPhone);
        if (userByPhone && userByPhone.email) {
          loginIdentifier = userByPhone.email;
          console.log('Found user email for phone:', loginIdentifier);
        } else {
          setIsLoading(false);
          alert('No account found with this phone number. Please check and try again.');
          return;
        }
      }
      
      // Call ERPNext login API with email/username
      console.log('Attempting login with:', { loginIdentifier, passwordLength: password.length });
      const loginResult = await client.login(loginIdentifier, password);
      console.log('Login successful:', loginResult);
      
      // Store user session
      // Use loginIdentifier as fallback if user field is not available
      const userEmail = loginResult.user || loginIdentifier;
      setUser({
        email: userEmail,
        fullName: loginResult.full_name || undefined,
        user: userEmail,
      });
      
      console.log('User session stored:', { email: userEmail, fullName: loginResult.full_name });
      
      // Reset navigation stack to prevent going back to login
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' as never }],
        })
      );
    } catch (error: any) {
      setIsLoading(false);
      // Extract error message - the error should already have a meaningful message from extractLoginErrorMessage
      const errorMessage = error?.message || 'Login failed. Please check your credentials and try again.';
      alert(errorMessage);
      console.error('Login error:', error);
      // Log original error details for debugging
      if (error?.originalError) {
        console.error('Original error:', error.originalError);
      }
    }
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
              <Text style={styles.logo}>SIAMAE</Text>
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
                  emailOrPhone.trim() && !isValid && styles.inputError
                ]}
                placeholder="Enter email or phone number"
                value={emailOrPhone}
                onChangeText={handleEmailOrPhoneChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailOrPhone.trim() && !isValid && (
                <Text style={styles.errorText}>
                  {emailOrPhone.includes('@') ? 'Please enter a valid email address' : 'Please enter a valid Ghana phone number'}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    password.length > 0 && !isValid && styles.inputError
                  ]}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={handlePasswordChange}
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
                {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('ForgotPassword' as never)}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
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
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.BLACK,
  },
  eyeButton: {
    marginLeft: 8,
    padding: 4,
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
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.ELECTRIC_BLUE,
    fontWeight: '500',
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

