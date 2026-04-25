import sgMail from '@sendgrid/mail';

interface WelcomeEmailOptions {
  to: string;
  name: string;
  email: string;
  password?: string;
  category?: string;
}

export async function sendEarlyAccessWelcomeEmail(opts: WelcomeEmailOptions): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY not configured');

  sgMail.setApiKey(apiKey);

  const { to, name, email, password = 'EarlyFreeAccess', category = 'general' } = opts;
  const isMusic = category === 'music';
  const firstName = name?.split(' ')[0] || name || 'Friend';
  const loginUrl = 'https://rraasi.com';
  const musicUrl = 'https://www.rraasi.com/rraasi-music';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isMusic ? 'Welcome to RRAASI Music' : 'Welcome to RRAASI Early Access'}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:20px;overflow:hidden;border:1px solid ${isMusic ? 'rgba(236,72,153,0.3)' : 'rgba(138,43,226,0.3)'};">
          
          <!-- Header -->
          <tr>
            <td style="background:${isMusic ? 'linear-gradient(135deg,#be185d,#9d174d)' : 'linear-gradient(135deg,#6b21a8,#4c1d95)'};padding:40px 40px 30px;text-align:center;">
              <div style="font-size:48px;margin-bottom:10px;">${isMusic ? '🎵' : '🙏'}</div>
              <h1 style="color:#fff;font-size:28px;margin:0;font-weight:700;letter-spacing:-0.5px;">Welcome to ${isMusic ? 'RRAASI Music' : 'RRAASI'}</h1>
              <p style="color:rgba(255,255,255,0.8);margin:10px 0 0;font-size:16px;">Your Early Access is Ready</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:${isMusic ? '#fbcfe8' : '#c4b5fd'};font-size:18px;margin:0 0 20px;">Namaste ${firstName} ji! ${isMusic ? '🎵' : '🙏'}</p>
              
              <p style="color:#e2e8f0;font-size:16px;line-height:1.7;margin:0 0 24px;">
                Congratulations! 🎉 You applied early and have been granted <strong style="color:${isMusic ? '#f9a8d4' : '#c084fc'};">FREE Early Access</strong> to 
                <strong style="color:#fff;">${isMusic ? 'RRAASI Music' : 'RRAASI'}</strong> — ${isMusic ? "India's AI-powered spiritual music platform — where you can create your own soulful music just by talking." : "India's AI-powered spiritual platform."}
              </p>

              <!-- Credential Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(${isMusic ? '190,24,93' : '109,40,217'},0.15);border:1px solid rgba(${isMusic ? '236,72,153' : '139,92,246'},0.4);border-radius:12px;margin-bottom:30px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="color:${isMusic ? '#f9a8d4' : '#a78bfa'};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">Your Login Credentials</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(${isMusic ? '236,72,153' : '139,92,246'},0.2);">
                          <span style="color:#94a3b8;font-size:14px;">📧 Email</span>
                        </td>
                        <td align="right" style="padding:8px 0;border-bottom:1px solid rgba(${isMusic ? '236,72,153' : '139,92,246'},0.2);">
                          <strong style="color:#e2e8f0;font-size:14px;">${email}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#94a3b8;font-size:14px;">🔑 Password</span>
                        </td>
                        <td align="right" style="padding:8px 0;">
                          <strong style="color:${isMusic ? '#f9a8d4' : '#c084fc'};font-size:16px;font-family:monospace;">${password}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Features -->
              <p style="color:#94a3b8;font-size:14px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">What you get with Early Access</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                ${isMusic ? `
                <tr><td style="padding:8px 0;color:#e2e8f0;font-size:15px;">🎼 <strong style="color:#f9a8d4;">Create Spiritual Music</strong> — Bhajans, kirtans & sufi just by talking</td></tr>
                <tr><td style="padding:8px 0;color:#e2e8f0;font-size:15px;">🧘 <strong style="color:#f9a8d4;">Healing Frequencies</strong> — Guided meditations & mantras</td></tr>
                <tr><td style="padding:8px 0;color:#e2e8f0;font-size:15px;">🎤 <strong style="color:#f9a8d4;">No Skills Needed</strong> — Just describe your feeling or prayer</td></tr>
                <tr><td style="padding:8px 0;color:#e2e8f0;font-size:15px;">🌙 <strong style="color:#f9a8d4;">AI Composer</strong> — Personalized soulful music, created for you</td></tr>
                ` : `
                <tr><td style="padding:8px 0;color:#e2e8f0;font-size:15px;">🧘 <strong style="color:#c084fc;">Live Satsang</strong> — Voice chat with spiritual gurus</td></tr>
                <tr><td style="padding:8px 0;color:#e2e8f0;font-size:15px;">🎵 <strong style="color:#c084fc;">AI Spiritual Music</strong> — Bhajans & healing frequencies</td></tr>
                <tr><td style="padding:8px 0;color:#e2e8f0;font-size:15px;">🔮 <strong style="color:#c084fc;">Vedic Jyotish</strong> — AI-powered astrology readings</td></tr>
                <tr><td style="padding:8px 0;color:#e2e8f0;font-size:15px;">🃏 <strong style="color:#c084fc;">Tarot</strong> — Spiritual card readings</td></tr>
                `}
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${isMusic ? '16px' : '30px'};">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display:inline-block;background:${isMusic ? 'linear-gradient(135deg,#be185d,#9d174d)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)'};color:#fff;font-size:18px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:12px;letter-spacing:0.5px;">
                      ${isMusic ? 'Login to RRAASI Music →' : 'Login to RRAASI →'}
                    </a>
                  </td>
                </tr>
              </table>

              ${isMusic ? `
              <!-- Music-specific CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td align="center">
                    <a href="${musicUrl}" style="display:inline-block;background:rgba(190,24,93,0.15);border:2px solid rgba(236,72,153,0.5);color:#f9a8d4;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:12px;">
                      🎼 Start Creating Spiritual Music Now
                    </a>
                  </td>
                </tr>
              </table>` : ''}

              <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">
                You're part of our founding community 🌟 — your feedback shapes the future of RRAASI. 
                If you need any help, just reply to this email and our team will assist you.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(0,0,0,0.3);padding:24px 40px;text-align:center;border-top:1px solid rgba(${isMusic ? '236,72,153' : '139,92,246'},0.2);">
              <p style="color:#475569;font-size:13px;margin:0;">
                With love & blessings 🙏<br>
                <strong style="color:${isMusic ? '#be185d' : '#7c3aed'};">The RRAASI ${isMusic ? 'Music ' : ''}Team</strong><br>
                <a href="${isMusic ? musicUrl : loginUrl}" style="color:${isMusic ? '#be185d' : '#6d28d9'};text-decoration:none;">${isMusic ? musicUrl : loginUrl}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textBody = isMusic ? `
Namaste ${firstName} ji! 🎵

Congratulations! You applied early and have been granted FREE Early Access to RRAASI Music — India's AI-powered spiritual music platform.

Your Login Credentials:
  Email: ${email}
  Password: ${password}

Login at: ${loginUrl}

Start creating spiritual music NOW:
👉 ${musicUrl}

With RRAASI Music you can:
• Create bhajans, kirtans & sufi music just by talking
• Healing frequencies & guided meditations
• No instruments needed — just your intention
• AI composes personalized spiritual music for you

You're part of our founding music community! 🌟

With love & blessings 🙏
The RRAASI Music Team
${musicUrl}
  `.trim() : `
Namaste ${firstName} ji! 🙏

Congratulations! You applied early and have been granted FREE Early Access to RRAASI — India's AI-powered spiritual platform.

Your Login Credentials:
  Email: ${email}
  Password: ${password}

Login at: ${loginUrl}

What you get:
• Live Satsang — Voice chat with spiritual gurus
• AI Spiritual Music — Bhajans & healing frequencies  
• Vedic Jyotish — AI-powered astrology readings
• Tarot — Spiritual card readings

You're part of our founding community! 🌟

With love & blessings 🙏
The RRAASI Team
${loginUrl}
  `.trim();

  await sgMail.send({
    to,
    from: {
      email: process.env.EMAIL_FROM || 'satsang@rraasi.com',
      name: process.env.EMAIL_FROM_NAME || 'RRAASI Spiritual Platform',
    },
    subject: isMusic ? '🎵 Your RRAASI Music Early Access is Ready — Start Creating!' : '🎉 Congratulations! Your Early Access to RRAASI is Ready',
    html: htmlBody,
    text: textBody,
  });
}
