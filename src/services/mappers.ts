/**
 * Data Mappers
 * 
 * Transform ERPNext API responses to application types
 */

import {
  User,
  Product,
  ProductColor,
  ProductSize,
  Order,
  OrderItem,
  UserAddress,
  Category,
  Cart,
  CartItem,
} from '../types';

/**
 * Strip HTML tags and decode HTML entities from text
 */
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  // Remove HTML tags and decode HTML entities
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/&apos;/g, "'") // Replace &apos; with '
    .replace(/&mdash;/g, '—') // Replace &mdash; with —
    .replace(/&ndash;/g, '–') // Replace &ndash; with –
    .replace(/&hellip;/g, '...') // Replace &hellip; with ...
    .trim();
};

/**
 * Map ERPNext Customer to User type
 */
export const mapERPCustomerToUser = (erpCustomer: any): User => {
  return {
    id: erpCustomer.name,
    email: erpCustomer.email_id || erpCustomer.email || '',
    firstName: erpCustomer.customer_name?.split(' ')[0] || '',
    lastName: erpCustomer.customer_name?.split(' ').slice(1).join(' ') || '',
    phone: erpCustomer.phone_1 || '',
    avatar: erpCustomer.image || undefined,
    loyaltyPoints: erpCustomer.custom_loyalty_points || 0,
    createdAt: erpCustomer.creation || new Date().toISOString(),
    updatedAt: erpCustomer.modified || new Date().toISOString(),
  };
};

/**
 * Map User type to ERPNext Customer data
 */
export const mapUserToERPCustomer = (user: User) => {
  return {
    customer_name: `${user.firstName} ${user.lastName}`.trim(),
    email_id: user.email,
    phone_1: user.phone || '',
    mobile_no: user.phone || '',
    customer_type: 'Individual',
    image: user.avatar,
    custom_loyalty_points: user.loyaltyPoints,
  };
};

/**
 * Map ERPNext Website Item to Product type (Primary mapping for marketplace)
 */
