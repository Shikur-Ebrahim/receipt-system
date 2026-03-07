"use client";

import React from "react";
import { usePWAInstall } from "@/lib/hooks/usePWAInstall";

export default function InstallAppPage() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* Glowing background circle */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-[#8cc63f]/20 rounded-full blur-3xl scale-150 animate-pulse" />
        <div className="relative w-32 h-32 rounded-[2rem] bg-gradient-to-br from-[#8cc63f] to-[#6ba030] shadow-2xl shadow-[#8cc63f]/40 flex items-center justify-center overflow-hidden border-4 border-white/30">
          <img
            src="/icons/icon-512x512.png"
            alt="CBE Receipt App"
            className="w-full h-full object-cover rounded-[1.5rem]"
          />
        </div>
        {/* Floating sparkles */}
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 rounded-full animate-bounce opacity-80 shadow-lg shadow-yellow-400/50" />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-[#8cc63f] rounded-full animate-bounce opacity-60 shadow-lg" style={{ animationDelay: "0.3s" }} />
      </div>

      {/* App Info */}
      <h1 className="text-3xl font-black text-gray-800 tracking-tight text-center mb-2">
        CBE Receipt
      </h1>
      <p className="text-gray-400 font-semibold text-sm text-center max-w-xs mb-8">
        Install the app for quick access — works offline, faster loading, and a native app experience!
      </p>

      {/* Feature cards */}
      <div className="w-full max-w-sm space-y-3 mb-10">
        {[
          {
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            ),
            title: "Lightning Fast",
            desc: "Loads instantly, no waiting",
          },
          {
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ),
            title: "Works Offline",
            desc: "Access your receipts anytime",
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:scale-[1.01]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#8cc63f]/10 flex items-center justify-center text-[#8cc63f] flex-shrink-0">
              {feature.icon}
            </div>
            <div>
              <span className="text-sm font-black text-gray-800 block">{feature.title}</span>
              <span className="text-xs text-gray-400 font-medium">{feature.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Install Button */}
      {isInstalled ? (
        <div className="w-full max-w-sm">
          <div className="w-full bg-gray-100 text-gray-500 font-black py-5 rounded-2xl text-center text-sm uppercase tracking-widest flex items-center justify-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#8cc63f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            App Installed
          </div>
          <p className="text-center text-xs text-gray-400 font-medium mt-3">
            You&apos;re all set! The app is already on your device.
          </p>
        </div>
      ) : isInstallable ? (
        <div className="w-full max-w-sm">
          <button
            onClick={promptInstall}
            className="w-full bg-gradient-to-r from-[#8cc63f] to-[#6ba030] hover:from-[#7ab32f] hover:to-[#5a9028] text-white font-black py-5 rounded-2xl shadow-xl shadow-[#8cc63f]/30 transition-all active:scale-[0.97] uppercase tracking-widest text-sm flex items-center justify-center gap-3 relative overflow-hidden group"
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="relative z-10">Install App Now</span>
          </button>
          <p className="text-center text-xs text-gray-400 font-medium mt-3">
            Free • No app store needed • Installs in seconds
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <button
            onClick={() => {
              // If isInstallable is false, the browser hasn't fired beforeinstallprompt
              // We guide the user to the native Chrome menu
              alert(
                "To install the app:\n\n" +
                "1. Tap the browser menu (⋮) in Chrome\n" +
                "2. Tap 'Add to Home screen' or 'Install App'"
              );
            }}
            className="w-full bg-gradient-to-r from-[#8cc63f] to-[#6ba030] hover:from-[#7ab32f] hover:to-[#5a9028] text-white font-black py-5 rounded-2xl shadow-xl shadow-[#8cc63f]/30 transition-all active:scale-[0.97] uppercase tracking-widest text-sm flex items-center justify-center gap-3 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="relative z-10">Install App Now</span>
          </button>
          <p className="text-center text-xs text-gray-400 font-medium mt-3">
            If prompt doesn't appear, use Chrome menu (⋮) → "Install App"
          </p>
        </div>
      )}
    </div>
  );
}
