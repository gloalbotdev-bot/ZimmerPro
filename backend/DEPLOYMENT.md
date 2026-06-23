# 🚀 מדריך העלאה לשרת - ZimmerPro Backend

## הגדרות לשרת Production

### 1. עדכן את קובץ `.env` על השרת:

```env
PORT=3000
NODE_ENV=production

# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://battzyong_db_user:batsilevitan100!@zimmerpro.bz5fbvt.mongodb.net/zimmerpro?retryWrites=true&w=majority&appName=zimmerpro

# JWT Secret Key (חשוב: שנה למשהו חזק!)
JWT_SECRET=zimmerpro-jwt-secret-key-2024-production-change-this

# Frontend URL (הכתובת של השרת שלך)
FRONTEND_URL=https://zimmerspro.message.co.il
```

---

## העלאה לשרת

### שלב 1: העלה את הקבצים לשרת

השתמש ב-SFTP (כמו שיש לך ב-`.vscode/sftp.json`):

```bash
# העלה את כל תיקיית backend לשרת
# לדוגמה: /var/www/zimmerspro/backend
```

### שלב 2: התקן תלויות על השרת

התחבר לשרת דרך SSH:
```bash
ssh root@103.95.119.188
```

ואז:
```bash
cd /var/www/zimmerspro/backend
npm install --production
```

### שלב 3: צור קובץ `.env` על השרת

```bash
cd /var/www/zimmerspro/backend
cp env.example .env
nano .env  # או vi .env
```

ערוך את הקובץ עם ההגדרות שלך (ראה למעלה).

---

## הפעלת השרת

### אפשרות 1: עם PM2 (מומלץ)

```bash
# התקן PM2
npm install -g pm2

# הפעל את השרת
cd /var/www/zimmerspro/backend
pm2 start src/server.js --name zimmerpro-api

# שמור את הרשימה
pm2 save

# הגדר PM2 להתחיל אוטומטית
pm2 startup
```

### אפשרות 2: עם systemd

צור קובץ `/etc/systemd/system/zimmerpro-api.service`:

```ini
[Unit]
Description=ZimmerPro Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/zimmerspro/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

ואז:
```bash
sudo systemctl daemon-reload
sudo systemctl enable zimmerpro-api
sudo systemctl start zimmerpro-api
sudo systemctl status zimmerpro-api
```

---

## הגדרת Nginx

ודא שיש לך קובץ Nginx שמנתב את `/api/*` ל-Node.js:

```nginx
server {
    listen 443 ssl http2;
    server_name zimmerspro.message.co.il;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/zimmerspro.message.co.il/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zimmerspro.message.co.il/privkey.pem;

    # API Routes - Forward to Node.js Backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # React App - Serve Static Files
    location / {
        root /var/www/zimmerspro/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

ואז:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## בדיקה

1. בדוק שהשרת רץ:
```bash
curl http://localhost:3000/api/health
```

2. בדוק דרך הדפדפן:
```
https://zimmerspro.message.co.il/api/health
```

---

## עדכונים עתידיים

כשאתה מעדכן קוד:

```bash
# על השרת
cd /var/www/zimmerspro/backend
git pull  # או העלה קבצים חדשים
npm install --production  # אם יש תלויות חדשות
pm2 restart zimmerpro-api  # או systemctl restart zimmerpro-api
```

---

## פתרון בעיות

### השרת לא עולה
```bash
# בדוק את הלוגים
pm2 logs zimmerpro-api
# או
sudo journalctl -u zimmerpro-api -f
```

### שגיאת חיבור ל-MongoDB
- ודא שה-IP של השרת מורשה ב-MongoDB Atlas
- MongoDB Atlas → Network Access → Add IP Address → הוסף את ה-IP של השרת

### Port 3000 לא זמין
```bash
# בדוק מה רץ על פורט 3000
sudo lsof -i :3000
```