export const mapERPWebsiteItemToProduct = (websiteItem: any): Product => {
  // Note: price_list_rate needs to be fetched from Item Price separately
  // For now, use 0 as default - you'll need to fetch pricing separately
  const basePrice = websiteItem.price_list_rate || websiteItem.standard_rate || 0;
  const originalPrice = websiteItem.list_price || basePrice;
  const discount = originalPrice > basePrice ? originalPrice - basePrice : 0;
  const discountPercentage = originalPrice > 0 
    ? Math.round((discount / originalPrice) * 100)
    : 0;

  // Handle image URL for listings - ALWAYS use website_image from Website Item
  // This is the default/display image for product listings
  let imageUrl = websiteItem.website_image || websiteItem.thumbnail || '';
  
  // URL encode the path to handle spaces and special characters
  if (imageUrl && !imageUrl.startsWith('http')) {
    const pathParts = imageUrl.split('/');
    const encodedParts = pathParts.map((part, idx) => {
      return idx === 0 && part === '' ? '' : encodeURIComponent(part);
    });
    const encodedPath = encodedParts.join('/');
    imageUrl = `https://glamora.rxcue.net${encodedPath.startsWith('/') ? encodedPath : '/' + encodedPath}`;
  }

  // Build images array for listings - ONLY use website_image (the default image from Website Item)
  const images: string[] = [];
  if (imageUrl) {
    images.push(imageUrl);
  }
  // Note: We don't add thumbnail separately to avoid confusion - listings should show website_image only

  // Extract slideshow images for detail page
  // slideshow can be:
  // 1. A Link field pointing to a separate Website Slideshow doctype (with child table)
  // 2. A child table directly in Website Item
  // 3. An array of image objects
  const slideshowImages: string[] = [];
  
  // First, check if slideshow_data was fetched (from linked Website Slideshow document)
  if (websiteItem.slideshow_data) {
    const slideshowDoc = websiteItem.slideshow_data;
    
    // Debug: log the slideshow document structure
    console.log('Slideshow document keys:', Object.keys(slideshowDoc));
    
    // Child table names in ERPNext - try various naming conventions
    // For Website Slideshow, common names might be:
    const childTableNames = [
      'website_slideshow_item',  // Most likely for Website Slideshow
      'website_slideshow_items',
      'slideshow_items',
      'slideshow_item', 
      'slideshow_slides',
      'slides',
      'items',
      'item',
      'image_slides',
      'image_slide'
    ];
    
    // Find the child table
    let childTable: any[] = [];
    for (const tableName of childTableNames) {
      if (slideshowDoc[tableName] && Array.isArray(slideshowDoc[tableName])) {
        childTable = slideshowDoc[tableName];
        console.log(`Found child table: ${tableName} with ${childTable.length} items`);
        break;
      }
    }
    
    // If no standard name found, look for any array property that might be the child table
    if (childTable.length === 0) {
      console.log('Searching for child table in slideshow document...');
      for (const key in slideshowDoc) {
        if (Array.isArray(slideshowDoc[key]) && slideshowDoc[key].length > 0) {
          // Check if it looks like a child table (has objects with image field)
          const firstItem = slideshowDoc[key][0];
          console.log(`Checking array key: ${key}, first item:`, firstItem);
          if (firstItem && typeof firstItem === 'object' && (firstItem.image || firstItem.image_name || firstItem.Image || firstItem.Image_Name)) {
            childTable = slideshowDoc[key];
            console.log(`Found child table by inspection: ${key} with ${childTable.length} items`);
            break;
          }
        }
      }
    }
    
    // Extract images from child table rows
    if (childTable.length > 0) {
      console.log(`Extracting images from ${childTable.length} slideshow items`);
      childTable.forEach((row: any, index: number) => {
        if (!row) return;
        
        console.log(`Slide ${index}:`, row);
        
        // Check for Image field (case-insensitive, try multiple variations)
        let imagePath = null;
        if (row.image) {
          imagePath = row.image;
        } else if (row.Image) {
          imagePath = row.Image;
        } else if (row.image_name) {
          imagePath = row.image_name;
        } else if (row.Image_Name) {
          imagePath = row.Image_Name;
        } else if (row.image_url) {
          imagePath = row.image_url;
        } else if (row.Image_URL) {
          imagePath = row.Image_URL;
        }
        
        if (imagePath) {
          // URL encode the path to handle spaces and special characters in filenames
          let encodedPath = imagePath;
          if (!imagePath.startsWith('http')) {
            // Split the path into directory and filename, encode only the filename part
            const pathParts = imagePath.split('/');
            const encodedParts = pathParts.map((part, idx) => {
              // Encode all parts except the first empty string (for leading /)
              return idx === 0 && part === '' ? '' : encodeURIComponent(part);
            });
            encodedPath = encodedParts.join('/');
          }
          
          const slideUrl = imagePath.startsWith('http')
            ? imagePath
            : `https://glamora.rxcue.net${encodedPath.startsWith('/') ? encodedPath : '/' + encodedPath}`;
          if (!slideshowImages.includes(slideUrl)) {
            slideshowImages.push(slideUrl);
            console.log(`Added slideshow image ${index + 1}:`, slideUrl);
          }
        } else {
          console.warn(`No image found in slide ${index}:`, row);
        }
      });
    } else {
      console.warn('No child table found in slideshow document');
    }
  } else if (websiteItem.slideshow) {
    console.log('Website Item has slideshow field but no slideshow_data:', websiteItem.slideshow);
  }
  
  // Second, check if slideshow is a child table directly in Website Item
  if (slideshowImages.length === 0) {
    const childTableNames = [
      'slideshow_items',
      'slideshow_item',
      'slideshow',
      'items',
      'item'
    ];
    
    for (const tableName of childTableNames) {
      if (websiteItem[tableName] && Array.isArray(websiteItem[tableName])) {
        const childTable = websiteItem[tableName];
        childTable.forEach((row: any) => {
          if (!row) return;
          
          let imagePath = null;
          if (row.image) {
            imagePath = row.image;
          } else if (row.Image) {
            imagePath = row.Image;
          } else if (row.image_name) {
            imagePath = row.image_name;
          } else if (row.Image_Name) {
            imagePath = row.Image_Name;
          }
          
          if (imagePath) {
            // URL encode the path to handle spaces and special characters
            let encodedPath = imagePath;
            if (!imagePath.startsWith('http')) {
              const pathParts = imagePath.split('/');
              const encodedParts = pathParts.map((part, idx) => {
                return idx === 0 && part === '' ? '' : encodeURIComponent(part);
              });
              encodedPath = encodedParts.join('/');
            }
            
            const slideUrl = imagePath.startsWith('http')
              ? imagePath
              : `https://glamora.rxcue.net${encodedPath.startsWith('/') ? encodedPath : '/' + encodedPath}`;
            if (!slideshowImages.includes(slideUrl)) {
              slideshowImages.push(slideUrl);
            }
          }
        });
        
        if (slideshowImages.length > 0) break;
      }
    }
  }
  
  // Third, fallback: if slideshow is a direct array (legacy support)
  if (slideshowImages.length === 0 && websiteItem.slideshow && Array.isArray(websiteItem.slideshow)) {
    websiteItem.slideshow.forEach((slide: any) => {
      if (!slide) return;
      let imagePath = null;
      if (typeof slide === 'string') {
        imagePath = slide;
      } else if (slide.image || slide.Image) {
        imagePath = slide.image || slide.Image;
      }
      if (imagePath) {
        // URL encode the path to handle spaces and special characters
        let encodedPath = imagePath;
        if (!imagePath.startsWith('http')) {
          const pathParts = imagePath.split('/');
          const encodedParts = pathParts.map((part, idx) => {
            return idx === 0 && part === '' ? '' : encodeURIComponent(part);
          });
          encodedPath = encodedParts.join('/');
        }
        
        const slideUrl = imagePath.startsWith('http')
          ? imagePath
          : `https://glamora.rxcue.net${encodedPath.startsWith('/') ? encodedPath : '/' + encodedPath}`;
        if (!slideshowImages.includes(slideUrl)) {
          slideshowImages.push(slideUrl);
        }
      }
    });
  }

  // Use short_description for listings, web_long_description for detail pages
  // Strip HTML tags from description
  const rawDescription = websiteItem.web_long_description || websiteItem.short_description || websiteItem.description || '';
  const description = stripHtmlTags(rawDescription);

  // Extract Website Specifications (Label, Description table)
  // The website_specifications is a child table with Label and Description fields
  const specifications: Array<{ label: string; description: string }> = [];
  if (websiteItem.website_specifications && Array.isArray(websiteItem.website_specifications)) {
    console.log(`[Mapper] Found ${websiteItem.website_specifications.length} specifications`);
    websiteItem.website_specifications.forEach((spec: any, index: number) => {
      console.log(`[Mapper] Spec ${index}:`, spec);
      
      // Skip color and size specs as they're handled separately
      const specName = (spec.name || spec.label || spec.Label || '').toLowerCase();
      if (specName !== 'color' && specName !== 'size') {
        // Try different field name variations (Label, label, Description, description)
        const rawLabel = spec.Label || spec.label || spec.name || '';
        const rawDescription = spec.Description || spec.description || spec.value || '';
        
        // Strip HTML tags from label and description
        const label = stripHtmlTags(rawLabel);
        const description = stripHtmlTags(rawDescription);
        
        if (label || description) {
          specifications.push({
            label: label,
            description: description,
          });
          console.log(`[Mapper] Added specification: ${label} = ${description}`);
        }
      }
    });
  } else {
    console.log(`[Mapper] No website_specifications found or not an array:`, websiteItem.website_specifications);
  }

  // Debug logging
  console.log(`[Mapper] Product: ${websiteItem.name || websiteItem.web_item_name}`);
  console.log(`[Mapper] website_image: ${websiteItem.website_image}`);
  console.log(`[Mapper] images array (for listings):`, images);
  console.log(`[Mapper] slideshowImages array (for detail):`, slideshowImages);
  console.log(`[Mapper] Has slideshow link: ${websiteItem.slideshow || 'none'}`);
  console.log(`[Mapper] Specifications count: ${specifications.length}`);

  return {
    id: websiteItem.name,
    name: websiteItem.web_item_name || websiteItem.item_name || websiteItem.name,
    description: description,
    price: basePrice,
    originalPrice: originalPrice > basePrice ? originalPrice : undefined,
    discountPercentage: discountPercentage > 0 ? discountPercentage : undefined,
    category: websiteItem.item_group || 'Uncategorized',
    subcategory: '',
    brand: websiteItem.brand || 'Unknown',
    company: websiteItem.custom_company || undefined,
    images: images, // For listings - ALWAYS use website_image from Website Item
    slideshowImages: slideshowImages.length > 0 ? slideshowImages : undefined, // For detail page - use slideshow if available, otherwise undefined (will fallback to images)
    colors: extractColorsFromWebsiteItem(websiteItem),
    sizes: extractSizesFromWebsiteItem(websiteItem),
    specifications: specifications.length > 0 ? specifications : undefined,
    inStock: websiteItem.published === 1 && !websiteItem.on_backorder,
    rating: websiteItem.custom_rating || 0,
    reviewCount: websiteItem.custom_review_count || 0,
    tags: (websiteItem.tags || '').split(',').filter((t: string) => t.trim()),
    isNew: isNewProduct(websiteItem),
    isTrending: websiteItem.ranking && websiteItem.ranking > 0, // High ranking = trending
    isOnSale: discountPercentage > 0 || (websiteItem.offers && websiteItem.offers.length > 0),
    createdAt: websiteItem.creation || new Date().toISOString(),
    updatedAt: websiteItem.modified || new Date().toISOString(),
  };
};

