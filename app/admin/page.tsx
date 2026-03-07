"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, getCountFromServer, doc, getDoc } from "firebase/firestore";
import Link from "next/link";

export default function AdminHomePage() {
  const [stats, setStats] = useState({ users: 0, proofs: 0, fee: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [usersSnap, proofsSnap, settingsSnap] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(collection(db, "payment_proofs")),
          getDoc(doc(db, "system", "settings")),
        ]);
        setStats({
          users: usersSnap.data().count,
          proofs: proofsSnap.data().count,
          fee: settingsSnap.exists() ? settingsSnap.data().downloadFee || 0 : 0,
        });
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const navItems = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      desc: "Stats & overview",
      color: "bg-blue-50 border-blue-100",
      iconColor: "text-blue-500",
      iconBg: "bg-blue-100",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      href: "/admin/proofs",
      label: "Proofs",
      desc: `${stats.proofs} pending`,
      color: "bg-[#8cc63f]/5 border-[#8cc63f]/20",
      iconColor: "text-[#8cc63f]",
      iconBg: "bg-[#8cc63f]/10",
      badge: stats.proofs > 0 ? stats.proofs : null,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/admin/users",
      label: "Users",
      desc: `${stats.users} registered`,
      color: "bg-purple-50 border-purple-100",
      iconColor: "text-purple-500",
      iconBg: "bg-purple-100",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      href: "/admin/payments",
      label: "Payments",
      desc: "Account settings",
      color: "bg-amber-50 border-amber-100",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-100",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      href: "/admin/settings",
      label: "Settings",
      desc: `Fee: ${stats.fee} ETB`,
      color: "bg-gray-50 border-gray-200",
      iconColor: "text-gray-500",
      iconBg: "bg-gray-200",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-[#8cc63f] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#8cc63f]/30">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Management Portal</h1>
        <p className="text-gray-400 font-medium text-sm mt-1">Choose a section to manage</p>
      </div>

      {/* Navigation Grid */}
      <div className="grid grid-cols-2 gap-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center text-center p-6 rounded-3xl border-2 ${item.color} transition-all active:scale-95 hover:shadow-md group`}
          >
            {/* Badge */}
            {item.badge && (
              <span className="absolute top-3 right-3 w-6 h-6 bg-[#8cc63f] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}

            {/* Icon */}
            <div className={`w-16 h-16 ${item.iconBg} ${item.iconColor} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
              {item.icon}
            </div>

            {/* Label */}
            <p className="text-base font-black text-gray-800 tracking-tight leading-tight">{item.label}</p>
            <p className="text-[11px] text-gray-400 font-bold mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
