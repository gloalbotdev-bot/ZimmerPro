# 🧹 ניקוי PM2 והפעלה מחדש

## על השרת, הרץ את הפקודות הבאות:

### שלב 1: מחק את כל התהליכים הישנים

```bash
pm2 delete all
```

או מחק ספציפית:
```bash
pm2 delete 0 1 2 3
```

### שלב 2: הפעל תהליך חדש ונקי

```bash
cd /var/www/zimmerspro/backend
pm2 start index.js --name zimmerpro-api
```

### שלב 3: שמור את הרשימה

```bash
pm2 save
```

### שלב 4: בדוק שהכל עובד

```bash
# בדוק את הסטטוס
pm2 status

# בדוק את הלוגים (אם יש שגיאה)
pm2 logs zimmerpro-api --lines 50

# בדוק את ה-API
curl http://localhost:3000/api/health
```

---

## אם יש שגיאה בלוגים:

הרץ:
```bash
pm2 logs zimmerpro-api --err
```

זה יראה לך את השגיאה המדויקת.
