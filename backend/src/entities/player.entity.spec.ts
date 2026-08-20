import { instanceToPlain } from 'class-transformer';
import { Player } from './player.entity';
import { UserAccount } from './user-account.entity';
import { PlayerOrigin, PlayerStatus, UserRole } from './enums';

describe('Player serialization', () => {
  it('exposes idVerified but never the underlying hash', () => {
    const player = new Player();
    player.id = 'p1';
    player.name = 'Test Player';
    player.status = PlayerStatus.REGISTERED;
    player.originType = PlayerOrigin.DIRECT_REGISTRATION;
    player.transferCount = 0;
    player.idNumberHash = 'deadbeef'.repeat(8);

    const plain = instanceToPlain(player);

    expect(plain.idVerified).toBe(true);
    expect(plain.idNumberHash).toBeUndefined();
  });

  it('idVerified is false when no hash is on file', () => {
    const player = new Player();
    player.idNumberHash = null;

    expect(instanceToPlain(player).idVerified).toBe(false);
  });

  it('exposes hasAccount but never the underlying account object', () => {
    const player = new Player();
    player.id = 'p2';
    player.name = 'Self-Signed Free Agent';
    player.status = PlayerStatus.FREE_AGENT;
    player.originType = PlayerOrigin.FREE_AGENT_ORIGIN;
    player.transferCount = 0;
    const account = new UserAccount();
    account.id = 'u1';
    account.email = 'fa@example.com';
    account.role = UserRole.FREE_AGENT;
    player.account = account;

    const plain = instanceToPlain(player);

    expect(plain.hasAccount).toBe(true);
    expect(plain.account).toBeUndefined();
  });

  it('hasAccount is false for a player added directly with no login account', () => {
    const player = new Player();
    player.account = null;

    expect(instanceToPlain(player).hasAccount).toBe(false);
  });
});
