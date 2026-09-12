"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react"; // 🔴 Dodano useSession
import { 
  LayoutDashboard, 
  Wallet, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut, 
  HelpCircle,
  Box,
  ShieldCheck // 🔴 Ikona dla Twojego panelu
} from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession(); // 🔴 Pobieramy dane sesji

  // Sprawdzamy, czy jesteś adminem
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const menuItems = [
    { name: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/dashboard" },
    { name: "Budżety", icon: <Wallet size={20} />, href: "/budgets" },
    { name: "Transakcje", icon: <Receipt size={20} />, href: "/transactions" },
    { name: "Raporty", icon: <BarChart3 size={20} />, href: "/reports" },
    { name: "Ustawienia", icon: <Settings size={20} />, href: "/settings" },
  ];

  return (
    <div className="flex min-h-screen bg-[#F0F2F9]">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gradient-to-b from-indigo-600 to-indigo-900 text-white flex flex-col fixed h-full shadow-2xl z-20">
        
        {/* LOGO */}
        <div className="p-8 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Box size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">BudgetApp</span>
        </div>

        {/* MENU GŁÓWNE */}
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "bg-white/20 shadow-inner" 
                    : "hover:bg-white/10 text-white/70 hover:text-white"
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}

          {/* 🔴 SEKCJA DLA CIEBIE (ADMINA) */}
          {isAdmin && (
            <div className="mt-10 pt-6 border-t border-white/10">
              <p className="px-4 text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-4 opacity-60">
                Administracja
              </p>
              <Link
                href="/admin"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  pathname === "/admin" 
                    ? "bg-amber-500/20 text-amber-300 shadow-inner border border-amber-500/30" 
                    : "hover:bg-white/10 text-white/70 hover:text-white"
                }`}
              >
                <ShieldCheck size={20} className={pathname === "/admin" ? "text-amber-300" : ""} />
                <span className="font-bold tracking-wide">Panel Admina</span>
              </Link>
            </div>
          )}
        </nav>

        {/* DOLNE OPCJE */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <button className="flex items-center gap-3 px-4 py-3 w-full text-white/70 hover:text-white transition-colors rounded-xl font-medium">
            <HelpCircle size={20} />
            <span>Pomoc</span>
          </button>
          <button 
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-4 py-3 w-full text-white/70 hover:text-red-300 transition-colors rounded-xl font-bold"
          >
            <LogOut size={20} />
            <span>Wyloguj się</span>
          </button>
        </div>
      </aside>

      {/* GŁÓWNA TREŚĆ */}
      <main className="flex-1 ml-64 p-4 min-h-screen">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
}