import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerDeregistrationRequest } from '../entities';
import { AuthModule } from '../auth/auth.module';
import { TeamsModule } from '../teams/teams.module';
import { PlayerDeregistrationsService } from './player-deregistrations.service';
import { PlayerDeregistrationsController } from './player-deregistrations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerDeregistrationRequest]), AuthModule, TeamsModule],
  controllers: [PlayerDeregistrationsController],
  providers: [PlayerDeregistrationsService],
})
export class PlayerDeregistrationsModule {}
