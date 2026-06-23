
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

export interface SpecialPriceConfig {
  id: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  label: string; // e.g., "August Peak", "Passover"
  earlyCheckInAllowed: boolean;
  lateCheckOutAllowed: boolean;
  minNights?: number;
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
  guestName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  isPublished: boolean;
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
