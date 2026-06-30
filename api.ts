const viteEnv = (import.meta as any).env || {};
const API_BASE_URL =
  viteEnv.VITE_API_URL ||
  (viteEnv.DEV ? 'http://localhost:3000/api' : '/api');

const TOKEN_STORAGE_KEY = 'zimmerpro_auth_token';
const ADMIN_TOKEN_BACKUP_KEY = 'zimmerpro_admin_token_backup';

const PAYLOAD_KEY = 'payload';

/** All request data is sent in the query string: `?payload=<encodeURIComponent(JSON.stringify(data))>`. */
function appendPayloadQuery(endpoint: string, data: unknown): string {
  if (data === undefined || data === null) return endpoint;
  if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data as object).length === 0) {
    return endpoint;
  }
  const sep = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${sep}${PAYLOAD_KEY}=${encodeURIComponent(JSON.stringify(data))}`;
}

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_TOKEN_BACKUP_KEY);
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const { body, ...rest } = options;
  let finalEndpoint = endpoint;
  if (body != null && String(body) !== 'undefined' && String(body) !== '') {
    const asString = typeof body === 'string' ? body : JSON.stringify(body);
    const data = JSON.parse(asString);
    finalEndpoint = appendPayloadQuery(endpoint, data);
  }

  const token = getAuthToken();

  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${finalEndpoint}`, {
      ...rest,
      method: rest.method,
      body: undefined,
      headers: Object.keys(headers).length ? headers : undefined
    });
  } catch (fetchError: any) {
    console.error(`❌ [API] Fetch failed for ${API_BASE_URL}${finalEndpoint}:`, fetchError);
    const errorMessage = fetchError.message?.includes('fetch failed') || fetchError.message?.includes('Failed to fetch')
      ? `השרת לא זמין או ניתן להתחבר. בדוק שהשרת רץ על ${API_BASE_URL}`
      : fetchError.message || 'שגיאת רשת - לא ניתן להתחבר לשרת';
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((error as any).error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const result = data.data || data;
  
  if (Array.isArray(result)) {
    return result.map(item => ({
      ...item,
      id: item.id || item._id?.toString() || item._id
    }));
  }
  
  if (result && typeof result === 'object') {
    return {
      ...result,
      id: result.id || result._id?.toString() || result._id
    };
  }
  
  return result;
};

export const unitsAPI = {
  getAll: () => apiRequest('/units'),
  getById: (id: string) => apiRequest(`/units/${id}`),
  create: (unitData: any) => apiRequest('/units', {
    method: 'POST',
    body: JSON.stringify(unitData),
  }),
  update: (id: string, unitData: any) => apiRequest(`/units/${id}`, {
    method: 'PUT',
    body: JSON.stringify(unitData),
  }),
  delete: (id: string) => apiRequest(`/units/${id}`, {
    method: 'DELETE',
  }),
};

export const uploadAPI = {
  /**
   * נשאר JSON ב-body: base64 ארוך מדי ל-URL. השרת מדלג על mergeQueryToBody כשה-body מכיל fileData.
   */
  uploadFile: async (fileData: string, fileName?: string, fileType?: string) => {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fileData, fileName, fileType }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`❌ [API] Upload failed:`, error);
      throw new Error((error as any).error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ [API] Upload response:`, data);
    if (!data.url) {
      console.error(`❌ [API] No URL in upload response:`, data);
      throw new Error('No URL returned from upload endpoint');
    }
    return data.url;
  },
};

export const roomsAPI = {
  getAll: () => apiRequest('/rooms'),
  getById: (id: string) => apiRequest(`/rooms/${id}`),
  create: (roomData: any) => apiRequest('/rooms', {
    method: 'POST',
    body: JSON.stringify(roomData),
  }),
  update: (id: string, roomData: any) => apiRequest(`/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(roomData),
  }),
  delete: (id: string) => apiRequest(`/rooms/${id}`, {
    method: 'DELETE',
  }),
  getByUnitId: async (unitId: string) => {
    const rooms = await roomsAPI.getAll();
    return rooms.filter((r: any) => r.unitId === unitId || r.lodging_id === unitId);
  },
};