/**
 * Extract colors from Website Item specifications
 */
const extractColorsFromWebsiteItem = (websiteItem: any): ProductColor[] => {
  // Check for specifications table with color values
  if (websiteItem.website_specifications && Array.isArray(websiteItem.website_specifications)) {
    const colorSpecs = websiteItem.website_specifications
      .filter((spec: any) => spec.name && spec.name.toLowerCase() === 'color')
      .map((spec: any) => ({
        id: spec.value || spec.label || '1',
        name: spec.value || spec.label || 'Default',
        hexCode: '#000000',
        inStock: true,
      }));
    
    if (colorSpecs.length > 0) return colorSpecs;
  }

  // Default color
  return [
    {
      id: '1',
      name: 'Default',
      hexCode: '#000000',
      inStock: true,
    },
  ];
};

/**
 * Extract sizes from Website Item specifications
 */
const extractSizesFromWebsiteItem = (websiteItem: any): ProductSize[] => {
  // Check for specifications table with size values
  if (websiteItem.website_specifications && Array.isArray(websiteItem.website_specifications)) {
    const sizeSpecs = websiteItem.website_specifications
      .filter((spec: any) => spec.name && spec.name.toLowerCase() === 'size')
      .map((spec: any) => ({
        id: spec.value || spec.label || '1',
        name: spec.value || spec.label || 'M',
        inStock: true,
      }));
    
    if (sizeSpecs.length > 0) return sizeSpecs;
  }

  // Default sizes (common for fashion)
  return [
    { id: '1', name: 'XS', inStock: true },
    { id: '2', name: 'S', inStock: true },
    { id: '3', name: 'M', inStock: true },
    { id: '4', name: 'L', inStock: true },
    { id: '5', name: 'XL', inStock: true },
    { id: '6', name: 'XXL', inStock: true },
  ];
};

