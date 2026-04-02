"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { db } from "@/lib/firebase/config";
import { collection, doc, getDoc, getDocs, Timestamp } from "firebase/firestore";

const FIRESTORE_COLLECTION = "business_license_sample";
const TEMPLATE_DOC_ID = "template";
const TEMPLATE_SUBCOLLECTION = "templates";

/** Preview/export canvas size (A4-ish ratio). */
const REFERENCE_W = 800;
const REFERENCE_H = 1131;

/** Addis Ababa appears on the uploaded template only — not overlaid. Kept for copy + to avoid ReferenceError if a stale bundle still names these. */
const FIXED_CITY_AM = "አዲስ አበባ";
const FIXED_CITY_EN = "Addis Ababa";

type FieldKey =
  | "ownerCompanyAm"
  | "ownerCompanyEn"
  | "nationalityAm"
  | "nationalityEn"
  | "tradeNameAm"
  | "tradeNameEn"
  | "gmNameAm"
  | "gmNameEn"
  | "regionAm"
  | "regionEn"
  | "zoneAm"
  | "zoneEn"
  | "woredaAm"
  | "woredaEn"
  | "kebeleAm"
  | "kebeleEn"
  | "houseNoAm"
  | "houseNoEn"
  | "telAm"
  | "telEn"
  | "emailAm"
  | "emailEn"
  | "capitalAm"
  | "capitalEn";

const DEFAULT_FIELDS: Record<FieldKey, string> = {
  ownerCompanyAm: "አብደላ አደም ሙሀመድ",
  ownerCompanyEn: "ABDELA ADEM MUHAMMED",
  nationalityAm: "ኢትዮጵያዊ",
  nationalityEn: "Ethiopian",
  tradeNameAm: "የመኪና እጣ",
  tradeNameEn: "Car Lottery",
  gmNameAm: "አቶ አብደላ አደም ሙሀመድ",
  gmNameEn: "Mr. ABDELA ADEM MUHAMMED",
  regionAm: "አዲስ አበባ",
  regionEn: "Addis Ababa",
  zoneAm: "ለሚ ኩራ",
  zoneEn: "Lemi Kura",
  woredaAm: "10",
  woredaEn: "10",
  kebeleAm: "---",
  kebeleEn: "---",
  houseNoAm: "new",
  houseNoEn: "new",
  telAm: "0995911053",
  telEn: "0995911053",
  emailAm: "",
  emailEn: "",
  capitalAm: "50,000,000.00",
  capitalEn: "50,000,000.00",
};

const OVERLAY_KEYS = [
  "ownerCompanyAm",
  "ownerCompanyEn",
  "nationalityAm",
  "nationalityEn",
  "tradeNameAm",
  "tradeNameEn",
  "gmNameAm",
  "gmNameEn",
  "regionAm",
  "regionEn",
  "zoneAm",
  "zoneEn",
  "woredaAm",
  "woredaEn",
  "kebeleAm",
  "kebeleEn",
  "houseNoAm",
  "houseNoEn",
  "telAm",
  "telEn",
  "emailAm",
  "emailEn",
  "capitalAm",
  "capitalEn",
] as const satisfies readonly FieldKey[];

type LayoutKey = (typeof OVERLAY_KEYS)[number];

