
// User Roles for the system
export enum UserRole {
  ADMIN = 'admin',
  ZIMMER_OWNER = 'zimmer_owner',
  COMPLEX_OWNER = 'complex_owner',
  MANAGER = 'manager',
  CLIENT = 'client',
  CUSTOMER = 'customer'
}

export interface Settings {
  id: string;
  ownerType: 'zimmer_owner' | 'complex_owner'; // בעל צימר או בעל מתחם
  numberOfComplexes: number; // כמה מתחמים (אם הוא בעל מתחם)
}

export interface UserSettings {
  id: string;
  ownerType: 'client' | 'zimmer_owner' | 'complex_owner' | 'admin'; // לקוח, בעל צימר, בעל מתחם או אדמין
  numberOfComplexes: number; // כמה מתחמים (אם הוא בעל מתחם)
}

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  password?: string;
  role: UserRole;
  userSettingsId: string; // ObjectId of UserSettings (MongoDB _id) - חובה
  userSettings?: UserSettings; // UserSettings object (loaded from backend)
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  preferredLanguage?: 'he' | 'en' | 'ar';
  googleCalendarLinked?: boolean;
  // Note: User is NOT linked to Account anymore - Account is linked to User via userId
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export enum UnitStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance'
}

export type PriceSeason = 'winter' | 'summer';
export type PriceMode   = 'midweek' | 'weekend' | 'peak';

export interface SpecialPriceConfig {
  id: string;
  season: PriceSeason;
  mode: PriceMode;
  pricePerNight: number;
  // weekday range — used only when mode is 'midweek' or 'weekend'.
  // 0 = Sunday ... 6 = Saturday.
  dayFrom?: number;
  dayTo?: number;
  // date range — used only when mode is 'peak'.
  startDate?: string;
  endDate?: string;
  isDefault?: boolean;
  // --- legacy / optional, kept for backward compatibility ---
  label?: string;
  earlyCheckInAllowed?: boolean;
  lateCheckOutAllowed?: boolean;
  minNights?: number;
  dayType?: string;   // from any prior attempt; ignore but keep optional
  price?: number;     // very old rows; mapped to pricePerNight on load
}

export interface Account {
  id: string; // MongoDB _id as string
  name: string;
  phone: string;
  email: string;
  logo: string;
  primary_contact_id: number;
  is_active: boolean;
  whatsapp_number?: string;
  maxUnits: number;
  userId?: string; // ObjectId of User (MongoDB _id) - Account מקושר ל-User
}

export interface Room {
  id: string;
  lodging_id: string;
  name: string;
  room_type: 'bedroom' | 'living_room' | 'kitchen' | 'bathroom';
  has_jacuzzi: boolean;
  has_view: boolean;
  beds_count: number;
  windows_count: number;
  has_ac: boolean;
  has_tv: boolean;
  facilityIds?: string[]; // Many-to-many relationship with Facilities
}

export interface ZimmerUnit {
  id: string;
  linkType: 'user' | 'account'; // האם מוקשר ל-User או ל-Account
  linkedToId: string; // ObjectId של User או Account (תלוי ב-linkType)
  name: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  status: UnitStatus;
  images: string[];
  mainImage?: string; // Primary/main image URL
  videoUrl?: string; 
  facilityIds?: string[];
  specialPrices?: SpecialPriceConfig[];
  region?: 'צפון' | 'דרום' | 'מרכז' | 'השפלה';
}

export interface Review {
  id: string;
  unitId: string;
  guestUserId?: string | null;
  guestName: string;
  bookingId?: string | null;
  rating: number | null;
  comment: string;
  date: string;
  status: 'pending_owner' | 'compromise_sent' | 'counter_sent' | 'published' | 'withdrawn';
  isPublished: boolean;
  ownerResponseDeadline?: string;
  compromiseDeadline?: string;
  compromiseOffer?: {
    type: 'discount_20' | 'credit_150' | 'reasoned_response' | 'custom';
    customText: string;
    sentAt: string;
  } | null;
  guestResponse?: {
    action: 'accepted' | 'rejected' | 'counter';
    text: string;
    respondedAt: string;
  } | null;
  createdAt?: string;
}

export interface ReviewNotification {
  id: string;
  userId: string;
  type: 'new_review' | 'compromise_received' | 'guest_counter' | 'review_published';
  reviewId?: string;
  message: string;
  read: boolean;
  createdAt?: string;
}

export interface Booking {
  id: string;
  unitId: string;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: BookingStatus;
  googleSynced?: boolean;
  userId?: string | null;
}

export interface Contact {
  id: string;
  accountId: number;
  name: string;
  role: string;
  phone: string;
  email: string;
  notes?: string;
}

export interface Facility {
  id: string;
  accountId: number;
  name: string;
  category: 'indoor' | 'outdoor' | 'general' | 'service';
  icon: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface AppState {
  accounts: Account[];
  units: ZimmerUnit[];
  rooms: Room[]; 
  bookings: Booking[];
  contacts: Contact[];
  facilities: Facility[];
  reviews: Review[];
  prices: any[];
  messages: ChatMessage[];
  users: User[];
  settings: Settings[];
  userSettings: UserSettings[];
  currentUser?: User;
  originalAdminUser?: User; // For admin impersonation feature
}
