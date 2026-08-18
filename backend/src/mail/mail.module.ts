import { Module } from '@nestjs/common';
import { MAIL_SERVICE } from './mail.interface';
import { MockMailService } from './mock-mail.service';

@Module({
  providers: [{ provide: MAIL_SERVICE, useClass: MockMailService }],
  exports: [MAIL_SERVICE],
})
export class MailModule {}
