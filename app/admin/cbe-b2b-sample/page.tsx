"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDoc, getDocs, Timestamp } from "firebase/firestore";

const FIRESTORE_COLLECTION = "cbe_b2b_sample";
const TEMPLATE_DOC_ID = "template";
const TEMPLATE_SUBCOLLECTION = "templates";

// Reference size based on the blank template image.
const REFERENCE_W = 776;
const REFERENCE_H = 1024;

// Extracted from diff between blank vs filled screenshots (filled resized to reference size).
const BOXES = {
  // Customer Name (top section) — tuned to sit exactly on the "Customer Name:" row.
  customerNameTop: { x0: 450, y0: 162, x1: 696, y1: 179 },
  // Payer row: keep same x, move slightly down.
  payer: { x0: 398, y0: 386, x1: 680, y1: 397 },
  // Payer Account: keep same x, move a bit further down.
  payerAccount: { x0: 398, y0: 411, x1: 680, y1: 441 },
  // Receiver: keep x as-is, move slightly down.
  receiver: { x0: 398, y0: 446, x1: 680, y1: 476 },
  // Receiver Account: match receiver x-range, move slightly down.
  receiverAccount: { x0: 398, y0: 484, x1: 680, y1: 514 },
  // Payment Date & Time: keep x as-is, move slightly down.
  paymentDateTime: { x0: 398, y0: 520, x1: 680, y1: 550 },
  // Reference No: align x with Payment Date & Time, move slightly down.
  referenceNo: { x0: 398, y0: 558, x1: 680, y1: 588 },
  // Reason: align x with Reference No, move slightly down.
  reason: { x0: 398, y0: 595, x1: 680, y1: 626 },

  transferredAmt: { x0: 398, y0: 627, x1: 680, y1: 664 },

  commission: { x0: 398, y0: 662, x1: 680, y1: 702 },

  vat15: { x0: 398, y0: 697, x1: 680, y1: 740 },

  totalDebited: { x0: 398, y0: 732, x1: 680, y1: 778 },

  amountInWord: { x0: 45, y0: 820, x1: 640, y1: 977 },
} as const;

function generateRefNumber() {
  const prefix = "FT";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 10; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + suffix;
}

function generateMaskedAccount() {
  // Keep leading "1", then mask middle, randomize last 4 digits.
  const last4 = Array.from({ length: 4 })
    .map(() => Math.floor(Math.random() * 10).toString())
    .join("");
  return `1****${last4}`;
}

function to2(n: number) {
  return n.toFixed(2);
}

function clampMoney(value: string) {
  const cleaned = (value ?? "").replace(/[^0-9.]/g, "");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
}

