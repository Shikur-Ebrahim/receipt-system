"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/config";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("UserLayout: Initialize auth listener");
    let unsubscribeBalance: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      console.log("UserLayout: Auth state changed", currentUser?.email);
      
      if (currentUser) {
        setUser(currentUser);
        
        // Check if admin and redirect
        const idTokenResult = await currentUser.getIdTokenResult();
        if (idTokenResult.claims.admin) {
          console.log("UserLayout: Admin detected, redirecting...");
          router.push("/admin/dashboard");
          return;
        }

        // Listen for balance updates AND forced logout
        unsubscribeBalance = onSnapshot(doc(db, "users", currentUser.uid), async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setBalance(data.balance);

            // Admin-triggered force logout
            if (data.forceLogout === true) {
              // Reset the flag first so they can log in again
              await updateDoc(doc(db, "users", currentUser.uid), { forceLogout: false });
              await signOut(auth);
              router.push("/login");
              return;
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("UserLayout: Balance listener error", error);
          setLoading(false); // Stop loading even on error
        });
      } else {
        console.log("UserLayout: No user, redirecting to login");
        router.push("/login");
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeBalance) unsubscribeBalance();
    };
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const navLinks = [
    { 
      name: "Create Receipt", 
      href: "/", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      name: "Payment Methods", 
      href: "/payment-methods", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    { 
      name: "Upload Payment", 
      href: "/upload-payment", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )
    },
    { 
      name: "Get App", 
      href: "/install-app", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#8cc63f] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">

      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-gray-200 shrink-0">
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-[#8cc63f] p-2 rounded-xl shadow-lg shadow-[#8cc63f]/20">
                <img src="/cbe-logo.png" alt="CBE Logo" className="w-5 h-5 brightness-0 invert" />
              </div>
              <span className="text-xl font-black text-gray-800 tracking-tight">CBE Receipt</span>
            </div>
          </div>

          {/* Nav Links */}
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
                <span className={pathname === link.href ? 'text-white' : 'text-gray-400'}>{link.icon}</span>
                <span className="font-bold text-sm">{link.name}</span>
              </Link>
            ))}
          </nav>

          {/* Account */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="px-2">
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest block mb-1">Your Account</span>
              <span className="text-sm font-bold text-gray-700 truncate block">{user?.email}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-30 justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="lg:hidden bg-[#8cc63f] p-1.5 rounded-lg">
              <img src="/cbe-logo.png" alt="CBE" className="w-4 h-4 brightness-0 invert" />
            </div>
            <h2 className="text-base font-black text-gray-800 tracking-tight">
              {navLinks.find(l => l.href === pathname)?.name || "CBE Receipt"}
            </h2>
          </div>

          {/* Balance Badge */}
          <div className="bg-[#8cc63f]/10 border border-[#8cc63f]/20 rounded-xl px-3 py-2 flex flex-col items-end">
            <span className="text-[9px] uppercase font-black text-[#8cc63f] leading-none tracking-widest">Balance</span>
            <span className="text-sm font-black text-gray-800 leading-none mt-0.5">
              {balance !== null ? balance.toFixed(2) : "0.00"} <span className="text-[10px] font-bold text-gray-400">ETB</span>
            </span>
          </div>
        </header>

        {/* Content — extra bottom padding for tab bar on mobile */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 pb-28 lg:pb-8">
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
                {/* Active top pill */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#8cc63f] rounded-b-full" />
                )}

                {/* Icon */}
                <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-[#8cc63f]/10' : ''}`}>
                  {link.icon}
                </div>

                {/* Label */}
                <span className={`text-[10px] font-black uppercase tracking-wide leading-none ${isActive ? 'text-[#8cc63f]' : 'text-gray-400'}`}>
                  {link.name === "Create Receipt" ? "Receipt" : link.name === "Payment Methods" ? "Payments" : link.name === "Upload Payment" ? "Upload" : link.name === "Get App" ? "App" : link.name}
                </span>
              </Link>
            );
          })}

        </div>
      </nav>

    </div>
  );
}
