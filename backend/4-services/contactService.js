import contactRepository from '../5-repositories/contactRepository.js';
import accountRepository from '../5-repositories/accountRepository.js';
import unitRepository from '../5-repositories/unitRepository.js';
import bookingService from './bookingService.js';

function normalizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '972' + digits.slice(1);
  }
  return digits;
}

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function getUserAccountIds(user) {
  const accounts = await accountRepository.findAll({ userId: user._id });
  return accounts.map(a => a._id.toString());
}

const SUPPLIER_TYPE_FILTER = { type: { $ne: 'customer' } };

async function buildContactListQuery(user) {
  if (user.role === 'admin') {
    return { ...SUPPLIER_TYPE_FILTER };
  }

  if (user.role === 'zimmer_owner') {
    return { userId: user._id, ...SUPPLIER_TYPE_FILTER };
  }

  if (user.role === 'complex_owner' || user.role === 'manager') {
    const accountIds = await getUserAccountIds(user);
    const orConditions = [{ userId: user._id }];
    if (accountIds.length > 0) {
      orConditions.push({ accountId: { $in: accountIds } });
    }
    return { $or: orConditions, ...SUPPLIER_TYPE_FILTER };
  }

  throw new Error('Access denied');
}

async function userCanAccessContact(user, contact) {
  if (user.role === 'admin') return true;
  if (contact.userId?.toString() === user._id?.toString()) return true;

  if (user.role === 'complex_owner' || user.role === 'manager') {
    const accountIds = await getUserAccountIds(user);
    if (contact.accountId != null && accountIds.includes(contact.accountId.toString())) {
      return true;
    }
  }

  return false;
}

async function resolveAccountIdForCreate(user, contactData) {
  if (user.role === 'admin') {
    const accountId = contactData.accountId;
    if (accountId !== undefined && accountId !== null && accountId !== '') {
      return accountId;
    }
    return undefined;
  }

  if (user.role === 'complex_owner' || user.role === 'manager') {
    const accountIds = await getUserAccountIds(user);
    if (contactData.accountId && accountIds.includes(String(contactData.accountId))) {
      return contactData.accountId;
    }
    if (accountIds.length > 0) {
      return accountIds[0];
    }
    return undefined;
  }

  return undefined;
}

export class ContactService {
  async getAllContacts(user) {
    const query = await buildContactListQuery(user);
    const contacts = await contactRepository.findAll(query);
    return contacts.map(c => c.toJSON());
  }

