import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { HOME_PATH } from '../auth/RequireAuth';

/** The 5quadLeague wordmark — doubles as a home button, matching the same
 * role-based destination RequireAuth redirects to. Logged-out visitors land on the
 * public teams directory, the closest thing this app has to a public homepage. */
export function Logo({ className }: { className?: string }) {
  const { user } = useAuth();
  const home = user ? HOME_PATH[user.role] : '/teams';

  return (
    <Link to={home} className={`logo-link${className ? ` ${className}` : ''}`} aria-label="5quadLeague home">
      <img src="/logo/5quadleague-logo.png" alt="5quadLeague" className="logo-img" />
    </Link>
  );
}
