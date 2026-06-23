import { google } from 'googleapis';
import userRepository from '../5-repositories/userRepository.js';

export class GoogleCalendarService {
  /**
   * Get authenticated Google Calendar client for user
   */
  async getCalendarClient(userId) {
    const user = await userRepository.findById(userId);
    
    if (!user || !user.googleCalendarLinked || !user.googleAccessToken) {
      throw new Error('Google Calendar not connected for this user');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/google/callback'
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    });

    // Refresh token if expired
    try {
      await oauth2Client.refreshAccessToken();
      const tokens = oauth2Client.credentials;
      
      // Update tokens in database if refreshed
      if (tokens.access_token && tokens.access_token !== user.googleAccessToken) {
        await userRepository.update(userId, {
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token || user.googleRefreshToken
        });
      }
    } catch (error) {
      console.error('❌ [GoogleCalendar] Error refreshing token:', error);
      // If refresh fails, user needs to reconnect
      throw new Error('Google Calendar token expired. Please reconnect.');
    }

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Sync booking to Google Calendar
   */
  async syncBookingToGoogleCalendar(booking, unit, userId) {
    try {
      const calendar = await this.getCalendarClient(userId);
      const user = await userRepository.findById(userId);
      const calendarId = user.googleCalendarId || 'primary';

      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);

      const event = {
        summary: `הזמנה: ${unit.name || 'יחידה'}`,
        description: `אורח: ${booking.guestName}\nטלפון: ${booking.guestPhone}\nמחיר: ₪${booking.totalPrice}`,
        start: {
          dateTime: checkInDate.toISOString(),
          timeZone: 'Asia/Jerusalem'
        },
        end: {
          dateTime: checkOutDate.toISOString(),
          timeZone: 'Asia/Jerusalem'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 } // 1 hour before
          ]
        }
      };

      if (booking.googleCalendarEventId) {
        // Update existing event
        const updatedEvent = await calendar.events.update({
          calendarId,
          eventId: booking.googleCalendarEventId,
          resource: event
        });
        console.log('✅ [GoogleCalendar] Event updated:', updatedEvent.data.id);
        return updatedEvent.data.id;
      } else {
        // Create new event
        const createdEvent = await calendar.events.insert({
          calendarId,
          resource: event
        });
        console.log('✅ [GoogleCalendar] Event created:', createdEvent.data.id);
        return createdEvent.data.id;
      }
    } catch (error) {
      console.error('❌ [GoogleCalendar] Error syncing booking:', error);
      // Don't throw - allow booking to be saved even if calendar sync fails
      console.warn('⚠️ [GoogleCalendar] Booking saved but calendar sync failed');
      return null;
    }
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteCalendarEvent(eventId, userId) {
    try {
      const calendar = await this.getCalendarClient(userId);
      const user = await userRepository.findById(userId);
      const calendarId = user.googleCalendarId || 'primary';

      await calendar.events.delete({
        calendarId,
        eventId
      });
      console.log('✅ [GoogleCalendar] Event deleted:', eventId);
    } catch (error) {
      console.error('❌ [GoogleCalendar] Error deleting event:', error);
      // Don't throw - event might not exist
    }
  }
}

export default new GoogleCalendarService();
