import axios from 'axios';

const INFORU_EMAIL_USERNAME = process.env.INFORU_USERNAME;
const INFORU_EMAIL_TOKEN = process.env.INFORU_API_TOKEN;
const INFORU_EMAIL_URL = 'https://capi.mesergo.co.il/mail/api.php';
const DEFAULT_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || INFORU_EMAIL_USERNAME;

function assertConfigured() {
  if (!INFORU_EMAIL_USERNAME || !INFORU_EMAIL_TOKEN) {
    throw new Error('INFORU_USERNAME and INFORU_API_TOKEN must be set in environment');
  }
}

async function sendEmail(toEmail, subject, body, fromAddress = DEFAULT_FROM_ADDRESS, fromName = 'ZimmerPro', campaignName = 'OTP Verification') {
  assertConfigured();

  try {
    const xmlString = `<InfoMailClient>
<SendEmails>
<User>
<Username>${INFORU_EMAIL_USERNAME}</Username>
<Token>${INFORU_EMAIL_TOKEN}</Token>
</User>
<Message>
<CampaignName>${campaignName}</CampaignName>
<FromAddress>${fromAddress}</FromAddress>
<FromName>${fromName}</FromName>
<Subject><![CDATA[${subject}]]></Subject>
<Body><![CDATA[${body}]]></Body>
</Message>
<Recipients>
<Email address="${toEmail}" />
</Recipients>
</SendEmails>
</InfoMailClient>`;

    const url = `${INFORU_EMAIL_URL}?xml=${encodeURIComponent(xmlString)}`;
    const response = await axios.get(url, { timeout: 30000 });

    const responseData = typeof response.data === 'string' ? response.data : String(response.data);
    const statusMatch = responseData.match(/<Status>(.*?)<\/Status>/);
    const campaignIdMatch = responseData.match(/<CampaignId>(.*?)<\/CampaignId>/);

    const status = statusMatch ? statusMatch[1].trim() : null;
    const campaignId = campaignIdMatch ? campaignIdMatch[1].trim() : null;

    const isSuccess = status && (
      status.toLowerCase().includes('success') ||
      status.toLowerCase() === 'ok' ||
      response.status === 200
    );

    if (isSuccess || (response.status === 200 && campaignId)) {
      return { success: true, message: 'Email sent successfully', campaignId };
    }

    throw new Error(`Email sending failed: ${status || responseData}`);
  } catch (err) {
    console.error('[Email] send failed:', err.message);
    throw err;
  }
}

export default { sendEmail };
