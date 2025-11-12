import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';

const { width } = Dimensions.get('window');

interface CategoryTabsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categories?: string[];
  variant?: 'default' | 'red'; // Variant for different background colors
  showMenuIcon?: boolean; // Show hamburger menu icon on the right
  onMenuPress?: () => void; // Handler for menu icon press
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  selectedCategory,
  onSelectCategory,
  categories = ['All', 'Women', 'Kids', 'Men', 'Curve', 'Home'],
  variant = 'default',
  showMenuIcon = false,
  onMenuPress,
}) => {
  const navigation = useNavigation();
  const isRedVariant = variant === 'red';
  
  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    } else {
      // Navigate to Categories screen
      (navigation as any).navigate('Categories');
    }
  };
  
  return (
    <View style={[styles.container, isRedVariant && styles.containerRed]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.tab,
              isRedVariant && styles.tabRed,
              selectedCategory === category && (isRedVariant ? styles.tabActiveRed : styles.tabActive),
            ]}
            onPress={() => onSelectCategory(category)}
          >
            <Text
              style={[
                styles.tabText,
                isRedVariant && styles.tabTextRed,
                selectedCategory === category && (isRedVariant ? styles.tabTextActiveRed : styles.tabTextActive),
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {showMenuIcon && (
        <View style={styles.menuIconContainer}>
          <TouchableOpacity 
            style={styles.menuIcon}
            onPress={handleMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={24} color={isRedVariant ? Colors.WHITE : Colors.BLACK} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.LIGHT_GRAY,
    backgroundColor: Colors.WHITE,
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerRed: {
    backgroundColor: Colors.FLASH_SALE_RED,
    borderBottomWidth: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.PADDING_MD,
    paddingVertical: Spacing.PADDING_SM,
    gap: Spacing.MARGIN_SM,
  },
  tab: {
    paddingHorizontal: Spacing.PADDING_MD,
    paddingVertical: Spacing.PADDING_SM,
    borderRadius: 20,
    backgroundColor: Colors.LIGHT_GRAY,
    marginRight: Spacing.MARGIN_XS,
  },
  tabRed: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingBottom: Spacing.PADDING_SM,
  },
  tabActive: {
    backgroundColor: Colors.SHEIN_PINK,
  },
  tabActiveRed: {
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: Colors.WHITE,
  },
  tabText: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.DARK_GRAY,
    fontWeight: '500',
  },
  tabTextRed: {
    color: Colors.WHITE,
  },
  tabTextActive: {
    color: Colors.WHITE,
  },
  tabTextActiveRed: {
    color: Colors.WHITE,
    fontWeight: '600',
  },
  menuIconContainer: {
    paddingRight: Spacing.PADDING_MD,
    paddingLeft: Spacing.PADDING_SM,
  },
  menuIcon: {
    padding: Spacing.PADDING_XS,
  },
});

