import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'mail.grabio.space';
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '587');
const SMTP_USER = Deno.env.get('SMTP_USER') || 'no-reply@grabio.space';
const SMTP_PASS = Deno.env.get('SMTP_PASS') || '';

export async function sendEmail(to: string, subject: string, html: string, replyTo?: string): Promise<void> {
  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: false,
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  });

  try {
    await client.send({
      from: `Grabio <${SMTP_USER}>`,
      to,
      subject,
      content: 'auto',
      html,
      ...(replyTo ? { replyTo } : {}),
    });
  } finally {
    await client.close();
  }
}
