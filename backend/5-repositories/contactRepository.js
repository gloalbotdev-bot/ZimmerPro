import Contact from '../models/Contact.js';

export class ContactRepository {
  async findAll(query = {}) {
    return await Contact.find(query);
  }

  async findById(id) {
    return await Contact.findById(id);
  }

  async create(contactData) {
    const contact = new Contact(contactData);
    return await contact.save();
  }

  async update(id, contactData) {
    return await Contact.findByIdAndUpdate(
      id,
      contactData,
      { new: true, runValidators: true }
    );
  }

  async delete(id) {
    return await Contact.findByIdAndDelete(id);
  }

  async findByAccountId(accountId) {
    return await Contact.find({ accountId });
  }
}

export default new ContactRepository();
