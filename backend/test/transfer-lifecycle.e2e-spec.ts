import * as request from 'supertest';
import { ensureTestDatabaseExists, resetAndMigrate } from './db-setup';

// Must run before AppModule (and anything importing config/data-source.ts) is loaded,
// so the whole suite targets transfer_system_test, not the dev database.
beforeAll(async () => {
  await ensureTestDatabaseExists();
  await resetAndMigrate();
});

/* eslint-disable @typescript-eslint/no-var-requires */
describe('Transfer Request Lifecycle (e2e)', () => {
  let app: import('@nestjs/common').INestApplication;

  let adminToken: string;
  let teamAOwnerToken: string;
  let teamBOwnerToken: string;
  let teamAId: string;
  let teamBId: string;
  let teamAPlayerIds: string[];

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, ClassSerializerInterceptor } = await import('@nestjs/common');
    const { Reflector } = await import('@nestjs/core');
    const { AppModule } = await import('../src/app.module');
    const { UserAccount, UserRole } = await import('../src/entities');
    const bcrypt = await import('bcryptjs');

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    // Bootstrap the first League Admin directly (mirrors seed.ts) — there is no
    // self-registration endpoint by design (§1.1: only Team Owner + League Admin login).
    const { DataSource } = await import('typeorm');
    const dataSource = app.get(DataSource);
    await dataSource.getRepository(UserAccount).save(
      dataSource.getRepository(UserAccount).create({
        name: 'Test League Admin',
        email: 'admin@test.local',
        passwordHash: await bcrypt.hash('AdminPass123!', 10),
        role: UserRole.LEAGUE_ADMIN,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs the League Admin in', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.local', password: 'AdminPass123!' })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    adminToken = res.body.accessToken;
  });

  it('registers two teams with a 5-player roster each (§4.2 roster 5-15)', async () => {
    const makeTeamPayload = (name: string, ownerEmail: string) => ({
      name,
      owner: { name: `${name} Owner`, email: ownerEmail, password: 'OwnerPass123!' },
      players: [1, 2, 3, 4, 5].map((n) => ({ name: `${name} Player ${n}`, transferValue: 1000 })),
    });

    const teamA = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(makeTeamPayload('Alpha', 'alpha-owner@test.local'))
      .expect(201);
    teamAId = teamA.body.id;
    teamAPlayerIds = teamA.body.roster.map((p: { id: string }) => p.id);
    expect(teamA.body.roster).toHaveLength(5);

    const teamB = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(makeTeamPayload('Beta', 'beta-owner@test.local'))
      .expect(201);
    teamBId = teamB.body.id;
  });

  it('rejects a team registered with fewer than 5 players', async () => {
    await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Too Small',
        owner: { name: 'X', email: 'toosmall@test.local', password: 'OwnerPass123!' },
        players: [{ name: 'Solo Player' }],
      })
      .expect(400);
  });

  it('logs both team owners in', async () => {
    const alpha = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'alpha-owner@test.local', password: 'OwnerPass123!' })
      .expect(201);
    teamAOwnerToken = alpha.body.accessToken;

    const beta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'beta-owner@test.local', password: 'OwnerPass123!' })
      .expect(201);
    teamBOwnerToken = beta.body.accessToken;
  });

  it('opens a transfer window (forced open regardless of real calendar date)', async () => {
    const now = Date.now();
    const res = await request(app.getHttpServer())
      .post('/transfer-windows')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        opensAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        closesAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .expect(201);
    expect(res.body.status).toBe('OPEN');

    const current = await request(app.getHttpServer())
      .get('/transfer-windows/current')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(current.body.status).toBe('OPEN');
  });

  let requestId: string;

  it('golden path: Beta requests an Alpha player, Alpha approves, payment settles, League Admin approves', async () => {
    const submitRes = await request(app.getHttpServer())
      .post('/transfer-requests')
      .set('Authorization', `Bearer ${teamBOwnerToken}`)
      .send({ playerId: teamAPlayerIds[0], requestType: 'CLUB_TRANSFER', proposedFee: 1000 })
      .expect(201);
    requestId = submitRes.body.id;
    expect(submitRes.body.status).toBe('PENDING_RELEASING_APPROVAL');
    // Alpha's roster drops from 5 to 4 on this move, breaching the 5-player floor —
    // flagged, not blocked (§1.3).
    expect(submitRes.body.squadFloorFlag).toBe(true);

    const releaseRes = await request(app.getHttpServer())
      .post(`/transfer-requests/${requestId}/releasing-decision`)
      .set('Authorization', `Bearer ${teamAOwnerToken}`)
      .send({ decision: 'APPROVE' })
      .expect(201);
    expect(releaseRes.body.status).toBe('PENDING_PAYMENT');

    const payRes = await request(app.getHttpServer())
      .post(`/transfer-requests/${requestId}/payment/initiate`)
      .set('Authorization', `Bearer ${teamBOwnerToken}`)
      .expect(201);
    // Mock gateway auto-confirms (§payment-gateway), so this jumps straight to league approval.
    expect(payRes.body.request.status).toBe('PENDING_LEAGUE_APPROVAL');
    expect(payRes.body.payment.status).toBe('CONFIRMED');
    expect(payRes.body.payment.leagueAmount).toBe(200);
    expect(payRes.body.payment.clubSettlementAmount).toBe(800);

    const approveRes = await request(app.getHttpServer())
      .post(`/transfer-requests/${requestId}/league-decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(201);
    expect(approveRes.body.status).toBe('APPROVED');
  });

  it('reflects the roster change on both teams after approval', async () => {
    const teamA = await request(app.getHttpServer())
      .get(`/teams/${teamAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(teamA.body.roster).toHaveLength(4);
    expect(teamA.body.roster.map((p: { id: string }) => p.id)).not.toContain(teamAPlayerIds[0]);

    const teamB = await request(app.getHttpServer())
      .get(`/teams/${teamBId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(teamB.body.roster).toHaveLength(6);
    expect(teamB.body.roster.map((p: { id: string }) => p.id)).toContain(teamAPlayerIds[0]);
  });

  it('enforces the per-window, per-category signing cap (2 CLUB_TRANSFER per team, §1.4 #1/#12)', async () => {
    // Beta already used 1 of its 2 CLUB_TRANSFER slots on the golden path above.
    await request(app.getHttpServer())
      .post('/transfer-requests')
      .set('Authorization', `Bearer ${teamBOwnerToken}`)
      .send({ playerId: teamAPlayerIds[1], requestType: 'CLUB_TRANSFER', proposedFee: 1000 })
      .expect(201);

    // A 3rd CLUB_TRANSFER request in the same window must be rejected.
    await request(app.getHttpServer())
      .post('/transfer-requests')
      .set('Authorization', `Bearer ${teamBOwnerToken}`)
      .send({ playerId: teamAPlayerIds[2], requestType: 'CLUB_TRANSFER', proposedFee: 1000 })
      .expect(409);
  });

  it('enforces the season transfer-count cap for a Free-Agent-origin player (§1.4 #4)', async () => {
    const { DataSource } = await import('typeorm');
    const { Player, PlayerOrigin, PlayerStatus } = await import('../src/entities');
    const dataSource = app.get(DataSource);
    const freeAgent = await dataSource.getRepository(Player).save(
      dataSource.getRepository(Player).create({
        name: 'Capped Free Agent',
        status: PlayerStatus.FREE_AGENT,
        originType: PlayerOrigin.FREE_AGENT_ORIGIN,
        transferValue: 600,
      }),
    );

    const teamC = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Gamma',
        owner: { name: 'Gamma Owner', email: 'gamma-owner@test.local', password: 'OwnerPass123!' },
        players: [1, 2, 3, 4, 5].map((n) => ({ name: `Gamma Player ${n}`, transferValue: 1000 })),
      })
      .expect(201);
    const gammaOwnerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'gamma-owner@test.local', password: 'OwnerPass123!' })
      .expect(201);
    const teamCOwnerToken = gammaOwnerLogin.body.accessToken;

    // Sign the Free Agent onto Beta (initial signing doesn't count against the cap).
    const signRes = await request(app.getHttpServer())
      .post('/transfer-requests')
      .set('Authorization', `Bearer ${teamBOwnerToken}`)
      .send({ playerId: freeAgent.id, requestType: 'FREE_AGENT_SIGNING', proposedFee: 600 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/transfer-requests/${signRes.body.id}/payment/initiate`)
      .set('Authorization', `Bearer ${teamBOwnerToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/transfer-requests/${signRes.body.id}/league-decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(201);

    // First transfer after signing — uses their one permitted move (cap = 1).
    const firstMove = await request(app.getHttpServer())
      .post('/transfer-requests')
      .set('Authorization', `Bearer ${teamCOwnerToken}`)
      .send({ playerId: freeAgent.id, requestType: 'CLUB_TRANSFER', proposedFee: 600 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/transfer-requests/${firstMove.body.id}/releasing-decision`)
      .set('Authorization', `Bearer ${teamBOwnerToken}`)
      .send({ decision: 'APPROVE' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/transfer-requests/${firstMove.body.id}/payment/initiate`)
      .set('Authorization', `Bearer ${teamCOwnerToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/transfer-requests/${firstMove.body.id}/league-decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(201);

    // A second transfer of the same ex-Free-Agent player must now be rejected.
    await request(app.getHttpServer())
      .post('/transfer-requests')
      .set('Authorization', `Bearer ${teamAOwnerToken}`)
      .send({ playerId: freeAgent.id, requestType: 'CLUB_TRANSFER', proposedFee: 600 })
      .expect(400);
  });
});
