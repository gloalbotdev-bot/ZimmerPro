import axios from 'axios';

const INFORU_USERNAME = process.env.INFORU_USERNAME;
const INFORU_API_TOKEN = process.env.INFORU_API_TOKEN;
const INFORU_URL = 'https://uapi.inforu.co.il/SendMessageXml.ashx';

/**
 * Send SMS message using Inforu API
 * Based on official Inforu API documentation: https://apidoc.inforu.co.il
 * @param {string} text - The message text to send
 * @param {string|string[]} phoneNumbers - Phone number(s) to send to (can be single number or array)
 * @param {string} senderName - Sender name/identifier
 * @returns {Promise<void>}
 */
async function sendMessage(text, phoneNumbers, senderName) {
  // Ensure phoneNumbers is an array
  const phoneArray = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];

  const xmlString = `<Inforu>
                    <User>
                        <Username>${INFORU_USERNAME}</Username>
                        <ApiToken>${INFORU_API_TOKEN}</ApiToken>
                    </User>
                    <Content Type="sms">
                        <Message>${text}</Message>
                    </Content>
                    <Recipients>` +
                        phoneArray.map(number => `<PhoneNumber>${number}</PhoneNumber>`).join('') +
                    `</Recipients>
                    <Settings>
                        <Sender>${senderName}</Sender>
                    </Settings>
                    </Inforu>`;

  console.log('📱 [SMS Service] XML String:');
  console.log(xmlString);

  // According to Inforu API documentation, send as form data with InforuXML parameter
  // Try both encodeURI and encodeURIComponent to see which works
  const encodedXml = encodeURI(xmlString);
  const formData = `InforuXML=${encodedXml}`;
  
  console.log('📱 [SMS Service] Encoded XML (first 500 chars):', encodedXml.substring(0, 500));
  console.log('📱 [SMS Service] Form Data (first 500 chars):', formData.substring(0, 500));
  console.log('📱 [SMS Service] URL:', INFORU_URL);

  try {
   
    console.log('📱 [SMS Service] Sending POST request...');
    const response = await axios.post(INFORU_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000 // 30 second timeout
    });

    const responseData = typeof response.data === 'string' ? response.data : String(response.data);
    const hasSuccessMessage = responseData.indexOf('Message accepted successfully') !== -1;

    if (!hasSuccessMessage && response.status === 200) {
      const fallback = responseData.toLowerCase();
      if (!fallback.includes('accepted') && !fallback.includes('success')) {
        throw new Error(`SMS sending failed: ${responseData}`);
      }
    }
  } catch (err) {
    console.error('[SMS] send failed:', err.message);
    throw err;
  }
}

export default { sendMessage };
