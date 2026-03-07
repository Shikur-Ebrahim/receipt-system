"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection, addDoc, query, where, onSnapshot,
  serverTimestamp, doc, getDoc, limit,
} from "firebase/firestore";

interface ExistingProof {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  screenshotUrl: string;
  createdAt: any;
}

export default function UploadPaymentPage() {
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [minDeposit, setMinDeposit] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [existingProof, setExistingProof] = useState<ExistingProof | null | undefined>(undefined);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    getDoc(doc(db, "system", "settings")).then((snap) => {
      if (snap.exists()) setMinDeposit(snap.data().minDeposit || 0);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "payment_proofs"),
      where("uid", "==", user.uid),
      where("status", "==", "pending"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      setExistingProof(snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as ExistingProof));
    });
    return () => unsub();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); setMessage(null); }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !amount) {
      setMessage({ type: "error", text: "Please select a screenshot and enter the amount." });
      return;
    }
    const amountNum = parseFloat(amount);
    if (amountNum < minDeposit) {
      setMessage({ type: "error", text: `Minimum top-up is ${minDeposit} ETB.` });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "pioneerbusiness");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dk07dayip"}/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.secure_url) throw new Error("Upload failed");
      await addDoc(collection(db, "payment_proofs"), {
        uid: user.uid, email: user.email, amount: amountNum,
        screenshotUrl: data.secure_url, status: "pending", createdAt: serverTimestamp(),
      });
      setMessage({ type: "success", text: `Proof for ${amount} ETB submitted! We'll verify soon.` });
      setSelectedFile(null); setPreviewUrl(null); setAmount("");
    } catch {
      setMessage({ type: "error", text: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts?.toDate) return "—";
    return ts.toDate().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Loading
  if (existingProof === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#8cc63f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── PENDING STATE ──────────────────────────────────
  if (existingProof) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-6 px-1">
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Upload Payment</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Submit your payment proof for verification.</p>
        </div>

        <div className="bg-white rounded-3xl border border-amber-200 shadow-lg p-7 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] flex items-center justify-center">
            <div className="w-72 h-72 border-[30px] border-amber-400 rounded-full" />
          </div>

          <div className="relative z-10 w-20 h-20 bg-amber-50 border-4 border-amber-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <span className="inline-block bg-amber-50 border border-amber-200 text-amber-600 text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-3">
            Under Review
          </span>
          <h2 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Payment Pending</h2>
          <p className="text-gray-400 font-medium text-sm leading-relaxed">
            Your screenshot is being reviewed. This page will auto-update once verified.
          </p>

          {/* Details */}
          <div className="mt-8 bg-gray-50 rounded-2xl p-5 border border-gray-100 text-left space-y-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest pb-2 border-b border-gray-100">Submission Details</p>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-500">Amount</span>
              <span className="text-xl font-black text-[#8cc63f]">{existingProof.amount} <span className="text-sm text-gray-400 font-bold">ETB</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-500">Submitted</span>
              <span className="text-sm font-bold text-gray-700">{formatDate(existingProof.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-500">Status</span>
              <span className="bg-amber-50 text-amber-500 border border-amber-100 text-[11px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider">Pending</span>
            </div>
          </div>

          {existingProof.screenshotUrl && (
            <div className="mt-5">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Uploaded Screenshot</p>
              <img src={existingProof.screenshotUrl} alt="Your proof" className="w-full max-h-48 object-contain rounded-2xl border border-gray-100 shadow-sm" />
            </div>
          )}

          <p className="mt-6 text-xs text-gray-400 font-medium">
            Verification usually takes <span className="font-black text-gray-500">15–30 minutes</span>.
          </p>
        </div>
      </div>
    );
  }

  // ── UPLOAD FORM ────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Upload Payment</h1>
        <p className="text-gray-500 mt-1 text-sm font-medium">Submit your screenshot to top up your balance.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 space-y-6">
        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Transaction Amount</label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">ETB</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-5 pl-16 pr-5 text-gray-800 font-bold text-xl focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all"
            />
          </div>
          {minDeposit > 0 && (
            <p className="text-[12px] text-[#8cc63f] font-bold pl-1">Minimum: {minDeposit} ETB</p>
          )}
        </div>

        {/* Screenshot Upload */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Payment Screenshot</label>
          <div className={`border-4 border-dashed rounded-3xl transition-all ${
            previewUrl ? "border-[#8cc63f]/40 bg-[#8cc63f]/5" : "border-gray-200 bg-gray-50"
          }`}>
            {previewUrl ? (
              <div className="p-4 space-y-3">
                <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain rounded-2xl shadow-md" />
                <button
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="w-full py-3 text-sm font-black text-red-500 uppercase tracking-widest"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center py-12 cursor-pointer px-4">
                <div className="bg-[#8cc63f]/10 p-5 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-[#8cc63f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-base font-black text-gray-700">Tap to Upload Screenshot</span>
                <span className="text-sm text-gray-400 font-medium mt-1">PNG, JPG supported</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading || !amount}
          className={`w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 ${
            selectedFile && !uploading && amount
              ? "bg-[#8cc63f] hover:bg-[#7ab32f] active:scale-[0.98] shadow-xl shadow-[#8cc63f]/25"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {uploading ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Uploading...</>
          ) : (
            <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Submit Payment Proof</>
          )}
        </button>

        {message && (
          <div className={`p-4 rounded-2xl text-sm font-bold flex items-start gap-3 ${
            message.type === "success" ? "bg-[#8cc63f]/10 text-[#8cc63f] border border-[#8cc63f]/20" : "bg-red-50 text-red-600 border border-red-100"
          }`}>
            <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${message.type === "success" ? "bg-[#8cc63f]/20" : "bg-red-100"}`}>
              {message.type === "success"
                ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              }
            </div>
            {message.text}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="mt-5 bg-blue-50/60 border border-blue-100 p-5 rounded-3xl flex items-start gap-4">
        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-black text-gray-800 mb-1">Important</h4>
          <p className="text-xs text-gray-500 leading-relaxed font-medium">
            Ensure the screenshot clearly shows the transaction ID, date, and amount. Verification takes 15–30 minutes. False reports may result in account suspension.
          </p>
        </div>
      </div>
    </div>
  );
}
