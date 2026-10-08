import { query } from '@/config/database';

interface AuditLogInput {
  user_id: number;
  action: string;
  table_name: string;
  record_id?: number | null;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  user_agent?: string;
}

export async function writeAuditLog(input: AuditLogInput) {
  try {
    await query(
      `INSERT INTO audit_logs
        (user_id, action, table_name, record_id, old_value, new_value, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.user_id,
        input.action,
        input.table_name,
        input.record_id,
        input.old_value ? JSON.stringify(input.old_value) : null,
        input.new_value ? JSON.stringify(input.new_value) : null,
        input.ip_address || null,
        input.user_agent || null,
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}