/** Percent-based boxes: left column (Amharic), right column (English). Tune to match your scan. */
const FIELD_LAYOUT: Record<LayoutKey, { leftPct: number; topPct: number; widthPct: number; heightPct: number }> = {
  ownerCompanyAm: { leftPct: 25, topPct: 47.9, widthPct: 44, heightPct: 4.2 },
  ownerCompanyEn: { leftPct: 74, topPct: 47.7, widthPct: 44, heightPct: 4.2 },
  nationalityAm: { leftPct: 25, topPct: 50.7, widthPct: 44, heightPct: 3.5 },
  nationalityEn: { leftPct: 78, topPct: 50.5, widthPct: 44, heightPct: 3.5 },
  tradeNameAm: { leftPct: 23, topPct: 52.8, widthPct: 44, heightPct: 3.8 },
  tradeNameEn: { leftPct: 75, topPct: 52.7, widthPct: 44, heightPct: 3.8 },
  gmNameAm: { leftPct: 24, topPct: 55.6, widthPct: 44, heightPct: 4.2 },
  gmNameEn: { leftPct: 72, topPct: 55.3, widthPct: 44, heightPct: 4.2 },
  /** Address: same left/width as former single block; ~12% total height split across five lines. */
  regionAm: { leftPct: 12, topPct: 59.8, widthPct: 44, heightPct: 2.35 },
  regionEn: { leftPct: 60, topPct: 60, widthPct: 44, heightPct: 2.35 },
  zoneAm: { leftPct: 38, topPct: 59.8, widthPct: 44, heightPct: 2.35 },
  zoneEn: { leftPct: 85, topPct: 59.6, widthPct: 44, heightPct: 2.35 },
  woredaAm: { leftPct: 20, topPct: 61.9, widthPct: 44, heightPct: 2.35 },
  woredaEn: { leftPct: 67, topPct: 62.2, widthPct: 44, heightPct: 2.35 },
  kebeleAm: { leftPct: 40, topPct: 61.9, widthPct: 44, heightPct: 2.35 },
  kebeleEn: { leftPct: 88, topPct: 61.9, widthPct: 44, heightPct: 2.35 },
  houseNoAm: { leftPct: 17, topPct: 63.6, widthPct: 44, heightPct: 2.35 },
  houseNoEn: { leftPct: 65, topPct: 63.9, widthPct: 44, heightPct: 2.35 },
  telAm: { leftPct: 37, topPct: 64, widthPct: 44, heightPct: 2.8 },
  telEn: { leftPct: 85, topPct: 64, widthPct: 44, heightPct: 2.8 },
  emailAm: { leftPct: 28.5, topPct: 65.8, widthPct: 44, heightPct: 2.8 },
  emailEn: { leftPct: 76, topPct: 65.9, widthPct: 44, heightPct: 2.8 },
  capitalAm: { leftPct: 25, topPct: 73.2, widthPct: 44, heightPct: 3.2 },
  capitalEn: { leftPct: 75, topPct: 73.1, widthPct: 44, heightPct: 3.2 },
};

