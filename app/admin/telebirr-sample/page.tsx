"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDoc, getDocs, Timestamp } from "firebase/firestore";

const FIRESTORE_COLLECTION = "telebirr_sample";
const TEMPLATE_DOC_ID = "template";
const TEMPLATE_SUBCOLLECTION = "templates";

// Detected from diff between your real vs sample screenshots.
// Base template size: 489x1024.
const REFERENCE_W = 489;
const REFERENCE_H = 1024;
const BOXES = {
  // Amount must end before "(ETB)" so there's visible gap (and no overlap).
  // Also keep enough room on the left so the leading "-" is not clipped.
  amountValue: { x0: 150, y0: 296, x1: 286, y1: 327 },
  // Static "(ETB)" label position in the template so preview can render it.
  // (Detected from the sample template screenshot used by this project: 489x1024.)
  etbLabel: { x0: 288, y0: 313, x1: 324, y1: 329 },
  transactionNumber: { x0: 350, y0: 425, x1: 450, y1: 440 },
  transactionTime: { x0: 307, y0: 460, x1: 452, y1: 475 },
  transactionTypeValue: { x0: 335, y0: 500, x1: 450, y1: 515 },
  transactionTo: { x0: 200, y0: 542, x1: 452, y1: 556 },
  bankAccountNumber: { x0: 99, y0: 581, x1: 450, y1: 595 },
  bankNameValue: { x0: 254, y0: 623, x1: 450, y1: 636 },
} as const;

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function randomTxnId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 11; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function formatTelebirrTime(d: Date) {
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}:${pad2(d.getSeconds())}`;
}

function formatDigitsWithCommas(digits: string) {
  const onlyDigits = (digits ?? "").replace(/\D/g, "");
  if (!onlyDigits) return "";
  return onlyDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function TelebirrSamplePage() {
  const receiptWrapRef = useRef<HTMLDivElement>(null);

  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [templates, setTemplates] = useState<
    Array<{ id: string; templateUrl: string; templateName?: string }>
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateNaturalSize, setTemplateNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // We keep only the editable digits here, because the Telebirr amount is always rendered as: -<digits>.00
  const [amountDigits, setAmountDigits] = useState("5515");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [transactionTime, setTransactionTime] = useState("");
  const [transactionType, setTransactionType] = useState("Transfer To Bank");
  const [transactionTo, setTransactionTo] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("Commercial Bank of Ethiopia");

  // Default overlay font scale to match the receipt look.
  const [fontScale, setFontScale] = useState(1.05);
  const [textColor, setTextColor] = useState("#3c3939");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    const load = async () => {
      setLoadingTemplate(true);
      setTemplateError(null);
      try {
        // 1) Load all uploaded templates (new multi-template flow).
        const templatesRef = collection(db, FIRESTORE_COLLECTION, TEMPLATE_DOC_ID, TEMPLATE_SUBCOLLECTION);
        const snapList = await getDocs(templatesRef);
        type UploadedTemplate = {
          id: string;
          templateUrl: string;
          templateName?: string;
          createdAtMillis: number;
        };

        const itemsRaw = snapList.docs
          .map((d): UploadedTemplate | null => {
            const data = d.data() as { templateUrl?: string; templateName?: string; createdAt?: Timestamp | null };
            if (!data.templateUrl) return null;
            return {
              id: d.id,
              templateUrl: data.templateUrl,
              templateName: data.templateName,
              createdAtMillis: data.createdAt?.toMillis?.() ?? 0,
            };
          })
          .filter((x): x is UploadedTemplate => !!x);

        const items = itemsRaw
          .sort((a, b) => b.createdAtMillis - a.createdAtMillis)
          .map((t) => ({ id: t.id, templateUrl: t.templateUrl, templateName: t.templateName }));

        // 2) Fallback: keep backward compatibility with single-template doc.
        const snap = await getDoc(doc(db, FIRESTORE_COLLECTION, TEMPLATE_DOC_ID));
        const fallbackData = snap.exists()
          ? (snap.data() as { templateUrl?: string })
          : ({ templateUrl: undefined } as { templateUrl?: string });

        if (items.length > 0) {
          setTemplates(items);
          setSelectedTemplateId(items[0].id);
          setTemplateUrl(items[0].templateUrl);
        } else if (fallbackData.templateUrl) {
          setTemplates([]);
          setSelectedTemplateId(null);
          setTemplateUrl(fallbackData.templateUrl);
        } else {
          setTemplateUrl(null);
          setTemplateError("Upload a Telebirr sample template first (Admin → Telebirr Sample Upload).");
          return;
        }
      } catch (e) {
        console.error(e);
        setTemplateError("Failed to load the stored Telebirr template.");
      } finally {
        setLoadingTemplate(false);
      }
    };
    load();
  }, []);

  const overlayStyle = (
    box: (typeof BOXES)[keyof typeof BOXES],
    align: "left" | "right" | "center",
    text: string
  ) => {
    const boxW = box.x1 - box.x0 + 1;
    const boxH = box.y1 - box.y0 + 1;

    const rawText = (text ?? "").trim();
    const len = rawText.length;
    const isAmount = box === BOXES.amountValue;
    const digitLenAll = isAmount ? rawText.replace(/[^0-9]/g, "").length : len;
    const digitLenInt = isAmount ? Math.max(0, digitLenAll - 2) : 0; // exclude ".00"
    // Shrink slightly earlier for 4+ integer digits so the last digit fits in the narrower box.
    const amountFactor = isAmount ? Math.max(0.45, 1 / (1 + Math.max(0, digitLenInt - 3) * 0.14)) : 1;
    let fontSize = Math.max(10, Math.round(boxH * 0.92 * fontScale * amountFactor));
    // Amount (balance) should be more prominent.
    if (isAmount) fontSize = Math.round(fontSize * 1.16);
    // Ensure amount never clips for large numbers (e.g. 1000000.00).
    if (isAmount) {
      const maxByWidth = boxW / Math.max(1, 0.62 * Math.max(1, digitLenInt));
      fontSize = Math.max(10, Math.min(fontSize, Math.floor(maxByWidth)));
    }

    return {
      position: "absolute",
      left: box.x0,
      top: box.y0,
      width: boxW,
      height: boxH,
      fontSize,
      lineHeight: "1",
      fontWeight: isAmount ? 450 : 600,
      color: isAmount ? "#000000" : textColor,
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      display: "flex",
      alignItems: "center",
      justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
      direction: "ltr",
      textAlign: align === "left" ? "left" : align === "right" ? "right" : "center",
      whiteSpace: "nowrap",
      overflow: isAmount ? "hidden" : "hidden",
      zIndex: isAmount ? 1 : 0,
      letterSpacing: "-0.2px",
    } as React.CSSProperties;
  };

  const normalizeAmountDigits = (value: string) => {
    const raw = (value ?? "").trim();
    // Accept "1000000", "1000000.00", "-1000000", etc.
    const digitsOnly = raw.replace(/[^0-9.]/g, "");
    const parts = digitsOnly.split(".");
    const whole = (parts[0] ?? "").replace(/[^0-9]/g, "");
    const safe = whole.length > 16 ? whole.slice(0, 16) : whole;
    return safe || "0";
  };

  const amount = useMemo(() => {
    return `-${formatDigitsWithCommas(amountDigits || "0")}.00`;
  }, [amountDigits]);

  const canGenerate = useMemo(() => {
    return (
      !!templateUrl &&
      !!amountDigits.trim() &&
      transactionNumber.trim() &&
      transactionTime.trim() &&
      transactionType.trim() &&
      transactionTo.trim() &&
      bankAccountNumber.trim() &&
      bankName.trim()
    );
  }, [
    templateUrl,
    amountDigits,
    transactionNumber,
    transactionTime,
    transactionType,
    transactionTo,
    bankAccountNumber,
    bankName,
  ]);

  const handleRandomFill = () => {
    const d = new Date();
    // Match your requirement: default sample amount and fixed Transaction To + Bank Account.
    setAmountDigits("5515");
    setTransactionNumber(randomTxnId());
    setTransactionTime(formatTelebirrTime(d));
    setTransactionTo("Mr Abdela Adem Muhammed");
    setBankAccountNumber("1000754882291");
  };

  const handleGenerateAndSave = async () => {
    if (!receiptWrapRef.current || !templateUrl) return;
    if (!canGenerate) {
      alert("Fill amount, transaction number, transaction time, transaction to, and bank account number.");
      return;
    }

    setBusy(true);
    try {
      // Export exactly what's visible in the wrapper.
      const canvas = await html2canvas(receiptWrapRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: REFERENCE_W,
        height: REFERENCE_H,
        logging: false,
      });

      // Also trigger download locally (so you can see the image immediately).
      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
      const safeTxn = transactionNumber.replace(/[^a-zA-Z0-9_-]+/g, "") || "telebirr";
      a.download = `Telebirr-Receipt-${safeTxn}.png`;
      a.click();

      alert("Receipt downloaded (no Firestore save).");
    } catch (e) {
      console.error(e);
      alert("Generate/Save failed. Check console.");
    } finally {
      setBusy(false);
    }
  };

  const previewW = REFERENCE_W;
  const previewH = REFERENCE_H;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Telebirr Sample Editor</h1>
        <p className="text-gray-400 font-bold text-sm mt-2">
          Fill the 5 fields (amount, transaction number/time/to, bank account number). Then download the filled receipt.
        </p>
      </div>

      {loadingTemplate && (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#8cc63f] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loadingTemplate && templateError && (
        <div className="bg-red-50 border border-red-100 rounded-[2rem] p-6">
          <p className="text-red-600 font-black text-sm">{templateError}</p>
        </div>
      )}

      {!loadingTemplate && templateUrl && (
        <div>
          {/* Edit / Preview toggle (mobile only) */}
          <div className="mb-4 sm:hidden">
            <div className="inline-flex w-full rounded-[2rem] bg-gray-100 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`flex-1 px-4 py-2 rounded-[1.75rem] text-sm font-semibold transition-all ${
                  activeTab === "edit" ? "bg-[#d19b43] text-white shadow-sm" : "bg-transparent text-gray-500"
                }`}
              >
                Edit Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex-1 px-4 py-2 rounded-[1.75rem] text-sm font-semibold transition-all ${
                  activeTab === "preview" ? "bg-[#d19b43] text-white shadow-sm" : "bg-transparent text-gray-500"
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Editor */}
          <div
            className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8 ${
              activeTab === "edit" ? "" : "hidden"
            } sm:block`}
          >
            <h2 className="text-xl font-black text-gray-800 tracking-tight mb-4">Edit Hidden Fields</h2>

            <div className="space-y-5">
              {templates.length > 0 && (
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">
                    Template
                  </label>
                  <select
                    value={selectedTemplateId ?? ""}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedTemplateId(nextId);
                      const next = templates.find((t) => t.id === nextId);
                      setTemplateUrl(next?.templateUrl ?? null);
                    }}
                    className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.templateName ? t.templateName : t.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">
                  Amount (ETB)
                </label>
                <div className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 flex items-center gap-0 focus-within:border-[#8cc63f] focus-within:bg-white transition-all">
                  <span className="text-gray-800 font-bold text-lg select-none">-</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatDigitsWithCommas(amountDigits)}
                    onChange={(e) => setAmountDigits(normalizeAmountDigits(e.target.value))}
                    placeholder="0"
                    className="flex-1 bg-transparent outline-none text-gray-800 font-bold text-lg"
                  />
                  <span className="text-gray-800 font-bold text-lg select-none">.00</span>
                  <span className="text-gray-500 font-bold text-sm select-none ml-1">(ETB)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">
                    Transaction Number
                  </label>
                  <input
                    type="text"
                    value={transactionNumber}
                    onChange={(e) => setTransactionNumber(e.target.value)}
                    placeholder="DCU7D6G6H0P"
                    className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">
                    Transaction Time
                  </label>
                  <input
                    type="text"
                    value={transactionTime}
                    onChange={(e) => setTransactionTime(e.target.value)}
                    placeholder="2026/03/30 08:32:45"
                    className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">
                  Transaction To
                </label>
                <input
                  type="text"
                  value={transactionTo}
                  onChange={(e) => setTransactionTo(e.target.value)}
                  placeholder="Mr Abdela ahmed Muhammed"
                  className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 text-left focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">
                  Transaction Type
                </label>
                <input
                  type="text"
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  placeholder="Transfer To Bank"
                  className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Commercial Bank of Ethiopia"
                  className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="1000588242045"
                  className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                />
              </div>

              <div className="bg-gray-50/50 border border-gray-100 rounded-4xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-gray-800 font-black text-sm">Font Scale</p>
                    <p className="text-xs text-gray-400 font-bold">Adjust if your text shifts.</p>
                  </div>
                  <p className="text-sm font-black text-gray-700 shrink-0">{fontScale.toFixed(2)}x</p>
                </div>
                <input
                  type="range"
                  min={0.85}
                  max={1.25}
                  step={0.01}
                  value={fontScale}
                  onChange={(e) => setFontScale(parseFloat(e.target.value))}
                  className="w-full mt-4"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">Text Color</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="mt-2 h-12 w-full rounded-[1.25rem] border-2 border-gray-100 bg-white p-2"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleRandomFill}
                  className="flex-1 bg-[#8cc63f] hover:bg-[#7ab32f] text-white font-black py-4 rounded-[1.5rem] transition-all active:scale-[0.98] shadow-lg shadow-[#8cc63f]/20 text-sm uppercase tracking-widest"
                >
                  Generate Sample Data
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  disabled={busy}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-[1.5rem] transition-all active:scale-[0.98] shadow-lg shadow-gray-900/20 text-sm uppercase tracking-widest disabled:opacity-60 sm:hidden"
                >
                  {busy ? "Loading..." : "View Receipt"}
                </button>
              </div>

              <p className="text-xs text-gray-400 font-bold">
                View preview above. Download in the Preview tab.
              </p>
            </div>
          </div>

          {/* Preview */}
          <div
            className={`flex flex-col items-center ${
              activeTab === "preview" ? "" : "hidden"
            } sm:flex`}
          >
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8 w-full flex flex-col items-center">
              <h2 className="text-xl font-black text-gray-800 tracking-tight mb-5">Preview</h2>

              <div className="w-full overflow-x-auto">
                <div
                  className="relative bg-white rounded-[2rem] border border-gray-100 overflow-visible min-w-[489px]"
                  ref={receiptWrapRef}
                  style={{
                    width: previewW,
                    height: previewH,
                  }}
                  aria-label="Telebirr receipt preview"
                >
                  <img
                    src={templateUrl}
                    alt="Telebirr template"
                    crossOrigin="anonymous"
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "fill" }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setTemplateNaturalSize({
                        w: img.naturalWidth || REFERENCE_W,
                        h: img.naturalHeight || REFERENCE_H,
                      });
                    }}
                  />

                  {/* Overlays: only the 5 editable values */}
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  {/* Hide template "(ETB)" and render our own */}
                  <div
                    style={{
                      position: "absolute",
                      left: BOXES.etbLabel.x0,
                      top: BOXES.etbLabel.y0,
                      width: BOXES.etbLabel.x1 - BOXES.etbLabel.x0 + 1,
                      height: BOXES.etbLabel.y1 - BOXES.etbLabel.y0 + 1,
                      background: "#ffffff",
                      zIndex: 0,
                    }}
                  />

                  {/* Cover the template hidden-value area (removes the magenta placeholder). */}
                  <div
                    style={{
                      position: "absolute",
                      left: BOXES.amountValue.x0,
                      top: BOXES.amountValue.y0,
                      width: BOXES.amountValue.x1 - BOXES.amountValue.x0 + 1,
                      height: BOXES.amountValue.y1 - BOXES.amountValue.y0 + 1,
                      background: "#ffffff",
                      zIndex: 0,
                      pointerEvents: "none",
                    }}
                  />

                  <div style={overlayStyle(BOXES.amountValue, "right", amount)}>{amount}</div>
                  <div
                    style={{
                      position: "absolute",
                      left: BOXES.etbLabel.x0,
                      top: BOXES.etbLabel.y0,
                      width: BOXES.etbLabel.x1 - BOXES.etbLabel.x0 + 1,
                      height: BOXES.etbLabel.y1 - BOXES.etbLabel.y0 + 1,
                      fontSize: 12,
                      fontWeight: 600,
                      color: textColor,
                      fontFamily:
                        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                      letterSpacing: "-0.2px",
                      zIndex: 1,
                    }}
                  >
                    (ETB)
                  </div>
                  {transactionNumber.trim() && (
                    <div style={overlayStyle(BOXES.transactionNumber, "right", transactionNumber)}>{transactionNumber}</div>
                  )}
                  {transactionTime.trim() && (
                    <div style={overlayStyle(BOXES.transactionTime, "right", transactionTime)}>{transactionTime}</div>
                  )}
                  {transactionType.trim() && (
                    <div style={overlayStyle(BOXES.transactionTypeValue, "right", transactionType)}>
                      {transactionType}
                    </div>
                  )}
                  {transactionTo.trim() && (
                    <div style={overlayStyle(BOXES.transactionTo, "right", transactionTo)}>{transactionTo}</div>
                  )}
                  {bankName.trim() && (
                    <div style={overlayStyle(BOXES.bankNameValue, "right", bankName)}>{bankName}</div>
                  )}
                  {bankAccountNumber.trim() && (
                    <div style={overlayStyle(BOXES.bankAccountNumber, "right", bankAccountNumber)}>{bankAccountNumber}</div>
                  )}
                  </div>
                </div>
              </div>

              {templateNaturalSize && (templateNaturalSize.w !== REFERENCE_W || templateNaturalSize.h !== REFERENCE_H) && (
                <p className="text-[11px] text-amber-600 font-bold mt-3 text-center">
                  Warning: template size is {templateNaturalSize.w}x{templateNaturalSize.h}. Overlays assume 489x1024.
                </p>
              )}

              <p className="text-xs text-gray-400 font-bold mt-4 text-center">
                Leave fields empty to keep the sample hidden values like the template image.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full mt-5">
                <button
                  type="button"
                  onClick={handleGenerateAndSave}
                  disabled={busy || !canGenerate}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-[1.5rem] transition-all active:scale-[0.98] shadow-lg shadow-gray-900/20 text-sm uppercase tracking-widest disabled:opacity-60"
                >
                  {busy ? "Exporting..." : "Download Receipt"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

