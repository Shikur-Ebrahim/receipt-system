"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDoc, getDocs, Timestamp } from "firebase/firestore";

const FIRESTORE_COLLECTION = "cbe_app_pink_sample";
const TEMPLATE_DOC_ID = "template";
const TEMPLATE_SUBCOLLECTION = "templates";

const REFERENCE_W = 538;
const REFERENCE_H = 960;

const DEFAULT_MESSAGE = `ETB 5,500.00 debited from ANDUALEM TASEW
SEMUYE for Mr Abdela Adem Muhammed-
ETB-6665 on 29-Mar-2026  with transaction
ID: FT260899MYKDR. Total Amount Debited
ETB 5001.20 with commission of ETB 1.00 ,
15% VAT of ETB0.15 and 5% Disaster Fund
ofETB0.05.`;

type MessageBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export default function CbeAppPinkSamplePage() {
  const receiptWrapRef = useRef<HTMLDivElement>(null);

  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; templateUrl: string; templateName?: string }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateNaturalSize, setTemplateNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [fontScale, setFontScale] = useState(1.08);
  const [fontWeight, setFontWeight] = useState(386);
  const [lineHeight, setLineHeight] = useState(1.18);
  const [letterSpacing, setLetterSpacing] = useState(0.7);
  const [textColor, setTextColor] = useState("#616161");
  const [hideOriginalMessageArea, setHideOriginalMessageArea] = useState(false);
  const [messageBox, setMessageBox] = useState<MessageBox>({ x: 45, y: 276, w: 1030, h: 300 });

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
          setTemplateError("Upload a CBE App Pink template first (Admin → CBE App Pink Template).");
          return;
        }
      } catch (e) {
        console.error(e);
        setTemplateError("Failed to load the stored CBE App Pink template.");
      } finally {
        setLoadingTemplate(false);
      }
    };
    load();
  }, []);

  const canGenerate = useMemo(() => {
    return !!templateUrl && !!message.trim();
  }, [templateUrl, message]);

  const handleDownload = async () => {
    if (!receiptWrapRef.current || !templateUrl) return;
    if (!canGenerate) {
      setDownloadNotice({ type: "error", text: "Message is required before export." });
      return;
    }

    setBusy(true);
    setDownloadNotice(null);
    try {
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
      a.download = `CBE-App-Pink-Receipt-${Date.now()}.png`;
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
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">CBE App Pink Message Editor</h1>
        <p className="text-gray-400 font-bold text-sm mt-2">
          Upload the pink sample screenshot, then edit only the message section to produce the filled output.
        </p>
      </div>

      {loadingTemplate && (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#8cc63f] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loadingTemplate && templateError && (
        <div className="bg-red-50 border border-red-100 rounded-4xl p-6">
          <p className="text-red-600 font-black text-sm">{templateError}</p>
        </div>
      )}

      {!loadingTemplate && templateUrl && (
        <div>
          <div className="mb-4 sm:hidden">
            <div className="inline-flex w-full rounded-4xl bg-gray-100 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`flex-1 px-4 py-2 rounded-[1.75rem] text-sm font-semibold transition-all ${
                  activeTab === "edit" ? "bg-[#8cc63f] text-white shadow-sm" : "bg-transparent text-gray-500"
                }`}
              >
                Edit Message
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex-1 px-4 py-2 rounded-[1.75rem] text-sm font-semibold transition-all ${
                  activeTab === "preview" ? "bg-[#8cc63f] text-white shadow-sm" : "bg-transparent text-gray-500"
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
            <div
              className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8 ${
                activeTab === "edit" ? "" : "hidden"
              } sm:block`}
            >
              <h2 className="text-xl font-black text-gray-800 tracking-tight mb-4">Message Controls</h2>

              <div className="space-y-5">
                {templates.length > 0 && (
                  <div>
                    <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">Template</label>
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
                  <label className="text-gray-400 text-xs font-bold uppercase tracking-[0.25em] pl-1">Message Text</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={11}
                    className="mt-2 w-full bg-gray-50 border-2 border-gray-100 rounded-[1.25rem] px-4 py-4 text-gray-700 focus:outline-none focus:border-[#8cc63f] focus:bg-white transition-all text-base font-semibold leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMessage(DEFAULT_MESSAGE)}
                    className="bg-[#8cc63f] hover:bg-[#7ab32f] text-white font-black py-3 rounded-[1.25rem] transition-all active:scale-[0.98] text-xs uppercase tracking-widest"
                  >
                    Use Sample Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessage("")}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-black py-3 rounded-[1.25rem] transition-all active:scale-[0.98] text-xs uppercase tracking-widest"
                  >
                    Clear Message
                  </button>
                </div>

                <div className="bg-gray-50/60 border border-gray-100 rounded-3xl p-4 space-y-4">
                  <p className="text-gray-800 font-black text-sm">Message Box Position</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-gray-500">
                      X
                      <input
                        type="number"
                        value={messageBox.x}
                        onChange={(e) => setMessageBox((p) => ({ ...p, x: Number(e.target.value) || 0 }))}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-500">
                      Y
                      <input
                        type="number"
                        value={messageBox.y}
                        onChange={(e) => setMessageBox((p) => ({ ...p, y: Number(e.target.value) || 0 }))}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-500">
                      Width
                      <input
                        type="number"
                        value={messageBox.w}
                        onChange={(e) => setMessageBox((p) => ({ ...p, w: Number(e.target.value) || 1 }))}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-500">
                      Height
                      <input
                        type="number"
                        value={messageBox.h}
                        onChange={(e) => setMessageBox((p) => ({ ...p, h: Number(e.target.value) || 1 }))}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50/60 border border-gray-100 rounded-3xl p-4 space-y-4">
                  <p className="text-gray-800 font-black text-sm">Typography</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-gray-500">
                      Scale
                      <input
                        type="number"
                        step={0.01}
                        value={fontScale}
                        onChange={(e) => setFontScale(Number(e.target.value) || 1)}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-500">
                      Weight
                      <input
                        type="number"
                        value={fontWeight}
                        onChange={(e) => setFontWeight(Number(e.target.value) || 700)}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-500">
                      Line Height
                      <input
                        type="number"
                        step={0.01}
                        value={lineHeight}
                        onChange={(e) => setLineHeight(Number(e.target.value) || 1.14)}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-500">
                      Letter Spacing
                      <input
                        type="number"
                        step={0.1}
                        value={letterSpacing}
                        onChange={(e) => setLetterSpacing(Number(e.target.value) || 0)}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                      />
                    </label>
                  </div>
                  <label className="text-xs font-bold text-gray-500 block">
                    Text Color
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="mt-2 h-10 w-full rounded-xl border border-gray-200 bg-white p-1"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-600">
                    <input
                      type="checkbox"
                      checked={hideOriginalMessageArea}
                      onChange={(e) => setHideOriginalMessageArea(e.target.checked)}
                    />
                    Cover original message area with white background
                  </label>
                </div>
              </div>
            </div>

            <div className={`flex flex-col items-center ${activeTab === "preview" ? "" : "hidden"} sm:flex`}>
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8 w-full flex flex-col items-center">
                <h2 className="text-xl font-black text-gray-800 tracking-tight mb-5">Preview</h2>

                <div className="w-full overflow-x-auto">
                  <div
                    className="relative bg-white rounded-4xl border border-gray-100 overflow-visible min-w-[538px]"
                    ref={receiptWrapRef}
                    style={{ width: previewW, height: previewH }}
                    aria-label="CBE app pink receipt preview"
                  >
                    <img
                      src={templateUrl}
                      alt="CBE app pink template"
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

                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                      {hideOriginalMessageArea && (
                        <div
                          style={{
                            position: "absolute",
                            left: messageBox.x,
                            top: messageBox.y,
                            width: messageBox.w,
                            height: messageBox.h,
                            background: "#ffffff",
                            zIndex: 0,
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: "absolute",
                          left: messageBox.x,
                          top: messageBox.y,
                          width: messageBox.w,
                          height: messageBox.h,
                          boxSizing: "border-box",
                          paddingRight: 12,
                          fontSize: Math.max(12, Math.round(18 * fontScale)),
                          lineHeight,
                          fontWeight,
                          letterSpacing: `${letterSpacing}px`,
                          color: textColor,
                          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
                          whiteSpace: "pre-wrap",
                          overflow: "hidden",
                          textAlign: "left",
                          zIndex: 1,
                        }}
                      >
                        {message}
                      </div>
                    </div>
                  </div>
                </div>

                {templateNaturalSize && (templateNaturalSize.w !== REFERENCE_W || templateNaturalSize.h !== REFERENCE_H) && (
                  <p className="text-[11px] text-amber-600 font-bold mt-3 text-center">
                    Template size is {templateNaturalSize.w}x{templateNaturalSize.h}. Overlay defaults are tuned for {REFERENCE_W}x{REFERENCE_H}.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 w-full mt-5">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={busy || !canGenerate}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-3xl transition-all active:scale-[0.98] shadow-lg shadow-gray-900/20 text-sm uppercase tracking-widest disabled:opacity-60"
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