export default function BusinessLicenseSamplePage() {
  const receiptWrapRef = useRef<HTMLDivElement>(null);

  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; templateUrl: string; templateName?: string }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateNaturalSize, setTemplateNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const [fields, setFields] = useState<Record<FieldKey, string>>(DEFAULT_FIELDS);
  const [fontScale, setFontScale] = useState(1);
  const [lineHeight, setLineHeight] = useState(1.25);
  const [textColorAm, setTextColorAm] = useState("#111827");
  const [textColorEn, setTextColorEn] = useState("#35373b");
  const [globalTopOffsetPct, setGlobalTopOffsetPct] = useState(0);

  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [downloadNotice, setDownloadNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const setField = (key: FieldKey, value: string) => {
    setFields((p) => ({ ...p, [key]: value }));
  };

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
          setTemplateError("Upload a business license template first (Admin → Business License Template).");
          return;
        }
      } catch (e) {
        console.error(e);
        setTemplateError("Failed to load the stored business license template.");
      } finally {
        setLoadingTemplate(false);
      }
    };
    load();
  }, []);

  const canGenerate = useMemo(() => {
    return !!templateUrl;
  }, [templateUrl]);

  const handleDownload = async () => {
    if (!receiptWrapRef.current || !templateUrl) return;
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
      a.download = `Business-License-${Date.now()}.png`;
      a.click();
      setDownloadNotice({ type: "success", text: "Image downloaded successfully." });
    } catch (e) {
      console.error(e);
      setDownloadNotice({ type: "error", text: "Download failed. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const previewW = REFERENCE_W;
  const previewH = REFERENCE_H;

  const overlayText = (key: LayoutKey): string => fields[key];

  const overlayTextStyle = (key: LayoutKey): React.CSSProperties => {
    const isAm = key.endsWith("Am");
    const color = isAm ? textColorAm : textColorEn;
    const box = FIELD_LAYOUT[key];
    const top = Math.min(95, Math.max(0, box.topPct + globalTopOffsetPct));
    const basePx = 13;
    return {
      position: "absolute",
      left: `${box.leftPct}%`,
      top: `${top}%`,
      width: `${box.widthPct}%`,
      height: `${box.heightPct}%`,
      boxSizing: "border-box",
      padding: "2px 4px",
      fontSize: Math.max(9, Math.round(basePx * fontScale)),
      lineHeight,
      fontWeight: 500,
      color,
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      whiteSpace: "pre-wrap",
      overflow: "hidden",
      textAlign: "left",
      zIndex: 2,
    };
  };

  const fieldRowsTop: { am: FieldKey; en: FieldKey; label: string }[] = [
    { am: "ownerCompanyAm", en: "ownerCompanyEn", label: "Owner / Company name" },
    { am: "nationalityAm", en: "nationalityEn", label: "Nationality" },
    { am: "tradeNameAm", en: "tradeNameEn", label: "Trade name" },
    { am: "gmNameAm", en: "gmNameEn", label: "General manager name" },
  ];

  const addressSubRows: { am: FieldKey; en: FieldKey; label: string }[] = [
    { am: "regionAm", en: "regionEn", label: "Region" },
    { am: "zoneAm", en: "zoneEn", label: "Lemi Kura (sub city)" },
    { am: "woredaAm", en: "woredaEn", label: "Woreda" },
    { am: "kebeleAm", en: "kebeleEn", label: "Kebele" },
    { am: "houseNoAm", en: "houseNoEn", label: "House No." },
  ];

  const fieldRowsBottom: { am: FieldKey; en: FieldKey; label: string }[] = [
    { am: "telAm", en: "telEn", label: "Tel. No." },
    { am: "emailAm", en: "emailEn", label: "E-mail" },
    { am: "capitalAm", en: "capitalEn", label: "Capital in ETB" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Business License Editor</h1>
        <p className="text-gray-400 font-bold text-sm mt-2">
          Upload the original scan first. Edit nationality (between owner and trade), region and address lines in both
          languages. Default region matches <span className="text-gray-600">{FIXED_CITY_EN}</span> /{" "}
          <span className="text-gray-600">{FIXED_CITY_AM}</span>; adjust vertical offset if the preview does not match your image.
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
                Edit
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            <div
              className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8 ${
                activeTab === "edit" ? "" : "hidden"
              } xl:block`}
            >
              <h2 className="text-xl font-black text-gray-800 tracking-tight mb-4">Bilingual fields</h2>

              <div className="space-y-6">
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

                {fieldRowsTop.map((row) => (
                  <div key={row.label} className="border border-gray-100 rounded-3xl p-4 bg-gray-50/40">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">{row.label}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400">አማርኛ</label>
                        <textarea
                          value={fields[row.am]}
                          onChange={(e) => setField(row.am, e.target.value)}
                          rows={2}
                          className="mt-1 w-full bg-white border-2 border-gray-100 rounded-2xl px-3 py-2 text-gray-800 text-sm font-semibold focus:outline-none focus:border-[#8cc63f]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400">English</label>
                        <textarea
                          value={fields[row.en]}
                          onChange={(e) => setField(row.en, e.target.value)}
                          rows={2}
                          className="mt-1 w-full bg-white border-2 border-gray-100 rounded-2xl px-3 py-2 text-gray-800 text-sm font-semibold focus:outline-none focus:border-[#8cc63f]"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="border border-gray-100 rounded-3xl p-4 bg-gray-50/40">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Business address</p>
                  {addressSubRows.map((row, i) => (
                    <div
                      key={row.label}
                      className={i > 0 ? "border-t border-gray-100 pt-4 mt-4" : ""}
                    >
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">{row.label}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400">አማርኛ</label>
                          <input
                            type="text"
                            value={fields[row.am]}
                            onChange={(e) => setField(row.am, e.target.value)}
                            className="mt-1 w-full bg-white border-2 border-gray-100 rounded-2xl px-3 py-2 text-gray-800 text-sm font-semibold focus:outline-none focus:border-[#8cc63f]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400">English</label>
                          <input
                            type="text"
                            value={fields[row.en]}
                            onChange={(e) => setField(row.en, e.target.value)}
                            className="mt-1 w-full bg-white border-2 border-gray-100 rounded-2xl px-3 py-2 text-gray-800 text-sm font-semibold focus:outline-none focus:border-[#8cc63f]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {fieldRowsBottom.map((row) => (
                  <div key={row.label} className="border border-gray-100 rounded-3xl p-4 bg-gray-50/40">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">{row.label}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400">አማርኛ</label>
                        <textarea
                          value={fields[row.am]}
                          onChange={(e) => setField(row.am, e.target.value)}
                          rows={2}
                          className="mt-1 w-full bg-white border-2 border-gray-100 rounded-2xl px-3 py-2 text-gray-800 text-sm font-semibold focus:outline-none focus:border-[#8cc63f]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400">English</label>
                        <textarea
                          value={fields[row.en]}
                          onChange={(e) => setField(row.en, e.target.value)}
                          rows={2}
                          className="mt-1 w-full bg-white border-2 border-gray-100 rounded-2xl px-3 py-2 text-gray-800 text-sm font-semibold focus:outline-none focus:border-[#8cc63f]"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-gray-50/60 border border-gray-100 rounded-3xl p-4 space-y-4">
                  <p className="text-gray-800 font-black text-sm">Typography</p>
                  <label className="text-xs font-bold text-gray-500 block">
                    Global vertical offset (%)
                    <input
                      type="number"
                      step={0.5}
                      value={globalTopOffsetPct}
                      onChange={(e) => setGlobalTopOffsetPct(Number(e.target.value) || 0)}
                      className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-gray-500">
                      Font scale
                      <input
                        type="number"
                        step={0.05}
                        value={fontScale}
                        onChange={(e) => setFontScale(Number(e.target.value) || 1)}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-500">
                      Line height
                      <input
                        type="number"
                        step={0.05}
                        value={lineHeight}
                        onChange={(e) => setLineHeight(Number(e.target.value) || 1.2)}
                        className="mt-1 w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-gray-500 block">
                      Text color (አማርኛ)
                      <input
                        type="color"
                        value={textColorAm}
                        onChange={(e) => setTextColorAm(e.target.value)}
                        className="mt-2 h-10 w-full rounded-xl border border-gray-200 bg-white p-1"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-500 block">
                      Text color (English)
                      <input
                        type="color"
                        value={textColorEn}
                        onChange={(e) => setTextColorEn(e.target.value)}
                        className="mt-2 h-10 w-full rounded-xl border border-gray-200 bg-white p-1"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex flex-col items-center ${activeTab === "preview" ? "" : "hidden"} xl:flex`}>
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8 w-full flex flex-col items-center">
                <h2 className="text-xl font-black text-gray-800 tracking-tight mb-5">Preview</h2>

                <div className="w-full overflow-x-auto">
                  <div
                    className="relative bg-white rounded-4xl border border-gray-100 overflow-visible min-w-[800px]"
                    ref={receiptWrapRef}
                    style={{ width: previewW, height: previewH }}
                    aria-label="Business license preview"
                  >
                    <img
                      src={templateUrl}
                      alt="Business license template"
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
                      {OVERLAY_KEYS.map((key: LayoutKey) => (
                        <div key={key} style={overlayTextStyle(key)}>
                          {overlayText(key)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {templateNaturalSize && (templateNaturalSize.w !== REFERENCE_W || templateNaturalSize.h !== REFERENCE_H) && (
                  <p className="text-[11px] text-amber-600 font-bold mt-3 text-center">
                    Template size is {templateNaturalSize.w}x{templateNaturalSize.h}. Overlays use percentage layout; adjust
                    vertical offset if lines misalign.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 w-full mt-5">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={busy || !canGenerate}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-3xl transition-all active:scale-[0.98] shadow-lg shadow-gray-900/20 text-sm uppercase tracking-widest disabled:opacity-60"
                  >
                    {busy ? "Exporting..." : "Download image"}
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
