import { Account, User, UserRole, ZimmerUnit } from '../types';

export const filterUnitsForUser = (
  units: ZimmerUnit[],
  user: User | undefined,
  accounts: Account[] = []
): ZimmerUnit[] => {
  if (!user) return [];

  if (user.role === UserRole.CLIENT || user.role === UserRole.CUSTOMER) {
    return [];
  }

  if (user.role === UserRole.ADMIN) {
    return units;
  }

  const userId = user.id?.toString();

  if (user.role === UserRole.ZIMMER_OWNER) {
    return units.filter(
      u => u.linkType === 'user' && u.linkedToId?.toString() === userId
    );
  }

  const userAccountIds = accounts
    .filter(a => a.userId?.toString() === userId)
    .map(a => a.id?.toString());

  return units.filter(
    u => u.linkType === 'account' && userAccountIds.includes(u.linkedToId?.toString())
  );
};

export const filterUnitsForSelectedUser = (
  units: ZimmerUnit[],
  selectedUser: User | undefined,
  accounts: Account[] = []
): ZimmerUnit[] => {
  if (!selectedUser) return [];

  if (selectedUser.role === UserRole.ZIMMER_OWNER) {
    const userId = selectedUser.id?.toString();
    return units.filter(
      u => u.linkType === 'user' && u.linkedToId?.toString() === userId
    );
  }

  const userAccountIds = accounts
    .filter(a => a.userId?.toString() === selectedUser.id?.toString())
    .map(a => a.id?.toString());

  return units.filter(
    u => u.linkType === 'account' && userAccountIds.includes(u.linkedToId?.toString())
  );
};
