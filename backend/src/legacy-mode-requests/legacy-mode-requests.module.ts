import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegacyModeRequest } from '../entities';
import { AuthModule } from '../auth/auth.module';
import { TeamsModule } from '../teams/teams.module';
import { LegacyModeRequestsService } from './legacy-mode-requests.service';
import { LegacyModeRequestsController } from './legacy-mode-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LegacyModeRequest]), AuthModule, TeamsModule],
  controllers: [LegacyModeRequestsController],
  providers: [LegacyModeRequestsService],
})
export class LegacyModeRequestsModule {}
