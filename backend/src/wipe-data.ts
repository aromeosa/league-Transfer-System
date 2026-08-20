import 'dotenv/config';
import { In } from 'typeorm';
import dataSource from './config/data-source';
import {
  ApprovalAction,
  LegacyTeam,
  Payment,
  Player,
  PlayerDeregistrationRequest,
  RosterHistory,
  Team,
  TransferRequest,
  TransferWindow,
  UserAccount,
  UserRole,
  PasswordResetToken,
} from './entities';

/**
 * Pre-launch data wipe. Keeps:
 *  - every LEAGUE_ADMIN account
 *  - the named teams below (owner account + current roster)
 *  - the named free agent(s) below (player + account, if any)
 *  - the named legacy teams below (owner account + signed legacy players, if any)
 * Wipes everything else, including ALL transfer requests, payments, approval
 * actions, roster history, transfer windows and password-reset tokens —
 * even the ones that touched a kept team — since a request/payment row
 * references both sides of a transaction and can't be cleanly split.
 *
 * Note: Team and LegacyTeam are separate tables — a club can have a row in
 * both. Keeping a Team by name does NOT automatically keep a same-named
 * LegacyTeam row; list it separately in KEEP_LEGACY_TEAM_NAMES if needed.
 *
 * Two-step safety gate: run with no args first to preview exactly what will
 * be kept/wiped (no writes happen). Only run with `--confirm` once you've
 * checked the preview and taken a backup (see backup-data.ts).
 */
const KEEP_TEAM_NAMES = ['Destroyers fc', 'GSW FC', 'Ireland Boys', 'Marabastad Fc', 'Rush Cape Town', 'Brolic FC', 'John Wick FC'];
const KEEP_FREE_AGENT_NAMES = ['holy smokes'];
const KEEP_LEGACY_TEAM_NAMES = ['Ireland Boys'];

function norm(s: string): string {
  return s.trim().toLowerCase();
}

