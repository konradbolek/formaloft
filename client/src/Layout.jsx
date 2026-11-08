import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Logo } from "./Logo.jsx";
import { company, nav } from "./site.js";

function Menu({ className, id, onNavigate }) {
  const { pathname } = useLocation();

  return (
    <nav id={id} className={className} aria-label="Główne">
      {nav.map((item) => {
        if (item.to.includes("#")) {
          return (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          );
        }
        const onTool = item.to === "/kalkulatory" && pathname.startsWith("/kalkulator");
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive || onTool ? "is-active" : undefined)}
            onClick={onNavigate}
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Layout() {
  const { pathname, hash } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return (
    <>
      <header className={menuOpen ? "site-header is-open" : "site-header"}>
        <div className="site-header-inner">
          <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
            <Logo />
          </Link>
          <div className="header-tools">
            <a className="phone" href={company.phoneHref}>
              {company.phone}
            </a>
            <button
              type="button"
              className="menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? "Zamknij" : "Menu"}
            </button>
          </div>
          <Menu id="site-menu" className="site-nav" onNavigate={() => setMenuOpen(false)} />
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <Link to="/" className="brand">
              <Logo tone="light" />
            </Link>
            <p>Loftowe meble ze stali i drewna. Ręczne wykonanie, na wymiar.</p>
          </div>
          <Menu className="site-footer-nav" />
          <div>
            <p className="footer-label">Kontakt</p>
            <a className="phone" href={company.phoneHref}>
              {company.phone}
            </a>
            <p>
              {company.street}
              <br />
              {company.place}
            </p>
            <Link to="/kontakt">Napisz wiadomość</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
