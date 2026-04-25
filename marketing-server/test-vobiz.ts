import axios from 'axios';
import { Buffer } from 'buffer';

const VOBIZ_AUTH_ID = 'MA_OBIB50E0';
const VOBIZ_AUTH_TOKEN = 'ov2qGM3H8lC50B7a3ELxV5S3nhDgWyMm7ValdoFxxGDL6f4kkbtdthlH600MOWT5';
const VOBIZ_FROM_NUMBER = '+912271263944';

const to = '+918454083097'; // From the screenshot of facebook lead

async function testVobiz() {
    try {
        const params = new URLSearchParams();
        params.append('To', to);
        params.append('From', VOBIZ_FROM_NUMBER);
        params.append('Url', 'https://example.com/twiml'); // fake url
        params.append('Record', 'true');

        console.log('Sending request to Vobiz API...', params.toString());

        const callRes = await axios.post(
            `https://api.vobiz.ai/api/v1/Account/${VOBIZ_AUTH_ID}/Call`,
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(`${VOBIZ_AUTH_ID}:${VOBIZ_AUTH_TOKEN}`).toString('base64'),
                }
            }
        );
        console.log('SUCCESS Response:', callRes.data);
    } catch (e: any) {
        if (e.response) {
            console.error('API Error Response:', JSON.stringify(e.response.data, null, 2));
            console.error('Status:', e.response.status);
        } else {
            console.error('Error:', e.message);
        }
    }
}

testVobiz();
