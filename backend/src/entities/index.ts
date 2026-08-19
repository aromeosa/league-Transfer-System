export * from './enums';
export * from './team.entity';
export * from './user-account.entity';
export * from './player.entity';
export * from './transfer-window.entity';
export * from './transfer-request.entity';
export * from './approval-action.entity';
export * from './payment.entity';
export * from './roster-history.entity';
export * from './password-reset-token.entity';
export * from './player-deregistration-request.entity';
export * from './legacy-team.entity';

import { Team } from './team.entity';
import { UserAccount } from './user-account.entity';
import { Player } from './player.entity';
import { TransferWindow } from './transfer-window.entity';
import { TransferRequest } from './transfer-request.entity';
import { ApprovalAction } from './approval-action.entity';
import { Payment } from './payment.entity';
import { RosterHistory } from './roster-history.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { PlayerDeregistrationRequest } from './player-deregistration-request.entity';
import { LegacyTeam } from './legacy-team.entity';

export const ALL_ENTITIES = [
  Team,
  UserAccount,
  Player,
  TransferWindow,
  TransferRequest,
  ApprovalAction,
  Payment,
  RosterHistory,
  PasswordResetToken,
  PlayerDeregistrationRequest,
  LegacyTeam,
];
