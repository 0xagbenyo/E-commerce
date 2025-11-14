export const Colors = {
  // Primary Colors
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  OFF_WHITE: '#FAFAFA',
  
  // SHEIN Brand Colors
  SHEIN_PINK: '#FF4D6D',
  SHEIN_ORANGE: '#FF6B35',
  SHEIN_RED: '#FF3B30',
  
  // Accent Colors
  VIBRANT_PINK: '#FF4D6D',
  ELECTRIC_BLUE: '#007AFF',
  LIGHT_BLUE: '#5AC8FA',
  
  // Supporting Shades
  NEUTRAL_GRAY: '#8E8E93',
  LIGHT_GRAY: '#F2F2F7',
  MEDIUM_GRAY: '#C7C7CC',
  DARK_GRAY: '#3A3A3C',
  
  // Pastels
  MINT: '#98D8C8',
  LAVENDER: '#E6E6FA',
  PEACH: '#FFDAB9',
  LIGHT_PINK: '#FFF0F5',
  
  // Additional UI Colors
  BACKGROUND: '#FFFFFF',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#000000',
  TEXT_SECONDARY: '#8E8E93',
  TEXT_DISABLED: '#C7C7CC',
  BORDER: '#E5E5EA',
  SHADOW: 'rgba(0, 0, 0, 0.1)',
  
  // Status Colors
  SUCCESS: '#34C759',
  WARNING: '#FF9500',
  ERROR: '#FF3B30',
  INFO: '#007AFF',
  
  // SHEIN Specific Colors
  PROMO_ORANGE: '#FF6B35',
  FLASH_SALE_RED: '#FF3B30',
  FREE_SHIPPING_GREEN: '#34C759',
  GOLD: '#FFD700',
  ROYAL_BLUE: '#6B8CE8',
} as const;

export type ColorKeys = keyof typeof Colors;

