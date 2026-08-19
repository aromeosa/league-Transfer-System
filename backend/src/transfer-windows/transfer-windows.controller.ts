import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities';
import { TransferWindowsService } from './transfer-windows.service';
import { CreateWindowDto } from './dto/create-window.dto';

@Controller('transfer-windows')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransferWindowsController {
  constructor(private readonly windowsService: TransferWindowsService) {}

  @Get('current')
  getCurrent() {
    return this.windowsService.getCurrent();
  }

  /** Force-open — with no body, opens a window right now spanning the next 7 days. */
  @Post()
  @Roles(UserRole.LEAGUE_ADMIN)
  create(@Body() dto: CreateWindowDto) {
    return this.windowsService.create(
      dto.opensAt ? new Date(dto.opensAt) : undefined,
      dto.closesAt ? new Date(dto.closesAt) : undefined,
    );
  }

  @Post('force-close')
  @Roles(UserRole.LEAGUE_ADMIN)
  forceClose() {
    return this.windowsService.forceClose();
  }
}
