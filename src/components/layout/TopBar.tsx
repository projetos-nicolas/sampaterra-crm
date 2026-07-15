"use client";

import { signOut, useSession } from "next-auth/react";
import { useMobileNav } from "@/components/layout/MobileNavContext";

export function TopBar() {
  const { data: session } = useSession();
  const user = session?.user;
  const { toggle } = useMobileNav();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="md:hidden -ml-1 p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          aria-label="Abrir menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
            <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
            <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
          </svg>
        </button>
        <span className="hidden sm:inline text-sm text-gray-400">Sampa Terra CRM</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            {user?.name ?? "Usuário"}
          </p>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white text-xs font-bold flex items-center justify-center hover:bg-[#2C2C2C] transition flex-shrink-0"
          title="Sair"
        >
          {user?.name?.charAt(0).toUpperCase() ?? "?"}
        </button>
      </div>
    </header>
  );
}
