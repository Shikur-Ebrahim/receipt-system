"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  query,
  orderBy,
} from "firebase/firestore";

interface PaymentProof {
  id: string;
  uid: string;
  email: string;
  amount: number;
  screenshotUrl: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
}

type ActionType = "accept" | "reject" | null;

interface ConfirmState {
  open: boolean;
  proof: PaymentProof | null;
  action: ActionType;
}

export default function ProofsPage() {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, proof: null, action: null });
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "payment_proofs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentProof));
      setProofs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openConfirm = (proof: PaymentProof, action: ActionType) => setConfirm({ open: true, proof, action });
  const closeConfirm = () => setConfirm({ open: false, proof: null, action: null });

  const handleConfirm = async () => {
    if (!confirm.proof || !confirm.action) return;
    const { proof, action } = confirm;
    setProcessing(proof.id);
    closeConfirm();
    try {
      if (action === "accept") {
        await updateDoc(doc(db, "users", proof.uid), { balance: increment(proof.amount) });
      }
      await deleteDoc(doc(db, "payment_proofs", proof.id));
    } catch (err) {
      console.error("Error processing proof:", err);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts?.toDate) return "—";
    return ts.toDate().toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Payment Proofs</h1>
          <p className="text-gray-400 mt-1 font-bold text-sm">Review, accept, or reject user payment submissions.</p>
        </div>
        {proofs.length > 0 && (
          <span className="bg-[#8cc63f]/10 text-[#8cc63f] text-sm font-black px-4 py-2 rounded-full border border-[#8cc63f]/20">
            {proofs.length} pending
          </span>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#8cc63f] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && proofs.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-20 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No pending proofs at this time.</p>
        </div>
      )}

      {!loading && proofs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {proofs.map((proof) => (
            <div key={proof.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all group">
              {/* Screenshot — click to enlarge */}
              <div
                className="relative h-56 bg-gray-50 overflow-hidden cursor-zoom-in"
                onClick={() => setLightboxUrl(proof.screenshotUrl)}
                title="Click to view full image"
              >
                <img
                  src={proof.screenshotUrl}
                  alt="Payment screenshot"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Zoom hint overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                    proof.status === "pending" ? "bg-amber-50 text-amber-500 border border-amber-200"
                    : proof.status === "approved" ? "bg-green-50 text-green-500 border border-green-200"
                    : "bg-red-50 text-red-500 border border-red-200"
                  }`}>{proof.status}</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">User Email</p>
                    <p className="text-sm font-bold text-gray-700 truncate">{proof.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Amount</p>
                    <p className="text-2xl font-black text-[#8cc63f] leading-none">{proof.amount}</p>
                    <p className="text-[10px] text-gray-400 font-bold">ETB</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Submitted</p>
                  <p className="text-xs font-bold text-gray-500">{formatDate(proof.createdAt)}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => openConfirm(proof, "accept")}
                    disabled={processing === proof.id}
                    className="flex-1 bg-[#8cc63f] hover:bg-[#7ab32f] text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-50 shadow-lg shadow-[#8cc63f]/20"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => openConfirm(proof, "reject")}
                    disabled={processing === proof.id}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-black py-3 rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-50 border border-red-100"
                  >
                    ✕ Reject
                  </button>
                </div>

                {processing === proof.id && (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <div className="w-4 h-4 border-2 border-[#8cc63f] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400 font-bold">Processing...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors font-black text-sm uppercase tracking-widest flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
            <img
              src={lightboxUrl}
              alt="Payment screenshot full view"
              className="w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirm.open && confirm.proof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeConfirm} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
              confirm.action === "accept" ? "bg-[#8cc63f]/10 text-[#8cc63f]" : "bg-red-50 text-red-500"
            }`}>
              {confirm.action === "accept" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-gray-800 mb-2">
                {confirm.action === "accept" ? "Accept Payment?" : "Reject Payment?"}
              </h3>
              <p className="text-gray-400 font-bold text-sm leading-relaxed">
                {confirm.action === "accept" ? (
                  <>This will add <span className="text-[#8cc63f] font-black">{confirm.proof.amount} ETB</span> to <span className="text-gray-700 font-black">{confirm.proof.email}</span>'s balance and permanently delete this submission.</>
                ) : (
                  <>This will <span className="text-red-500 font-black">reject</span> the payment by <span className="text-gray-700 font-black">{confirm.proof.email}</span> and permanently delete this submission. No balance will be added.</>
                )}
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={closeConfirm} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-black py-4 rounded-2xl text-sm uppercase tracking-widest transition-all border border-gray-100">
                Cancel
              </button>
              <button onClick={handleConfirm} className={`flex-1 font-black py-4 rounded-2xl text-sm uppercase tracking-widest transition-all shadow-lg active:scale-[0.97] ${
                confirm.action === "accept"
                  ? "bg-[#8cc63f] hover:bg-[#7ab32f] text-white shadow-[#8cc63f]/30"
                  : "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30"
              }`}>
                {confirm.action === "accept" ? "Confirm Accept" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