export default function CbeB2BSamplePage() {
  const receiptWrapRef = useRef<HTMLDivElement>(null);

  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; templateUrl: string; templateName?: string }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateNaturalSize, setTemplateNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Form fields.
  const [customerName, setCustomerName] = useState("Robel Birhanu Girma");
  const [payerAccount, setPayerAccount] = useState(generateMaskedAccount());
  const [receiverName, setReceiverName] = useState("Abdela Adem Muhammed");
  const [receiverAccount, setReceiverAccount] = useState("1****2291");
  const [paymentDateTime, setPaymentDateTime] = useState("Mar 28, 2026, 6:16 PM");
  const [referenceNo, setReferenceNo] = useState(generateRefNumber());
  const [reason, setReason] = useState("1");

  const [transferredAmount, setTransferredAmount] = useState("5500.00");
  const [commission, setCommission] = useState("0.61");
  const [amountInWord, setAmountInWord] = useState("Five Thousand Five Hundred ETB and Sixty One cents");

  const [fontScale, setFontScale] = useState(1.05);
  // Nudge table rows only (top customer name and amount-in-word stay fixed).
  const [yOffset, setYOffset] = useState(48);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [downloadNotice, setDownloadNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingTemplate(true);
      setTemplateError(null);
      try {
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
          setTemplateError("Upload a CBE Bank→Bank template first (Admin → CBE B2B Template Upload).");
          return;
        }
      } catch (e) {
        console.error(e);
        setTemplateError("Failed to load the stored CBE Bank→Bank template.");
      } finally {
        setLoadingTemplate(false);
      }
    };
    load();
  }, []);

  const vatAmount = useMemo(() => {
    const c = clampMoney(commission);
    return c * 0.15;
  }, [commission]);

  // Match provided sample: total debited = transferred amount + commission.
  const totalAmount = useMemo(() => {
    const t = clampMoney(transferredAmount);
    const c = clampMoney(commission);
    return t + c;
  }, [transferredAmount, commission]);

  const overlayStyle = (
    box: (typeof BOXES)[keyof typeof BOXES],
    align: "left" | "right" | "center",
    text: string,
    kind: "normal" | "money" = "normal",
    yShift = 0
  ) => {
    const boxW = box.x1 - box.x0 + 1;
    const boxH = box.y1 - box.y0 + 1;

    const rawText = (text ?? "").trim();
    const len = rawText.length;
    const factor = Math.max(0.55, 1 / (1 + Math.max(0, len - 18) * 0.05));

    // Use a stable font size so table rows never blow up.
    // (The old boxH-based sizing makes text huge on tall rows.)
    const basePx =
      box === BOXES.customerNameTop ? 13 :
      box === BOXES.amountInWord ? 13 :
      box === BOXES.payer ? 13 :
      kind === "money" ? 12 : 12;
    let fontSize = box === BOXES.amountInWord
      ? Math.max(10, Math.round(basePx * fontScale))
      : Math.max(9, Math.round(basePx * fontScale * factor));
    // Slight extra boost just for the Payer name row.
    if (box === BOXES.payer) {
      fontSize += 3;
    }
    // Safety cap: never exceed the row height.
    fontSize = Math.min(fontSize, Math.floor(boxH * 0.9));

    return {
      position: "absolute",
      left: box.x0,
      top: box.y0 + yShift,
      width: boxW,
      height: boxH,
      fontSize,
      lineHeight: "1",
      fontWeight: 600,
      color: "#374151",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      display: "flex",
      alignItems: "center",
      justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
      direction: "ltr",
      textAlign: align === "left" ? "left" : align === "right" ? "right" : "center",
      whiteSpace: "nowrap",
      overflow: "hidden",
      letterSpacing: kind === "money" ? "-0.1px" : "-0.2px",
      zIndex: 1,
    } as React.CSSProperties;
  };

  const canGenerate = useMemo(() => {
    return (
      !!templateUrl &&
      customerName.trim() &&
      payerAccount.trim() &&
      receiverName.trim() &&
      receiverAccount.trim() &&
      paymentDateTime.trim() &&
      referenceNo.trim() &&
      reason.trim()
    );
  }, [templateUrl, customerName, payerAccount, receiverName, receiverAccount, paymentDateTime, referenceNo, reason]);

  const handleDownload = async () => {
    if (!receiptWrapRef.current || !templateUrl) return;
    if (!canGenerate) {
      setDownloadNotice({ type: "error", text: "Please fill all required fields." });
      return;
    }

    setBusy(true);
    setDownloadNotice(null);
    try {
      // Auto-generate these fields on download.
      const nextRef = generateRefNumber();
      const nextPayerAcc = generateMaskedAccount();
      setReferenceNo(nextRef);
      setPayerAccount(nextPayerAcc);
      // Receiver account: keep the sample's default last digits (2291) unless the admin edits it.
      // Wait for React to paint updated values before capturing.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(receiptWrapRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: REFERENCE_W,
        height: REFERENCE_H,
        logging: false,
      });

      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
      const safeRef = nextRef.replace(/[^a-zA-Z0-9_-]+/g, "") || "cbe";
      a.download = `CBE-B2B-Receipt-${safeRef}.png`;
      a.click();
      setDownloadNotice({ type: "success", text: "Receipt downloaded successfully." });
    } catch (e) {
      console.error(e);
      setDownloadNotice({ type: "error", text: "Download failed. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const previewW = REFERENCE_W;
  const previewH = REFERENCE_H;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">CBE Bank→Bank Sample Editor</h1>
        <p className="text-gray-400 font-bold text-sm mt-2">
          Fill the bank-to-bank receipt fields, then download the generated receipt image.
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
            <div className="inline-flex w-full sm:w-auto rounded-[2rem] bg-gray-100 p-1 shadow-sm">
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

          {downloadNotice && (
            <div
              role="status"
              aria-live="polite"
              className={`mb-4 rounded-[1.25rem] px-4 py-3 text-sm font-bold border ${
                downloadNotice.type === "success"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                  : "bg-red-50 border-red-100 text-red-700"
              }`}
            >
              {downloadNotice.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Editor */}
          <div
            className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-4 sm:p-6 md:p-8 ${
              activeTab === "edit" ? "" : "hidden"
            } sm:block`}
          >
            <h2 className="text-xl font-black text-gray-800 tracking-tight mb-4">Edit Receipt Fields</h2>

            <div className="space-y-5">
              {templates.length > 0 && (
                <div>
                  <label className="text-gray-400 text-xs font-bold pl-1">Template</label>
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
                <label className="text-gray-400 text-xs font-bold pl-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs font-bold pl-1">Payer Account</label>
                  <input
                    type="text"
                    value={payerAccount}
                    onChange={(e) => setPayerAccount(e.target.value)}
                    className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-bold pl-1">Receiver Account</label>
                  <input
                    type="text"
                    value={receiverAccount}
                    onChange={(e) => setReceiverAccount(e.target.value)}
                    className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold pl-1">Receiver Name</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold pl-1">Payment Date & Time</label>
                <input
                  type="text"
                  value={paymentDateTime}
                  onChange={(e) => setPaymentDateTime(e.target.value)}
                  className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs font-bold pl-1">Reference No.</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-bold pl-1">Reason / Type</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs font-bold pl-1">Transferred Amount</label>
                  <input
                    type="text"
                    value={transferredAmount}
                    onChange={(e) => setTransferredAmount(e.target.value)}
                    className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-bold pl-1">Commission</label>
                  <input
                    type="text"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold pl-1">Amount in Word</label>
                <input
                  type="text"
                  value={amountInWord}
                  onChange={(e) => setAmountInWord(e.target.value)}
                  className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-5 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-lg font-semibold"
                />
              </div>

              <div className="bg-gray-50/50 border border-gray-100 rounded-4xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-gray-800 font-black text-sm">Calculated</p>
                    <p className="text-xs text-gray-400 font-bold">VAT is 15% of commission. Total is sum.</p>
                  </div>
                  <p className="text-sm font-black text-gray-700 shrink-0">
                    VAT {to2(vatAmount)} | Total {to2(totalAmount)}
                  </p>
                </div>
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

              <div className="bg-gray-50/50 border border-gray-100 rounded-4xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-gray-800 font-black text-sm">Vertical Align</p>
                    <p className="text-xs text-gray-400 font-bold">Nudge overlay text up/down.</p>
                  </div>
                  <p className="text-sm font-black text-gray-700 shrink-0">{yOffset}px</p>
                </div>
                <input
                  type="range"
                  min={-20}
                  max={30}
                  step={1}
                  value={yOffset}
                  onChange={(e) => setYOffset(parseInt(e.target.value, 10))}
                  className="w-full mt-4"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  disabled={busy}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-[1.5rem] transition-all active:scale-[0.98] shadow-lg shadow-gray-900/20 text-sm disabled:opacity-60"
                >
                  {busy ? "Loading..." : "View Receipt"}
                </button>
              </div>

              <p className="text-xs text-gray-400 font-bold">Download only. No receipt upload/save.</p>
            </div>
          </div>

            {/* Preview */}
          <div
            className={`flex flex-col items-center ${
              activeTab === "preview" ? "" : "hidden"
            } sm:flex`}
          >
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-4 sm:p-6 md:p-8 w-full flex flex-col items-center">
              <h2 className="text-xl font-black text-gray-800 tracking-tight mb-5">Preview</h2>

              <div className="w-full overflow-x-auto">
                <div
                  className="relative bg-white rounded-[2rem] border border-gray-100 overflow-visible min-w-[776px]"
                  ref={receiptWrapRef}
                  style={{ width: previewW, height: previewH }}
                  aria-label="CBE B2B receipt preview"
                >
                  <img
                    src={templateUrl}
                    alt="CBE B2B template"
                    crossOrigin="anonymous"
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "fill" }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setTemplateNaturalSize({ w: img.naturalWidth || REFERENCE_W, h: img.naturalHeight || REFERENCE_H });
                    }}
                  />

                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    <div style={overlayStyle(BOXES.customerNameTop, "right", customerName)}>{customerName}</div>

                    <div style={overlayStyle(BOXES.payer, "right", customerName, "normal", yOffset)}>{customerName}</div>
                    <div style={overlayStyle(BOXES.payerAccount, "right", payerAccount, "normal", yOffset)}>{payerAccount}</div>
                    <div style={overlayStyle(BOXES.receiver, "right", receiverName, "normal", yOffset)}>{receiverName}</div>
                    <div style={overlayStyle(BOXES.receiverAccount, "right", receiverAccount, "normal", yOffset)}>{receiverAccount}</div>
                    <div style={overlayStyle(BOXES.paymentDateTime, "right", paymentDateTime, "normal", yOffset)}>{paymentDateTime}</div>
                    <div style={overlayStyle(BOXES.referenceNo, "right", referenceNo, "normal", yOffset)}>{referenceNo}</div>
                    <div style={overlayStyle(BOXES.reason, "right", reason, "normal", yOffset)}>{reason}</div>

                    <div style={overlayStyle(BOXES.transferredAmt, "right", `${to2(clampMoney(transferredAmount))} ETB`, "money", yOffset)}>
                      {to2(clampMoney(transferredAmount))} ETB
                    </div>
                    <div style={overlayStyle(BOXES.commission, "right", `${to2(clampMoney(commission))} ETB`, "money", yOffset)}>
                      {to2(clampMoney(commission))} ETB
                    </div>
                    <div style={overlayStyle(BOXES.vat15, "right", `${to2(vatAmount)} ETB`, "money", yOffset)}>
                      {to2(vatAmount)} ETB
                    </div>
                    <div
                      style={{
                        ...overlayStyle(BOXES.totalDebited, "right", `${to2(totalAmount)} ETB`, "money", yOffset),
                        fontWeight: 800,
                        color: "#000000",
                      }}
                    >
                      {to2(totalAmount)} ETB
                    </div>

                    {amountInWord.trim() && (
                      <div style={overlayStyle(BOXES.amountInWord, "center", amountInWord)}>{amountInWord}</div>
                    )}
                  </div>
                </div>
              </div>

              {templateNaturalSize && (templateNaturalSize.w !== REFERENCE_W || templateNaturalSize.h !== REFERENCE_H) && (
                <p className="text-[11px] text-amber-600 font-bold mt-3 text-center">
                  Warning: template size is {templateNaturalSize.w}x{templateNaturalSize.h}. Overlays assume {REFERENCE_W}x{REFERENCE_H}.
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full mt-5">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={busy || !canGenerate}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-[1.5rem] transition-all active:scale-[0.98] shadow-lg shadow-gray-900/20 text-sm disabled:opacity-60"
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

