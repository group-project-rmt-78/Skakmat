import { Link, NavLink } from "react-router-dom";
import { Crown } from "lucide-react";

const linkClass = ({ isActive }) =>
  `text-sm transition-colors ${isActive ? "text-accent" : "text-neutral-400 hover:text-neutral-100"}`;

export default function Navbar() {
  return (
    <header className="border-b border-line bg-surface/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold tracking-wide text-neutral-100"
        >
          <Crown size={18} className="text-accent" />
          SKAKMAT
        </Link>
        <nav className="flex items-center gap-6">
          <NavLink to="/play" className={linkClass}>
            Play
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
