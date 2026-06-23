import contactService from '../4-services/contactService.js';

export class ContactController {
  async getAll(req, res, next) {
    try {
      const contacts = await contactService.getAllContacts(req.user);
      res.json({
        success: true,
        data: contacts
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const contact = await contactService.getContactById(req.params.id, req.user);
      res.json({
        success: true,
        data: contact
      });
    } catch (error) {
      if (error.message === 'Contact not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const contact = await contactService.createContact(req.body, req.user);
      res.status(201).json({
        success: true,
        data: contact
      });
    } catch (error) {
      if (error.message === 'accountId is required5') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const contact = await contactService.updateContact(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: contact
      });
    } catch (error) {
      if (error.message === 'Contact not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await contactService.deleteContact(req.params.id, req.user);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message === 'Contact not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }
}

export default new ContactController();
