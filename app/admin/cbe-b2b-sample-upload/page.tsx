"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";

const DEFAULT_COLLECTION = "cbe_b2b_sample";
const TEMPLATE_DOC_ID = "template";
const TEMPLATE_SUBCOLLECTION = "templates";

export default function CbeB2BSampleUploadPage() {
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; templateUrl: string; templateName?: string }>>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    const templatesSnap = await getDocs(collection(db, DEFAULT_COLLECTION, TEMPLATE_DOC_ID, TEMPLATE_SUBCOLLECTION));
    const items = templatesSnap.docs
      .map((d) => {
        const data = d.data() as { templateUrl?: string; templateName?: string; createdAt?: Timestamp | null };
        if (!data.templateUrl) return null;
        const createdAtMillis = data.createdAt?.toMillis() ?? 0;
        return { id: d.id, templateUrl: data.templateUrl, templateName: data.templateName, createdAtMillis };
      })
      .filter(Boolean) as Array<{ id: string; templateUrl: string; templateName?: string; createdAtMillis: number }>;

    items.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
    return items.map((t) => ({ id: t.id, templateUrl: t.templateUrl, templateName: t.templateName }));
  };

  const loadTemplates = async () => {
    const items = await fetchTemplates();
    setTemplates(items);
    return items;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, DEFAULT_COLLECTION, TEMPLATE_DOC_ID));
        if (snap.exists()) {
          const data = snap.data() as { templateUrl?: string };
          setTemplateUrl(data.templateUrl ?? null);
        }
        await loadTemplates();
      } catch (e) {
        console.error("Failed to load CBE B2B template:", e);
      }
    };
    load();
  }, []);

  const handleDeleteTemplate = async (id: string) => {
    const item = templates.find((t) => t.id === id);
    if (!item) return;
    const ok = window.confirm(`Delete template "${item.templateName ?? id}"?`);
    if (!ok) return;

    try {
      setDeletingId(id);
      await deleteDoc(doc(db, DEFAULT_COLLECTION, TEMPLATE_DOC_ID, TEMPLATE_SUBCOLLECTION, id));
      const remaining = await loadTemplates();

      if (templateUrl === item.templateUrl) {
        const next = remaining[0]?.templateUrl ?? null;
        setTemplateUrl(next);
        await setDoc(
          doc(db, DEFAULT_COLLECTION, TEMPLATE_DOC_ID),
          { kind: "template", templateUrl: next, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete template. Check console.");
    } finally {
      setDeletingId(null);
    }
  };

  const cloudinaryUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "pioneerbusiness");

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dk07dayip";
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!data?.secure_url) throw new Error("Cloudinary upload failed");
    return data.secure_url as string;
  };

  const handleUploadAndSave = async () => {
    if (!selectedFiles.length) {
      alert("Select at least one CBE Bank→Bank receipt template image first.");
      return;
    }

    setUploading(true);
    setSaving(false);
    try {
      let lastUploadedUrl: string | null = null;
      setSaving(true);

      for (const file of selectedFiles) {
        const uploadedUrl = await cloudinaryUpload(file);
        lastUploadedUrl = uploadedUrl;

        await setDoc(
          doc(db, DEFAULT_COLLECTION, TEMPLATE_DOC_ID),
          { kind: "template", templateUrl: uploadedUrl, updatedAt: serverTimestamp() },
          { merge: true }
        );

        await addDoc(collection(db, DEFAULT_COLLECTION, TEMPLATE_DOC_ID, TEMPLATE_SUBCOLLECTION), {
          kind: "template",
          templateUrl: uploadedUrl,
          templateName: file.name,
          createdAt: serverTimestamp(),
        });
      }

      if (lastUploadedUrl) setTemplateUrl(lastUploadedUrl);
      setSelectedFiles([]);
      setSaving(false);
      await loadTemplates();
      alert(`CBE Bank→Bank template(s) saved successfully: ${selectedFiles.length}`);
    } catch (e) {
      console.error(e);
      alert("Failed to upload/save. Check console.");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">CBE Bank→Bank Template Upload</h1>
        <p className="text-gray-400 font-bold text-sm mt-2">
          Upload CBE customer receipt template screenshot(s). Stored in Cloudinary; URLs saved to Firestore.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-black text-gray-800 tracking-tight mb-4">Upload Template Image(s)</h2>

          <label className="block w-full">
            <div className="border-4 border-dashed border-gray-200 rounded-[2rem] p-6 md:p-8 text-center cursor-pointer hover:border-[#8cc63f]/50 transition-colors">
              <div className="text-gray-500 font-black text-sm uppercase tracking-widest">Select Image(s)</div>
              <div className="text-xs text-gray-400 font-bold mt-2">PNG/JPG. Use the blank receipt template.</div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
              />
            </div>
          </label>

          <div className="mt-6 space-y-4">
            <button
              onClick={handleUploadAndSave}
              disabled={!selectedFiles.length || uploading || saving}
              className="w-full bg-[#8cc63f] hover:bg-[#7ab32f] text-white font-black py-4 rounded-[1.5rem] transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-[#8cc63f]/20 text-sm uppercase tracking-widest"
            >
              {uploading ? "Uploading..." : saving ? "Saving to Firestore..." : "Upload & Save Template(s)"}
            </button>

            {selectedFiles.length > 0 && (
              <p className="text-xs text-gray-500 font-bold break-all">Selected {selectedFiles.length} file(s)</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-black text-gray-800 tracking-tight mb-4">Current Stored Template</h2>

          {templateUrl ? (
            <div>
              <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-4">
                <img
                  src={templateUrl}
                  alt="CBE B2B template"
                  className="w-full max-w-[420px] mx-auto rounded-2xl border border-gray-100 object-contain"
                />
              </div>
              <p className="text-xs text-gray-500 font-bold mt-4 break-all">{templateUrl}</p>
            </div>
          ) : (
            <div className="text-center p-10">
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No template saved yet</p>
              <p className="text-gray-500 font-bold text-sm mt-2">
                Upload a template to enable the CBE Bank→Bank editor page.
              </p>
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-sm font-black text-gray-800 tracking-tight mb-3">Uploaded Templates</h3>
            {templates.length === 0 ? (
              <p className="text-xs text-gray-500 font-bold">No templates uploaded yet.</p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto space-y-3 pr-2">
                {templates.map((t) => (
                  <div key={t.id} className="bg-gray-50 border border-gray-100 rounded-[1.25rem] p-3">
                    <p className="text-[11px] text-gray-500 font-bold break-all">{t.templateName ? t.templateName : t.id}</p>
                    <div className="mt-2">
                      <img
                        src={t.templateUrl}
                        alt="CBE B2B uploaded template"
                        className="w-full max-w-[420px] rounded-xl border border-gray-100 object-contain"
                      />
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(t.id)}
                        disabled={deletingId === t.id}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-2 rounded-[1.25rem] transition-all active:scale-[0.98] disabled:opacity-60 text-sm uppercase tracking-widest"
                      >
                        {deletingId === t.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

