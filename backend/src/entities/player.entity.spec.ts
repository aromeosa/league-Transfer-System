import { instanceToPlain } from 'class-transformer';
import { Player } from './player.entity';
import { PlayerOrigin, PlayerStatus } from './enums';

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
});