/**
 * Map ERPNext Item to Product type (Legacy - for backward compatibility)
 */
export const mapERPItemToProduct = (erpItem: any, supplier?: string): Product => {
  // Use standard_rate as the base price (price_list_rate is not accessible via API)
  const basePrice = erpItem.standard_rate || 0;
  // Note: list_price and price_list_rate are not accessible via API
  // For discounts, you may need to fetch pricing from Price List API separately
  const originalPrice = basePrice;
  const discount = originalPrice > basePrice ? originalPrice - basePrice : 0;
  const discountPercentage = originalPrice > 0 
    ? Math.round((discount / originalPrice) * 100)
    : 0;

  // Handle image URL - if it's a relative path, prepend the base URL
  const imageUrl = erpItem.image 
    ? (erpItem.image.startsWith('http') 
        ? erpItem.image 
        : `https://glamora.rxcue.net${erpItem.image.startsWith('/') ? erpItem.image : '/' + erpItem.image}`)
    : '';

  return {
    id: erpItem.name,
    name: erpItem.item_name || erpItem.name,
    description: erpItem.description || '',
    price: basePrice,
    originalPrice: originalPrice > basePrice ? originalPrice : undefined,
    discountPercentage: discountPercentage > 0 ? discountPercentage : undefined,
    category: erpItem.item_group || 'Uncategorized',
    subcategory: erpItem.sub_group || '',
    brand: erpItem.brand || 'Unknown',
    company: erpItem.custom_company || undefined,
    images: imageUrl ? [imageUrl] : [],
    colors: extractColorsFromItem(erpItem),
    sizes: extractSizesFromItem(erpItem),
    inStock: erpItem.disabled === 0,
    rating: erpItem.custom_rating || 0,
    reviewCount: erpItem.custom_review_count || 0,
    tags: (erpItem.tags || '').split(',').filter((t: string) => t.trim()),
    isNew: isNewProduct(erpItem),
    isTrending: erpItem.custom_is_trending === 1,
    isOnSale: discountPercentage > 0,
    createdAt: erpItem.creation || new Date().toISOString(),
    updatedAt: erpItem.modified || new Date().toISOString(),
  };
};

