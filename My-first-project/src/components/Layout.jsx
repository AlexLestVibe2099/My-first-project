import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Сегодня" },
  { to: "/calendar", label: "Календарь" },
  { to: "/log", label: "Запись" },
  { to: "/analytics", label: "Аналитика" },
  { to: "/profile", label: "Профиль" },
  { to: "/settings", label: "Настройки" }
];

export default function Layout({ title, children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-3 sm:px-4">
          <h1 className="text-base font-semibold text-primary sm:text-lg">CycleCare</h1>
          <span className="rounded-full bg-primarySoft px-3 py-1 text-[11px] font-medium text-primary sm:text-xs">
            {title}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-4 pb-24 sm:px-4 sm:py-6 sm:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-5xl">
          <ul className="flex gap-2 overflow-x-auto px-3 py-2 sm:hidden">
            {navItems.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `block min-w-[96px] rounded-lg px-3 py-2 text-center text-sm font-medium ${
                      isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <ul className="hidden grid-cols-6 gap-2 p-3 sm:grid">
            {navItems.map((item) => (
              <li key={`desktop-${item.to}`}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-md px-2 py-2 text-center text-sm ${
                      isActive ? "bg-primary text-white" : "bg-slate-100 hover:bg-slate-200"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
}
