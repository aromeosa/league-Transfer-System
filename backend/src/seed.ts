import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import dataSource from './config/data-source';
import {
  Player,
  PlayerOrigin,
  PlayerStatus,
  LegacyReason,
  RosterHistory,
  Team,
  TransferWindow,
  UserAccount,
  UserRole,
  WindowStatus,
} from './entities';

const DEV_PASSWORD = 'DevPass123!';

async function seed() {
  await dataSource.initialize();
  console.log('Connected. Seeding...');

  await dataSource.transaction(async (manager) => {
    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
    const now = new Date();

    const admin = await manager.save(
      UserAccount,
      manager.create(UserAccount, {
        name: 'League Admin',
        email: 'admin@5quadleague.test',
        passwordHash,
        role: UserRole.LEAGUE_ADMIN,
      }),
    );

    const teamAlpha = await manager.save(Team, manager.create(Team, { name: 'Alpha Squad' }));
    await manager.save(
      UserAccount,
      manager.create(UserAccount, {
        name: 'Alpha Owner',
        email: 'alpha@5quadleague.test',
        passwordHash,
        role: UserRole.TEAM_OWNER,
        team: teamAlpha,
      }),
    );

    const teamBeta = await manager.save(Team, manager.create(Team, { name: 'Beta Squad' }));
    await manager.save(
      UserAccount,
      manager.create(UserAccount, {
        name: 'Beta Owner',
        email: 'beta@5quadleague.test',
        passwordHash,
        role: UserRole.TEAM_OWNER,
        team: teamBeta,
      }),
    );

    const alphaRoster = await manager.save(
      Player,
      [1, 2, 3, 4, 5].map((n) =>
        manager.create(Player, {
          name: `Alpha Player ${n}`,
          currentTeam: teamAlpha,
          status: PlayerStatus.REGISTERED,
          originType: PlayerOrigin.DIRECT_REGISTRATION,
          transferValue: 1000 + n * 100,
        }),
      ),
    );

    const betaRoster = await manager.save(
      Player,
      [1, 2, 3, 4, 5].map((n) =>
        manager.create(Player, {
          name: `Beta Player ${n}`,
          currentTeam: teamBeta,
          status: PlayerStatus.REGISTERED,
          originType: PlayerOrigin.DIRECT_REGISTRATION,
          transferValue: 900 + n * 100,
        }),
      ),
    );

    await manager.save(
      RosterHistory,
      [...alphaRoster, ...betaRoster].map((player) =>
        manager.create(RosterHistory, { player, team: player.currentTeam!, joinedAt: now }),
      ),
    );

    // Free Agents (§1.2) — available for a straight FREE_AGENT_SIGNING request.
    await manager.save(
      Player,
      [1, 2].map((n) =>
        manager.create(Player, {
          name: `Free Agent ${n}`,
          currentTeam: null,
          status: PlayerStatus.FREE_AGENT,
          originType: PlayerOrigin.FREE_AGENT_ORIGIN,
          transferValue: 700,
        }),
      ),
    );

    // A previously-registered, currently-unattached player (§1.4 #7) — still REGISTERED,
    // not a Free Agent; re-enters via a standard CLUB_TRANSFER request.
    await manager.save(
      Player,
      manager.create(Player, {
        name: 'Unattached Registered Player',
        currentTeam: null,
        status: PlayerStatus.REGISTERED,
        originType: PlayerOrigin.DIRECT_REGISTRATION,
        transferValue: 800,
      }),
    );

    // A Legacy Player (§1.2) — locked to Alpha Squad, movable only via LEGACY_TRANSFER.
    const legacyPlayer = await manager.save(
      Player,
      manager.create(Player, {
        name: 'Legacy Player',
        currentTeam: teamAlpha,
        status: PlayerStatus.LEGACY,
        originType: PlayerOrigin.DIRECT_REGISTRATION,
        legacyReason: LegacyReason.QUALIFIED_MAIN_EVENT,
        transferValue: 3000,
      }),
    );
    await manager.save(RosterHistory, manager.create(RosterHistory, { player: legacyPlayer, team: teamAlpha, joinedAt: now }));

    // Force-open window regardless of the real calendar date, so the slice is testable
    // immediately (per the implementation plan's dev-tooling note).
    await manager.save(
      TransferWindow,
      manager.create(TransferWindow, {
        opensAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        closesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: WindowStatus.OPEN,
      }),
    );

    console.log(`Seeded League Admin: ${admin.email} / ${DEV_PASSWORD}`);
  });

  console.log('Seed complete. Accounts (all use password: ' + DEV_PASSWORD + '):');
  console.log('  League Admin -> admin@5quadleague.test');
  console.log('  Alpha Owner  -> alpha@5quadleague.test');
  console.log('  Beta Owner   -> beta@5quadleague.test');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
