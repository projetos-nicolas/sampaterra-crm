"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { SampaTerraLogo } from "@/components/SampaTerraLogo";
import { useMobileNav } from "@/components/layout/MobileNavContext";

type NavItem = { href: string; label: string; icon: React.ReactNode; adminOnly?: boolean };
type NavSection = { group: string; roles?: string[]; items: NavItem[] };

const NAV: NavSection[] = [
  {
    group: "PRINCIPAL",
    roles: ["admin", "coordinator", "engineer", "funcionario"],
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        href: "/pipeline",
        label: "Processo Comercial",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M3 6h18M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        href: "/clientes",
        label: "Clientes",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <circle cx="9" cy="7" r="3" />
            <path d="M3 21v-2a5 5 0 0 1 5-5h2" strokeLinecap="round" />
            <circle cx="17" cy="11" r="3" />
            <path d="M11 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        href: "/equipe",
        label: "Equipe",
        adminOnly: true,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    group: "FINANCEIRO",
    // Oculto para clientes e funcionarios
    roles: ["admin", "coordinator", "engineer"],
    items: [
      {
        href: "/financeiro",
        label: "Financeiro",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "MEU PORTAL",
    // Apenas para clientes
    roles: ["client"],
    items: [
      {
        href: "/portal",
        label: "Início",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        ),
      },
    ],
  },
  {
    group: "OPERACIONAL",
    // Visível para todos
    items: [
      {
        href: "/propostas",
        label: "Propostas",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        href: "/projetos",
        label: "Projetos",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
            <line x1="12" y1="22" x2="12" y2="15.5" />
            <polyline points="22,8.5 12,15.5 2,8.5" />
          </svg>
        ),
      },
      {
        href: "/documentos",
        label: "Documentos",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        href: "/frota",
        label: "Frota",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <rect x="1" y="7" width="13" height="9" rx="1" />
            <path d="M14 10h4l3 3v3h-7z" />
            <circle cx="5" cy="18" r="1.6" />
            <circle cx="17" cy="18" r="1.6" />
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? "engineer";
  const { open, close } = useMobileNav();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const visibleSections = NAV.filter(
    (section) => !section.roles || section.roles.includes(role)
  );

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 bg-[#1A1A1A] flex flex-col transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:w-56 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
        <SampaTerraLogo variant="azul-quadrado" height={80} />
        <button
          onClick={close}
          className="ml-auto text-white/60 hover:text-white md:hidden"
          aria-label="Fechar menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Padrão decorativo */}
      <div
        className="h-0.5 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #F5A623 0, #F5A623 8px, transparent 0, transparent 16px)",
        }}
      />

      {/* Nav com grupos */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {visibleSections.map((section) => (
          <div key={section.group} className="mb-4">
            <p className="px-4 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
              {section.group}
            </p>
            {section.items.filter(item => !item.adminOnly || role === "admin").map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#F5A623] text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={active ? "text-white" : "text-white/50"}>
                    {item.icon}
                  </span>
                  {item.label}
                  {active && <span className="ml-auto w-1 h-4 bg-white/40 rounded-full" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-white/10 text-white/30 text-xs flex-shrink-0">
        v0.1.0
      </div>
      </aside>
    </>
  );
}
