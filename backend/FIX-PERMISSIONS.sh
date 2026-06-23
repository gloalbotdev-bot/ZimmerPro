#!/bin/bash
# סקריפט לתיקון הרשאות של תיקיית uploads

echo "🔧 מתקן הרשאות לתיקיית uploads..."

# תיקיית uploads
UPLOADS_DIR="/var/www/zimmerspro/backend/uploads"

# בדוק אם התיקייה קיימת
if [ ! -d "$UPLOADS_DIR" ]; then
    echo "❌ התיקייה $UPLOADS_DIR לא קיימת!"
    exit 1
fi

# שנה בעלות ל-www-data (משתמש nginx)
echo "📁 משנה בעלות של התיקייה והקבצים ל-www-data..."
sudo chown -R www-data:www-data "$UPLOADS_DIR"

# שנה הרשאות - תיקייה: 755, קבצים: 644
echo "🔐 משנה הרשאות..."
sudo chmod -R 755 "$UPLOADS_DIR"
sudo find "$UPLOADS_DIR" -type f -exec chmod 644 {} \;

# בדוק את ההרשאות
echo ""
echo "✅ סיום! בדוק את ההרשאות:"
ls -la "$UPLOADS_DIR" | head -5

echo ""
echo "🧪 בדוק ש-nginx יכול לקרוא את הקבצים:"
sudo -u www-data ls "$UPLOADS_DIR" | head -3

echo ""
echo "✅ אם אתה רואה את הקבצים, הכל תקין!"
echo ""
echo "💡 עכשיו עדכן את nginx להשתמש ב-alias במקום proxy_pass:"
echo "   פתח את /etc/nginx/sites-available/zimmerspro"
echo "   והשתמש ב-OPTION 2 (alias) במקום OPTION 1 (proxy_pass)"
