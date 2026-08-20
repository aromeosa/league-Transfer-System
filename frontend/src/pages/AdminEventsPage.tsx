import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import type {
  DeregistrationReason,
  LegacyModeRequest,
  LegacyTeam,
  Player,
  PlayerDeregistrationRequest,
  RequestStatus,
  Team,
  TransferRequest,
} from '../types';
import { DashboardShell } from '../layout/DashboardShell';
import { ADMIN_NAV } from '../layout/nav';

const DECISION_LABEL: Partial<Record<RequestStatus, string>> = {
  APPROVED: 'Transfer approved',
  REJECTED_BY_RELEASING_TEAM: 'Rejected by releasing team',
  REJECTED_BY_PLAYER: 'Rejected by player',
  REJECTED_BY_REQUESTING_TEAM: 'Rejected by approached team',
  REJECTED_BY_LEGACY_TEAM: 'Rejected by legacy team owner',
  REJECTED_BY_LEAGUE_ADMIN: 'Rejected by League Admin',
  CANCELLED_WINDOW_CLOSED: 'Cancelled — window closed',
  CANCELLED_PLAYER_UNAVAILABLE: 'Cancelled — player unavailable',
};

const DECISION_TONE: Partial<Record<RequestStatus, 'good' | 'bad'>> = {
  APPROVED: 'good',
  REJECTED_BY_RELEASING_TEAM: 'bad',
  REJECTED_BY_PLAYER: 'bad',
  REJECTED_BY_REQUESTING_TEAM: 'bad',
  REJECTED_BY_LEGACY_TEAM: 'bad',
  REJECTED_BY_LEAGUE_ADMIN: 'bad',
  CANCELLED_WINDOW_CLOSED: 'bad',
  CANCELLED_PLAYER_UNAVAILABLE: 'bad',
};

const DEREGISTRATION_REASON_LABEL: Record<DeregistrationReason, string> = {
  BAD_BEHAVIOUR: 'bad behaviour',
  MUTUAL_AGREEMENT: 'mutual agreement',
};

interface TimelineEvent {
  id: string;
  at: string;
  label: string;
  tone: 'pending' | 'good' | 'bad';
  player: string;
  from: string;
  to: string;
  fee: string;
}

