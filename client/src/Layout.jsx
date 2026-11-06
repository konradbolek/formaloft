import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { company, nav } from "./site.js";

function Menu({ className }) {
  const { pathname } = useLocation();
  const onCalculator = pathname.startsWith("/kalkulator");

  return (
    <nav className={className} aria-label="Główne">
      {nav.map((item) => {
        if (!item.to.includes("#")) {
          return (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              {item.label}
            </NavLink>
          );
        }
        const active = item.to === "/#kalkulatory" && onCalculator;
        return (
          <Link key={item.to} to={item.to} className={active ? "is-active" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Layout() {
  const { pathname, hash } = useLocation();

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
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="brand">
            Forma Loft
          </Link>
          <Menu className="site-nav" />
          <a className="phone" href={company.phoneHref}>
            {company.phone}
          </a>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <p className="brand">Forma Loft</p>
            <p>Loftowe meble ze stali i drewna. Ręczne wykonanie, na wymiar.</p>
          </div>
          <Menu className="site-footer-nav" />
          <div>
            <p className="footer-label">Kontakt</p>
            <a className="phone" href={company.phoneHref}>
              {company.phone}
            </a>
            <p>Wycena pod konkretną ścianę.</p>
            <Link to="/kontakt">Napisz wiadomość</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
