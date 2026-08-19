import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { RequestStatus, TransferRequest, TransferWindow, WindowStatus } from '../entities';
import { firstWeekWindowBounds } from './window-dates.util';

const UNRESOLVED_STATUSES = [
  RequestStatus.PENDING_RELEASING_APPROVAL,
  RequestStatus.PENDING_PLAYER_APPROVAL,
  RequestStatus.PENDING_TEAM_APPROVAL,
  RequestStatus.PENDING_LEGACY_TEAM_APPROVAL,
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

  /**
   * League Admin force-opens a window right now, regardless of the automatic monthly
   * schedule (§7.3). Closes out any window that's currently open first — the system
   * only ever has one open window at a time, so force-opening always wins over
   * whatever was already running.
   */
  async create(opensAt?: Date, closesAt?: Date): Promise<TransferWindow> {
    const bounds = opensAt && closesAt ? { opensAt, closesAt } : firstWeekWindowBounds();
    const now = new Date();
    const status =
      now >= bounds.opensAt && now <= bounds.closesAt
        ? WindowStatus.OPEN
        : now > bounds.closesAt
          ? WindowStatus.CLOSED
          : WindowStatus.SCHEDULED;

    if (status === WindowStatus.OPEN) {
      await this.closeAnyCurrentlyOpenWindows(now);
    }

    return this.windowRepo.save(this.windowRepo.create({ ...bounds, status }));
  }

  /** League Admin force-closes whatever window is currently open, right now (§7.3). */
  async forceClose(): Promise<TransferWindow> {
    const current = await this.windowRepo.findOne({ where: { status: WindowStatus.OPEN } });
    if (!current) {
      throw new NotFoundException('No transfer window is currently open');
    }
    await this.closeWindowNow(current, new Date());
    return current;
  }

  async findById(id: string): Promise<TransferWindow> {
    const window = await this.windowRepo.findOne({ where: { id } });
    if (!window) {
      throw new NotFoundException('Transfer window not found');
    }
    return window;
  }

  /**
   * §5.3/§6.3/§1.4 #5 — runs every minute: auto-creates the current calendar month's
   * window (the 1st through the 7th) the first time it's due, opens/closes windows on
   * schedule, and cancels every request still unresolved at close (§1.3 "not fully
   * approved and settled by window close is automatically cancelled"). Force-open and
   * force-close (above) are the League Admin's manual override of this same schedule.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sweep(): Promise<void> {
    const now = new Date();
    await this.autoCreateMonthlyWindow(now);

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
      const affected = await this.cancelUnresolvedRequests(window.id, now);
      this.logger.log(`Transfer window ${window.id} closed; cancelled ${affected} unresolved request(s)`);
    }
  }

  /**
   * Creates this month's automatic 1st-7th window exactly once, the first sweep tick
   * on or after the 1st. Keyed on the exact opensAt/closesAt bounds so it never fires
   * twice for the same month — including when the League Admin has force-closed that
   * window early, which must not be undone by the next tick re-creating it.
   */
  private async autoCreateMonthlyWindow(now: Date): Promise<void> {
    const bounds = firstWeekWindowBounds(now);
    if (now < bounds.opensAt) {
      return;
    }
    const exists = await this.windowRepo.findOne({
      where: { opensAt: bounds.opensAt, closesAt: bounds.closesAt },
    });
    if (exists) {
      return;
    }

    const status = now <= bounds.closesAt ? WindowStatus.OPEN : WindowStatus.CLOSED;
    if (status === WindowStatus.OPEN) {
      await this.closeAnyCurrentlyOpenWindows(now);
    }
    const window = await this.windowRepo.save(this.windowRepo.create({ ...bounds, status }));
    this.logger.log(
      `Auto-created ${status} transfer window ${window.id} (${bounds.opensAt.toISOString()} – ${bounds.closesAt.toISOString()})`,
    );
  }

  private async closeAnyCurrentlyOpenWindows(now: Date): Promise<void> {
    const openWindows = await this.windowRepo.find({ where: { status: WindowStatus.OPEN } });
    for (const window of openWindows) {
      await this.closeWindowNow(window, now);
    }
  }

  private async closeWindowNow(window: TransferWindow, now: Date): Promise<void> {
    window.status = WindowStatus.CLOSED;
    window.closesAt = now;
    await this.windowRepo.save(window);
    const affected = await this.cancelUnresolvedRequests(window.id, now);
    this.logger.log(`Transfer window ${window.id} force-closed; cancelled ${affected} unresolved request(s)`);
  }

  private async cancelUnresolvedRequests(windowId: string, now: Date): Promise<number> {
    const result = await this.requestRepo.update(
      { window: { id: windowId }, status: In(UNRESOLVED_STATUSES) },
      { status: RequestStatus.CANCELLED_WINDOW_CLOSED, decidedAt: now },
    );
    return result.affected ?? 0;
  }
}