  async getGuestContacts(user) {
    const bookings = await bookingService.getAllBookings(user);
    const activeBookings = bookings.filter(b => b.status !== 'cancelled');

    const unitIds = [...new Set(activeBookings.map(b => b.unitId).filter(Boolean))];
    const unitNameById = new Map();
    if (unitIds.length > 0) {
      const units = await unitRepository.findAll({ _id: { $in: unitIds } });
      for (const unit of units) {
        unitNameById.set(unit._id.toString(), unit.name);
      }
    }

    const guestMap = new Map();

    for (const booking of activeBookings) {
      const phoneKey = normalizePhone(booking.guestPhone);
      if (!phoneKey) continue;

      const unitId = String(booking.unitId || '');
      const checkOut = booking.checkOut || '';
      const unitName = unitNameById.get(unitId) || 'צימר לא ידוע';

      if (!guestMap.has(phoneKey)) {
        guestMap.set(phoneKey, {
          id: phoneKey,
          name: booking.guestName,
          phone: booking.guestPhone,
          notes: '',
          unitStaysMap: new Map()
        });
      }

      const guest = guestMap.get(phoneKey);
      if (checkOut >= (guest._latestCheckOut || '')) {
        guest._latestCheckOut = checkOut;
        guest.name = booking.guestName;
      }

      if (!guest.unitStaysMap.has(unitId)) {
        guest.unitStaysMap.set(unitId, {
          unitId,
          unitName,
          lastStayDate: checkOut,
          stayCount: 0
        });
      }

      const unitStay = guest.unitStaysMap.get(unitId);
      unitStay.stayCount += 1;
      if (checkOut > unitStay.lastStayDate) {
        unitStay.lastStayDate = checkOut;
      }
      if (unitName !== 'צימר לא ידוע') {
        unitStay.unitName = unitName;
      }
    }

    const noteQuery =
      user.role === 'admin'
        ? { type: 'customer', notes: { $ne: '' } }
        : user.role === 'zimmer_owner'
          ? { userId: user._id, type: 'customer', notes: { $ne: '' } }
          : await (async () => {
              const accountIds = await getUserAccountIds(user);
              const orConditions = [{ userId: user._id }];
              if (accountIds.length > 0) {
                orConditions.push({ accountId: { $in: accountIds } });
              }
              return { $or: orConditions, type: 'customer', notes: { $ne: '' } };
            })();

    const noteContacts = await contactRepository.findAll(noteQuery);

    for (const contact of noteContacts) {
      const phoneKey = normalizePhone(contact.phone);
      const guest = guestMap.get(phoneKey);
      if (guest && contact.notes) {
        guest.notes = contact.notes;
      }
    }

    return Array.from(guestMap.values())
      .map(g => {
        const unitStays = Array.from(g.unitStaysMap.values())
          .map(stay => ({
            unitId: stay.unitId,
            unitName: stay.unitName,
            lastStayDate: formatDateDDMMYYYY(stay.lastStayDate),
            stayCount: stay.stayCount
          }))
          .sort((a, b) => a.unitName.localeCompare(b.unitName, 'he'));

        const stayCount = unitStays.reduce((sum, s) => sum + s.stayCount, 0);

        return {
          id: g.id,
          name: g.name,
          phone: g.phone,
          notes: g.notes,
          stayCount,
          lastStayDate: formatDateDDMMYYYY(g._latestCheckOut || ''),
          unitStays
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
  }

  async getContactById(id, user) {
    const contact = await contactRepository.findById(id);

    if (!contact) {
      throw new Error('Contact not found');
    }

    if (!(await userCanAccessContact(user, contact))) {
      throw new Error('Access denied');
    }

    return contact.toJSON();
  }

  async createContact(contactData, user) {
    const data = {
      name: contactData.name,
      role: contactData.role || 'General',
      phone: contactData.phone,
      email: contactData.email || '',
      notes: contactData.notes || '',
      type: contactData.type || 'supplier',
      lastOrderDate: contactData.lastOrderDate || '',
      orderCount: contactData.orderCount != null ? Number(contactData.orderCount) : 0,
      userId: user._id
    };

    const accountId = await resolveAccountIdForCreate(user, contactData);
    if (accountId !== undefined) {
      data.accountId = accountId;
    }

    const contact = await contactRepository.create(data);
    return contact.toJSON();
  }

  async updateContact(id, contactData, user) {
    const contact = await contactRepository.findById(id);

    if (!contact) {
      throw new Error('Contact not found');
    }

    if (!(await userCanAccessContact(user, contact))) {
      throw new Error('Access denied');
    }

    const allowed = ['name', 'role', 'phone', 'email', 'notes', 'lastOrderDate', 'orderCount', 'type'];
    const updateData = {};
    for (const key of allowed) {
      if (contactData[key] !== undefined) {
        updateData[key] = key === 'orderCount' ? Number(contactData[key]) : contactData[key];
      }
    }

    const updatedContact = await contactRepository.update(id, updateData);
    return updatedContact.toJSON();
  }

  async deleteContact(id, user) {
    const contact = await contactRepository.findById(id);

    if (!contact) {
      throw new Error('Contact not found');
    }

    if (!(await userCanAccessContact(user, contact))) {
      throw new Error('Access denied');
    }

    await contactRepository.delete(id);
    return { message: 'Contact deleted successfully' };
  }
}

export default new ContactService();
