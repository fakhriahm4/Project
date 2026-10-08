import logger from '@/config/logger';
import { settingsService } from '@/modules/settings/settings.service';
import nodemailer from 'nodemailer';

/**
 * Pengirim email (SMTP) — konfigurasi dari System Configuration → Notification.
 * Best-effort: gagal kirim → log error & throw; PEMANGGIL yang memutuskan
 * apakah kegagalan ini fatal (notify: tidak — hanya log).
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const s = await settingsService.get('notification');

  if (!s.smtp_host || !s.smtp_from) {
    throw new Error(
      'SMTP belum dikonfigurasi (Notification Settings → SMTP belum diisi)'
    );
  }

  const transporter = nodemailer.createTransport({
    host: s.smtp_host,
    port: s.smtp_port,
    secure: s.smtp_secure,
    auth: s.smtp_user
      ? { user: s.smtp_user, pass: s.smtp_password }
      : undefined,
  });

  await transporter.sendMail({
    from: `"${(await settingsService.get('general')).app_name}" <${s.smtp_from}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

/** Template html sederhana utk notifikasi */
export function mailTemplate(title: string, body: string, linkLabel?: string, link?: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
    <div style="border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:16px">
      <strong>CompBen</strong>
    </div>
    <h2 style="font-size:16px;margin:0 0 8px">${title}</h2>
    <p style="font-size:14px;line-height:1.6;color:#374151;margin:0 0 16px">${body}</p>
    ${
      link && linkLabel
        ? `<a href="${link}" style="display:inline-block;background:#059669;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px">${linkLabel}</a>`
        : ''
    }
  </div>`;
}
