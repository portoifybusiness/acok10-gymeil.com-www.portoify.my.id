/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Rect, Circle, Text as KonvaText, Image as KonvaImage, Transformer } from "react-konva";
import { 
  LayoutDashboard, 
  UploadCloud, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit, 
  Activity, 
  Check, 
  X, 
  ToggleLeft, 
  ToggleRight, 
  RefreshCw,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Award,
  DollarSign,
  Search,
  Eye,
  Briefcase,
  FileText,
  Mail,
  Upload,
  Megaphone,
  Menu,
  ChevronLeft,
  ChevronRight,
  Palette
} from "lucide-react";
import { User, Template, ActivityLog, ServicePackage } from "../types";
import JSZip from "jszip";

interface AdminDashboardProps {
  currentUser: any;
  onLogout: () => void;
}

// --- HELPER UNTUK TATA LETAK DINAMIS ---
function estimateTextHeight(text: string, fontSize: number, fontFamily: string, width: number, lineHeight: number) {
  if (!text) return 0;
  
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  try {
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d');
  } catch (e) {
    // fallback
  }
  
  if (context) {
    context.font = `${fontSize}px "${fontFamily}"`;
  }
  
  const paragraphs = text.split('\n');
  if (!width) {
    return paragraphs.length * fontSize * lineHeight;
  }
  
  let totalLines = 0;
  for (const para of paragraphs) {
    if (para.trim() === "") {
      totalLines += 1;
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = "";
    let paraLines = 0;
    
    for (const word of words) {
      if (!word) continue;
      const testLine = currentLine ? currentLine + " " + word : word;
      let isOver = false;
      if (context) {
        const metrics = context.measureText(testLine);
        isOver = metrics.width > width;
      } else {
        isOver = (testLine.length * (fontSize * 0.55)) > width;
      }
      
      if (isOver && currentLine !== "") {
        paraLines++;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      paraLines++;
    }
    totalLines += Math.max(1, paraLines);
  }
  
  return totalLines * fontSize * lineHeight;
}

function getElementHeight(el: any, textMapping: Record<string, string>): number {
  if (el.type === "circle") {
    return (el.radius || el.width / 2 || 40) * 2;
  }
  if (el.type === "rect") {
    return el.height || 120;
  }
  if (el.type === "image") {
    return el.height || 120;
  }
  if (el.type === "text") {
    let textStr = el.text || "";
    if (textMapping) {
      Object.entries(textMapping).forEach(([key, value]) => {
        textStr = textStr.split(key).join(value || "");
      });
    }
    
    const fontSize = el.fontSize || 12;
    const fontFamily = el.fontFamily || "Inter";
    const width = el.width;
    const lineHeight = el.lineHeight || 1.2;
    
    return estimateTextHeight(textStr, fontSize, fontFamily, width, lineHeight);
  }
  return 0;
}

const resolveElementLayout = (
  elId: string, 
  elements: any[], 
  resolved: Record<string, { y: number; height: number }>,
  textMapping: Record<string, string>,
  visited: Set<string> = new Set()
): { y: number; height: number } => {
  if (resolved[elId]) {
    return resolved[elId];
  }
  
  const el = elements.find(item => item.id === elId);
  if (!el) {
    return { y: 0, height: 0 };
  }
  
  if (visited.has(elId)) {
    return { y: el.y, height: getElementHeight(el, textMapping) };
  }
  visited.add(elId);
  
  let finalY = el.y;
  let finalHeight = getElementHeight(el, textMapping);
  
  if (el.relativeTo) {
    const parent = elements.find(item => item.id === el.relativeTo);
    if (parent) {
      const parentResolved = resolveElementLayout(parent.id, elements, resolved, textMapping, visited);
      const gap = el.relativeGap !== undefined ? el.relativeGap : 15;
      finalY = parentResolved.y + parentResolved.height + gap;
    }
  }
  
  resolved[elId] = { y: finalY, height: finalHeight };
  return resolved[elId];
};

function getResolvedCanvasElements(elements: any[], textMapping: Record<string, string>) {
  const resolved: Record<string, { y: number; height: number }> = {};
  
  elements.forEach(el => {
    resolveElementLayout(el.id, elements, resolved, textMapping);
  });
  
  return elements.map(el => {
    const res = resolved[el.id];
    if (res) {
      return {
        ...el,
        y: res.y
      };
    }
    return el;
  });
}
// ----------------------------------------

export default function AdminDashboard({ currentUser, onLogout }: AdminDashboardProps) {
  // Local secure fetch interceptor to automatically attach JWT authorization tokens on cPanel live server
  // and handle Method Tunneling (overriding PUT/DELETE with POST) for high compatibility on strict cPanel environments
  const fetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
    const rawHeaders: Record<string, string> = {};
    if (options.headers) {
      if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          rawHeaders[key] = value;
        });
      } else if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          rawHeaders[key] = value;
        });
      } else {
        Object.assign(rawHeaders, options.headers);
      }
    }
    if (currentUser?.token) {
      rawHeaders["Authorization"] = `Bearer ${currentUser.token}`;
    }

    let finalUrl = url;
    const finalOptions = { ...options };

    const targetMethod = options.method ? options.method.toUpperCase() : "GET";
    if (targetMethod === "PUT" || targetMethod === "DELETE") {
      finalOptions.method = "POST";
      rawHeaders["X-HTTP-Method-Override"] = targetMethod;
      
      // Append _method query parameter to bypass strict hosting filters
      const urlStr = url.toString();
      const delimiter = urlStr.includes("?") ? "&" : "?";
      finalUrl = `${urlStr}${delimiter}_method=${targetMethod}`;
    }

    return window.fetch(finalUrl, { ...finalOptions, headers: rawHeaders });
  };

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isSidebarMinimized, setIsSidebarMinimized] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isUploadGroupOpen, setIsUploadGroupOpen] = useState<boolean>(true);

  // Admin CV Editor States ("Buat Desain CV")
  const [cvCanvasElements, setCvCanvasElements] = useState<any[]>([]);
  const [cvSelectedElementId, setCvSelectedElementId] = useState<string | null>(null);
  const [cvElementTextVal, setCvElementTextVal] = useState("");
  const [cvElementFontSize, setCvElementFontSize] = useState(14);
  const [cvElementColorVal, setCvElementColorVal] = useState("#1e293b");
  const [cvElementFontStyle, setCvElementFontStyle] = useState("normal"); // 'normal' | 'bold' | 'italic'
  const [cvElementWidth, setCvElementWidth] = useState(150);
  const [cvElementHeight, setCvElementHeight] = useState(50);
  const [cvElementWrapMode, setCvElementWrapMode] = useState("front");
  const [cvCanvasBgColor, setCvCanvasBgColor] = useState("#ffffff");
  const [cvCanvasScale, setCvCanvasScale] = useState(0.65);
  const [cvZoomMode, setCvZoomMode] = useState<"auto" | "manual">("auto");
  const [cvDoubleClickEditingId, setCvDoubleClickEditingId] = useState<string | null>(null);
  const [cvElementFontFamily, setCvElementFontFamily] = useState("Inter");
  const [cvElementLineHeight, setCvElementLineHeight] = useState(1.2);
  const [cvElementAlign, setCvElementAlign] = useState("left");
  const [cvCanvasHistory, setCvCanvasHistory] = useState<any[][]>([]);
  const [cvCanvasHistoryIndex, setCvCanvasHistoryIndex] = useState<number>(-1);

  // States to publish / edit designs
  const [cvTplName, setCvTplName] = useState("");
  const [cvTplTier, setCvTplTier] = useState<"free" | "basic" | "standard" | "premium">("basic");
  const [cvTplDescription, setCvTplDescription] = useState("");
  const [cvTplPreviewUrl, setCvTplPreviewUrl] = useState("");
  const [cvIsPublishing, setCvIsPublishing] = useState(false);
  const [cvImportJsonInput, setCvImportJsonInput] = useState("");
  const [cvFileError, setCvFileError] = useState("");

  const handleCvTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 10MB limit (compressed client-side anyway)
    if (file.size > 10 * 1024 * 1024) {
      setCvFileError("Ukuran file terlalu besar! Maksimal 10 MB.");
      setCvTplPreviewUrl("");
      return;
    }

    setCvFileError("");
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        setCvFileError("Mengompresi gambar...");
        const compressed = await compressImageBase64(reader.result as string, 800, 0.75);
        setCvTplPreviewUrl(compressed);
        setCvFileError("");
      } catch (err) {
        setCvTplPreviewUrl(reader.result as string);
        setCvFileError("");
      }
    };
    reader.readAsDataURL(file);
  };

  const cvStageRef = useRef<any>(null);
  const cvTransformerRef = useRef<any>(null);
  const adminTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cvCanvasContainerRef = useRef<HTMLDivElement>(null);

  // Admin fetched state
  const [stats, setStats] = useState<any>({
    totalRevenue: 15400000,
    monthlyEarnings: 3750000,
    newMembersThisMonthCount: 15,
    packageStats: { pkg_basic: 2, pkg_standard: 1, pkg_premium: 1 },
    activeMembersCount: 1250,
    templatesCount: 12,
    salesHistory: [],
    logs: []
  });
  const [users, setUsers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);

  // Feedback notifications
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Upload Template Form
  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState<"portfolio" | "resume" | "cover_letter">("portfolio");
  const [tplHtml, setTplHtml] = useState("");
  const [tplTier, setTplTier] = useState<"free" | "basic" | "standard" | "premium">("basic");
  const [tplPreviewUrl, setTplPreviewUrl] = useState("");
  const [tplDescription, setTplDescription] = useState("");
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [tplFileError, setTplFileError] = useState("");

  // Upload Lamaran (Word/Docx Template) State
  const [lamaranName, setLamaranName] = useState("");
  const [lamaranTier, setLamaranTier] = useState<"free" | "basic" | "standard" | "premium">("basic");
  const [lamaranPreviewUrl, setLamaranPreviewUrl] = useState("");
  const [lamaranDescription, setLamaranDescription] = useState("");
  const [lamaranDocxBase64, setLamaranDocxBase64] = useState("");
  const [lamaranFileName, setLamaranFileName] = useState("");
  const [detectedLamaranTags, setDetectedLamaranTags] = useState<string[]>([]);
  const [lamaranFileError, setLamaranFileError] = useState("");
  const [editingLamaranTplId, setEditingLamaranTplId] = useState<string | null>(null);

  // Target preview image modal for .docx templates
  const [adminPreviewImageModalUrl, setAdminPreviewImageModalUrl] = useState<string | null>(null);
  const [adminPreviewImageModalTitle, setAdminPreviewImageModalTitle] = useState<string>("");







  // RCV State (Revisi 1: Upload Resume/CV)
  const [rcvName, setRcvName] = useState("");
  const [rcvTier, setRcvTier] = useState<"free" | "basic" | "standard" | "premium">("basic");
  const [rcvPreviewUrl, setRcvPreviewUrl] = useState("");
  const [rcvDescription, setRcvDescription] = useState("");
  const [rcvJson, setRcvJson] = useState(JSON.stringify({
    width: 800,
    height: 1100,
    backgroundColor: "#ffffff",
    elements: [
      {
        type: "rect",
        x: 0,
        y: 0,
        width: 260,
        height: 1100,
        fill: "#1e293b",
        id: "sidebar_bg"
      },
      {
        type: "circle",
        x: 130,
        y: 120,
        radius: 60,
        fill: "#dc2626",
        id: "avatar_border"
      },
      {
        type: "text",
        text: "{{NAMA_LENGKAP}}",
        x: 280,
        y: 60,
        fontSize: 28,
        fontFamily: "Inter",
        fill: "#dc2626",
        fontStyle: "bold",
        id: "user_name"
      },
      {
        type: "text",
        text: "{{TITLE}}",
        x: 280,
        y: 100,
        fontSize: 16,
        fontFamily: "Inter",
        fill: "#475569",
        fontStyle: "italic",
        id: "user_title"
      },
      {
        type: "text",
        text: "TENTANG SAYA",
        x: 280,
        y: 140,
        fontSize: 14,
        fontFamily: "Inter",
        fill: "#1e293b",
        fontStyle: "bold",
        id: "about_title"
      },
      {
        type: "text",
        text: "{{TENTANG_SAYA}}",
        x: 280,
        y: 165,
        fontSize: 11,
        fontFamily: "Inter",
        fill: "#334155",
        width: 480,
        id: "about_content"
      },
      {
        type: "text",
        text: "INFO KONTAK",
        x: 20,
        y: 220,
        fontSize: 14,
        fontFamily: "Inter",
        fill: "#ffffff",
        fontStyle: "bold",
        id: "contact_title"
      },
      {
        type: "text",
        text: "Email:\n{{EMAIL}}\n\nNo. Telp:\n{{NOMOR_TELEPON}}\n\nWhatsApp:\n{{NOMOR_WHATSAPP}}\n\nAlamat:\n{{ALAMAT}}\n\nKota:\n{{KOTA}}",
        x: 20,
        y: 250,
        fontSize: 10,
        fontFamily: "Inter",
        fill: "#cbd5e1",
        width: 220,
        id: "contact_details"
      },
      {
        type: "text",
        text: "BIODATA",
        x: 20,
        y: 420,
        fontSize: 14,
        fontFamily: "Inter",
        fill: "#ffffff",
        fontStyle: "bold",
        id: "biodata_title"
      },
      {
        type: "text",
        text: "NIK: {{NIK}}\nTTL: {{TEMPAT_LAHIR}}, {{TANGGAL_LAHIR}}\nGender: {{JENIS_KELAMIN}}",
        x: 20,
        y: 450,
        fontSize: 10,
        fontFamily: "Inter",
        fill: "#cbd5e1",
        width: 220,
        id: "biodata_details"
      },
      {
        type: "text",
        text: "PENDIDIKAN",
        x: 280,
        y: 280,
        fontSize: 14,
        fontFamily: "Inter",
        fill: "#1e293b",
        fontStyle: "bold",
        id: "education_title"
      },
      {
        type: "text",
        text: "{{PENDIDIKAN}}",
        x: 280,
        y: 305,
        fontSize: 11,
        fontFamily: "Inter",
        fill: "#334155",
        width: 480,
        id: "education_content"
      },
      {
        type: "text",
        text: "PENGALAMAN KERJA",
        x: 280,
        y: 450,
        fontSize: 14,
        fontFamily: "Inter",
        fill: "#1e293b",
        fontStyle: "bold",
        id: "experience_title"
      },
      {
        type: "text",
        text: "{{PENGALAMAN_KERJA}}",
        x: 280,
        y: 475,
        fontSize: 11,
        fontFamily: "Inter",
        fill: "#334155",
        width: 480,
        id: "experience_content"
      },
      {
        type: "text",
        text: "PROYEK & KEAHLIAN",
        x: 280,
        y: 700,
        fontSize: 14,
        fontFamily: "Inter",
        fill: "#1e293b",
        fontStyle: "bold",
        id: "project_title"
      },
      {
        type: "text",
        text: "Proyek:\n{{PROYEK}}\n\nKeahlian:\n{{KEAHLIAN}}\n\nSertifikat:\n{{SERTIFIKAT}}",
        x: 280,
        y: 725,
        fontSize: 11,
        fontFamily: "Inter",
        fill: "#334155",
        width: 480,
        id: "project_content"
      }
    ]
  }, null, 2));

  const handleRcvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressImageBase64(reader.result as string, 800, 0.75);
        setRcvPreviewUrl(compressed);
      } catch (err) {
        setRcvPreviewUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleJsonUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setRcvJson(JSON.stringify(parsed, null, 2));
      } catch (err) {
        alert("File .json yang diupload tidak valid!");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveRcvTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rcvName || !rcvJson) {
      return showFeedback("Nama Template Desain & Struktur JSON wajib dilengkapi.");
    }
    try {
      JSON.parse(rcvJson);
    } catch (err) {
      return showFeedback("Format JSON salah! Harap periksa struktur kode JSON Anda.");
    }

    showFeedback();
    try {
      const resp = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: rcvName, 
          category: "resume",
          htmlMarkup: rcvJson,
          tier: rcvTier,
          previewUrl: rcvPreviewUrl || "https://images.unsplash.com/photo-1586282391129-76a6df230234?auto=format&fit=crop&q=80&w=1600",
          description: rcvDescription || "Template Resume berbasis desain Canva interaktif."
        })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", "Template Resume JSON '" + rcvName + "' berhasil diupload dan disimpan ke tabel templates!");
      setRcvName("");
      setRcvTier("basic");
      setRcvPreviewUrl("");
      setRcvDescription("");
      loadAdminData();
    } catch (e) {
      showFeedback("Koneksi gagal.");
    }
  };

  // =========================================
  // ADMIN CANVAS ENGINE: UTILITIES & EFFECTS ("Buat Desain CV")
  // =========================================
  const [cvEditingTemplateId, setCvEditingTemplateId] = useState<string | null>(null);

  const updateCvElementsAndHistory = (newElements: any[]) => {
    const cloned = JSON.parse(JSON.stringify(newElements));
    const nextHistory = cvCanvasHistory.slice(0, cvCanvasHistoryIndex + 1);
    nextHistory.push(cloned);
    setCvCanvasHistory(nextHistory);
    setCvCanvasHistoryIndex(nextHistory.length - 1);
    setCvCanvasElements(cloned);
  };

  const handleCvUndo = () => {
    if (cvCanvasHistoryIndex > 0) {
      const prevIndex = cvCanvasHistoryIndex - 1;
      setCvCanvasHistoryIndex(prevIndex);
      setCvCanvasElements(JSON.parse(JSON.stringify(cvCanvasHistory[prevIndex])));
      setCvSelectedElementId(null);
    }
  };

  const handleCvRedo = () => {
    if (cvCanvasHistoryIndex < cvCanvasHistory.length - 1) {
      const nextIndex = cvCanvasHistoryIndex + 1;
      setCvCanvasHistoryIndex(nextIndex);
      setCvCanvasElements(JSON.parse(JSON.stringify(cvCanvasHistory[nextIndex])));
      setCvSelectedElementId(null);
    }
  };

  const getCvSortedCanvasElements = () => {
    return [...cvCanvasElements].sort((a, b) => {
      const getWeight = (el: any) => {
        const mode = el.wrapMode || (el.type === "text" ? "front" : "behind");
        if (mode === "behind") return -2;
        if (el.type === "text") return 1;
        if (mode === "front") return 2;
        return 0; // standard shape layer weights
      };
      const weightA = getWeight(a);
      const weightB = getWeight(b);
      if (weightA !== weightB) return weightA - weightB;
      return cvCanvasElements.indexOf(a) - cvCanvasElements.indexOf(b);
    });
  };

  const handleElementDragEnd = (elId: string, dragX: number, dragY: number) => {
    const el = cvCanvasElements.find(item => item.id === elId);
    if (!el) return;
    
    let nextY = dragY;
    let nextGap = el.relativeGap;
    
    if (el.relativeTo) {
      const parent = cvCanvasElements.find(item => item.id === el.relativeTo);
      if (parent) {
        const resolved = getResolvedCanvasElements(cvCanvasElements, {});
        const parentResolved = resolved.find(item => item.id === parent.id);
        const parentY = parentResolved ? parentResolved.y : parent.y;
        const parentHeight = getElementHeight(parent, {});
        nextGap = Math.round(dragY - (parentY + parentHeight));
      }
    }
    
    const updated = cvCanvasElements.map(item => 
      item.id === elId 
        ? { ...item, x: dragX, y: nextY, relativeGap: nextGap } 
        : item
    );
    updateCvElementsAndHistory(updated);
  };

  const handleElementTransformEnd = (elId: string, dragX: number, dragY: number, sizeAttrs: any) => {
    const el = cvCanvasElements.find(item => item.id === elId);
    if (!el) return;
    
    let nextY = dragY;
    let nextGap = el.relativeGap;
    
    if (el.relativeTo) {
      const parent = cvCanvasElements.find(item => item.id === el.relativeTo);
      if (parent) {
        const resolved = getResolvedCanvasElements(cvCanvasElements, {});
        const parentResolved = resolved.find(item => item.id === parent.id);
        const parentY = parentResolved ? parentResolved.y : parent.y;
        const parentHeight = getElementHeight(parent, {});
        nextGap = Math.round(dragY - (parentY + parentHeight));
      }
    }
    
    const updated = cvCanvasElements.map(item => 
      item.id === elId 
        ? { ...item, x: dragX, y: nextY, relativeGap: nextGap, ...sizeAttrs } 
        : item
    );
    updateCvElementsAndHistory(updated);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!cvSelectedElementId) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const isEditable = target.isContentEditable || 
                           ["input", "textarea", "select"].includes(target.tagName.toLowerCase());
        if (isEditable) return;
      }

      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!keys.includes(e.key)) return;

      e.preventDefault();

      const step = e.shiftKey ? 10 : 1;
      const el = cvCanvasElements.find(item => item.id === cvSelectedElementId);
      if (!el) return;

      let nextX = el.x;
      let nextY = el.y;
      let nextGap = el.relativeGap !== undefined ? el.relativeGap : 15;

      if (e.key === "ArrowLeft") {
        nextX -= step;
      } else if (e.key === "ArrowRight") {
        nextX += step;
      } else if (e.key === "ArrowUp") {
        if (el.relativeTo) {
          nextGap -= step;
        } else {
          nextY -= step;
        }
      } else if (e.key === "ArrowDown") {
        if (el.relativeTo) {
          nextGap += step;
        } else {
          nextY += step;
        }
      }

      const updated = cvCanvasElements.map(item =>
        item.id === cvSelectedElementId
          ? { ...item, x: nextX, y: nextY, relativeGap: nextGap }
          : item
      );
      updateCvElementsAndHistory(updated);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cvSelectedElementId, cvCanvasElements]);

  const initCvCanvasTemplate = (elements: any[], templateId: string | null = null, bgColor = "#ffffff") => {
    const cloned = JSON.parse(JSON.stringify(elements));
    setCvCanvasElements(cloned);
    setCvCanvasHistory([cloned]);
    setCvCanvasHistoryIndex(0);
    setCvCanvasBgColor(bgColor);
    setCvSelectedElementId(null);
    setCvEditingTemplateId(templateId);
  };

  // Sync canvas scale automatically
  useEffect(() => {
    const el = cvCanvasContainerRef.current;
    if (!el) return;

    const updateScale = () => {
      if (cvZoomMode === "manual") return;
      if (cvCanvasContainerRef.current) {
        const padding = window.innerWidth < 640 ? 24 : 48; // spacing offsets
        const parentWidth = cvCanvasContainerRef.current.clientWidth - padding;
        const newScale = Math.min(1.2, Math.max(0.15, parentWidth / 800));
        setCvCanvasScale(newScale);
      }
    };

    updateScale();
    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(el);

    window.addEventListener("resize", updateScale);
    const t1 = setTimeout(updateScale, 50);
    const t2 = setTimeout(updateScale, 250);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeTab, cvZoomMode, cvCanvasElements.length]);

  // Sync Konva Transformer selection
  useEffect(() => {
    if (cvTransformerRef.current && cvStageRef.current) {
      if (cvSelectedElementId) {
        const node = cvStageRef.current.findOne("#" + cvSelectedElementId);
        if (node) {
          cvTransformerRef.current.nodes([node]);
          const layer = cvTransformerRef.current.getLayer();
          if (layer) {
            layer.batchDraw();
          }
        } else {
          cvTransformerRef.current.nodes([]);
        }
      } else {
        cvTransformerRef.current.nodes([]);
      }
    }
  }, [cvSelectedElementId, cvCanvasElements]);

  // Create starting canvas base blueprint if elements is empty
  useEffect(() => {
    if (activeTab === "buat-desain-cv" && cvCanvasElements.length === 0) {
      // Create fresh default template nodes
      const defaults = [
        {
          type: "rect",
          id: "sidebar_bg",
          x: 0,
          y: 0,
          width: 250,
          height: 1100,
          fill: "#1e293b",
          wrapMode: "behind"
        },
        {
          type: "circle",
          id: "avatar_border",
          x: 125,
          y: 120,
          radius: 55,
          fill: "#e2e8f0",
          wrapMode: "front"
        },
        {
          type: "image",
          id: "profile_photo",
          x: 85,
          y: 80,
          width: 80,
          height: 80,
          shape: "circle",
          wrapMode: "front"
        },
        {
          type: "text",
          id: "un_nama",
          text: "{{NAMA_LENGKAP}}",
          x: 280,
          y: 60,
          fontSize: 26,
          fontFamily: "Inter",
          fill: "#0ea5e9",
          fontStyle: "bold",
          width: 480,
          lineHeight: 1.2,
          align: "left"
        },
        {
          type: "text",
          id: "un_title",
          text: "{{TITLE}}",
          x: 280,
          y: 100,
          fontSize: 14,
          fontFamily: "Inter",
          fill: "#64748b",
          fontStyle: "italic",
          width: 480,
          align: "left"
        },
        {
          type: "text",
          id: "hdr_tentang",
          text: "TENTANG SAYA",
          x: 280,
          y: 150,
          fontSize: 13,
          fontFamily: "Inter",
          fill: "#1e293b",
          fontStyle: "bold",
          width: 480,
          align: "left"
        },
        {
          type: "text",
          id: "un_tentang",
          text: "{{TENTANG_SAYA}}",
          x: 280,
          y: 175,
          fontSize: 10.5,
          fontFamily: "Inter",
          fill: "#475569",
          width: 485,
          align: "left"
        },
        {
          type: "text",
          id: "un_kontak",
          text: "KONTAK SAYA\n\n📞 {{TELEPON}}\n✉️ {{EMAIL}}\n📍 {{ALAMAT}}",
          x: 25,
          y: 220,
          fontSize: 11,
          fontFamily: "Inter",
          fill: "#ffffff",
          width: 200,
          align: "left"
        }
      ];
      initCvCanvasTemplate(defaults, null, "#ffffff");
      setCvTplName("Slate Minimalist Canvas");
      setCvTplDescription("Layout profesional modern dua-kolom dengan sidebar bernuansa gelap dan teks highlight.");
      setCvTplPreviewUrl("https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=1600");
    }
  }, [activeTab]);

  // Publish / Save layout template
  const handlePublishOrUpdateCvTemplate = async (publishAsNew = false) => {
    if (!cvTplName.trim()) {
      return showFeedback("Nama Desain wajib dilengkapi.");
    }
    
    setCvIsPublishing(true);
    showFeedback();

    const currentLayoutJson = JSON.stringify({
      backgroundColor: cvCanvasBgColor,
      width: 800,
      height: 1100,
      elements: cvCanvasElements
    });

    const isEditing = cvEditingTemplateId && !publishAsNew;
    const url = isEditing ? `/api/admin/templates/${cvEditingTemplateId}` : "/api/admin/templates";
    const method = isEditing ? "PUT" : "POST";

    try {
      const resp = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cvTplName,
          category: "resume",
          htmlMarkup: currentLayoutJson,
          tier: cvTplTier,
          previewUrl: cvTplPreviewUrl.trim() || "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=1600",
          description: cvTplDescription || "Template draf visual interaktif modern."
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        setCvIsPublishing(false);
        return showFeedback(data.message || "Gagal memproses template.");
      }

      showFeedback("", isEditing 
        ? `Template "${cvTplName}" berhasil diperbarui!` 
        : `Template baru "${cvTplName}" berhasil ditambahkan ke Katalog User!`
      );
      
      if (!isEditing) {
        // If we published as a new template, keep track of its ID if backend returned it
        if (data.template && data.template.id) {
          setCvEditingTemplateId(data.template.id);
        }
      }

      setCvIsPublishing(false);
      loadAdminData(); // refresh catalogs list!
    } catch (e: any) {
      setCvIsPublishing(false);
      showFeedback("Koneksi ditolak server.");
    }
  };

  const handleCvAddElement = (type: "rect" | "circle" | "text" | "image") => {
    let newEl: any = {
      id: `${type}_${Date.now()}`,
      type: type,
      x: 100,
      y: 100,
      wrapMode: "front"
    };

    if (type === "rect") {
      newEl = {
        ...newEl,
        width: 150,
        height: 100,
        fill: "#cbd5e1",
        wrapMode: "behind"
      };
    } else if (type === "circle") {
      newEl = {
        ...newEl,
        radius: 50,
        fill: "#e2e8f0",
        wrapMode: "behind"
      };
    } else if (type === "text") {
      newEl = {
        ...newEl,
        text: "Teks Baru Klik 2x",
        fontSize: 14,
        fontFamily: "Inter",
        fill: "#1e293b",
        fontStyle: "normal",
        width: 250,
        align: "left",
        lineHeight: 1.2
      };
    } else if (type === "image") {
      newEl = {
        ...newEl,
        width: 120,
        height: 120,
        url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
        shape: "circle",
        wrapMode: "front"
      };
    }

    updateCvElementsAndHistory([...cvCanvasElements, newEl]);
    setCvSelectedElementId(newEl.id);

    // Populate property fields immediately for easy edits
    setCvElementTextVal(newEl.text || "");
    setCvElementFontSize(newEl.fontSize || 14);
    setCvElementColorVal(newEl.fill || "#1e293b");
    setCvElementFontStyle(newEl.fontStyle || "normal");
    setCvElementWidth(newEl.width || 120);
    setCvElementHeight(newEl.height || 120);
    setCvElementWrapMode(newEl.wrapMode || "front");
    setCvElementFontFamily(newEl.fontFamily || "Inter");
    setCvElementLineHeight(newEl.lineHeight || 1.2);
    setCvElementAlign(newEl.align || "left");
  };

  // Manage Template Catalog Filter & Search States
  const [adminTplSearch, setAdminTplSearch] = useState("");
  const [adminTplCategoryFilter, setAdminTplCategoryFilter] = useState("all");

  // Manage Packages Form
  const [pkgName, setPkgName] = useState("");
  const [pkgPrice, setPkgPrice] = useState<number>(0);
  const [pkgDuration, setPkgDuration] = useState<number>(30);
  const [pkgFeaturesList, setPkgFeaturesList] = useState<string[]>(["", "", "", ""]);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgAccessPortfolio, setPkgAccessPortfolio] = useState<string>("all");
  const [pkgAccessResume, setPkgAccessResume] = useState<string>("all");
  const [pkgAccessLetter, setPkgAccessLetter] = useState<string>("all");
  const [pkgAccessUploadDocs, setPkgAccessUploadDocs] = useState<string>("all");
  const [deleteConfirmPkgId, setDeleteConfirmPkgId] = useState<string | null>(null);

  // Update Admin profile Form
  const [adminFullName, setAdminFullName] = useState(currentUser?.fullName || "Super Admin Portoify");
  const [adminUsername, setAdminUsername] = useState(currentUser?.email || "admin@portoify.com");
  const [adminPassword, setAdminPassword] = useState("");

  // Edit users state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [tempPackages, setTempPackages] = useState<Record<string, string>>({});
  const [tempEndDates, setTempEndDates] = useState<Record<string, string>>({});

  // 2-Step user deletion state
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserObj, setDeleteUserObj] = useState<any | null>(null);
  const [deleteStep, setDeleteStep] = useState<number>(1);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Search and Preview states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAdminPreview, setSelectedAdminPreview] = useState<Template | null>(null);

  // Iklan / Ad banner configuration states
  const [adsName, setAdsName] = useState("");
  const [adsScript, setAdsScript] = useState("");
  const [socialBarScript, setSocialBarScript] = useState("");
  const [bannerActive, setBannerActive] = useState<boolean>(true);
  const [socialActive, setSocialActive] = useState<boolean>(true);
  const [isSavingAds, setIsSavingAds] = useState(false);

  const loadAdsConfig = async () => {
    try {
      const res = await fetch("/api/ads");
      if (res.ok) {
        const data = await res.json();
        setAdsName(data.name || "");
        setAdsScript(data.script || "");
        setSocialBarScript(data.socialBarScript || "");
        setBannerActive(data.bannerActive !== false);
        setSocialActive(data.socialActive !== false);
      }
    } catch (err) {
      console.error("Gagal memuat konfigurasi iklan:", err);
    }
  };

  const handleSaveAds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingAds(true);
      setErrorMsg("");
      setSuccessMsg("");
      
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: adsName,
          script: adsScript,
          socialBarScript: socialBarScript,
          bannerActive: bannerActive,
          socialActive: socialActive
        })
      });
      
      const result = await res.json();
      if (res.ok) {
        setSuccessMsg(result.message || "Iklan berhasil disimpan!");
        if (result.ads) {
          setAdsName(result.ads.name || "");
          setAdsScript(result.ads.script || "");
          setSocialBarScript(result.ads.socialBarScript || "");
          setBannerActive(result.ads.bannerActive !== false);
          setSocialActive(result.ads.socialActive !== false);
        }
      } else {
        setErrorMsg(result.message || "Gagal menyimpan iklan.");
      }
    } catch (err: any) {
      setErrorMsg("Koneksi gagal saat menghubungi server.");
    } finally {
      setIsSavingAds(false);
    }
  };

  const loadAdminData = async () => {
    const safeJson = async (res: Response, fallback: any = null) => {
      try {
        if (!res.ok) return fallback;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await res.json();
        }
        return fallback;
      } catch {
        return fallback;
      }
    };

    try {
      setLoading(true);
      const [sRes, uRes, tRes, pRes] = await Promise.all([
        fetch("/api/admin/stats-summary"),
        fetch("/api/admin/users"),
        fetch("/api/templates"),
        fetch("/api/packages")
      ]);

      const [sData, uData, tData, pData] = await Promise.all([
        safeJson(sRes, { logs: [], numTemplates: 0, activeMembers: 0, totalRev: 0 }),
        safeJson(uRes, []),
        safeJson(tRes, []),
        safeJson(pRes, [])
      ]);

      const cleanedTemplates = tData.map((t: any) => ({
        ...t,
        name: t.name.replace(/\s*\(DOCX Word Template\)/gi, "")
      }));

      setStats(sData);
      setUsers(uData);
      setTemplates(cleanedTemplates);
      setPackages(pData);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    if (activeTab === "iklan") {
      loadAdsConfig();
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentUser?.email) {
      setAdminUsername(currentUser.email);
    }
    if (currentUser?.fullName) {
      setAdminFullName(currentUser.fullName);
    }
  }, [currentUser]);

  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg("");
        setSuccessMsg("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  const showFeedback = (err = "", succ = "") => {
    setErrorMsg(err);
    setSuccessMsg(succ);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const compressImageBase64 = (base64Str: string, maxDim: number = 800, quality: number = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith("data:image/")) {
        resolve(base64Str);
        return;
      }
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 10MB limit (compressed client-side anyway)
    if (file.size > 10 * 1024 * 1024) {
      setTplFileError("Ukuran file terlalu besar! Maksimal 10 MB.");
      setTplPreviewUrl("");
      return;
    }

    setTplFileError("");
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        setTplFileError("Mengompresi gambar untuk performa maksimal...");
        const compressed = await compressImageBase64(reader.result as string, 800, 0.75);
        setTplPreviewUrl(compressed);
        setTplFileError("");
      } catch (err) {
        setTplPreviewUrl(reader.result as string);
        setTplFileError("");
      }
    };
    reader.readAsDataURL(file);
  };

  // 1. UPLOAD TEMPLATE
  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName || !tplHtml) {
      return showFeedback("Nama template & Kode HTML wajib dilengkapi.");
    }

    showFeedback();
    try {
      const url = editingTplId ? `/api/admin/templates/${editingTplId}` : "/api/admin/templates";
      const method = editingTplId ? "PUT" : "POST";

      const resp = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: tplName, 
          category: tplCategory, 
          htmlMarkup: tplHtml,
          tier: tplTier,
          previewUrl: tplPreviewUrl || "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=1600",
          description: tplDescription
        })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      setTplName("");
      setTplHtml("");
      setTplTier("basic");
      setTplPreviewUrl("");
      setTplDescription("");
      setEditingTplId(null);
      loadAdminData();
    } catch (e) {
      showFeedback("Koneksi ditolak.");
    }
  };

  // EXTRACT & PROCESS DOCX TEMPLATES (Revisi 2)
  const extractDocxTags = async (arrayBuffer: ArrayBuffer): Promise<string[]> => {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docXmlFile = zip.file("word/document.xml");
      if (!docXmlFile) {
        throw new Error("File Word tidak valid atau tidak berisi word/document.xml");
      }
      const xmlText = await docXmlFile.async("text");
      
      const tagsFound = new Set<string>();

      // Strategy 1: Parse paragraphs and stitch w:t content in order (guarantees parity with preview rendering)
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const allElements = xmlDoc.getElementsByTagName("*");
      const pElements: Element[] = [];
      
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const localName = el.nodeName.toLowerCase().replace(/^.*:/, "");
        if (localName === "p") {
          pElements.push(el);
        }
      }
      
      for (const pEl of pElements) {
        let pText = "";
        const traverse = (node: Node) => {
          const localName = node.nodeName.toLowerCase().replace(/^.*:/, "");
          if (localName === "t") {
            pText += node.textContent || "";
          } else if (localName === "tab") {
            pText += "    "; // 4 spaces
          } else if (localName === "br") {
            pText += "\n";
          } else {
            for (let i = 0; i < node.childNodes.length; i++) {
              traverse(node.childNodes[i]);
            }
          }
        };
        traverse(pEl);
        
        const localTagRegex = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
        let tagMatch;
        while ((tagMatch = localTagRegex.exec(pText)) !== null) {
          tagsFound.add(tagMatch[1].toUpperCase());
        }
      }

      // Strategy 2: Strip all XML tags
      const strippedText = xmlText.replace(/<[^>]+>/g, "");
      const stripTagRegex = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
      let match;
      while ((match = stripTagRegex.exec(strippedText)) !== null) {
        tagsFound.add(match[1].toUpperCase());
      }
      
      // Strategy 3: Scan raw XML elements <w:t> content
      const wtRegex = /<(?:w:)?t[^>]*>([\s\S]*?)<\/(?:w:)?t>/g;
      let wtMatch;
      let wtCombinedText = "";
      while ((wtMatch = wtRegex.exec(xmlText)) !== null) {
        wtCombinedText += wtMatch[1];
      }
      
      const wtCombinedTagRegex = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
      let wtTagMatch;
      while ((wtTagMatch = wtCombinedTagRegex.exec(wtCombinedText)) !== null) {
        tagsFound.add(wtTagMatch[1].toUpperCase());
      }
      
      return Array.from(tagsFound);
    } catch (error) {
      console.error("Gagal membaca file docx:", error);
      return [];
    }
  };

  const handleLamaranDocxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      setLamaranFileError("Hanya menerima file Microsoft Word format .docx!");
      return;
    }

    setLamaranFileName(file.name);
    setLamaranFileError("");
    showFeedback();

    try {
      // 1. Array buffer for ZIP/tags reading
      const abReader = new FileReader();
      abReader.onload = async () => {
        const ab = abReader.result as ArrayBuffer;
        const tags = await extractDocxTags(ab);
        setDetectedLamaranTags(tags);
      };
      abReader.readAsArrayBuffer(file);

      // 2. DataURL/base64 for storage
      const b64Reader = new FileReader();
      b64Reader.onload = () => {
        const fullBase64 = b64Reader.result as string;
        setLamaranDocxBase64(fullBase64);
      };
      b64Reader.readAsDataURL(file);
    } catch (err) {
      setLamaranFileError("Gagal memproses file Word.");
    }
  };

  const handleLamaranPreviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLamaranFileError("Preview gambar maksimal berukuran 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImageBase64(reader.result as string, 400, 0.75);
        setLamaranPreviewUrl(compressed);
        setLamaranFileError("");
      } catch (err) {
        setLamaranPreviewUrl(reader.result as string);
        setLamaranFileError("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLamaranDocx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lamaranName) {
      return showFeedback("Nama template wajib diisi!");
    }
    if (!lamaranDocxBase64) {
      return showFeedback("Silakan upload file template Word (.docx) terlebih dahulu!");
    }

    showFeedback();
    try {
      const url = editingLamaranTplId ? `/api/admin/templates/${editingLamaranTplId}` : "/api/admin/templates";
      const method = editingLamaranTplId ? "PUT" : "POST";

      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: lamaranName, 
          category: "cover_letter", // save in cover_letter category for filter/selection
          htmlMarkup: lamaranDocxBase64, // holds base64 encoded docx file or current url
          tier: lamaranTier,
          previewUrl: lamaranPreviewUrl || "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=1600",
          description: lamaranDescription || (detectedLamaranTags.length > 0 ? `Template Word (.docx) dengan tag variabel terdeteksi: ${detectedLamaranTags.join(", ")}` : "Template Word (.docx) aktif.")
        })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", editingLamaranTplId ? "Template Surat Lamaran berhasil diperbarui!" : "Template Surat Lamaran format Word / DOCX berhasil diunggah ke Katalog!");
      setLamaranName("");
      setLamaranTier("basic");
      setLamaranPreviewUrl("");
      setLamaranDescription("");
      setLamaranDocxBase64("");
      setLamaranFileName("");
      setDetectedLamaranTags([]);
      setLamaranFileError("");
      setEditingLamaranTplId(null);
      loadAdminData();
    } catch (e) {
      showFeedback("Koneksi gagal.");
    }
  };





  const handleDeleteTemplate = async (templateId: string, name: string) => {
    showFeedback();
    if (!window.confirm(`Apakah Anda yakin ingin menghapus template "${name}" secara permanen? Tindakan ini tidak bisa dibatalkan!`)) {
      return;
    }

    try {
      const resp = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE"
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      if (editingTplId === templateId) {
        setEditingTplId(null);
        setTplName("");
        setTplHtml("");
        setTplTier("basic");
        setTplPreviewUrl("");
        setTplDescription("");
      }
      loadAdminData();
    } catch (e) {
      showFeedback("Gagal menghubungkan ke database.");
    }
  };

  // 2. TOGGLE USER STATUS
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    showFeedback();
    try {
      const resp = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", `Sukses mengubah status aktif pengguna di database secure.`);
      loadAdminData();
    } catch (e) {
      showFeedback("Terjadi kesalahan sistem database.");
    }
  };

  const handleChangeUserPackage = async (userId: string, packageId: string, endDate?: string) => {
    showFeedback();
    try {
      const resp = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, endDate })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      // Clean from tempPackages and tempEndDates selection once saved successfully
      setTempPackages(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      setTempEndDates(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });

      showFeedback("", `Akses langganan pengguna berhasil dimutakhirkan secara instan.`);
      loadAdminData();
    } catch (e) {
      showFeedback("Gagal mengubah paket langganan pengguna.");
    }
  };

  // 3. EDIT USER MODAL SUBMIT
  const handleSaveUserEdit = async (userId: string) => {
    showFeedback();
    try {
      const resp = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editUserName, email: editUserEmail })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      setEditingUserId(null);
      loadAdminData();
    } catch (e) {
      showFeedback("Error update.");
    }
  };

  // 4. DELETE USER COMPLETED (Triggers from 2nd Step of confirmation modal)
  const handleConfirmDeleteUser = async () => {
    if (!deleteUserId) return;
    showFeedback();

    try {
      const resp = await fetch(`/api/admin/users/${deleteUserId}`, {
        method: "DELETE"
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      setDeleteUserId(null);
      setDeleteUserObj(null);
      loadAdminData();
    } catch (e) {
      showFeedback("Terjadi kesalahan sistem saat menghapus akun pengguna.");
    }
  };

  // 5. PACKAGES CONTROLLERS (Add/Edit plan)
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    showFeedback();

    const bodyObj = {
      name: pkgName,
      price: pkgPrice,
      durationDays: pkgDuration,
      features: pkgFeaturesList.filter(f => f.trim() !== ""),
      accessPortfolio: pkgAccessPortfolio,
      accessResume: pkgAccessResume,
      accessLetter: pkgAccessLetter,
      accessUploadDocs: pkgAccessUploadDocs
    };

    try {
      let resp;
      if (editingPkgId) {
        resp = await fetch(`/api/admin/packages/${editingPkgId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyObj)
        });
      } else {
        resp = await fetch("/api/admin/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyObj)
        });
      }

      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      setPkgName("");
      setPkgPrice(0);
      setPkgDuration(30);
      setPkgFeaturesList(["", "", "", ""]);
      setPkgAccessPortfolio("all");
      setPkgAccessResume("all");
      setPkgAccessLetter("all");
      setPkgAccessUploadDocs("all");
      setEditingPkgId(null);
      loadAdminData();
    } catch (e) {
      showFeedback("Koneksi gagal.");
    }
  };

  const handleEditPackage = (pkg: ServicePackage) => {
    setEditingPkgId(pkg.id);
    setPkgName(pkg.name);
    setPkgPrice(pkg.price);
    setPkgDuration(pkg.durationDays);
    
    const rawFeatures = pkg.features as any;
    let loadedFeatures: string[] = Array.isArray(rawFeatures) ? [...rawFeatures] : (typeof rawFeatures === "string" ? rawFeatures.split(",").map((f: any) => f.trim()).filter(Boolean) : []);
    while (loadedFeatures.length < 4) {
      loadedFeatures.push("");
    }
    setPkgFeaturesList(loadedFeatures);
    
    // Backwards compatible fallback based on package type or existing values
    const defPortfolio = pkg.accessPortfolio || (pkg.id === "pkg_basic" ? "basic" : pkg.id === "pkg_standard" ? "standard" : "all");
    const defResume = pkg.accessResume || (pkg.id === "pkg_basic" ? "basic" : pkg.id === "pkg_standard" ? "standard" : "all");
    const defLetter = pkg.accessLetter || (pkg.id === "pkg_basic" ? "basic" : pkg.id === "pkg_standard" ? "standard" : "all");
    const defUpload = pkg.accessUploadDocs || (pkg.id === "pkg_basic" ? "none" : pkg.id === "pkg_standard" ? "restricted" : "all");

    setPkgAccessPortfolio(defPortfolio);
    setPkgAccessResume(defResume);
    setPkgAccessLetter(defLetter);
    setPkgAccessUploadDocs(defUpload);
    
    window.scrollTo({ top: 500, behavior: "smooth" });
  };

  const handleDeletePackage = async (pkgId: string) => {
    showFeedback();

    try {
      const resp = await fetch(`/api/admin/packages/${pkgId}`, {
        method: "DELETE"
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      loadAdminData();
    } catch (e) {
      showFeedback("Error delete.");
    }
  };

  // 6. UPDATE ADMIN USER DETAILS
  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    showFeedback();

    try {
      const resp = await fetch("/api/admin/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: adminFullName, username: adminUsername, password: adminPassword })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      setAdminPassword("");
    } catch (e) {
      showFeedback("Error update admin database.");
    }
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const name = u.fullName || "";
    const email = u.email || "";
    const id = u.id || "";
    const pkgNameStr = u.packageName || "";
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || id.toLowerCase().includes(q) || pkgNameStr.toLowerCase().includes(q);
  });

  const salesArray = (stats.sales && stats.sales.length > 0) ? stats.sales : [
    { month: "Jan", sales: 12400000 },
    { month: "Feb", sales: 14200000 },
    { month: "Mar", sales: 11800000 },
    { month: "Apr", sales: 15300000 },
    { month: "Mei", sales: 15400000 }
  ];

  const maxVal = Math.max(...salesArray.map((s: any) => parseFloat(s.sales || 0)), 1);
  const pointsCount = salesArray.length;

  const chartPoints = salesArray.map((s: any, i: number) => {
    const x = (i / Math.max(pointsCount - 1, 1)) * 500;
    const y = 130 - ((parseFloat(s.sales || 0) / maxVal) * 110);
    return { x, y, month: s.month };
  });

  let pathD = "";
  if (chartPoints.length > 0) {
    pathD = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      pathD += ` L ${chartPoints[i].x} ${chartPoints[i].y}`;
    }
  } else {
    pathD = "M 0 130 L 500 130";
  }

  const areaD = `${pathD} L 500 150 L 0 150 Z`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Sticky Top Header */}
      <header className="md:hidden bg-slate-900 border-b border-slate-950 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <img 
            src="https://i.ibb.co.com/ym8b3RFm/logo-portoify.png" 
            alt="Portoify Logo" 
            className="w-8 h-8 rounded-lg object-cover shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="font-display font-black text-lg text-white tracking-tight">Portoify</span>
            <span className="text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded ml-1.5 font-mono uppercase tracking-wider font-extrabold">Admin</span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-1.5 bg-slate-800 hover:bg-slate-705 active:bg-slate-800 text-slate-350 hover:text-white rounded-lg border border-slate-750 transition-colors"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Backdrop overlay for mobile sidebar */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ADMIN SIDEBAR BAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 p-4 border-r border-slate-950
        duration-300 transition-all ease-in-out overflow-y-auto
        md:sticky md:top-0 md:h-screen
        ${isSidebarMinimized ? "md:w-20" : "md:w-64"}
        ${isMobileSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="space-y-6">
          {/* Sidebar Brand Header */}
          <div className="flex items-center justify-between py-3 border-b border-slate-800">
            <div className={`flex items-center gap-2.5 overflow-hidden ${isSidebarMinimized ? "md:mx-auto md:w-10" : ""}`}>
              <img 
                src="https://i.ibb.co.com/ym8b3RFm/logo-portoify.png" 
                alt="Portoify Logo" 
                className="w-10 h-10 rounded-xl object-cover shadow-md shrink-0"
                referrerPolicy="no-referrer"
              />
              {!isSidebarMinimized && (
                <div className="animate-fadeIn">
                  <span className="font-display font-black text-xl text-white tracking-tight block">Portoify</span>
                  <p className="text-[10px] text-red-400 font-mono uppercase tracking-wider font-extrabold">Super Admin Panel</p>
                </div>
              )}
            </div>

            {/* Minimize Toggle Button (Visible on Desktop) */}
            {!isSidebarMinimized && (
              <button
                onClick={() => setIsSidebarMinimized(true)}
                className="hidden md:flex p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                title="Perkecil Menu"
              >
                <ChevronLeft className="w-4 h-4 text-red-400" />
              </button>
            )}
          </div>

          {/* Maximize Icon Button (Visible only when sidebar is minimized on desktop) */}
          {isSidebarMinimized && (
            <div className="hidden md:flex justify-center -mt-2 pb-2">
              <button
                onClick={() => setIsSidebarMinimized(false)}
                className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition"
                title="Perbesar Menu"
              >
                <ChevronRight className="w-4 h-4 text-red-400" />
              </button>
            </div>
          )}

          <nav className="space-y-1 text-sm font-semibold">
            
            <button
              onClick={() => { setActiveTab("dashboard"); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center px-1.5 py-3" : "gap-3 px-3.5 py-3"
              } ${activeTab === "dashboard" ? "bg-brand text-white shadow" : "hover:bg-slate-800"}`}
              title="Dashboard Admin"
            >
              <LayoutDashboard className="w-5 h-5 text-red-400 shrink-0" />
              <span className={isSidebarMinimized ? "md:hidden" : "inline animate-fadeIn"}>Dashboard Admin</span>
            </button>

            <button
              onClick={() => { setActiveTab("desain-aktif"); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center px-1.5 py-3" : "gap-3 px-3.5 py-3"
              } ${activeTab === "desain-aktif" ? "bg-brand text-white shadow" : "hover:bg-slate-800"}`}
              title="Desain Aktif"
            >
              <Palette className="w-5 h-5 text-red-100 shrink-0" />
              <span className={isSidebarMinimized ? "md:hidden font-bold" : "inline font-bold animate-fadeIn"}>Desain Aktif</span>
            </button>

            {/* BARU: MENU BUAT DESAIN CV (CANVAS GRAPHIC EDITOR) */}
            <button
              onClick={() => { setActiveTab("buat-desain-cv"); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center px-1.5 py-3" : "gap-3 px-3.5 py-3"
              } ${activeTab === "buat-desain-cv" ? "bg-amber-500 text-slate-900 font-extrabold shadow-md border border-amber-300" : "hover:bg-slate-800"}`}
              title="Buat Desain CV (Canvas)"
            >
              <Sparkles className={`w-5 h-5 shrink-0 ${activeTab === "buat-desain-cv" ? "text-slate-905" : "text-amber-400"}`} />
              <span className={isSidebarMinimized ? "md:hidden font-bold" : "inline font-bold animate-fadeIn text-xs uppercase tracking-wider"}>
                🎨 Buat Desain CV
              </span>
            </button>

            {/* COLLAPSIBLE SUB MENU: UPLOAD */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setIsUploadGroupOpen(!isUploadGroupOpen)}
                className={`w-full flex items-center justify-between rounded-xl transition cursor-pointer ${
                  isSidebarMinimized ? "md:justify-center px-1.5 py-3" : "px-3.5 py-3"
                } hover:bg-slate-800 text-slate-450`}
                title="Kelompok Upload"
              >
                <div className="flex items-center gap-3">
                  <UploadCloud className="w-5 h-5 text-slate-400 shrink-0" />
                  {!isSidebarMinimized && (
                    <span className="text-xxs font-black uppercase tracking-widest text-slate-400 animate-fadeIn">
                      Menu Upload
                    </span>
                  )}
                </div>
                {!isSidebarMinimized && (
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">
                    {isUploadGroupOpen ? "▲" : "▼"}
                  </span>
                )}
              </button>

              {isUploadGroupOpen && (
                <div className={`space-y-1 ${isSidebarMinimized ? "" : "pl-3 ml-4 border-l border-slate-800"}`}>
                  <button
                    onClick={() => { setActiveTab("upload-template"); setIsMobileSidebarOpen(false); }}
                    className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                      isSidebarMinimized ? "md:justify-center px-1.5 py-2.5" : "gap-2.5 px-3 py-2.5"
                    } ${activeTab === "upload-template" ? "bg-brand text-white shadow-sm" : "hover:bg-slate-805 text-slate-400 hover:text-white"}`}
                    title="Upload Portofolio"
                  >
                    <UploadCloud className="w-4 h-4 text-emerald-450 shrink-0" />
                    <span className={isSidebarMinimized ? "md:hidden text-xs" : "inline text-xs font-semibold animate-fadeIn"}>
                      Portofolio
                    </span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("upload-resume-cv"); setIsMobileSidebarOpen(false); }}
                    className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                      isSidebarMinimized ? "md:justify-center px-1.5 py-2.5" : "gap-2.5 px-3 py-2.5"
                    } ${activeTab === "upload-resume-cv" ? "bg-brand text-white shadow-sm" : "hover:bg-slate-805 text-slate-400 hover:text-white"}`}
                    title="Upload Resume/CV"
                  >
                    <Upload className="w-4 h-4 text-sky-455 shrink-0" />
                    <span className={isSidebarMinimized ? "md:hidden text-xs" : "inline text-xs font-semibold animate-fadeIn"}>
                      Resume/CV Canvas
                    </span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("upload-lamaran"); setIsMobileSidebarOpen(false); }}
                    className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                      isSidebarMinimized ? "md:justify-center px-1.5 py-2.5" : "gap-2.5 px-3 py-2.5"
                    } ${activeTab === "upload-lamaran" ? "bg-brand text-white shadow-sm" : "hover:bg-slate-805 text-slate-400 hover:text-white"}`}
                    title="Upload Lamaran"
                  >
                    <FileText className="w-4 h-4 text-pink-450 shrink-0" />
                    <span className={isSidebarMinimized ? "md:hidden text-xs" : "inline text-xs font-semibold animate-fadeIn"}>
                      Lamaran (Word)
                    </span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => { setActiveTab("kelola-user"); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center px-1.5 py-3" : "gap-3 px-3.5 py-3"
              } ${activeTab === "kelola-user" ? "bg-brand text-white shadow" : "hover:bg-slate-800"}`}
              title="Kelola Paket"
            >
              <Users className="w-5 h-5 text-red-400 shrink-0" />
              <span className={isSidebarMinimized ? "md:hidden" : "inline animate-fadeIn"}>Kelola Paket</span>
            </button>

            <button
              onClick={() => { setActiveTab("kelola-langganan"); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center px-1.5 py-3" : "gap-3 px-3.5 py-3"
              } ${activeTab === "kelola-langganan" ? "bg-brand text-white shadow" : "hover:bg-slate-800"}`}
              title="Langganan"
            >
              <Award className="w-5 h-5 text-red-400 shrink-0" />
              <span className={isSidebarMinimized ? "md:hidden" : "inline animate-fadeIn"}>Langganan</span>
            </button>

            <button
              onClick={() => { setActiveTab("statistik-penjualan"); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center px-1.5 py-3" : "gap-3 px-3.5 py-3"
              } ${activeTab === "statistik-penjualan" ? "bg-brand text-white shadow" : "hover:bg-slate-800"}`}
              title="Statistik & Penjualan"
            >
              <TrendingUp className="w-5 h-5 text-red-400 shrink-0" />
              <span className={isSidebarMinimized ? "md:hidden" : "inline animate-fadeIn"}>Statistik & Penjualan</span>
            </button>

            <button
              onClick={() => { setActiveTab("iklan"); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center px-1.5 py-3" : "gap-3 px-3.5 py-3"
              } ${activeTab === "iklan" ? "bg-brand text-white shadow" : "hover:bg-slate-800"}`}
              title="Iklan Banner Landing"
            >
              <Megaphone className="w-5 h-5 text-red-400 shrink-0" />
              <span className={isSidebarMinimized ? "md:hidden" : "inline animate-fadeIn"}>Iklan Banner Landing</span>
            </button>

            <button
              onClick={() => { setActiveTab("tag-variabel"); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center px-1.5 py-3" : "gap-3 px-3.5 py-3"
              } ${activeTab === "tag-variabel" ? "bg-brand text-white shadow" : "hover:bg-slate-800"}`}
              title="Tag Variabel"
            >
              <HelpCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span className={isSidebarMinimized ? "md:hidden" : "inline animate-fadeIn"}>Tag Variabel</span>
            </button>

            <button
              onClick={() => { setActiveTab("update-login"); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center rounded-xl transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center px-1.5 py-3" : "gap-3 px-3.5 py-3"
              } ${activeTab === "update-login" ? "bg-brand text-white shadow" : "hover:bg-slate-800"}`}
              title="Update Data Admin"
            >
              <Settings className="w-5 h-5 text-red-400 shrink-0" />
              <span className={isSidebarMinimized ? "md:hidden" : "inline animate-fadeIn"}>Update Data Admin</span>
            </button>

          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className={`w-full flex items-center rounded-xl transition cursor-pointer text-xs font-bold bg-slate-800 hover:bg-red-950/40 hover:text-red-400 ${
              isSidebarMinimized ? "md:justify-center px-1.5 py-2.5" : "gap-2.5 px-3.5 py-2.5"
            }`}
            title="Logout Admin"
          >
            <LogOut className="w-4 h-4 text-red-400 shrink-0" />
            <span className={isSidebarMinimized ? "md:hidden" : "inline animate-fadeIn"}>Logout Admin</span>
          </button>
        </div>
      </aside>

      {/* CONTENT INNER WORKBENCH */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        
        {/* Alerts display */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-800 flex items-center gap-3 text-sm font-semibold shadow-sm animate-fadeIn">
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl text-emerald-900 flex items-center gap-3 text-sm font-semibold shadow-sm animate-fadeIn">
            <span>{successMsg}</span>
          </div>
        )}

        {loading && (
          <div className="p-3 bg-white border border-slate-200.5 shadow-sm rounded-xl text-xs text-sky-700 font-semibold mb-6 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Sedang memutakhirkan modul admin di database cPanel Terenkripsi...
          </div>
        )}

        {/* =========================================
            ADMIN SECTION 1: PRIMARY DASHBOARD & USERS
           ========================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-display font-black text-slate-900">Selamat Datang, Super Admin!</h1>
              <p className="text-slate-500 text-sm mt-0.5">Pantau status kesehatan platform SaaS Portoify secara visual di bawah ini.</p>
            </div>

            {/* Admin Stats Blocks Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-brand flex items-center justify-center font-black">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-400 text-xxs block font-bold uppercase tracking-wider">Total Member Aktif</span>
                  <span className="text-2xl font-black text-slate-900 font-display">{stats.activeMembersCount?.toLocaleString() || "0"}</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-400 text-xxs block font-bold uppercase tracking-wider">Total Penjualan Bulanan</span>
                  <span className="text-2xl font-black text-slate-900 font-display">Rp {stats.totalRevenue?.toLocaleString() || "15.400.000"}</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-400 text-xxs block font-bold uppercase tracking-wider">Template Baru Ter-upload</span>
                  <span className="text-2xl font-black text-slate-900 font-display">{templates.length}</span>
                </div>
              </div>

            </div>

            {/* Monthly Sales Curve Chart visual area (Visual mockup illustration 4 inside) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-display font-black text-slate-900 text-base">Penjualan Paket Bulanan</h3>
                <span className="text-xxs font-bold text-slate-400">Tahun 2026</span>
              </div>

              {/* Area path chart simulation using pure responsive SVG elements (very clean look) */}
              <div className="relative h-48 w-full bg-slate-50/50 rounded-2xl flex items-end p-4">
                <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Shading Area Curve */}
                  <path 
                    d={areaD} 
                    fill="url(#grad)" 
                    opacity="0.25"
                  />
                  
                  {/* Real Curve Line */}
                  <path 
                    d={pathD} 
                    fill="none" 
                    stroke="#dc2626" 
                    strokeWidth="3.5" 
                  />

                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#dc2626" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Simulated months label */}
                <div className="absolute bottom-2 left-4 right-4 flex justify-between text-[10px] font-bold font-mono text-slate-400 select-none">
                  {salesArray.map((s: any, idx: number) => (
                    <span key={idx}>
                      {s.month === 'Mai' ? 'Mei' : s.month}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-xxs font-semibold text-slate-400 text-center font-mono">
                📈 Grafik area di atas mensimulasikan kurva pendapatan digital bulanan yang terekam di database terenkripsi.
              </div>
            </div>

            {/* Manajemen User Terbaru Table (Matches mockup 4 bottom list) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-display font-black text-slate-900 text-base">Manajemen User Terbaru</h3>
                <span className="text-xxs font-bold text-slate-400 bg-white border px-2 py-1 rounded">Update Real-time</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs whitespace-nowrap">
                  <thead className="bg-[#f8fafc] text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Nama Pengguna</th>
                      <th className="px-6 py-4">Alamat Email</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Aktivitas / Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isEditing = editingUserId === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-3 font-semibold text-slate-800">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editUserName}
                                onChange={(e) => setEditUserName(e.target.value)}
                                className="px-2 py-1 bg-slate-50 border rounded text-xs outline-none focus:border-brand"
                              />
                            ) : (
                              u.fullName
                            )}
                          </td>
                          <td className="px-6 py-3 font-mono text-slate-500">
                            {isEditing ? (
                              <input
                                type="email"
                                value={editUserEmail}
                                onChange={(e) => setEditUserEmail(e.target.value)}
                                className="px-2 py-1 bg-slate-50 border rounded text-xs outline-none focus:border-brand"
                              />
                            ) : (
                              u.email
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider ${u.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                              {u.isActive ? "Aktif" : "Non-aktif"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="flex gap-2 justify-center items-center">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveUserEdit(u.id)}
                                    className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xxs font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xxs font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingUserId(u.id);
                                      setEditUserName(u.fullName);
                                      setEditUserEmail(u.email);
                                    }}
                                    className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-black text-slate-700 hover:bg-slate-250 transition cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                                    className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px] font-black hover:bg-rose-100 transition cursor-pointer"
                                  >
                                    {u.isActive ? "Non-aktifkan" : "Aktifkan"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeleteUserId(u.id);
                                      setDeleteUserObj(u);
                                      setDeleteStep(1);
                                      setDeleteConfirmationText("");
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white text-[11px] font-black rounded hover:bg-red-700 transition cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* =========================================
            ADMIN SECTION: KELOLA AKSES LANGGANAN
           ========================================= */}
        {activeTab === "kelola-langganan" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-display font-black text-slate-900">Kelola Akses Langganan</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Berikan akses langsung atau ubah paket langganan pengguna tanpa memerlukan transaksi pembayaran (Free, Basic, Standart, Premium).
              </p>
            </div>

            {/* Quick Informational Notice */}
            <div className="bg-gradient-to-r from-red-500/10 to-transparent p-4 rounded-2xl border border-red-500/20 text-slate-700 text-xs flex gap-3 items-start">
              <span className="text-base">🚀</span>
              <div className="space-y-1 text-left">
                <p className="font-extrabold text-slate-900">Petunjuk Aktivasi Instan</p>
                <p className="leading-relaxed">
                  Ketika Admin meningkatkan status langganan Pengguna secara manual di panel ini, akses fitur paket (Basic, Standart, atau Premium) akan langsung aktif sepenuhnya secara real-time. Pengguna tersebut tidak perlu melalui gateway pembayaran untuk dapat menikmati fitur-fitur berbayar.
                </p>
              </div>
            </div>

            {/* Search Box & Controls Area */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama, email, atau paket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-brand transition font-semibold"
                />
              </div>
              <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest font-mono">
                Total: {filteredUsers.length} Pengguna
              </span>
            </div>

            {/* Subscriptions Overrides Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs whitespace-nowrap">
                  <thead className="bg-[#f8fafc] text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Nama Pengguna</th>
                      <th className="px-6 py-4">Alamat Email</th>
                      <th className="px-6 py-4">Status Akun</th>
                      <th className="px-6 py-4">Langganan Saat Ini</th>
                      <th className="px-6 py-4">Masa Aktif</th>
                      <th className="px-6 py-4 text-center">Atur Akses Paket (Tanpa Bayar)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400 font-semibold">
                          Tidak ditemukan pengguna yang cocok dengan kriteria pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold uppercase text-[10px] border border-slate-200">
                                  {u.fullName?.substring(0, 2) || "U"}
                                </div>
                                <span className="text-xs font-bold text-slate-900">{u.fullName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                              {u.email}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider ${u.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                                {u.isActive ? "Aktif" : "Non-aktif"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-3 py-1 text-[11px] font-black rounded-full border ${
                                u.packageId === "pkg_premium"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : u.packageId === "pkg_standard"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : u.packageId === "pkg_basic"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}>
                                {u.packageName === "Paket Standart" ? "Standard" : (u.packageName || "Free")}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {u.packageId !== "free" && u.endDate ? (
                                <div className="flex flex-col gap-0.5 justify-center">
                                  <span className="inline-block px-2 py-0.5 text-[10px] font-black text-slate-750 bg-slate-100 rounded border border-slate-250 uppercase tracking-wide self-start">
                                    s.d. {new Date(u.endDate).toLocaleDateString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric"
                                    })}
                                  </span>
                                  {(() => {
                                    const diffMs = new Date(u.endDate).getTime() - Date.now();
                                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                                    if (diffDays > 0) {
                                      return (
                                        <span className="text-[10px] text-emerald-600 font-bold">
                                          {diffDays} hari tersisa
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="text-[10px] text-red-500 font-bold uppercase">
                                          Kedaluwarsa
                                        </span>
                                      );
                                    }
                                  })()}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Tidak Aktif / Free</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center items-center gap-2">
                                <div className="flex flex-col gap-1 items-start">
                                  <select
                                    value={tempPackages[u.id] !== undefined ? tempPackages[u.id] : (u.packageId || "free")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTempPackages(prev => ({
                                        ...prev,
                                        [u.id]: val
                                      }));

                                      if (val !== "free") {
                                        const matchedPkg = packages?.find(p => p.id === val);
                                        const days = matchedPkg?.durationDays || 30;
                                        const d = new Date();
                                        d.setDate(d.getDate() + days);
                                        const defaultDateStr = d.toISOString().split("T")[0];
                                        setTempEndDates(prev => ({
                                          ...prev,
                                          [u.id]: defaultDateStr
                                        }));
                                      } else {
                                        setTempEndDates(prev => {
                                          const copy = { ...prev };
                                          delete copy[u.id];
                                          return copy;
                                        });
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold outline-none text-slate-800 focus:border-brand cursor-pointer"
                                  >
                                    <option value="free"> Free (Gratis / Inaktif)</option>
                                    <option value="pkg_basic"> Basic Plan (Hemat)</option>
                                    <option value="pkg_standard"> Standard Plan (Menengah)</option>
                                    <option value="pkg_premium"> Premium Plan (Eksklusif)</option>
                                  </select>

                                  {tempPackages[u.id] !== undefined && tempPackages[u.id] !== "free" && (
                                    <div className="flex flex-col items-start gap-1 w-full mt-1">
                                      <span className="text-[9px] font-black tracking-wider uppercase text-slate-400">Atur Tanggal Akhir:</span>
                                      <input
                                        type="date"
                                        value={tempEndDates[u.id] || ""}
                                        onChange={(e) => {
                                          setTempEndDates(prev => ({
                                            ...prev,
                                            [u.id]: e.target.value
                                          }));
                                        }}
                                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xxs font-semibold text-slate-700 focus:ring-1 focus:ring-brand focus:border-brand w-full outline-none"
                                      />
                                    </div>
                                  )}
                                </div>

                                {tempPackages[u.id] !== undefined && tempPackages[u.id] !== (u.packageId || "free") && (
                                  <button
                                    onClick={() => handleChangeUserPackage(u.id, tempPackages[u.id], tempEndDates[u.id])}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs rounded-xl shadow-sm transition-all duration-150 cursor-pointer flex items-center gap-1.5 animate-pulse"
                                    title="Klik untuk menyimpan perubahan langganan"
                                  >
                                    <span>💾</span>
                                    <span>Simpan</span>
                                  </button>
                                )}

                                {u.packageId && u.packageId !== "free" && (tempPackages[u.id] === undefined || tempPackages[u.id] === (u.packageId || "free")) && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Apakah Anda yakin ingin menonaktifkan paket langganan (${u.packageName || "Premium"}) secara manual untuk ${u.fullName}?`)) {
                                        handleChangeUserPackage(u.id, "free");
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-250 text-rose-600 hover:text-rose-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                                    title="Non Aktifkan Langganan secara Manual"
                                  >
                                    <span>🚫</span>
                                    <span>Non Aktifkan</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            ADMIN SECTION: DESAIN AKTIF
           ========================================= */}
        {activeTab === "desain-aktif" && (
          <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn col-span-12">
            {/* Existing template catalogs */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="font-display font-black text-slate-950 text-base">Katalog Desain Aktif</h3>
                  <p className="text-slate-500 text-xs">Sistem mendeteksi {templates.length} template desain yang siap digunakan oleh member.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari nama desain / kata kunci..."
                    value={adminTplSearch}
                    onChange={(e) => setAdminTplSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  />
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setAdminTplCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    adminTplCategoryFilter === "all"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  🌟 Semua Kategori ({templates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTplCategoryFilter("portfolio")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    adminTplCategoryFilter === "portfolio"
                      ? "bg-[#E11D48] text-white shadow-sm"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  📂 Portofolio Digital ({templates.filter(t => t.category === "portfolio").length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTplCategoryFilter("resume")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    adminTplCategoryFilter === "resume"
                      ? "bg-[#1E40AF] text-white shadow-sm"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  📝 Resume & CV ({templates.filter(t => t.category === "resume").length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTplCategoryFilter("cover_letter")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    adminTplCategoryFilter === "cover_letter"
                      ? "bg-[#0F766E] text-white shadow-sm"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  ✉️ Surat Lamaran ({templates.filter(t => t.category === "cover_letter").length})
                </button>
              </div>

              {/* Template horizontal scroll track */}
              <div className="flex overflow-x-auto gap-6 pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-350 hover:scrollbar-thumb-slate-400">
                {templates
                  .filter(t => {
                    const matchesCat = adminTplCategoryFilter === "all" || t.category === adminTplCategoryFilter;
                    const matchesSearch = t.name.toLowerCase().includes(adminTplSearch.toLowerCase()) ||
                      (t.description || "").toLowerCase().includes(adminTplSearch.toLowerCase()) ||
                      t.id.toLowerCase().includes(adminTplSearch.toLowerCase());
                    return matchesCat && matchesSearch;
                  })
                  .map(t => {
                    const tTier = t.tier || "basic";
                    
                    // Card border styles by category to match screenshot exact
                    let cardBorderClass = "border-[#0F766E]/70"; // cover_letter (Teal/Emerald Green)
                    let packagePillClass = "text-[#0F766E] bg-[#0F766E]/5 border-[#0F766E]/30";
                    let categoryLabel = "Lamaran";
                    
                    if (t.category === "portfolio") {
                      cardBorderClass = "border-[#E11D48]/70"; // portfolio (Rose Quartz/Coral)
                      packagePillClass = "text-[#E11D48] bg-[#E11D48]/5 border-[#E11D48]/30";
                      categoryLabel = "Portfolio";
                    } else if (t.category === "resume") {
                      cardBorderClass = "border-[#1E40AF]/70"; // resume (Slate Blue)
                      packagePillClass = "text-[#1E40AF] bg-[#1E40AF]/5 border-[#1E40AF]/30";
                      categoryLabel = "Resume & CV";
                    }

                    // Package label text matching screenshot logic
                    let packageText = "BASIC PACKAGE";
                    if (tTier === "standard") packageText = "STANDARD PACKAGE";
                    if (tTier === "premium") packageText = "PREMIUM PACKAGE";
                    if (tTier === "free") packageText = "FREE PACKAGE";

                    const fallbackImage = t.category === "portfolio"
                      ? "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500&auto=format&fit=crop"
                      : t.category === "resume"
                        ? "https://images.unsplash.com/photo-1586283391129-76a6df230234?w=500&auto=format&fit=crop"
                        : "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop";

                    const defaultDesc = t.category === "portfolio"
                      ? "Desain apik dengan tata letak modern dan profesional, optimalkan konten serta keindahan visual portofolio digital Anda."
                      : t.category === "resume"
                        ? "Tata letak bersih dan profesional dengan struktur grid teratur. Sempurna untuk resume/CV karir resume formal yang dinamis."
                        : "Desain klasik dengan tipografi serif untuk kesan profesional. Sempurna untuk surat lamaran kerja korporat.";

                    return (
                      <div
                        key={t.id}
                        className={`w-[320px] sm:w-[380px] shrink-0 snap-start bg-white rounded-[28px] border-2 ${cardBorderClass} p-5 flex flex-col justify-between hover:shadow-md transition duration-200`}
                      >
                        <div>
                          {/* Top Package Pill */}
                          <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${packagePillClass} mb-4`}>
                            {packageText}
                          </div>

                          {/* Flex grid containing preview & information elements */}
                          <div className="flex gap-4 items-start mb-4">
                            {/* Left Col: Mockup design image portrait frame */}
                            <div className="w-24 sm:w-28 aspect-[3/4] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs relative shrink-0 flex items-center justify-center">
                              <img
                                src={t.previewUrl || fallbackImage}
                                alt={t.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Right Col: Details labels stack */}
                            <div className="flex-1 space-y-2 mt-1 min-w-0">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Nama Katalog:</span>
                                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm mt-0.5 leading-snug break-words">
                                  {t.name}
                                </h4>
                              </div>

                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Template Untuk:</span>
                                <p className="text-slate-700 font-bold text-xs mt-0.5">
                                  {categoryLabel}
                                </p>
                              </div>

                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Deskripsi:</span>
                                <p className="text-slate-500 font-medium text-[10px] sm:text-[11px] mt-0.5 leading-relaxed break-words line-clamp-3">
                                  {t.description || defaultDesc}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive trigger action & modification buttons */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAdminPreview(t)}
                            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/50"
                          >
                            <Eye className="w-4 h-4 text-slate-500" /> Lihat Live Preview
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTplId(t.id);
                                setTplName(t.name);
                                setTplCategory(t.category);
                                setTplHtml(t.htmlMarkup);
                                setTplTier(t.tier || "basic");
                                setTplPreviewUrl(t.previewUrl || "");
                                setTplDescription(t.description || "");
                                setActiveTab("upload-template");
                                window.scrollTo({ top: 300, behavior: "smooth" });
                              }}
                              className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-black rounded-xl transition text-center flex items-center justify-center gap-1 cursor-pointer"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(t.id, t.name)}
                              className="py-1.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 text-[11px] font-black rounded-xl transition text-center flex items-center justify-center gap-1 cursor-pointer"
                            >
                              🗑️ Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            ADMIN SECTION 2: UPLOAD TEMPLATE / PORTFOLIO
           ========================================= */}
        {activeTab === "upload-template" && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn col-span-12">
            
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-2">
                  <UploadCloud className="text-brand w-6 h-6" /> {editingTplId ? `Edit / Modifikasi Desain Portofolio` : `Upload HTML Tailwind Desain Portofolio Baru`}
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  {editingTplId 
                    ? `Sedang melangsungkan perubahan data pada desain portofolio ID: ${editingTplId}. Simpan perubahan untuk mematangkan data.`
                    : `Sistem akan otomatis me-render draf HTML ke dashboard pengguna khusus untuk portofolio digital.`}
                </p>
              </div>

              <form onSubmit={handleUploadTemplate} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Nama Desain Template</label>
                    <input
                      type="text"
                      placeholder="Contoh: Modern Clean Slate Dark"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Kategori Dokumen</label>
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-650 font-bold">
                      Portfolio Digital Page
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Jenis Paket Desain (Tier / Hak Akses)</label>
                    <select
                      value={tplTier}
                      onChange={(e) => setTplTier(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="free">Semua Paket (Gratis / Free)</option>
                      <option value="basic">Basic Plan (Hemat)</option>
                      <option value="standard">Standard Plan (Menengah)</option>
                      <option value="premium">Premium Plan (Eksklusif)</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed font-medium">
                      💡 <strong>Aturan Tingkatan Akses Desain:</strong>
                      <br />• <span className="font-semibold text-slate-700">Free:</span> Tidak bisa akses Desain Basic, Standart, Premium.
                      <br />• <span className="font-semibold text-slate-700">Basic:</span> Hanya Desain Basic.
                      <br />• <span className="font-semibold text-slate-700">Standart:</span> Desain Standart dan Basic.
                      <br />• <span className="font-semibold text-slate-700">Premium:</span> Desain Basic, Standart, Premium.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Upload Contoh Gambar Desain (Maks 1 Mb)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleTemplateFileChange}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand file:text-white hover:file:bg-brand-hover cursor-pointer border border-dashed border-slate-300 p-1 bg-slate-50 rounded-xl outline-none"
                      />
                      {tplPreviewUrl && (
                        <div className="w-10 h-10 border border-slate-200 rounded-lg overflow-hidden shrink-0 shadow-sm bg-slate-100 flex items-center justify-center">
                          <img src={tplPreviewUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                    {tplFileError && (
                      <p className="text-[10px] text-red-500 mt-1 font-bold">{tplFileError}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 block mb-1">Deskripsi Singkat Desain</label>
                  <input
                    type="text"
                    placeholder="Contoh: Desain klasik dengan tipografi serif untuk kesan profesional. Sempurna untuk lamaran kerja korporat."
                    value={tplDescription}
                    onChange={(e) => setTplDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 block mb-1">Coding Markup (HTML + Tailwind utility classes)</label>
                  <textarea
                    rows={12}
                    placeholder="Tulis kode HTML lengkap berisikan kelas Tailwind CSS..."
                    value={tplHtml}
                    onChange={(e) => setTplHtml(e.target.value)}
                    className="w-full p-4 bg-slate-900 text-teal-400 font-mono text-xs rounded-xl outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#dc2626] hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition shadow cursor-pointer text-center"
                  >
                    {editingTplId ? "💾 Simpan Perubahan Portofolio" : "Upload Desain Portofolio Baru"}
                  </button>
                  {editingTplId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTplId(null);
                        setTplName("");
                        setTplHtml("");
                        setTplTier("basic");
                        setTplPreviewUrl("");
                        setTplDescription("");
                        setTplCategory("portfolio");
                      }}
                      className="py-3 px-6 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      ❌ Batal Edit
                    </button>
                  )}
                </div>

              </form>
            </div>
          </div>
        )}

        {/* =========================================
            ADMIN SECTION: UPLOAD RESUME WITH JSON TEMPLATE (Revisi 1)
           ========================================= */}
        {activeTab === "upload-resume-cv" && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn col-span-12">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-2">
                  <Upload className="text-brand w-6 h-6" /> Upload Resume/CV Template (JSON Canvas)
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Input template resume interaktif berbasis Canvas dengan layout JSON fleksibel yang akan di-render menggunakan Konva.js di sisi pengguna.
                </p>
              </div>

              <form onSubmit={handleSaveRcvTemplate} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Nama Template Desain</label>
                    <input
                      type="text"
                      placeholder="Contoh: Blue Editorial Canva Resume"
                      value={rcvName}
                      onChange={(e) => setRcvName(e.target.value)}
                      className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Jenis Paket Layanan</label>
                    <select
                      value={rcvTier}
                      onChange={(e) => setRcvTier(e.target.value as any)}
                      className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                    >
                      <option value="free">Free (Gratis)</option>
                      <option value="basic">Basic</option>
                      <option value="standard">Standard / Standart</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">
                      Upload Thumbnail Gambar (JPG/PNG)
                    </label>
                    <div className="border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleRcvFileChange}
                        className="text-xxs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                      />
                      {rcvPreviewUrl && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-inner shrink-0 mt-1">
                          <img src={rcvPreviewUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Deskripsi Template</label>
                    <textarea
                      rows={4}
                      placeholder="Masukkan penjelasan singkat tentang gaya visual, peruntukan karir, atau kelebihan template resume ini..."
                      value={rcvDescription}
                      onChange={(e) => setRcvDescription(e.target.value)}
                      className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black uppercase text-slate-500 block">Struktur Data Template (Format JSON)</label>
                    <div className="flex gap-2">
                      <label className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[9px] font-bold cursor-pointer transition flex items-center gap-1">
                        <Upload className="w-3 h-3 text-slate-500" /> Upload File JSON
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleJsonUploadChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setRcvJson(JSON.stringify({
                            width: 800,
                            height: 1100,
                            backgroundColor: "#ffffff",
                            elements: [
                              {
                                type: "rect",
                                x: 0,
                                y: 0,
                                width: 260,
                                height: 1100,
                                fill: "#1e293b",
                                id: "sidebar_bg"
                              },
                              {
                                type: "rect",
                                x: 0,
                                y: 0,
                                width: 800,
                                height: 40,
                                fill: "#dc2626",
                                id: "header_stripe"
                              },
                              {
                                type: "text",
                                text: "{{NAMA_LENGKAP}}",
                                x: 280,
                                y: 70,
                                fontSize: 26,
                                fontFamily: "Inter",
                                fill: "#dc2626",
                                fontStyle: "bold",
                                id: "user_name"
                              },
                              {
                                type: "text",
                                text: "{{TITLE}}",
                                x: 280,
                                y: 110,
                                fontSize: 14,
                                fontFamily: "Inter",
                                fill: "#475569",
                                fontStyle: "italic",
                                id: "user_title"
                              },
                              {
                                type: "text",
                                text: "TENTANG SAYA",
                                x: 280,
                                y: 150,
                                fontSize: 13,
                                fontFamily: "Inter",
                                fill: "#1e293b",
                                fontStyle: "bold",
                                id: "about_title"
                              },
                              {
                                type: "text",
                                text: "{{TENTANG_SAYA}}",
                                x: 280,
                                y: 175,
                                fontSize: 10,
                                fontFamily: "Inter",
                                fill: "#334155",
                                width: 480,
                                id: "about_content"
                              },
                              {
                                type: "text",
                                text: "INFO KONTAK",
                                x: 20,
                                y: 70,
                                fontSize: 13,
                                fontFamily: "Inter",
                                fill: "#ffffff",
                                fontStyle: "bold",
                                id: "contact_title"
                              },
                              {
                                type: "text",
                                text: "Email:\n{{EMAIL}}\n\nNo. Telp:\n{{NOMOR_TELEPON}}\n\nWhatsApp:\n{{NOMOR_WHATSAPP}}\n\nAlamat:\n{{ALAMAT}}\n\nKota:\n{{KOTA}}",
                                x: 20,
                                y: 100,
                                fontSize: 9,
                                fontFamily: "Inter",
                                fill: "#cbd5e1",
                                width: 220,
                                id: "contact_details"
                              },
                              {
                                type: "text",
                                text: "BIODATA",
                                x: 20,
                                y: 300,
                                fontSize: 13,
                                fontFamily: "Inter",
                                fill: "#ffffff",
                                fontStyle: "bold",
                                id: "biodata_title"
                              },
                              {
                                type: "text",
                                text: "NIK: {{NIK}}\nTTL: {{TEMPAT_LAHIR}}, {{TANGGAL_LAHIR}}\nGender: {{JENIS_KELAMIN}}",
                                x: 20,
                                y: 330,
                                fontSize: 9,
                                fontFamily: "Inter",
                                fill: "#cbd5e1",
                                width: 220,
                                id: "biodata_details"
                              },
                              {
                                type: "text",
                                text: "PENDIDIKAN",
                                x: 280,
                                y: 280,
                                fontSize: 13,
                                fontFamily: "Inter",
                                fill: "#1e293b",
                                fontStyle: "bold",
                                id: "education_title"
                              },
                              {
                                type: "text",
                                text: "{{PENDIDIKAN}}",
                                x: 280,
                                y: 305,
                                fontSize: 10,
                                fontFamily: "Inter",
                                fill: "#334155",
                                width: 480,
                                id: "education_content"
                              },
                              {
                                type: "text",
                                text: "PENGALAMAN KERJA",
                                x: 280,
                                y: 460,
                                fontSize: 13,
                                fontFamily: "Inter",
                                fill: "#1e293b",
                                fontStyle: "bold",
                                id: "experience_title"
                              },
                              {
                                type: "text",
                                text: "{{PENGALAMAN_KERJA}}",
                                x: 280,
                                y: 485,
                                fontSize: 10,
                                fontFamily: "Inter",
                                fill: "#334155",
                                width: 480,
                                id: "experience_content"
                              },
                              {
                                type: "text",
                                text: "PROYEK & KEAHLIAN",
                                x: 280,
                                y: 720,
                                fontSize: 13,
                                fontFamily: "Inter",
                                fill: "#1e293b",
                                fontStyle: "bold",
                                id: "project_title"
                              },
                              {
                                type: "text",
                                text: "Proyek:\n{{PROYEK}}\n\nKeahlian:\n{{KEAHLIAN}}\n\nSertifikat:\n{{SERTIFIKAT}}",
                                x: 280,
                                y: 745,
                                fontSize: 10,
                                fontFamily: "Inter",
                                fill: "#334155",
                                width: 480,
                                id: "project_content"
                              }
                            ]
                          }, null, 2));
                        }}
                        className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-700 transition cursor-pointer"
                      >
                        Reset JSON Bawaan
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={12}
                    value={rcvJson}
                    onChange={(e) => setRcvJson(e.target.value)}
                    className="w-full text-xxs font-mono p-3 bg-slate-900 text-emerald-400 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand resize-y leading-relaxed"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-brand hover:bg-brand-hover text-white text-xs font-black rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
                  >
                    🚀 Save Template Desain
                  </button>
                </div>
              </form>
            </div>

            {/* Tag Variabel JSON Canvas Cheat Sheet */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-md text-slate-300 space-y-4 font-sans mt-6">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[#dc2626] text-xxs font-extrabold uppercase tracking-widest font-mono block mb-1">
                  JSON CANVAS REFERENCE CHEAT SHEET / VARIABEL INTEGRASI
                </span>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  📋 Daftar Tag Variabel Khusus Layout JSON Canvas
                </h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Gunakan daftar tag berikut pada atribut <code>"text"</code> untuk elemen berbentuk teks (<code>"type": "text"</code>), atau gunakan ID khusus <code>"profile_photo"</code> untuk elemen bertipe gambar (<code>"type": "image"</code>) agar data pengguna dimuat secara dinamis saat di-render di Canvas Konva.js sisi pengguna.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{NAMA_LENGKAP}}"} / {"{{NAMA}}"}</span>
                  <span className="text-[11px] text-slate-400">Nama lengkap pengguna dari profile atau data login.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">id: "profile_photo"</span>
                  <span className="text-[11px] text-slate-400">Gunakan ID ini pada objek tipe <code>"image"</code> untuk otomatis memuat pas foto/avatar profil pengguna.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{TITLE}}"}</span>
                  <span className="text-[11px] text-slate-400">Gelar profesi atau bidang fokus karir utama.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{EMAIL}}"}</span>
                  <span className="text-[11px] text-slate-400">Alamat Email terdaftar.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{NOMOR_TELEPON}}"}</span>
                  <span className="text-[11px] text-slate-400">Nomor handphone telepon aktif yang diinput di update profile.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{NOMOR_WHATSAPP}}"}</span>
                  <span className="text-[11px] text-slate-400">Kredensial kontak WhatsApp instan.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{ALAMAT}}"} / {"{{KOTA}}"}</span>
                  <span className="text-[11px] text-slate-400">Rincian jalan raya domisili dan kabupaten kota.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{TENTANG_SAYA}}"}</span>
                  <span className="text-[11px] text-slate-400">Paragraf ringkas biografi perkenalan diri.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{PENDIDIKAN}}"}</span>
                  <span className="text-[11px] text-slate-400">Daftar riwayat institusi pendidikan lengkap (Bullet list terformat).</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{PENGALAMAN_KERJA}}"}</span>
                  <span className="text-[11px] text-slate-400">Struktur rapi poin penugasan/kerja instansi terdahulu.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{PROYEK}}"} / {"{{KEAHLIAN}}"}</span>
                  <span className="text-[11px] text-slate-400">Daftar judul pengerjaan proyek &amp; penguasaan tools.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                  <span className="text-red-500 font-bold font-mono text-xs block mb-1">{"{{SERTIFIKAT}}"}</span>
                  <span className="text-[11px] text-slate-400">Sertifikat berlisensi nasional ataupun global.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            ADMIN SECTION: DESAIN RESUME/CV
           ========================================= */}
        {activeTab === "desain-resume-cv" && (
          <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn col-span-12">
            
            {/* Header section info */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xxs font-black uppercase text-brand tracking-widest font-mono">
                    PANEL MANAJEMEN BACKEND ADMIN
                  </span>
                  <h2 className="text-2xl font-display font-black text-white flex items-center gap-2 mt-1">
                    <FileText className="text-brand w-6 h-6" /> Kelola & Input Desain Resume/CV
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Silakan input template desain baru CV dengan Katalog JPG/PNG yang ramah pengguna.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    // Inject a professional, production-ready default template to the HTML area
                    setTplName("Premium Indigo Elegance");
                    setTplTier("premium");
                    setTplDescription("Desain profesional dual-kolom dengan aksen warna Indigo yang mewah, struktur rapi untuk melamar kerja di startup & corporate.");
                    setTplHtml(`<div class="min-h-screen bg-slate-50 text-slate-800 font-sans p-8 md:p-12">
  <div class="max-w-4xl mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
    <!-- Header visual banner -->
    <div class="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white px-8 py-12 flex flex-col md:flex-row items-center gap-6">
      <div class="w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-300 shadow-inner shrink-0 bg-indigo-950">
        <img src="{{FOTO}}" alt="{{NAMA}}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
      </div>
      <div class="text-center md:text-left">
        <h1 class="text-3xl font-black tracking-tight text-white mb-1">{{NAMA}}</h1>
        <p class="text-indigo-300 font-mono text-xs uppercase tracking-widest font-bold mb-3">{{TITLE}}</p>
        <p class="text-indigo-100 text-xs leading-relaxed max-w-xl opacity-90">{{TENTANG_SAYA}}</p>
      </div>
    </div>

    <!-- Inner grid two-columns layout -->
    <div class="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Right columns info -->
      <div class="space-y-6 md:border-r md:border-slate-100 md:pr-6">
        <div>
          <h3 class="text-xs font-black uppercase text-indigo-700 tracking-wider mb-2">Informasi Diri</h3>
          <p class="text-xs text-slate-500 font-medium">Tempat, Tgl Lahir:</p>
          <p class="text-xs text-slate-800 font-bold mb-2">{{TEMPAT_TANGGAL_LAHIR}}</p>
          <p class="text-xs text-slate-500 font-medium">Usia:</p>
          <p class="text-xs text-slate-800 font-bold mb-2">{{USIA}} Tahun</p>
          <p class="text-xs text-slate-500 font-medium">Alamat:</p>
          <p class="text-xs text-slate-800 font-bold leading-normal mb-2">{{ALAMAT}}</p>
        </div>

        <div>
          <h3 class="text-xs font-black uppercase text-indigo-700 tracking-wider mb-2">Kontak Hubung</h3>
          <p class="text-xs text-slate-500 font-medium">Telepon:</p>
          <p class="text-xs text-slate-800 font-bold mb-2 font-mono">{{TELEPON}}</p>
          <p class="text-xs text-slate-500 font-medium font-mono">WhatsApp:</p>
          <p class="text-xs text-slate-800 font-bold font-mono">{{WHATSAPP}}</p>
        </div>

        <div>
          <h3 class="text-xs font-black uppercase text-indigo-700 tracking-wider mb-2">Keahlian (Skills)</h3>
          <div class="flex flex-wrap gap-1 pt-1">
            {{SKILL}}
          </div>
        </div>

        <div>
          <h3 class="text-xs font-black uppercase text-indigo-700 tracking-wider mb-2">Sosial Media</h3>
          <div class="flex flex-col gap-1.5 pt-1">
            {{SOSIAL_MEDIA}}
          </div>
        </div>
      </div>

      <!-- Left layout spans 2 columns -->
      <div class="md:col-span-2 space-y-6">
        <section>
          <h3 class="text-sm font-black uppercase text-indigo-900 border-b border-indigo-100 pb-1 mb-3 flex items-center gap-1.5">
            💼 Pengalaman Profesional
          </h3>
          <div class="space-y-4">
            {{PENGALAMAN_KERJA}}
          </div>
        </section>

        <section>
          <h3 class="text-sm font-black uppercase text-indigo-900 border-b border-indigo-100 pb-1 mb-3 flex items-center gap-1.5">
            🏫 Pendidikan Akademik
          </h3>
          <div class="space-y-3">
            {{PENDIDIKAN}}
          </div>
        </section>

        <section>
          <h3 class="text-sm font-black uppercase text-indigo-900 border-b border-indigo-100 pb-1 mb-3 flex items-center gap-1.5">
            🏆 Penghargaan & Sertifikasi
          </h3>
          <div class="space-y-1">
            {{SERTIFIKAT}}
          </div>
        </section>
      </div>
    </div>
  </div>
</div>`);
                    setTplPreviewUrl("https://images.unsplash.com/photo-1586282391129-76a6df230234?w=500&auto=format&fit=crop");
                    setTplCategory("resume");
                    showFeedback("", "Satu contoh template CV premium berhasil di-load! Klik tombol merah di bawah untuk mengupload & mempublikasikan.");
                  }}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition"
                >
                  ⚡ Load Contoh Template CV
                </button>
              </div>
            </div>

            {/* Input Form Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-slate-800">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-base font-display font-black text-slate-900 flex items-center gap-2">
                  💾 {editingTplId ? `Modifikasi Template Resume/CV ID: ${editingTplId}` : `Penginputan Desain Template Resume/CV Baru`}
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Katalog berupa JPG/PNG akan termuat di dashboard pengguna, dan kode HTML Markup akan di-render sebagai pratinjau layout.
                </p>
              </div>

              <form onSubmit={handleUploadTemplate} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Nama Template Desain</label>
                    <input
                      type="text"
                      placeholder="Contoh: Modern Elegant Minimalist Indigo"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand focus:border-brand text-slate-800"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Jenis Paket Layanan (Tier)</label>
                    <select
                      value={tplTier}
                      onChange={(e) => setTplTier(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand focus:border-brand text-slate-800"
                    >
                      <option value="free">Free (Gratis)</option>
                      <option value="basic">Basic Plan (Hemat)</option>
                      <option value="standard">Standard Plan (Menengah)</option>
                      <option value="premium">Premium Plan (Eksklusif)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Upload Katalog Desain (Format JPG/PNG)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={handleTemplateFileChange}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-500 file:text-white hover:file:bg-rose-600 cursor-pointer border border-dashed border-slate-300 p-1 bg-slate-50 rounded-xl outline-none"
                      />
                      {tplPreviewUrl && (
                        <div className="w-12 h-12 border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-sm bg-slate-100 flex items-center justify-center">
                          <img src={tplPreviewUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                    {tplFileError && (
                      <p className="text-[10px] text-brand mt-1 font-semibold">{tplFileError}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Deskripsi Desain CV</label>
                    <input
                      type="text"
                      placeholder="Contoh: Desain professional dengan aksen clean, ideal untuk eksekutif & desainer."
                      value={tplDescription}
                      onChange={(e) => setTplDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand focus:border-brand text-slate-800"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <h4 className="text-[11px] font-black uppercase text-indigo-700 tracking-wider mb-2 font-mono flex items-center gap-1">
                    🏷️ PANDUAN TAG DYNAMIC DATA RESUME PENGGUNA:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-600 leading-relaxed">
                    <div>
                      <strong>Identity:</strong>
                      <br />• <code className="text-rose-600">{"{{NAMA}}"}</code>
                      <br />• <code className="text-rose-600">{"{{TITLE}}"}</code>
                      <br />• <code className="text-rose-600">{"{{TENTANG_SAYA}}"}</code>
                    </div>
                    <div>
                      <strong>Details:</strong>
                      <br />• <code className="text-rose-600">{"{{USIA}}"}</code>
                      <br />• <code className="text-rose-600">{"{{ALAMAT}}"}</code>
                      <br />• <code className="text-rose-600">{"{{TEMPAT_TANGGAL_LAHIR}}"}</code>
                    </div>
                    <div>
                      <strong>Contacts:</strong>
                      <br />• <code className="text-rose-600">{"{{TELEPON}}"}</code>
                      <br />• <code className="text-rose-600">{"{{WHATSAPP}}"}</code>
                      <br />• <code className="text-rose-600">{"{{EMAIL}}"}</code>
                    </div>
                    <div>
                      <strong>Dynamic Lists:</strong>
                      <br />• <code className="text-rose-600">{"{{PENGALAMAN_KERJA}}"}</code>
                      <br />• <code className="text-rose-600">{"{{PENDIDIKAN}}"}</code>
                      <br />• <code className="text-rose-600">{"{{SKILL}}"}</code>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 block mb-1">Coding Markup Template (HTML + Tailwind Utility Classes)</label>
                  <textarea
                    rows={12}
                    placeholder="Masukkan kode HTML template CV Anda di sini..."
                    value={tplHtml}
                    onChange={(e) => setTplHtml(e.target.value)}
                    className="w-full p-4 bg-slate-900 text-teal-400 font-mono text-xs rounded-xl outline-none border border-slate-800"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#dc2626] hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition shadow cursor-pointer text-center"
                  >
                    {editingTplId ? "💾 Simpan Perubahan Desain CV" : "Upload & Publikasikan Desain CV"}
                  </button>
                  {editingTplId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTplId(null);
                        setTplName("");
                        setTplHtml("");
                        setTplTier("basic");
                        setTplPreviewUrl("");
                        setTplDescription("");
                      }}
                      className="py-3 px-6 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>

              </form>
            </div>

            {/* Resume Template Gallery */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="font-display font-black text-slate-950 text-base">
                  Katalog Desain Resume/CV Aktif saat ini
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Menampilkan semua template resume yang diinput dan diaktifkan di sistem.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {templates
                  .filter((t) => t.category === "resume")
                  .map((t) => {
                    const tierNames: Record<string, string> = {
                      free: "Free (Gratis Semua)",
                      basic: "Basic Plan",
                      standard: "Standard Plan",
                      premium: "Premium Plan"
                    };
                    const badgeStyles: Record<string, string> = {
                      free: "bg-teal-50 border-teal-200 text-teal-700",
                      basic: "bg-blue-50 border-blue-200 text-blue-700",
                      standard: "bg-purple-50 border-purple-200 text-purple-700",
                      premium: "bg-rose-50 border-rose-200 text-rose-700"
                    };

                    return (
                      <div key={t.id} className="border border-slate-200/90 rounded-2xl overflow-hidden hover:shadow-md transition bg-white flex flex-col hover:border-slate-300">
                        <div className="aspect-[4/5] w-full bg-slate-100 relative group overflow-hidden border-b border-slate-100">
                          {t.previewUrl ? (
                            <img src={t.previewUrl} alt={t.name} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-mono text-[10px]">Katalog No Image</div>
                          )}
                          <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${badgeStyles[t.tier || "free"] || "bg-slate-100 border-slate-200"}`}>
                            {tierNames[t.tier || "free"] || "Standard"}
                          </span>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-display font-black text-slate-900 text-xs truncate animate-pulse" title={t.name}>{t.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {t.id}</p>
                            <p className="text-slate-600 text-xxs leading-relaxed mt-2 line-clamp-3">{t.description || "Tidak ada deskripsi."}</p>
                          </div>

                          <div className="flex gap-2 border-t border-slate-100 pt-3 mt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTplId(t.id);
                                setTplName(t.name);
                                setTplHtml(t.htmlMarkup);
                                setTplTier(t.tier || "free");
                                setTplPreviewUrl(t.previewUrl || "");
                                setTplDescription(t.description || "");
                                setTplCategory("resume");
                                // scroll form smoothly
                                window.scrollTo({ top: 300, behavior: "smooth" });
                              }}
                              className="flex-1 py-1 px-3 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-xl transition text-center flex items-center justify-center gap-1 cursor-pointer"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(t.id, t.name)}
                              className="py-1.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[11px] font-bold rounded-xl transition text-center flex items-center justify-center gap-1 cursor-pointer"
                            >
                              🗑️ Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        )}

        {/* =========================================
            ADMIN SECTION: UPLOAD LAMARAN (.DOCX WORD) - REVISI 2
           ========================================= */}
        {activeTab === "upload-lamaran" && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn col-span-12">
            
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-2">
                  <FileText className="text-brand w-6 h-6" /> {editingLamaranTplId ? "✏️ Edit / Modifikasi Template Surat Lamaran (.docx)" : "Upload Desain Surat Lamaran Kerja (.docx / Word)"}
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  {editingLamaranTplId 
                    ? `Sedang melangsungkan perubahan data pada template ID: ${editingLamaranTplId}. Simpan perubahan untuk mematangkan data.`
                    : "Admin dapat mengunggah template surat lamaran kerja dalam format Microsoft Word (.docx). Sistem akan secara cerdas memindai tag variabel di dalam dokumen untuk ditarik datanya saat pengguna mengunduh berkas."}
                </p>
              </div>

              <form onSubmit={handleUploadLamaranDocx} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Nama Desain Lamaran</label>
                    <input
                      type="text"
                      placeholder="Contoh: Surat Lamaran Kerja Formal Eksekutif"
                      value={lamaranName}
                      onChange={(e) => setLamaranName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-350 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand focus:border-brand text-slate-800 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Jenis Paket (Peringkat Tier Akses)</label>
                    <select
                      value={lamaranTier}
                      onChange={(e) => setLamaranTier(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-350 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand focus:border-brand text-slate-800 font-semibold"
                    >
                      <option value="free">Semua Paket (Gratis / Free)</option>
                      <option value="basic">Basic Plan (Hemat)</option>
                      <option value="standard">Standard Plan (Menengah)</option>
                      <option value="premium">Premium/Eksklusif (Advanced)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">
                      Pilih File Template (.docx Word) {editingLamaranTplId && "(Biarkan kosong jika tetap/tidak diubah)"}
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition">
                      <input
                        type="file"
                        accept=".docx"
                        onChange={handleLamaranDocxChange}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-blue-300 hover:file:bg-black cursor-pointer"
                        required={!editingLamaranTplId}
                      />
                      {lamaranFileName && (
                        <p className="mt-2 text-xs font-bold text-slate-700 flex items-center gap-1.5 font-mono">
                          📄 {lamaranFileName}
                        </p>
                      )}
                      {lamaranFileError && (
                        <p className="text-[10px] text-red-500 mt-1 font-bold">{lamaranFileError}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 block mb-1">Upload Contoh Gambar / Preview Desain (Maks 1 Mb)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLamaranPreviewImageChange}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand file:text-white hover:file:bg-brand-hover cursor-pointer border border-dashed border-slate-300 p-2 bg-slate-50 rounded-xl outline-none"
                      />
                      {lamaranPreviewUrl && (
                        <div className="w-10 h-10 border border-slate-200 rounded-lg overflow-hidden shrink-0 shadow-sm bg-slate-100 flex items-center justify-center">
                          <img src={lamaranPreviewUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 block mb-1">Deskripsi Singkat Template Lamaran</label>
                  <input
                    type="text"
                    placeholder="Contoh: Template modern resmi dengan margin proporsional, sangat pas diunduh dalam bentuk berkas siap cetak Word."
                    value={lamaranDescription}
                    onChange={(e) => setLamaranDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-350 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand focus:border-brand text-slate-800"
                  />
                </div>

                {/* Detected Tags Live Feedback Box */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <h4 className="text-[11px] font-black uppercase text-blue-700 tracking-wider font-mono flex items-center gap-1">
                    🔍 TAG VARIABEL TERDETEKSI DARI WORD TEMPLATE:
                  </h4>
                  {detectedLamaranTags.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Belum ada file diupload atau tidak ada tag ditemukan. Masukkan folder tag dengan tanda biner ganda seperti {"{{NAMA_PERUSAHAAN}}"}, {"{{NAMA}}"}, atau {"{{ISI_SURAT}}"} di dalam file Word Anda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500">
                        Sistem mendeteksi <strong>{detectedLamaranTags.length} tag variabel</strong> berikut ini. Tag ini akan diisikan otomatis oleh profil dan lamaran pengguna:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedLamaranTags.map((tag, i) => {
                          const isStandard = [
                            "NAMA", "ALAMAT", "TELEPON", "EMAIL", "TANGGAL", 
                            "NAMA_PERUSAHAAN", "ALAMAT_PERUSAHAAN", "JABATAN_DILAMAR", "ISI_SURAT",
                            "KOTA", "TEMPAT_TANGGAL_LAHIR", "URL_PORTOFOLIO", "EMAIL_PENGGUNA", "HARI",
                            "USIA", "UNIVERSITAS_1", "TAHUN_LULUS_1"
                          ].includes(tag);
                          return (
                            <span 
                              key={i} 
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                                isStandard 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                              title={isStandard ? "Tag sistem standar yang didukung otomatis" : "Tag kustom tambahan"}
                            >
                              {"{{"}{tag}{"}}"}{!isStandard && " (Kustom)"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-2 cursor-pointer"
                  >
                    {editingLamaranTplId ? "💾 Simpan Perubahan Template" : "🚀 Publikasikan Template Word (.docx)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLamaranName("");
                      setLamaranTier("basic");
                      setLamaranPreviewUrl("");
                      setLamaranFileName("");
                      setDetectedLamaranTags([]);
                      setLamaranDocxBase64("");
                      setLamaranDescription("");
                      if (editingLamaranTplId) {
                        setEditingLamaranTplId(null);
                      } else {
                        setActiveTab("dashboard");
                      }
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

              </form>
            </div>

            {/* List existing covers (Only Word templates) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 font-display">
                  📂 Daftar Template Lamaran Word (.docx) Aktif
                </h3>
                <p className="text-slate-400 text-xs">
                  Daftar koleksi template Microsoft Word yang telah diunggah ke sistem dan dapat dicapai seketika oleh pengguna (geser ke samping untuk melihat semua template).
                </p>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
                {templates
                  .filter(t => t.category === "cover_letter" && t.htmlMarkup && (t.htmlMarkup.startsWith("data:application/vnd.openxmlformats-officedocument") || t.htmlMarkup.includes("/api/word") || t.htmlMarkup.endsWith(".docx")))
                  .map(t => {
                    return (
                      <div key={t.id} className="w-72 sm:w-80 shrink-0 snap-start border border-slate-200/95 rounded-2xl overflow-hidden hover:shadow-md transition bg-white flex flex-col hover:border-slate-300">
                        <div className="aspect-[16/10] w-full bg-slate-105 relative group overflow-hidden border-b border-slate-150">
                          {t.previewUrl ? (
                            <img src={t.previewUrl} alt={t.name} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-mono text-[10px]">No Thumbnail Preview</div>
                          )}
                          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[8px] bg-sky-100 text-sky-700 font-bold border border-sky-200 uppercase tracking-wide font-mono shadow-xs">
                            DOCX WORD
                          </span>
                          <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[8px] font-black uppercase tracking-wider font-mono shadow-xs">
                            {t.tier?.toUpperCase() || "FREE"}
                          </span>
                        </div>
                        
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <h4 className="font-display font-black text-slate-900 text-xs truncate" title={t.name}>{t.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {t.id}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{t.description || "Tidak ada deskripsi."}</p>
                          </div>
                          
                          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                            {t.previewUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAdminPreviewImageModalUrl(t.previewUrl || "");
                                  setAdminPreviewImageModalTitle(t.name);
                                }}
                                className="w-full py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-850 text-[10px] font-bold rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1"
                              >
                                👁️ Preview Gambar
                              </button>
                            )}
                            <div className="flex gap-2 w-full">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLamaranTplId(t.id);
                                  setLamaranName(t.name);
                                  setLamaranTier(t.tier || "free");
                                  setLamaranPreviewUrl(t.previewUrl || "");
                                  setLamaranDescription(t.description || "");
                                  setLamaranDocxBase64(t.htmlMarkup || "");
                                  setLamaranFileName("File aktif terunggah sebelumnya");
                                  window.scrollTo({ top: 300, behavior: "smooth" });
                                }}
                                className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(t.id, t.name)}
                                className="flex-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[10px] font-bold rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1"
                              >
                                🗑️ Hapus
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {templates.filter(t => t.category === "cover_letter" && t.htmlMarkup && (t.htmlMarkup.startsWith("data:application/vnd.openxmlformats-officedocument") || t.htmlMarkup.includes("/api/word") || t.htmlMarkup.endsWith(".docx"))).length === 0 && (
                  <div className="w-full py-8 text-center text-slate-400 text-xs italic">
                    Belum ada template Microsoft Word (.docx) yang diunggah. Silakan gunakan form di atas untuk mengunggah.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* =========================================
            BARU: WORKSPACE CANVAS KREATOR DESAIN CV (Revisi 2)
           ========================================= */}
        {activeTab === "buat-desain-cv" && (
          <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn col-span-12">
            {/* Header banner info */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 font-mono text-7xl select-none uppercase font-black tracking-widest leading-none">
                CANVAS
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest font-mono">
                    ✨ Workspace Kreator Admin ✨
                  </span>
                  <h2 className="text-2xl font-display font-black text-white flex items-center gap-2 mt-2">
                    Visual CV Layout Designer (Canvas Engine)
                  </h2>
                  <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
                    Desain template resume/CV secara visual menggunakan teknologi **React Konva**. Layout yang Anda kreasikan akan langsung diterbitkan secara dinamis ke Katalog Pengguna dan dapat digunakan oleh siapa saja dalam format JSON canvas responsif. Gunakan tag variabel standar seperti <code className="text-amber-300 font-mono font-bold">{"{{NAMA_LENGKAP}}"}</code>, <code className="text-amber-300 font-mono font-bold">{"{{TITLE}}"}</code>, dll.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Apakah Anda yakin ingin mengosongkan seluruh isi Canvas?")) {
                        initCvCanvasTemplate([], null, "#ffffff");
                      }
                    }}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-755 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    🗑️ Reset Kosong
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = [
                        { type: "rect", id: "sh_accent", x: 0, y: 0, width: 800, height: 18, fill: "#3b82f6", wrapMode: "behind" },
                        { type: "text", id: "un_nama", text: "{{NAMA_LENGKAP}}", x: 60, y: 50, fontSize: 28, fontFamily: "Inter", fill: "#1e293b", fontStyle: "bold", width: 680, align: "left" },
                        { type: "text", id: "un_title", text: "{{TITLE}}", x: 60, y: 92, fontSize: 13, fontFamily: "Inter", fill: "#3b82f6", fontStyle: "bold", width: 680, align: "left" },
                        { type: "rect", id: "sh_line", x: 60, y: 130, width: 680, height: 1.5, fill: "#e2e8f0", wrapMode: "behind" },
                        { type: "text", id: "lbl_kontak", text: "KONTAK", x: 60, y: 160, fontSize: 11, fontFamily: "Inter", fill: "#64748b", fontStyle: "bold", width: 200, align: "left" },
                        { type: "text", id: "un_kontak", text: "✉️ {{EMAIL}}\n📞 {{TELEPON}}\n📍 {{ALAMAT}}", x: 60, y: 185, fontSize: 10, fontFamily: "Inter", fill: "#1e293b", width: 200, align: "left" },
                        { type: "text", id: "lbl_profil", text: "PROFIL SINGKAT", x: 280, y: 160, fontSize: 11, fontFamily: "Inter", fill: "#64748b", fontStyle: "bold", width: 460, align: "left" },
                        { type: "text", id: "un_profil", text: "{{TENTANG_SAYA}}", x: 280, y: 185, fontSize: 10.5, fontFamily: "Inter", fill: "#475569", width: 460, lineHeight: 1.3, align: "left" }
                      ];
                      initCvCanvasTemplate(sample, null, "#fbfbfd");
                    }}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-755 border border-slate-700 hover:border-slate-600 text-slate-350 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    💡 Load Minimalist Template
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Editor Load Catalog panel */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl">
              <h3 className="text-xs font-black uppercase text-slate-755 tracking-wider mb-3 flex items-center gap-1.5">
                💼 Sunting Dari Katalog Teraktif ({templates.filter(t => t.category === "resume" && t.htmlMarkup && t.htmlMarkup.trim().startsWith("{")).length} template canvas terdeteksi)
              </h3>
              <p className="text-[11px] text-slate-500 mb-4">
                Pilih salah satu template desain visual yang ada di database untuk dimuat langsung ke canvas. Anda dapat memperbaikinya lalu klik "Save Update" untuk memperbarui!
              </p>
              
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin snap-x">
                {templates
                  .filter(t => t.category === "resume" && t.htmlMarkup && t.htmlMarkup.trim().startsWith("{"))
                  .map((t) => {
                    return (
                      <div key={t.id} className="w-64 shrink-0 snap-start bg-white p-3.5 border border-slate-200 rounded-2xl flex flex-col justify-between hover:shadow-xs transition">
                        <div>
                          <div className="aspect-[3/4] w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-150 mb-2.5 relative group">
                            {t.previewUrl ? (
                              <img src={t.previewUrl} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition animate-fadeIn" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-mono">No Preview JPG</div>
                            )}
                            <span className="absolute top-2 left-2 bg-slate-900 border border-slate-800 text-white rounded text-[8px] px-1.5 font-bold uppercase py-0.5 shadow">
                              {t.tier?.toUpperCase() || "BASIC"}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-900 truncate" title={t.name}>{t.name}</h4>
                          <p className="text-[9px] text-slate-400 truncate mb-2">ID: {t.id}</p>
                          <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 mb-3">{t.description || "Tidak ada deskripsi."}</p>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const parsed = JSON.parse(t.htmlMarkup);
                              const list = parsed.elements || [];
                              const bg = parsed.backgroundColor || "#ffffff";
                              initCvCanvasTemplate(list, t.id, bg);
                              setCvTplName(t.name);
                              setCvTplTier(t.tier as any || "basic");
                              setCvTplDescription(t.description || "");
                              setCvTplPreviewUrl(t.previewUrl || "");
                              showFeedback("", `Template "${t.name}" berhasil dimuat ke Canvas Editor!`);
                            } catch (err) {
                              alert("Gagal membaca file JSON markup untuk template ini.");
                            }
                          }}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xxs font-black tracking-wide uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          ✏️ Load ke Canvas Editor
                        </button>
                      </div>
                    );
                  })}
                
                {templates.filter(t => t.category === "resume" && t.htmlMarkup && t.htmlMarkup.trim().startsWith("{")).length === 0 && (
                  <div className="w-full py-8 text-center text-slate-400 text-xs italic">
                    Belum ada template tipe canvas di database. Silakan gunakan Workspace di bawah ini untuk membuat baru!
                  </div>
                )}
              </div>
            </div>

            {/* Core Workspace - Layout Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Properties and Insertions sidebar panel (cols-4) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* 1. Element Inserting Controls */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h3 className="font-display font-black text-xs text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                      ➕ Tambahkan Elemen Baru
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCvAddElement("text")}
                      className="py-2.5 px-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 text-slate-805 hover:text-amber-800 text-xxs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>📝</span> Teks Custom
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCvAddElement("rect")}
                      className="py-2.5 px-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-805 hover:text-blue-800 text-xxs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>⏹️</span> Kotak Hiasan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCvAddElement("circle")}
                      className="py-2.5 px-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-805 hover:text-emerald-800 text-xxs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>⚪</span> Bulatan Hiasan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCvAddElement("image")}
                      className="py-2.5 px-3 bg-slate-50 hover:bg-purple-55 border border-slate-200 text-slate-805 hover:text-purple-800 text-xxs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🖼️</span> Frame Foto
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Upload & Tambah Gambar Baru</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64 = reader.result as string;
                          const newEl = {
                            id: `image_${Date.now()}`,
                            type: "image",
                            x: 100,
                            y: 100,
                            width: 120,
                            height: 120,
                            url: base64,
                            shape: "circle",
                            wrapMode: "front"
                          };
                          updateCvElementsAndHistory([...cvCanvasElements, newEl]);
                          setCvSelectedElementId(newEl.id);
                          e.target.value = "";
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="block w-full text-xxs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xxs file:font-semibold file:bg-purple-100 file:text-purple-850 hover:file:bg-purple-200 cursor-pointer border border-dashed border-purple-200 p-2 bg-purple-50/30 rounded-2xl outline-none"
                    />
                  </div>
                </div>

                {/* 2. Selection Property controller */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h3 className="font-display font-black text-xs text-slate-900 uppercase tracking-widest">
                      ⚙️ Parameter Elemen Terpilih
                    </h3>
                    {cvSelectedElementId && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold border border-slate-200 animate-pulse">
                        Active
                      </span>
                    )}
                  </div>

                  {(() => {
                    if (!cvSelectedElementId) {
                      return (
                        <div className="py-6 text-center text-slate-400 text-xs italic">
                          Belum ada elemen yang dipilih di Canvas. Klik elemen pada mockup sheet untuk mengonfigurasinya.
                        </div>
                      );
                    }

                    const el = cvCanvasElements.find(item => item.id === cvSelectedElementId);
                    if (!el) return <div className="text-xs text-red-500">Elemen tidak ditemukan.</div>;

                    return (
                      <div className="space-y-4 text-xs">
                        
                        {/* Selected ID tag */}
                        <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold">Tipe:</span>
                          <span className="font-black text-slate-850 capitalize font-mono text-[10px] bg-sky-50 text-sky-750 px-1.5 py-0.5 rounded border border-sky-200">
                            {el.type} ({el.id})
                          </span>
                        </div>

                        {/* TEXT SPECIFIC FIELDS */}
                        {el.type === "text" && (
                          <div className="space-y-3.5">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Isi Teks / Tag Variable</label>
                                <span className="text-[10px] text-brand font-bold animate-pulse">✨ Fitur Blok/Sorot Aktif</span>
                              </div>

                              {/* Selection Formatting & Splitting Toolbar */}
                              <div className="bg-slate-50 p-2 border border-slate-200/80 rounded-xl space-y-2 mb-2 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                    💡 ALAT PENYUNTING TEKS (BLOK)
                                  </span>
                                  <span className="text-[8px] bg-sky-100 text-sky-800 px-1 py-0.5 rounded font-black uppercase">Instan</span>
                                </div>
                                <p className="text-[9.5px] text-slate-500 leading-tight">
                                  Sorot (block) beberapa kata di kolom bawah (misal: "PENGALAMAN KERJA") untuk memformat atau memisahnya:
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    title="Ubah teks yang diblok menjadi KAPITAL"
                                    onClick={() => {
                                      const textarea = adminTextareaRef.current;
                                      if (!textarea) return;
                                      const start = textarea.selectionStart;
                                      const end = textarea.selectionEnd;
                                      const originalText = cvElementTextVal || "";
                                      let newText = originalText;
                                      if (start !== end) {
                                        const before = originalText.substring(0, start);
                                        const selected = originalText.substring(start, end);
                                        const after = originalText.substring(end);
                                        newText = before + selected.toUpperCase() + after;
                                      } else {
                                        newText = originalText.toUpperCase();
                                      }
                                      setCvElementTextVal(newText);
                                      const updated = cvCanvasElements.map(item => 
                                        item.id === el.id ? { ...item, text: newText } : item
                                      );
                                      updateCvElementsAndHistory(updated);
                                      setTimeout(() => {
                                        textarea.focus();
                                        textarea.setSelectionRange(start, end);
                                      }, 50);
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-705 border border-slate-200 rounded-lg text-[9px] font-black cursor-pointer transition flex items-center gap-0.5"
                                  >
                                    🔠 KAPITAL
                                  </button>

                                  <button
                                    type="button"
                                    title="Ubah teks yang diblok menjadi huruf kecil"
                                    onClick={() => {
                                      const textarea = adminTextareaRef.current;
                                      if (!textarea) return;
                                      const start = textarea.selectionStart;
                                      const end = textarea.selectionEnd;
                                      const originalText = cvElementTextVal || "";
                                      let newText = originalText;
                                      if (start !== end) {
                                        const before = originalText.substring(0, start);
                                        const selected = originalText.substring(start, end);
                                        const after = originalText.substring(end);
                                        newText = before + selected.toLowerCase() + after;
                                      } else {
                                        newText = originalText.toLowerCase();
                                      }
                                      setCvElementTextVal(newText);
                                      const updated = cvCanvasElements.map(item => 
                                        item.id === el.id ? { ...item, text: newText } : item
                                      );
                                      updateCvElementsAndHistory(updated);
                                      setTimeout(() => {
                                        textarea.focus();
                                        textarea.setSelectionRange(start, end);
                                      }, 50);
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-705 border border-slate-200 rounded-lg text-[9px] font-black cursor-pointer transition flex items-center gap-0.5"
                                  >
                                    🔡 kecil
                                  </button>

                                  <button
                                    type="button"
                                    title="Jadikan Tebal (Bold)"
                                    onClick={() => {
                                      const nextStyle = cvElementFontStyle === "bold" ? "normal" : "bold";
                                      setCvElementFontStyle(nextStyle);
                                      const updated = cvCanvasElements.map(item => 
                                        item.id === el.id ? { ...item, fontStyle: nextStyle } : item
                                      );
                                      updateCvElementsAndHistory(updated);
                                    }}
                                    className={`px-2 py-1 select-none font-bold rounded-lg text-[9px] cursor-pointer transition flex items-center gap-0.5 border ${
                                      cvElementFontStyle === "bold" 
                                        ? "bg-slate-800 text-white border-slate-900" 
                                        : "bg-white hover:bg-slate-100 text-slate-705 border-slate-200"
                                    }`}
                                  >
                                    <b>B</b> Tebal
                                  </button>

                                  <button
                                    type="button"
                                    title="Perbesar Ukuran Font (+2px)"
                                    onClick={() => {
                                      const nextSize = Math.min(cvElementFontSize + 2, 72);
                                      setCvElementFontSize(nextSize);
                                      const updated = cvCanvasElements.map(item => 
                                        item.id === el.id ? { ...item, fontSize: nextSize } : item
                                      );
                                      updateCvElementsAndHistory(updated);
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-705 border border-slate-200 rounded-lg text-[9px] font-black cursor-pointer transition flex items-center gap-0.5"
                                  >
                                    ➕ A+
                                  </button>

                                  <button
                                    type="button"
                                    title="Perkecil Ukuran Font (-2px)"
                                    onClick={() => {
                                      const nextSize = Math.max(cvElementFontSize - 2, 8);
                                      setCvElementFontSize(nextSize);
                                      const updated = cvCanvasElements.map(item => 
                                        item.id === el.id ? { ...item, fontSize: nextSize } : item
                                      );
                                      updateCvElementsAndHistory(updated);
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-705 border border-slate-200 rounded-lg text-[9px] font-black cursor-pointer transition flex items-center gap-0.5"
                                  >
                                    ➖ A-
                                  </button>

                                  <select
                                    title="Ubah Jenis Font"
                                    value=""
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (!val) return;
                                      setCvElementFontFamily(val);
                                      const next = cvCanvasElements.map(item => 
                                        item.id === el.id ? { ...item, fontFamily: val } : item
                                      );
                                      updateCvElementsAndHistory(next);
                                    }}
                                    className="h-6 px-1.5 py-0 bg-white hover:bg-slate-100 text-slate-705 border border-slate-200 rounded-lg text-[9px] font-bold cursor-pointer transition focus:outline-none max-w-[100px]"
                                  >
                                    <option value="">⚙️ Font...</option>
                                    <option value="Inter">Inter</option>
                                    <option value="Space Grotesk">Space Grotesk</option>
                                    <option value="Outfit">Outfit</option>
                                    <option value="Playfair Display">Playfair Display</option>
                                    <option value="JetBrains Mono">JetBrains Mono</option>
                                    <option value="Fira Code">Fira Code</option>
                                  </select>

                                  <button
                                    type="button"
                                    title="Pecah teks yang diblok menjadi bagian terpisah di Canvas agar dapat Anda beri style & ukuran khusus secara terpisah"
                                    onClick={() => {
                                      const textarea = adminTextareaRef.current;
                                      if (!textarea) return;
                                      const start = textarea.selectionStart;
                                      const end = textarea.selectionEnd;
                                      if (start === end) {
                                        alert("Silakan block kata atau baris di kolom bawah (contoh: 'PENGALAMAN KERJA'), lalu tekan tombol pecah ini!");
                                        return;
                                      }
                                      const originalText = cvElementTextVal || "";
                                      const selected = originalText.substring(start, end).trim();
                                      if (!selected) return;

                                      const before = originalText.substring(0, start);
                                      const after = originalText.substring(end);
                                      let updatedOriginal = (before + after).replace(/\n\n\n+/g, '\n\n').trim();
                                      if (!updatedOriginal) {
                                        updatedOriginal = "-";
                                      }

                                      const newTextId = `txt_${Date.now()}`;
                                      const newTextEl = {
                                        ...el,
                                        id: newTextId,
                                        text: selected,
                                        x: el.x,
                                        y: el.y + 25,
                                        fontSize: el.fontSize ? Math.min(el.fontSize + 2, 24) : 14,
                                        fontStyle: "bold",
                                        isLocked: false
                                      };

                                      const updatedExisting = cvCanvasElements.map(item => 
                                        item.id === el.id ? { ...item, text: updatedOriginal } : item
                                      );
                                      
                                      const refreshed = [...updatedExisting, newTextEl];
                                      updateCvElementsAndHistory(refreshed);
                                      
                                      setCvSelectedElementId(newTextId);
                                      setCvElementTextVal(selected);
                                      setCvElementFontSize(newTextEl.fontSize);
                                      setCvElementFontStyle("bold");
                                    }}
                                    className="px-2 py-1.5 bg-brand text-white hover:bg-brand-dark rounded-lg text-[9px] font-black cursor-pointer transition flex items-center gap-0.5 shadow-sm ml-auto"
                                  >
                                    ✂️ PECAH JADI ELEMEN BARU
                                  </button>
                                </div>
                              </div>

                              <textarea
                                ref={adminTextareaRef}
                                value={cvElementTextVal}
                                onChange={(e) => {
                                  setCvElementTextVal(e.target.value);
                                  const updated = cvCanvasElements.map(item => 
                                    item.id === el.id ? { ...item, text: e.target.value } : item
                                  );
                                  updateCvElementsAndHistory(updated);
                                }}
                                className="w-full text-xs font-semibold p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand leading-relaxed"
                                rows={3}
                                placeholder="Tuliskan teks resume atau model tag seperti {{NAMA_LENGKAP}}"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[10px]">Font Family</label>
                                <select
                                  value={cvElementFontFamily}
                                  onChange={(e) => {
                                    setCvElementFontFamily(e.target.value);
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, fontFamily: e.target.value } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  }}
                                  className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                                >
                                  {["Inter", "Space Grotesk", "Outfit", "Playfair Display", "JetBrains Mono", "Fira Code"].map(f => (
                                    <option key={f} value={f}>{f}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[10px]">Ukuran Font ({cvElementFontSize}px)</label>
                                <input
                                  type="range"
                                  min="8"
                                  max="72"
                                  value={cvElementFontSize}
                                  onChange={(e) => {
                                    const size = parseInt(e.target.value);
                                    setCvElementFontSize(size);
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, fontSize: size } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  }}
                                  className="w-full mt-2"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                              <div>
                                <label className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[10px]">Batas Lebar Kolom ({el.width || 150}px)</label>
                                <input
                                  type="range"
                                  min="50"
                                  max="800"
                                  step="5"
                                  value={el.width || 150}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setCvElementWidth(val);
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, width: val } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  }}
                                  className="w-full mt-2"
                                />
                              </div>

                              <div>
                                <label className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[10px]">Tinggi Garis / Spasi ({el.lineHeight || 1.2})</label>
                                <input
                                  type="range"
                                  min="0.5"
                                  max="3"
                                  step="0.05"
                                  value={el.lineHeight || 1.2}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setCvElementLineHeight(val);
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, lineHeight: val } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  }}
                                  className="w-full mt-2"
                                />
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                              <label className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[10px]">Mode Bungkus Teks (Wrap Mode)</label>
                              <select
                                value={el.wrap || "word"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = cvCanvasElements.map(item => 
                                    item.id === el.id ? { ...item, wrap: val } : item
                                  );
                                  updateCvElementsAndHistory(updated);
                                }}
                                className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                              >
                                <option value="word">Bungkus Kata (word)</option>
                                <option value="char">Bungkus Karakter (char)</option>
                                <option value="none">Tanpa Bungkus/Wrap (none)</option>
                              </select>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextStyle = cvElementFontStyle === "bold" ? "normal" : "bold";
                                  setCvElementFontStyle(nextStyle);
                                  const updated = cvCanvasElements.map(item => 
                                    item.id === el.id ? { ...item, fontStyle: nextStyle } : item
                                  );
                                  updateCvElementsAndHistory(updated);
                                }}
                                className={`py-1.5 rounded-lg border text-xs font-bold transition flex justify-center items-center cursor-pointer ${
                                  cvElementFontStyle === "bold" 
                                    ? "bg-slate-900 border-slate-900 text-white" 
                                    : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"
                                }`}
                              >
                                Tebal (B)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextStyle = cvElementFontStyle === "italic" ? "normal" : "italic";
                                  setCvElementFontStyle(nextStyle);
                                  const updated = cvCanvasElements.map(item => 
                                    item.id === el.id ? { ...item, fontStyle: nextStyle } : item
                                  );
                                  updateCvElementsAndHistory(updated);
                                }}
                                className={`py-1.5 rounded-lg border text-xs font-bold transition flex justify-center items-center cursor-pointer ${
                                  cvElementFontStyle === "italic" 
                                    ? "bg-slate-900 border-slate-900 text-white" 
                                    : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"
                                }`}
                              >
                                Miring (I)
                              </button>
                              <select
                                value={cvElementAlign}
                                onChange={(e) => {
                                  setCvElementAlign(e.target.value);
                                  const updated = cvCanvasElements.map(item => 
                                    item.id === el.id ? { ...item, align: e.target.value } : item
                                  );
                                  updateCvElementsAndHistory(updated);
                                }}
                                className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none block w-full text-center cursor-pointer"
                              >
                                <option value="left">Rata Kiri</option>
                                <option value="center">Tengah</option>
                                <option value="right">Rata Kanan</option>
                              </select>
                            </div>

                            <div className="border-t border-slate-100 pt-3 space-y-2">
                              <label className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">Tata Letak Dinamis (Dynamic Flow)</label>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, relativeTo: undefined, relativeGap: undefined } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  }}
                                  className={`py-1.5 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                                    !el.relativeTo 
                                      ? "bg-slate-900 border-slate-900 text-white" 
                                      : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"
                                  }`}
                                >
                                  📌 Absolut (Tetap)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Cari elemen teks terdekat secara vertikal di atas el
                                    const textElementsAbove = cvCanvasElements.filter(item => 
                                      item.id !== el.id && 
                                      item.type === "text" && 
                                      item.y < el.y
                                    );
                                    let bestParent = null;
                                    if (textElementsAbove.length > 0) {
                                      // Urutkan menurun berdasarkan koordinat y (biar dapet yang paling dekat dengan el)
                                      textElementsAbove.sort((a, b) => b.y - a.y);
                                      bestParent = textElementsAbove[0];
                                    } else {
                                      // Fallback ke elemen teks lain apa pun
                                      bestParent = cvCanvasElements.find(item => item.id !== el.id && item.type === "text" && item.id !== "bg");
                                    }

                                    // Jika tidak ada teks sama sekali, cari apa pun selain background
                                    const parentEl = bestParent || cvCanvasElements.find(item => item.id !== el.id && item.id !== "bg" && item.id !== "background");
                                    
                                    if (parentEl) {
                                      const parentHeight = getElementHeight(parentEl, {});
                                      const defaultGap = Math.max(10, Math.round(el.y - (parentEl.y + parentHeight)));
                                      const updated = cvCanvasElements.map(item => 
                                        item.id === el.id ? { ...item, relativeTo: parentEl.id, relativeGap: defaultGap } : item
                                      );
                                      updateCvElementsAndHistory(updated);
                                    } else {
                                      alert("Gagal mengaktifkan: silakan tambahkan minimal 2 elemen terlebih dahulu.");
                                    }
                                  }}
                                  className={`py-1.5 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                                    el.relativeTo 
                                      ? "bg-slate-900 border-slate-900 text-white" 
                                      : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"
                                  }`}
                                >
                                  🔗 Mengikuti Elemen
                                </button>
                              </div>

                              <p className="text-[10px] text-slate-500 leading-normal mt-1 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                                💡 <strong>Anti-Tabrakan / Menimpa:</strong> Gunakan fitur ini agar elemen ini otomatis bergeser ke bawah jika data di atasnya (contoh: <em>Pengalaman Kerja</em>) bertambah panjang.
                              </p>

                              {el.relativeTo && (
                                <div className="space-y-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-[10px]">
                                  <div>
                                    <label className="text-slate-400 font-bold block mb-1">Gantung di Bawah Elemen:</label>
                                    <select
                                      value={el.relativeTo || ""}
                                      onChange={(e) => {
                                        const pId = e.target.value;
                                        const targetParent = cvCanvasElements.find(item => item.id === pId);
                                        const gap = targetParent ? Math.max(10, Math.round(el.y - (targetParent.y + getElementHeight(targetParent, {})))) : 15;
                                        const updated = cvCanvasElements.map(item => 
                                          item.id === el.id ? { ...item, relativeTo: pId, relativeGap: gap } : item
                                        );
                                        updateCvElementsAndHistory(updated);
                                      }}
                                      className="w-full text-xxs font-semibold p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
                                    >
                                      {cvCanvasElements
                                        .filter(item => item.id !== el.id)
                                        .map(item => {
                                          const isText = item.type === "text";
                                          const icon = isText ? "📝" : item.type === "image" ? "🖼️" : "📦";
                                          const label = item.text ? (item.text.length > 35 ? item.text.substring(0, 35) + "..." : item.text) : `${item.type} (${item.id})`;
                                          return <option key={item.id} value={item.id}>{icon} {label}</option>;
                                        })}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-slate-400 font-bold block mb-1">Jarak Spasi Vertikal ({el.relativeGap !== undefined ? el.relativeGap : 15}px):</label>
                                    <input
                                      type="range"
                                      min="-100"
                                      max="200"
                                      value={el.relativeGap !== undefined ? el.relativeGap : 15}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        const updated = cvCanvasElements.map(item => 
                                          item.id === el.id ? { ...item, relativeGap: val } : item
                                        );
                                        updateCvElementsAndHistory(updated);
                                      }}
                                      className="w-full mt-1 accent-indigo-600 block h-1"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* IMAGE SPECIFIC FIELDS */}
                        {el.type === "image" && (
                          <div className="space-y-3.5">
                            <div>
                              <label className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[10px]">URL Gambar Unsplash / Hosted</label>
                              <input
                                type="text"
                                value={el.url || ""}
                                onChange={(e) => {
                                  const updated = cvCanvasElements.map(item => 
                                    item.id === el.id ? { ...item, url: e.target.value } : item
                                  );
                                  updateCvElementsAndHistory(updated);
                                }}
                                className="w-full text-xs font-semibold p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand"
                                placeholder="Masukan link URL foto draf..."
                              />
                            </div>

                            <div>
                              <label className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[10px]">Upload Foto Custom</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const base64 = reader.result as string;
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, url: base64 } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  };
                                  reader.readAsDataURL(file);
                                }}
                                className="block w-full text-xxs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xxs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer border border-dashed border-slate-200 p-1.5 bg-slate-50 rounded-xl outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[10px]">Bentuk Frame</label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, shape: "circle" } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  }}
                                  className={`py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                                    el.shape === "circle" 
                                      ? "bg-slate-900 border-slate-900 text-white" 
                                      : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"
                                  }`}
                                >
                                  Lingkaran
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, shape: "square" } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  }}
                                  className={`py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                                    el.shape === "square" 
                                      ? "bg-slate-900 border-slate-900 text-white" 
                                      : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"
                                  }`}
                                >
                                  Kotak
                                </button>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Warna Bingkai Foto</label>
                                <div className="flex gap-1">
                                  {["transparent", "#ffffff", "#dc2626", "#3b82f6", "#10b981", "#f59e0b", "#1e293b"].map(c => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => {
                                        const updated = cvCanvasElements.map(item => 
                                          item.id === el.id ? { ...item, borderFill: c } : item
                                        );
                                        updateCvElementsAndHistory(updated);
                                      }}
                                      className="w-3.5 h-3.5 rounded border border-slate-350 shadow-xxs cursor-pointer"
                                      style={{ backgroundColor: c === "transparent" ? "white" : c, position: "relative" }}
                                      title={c}
                                    >
                                      {c === "transparent" && <span className="absolute inset-0 flex items-center justify-center text-[7px] text-red-500 font-bold">×</span>}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={el.borderFill && el.borderFill.startsWith("#") && el.borderFill.length === 7 ? el.borderFill : "#ffffff"}
                                  onChange={(e) => {
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, borderFill: e.target.value } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  }}
                                  className="w-10 h-8 p-0 cursor-pointer border border-slate-200 rounded outline-none shrink-0"
                                />
                                <input
                                  type="text"
                                  value={el.borderFill || "transparent"}
                                  onChange={(e) => {
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, borderFill: e.target.value } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  }}
                                  className="w-full text-xs font-mono p-1.5 border border-slate-200 rounded-lg text-center"
                                  placeholder="transparent atau warna HEX"
                                />
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Ketebalan Bingkai ({el.strokeWidth || 0}px)</label>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="20"
                                step="1"
                                value={el.strokeWidth || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  const updated = cvCanvasElements.map(item => 
                                    item.id === el.id ? { ...item, strokeWidth: val } : item
                                  );
                                  updateCvElementsAndHistory(updated);
                                }}
                                className="w-full mt-1.5"
                              />
                            </div>
                          </div>
                        )}

                        {/* RECTANGLE / DECORATION FILL CONFIGS */}
                        {el.type !== "image" && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Warna Isian (HEX Color)</label>
                              <div className="flex gap-1.5">
                                {["#1e293b", "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#6366f1", "#ececec", "#ffffff"].map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                      setCvElementColorVal(c);
                                      const updated = cvCanvasElements.map(item => 
                                        item.id === el.id ? { ...item, fill: c } : item
                                      );
                                      updateCvElementsAndHistory(updated);
                                    }}
                                    className="w-4 h-4 rounded border border-slate-350 shadow-xs cursor-pointer inline-block"
                                    style={{ backgroundColor: c }}
                                    title={c}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={cvElementColorVal.startsWith("#") && cvElementColorVal.length === 7 ? cvElementColorVal : "#000000"}
                                onChange={(e) => {
                                  setCvElementColorVal(e.target.value);
                                  const updated = cvCanvasElements.map(item => 
                                    item.id === el.id ? { ...item, fill: e.target.value } : item
                                  );
                                  updateCvElementsAndHistory(updated);
                                }}
                                className="w-10 h-8 p-0 cursor-pointer border border-slate-200 rounded outline-none shrink-0 inline-block align-middle"
                              />
                              <input
                                type="text"
                                value={cvElementColorVal}
                                onChange={(e) => {
                                  setCvElementColorVal(e.target.value);
                                  if (e.target.value.length >= 4) {
                                    const updated = cvCanvasElements.map(item => 
                                      item.id === el.id ? { ...item, fill: e.target.value } : item
                                    );
                                    updateCvElementsAndHistory(updated);
                                  }
                                }}
                                className="w-full text-xs font-mono p-1.5 border border-slate-200 rounded-lg focus:outline-none px-2 text-center"
                                placeholder="#ffffff"
                              />
                            </div>
                          </div>
                        )}

                        {/* LAYER PLACEMENT AND SIZES */}
                        <div className="space-y-3.5 border-t border-slate-100 pt-3">
                          <label className="text-slate-500 font-bold uppercase tracking-wider block mb-1 text-[10px]">Tumpukan Layer Susunan</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCvElementWrapMode("behind");
                                const updated = cvCanvasElements.map(item => 
                                  item.id === el.id ? { ...item, wrapMode: "behind" } : item
                                );
                                updateCvElementsAndHistory(updated);
                              }}
                              className={`py-1.5 rounded-lg border text-xxs font-black transition uppercase tracking-wide flex justify-center items-center cursor-pointer ${
                                el.wrapMode === "behind" 
                                  ? "bg-slate-900 border-slate-900 text-white" 
                                  : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"
                              }`}
                            >
                              ⬇️ Belakang / BG
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCvElementWrapMode("front");
                                const updated = cvCanvasElements.map(item => 
                                  item.id === el.id ? { ...item, wrapMode: "front" } : item
                                );
                                updateCvElementsAndHistory(updated);
                              }}
                              className={`py-1.5 rounded-lg border text-xxs font-black transition uppercase tracking-wide flex justify-center items-center cursor-pointer ${
                                el.wrapMode === "front" 
                                  ? "bg-slate-900 border-slate-900 text-white" 
                                  : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50"
                              }`}
                            >
                              ⬆️ Depan / Teks
                            </button>
                          </div>
                        </div>

                        {/* DELETE CHOSEN ELEMENT */}
                        <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!el) return;
                              const newId = `${el.type || 'el'}_${Date.now()}`;
                              const baseShift = 20;
                              const cloned = {
                                ...el,
                                id: newId,
                                x: (el.x || 0) + baseShift,
                                y: (el.y || 0) + baseShift,
                                relativeTo: undefined,
                                relativeGap: undefined,
                              };
                              const updated = [...cvCanvasElements, cloned];
                              updateCvElementsAndHistory(updated);
                              setCvSelectedElementId(newId);
                            }}
                            className="w-1/2 text-center py-2.5 border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 text-xxs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                          >
                            📑 Duplikat Elemen
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = cvCanvasElements.filter(item => item.id !== el.id);
                              updateCvElementsAndHistory(updated);
                              setCvSelectedElementId(null);
                            }}
                            className="w-1/2 text-center py-2.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xxs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                          >
                            🗑️ Lenyapkan Elemen
                          </button>
                        </div>

                      </div>
                    );
                  })()}
                </div>

                {/* 3. Global Canvas Backdrop Configs */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-display font-black text-xs text-slate-900 uppercase tracking-widest">
                      🎨 Background & Zoom Control
                    </h3>
                  </div>

                  {/* Backdrop Selector fill colors */}
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Warna Dasar Kertas</label>
                        <div className="flex gap-1.5">
                          {["#ffffff", "#faf9f6", "#fcf8f2", "#f4f4f7", "#0f172a"].map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setCvCanvasBgColor(c)}
                              className="w-4.5 h-4.5 rounded border border-slate-350 shadow-xs cursor-pointer inline-block"
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={cvCanvasBgColor.startsWith("#") && cvCanvasBgColor.length === 7 ? cvCanvasBgColor : "#ffffff"}
                          onChange={(e) => setCvCanvasBgColor(e.target.value)}
                          className="w-10 h-8 p-0 cursor-pointer border border-slate-200 rounded outline-none shrink-0 inline-block"
                        />
                        <input
                          type="text"
                          value={cvCanvasBgColor}
                          onChange={(e) => setCvCanvasBgColor(e.target.value)}
                          className="w-full text-xs font-mono p-1.5 border border-slate-200 rounded-lg text-center"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    {/* Scale Controls inside global panel */}
                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Perbesaran Lembar Mockup</label>
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{Math.round(cvCanvasScale * 100)}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setCvZoomMode("auto")}
                          className={`py-1 rounded-lg border text-[10px] font-bold transition leading-none cursor-pointer ${cvZoomMode === "auto" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                        >
                          Auto Fit Scale
                        </button>
                        <button
                          type="button"
                          onClick={() => setCvZoomMode("manual")}
                          className={`py-1 rounded-lg border text-[10px] font-bold transition leading-none cursor-pointer ${cvZoomMode === "manual" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                        >
                          Manual Zoom
                        </button>
                      </div>
                      {cvZoomMode === "manual" && (
                        <input
                          type="range"
                          min="0.15"
                          max="1.5"
                          step="0.05"
                          value={cvCanvasScale}
                          onChange={(e) => setCvCanvasScale(parseFloat(e.target.value))}
                          className="w-full mt-1.5"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Import / Export JSON Blueprint Paste */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-display font-black text-xs text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                      📤 Kode JSON Import & Export
                    </h3>
                  </div>
                  <div className="space-y-3 text-xs">
                    <textarea
                      value={cvImportJsonInput}
                      onChange={(e) => setCvImportJsonInput(e.target.value)}
                      placeholder="Paste kode JSON berformat {elements: [...]} di sini lalu klik tombol import..."
                      className="w-full font-mono text-[10px] p-2.5 border border-slate-200 rounded-xl leading-normal h-24"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(cvImportJsonInput);
                            const list = parsed.elements || [];
                            const bg = parsed.backgroundColor || "#ffffff";
                            initCvCanvasTemplate(list, null, bg);
                            showFeedback("", "Struktur JSON berhasil diterapkan ke canvas!");
                          } catch (err) {
                            alert("Format JSON tidak valid! Gunakan format schema {elements: [...], backgroundColor: '#...'}");
                          }
                        }}
                        className="flex-1 py-2 bg-slate-905 text-white hover:bg-slate-800 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer"
                      >
                        📥 Terapkan JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const currentLayoutJson = JSON.stringify({
                            backgroundColor: cvCanvasBgColor,
                            width: 800,
                            height: 1100,
                            elements: cvCanvasElements
                          }, null, 2);
                          setCvImportJsonInput(currentLayoutJson);
                          navigator.clipboard.writeText(currentLayoutJson);
                          showFeedback("", "Kode JSON diexport dan disalin ke clipboard!");
                        }}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer"
                      >
                        📋 Ambil JSON Canvas
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Graphical Workstation Mockup sheet panel (cols-8) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Visual history tracking controls bar */}
                <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={cvCanvasHistoryIndex <= 0}
                      onClick={handleCvUndo}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        cvCanvasHistoryIndex > 0 
                          ? "bg-slate-100 border-slate-200 text-slate-850 hover:bg-slate-205" 
                          : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      ↩️ Undo
                    </button>
                    <button
                      type="button"
                      disabled={cvCanvasHistoryIndex >= cvCanvasHistory.length - 1}
                      onClick={handleCvRedo}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        cvCanvasHistoryIndex < cvCanvasHistory.length - 1 
                          ? "bg-slate-100 border-slate-200 text-slate-850 hover:bg-slate-205" 
                          : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      ↪️ Redo
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono pl-2">
                      Keadaan: {cvCanvasHistoryIndex + 1} / {cvCanvasHistory.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xxs font-mono text-slate-450">
                    <span>💡 Drag & Transform handles on stage</span>
                  </div>
                </div>

                {/* THE LIVE STAGE CONTAINER */}
                <div 
                  ref={cvCanvasContainerRef}
                  className="w-full bg-slate-700/10 border border-slate-250 rounded-3xl overflow-auto p-4 sm:p-8 flex justify-center items-center relative min-h-[600px]"
                  style={{ backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1px)", backgroundSize: "20px 20px" }}
                >
                  <div 
                    className="relative shadow-2xl transition border border-slate-500/20 bg-white"
                    style={{
                      width: 800 * cvCanvasScale,
                      height: 1100 * cvCanvasScale,
                      transformOrigin: "center center"
                    }}
                  >
                    <Stage
                      ref={cvStageRef}
                      width={800}
                      height={1100}
                      scaleX={cvCanvasScale}
                      scaleY={cvCanvasScale}
                      onClick={(e) => {
                        const target = e.target;
                        if (target === cvStageRef.current || target.name() === "paper_bgColor") {
                          setCvSelectedElementId(null);
                        }
                      }}
                    >
                      <Layer>
                        {/* Background Base paper block */}
                        <Rect
                          id="paper_bg"
                          name="paper_bgColor"
                          x={0}
                          y={0}
                          width={800}
                          height={1100}
                          fill={cvCanvasBgColor}
                        />

                        {/* Rendering core customized CV elements */}
                        {getResolvedCanvasElements(getCvSortedCanvasElements(), {}).map((el) => {
                          if (el.type === "rect") {
                            return (
                              <Rect
                                key={el.id}
                                id={el.id}
                                x={el.x}
                                y={el.y}
                                width={el.width || 120}
                                height={el.height || 120}
                                fill={el.fill || "#3b82f6"}
                                draggable={true}
                                onDragEnd={(e: any) => handleElementDragEnd(el.id, e.target.x(), e.target.y())}
                                onTransformEnd={(e: any) => {
                                  const node = e.target;
                                  const scaleX = node.scaleX();
                                  const scaleY = node.scaleY();
                                  node.scaleX(1);
                                  node.scaleY(1);
                                  const nextWidth = Math.round(node.width() * scaleX);
                                  const nextHeight = Math.round(node.height() * scaleY);
                                  handleElementTransformEnd(el.id, node.x(), node.y(), { width: nextWidth, height: nextHeight });
                                  setCvElementWidth(nextWidth);
                                  setCvElementHeight(nextHeight);
                                }}
                                onClick={() => {
                                  setCvSelectedElementId(el.id);
                                  setCvElementWidth(el.width || 120);
                                  setCvElementHeight(el.height || 120);
                                  setCvElementColorVal(el.fill || "#cbd5e1");
                                  setCvElementWrapMode(el.wrapMode || "behind");
                                }}
                              />
                            );
                          }

                          if (el.type === "circle") {
                            return (
                              <Circle
                                key={el.id}
                                id={el.id}
                                x={el.x}
                                y={el.y}
                                radius={el.radius || 50}
                                fill={el.fill || "#e2e8f0"}
                                draggable={true}
                                onDragEnd={(e: any) => handleElementDragEnd(el.id, e.target.x(), e.target.y())}
                                onTransformEnd={(e: any) => {
                                  const node = e.target;
                                  const scaleX = node.scaleX();
                                  node.scaleX(1);
                                  node.scaleY(1);
                                  const nextRadius = Math.round(node.radius() * scaleX);
                                  handleElementTransformEnd(el.id, node.x(), node.y(), { radius: nextRadius });
                                }}
                                onClick={() => {
                                  setCvSelectedElementId(el.id);
                                  setCvElementColorVal(el.fill || "#e2e8f0");
                                  setCvElementWrapMode(el.wrapMode || "behind");
                                }}
                              />
                            );
                          }

                          if (el.type === "image") {
                            return (
                              <CanvasImage
                                key={el.id}
                                id={el.id}
                                url={el.url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"}
                                x={el.x}
                                y={el.y}
                                width={el.width || 120}
                                height={el.height || 120}
                                draggable={true}
                                shape={el.shape || "circle"}
                                borderFill={el.borderFill || "transparent"}
                                strokeWidth={el.strokeWidth || 0}
                                onDragEnd={(e: any) => handleElementDragEnd(el.id, e.target.x(), e.target.y())}
                                onTransformEnd={(e: any) => {
                                  const node = e.target;
                                  const scaleX = node.scaleX();
                                  const scaleY = node.scaleY();
                                  node.scaleX(1);
                                  node.scaleY(1);
                                  const nextWidth = Math.round(node.width() * scaleX);
                                  const nextHeight = Math.round(node.height() * scaleY);
                                  handleElementTransformEnd(el.id, node.x(), node.y(), { width: nextWidth, height: nextHeight });
                                  setCvElementWidth(nextWidth);
                                  setCvElementHeight(nextHeight);
                                }}
                                onClick={() => {
                                  setCvSelectedElementId(el.id);
                                  setCvElementWidth(el.width || 120);
                                  setCvElementHeight(el.height || 120);
                                  setCvElementWrapMode(el.wrapMode || "front");
                                }}
                              />
                            );
                          }

                          if (el.type === "text") {
                            return (
                              <KonvaText
                                key={el.id}
                                id={el.id}
                                x={el.x}
                                y={el.y}
                                text={cvDoubleClickEditingId === el.id ? "" : (el.text || "")}
                                fontSize={el.fontSize || 12}
                                fontFamily={el.fontFamily || "Inter"}
                                fill={el.fill || "#000000"}
                                fontStyle={el.fontStyle || "normal"}
                                width={el.width || undefined}
                                lineHeight={el.lineHeight || 1.2}
                                align={el.align || "left"}
                                wrap={el.wrap || "word"}
                                draggable={true}
                                onDragEnd={(e: any) => handleElementDragEnd(el.id, e.target.x(), e.target.y())}
                                onTransformEnd={(e: any) => {
                                  const node = e.target;
                                  const scaleX = node.scaleX();
                                  const scaleY = node.scaleY();
                                  node.scaleX(1);
                                  node.scaleY(1);
                                  const nextWidth = Math.round((node.width() || 150) * scaleX);
                                  handleElementTransformEnd(el.id, node.x(), node.y(), { width: nextWidth });
                                  setCvElementWidth(nextWidth);
                                }}
                                onClick={() => {
                                  setCvSelectedElementId(el.id);
                                  setCvElementTextVal(el.text || "");
                                  setCvElementFontSize(el.fontSize || 14);
                                  setCvElementColorVal(el.fill || "#1e293b");
                                  setCvElementFontStyle(el.fontStyle || "normal");
                                  setCvElementWidth(el.width || 150);
                                  setCvElementWrapMode(el.wrapMode || "front");
                                  setCvElementFontFamily(el.fontFamily || "Inter");
                                  setCvElementLineHeight(el.lineHeight || 1.2);
                                  setCvElementAlign(el.align || "left");
                                }}
                                onDblClick={() => {
                                  setCvDoubleClickEditingId(el.id);
                                }}
                              />
                            );
                          }

                          return null;
                        })}

                        {cvSelectedElementId && (
                          <Transformer
                            ref={cvTransformerRef}
                            anchorFill="#38bdf8"
                            anchorStroke="#0284c7"
                            anchorSize={7}
                            borderStroke="#0ea5e9"
                            borderStrokeWidth={1.5}
                            rotateEnabled={true}
                            boundBoxFunc={(oldBox, newBox) => {
                              if (newBox.width < 10 || newBox.height < 10) {
                                return oldBox;
                              }
                              return newBox;
                            }}
                          />
                        )}
                      </Layer>
                    </Stage>
                  </div>
                </div>

                {/* Inline Double Click Editor overlays */}
                {cvDoubleClickEditingId && (() => {
                  const el = cvCanvasElements.find(item => item.id === cvDoubleClickEditingId);
                  if (!el || el.type !== "text") return null;

                  return (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between animate-fadeIn text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⌨️</span>
                        <div>
                          <strong className="text-amber-800">Double Click inline editor aktif:</strong>
                          <p className="text-slate-500 text-xxs">Tekan Selesai setelah mengubah teks</p>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={cvElementTextVal}
                        onChange={(e) => {
                          setCvElementTextVal(e.target.value);
                          const updated = cvCanvasElements.map(item => 
                            item.id === el.id ? { ...item, text: e.target.value } : item
                          );
                          updateCvElementsAndHistory(updated);
                        }}
                        className="flex-1 bg-white border border-amber-300 font-bold text-slate-800 rounded-xl p-2.5 outline-none text-xs text-left"
                      />
                      <button
                        type="button"
                        onClick={() => setCvDoubleClickEditingId(null)}
                        className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition uppercase text-xxs"
                      >
                        Selesai
                      </button>
                    </div>
                  );
                })()}

                {/* FORM CONTROLLERS TO PUBLISH TEMPLATE */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <h3 className="font-display font-black text-xs text-slate-950 uppercase tracking-widest">
                      🌐 Publikasikan Desain Ini Ke Katalog Pengguna
                    </h3>
                    {cvEditingTemplateId && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-black font-mono">
                        SEDANG EDIT TEMPLATE ID: {cvEditingTemplateId}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nama Katalog Desain</label>
                      <input
                        type="text"
                        placeholder="Contoh: Modern Dual Column Slate Canvas"
                        value={cvTplName}
                        onChange={(e) => setCvTplName(e.target.value)}
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Akses Tier Katalog</label>
                      <select
                        value={cvTplTier}
                        onChange={(e) => setCvTplTier(e.target.value as any)}
                        className="w-full text-xs font-semibold p-3 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      >
                        <option value="free">Gratis (Free)</option>
                        <option value="basic">Basic (Standard Premium)</option>
                        <option value="standard">Standard (Higher Premium)</option>
                        <option value="premium">Full Exclusive (Premium)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                          Upload Gambar Thumbnail (Simpan ke public_html/api/desain)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCvTemplateFileChange}
                            className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-600 cursor-pointer border border-dashed border-slate-350 p-2 bg-slate-50 rounded-xl outline-none"
                          />
                          {cvTplPreviewUrl && (
                            <div className="w-12 h-12 border border-slate-250 rounded-xl overflow-hidden shrink-0 shadow-sm bg-slate-100 flex items-center justify-center">
                              <img
                                src={cvTplPreviewUrl}
                                alt="Thumbnail Preview"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                        {cvFileError && (
                          <p className="text-[10px] text-amber-600 mt-1 font-bold">⚠️ {cvFileError}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Link URL Thumbnail Preview (Otomatis Terisi Jika Upload)</label>
                        <input
                          type="text"
                          placeholder="Contoh: https://images.unsplash.com/..."
                          value={cvTplPreviewUrl}
                          onChange={(e) => setCvTplPreviewUrl(e.target.value)}
                          className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Deskripsi Ringkas Layanan</label>
                      <input
                        type="text"
                        placeholder="Contoh: Template dua kolom elegan yang sangat cocok untuk fresh graduate di bidang teknologi."
                        value={cvTplDescription}
                        onChange={(e) => setCvTplDescription(e.target.value)}
                        className="w-full text-xs font-semibold p-3 border border-slate-250 rounded-xl focus:ring-1 focus:ring-brand focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={cvIsPublishing}
                      onClick={() => handlePublishOrUpdateCvTemplate(false)}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-slate-950 font-black text-xxs tracking-wider uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      {cvIsPublishing ? "Memproses..." : cvEditingTemplateId ? "💾 Simpan Pembaruan Desain" : "🚀 Publikasikan Ke Katalog User"}
                    </button>

                    {cvEditingTemplateId && (
                      <button
                        type="button"
                        disabled={cvIsPublishing}
                        onClick={() => handlePublishOrUpdateCvTemplate(true)}
                        className="py-3 px-5 bg-slate-905 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black text-xxs tracking-wider uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        Publish Sebagai Katalog Baru
                      </button>
                    )}
                  </div>
                </div>

              </div>
              
            </div>
          </div>
        )}

        {/* =========================================
            ADMIN SECTION 3: KELOLA AKUN USER (Separated view)
           ========================================= */}
        {activeTab === "kelola-user" && (
          <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
            
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-display font-black text-slate-900">Kelola Member Terdaftar</h2>
                  <p className="text-slate-500 text-xs mt-1">Total {users.length} member terdaftar dalam sistem database.</p>
                </div>
                
                {/* Visual Premium User search bar */}
                <div className="relative w-full sm:w-80 shrink-0">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari member (Nama, Email, ID, Paket)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left fonts-sans text-xs whitespace-nowrap">
                  <thead className="bg-[#f8fafc] text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Nama User</th>
                      <th className="px-6 py-4">Alamat Email</th>
                      <th className="px-6 py-4">SaaS Paket</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-3 font-mono text-slate-400">{u.id}</td>
                          <td className="px-6 py-3 font-semibold text-slate-800">{u.fullName}</td>
                          <td className="px-6 py-3 font-mono text-slate-500">{u.email}</td>
                          <td className="px-6 py-3 font-bold text-slate-700">{u.packageName}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wider ${u.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                              {u.isActive ? "Aktif" : "Non-aktif"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xxs font-bold border rounded cursor-pointer"
                              >
                                Toggle Status
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteUserId(u.id);
                                  setDeleteUserObj(u);
                                  setDeleteStep(1);
                                  setDeleteConfirmationText("");
                                }}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xxs font-bold rounded cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center font-bold text-slate-400">
                          Tidak ada member terdaftar yang ditemukan untuk pencarian "{searchQuery}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manage Packages form center in admin */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-3 mb-6">
                <h3 className="text-xl font-display font-black text-slate-900">
                  {editingPkgId ? "Edit Layanan Paket SaaS" : "Tambah Paket Layanan Bulanan Baru"}
                </h3>
                <p className="text-slate-450 text-xxs">Pengaturan inventori subscription plans Portoify dideteksi di Database Secure.</p>
              </div>

              <form onSubmit={handleSavePackage} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xxs font-black text-slate-400 block mb-1">Nama Paket Produk</label>
                  <input
                    type="text"
                    placeholder="Contoh: Paket Standart"
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs outline-none focus:border-brand"
                    required
                  />
                </div>
                <div>
                  <label className="text-xxs font-black text-slate-400 block mb-1">Harga Langganan (Rupiah)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 150000"
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs outline-none focus:border-brand"
                    required
                  />
                </div>
                <div>
                  <label className="text-xxs font-black text-slate-400 block mb-1">Durasi Aktif (Hari)</label>
                  <input
                    type="number"
                    value={pkgDuration}
                    onChange={(e) => setPkgDuration(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs outline-none focus:border-brand"
                    required
                  />
                </div>
                <div className="sm:col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200 mt-2">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700">Daftar Fitur Layanan</h4>
                      <p className="text-[10px] text-slate-400">Masukkan fitur-fitur untuk paket ini (minimal 4 field, isi sesuai kebutuhan).</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPkgFeaturesList([...pkgFeaturesList, ""])}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-brand hover:bg-brand-hover text-white text-[11px] font-bold rounded-lg transition shadow-xs cursor-pointer"
                    >
                      <span>+ Tambah Fitur</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pkgFeaturesList.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xxs text-slate-400 font-bold shrink-0 w-5 text-right">#{idx + 1}</span>
                        <input
                          type="text"
                          placeholder={`Fitur ke-${idx + 1}`}
                          value={feature}
                          onChange={(e) => {
                            const newList = [...pkgFeaturesList];
                            newList[idx] = e.target.value;
                            setPkgFeaturesList(newList);
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs outline-none focus:border-brand"
                        />
                        {pkgFeaturesList.length > 4 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newList = pkgFeaturesList.filter((_, fIdx) => fIdx !== idx);
                              setPkgFeaturesList(newList);
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition shrink-0 cursor-pointer"
                            title="Hapus"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* DYNAMIC ACCESS SETTING FOR ALL MODULES (REVISION IMPLEMENTATION) */}
                <div className="sm:col-span-2 border-t border-slate-200/60 pt-4 mt-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block mb-1">Akses Portofolio</label>
                    <select
                      value={pkgAccessPortfolio}
                      onChange={(e) => setPkgAccessPortfolio(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none font-semibold focus:border-brand"
                    >
                      <option value="none">🔒 Blokir Total</option>
                      <option value="basic">Template Basic Only</option>
                      <option value="standard">Template Basic & Standar</option>
                      <option value="all">✨ Bebas Semua Template</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block mb-1">Akses Resume/CV</label>
                    <select
                      value={pkgAccessResume}
                      onChange={(e) => setPkgAccessResume(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none font-semibold focus:border-brand"
                    >
                      <option value="none">🔒 Blokir Total</option>
                      <option value="basic">Template Basic Only</option>
                      <option value="standard">Template Basic & Standar</option>
                      <option value="all">✨ Bebas Semua Template</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block mb-1">Akses Lamaran</label>
                    <select
                      value={pkgAccessLetter}
                      onChange={(e) => setPkgAccessLetter(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none font-semibold focus:border-brand"
                    >
                      <option value="none">🔒 Blokir Total</option>
                      <option value="basic">Template Basic Only</option>
                      <option value="standard">Template Basic & Standar</option>
                      <option value="all">✨ Bebas Semua Template</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block mb-1">Akses Upload</label>
                    <select
                      value={pkgAccessUploadDocs}
                      onChange={(e) => setPkgAccessUploadDocs(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none font-semibold focus:border-brand"
                    >
                      <option value="none">🔒 Tidak Diizinkan</option>
                      <option value="restricted">Terbatas (KTP, NPWP, BPJS)</option>
                      <option value="all">✨ Bebas Unggah Bebas</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded shadow transition cursor-pointer"
                  >
                    {editingPkgId ? "Simpan Perubahan Paket" : "Tambahkan Paket Baru ke Database"}
                  </button>
                  {editingPkgId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPkgId(null);
                        setPkgName("");
                        setPkgPrice(0);
                        setPkgFeaturesList(["", "", "", ""]);
                        setPkgAccessPortfolio("all");
                        setPkgAccessResume("all");
                        setPkgAccessLetter("all");
                        setPkgAccessUploadDocs("all");
                      }}
                      className="px-6 py-2 bg-slate-200 text-slate-705 text-xs font-bold rounded"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              </form>

              {/* List packages table list */}
              <div className="mt-8 bg-slate-50 p-6 border border-slate-200 rounded-3xl">
                <h4 className="font-extrabold text-sm text-slate-800 mb-4 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                  Geleri Paket Layanan Aktif:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages.map(p => {
                    const featureLines = [
                      `Active ${p.durationDays} Days`,
                      ...(Array.isArray(p.features) 
                        ? p.features 
                        : (typeof p.features === "string" 
                            ? (p.features as string).split(",").map(f => f.trim()).filter(Boolean) 
                            : []))
                    ];

                    return (
                      <div 
                        key={p.id} 
                        className="bg-white border border-slate-200 hover:border-slate-300 shadow-lg rounded-[32px] overflow-hidden flex flex-col justify-between transition-all duration-300 p-0"
                      >
                        <div>
                          {/* Rich header banner styled EXACTLY like the red banner in user's design */}
                          <div className="relative bg-gradient-to-br from-[#ca1a1a] via-[#bb1717] to-[#8a1414] py-10 px-5 text-center overflow-hidden">
                            {/* Subtle glossy overlay strip path matching mockup */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none transform -skew-y-6 scale-110" />
                            <h3 className="text-xl sm:text-[22px] font-black uppercase tracking-wider text-white font-sans drop-shadow-md">
                              {p.name}
                            </h3>
                          </div>

                          {/* Red Price section and Duration */}
                          <div className="px-6 pt-8 pb-4 text-center">
                            <p className="text-3xl sm:text-[34px] font-black text-[#ca1a1a] tracking-tight mb-1">
                              {Number(p.price) === 0 ? "IDR 0" : `IDR ${Number(p.price || 0).toLocaleString("id-ID")}`}
                            </p>
                            <p className="text-[#8c1c1c] font-black text-xs sm:text-[13px] tracking-wide uppercase">
                              Active {p.durationDays} Days
                            </p>
                          </div>

                          {/* Fitur Layanan Checklist */}
                          <div className="px-6 sm:px-8 pb-6">
                            <h4 className="text-slate-900 font-extrabold text-sm sm:text-base mb-4 text-left font-sans">
                              Fitur Layanan
                            </h4>
                            
                            <ul className="space-y-3 px-1 text-xs text-slate-700">
                              {featureLines.map((line, fIdx) => (
                                <li key={fIdx} className="flex items-start gap-3">
                                  {/* Red circle check mark icon matching precisely */}
                                  <span className="flex items-center justify-center w-5 h-5 bg-[#ca1a1a] rounded-full text-white text-[10px] shrink-0 font-bold mt-0.5 shadow-xs select-none">
                                    ✓
                                  </span>
                                  <span className="font-semibold text-slate-800 leading-relaxed text-left text-[11px] sm:text-[12px]">
                                    {line}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Centered/spaced action triggers styled exactly like user's mockup */}
                        <div className="px-6 pb-6 pt-4 flex items-center gap-3 border-t border-slate-100 mt-auto bg-slate-50/50">
                          <button 
                            type="button"
                            onClick={() => handleEditPackage(p)} 
                            className="bg-[#0f2942] hover:bg-[#1a3d60] text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider flex-1 transition duration-200 cursor-pointer shadow-sm hover:shadow-md"
                          >
                            <Edit className="w-3.5 h-3.5 text-white" />
                            Edit Paket
                          </button>

                          {deleteConfirmPkgId === p.id ? (
                            <div className="flex-1 flex gap-1.5">
                              <button 
                                type="button"
                                onClick={() => {
                                  handleDeletePackage(p.id);
                                  setDeleteConfirmPkgId(null);
                                }} 
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer text-center"
                              >
                                Ya, Hapus!
                              </button>
                              <button 
                                type="button"
                                onClick={() => setDeleteConfirmPkgId(null)} 
                                className="py-3 px-2 bg-slate-200 hover:bg-slate-300 text-slate-705 rounded-xl text-[11px] font-bold uppercase tracking-wider transition cursor-pointer text-center"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => setDeleteConfirmPkgId(p.id)} 
                              className="bg-white hover:bg-rose-50/80 text-[#991b1b] border border-[#fca5a5] py-3 px-4 rounded-xl font-black flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider flex-1 transition duration-200 cursor-pointer shadow-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#991b1b]" />
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* =========================================
            ADMIN SECTION 4: STATS AND PENJUALAN
           ========================================= */}
        {activeTab === "statistik-penjualan" && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            
            {/* Bento Grid Metrics for SaaS Packages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* 1. Monthly Earnings Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-xxs font-black uppercase tracking-wider">Pendapatan Bulan Ini</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-black text-slate-900 font-display">
                    Rp {stats.monthlyEarnings?.toLocaleString() || "0"}
                  </p>
                  <p className="text-xxs text-slate-400">Sistem pembayaran via Midtrans</p>
                </div>
              </div>

              {/* 2. Monthly New Members Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-xxs font-black uppercase tracking-wider">Member Baru (30 Hari)</span>
                  <Users className="w-4 h-4 text-brand" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-black text-slate-900 font-display">
                    +{stats.newMembersThisMonthCount || 0}
                  </p>
                  <p className="text-xxs text-slate-400">Akun pelamar mendaftar bulan ini</p>
                </div>
              </div>

              {/* 3. Subscription Packages Distribution Stats */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-xxs font-black uppercase tracking-wider">Distribusi Paket Layanan</span>
                  <Activity className="w-4 h-4 text-red-500" />
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center text-xxs font-bold">
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <p className="text-slate-400">Basic</p>
                    <p className="text-sm font-black text-slate-800">{stats.packageStats?.pkg_basic || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <p className="text-slate-400">Standar</p>
                    <p className="text-sm font-black text-slate-800">{stats.packageStats?.pkg_standard || 0}</p>
                  </div>
                  <div className="bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100/40">
                    <p className="text-brand">Premium</p>
                    <p className="text-sm font-black text-brand">{stats.packageStats?.pkg_premium || 0}</p>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-display font-black text-slate-950 text-lg mb-4 flex items-center gap-1.5">
                <Activity className="text-emerald-500" /> Log Aktivitas Sistem Real-time
              </h3>
              <p className="text-slate-500 text-xs mb-4">Audit log real-time khusus aktivitas dan tindakan Super Administrator Portoify.</p>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {(() => {
                  const adminOnlyLogs = (stats.logs || [])
                    .filter((log: any) => 
                      log.userId === "usr_admin" || 
                      log.userEmail === "admin@portoify.com" || 
                      (log.message && log.message.startsWith("Admin"))
                    )
                    .slice(0, 15);

                  if (adminOnlyLogs.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400 text-xs font-medium">
                        Tidak ada riwayat aktivitas tindakan admin saat ini.
                      </div>
                    );
                  }

                  return adminOnlyLogs.map((log: any, index: number) => {
                    let formattedTime = "";
                    try {
                      const d = new Date(log.timestamp);
                      if (!isNaN(d.getTime())) {
                        formattedTime = d.toLocaleString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        }) + " WIB";
                      } else {
                        formattedTime = log.timestamp;
                      }
                    } catch (e) {
                      formattedTime = log.timestamp;
                    }

                    return (
                      <div key={index} className="p-3 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-xl flex flex-col md:flex-row md:justify-between md:items-center text-xs gap-2">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800">{log.message}</p>
                          <p className="text-[10px] text-slate-400">Oleh: <span className="font-mono text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black">{log.userEmail || "admin@portoify.com"}</span></p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-200/60 px-2 py-1 rounded-lg self-start md:self-auto">{formattedTime}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Target Capaian Portoify SaaS</h4>
                <p className="text-slate-400 text-xxs">Target Pendapatan Bersih bulanan di Cloud Server.</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded text-xs font-mono font-bold border border-emerald-100 uppercase">Passed 🚀</span>
            </div>

          </div>
        )}

        {/* =========================================
            ADMIN SECTION 5: UPDATE LOGIN CREDENTIALS
           ========================================= */}
        {activeTab === "update-login" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg mx-auto shadow-sm animate-fadeIn">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-xl font-display font-black text-slate-900 flex items-center gap-1.5">
                <Settings className="text-brand w-5 h-5" /> Ubah Kredensial Login Administrator
              </h2>
              <p className="text-slate-450 text-xxs">Penggantian nama login dan password masuk Super Admin Portoify.</p>
            </div>

            <form onSubmit={handleUpdateAdminProfile} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1">Nama Lengkap Admin</label>
                <input
                  type="text"
                  placeholder="Contoh: Super Admin Portoify"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none text-slate-700 text-xs focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1">Username Login Baru</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none text-slate-700 text-xs focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1">Ganti Password Baru (Optional)</label>
                <input
                  type="password"
                  placeholder="Isi jika hendak merubah password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none text-slate-700 text-xs focus:border-brand"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
              >
                Ganti Kredensial & Simpan Kunci
              </button>
            </form>
          </div>
        )}

        {/* =========================================
            ADMIN SECTION 6: KELOLA IKLAN LANDING PAGES
           ========================================= */}
        {activeTab === "iklan" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-2xl mx-auto shadow-sm animate-fadeIn">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-xl font-display font-black text-slate-900 flex items-center gap-1.5">
                <Megaphone className="text-brand w-5 h-5 animate-pulse" /> Pengaturan Iklan Native Banner
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Atur script iklan Adsterra atau native/HTML banner lainnya untuk diletakkan di sisi KIRI dan KANAN Halaman Landing Page.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs flex flex-col gap-1.5 mb-6">
              <span className="font-extrabold flex items-center gap-1 text-[13px] text-amber-900">
                ⚠️ PERINGATAN DAN KETENTUAN IKLAN:
              </span>
              <p className="leading-relaxed">
                Iklan hanya akan tampil di <strong>Halaman Landing Page utama (Kiri & Kanan)</strong>. Sesuai dengan permintaan, <strong>tidak boleh ada iklan di dashboard pengguna/dashboard pelanggan</strong> untuk menjaga kenyamanan dan reputasi Portoify Premium.
              </p>
            </div>

            <form onSubmit={handleSaveAds} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1">
                  Nama Iklan (Sebagai Label Admin)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Banner Samping Adsterra - May 2026"
                  value={adsName}
                  onChange={(e) => setAdsName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none text-slate-700 text-xs focus:border-brand"
                  required
                />
              </div>

              {/* STATUS AKTIVASI IKLAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-2">
                    Status Iklan Banner Native
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBannerActive(true)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        bannerActive 
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                      Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerActive(false)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        !bannerActive 
                        ? "bg-rose-500 border-rose-500 text-white shadow-sm" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      Non-Aktif
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
                    Jika dinonaktifkan, Iklan Banner Samping (Kiri/Kanan) tidak akan diredender di halaman Landing Page.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-2">
                    Status Iklan Social Bar
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSocialActive(true)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        socialActive 
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                      Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setSocialActive(false)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        !socialActive 
                        ? "bg-rose-500 border-rose-500 text-white shadow-sm" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      Non-Aktif
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
                    Jika dinonaktifkan, script popunder / social bar tidak akan diinjeksi ke browser pengunjung.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1">
                  Form Input Script (Adsterra / HTML Banner Script Code)
                </label>
                <p className="text-slate-400 text-[10px] mb-1.5 leading-tight">
                  Masukkan kode JavaScript/HTML iklan yang didapat dari panel Adsterra secara lengkap. Pastikan format penulisan tag HTML seperti &lt;script&gt; ditulis dengan benar.
                </p>
                <textarea
                  rows={6}
                  placeholder="Masukkan / tempel script iklan Adsterra Banner di sini..."
                  value={adsScript}
                  onChange={(e) => setAdsScript(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none text-slate-700 text-xs font-mono focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1 flex items-center gap-1">
                  <span>Form Input Script Iklan Social Bar</span>
                  <span className="text-[10px] text-slate-400 font-normal normal-case italic">(Opsional)</span>
                </label>
                <p className="text-slate-400 text-[10px] mb-1.5 leading-tight">
                  Masukkan / tempel kode script iklan Social Bar dari Adsterra atau platform dynamic push bar lainnya untuk diselipkan di halaman landing page utama.
                </p>
                <textarea
                  rows={6}
                  placeholder="Contoh: <script type='text/javascript' src='//plxx.highperformancecpm.com/...'></script>"
                  value={socialBarScript}
                  onChange={(e) => setSocialBarScript(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none text-slate-700 text-xs font-mono focus:border-brand"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingAds}
                className={`w-full py-2.5 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-2 ${
                  isSavingAds ? "bg-amber-400 cursor-not-allowed" : "bg-brand hover:bg-brand-hover"
                }`}
              >
                {isSavingAds ? "Sedang Menyimpan..." : "Save / Simpan Pengaturan Iklan"}
              </button>
            </form>
          </div>
        )}

        {/* TAB 7: TAG VARIABEL REFERENCE PAGE */}
        {activeTab === "tag-variabel" && (
          <div className="space-y-6 max-w-5xl animate-fadeIn">
            <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xxs uppercase tracking-widest text-[#dc2626] font-extrabold font-display">Pusat Integrasi Tag Variabel</span>
                <h2 className="font-display font-black text-xl text-slate-800 tracking-tight">Daftar Tag Variabel HTML Template Terintegrasi</h2>
                <p className="text-xs text-slate-500 mt-1">Salin dan gunakan tag variabel di bawah ini ke dalam sintaks markup HTML desain template agar dapat dimuat secara dinamis dan presisi.</p>
              </div>
              <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold shrink-0">
                ⚡ Sistem Engine Aktif (Real-Time)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* PORTFOLIO TAGS */}
              <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="text-lg">💼</span>
                  <div>
                    <h3 className="font-display font-bold text-[#dc2626] text-xs uppercase tracking-wider">Tag Variabel Portofolio</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Tag khusus untuk merender detail portofolio & digital showcase</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{NAMA}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Nama lengkap pengguna</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{FOTO}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">URL pas foto / avatar pengguna</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{TENTANG_SAYA}}"} / {"{{BIOGRAFI}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Ulasan profil, biografi ringkas tentang diri pengguna (juga dapat digunakan di Portofolio)</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{TITLE}}"} / {"{{TITTLE}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Gelar profesi atau bidang karir utama</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{SKILLS}}"} / {"{{SKILL}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Me-render lencana skill terdaftar berupa pill badges</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{PENGALAMAN_KERJA}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold font-sans leading-tight block">Me-render seluruh ringkasan / riwayat pengalaman kerja (Blok HTML)</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{PROYEK_SAYA}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold font-sans leading-tight block">Me-render grid item/tabel seluruh riwayat proyek (Blok HTML)</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{SOSIAL_MEDIA}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Kumpulan link social feed & website berikon</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RESUME TAGS */}
              <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="text-lg">📋</span>
                  <div>
                    <h3 className="font-display font-bold text-[#dc2626] text-xs uppercase tracking-wider">Tag Variabel Resume (CV)</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Tag khusus untuk merender informasi resume & daftar riwayat hidup</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{TENTANG_SAYA}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Ulasan profil, biografi singkat tentang diri pengguna</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{PENDIDIKAN}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Me-render data riwayat akademis (Blok HTML)</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-600 font-bold block">{"{{SERTIFIKAT}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold font-sans leading-tight block">Me-render daftar lencana sertifikasi komparatif</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-650 font-bold block">{"{{USIA}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Usia terhitung otomatis berdasarkan kelahiran resmi</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-650 font-bold block">{"{{TEMPAT_TANGGAL_LAHIR}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Kombinasi Kota, Tanggal Lahir lengkap</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-650 font-bold block">{"{{TELEPON}}"} / {"{{WHATSAPP}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">No telepon seluler dan no wa aktif</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-rose-650 font-bold block">{"{{ALAMAT}}"} / {"{{KOTA}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Detail alamat tinggal saat ini & kota domisili</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* COVER LETTER TAGS */}
              <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="text-lg">✉️</span>
                  <div>
                    <h3 className="font-display font-bold text-[#dc2626] text-xs uppercase tracking-wider">Tag Variabel Surat Lamaran</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Tag khusus untuk merender lamaran kerja (Cover Letter) resmi</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-blue-600 font-bold block">{"{{NAMA_PERUSAHAAN}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Nama perusahaan, vendor, instansi target</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-blue-600 font-bold block">{"{{ALAMAT_PERUSAHAAN}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Alamat lengkap kantor tujuan</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-blue-600 font-bold block">{"{{JABATAN_DILAMAR}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold font-sans block leading-tight">Nama jabatan / posisi yang sedang dilamar</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-blue-600 font-bold block">{"{{ISI_SURAT}}"}</span>
                      <span className="text-[10px] text-slate-500 font-semibold font-sans block leading-tight">Paragraf lengkap isi redaksi surat lamaran kerja</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SYSTEM & SEPARATED TAGS (LAINNYA) */}
              <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="text-lg">⏰</span>
                  <div>
                    <h3 className="font-display font-bold text-[#dc2626] text-xs uppercase tracking-wider">Tag Variabel Lainnya (Sistem & Riwayat Terpisah)</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Tag penanda jam, hari, akun, serta indeks item terpisah (1-5)</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                    <div className="p-2.5 bg-[#f0f9ff] rounded-xl border border-blue-100">
                      <span className="text-blue-600 font-bold block">⏰ Real-Time Sesi & Info Device</span>
                      <span className="text-[10px] text-slate-505 font-semibold">
                        <strong className="text-slate-700">{"{{HARI}}"}</strong> (Hari sekarang),{" "}
                        <strong className="text-slate-700">{"{{TANGGAL}}"}</strong> (Hari & tgl sekarang),{" "}
                        <strong className="text-slate-700">{"{{EMAIL_PENGGUNA}}"}</strong> (Email user saat ini),{" "}
                        <strong className="text-slate-700">{"{{URL_PORTOK_PORTOFOLIO}}"}</strong> / <strong className="text-slate-700">{"{{URL_PORTOFOLIO}}"}</strong> (URL hosting preview)
                      </span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-150">
                      <span className="text-emerald-600 font-bold block">🎓 Riwayat Pendidikan Spesifik Terpisah (Indeks 1 - 5)</span>
                      <span className="text-[10px] text-slate-505 font-semibold leading-relaxed font-sans">
                        • Lembaga: <code className="bg-white px-1 font-mono text-emerald-700">{"{{UNIVERSITAS_1}}"} sd {"{{UNIVERSITAS_5}}"}</code><br />
                        • Jurusan/Gelar: <code className="bg-white px-1 font-mono text-emerald-700">{"{{JURUSAN_1}}"} sd {"{{JURUSAN_5}}"}</code><br />
                        • Masa Studi/Lulus: <code className="bg-white px-1 font-mono text-emerald-700">{"{{TAHUN_LULUS_1}}"} sd {"{{TAHUN_LULUS_5}}"}</code>
                      </span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-150">
                      <span className="text-emerald-600 font-bold block">💼 Pengalaman Kerja Spesifik Terpisah (Indeks 1 - 5)</span>
                      <span className="text-[10px] text-slate-550 font-semibold leading-relaxed font-sans font-sans">
                        • Kantor: <code className="bg-white px-1 font-mono text-emerald-705">{"{{PERUSAHAAN_1}}"} sd {"{{PERUSAHAAN_5}}"}</code><br />
                        • Posisi/Roles: <code className="bg-white px-1 font-mono text-emerald-705">{"{{JABATAN_1}}"} sd {"{{JABATAN_5}}"}</code><br />
                        • Durasi: <code className="bg-white px-1 font-mono text-emerald-705">{"{{PERIODE_KERJA_1}}"} sd {"{{PERIODE_KERJA_5}}"}</code><br />
                        • Tugas/Jobdesk: <code className="bg-white px-1 font-mono text-emerald-705">{"{{JOBDESK_1}}"} sd {"{{JOBDESK_5}}"}</code>
                      </span>
                    </div>
                    <div className="p-2.5 bg-[#eff6ff] rounded-xl border border-blue-100">
                      <span className="text-blue-600 font-bold block">🛠️ Gabungan List Keahlian (String Teks Utama)</span>
                      <span className="text-[10px] text-slate-600 font-semibold font-sans">
                        Me-render semua skill dipisahkan koma dalam baris teks biasa:<br />
                        <strong className="text-brand font-mono">{"{{GABUNGAN_SKILL}}"}</strong> / <strong className="text-brand font-mono">{"{{SEMUA_SKILL}}"}</strong> / <strong className="text-brand font-mono">{"{{SKILL_TEXT}}"}</strong>
                      </span>
                    </div>
                    <div className="p-2.5 bg-rose-50/50 rounded-xl border border-rose-150">
                      <span className="text-rose-600 font-bold block">👤 Kontak Detail & Sosial Media Terpisah</span>
                      <span className="text-[10px] text-slate-650 font-semibold leading-relaxed font-sans block">
                        • Email: <code className="bg-white px-1 font-mono text-rose-700">{"{{EMAIL}}"}</code> (Alias untuk {"{{EMAIL_PENGGUNA}}"})<br />
                        • Telepon: <code className="bg-white px-1 font-mono text-rose-700">{"{{PHONE}}"}</code> (Alias untuk {"{{TELEPON}}"})<br />
                        • WhatsApp: <code className="bg-white px-1 font-mono text-rose-700">{"{{WA}}"}</code> (Alias untuk {"{{WHATSAPP}}"})<br />
                        • Instagram: <code className="bg-white px-1 font-mono text-rose-700">{"{{INSTAGRAM}}"}</code><br />
                        • TikTok: <code className="bg-white px-1 font-mono text-rose-700">{"{{TIKTOK}}"}</code><br />
                        • LinkedIn: <code className="bg-white px-1 font-mono text-rose-700">{"{{LINKEDIN}}"}</code><br />
                        • GitHub: <code className="bg-white px-1 font-mono text-rose-700">{"{{GITHUB}}"}</code><br />
                        • Kota Lahir: <code className="bg-white px-1 font-mono text-rose-700">{"{{TEMPAT_LAHIR_MURNI}}"}</code><br />
                        • Tgl Lahir: <code className="bg-white px-1 font-mono text-rose-700">{"{{TANGGAL_LAHIR_MURNI}}"}</code>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Dynamic Iframe-based Live Preview Modal for Admins */}
        {selectedAdminPreview && (() => {
          const previewHtml = (() => {
            let html = selectedAdminPreview.htmlMarkup;
            html = html.replace(/\{\{\s*NAMA\s*\}\}/gi, "John Doe (Nama Pekerja)");
            html = html.replace(/\{\{\s*TITLE\s*\}\}/gi, "Senior Full-Stack Developer");
            html = html.replace(/\{\{\s*TENTANG_SAYA\s*\}\}/gi, "Saya adalah praktisi teknologi dengan pengalaman 8 tahun merancang arsitektur web modern.");
            html = html.replace(/\{\{\s*FOTO\s*\}\}/gi, "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150");
            html = html.replace(/\{\{\s*TEMPAT_LAHIR\s*\}\}/gi, "Bandung");
            html = html.replace(/\{\{\s*TEMPAT_TANGGAL_LAHIR\s*\}\}/gi, "Bandung, 12 Desember 1995");
            html = html.replace(/\{\{\s*USIA\s*\}\}/gi, "30");
            html = html.replace(/\{\{\s*JENIS_KELAMIN\s*\}\}/gi, "Laki-laki");
            html = html.replace(/\{\{\s*ALAMAT\s*\}\}/gi, "Jl. Diponegoro No 12, Bandung, Jawa Barat");
            html = html.replace(/\{\{\s*TELEPON\s*\}\}/gi, "081234567890");
            html = html.replace(/\{\{\s*EMAIL\s*\}\}/gi, "john.doe@portoify-demo.com");
            
            // Render beautiful structured lists inside admin preview
            const expSampleHtml = `
              <div style="font-family: inherit; margin-bottom: 20px; text-align: left;">
                <div style="font-weight: bold; font-size: 14px; font-family: inherit; margin: 0; display: flex; align-items: center; gap: 4px; text-transform: uppercase; color: inherit;">
                  <span style="font-weight: 900; font-size: 16px; margin-right: 4px;">•</span> GOOGLE INDONESIA
                </div>
                <div style="font-size: 12px; font-weight: 400; margin-top: 3px; padding-left: 0px; opacity: 0.95; color: inherit;">
                  Senior Full-Stack Developer — 2022 - Sekarang
                </div>
                <div style="height: 6px;"></div>
                <p style="font-size: 11.5px; opacity: 0.85; line-height: 1.5; margin: 0; padding-left: 0px; white-space: pre-wrap; font-family: inherit; color: inherit; text-align: left;">
                  Memimpin perancangan dan implementasi fitur skalabilitas web global.
                </p>
              </div>
              <div style="font-family: inherit; margin-bottom: 20px; text-align: left;">
                <div style="font-weight: bold; font-size: 14px; font-family: inherit; margin: 0; display: flex; align-items: center; gap: 4px; text-transform: uppercase; color: inherit;">
                  <span style="font-weight: 900; font-size: 16px; margin-right: 4px;">•</span> TOKOPEDIA
                </div>
                <div style="font-size: 12px; font-weight: 400; margin-top: 3px; padding-left: 0px; opacity: 0.95; color: inherit;">
                  Software Engineer Intern — 2021
                </div>
                <div style="height: 6px;"></div>
                <p style="font-size: 11.5px; opacity: 0.85; line-height: 1.5; margin: 0; padding-left: 0px; white-space: pre-wrap; font-family: inherit; color: inherit; text-align: left;">
                  Berkolaborasi dalam pengembangan sistem manajemen inventori berkecepatan tinggi.
                </p>
              </div>
            `;
            html = html.replace(/\{\{\s*PENGALAMAN_KERJA\s*\}\}/gi, expSampleHtml);

            const eduSampleHtml = `
              <div style="font-family: inherit; margin-bottom: 12px; color: inherit;">
                <div style="font-weight: 700; font-size: 13px;">• S2 Ilmu Komputer - Universitas Indonesia (2020 - 2022)</div>
                <div style="font-weight: 700; font-size: 13px;">• S1 Teknik Informatika - Institut Teknologi Bandung (2016 - 2020)</div>
              </div>
            `;
            html = html.replace(/\{\{\s*PENDIDIKAN\s*\}\}/gi, eduSampleHtml);
            html = html.replace(/\{\{\s*KEAHLIAN\s*\}\}/gi, "React, TypeScript, Tailwind CSS, Node.js, Next.js, MySQL, Cloud Native Architecture");
            html = html.replace(/\{\{\s*SKILL\s*\}\}/gi, "React, TypeScript, Tailwind, Node.js, Next.js, MySQL");
            html = html.replace(/\{\{\s*SKILLS\s*\}\}/gi, "React, TypeScript, Tailwind, Node.js");
            return html;
          })();

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200">
                {/* Modal Header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
                  <div>
                    <span className="text-xxs uppercase tracking-widest text-[#ef4444] font-black">Live Design Preview (Mode Admin)</span>
                    <h3 className="font-display font-black text-base">{selectedAdminPreview.name}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedAdminPreview(null)}
                    className="p-1.5 hover:bg-slate-805 text-slate-400 hover:text-white rounded-lg transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Modal Body: Interactive iframe */}
                <div className="flex-1 bg-slate-100 p-2 relative">
                  <iframe 
                    srcDoc={previewHtml}
                    title="Live Template Preview"
                    className="w-full h-full rounded-2xl bg-white border border-slate-200 shadow-inner"
                    sandbox="allow-scripts"
                  />
                </div>
              </div>
            </div>
          );
        })()}

      {/* Word Template Image Preview Modal */}
      {adminPreviewImageModalUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white max-w-3xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <span className="text-xxs uppercase tracking-widest text-[#38bdf8] font-black">Pratinjau Desain Surat Lamaran</span>
                <h3 className="font-display font-black text-sm">{adminPreviewImageModalTitle}</h3>
              </div>
              <button
                onClick={() => {
                  setAdminPreviewImageModalUrl(null);
                  setAdminPreviewImageModalTitle("");
                }}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-6 bg-slate-50 flex items-center justify-center overflow-auto max-h-[70vh]">
              <img
                src={adminPreviewImageModalUrl}
                alt={adminPreviewImageModalTitle}
                className="max-w-full max-h-[60vh] object-contain rounded-xl border border-slate-200/60 shadow-lg bg-white"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Modal Footer */}
            <div className="bg-slate-100 px-6 py-3 flex justify-end">
              <button
                onClick={() => {
                  setAdminPreviewImageModalUrl(null);
                  setAdminPreviewImageModalTitle("");
                }}
                className="px-4 py-2 bg-slate-900 text-white uppercase tracking-wider text-[10px] font-black hover:bg-slate-800 rounded-xl transition shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic 2-Step User Account Deletion Modal */}
      {deleteUserId && deleteUserObj && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" id="delete-user-modal">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="bg-rose-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-display font-black text-sm flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span>Konfirmasi Penghapusan Akun</span>
              </h3>
              <button
                onClick={() => { setDeleteUserId(null); setDeleteUserObj(null); }}
                className="p-1 hover:bg-rose-700 text-rose-100 hover:text-white rounded transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1 Content */}
            {deleteStep === 1 && (
              <div className="p-6">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1 text-rose-600">Langkah 1 dari 2</p>
                <h4 className="font-bold text-slate-800 text-sm mb-3">
                  Apakah Anda yakin ingin melenyapkan akun {deleteUserObj.fullName}?
                </h4>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed font-semibold">
                  Menghapus pengguna ini ({deleteUserObj.email}) akan menghancurkan data berikut selamanya secara permanen:
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>Status keaktifan pendaftaran akun.</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>Tautan subdomain kustom dan portofolio digital.</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>Seluruh draf CV / resume dan dokumen pendukung.</span>
                  </li>
                </ul>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setDeleteUserId(null); setDeleteUserObj(null); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black shadow transition cursor-pointer"
                  >
                    Lanjutkan Konfirmasi
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 Content */}
            {deleteStep === 2 && (
              <div className="p-6">
                <p className="text-xs text-rose-600 font-bold uppercase tracking-wide mb-1">Peringatan Terakhir (Langkah 2 dari 2)</p>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Konfirmasi kata kunci penting</h4>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Tindakan ini bersifat final dan tidak dapat dibatalkan. Silakan ketik kata kunci <strong className="text-rose-600 font-black">HAPUS</strong> di bawah ini untuk membuka tombol eksekusi permanen:
                </p>
                <input
                  type="text"
                  placeholder="Ketik HAPUS"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-black tracking-widest uppercase outline-none focus:border-rose-500 text-center mb-6"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setDeleteStep(1)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Kembali
                  </button>
                  <button
                    disabled={deleteConfirmationText.toUpperCase() !== "HAPUS"}
                    onClick={handleConfirmDeleteUser}
                    className={`px-4 py-2 rounded-lg text-xs font-black shadow transition flex items-center gap-1.5 ${
                      deleteConfirmationText.toUpperCase() === "HAPUS"
                        ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Ya, Lenyapkan Akun!
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      </main>

    </div>
  );
}

// CanvasImage component helper for Admin
function CanvasImage({ id, url, x, y, width, height, draggable, onDragEnd, onTransformEnd, isLocked, shape, borderFill, strokeWidth, onClick }: any) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) return;
    const img = new window.Image();
    img.src = url;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
    };
  }, [url]);

  if (!image) return null;
  const cornerRadius = shape === "square" ? 0 : (width || 120) / 2;
  return (
    <KonvaImage
      id={id}
      image={image}
      x={x}
      y={y}
      width={width || 120}
      height={height || 120}
      draggable={!isLocked && draggable}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      cornerRadius={cornerRadius}
      stroke={borderFill || undefined}
      strokeWidth={strokeWidth || undefined}
      onClick={onClick}
      onTap={onClick}
    />
  );
}
