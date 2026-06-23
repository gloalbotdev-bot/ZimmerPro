# 🔧 תיקון בעיית תצוגת תמונות ב-Nginx

## הבעיה
כשפותחים קישור לתמונה כמו `https://zimmerspro.message.co.il/uploads/1769674238167-q0oqqvj5eam.jpg`, מגיעים לדף הבית במקום לתמונה.

## הסיבה
nginx לא מוצא את התיקייה `/var/www/zimmerspro/backend/uploads/` או שהקונפיגורציה לא נכונה.

## פתרון

### שלב 1: בדוק אם התיקייה קיימת
```bash
ls -la /var/www/zimmerspro/backend/uploads/
```

אם התיקייה לא קיימת, צור אותה:
```bash
sudo mkdir -p /var/www/zimmerspro/backend/uploads
sudo chown -R www-data:www-data /var/www/zimmerspro/backend/uploads
sudo chmod -R 755 /var/www/zimmerspro/backend/uploads
```

### שלב 2: בדוק איפה התמונות באמת נשמרות
```bash
# בדוק את הלוגים של השרת Node.js
sudo journalctl -u zimmerspro-backend -n 50 | grep "Uploads directory"
```

או בדוק את הקוד:
```bash
# אם השרת רץ, בדוק את הלוגים
pm2 logs zimmerspro-backend | grep "Uploads directory"
```

### שלב 3: העתק את התמונות למקום הנכון (אם צריך)
אם התמונות נשמרות במקום אחר, העתק אותן:
```bash
# מצא את התיקייה האמיתית
find /var/www -name "*.jpg" -o -name "*.png" | head -5

# העתק את כל התמונות (החלף את הנתיב לפי מה שמצאת)
sudo cp -r /path/to/actual/uploads/* /var/www/zimmerspro/backend/uploads/
```

### שלב 4: עדכן את קובץ ה-Nginx
```bash
sudo nano /etc/nginx/sites-available/zimmerspro
```

**הפתרון המומלץ**: שימוש ב-Node.js לשרת תמונות (יעבוד תמיד)

העתק את הקונפיגורציה הבאה מהקובץ `nginx-zimmerspro-with-api.conf`:
```nginx
location = /uploads {
    return 301 /uploads/;
}

location ^~ /uploads/ {
    proxy_pass http://localhost:3000;
    
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    proxy_cache_valid 200 30d;
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

**אלטרנטיבה**: שירות ישיר מ-nginx (יותר מהיר, אבל דורש שהתיקייה תהיה קיימת)

אם אתה רוצה לשרת ישירות מ-nginx (יותר מהיר), השתמש בקונפיגורציה הזו:
```nginx
location ^~ /uploads/ {
    alias /var/www/zimmerspro/backend/uploads/;
    try_files $uri =404;
    expires 30d;
    add_header Cache-Control "public, immutable";
    autoindex off;
    access_log off;
}
```

### שלב 5: בדוק את הקונפיגורציה
```bash
sudo nginx -t
```

אם יש שגיאה, תראה משהו כמו:
```
nginx: [emerg] alias directive is duplicate
```

אם יש שגיאה כזו, זה אומר שיש כבר הגדרה של `/uploads/` בקובץ. מחק את ההגדרה הישנה.

### שלב 6: טען מחדש את Nginx
```bash
sudo systemctl reload nginx
```

### שלב 7: בדוק שהתמונות נגישות
פתח בדפדפן:
```
https://zimmerspro.message.co.il/uploads/1769674238167-q0oqqvj5eam.jpg
```

אם אתה רואה את התמונה, הכל עובד! 🎉

## פתרון חלופי: שימוש ב-Node.js לשרת תמונות

אם nginx לא עובד, אפשר לשרת את התמונות דרך Node.js (זה כבר מוגדר בקוד):

1. ודא שהקוד ב-`backend/1-server-express.js` משרת את התמונות דרך `/uploads`
2. עדכן את nginx להעביר את הבקשות ל-Node.js:

```nginx
location /uploads/ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## בדיקות נוספות

### בדוק את הלוגים של nginx
```bash
sudo tail -f /var/log/nginx/error.log
```

### בדוק את הלוגים של access
```bash
sudo tail -f /var/log/nginx/access.log | grep uploads
```

### בדוק הרשאות
```bash
ls -la /var/www/zimmerspro/backend/
ls -la /var/www/zimmerspro/backend/uploads/
```

ודא ש-nginx יכול לקרוא את הקבצים:
```bash
sudo -u www-data ls /var/www/zimmerspro/backend/uploads/
```
