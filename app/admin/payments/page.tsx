"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

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

const DEFAULT_SETTINGS: PaymentSettings = {
  cbe: { name: "CBE Birr", logo: "", accountNumber: "", fullName: "", type: "bank" },
  abyssinia: { name: "Abyssiniya", logo: "", accountNumber: "", fullName: "", type: "bank" },
  telebirr: { name: "Telebirr", logo: "", accountNumber: "", fullName: "", type: "mobile_money" },
};

export default function PaymentsPage() {
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const docRef = doc(db, "system", "payments");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as PaymentSettings);
        }
      } catch (error) {
        console.error("Error fetching payment settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const handleUploadLogo = async (key: keyof PaymentSettings, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(key);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "pioneerbusiness");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dk07dayip'}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await response.json();
      
      if (data.secure_url) {
        setSettings(prev => ({
          ...prev,
          [key]: { ...prev[key], logo: data.secure_url }
        }));
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Logo upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  };

  const handleInputChange = (key: keyof PaymentSettings, field: keyof PaymentMethod, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const handleSavePayments = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "system", "payments"), settings);
      alert("Payment methods updated successfully!");
    } catch (error) {
      console.error("Error saving payment settings:", error);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#8cc63f] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderPaymentCard = (key: keyof PaymentSettings) => {
    const method = settings[key];
    const isMobileMoney = method.type === "mobile_money";

    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-100 overflow-hidden flex items-center justify-center relative group-hover:border-[#8cc63f]/30 transition-all">
              {method.logo ? (
                <img src={method.logo} alt={method.name} className="w-full h-full object-contain p-3" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {uploading === key && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-[2px]">
                   <div className="w-8 h-8 border-3 border-[#8cc63f] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">{method.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 bg-[#8cc63f] rounded-full"></span>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">Settings</p>
              </div>
            </div>
          </div>
          <label className="cursor-pointer bg-gray-50 hover:bg-[#8cc63f]/10 px-4 py-2.5 rounded-xl text-[10px] font-black text-gray-400 hover:text-[#8cc63f] transition-all border border-gray-100 active:scale-[0.95] uppercase tracking-widest">
            {method.logo ? "Change" : "Upload"}
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadLogo(key, e)} />
          </label>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">
              {isMobileMoney ? "Phone Number" : "Account Number"}
            </label>
            <input 
              type="text" 
              value={method.accountNumber}
              onChange={(e) => handleInputChange(key, "accountNumber", e.target.value)}
              className="bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 py-5 text-gray-800 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all w-full font-bold text-lg"
              placeholder={isMobileMoney ? "0911..." : "1000..."}
            />
          </div>

          <div className="space-y-3">
            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Full Account Holder Name</label>
            <input 
              type="text" 
              value={method.fullName}
              onChange={(e) => handleInputChange(key, "fullName", e.target.value)}
              className="bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 py-5 text-gray-800 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all w-full font-bold text-lg uppercase"
              placeholder="Full Name"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-8 text-center md:text-left">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight leading-none mb-4">Payment Methods</h1>
          <p className="text-gray-400 font-bold text-sm">Configure global bank and mobile money accounts.</p>
        </div>
        <button 
          onClick={handleSavePayments}
          disabled={saving}
          className="w-full md:w-auto bg-[#8cc63f] hover:bg-[#7ab32f] text-white font-black py-5 px-14 rounded-[1.5rem] transition-all active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-[#8cc63f]/30 uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-4"
        >
          {saving ? "Updating..." : "Publish All Methods"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {renderPaymentCard("cbe")}
        {renderPaymentCard("abyssinia")}
        {renderPaymentCard("telebirr")}
      </div>

      <div className="mt-16 bg-[#8cc63f]/5 border border-[#8cc63f]/10 p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-8 items-center text-center md:text-left transition-all hover:bg-[#8cc63f]/10">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shrink-0 shadow-xl shadow-[#8cc63f]/10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#8cc63f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed font-bold">
          All images are hosted on <span className="text-[#8cc63f] font-black uppercase underline decoration-2 underline-offset-4">Cloudinary</span>. Account details updated here will be reflected across the mobile application instantly. Please ensure accuracy for correct user processing.
        </p>
      </div>
    </div>
  );
}
