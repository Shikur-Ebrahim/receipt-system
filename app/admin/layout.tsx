"use client";

import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [proofCount, setProofCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        if (idTokenResult.claims.admin) {
          setIsAdmin(true);
          setLoading(false);
        } else {
          router.push("/login"); // Not an admin
        }
      } else {
        router.push("/login"); // Not logged in
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Real-time proof count for sidebar badge
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "payment_proofs"), (snap) => {
      setProofCount(snap.size);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const navLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { name: "Settings", href: "/admin/settings", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
    { name: "Payments", href: "/admin/payments", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )},
    { name: "Users", href: "/admin/users", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
    { name: "Proofs", href: "/admin/proofs", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#8cc63f] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">

      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-[#8cc63f] p-2 rounded-xl shadow-lg shadow-[#8cc63f]/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-800 tracking-tight leading-none">Admin</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Management Portal</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                  pathname === link.href
                    ? 'bg-[#8cc63f] text-white shadow-lg shadow-[#8cc63f]/30'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                <div className={pathname === link.href ? 'text-white' : 'text-gray-400'}>{link.icon}</div>
                <span className="font-bold text-sm tracking-wide flex-1">{link.name}</span>
                {link.href === '/admin/proofs' && proofCount > 0 && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center ${
                    pathname === link.href ? 'bg-white/30 text-white' : 'bg-[#8cc63f] text-white'
                  }`}>
                    {proofCount > 99 ? '99+' : proofCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-[#8cc63f] hover:bg-[#8cc63f]/10 rounded-xl transition-all group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8cc63f]/60 group-hover:text-[#8cc63f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-bold text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-8 sticky top-0 z-30 justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile: show brand logo inline */}
            <div className="lg:hidden bg-[#8cc63f] p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-base font-black text-gray-800 tracking-tight">
              {navLinks.find(l => l.href === pathname)?.name || "Admin"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-gray-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest hidden sm:block">Online</span>
            </div>
            {/* Mobile sign out */}
            <button
              onClick={handleLogout}
              className="lg:hidden p-2 text-[#8cc63f] hover:bg-[#8cc63f]/10 rounded-xl transition-all"
              title="Sign Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Child Pages — extra bottom padding on mobile for the tab bar */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 md:p-8 pb-28 lg:pb-8 custom-scrollbar">
          {children}
        </main>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR (hidden on desktop) ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch h-[72px]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-all active:scale-95 ${
                  isActive ? 'text-[#8cc63f]' : 'text-gray-400'
                }`}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#8cc63f] rounded-b-full" />
                )}

                {/* Icon with active bg */}
                <div className={`relative p-2 rounded-xl transition-all ${isActive ? 'bg-[#8cc63f]/10' : ''}`}>
                  {link.icon}
                  {/* Proof badge */}
                  {link.href === '/admin/proofs' && proofCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8cc63f] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {proofCount > 9 ? '9+' : proofCount}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={`text-[10px] font-black uppercase tracking-wide leading-none ${isActive ? 'text-[#8cc63f]' : 'text-gray-400'}`}>
                  {link.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