export const facilitiesAPI = {
  getAll: () => apiRequest('/facilities'),
  getById: (id: string) => apiRequest(`/facilities/${id}`),
  create: (facilityData: any) => apiRequest('/facilities', {
    method: 'POST',
    body: JSON.stringify(facilityData),
  }),
  update: (id: string, facilityData: any) => apiRequest(`/facilities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(facilityData),
  }),
  delete: (id: string) => apiRequest(`/facilities/${id}`, {
    method: 'DELETE',
  }),
};

export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      console.log('🌐 Login API call: POST (query payload)', API_BASE_URL + '/auth/login');
      return await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error('השרת החזיר תגובה לא תקינה. בדקי שה-API זמין תחת /api.');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Unknown error occurred during login');
    }
  },
  googleLogin: async (googleToken: string, mode: 'login' | 'register' = 'login', role?: string) => {
    try {
      return await apiRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token: googleToken, mode, role }),
      });
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error('השרת החזיר תגובה לא תקינה. בדקי שה-API זמין תחת /api.');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Google login failed');
    }
  },
  register: async (userData: any) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  getMe: () => apiRequest('/auth/me'),
  impersonate: async (userId: string) => {
    const currentToken = getAuthToken();
    if (currentToken) {
      localStorage.setItem(ADMIN_TOKEN_BACKUP_KEY, currentToken);
    }
    const result = await apiRequest(`/auth/impersonate/${userId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (result?.token) {
      setAuthToken(result.token);
    }
    return result;
  },
  restoreAdminSession: async () => {
    const adminToken = localStorage.getItem(ADMIN_TOKEN_BACKUP_KEY);
    if (!adminToken) {
      throw new Error('No admin session to restore');
    }
    setAuthToken(adminToken);
    localStorage.removeItem(ADMIN_TOKEN_BACKUP_KEY);
    return authAPI.getMe();
  },
  sendPhoneOTP: async (phoneNumber: string, mode: 'login' | 'register' = 'login', method: 'sms' | 'voice' = 'sms') => {
    const payload = { phoneNumber, mode, method };
    console.log('📱 [API] sendPhoneOTP query payload', payload);
    return apiRequest('/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  verifyPhoneOTP: (phoneNumber: string, otp: string, userData?: any) => apiRequest('/auth/phone/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, otp, ...userData }),
  }),
  sendEmailOTP: async (idNumberOrEmail: string, mode: 'login' | 'register' = 'login') => {
    const payload = { idNumberOrEmail, mode };
    console.log('📧 [API] sendEmailOTP query payload', payload);
    return apiRequest('/auth/email/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  verifyEmailOTP: (idNumberOrEmail: string, otp: string, userData?: any) => apiRequest('/auth/email/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ idNumberOrEmail, otp, ...userData }),
  }),
};

export const bookingsAPI = {
  getAll: () => apiRequest('/bookings'),
  getById: (id: string) => apiRequest(`/bookings/${id}`),
  create: (bookingData: any) => apiRequest('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  }),
  update: (id: string, bookingData: any) => apiRequest(`/bookings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(bookingData),
  }),
  delete: (id: string) => apiRequest(`/bookings/${id}`, {
    method: 'DELETE',
  }),
};

export const contactsAPI = {
  getAll: () => apiRequest('/contacts'),
  getById: (id: string) => apiRequest(`/contacts/${id}`),
  create: (contactData: any) => apiRequest('/contacts', {
    method: 'POST',
    body: JSON.stringify(contactData),
  }),
  update: (id: string, contactData: any) => apiRequest(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(contactData),
  }),
  delete: (id: string) => apiRequest(`/contacts/${id}`, {
    method: 'DELETE',
  }),
};

export const accountsAPI = {
  getAll: () => apiRequest('/accounts'),
  getById: (id: string) => apiRequest(`/accounts/${id}`),
  create: (accountData: any) => apiRequest('/accounts', {
    method: 'POST',
    body: JSON.stringify(accountData),
  }),
  update: (id: string, accountData: any) => apiRequest(`/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(accountData),
  }),
  delete: (id: string) => apiRequest(`/accounts/${id}`, {
    method: 'DELETE',
  }),
};

export const usersAPI = {
  getAll: () => apiRequest('/users'),
  getGuests: () => apiRequest('/users/guests'),
  getById: (id: string) => apiRequest(`/users/${id}`),
  create: (userData: any) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  update: (id: string, userData: any) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  delete: (id: string) => apiRequest(`/users/${id}`, {
    method: 'DELETE',
  }),
};

export const reviewsAPI = {
  getAll: () => apiRequest('/reviews'),
  getById: (id: string) => apiRequest(`/reviews/${id}`),
  getEligibleUnits: () => apiRequest('/reviews/eligible-units'),
  create: (reviewData: any) => apiRequest('/reviews', {
    method: 'POST',
    body: JSON.stringify(reviewData),
  }),
  sendCompromise: (id: string, compromiseData: any) => apiRequest(`/reviews/${id}/compromise`, {
    method: 'POST',
    body: JSON.stringify(compromiseData),
  }),
  respondToCompromise: (id: string, responseData: any) => apiRequest(`/reviews/${id}/respond`, {
    method: 'POST',
    body: JSON.stringify(responseData),
  }),
  update: (id: string, reviewData: any) => apiRequest(`/reviews/${id}`, {
    method: 'PUT',
    body: JSON.stringify(reviewData),
  }),
  delete: (id: string) => apiRequest(`/reviews/${id}`, {
    method: 'DELETE',
  }),
  getNotifications: () => apiRequest('/reviews/notifications'),
  markNotificationRead: (id: string) => apiRequest(`/reviews/notifications/${id}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  }),
  markAllNotificationsRead: () => apiRequest('/reviews/notifications/read-all', {
    method: 'POST',
    body: JSON.stringify({}),
  }),
};

export const settingsAPI = {
  getStatistics: () => apiRequest('/settings/statistics'),
  getGoogleCalendarAuthUrl: () => apiRequest('/settings/google-calendar/auth-url'),
  connectGoogleCalendar: (code?: string) => apiRequest('/settings/google-calendar/connect', {
    method: 'POST',
    body: code ? JSON.stringify({ code }) : undefined,
  }),
  getWhatsAppConfig: () => apiRequest('/settings/whatsapp-config'),
  updateWhatsAppConfig: (config: any) => apiRequest('/settings/whatsapp-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  }),
  resetData: () => apiRequest('/settings/reset-data', {
    method: 'DELETE',
  }),
};
