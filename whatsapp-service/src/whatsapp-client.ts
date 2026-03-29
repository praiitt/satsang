import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import axios from 'axios';

interface SendLog {
  phone: string;
  message: string;
  status: 'sent' | 'failed';
  error?: string;
  timestamp: string;
}

class WhatsAppClientManager {
  private client: Client;
  private _isConnected = false;
  private _qrBase64: string | null = null;
  private _qrPending = false;
  private _sendLogs: SendLog[] = [];

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
      puppeteer: {
        headless: 'new' as any, // Use stable headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-gpu',
        ],
      },
    });

    this.client.on('qr', async (qr) => {
      console.log('[WhatsApp] QR Received, generating image...');
      this._isConnected = false;
      this._qrPending = true;
      try {
        this._qrBase64 = await qrcode.toDataURL(qr);
        console.log('[WhatsApp] QR code ready for scanning');
      } catch (err) {
        console.error('[WhatsApp] Failed to generate QR image:', err);
      }
    });

    this.client.on('ready', () => {
      console.log('[WhatsApp] ✅ Client is ready!');
      this._isConnected = true;
      this._qrPending = false;
      this._qrBase64 = null;
    });

    this.client.on('authenticated', () => {
      console.log('[WhatsApp] 🔐 Authenticated');
      this._qrPending = false;
    });

    this.client.on('auth_failure', (msg) => {
      console.error('[WhatsApp] ❌ Authentication failure:', msg);
      this._isConnected = false;
      this._qrPending = false;
    });

    this.client.on('disconnected', (reason) => {
      console.log('[WhatsApp] Disconnected:', reason);
      this._isConnected = false;
    });

    console.log('[WhatsApp] Initializing client...');
    this.client.initialize();
  }

  get isConnected() { return this._isConnected; }
  get qrBase64() { return this._qrBase64; }
  get qrPending() { return this._qrPending; }
  get sendLogs() { return this._sendLogs; }

  private formatPhone(phone: string): string {
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');
    // Ensure it ends with @c.us (WhatsApp format)
    return `${digits}@c.us`;
  }

  async sendMessage(phone: string, message: string, mediaUrl?: string): Promise<void> {
    if (!this._isConnected) {
      throw new Error('WhatsApp client is not connected. Please scan the QR code first.');
    }
    const chatId = this.formatPhone(phone);
    
    // Retry logic for "detached Frame" errors
    let retries = 3;
    while (retries > 0) {
      try {
        if (mediaUrl) {
          const response = await axios.get(mediaUrl, { 
            responseType: 'arraybuffer',
            timeout: 10000 // 10s timeout for media fetching
          });
          const mimetype = response.headers['content-type'] || 'image/jpeg';
          const base64Data = Buffer.from(response.data, 'binary').toString('base64');
          const media = new MessageMedia(mimetype, base64Data, 'media');
          
          await this.client.sendMessage(chatId, media, { caption: message });
        } else {
          await this.client.sendMessage(chatId, message);
        }
        
        this._sendLogs.unshift({
          phone,
          message: mediaUrl ? `[Media] ${message}` : message,
          status: 'sent',
          timestamp: new Date().toISOString(),
        });
        return; // Success
      } catch (err: any) {
        if (err.message.includes('detached Frame') && retries > 1) {
          console.warn(`[WhatsApp] Detached frame error, retrying... (${retries - 1} left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          continue;
        }
        
        this._sendLogs.unshift({
          phone,
          message: mediaUrl ? `[Media Fail] ${message}` : message,
          status: 'failed',
          error: err.message,
          timestamp: new Date().toISOString(),
        });
        throw err;
      }
    }
    // Keep only last 500 logs
    if (this._sendLogs.length > 500) {
      this._sendLogs = this._sendLogs.slice(0, 500);
    }
  }
}

// Singleton instance
export const waClient = new WhatsAppClientManager();
