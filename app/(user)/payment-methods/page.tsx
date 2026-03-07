"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import Link from "next/link";

interface PaymentMethod {
  name: string;
  logo: string;
  accountNumber: string;
  fullName: string;
  type: "bank" | "mobile_money";
}

interface PaymentSettings {
  cbe: PaymentMethod;
  abyssinia: PaymentMethod;
  telebirr: PaymentMethod;
}

export default function PaymentMethodsPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [minDeposit, setMinDeposit] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const [paymentsSnap, settingsSnap] = await Promise.all([
          getDoc(doc(db, "system", "payments")),
          getDoc(doc(db, "system", "settings"))
        ]);
        if (paymentsSnap.exists()) setSettings(paymentsSnap.data() as PaymentSettings);
        if (settingsSnap.exists()) setMinDeposit(settingsSnap.data().minDeposit || 0);
      } catch (error) {
        console.error("Error fetching payment settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#8cc63f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center p-10 bg-white rounded-3xl border border-gray-100 shadow-sm mx-2">
        <p className="text-gray-500 font-bold text-base">No payment methods configured yet.</p>
      </div>
    );
  }

  const renderCard = (key: keyof PaymentSettings) => {
    const method = settings[key];
    const isMobileMoney = method.type === "mobile_money";
    const number = method.accountNumber;

    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm active:scale-[0.99] transition-all overflow-hidden relative">
        {/* Decorative blob */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#8cc63f]/5 rounded-full -mr-10 -mt-10 pointer-events-none" />

        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center p-2 border border-gray-100 shrink-0">
            {method.logo ? (
              <img src={method.logo} alt={method.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-xl font-black text-[#8cc63f]">{method.name[0]}</span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-800 leading-tight">{method.name}</h3>
            <p className="text-[11px] text-[#8cc63f] font-black uppercase tracking-widest mt-0.5">Official Account</p>
          </div>
        </div>

        {/* Account Number Row */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
              {isMobileMoney ? "Phone Number" : "Account Number"}
            </p>
            <p className="text-lg font-black text-gray-800 tracking-tight">{number || "---"}</p>
          </div>
          <button
            onClick={() => handleCopy(number, key)}
            disabled={!number}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
              copiedKey === key
                ? "bg-[#8cc63f] text-white shadow-lg shadow-[#8cc63f]/30"
                : "bg-white border border-gray-200 text-gray-400"
            }`}
          >
            {copiedKey === key ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            )}
          </button>
        </div>

        {/* Account Name */}
        <div className="px-1">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Holder</p>
          <p className="text-sm font-black text-gray-700 uppercase">{method.fullName || "—"}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Page Header */}
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Payment Methods</h1>
        <p className="text-gray-500 mt-1 text-sm font-medium">Top up your balance to download receipts.</p>
      </div>

      {/* Min Deposit Banner */}
      <div className="mb-6 flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">Minimum Top-up</p>
          <p className="text-xl font-black text-gray-800 leading-tight">
            {minDeposit} <span className="text-sm text-gray-400 font-bold">ETB</span>
          </p>
        </div>
      </div>

      {/* Payment Method Cards */}
      <div className="space-y-4 mb-6">
        {renderCard("cbe")}
        {renderCard("abyssinia")}
        {renderCard("telebirr")}
      </div>

      {/* Instructions */}
      <div className="bg-[#8cc63f]/5 border border-[#8cc63f]/20 p-5 rounded-3xl flex items-start gap-4 mb-6">
        <div className="w-9 h-9 bg-[#8cc63f]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8cc63f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-black text-gray-800 mb-2">How to Top Up</h4>
          <ol className="text-sm text-gray-500 leading-relaxed font-medium space-y-1">
            <li>1. Copy an account or phone number above.</li>
            <li>2. Transfer the amount from your banking app.</li>
            <li>3. Come back and upload your screenshot below.</li>
          </ol>
        </div>
      </div>

      {/* Upload CTA */}
      <Link
        href="/upload-payment"
        className="flex items-center justify-center gap-3 w-full bg-[#8cc63f] hover:bg-[#7ab32f] text-white font-black py-5 rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-[#8cc63f]/25 text-sm uppercase tracking-widest"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        I've Paid — Upload Proof
      </Link>
    </div>
  );
}
