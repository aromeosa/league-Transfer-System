import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { TransferWindowsService } from './transfer-windows.service';

/**
 * Free-tier hosts (Render's free web service) spin down after ~15 min idle, so the
 * in-process @Cron sweep (still active as a fallback whenever the app happens to be
 * awake) can't be relied on alone. An external pinger (e.g. cron-job.org) hitting this
 * endpoint every ~10 minutes both keeps the service awake AND triggers the sweep —
 * see the deployment README for setup. Not user-auth-gated (no browser session calls
 * this); guarded instead by a shared secret set via the SWEEP_SECRET env var.
 */
@Controller('internal')
export class InternalSweepController {
  constructor(private readonly windowsService: TransferWindowsService) {}

  @Post('sweep')
  async sweep(@Headers('x-sweep-secret') providedSecret?: string) {
    const expected = process.env.SWEEP_SECRET;
    if (!expected || providedSecret !== expected) {
      throw new UnauthorizedException('Invalid or missing sweep secret');
    }
    await this.windowsService.sweep();
    return { ok: true, sweptAt: new Date().toISOString() };
  }
}
