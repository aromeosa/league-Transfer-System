import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player, PlayerRegistrationToken } from '../entities';
import { MailModule } from '../mail/mail.module';
import { PlayerRegistrationService } from './player-registration.service';

@Module({
  imports: [TypeOrmModule.forFeature([Player, PlayerRegistrationToken]), MailModule],
  providers: [PlayerRegistrationService],
  exports: [PlayerRegistrationService],
})
export class PlayerRegistrationModule {}
