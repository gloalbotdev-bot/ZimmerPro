
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { AppState, ChatMessage } from "./types";
import { Language } from "./translations";

const createBookingDeclaration: FunctionDeclaration = {
  name: 'create_booking',
  parameters: {
    type: Type.OBJECT,
    description: 'Create a new zimmer booking in the system after confirming all details and payment with the guest.',
    properties: {
      unitId: { type: Type.STRING, description: 'The unique ID of the zimmer unit selected.' },
      guestName: { type: Type.STRING, description: 'Full name of the guest.' },
      guestPhone: { type: Type.STRING, description: 'WhatsApp/Phone number of the guest.' },
      checkIn: { type: Type.STRING, description: 'Check-in date in YYYY-MM-DD format.' },
      checkOut: { type: Type.STRING, description: 'Check-out date in YYYY-MM-DD format.' },
      totalPrice: { type: Type.NUMBER, description: 'Total price for the entire stay.' }
    },
    required: ['unitId', 'guestName', 'guestPhone', 'checkIn', 'checkOut', 'totalPrice'],
  },
};

const searchUnitsDeclaration: FunctionDeclaration = {
  name: 'search_available_units',
  parameters: {
    type: Type.OBJECT,
    description: 'Search for available zimmer units based on dates and optionally number of guests.',
    properties: {
      checkIn: { type: Type.STRING, description: 'Check-in date (YYYY-MM-DD)' },
      checkOut: { type: Type.STRING, description: 'Check-out date (YYYY-MM-DD)' },
      guests: { type: Type.NUMBER, description: 'Number of guests' }
    },
    required: ['checkIn', 'checkOut'],
  },
};

export async function processGuestMessage(messages: ChatMessage[], context: AppState, lang: Language) {
  // Get Gemini API key from environment variable (VITE_ prefix needed for frontend)
  // Try both VITE_GEMINI_API_KEY and GEMINI_API_KEY (if exported from backend)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    console.error('VITE_GEMINI_API_KEY לא מוגדר');
    throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to .env.local');
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';
  
  const langNames = { he: 'Hebrew', en: 'English', ar: 'Arabic' };

  // Convert history to Gemini format
  const history = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));

  const systemInstruction = `
    אתה בוט הזמנות של ZimmerPro ב-WhatsApp.
    דבר ב${langNames[lang]}, בקצרה וברור.
    
    סדר הפעולות:
    1. ברכה ושאלת שם: "${lang === 'he' ? 'שלום, מה השם?' : 'Hello, what\'s your name?'}"
    2. תאריכים — אם חסרים, שאל. המר ביטויים כמו "סופ״ש" ל-YYYY-MM-DD.
    3. כשיש תאריכים — קרא ל-search_available_units.
    4. הצג יחידות (שם, מחיר).
    5. המתן לבחירה מפורשת של הלקוח.
    6. בקש טלפון: "${lang === 'he' ? 'מה מספר הטלפון?' : 'What\'s your phone number?'}"
    7. לדמו — בקש 4 ספרות אשראי: "${lang === 'he' ? 'הזן 4 ספרות אשראי (למשל 4580)' : 'Enter 4 credit card digits (e.g. 4580)'}"
    8. אחרי 4 ספרות — קרא ל-create_booking עם כל השדות.
    
    CRITICAL RULES:
    - ALWAYS communicate in ${langNames[lang]}.
    - DO NOT skip steps! Follow the flow strictly: Name → Dates → Search → Select → Phone → Payment → Book.
    - If guest provides name early (e.g. "אני דוד"), remember it and use it in create_booking.
    - Extract name from messages like "השם שלי הוא X", "קוראים לי X", "אני X".
    - Be concise, professional, and friendly. Use emojis like 🏨, ✨, ✅.
    - Today is ${new Date().toISOString().split('T')[0]}.
    - Context: Units available in the system are: ${context.units.map(u => `${u.name} (ID:${u.id}, Price:₪${u.pricePerNight})`).join(', ') || 'None'}.
    - When calling create_booking, ALWAYS provide guestName from the conversation history.
    - Calculate totalPrice = (checkOut - checkIn days) * unit.pricePerNight if not provided.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: history,
      config: {
        systemInstruction,
        temperature: 0.1,
        tools: [{ functionDeclarations: [searchUnitsDeclaration, createBookingDeclaration] }]
      },
    });

    return {
      text: response.text || "",
      functionCalls: response.functionCalls
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: lang === 'he' ? "מצטער, חלה שגיאה קטנה. בואו ננסה שוב!" : "Sorry, a small error occurred. Let's try again!", functionCalls: undefined };
  }
}
