import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, Booking, User, UserRole, ZimmerUnit } from '../types';
import { unitsAPI, bookingsAPI, usersAPI } from '../api';
import { filterUnitsForUser, filterUnitsForSelectedUser } from '../utils/unitFilters';

interface UseCalendarDataOptions {
  db: AppState;
  setDb: (db: AppState) => void;
}

export const useCalendarData = ({ db, setDb }: UseCalendarDataOptions) => {
  const user = db.currentUser;
  const isAdmin = user?.role === UserRole.ADMIN;

  const [units, setUnits] = useState<ZimmerUnit[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUnits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await unitsAPI.getAll();
      setUnits(data || []);
      setDb({ ...db, units: data || [] });
    } catch (err) {
      console.error('[Calendar] Error loading units:', err);
    } finally {
      setLoading(false);
    }
  }, [db, setDb]);

  const loadBookings = useCallback(async () => {
    try {
      const data = await bookingsAPI.getAll();
      setBookings(data || []);
      setDb({ ...db, bookings: data || [] });
    } catch (err) {
      console.error('[Calendar] Error loading bookings:', err);
    }
  }, [db, setDb]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data || []);
    } catch (err) {
      console.error('[Calendar] Error loading users:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadUnits(), loadBookings()]);
  }, [loadUnits, loadBookings]);

  useEffect(() => {
    loadUnits();
    loadBookings();
    if (isAdmin) loadUsers();
  }, []);

  const displayedUnits = useMemo(
    () => filterUnitsForUser(units, user, db.accounts),
    [units, user, db.accounts]
  );

  const getAvailableUnits = useCallback(
    (selectedUserId: string): ZimmerUnit[] => {
      if (isAdmin && selectedUserId) {
        const selectedUser = users.find(u => u.id === selectedUserId);
        return filterUnitsForSelectedUser(units, selectedUser, db.accounts);
      }
      return displayedUnits;
    },
    [isAdmin, users, units, displayedUnits, db.accounts]
  );

  return {
    units,
    bookings,
    users,
    loading,
    setLoading,
    isAdmin,
    user,
    displayedUnits,
    getAvailableUnits,
    loadBookings,
    refreshAll,
  };
};
