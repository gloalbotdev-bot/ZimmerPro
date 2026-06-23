# ZimmerPro – מערכת ניהול חכמה

מערכת ניהול מלאה ליחידות אירוח: הזמנות, לקוחות, יחידות, ביקורות, בוט ועוד.

---

## חשוב לפני שמתחילים

**הפרויקט לא כולל קבצי סביבה או סיסמאות.**

קבצים אלה **לא** נמצאים ב-Git (מוגדרים ב-`.gitignore`):

| קובץ | מיקום | תפקיד |
|------|--------|--------|
| `.env` | `backend/` | הגדרות שרת, DB, API keys |
| `.env.local` | שורש הפרויקט | משתנים לפרונטאנד (Vite) |

**מה צריך לקבל ממנהל הפרויקט:**

- מחרוזת חיבור ל-MongoDB (`MONGODB_URI`)
- מפתחות Google OAuth (אם משתמשים בהתחברות Google / יומן Google)
- מפתח Gemini (אם משתמשים בפיצ'רי AI)
- פרטי Inforu ל-SMS/אימייל (אם רלוונטי)
- `JWT_SECRET` לפרודקשן
- כל ערך סודי אחר שמופיע ברשימת המשתנים למטה

**אין לשים סיסמאות, מפתחות או URI אמיתיים ב-README, ב-Git, או ב-commit.**

---

## דרישות מוקדמות

- **Node.js** 18+
- **npm** (מגיע עם Node.js)
- **Git**
- גישה ל-MongoDB (Atlas או שרת מקומי) – הפרטים יגיעו ממנהל הפרויקט

---

## התקנה מהירה

```bash
# 1. שכפול / קבלת הפרויקט
git clone <repository-url>
cd Zimmerpro

# 2. תלויות Frontend (שורש)
npm install

# 3. תלויות Backend
cd backend && npm install && cd ..

# 4. יצירת קובץ סביבה לבקאנד
cp backend/env.example backend/.env
# ערוך את backend/.env – ראה "משתני סביבה" למטה

# 5. (אופציונלי) קובץ סביבה לפרונטאנד
# צור .env.local בשורש – ראה "משתני סביבה – Frontend"

# 6. הרצה
npm run dev:all
```

---

## הרצת הפרויקט

### אופציה 1 – הכל יחד (מומלץ לפיתוח)

```bash
npm run dev:all
```

| שירות | כתובת |
|--------|--------|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |

### אופציה 2 – הרצה נפרדת

**טרמינל 1 – Backend:**
```bash
npm run dev:backend
# או: cd backend && npm run dev
```

**טרמינל 2 – Frontend:**
```bash
npm run dev:frontend
# או: npm run dev
```

### פרודקשן

```bash
# Build Frontend
npm run build

# הרצת Backend
npm run start:backend
# או: cd backend && npm start
```

---

## משתני סביבה – Backend

צור את הקובץ `backend/.env` (העתק מ-`backend/env.example`).

### חובה

| משתנה | תיאור | דוגמה (ערכים מזויפים בלבד) |
|--------|--------|------------------------------|
| `MONGODB_URI` | מחרוזת חיבור MongoDB | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority` |
| `FRONTEND_URL` | כתובת הפרונטאנד (CORS, redirects) | פיתוח: `http://localhost:5173` |

### מומלץ

| משתנה | תיאור | ברירת מחדל |
|--------|--------|-------------|
| `PORT` | פורט השרת | `3000` |
| `NODE_ENV` | סביבה | `development` / `production` |
| `JWT_SECRET` | מפתח לחתימת JWT | **חובה בפרודקשן** – בפיתוח יש fallback לא בטוח |
| `JWT_EXPIRES_IN` | תוקף טוקן | `7d` |

### Google OAuth / Calendar (אופציונלי)

| משתנה | תיאור |
|--------|--------|
| `GOOGLE_CLIENT_ID` | Client ID מ-Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret |
| `GOOGLE_REDIRECT_URI` | Callback URL – ברירת מחדל: `http://localhost:5173/auth/google/callback` |

### AI / Gemini (אופציונלי)

| משתנה | תיאור |
|--------|--------|
| `GEMINI_API_KEY` | מפתח Google Gemini (בוט, שירותים בשרת) |
| `BOT_GEMINI_API_KEY` | חלופה ל-`GEMINI_API_KEY` בבוט |

### SMS / Email – Inforu (אופציונלי)

| משתנה | תיאור |
|--------|--------|
| `INFORU_USERNAME` | שם משתמש Inforu |
| `INFORU_API_TOKEN` | API token של Inforu |
| `EMAIL_FROM_ADDRESS` | כתובת שולח לאימיילים |

### URLs נוספים (אופציונלי)

| משתנה | תיאור |
|--------|--------|
| `BASE_URL` | URL בסיס לקבצים/תמונות שהועלו. בפיתוח מקומי – בדרך כלל לא נדרש |
| `BOT_OUTBOUND_LEAD_URL` | URL לשליחת לידים מהבוט |
| `BOT_WEBHOOK_SECRET` | סוד לאימות webhook של הבוט |

### דוגמת קובץ `backend/.env` (ללא ערכים אמיתיים)

```env
# === חובה ===
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:5173

# === שרת ===
PORT=3000
NODE_ENV=development

# === אבטחה (חובה בפרודקשן) ===
JWT_SECRET=<generate-a-long-random-string>
JWT_EXPIRES_IN=7d

# === Google OAuth ===
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# === Gemini AI ===
GEMINI_API_KEY=<your-gemini-api-key>

# === Inforu (SMS / Email) ===
INFORU_USERNAME=<your-inforu-username>
INFORU_API_TOKEN=<your-inforu-api-token>
EMAIL_FROM_ADDRESS=<sender@your-domain.com>

# === URLs (פרודקשן) ===
# BASE_URL=https://your-domain.com
# BOT_OUTBOUND_LEAD_URL=https://...
# BOT_WEBHOOK_SECRET=<random-secret>
```

---

## משתני סביבה – Frontend

צור קובץ `.env.local` **בשורש הפרויקט** (לא בתוך `backend/`).

| משתנה | חובה? | תיאור | ברירת מחדל |
|--------|--------|--------|-------------|
| `VITE_API_URL` | לא | כתובת ה-API | בפיתוח: `http://localhost:3000/api` |
| `VITE_GOOGLE_CLIENT_ID` | ל-Google Sign-In | Client ID (חייב להתאים ל-`GOOGLE_CLIENT_ID` בבקאנד) | — |
| `VITE_GEMINI_API_KEY` | לפיצ'רי AI בפרונט | מפתח Gemini | — |
| `GEMINI_API_KEY` | לא | נקרא גם מ-`vite.config.ts` | — |

### דוגמת קובץ `.env.local` (ללא ערכים אמיתיים)

```env
# VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
VITE_GEMINI_API_KEY=<your-gemini-api-key>
```

> **הערה:** משתנים עם קידומת `VITE_` נחשפים לדפדפן. אל תשים בהם סודות שאסור שייחשפו ללקוח.

---

## מבנה הפרויקט

```
Zimmerpro/
├── backend/                 # Node.js / Express
│   ├── 1-server-express.js  # נקודת כניסה לשרת
│   ├── 2-routers/           # נתיבי API
│   ├── 3-controllers/       # Controllers
│   ├── 4-services/          # לוגיקה עסקית
│   ├── 5-repositories/      # גישה ל-DB
│   ├── middleware/          # Auth, errors
│   ├── env.example          # תבנית משתני סביבה (ללא סודות)
│   └── .env                 # ← יוצרים מקומית, לא ב-Git
│
├── pages/                   # דפי React
├── api.ts                   # לקוח API
├── geminiService.ts         # שירות Gemini בפרונט
├── vite.config.ts
├── package.json
└── .env.local               # ← יוצרים מקומית, לא ב-Git
```

---

## משתמש ראשון / Admin

סקריפט יצירת admin **לא** נכלל ב-Git (מסיבות אבטחה).

אפשרויות:

1. **הרשמה דרך האפליקציה** – `POST /api/auth/register` (אם פתוח)
2. **בקשה ממנהל הפרויקט** – ייצור משתמש admin ידנית ב-DB
3. **סקריפט reset-password** (קיים ב-`backend/scripts/`) – דורש `MONGODB_URI` תקין

---

## פתרון בעיות

### השרת לא עולה / לא מתחבר ל-DB

- ודא ש-`backend/.env` קיים ו-`MONGODB_URI` מוגדר
- ודא שקיבלת URI תקף ממנהל הפרויקט
- בדוק IP whitelist ב-MongoDB Atlas (אם רלוונטי)

### שגיאות CORS

- ודא ש-`FRONTEND_URL` ב-`backend/.env` תואם לכתובת הפרונט (למשל `http://localhost:5173`)

### Frontend לא מתחבר ל-Backend

- ודא שהבקאנד רץ על פורט 3000
- בדוק `VITE_API_URL` ב-`.env.local` (אם הוגדר)
- פתח DevTools → Network לשגיאות

### Google Sign-In לא עובד

- `VITE_GOOGLE_CLIENT_ID` ב-`.env.local` חייב להתאים ל-`GOOGLE_CLIENT_ID` ב-`backend/.env`
- ודא שה-redirect URI רשום ב-Google Cloud Console

### פיצ'רי AI לא עובדים

- הגדר `GEMINI_API_KEY` ב-`backend/.env` ו/או `VITE_GEMINI_API_KEY` ב-`.env.local`

---

## קישורים שימושיים

- [Google Cloud Console – Credentials](https://console.cloud.google.com/apis/credentials)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

---

## רישיון

פרויקט פרטי – פרטים נוספים אצל מנהל הפרויקט.
