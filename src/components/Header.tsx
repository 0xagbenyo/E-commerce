import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { Spacing } from '../constants/spacing';

interface HeaderProps {
  onSearchPress?: () => void;
  onMailPress?: () => void;
  onWishlistPress?: () => void;
  onMenuPress?: () => void;
  onCameraPress?: () => void;
  onCalendarPress?: () => void;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchPress,
  onMailPress,
  onWishlistPress,
  onMenuPress,
  onCameraPress,
  onCalendarPress,
  searchValue,
  onSearchChange,
}) => {
  const navigation = useNavigation();

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    } else {
      (navigation as any).navigate('Search');
    }
  };

  const handleMailPress = () => {
    if (onMailPress) {
      onMailPress();
    }
  };

  const handleWishlistPress = () => {
    if (onWishlistPress) {
      onWishlistPress();
    } else {
      (navigation as any).navigate('Wishlist');
    }
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    }
  };

  const handleCameraPress = () => {
    if (onCameraPress) {
      onCameraPress();
    }
  };

  const handleCalendarPress = () => {
    if (onCalendarPress) {
      onCalendarPress();
    }
  };

  const handleSearchSubmit = () => {
    handleSearchPress();
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {/* Left side icons */}
        <View style={styles.leftIcons}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleMailPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="mail-outline" size={22} color={Colors.WHITE} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleCalendarPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="calendar-outline" size={22} color={Colors.WHITE} />
          </TouchableOpacity>
        </View>
        
        {/* Search bar */}
        <View style={styles.searchWrapper}>
          <TouchableOpacity 
            style={styles.searchContainer} 
            onPress={handleSearchPress}
            activeOpacity={0.8}
          >
            <View style={styles.searchInputContainer}>
              {searchValue ? (
                <Text style={styles.searchText}>{searchValue}</Text>
              ) : (
                <Text style={styles.searchPlaceholder}>Search</Text>
              )}
              <TouchableOpacity 
                style={styles.cameraButton} 
                onPress={handleCameraPress}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Ionicons name="camera-outline" size={18} color={Colors.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          
          {/* Red circular search button */}
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={handleSearchSubmit}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={20} color={Colors.WHITE} />
          </TouchableOpacity>
        </View>
        
        {/* Right side icon */}
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={handleWishlistPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="heart-outline" size={22} color={Colors.WHITE} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.SCREEN_PADDING,
    paddingVertical: Spacing.PADDING_MD,
    backgroundColor: Colors.FLASH_SALE_RED, // Red background
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.MARGIN_SM,
  },
  leftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.MARGIN_MD,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.MARGIN_SM,
    gap: Spacing.MARGIN_SM,
  },
  searchContainer: {
    flex: 1,
    backgroundColor: Colors.WHITE,
    borderRadius: 20,
    paddingHorizontal: Spacing.PADDING_MD,
    paddingVertical: Spacing.PADDING_SM,
    minHeight: 40,
    justifyContent: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: Colors.TEXT_PRIMARY,
  },
  cameraButton: {
    padding: 4,
    marginLeft: Spacing.MARGIN_XS,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E02B25', // Slightly darker red for the button to create contrast
    justifyContent: 'center',
    alignItems: 'center',
  },
});
