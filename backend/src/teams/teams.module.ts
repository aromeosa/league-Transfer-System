import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../entities';
import { AuthModule } from '../auth/auth.module';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { ActiveTeamGuard } from './active-team.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Team]), AuthModule],
  controllers: [TeamsController],
  providers: [TeamsService, ActiveTeamGuard],
  exports: [TeamsService, ActiveTeamGuard],
})
export class TeamsModule {}
