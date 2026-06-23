# מדריך התקנה מהיר - ZimmerPro Backend

## שלב 1: התקנת תלויות Node.js

```bash
cd backend
npm install
```

זה יתקין את כל החבילות הנדרשות:
- express - שרת web
- mongoose - חיבור ל-MongoDB
- cors - תמיכה ב-CORS
- dotenv - ניהול משתני סביבה
- bcryptjs - הצפנת סיסמאות
- jsonwebtoken - אימות JWT

## שלב 2: הגדרת MongoDB Atlas (ענן)

כיוון שה-DB שלך על ענן (MongoDB Atlas), **אין צורך להתקין MongoDB מקומית!**

אתה רק צריך:
1. לקבל את ה-Connection String מ-MongoDB Atlas
2. להגדיר אותו בקובץ `.env`

## שלב 3: יצירת קובץ .env

```bash
cd backend
cp env.example .env
```

ואז ערוך את `.env`:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zimmerpro?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
```

**חשוב:**
1. **MONGODB_URI** - החלף את `username`, `password`, ו-`cluster` עם הפרטים שלך מ-MongoDB Atlas
   - לקבל את ה-Connection String: MongoDB Atlas → Clusters → Connect → Connect your application
2. **JWT_SECRET** - שנה למשהו אקראי וחזק!

### איך לקבל את ה-Connection String מ-MongoDB Atlas:

1. היכנס ל-MongoDB Atlas: https://cloud.mongodb.com
2. בחר את ה-Cluster שלך (`zimmerpro`)
3. לחץ על "Connect"
4. בחר "Connect your application"
5. העתק את ה-Connection String (נראה כמו: `mongodb+srv://...`)
6. החלף `<password>` עם הסיסמה של המשתמש ב-DB
7. הוסף את שם ה-DB בסוף (אם לא קיים): `...mongodb.net/zimmerpro`

## שלב 4: הפעלת השרת

```bash
cd backend
npm run dev
```

אם הכל עובד, תראה:
```
✅ MongoDB Connected: <cluster-name>.mongodb.net
🚀 ZimmerPro Backend Server running on port 3000
📡 API available at http://localhost:3000/api
```

## בדיקה מהירה

פתח טרמינל חדש ונסה:
```bash
curl http://localhost:3000/api/health
```

אם אתה מקבל תשובה JSON, הכל עובד! 🎉

## פתרון בעיות

### שגיאת "Cannot find module"
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### שגיאת חיבור ל-MongoDB Atlas
- ודא שה-`MONGODB_URI` ב-`.env` נכון
- ודא שהסיסמה ב-Connection String נכונה (ללא `<` ו-`>`)
- ודא שה-IP שלך מורשה ב-MongoDB Atlas:
  - MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere (או הוסף את ה-IP שלך)
- בדוק שה-Database User קיים ופעיל ב-MongoDB Atlas

### Port 3000 כבר בשימוש
שנה את הפורט ב-`.env`:
```env
PORT=3001
```
