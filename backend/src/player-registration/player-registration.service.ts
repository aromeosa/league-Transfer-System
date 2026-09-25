import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { Player, PlayerRegistrationToken, PlayerStatus } from '../entities';
import { MAIL_SERVICE, MailService } from '../mail/mail.interface';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * A player a team owner registers directly (initial roster or "Add player") starts
 * PENDING_APPROVAL and must accept an emailed link before they count as REGISTERED.
 * Its own module — separate from PlayersModule/TeamsModule — since both need it and
 * neither can depend on the other (PlayersModule already depends on TeamsModule).
 */
@Injectable()
export class PlayerRegistrationService {
  constructor(
    @InjectRepository(Player) private readonly playerRepo: Repository<Player>,
    @InjectRepository(PlayerRegistrationToken) private readonly tokenRepo: Repository<PlayerRegistrationToken>,
    @Inject(MAIL_SERVICE) private readonly mailService: MailService,
  ) {}

  async issueInvite(player: Player, teamName: string): Promise<void> {
    if (!player.email) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.tokenRepo.save(
      this.tokenRepo.create({
        player,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      }),
    );

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const confirmUrl = `${frontendUrl}/confirm-registration?token=${rawToken}`;
    await this.mailService.sendPlayerRegistrationInvite(player.email, player.name, teamName, confirmUrl);
  }

  /** Public — the raw token from the emailed link is the only credential needed. */
  async confirm(rawToken: string): Promise<Player> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const token = await this.tokenRepo.findOne({
      where: { tokenHash },
      relations: ['player', 'player.currentTeam'],
    });

    if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This confirmation link is invalid or has expired');
    }
    if (token.player.status !== PlayerStatus.PENDING_APPROVAL) {
      throw new BadRequestException('This registration has already been confirmed');
    }

    token.usedAt = new Date();
    await this.tokenRepo.save(token);

    token.player.status = PlayerStatus.REGISTERED;
    return this.playerRepo.save(token.player);
  }

  /** Team owner resending a lost/expired invite to one of their own pending players. */
  async resend(player: Player, teamName: string): Promise<void> {
    if (player.status !== PlayerStatus.PENDING_APPROVAL) {
      throw new BadRequestException('This player has already confirmed their registration');
    }
    await this.issueInvite(player, teamName);
  }
}
