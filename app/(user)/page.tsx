"use client";

import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas-pro";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

export default function ReceiptGenerator() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [downloadFee, setDownloadFee] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  const [formData, setFormData] = useState({
    amount: "200.00",
    senderName: "ABEL MULUGETA YIBELTAL",
    receiverName: "SAMUEL JIMMA TOCHE",
    receiverAccount: "ETB-9031",
    date: "04-Mar-2026",
    transactionId: "FT26063GH26H",
    totalAmount: "200.61",
    commission: "0.50",
    vat: "0.08",
    disasterFund: "0.03",
  });

  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [showSMS, setShowSMS] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Initial fetch for balance and settings
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) setBalance(userDoc.data().balance);

        const settingsDoc = await getDoc(doc(db, "system", "settings"));
        if (settingsDoc.exists()) setDownloadFee(settingsDoc.data().downloadFee || 0);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDownload = async () => {
    if (!receiptRef.current || !user) return;
    const receiptEl = receiptRef.current;
    // The receipt preview uses Tailwind `scale-[0.9]` which can change the QR/text size
    // captured by html2canvas. Temporarily remove transform while capturing.
    const prevTransform = receiptEl.style.transform;
    const prevTransformOrigin = receiptEl.style.transformOrigin;
    receiptEl.style.transform = "none";
    receiptEl.style.transformOrigin = "top left";

    if (balance !== null && balance < downloadFee) {
      setShowBalanceModal(true);
      receiptEl.style.transform = prevTransform;
      receiptEl.style.transformOrigin = prevTransformOrigin;
      return;
    }

    try {
      if (downloadFee > 0) {
        const newBalance = Math.max(0, (balance || 0) - downloadFee);
        await setDoc(doc(db, "users", user.uid), { balance: newBalance }, { merge: true });
        setBalance(newBalance);
      }

      const canvas = await html2canvas(receiptEl, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `CBE-Receipt-${formData.transactionId}.png`;
      link.click();
    } catch (e) {
      console.error("Error generating receipt image:", e);
    } finally {
      receiptEl.style.transform = prevTransform;
      receiptEl.style.transformOrigin = prevTransformOrigin;
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Insufficient Balance Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-20"></div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">Insufficient Balance</h3>
              <p className="text-gray-400 font-medium leading-relaxed mb-8">
                You don't have enough balance to download this receipt. Please add funds to your account to continue.
              </p>

              <button
                onClick={() => router.push("/payment-methods")}
                className="w-full bg-[#8cc63f] hover:bg-[#7ab32f] text-white font-black py-5 rounded-2xl shadow-xl shadow-[#8cc63f]/30 transition-all active:scale-[0.98] uppercase tracking-widest text-sm"
              >
                Ok, Top Up Now
              </button>

              <button
                onClick={() => setShowBalanceModal(false)}
                className="mt-4 text-gray-400 font-bold text-xs hover:text-gray-600 transition-colors uppercase tracking-widest"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Toggle */}
      <div className="md:hidden flex w-full max-w-md mb-6">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex w-full">
          <button
            onClick={() => setViewMode("edit")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${viewMode === "edit" ? "bg-[#cc9b52] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
              }`}
          >
            Edit Info
          </button>
          <button
            onClick={() => setViewMode("preview")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${viewMode === "preview" ? "bg-[#cc9b52] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
              }`}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-10">
        {/* Editor Form */}
        <div className={`${viewMode === "edit" ? "block" : "hidden"} md:block bg-white p-6 rounded-2xl shadow-xl border border-gray-100`}>
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-xl font-semibold text-gray-700">Receipt Details</h2>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Top Banner</span>
              <button
                onClick={() => setShowBanner(!showBanner)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showBanner ? "bg-[#8cc63f]" : "bg-gray-300"
                  }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showBanner ? "translate-x-5" : "translate-x-1"
                    }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">SMS</span>
              <button
                onClick={() => setShowSMS(!showSMS)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showSMS ? "bg-[#1a73e8]" : "bg-gray-300"
                  }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showSMS ? "translate-x-5" : "translate-x-1"
                    }`}
                />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Amount", name: "amount" },
              { label: "Sender Name", name: "senderName", uppercase: true },
              { label: "Receiver Name", name: "receiverName", uppercase: true },
              { label: "Receiver Account", name: "receiverAccount", uppercase: true },
              { label: "Date", name: "date" },
              { label: "Transaction ID", name: "transactionId", uppercase: true },
              { label: "Total Amount Debited", name: "totalAmount" },
              { label: "Commission", name: "commission" },
              { label: "VAT (15%)", name: "vat" },
              { label: "Disaster Fund (5%)", name: "disasterFund" },
            ].map((field) => (
              <div key={field.name} className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">{field.label}</label>
                <input
                  type="text"
                  name={field.name}
                  value={(formData as any)[field.name]}
                  onChange={handleChange}
                  className={`border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black ${field.uppercase ? 'uppercase' : ''}`}
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => window.innerWidth < 768 ? setViewMode("preview") : handleDownload()}
            className="mt-6 w-full bg-[#8cc63f] hover:bg-[#7ab32f] text-white font-bold py-4 px-4 rounded-xl transition duration-200 shadow-md flex justify-center items-center gap-2"
          >
            <span className="md:hidden flex items-center gap-2 text-sm uppercase tracking-wider">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Receipt
            </span>
            <span className="hidden md:flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Receipt
            </span>
          </button>
        </div>

        {/* Receipt Preview */}
        <div className={`${viewMode === "preview" ? "flex" : "hidden"} md:flex justify-center flex-col items-center pt-4 md:pt-0 lg:sticky lg:top-24`}>
          <div className="max-w-full overflow-hidden flex items-center justify-center p-2 rounded-3xl bg-gray-200/50 shadow-inner">
            <div
              className="w-[380px] origin-top md:origin-center scale-[0.9] xs:scale-100 bg-white overflow-hidden relative shadow-2xl rounded-xl"
              ref={receiptRef}
            >
              {/* SMS Notification Banner */}
              {showSMS && (
                <div
                  onClick={() => setShowSMS(false)}
                  className="bg-[#4a4c44] flex justify-center px-4 py-3 pb-8 -mb-5 relative z-10 cursor-pointer hover:brightness-110 transition-all"
                  title="Click to hide"
                >
                  <div className="bg-[#3c3e38] rounded-full flex items-center px-[6px] py-[6px] shadow-sm w-full">
                    <div className="bg-white rounded-full p-[2px] w-7 h-7 flex-shrink-0 flex items-center justify-center">
                      <img src="/icons/download.png" alt="Message Icon" className="w-[18px] h-[18px] object-contain" />
                    </div>
                    <div className="ml-[10px] text-[13.5px] text-white font-[500] truncate tracking-wide pr-3 w-full text-left">
                      CBE Dear {formData.senderName.split(' ')[0].charAt(0).toUpperCase() + formData.senderName.split(' ')[0].slice(1).toLowerCase()}, You have transfered ET...
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Banner */}
              {showBanner && (
                <div
                  onClick={() => setShowBanner(false)}
                  className="bg-[#4a4c44] flex justify-center px-4 py-3 pb-8 -mb-5 relative z-0 cursor-pointer hover:brightness-110 transition-all"
                  title="Click to hide"
                >
                  <div className="bg-[#3c3e38] rounded-full flex items-center px-[6px] py-[6px] shadow-sm w-full z-10">
                    <div className="bg-white rounded-full p-[2px] w-7 h-7 flex-shrink-0 flex items-center justify-center">
                      <img src="/cbe-logo.png" alt="CBE Logo" className="w-[16px] h-[16px] object-contain opacity-90" />
                    </div>
                    <div className="ml-[10px] text-[13.5px] text-white font-[500] truncate tracking-wide pr-3 w-full text-left">
                      Transaction Compl... ETB {formData.amount} debited from...
                    </div>
                  </div>
                </div>
              )}

              {/* Top Green Banner */}
              <div className="bg-[#8cc63f] text-white p-5 flex flex-col justify-between pt-5 relative z-10 rounded-t-lg">
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-start gap-3">
                    <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold leading-none tracking-tight">Thank You!</span>
                      <span className="text-[17px] font-medium opacity-90 mt-1">Success</span>
                    </div>
                  </div>
                  <div className="flex gap-[22px] items-center pt-2 pr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-[26px] w-[26px]" viewBox="0 0 24 24" fill="white">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="white" strokeWidth="2" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="white" strokeWidth="2" />
                    </svg>
                    <svg onClick={handleDownload} xmlns="http://www.w3.org/2000/svg" className="h-[28px] w-[28px] cursor-pointer" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 4v11m0 0l-4-3.5m4 3.5l4-3.5" />
                      <line x1="6" y1="19" x2="18" y2="19" strokeWidth="3" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-[26px] w-[26px] opacity-95" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.7">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Message Area */}
              <div className="bg-[#f9f9f9] px-5 py-6">
                <span className="text-gray-400 text-sm font-normal mb-1 block">Message</span>
                <p
                  className="text-[#1a2b3c] text-[13.5px] font-[700] leading-[1.55]"
                  style={{
                    letterSpacing: "0.08px",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                  }}
                >
                  {`ETB ${formData.amount} debited from ${formData.senderName.toUpperCase()} for ${formData.receiverName.toUpperCase()}-${formData.receiverAccount.toUpperCase()} on ${formData.date} with transaction ID: ${formData.transactionId.toUpperCase()}. Total Amount Debited ETB ${formData.totalAmount} with commission of ETB ${formData.commission}, 15% VAT of ETB ${formData.vat} and 5% Disaster Fund of ETB ${formData.disasterFund}.`}
                </p>
                <div className="mt-1 flex justify-center pb-1 relative">
                  <div
                    className="p-6 bg-white relative flex items-center justify-center border-x border-b border-gray-200"
                    style={{
                      // Stronger, downward-biased shadow so top edge doesn't look bordered
                      boxShadow: "0px 22px 22px -12px rgba(0, 0, 0, 0.28)",
                    }}
                  >
                    <QRCode value={`TxnID:${formData.transactionId},Amt:${formData.amount}`} size={120} level="H" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1.5 shadow-none flex items-center justify-center">
                      <img src="/cbe-logo.png" alt="CBE Logo" className="w-[18px] h-[18px] object-contain" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mt-0 mb-6">
                  <button className="bg-[#cc9b52] text-black font-[700] text-[15px] tracking-[0.5px] rounded-full px-8 py-3.5 shadow-sm flex items-center gap-2.5">
                    <img src="/icons/view-receipt.png" alt="Receipt Icon" className="w-[22px] h-[22px] object-contain" />
                    VIEW RECEIPT
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center px-5 py-3.5 mb-2">
                <img src="/cbe-logo.png" alt="CBE Logo" className="w-[38px] h-[38px] object-contain mr-3.5 opacity-90" />
                <div className="flex flex-col">
                  <span className="text-[#1a2b3c] font-[800] text-[16.5px] tracking-[-0.3px] leading-tight">
                    Commercial Bank of Ethiopia
                  </span>
                  <span className="text-[#a0a4ab] text-[12.5px] font-[500] tracking-[-0.2px] mt-[1px]">
                    The Bank You can always Rely on!
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="md:hidden mt-6 w-full max-w-[380px] bg-[#8cc63f] hover:bg-[#7ab32f] text-white font-bold py-4 px-4 rounded-xl transition duration-200 shadow-md flex justify-center items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Receipt Image
          </button>
        </div>
      </div>
    </div>
  );
}
