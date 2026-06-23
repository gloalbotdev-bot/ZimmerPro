#!/bin/bash
# סקריפט לתיקון הרשאות ובדיקת nginx

echo "🔧 מתקן הרשאות..."

# תיקון הרשאות
sudo chown -R www-data:www-data /var/www/zimmerspro/backend/uploads
sudo chmod -R 755 /var/www/zimmerspro/backend/uploads
sudo find /var/www/zimmerspro/backend/uploads -type f -exec chmod 644 {} \;

echo "✅ הרשאות תוקנו"
echo ""

# בדוק הרשאות
echo "🧪 בודק הרשאות..."
sudo -u www-data ls /var/www/zimmerspro/backend/uploads/ | head -3

echo ""
echo "🔍 בודק קונפיגורציה של nginx..."
sudo nginx -t

echo ""
echo "📋 בודק את ה-location blocks בקובץ nginx..."
echo "ודא ש-location ^~ /uploads/ נמצא לפני location /"
sudo grep -n "location" /etc/nginx/sites-enabled/zimmerspro | grep -E "(uploads|/ )"

echo ""
echo "💡 אם הכל תקין, טען מחדש את nginx:"
echo "   sudo systemctl reload nginx"
echo ""
echo "🧪 אחר כך בדוק:"
echo "   curl -I https://zimmerspro.message.co.il/uploads/1769674238167-q0oqqvj5eam.jpg"
