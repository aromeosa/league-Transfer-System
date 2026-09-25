import { Injectable, Logger } from '@nestjs/common';
import { MailService } from './mail.interface';

/**
 * Dev/test stand-in for a real transactional email vendor (Resend / SendGrid / Postmark
 * / SMTP, etc.). Logs the reset link instead of emailing it — real vendor integration is
 * explicitly deferred, same as MockGatewayService for payments. Swapping this out later
 * (mail.module.ts) doesn't touch AuthService or the schema.
 */
@Injectable()
export class MockMailService implements MailService {
  private readonly logger = new Logger(MockMailService.name);

  async sendPasswordReset(toEmail: string, resetUrl: string): Promise<void> {
    this.logger.log(`[MOCK MAIL] Password reset for ${toEmail}: ${resetUrl}`);
  }

  async sendPlayerRegistrationInvite(
    toEmail: string,
    playerName: string,
    teamName: string,
    confirmUrl: string,
  ): Promise<void> {
    this.logger.log(
      `[MOCK MAIL] Registration confirmation for ${playerName} <${toEmail}> (${teamName}): ${confirmUrl}`,
    );
  }
}
