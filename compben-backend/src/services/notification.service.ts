import { query } from '@/config/database';
import logger from '@/config/logger';
import { mailTemplate, sendMail } from '@/services/email.service';
import { settingsService } from '@/modules/settings/settings.service';
import type { AppEvent } from '@/modules/settings/settings.types';
import { createHmac } from 'node:crypto';

export interface NotifyInput {
  userId: number;
  event: AppEvent;
  title: string;
  body?: string;
  /** mis. 'APPROVAL' | 'SYSTEM' */
  type?: string;
  /** route frontend utk dibuka dari bell — mis. '/approval/pending' */
  link?: string;
}

/**
 * Kirim notifikasi satu event ke satu user — BEST-EFFORT total:
 * kegagalan salah satu kanal (in-app/email/webhook) hanya di-log,
 * tidak pernah melempar keluar (tidak boleh membatalkan transaksi bisnis).
 *
 * Kanal & event dikontrol System Configuration → Notification / Integration.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const cfg = await settingsService.get('notification');
    const ev = cfg.events[input.event];
    if (!ev) return; // event tidak diaktifkan di matrix

    // ── 1. In-app (tabel notifications → bell AppHeader) ──
    if (cfg.inapp_enabled && ev.inapp) {
      try {
        await query(
          `INSERT INTO notifications (user_id, title, body, type, link)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            input.userId,
            input.title,
            input.body ?? null,
            input.type ?? 'SYSTEM',
            input.link ?? null,
          ]
        );
      } catch (e) {
        logger.error(`Notifikasi in-app gagal: ${(e as Error).message}`);
      }
    }

    // ── 2. Email (SMTP) ──
    if (cfg.email_enabled && ev.email) {
      try {
        const u = await query<{ email: string; nama: string }>(
          `SELECT email, nama FROM users WHERE id = $1 AND is_active = TRUE`,
          [input.userId]
        );
        const to = u.rows[0]?.email;
        if (to) {
          await sendMail({
            to,
            subject: input.title,
            html: mailTemplate(
              input.title,
              (input.body || '').replace(/\n/g, '<br>'),
              input.link ? 'Buka di CompBen' : undefined,
              input.link ? `${process.env.APP_URL || 'http://localhost:5173'}${input.link}` : undefined
            ),
          });
        }
      } catch (e) {
        logger.error(`Notifikasi email gagal: ${(e as Error).message}`);
      }
    }

    // ── 3. Webhook keluar (Integration) ──
    const int = await settingsService.get('integration');
    if (
      int.webhook_enabled &&
      int.webhook_url &&
      int.webhook_events.includes(input.event)
    ) {
      try {
        await fireWebhook(int.webhook_url, int.webhook_secret, {
          event: input.event,
          occurred_at: new Date().toISOString(),
          data: {
            user_id: input.userId,
            title: input.title,
            body: input.body ?? null,
            type: input.type ?? 'SYSTEM',
            link: input.link ?? null,
          },
        });
      } catch (e) {
        logger.error(`Webhook ${input.event} gagal: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    logger.error(`notify() gagal: ${(e as Error).message}`);
  }
}

/** POST JSON + signature HMAC-SHA256(payload, secret) di X-Webhook-Signature */
async function fireWebhook(
  url: string,
  secret: string,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': String(payload.event),
  };
  if (secret) {
    headers['X-Webhook-Signature'] = createHmac('sha256', secret)
      .update(body)
      .digest('hex');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
}
