import { Injectable, Logger } from '@nestjs/common';
import { MailService } from './mail.interface';

/**
 * Real transactional email via Resend (https://resend.com). RESEND_FROM_EMAIL must be
 * an address on a domain verified in the Resend dashboard — falls back to their shared
 * onboarding@resend.dev sender (heavily rate-limited, fine for a quick smoke test but
 * not for real traffic) if unset.
 */
@Injectable()
export class ResendMailService implements MailService {
  private readonly logger = new Logger(ResendMailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY ?? '';
  private readonly fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  async sendPasswordReset(toEmail: string, resetUrl: string): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: toEmail,
        subject: '5quadLeague — Reset your password',
        html: `
          <p>Someone requested a password reset for your 5quadLeague Transfer System account.</p>
          <p><a href="${resetUrl}">Click here to reset your password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email —
          your password won't be changed.</p>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Resend API error (${res.status}): ${body}`);
      throw new Error('Failed to send password reset email');
    }
  }
}
