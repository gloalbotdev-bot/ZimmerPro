# 🔧 הגדרת Nginx לניתוב API

## על השרת, עדכן את קובץ ה-Nginx:

### שלב 1: עדכן את קובץ ה-Nginx

```bash
# ערוך את קובץ ה-Nginx
nano /etc/nginx/sites-available/zimmerspro
```

או אם יש לך קובץ אחר:
```bash
nano /etc/nginx/sites-available/zimmerspro.message.co.il
```

### שלב 2: ודא שיש את השורות הבאות (ללא #):

```nginx
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
```

### שלב 3: בדוק את הקונפיגורציה

```bash
sudo nginx -t
```

אם הכל תקין, תראה:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### שלב 4: טען מחדש את Nginx

```bash
sudo systemctl reload nginx
```

---

## בדיקה:

פתח בדפדפן:
```
https://zimmerspro.message.co.il/api/health
```

אם אתה רואה תשובה JSON, הכל עובד! 🎉