/**
 * Extract colors from ERPNext Item variants or custom field
 */
const extractColorsFromItem = (erpItem: any): ProductColor[] => {
  // Check for custom colors field
  if (erpItem.custom_colors) {
    try {
      const colors = JSON.parse(erpItem.custom_colors);
      return colors.map((c: any) => ({
        id: c.id || c.color,
        name: c.color || c.name || '',
        hexCode: c.hex_code || '#000000',
        inStock: c.in_stock !== false,
      }));
    } catch (e) {
      // Fallback
    }
  }

  // Default color
  return [
    {
      id: '1',
      name: 'Default',
      hexCode: '#000000',
      inStock: true,
    },
  ];
};

/**
 * Extract sizes from ERPNext Item attributes or custom field
 */
const extractSizesFromItem = (erpItem: any): ProductSize[] => {
  // Check for custom sizes field
  if (erpItem.custom_sizes) {
    try {
      const sizes = JSON.parse(erpItem.custom_sizes);
      return sizes.map((s: any) => ({
        id: s.id || s.size,
        name: s.size || s.name || '',
        inStock: s.in_stock !== false,
      }));
    } catch (e) {
      // Fallback
    }
  }

  // Default sizes (common for fashion)
  return [
    { id: '1', name: 'XS', inStock: true },
    { id: '2', name: 'S', inStock: true },
    { id: '3', name: 'M', inStock: true },
    { id: '4', name: 'L', inStock: true },
    { id: '5', name: 'XL', inStock: true },
    { id: '6', name: 'XXL', inStock: true },
  ];
};

/**
 * Check if product is new (created within last 7 days)
 */
const isNewProduct = (erpItem: any): boolean => {
  if (!erpItem.creation) return false;
  const createdDate = new Date(erpItem.creation);
  const now = new Date();
  const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7;
};

/**
 * Map ERPNext Sales Order to Order type
 */
export const mapERPSalesOrderToOrder = (erpOrder: any): Order => {
  const shippingAddr = mapERPAddressToUserAddress(erpOrder.shipping_address_doc);
  const billingAddr = mapERPAddressToUserAddress(erpOrder.billing_address_doc);

  // Create default address if not found
  const defaultAddress: UserAddress = {
    id: erpOrder.name,
    userId: erpOrder.customer,
    type: 'home',
    firstName: '',
    lastName: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
    isDefault: true,
  };

  return {
    id: erpOrder.name,
    userId: erpOrder.custom_customer_id || '',
    orderNumber: erpOrder.name,
    status: mapERPOrderStatus(erpOrder.status),
    items: (erpOrder.items || []).map((item: any) => 
      mapERPSalesOrderItemToOrderItem(item)
    ),
    subtotal: erpOrder.sub_total || 0,
    tax: erpOrder.total_taxes_and_charges || 0,
    shipping: erpOrder.custom_shipping_amount || 0,
    discount: erpOrder.discount_amount || 0,
    total: erpOrder.grand_total || 0,
    shippingAddress: shippingAddr || defaultAddress,
    billingAddress: billingAddr || defaultAddress,
    paymentMethod: {
      id: erpOrder.name,
      userId: erpOrder.customer,
      type: 'card',
      isDefault: true,
    },
    trackingNumber: erpOrder.custom_tracking_number,
    estimatedDelivery: erpOrder.delivery_date,
    createdAt: erpOrder.creation || new Date().toISOString(),
    updatedAt: erpOrder.modified || new Date().toISOString(),
  };
};

