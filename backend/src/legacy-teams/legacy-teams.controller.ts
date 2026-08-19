import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { LegacyTeamsService } from './legacy-teams.service';
import { CreateLegacyTeamDto } from './dto/create-legacy-team.dto';

@Controller('legacy-teams')
@UseGuards(JwtAuthGuard)
export class LegacyTeamsController {
  constructor(private readonly service: LegacyTeamsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateLegacyTeamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto.name, dto.owner, user);
  }
}
