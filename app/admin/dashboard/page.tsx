"use client";

import React from "react";
import Link from "next/link";

const sections = [
  { href: "/admin/proofs", label: "Review Proofs", icon: "✅", desc: "Accept or reject payment submissions" },
  { href: "/admin/users", label: "Manage Users", icon: "👥", desc: "View users and control sessions" },
  { href: "/admin/payments", label: "Payment Accounts", icon: "💳", desc: "Configure bank & mobile accounts" },
  { href: "/admin/settings", label: "System Settings", icon: "⚙️", desc: "Set fees and minimum deposit" },
];

export default function AdminDashboard() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Welcome Hero */}
      <div className="bg-[#8cc63f] rounded-[2.5rem] p-8 mb-8 text-white relative overflow-hidden shadow-2xl shadow-[#8cc63f]/30">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />

        <div className="relative z-10">
          <p className="text-white/70 font-bold text-sm uppercase tracking-widest mb-2">{greeting} 👋</p>
          <h1 className="text-3xl font-black tracking-tight leading-tight mb-3">
            Welcome Back,<br />Admin!
          </h1>
          <p className="text-white/80 font-medium text-sm leading-relaxed max-w-sm">
            You have full control over the CBE Receipt system. Use the sections below to manage users, payments, and settings.
          </p>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="mb-6">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1 mb-4">Quick Access</p>
        <div className="grid grid-cols-1 gap-3">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-5 bg-white border border-gray-100 rounded-3xl px-6 py-5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all group"
            >
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl shrink-0 group-hover:bg-[#8cc63f]/10 transition-colors">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-black text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{s.desc}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 group-hover:text-[#8cc63f] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center">
        <p className="text-xs text-gray-300 font-bold">CBE Receipt Management System</p>
      </div>
    </div>
  );
}