function buildTimeline(
  requests: TransferRequest[],
  players: Player[],
  deregistrations: PlayerDeregistrationRequest[],
  teams: Team[],
  legacyTeams: LegacyTeam[],
  legacyModeRequests: LegacyModeRequest[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const r of requests) {
    const player = r.player.name;
    const from = r.releasingTeam?.name ?? '—';
    const to = r.requestingTeam.name;
    const fee = `R${r.agreedFee}`;
    events.push({ id: `${r.id}-submitted`, at: r.createdAt, label: 'Request submitted', tone: 'pending', player, from, to, fee });
    if (r.payment) {
      events.push({ id: `${r.id}-pay-initiated`, at: r.payment.createdAt, label: 'Payment initiated', tone: 'pending', player, from, to, fee });
      if (r.payment.confirmedAt) {
        events.push({ id: `${r.id}-pay-confirmed`, at: r.payment.confirmedAt, label: 'Payment confirmed', tone: 'good', player, from, to, fee });
      }
    }
    if (r.decidedAt) {
      events.push({
        id: `${r.id}-decided`,
        at: r.decidedAt,
        label: DECISION_LABEL[r.status] ?? r.status,
        tone: DECISION_TONE[r.status] ?? 'pending',
        player,
        from,
        to,
        fee,
      });
    }
  }

  // Players added straight onto a roster via "Add player" never go through a transfer
  // request at all — surfaced here separately so that path stays visible to admins too.
  const signedViaRequestIds = new Set(requests.map((r) => r.player.id));
  for (const p of players) {
    if (p.originType !== 'FREE_AGENT_ORIGIN' || !p.currentTeam || signedViaRequestIds.has(p.id)) continue;
    events.push({
      id: `${p.id}-added`,
      at: p.createdAt,
      label: 'Player registered (free agent)',
      tone: 'good',
      player: p.name,
      from: '—',
      to: p.currentTeam.name,
      fee: p.transferValue != null ? `R${p.transferValue}` : '—',
    });
  }

  for (const d of deregistrations) {
    const reasonLabel = DEREGISTRATION_REASON_LABEL[d.reason];
    events.push({
      id: `${d.id}-requested`,
      at: d.createdAt,
      label: `Deregistration requested (${reasonLabel})`,
      tone: 'pending',
      player: d.player.name,
      from: d.team.name,
      to: '—',
      fee: '—',
    });
    if (d.decidedAt) {
      events.push({
        id: `${d.id}-decided`,
        at: d.decidedAt,
        label: d.status === 'APPROVED' ? 'Deregistration approved' : 'Deregistration rejected',
        tone: d.status === 'APPROVED' ? 'good' : 'bad',
        player: d.player.name,
        from: d.team.name,
        to: '—',
        fee: '—',
      });
    }
  }

  // A player who actually self-registered through the public Free Agent signup form —
  // distinct from one a team/admin added directly (see Player.hasAccount).
  for (const p of players) {
    if (!p.hasAccount) continue;
    events.push({
      id: `${p.id}-signed-up`,
      at: p.createdAt,
      label: 'Free agent signed up',
      tone: 'good',
      player: p.name,
      from: '—',
      to: '—',
      fee: '—',
    });
  }

  for (const t of teams) {
    // A team the admin created directly never goes through decide(), so decidedAt stays
    // null forever for it — that's the signal a self-registered team went through
    // approval versus one that was active immediately.
    events.push({
      id: `${t.id}-registered`,
      at: t.createdAt,
      label: t.decidedAt || t.status === 'PENDING_APPROVAL' ? 'Team registered' : 'Team created by admin',
      tone: 'good',
      player: '—',
      from: '—',
      to: t.name,
      fee: '—',
    });
    if (t.decidedAt) {
      events.push({
        id: `${t.id}-decided`,
        at: t.decidedAt,
        label: t.status === 'ACTIVE' ? 'Team approved' : 'Team rejected',
        tone: t.status === 'ACTIVE' ? 'good' : 'bad',
        player: '—',
        from: '—',
        to: t.name,
        fee: '—',
      });
    }
  }

  for (const lt of legacyTeams) {
    events.push({
      id: `${lt.id}-added`,
      at: lt.createdAt,
      label: 'Legacy team added',
      tone: 'good',
      player: '—',
      from: '—',
      to: lt.name,
      fee: '—',
    });
  }

  for (const r of legacyModeRequests) {
    events.push({
      id: `${r.id}-requested`,
      at: r.createdAt,
      label: 'Legacy mode requested',
      tone: 'pending',
      player: '—',
      from: '—',
      to: r.team.name,
      fee: '—',
    });
    if (r.decidedAt) {
      events.push({
        id: `${r.id}-decided`,
        at: r.decidedAt,
        label: r.status === 'APPROVED' ? 'Legacy mode approved' : 'Legacy mode rejected',
        tone: r.status === 'APPROVED' ? 'good' : 'bad',
        player: '—',
        from: '—',
        to: r.team.name,
        fee: '—',
      });
    }
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function AdminEventsPage() {
  const { user, token, logout } = useAuth();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [deregistrations, setDeregistrations] = useState<PlayerDeregistrationRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [legacyTeams, setLegacyTeams] = useState<LegacyTeam[]>([]);
  const [legacyModeRequests, setLegacyModeRequests] = useState<LegacyModeRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Each source feeds its own slice of the timeline — Promise.allSettled means a
      // hiccup in any one of them can't blank the whole event log, it just shows
      // everything else with that section's events missing.
      const [requestsRes, playersRes, deregistrationsRes, teamsRes, legacyTeamsRes, legacyModeRes] =
        await Promise.allSettled([
          api.get<TransferRequest[]>('/transfer-requests', token),
          api.get<Player[]>('/players', token),
          api.get<PlayerDeregistrationRequest[]>('/player-deregistrations', token),
          api.get<Team[]>('/teams', token),
          api.get<LegacyTeam[]>('/legacy-teams', token),
          api.get<LegacyModeRequest[]>('/legacy-mode-requests', token),
        ]);
      if (cancelled) return;
      setRequests(requestsRes.status === 'fulfilled' ? requestsRes.value : []);
      setPlayers(playersRes.status === 'fulfilled' ? playersRes.value : []);
      setDeregistrations(deregistrationsRes.status === 'fulfilled' ? deregistrationsRes.value : []);
      setTeams(teamsRes.status === 'fulfilled' ? teamsRes.value : []);
      setLegacyTeams(legacyTeamsRes.status === 'fulfilled' ? legacyTeamsRes.value : []);
      setLegacyModeRequests(legacyModeRes.status === 'fulfilled' ? legacyModeRes.value : []);
      if ([requestsRes, playersRes, deregistrationsRes, teamsRes, legacyTeamsRes, legacyModeRes].every((r) => r.status === 'rejected')) {
        setError('Failed to load events');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const timeline = useMemo(
    () => buildTimeline(requests, players, deregistrations, teams, legacyTeams, legacyModeRequests),
    [requests, players, deregistrations, teams, legacyTeams, legacyModeRequests],
  );

  return (
    <DashboardShell title="All Events" userName={user?.name} onLogout={logout} navItems={ADMIN_NAV}>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Event log ({timeline.length})</h2>
        {timeline.length === 0 ? (
          <p className="muted">No events yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date &amp; time</th>
                <th>Event</th>
                <th>Player</th>
                <th>From</th>
                <th>To</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((ev) => (
                <tr key={ev.id}>
                  <td>{new Date(ev.at).toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-${ev.tone}`}>{ev.label}</span>
                  </td>
                  <td>{ev.player}</td>
                  <td>{ev.from}</td>
                  <td>{ev.to}</td>
                  <td>{ev.fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </DashboardShell>
  );
}
