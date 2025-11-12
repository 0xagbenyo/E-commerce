import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export const SettingsScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => console.log('Back pressed')}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.BLACK} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Settings</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    showArrow = true,
    rightComponent?: React.ReactNode
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={20} color={Colors.BLACK} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && (
          <Ionicons name="chevron-forward" size={16} color={Colors.TEXT_SECONDARY} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderSection('Account', (
          <>
            {renderSettingItem(
              'person-outline',
              'Profile Information',
              'Edit your personal details',
              () => {}
            )}
            {renderSettingItem(
              'location-outline',
              'Shipping Addresses',
              'Manage your delivery addresses',
              () => {}
            )}
            {renderSettingItem(
              'card-outline',
              'Payment Methods',
              'Manage your payment options',
              () => {}
            )}
            {renderSettingItem(
              'shield-checkmark-outline',
              'Security',
              'Password and account security',
              () => {}
            )}
          </>
        ))}

        {renderSection('Preferences', (
          <>
            {renderSettingItem(
              'notifications-outline',
              'Push Notifications',
              'Get updates about orders and deals',
              undefined,
              false,
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.LIGHT_GRAY, true: Colors.SHEIN_PINK }}
                thumbColor={Colors.WHITE}
              />
            )}
            {renderSettingItem(
              'mail-outline',
              'Email Notifications',
              'Receive updates via email',
              undefined,
              false,
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ false: Colors.LIGHT_GRAY, true: Colors.SHEIN_PINK }}
                thumbColor={Colors.WHITE}
              />
            )}
            {renderSettingItem(
              'moon-outline',
              'Dark Mode',
              'Switch to dark theme',
              undefined,
              false,
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: Colors.LIGHT_GRAY, true: Colors.SHEIN_PINK }}
                thumbColor={Colors.WHITE}
              />
            )}
            {renderSettingItem(
              'language-outline',
              'Language',
              'English (US)',
              () => {}
            )}
            {renderSettingItem(
              'cash-outline',
              'Currency',
              'Ghanaian Cedi (GH₵)',
              () => {}
            )}
          </>
        ))}

        {renderSection('Support', (
          <>
            {renderSettingItem(
              'help-circle-outline',
              'Help Center',
              'Get help and find answers',
              () => {}
            )}
            {renderSettingItem(
              'chatbubble-outline',
              'Contact Us',
              'Reach out to our support team',
              () => {}
            )}
            {renderSettingItem(
              'document-text-outline',
              'Terms of Service',
              'Read our terms and conditions',
              () => {}
            )}
            {renderSettingItem(
              'shield-outline',
              'Privacy Policy',
              'Learn about data protection',
              () => {}
            )}
          </>
        ))}

        {renderSection('About', (
          <>
            {renderSettingItem(
              'information-circle-outline',
              'App Version',
              'SIAMAE v1.0.0',
              undefined,
              false
            )}
            {renderSettingItem(
              'star-outline',
              'Rate App',
              'Share your feedback',
              () => {}
            )}
            {renderSettingItem(
              'share-outline',
              'Share App',
              'Tell friends about SIAMAE',
              () => {}
            )}
          </>
        ))}

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color={Colors.ERROR} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
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
  headerSpacer: {
    width: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: Colors.BLACK,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.ERROR,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.ERROR,
  },
});
