// Utility script to check your current public IP address
// Run this from WSL to see what IP MongoDB Atlas should whitelist

import https from 'https';
import http from 'http';

async function checkIP() {
  try {
    console.log('🔍 Checking your public IP address...\n');
    
    // Try multiple services to get IP
    const services = [
      { url: 'https://api.ipify.org?format=json', json: true },
      { url: 'https://ifconfig.me/ip', json: false },
      { url: 'https://icanhazip.com', json: false }
    ];
    
    for (const service of services) {
      try {
        const ip = await fetchIP(service.url, service.json);
        if (ip && ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
          console.log(`✅ Your public IP address: ${ip}`);
          console.log(`\n📝 To whitelist this IP in MongoDB Atlas:`);
          console.log(`   1. Go to: https://cloud.mongodb.com`);
          console.log(`   2. Select your cluster`);
          console.log(`   3. Click "Network Access"`);
          console.log(`   4. Click "Add IP Address"`);
          console.log(`   5. Enter: ${ip}/32`);
          console.log(`   6. OR enter: 0.0.0.0/0 (to allow all IPs - for testing only!)`);
          console.log(`\n⚠️  Important: Wait 2-3 minutes after adding IP until status is "Active"!`);
          console.log('');
          return;
        }
      } catch (err) {
        // Try next service
        continue;
      }
    }
    
    console.error('❌ Could not determine IP address automatically');
    console.log('\n💡 Manual steps:');
    console.log('   1. Open browser (from Windows, not WSL) and go to: https://www.whatismyip.com');
    console.log('   2. Copy your IP address');
    console.log('   3. Go to MongoDB Atlas: https://cloud.mongodb.com');
    console.log('   4. Network Access → Add IP Address → Enter: 0.0.0.0/0');
    console.log('   5. Wait 2-3 minutes until status is "Active"');
    console.log('');
  } catch (error) {
    console.error('❌ Error checking IP:', error.message);
    console.log('\n💡 Use 0.0.0.0/0 in MongoDB Atlas Network Access (for testing)');
  }
}

function fetchIP(url, isJson) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (isJson) {
            const json = JSON.parse(data);
            resolve(json.ip);
          } else {
            resolve(data.trim());
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

checkIP();
