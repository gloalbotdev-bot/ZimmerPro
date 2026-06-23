import contactRepository from '../5-repositories/contactRepository.js';

export class ContactService {
  async getAllContacts(user) {
    let query = {};
   
    if (user.role !== 'admin' && user.accountId) {
      query.accountId = user.accountId;
    }

    const contacts = await contactRepository.findAll(query);
    return contacts.map(c => c.toJSON());
  }

  async getContactById(id, user) {
    const contact = await contactRepository.findById(id);
    
    if (!contact) {
      throw new Error('Contact not found');
    }

    if (user.role !== 'admin' && contact.accountId?.toString() !== user.accountId?.toString()) {
      throw new Error('Access denied');
    }

    return contact.toJSON();
  }

  async createContact(contactData, user) {
    const data = {
      ...contactData
    };

  
    data.userId = user._id;

 
    if (user.role !== 'admin') {

      data.accountId = contactData.accountId || user.accountId;
      if (!data.accountId) {
        throw new Error('accountId is required2');
      }
    } else {
   
      const accountId = contactData.accountId || user.accountId;
      
      if (accountId !== undefined && accountId !== null && accountId !== 0) {
        data.accountId = accountId;
      }
     
    }

    const contact = await contactRepository.create(data);
    return contact.toJSON();
  }

  async updateContact(id, contactData, user) {
    const contact = await contactRepository.findById(id);
    
    if (!contact) {
      throw new Error('Contact not found');
    }

 
    if (user.role !== 'admin' && contact.accountId?.toString() !== user.accountId?.toString()) {
      throw new Error('Access denied');
    }

    const updatedContact = await contactRepository.update(id, contactData);
    return updatedContact.toJSON();
  }

  async deleteContact(id, user) {
    const contact = await contactRepository.findById(id);
    
    if (!contact) {
      throw new Error('Contact not found');
    }

    // Check access
    if (user.role !== 'admin' && contact.accountId?.toString() !== user.accountId?.toString()) {
      throw new Error('Access denied');
    }

    await contactRepository.delete(id);
    return { message: 'Contact deleted successfully' };
  }
}

export default new ContactService();
