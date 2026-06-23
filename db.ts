import { AppState } from './types';

// Initialize empty AppState - all data will come from MongoDB via API
export function getDB(): AppState {
  return {
    accounts: [],
    units: [],
    rooms: [],
    bookings: [],
    contacts: [],
    facilities: [],
    reviews: [],
    prices: [],
    messages: [],
    users: [],
    settings: [],
    userSettings: [],
    currentUser: undefined,
    originalAdminUser: undefined
  };
}
