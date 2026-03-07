"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function SystemSettingsPage() {
  const [downloadFee, setDownloadFee] = useState<number>(0);
  const [signupBalance, setSignupBalance] = useState<number>(10);
  const [minDeposit, setMinDeposit] = useState<number>(0);
  const [newFee, setNewFee] = useState<string>("0");
  const [newSignupBalance, setNewSignupBalance] = useState<string>("10");
  const [newMinDeposit, setNewMinDeposit] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "system", "settings"));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          const fee = data.downloadFee || 0;
          const sBal = data.signupBalance || 10;
          const mDep = data.minDeposit || 0;
          setDownloadFee(fee);
          setNewFee(fee.toString());
          setSignupBalance(sBal);
          setNewSignupBalance(sBal.toString());
          setMinDeposit(mDep);
          setNewMinDeposit(mDep.toString());
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdateSettings = async () => {
    setUpdatingSettings(true);
    try {
      const feeNum = parseFloat(newFee);
      const signupBalNum = parseFloat(newSignupBalance);
      const minDepositNum = parseFloat(newMinDeposit);
      
      if (isNaN(feeNum) || isNaN(signupBalNum) || isNaN(minDepositNum)) {
        throw new Error("Invalid number values provided.");
      }
      
      await setDoc(doc(db, "system", "settings"), { 
        downloadFee: feeNum,
        signupBalance: signupBalNum,
        minDeposit: minDepositNum
      }, { merge: true });
      
      setDownloadFee(feeNum);
      setSignupBalance(signupBalNum);
      setMinDeposit(minDepositNum);
      alert("System settings updated successfully!");
    } catch (error: any) {
      alert("Error updating settings: " + error.message);
    } finally {
      setUpdatingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#8cc63f] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl font-black text-gray-800 mb-3 tracking-tight">System Settings</h1>
        <p className="text-gray-400 font-bold text-sm">Manage global system fees and new user rewards.</p>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-8 md:p-14 mb-10 overflow-hidden relative">
        <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] select-none pointer-events-none">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-80 w-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-10">
            <div className="space-y-4">
              <label className="text-gray-400 text-xs font-black uppercase tracking-[0.25em] pl-1">Receipt Download Fee</label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-black group-focus-within:text-[#8cc63f] transition-colors">ETB</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] pl-16 pr-6 py-5 text-gray-800 focus:outline-none focus:border-[#8cc63f] focus:bg-white focus:ring-8 focus:ring-[#8cc63f]/5 transition-all w-full text-xl font-black"
                  placeholder="0.00"
                />
              </div>
              <p className="text-[10px] text-gray-400 px-1 font-bold">Amount deducted from user balance for each successful download.</p>
            </div>

            <div className="space-y-4">
              <label className="text-gray-400 text-xs font-black uppercase tracking-[0.25em] pl-1">Signup Welcome Gift</label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-black group-focus-within:text-[#8cc63f] transition-colors">ETB</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={newSignupBalance}
                  onChange={(e) => setNewSignupBalance(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] pl-16 pr-6 py-5 text-gray-800 focus:outline-none focus:border-[#8cc63f] focus:bg-white focus:ring-8 focus:ring-[#8cc63f]/5 transition-all w-full text-xl font-black"
                  placeholder="10.00"
                />
              </div>
              <p className="text-[10px] text-gray-400 px-1 font-bold">Starting credit automatically granted to every new user.</p>
            </div>

            <div className="space-y-4">
              <label className="text-gray-400 text-xs font-black uppercase tracking-[0.25em] pl-1">Minimum Top-up Amount</label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 font-black group-focus-within:text-[#8cc63f] transition-colors">ETB</span>
                <input 
                  type="number" 
                  step="1"
                  value={newMinDeposit}
                  onChange={(e) => setNewMinDeposit(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] pl-16 pr-6 py-5 text-gray-800 focus:outline-none focus:border-[#8cc63f] focus:bg-white focus:ring-8 focus:ring-[#8cc63f]/5 transition-all w-full text-xl font-black"
                  placeholder="0"
                />
              </div>
              <p className="text-[10px] text-gray-400 px-1 font-bold">The smallest amount a user is allowed to upload proof for.</p>
            </div>

            <button 
              onClick={handleUpdateSettings}
              disabled={updatingSettings}
              className="w-full bg-[#8cc63f] hover:bg-[#7ab32f] text-white font-black py-6 rounded-[1.5rem] transition-all active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-[#8cc63f]/30 uppercase tracking-[0.2em] text-sm"
            >
              {updatingSettings ? "Updating System..." : "Save Global Configuration"}
            </button>
          </div>

          <div className="space-y-8">
            <div className="bg-[#8cc63f]/5 p-8 rounded-[2rem] border border-[#8cc63f]/10">
              <h3 className="text-[#8cc63f] text-[10px] font-black uppercase tracking-widest mb-6 border-b border-[#8cc63f]/10 pb-3">Active Configuration</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <span className="text-gray-500 text-sm font-bold">Current Fee</span>
                  <span className="text-gray-800 font-black text-lg">{downloadFee.toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-gray-500 text-sm font-bold">Default Credit</span>
                  <span className="text-gray-800 font-black text-lg">{signupBalance.toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-gray-500 text-sm font-bold">Min Top-up</span>
                  <span className="text-[#8cc63f] font-black text-lg">{minDeposit.toFixed(2)} ETB</span>
                </div>
              </div>
            </div>
            
            <div className="p-8 rounded-[2rem] bg-gray-50/50 border border-gray-100">
              <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">Core Principles</h3>
              <ul className="text-xs text-gray-400 space-y-4 font-bold leading-relaxed">
                <li className="flex gap-3">
                  <span className="text-[#8cc63f]">●</span>
                  Fee revisions are applied instantly to all transactions.
                </li>
                <li className="flex gap-3">
                  <span className="text-[#8cc63f]">●</span>
                  Signup rewards only affect users registered after this update.
                </li>
                <li className="flex gap-3 text-gray-500">
                  <span className="text-[#8cc63f]">●</span>
                  Minimum top-up prevents tiny, unmanageable transactions.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
