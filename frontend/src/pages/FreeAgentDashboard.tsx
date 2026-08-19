import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Player, TransferRequest } from '../types';
import { StatTile } from '../components/StatTile';
import { RequestTable } from '../components/RequestTable';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { DashboardShell } from '../layout/DashboardShell';
import { CameraIcon, TransferIcon } from '../components/icons';
import { resizeImageToDataUrl } from '../utils/resizeImage';
import { getFreeAgentPublicNav } from './FreeAgentsPage';

export function FreeAgentDashboard() {
  const { user, token, logout } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get<Player>('/players/me', token), api.get<TransferRequest[]>('/transfer-requests', token)])
      .then(([playerRes, requestsRes]) => {
        if (cancelled) return;
        setPlayer(playerRes);
        setRequests(requestsRes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load your dashboard');
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const pendingOffers = useMemo(() => requests.filter((r) => r.status === 'PENDING_PLAYER_APPROVAL'), [requests]);

  const navItems = getFreeAgentPublicNav(true);

  return (
    <DashboardShell title={`${user?.name ?? ''} — Free Agent`} userName={user?.name} onLogout={logout} navItems={navItems}>
      {error && <p className="error">{error}</p>}

      <div className="stat-tile-row">
        <StatTile icon={<TransferIcon />} label="Offers awaiting your decision" value={pendingOffers.length} />
      </div>

      <section className="card">
        <h2>My profile</h2>
        {player ? (
          <OwnProfilePhoto player={player} token={token} onUpdated={refresh} />
        ) : (
          <p className="muted">Loading…</p>
        )}
      </section>

      <section className="card">
        <h2>Signing offers awaiting your decision</h2>
        {pendingOffers.length === 0 ? (
          <p className="muted">No teams have offered to sign you right now.</p>
        ) : (
          pendingOffers.map((r) => <OfferRow key={r.id} request={r} token={token} onDecided={refresh} />)
        )}
      </section>

      <section className="card">
        <h2>All requests involving you</h2>
        <RequestTable requests={requests} />
      </section>
    </DashboardShell>
  );
}

/** Free Agent self-service photo upload — same client-resize-then-upload pattern as a
 * Team Owner uploading a photo for one of their own roster players, just scoped to the
 * logged-in Free Agent's own profile instead. */
function OwnProfilePhoto({
  player,
  token,
  onUpdated,
}: {
  player: Player;
  token: string | null;
  onUpdated: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const photoDataUrl = await resizeImageToDataUrl(file);
      await api.patch('/players/me/photo', { photoDataUrl }, token);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }

  return (
    <span className="player-name-cell">
      <button
        type="button"
        className="player-avatar-wrap editable"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        aria-label="Upload your profile photo"
        title="Upload a photo"
      >
        <PlayerAvatar avatarUrl={player.avatarUrl} />
        <span className="player-avatar-badge">
          <CameraIcon />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      <span>
        {player.name}
        {error && (
          <>
            <br />
            <span className="error">{error}</span>
          </>
        )}
      </span>
    </span>
  );
}

function OfferRow({
  request,
  token,
  onDecided,
}: {
  request: TransferRequest;
  token: string | null;
  onDecided: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function decide(decision: 'APPROVE' | 'REJECT') {
    setBusy(true);
    try {
      await api.post(`/transfer-requests/${request.id}/player-decision`, { decision }, token);
      onDecided();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="request-row">
      <span>
        <strong>{request.requestingTeam.name}</strong> wants to sign you for R{request.agreedFee}
      </span>
      <span>
        <button disabled={busy} onClick={() => decide('APPROVE')}>
          Accept
        </button>
        <button disabled={busy} onClick={() => decide('REJECT')}>
          Decline
        </button>
      </span>
    </div>
  );
}
