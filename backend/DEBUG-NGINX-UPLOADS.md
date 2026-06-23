# 🔍 ניפוי בעיות - תמונות לא מוצגות

## בדיקות מהירות

### 1. בדוק שהקובץ קיים
```bash
ls -la /var/www/zimmerspro/backend/uploads/1769674238167-q0oqqvj5eam.jpg
```

### 2. בדוק הרשאות
```bash
sudo -u www-data ls /var/www/zimmerspro/backend/uploads/ | head -3
```

אם זה לא עובד, תיקן הרשאות:
```bash
sudo chown -R www-data:www-data /var/www/zimmerspro/backend/uploads
sudo chmod -R 755 /var/www/zimmerspro/backend/uploads
sudo find /var/www/zimmerspro/backend/uploads -type f -exec chmod 644 {} \;
```

### 3. בדוק את קובץ ה-nginx
```bash
sudo cat /etc/nginx/sites-enabled/zimmerspro | grep -A 10 "location.*uploads"
```

ודא שיש את זה:
```nginx
location ^~ /uploads/ {
    alias /var/www/zimmerspro/backend/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    autoindex off;
    access_log off;
}
```

**חשוב:** ה-`location ^~ /uploads/` חייב להיות **לפני** ה-`location /`!

### 4. בדוק את הלוגים של nginx
```bash
sudo tail -f /var/log/nginx/error.log
```

פתח בדפדפן את הקישור לתמונה ותראה מה כתוב בלוג.

### 5. בדוק access log
```bash
sudo tail -f /var/log/nginx/access.log | grep uploads
```

### 6. בדוק שהקונפיגורציה תקינה
```bash
sudo nginx -t
```

אם יש שגיאות, תיקן אותן.

### 7. טען מחדש את nginx
```bash
sudo systemctl reload nginx
```

או:
```bash
sudo systemctl restart nginx
```

## פתרון חלופי: שימוש ב-Node.js

אם שירות ישיר מ-nginx לא עובד, השתמש ב-proxy ל-Node.js:

```nginx
location ^~ /uploads/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

## בדיקת תשובה ישירה

בדוק אם nginx מחזיר את הקובץ:
```bash
curl -I https://zimmerspro.message.co.il/uploads/1769674238167-q0oqqvj5eam.jpg
```

אם אתה רואה `HTTP/2 200` או `HTTP/1.1 200`, הקובץ נגיש.
אם אתה רואה `HTTP/2 404`, הקובץ לא נמצא.
אם אתה רואה `HTTP/2 301` או `HTTP/2 302`, יש redirect.

## בדיקת Node.js

בדוק אם Node.js משרת את התמונות:
```bash
curl -I http://localhost:3000/uploads/1769674238167-q0oqqvj5eam.jpg
```

אם זה עובד, השתמש ב-proxy_pass במקום alias.
