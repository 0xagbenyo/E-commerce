import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { useUserSession } from '../context/UserContext';
import { getERPNextClient } from '../services/erpnext';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useUserSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const client = getERPNextClient();
        const userData = await client.getUserByEmail(user.email);
        if (userData) {
          setUserDetails(userData);
          setPhone(userData.mobile_no || '');
          setLocation(userData.location || '');
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        Alert.alert('Error', 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [user?.email]);

  const handleSave = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'User email not found');
      return;
    }

    try {
      setSaving(true);
      const client = getERPNextClient();
      await client.updateUser(user.email, {
        mobile_no: phone.trim(),
        location: location.trim(),
      });

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            (navigation as any).goBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getUserDisplayName = () => {
    if (userDetails) {
      if (userDetails.full_name) return userDetails.full_name;
      if (userDetails.first_name || userDetails.last_name) {
        return `${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim();
      }
    }
    return user?.fullName || user?.email || 'User';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (navigation as any).goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.BLACK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.SHEIN_PINK} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (navigation as any).goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.BLACK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Info Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            {/* User Name - Uneditable */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.disabledText}>{getUserDisplayName()}</Text>
                <Ionicons name="lock-closed" size={16} color={Colors.TEXT_SECONDARY} />
              </View>
            </View>

            {/* Email - Uneditable */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.disabledText}>{user?.email || userDetails?.email || ''}</Text>
                <Ionicons name="lock-closed" size={16} color={Colors.TEXT_SECONDARY} />
              </View>
            </View>
          </View>

          {/* Contact Info Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            {/* Phone - Editable */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor={Colors.TEXT_SECONDARY}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Location - Editable */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                placeholderTextColor={Colors.TEXT_SECONDARY}
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.WHITE} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.SCREEN_PADDING,
    paddingVertical: Spacing.PADDING_MD,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
    backgroundColor: Colors.WHITE,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.PADDING_XL,
  },
  loadingText: {
    marginTop: Spacing.MARGIN_MD,
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.PADDING_SM,
    paddingBottom: Spacing.PADDING_LG,
  },
  card: {
    backgroundColor: Colors.WHITE,
    borderRadius: 8,
    padding: Spacing.PADDING_SM,
    marginBottom: Spacing.MARGIN_SM,
    ...Spacing.SHADOW_MD,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.SHEIN_PINK,
    marginBottom: Spacing.MARGIN_SM,
  },
  inputContainer: {
    marginBottom: Spacing.MARGIN_SM,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_XS,
  },
  input: {
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 6,
    paddingHorizontal: Spacing.PADDING_SM,
    paddingVertical: Spacing.PADDING_SM,
    fontSize: 14,
    color: Colors.BLACK,
    minHeight: 40,
  },
  inputDisabled: {
    backgroundColor: Colors.LIGHT_GRAY,
    borderColor: Colors.BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabledText: {
    flex: 1,
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  saveButton: {
    backgroundColor: Colors.SHEIN_PINK,
    borderRadius: 6,
    paddingVertical: Spacing.PADDING_SM,
    alignItems: 'center',
    marginTop: Spacing.MARGIN_SM,
    minHeight: 40,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

