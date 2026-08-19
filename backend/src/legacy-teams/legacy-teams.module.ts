import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegacyTeam } from '../entities';
import { AuthModule } from '../auth/auth.module';
import { LegacyTeamsService } from './legacy-teams.service';
import { LegacyTeamsController } from './legacy-teams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LegacyTeam]), AuthModule],
  controllers: [LegacyTeamsController],
  providers: [LegacyTeamsService],
  exports: [LegacyTeamsService],
})
export class LegacyTeamsModule {}