async function run() {
  const confirmed = process.argv.includes('--confirm');

  await dataSource.initialize();

  const teamRepo = dataSource.getRepository(Team);
  const legacyTeamRepo = dataSource.getRepository(LegacyTeam);
  const playerRepo = dataSource.getRepository(Player);
  const userRepo = dataSource.getRepository(UserAccount);

  const allTeams = await teamRepo.find();
  const keepTeamNamesNorm = KEEP_TEAM_NAMES.map(norm);
  const keptTeams = allTeams.filter((t) => keepTeamNamesNorm.includes(norm(t.name)));
  const keptTeamIds = new Set(keptTeams.map((t) => t.id));
  const wipedTeams = allTeams.filter((t) => !keptTeamIds.has(t.id));

  const allLegacyTeams = await legacyTeamRepo.find();
  const keepLegacyTeamNamesNorm = KEEP_LEGACY_TEAM_NAMES.map(norm);
  const keptLegacyTeams = allLegacyTeams.filter((lt) => keepLegacyTeamNamesNorm.includes(norm(lt.name)));
  const keptLegacyTeamIds = new Set(keptLegacyTeams.map((lt) => lt.id));
  const wipedLegacyTeams = allLegacyTeams.filter((lt) => !keptLegacyTeamIds.has(lt.id));

  const matchedNames = new Set(keptTeams.map((t) => norm(t.name)));
  const unmatchedKeepNames = KEEP_TEAM_NAMES.filter((n) => !matchedNames.has(norm(n)));
  const matchedLegacyNames = new Set(keptLegacyTeams.map((lt) => norm(lt.name)));
  const unmatchedKeepLegacyNames = KEEP_LEGACY_TEAM_NAMES.filter((n) => !matchedLegacyNames.has(norm(n)));

  const allPlayers = await playerRepo.find({ relations: ['currentTeam', 'legacyTeam'] });
  const keepFreeAgentNamesNorm = KEEP_FREE_AGENT_NAMES.map(norm);
  const isKeptPlayer = (p: Player) =>
    (p.currentTeam != null && keptTeamIds.has(p.currentTeam.id)) ||
    (p.legacyTeam != null && keptLegacyTeamIds.has(p.legacyTeam.id)) ||
    keepFreeAgentNamesNorm.includes(norm(p.name));
  const keptPlayers = allPlayers.filter(isKeptPlayer);
  const wipedPlayers = allPlayers.filter((p) => !isKeptPlayer(p));
  const keptPlayerIds = new Set(keptPlayers.map((p) => p.id));

  const allUsers = await userRepo.find({ relations: ['team', 'player', 'legacyTeam'] });
  const isKeptUser = (u: UserAccount) =>
    u.role === UserRole.LEAGUE_ADMIN ||
    (u.role === UserRole.TEAM_OWNER && u.team != null && keptTeamIds.has(u.team.id)) ||
    (u.role === UserRole.FREE_AGENT && u.player != null && keptPlayerIds.has(u.player.id)) ||
    (u.role === UserRole.LEGACY_TEAM_OWNER && u.legacyTeam != null && keptLegacyTeamIds.has(u.legacyTeam.id));
  const keptUsers = allUsers.filter(isKeptUser);
  const wipedUsers = allUsers.filter((u) => !isKeptUser(u));

  console.log('=== WIPE PREVIEW ===');
  console.log(`Teams to KEEP (${keptTeams.length}):`, keptTeams.map((t) => t.name));
  if (unmatchedKeepNames.length > 0) {
    console.log('WARNING — these keep-list names matched NO team in the database:', unmatchedKeepNames);
  }
  console.log(`Teams to WIPE (${wipedTeams.length}):`, wipedTeams.map((t) => t.name));
  console.log(`Legacy Teams to KEEP (${keptLegacyTeams.length}):`, keptLegacyTeams.map((lt) => lt.name));
  if (unmatchedKeepLegacyNames.length > 0) {
    console.log('WARNING — these keep-list legacy team names matched NO legacy team in the database:', unmatchedKeepLegacyNames);
  }
  console.log(`Legacy Teams to WIPE (${wipedLegacyTeams.length}):`, wipedLegacyTeams.map((lt) => lt.name));
  console.log(`Players to KEEP (${keptPlayers.length})`);
  console.log(`Players to WIPE (${wipedPlayers.length})`);
  console.log(`Accounts to KEEP (${keptUsers.length}):`, keptUsers.map((u) => `${u.email} [${u.role}]`));
  console.log(`Accounts to WIPE (${wipedUsers.length}):`, wipedUsers.map((u) => `${u.email} [${u.role}]`));
  console.log('Also wiping ALL rows in: transfer_requests, payments, approval_actions, roster_history,');
  console.log('player_deregistration_requests, transfer_windows, password_reset_tokens.');

  if (unmatchedKeepNames.length > 0 || unmatchedKeepLegacyNames.length > 0) {
    console.log('\nAborting — fix the unmatched name(s) above (typo/whitespace?) before proceeding.');
    await dataSource.destroy();
    process.exit(1);
  }

  if (!confirmed) {
    console.log('\nDry run only — no changes made. Re-run with --confirm to execute this exact plan.');
    await dataSource.destroy();
    return;
  }

  console.log('\n--confirm passed. Executing wipe in a single transaction...');

  await dataSource.transaction(async (manager) => {
    // Empty-criteria .delete() throws in TypeORM 0.3, so the full-table wipes go
    // through the query builder instead — it has no such restriction.
    const truncateAll = async (entity: Function) => {
      await manager.createQueryBuilder().delete().from(entity).execute();
    };
    await truncateAll(ApprovalAction);
    await truncateAll(Payment);
    await truncateAll(RosterHistory);
    await truncateAll(PlayerDeregistrationRequest);
    await truncateAll(TransferRequest);
    await truncateAll(TransferWindow);
    await truncateAll(PasswordResetToken);

    const wipedUserIds = wipedUsers.map((u) => u.id);
    if (wipedUserIds.length > 0) {
      await manager.delete(UserAccount, { id: In(wipedUserIds) });
    }

    const wipedPlayerIds = wipedPlayers.map((p) => p.id);
    if (wipedPlayerIds.length > 0) {
      await manager.delete(Player, { id: In(wipedPlayerIds) });
    }

    const wipedTeamIds = wipedTeams.map((t) => t.id);
    if (wipedTeamIds.length > 0) {
      await manager.delete(Team, { id: In(wipedTeamIds) });
    }

    const wipedLegacyTeamIds = wipedLegacyTeams.map((lt) => lt.id);
    if (wipedLegacyTeamIds.length > 0) {
      await manager.delete(LegacyTeam, { id: In(wipedLegacyTeamIds) });
    }
  });

  console.log('Wipe complete.');
  await dataSource.destroy();
}

run().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
