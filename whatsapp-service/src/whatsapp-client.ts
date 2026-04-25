import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import axios from 'axios';
import { logWhatsAppActivity } from './whatsapp-logger';
import { downloadSession, uploadSession } from './whatsapp-session-sync';

interface SendLog {
  phone: string;
  message: string;
  mediaUrl?: string;
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
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
      puppeteer: {
        executablePath: process.env.CHROMIUM_PATH || undefined,
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

    this.client.on('ready', async () => {
      console.log('[WhatsApp] ✅ Client is ready!');
      this._isConnected = true;
      this._qrPending = false;
      this._qrBase64 = null;
      // Backup session on ready
      await uploadSession();
    });

    this.client.on('authenticated', async () => {
      console.log('[WhatsApp] 🔐 Authenticated');
      this._qrPending = false;
      // Backup session on auth
      await uploadSession();
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

    // Initialize after trying to restore session
    this.init();

    // WhatsApp Bot Listener
    this.client.on('message', async (msg) => {
      // Log incoming message to Firestore
      await logWhatsAppActivity({
        from: msg.from,
        to: msg.to || 'me',
        body: msg.body,
        status: 'received',
        timestamp: new Date()
      });

      if (process.env.WHATSAPP_BOT_ENABLED !== 'true') return;
      
      // Don't reply to status updates or groups (optional, usually msg.from ends with @c.us for individuals)
      if (msg.from.includes('@g.us')) return;

      try {
        console.log(`[WhatsAppBot] Message from ${msg.from}: ${msg.body}`);
        
        // Forward to marketing server
        const botUrl = `${process.env.MARKETING_SERVER_URL || 'http://localhost:4001'}/whatsapp-bot/reply`;
        const response = await axios.post<{ reply?: string }>(botUrl, {
          sender: msg.from,
          text: msg.body
        }, {
          headers: {
            'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || ''
          }
        });

        if (response.data && response.data.reply) {
          console.log(`[WhatsAppBot] Sending reply to ${msg.from}`);
          await msg.reply(response.data.reply);
        }
      } catch (err: any) {
        console.error('[WhatsAppBot] Error processing message:', err.message);
      }
    });
  }

  private async init() {
    console.log('[WhatsApp] Restoring session if exists...');
    await downloadSession();
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
    let retries = 5; // Increased to 5
    while (retries > 0) {
      try {
        if (mediaUrl) {
          const response = await axios.get(mediaUrl, { 
            responseType: 'arraybuffer',
            timeout: 15000 // 15s timeout
          });
          const mimetype = response.headers['content-type'] || 'image/jpeg';
          const base64Data = Buffer.from(response.data as ArrayBuffer).toString('base64');
          const media = new MessageMedia(mimetype, base64Data, 'media');
          
          await this.client.sendMessage(chatId, media, { caption: message });
        } else {
          await this.client.sendMessage(chatId, message);
        }
        
        this._sendLogs.unshift({
          phone,
          message,
          mediaUrl,
          status: 'sent',
          timestamp: new Date().toISOString(),
        });

        // Persist to Firestore
        await logWhatsAppActivity({
          from: 'me',
          to: phone,
          body: message,
          mediaUrl,
          status: 'sent',
          timestamp: new Date()
        });

        return; // Success
      } catch (err: any) {
        const isFatalError = 
          err.message.includes('detached Frame') || 
          err.message.includes('Execution context was destroyed') || 
          err.message.includes('Protocol error') || 
          err.message.includes('timed out');

        if (isFatalError) {
          console.error(`[WhatsApp] 🚨 Fatal browser crash error detected (${err.message}). Auto-restarting service...`);
          // Force process to exit. Since it's run via ts-node-dev --respawn or pm2, it will automatically restart!
          process.exit(1);
        }

        this._sendLogs.unshift({
          phone,
          message,
          mediaUrl,
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
