import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { RequestStatus, TransferRequest, TransferWindow, WindowStatus } from '../entities';
import { firstWeekWindowBounds } from './window-dates.util';

const UNRESOLVED_STATUSES = [
  RequestStatus.PENDING_RELEASING_APPROVAL,
  RequestStatus.PENDING_PAYMENT,
  RequestStatus.PENDING_LEAGUE_APPROVAL,
];

@Injectable()
export class TransferWindowsService {
  private readonly logger = new Logger(TransferWindowsService.name);

  constructor(
    @InjectRepository(TransferWindow) private readonly windowRepo: Repository<TransferWindow>,
    @InjectRepository(TransferRequest) private readonly requestRepo: Repository<TransferRequest>,
  ) {}

  async getCurrent(): Promise<TransferWindow | null> {
    return this.windowRepo.findOne({ where: { status: WindowStatus.OPEN }, order: { opensAt: 'DESC' } });
  }

  /** League Admin — schedule/override a window (§7.3). Defaults to the current calendar month's first week. */
  async create(opensAt?: Date, closesAt?: Date): Promise<TransferWindow> {
    const bounds = opensAt && closesAt ? { opensAt, closesAt } : firstWeekWindowBounds();
    const now = new Date();
    const status =
      now >= bounds.opensAt && now <= bounds.closesAt
        ? WindowStatus.OPEN
        : now > bounds.closesAt
          ? WindowStatus.CLOSED
          : WindowStatus.SCHEDULED;

    return this.windowRepo.save(this.windowRepo.create({ ...bounds, status }));
  }

  async findById(id: string): Promise<TransferWindow> {
    const window = await this.windowRepo.findOne({ where: { id } });
    if (!window) {
      throw new NotFoundException('Transfer window not found');
    }
    return window;
  }

  /**
   * §5.3/§6.3 — Scheduled -> Open on opensAt, Open -> Closed on closesAt, cancelling
   * every request still unresolved at close (§1.3 "not fully approved and settled by
   * window close is automatically cancelled").
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sweep(): Promise<void> {
    const now = new Date();

    const toOpen = await this.windowRepo.find({
      where: { status: WindowStatus.SCHEDULED, opensAt: LessThanOrEqual(now) },
    });
    for (const window of toOpen) {
      window.status = WindowStatus.OPEN;
      await this.windowRepo.save(window);
      this.logger.log(`Transfer window ${window.id} opened`);
    }

    const toClose = await this.windowRepo.find({
      where: { status: WindowStatus.OPEN, closesAt: LessThanOrEqual(now) },
    });
    for (const window of toClose) {
      window.status = WindowStatus.CLOSED;
      await this.windowRepo.save(window);

      const result = await this.requestRepo.update(
        { window: { id: window.id }, status: In(UNRESOLVED_STATUSES) },
        { status: RequestStatus.CANCELLED_WINDOW_CLOSED, decidedAt: now },
      );
      this.logger.log(
        `Transfer window ${window.id} closed; cancelled ${result.affected ?? 0} unresolved request(s)`,
      );
    }
  }
}
