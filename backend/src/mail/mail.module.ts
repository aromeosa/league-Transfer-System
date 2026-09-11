import { Module } from '@nestjs/common';
import { MAIL_SERVICE } from './mail.interface';
import { MockMailService } from './mock-mail.service';
import { ResendMailService } from './resend-mail.service';

/**
 * Picks the real Resend sender only when its API key is actually configured —
 * local/dev environments without RESEND_API_KEY fall back to the mock, so nothing
 * accidentally tries to send real email without explicit opt-in (mirrors
 * PaymentGatewayModule's same pattern for PayFast).
 */
@Module({
  providers: [
    {
      provide: MAIL_SERVICE,
      useFactory: () => (process.env.RESEND_API_KEY ? new ResendMailService() : new MockMailService()),
    },
  ],
  exports: [MAIL_SERVICE],
})
export class MailModule {}
