import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PasswordResetToken, UserAccount } from '../entities';
import { JwtPayload } from './jwt-payload.interface';
import { MAIL_SERVICE, MailService } from '../mail/mail.interface';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserAccount)
    private readonly userRepo: Repository<UserAccount>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepo: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    @Inject(MAIL_SERVICE) private readonly mailService: MailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['team', 'player'],
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      teamId: user.team?.id ?? null,
      playerId: user.player?.id ?? null,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.team?.id ?? null,
        // Fetched fresh at login, not embedded in the JWT itself — see ActiveTeamGuard
        // for why enforcement never trusts a token's team status.
        teamStatus: user.team?.status ?? null,
        playerId: user.player?.id ?? null,
      },
    };
  }

  /**
   * Deliberately silent on an unknown email (same response either way) — otherwise this
   * endpoint would let anyone probe which emails have an account.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.resetTokenRepo.save(
      this.resetTokenRepo.create({
        userAccount: user,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      }),
    );

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordReset(user.email, resetUrl);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const resetToken = await this.resetTokenRepo.findOne({
      where: { tokenHash },
      relations: ['userAccount'],
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }

    resetToken.usedAt = new Date();
    await this.resetTokenRepo.save(resetToken);

    resetToken.userAccount.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(resetToken.userAccount);
  }
}
