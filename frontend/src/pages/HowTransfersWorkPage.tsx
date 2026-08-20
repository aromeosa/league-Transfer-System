import { useAuth } from '../auth/AuthContext';
import { DashboardShell } from '../layout/DashboardShell';
import { TEAM_OWNER_NAV } from '../layout/nav';

export function HowTransfersWorkPage() {
  const { user, logout } = useAuth();

  const navItems = TEAM_OWNER_NAV;

  return (
    <DashboardShell title="How Transfers Work" userName={user?.name} onLogout={logout} navItems={navItems}>
      <section className="card">
        <h2>The short version</h2>
        <p>
          Transfers only happen during a monthly <strong>transfer window</strong>. Outside that window, everyone's
          roster is locked. Every transfer needs the <strong>League Admin's final approval</strong> before it's
          official — nothing you do here takes effect on its own.
        </p>
      </section>

      <section className="card">
        <h2>1. When can I make a transfer?</h2>
        <p>
          Only during the transfer window — the <strong>1st to the 7th of every month</strong>. If the window is
          closed, you can browse and plan, but you can't sign or request anyone until it opens again.
        </p>
      </section>

      <section className="card">
        <h2>2. Who can I sign?</h2>
        <ul>
          <li>
            <strong>Free Agents</strong> — players not on any team. You can sign them directly, no one else's
            permission needed.
          </li>
          <li>
            <strong>Registered Players</strong> — players already on another team. To sign one, that team has to
            agree to release them first.
          </li>
          <li>
            <strong>Legacy Players</strong> — players who've already qualified for the main event, or helped
            another team qualify. They work like registered players: the team they're locked to has to release
            them, and a move is always permanent — there's no such thing as a temporary loan.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>3. How many players can I bring in per window?</h2>
        <p>Up to <strong>5 in total</strong>, split across three separate limits:</p>
        <ul>
          <li>2 Free Agents</li>
          <li>2 Registered Players from other teams</li>
          <li>1 Legacy Player</li>
        </ul>
        <p className="muted">These don't overlap — hitting your Free Agent limit doesn't affect how many Registered Players you can still bring in.</p>
      </section>

      <section className="card">
        <h2>4. How many times can the same player move?</h2>
        <p>
          There's no season-long limit on a player — the same player can be transferred as many times as the
          league's other rules allow. Your team's per-window limits above (2 Free Agents, 2 Registered Players,
          1 Legacy Player) are what actually keep transfers in check.
        </p>
      </section>

      <section className="card">
        <h2>5. What does it cost, and where does the money go?</h2>
        <ul>
          <li>Every registered player has a value, somewhere between <strong>R500 and R5,000</strong>, set by their own team.</li>
          <li>
            You set that value when you register a player, and can change it anytime — no transfer window needed.
          </li>
          <li>When you want to sign someone else's player, you and their team agree on a fee within that range.</li>
          <li>
            Of that fee, <strong>20% goes to the league</strong> and the rest goes to the releasing club. Half of
            what the club receives (40% of the original fee) is meant for the player themselves — it's the club's
            job to pass that share on, the system doesn't pay the player directly.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>6. Who actually has to say yes?</h2>
        <ol>
          <li>If the player is on another team, that team approves or rejects the release first.</li>
          <li>You pay the agreed fee through the league's payment system.</li>
          <li>The <strong>League Admin</strong> gives the final sign-off — this is what makes the transfer official.</li>
        </ol>
        <p className="muted">
          If any of these steps hasn't happened by the time the window closes, the request is automatically
          cancelled and you'd need to start again next window.
        </p>
      </section>

      <section className="card">
        <h2>A couple of other things to know</h2>
        <ul>
          <li>Every team must keep at least 5 players. If releasing someone would drop you below that, the League Admin will take a closer look before approving it — it's not blocked outright, just flagged.</li>
          <li>If your team registered itself rather than being set up directly by the league, it needs League Admin approval before you can do anything at all, including transfers.</li>
        </ul>
      </section>
    </DashboardShell>
  );
}
