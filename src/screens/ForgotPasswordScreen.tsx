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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../components/Button';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Spacing } from '../constants/spacing';

export const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const navigation = useNavigation();

  const handleResetPassword = async () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsEmailSent(true);
    }, 2000);
  };

  const handleBackToLogin = () => {
    navigation.goBack();
  };

  const handleResendEmail = () => {
    setIsEmailSent(false);
    setEmail('');
  };

  if (isEmailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LinearGradient
            colors={[Colors.VIBRANT_PINK, Colors.ELECTRIC_BLUE]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToLogin}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.WHITE} />
            </TouchableOpacity>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={Colors.WHITE} />
            </View>
            <Text style={styles.logo}>GLAMORA</Text>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a password reset link to:
            </Text>
            <Text style={styles.emailText}>{email}</Text>
            
            <Text style={styles.instructions}>
              Click the link in the email to reset your password. The link will expire in 24 hours.
            </Text>

            <View style={styles.buttonContainer}>
              <Button
                title="Back to Login"
                onPress={handleBackToLogin}
                variant="primary"
                size="large"
                fullWidth
                style={styles.backToLoginButton}
              />

              <Button
                title="Resend Email"
                onPress={handleResendEmail}
                variant="outline"
                size="large"
                fullWidth
                style={styles.resendButton}
              />
            </View>

            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>Didn't receive the email?</Text>
              <Text style={styles.helpSubtext}>
                Check your spam folder or try a different email address
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LinearGradient
            colors={[Colors.VIBRANT_PINK, Colors.ELECTRIC_BLUE]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToLogin}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.WHITE} />
            </TouchableOpacity>
            <Text style={styles.logo}>GLAMORA</Text>
            <Text style={styles.tagline}>Reset your password</Text>
          </LinearGradient>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your email and we'll send you reset instructions.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.TEXT_SECONDARY} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <Button
              title="Send Reset Link"
              onPress={handleResetPassword}
              variant="primary"
              size="large"
              loading={isLoading}
              fullWidth
              style={styles.resetButton}
            />

            <View style={styles.backToLoginContainer}>
              <Text style={styles.backToLoginText}>Remember your password? </Text>
              <TouchableOpacity onPress={handleBackToLogin}>
                <Text style={styles.backToLoginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>Need help?</Text>
              <Text style={styles.helpSubtext}>
                Contact our support team at support@glamora.com
              </Text>
            </View>
          </View>
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
  },
  header: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.PADDING_XL,
  },
  backButton: {
    position: 'absolute',
    top: Spacing.PADDING_LG,
    left: Spacing.PADDING_LG,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: Spacing.MARGIN_MD,
  },
  logo: {
    fontSize: Typography.FONT_SIZE_3XL,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.WHITE,
    letterSpacing: Typography.LETTER_SPACING_WIDE,
    marginBottom: Spacing.MARGIN_SM,
  },
  tagline: {
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    color: Colors.WHITE,
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: Spacing.PADDING_XL,
    paddingTop: Spacing.PADDING_XL,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.PADDING_XL,
    paddingTop: Spacing.PADDING_XL,
  },
  title: {
    fontSize: Typography.FONT_SIZE_2XL,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_SM,
  },
  subtitle: {
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.TEXT_SECONDARY,
    marginBottom: Spacing.MARGIN_XL,
    lineHeight: Typography.FONT_SIZE_MD * 1.5,
  },
  inputContainer: {
    marginBottom: Spacing.MARGIN_XL,
  },
  label: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_SM,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.SURFACE,
    borderRadius: Spacing.BORDER_RADIUS_MD,
    paddingHorizontal: Spacing.PADDING_MD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    ...Spacing.SHADOW_SM,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.PADDING_MD,
    paddingHorizontal: Spacing.PADDING_SM,
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.TEXT_PRIMARY,
  },
  resetButton: {
    marginBottom: Spacing.MARGIN_XL,
  },
  backToLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.MARGIN_XL,
  },
  backToLoginText: {
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.TEXT_SECONDARY,
  },
  backToLoginLink: {
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.VIBRANT_PINK,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
  },
  helpContainer: {
    alignItems: 'center',
    marginTop: Spacing.MARGIN_LG,
  },
  helpText: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_SM,
  },
  helpSubtext: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: Typography.FONT_SIZE_SM * 1.4,
  },
  emailText: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.VIBRANT_PINK,
    textAlign: 'center',
    marginBottom: Spacing.MARGIN_LG,
  },
  instructions: {
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: Typography.FONT_SIZE_MD * 1.5,
    marginBottom: Spacing.MARGIN_XL,
  },
  buttonContainer: {
    marginBottom: Spacing.MARGIN_XL,
  },
  backToLoginButton: {
    marginBottom: Spacing.MARGIN_MD,
  },
  resendButton: {
    marginBottom: Spacing.MARGIN_MD,
  },
});