/**
 * Map ERPNext order status to app status
 */
const mapERPOrderStatus = (erpStatus: string) => {
  const statusMap: Record<string, any> = {
    'Draft': 'pending',
    'Submitted': 'confirmed',
    'Partial': 'processing',
    'Completed': 'shipped',
    'Delivered': 'delivered',
    'Cancelled': 'cancelled',
    'Returned': 'returned',
  };
  return statusMap[erpStatus] || 'pending';
};

/**
 * Map ERPNext Sales Order Item to OrderItem
 */
const mapERPSalesOrderItemToOrderItem = (erpItem: any): OrderItem => {
  return {
    id: erpItem.name,
    productId: erpItem.item_code,
    product: {
      id: erpItem.item_code,
      name: erpItem.item_name,
      description: '',
      price: erpItem.rate,
      category: '',
      subcategory: '',
      brand: '',
      images: [],
      colors: [],
      sizes: [],
      inStock: true,
      rating: 0,
      reviewCount: 0,
      tags: [],
      isNew: false,
      isTrending: false,
      isOnSale: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    color: {
      id: erpItem.custom_color_id || '1',
      name: erpItem.custom_color || 'Default',
      hexCode: '#000000',
      inStock: true,
    },
    size: {
      id: erpItem.custom_size_id || '1',
      name: erpItem.custom_size || 'M',
      inStock: true,
    },
    quantity: erpItem.qty,
    price: erpItem.rate,
  };
};

/**
 * Map ERPNext Address to UserAddress type
 */
export const mapERPAddressToUserAddress = (erpAddress: any): UserAddress | undefined => {
  if (!erpAddress) return undefined;

  return {
    id: erpAddress.name || '',
    userId: erpAddress.customer || '',
    type: 'home',
    firstName: erpAddress.first_name || '',
    lastName: erpAddress.last_name || '',
    addressLine1: erpAddress.address_line1 || '',
    addressLine2: erpAddress.address_line2,
    city: erpAddress.city || '',
    state: erpAddress.state || '',
    postalCode: erpAddress.pincode || '',
    country: erpAddress.country || '',
    phone: erpAddress.phone || '',
    isDefault: erpAddress.is_primary_address === 1,
  };
};

/**
 * Map UserAddress to ERPNext Address data
 */
export const mapUserAddressToERPAddress = (address: UserAddress) => {
  return {
    address_type: 'Shipping',
    first_name: address.firstName,
    last_name: address.lastName,
    address_line1: address.addressLine1,
    address_line2: address.addressLine2,
    city: address.city,
    state: address.state,
    pincode: address.postalCode,
    country: address.country,
    phone: address.phone,
    is_primary_address: address.isDefault ? 1 : 0,
  };
};

/**
 * Map ERPNext Item Group to Category type
 */
export const mapERPItemGroupToCategory = (erpGroup: any): Category => {
  return {
    id: erpGroup.name,
    name: erpGroup.item_group_name,
    slug: erpGroup.name.toLowerCase().replace(/\s+/g, '-'),
    image: erpGroup.image || '',
    description: erpGroup.description,
    parentId: erpGroup.parent_item_group,
  };
};

/**
 * Map cart items to ERPNext Sales Order format
 */
export const mapCartToERPSalesOrder = (
  cart: CartItem[],
  customerId: string,
  company: string
) => {
  return {
    customer: customerId,
    company: company,
    items: cart.map((item) => ({
      item_code: item.productId,
      qty: item.quantity,
      rate: item.price,
      custom_color: item.color.name,
      custom_size: item.size.name,
    })),
  };
};

/**
 * Transform ERPNext list response
 */
export const transformERPListResponse = <T>(
  data: any[],
  mapper: (item: any) => T
): T[] => {
  return data.map(mapper);
};
