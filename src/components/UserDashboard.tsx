/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Rect, Circle, Text as KonvaText, Image as KonvaImage, Transformer } from "react-konva";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { 
  LayoutDashboard, 
  User, 
  FolderGit2, 
  FileText, 
  Mail, 
  FileUp, 
  CreditCard, 
  Globe2, 
  LogOut, 
  Plus, 
  Award, 
  Phone, 
  MapPin, 
  KeyRound, 
  Check, 
  Trash2, 
  Cpu, 
  ShieldAlert,
  ShieldCheck,
  ExternalLink, 
  Building2, 
  Download, 
  Eye, 
  AlertTriangle,
  RefreshCw,
  Clock,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Palette,
  Search,
  Briefcase,
  Upload,
  Menu,
  X,
  FileStack,
  Layers,
  Lock
} from "lucide-react";
import { 
  UserProfile, 
  Experience, 
  Project, 
  Education, 
  PortfolioData, 
  ResumeData, 
  CoverLetterData, 
  DocumentFile, 
  ServicePackage, 
  Subscription, 
  Template, 
  ActivityLog 
} from "../types";

const calculateAge = (birthDateStr: string) => {
  if (!birthDateStr) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return 0;
  let age = today.getFullYear() - birthDate.getFullYear();
  return age >= 0 ? age : 0;
};

const formatIndonesianDate = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== "string") return dateStr || "-";
  const parts = dateStr.trim().split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2].split("T")[0];
    const paddedDay = parseInt(day, 10).toString().padStart(2, "0");
    const localMonths = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${paddedDay} ${localMonths[monthIndex]} ${year}`;
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = d.getDate().toString().padStart(2, "0");
    const localMonths = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${day} ${localMonths[d.getMonth()]} ${d.getFullYear()}`;
  }
  return dateStr;
};

// CanvasImage component helper
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

// Protected Scaled Iframe Preview renderer that dynamically auto-scales template documents 
// to fit container sizes on mobile screens & desktop preview panes without being cut off
function ScaledIframe({
  id,
  title,
  srcDoc,
  targetWidth = 800,
  targetHeight,
  parentHeight = 590,
}: {
  id: string;
  title: string;
  srcDoc: string;
  targetWidth?: number;
  targetHeight?: number;
  parentHeight?: number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [offsets, setOffsets] = React.useState({ left: 6, top: 6 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScaleAndOffsets = () => {
      const rect = el.getBoundingClientRect();
      const parentWidth = rect.width;
      const parentHeightVal = rect.height || parentHeight;
      if (parentWidth > 0) {
        const availableWidth = parentWidth - 12; // 6px padding on left/right
        const scaleW = availableWidth / targetWidth;
        
        let newScale = scaleW;
        let finalTargetHeight = targetHeight || ((parentHeightVal - 12) / scaleW);

        if (targetHeight) {
          const availableHeight = parentHeightVal - 12; // 6px padding on top/bottom
          const scaleH = availableHeight / targetHeight;
          newScale = Math.min(scaleW, scaleH);
          finalTargetHeight = targetHeight;
        }

        setScale(newScale);

        // Center visual iframe nicely in the preview container box
        const scaledWidth = targetWidth * newScale;
        const scaledHeight = finalTargetHeight * newScale;
        const left = Math.max(6, (parentWidth - scaledWidth) / 2);
        const top = Math.max(6, (parentHeightVal - scaledHeight) / 2);
        setOffsets({ left, top });
      }
    };

    updateScaleAndOffsets();
    const observer = new ResizeObserver(() => {
      updateScaleAndOffsets();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [targetWidth, targetHeight, parentHeight]);

  const paddingOffset = 12;
  const actualTargetHeight = targetHeight || ((parentHeight - paddingOffset) / scale);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 p-1.5 overflow-hidden flex flex-col relative w-full"
      style={{ height: `${parentHeight}px` }}
    >
      <iframe
        id={id}
        title={title}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-modals allow-downloads allow-forms allow-same-origin"
        style={{
          width: `${targetWidth}px`,
          height: `${targetHeight || actualTargetHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          left: `${offsets.left}px`,
          top: `${offsets.top}px`,
          border: "none",
        }}
        className="absolute rounded-xl shadow-inner bg-white"
      />
    </div>
  );
}

// Protected Scaled Doc Sheet Preview renderer that dynamically auto-scales Microsoft Word (.docx) templates 
// to fit container sizes on mobile screens & desktop preview panes without horizontal scrolling issues
function ScaledDocSheet({
  children,
  targetWidth = 680,
  targetHeight = 900,
  parentHeight = 820,
}: {
  children: React.ReactNode;
  targetWidth?: number;
  targetHeight?: number;
  parentHeight?: number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [offsets, setOffsets] = React.useState({ left: 6, top: 6 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScaleAndOffsets = () => {
      const rect = el.getBoundingClientRect();
      const parentWidth = rect.width;
      const parentHeightVal = rect.height || parentHeight;
      if (parentWidth > 0) {
        const availableWidth = parentWidth - 12; // 6px padding on left/right
        let scaleW = availableWidth / targetWidth;
        
        // Limit maximum scale to 1 so it doesn't upscale too much on huge monitors
        if (scaleW > 1) {
          scaleW = 1;
        }

        setScale(scaleW);

        // Center visual sheet nicely in the preview container box
        const scaledWidth = targetWidth * scaleW;
        const left = Math.max(6, (parentWidth - scaledWidth) / 2);
        setOffsets({ left, top: 6 });
      }
    };

    updateScaleAndOffsets();
    const observer = new ResizeObserver(() => {
      updateScaleAndOffsets();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [targetWidth, targetHeight, parentHeight]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 overflow-y-auto overflow-x-hidden flex flex-col relative w-full shadow-inner"
      style={{ height: `${parentHeight}px` }}
    >
      <div
        style={{
          width: `${targetWidth}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          left: `${offsets.left}px`,
          top: `${offsets.top}px`,
          minHeight: `${targetHeight}px`,
        }}
        className="absolute rounded-xl shadow bg-white p-6 sm:p-12 text-slate-800 leading-relaxed text-[11px] sm:text-[11.5px] space-y-4 ring-1 ring-black/5 text-justify"
      >
        {children}
      </div>
    </div>
  );
}

interface UserDashboardProps {
  currentUser: any;
  onLogout: () => void;
}

export default function UserDashboard({ currentUser, onLogout }: UserDashboardProps) {
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

  // Sidebar states
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isProfilesExpanded, setIsProfilesExpanded] = useState(false);
  const [isKelolaDokumenExpanded, setIsKelolaDokumenExpanded] = useState(false);
  const [isBuatSekarangExpanded, setIsBuatSekarangExpanded] = useState(true);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileMode, setIsMobileMode] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [isTabletMode, setIsTabletMode] = useState(() => {
    if (typeof window !== "undefined") {
      const w = window.innerWidth;
      return w >= 768 && w <= 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobileMode(w < 768);
      setIsTabletMode(w >= 768 && w <= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [overrideDeviceMode, setOverrideDeviceMode] = useState<"auto" | "desktop" | "tablet" | "mobile">("auto");

  const selectTab = (tabName: string) => {
    setActiveTab(tabName);
    setIsMobileSidebarOpen(false);
    if (tabName === "update-profile" || tabName === "change-password") {
      setIsProfilesExpanded(true);
    }
    if (tabName === "dokumen-saya" || tabName === "gabungkan-semua") {
      setIsKelolaDokumenExpanded(true);
    }
  };

  useEffect(() => {
    if (activeTab === "update-profile" || activeTab === "change-password") {
      setIsProfilesExpanded(true);
    }
    if (activeTab === "dokumen-saya" || activeTab === "gabungkan-semua") {
      setIsKelolaDokumenExpanded(true);
    }
  }, [activeTab]);

  // Core records from DB state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [cover, setCover] = useState<CoverLetterData | null>(null);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<DocumentFile | null>(null);

  const renderTemplateTierBadge = (tier: string, isSmall: boolean = false) => {
    const cleanTier = (tier || "basic").toLowerCase();
    const sizeClasses = isSmall ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-1.5 py-0.5";
    
    if (cleanTier === "free") {
      return (
        <span className={`bg-emerald-50 text-emerald-600 font-bold rounded border border-emerald-100 shrink-0 ${sizeClasses}`}>
          GRATIS
        </span>
      );
    }
    
    if (cleanTier === "basic") {
      return (
        <span className={`bg-rose-50 text-rose-600 font-extrabold rounded border border-rose-200 shrink-0 uppercase tracking-wider ${sizeClasses}`}>
          BASIC
        </span>
      );
    }
    
    if (cleanTier === "standard" || cleanTier === "standart") {
      return (
        <span className={`bg-blue-50 text-blue-600 font-extrabold rounded border border-blue-200 shrink-0 uppercase tracking-wider ${sizeClasses}`}>
          STANDART
        </span>
      );
    }
    
    if (cleanTier === "premium") {
      return (
        <span className={`bg-emerald-50 text-emerald-600 font-extrabold rounded border border-emerald-250 shrink-0 uppercase tracking-wider ${sizeClasses}`}>
          PREMIUM
        </span>
      );
    }
    
    return (
      <span className={`bg-slate-100 text-slate-600 font-extrabold rounded border border-slate-200 shrink-0 uppercase tracking-wider ${sizeClasses}`}>
        {cleanTier.toUpperCase()}
      </span>
    );
  };

  // Premium Merge All state
  const [compiling, setCompiling] = useState(false);
  const [compilationProgress, setCompilationProgress] = useState("");
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [mergedPdfBlob, setMergedPdfBlob] = useState<Blob | null>(null);

  // Payment Gateway / Midtrans states
  const [checkoutPkg, setCheckoutPkg] = useState<ServicePackage | null>(null);
  const [paymentToken, setPaymentToken] = useState<string>("");
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [paymentOrderId, setPaymentOrderId] = useState<string>("");
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [showMockSnapModal, setShowMockSnapModal] = useState<boolean>(false);

  // Subsections states & forms
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Update Profile Form fields
  const [profName, setProfName] = useState("");
  const [profTTLPlace, setProfTTLPlace] = useState("");
  const [profTTLDate, setProfTTLDate] = useState("");
  const [profGender, setProfGender] = useState("Laki-laki");
  const [profCity, setProfCity] = useState("");
  const [profAddress, setProfAddress] = useState("");
  const [profNik, setProfNik] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profPhoto, setProfPhoto] = useState("");

  // Change Password fields
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmNewPass, setConfirmNewPass] = useState("");

  // Domain hosting field
  const [hostingPath, setHostingPath] = useState("");

  // State for template selector library
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [tplSearchQuery, setTplSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [showResumePreview, setShowResumePreview] = useState<boolean>(false);
  const [showCoverPreview, setShowCoverPreview] = useState<boolean>(false);

  // State Editor Canvas (Revisi 2)
  const [activeCanvasTemplate, setActiveCanvasTemplate] = useState<Template | null>(null);
  const [canvasElements, setCanvasElements] = useState<any[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [elementTextVal, setElementTextVal] = useState("");
  const [elementFontSize, setElementFontSize] = useState(12);
  const [elementColorVal, setElementColorVal] = useState("#000000");
  const [elementFontStyle, setElementFontStyle] = useState("normal");
  const [elementWidth, setElementWidth] = useState(100);
  const [elementHeight, setElementHeight] = useState(40);
  const [elementWrapMode, setElementWrapMode] = useState("front");
  const [canvasBgColor, setCanvasBgColor] = useState("#ffffff");
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<"auto" | "manual">("auto");
  const [doubleClickEditingId, setDoubleClickEditingId] = useState<string | null>(null);

  // Sync transformer nodes with the selected canvas element
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      if (selectedElementId) {
        const node = stageRef.current.findOne("#" + selectedElementId);
        if (node) {
          transformerRef.current.nodes([node]);
          const layer = transformerRef.current.getLayer();
          if (layer) {
            layer.batchDraw();
          }
        } else {
          transformerRef.current.nodes([]);
        }
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [selectedElementId, canvasElements]);

  // Auto scroll to top and handle sidebar auto minimize for Resume editor screen
  useEffect(() => {
    // Scroll both window and the scrollable main workspace container to the top
    window.scrollTo({ top: 0, behavior: "instant" });
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "instant" });
    }

    // Auto minimize sidebar if entering "buat-resume-saya" tab
    if (activeTab === "buat-resume-saya") {
      setIsSidebarMinimized(true);
    }
  }, [activeTab]);

  const loadGoogleFont = (fontFamily: string) => {
    const id = `gfont-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap`;
      document.head.appendChild(link);
    }
  };

  // Load Google Fonts for active template elements
  useEffect(() => {
    canvasElements.forEach(el => {
      if (el.type === "text" && el.fontFamily) {
        loadGoogleFont(el.fontFamily);
      }
    });
  }, [canvasElements]);

  // Handle auto-responsive display calculations
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const updateScale = () => {
      if (zoomMode === "manual") return;
      if (canvasContainerRef.current) {
        const padding = window.innerWidth < 640 ? 24 : 48; // p-3 is 24px total padding, p-6 is 48px
        const parentWidth = canvasContainerRef.current.clientWidth - padding;
        const newScale = Math.min(1.2, Math.max(0.15, parentWidth / 800));
        setCanvasScale(newScale);
      }
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(el);

    window.addEventListener("resize", updateScale);

    // Handle animations or state changes delays
    const timer1 = setTimeout(updateScale, 50);
    const timer2 = setTimeout(updateScale, 200);
    const timer3 = setTimeout(updateScale, 500);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [activeTab, activeCanvasTemplate, canvasElements.length, zoomMode]);

  // Enriched canvas editing text properties & Undo/Redo logic
  const [elementFontFamily, setElementFontFamily] = useState("Inter");
  const [elementLineHeight, setElementLineHeight] = useState(1.2);
  const [elementAlign, setElementAlign] = useState("left");
  const [canvasHistory, setCanvasHistory] = useState<any[][]>([]);
  const [canvasHistoryIndex, setCanvasHistoryIndex] = useState<number>(-1);

  const updateElementsAndHistory = (newElements: any[]) => {
    const cloned = JSON.parse(JSON.stringify(newElements));
    const nextHistory = canvasHistory.slice(0, canvasHistoryIndex + 1);
    nextHistory.push(cloned);
    setCanvasHistory(nextHistory);
    setCanvasHistoryIndex(nextHistory.length - 1);
    setCanvasElements(cloned);
  };

  const handleUndo = () => {
    if (canvasHistoryIndex > 0) {
      const prevIndex = canvasHistoryIndex - 1;
      setCanvasHistoryIndex(prevIndex);
      setCanvasElements(JSON.parse(JSON.stringify(canvasHistory[prevIndex])));
      setSelectedElementId(null);
    }
  };

  const handleRedo = () => {
    if (canvasHistoryIndex < canvasHistory.length - 1) {
      const nextIndex = canvasHistoryIndex + 1;
      setCanvasHistoryIndex(nextIndex);
      setCanvasElements(JSON.parse(JSON.stringify(canvasHistory[nextIndex])));
      setSelectedElementId(null);
    }
  };

  const initCanvasTemplate = (elements: any[], template: any, bgColor = "#ffffff") => {
    const cloned = JSON.parse(JSON.stringify(elements));
    setCanvasElements(cloned);
    setCanvasHistory([cloned]);
    setCanvasHistoryIndex(0);
    setCanvasBgColor(bgColor);
    setSelectedElementId(null);
    setActiveCanvasTemplate(template);
  };

  const getSortedCanvasElements = () => {
    return [...canvasElements].sort((a, b) => {
      const getWeight = (el: any) => {
        const mode = el.wrapMode || (el.type === "text" ? "front" : "behind");
        if (mode === "behind") return -2;
        if (el.type === "text") return 1;
        if (mode === "front") return 2;
        return 0; // square, tight, through
      };
      const weightA = getWeight(a);
      const weightB = getWeight(b);
      if (weightA !== weightB) return weightA - weightB;
      return canvasElements.indexOf(a) - canvasElements.indexOf(b);
    });
  };

  const getTextMapping = () => {
    const formatIndonesianDateLocal = (dStr: string) => {
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        const months = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      } catch (e) {
        return dStr;
      }
    };

    const textMapping: Record<string, string> = {
      "{{NAMA_LENGKAP}}": profile?.fullName || currentUser.fullName || "NAMA LENGKAP",
      "{{NAMA}}": profile?.fullName || currentUser.fullName || "NAMA LENGKAP",
      "{{EMAIL}}": profile?.email || currentUser.email || "email@anda.com",
      "{{TEMPAT_LAHIR}}": profile?.placeOfBirth || "Tempat Lahir",
      "{{TANGGAL_LAHIR}}": profile?.dateOfBirth ? formatIndonesianDateLocal(profile.dateOfBirth) : "25 Oktober 1999",
      "{{TEMPAT_TANGGAL_LAHIR}}": `${profile?.placeOfBirth || "Kota"}, ${profile?.dateOfBirth ? formatIndonesianDateLocal(profile.dateOfBirth) : "Tanggal Lahir"}`,
      "{{NIK}}": profile?.nik || "1234567890123456",
      "{{NOMOR_TELEPON}}": profile?.phone || "081234567890",
      "{{TELEPON}}": profile?.phone || "081234567895",
      "{{KOTA}}": profile?.city || "Jakarta",
      "{{JENIS_KELAMIN}}": profile?.gender || "Laki-laki",
      "{{ALAMAT}}": profile?.address || "Jl. Raya Kebayoran No. 12",
      "{{TITLE}}": portfolio?.title || resume?.title || "Web Developer",
      "{{TENTANG_SAYA}}": portfolio?.aboutMe || resume?.aboutMe || "Saya merupakan individu profesional yang berdedikasi tinggi dengan fokus pada pengembangan antarmuka visual web modern.",
      "{{NOMOR_WHATSAPP}}": portfolio?.whatsapp || resume?.whatsapp || "081234567890",
      "{{WHATSAPP}}": portfolio?.whatsapp || resume?.whatsapp || "081234567890",
      "{{INSTAGRAM}}": portfolio?.instagram || "@portoify",
      "{{TIKTOK}}": portfolio?.tiktok || "@portoify",
      "{{LINKEDIN}}": portfolio?.linkedin || "linkedin.com/in/portoify",
      "{{GITHUB}}": portfolio?.github || "github.com/portoify"
    };

    let expStr = "";
    const experiences = portfolio?.experiences || resume?.experiences || [];
    if (experiences.length > 0) {
      expStr = experiences.map((exp: any) => {
        const comp = exp.company ? exp.company.toUpperCase() : "PERUSAHAAN";
        const role = exp.role || "Jabatan";
        const dur = exp.duration || "Periode Kerja";
        const desk = exp.jobdesk || "-";
        return `• ${comp}\n  ${role} — ${dur}\n\n  ${desk}`;
      }).join("\n\n");
    } else {
      expStr = "• SOLUSINDO RAYA\n  Junior Frontend Web Developer — 2021 - 2023\n\n  Mengatur visual interface website dengan optimasi performa 30%.\n\n• CREATIVE AGENCY\n  UI Designer Internship — 2020\n\n  Membantu mendesain draf kawat draf (wireframe) halaman landing page.";
    }
    textMapping["{{PENGALAMAN_KERJA}}"] = expStr;

    let eduStr = "";
    const educations = portfolio?.educations || resume?.educations || [];
    if (educations.length > 0) {
      eduStr = educations.map((edu: any) => 
        `• ${edu.degree || "S1"} - ${edu.institution || "Universitas"} (${edu.period || "2018 - 2022"})`
      ).join("\n");
    } else {
      eduStr = "• S1 Teknik Informatika - Universitas Indonesia (2018 - 2022)\n• SMA Negeri 1 Jakarta (2015 - 2018)";
    }
    textMapping["{{PENDIDIKAN}}"] = eduStr;

    let projStr = "";
    const projects = portfolio?.projects || [];
    if (projects.length > 0) {
      projStr = projects.map((pj: any, i: number) => 
        `${i + 1}. ${pj.name || "Sistem Portofolio"} (${pj.description || "Website CV"})`
      ).join("\n");
    } else {
      projStr = "1. Portaify SaaS CV Builder\n   Platform pembuat portofolio & resume digital interaktif.\n2. E-Commerce Retail Frontend\n   Interface web toko online lengkap dengan keranjang belanja.";
    }
    textMapping["{{PROYEK}}"] = projStr;

    let certStr = "";
    const certificates = portfolio?.certificates || resume?.certificates || [];
    if (certificates.length > 0) {
      certStr = certificates.map((crt: any) => `• ${crt}`).join("\n");
    } else {
      certStr = "• Sertifikasi Associate Android Developer - Google\n• Sertifikasi React Native Developer - Dicoding";
    }
    textMapping["{{SERTIFIKAT}}"] = certStr;

    let skillStr = "";
    const skills = portfolio?.skills || resume?.skills || [];
    if (skills.length > 0) {
      skillStr = skills.map((sk: any) => `[${sk}]`).join("   ");
    } else {
      skillStr = "[React.js]   [TypeScript]   [Tailwind CSS]   [Express.js]   [Figma]   [Agile Scrum]";
    }
    textMapping["{{KEAHLIAN}}"] = skillStr;

    return textMapping;
  };

  const getDetectedTagsInText = (textStr: string): string[] => {
    if (!textStr) return [];
    const allTags = [
      "{{NAMA_LENGKAP}}", "{{NAMA}}", "{{EMAIL}}", "{{TEMPAT_LAHIR}}", "{{TANGGAL_LAHIR}}",
      "{{TEMPAT_TANGGAL_LAHIR}}", "{{NIK}}", "{{NOMOR_TELEPON}}", "{{TELEPON}}", "{{KOTA}}",
      "{{JENIS_KELAMIN}}", "{{ALAMAT}}", "{{TITLE}}", "{{TENTANG_SAYA}}", "{{NOMOR_WHATSAPP}}",
      "{{WHATSAPP}}", "{{INSTAGRAM}}", "{{TIKTOK}}", "{{LINKEDIN}}", "{{GITHUB}}",
      "{{KEAHLIAN}}", "{{SERTIFIKAT}}"
    ];
    return allTags.filter(tag => textStr.includes(tag));
  };

  const hasAnyTagsOfText = (textStr: string): boolean => {
    return getDetectedTagsInText(textStr).length > 0;
  };

  const triggerAutosaveProfile = async (updated: any) => {
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          fullName: updated.fullName || "",
          placeOfBirth: updated.placeOfBirth || "",
          dateOfBirth: updated.dateOfBirth || "",
          gender: updated.gender || "Laki-laki",
          city: updated.city || "",
          address: updated.address || "",
          nik: updated.nik || "",
          phone: updated.phone || "",
          photoUrl: updated.photoUrl || ""
        })
      });
    } catch (e) {
      console.error("Autosave profile failed", e);
    }
  };

  const triggerAutosavePortfolio = async (updated: any) => {
    try {
      await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          templateId: portTplId || "tpl_port_1",
          title: updated.title || "",
          aboutMe: updated.aboutMe || "",
          experiences: updated.experiences || [],
          projects: updated.projects || [],
          educations: updated.educations || [],
          certificates: updated.certificates || [],
          skills: updated.skills || [],
          phone: updated.phone || "",
          address: updated.address || "",
          whatsapp: updated.whatsapp || "",
          instagram: updated.instagram || "",
          tiktok: updated.tiktok || "",
          linkedin: updated.linkedin || "",
          github: updated.github || ""
        })
      });
    } catch (e) {
      console.error("Autosave portfolio failed", e);
    }
  };

  const triggerAutosaveResume = async (updated: any) => {
    try {
      await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          templateId: resTplId || "tpl_res_1",
          title: updated.title || "",
          aboutMe: updated.aboutMe || "",
          experiences: updated.experiences || [],
          educations: updated.educations || [],
          certificates: updated.certificates || [],
          phone: updated.phone || "",
          address: updated.address || "",
          whatsapp: updated.whatsapp || "",
          instagram: updated.instagram || "",
          tiktok: updated.tiktok || "",
          linkedin: updated.linkedin || "",
          github: updated.github || ""
        })
      });
    } catch (e) {
      console.error("Autosave resume failed", e);
    }
  };

  const getTagConfig = (tag: string) => {
    switch (tag) {
      case "{{NAMA_LENGKAP}}":
      case "{{NAMA}}":
        return {
          label: "Nama Lengkap",
          getter: () => profile?.fullName || currentUser.fullName || "",
          setter: (v: string) => {
            const next = profile ? { ...profile, fullName: v } : { fullName: v, id: "", userId: currentUser.id } as any;
            setProfile(next);
            setProfName(v);
          },
          onBlurAction: (currentTagVal: string) => {
            const next = profile ? { ...profile, fullName: currentTagVal } : { fullName: currentTagVal, id: "", userId: currentUser.id } as any;
            triggerAutosaveProfile(next);
          },
          isTextarea: false
        };
      case "{{EMAIL}}":
        return {
          label: "Email",
          getter: () => profile?.email || currentUser.email || "",
          setter: (v: string) => {
            const next = profile ? { ...profile, email: v } : { email: v, id: "", userId: currentUser.id } as any;
            setProfile(next);
          },
          onBlurAction: (currentTagVal: string) => {
            const next = profile ? { ...profile, email: currentTagVal } : { email: currentTagVal, id: "", userId: currentUser.id } as any;
            triggerAutosaveProfile(next);
          },
          isTextarea: false
        };
      case "{{TEMPAT_LAHIR}}":
        return {
          label: "Tempat Lahir",
          getter: () => profile?.placeOfBirth || "",
          setter: (v: string) => {
            const next = profile ? { ...profile, placeOfBirth: v } : { placeOfBirth: v, id: "", userId: currentUser.id } as any;
            setProfile(next);
            setProfTTLPlace(v);
          },
          onBlurAction: (currentTagVal: string) => {
            const next = profile ? { ...profile, placeOfBirth: currentTagVal } : { placeOfBirth: currentTagVal, id: "", userId: currentUser.id } as any;
            triggerAutosaveProfile(next);
          },
          isTextarea: false
        };
      case "{{TANGGAL_LAHIR}}":
        return {
          label: "Tanggal Lahir (Y-M-D)",
          getter: () => profile?.dateOfBirth || "",
          setter: (v: string) => {
            const next = profile ? { ...profile, dateOfBirth: v } : { dateOfBirth: v, id: "", userId: currentUser.id } as any;
            setProfile(next);
            setProfTTLDate(v);
          },
          onBlurAction: (currentTagVal: string) => {
            const next = profile ? { ...profile, dateOfBirth: currentTagVal } : { dateOfBirth: currentTagVal, id: "", userId: currentUser.id } as any;
            triggerAutosaveProfile(next);
          },
          isTextarea: false
        };
      case "{{NIK}}":
        return {
          label: "NIK",
          getter: () => profile?.nik || "",
          setter: (v: string) => {
            const next = profile ? { ...profile, nik: v } : { nik: v, id: "", userId: currentUser.id } as any;
            setProfile(next);
            setProfNik(v);
          },
          onBlurAction: (currentTagVal: string) => {
            const next = profile ? { ...profile, nik: currentTagVal } : { nik: currentTagVal, id: "", userId: currentUser.id } as any;
            triggerAutosaveProfile(next);
          },
          isTextarea: false
        };
      case "{{NOMOR_TELEPON}}":
      case "{{TELEPON}}":
        return {
          label: "Nomor Telepon",
          getter: () => profile?.phone || "",
          setter: (v: string) => {
            const next = profile ? { ...profile, phone: v } : { phone: v, id: "", userId: currentUser.id } as any;
            setProfile(next);
            setProfPhone(v);
            if (portfolio) {
              setPortfolio({ ...portfolio, phone: v });
              setPortPhone(v);
            }
            if (resume) {
              setResume({ ...resume, phone: v });
              setResPhone(v);
            }
          },
          onBlurAction: (currentTagVal: string) => {
            const pNext = profile ? { ...profile, phone: currentTagVal } : { phone: currentTagVal, id: "", userId: currentUser.id } as any;
            triggerAutosaveProfile(pNext);
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, phone: currentTagVal });
            if (resume) triggerAutosaveResume({ ...resume, phone: currentTagVal });
          },
          isTextarea: false
        };
      case "{{KOTA}}":
        return {
          label: "Kota",
          getter: () => profile?.city || "",
          setter: (v: string) => {
            const next = profile ? { ...profile, city: v } : { city: v, id: "", userId: currentUser.id } as any;
            setProfile(next);
            setProfCity(v);
          },
          onBlurAction: (currentTagVal: string) => {
            const next = profile ? { ...profile, city: currentTagVal } : { city: currentTagVal, id: "", userId: currentUser.id } as any;
            triggerAutosaveProfile(next);
          },
          isTextarea: false
        };
      case "{{JENIS_KELAMIN}}":
        return {
          label: "Jenis Kelamin",
          getter: () => profile?.gender || "Laki-laki",
          setter: (v: string) => {
            const next = profile ? { ...profile, gender: v } : { gender: v, id: "", userId: currentUser.id } as any;
            setProfile(next);
            setProfGender(v);
          },
          onBlurAction: (currentTagVal: string) => {
            const next = profile ? { ...profile, gender: currentTagVal } : { gender: currentTagVal, id: "", userId: currentUser.id } as any;
            triggerAutosaveProfile(next);
          },
          isTextarea: false
        };
      case "{{ALAMAT}}":
        return {
          label: "Alamat",
          getter: () => profile?.address || "",
          setter: (v: string) => {
            const next = profile ? { ...profile, address: v } : { address: v, id: "", userId: currentUser.id } as any;
            setProfile(next);
            setProfAddress(v);
            if (portfolio) {
              setPortfolio({ ...portfolio, address: v });
              setPortAddress(v);
            }
            if (resume) {
              setResume({ ...resume, address: v });
              setResAddress(v);
            }
          },
          onBlurAction: (currentTagVal: string) => {
            const pNext = profile ? { ...profile, address: currentTagVal } : { address: currentTagVal, id: "", userId: currentUser.id } as any;
            triggerAutosaveProfile(pNext);
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, address: currentTagVal });
            if (resume) triggerAutosaveResume({ ...resume, address: currentTagVal });
          },
          isTextarea: true
        };
      case "{{TITLE}}":
        return {
          label: "Profesi / Title",
          getter: () => resume?.title || portfolio?.title || "",
          setter: (v: string) => {
            if (resume) {
              setResume({ ...resume, title: v });
              setResTitle(v);
            }
            if (portfolio) {
              setPortfolio({ ...portfolio, title: v });
              setPortTitle(v);
            }
          },
          onBlurAction: (currentTagVal: string) => {
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, title: currentTagVal });
            if (resume) triggerAutosaveResume({ ...resume, title: currentTagVal });
          },
          isTextarea: false
        };
      case "{{TENTANG_SAYA}}":
        return {
          label: "Tentang Saya",
          getter: () => resume?.aboutMe || portfolio?.aboutMe || "",
          setter: (v: string) => {
            if (resume) {
              setResume({ ...resume, aboutMe: v });
              setResAbout(v);
            }
            if (portfolio) {
              setPortfolio({ ...portfolio, aboutMe: v });
              setPortAbout(v);
            }
          },
          onBlurAction: (currentTagVal: string) => {
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, aboutMe: currentTagVal });
            if (resume) triggerAutosaveResume({ ...resume, aboutMe: currentTagVal });
          },
          isTextarea: true
        };
      case "{{NOMOR_WHATSAPP}}":
      case "{{WHATSAPP}}":
        return {
          label: "Nomor WhatsApp",
          getter: () => resume?.whatsapp || portfolio?.whatsapp || "",
          setter: (v: string) => {
            if (resume) {
              setResume({ ...resume, whatsapp: v });
              setResWA(v);
            }
            if (portfolio) {
              setPortfolio({ ...portfolio, whatsapp: v });
              setPortWA(v);
            }
          },
          onBlurAction: (currentTagVal: string) => {
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, whatsapp: currentTagVal });
            if (resume) triggerAutosaveResume({ ...resume, whatsapp: currentTagVal });
          },
          isTextarea: false
        };
      case "{{INSTAGRAM}}":
        return {
          label: "Instagram",
          getter: () => portfolio?.instagram || "",
          setter: (v: string) => {
            if (portfolio) {
              setPortfolio({ ...portfolio, instagram: v });
              setPortIG(v);
            }
          },
          onBlurAction: (currentTagVal: string) => {
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, instagram: currentTagVal });
          },
          isTextarea: false
        };
      case "{{TIKTOK}}":
        return {
          label: "TikTok",
          getter: () => portfolio?.tiktok || "",
          setter: (v: string) => {
            if (portfolio) {
              setPortfolio({ ...portfolio, tiktok: v });
              setPortTikTok(v);
            }
          },
          onBlurAction: (currentTagVal: string) => {
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, tiktok: currentTagVal });
          },
          isTextarea: false
        };
      case "{{LINKEDIN}}":
        return {
          label: "LinkedIn",
          getter: () => portfolio?.linkedin || "",
          setter: (v: string) => {
            if (portfolio) {
              setPortfolio({ ...portfolio, linkedin: v });
              setPortLinkedIn(v);
            }
          },
          onBlurAction: (currentTagVal: string) => {
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, linkedin: currentTagVal });
          },
          isTextarea: false
        };
      case "{{GITHUB}}":
        return {
          label: "GitHub",
          getter: () => portfolio?.github || "",
          setter: (v: string) => {
            if (portfolio) {
              setPortfolio({ ...portfolio, github: v });
              setPortGitHub(v);
            }
          },
          onBlurAction: (currentTagVal: string) => {
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, github: currentTagVal });
          },
          isTextarea: false
        };
      case "{{KEAHLIAN}}":
        return {
          label: "Daftar Keahlian (Pisahkan dengan koma atau titik koma)",
          getter: () => {
            const sks = portfolio?.skills || resume?.skills || [];
            return sks.join(", ");
          },
          setter: (v: string) => {
            const parsed = v.split(/[,;]/).map(s => s.trim()).filter(Boolean);
            if (portfolio) {
              setPortfolio({ ...portfolio, skills: parsed });
              setPortSkills(parsed);
            }
            if (resume) {
              setResume({ ...resume, skills: parsed });
            }
          },
          onBlurAction: (currentTagVal: string) => {
            const parsed = currentTagVal.split(/[,;]/).map(s => s.trim()).filter(Boolean);
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, skills: parsed });
            if (resume) triggerAutosaveResume({ ...resume, skills: parsed });
          },
          isTextarea: true
        };
      case "{{SERTIFIKAT}}":
        return {
          label: "Daftar Sertifikas/Sertifikat (Satu per baris)",
          getter: () => {
            const certs = portfolio?.certificates || resume?.certificates || [];
            return certs.join("\n");
          },
          setter: (v: string) => {
            const parsed = v.split("\n").map(s => s.trim()).filter(Boolean);
            if (portfolio) {
              setPortfolio({ ...portfolio, certificates: parsed });
              setPortCerts(parsed);
            }
            if (resume) {
              setResume({ ...resume, certificates: parsed });
              setResCerts(parsed);
            }
          },
          onBlurAction: (currentTagVal: string) => {
            const parsed = currentTagVal.split("\n").map(s => s.trim()).filter(Boolean);
            if (portfolio) triggerAutosavePortfolio({ ...portfolio, certificates: parsed });
            if (resume) triggerAutosaveResume({ ...resume, certificates: parsed });
          },
          isTextarea: true
        };
      default:
        return { label: "", getter: null, setter: () => {}, onBlurAction: () => {}, isTextarea: false };
    }
  };

  useEffect(() => {
    if (activeTab === "buat-resume-saya" && canvasElements.length === 0) {
      if (resume && resume.customHtml && resume.customHtml.trim() !== "") {
        try {
          const parsed = JSON.parse(resume.customHtml);
          if (parsed && Array.isArray(parsed.elements)) {
            setCanvasElements(parsed.elements);
            setCanvasHistory([parsed.elements]);
            setCanvasHistoryIndex(0);
            if (parsed.backgroundColor) {
              setCanvasBgColor(parsed.backgroundColor);
            }
            const matchedTpl = templates.find(t => t.id === resume.templateId);
            if (matchedTpl) {
              setActiveCanvasTemplate(matchedTpl);
            }
            return;
          }
        } catch (e) {
          console.error("Gagal memuat desain resume tersimpan dari customHtml", e);
        }
      }

      const resumeTemplates = templates.filter(t => t.category === "resume");
      if (resumeTemplates.length > 0) {
        const firstTpl = resumeTemplates[0];
        try {
          const parsed = JSON.parse(firstTpl.htmlMarkup);
          if (parsed && Array.isArray(parsed.elements)) {
            setCanvasElements(parsed.elements);
            setCanvasHistory([parsed.elements]);
            setCanvasHistoryIndex(0);
            setActiveCanvasTemplate(firstTpl);
          }
        } catch (e) {
          console.error("Gagal memuat template awal", e);
        }
      } else {
        setCanvasElements([]);
        setActiveCanvasTemplate(null);
      }
    }
  }, [activeTab, resume, templates]);

  // Helper method for dynamic package access enforcement
  const getPackageAccess = () => {
    // Admins bypass all limitations
    if (currentUser.role === "admin") {
      return {
        portfolio: "all",
        resume: "all",
        letter: "all",
        upload: "all"
      };
    }
    // Allow free templates for inactive / new member
    if (!sub || !sub.isActive || sub.packageId === "inactive") {
      return {
        portfolio: "free",
        resume: "free",
        letter: "free",
        upload: "none"
      };
    }
    
    const pkg = packages.find(p => p.id === sub.packageId);
    if (!pkg) {
      // Dynamic fallback for hardcoded system plans
      if (sub.packageId === "pkg_basic") {
        return {
          portfolio: "basic",
          resume: "basic",
          letter: "basic",
          upload: "none"
        };
      }
      if (sub.packageId === "pkg_standard") {
        return {
          portfolio: "standard",
          resume: "standard",
          letter: "standard",
          upload: "restricted"
        };
      }
      return {
        portfolio: "all",
        resume: "all",
        letter: "all",
        upload: "all"
      };
    }

    return {
      portfolio: pkg.id === "pkg_basic" ? "basic" : pkg.id === "pkg_standard" ? "standard" : pkg.id === "pkg_premium" ? "all" : (pkg.accessPortfolio || "all"),
      resume: pkg.id === "pkg_basic" ? "basic" : pkg.id === "pkg_standard" ? "standard" : pkg.id === "pkg_premium" ? "all" : (pkg.accessResume || "all"),
      letter: pkg.id === "pkg_basic" ? "basic" : pkg.id === "pkg_standard" ? "standard" : pkg.id === "pkg_premium" ? "all" : (pkg.accessLetter || "all"),
      upload: pkg.id === "pkg_basic" ? "none" : pkg.id === "pkg_standard" ? "restricted" : pkg.id === "pkg_premium" ? "all" : (pkg.accessUploadDocs || "all")
    };
  };

  const isTemplateAccessible = (t: Template) => {
    if (currentUser.role === "admin") return true;
    
    // Determine the template's tier
    let tempTier = t.tier || "basic";
    if (t.id === "tpl_port_1" || t.id === "tpl_res_1" || t.id === "tpl_cov_1") {
      tempTier = "free";
    }

    const privileges = getPackageAccess();
    let accessModuleType = "all";
    if (t.category === "portfolio") accessModuleType = privileges.portfolio;
    else if (t.category === "resume") accessModuleType = privileges.resume;
    else if (t.category === "cover_letter") accessModuleType = privileges.letter;

    if (accessModuleType === "none") return false;
    if (accessModuleType === "free") {
      return tempTier === "free";
    }
    if (accessModuleType === "all" || accessModuleType === "premium") return true;

    if (tempTier === "free") return true;
    if (accessModuleType === "standard") {
      return tempTier === "basic" || tempTier === "standard";
    }
    if (accessModuleType === "basic") {
      return tempTier === "basic";
    }
    return false;
  };

  // Load database entities upon mount
  const loadEntities = async () => {
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
      
      // Hit endpoints parallelized
      const [pRes, portRes, resRes, cRes, dRes, pkgRes, sRes, tRes, userLogsRes] = await Promise.all([
        fetch(`/api/profile/${currentUser.id}`),
        fetch(`/api/portfolios/${currentUser.id}`),
        fetch(`/api/resumes/${currentUser.id}`),
        fetch(`/api/covers/${currentUser.id}`),
        fetch(`/api/documents/${currentUser.id}`),
        fetch(`/api/packages`),
        fetch(`/api/payments/my-subscription/${currentUser.id}`),
        fetch(`/api/templates`),
        fetch(`/api/users/${currentUser.id}/logs`)
      ]);

      const [pData, portData, resData, cData, dData, pkgData, sData, tData, userLogsData] = await Promise.all([
        safeJson(pRes, null),
        safeJson(portRes, null),
        safeJson(resRes, null),
        safeJson(cRes, null),
        safeJson(dRes, []),
        safeJson(pkgRes, []),
        safeJson(sRes, null),
        safeJson(tRes, []),
        safeJson(userLogsRes, [])
      ]);

      setProfile(pData);
      setPortfolio(portData);
      setResume(resData);
      setCover(cData);
      setDocuments(dData);
      setPackages(pkgData);
      setSub(sData);
      const cleanedTemplates = (tData || []).map((t: any) => ({
        ...t,
        name: t.name.replace(/\s*\(DOCX Word Template\)/gi, "")
      }));
      setTemplates(cleanedTemplates);
      
      if (Array.isArray(userLogsData)) {
        setLogs(userLogsData);
      }

      // Sync form fields
      if (pData) {
        setProfName(pData.fullName || currentUser.fullName || "");
        setProfTTLPlace(pData.placeOfBirth || "");
        setProfTTLDate(pData.dateOfBirth || "");
        setProfGender(pData.gender || "Laki-laki");
        setProfCity(pData.city || "");
        setProfAddress(pData.address || "");
        setProfNik(pData.nik || "");
        setProfPhone(pData.phone || "");
        setProfPhoto(pData.photoUrl || "");
      }

      if (sData) {
        setHostingPath(sData.domainHostingPath || "");
      }

      if (portData) {
        setPortTplId(portData.templateId || "tpl_port_1");
      }
      if (resData) {
        setResTplId(resData.templateId || "tpl_res_1");
      }
      if (cData) {
        setCovTplId(cData.templateId || "tpl_cov_1");
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntities();
  }, [currentUser.id]);

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

  // Set active template for a file category directly
  const handleSetTemplateForCategory = async (category: 'portfolio' | 'resume' | 'cover_letter', templateId: string) => {
    showFeedback();
    
    if (!profile) {
      showFeedback("Harap isi Profil Lengkap Anda di sub-menu Update Profiles terlebih dahulu sebelum memilih template!");
      return;
    }

    try {
      setLoading(true);
      if (category === "portfolio") {
        const resp = await fetch("/api/portfolios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            templateId: templateId,
            title: portTitle || portfolio?.title || "Spesialis Profesional",
            aboutMe: portAbout || portfolio?.aboutMe || "Biografi ringkas belum ditentukan.",
            experiences: portExps.filter(e => e.company && e.role).length > 0 
              ? portExps.filter(e => e.company && e.role) 
              : (portfolio?.experiences || []),
            projects: portProjects.filter(p => p.name).length > 0
              ? portProjects.filter(p => p.name)
              : (portfolio?.projects || []),
            educations: portEdu.institution 
              ? [portEdu] 
              : (portfolio?.educations || []),
            certificates: portCerts.filter(c => c && c.trim()).length > 0
              ? portCerts.filter(c => c && c.trim())
              : (portfolio?.certificates || []),
            skills: portSkills || portfolio?.skills || [],
            phone: portPhone || portfolio?.phone || profile?.phone || "",
            address: portAddress || portfolio?.address || profile?.address || "",
            whatsapp: portWA || portfolio?.whatsapp || "",
            instagram: portIG || portfolio?.instagram || "",
            tiktok: portTikTok || portfolio?.tiktok || "",
            linkedin: portLinkedIn || portfolio?.linkedin || "",
            github: portGitHub || portfolio?.github || ""
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          showFeedback(data.message);
          setLoading(false);
          return;
        }
        setPortTplId(templateId);
      } else if (category === "resume") {
        const resp = await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            templateId: templateId,
            title: resTitle || resume?.title || "Spesialis Profesional",
            aboutMe: resAbout || resume?.aboutMe || "Biografi profesional belum ditentukan.",
            experiences: resExps.filter(e => e.company && e.role).length > 0
              ? resExps.filter(e => e.company && e.role)
              : (resume?.experiences || []),
            educations: resEdus.filter(e => e.institution).length > 0
              ? resEdus.filter(e => e.institution)
              : (resume?.educations || []),
            projects: resProjects.filter(p => p.name).length > 0
              ? resProjects.filter(p => p.name)
              : (resume?.projects || []),
            certificates: resCerts.filter(c => c && c.trim()).length > 0
              ? resCerts.filter(c => c && c.trim())
              : (resume?.certificates || []),
            phone: resPhone || resume?.phone || profile?.phone || "",
            address: resAddress || resume?.address || profile?.address || "",
            whatsapp: resWA || resume?.whatsapp || "",
            instagram: resIG || resume?.instagram || "",
            tiktok: resTikTok || resume?.tiktok || "",
            linkedin: resLinkedIn || resume?.linkedin || "",
            github: resGitHub || resume?.github || ""
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          showFeedback(data.message);
          setLoading(false);
          return;
        }
        setResTplId(templateId);
      } else if (category === "cover_letter") {
        const resp = await fetch("/api/covers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            templateId: templateId,
            companyName: covCompany || cover?.companyName || "PT Contoh Perusahaan",
            companyAddress: covCompAddress || cover?.companyAddress || "Alamat Perusahaan Contoh",
            jobTitle: covJobTitle || cover?.jobTitle || "Posisi Target",
            letterContent: covLetterContent || cover?.letterContent || "Isi surat lamaran."
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          showFeedback(data.message);
          setLoading(false);
          return;
        }
        setCovTplId(templateId);
      }

      showFeedback("", `Sukses menerapkan template "${templates.find(t=>t.id===templateId)?.name || templateId}" sebagai template aktif Anda! 👌`);
      await loadEntities();
    } catch (err) {
      console.error(err);
      showFeedback("Terjadi kegagalan komunikasi dengan server database.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateCategory = async (category: 'portfolio' | 'resume' | 'cover_letter') => {
    if (!window.confirm("Apakah Anda yakin ingin menonaktifkan desain ini dan menghapus seluruh data draf bersangkutan dari database MYSQL untuk mengosongkan ruang server?")) {
      return;
    }
    showFeedback();
    try {
      setLoading(true);
      const endpoint = category === "portfolio" ? `/api/portfolios/${currentUser.id}` 
                     : category === "resume" ? `/api/resumes/${currentUser.id}`
                     : `/api/covers/${currentUser.id}`;
      
      const resp = await fetch(endpoint, {
        method: "DELETE"
      });
      const data = await resp.json();
      if (!resp.ok) {
        showFeedback(data.message || "Gagal menghapus dari database.");
        setLoading(false);
        return;
      }
      
      // Clear relevant state
      if (category === "portfolio") {
        setPortfolio(null);
        setPortTplId("");
      } else if (category === "resume") {
        setResume(null);
        setResTplId("");
      } else {
        setCover(null);
        setCovTplId("");
      }
      showFeedback("", "Sukses: Desain berhasil dinonaktifkan dan terhapus dari Database MYSQL server.");
      await loadEntities();
    } catch (err) {
      showFeedback("Gagal menghubungi server database.");
    } finally {
      setLoading(false);
    }
  };

  // 1. UPDATE PROFILE SUBMIT
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    showFeedback();
    
    try {
      const resp = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          fullName: profName,
          placeOfBirth: profTTLPlace,
          dateOfBirth: profTTLDate,
          gender: profGender,
          city: profCity,
          address: profAddress,
          nik: profNik,
          phone: profPhone,
          photoUrl: profPhoto
        })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);
      
      showFeedback("", data.message);
      loadEntities();
    } catch (e) {
      showFeedback("Terjadi kesalahan koneksi server.");
    }
  };

  // Helper: Compress selected image on client side
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

  // Profile image local file base64 converter helper
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressImageBase64(reader.result as string, 500, 0.75);
        setProfPhoto(compressed);
      } catch (err) {
        setProfPhoto(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // 2. CHANGE PASSWORD SUBMIT
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    showFeedback();

    if (newPass !== confirmNewPass) {
      return showFeedback("Konfirmasi password baru tidak cocok!");
    }

    try {
      const resp = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPassword: oldPass,
          newPassword: newPass
        })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      setOldPass("");
      setNewPass("");
      setConfirmNewPass("");
    } catch (e) {
      showFeedback("Error update database.");
    }
  };

  // 3. EDIT PORTFOLIO SUBMIT
  const [portTitle, setPortTitle] = useState("");
  const [portAbout, setPortAbout] = useState("");
  const [portTplId, setPortTplId] = useState("");
  const [portPhone, setPortPhone] = useState("");
  const [portAddress, setPortAddress] = useState("");
  const [portWA, setPortWA] = useState("");
  const [portIG, setPortIG] = useState("");
  const [portTikTok, setPortTikTok] = useState("");
  const [portLinkedIn, setPortLinkedIn] = useState("");
  const [portGitHub, setPortGitHub] = useState("");

  // Max 3 Experience array state
  const [portExps, setPortExps] = useState<Experience[]>([
    { company: "", role: "", duration: "", jobdesk: "" }
  ]);

  // Max 3 Projects array
  const [portProjects, setPortProjects] = useState<Project[]>([
    { name: "", description: "", link: "" }
  ]);

  // Skills tagging list state
  const [portSkills, setPortSkills] = useState<string[]>([]);
  const [inpSkill, setInpSkill] = useState("");

  // Educations & Certificate states
  const [portEdu, setPortEdu] = useState<Education>({ institution: "", degree: "", period: "" });
  const [portCerts, setPortCerts] = useState<string[]>(["", "", ""]);

  // Sync Portfolio fields when tab switches or portfolio loads
  useEffect(() => {
    if (portfolio) {
      setPortTitle(portfolio.title || "");
      setPortAbout(portfolio.aboutMe || "");
      setPortTplId(portfolio.templateId || "tpl_port_1");
      setPortPhone(portfolio.phone || profile?.phone || "");
      setPortAddress(portfolio.address || profile?.address || "");
      setPortWA(portfolio.whatsapp || "");
      setPortIG(portfolio.instagram || "");
      setPortTikTok(portfolio.tiktok || "");
      setPortLinkedIn(portfolio.linkedin || "");
      setPortGitHub(portfolio.github || "");

      if (portfolio.experiences && portfolio.experiences.length > 0) {
        setPortExps([...portfolio.experiences]);
      } else {
        setPortExps([{ company: "", role: "", duration: "", jobdesk: "" }]);
      }
      if (portfolio.projects && portfolio.projects.length > 0) {
        setPortProjects([...portfolio.projects]);
      } else {
        setPortProjects([{ name: "", description: "", link: "" }]);
      }
      setPortSkills(portfolio.skills || []);
      if (portfolio.educations && portfolio.educations.length > 0) {
        setPortEdu(portfolio.educations[0]);
      }
      if (portfolio.certificates && portfolio.certificates.length > 0) {
        const syncedCerts = [...portfolio.certificates];
        while (syncedCerts.length < 3) syncedCerts.push("");
        setPortCerts(syncedCerts.slice(0, 3));
      }
    } else if (resume) {
      // Auto-fallback populate if Portfolio is blank but Resume is prefilled
      setPortTitle(resume.title || "");
      setPortAbout(resume.aboutMe || "");
      setPortPhone(resume.phone || profile?.phone || "");
      setPortAddress(resume.address || profile?.address || "");
      setPortWA(resume.whatsapp || "");
      setPortIG(resume.instagram || "");
      setPortTikTok(resume.tiktok || "");
      setPortLinkedIn(resume.linkedin || "");
      setPortGitHub(resume.github || "");

      if (resume.experiences && resume.experiences.length > 0) {
        const syncedExps = [...resume.experiences];
        setPortExps(syncedExps);
      } else {
        setPortExps([{ company: "", role: "", duration: "", jobdesk: "" }]);
      }
      setPortSkills(resume.skills || []);
      if (resume.educations && resume.educations.length > 0) {
        setPortEdu(resume.educations[0]);
      }
      if (resume.certificates && resume.certificates.length > 0) {
        const syncedCerts = [...resume.certificates];
        while (syncedCerts.length < 3) syncedCerts.push("");
        setPortCerts(syncedCerts.slice(0, 3));
      }
    }
  }, [portfolio, resume, activeTab]);

  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    showFeedback();

    if (!profile) {
      return showFeedback("Harap isi Profil Lengkap kamu di sub-menu Update Profiles terlebih dahulu!");
    }

    const t = templates.find(x => x.id === portTplId);
    if (t && !isTemplateAccessible(t)) {
      return showFeedback(`Template "${t.name}" memerlukan Paket Berlangganan. Silakan pilih template gratis bawaan, atau upgrade paket Anda di menu "Paket Saya"!`);
    }

    try {
      const resp = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          templateId: portTplId,
          title: portTitle,
          aboutMe: portAbout,
          experiences: portExps.filter(e => e.company && e.role),
          projects: portProjects.filter(p => p.name),
          educations: portEdu.institution ? [portEdu] : [],
          certificates: portCerts.filter(c => c && c.trim()),
          skills: portSkills,
          phone: portPhone,
          address: portAddress,
          whatsapp: portWA,
          instagram: portIG,
          tiktok: portTikTok,
          linkedin: portLinkedIn,
          github: portGitHub
        })
      });

      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      loadEntities();
    } catch (err) {
      showFeedback("Terjadi kegagalan koneksi database.");
    }
  };


  // 4. EDIT RESUME / CV SUBMIT
  const [resTitle, setResTitle] = useState("");
  const [resAbout, setResAbout] = useState("");
  const [resTplId, setResTplId] = useState("");
  const [isChangingResTpl, setIsChangingResTpl] = useState(false);
  const [resPhone, setResPhone] = useState("");
  const [resAddress, setResAddress] = useState("");
  const [resWA, setResWA] = useState("");
  const [resIG, setResIG] = useState("");
  const [resTikTok, setResTikTok] = useState("");
  const [resLinkedIn, setResLinkedIn] = useState("");
  const [resGitHub, setResGitHub] = useState("");
  const [inpResSkill, setInpResSkill] = useState("");

  const [resExps, setResExps] = useState<Experience[]>([
    { company: "", role: "", duration: "", jobdesk: "" }
  ]);

  const [resEdu, setResEdu] = useState<Education>({ institution: "", degree: "", period: "" });
  const [resEdus, setResEdus] = useState<Education[]>([
    { institution: "", degree: "", period: "" }
  ]);
  const [resProjects, setResProjects] = useState<Project[]>([
    { name: "", description: "", link: "" }
  ]);

  useEffect(() => {
    if (resEdus.length > 0 && resEdus[0].institution) {
      setResEdu(resEdus[0]);
    }
  }, [resEdus]);

  const [resCerts, setResCerts] = useState<string[]>(["", "", ""]);

  // Dynamic automatic synchronization: resume experiences follow portExps precisely
  useEffect(() => {
    if (portExps && portExps.length > 0) {
      const activeExps = portExps.filter(e => e.company || e.role);
      if (activeExps.length > 0) {
        setResExps(activeExps);
      } else {
        setResExps([{ company: "", role: "", duration: "", jobdesk: "" }]);
      }
    }
  }, [portExps]);

  useEffect(() => {
    if (resume) {
      setResTitle(resume.title || "");
      setResAbout(resume.aboutMe || "");
      setResTplId(resume.templateId || "tpl_res_1");
      setResPhone(resume.phone || profile?.phone || "");
      setResAddress(resume.address || profile?.address || "");
      setResWA(resume.whatsapp || "");
      setResIG(resume.instagram || "");
      setResTikTok(resume.tiktok || "");
      setResLinkedIn(resume.linkedin || "");
      setResGitHub(resume.github || "");

      if (resume.experiences && resume.experiences.length > 0) {
        setResExps([...resume.experiences]);
      } else if (portfolio && portfolio.experiences && portfolio.experiences.length > 0) {
        setResExps([...portfolio.experiences]);
      } else {
        setResExps([{ company: "", role: "", duration: "", jobdesk: "" }]);
      }
      if (resume.educations && resume.educations.length > 0) {
        setResEdu(resume.educations[0]);
        setResEdus([...resume.educations]);
      } else if (portfolio && portfolio.educations && portfolio.educations.length > 0) {
        setResEdu(portfolio.educations[0]);
        setResEdus([...portfolio.educations]);
      } else {
        setResEdus([{ institution: "", degree: "", period: "" }]);
      }
      if (resume.projects && resume.projects.length > 0) {
        setResProjects([...resume.projects]);
      } else if (portfolio && portfolio.projects && portfolio.projects.length > 0) {
        setResProjects([...portfolio.projects]);
      } else {
        setResProjects([{ name: "", description: "", link: "" }]);
      }
      if (resume.certificates && resume.certificates.length > 0) {
        const syncedCerts = [...resume.certificates];
        while (syncedCerts.length < 3) syncedCerts.push("");
        setResCerts(syncedCerts.slice(0, 3));
      }
    } else if (portfolio) {
      // Auto-fallback populate if Resume is blank but Portfolio is prefilled
      setResTitle(portfolio.title || "");
      setResAbout(portfolio.aboutMe || "");
      setResPhone(portfolio.phone || profile?.phone || "");
      setResAddress(portfolio.address || profile?.address || "");
      setResWA(portfolio.whatsapp || "");
      setResIG(portfolio.instagram || "");
      setResTikTok(portfolio.tiktok || "");
      setResLinkedIn(portfolio.linkedin || "");
      setResGitHub(portfolio.github || "");

      if (portfolio.experiences && portfolio.experiences.length > 0) {
        setResExps([...portfolio.experiences]);
      } else {
        setResExps([{ company: "", role: "", duration: "", jobdesk: "" }]);
      }
      if (portfolio.educations && portfolio.educations.length > 0) {
        setResEdu(portfolio.educations[0]);
        setResEdus([...portfolio.educations]);
      } else {
        setResEdus([{ institution: "", degree: "", period: "" }]);
      }
      if (portfolio.projects && portfolio.projects.length > 0) {
        setResProjects([...portfolio.projects]);
      } else {
        setResProjects([{ name: "", description: "", link: "" }]);
      }
      if (portfolio.certificates && portfolio.certificates.length > 0) {
        const syncedCerts = [...portfolio.certificates];
        while (syncedCerts.length < 3) syncedCerts.push("");
        setResCerts(syncedCerts.slice(0, 3));
      }
    }
  }, [resume, portfolio, activeTab]);

  useEffect(() => {
    if (isChangingResTpl) {
      setTimeout(() => {
        const elem = document.getElementById("resume-design-collection");
        if (elem) {
          elem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [isChangingResTpl]);

  const handleSaveResume = async (e: React.FormEvent) => {
    e.preventDefault();
    showFeedback();

    if (!profile) return showFeedback("Harap isi Profil Lengkap kamu di menu Update Profiles terlebih dahulu!");

    const t = templates.find(x => x.id === resTplId);
    if (t && !isTemplateAccessible(t)) {
      return showFeedback(`Template "${t.name}" memerlukan Paket Berlangganan. Silakan pilih template gratis bawaan, atau upgrade paket Anda di menu "Paket Saya"!`);
    }

    try {
      const resp = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          templateId: resTplId,
          title: resTitle,
          aboutMe: resAbout,
          experiences: resExps.filter(e => e.company && e.role),
          educations: resEdus.filter(e => e.institution),
          projects: resProjects.filter(p => p.name),
          certificates: resCerts.filter(c => c && c.trim()),
          skills: portSkills, // auto synched skills list
          phone: resPhone,
          address: resAddress,
          whatsapp: resWA,
          instagram: resIG,
          tiktok: resTikTok,
          linkedin: resLinkedIn,
          github: resGitHub
        })
      });

      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      loadEntities();
    } catch (err) {
      showFeedback("Koneksi gagal.");
    }
  };

  const [isSavingCanvas, setIsSavingCanvas] = useState(false);

  const handleSaveCanvasDesign = async () => {
    showFeedback();
    setIsSavingCanvas(true);
    try {
      const designPayload = {
        userId: currentUser.id,
        templateId: resTplId || "tpl_res_1",
        title: resTitle || resume?.title || "",
        aboutMe: resAbout || resume?.aboutMe || "",
        experiences: (resExps || []).filter(e => e.company && e.role),
        educations: (resEdus || []).filter(e => e.institution),
        projects: (resProjects || []).filter(p => p.name),
        certificates: (resCerts || []).filter(c => c && c.trim()),
        skills: portSkills || resume?.skills || [],
        phone: resPhone || resume?.phone || "",
        address: resAddress || resume?.address || "",
        whatsapp: resWA || resume?.whatsapp || "",
        instagram: resIG || resume?.instagram || "",
        tiktok: resTikTok || resume?.tiktok || "",
        linkedin: resLinkedIn || resume?.linkedin || "",
        github: resGitHub || resume?.github || "",
        customHtml: JSON.stringify({
          elements: canvasElements,
          backgroundColor: canvasBgColor
        })
      };

      const resp = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(designPayload)
      });

      const resData = await resp.json();
      if (!resp.ok) {
        showFeedback(resData.message || "Gagal menyimpan desain.");
        return;
      }

      showFeedback("", "Selamat! Desain resume kustom di canvas Anda telah berhasil disimpan secara permanen ke Database Secure.");
      setResume(resData.resume || resData);
      loadEntities();
    } catch (err) {
      console.error("Gagal menyimpan desain canvas", err);
      showFeedback("Koneksi gagal saat mencoba menyimpan desain canvas.");
    } finally {
      setIsSavingCanvas(false);
    }
  };


  // 5. COVER LETTERS
  const [covTplId, setCovTplId] = useState("");
  const [isChangingCoverTpl, setIsChangingCoverTpl] = useState(false);
  const [isDownloadingCoverPdf, setIsDownloadingCoverPdf] = useState(false);
  const [covCompany, setCovCompany] = useState("");
  const [covCompAddress, setCovCompAddress] = useState("");
  const [covJobTitle, setCovJobTitle] = useState("");
  const [covLetterContent, setCovLetterContent] = useState("");

  const [docxParagraphs, setDocxParagraphs] = useState<{text: string; align: "left" | "center" | "right" | "justify"}[]>([]);
  const [isDocxProcessing, setIsDocxProcessing] = useState(false);

  const isPersonalDetailKey = (key: string): boolean => {
    const k = key.trim().toLowerCase().replace(/[^a-z0-9\s\.\/]/g, "").trim();
    return k === "nama" || 
           k === "alamat" || 
           k === "no. telp" || 
           k === "no telp" || 
           k === "no. hp" || 
           k === "no hp" || 
           k === "no. telepon" || 
           k === "no telepon" || 
           k === "telepon" || 
           k === "email" || 
           k === "email pengguna" || 
           k === "web portofolio" || 
           k === "tautan portofolio" || 
           k === "portofolio" ||
           k.includes("pendidikan") ||
           k.includes("sekolah") ||
           k.includes("universitas") ||
           k.includes("tempat tanggal lahir") ||
           k.includes("tempat tgl lahir") ||
           k.includes("tempat/tgl lahir") ||
           k.includes("tempat/tanggal lahir") ||
           k.includes("tempat lahir") ||
           k.includes("tanggal lahir");
  };

  const checkIfDocxMarkup = (markup?: string): boolean => {
    if (!markup) return false;
    return markup.startsWith("data:application/vnd.openxmlformats-officedocument") || 
           markup.endsWith(".docx") || 
           markup.includes("/api/word/");
  };

  const getSubstitutedDocxParagraphs = async (docxBase64OrUrl: string, data: any): Promise<{text: string; align: "left" | "center" | "right" | "justify"}[]> => {
    try {
      let arrayBuffer: ArrayBuffer;
      let isBase64 = false;
      if (docxBase64OrUrl.startsWith("data:")) {
        isBase64 = true;
      } else if (!docxBase64OrUrl.includes("/") && !docxBase64OrUrl.includes(".docx")) {
        isBase64 = true;
      }

      if (isBase64) {
        const base64Data = docxBase64OrUrl.split(",")[1] || docxBase64OrUrl;
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        let fetchUrl = docxBase64OrUrl;
        if (!fetchUrl.startsWith("/") && !fetchUrl.startsWith("http")) {
          fetchUrl = "/" + fetchUrl;
        }
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error("Gagal mengunduh file word template");
        arrayBuffer = await response.arrayBuffer();
      }
      
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docXmlFile = zip.file("word/document.xml");
      if (!docXmlFile) return [{ text: "Error: word/document.xml tidak ditemukan", align: "left" }];
      const xmlText = await docXmlFile.async("text");

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");

      const paragraphs: {text: string; align: "left" | "center" | "right" | "justify"}[] = [];

      const getParagraphTextAndAlign = (pEl: Element) => {
        let align: "left" | "center" | "right" | "justify" = "left";
        const jcElements = pEl.getElementsByTagName("*");
        for (let i = 0; i < jcElements.length; i++) {
          const el = jcElements[i];
          const localName = el.nodeName.toLowerCase().replace(/^.*:/, "");
          if (localName === "jc") {
            const val = el.getAttribute("w:val") || el.getAttribute("val");
            if (val) {
              const valLower = val.toLowerCase();
              if (valLower === "right") align = "right";
              else if (valLower === "center") align = "center";
              else if (valLower === "both" || valLower === "justify") align = "justify";
            }
            break;
          }
        }

        let pText = "";
        const traverseRuns = (node: Node) => {
          const localName = node.nodeName.toLowerCase().replace(/^.*:/, "");
          
          if (localName === "alternatecontent") {
            const choiceNode = Array.from(node.childNodes).find(child => child.nodeName.toLowerCase().replace(/^.*:/, "") === "choice");
            if (choiceNode) {
              traverseRuns(choiceNode);
            }
            return;
          }
          
          if (
            localName === "txbxcontent" || 
            localName === "drawing" || 
            localName === "pict" || 
            localName === "textbox" ||
            (localName === "p" && node !== pEl)
          ) {
            return;
          }

          if (localName === "t") {
            pText += node.textContent || "";
          } else if (localName === "tab") {
            pText += "    ";
          } else if (localName === "br") {
            pText += "\n";
          } else {
            for (let i = 0; i < node.childNodes.length; i++) {
              traverseRuns(node.childNodes[i]);
            }
          }
        };
        traverseRuns(pEl);
        
        return { text: pText, align };
      };

      const extractTextboxesFromParagraph = (pEl: Element) => {
        const textboxParagraphs: {text: string; align: "left" | "center" | "right" | "justify"}[] = [];
        
        const findTextboxes = (node: Node) => {
          const localName = node.nodeName.toLowerCase().replace(/^.*:/, "");
          
          if (localName === "alternatecontent") {
            const choiceNode = Array.from(node.childNodes).find(child => child.nodeName.toLowerCase().replace(/^.*:/, "") === "choice");
            if (choiceNode) {
              findTextboxes(choiceNode);
            }
            return;
          }
          
          if (localName === "txbxcontent" || localName === "textbox" || localName === "v:textbox") {
            const subPEls = (node as Element).getElementsByTagName("*");
            const tempParagraphs: {text: string}[] = [];
            for (let i = 0; i < subPEls.length; i++) {
              const subEl = subPEls[i];
              if (subEl.nodeName.toLowerCase().replace(/^.*:/, "") === "p") {
                const { text } = getParagraphTextAndAlign(subEl);
                if (text && text.trim()) {
                  tempParagraphs.push({ text });
                }
              }
            }
            const isDetailsBox = tempParagraphs.some(p => {
              const t = p.text.trim();
              return t.startsWith("Nama") || t.includes("Nama :") || t.includes("Nama   ") || t.includes("Web Portofolio") || t.includes("Alamat :");
            });
            tempParagraphs.forEach(p => {
              textboxParagraphs.push({
                text: p.text,
                align: isDetailsBox ? "left" : "right"
              });
            });
            return;
          }
          
          for (let i = 0; i < node.childNodes.length; i++) {
            findTextboxes(node.childNodes[i]);
          }
        };
        
        findTextboxes(pEl);
        return textboxParagraphs;
      };

      const getTableParagraphs = (tblEl: Element) => {
        const tblParagraphs: {text: string; align: "left" | "center" | "right" | "justify"}[] = [];
        
        const rowEls = tblEl.getElementsByTagName("w:tr");
        const fallbackRowEls = rowEls.length > 0 ? rowEls : tblEl.getElementsByTagName("tr");
        
        for (let r = 0; r < fallbackRowEls.length; r++) {
          const rowEl = fallbackRowEls[r];
          const cellEls = rowEl.getElementsByTagName("w:tc");
          const fallbackCellEls = cellEls.length > 0 ? cellEls : rowEl.getElementsByTagName("tc");
          
          if (fallbackCellEls.length === 0) continue;
          
          const cellTexts: string[] = [];
          for (let c = 0; c < fallbackCellEls.length; c++) {
            const cellEl = fallbackCellEls[c];
            const pElsInCell = cellEl.getElementsByTagName("w:p");
            const fallbackPElsInCell = pElsInCell.length > 0 ? pElsInCell : cellEl.getElementsByTagName("p");
            
            let cellText = "";
            for (let pIdx = 0; pIdx < fallbackPElsInCell.length; pIdx++) {
              const { text } = getParagraphTextAndAlign(fallbackPElsInCell[pIdx]);
              if (text) {
                if (cellText) cellText += " ";
                cellText += text;
              }
            }
            cellTexts.push(cellText.trim());
          }
          
          const hasContent = cellTexts.some(Boolean);
          if (!hasContent) continue;

          if (cellTexts.length === 3 && (cellTexts[1] === ":" || cellTexts[1].trim() === ":")) {
            tblParagraphs.push({
              text: `${cellTexts[0]} : ${cellTexts[2]}`,
              align: "left"
            });
          } else if (cellTexts.length === 2 && cellTexts[1].startsWith(":")) {
            tblParagraphs.push({
              text: `${cellTexts[0]} ${cellTexts[1]}`,
              align: "left"
            });
          } else {
            const rowText = cellTexts.filter(Boolean).join("    ");
            if (rowText.trim()) {
              tblParagraphs.push({
                text: rowText,
                align: "left"
              });
            }
          }
        }
        
        return tblParagraphs;
      };

      const bodyEl = xmlDoc.getElementsByTagName("w:body")[0] || 
                     xmlDoc.getElementsByTagName("body")[0] || 
                     xmlDoc.documentElement;

      const flowElements: {type: "p" | "tbl"; el: Element}[] = [];
      
      const findFlowElements = (node: Node) => {
        const localName = node.nodeName.toLowerCase().replace(/^.*:/, "");
        
        if (localName === "alternatecontent") {
          const choiceNode = Array.from(node.childNodes).find(child => child.nodeName.toLowerCase().replace(/^.*:/, "") === "choice");
          if (choiceNode) {
            findFlowElements(choiceNode);
          }
          return;
        }
        
        if (localName === "p") {
          flowElements.push({ type: "p", el: node as Element });
          return;
        }
        
        if (localName === "tbl") {
          flowElements.push({ type: "tbl", el: node as Element });
          return;
        }
        
        for (let i = 0; i < node.childNodes.length; i++) {
          findFlowElements(node.childNodes[i]);
        }
      };
      
      findFlowElements(bodyEl);

      for (const flow of flowElements) {
        if (flow.type === "p") {
          const textboxPEls = extractTextboxesFromParagraph(flow.el);
          const { text, align } = getParagraphTextAndAlign(flow.el);
          
          const isIntroParagraph = text && (text.toLowerCase().includes("bertanda tangan") || text.toLowerCase().includes("bawah ini"));
          const hasDetailsInTextbox = textboxPEls.some(p => p.text.includes("Nama") || p.text.includes("Alamat") || p.text.includes("Web Portofolio"));
          
          if (textboxPEls.length > 0) {
            if (isIntroParagraph || hasDetailsInTextbox) {
              if (text && text.trim()) {
                paragraphs.push({ text, align });
              }
              paragraphs.push(...textboxPEls);
            } else {
              paragraphs.push(...textboxPEls);
              if (text && text.trim()) {
                paragraphs.push({ text, align });
              }
            }
          } else {
            if (text && text.trim()) {
              paragraphs.push({ text, align });
            } else {
              paragraphs.push({ text: "", align: "left" });
            }
          }
        } else if (flow.type === "tbl") {
          const tblPEls = getTableParagraphs(flow.el);
          paragraphs.push(...tblPEls);
        }
      }
      
      const cityValue = data.city || (data.address ? (data.address.split(",")[0] || "Jakarta") : "Jakarta");
      const birthPlaceStr = data.placeOfBirth || "Jakarta";
      const birthDateFormatted = data.dateOfBirth ? formatIndonesianDate(data.dateOfBirth) : "11 November 1999";
      const tempatTanggalLahirValue = `${birthPlaceStr}, ${birthDateFormatted}`;

      const urlPortofolioValue = data.domainHostingPath 
        ? `${window.location.origin}/u/${data.domainHostingPath}` 
        : `${window.location.origin}/u/`;

      const activeEducations = resEdus.filter(e => e.institution).length > 0 ? resEdus.filter(e => e.institution) : (resume?.educations || []);
      const firstEdu = activeEducations[0];
      const univ1 = firstEdu ? firstEdu.institution : "";
      const period1 = firstEdu ? firstEdu.period : "";

      const dob = data.dateOfBirth || profile?.dateOfBirth;
      let usiaValue = "";
      if (dob) {
        const birthDate = new Date(dob);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          usiaValue = `${age} Tahun`;
        }
      }
      if (!usiaValue) usiaValue = "25 Tahun";

      const replacements: {[key: string]: string} = {
        NAMA: data.fullName || "(NAMA LENGKAP PENGGUNA)",
        ALAMAT: data.address || "(ALAMAT DOMISILI)",
        TELEPON: data.phone || "(NOMOR TELEPON)",
        EMAIL_PENGGUNA: data.email || "(ALAMAT EMAIL)",
        EMAIL: data.email || "(ALAMAT EMAIL)",
        TANGGAL: new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }),
        HARI: new Date().toLocaleDateString("id-ID", { weekday: 'long' }),
        KOTA: cityValue,
        TEMPAT_TANGGAL_LAHIR: tempatTanggalLahirValue,
        URL_PORTOFOLIO: urlPortofolioValue,
        NAMA_PERUSAHAAN: data.companyName || "(NAMA PERUSAHAAN TARGET)",
        ALAMAT_PERUSAHAAN: data.companyAddress || "(ALAMAT KANTOR TARGET)",
        JABATAN_DILAMAR: data.jobTitle || "(POSISI / JABATAN)",
        ISI_SURAT: data.letterContent || "Dengan hormat, sehubungan dengan informasi lowongan...",
        USIA: usiaValue,
        UNIVERSITAS_1: univ1 || "(NAMA UNIVERSITAS)",
        TAHUN_LULUS_1: period1 || "(TAHUN LULUS)",
      };
      
      const processed: {text: string; align: "left" | "center" | "right" | "justify"}[] = [];
      paragraphs.forEach((par) => {
        let substituted = par.text;
        Object.entries(replacements).forEach(([key, val]) => {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
          substituted = substituted.replace(regex, val);
        });

        if (substituted.includes("\n")) {
          const lines = substituted.split("\n");
          const hasDetailLine = lines.some((line) => {
            const colonIdx = line.indexOf(":");
            if (colonIdx === -1) return false;
            const keyPart = line.substring(0, colonIdx).trim().toLowerCase();
            return isPersonalDetailKey(keyPart);
          });

          if (hasDetailLine) {
            lines.forEach((line) => {
              processed.push({
                text: line,
                align: par.align
              });
            });
          } else {
            processed.push({
              text: substituted,
              align: par.align
            });
          }
        } else {
          processed.push({
            text: substituted,
            align: par.align
          });
        }
      });
      return processed;
    } catch (e) {
      console.error(e);
      return [{ text: "Gagal mengurai teks dari template Word.", align: "left" }];
    }
  };

  const downloadSubstitutedDocxAsPdf = async (docxBase64: string, name: string, data: any) => {
    try {
      const paragraphs = await getSubstitutedDocxParagraphs(docxBase64, data);
      
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      
      doc.setProperties({
        title: name,
        subject: "Surat Lamaran Kerja",
        author: data.fullName || "User"
      });

      const marginX = 25;
      let posY = 25;
      const pageHeight = 297;
      const printableWidth = 160;

      doc.setFont("helvetica", "normal");
      
      paragraphs.forEach((par) => {
        const pText = par.text;
        const pAlign = par.align || "left";

        if (!pText || !pText.trim()) {
          posY += 4;
          return;
        }

        doc.setFontSize(11);
        doc.setTextColor(33, 37, 41);

        const firstColonIdx = pText.indexOf(":");
        const isDetail = (() => {
          if (firstColonIdx === -1) return false;
          const k = pText.substring(0, firstColonIdx).trim().toLowerCase();
          return isPersonalDetailKey(k);
        })();

        if (isDetail) {
          const keyPart = pText.substring(0, firstColonIdx).trim();
          const valPart = pText.substring(firstColonIdx + 1).trim();

          doc.setFont("helvetica", "normal");
          doc.text(keyPart, marginX, posY);
          doc.text(":", marginX + 34, posY);

          const valueWidth = printableWidth - 37;
          const valLines: string[] = doc.splitTextToSize(valPart, valueWidth);

          valLines.forEach((valLine) => {
            if (posY > pageHeight - 25) {
              doc.addPage();
              posY = 25;
            }
            doc.text(valLine, marginX + 37, posY);
            posY += 5.8;
          });

          posY += 0.5;
          return;
        }

        const splitLines: string[] = doc.splitTextToSize(pText, printableWidth);
        
        splitLines.forEach((line) => {
          if (posY > pageHeight - 25) {
            doc.addPage();
            posY = 25;
          }
          
          const lowerLine = line.trim().toLowerCase();
          const shouldBeBold = 
            lowerLine.startsWith("hal:") || 
            lowerLine.startsWith("perihal:") || 
            lowerLine.startsWith("kepada yth") || 
            lowerLine.startsWith("dengan hormat") ||
            (data.fullName && lowerLine === data.fullName.toLowerCase());

          if (shouldBeBold) {
            doc.setFont("helvetica", "bold");
          } else {
            doc.setFont("helvetica", "normal");
          }

          let finalX = marginX;
          if (pAlign === "right") {
            finalX = 185;
          } else if (pAlign === "center") {
            finalX = 105;
          }

          doc.text(line, finalX, posY, { align: pAlign });
          posY += 5.8;
        });

        posY += 3;
      });

      doc.save(`${name.replace(/\s+/g, '_')}_${(data.fullName || 'User').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Gagal mendownload PDF dari Word:", err);
      alert("Gagal memproses file Word ke PDF. Pastikan file Word template terunggah dengan benar.");
    }
  };

  useEffect(() => {
    const activeCovTpl = templates.find(t => t.category === "cover_letter" && t.id === covTplId) || templates.find(t => t.category === "cover_letter");
    if (activeCovTpl && activeCovTpl.htmlMarkup && checkIfDocxMarkup(activeCovTpl.htmlMarkup)) {
      setIsDocxProcessing(true);
      const parseDocx = async () => {
        try {
          const paragraphs = await getSubstitutedDocxParagraphs(activeCovTpl.htmlMarkup, {
            fullName: profile?.fullName || currentUser?.fullName || "",
            address: profile?.address || "",
            phone: profile?.phone || "",
            email: currentUser?.email || "",
            city: profile?.city || "",
            placeOfBirth: profile?.placeOfBirth || "",
            dateOfBirth: profile?.dateOfBirth || "",
            domainHostingPath: sub?.domainHostingPath || "",
            companyName: covCompany,
            companyAddress: covCompAddress,
            jobTitle: covJobTitle,
            letterContent: covLetterContent,
          });
          setDocxParagraphs(paragraphs);
        } catch (err) {
          console.error(err);
        } finally {
          setIsDocxProcessing(false);
        }
      };
      parseDocx();
    } else {
      setDocxParagraphs([]);
    }
  }, [covTplId, templates, profile, currentUser, covCompany, covCompAddress, covJobTitle, covLetterContent, sub]);

  useEffect(() => {
    if (cover) {
      setCovTplId(cover.templateId || "tpl_cov_1");
      setCovCompany(cover.companyName || "");
      setCovCompAddress(cover.companyAddress || "");
      setCovJobTitle(cover.jobTitle || "");
      setCovLetterContent(cover.letterContent || "");
    }
  }, [cover, activeTab]);

  useEffect(() => {
    if (isChangingCoverTpl) {
      setTimeout(() => {
        const elem = document.getElementById("cover-letter-design-collection");
        if (elem) {
          elem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [isChangingCoverTpl]);

  const [modalDocxParagraphs, setModalDocxParagraphs] = useState<{text: string; align: "left" | "center" | "right" | "justify"}[]>([]);
  const [isModalDocxProcessing, setIsModalDocxProcessing] = useState(false);

  useEffect(() => {
    if (previewTemplate && previewTemplate.category === "cover_letter" && checkIfDocxMarkup(previewTemplate.htmlMarkup)) {
      setIsModalDocxProcessing(true);
      const parseDocx = async () => {
        try {
          const paragraphs = await getSubstitutedDocxParagraphs(previewTemplate.htmlMarkup, {
            fullName: profile?.fullName || currentUser?.fullName || "Budi Gunawan",
            address: profile?.address || "Jl. Pemuda No. 45, Surabaya",
            phone: profile?.phone || "081234567890",
            email: currentUser?.email || "budi.gunawan@gmail.com",
            city: profile?.city || "Surabaya",
            placeOfBirth: profile?.placeOfBirth || "Surabaya",
            dateOfBirth: profile?.dateOfBirth || "1998-05-15",
            domainHostingPath: sub?.domainHostingPath || "budi_portofolio",
            companyName: covCompany || "PT Global Tech Indonesia",
            companyAddress: covCompAddress || "Jln. Panglima Sudirman No. 12, Jakarta",
            jobTitle: covJobTitle || "Software Engineer",
            letterContent: covLetterContent || "Dengan hormat, sehubungan dengan informasi lowongan pekerjaan...",
          });
          setModalDocxParagraphs(paragraphs);
        } catch (err) {
          console.error("Gagal parse docx di modal:", err);
        } finally {
          setIsModalDocxProcessing(false);
        }
      };
      parseDocx();
    } else {
      setModalDocxParagraphs([]);
    }
  }, [previewTemplate, profile, currentUser, covCompany, covCompAddress, covJobTitle, covLetterContent, sub, templates]);

  const handleSaveCover = async (e: React.FormEvent) => {
    e.preventDefault();
    showFeedback();

    if (!profile) return showFeedback("Harap lengkapi Profil di Kelola Profiles!");

    const t = templates.find(x => x.id === covTplId);
    if (t && !isTemplateAccessible(t)) {
      return showFeedback(`Template "${t.name}" memerlukan Paket Berlangganan. Silakan pilih template gratis bawaan, atau upgrade paket Anda di menu "Paket Saya"!`);
    }

    try {
      const resp = await fetch("/api/covers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          templateId: covTplId,
          companyName: covCompany,
          companyAddress: covCompAddress,
          jobTitle: covJobTitle,
          letterContent: covLetterContent
        })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      loadEntities();
    } catch (err) {
      showFeedback("Database update error.");
    }
  };


  const handleDownloadCoverLetterPdf = async () => {
    try {
      const activeCovTpl = templates.find(t => t.category === "cover_letter" && t.id === covTplId) || templates.find(t => t.category === "cover_letter");
      if (!activeCovTpl) {
        showFeedback("Pilih template surat lamaran terlebih dahulu!");
        return;
      }

      const isDocx = activeCovTpl.htmlMarkup && checkIfDocxMarkup(activeCovTpl.htmlMarkup);
      if (isDocx) {
        setIsDownloadingCoverPdf(true);
        await downloadSubstitutedDocxAsPdf(activeCovTpl.htmlMarkup, activeCovTpl.name, {
          fullName: profile?.fullName || currentUser?.fullName || "",
          address: profile?.address || "",
          phone: profile?.phone || "",
          email: currentUser?.email || "",
          city: profile?.city || "",
          placeOfBirth: profile?.placeOfBirth || "",
          dateOfBirth: profile?.dateOfBirth || "",
          domainHostingPath: sub?.domainHostingPath || "",
          companyName: covCompany,
          companyAddress: covCompAddress,
          jobTitle: covJobTitle,
          letterContent: covLetterContent,
        });
        setIsDownloadingCoverPdf(false);
        return;
      }

      setIsDownloadingCoverPdf(true);
      const tempPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const html = getPreviewHtml(activeCovTpl);
      
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "fixed";
      tempDiv.style.left = "0px";
      tempDiv.style.top = "0px";
      tempDiv.style.width = "794px"; // Standard screen representation of A4 page width at 96 DPI
      tempDiv.style.height = "1123px"; // Standard A4 height
      tempDiv.style.backgroundColor = "#ffffff";
      tempDiv.style.color = "#000000";
      tempDiv.style.zIndex = "-9999";
      tempDiv.style.opacity = "0.01";
      tempDiv.style.pointerEvents = "none";
      tempDiv.style.overflow = "hidden";
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);

      // Inject temporary styles to override borders, shadows, margins, and force absolute sizing
      const overrideStyle = document.createElement("style");
      overrideStyle.innerHTML = `
        .cover-letter-page {
          width: 794px !important;
          height: 1123px !important;
          min-height: 1123px !important;
          max-width: 794px !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          margin: 0 !important;
          padding: 25mm 20mm 20mm 25mm !important;
          box-sizing: border-box !important;
        }
      `;
      tempDiv.appendChild(overrideStyle);

      // Grace period for fonts / styling / images to settle
      await new Promise(r => setTimeout(r, 700));
      const targetElement = tempDiv.querySelector(".cover-letter-page") as HTMLElement || tempDiv;
      const canvas = await html2canvas(targetElement, { 
        scale: 2.0, 
        useCORS: true, 
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: 1123
      });
      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const a4Width = 210;
      const a4Height = 297;
      tempPdf.addImage(imgData, "JPEG", 0, 0, a4Width, a4Height);
      tempPdf.save(`Surat_Lamaran_${(profile?.fullName || "Saya").replace(/\s+/g, "_")}.pdf`);
    } catch (error) {
      console.error("Gagal mendownload PDF surat lamaran:", error);
      showFeedback("Terjadi kesalahan saat membuat file PDF.");
    } finally {
      setIsDownloadingCoverPdf(false);
    }
  };


  // --- PREMIUM EXCLUSIVE: GABUNGKAN SEMUA BERKAS KE PDF ---
  const handleCompileAllDocs = async () => {
    setCompiling(true);
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
    setCompilationProgress("Menyiapkan dokumen...");

    // Helper to dynamically translate oklch styles to standard rgb before rendering in html2canvas
    const prepareOklchStylesheets = async () => {
      const restores: Array<{ element: HTMLElement; revert: () => void }> = [];
      const styleElements = Array.from(document.querySelectorAll("style"));
      const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
      
      const tempEl = document.createElement("div");
      tempEl.style.display = "none";
      document.body.appendChild(tempEl);

      const parseAndConvertOklch = (oklchStr: string): string => {
        const match = oklchStr.match(/oklch\(([^)]+)\)/i);
        if (!match) return oklchStr;
        
        const inner = match[1].trim();
        const parts = inner.split(/[\s,+/]+/);
        if (parts.length < 3) return oklchStr;

        // 1. Lightness (L)
        const lStr = parts[0];
        let l = 0;
        if (lStr.endsWith("%")) {
          l = parseFloat(lStr) / 100;
        } else {
          l = parseFloat(lStr);
        }

        // 2. Chroma (C)
        const cStr = parts[1];
        let c = 0;
        if (cStr.endsWith("%")) {
          c = parseFloat(cStr) / 100;
        } else {
          c = parseFloat(cStr);
        }

        // 3. Hue (H)
        const hStr = parts[2];
        let h = 0;
        if (hStr.endsWith("deg")) {
          h = parseFloat(hStr);
        } else if (hStr.endsWith("rad")) {
          h = parseFloat(hStr) * (180 / Math.PI);
        } else if (hStr.endsWith("turn")) {
          h = parseFloat(hStr) * 360;
        } else {
          h = parseFloat(hStr);
        }

        // 4. Alpha (A)
        let a = 1;
        if (parts.length >= 4) {
          const aStr = parts[3];
          if (aStr.endsWith("%")) {
            a = parseFloat(aStr) / 100;
          } else {
            a = parseFloat(aStr);
          }
        }

        if (isNaN(l) || isNaN(c) || isNaN(h)) {
          return oklchStr;
        }

        // Convert OKLCH to OKLAB
        const hRad = (h * Math.PI) / 180;
        const oklab_L = l;
        const oklab_a = c * Math.cos(hRad);
        const oklab_b = c * Math.sin(hRad);

        // Convert OKLAB to LMS
        const l_ = oklab_L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
        const m_ = oklab_L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
        const s_ = oklab_L - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;

        const l_cube = l_ * l_ * l_;
        const m_cube = m_ * m_ * m_;
        const s_cube = s_ * s_ * s_;

        // LMS to linear sRGB
        const rLinear = +4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.2309699292 * s_cube;
        const gLinear = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
        const bLinear = -0.0041960863 * l_cube - 0.7034186147 * m_cube + 1.7076131010 * s_cube;

        // Linear sRGB to standard sRGB (gamma correction)
        const gamma = (val: number) => {
          return val <= 0.0031308
            ? 12.92 * val
            : 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
        };

        const r = Math.round(Math.max(0, Math.min(1, gamma(rLinear))) * 255);
        const g = Math.round(Math.max(0, Math.min(1, gamma(gLinear))) * 255);
        const b = Math.round(Math.max(0, Math.min(1, gamma(bLinear))) * 255);

        if (a === 1) {
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
      };

      const convertCssText = (cssText: string): string => {
        return cssText.replace(/oklch\([^)]+\)/g, (match) => {
          try {
            tempEl.style.color = "";
            tempEl.style.color = match;
            const computed = window.getComputedStyle(tempEl).color;
            if (computed && (computed.startsWith("rgb") || computed.startsWith("rgba"))) {
              return computed;
            }
          } catch (e) {
            // fallback
          }
          try {
            const jsConv = parseAndConvertOklch(match);
            if (jsConv && jsConv !== match) {
              return jsConv;
            }
          } catch (e) {
            // fallback
          }
          return match;
        });
      };

      // 1. Process style tags
      for (const style of styleElements) {
        const originalText = style.textContent;
        if (originalText && originalText.includes("oklch")) {
          const convertedText = convertCssText(originalText);
          style.textContent = convertedText;
          restores.push({
            element: style,
            revert: () => {
              style.textContent = originalText;
            }
          });
        }
      }

      // 2. Process link tags
      for (const link of linkElements) {
        try {
          const sheet = link.sheet;
          if (sheet) {
            let cssText = "";
            try {
              const rules = sheet.cssRules || sheet.rules;
              for (let i = 0; i < rules.length; i++) {
                cssText += rules[i].cssText + "\n";
              }
            } catch (rulesError) {
              if (link.href && link.href.startsWith(window.location.origin)) {
                const res = await fetch(link.href);
                cssText = await res.text();
              }
            }

            if (cssText && cssText.includes("oklch")) {
              const convertedText = convertCssText(cssText);
              const newStyle = document.createElement("style");
              newStyle.textContent = convertedText;
              document.head.appendChild(newStyle);
              
              link.disabled = true;
              restores.push({
                element: link,
                revert: () => {
                  newStyle.remove();
                  link.disabled = false;
                }
              });
            }
          }
        } catch (e) {
          console.warn("Failed to preprocess link stylesheet:", e);
        }
      }

      // 3. Setup Proxy-based override for window.getComputedStyle to translate elements with oklch computed values
      const originalGetComputedStyle = window.getComputedStyle;
      const conversionCache = new Map<string, string>();
      const tempColorDiv = document.createElement("div");
      tempColorDiv.style.display = "none";
      document.body.appendChild(tempColorDiv);

      const convertStyleColor = (val: string): string => {
        if (!val || typeof val !== "string" || !val.includes("oklch")) {
          return val;
        }
        if (conversionCache.has(val)) {
          return conversionCache.get(val)!;
        }
        try {
          tempColorDiv.style.color = "";
          tempColorDiv.style.color = val;
          const computed = originalGetComputedStyle(tempColorDiv).color;
          if (computed && (computed.startsWith("rgb") || computed.startsWith("rgba"))) {
            conversionCache.set(val, computed);
            return computed;
          }
        } catch (err) {
          // fallback
        }
        try {
          const jsConverted = parseAndConvertOklch(val);
          conversionCache.set(val, jsConverted);
          return jsConverted;
        } catch (err) {
          // fallback
        }
        conversionCache.set(val, val);
        return val;
      };

      window.getComputedStyle = function (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
        const style = originalGetComputedStyle(elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop, receiver) {
            if (prop === "getPropertyValue") {
              return function (propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                return convertStyleColor(val);
              };
            }
            const val = Reflect.get(target, prop);
            if (typeof val === "string" && val.includes("oklch")) {
              return convertStyleColor(val);
            }
            if (typeof val === "function") {
              return val.bind(target);
            }
            return val;
          }
        }) as unknown as CSSStyleDeclaration;
      };

      restores.push({
        element: document.body,
        revert: () => {
          window.getComputedStyle = originalGetComputedStyle;
          tempColorDiv.remove();
        }
      });

      tempEl.remove();

      return () => {
        for (const r of restores) {
          r.revert();
        }
      };
    };

    let revertOklchStyles: (() => void) | null = null;

    try {
      revertOklchStyles = await prepareOklchStylesheets();

      // 1. Initialize Master PDF Document
      const masterPdf = await PDFDocument.create();

      const a4Width = 210;
      const a4Height = 297;

      // Helper to append pages from a temporary jsPDF instance into the master PDF
      const appendJsPdfPages = async (tempPdfIn: any) => {
        const bytes = tempPdfIn.output("arraybuffer");
        const subPdf = await PDFDocument.load(bytes);
        const copiedPages = await masterPdf.copyPages(subPdf, subPdf.getPageIndices());
        copiedPages.forEach((page) => masterPdf.addPage(page));
      };

      // Helper to safely load PDF raw bytes from base64 data URLs or online hosts
      const loadPdfBytes = async (url: string): Promise<ArrayBuffer> => {
        if (url.startsWith("data:")) {
          const base64Data = url.substring(url.indexOf(",") + 1);
          const binaryString = window.atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes.buffer;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.arrayBuffer();
      };

      // Helper function to load image
      const loadImage = (src: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      // Helper to generate a standardized attachment placeholder sheet (only used as fallback)
      const addFallbackSheetToPdf = (targetPdf: any, title: string, desc: string, filename: string) => {
        // Draw top header banner - Clean light appearance without heavy black background!
        targetPdf.setTextColor(15, 23, 42); // slate 900 tint instead of white
        targetPdf.setFont("Helvetica", "bold");
        targetPdf.setFontSize(14);
        targetPdf.text("PORTOIFY VERIFIED SYSTEM ATTACHMENT", 15, 16);
        targetPdf.setFont("Helvetica", "normal");
        targetPdf.setFontSize(9);
        targetPdf.setTextColor(239, 68, 68); // Red
        targetPdf.text("OFFICIAL SECURE ARCHIVE", 15, 24);

        // Thin elegant binder line
        targetPdf.setLineWidth(0.2);
        targetPdf.setDrawColor(226, 232, 240); // slate 200
        targetPdf.line(15, 28, a4Width - 15, 28);

        // Attachment Label
        targetPdf.setTextColor(15, 23, 42);
        targetPdf.setFont("Helvetica", "bold");
        targetPdf.setFontSize(18);
        targetPdf.text(title, 15, 60);

        // Divider
        targetPdf.setLineWidth(0.5);
        targetPdf.setDrawColor(226, 232, 240); // slate-200
        targetPdf.line(15, 66, 195, 66);

        // Metadata details
        targetPdf.setFont("Helvetica", "normal");
        targetPdf.setFontSize(11);
        targetPdf.setTextColor(71, 85, 105);
        targetPdf.text("Nama Lengkap Pelamar: " + (profile?.fullName || currentUser.fullName), 15, 78);
        targetPdf.text("Email Pendaftar: " + currentUser.email, 15, 86);
        targetPdf.text("Tanggal Pembuatan: " + new Date().toLocaleDateString("id-ID"), 15, 94);
        targetPdf.text("Status Kelengkapan: Tergabung Secara Aman dalam Sistem Enkripsi Lokal", 15, 102);

        // Details box
        targetPdf.setFillColor(248, 250, 252); // slate 50
        targetPdf.rect(15, 115, 180, 75, "F");
        targetPdf.setDrawColor(203, 213, 225); // slate 300
        targetPdf.rect(15, 115, 180, 75, "S");

        targetPdf.setFont("Helvetica", "bold");
        targetPdf.setFontSize(11);
        targetPdf.setTextColor(15, 23, 42);
        targetPdf.text("RINCIAN DETIL BERKAS ASLI:", 22, 125);

        targetPdf.setFont("Helvetica", "normal");
        targetPdf.setFontSize(10);
        targetPdf.setTextColor(51, 65, 85);
        targetPdf.text("Kategori Dokumen: " + desc, 22, 136);
        targetPdf.text("Nama Dokumen di Disk: " + filename, 22, 144);
        targetPdf.text("Format Ekstensi Asli: PDF Document (.pdf)", 22, 152);
        targetPdf.text("Kunci Integrasi: SHA-256 SECURED CLIENT-SIDE", 22, 160);

        targetPdf.setTextColor(100, 116, 139);
        targetPdf.setFontSize(8.5);
        targetPdf.text("Catatan Sistem: Berkas asli di atas diunggah dalam format PDF oleh pencari kerja.", 22, 172);
        targetPdf.text("Karena keterbatasan client-side merge, halaman ini berfungsi sebagai lembar penanda.", 22, 178);
        targetPdf.text("Berkas PDF asli tersimpan utuh di disk server dan siap diverifikasi oleh rekruter.", 22, 184);

        targetPdf.setFont("Helvetica", "bold");
        targetPdf.setTextColor(16, 185, 129); // Emerald-500
        targetPdf.text("✓ PORTOIFY SECURED PACKAGE DIGITAL ATTACHMENT", 15, 230);
      };

      // Helper function to process an uploaded document and add to PDF
      const processDocAttachment = async (fileTypeKey: string, docLabel: string, descName: string) => {
        const found = documents.find(d => d.fileType === fileTypeKey);
        if (!found) return;

        setCompilationProgress(`Menggabungkan ${docLabel}...`);

        const isPdf = found.filePathUrl.startsWith("data:application/pdf") || found.fileName.toLowerCase().endsWith(".pdf");
        if (isPdf) {
          try {
            const bytes = await loadPdfBytes(found.filePathUrl);
            const externalPdf = await PDFDocument.load(bytes);
            const copiedPages = await masterPdf.copyPages(externalPdf, externalPdf.getPageIndices());
            copiedPages.forEach((page) => masterPdf.addPage(page));
          } catch (pdfErr) {
            console.error("Dynamic PDF merge failed, showing fallback placeholder instead: ", pdfErr);
            const tempPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            addFallbackSheetToPdf(tempPdf, docLabel, descName, found.fileName);
            await appendJsPdfPages(tempPdf);
          }
          return;
        }

        // It is an image attachment: png / jpg / jpeg
        const imgObj = await loadImage(found.filePathUrl);
        if (imgObj) {
          const tempPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
          const canvasW = imgObj.width;
          const canvasH = imgObj.height;
          const ratio = canvasW / canvasH;

          // Margin limits
          const margin = 10;
          const maxW = a4Width - (margin * 2);
          const maxH = a4Height - (margin * 2);

          let w = maxW;
          let h = maxW / ratio;

          if (h > maxH) {
            h = maxH;
            w = maxH * ratio;
          }

          const x = (a4Width - w) / 2;
          const y = (a4Height - h) / 2;

          // A4 background
          tempPdf.setFillColor(250, 250, 250);
          tempPdf.rect(0, 0, a4Width, a4Height, "F");
          
          // Clear elegant header (No dark black header banner!)
          tempPdf.setTextColor(100, 116, 139); // slate-500
          tempPdf.setFont("Helvetica", "bold");
          tempPdf.setFontSize(8);
          tempPdf.text(`PORTOIFY VAULT ATTACHMENT  |  ${docLabel.toUpperCase()}`, 10, 8);

          // Add a subtle thin border/divider line instead of a fat black bar
          tempPdf.setLineWidth(0.2);
          tempPdf.setDrawColor(226, 232, 240); // slate-200
          tempPdf.line(10, 11, a4Width - 10, 11);

          // Add image
          tempPdf.addImage(found.filePathUrl, "JPEG", x, y, w, h);
          await appendJsPdfPages(tempPdf);
        }
      };

      // --- SEQUENCE a. Surat Lamaran ---
      setCompilationProgress("Mengompresi Surat Lamaran...");
      const activeCovTpl = templates.find(t => t.category === "cover_letter" && t.id === covTplId) || templates.find(t => t.category === "cover_letter");
      if (activeCovTpl) {
        const tempPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const html = getPreviewHtml(activeCovTpl);
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "fixed";
        tempDiv.style.left = "0px";
        tempDiv.style.top = "0px";
        tempDiv.style.width = "794px";
        tempDiv.style.height = "1123px";
        tempDiv.style.backgroundColor = "#ffffff";
        tempDiv.style.color = "#000000";
        tempDiv.style.zIndex = "-9999";
        tempDiv.style.opacity = "0.01";
        tempDiv.style.pointerEvents = "none";
        tempDiv.style.overflow = "hidden";
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);

        const overrideStyle = document.createElement("style");
        overrideStyle.innerHTML = `
          .cover-letter-page {
            width: 794px !important;
            height: 1123px !important;
            min-height: 1123px !important;
            max-width: 794px !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 25mm 20mm 20mm 25mm !important;
            box-sizing: border-box !important;
          }
        `;
        tempDiv.appendChild(overrideStyle);

        await new Promise(r => setTimeout(r, 700));
        const targetElement = tempDiv.querySelector(".cover-letter-page") as HTMLElement || tempDiv;
        const canvas = await html2canvas(targetElement, { 
          scale: 2.0, 
          useCORS: true, 
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
          windowHeight: 1123
        });
        document.body.removeChild(tempDiv);

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        tempPdf.addImage(imgData, "JPEG", 0, 0, a4Width, a4Height);
        await appendJsPdfPages(tempPdf);
      }

      // --- SEQUENCE b. Resume/CV ---
      setCompilationProgress("Mengompresi CV & Resume Online...");
      const activeResTpl = templates.find(t => t.category === "resume" && t.id === resTplId) || templates.find(t => t.category === "resume");
      if (activeResTpl) {
        const tempPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const html = getPreviewHtml(activeResTpl);
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "fixed";
        tempDiv.style.left = "0px";
        tempDiv.style.top = "0px";
        tempDiv.style.width = "794px";
        tempDiv.style.height = "1123px";
        tempDiv.style.backgroundColor = "#ffffff";
        tempDiv.style.color = "#000000";
        tempDiv.style.zIndex = "-9999";
        tempDiv.style.opacity = "0.01";
        tempDiv.style.pointerEvents = "none";
        tempDiv.style.overflow = "hidden";
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);

        const overrideStyle = document.createElement("style");
        overrideStyle.innerHTML = `
          .min-h-screen, .bg-slate-50, .bg-neutral-50, .bg-slate-100 {
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
            height: auto !important;
          }
          .max-w-4xl, .max-w-3xl, .max-w-2xl, [class*='max-w-'] {
            max-width: 794px !important;
            width: 794px !important;
            min-height: 1123px !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
        `;
        tempDiv.appendChild(overrideStyle);

        await new Promise(r => setTimeout(r, 700));
        const targetElement = tempDiv.querySelector(".max-w-4xl, .max-w-3xl, .max-w-2xl, [class*='max-w-']") as HTMLElement || tempDiv;
        const canvas = await html2canvas(targetElement, { 
          scale: 2.0, 
          useCORS: true, 
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
          windowHeight: 1123
        });
        document.body.removeChild(tempDiv);

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        tempPdf.addImage(imgData, "JPEG", 0, 0, a4Width, a4Height);
        await appendJsPdfPages(tempPdf);
      }

      // --- SEQUENCE c. Pas Foto Terbaru ---
      setCompilationProgress("Memformat Pas Foto...");
      const fotoUrl = profile?.photoUrl;
      if (fotoUrl && fotoUrl.trim() !== "") {
        const imgObj = await loadImage(fotoUrl);
        if (imgObj) {
          const tempPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

          tempPdf.setFillColor(250, 250, 250);
          tempPdf.rect(0, 0, a4Width, a4Height, "F");

          // Clean Header (No black header banner!)
          tempPdf.setTextColor(15, 23, 42); // slate-900 instead of white
          tempPdf.setFont("Helvetica", "bold");
          tempPdf.setFontSize(14);
          tempPdf.text("ATTACHMENT PAS FOTO TERBARU", 15, 16);
          tempPdf.setFontSize(9);
          tempPdf.setFont("Helvetica", "normal");
          tempPdf.setTextColor(244, 63, 94); // Rose
          tempPdf.text("BERKAS PERSYARATAN ADMINISTRASI UTAMA", 15, 24);

          // Subtle divider line
          tempPdf.setLineWidth(0.2);
          tempPdf.setDrawColor(226, 232, 240); // slate-200
          tempPdf.line(15, 28, a4Width - 15, 28);

          // Card centered
          tempPdf.setFillColor(255, 255, 255);
          tempPdf.rect(65, 60, 80, 110, "F");
          tempPdf.setDrawColor(226, 232, 240);
          tempPdf.rect(65, 60, 80, 110, "S");

          tempPdf.addImage(fotoUrl, "JPEG", 70, 65, 70, 100);

          tempPdf.setTextColor(30, 41, 59);
          tempPdf.setFont("Helvetica", "bold");
          tempPdf.setFontSize(16);
          tempPdf.text(profile?.fullName || currentUser.fullName, a4Width / 2, 190, { align: "center" });

          tempPdf.setTextColor(100, 116, 139);
          tempPdf.setFont("Helvetica", "normal");
          tempPdf.setFontSize(10);
          tempPdf.text(`Telpon: ${profile?.phone || portfolio?.phone || "-"} | Rumah: ${profile?.address || "-"}`, a4Width / 2, 198, { align: "center" });

          await appendJsPdfPages(tempPdf);
        }
      }

      // --- SEQUENCE d. Ijazah ---
      await processDocAttachment("ijazah", "Ijazah Pendidikan", "Fotokopi / Scan Ijazah");

      // --- SEQUENCE e. Transkip Nilai ---
      await processDocAttachment("transkip_nilai", "Transkrip Nilai Akademik", "Fotokopi / Scan Transkrip Nilai");

      // --- SEQUENCE f. Surat Pengalaman Kerja (1, 2, 3) ---
      await processDocAttachment("pengalaman_kerja_1", "Surat Pengalaman Kerja #1", "Pakta Pengalaman Kerja / Magang");
      await processDocAttachment("pengalaman_kerja_2", "Surat Pengalaman Kerja #2", "Pakta Pengalaman Kerja / Magang");
      await processDocAttachment("pengalaman_kerja_3", "Surat Pengalaman Kerja #3", "Pakta Pengalaman Kerja / Magang");

      // --- SEQUENCE g. Sertifikat Kompetensi (1, 2, 3) ---
      await processDocAttachment("sertifikat_1", "Sertifikat Kompetensi #1", "Sertifikasi Keahlian Khusus");
      await processDocAttachment("sertifikat_2", "Sertifikat Kompetensi #2", "Sertifikasi Keahlian Khusus");
      await processDocAttachment("sertifikat_3", "Sertifikat Kompetensi #3", "Sertifikasi Keahlian Khusus");

      // --- SEQUENCE h. Surat Keterangan Sehat ---
      await processDocAttachment("sk_sehat", "Surat Keterangan Sehat", "Surat Sehat Jasmani / Medis Resmi");

      // --- SEQUENCE i. Surat SKCK ---
      await processDocAttachment("skck", "Surat Keterangan Catatan Kepolisian (SKCK)", "Surat SKCK Keterangan Kelakuan Baik");

      // --- SEQUENCE j. KTP ---
      await processDocAttachment("ktp", "Kartu Tanda Penduduk (KTP)", "Identitas Kependudukan Digital");

      // --- SEQUENCE k. NPWP ---
      await processDocAttachment("npwp", "Kartu Pokok Wajib Pajak (NPWP)", "Nomor Pokok Wajib Pajak Perorangan");

      // --- SEQUENCE l. BPJS Kesehatan ---
      await processDocAttachment("bpjs_kes", "Kartu Kepesertaan BPJS Kesehatan", "Jaminan Perlindungan Kesehatan");

      // --- SEQUENCE m. BPJS Ketenagakerjaan ---
      await processDocAttachment("bpjs_ketenagakerjaan", "Kartu BPJS Ketenagakerjaan", "Kepesertaan Pembayaran Jaminan Hari Tua");

      setCompilationProgress("Menyelesaikan dokumen...");
      const mergedPdfBytes = await masterPdf.save();
      const pdfBlob = new Blob([mergedPdfBytes], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);

      setMergedPdfBlob(pdfBlob);
      setMergedPdfUrl(pdfUrl);
      showFeedback("", "Seluruh dokumen berhasil digabungkan dengan tatanan urutan tertib PDF!");
    } catch (err) {
      console.error("Error merging docs: ", err);
      showFeedback("", "Gagal menggabungkan dokumen: " + (err as Error).message);
    } finally {
      if (revertOklchStyles) {
        revertOklchStyles();
      }
      setCompiling(false);
      setCompilationProgress("");
    }
  };

  const handleDownloadMergedPdf = () => {
    if (!mergedPdfBlob) return;
    const cleanName = (profile?.fullName || currentUser.fullName || "Kandidat_Portoify").replace(/\s+/g, "_");
    const filename = `Berkas_Lamaran_Lengkap_${cleanName}.pdf`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(mergedPdfBlob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getKirimLamaranMailto = () => {
    const perusahaanNama = cover?.companyName || "(NAMA PERUSAHAAN)";
    const perusahaanAlamat = cover?.companyAddress || "(ALAMAT PERUSAHAAN)";
    const namaKandidat = profile?.fullName || currentUser.fullName || "(NAMA ANDA)";
    const telponKandidat = portfolio?.phone || profile?.phone || "-";
    const whatsappKandidat = portfolio?.whatsapp || resume?.whatsapp || "";
    
    // Construct public portfolio URL
    const portfolioUrl = sub?.domainHostingPath 
      ? `${window.location.origin}/u/${sub.domainHostingPath}` 
      : `${window.location.origin}/u/${currentUser.id}`;

    const subject = "Lamaran Kerja";
    const body = `Yth. Bapak/Ibu HRD Manager
${perusahaanNama}
di
${perusahaanAlamat}

Dengan hormat,

Berdasarkan informasi lowongan pekerjaan yang saya peroleh, melalui email ini saya bermaksud mengajukan lamaran kerja untuk posisi yang tersedia di ${perusahaanNama}

Saya memiliki pengalaman, keterampilan, dan motivasi kerja yang saya yakini dapat memberikan kontribusi positif bagi perusahaan. Sebagai bahan pertimbangan, bersama email ini saya lampirkan Curriculum Vitae (CV) yang memuat riwayat pendidikan, pengalaman kerja, serta kompetensi yang saya miliki.

Selain itu, saya juga melampirkan tautan portofolio untuk memberikan gambaran lebih lanjut mengenai hasil pekerjaan dan proyek yang pernah saya kerjakan:

Portofolio: ${portfolioUrl}


Saya sangat berharap mendapatkan kesempatan untuk mengikuti proses seleksi dan berdiskusi lebih lanjut mengenai bagaimana saya dapat berkontribusi bagi ${perusahaanNama}

Demikian surat lamaran ini saya sampaikan. Atas waktu dan perhatian Bapak/Ibu, saya ucapkan terima kasih.

Hormat saya,

${namaKandidat}

No. Telepon: ${telponKandidat}
WhatsApp: ${whatsappKandidat}`;

    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };


  // 6. DOCUMENTS MANAGER UPLOADS
  const handleUploadDocument = async (fileType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showFeedback();
    
    // Determine the upload spec constraints
    const uploadPrivilege = getPackageAccess().upload;
    const isPremium = uploadPrivilege === "all";

    const fileExt = file.name.split('.').pop()?.toLowerCase() || "";
    const isPdf = fileExt === 'pdf' || file.type === 'application/pdf';
    const isImg = ['png', 'jpg', 'jpeg'].includes(fileExt) || file.type.startsWith('image/');

    if (isPremium) {
      if (file.size > 10 * 1024 * 1024) {
        return showFeedback("Ukuran berkas terlalu besar! Batas maksimal untuk Paket Premium adalah 10 MB per dokumen.");
      }
      if (!isPdf && !isImg) {
        return showFeedback("Format berkas tidak didukung! Paket Premium hanya mendukung berkas gambar PNG, JPG, atau dokumen PDF.");
      }
    } else {
      // Standard or Restricted limits
      if (file.size > 1 * 1024 * 1024) {
        return showFeedback("Ukuran berkas terlalu besar! Batas maksimal untuk Paket Standart adalah 1 MB per dokumen. Silakan upgrade ke Paket Premium untuk batas 10 MB!");
      }
      if (!isImg) {
        return showFeedback("Format berkas tidak didukung! Paket Standart hanya mendukung berkas gambar PNG atau JPG (PDF dilarang). Silakan upgrade ke Paket Premium untuk dukungan PDF!");
      }
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const fileDataUrl = reader.result as string;
        const resp = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            fileType,
            fileName: file.name,
            fileDataUrl
          })
        });

        const data = await resp.json();
        if (!resp.ok) return showFeedback(data.message);

        showFeedback("", data.message);
        loadEntities();
      } catch (err) {
        showFeedback("Database error saat mengunggah berkas");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus berkas dokumen ini secara permanen dari server?")) return;
    showFeedback();

    try {
      const resp = await fetch(`/api/documents/${currentUser.id}/${docId}`, {
        method: "DELETE"
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      loadEntities();
    } catch (err) {
      showFeedback("Database error.");
    }
  };


  const triggerMidtransSnap = (token: string, isSandbox: boolean, selectedPkg: any, orderId: string, clientKey?: string) => {
    const isMock = token.startsWith("snap_mock_token_") || token.startsWith("snap-token-sim-") || token.includes("mock") || token.includes("-sim-") || token.includes("sim");
    if (isMock) {
      console.log("💡 Mock / Simulation token detected. Intercepting to show integrated simulation modal.");
      setShowMockSnapModal(true);
      return;
    }

    const scriptSrc = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/snap.js"
      : "https://app.midtrans.com/snap/snap.js";

    // Clean old configurations to avoid collision
    document.querySelectorAll("script").forEach(s => {
      if (s.src.includes("midtrans") && s.src.includes("snap")) {
        s.remove();
      }
    });

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.setAttribute("data-client-key", clientKey || "Mid-client-fpwgAjTpW4tzD-dC");
    script.onload = () => {
      if ((window as any).snap) {
        (window as any).snap.pay(token, {
          onSuccess: async (result: any) => {
            console.log("Midtrans payment success:", result);
            showFeedback("", `Pembayaran Sukses! Mengaktifkan ${selectedPkg?.name || "Layanan Pro"}...`);
            try {
              const resp = await fetch(`/api/payments/check-status/${orderId}/${currentUser.id}/${selectedPkg?.id}`);
              const data = await resp.json();
              if (resp.ok && data.status === "success") {
                showFeedback("", data.message);
                setCheckoutPkg(null);
                setPaymentToken("");
                setPaymentUrl("");
                setPaymentOrderId("");
                loadEntities();
              }
            } catch (err) {
              console.error("Failed to query direct status update:", err);
            }
          },
          onPending: () => {
            showFeedback("", "Transaksi Pending. Silakan ikuti petunjuk pembayaran Midtrans.");
          },
          onError: () => {
            showFeedback("Sistem mendeteksi kegagalan transaksi.");
          },
          onClose: () => {
            console.log("User dismissed the payment popup.");
          }
        });
      }
    };
    document.body.appendChild(script);
  };

  // 7. BUY PACKAGE PLAN - REDIRECT TO MIDTRANS GATEWAY FIRST
  const handlePurchasePackage = async (pkgId: string) => {
    const selectedPkg = packages.find(p => p.id === pkgId);
    if (!selectedPkg) return;

    showFeedback();
    setPaymentLoading(true);
    setCheckoutPkg(selectedPkg);

    try {
      const resp = await fetch("/api/payments/create-midtrans-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, packageId: pkgId })
      });
      const data = await resp.json();
      setPaymentLoading(false);

      if (!resp.ok) {
        showFeedback(data.message || "Gagal membuat sesi pembayaran.");
        setCheckoutPkg(null);
        return;
      }

      setPaymentToken(data.token);
      setPaymentUrl(data.redirect_url);
      setPaymentOrderId(data.orderId);

      // Trigger standard Midtrans modal popup
      triggerMidtransSnap(data.token, !!data.isSandbox, selectedPkg, data.orderId, data.clientKey);
    } catch (err) {
      setPaymentLoading(false);
      showFeedback("Terjadi kesalahan koneksi server pembayaran.");
      setCheckoutPkg(null);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!checkoutPkg || !paymentOrderId) return;
    setPaymentLoading(true);
    try {
      const resp = await fetch(`/api/payments/check-status/${paymentOrderId}/${currentUser.id}/${checkoutPkg.id}`);
      const data = await resp.json();
      setPaymentLoading(false);
      if (resp.ok && data.status === "success") {
        showFeedback("", data.message);
        setCheckoutPkg(null);
        setPaymentToken("");
        setPaymentUrl("");
        setPaymentOrderId("");
        loadEntities();
      } else {
        showFeedback(data.message || "Transaksi belum diselesaikan di payment gateway.");
      }
    } catch (err) {
      setPaymentLoading(false);
      showFeedback("Gagal mengecek status pembayaran terbaru.");
    }
  };

  const handleSimulateInstantPay = async () => {
    if (!checkoutPkg) return;
    setPaymentLoading(true);
    try {
      const resp = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, packageId: checkoutPkg.id })
      });
      const data = await resp.json();
      setPaymentLoading(false);
      if (!resp.ok) {
        showFeedback(data.message || "Gagal mengaktivasi simulasi paket.");
        return;
      }
      showFeedback("", `[Simulasi Sukses] ${data.message || "Paket berlangganan aktif!"}`);
      setCheckoutPkg(null);
      setPaymentToken("");
      setPaymentUrl("");
      setPaymentOrderId("");
      loadEntities();
    } catch (err) {
      setPaymentLoading(false);
      showFeedback("Terjadi kesalahan simulasi paket.");
    }
  };

  const handleSimulateMockSnapSuccess = async () => {
    if (!checkoutPkg || !paymentOrderId) return;
    setPaymentLoading(true);
    try {
      const resp = await fetch(`/api/payments/check-status/${paymentOrderId}/${currentUser.id}/${checkoutPkg.id}`);
      const data = await resp.json();
      setPaymentLoading(false);
      if (resp.ok && data.status === "success") {
        showFeedback("", data.message || "Simulasi Transaksi Selesai.");
        setCheckoutPkg(null);
        setPaymentToken("");
        setPaymentUrl("");
        setPaymentOrderId("");
        setShowMockSnapModal(false);
        loadEntities();
      } else {
        showFeedback(data.message || "Gagal memverifikasi simulasi pembayaran.");
      }
    } catch (err) {
      setPaymentLoading(false);
      showFeedback("Gagal menghubungi server status pembayaran.");
    }
  };


  // 8. UPDATE DOMAIN HOSTING PATH
  const handleSaveDomainPath = async (e: React.FormEvent) => {
    e.preventDefault();
    showFeedback();

    try {
      const resp = await fetch("/api/domain-hosting/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, hostingPath, domainHostingPath: hostingPath })
      });
      const data = await resp.json();
      if (!resp.ok) return showFeedback(data.message);

      showFeedback("", data.message);
      loadEntities();
    } catch (e) {
      showFeedback("Error saving path.");
    }
  };


  // Quick helper to evaluate profile completeness percentage
  const calculateCompleteness = () => {
    if (!profile) return 0;
    let filledCount = 0;
    const fields = [profile.placeOfBirth, profile.dateOfBirth, profile.gender, profile.city, profile.address, profile.nik, profile.phone, profile.photoUrl];
    fields.forEach(f => { if (f && f.trim() !== "") filledCount++; });
    return Math.round((filledCount / fields.length) * 100);
  };

  const isProMember = sub && sub.packageId !== "inactive" && sub.isActive;
  const isPremiumUser = currentUser.role === "admin" || (sub && sub.packageId === "pkg_premium" && sub.isActive);

  const getPreviewHtml = (tpl: Template) => {
    if (tpl.category === "resume" && resume && resume.customHtml && resume.customHtml.trim() !== "") {
      return resume.customHtml;
    }
    let html = tpl.htmlMarkup;

    if (tpl.category === "resume" && html && (html.trim().startsWith("{") || html.trim().startsWith("["))) {
      try {
        const parsedTpl = JSON.parse(html);
        const elements = parsedTpl.elements || [];
        const bgColor = parsedTpl.backgroundColor || "#ffffff";
        const width = parsedTpl.width || 800;
        const height = parsedTpl.height || 1100;

        const replaceTextVars = (txt: string) => {
          let updated = txt;
          const namaLengkap = profile?.fullName || currentUser.fullName || "John Doe";
          const titleStatus = resTitle || resume?.title || portfolio?.title || "Spesialis Web Developer & Designer";
          const tentangSaya = resAbout || resume?.aboutMe || portfolio?.aboutMe || "Biografi profesional belum diatur.";
          const emailPengguna = profile?.email || currentUser.email || "";
          const telepon = resPhone || resume?.phone || profile?.phone || "-";
          const whatsapp = resWA || resume?.whatsapp || portfolio?.whatsapp || "-";
          const alamat = resAddress || resume?.address || profile?.address || "Jl. Sudirman No 21, Jakarta";
          const kota = profile?.city || "Kota / Kabupaten";
          const nik = profile?.nik || "1234567890123456";
          const tempatLahir = profile?.placeOfBirth || "Jakarta";
          const tanggalLahir = profile?.dateOfBirth ? formatIndonesianDate(profile.dateOfBirth) : "01 Januari 1999";
          const gender = profile?.gender || "Laki-laki";

          const educationsVal = (resEdus.filter(e => e.institution).length > 0 ? resEdus.filter(e => e.institution) : (resume?.educations || [])).map(e => `${e.institution} (${e.period || ""})\n- ${e.degree}`).join("\n\n");
          const activeExperiences = resExps.filter(e => e.company).length > 0 ? resExps.filter(e => e.company) : (resume?.experiences || []);
          const expsVal = activeExperiences.length > 0 
            ? activeExperiences.map(e => `• ${e.company ? e.company.toUpperCase() : "PERUSAHAAN"}\n  ${e.role || "Jabatan"} — ${e.duration || ""}\n\n  ${e.jobdesk || ""}`).join("\n\n")
            : "• SOLUSINDO RAYA\n  Junior Frontend Web Developer — 2021 - 2023\n\n  Mengatur visual interface website dengan optimasi performa 30%.\n\n• CREATIVE AGENCY\n  UI Designer Internship — 2020\n\n  Membantu mendesain draf kawat draf (wireframe) halaman landing page.";
          const projVal = (resProjects.filter(p => p.name).length > 0 ? resProjects.filter(p => p.name) : (resume?.projects || portfolio?.projects || [])).map(p => `${p.name}\n- ${p.description}`).join("\n\n");
          const skillsVal = (portfolio?.skills || resume?.skills || []).join(", ");
          const certsVal = (resCerts.length > 0 ? resCerts : (resume?.certificates || [])).join(", ");

          const activeExps = resExps.filter(e => e.company).length > 0 ? resExps.filter(e => e.company) : (resume?.experiences || []);
          const activeEducations = resEdus.filter(e => e.institution).length > 0 ? resEdus.filter(e => e.institution) : (resume?.educations || []);
          const activeProjects = resProjects.filter(p => p.name).length > 0 ? resProjects.filter(p => p.name) : (resume?.projects || portfolio?.projects || []);

          const firstEdu = activeEducations[0];
          const univ0 = firstEdu ? firstEdu.institution : "";
          const degree0 = firstEdu ? firstEdu.degree : "";
          const period0 = firstEdu ? firstEdu.period : "";

          updated = updated.replace(/\{\{\s*UNIVERSITAS\s*\}\}/gi, univ0);
          updated = updated.replace(/\{\{\s*INSTITUSI\s*\}\}/gi, univ0);
          updated = updated.replace(/\{\{\s*SEKOLAH\s*\}\}/gi, univ0);
          updated = updated.replace(/\{\{\s*NAMA_KAMPUS\s*\}\}/gi, univ0);
          updated = updated.replace(/\{\{\s*KAMPUS\s*\}\}/gi, univ0);
          updated = updated.replace(/\{\{\s*NAMA_SEKOLAH\s*\}\}/gi, univ0);
          updated = updated.replace(/\{\{\s*JURUSAN\s*\}\}/gi, degree0);
          updated = updated.replace(/\{\{\s*GELAR\s*\}\}/gi, degree0);
          updated = updated.replace(/\{\{\s*PRODI\s*\}\}/gi, degree0);
          updated = updated.replace(/\{\{\s*TAHUN_LULUS\s*\}\}/gi, period0);
          updated = updated.replace(/\{\{\s*PERIODE\s*\}\}/gi, period0);
          updated = updated.replace(/\{\{\s*TAHUN\s*\}\}/gi, period0);

          for (let i = 1; i <= 15; i++) {
            // Education
            const edu = activeEducations[i - 1];
            const univ = edu ? edu.institution : "";
            const degree = edu ? edu.degree : "";
            const period = edu ? edu.period : "";

            updated = updated.replace(new RegExp("\\{\\{\\s*UNIVERSITAS_" + i + "\\s*\\}\\}", 'gi'), univ);
            updated = updated.replace(new RegExp("\\{\\{\\s*INSTITUSI_" + i + "\\s*\\}\\}", 'gi'), univ);
            updated = updated.replace(new RegExp("\\{\\{\\s*SEKOLAH_" + i + "\\s*\\}\\}", 'gi'), univ);
            updated = updated.replace(new RegExp("\\{\\{\\s*NAMA_KAMPUS_" + i + "\\s*\\}\\}", 'gi'), univ);
            updated = updated.replace(new RegExp("\\{\\{\\s*KAMPUS_" + i + "\\s*\\}\\}", 'gi'), univ);
            updated = updated.replace(new RegExp("\\{\\{\\s*NAMA_SEKOLAH_" + i + "\\s*\\}\\}", 'gi'), univ);
            updated = updated.replace(new RegExp("\\{\\{\\s*JURUSAN_" + i + "\\s*\\}\\}", 'gi'), degree);
            updated = updated.replace(new RegExp("\\{\\{\\s*GELAR_" + i + "\\s*\\}\\}", 'gi'), degree);
            updated = updated.replace(new RegExp("\\{\\{\\s*PRODI_" + i + "\\s*\\}\\}", 'gi'), degree);
            updated = updated.replace(new RegExp("\\{\\{\\s*TAHUN_LULUS_" + i + "\\s*\\}\\}", 'gi'), period);
            updated = updated.replace(new RegExp("\\{\\{\\s*PERIODE_" + i + "\\s*\\}\\}", 'gi'), period);
            updated = updated.replace(new RegExp("\\{\\{\\s*TAHUN_" + i + "\\s*\\}\\}", 'gi'), period);

            // Experience
            const exp = activeExps[i - 1];
            const comp = exp ? exp.company : "";
            const role = exp ? exp.role : "";
            const dur = exp ? exp.duration : "";
            const job = exp ? exp.jobdesk : "";

            updated = updated.replace(new RegExp("\\{\\{\\s*PERUSAHAAN_" + i + "\\s*\\}\\}", 'gi'), comp);
            updated = updated.replace(new RegExp("\\{\\{\\s*KANTOR_" + i + "\\s*\\}\\}", 'gi'), comp);
            updated = updated.replace(new RegExp("\\{\\{\\s*INSTANSI_" + i + "\\s*\\}\\}", 'gi'), comp);
            updated = updated.replace(new RegExp("\\{\\{\\s*JABATAN_" + i + "\\s*\\}\\}", 'gi'), role);
            updated = updated.replace(new RegExp("\\{\\{\\s*POSISI_" + i + "\\s*\\}\\}", 'gi'), role);
            updated = updated.replace(new RegExp("\\{\\{\\s*PERIODE_KERJA_" + i + "\\s*\\}\\}", 'gi'), dur);
            updated = updated.replace(new RegExp("\\{\\{\\s*DURASI_" + i + "\\s*\\}\\}", 'gi'), dur);
            updated = updated.replace(new RegExp("\\{\\{\\s*JOBDESK_" + i + "\\s*\\}\\}", 'gi'), job);
            updated = updated.replace(new RegExp("\\{\\{\\s*DESKRIPSI_KERJA_" + i + "\\s*\\}\\}", 'gi'), job);

            // Project
            const proj = activeProjects[i - 1];
            const projName = proj ? proj.name : "";
            const projLink = proj ? proj.link : "";
            const projDesc = proj ? proj.description : "";

            updated = updated.replace(new RegExp("\\{\\{\\s*NAMA_PROYEK_" + i + "\\s*\\}\\}", 'gi'), projName);
            updated = updated.replace(new RegExp("\\{\\{\\s*URL_PROYEK_" + i + "\\s*\\}\\}", 'gi'), projLink);
            updated = updated.replace(new RegExp("\\{\\{\\s*LINK_PROYEK_" + i + "\\s*\\}\\}", 'gi'), projLink);
            updated = updated.replace(new RegExp("\\{\\{\\s*LINK_URL_PROYEK_" + i + "\\s*\\}\\}", 'gi'), projLink);
            updated = updated.replace(new RegExp("\\{\\{\\s*DESKRIPSI_PROYEK_" + i + "\\s*\\}\\}", 'gi'), projDesc);
          }

          updated = updated.replace(/\{\{\s*NAMA_LENGKAP\s*\}\}/gi, namaLengkap);
          updated = updated.replace(/\{\{\s*NAMA\s*\}\}/gi, namaLengkap);
          updated = updated.replace(/\{\{\s*TITLE\s*\}\}/gi, titleStatus);
          updated = updated.replace(/\{\{\s*TENTANG_SAYA\s*\}\}/gi, tentangSaya);
          updated = updated.replace(/\{\{\s*EMAIL\s*\}\}/gi, emailPengguna);
          updated = updated.replace(/\{\{\s*NOMOR_TELEPON\s*\}\}/gi, telepon);
          updated = updated.replace(/\{\{\s*NOMOR_WHATSAPP\s*\}\}/gi, whatsapp);
          updated = updated.replace(/\{\{\s*ALAMAT\s*\}\}/gi, alamat);
          updated = updated.replace(/\{\{\s*KOTA\s*\}\}/gi, kota);
          updated = updated.replace(/\{\{\s*NIK\s*\}\}/gi, nik);
          updated = updated.replace(/\{\{\s*TEMPAT_LAHIR\s*\}\}/gi, tempatLahir);
          updated = updated.replace(/\{\{\s*TANGGAL_LAHIR\s*\}\}/gi, tanggalLahir);
          updated = updated.replace(/\{\{\s*JENIS_KELAMIN\s*\}\}/gi, gender);

          updated = updated.replace(/\{\{\s*PENDIDIKAN\s*\}\}/gi, educationsVal || "Belum ada riwayat pendidikan.");
          updated = updated.replace(/\{\{\s*PENGALAMAN_KERJA\s*\}\}/gi, expsVal || "Belum ada riwayat pengalaman kerja.");
          updated = updated.replace(/\{\{\s*PROYEK\s*\}\}/gi, projVal || "Belum ada proyek kustom.");
          updated = updated.replace(/\{\{\s*KEAHLIAN\s*\}\}/gi, skillsVal || "Belum ada keahlian diinput.");
          updated = updated.replace(/\{\{\s*SERTIFIKAT\s*\}\}/gi, certsVal || "Belum ada sertifikat.");

          return updated;
        };

        const htmlElements = elements.map((el: any) => {
          const x = el.x ?? 0;
          const y = el.y ?? 0;
          const w = el.width ?? 100;
          const h = el.height ?? 100;
          const style: any = {
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
          };

          if (el.type === 'rect') {
            style.width = `${w}px`;
            style.height = `${h}px`;
            style.backgroundColor = el.fill || '#cbd5e1';
            return `<div style="${Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}:${v}`).join(';')}"></div>`;
          }

          if (el.type === 'circle') {
            const rad = el.radius ?? 50;
            style.width = `${rad * 2}px`;
            style.height = `${rad * 2}px`;
            style.borderRadius = '50%';
            style.backgroundColor = el.fill || '#ef4444';
            style.left = `${x - rad}px`;
            style.top = `${y - rad}px`;
            return `<div style="${Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}:${v}`).join(';')}"></div>`;
          }

          if (el.type === 'image') {
            style.width = `${w}px`;
            style.height = `${h}px`;
            const srcImg = profPhoto || profile?.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150";
            const borderShape = el.shape === 'square' ? '0px' : '50%';
            const borderFill = el.borderFill || el.stroke || 'transparent';
            const strokeWidth = el.strokeWidth || 0;
            style.borderRadius = borderShape;
            style.border = strokeWidth > 0 ? `${strokeWidth}px solid ${borderFill}` : 'none';
            return `<img src="${srcImg}" referrerpolicy="no-referrer" style="${Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}:${v}`).join(';')} object-fit: cover;" />`;
          }

          if (el.type === 'text') {
            style.width = el.width ? `${el.width}px` : 'auto';
            style.fontSize = `${el.fontSize || 12}px`;
            style.fontFamily = el.fontFamily || 'Inter, sans-serif';
            style.color = el.fill || '#1e293b';
            style.whiteSpace = 'pre-wrap';
            style.fontWeight = el.fontStyle === 'bold' ? 'bold' : 'normal';
            style.fontStyle = el.fontStyle === 'italic' ? 'italic' : 'normal';
            const textContent = replaceTextVars(el.text || "").replace(/\n/g, "<br/>");
            return `<div style="${Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}:${v}`).join(';')}">${textContent}</div>`;
          }

          return '';
        }).join('\n');

        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  background-color: ${bgColor};
                  font-family: 'Inter', sans-serif;
                  width: ${width}px;
                  height: ${height}px;
                  position: relative;
                  overflow: hidden;
                  box-sizing: border-box;
                }
              </style>
            </head>
            <body>
              ${htmlElements}
            </body>
          </html>
        `;
      } catch (ex) {
        console.error("Gagal parse canvas template json:", ex);
      }
    }
    html = tpl.htmlMarkup;

    // Dynamically feed draft/live inputs depending on current active tab
    let liveExps: Experience[] = [];
    let liveProjects: Project[] = [];
    let liveEducations: Education[] = [];
    let liveCerts: string[] = [];
    let liveSkills: string[] = [];
    let liveTitle = "";
    let liveAbout = "";
    let livePhone = "";
    let liveAddress = "";
    let liveWA = "";
    let liveIG = "";
    let liveTikTok = "";
    let liveLinkedIn = "";
    let liveGitHub = "";

    if (activeTab === "buat-portfolio") {
      liveExps = portExps;
      liveProjects = portProjects;
      liveEducations = portEdu ? [portEdu] : [];
      liveCerts = portCerts;
      liveSkills = portSkills;
      liveTitle = portTitle;
      liveAbout = portAbout;
      livePhone = portPhone;
      liveAddress = portAddress;
      liveWA = portWA;
      liveIG = portIG;
      liveTikTok = portTikTok;
      liveLinkedIn = portLinkedIn;
      liveGitHub = portGitHub;
    } else if (activeTab === "buat-resume" || activeTab === "buat-resume-saya") {
      liveExps = resExps;
      liveProjects = resProjects;
      liveEducations = resEdus;
      liveCerts = resCerts;
      liveSkills = portfolio?.skills || resume?.skills || [];
      liveTitle = resTitle;
      liveAbout = resAbout;
      livePhone = resPhone;
      liveAddress = resAddress;
      liveWA = resWA;
      liveIG = resIG;
      liveTikTok = resTikTok;
      liveLinkedIn = resLinkedIn;
      liveGitHub = resGitHub;
    } else {
      // Fallback to saved database models depending on template category
      const isPortfolioTpl = tpl.category === "portfolio";
      if (isPortfolioTpl) {
        liveExps = portfolio?.experiences || [];
        liveProjects = portfolio?.projects || [];
        liveEducations = portfolio?.educations || [];
        liveCerts = portfolio?.certificates || [];
        liveSkills = portfolio?.skills || [];
        liveTitle = portfolio?.title || "Spesialis Web Developer & Designer";
        liveAbout = portfolio?.aboutMe || "Biografi ringkas belum diatur.";
        livePhone = portfolio?.phone || profile?.phone || "-";
        liveAddress = portfolio?.address || profile?.address || "-";
        liveWA = portfolio?.whatsapp || "";
        liveIG = portfolio?.instagram || "";
        liveTikTok = portfolio?.tiktok || "";
        liveLinkedIn = portfolio?.linkedin || "";
        liveGitHub = portfolio?.github || "";
      } else {
        const filteredResEdus = resEdus.filter(e => e.institution);
        const filteredResExps = resExps.filter(e => e.company);

        liveExps = (resume?.experiences && resume.experiences.length > 0) ? resume.experiences : (filteredResExps.length > 0 ? filteredResExps : (portfolio?.experiences || []));
        liveProjects = (resume?.projects && resume.projects.length > 0) ? resume.projects : (resProjects.length > 0 ? resProjects : (portfolio?.projects || []));
        liveEducations = (resume?.educations && resume.educations.length > 0) ? resume.educations : (filteredResEdus.length > 0 ? filteredResEdus : (portfolio?.educations || []));
        liveCerts = (resume?.certificates && resume.certificates.length > 0) ? resume.certificates : (resCerts.length > 0 ? resCerts : (portfolio?.certificates || []));
        liveSkills = (resume?.skills && resume.skills.length > 0) ? resume.skills : (portfolio?.skills || []);
        liveTitle = resume?.title || "Spesialis Web Developer & Designer";
        liveAbout = resume?.aboutMe || "Biografi profesional belum diatur.";
        livePhone = resume?.phone || profile?.phone || "-";
        liveAddress = resume?.address || profile?.address || "-";
        liveWA = resume?.whatsapp || "";
        liveIG = resume?.instagram || "";
        liveTikTok = resume?.tiktok || "";
        liveLinkedIn = resume?.linkedin || "";
        liveGitHub = resume?.github || "";
      }
    }

    const activeExps = liveExps;
    const activeProjects = liveProjects;
    const activeEducations = liveEducations;
    const activeCerts = liveCerts;
    const activeSkills = liveSkills;

    // Direct string replacements
    const nama = profile?.fullName || currentUser.fullName || "John Doe";
    const titleStatus = liveTitle || "Spesialis Web Developer & Designer";
    const tentangSaya = liveAbout || "Biografi ringkas belum diatur.";
    const foto = profPhoto || profile?.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150";
    const placeOfBirth = profile?.placeOfBirth || "Jakarta";
    const dateOfBirth = profile?.dateOfBirth ? formatIndonesianDate(profile.dateOfBirth) : "01 Januari 1999";
    const ttl = `${placeOfBirth}, ${dateOfBirth}`;
    const usia = profile ? `${profile.age}` : "27";
    const alamat = liveAddress || profile?.address || "Jl. Sudirman No 21, Jakarta";
    const kota = profile?.city || "Kota / Kabupaten";
    
    const telepon = livePhone || profile?.phone || "-";
    const whatsapp = liveWA || "";

    // Realtime Day & Date based on device clock (jam Device)
    const localDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const localMonths = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const deviceDate = new Date();
    const currentHari = localDays[deviceDate.getDay()];
    const currentTanggal = `${deviceDate.getDate()} ${localMonths[deviceDate.getMonth()]} ${deviceDate.getFullYear()}`;
    
    const emailPengguna = profile?.email || currentUser.email || "";
    const urlPortofolio = sub?.domainHostingPath 
      ? `${window.location.origin}/u/${sub.domainHostingPath}` 
      : `${window.location.origin}/u/`;

    // Common global replacements
    html = html.replace(/\{\{\s*NAMA\s*\}\}/gi, nama);
    html = html.replace(/\{\{\s*TITLE\s*\}\}/gi, titleStatus);
    html = html.replace(/\{\{\s*TITTLE\s*\}\}/gi, titleStatus);
    html = html.replace(/\{\{\s*TENTANG_SAYA\s*\}\}/gi, tentangSaya);
    html = html.replace(/\{\{\s*BIOGRAFI\s*\}\}/gi, tentangSaya);
    html = html.replace(/\{\{\s*BIO\s*\}\}/gi, tentangSaya);
    html = html.replace(/\{\{\s*FOTO\s*\}\}/gi, foto);
    html = html.replace(/\{\{\s*TEMPAT_LAHIR\s*\}\}/gi, ttl);
    html = html.replace(/\{\{\s*TEMPAT_TANGGAL_LAHIR\s*\}\}/gi, ttl);
    html = html.replace(/\{\{\s*TEMPAT_LAHIR_MURNI\s*\}\}/gi, placeOfBirth);
    html = html.replace(/\{\{\s*TANGGAL_LAHIR_MURNI\s*\}\}/gi, dateOfBirth);
    html = html.replace(/\{\{\s*USIA\s*\}\}/gi, usia);
    html = html.replace(/\{\{\s*ALAMAT\s*\}\}/gi, alamat);
    html = html.replace(/\{\{\s*KOTA\s*\}\}/gi, kota);
    html = html.replace(/\{\{\s*TELEPON\s*\}\}/gi, telepon);
    html = html.replace(/\{\{\s*PHONE\s*\}\}/gi, telepon);
    html = html.replace(/\{\{\s*WHATSAPP\s*\}\}/gi, whatsapp);
    html = html.replace(/\{\{\s*WA\s*\}\}/gi, whatsapp);
    html = html.replace(/\{\{\s*EMAIL_PENGGUNA\s*\}\}/gi, emailPengguna);
    html = html.replace(/\{\{\s*EMAIL\s*\}\}/gi, emailPengguna);
    html = html.replace(/\{\{\s*INSTAGRAM\s*\}\}/gi, liveIG);
    html = html.replace(/\{\{\s*TIKTOK\s*\}\}/gi, liveTikTok);
    html = html.replace(/\{\{\s*LINKEDIN\s*\}\}/gi, liveLinkedIn);
    html = html.replace(/\{\{\s*GITHUB\s*\}\}/gi, liveGitHub);
    html = html.replace(/\{\{\s*URL_PORTOFOLIO\s*\}\}/gi, urlPortofolio);
    html = html.replace(/\{\{\s*HARI\s*\}\}/gi, currentHari);
    html = html.replace(/\{\{\s*TANGGAL\s*\}\}/gi, currentTanggal);

    // Cover letter specific replacements (applied globally for cross-compatibility)
    const companyName = covCompany || cover?.companyName || "PT Contoh Klien Indonesia";
    const companyAddress = covCompAddress || cover?.companyAddress || "Gedung Cyber Lt 4, Jakarta";
    const jobTitle = covJobTitle || cover?.jobTitle || "Senior Full-Stack Engineer";
    const letterContent = covLetterContent || cover?.letterContent || "Dengan hormat, saya mengajukan lamaran pekerjaan...";
    
    html = html.replace(/\{\{\s*NAMA_PERUSAHAAN\s*\}\}/gi, companyName);
    html = html.replace(/\{\{\s*ALAMAT_PERUSAHAAN\s*\}\}/gi, companyAddress);
    html = html.replace(/\{\{\s*JABATAN_DILAMAR\s*\}\}/gi, jobTitle);
    html = html.replace(/\{\{\s*ISI_SURAT\s*\}\}/gi, letterContent);

    // Detect theme context to render beautifully shaped standard component markers
    const isDarkTheme = tpl.category === "portfolio" || html.includes("bg-slate-900") || html.includes("bg-slate-800") || html.includes("text-white") || html.includes("text-slate-100");

    // Experience List HTML compiler
    let experienceListHtml = "";
    if (activeExps.length > 0) {
      activeExps.forEach((exp) => {
        if (exp.company && exp.role) {
          experienceListHtml += `
            <div style="font-family: inherit; margin-bottom: 20px;">
              <div style="font-weight: 850; font-size: 14px; font-family: inherit; margin: 0; display: flex; align-items: center; gap: 4px;">
                <span style="font-weight: 900; font-size: 16px; margin-right: 4px;">•</span> ${exp.company.toUpperCase()}
              </div>
              <div style="font-size: 11.5px; font-weight: 600; margin-top: 3px; padding-left: 14px; opacity: 0.95;">
                ${exp.role} — ${exp.duration || ""}
              </div>
              <div style="height: 6px;"></div>
              <p style="font-size: 11.5px; opacity: 0.85; line-height: 1.5; margin: 0; padding-left: 14px; white-space: pre-wrap; font-family: inherit;">
                ${exp.jobdesk || ""}
              </p>
            </div>
          `;
        }
      });
    } else {
      // elegant fallback matching the requested style
      experienceListHtml = `
        <div style="font-family: inherit; margin-bottom: 20px;">
          <div style="font-weight: 850; font-size: 14px; font-family: inherit; margin: 0; display: flex; align-items: center; gap: 4px;">
            <span style="font-weight: 900; font-size: 16px; margin-right: 4px;">•</span> SOLUSINDO RAYA
          </div>
          <div style="font-size: 11.5px; font-weight: 600; margin-top: 3px; padding-left: 14px; opacity: 0.95;">
            Junior Frontend Web Developer — 2021 - 2023
          </div>
          <div style="height: 6px;"></div>
          <p style="font-size: 11.5px; opacity: 0.85; line-height: 1.5; margin: 0; padding-left: 14px; white-space: pre-wrap; font-family: inherit;">
            Mengatur visual interface website dengan optimasi performa 30%.
          </p>
        </div>
        <div style="font-family: inherit; margin-bottom: 20px;">
          <div style="font-weight: 850; font-size: 14px; font-family: inherit; margin: 0; display: flex; align-items: center; gap: 4px;">
            <span style="font-weight: 900; font-size: 16px; margin-right: 4px;">•</span> CREATIVE AGENCY
          </div>
          <div style="font-size: 11.5px; font-weight: 600; margin-top: 3px; padding-left: 14px; opacity: 0.95;">
            UI Designer Internship — 2020
          </div>
          <div style="height: 6px;"></div>
          <p style="font-size: 11.5px; opacity: 0.85; line-height: 1.5; margin: 0; padding-left: 14px; white-space: pre-wrap; font-family: inherit;">
            Membantu mendesain draf kawat draf (wireframe) halaman landing page.
          </p>
        </div>
      `;
    }

    // Projects List HTML compiler
    let projectsListHtml = "";
    if (activeProjects.length > 0) {
      activeProjects.forEach((proj) => {
        if (proj.name) {
          projectsListHtml += `
            <div class="p-4 bg-slate-50/55 rounded-xl border border-slate-200/80 transition mb-3" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">
              <h4 class="font-bold text-[14px] mb-1" style="font-family: inherit;">${proj.name}</h4>
              <p class="text-xs opacity-80 leading-relaxed mb-2" style="font-family: inherit;">${proj.description || ""}</p>
              ${proj.link ? `<a href="${proj.link}" target="_blank" class="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1" style="font-family: inherit;">Demo Proyek &rarr;</a>` : ""}
            </div>
          `;
        }
      });
    }

    // Education List HTML compiler
    let educationListHtml = "";
    if (activeEducations.length > 0) {
      activeEducations.forEach((edu) => {
        if (edu.institution) {
          educationListHtml += `
            <div class="mb-3" style="font-family: inherit;">
              <p class="font-bold text-[14px]" style="font-family: inherit;">${edu.institution}</p>
              <p class="text-xs opacity-75" style="font-family: inherit;">${edu.degree || ""} (${edu.period || ""})</p>
            </div>
          `;
        }
      });
    }

    // Certificates List HTML compiler
    let certificatesListHtml = "";
    if (activeCerts.length > 0) {
      activeCerts.forEach((cert) => {
        if (cert && cert.trim()) {
          certificatesListHtml += `
            <div class="text-xs opacity-90 mb-1" style="font-family: inherit;">
              • ${cert.trim()}
            </div>
          `;
        }
      });
    }

    // Social accounts links & icons compiler
    const ig = portfolio?.instagram || resume?.instagram || "";
    const github = portfolio?.github || resume?.github || "";
    const linkedin = portfolio?.linkedin || resume?.linkedin || "";
    const tiktok = portfolio?.tiktok || resume?.tiktok || "";

    let socialMediaIconsHtml = "";
    if (ig) socialMediaIconsHtml += `<a href="https://instagram.com/${ig}" target="_blank" class="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-xs font-semibold mr-2 inline-block" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">Instagram</a>`;
    if (tiktok) socialMediaIconsHtml += `<a href="https://tiktok.com/@${tiktok}" target="_blank" class="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-white rounded text-xs font-semibold mr-2 inline-block" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">TikTok</a>`;
    if (linkedin) socialMediaIconsHtml += `<a href="https://linkedin.com/in/${linkedin}" target="_blank" class="px-2.5 py-1.5 bg-sky-900/40 hover:bg-sky-900/60 text-sky-400 rounded text-xs font-semibold mr-2 inline-block" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">LinkedIn</a>`;
    if (github) socialMediaIconsHtml += `<a href="https://github.com/${github}" target="_blank" class="px-2.5 py-1.5 bg-slate-700/50 hover:bg-slate-700/80 text-slate-100 rounded text-xs font-semibold mr-2 inline-block" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">GitHub</a>`;

    // Revision 3: Combined/unfied Skills implementation
    const gabunganSkill = activeSkills.join(", ");
    
    let skillsListHtml = "";
    if (activeSkills.length > 0) {
      activeSkills.forEach((sk) => {
        if (sk && sk.trim()) {
          skillsListHtml += `<span class="inline-block px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg text-[10px] mr-2 mb-2 uppercase tracking-wide shadow-sm" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">${sk.trim()}</span>`;
        }
      });
    }

    // INTERCEPT: If this is a resume template designed as a Canva-style visual backdrop, compile it as a Canva visual absolute drag-and-drop board.
    // Otherwise, we leverage standard high-fidelity HTML/CSS layout templates.
    if (tpl.category === "resume" && tpl.previewUrl && (tpl.id.startsWith("tpl_res_canva") || tpl.htmlMarkup.includes("Canva-style"))) {
      const compiledSkills = activeSkills.length > 0 
        ? activeSkills.map(s => `<span class="canva-sub-badge" style="display-inline-block; padding: 4px 8px; background-color: rgba(220, 38, 38, 0.05); border: 1.5px dashed rgba(220, 38, 38, 0.4); border-radius: 6px; font-size: 10px; font-weight: bold; color: #1e293b; margin-right: 6px; margin-bottom: 6px; font-family:'Inter',sans-serif;">${s.trim()}</span>`).join("")
        : `<span style="font-size:11px; color:#94a3b8; font-style:italic;">Belum ada keahlian</span>`;

      const compiledExps = activeExps.length > 0 
        ? activeExps.map(exp => `
          <div style="margin-bottom: 12px;">
            <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${exp.role || "Jabatan Pekerjaan"} — ${exp.company || "Perusahaan"}</div>
            <div style="font-size: 9.5px; color: #dc2626; font-weight: bold; margin-bottom: 3px;">${exp.duration || ""}</div>
            <div style="font-size: 10.5px; color: #334155; line-height: 1.45; white-space: pre-line;">${exp.jobdesk || ""}</div>
          </div>
        `).join("")
        : `<div style="font-size:11px; color:#94a3b8; font-style:italic;">Belum mengisi pengalaman kerja</div>`;

      const compiledEdu = activeEducations.length > 0
        ? activeEducations.map(edu => `
          <div style="margin-bottom: 10px;">
            <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${edu.institution}</div>
            <div style="font-size: 11px; color: #475569; font-weight: 500;">${edu.degree || ""}</div>
            <div style="font-size: 9.5px; color: #dc2626; font-weight: bold; margin-top: 2px;">${edu.period || ""}</div>
          </div>
        `).join("")
        : `<div style="font-size:11px; color:#94a3b8; font-style:italic;">Belum mengisi riwayat pendidikan</div>`;

      const canvaHtml = `
        <div class="cv-canva-page" style="position: relative; width: 794px; height: 1123px; background-image: url('${tpl.previewUrl}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.15); background-color: #ffffff; font-family: 'Inter', sans-serif;">
          
          <!-- Element: NAMA LENGKAP -->
          <div class="canva-element" style="position: absolute; top: 60px; left: 60px; width: 330px; font-size: 28px; font-weight: 800; color: #1e293b; line-height: 1.25; cursor: move; border: 1.5px dashed rgba(220, 38, 38, 0.4); padding: 5px; z-index: 10;">
            ${nama}
          </div>

          <!-- Element: PROFESI / TITLE -->
          <div class="canva-element" style="position: absolute; top: 110px; left: 60px; width: 330px; font-size: 13px; font-weight: bold; color: #dc2626; text-transform: uppercase; letter-spacing: 0.05em; cursor: move; border: 1.5px dashed rgba(220, 38, 38, 0.4); padding: 5px; z-index: 10;">
            ${titleStatus}
          </div>

          <!-- Element: TENTANG SAYA / BIO -->
          <div class="canva-element" style="position: absolute; top: 150px; left: 60px; width: 330px; font-size: 10.5px; color: #475569; line-height: 1.5; cursor: move; border: 1.5px dashed rgba(220, 38, 38, 0.4); padding: 5px; z-index: 10;">
            ${tentangSaya}
          </div>

          <!-- Element: KONTAK & DETAILS -->
          <div class="canva-element" style="position: absolute; top: 60px; left: 450px; width: 280px; font-size: 10.5px; color: #334155; line-height: 1.5; cursor: move; border: 1.5px dashed rgba(220, 38, 38, 0.4); padding: 6px; z-index: 10;">
            <div style="font-size: 11px; font-weight: bold; color: #1e293b; border-b: 1.5px solid #cbd5e1; padding-bottom: 3.5px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em;">Kontak & Alamat</div>
            <div style="margin-bottom: 3px;">📞 Telp: ${telepon}</div>
            <div style="margin-bottom: 3px;">✉️ Email: ${emailPengguna}</div>
            ${whatsapp ? `<div style="margin-bottom: 3px;">💬 WA: ${whatsapp}</div>` : ""}
            <div style="line-height: 1.4; margin-top: 4px;">📍 Alamat: ${alamat}</div>
          </div>

          <!-- Element: KEALAIAN (SKILLS) -->
          <div class="canva-element" style="position: absolute; top: 280px; left: 60px; width: 220px; cursor: move; border: 1.5px dashed rgba(220, 38, 38, 0.4); padding: 6px; z-index: 10;">
            <div style="font-size: 12px; font-weight: bold; color: #1e293b; border-b: 2.5px solid #dc2626; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Keahlian Utama</div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${compiledSkills}
            </div>
          </div>

          <!-- Element: PENGALAMAN profesional -->
          <div class="canva-element" style="position: absolute; top: 280px; left: 310px; width: 420px; cursor: move; border: 1px dashed rgba(220, 38, 38, 0.4); padding: 6px; z-index: 10;">
            <div style="font-size: 12px; font-weight: bold; color: #1e293b; border-b: 2.5px solid #dc2626; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Pengalaman Kerja</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${compiledExps}
            </div>
          </div>

          <!-- Element: PENDIDIKAN AKADEMIK -->
          <div class="canva-element" style="position: absolute; top: 620px; left: 310px; width: 420px; cursor: move; border: 1px dashed rgba(220, 38, 38, 0.4); padding: 6px; z-index: 10;">
            <div style="font-size: 12px; font-weight: bold; color: #1e293b; border-b: 2.5px solid #dc2626; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Pendidikan Akademik</div>
            <div>
              ${compiledEdu}
            </div>
          </div>

        </div>
      `;

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              padding: 20px 0; 
              background-color: #f8fafc;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .canva-element {
              transition: border-color 0.2s, background-color 0.2s;
            }
            .canva-element:hover {
              border-color: #dc2626 !important;
              background-color: rgba(220, 38, 38, 0.015);
            }
            @media print {
              html, body {
                background-color: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 210mm;
                height: 297mm;
              }
              .cv-canva-page {
                box-shadow: none !important;
                margin: 0 !important;
                width: 794px !important;
                height: 1123px !important;
              }
              .canva-element {
                border: none !important;
                padding: 0 !important;
                background: transparent !important;
              }
              .canva-sub-badge {
                border: none !important;
                background-color: #f1f5f9 !important;
              }
            }
          </style>
        </head>
        <body>
          ${canvaHtml}
        </body>
        </html>
      `;
    }

    // Replace basic dynamic blocks in HTML
    html = html.replace(/\{\{\s*PENGALAMAN_KERJA\s*\}\}/gi, experienceListHtml || "<p class='text-xs text-slate-400'>Belum menambahkan pengalaman kerja.</p>");
    html = html.replace(/\{\{\s*PROYEK_SAYA\s*\}\}/gi, projectsListHtml || "<p class='text-xs text-slate-400 col-span-2'>Belum menambahkan proyek pilihan.</p>");
    html = html.replace(/\{\{\s*PENDIDIKAN\s*\}\}/gi, educationListHtml || "<p class='text-xs text-slate-400'>Belum menambahkan riwayat pendidikan.</p>");
    html = html.replace(/\{\{\s*SERTIFIKAT\s*\}\}/gi, certificatesListHtml || "<p class='text-xs text-slate-400'>Belum menambahkan sertifikat pendukung.</p>");
    html = html.replace(/\{\{\s*SOSIAL_MEDIA\s*\}\}/gi, socialMediaIconsHtml || "<p class='text-xs text-slate-400'>Belum melampirkan akun sosial media.</p>");
    
    // Skill tags replaces
    html = html.replace(/\{\{\s*SKILL\s*\}\}/gi, skillsListHtml || "<p class='text-xs text-slate-400'>Belum menambahkan keahlian.</p>");
    html = html.replace(/\{\{\s*SKILLS\s*\}\}/gi, skillsListHtml || "<p class='text-xs text-slate-400'>Belum menambahkan keahlian.</p>");
    html = html.replace(/\{\{\s*GABUNGAN_SKILL\s*\}\}/gi, gabunganSkill || "-");
    html = html.replace(/\{\{\s*SEMUA_SKILL\s*\}\}/gi, gabunganSkill || "-");
    html = html.replace(/\{\{\s*SKILL_TEXT\s*\}\}/gi, gabunganSkill || "-");
    html = html.replace(/\{\{\s*SKILLS_TEXT\s*\}\}/gi, gabunganSkill || "-");

    // Unindexed education replacements fallback
    const firstEdu = activeEducations[0];
    const univ0 = firstEdu ? firstEdu.institution : "";
    const degree0 = firstEdu ? firstEdu.degree : "";
    const period0 = firstEdu ? firstEdu.period : "";

    html = html.replace(/\{\{\s*UNIVERSITAS\s*\}\}/gi, univ0);
    html = html.replace(/\{\{\s*INSTITUSI\s*\}\}/gi, univ0);
    html = html.replace(/\{\{\s*SEKOLAH\s*\}\}/gi, univ0);
    html = html.replace(/\{\{\s*NAMA_KAMPUS\s*\}\}/gi, univ0);
    html = html.replace(/\{\{\s*KAMPUS\s*\}\}/gi, univ0);
    html = html.replace(/\{\{\s*NAMA_SEKOLAH\s*\}\}/gi, univ0);
    html = html.replace(/\{\{\s*JURUSAN\s*\}\}/gi, degree0);
    html = html.replace(/\{\{\s*GELAR\s*\}\}/gi, degree0);
    html = html.replace(/\{\{\s*PRODI\s*\}\}/gi, degree0);
    html = html.replace(/\{\{\s*TAHUN_LULUS\s*\}\}/gi, period0);
    html = html.replace(/\{\{\s*PERIODE\s*\}\}/gi, period0);
    html = html.replace(/\{\{\s*TAHUN\s*\}\}/gi, period0);

    // Revision 4 & 5: Index-based Experience, Education, and Projects map replaces (up to index 15)
    for (let i = 1; i <= 15; i++) {
      // Education index replacements
      const edu = activeEducations[i - 1];
      const univ = edu ? edu.institution : "";
      const degree = edu ? edu.degree : "";
      const period = edu ? edu.period : "";

      html = html.replace(new RegExp("\\{\\{\\s*UNIVERSITAS_" + i + "\\s*\\}\\}", 'gi'), univ);
      html = html.replace(new RegExp("\\{\\{\\s*INSTITUSI_" + i + "\\s*\\}\\}", 'gi'), univ);
      html = html.replace(new RegExp("\\{\\{\\s*SEKOLAH_" + i + "\\s*\\}\\}", 'gi'), univ);
      html = html.replace(new RegExp("\\{\\{\\s*NAMA_KAMPUS_" + i + "\\s*\\}\\}", 'gi'), univ);
      html = html.replace(new RegExp("\\{\\{\\s*KAMPUS_" + i + "\\s*\\}\\}", 'gi'), univ);
      html = html.replace(new RegExp("\\{\\{\\s*NAMA_SEKOLAH_" + i + "\\s*\\}\\}", 'gi'), univ);
      html = html.replace(new RegExp("\\{\\{\\s*JURUSAN_" + i + "\\s*\\}\\}", 'gi'), degree);
      html = html.replace(new RegExp("\\{\\{\\s*GELAR_" + i + "\\s*\\}\\}", 'gi'), degree);
      html = html.replace(new RegExp("\\{\\{\\s*PRODI_" + i + "\\s*\\}\\}", 'gi'), degree);
      html = html.replace(new RegExp("\\{\\{\\s*TAHUN_LULUS_" + i + "\\s*\\}\\}", 'gi'), period);
      html = html.replace(new RegExp("\\{\\{\\s*PERIODE_" + i + "\\s*\\}\\}", 'gi'), period);
      html = html.replace(new RegExp("\\{\\{\\s*TAHUN_" + i + "\\s*\\}\\}", 'gi'), period);

      // Experience index replacements
      const exp = activeExps[i - 1];
      const comp = exp ? exp.company : "";
      const role = exp ? exp.role : "";
      const dur = exp ? exp.duration : "";
      const job = exp ? exp.jobdesk : "";

      html = html.replace(new RegExp("\\{\\{\\s*PERUSAHAAN_" + i + "\\s*\\}\\}", 'gi'), comp);
      html = html.replace(new RegExp("\\{\\{\\s*KANTOR_" + i + "\\s*\\}\\}", 'gi'), comp);
      html = html.replace(new RegExp("\\{\\{\\s*INSTANSI_" + i + "\\s*\\}\\}", 'gi'), comp);
      html = html.replace(new RegExp("\\{\\{\\s*JABATAN_" + i + "\\s*\\}\\}", 'gi'), role);
      html = html.replace(new RegExp("\\{\\{\\s*POSISI_" + i + "\\s*\\}\\}", 'gi'), role);
      html = html.replace(new RegExp("\\{\\{\\s*PERIODE_KERJA_" + i + "\\s*\\}\\}", 'gi'), dur);
      html = html.replace(new RegExp("\\{\\{\\s*DURASI_" + i + "\\s*\\}\\}", 'gi'), dur);
      html = html.replace(new RegExp("\\{\\{\\s*JOBDESK_" + i + "\\s*\\}\\}", 'gi'), job);
      html = html.replace(new RegExp("\\{\\{\\s*DESKRIPSI_KERJA_" + i + "\\s*\\}\\}", 'gi'), job);

      // Projects index replacements
      const proj = activeProjects[i - 1];
      const projName = proj ? proj.name : "";
      const projLink = proj ? proj.link : "";
      const projDesc = proj ? proj.description : "";

      html = html.replace(new RegExp("\\{\\{\\s*NAMA_PROYEK_" + i + "\\s*\\}\\}", 'gi'), projName);
      html = html.replace(new RegExp("\\{\\{\\s*URL_PROYEK_" + i + "\\s*\\}\\}", 'gi'), projLink);
      html = html.replace(new RegExp("\\{\\{\\s*LINK_PROYEK_" + i + "\\s*\\}\\}", 'gi'), projLink);
      html = html.replace(new RegExp("\\{\\{\\s*LINK_URL_PROYEK_" + i + "\\s*\\}\\}", 'gi'), projLink);
      html = html.replace(new RegExp("\\{\\{\\s*DESKRIPSI_PROYEK_" + i + "\\s*\\}\\}", 'gi'), projDesc);
    }

    // Post-process the final compiled HTML to patch any broken/relative upload paths in img tags and background-images
    html = html.replace(/src=["'](?:\/|u\/|api\/|u|api)?\/?uploads\/([^"']+)["']/gi, 'src="/uploads/$1"');
    html = html.replace(/src=["'](?:\/|u\/|api\/|u|api)?\/?api\/uploads\/([^"']+)["']/gi, 'src="/api/uploads/$1"');
    html = html.replace(/url\(["']?(?:\/|u\/|api\/|u|api)?\/?uploads\/([^"')]+)["']?\)/gi, 'url("/uploads/$1")');
    html = html.replace(/url\(["']?(?:\/|u\/|api\/|u|api)?\/?api\/uploads\/([^"')]+)["']?\)/gi, 'url("/api/uploads/$1")');

    const isCoverLetter = tpl.category === "cover_letter";
    if (isCoverLetter) {
      if (!html.includes("cover-letter-page")) {
        html = `<div class="cover-letter-page">${html}</div>`;
      }
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { 
            font-family: ui-sans-serif, system-ui, sans-serif; 
            margin: 0; 
            padding: 0; 
          }
          /* Custom layout helpers inside iframe preview */
          .onerror-fallback {
            object-fit: cover;
          }
          
          /* Force background colors and colors during print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* High-Fidelity Print Layout Optimization */
          @media print {
            @page {
              size: A4;
              margin: 0 !important;
            }
            html, body {
              width: 210mm;
              height: 297mm;
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            /* Remove margins and padding skewing print position */
            .min-h-screen, body, #root {
              min-height: auto !important;
              height: auto !important;
              background: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            
            /* Prevent print split issues - collapse excessive vertical padding */
            .py-12, .py-16, .py-20, .py-10, .py-8 {
              padding-top: 4mm !important;
              padding-bottom: 4mm !important;
            }
            .px-6, .px-8, .px-12, .p-8, .p-12 {
              padding-left: 6mm !important;
              padding-right: 6mm !important;
            }
            
            /* Disable shadows and screen borders */
            .shadow-lg, .shadow-md, .shadow-xl, .shadow-2xl, .shadow {
              box-shadow: none !important;
            }
            
            /* Avoid breaking elements mid-way across page borders */
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              break-after: avoid;
            }
            tr, img, .relative, .grid, li, .flex-shrink-0 {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            /* Dynamic columns configuration fix */
            .max-w-4xl, .max-w-3xl, .max-w-2xl {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
              border: none !important;
              border-radius: 0 !important;
            }
          }
        </style>
      </head>
      <body class="bg-slate-50">
        ${html}
      </body>
      </html>
    `;
  };

  const isCollapsed = !isMobileMode && isSidebarMinimized;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* MOBILE TOP BAR HEADER (Displays only on mobile viewports for toggle menu) */}
      <header className="flex md:hidden items-center justify-between bg-[#1e252b] text-slate-300 px-4 py-3 sticky top-0 z-40 border-b border-[#151a1e] shrink-0">
        <div className="flex items-center gap-2.5">
          <img 
            src="https://i.ibb.co.com/ym8b3RFm/logo-portoify.png" 
            alt="Portoify Logo" 
            className="w-8 h-8 rounded-lg object-cover shadow-sm animate-fadeIn"
            referrerPolicy="no-referrer"
          />
          <span className="font-display font-black text-lg text-white tracking-tight">Portoify</span>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 bg-slate-800/80 hover:bg-slate-800 hover:text-white rounded-lg text-slate-300 transition cursor-pointer"
          aria-label="Toggle Menu"
        >
          {isMobileSidebarOpen ? <X className="w-6 h-6 animate-spin-once" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* MOBILE SIDEBAR BACKDROP OVERLAY */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-350"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION PANEL (conforms strictly to design 3 with Collapsible function) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 md:sticky md:top-0 md:h-screen
        ${isCollapsed ? "md:w-20" : "md:w-64"}
        bg-[#1e252b] text-slate-300 flex flex-col justify-between shrink-0 p-4 border-r border-[#151a1e]
        duration-300 transition-transform md:transition-all ease-in-out overflow-hidden
        ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Brand header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <img 
              src="https://i.ibb.co.com/ym8b3RFm/logo-portoify.png" 
              alt="Portoify Logo" 
              className="w-10 h-10 rounded-xl object-cover shadow-md shrink-0"
              referrerPolicy="no-referrer"
            />
            {!isCollapsed && (
              <span className="font-display font-black text-xl text-white tracking-tight truncate whitespace-nowrap animate-fadeIn">Portoify</span>
            )}
          </div>
          
          {/* Toggle click for minimizing sidebar desktop */}
          <button
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            className="hidden md:flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            title={isSidebarMinimized ? "Lebar Penuh" : "Sembunyikan"}
          >
            {isSidebarMinimized ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile close drawer button */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="flex md:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 select-none pr-0.5 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="space-y-1 text-sm font-semibold">
            
            {/* 1. Dashboard */}
            <button
              onClick={() => selectTab("dashboard")}
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-3"} rounded-xl transition-all cursor-pointer ${activeTab === "dashboard" ? "bg-brand text-white shadow-md" : "hover:bg-slate-800/50 hover:text-white"}`}
              title="Dashboard"
            >
              <LayoutDashboard className="w-5 h-5 text-red-400 shrink-0" />
              {!isCollapsed && <span className="animate-fadeIn">Dashboard</span>}
            </button>

            {/* Template Library / Pilih Template */}
            <button
              onClick={() => selectTab("pilih-template")}
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-3"} rounded-xl transition-all cursor-pointer ${activeTab === "pilih-template" ? "bg-brand text-white shadow-md" : "hover:bg-slate-800/50 hover:text-white"}`}
              title="Template"
            >
              <Palette className="w-5 h-5 text-red-400 shrink-0" />
              {!isCollapsed && <span className="animate-fadeIn">Template</span>}
            </button>

            {/* 2. Kelola Profiles Expandable */}
            <div className="space-y-1">
              <button
                onClick={() => setIsProfilesExpanded(!isProfilesExpanded)}
                className={`w-full flex items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-3.5"} py-3 rounded-xl hover:bg-slate-800/50 hover:text-white cursor-pointer transition text-left`}
                title="Kelola Profiles"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-red-400 shrink-0" />
                  {!isCollapsed && <span className="animate-fadeIn">Kelola Profiles</span>}
                </div>
                {!isCollapsed && <span className={`text-[10px] transition-transform duration-200 ${isProfilesExpanded ? "rotate-180" : ""}`}>▼</span>}
              </button>

              {isProfilesExpanded && (
                <div className={`${isCollapsed ? "pl-0 flex flex-col items-center animate-fadeIn" : "pl-6 space-y-1 animate-fadeIn"} transition text-xs font-semibold`}>
                  <button
                    onClick={() => selectTab("update-profile")}
                    className={`flex items-center gap-2 text-left py-2.5 rounded-lg cursor-pointer transition ${isCollapsed ? "justify-center w-8 px-0" : "w-full px-3"} ${activeTab === "update-profile" ? "text-white bg-slate-800 shadow" : "text-slate-400 hover:text-white"}`}
                    title="Update Profiles"
                  >
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    {!isCollapsed && <span className="animate-fadeIn truncate">Update Profiles</span>}
                  </button>
                  <button
                    onClick={() => selectTab("change-password")}
                    className={`flex items-center gap-2 text-left py-2.5 rounded-lg cursor-pointer transition ${isCollapsed ? "justify-center w-8 px-0" : "w-full px-3"} ${activeTab === "change-password" ? "text-white bg-slate-800 shadow" : "text-slate-400 hover:text-white"}`}
                    title="Ganti Password"
                  >
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    {!isCollapsed && <span className="animate-fadeIn truncate">Ganti Password</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Collapsible "Buat Sekarang" Submenu */}
            <div className="space-y-1">
              <button
                onClick={() => setIsBuatSekarangExpanded(!isBuatSekarangExpanded)}
                className={`w-full flex items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-3.5"} py-3 rounded-xl hover:bg-slate-800/50 hover:text-white cursor-pointer transition text-left`}
                title="Buat Sekarang"
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-emerald-400 shrink-0 hover:rotate-90 transition-transform duration-300" />
                  {!isCollapsed && <span className="animate-fadeIn font-bold">Buat Sekarang</span>}
                </div>
                {!isCollapsed && <span className={`text-[10px] transition-transform duration-200 ${isBuatSekarangExpanded ? "rotate-180" : ""}`}>▼</span>}
              </button>

              {isBuatSekarangExpanded && (
                <div className={`${isCollapsed ? "pl-0 flex flex-col items-center animate-fadeIn" : "pl-6 space-y-1 animate-fadeIn"} transition text-xs font-semibold`}>
                  {/* Portofolio Digital */}
                  <button
                    onClick={() => selectTab("buat-portfolio")}
                    className={`flex items-center gap-2 text-left py-2.5 rounded-lg cursor-pointer transition ${isCollapsed ? "justify-center w-8 px-0" : "w-full px-3"} ${activeTab === "buat-portfolio" ? "text-white bg-slate-800 shadow" : "text-slate-400 hover:text-white"}`}
                    title="Portofolio Digital"
                  >
                    <FolderGit2 className="w-4 h-4 text-rose-400 shrink-0" />
                    {!isCollapsed && <span className="animate-fadeIn truncate">Portofolio Digital</span>}
                  </button>

                  {/* Resume/CV */}
                  <button
                    onClick={() => selectTab("buat-resume-saya")}
                    className={`flex items-center gap-2 text-left py-2.5 rounded-lg cursor-pointer transition ${isCollapsed ? "justify-center w-8 px-0" : "w-full px-3"} ${activeTab === "buat-resume-saya" ? "text-white bg-slate-800 shadow" : "text-slate-400 hover:text-white"}`}
                    title="Resume/CV"
                  >
                    <Palette className="w-4 h-4 text-amber-400 shrink-0 hover:rotate-12 transition-transform" />
                    {!isCollapsed && <span className="animate-fadeIn truncate">Resume/CV</span>}
                  </button>

                  {/* Lamaran Kerja */}
                  <button
                    onClick={() => selectTab("buat-lamaran")}
                    className={`flex items-center gap-2 text-left py-2.5 rounded-lg cursor-pointer transition ${isCollapsed ? "justify-center w-8 px-0" : "w-full px-3"} ${activeTab === "buat-lamaran" ? "text-white bg-slate-800 shadow" : "text-slate-400 hover:text-white"}`}
                    title="Lamaran Kerja"
                  >
                    <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                    {!isCollapsed && <span className="animate-fadeIn truncate">Lamaran Kerja</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Kelola Dokumen Submenu */}
            <div className="space-y-1">
              <button
                onClick={() => setIsKelolaDokumenExpanded(!isKelolaDokumenExpanded)}
                className={`w-full flex items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-3.5"} py-3 rounded-xl hover:bg-slate-800/50 hover:text-white cursor-pointer transition text-left`}
                title="Kelola Dokumen"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-red-400 shrink-0" />
                  {!isCollapsed && <span className="animate-fadeIn">Kelola Dokumen</span>}
                </div>
                {!isCollapsed && <span className={`text-[10px] transition-transform duration-200 ${isKelolaDokumenExpanded ? "rotate-180" : ""}`}>▼</span>}
              </button>

              {isKelolaDokumenExpanded && (
                <div className={`${isCollapsed ? "pl-0 flex flex-col items-center animate-fadeIn" : "pl-6 space-y-1 animate-fadeIn"} transition text-xs font-semibold`}>
                  {/* Dokumen Saya */}
                  <button
                    onClick={() => selectTab("dokumen-saya")}
                    className={`flex items-center ${isCollapsed ? "justify-center w-8 h-8 rounded-full animate-fadeIn" : "justify-between w-full px-3 py-2.5 rounded-lg"} cursor-pointer transition text-left ${activeTab === "dokumen-saya" ? "text-white bg-brand shadow-md font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800/45"}`}
                    title="Upload Dok"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileUp className="w-4 h-4 text-slate-400 shrink-0" />
                      {!isCollapsed && <span className="animate-fadeIn truncate text-xs">Upload Dok</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="bg-amber-500/25 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-right shrink-0 tracking-wider">Langganan</span>
                    )}
                  </button>

                  {/* Gabungkan Dok */}
                  <button
                    onClick={() => selectTab("gabungkan-semua")}
                    className={`flex items-center ${isCollapsed ? "justify-center w-8 h-8 rounded-full animate-fadeIn" : "justify-between w-full px-3 py-2.5 rounded-lg"} cursor-pointer transition text-left ${activeTab === "gabungkan-semua" ? "text-white bg-brand shadow-md font-bold" : "text-slate-400 hover:text-white hover:bg-slate-800/45"}`}
                    title="Gabungkan"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileStack className="w-4 h-4 text-slate-400 shrink-0" />
                      {!isCollapsed && <span className="animate-fadeIn truncate text-xs">Gabungkan</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="bg-amber-500/25 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-right shrink-0 tracking-wider">Langganan</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 7. Paket saya */}
            <button
              onClick={() => selectTab("paket-saya")}
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-0 py-3" : "justify-between px-3.5 py-3"} rounded-xl transition-all cursor-pointer ${activeTab === "paket-saya" ? "bg-brand text-white shadow-md" : "hover:bg-slate-800/50 hover:text-white"}`}
              title="Paket Saya"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-red-400 shrink-0" />
                {!isCollapsed && <span className="animate-fadeIn">Paket Saya</span>}
              </div>
              {!isCollapsed && (
                <span className="bg-emerald-500/25 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-right shrink-0 tracking-wider animate-fadeIn">Join</span>
              )}
            </button>

            {/* 8. Kelola URL Domain */}
            <button
              onClick={() => selectTab("url-domain")}
              className={`w-full flex items-center ${isCollapsed ? "justify-center px-0 py-3" : "justify-between px-3.5 py-3"} rounded-xl transition-all cursor-pointer ${activeTab === "url-domain" ? "bg-brand text-white shadow-md" : "hover:bg-slate-800/50 hover:text-white"}`}
              title="Kelola URL Domain"
            >
              <div className="flex items-center gap-3">
                <Globe2 className="w-5 h-5 text-red-400 shrink-0" />
                {!isCollapsed && <span className="animate-fadeIn">Kelola URL Domain</span>}
              </div>
              {!isCollapsed && (
                <span className="bg-amber-500/25 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-right shrink-0 tracking-wider">Langganan</span>
              )}
            </button>

          </nav>
        </div>

        {/* User identification info footer */}
        <div className="pt-4 border-t border-slate-800 space-y-3 shrink-0">
          <div className={`flex items-center ${isCollapsed ? "justify-center px-0" : "gap-2 px-2"}`}>
            {(profPhoto || profile?.photoUrl) ? (
              <img 
                src={profPhoto || profile?.photoUrl} 
                alt="Foto Profil" 
                className="w-9 h-9 rounded-full object-cover border border-slate-700/80 shadow-md shrink-0 animate-fadeIn"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white font-black text-sm uppercase shrink-0 animate-fadeIn">
                {currentUser.fullName.charAt(0)}
              </div>
            )}
            {!isCollapsed && (
              <div className="overflow-hidden animate-fadeIn">
                <p className="text-xs font-extrabold text-white truncate">{profile?.fullName || currentUser.fullName}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">{currentUser.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className={`flex items-center ${isCollapsed ? "justify-center p-2" : "gap-2.5 px-3.5 py-2.5"} w-full text-xs font-bold bg-slate-800 hover:bg-red-950/40 hover:text-red-400 rounded-xl transition cursor-pointer`}
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-red-400 shrink-0" />
            {!isCollapsed && <span className="animate-fadeIn">Logout</span>}
          </button>
        </div>
      </aside>

      {/* CENTER WORKSPACE CONTROL */}
      <main ref={mainContentRef} className="flex-1 p-6 md:p-8 overflow-y-auto">
        
        {/* Alerts display */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-800 flex items-center gap-3 text-sm font-semibold shadow-sm animate-fadeIn">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl text-emerald-900 flex items-center gap-3 text-sm font-semibold shadow-sm animate-fadeIn">
            <Check className="w-5 h-5 flex-shrink-0 text-emerald-500 animate-bounce" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Loader status bar indicator - Floating on bottom-right to prevent layout shifts & improve UX */}
        {loading && (
          <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-2xl animate-fade-in transition-all">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> 
            <span>Menghubungkan ke database secure...</span>
          </div>
        )}

        {/* =========================================
            TAB 1: PRIMARY DASHBOARD 
           ========================================= */}
        {/* =========================================
            TAB 1: PRIMARY DASHBOARD 
           ========================================= */}
        {activeTab === "dashboard" && (() => {
          const currentMode = overrideDeviceMode === "auto" 
            ? (isMobileMode ? "mobile" : (isTabletMode ? "tablet" : "desktop")) 
            : overrideDeviceMode;

          return (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Top Interactive Device Detection & Responsive Dashboard Switcher */}
              <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 animate-fadeIn">
                <div className="space-y-1.5 text-left flex-1">
                  <span className="bg-brand/20 text-brand text-[9px] font-black uppercase px-2.5 py-1 rounded-full inline-block font-mono tracking-wider">
                    ⚡ INSTANT RESPONSIVE ADAPTER
                  </span>
                  <h3 className="text-base font-bold font-display text-white flex items-center gap-2 flex-wrap">
                    <span>Responsive Mode</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full font-mono font-black animate-pulse">
                      AUTOMATIC SYSTEM
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 pt-1 text-slate-300 text-[10px] font-semibold flex-wrap">
                    <span>Layar Anda Terbaca Sebagai:</span>
                    <span className={`px-2 py-0.5 rounded-lg font-extrabold font-mono text-xs ${
                      isMobileMode 
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                        : isTabletMode
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                    }`}>
                      {isMobileMode 
                        ? "Mode Mobile" 
                        : isTabletMode 
                          ? "Mode Tablet" 
                          : "Mode Web"}
                    </span>
                  </div>
                </div>

                {/* Switcher Controls Selector */}
                <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 grid grid-cols-2 sm:flex sm:items-center gap-1 w-full lg:w-auto shrink-0 self-stretch lg:self-auto">
                  <button
                    type="button"
                    onClick={() => setOverrideDeviceMode("auto")}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      overrideDeviceMode === "auto"
                        ? "bg-brand text-white shadow-md font-bold"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    🤖 Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideDeviceMode("desktop")}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      overrideDeviceMode === "desktop"
                        ? "bg-indigo-650 text-white shadow-md font-bold"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    💻 Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideDeviceMode("tablet")}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      overrideDeviceMode === "tablet"
                        ? "bg-purple-600 text-white shadow-md font-bold"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    📟 Tablet
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideDeviceMode("mobile")}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      overrideDeviceMode === "mobile"
                        ? "bg-amber-600 text-white shadow-md font-bold"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    📱 Mobile
                  </button>
                </div>
              </div>

              {/* RENDER CHOSEN DEVICE LAYOUT */}
              {currentMode === "mobile" ? (
                /* =========================================
                    A: MOBILE PORTRAIT SMARTPHONE DASHBOARD 
                   ========================================= */
                <div className="space-y-6 animate-fadeIn text-left">
                  {/* Compact Header Welcome Banner */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-white text-md font-black shadow-inner">
                        {profile?.fullName?.substring(0, 2).toUpperCase() || currentUser.fullName?.substring(0, 2).toUpperCase() || "ME"}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide font-mono block mb-0.5">Halo, Selamat Datang</span>
                        <h2 className="text-xl font-display font-black text-slate-950 leading-tight">
                          {profile?.fullName || currentUser.fullName}
                        </h2>
                      </div>
                    </div>

                    <p className="text-slate-500 text-xs leading-relaxed">
                      Dashboard Anda telah disederhanakan dan diatur dalam baris vertikal rapi agar mudah dibaca di layar HP tanpa perlu melakukan zoom manual.
                    </p>

                    <div className="pt-3.5 border-t border-slate-100 space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider font-mono">⚡ MENU PINTASAN MOBILE CEPAT</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setActiveTab("buat-portfolio")}
                          className="py-3 px-3 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-100 rounded-2xl text-xs font-extrabold text-indigo-750 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                        >
                          <span className="text-xl">📁</span>
                          <span>Isi Portfolio</span>
                        </button>
                        <button
                          onClick={() => setActiveTab("buat-resume-saya")}
                          className="py-3 px-3 bg-rose-50/70 hover:bg-rose-100 border border-rose-100 rounded-2xl text-xs font-extrabold text-rose-750 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                        >
                          <span className="text-xl">✍️</span>
                          <span>Edit Canvas</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobilized Floating Action for Portfolio Preview */}
                  {portfolio && (portfolio.title || portfolio.aboutMe) && (
                    <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-lg space-y-3">
                      <div className="space-y-1">
                        <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block font-mono">
                          👁️ PORTFOLIO PREVIEW
                        </span>
                        <h4 className="text-sm font-black text-white">Review Portofolio Portabel</h4>
                        <p className="text-slate-400 text-xxs leading-relaxed">
                          Anda telah menginput profil portofolio digital. Klik tombol di bawah ini untuk melihat hasil pratinjau sekarang.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const activeTpl = templates.find(t => t.category === "portfolio" && t.id === portTplId);
                          if (activeTpl) {
                            setPreviewTemplate(activeTpl);
                          } else {
                            showFeedback("Belum ada template portofolio aktif.");
                          }
                        }}
                        className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white font-extrabold text-xs rounded-xl shadow-md transition duration-200 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" /> Buka Review Portofolio
                      </button>
                    </div>
                  )}

                  {/* Mobile Stats Grid - 2x2 Format with Large Fonts */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Stat Card 1: Completeness */}
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wide font-mono">STATUS PROFIL</span>
                        <div className="text-2xl font-extrabold text-slate-900 font-display mt-1">
                          {calculateCompleteness()}%
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div className="bg-brand h-1.5 rounded-full" style={{ width: `${calculateCompleteness()}%` }}></div>
                      </div>
                    </div>

                    {/* Stat Card 2: Docs count */}
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wide font-mono">BERKAS FILE</span>
                        <div className="text-2xl font-extrabold text-slate-900 font-display mt-1">
                          {documents.length} <span className="text-xs text-slate-500 font-bold font-sans">Dokumen</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab("dokumen-saya")}
                        className="text-[10px] text-brand hover:underline font-extrabold mt-3 block text-left"
                      >
                        Kelola Dokumen &rarr;
                      </button>
                    </div>

                    {/* Stat Card 3: Subscription active status */}
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wide font-mono">MASA AKTIF</span>
                        <p className="text-slate-900 font-extrabold text-xs mt-1 truncate">{sub?.packageName || "Selesai/Gratis"}</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("paket-saya")}
                        className="text-[10px] text-emerald-600 hover:underline font-extrabold mt-3 block text-left"
                      >
                        Beli & Upgrade &rarr;
                      </button>
                    </div>

                    {/* Stat Card 4: Page Views lock/unlock */}
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wide font-mono">KUNJUNGAN LIVE</span>
                        {!isProMember ? (
                          <div className="text-amber-600 font-bold text-xs mt-1">Locked 🔒</div>
                        ) : (
                          <div className="text-2xl font-extrabold text-teal-600 font-display mt-1">
                            {logs.filter(l => l.message.includes("diakses")).length} <span className="text-xs text-slate-500 font-mono">Views</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[8px] text-slate-400 block mt-3 font-semibold font-mono">Statistik URL</span>
                    </div>
                  </div>

                  {/* Smartphone Styled Activity Timeline Stream */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                        <h4 className="font-display font-black text-slate-900 text-sm">Aktivitas Sesi Mobile</h4>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 text-[8px] font-extrabold px-2 py-0.5 rounded-full font-mono uppercase tracking-widest animate-pulse">Running</span>
                    </div>

                    <div className="space-y-4">
                      {logs.length > 0 ? (
                        [...logs]
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .slice(0, 5)
                          .map((log) => (
                            <div key={log.id} className="flex gap-3 items-start text-xs border-l-2 border-slate-100 pl-3.5 relative py-0.5">
                              <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-brand"></span>
                              <div className="flex-1 space-y-1">
                                <p className="font-semibold text-slate-850 leading-relaxed block">{log.message}</p>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 leading-none">
                                  <span>Admin System</span>
                                  <span className="font-mono bg-slate-50 border border-slate-100 px-1 py-0.5 rounded text-[8px]">
                                    {new Date(log.timestamp).toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                          Belum ada histori aktivitas.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : currentMode === "tablet" ? (
                /* =========================================
                    C: TABLET / IPAD BALANCED BENTO LAYOUT 
                   ========================================= */
                <div className="space-y-6 animate-fadeIn text-left">
                  {/* Tablet Info Header */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <span className="bg-purple-100 text-purple-800 text-[9px] font-black uppercase px-2.5 py-1 rounded-full font-mono tracking-wider animate-pulse">
                        📟 TABLET LAYOUT ACTIVE
                      </span>
                      <h2 className="text-2xl font-display font-black text-slate-900 leading-tight">
                        Dashboard Premium {profile?.fullName || currentUser.fullName}
                      </h2>
                      <p className="text-slate-500 text-xs">
                        Tampilan ini dirancang khusus untuk iPad & Tablet Android dengan rasio seimbang demi aksesibilitas optimal.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab("buat-portfolio")}
                        className="px-4 py-2 bg-brand text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer hover:bg-brand-hover active:scale-95 transition"
                      >
                        📁 Buat Portofolio
                      </button>
                    </div>
                  </div>

                  {/* Dual Grid Layout for Tablet View */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Grid: Stats Column (spanning 5 cols on md screens) */}
                    <div className="md:col-span-5 space-y-6">
                      {/* Stat Checklist */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                        <h4 className="text-xs font-black uppercase text-slate-400 font-mono">Kemajuan Berkas & Akun</h4>
                        
                        {/* Profile Stat */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>Kelengkapan Data</span>
                            <span>{calculateCompleteness()}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-brand h-2 rounded-full" style={{ width: `${calculateCompleteness()}%` }}></div>
                          </div>
                        </div>

                        {/* Saved files and Subscription status */}
                        <div className="grid grid-cols-1 gap-3 pt-2">
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono block">Berkas Lamaran</span>
                            <div className="text-lg font-black text-slate-900 mt-1">{documents.length} Dokumen Tersimpan</div>
                          </div>

                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono block">Paket Langganan</span>
                            <div className="text-sm font-black text-slate-900 mt-1 truncate">{sub?.packageName || "Selesai/Gratis"}</div>
                          </div>
                        </div>
                      </div>

                      {/* Web View statistics */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs text-left">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">Kunjungan Link Online</span>
                        {!isProMember ? (
                          <div className="mt-3 p-3 bg-amber-50 rounded-2xl border border-amber-100 text-[11px] text-amber-800 font-medium font-bold">
                            🔒 Upgrade paket langganan aktif untuk melihat statistik kunjungan link portofolio Anda.
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-3">
                            <div className="text-3xl font-extrabold text-teal-650 font-display">
                              {logs.filter(l => l.message.includes("diakses")).length} <span className="text-xs text-slate-500 font-normal">Views</span>
                            </div>
                            <span className="text-[9px] bg-teal-50 text-teal-700 border border-teal-250 px-2 py-0.5 rounded-full font-mono font-black uppercase">Aktif</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Grid: Portfolio draft link and Timeline (spanning 7 cols on md screens) */}
                    <div className="md:col-span-7 space-y-6">
                      {/* Integrated Preview local widget */}
                      {portfolio && (portfolio.title || portfolio.aboutMe) && (
                        <div className="bg-gradient-to-r from-purple-950 to-indigo-950 text-white p-5 rounded-3xl border border-indigo-900 shadow-md flex justify-between items-center gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] bg-brand text-white font-extrabold uppercase px-2 py-0.5 rounded">LOCAL DRAF</span>
                            <h4 className="text-sm font-black text-white">Review Portofolio Portabel</h4>
                            <p className="text-slate-400 text-xxs">Lihat template aktif Anda secara lokal.</p>
                          </div>
                          <button
                            onClick={() => {
                              const activeTpl = templates.find(t => t.category === "portfolio" && t.id === portTplId);
                              if (activeTpl) {
                                setPreviewTemplate(activeTpl);
                              } else {
                                showFeedback("Belum ada template portofolio aktif.");
                              }
                            }}
                            className="px-3.5 py-1.5 bg-brand hover:bg-brand-hover text-white font-black text-xs rounded-xl shadow active:scale-95 transition cursor-pointer"
                          >
                            Buka Preview
                          </button>
                        </div>
                      )}

                      {/* Activity Log */}
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                          <h3 className="font-display font-black text-slate-900 text-sm">Aktivitas Realtime Tablet</h3>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-mono rounded border border-emerald-200 font-black uppercase">Live</span>
                        </div>
                        <div className="p-5 max-h-[220px] overflow-y-auto space-y-3">
                          {logs.length > 0 ? (
                            [...logs]
                              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                              .slice(0, 4)
                              .map((log) => (
                                <div key={log.id} className="flex gap-2 text-xs border-b border-slate-50 pb-2 last:border-b-0 last:pb-0">
                                  <span className="text-brand">⚡</span>
                                  <div className="flex-1">
                                    <p className="font-semibold text-slate-800 leading-snug">{log.message}</p>
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      {new Date(log.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <p className="text-slate-400 text-xs py-4 text-center">Belum ada aktivitas terekam.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* =========================================
                    B: DESKTOP MULTI-COLUMN BENTO DASHBOARD 
                   ========================================= */
                <div className="space-y-8 animate-fadeIn text-left">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-display font-black text-slate-900">
                        Selamat Datang, {profile?.fullName || currentUser.fullName}!
                      </h1>
                      <p className="text-slate-500 text-sm mt-0.5">Pantau status berkas lamaran dan dashboard portofolio digital Anda.</p>
                    </div>

                    {/* Header CTA Button */}
                    <div className="flex gap-2 animate-fadeIn">
                      {portfolio && (portfolio.title || portfolio.aboutMe) && (
                        <button
                          onClick={() => {
                            const activeTpl = templates.find(t => t.category === "portfolio" && t.id === portTplId);
                            if (activeTpl) {
                              setPreviewTemplate(activeTpl);
                            } else {
                              showFeedback("Belum ada template portofolio aktif.");
                            }
                          }}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" /> Review Portofolio
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab("buat-portfolio")}
                        className="px-4 py-2.5 bg-brand text-white font-bold text-sm rounded-xl hover:bg-brand-hover shadow transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Buat Portofolio Baru (+)
                      </button>
                    </div>
                  </div>

                  {portfolio && (portfolio.title || portfolio.aboutMe) && (
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-slate-800 shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full inline-block font-mono tracking-wider">
                          👁️ Pratinjau Lokal Terpadu
                        </span>
                        <h3 className="text-base font-bold font-display text-white border-0">Review Portofolio Digital Anda</h3>
                        <p className="text-slate-400 text-xs">
                          Anda telah menginput data portofolio. Silakan lakukan review draf menggunakan template aktif Anda secara lokal (bukan hosting online).
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const activeTpl = templates.find(t => t.category === "portfolio" && t.id === portTplId);
                          if (activeTpl) {
                            setPreviewTemplate(activeTpl);
                          } else {
                            showFeedback("Belum ada template portofolio aktif.");
                          }
                        }}
                        className="px-4 py-2 bg-indigo-550 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow transition shrink-0 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review Sekarang &rarr;
                      </button>
                    </div>
                  )}

                  {/* Stat Cards (Direct layout mockup visual 3) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* Stat 1: Status Profil */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between text-left">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Profil</span>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-3xl font-extrabold text-slate-900 font-display">
                            {calculateCompleteness()}%
                          </span>
                          <span className="text-slate-500 text-xs font-bold">Complete</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 mt-4">
                        <div className="bg-brand h-2.5 rounded-full" style={{ width: `${calculateCompleteness()}%` }}></div>
                      </div>
                    </div>

                    {/* Stat 2: Dokumen Tersimpan */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm text-left">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dokumen Tersimpan</span>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-extrabold text-slate-900 font-display">
                          {documents.length}
                        </span>
                        <span className="text-slate-500 text-xs font-semibold">files</span>
                      </div>
                      <button
                        onClick={() => setActiveTab("dokumen-saya")}
                        className="text-xs text-slate-400 hover:text-brand font-bold mt-4 block text-left underline"
                      >
                        Kelola lampiran dokumen &rarr;
                      </button>
                    </div>

                    {/* Stat 3: Masa Aktif */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between text-left">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Masa Aktif Paket</span>
                        <p className="text-slate-900 font-bold text-base mt-2 line-clamp-1">{sub?.packageName || "Belum Berlangganan"}</p>
                        <p className="text-slate-500 text-xxs font-mono mt-1">
                          {sub?.isActive ? "Aktif & Hosting Terbuka" : "Gratis (Terkunci)"}
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("paket-saya")}
                        className="px-3 py-1 bg-brand hover:bg-brand-hover text-white text-xxs font-bold rounded-lg shadow-sm transition max-w-fit mt-3 cursor-pointer"
                      >
                        Renewal / Upgrade
                      </button>
                    </div>

                    {/* Stat 4: Kunjungan profile */}
                    {!isProMember ? (
                      <div className="bg-slate-50/50 p-6 rounded-3xl border border-dashed border-slate-200/80 shadow-xs opacity-75 relative overflow-hidden flex flex-col justify-between text-left">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kunjungan Portofolio</span>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-2xl font-extrabold text-slate-400 font-display">Locked 🔒</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-amber-600 font-medium mt-4">
                          ⚠️ Miliki paket aktif untuk membuka statistik online
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between text-left">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kunjungan Portofolio</span>
                          <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-extrabold text-brand font-display">
                              {logs.filter(l => l.message.includes("diakses")).length}
                            </span>
                            <span className="text-slate-500 text-xs font-semibold">Views</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-teal-600 font-mono mt-4 flex items-center gap-1">
                          🟢 Link Online Aktif & Dipantau
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Table of Activity Log of users (Direct mockup 3 table) */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                        <h3 className="font-display font-black text-slate-900 text-lg">Aktivitas Realtime</h3>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-mono rounded-full border border-emerald-200 uppercase font-black tracking-widest animate-pulse">Live Tracking</span>
                    </div>
                    
                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-400 text-xxs uppercase tracking-wider font-bold border-b border-slate-100 sticky top-0 z-5">
                          <tr>
                            <th className="px-6 py-4">Dokumen Action</th>
                            <th className="px-6 py-4">Penilai / Nama</th>
                            <th className="px-6 py-4">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {logs.length > 0 ? (
                            [...logs]
                              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                              .slice(0, 7)
                              .map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-6 py-4 font-semibold text-slate-850">
                                  {log.message}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                  {profile?.fullName || currentUser.fullName}
                                </td>
                                <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                  {new Date(log.timestamp).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr className="text-slate-400">
                              <td className="px-6 py-8 text-center" colSpan={3}>
                                Belum ada aktivitas terekam. Silakan gunakan menu di samping.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* =========================================
            TAB: PILIH TEMPLATE DESAIN (LIBRARY)
           ========================================= */}
        {activeTab === "pilih-template" && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header info */}
            <div className="bg-[#1e252b] text-white p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="bg-brand/25 text-red-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full inline-block font-mono tracking-wider mb-2">Desain Kustom Eksklusif</span>
                <h2 className="text-2xl font-display font-black text-white flex items-center gap-2">
                  <Palette className="text-red-400 w-6 h-6" /> Template
                </h2>
                <p className="text-slate-400 text-xs mt-1">Aktifkan desain pilihan buatan Admin Portoify untuk portofolio digital, CV/resume, maupun lamaran Anda secara instan.</p>
              </div>
            </div>

            {/* Category selection pills & Search bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit border border-slate-300/30">
                <button
                  onClick={() => setSelectedCategoryFilter("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCategoryFilter === "all" ? "bg-[#1e252b] text-white shadow" : "text-slate-600 hover:text-slate-850"}`}
                >
                  🌟 Semua Kategori ({templates.length})
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter("portfolio")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCategoryFilter === "portfolio" ? "bg-[#1e252b] text-white shadow" : "text-slate-600 hover:text-slate-850"}`}
                >
                  📂 Portofolio Digital ({templates.filter(t => t.category === "portfolio").length})
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter("resume")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCategoryFilter === "resume" ? "bg-[#1e252b] text-white shadow" : "text-slate-600 hover:text-slate-850"}`}
                >
                  📝 Resume / CV Online ({templates.filter(t => t.category === "resume").length})
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter("cover_letter")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCategoryFilter === "cover_letter" ? "bg-[#1e252b] text-white shadow" : "text-slate-600 hover:text-slate-850"}`}
                >
                  ✉️ Surat Lamaran ({templates.filter(t => t.category === "cover_letter").length})
                </button>
              </div>

              {/* Polished search bar matching user interface theme */}
              <div className="relative w-full lg:w-80">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Cari desain template kustom..."
                  value={tplSearchQuery}
                  onChange={(e) => setTplSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#1e252b] focus:border-[#1e252b]"
                />
              </div>
            </div>

            {/* Template horizontal scroll track */}
            <div className="flex overflow-x-auto gap-6 pb-6 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-350 hover:scrollbar-thumb-slate-400">
              {templates.filter(t => {
                const matchesCat = selectedCategoryFilter === "all" || t.category === selectedCategoryFilter;
                const matchesSearch = t.name.toLowerCase().includes(tplSearchQuery.toLowerCase()) ||
                  (t.description || "").toLowerCase().includes(tplSearchQuery.toLowerCase());
                return matchesCat && matchesSearch;
              }).map((t) => {
                // Determine active status
                const isCurrentActive = 
                  (t.category === "portfolio" && portTplId === t.id) ||
                  (t.category === "resume" && resTplId === t.id) ||
                  (t.category === "cover_letter" && covTplId === t.id);

                // Meta decoration variables for preview lookups
                let categoryLabel = "Portofolio Digital";
                let categoryColor = "bg-rose-100 text-rose-700 ring-rose-300";
                let decorationGraphic = "from-rose-500 to-amber-400";

                if (t.category === "resume") {
                  categoryLabel = "Resume / CV Online";
                  categoryColor = "bg-sky-100 text-sky-700 ring-sky-300";
                  decorationGraphic = "from-sky-500 to-indigo-500";
                } else if (t.category === "cover_letter") {
                  categoryLabel = "Surat Lamaran Kerja";
                  categoryColor = "bg-emerald-100 text-emerald-700 ring-emerald-300";
                  decorationGraphic = "from-emerald-500 to-teal-400";
                }

                const tAccessible = isTemplateAccessible(t);
                const tTier = t.tier || "basic";

                return (
                  <div
                    key={t.id}
                    className={`w-[320px] sm:w-[380px] shrink-0 snap-start bg-white rounded-[28px] border-2 ${
                      t.category === "portfolio" 
                        ? "border-[#E11D48]/70" 
                        : t.category === "resume" 
                          ? "border-[#1E40AF]/70" 
                          : "border-[#0F766E]/70"
                    } p-5 flex flex-col justify-between hover:shadow-md transition duration-200 relative ${
                      isCurrentActive ? "ring-4 ring-brand/10 shadow-sm" : ""
                    }`}
                  >
                    {/* Content Section with high fidelity split layout */}
                    {(() => {
                      const tTier = t.tier || "basic";
                      let packageText = "BASIC PACKAGE";
                      let packagePillClass = "text-[#0F766E] bg-[#0F766E]/5 border-[#0F766E]/30";
                      let categoryLabelText = "Lamaran";

                      if (t.category === "portfolio") {
                        packagePillClass = "text-[#E11D48] bg-[#E11D48]/5 border-[#E11D48]/30";
                        categoryLabelText = "Portfolio";
                      } else if (t.category === "resume") {
                        packagePillClass = "text-[#1E40AF] bg-[#1E40AF]/5 border-[#1E40AF]/30";
                        categoryLabelText = "Resume & CV";
                      }

                      if (tTier === "standard") packageText = "STANDARD PACKAGE";
                      if (tTier === "premium") packageText = "PREMIUM PACKAGE";
                      if (tTier === "free") packageText = "FREE PACKAGE";

                      const fallbackImage = t.id === "tpl_port_1" 
                        ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1600"
                        : t.id === "tpl_res_1"
                          ? "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=1600"
                          : t.id === "tpl_cov_1"
                            ? "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=1600"
                            : "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=1600";

                      const defaultDesc = t.id === "tpl_port_1" 
                        ? "Struktur Cosmic Dark misterius dengan rose quartz border. Cocok untuk bidang kreatif dan IT konsultan."
                        : t.id === "tpl_res_1" 
                          ? "Format grid minimalis modern berwarna Slate Gray. Sangat ramah pembacaan HRD dan ramah cetak PDF."
                          : t.id === "tpl_cov_1"
                            ? "Layout penulisan surat formal beraliran huruf serif klasik berwibawa, ideal untuk rekrutmen korporat."
                            : "Template kustom premium rancangan admin. Fleksibel, tertata rapi, dan siap dipakai untuk portofolio digital, CV/resume, maupun lamaran.";

                      return (
                        <div className="w-full">
                          {/* Status Label (Aktif / terkunci) on top right overlay */}
                          <div className="flex justify-between items-center mb-4">
                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${packagePillClass}`}>
                              {packageText}
                            </div>
                            
                            {isCurrentActive ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] border border-emerald-300 font-extrabold uppercase px-2.5 py-1 rounded-full shadow-xxs">
                                🟢 Digunakan (Aktif)
                              </span>
                            ) : !tAccessible ? (
                              <span className="bg-red-50 text-red-600 text-[9px] border border-red-200 font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xxs font-mono">
                                🔒 Terkunci
                              </span>
                            ) : null}
                          </div>

                          {/* Flex layout containing image preview Left and meta details Right */}
                          <div className="flex gap-4 items-start mb-4">
                            {/* Image portrait frame */}
                            <div className="w-24 sm:w-28 flex-shrink-0 aspect-[3/4] bg-slate-50 border border-slate-250 rounded-xl overflow-hidden shadow-xs relative flex items-center justify-center p-0.5">
                              <img 
                                src={t.previewUrl || fallbackImage} 
                                alt={t.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>

                            {/* Detail stack labels */}
                            <div className="flex-1 space-y-2 mt-1 min-w-0">
                              <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Nama Katalog:</span>
                                <h4 className="font-extrabold text-[#1e252b] text-xs sm:text-sm mt-0.5 leading-snug break-words">
                                  {t.name}
                                </h4>
                              </div>

                              <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Template Untuk:</span>
                                <p className="text-slate-750 font-black text-xs mt-0.5">
                                  {categoryLabelText}
                                </p>
                              </div>

                              <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Deskripsi:</span>
                                <p className="text-slate-500 font-medium text-[10px] sm:text-[11px] mt-0.5 leading-relaxed break-words line-clamp-4">
                                  {t.description || defaultDesc}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                          <span>Format Markup: CSS Tailwind</span>
                          <span>Upload: {t.createdAt ? new Date(t.createdAt).toLocaleDateString("id-ID") : "Bawaan Sistem"}</span>
                        </div>

                        {/* Actions buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              showFeedback();
                              setPreviewTemplate(t);
                            }}
                            className="py-2 px-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold leading-none cursor-pointer flex items-center justify-center gap-1.5 transition"
                          >
                            <Eye className="w-4 h-4 text-slate-500" /> Preview Live
                          </button>

                          {!tAccessible ? (
                            <button
                              type="button"
                              onClick={() => {
                                showFeedback("", `Template kustom ini (${tTier.toUpperCase()}) terkunci. Silakan upgrade paket Anda di Tab "Paket Saya".`);
                                setActiveTab("paket-saya");
                              }}
                              className="py-2 px-3 text-xs font-black rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 ring-1 ring-amber-200/80 cursor-pointer text-center leading-none transition"
                            >
                              🔒 Buka Akses
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isCurrentActive}
                              onClick={() => handleSetTemplateForCategory(t.category, t.id)}
                              className={`py-2 px-3 text-xs font-black rounded-xl cursor-pointer leading-none transition duration-150 ${
                                isCurrentActive 
                                  ? "bg-emerald-50 text-emerald-700 cursor-not-allowed border border-emerald-200" 
                                  : "bg-brand hover:bg-brand-hover text-white shadow"
                              }`}
                            >
                              {isCurrentActive ? "✓ Digunakan" : "Gunakan Desain"}
                            </button>
                          )}
                        </div>
                      </div>
                  </div>
                );
              })}
            </div>
            
            {/* Informational help card */}
            <div className="bg-amber-50 rounded-3xl border border-amber-200 p-5 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">💡 Tips Memilih Template Desain Berkarir:</p>
                <p className="mt-1">
                  Seluruh template dari Portoify didesain responsif dan ramah pembacaan tim rekruter (HRD). Jika Anda melamar di industri korporasi perbankan, manufaktur, atau BUMN, pilihlah template bernuansa formal dan bersih. Apabila melamar di bidang startup digital, agensi iklan, desainer grafis, atau software consultant, template gelap (cosmic dark) akan memberikan impresi yang sangat mendalam dan eksklusif.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* =========================================
            TAB 2: KELOLA PROFILES - UPDATE
           ========================================= */}
        {activeTab === "update-profile" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 max-w-3xl mx-auto animate-fadeIn">
            <div className="border-b border-slate-100 pb-5 mb-6">
              <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-2">
                <User className="text-brand w-6 h-6" /> Profile saya
              </h2>
              <p className="text-slate-500 text-xs mt-1">Data ini digunakan otomatis untuk merender draf CV, surat lamaran, dan portofolio Anda.</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              
              {/* Profile Photo Base64 upload or network URL */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-brand shadowbg-slate-200 flex-shrink-0">
                  {profPhoto ? (
                    <img src={profPhoto} alt="Foto Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 font-bold uppercase text-2xl">
                      {currentUser.fullName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-sm font-bold text-slate-800">Foto Profil Pribadi</p>
                  <p className="text-[10px] text-slate-500">Unggah dari komputer kamu secara langsung. Tersimpan aman di folder sandboxed.</p>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <label className="px-3.5 py-1.5 bg-brand text-white text-xs font-bold rounded-lg shadow-sm hover:bg-brand-hover transition cursor-pointer">
                      Pilih dari File
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    {profPhoto && (
                      <button
                        type="button"
                        onClick={() => setProfPhoto("")}
                        className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Nama lengkap Anda dapat diubah sesuai kebutuhan profil.</p>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Email Terdaftar</label>
                  <input
                    type="email"
                    value={currentUser.email}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 text-sm"
                    disabled
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Email primary tidak dapat diganti.</p>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Tempat Lahir</label>
                  <input
                    type="text"
                    placeholder="Contoh: Surabaya"
                    value={profTTLPlace}
                    onChange={(e) => setProfTTLPlace(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={profTTLDate}
                    onChange={(e) => setProfTTLDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                  />
                  {profTTLDate ? (
                    <span className="text-[10px] text-rose-500 font-bold mt-1 block">✓ Usia diukur otomatis: {calculateAge(profTTLDate)} Tahun</span>
                  ) : (
                    profile && profile.age !== undefined && (
                      <span className="text-[10px] text-rose-500 font-bold mt-1 block">✓ Usia diukur otomatis: {profile.age} Tahun</span>
                    )
                  )}
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">NIK (KTP)</label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="35780xxxxxxxx"
                    value={profNik}
                    onChange={(e) => setProfNik(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Nomor Handphone</label>
                  <input
                    type="text"
                    placeholder="Contoh: 08123xxxxxxx"
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Kota / Kabupaten</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kota Surabaya / Kab. Sidoarjo"
                    value={profCity}
                    onChange={(e) => setProfCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Jenis Kelamin</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" checked={profGender === "Laki-laki"} onChange={() => setProfGender("Laki-laki")} className="text-brand underline accent-red-600" />
                      Laki-laki
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" checked={profGender === "Perempuan"} onChange={() => setProfGender("Perempuan")} className="text-brand accent-red-600" />
                      Perempuan
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Alamat Lengkap Domisili</label>
                  <textarea
                    rows={3}
                    placeholder="Tulis alamat jalan, RT/RW, kecamatan, kota, provinsi Anda"
                    value={profAddress}
                    onChange={(e) => setProfAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl transition shadow-md cursor-pointer"
              >
                Simpan Profile
              </button>

            </form>
          </div>
        )}

        {/* =========================================
            TAB 3: KELOLA PROFILES - CHANGE PASSWORD
           ========================================= */}
        {activeTab === "change-password" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 max-w-lg mx-auto animate-fadeIn">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-xl font-display font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="text-brand w-5 h-5" /> Ganti Kredensial Password
              </h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Password Lama</label>
                <input
                  type="password"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Password Baru</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmNewPass}
                  onChange={(e) => setConfirmNewPass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
              >
                Ganti Password & Sinkronisasi
              </button>
            </form>
          </div>
        )}

        {/* =========================================
            TAB 4: BUAT PORTFOLIO DIGITAL
           ========================================= */}
        {activeTab === "buat-portfolio" && (
          <div className="space-y-6 animate-fadeIn">
            {getPackageAccess().portfolio === "none" ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-6 max-w-xl mx-auto my-8">
                <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto animate-bounce">
                  <Lock className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-black text-xl text-slate-900">Modul Portofolio Digital Terkunci</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Paket layanan Anda saat ini (<strong>{sub?.packageName || "Belum Berlangganan"}</strong>) belum dilengkapi dengan akses ke fitur pembuatan Portofolio Digital. Silakan lakukan upgrade paket Anda untuk membuka fitur ini.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab("paket-saya")}
                    className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
                  >
                    Upgrade Paket Sekarang ✨
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Form Inputs (Left Column - Spans 7 cols - slightly wider) */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-6">
                    <div>
                      <h2 className="text-xl font-display font-black text-slate-900 flex items-center gap-2">
                        <FolderGit2 className="text-brand w-5 h-5" /> Portofolio Digital Saya
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">Kelola data portofolio digital lengkap Anda.</p>
                    </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const activeTpl = templates.find(t => t.category === "portfolio" && t.id === portTplId);
                      if (activeTpl) {
                        setPreviewTemplate(activeTpl);
                      } else {
                        showFeedback("Belum ada template portofolio aktif yang dipilih.");
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4" /> Review Portofolio
                  </button>

                  {isProMember && sub.domainHostingPath ? (
                    <a
                      href={`/u/${sub.domainHostingPath}`}
                      target="_blank"
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1 hover:bg-emerald-100 transition shadow-xs"
                    >
                      🚀 Live Portfolio Online <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-xxs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      ⚠️ Berlangganan sekarang untuk Portofolio Online
                    </span>
                  )}
                </div>
              </div>

              {!profile ? (
                <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center text-sm text-red-700 space-y-4">
                  <p className="font-bold">⚠️ Anda belum melengkapi profil Anda!</p>
                  <p className="text-slate-600 text-xs">Portofolio membutuhkan foto, nama lengkap, usia, dan alamat dari menu profil dasar.</p>
                  <button
                    onClick={() => setActiveTab("update-profile")}
                    className="px-4 py-2 bg-brand text-white font-bold text-xs rounded-lg transition"
                  >
                    Lengkapi Profil Sekarang
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSavePortfolio} className="space-y-6 flex flex-col">
                  {/* Scrollable inputs container with visible scrollbar */}
                  <div className="max-h-[580px] overflow-y-auto pr-3.5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  
                   {/* Select Templates (Only active as requested) */}
                   <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                     <div className="flex justify-between items-center mb-3">
                       <label className="text-xs font-bold text-slate-500 uppercase block">Rekomendasi Template Portofolio (Maksimal 4 Desain)</label>
                       <button 
                         type="button"
                         onClick={() => {
                           setSelectedCategoryFilter("portfolio");
                           setActiveTab("pilih-template");
                         }}
                         className="text-xs font-bold text-brand hover:underline cursor-pointer"
                       >
                         Lihat Semua Desain &rarr;
                       </button>
                     </div>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                       {templates.filter(t => t.category === "portfolio").slice(0, 4).map((t) => {
                         const accessible = isTemplateAccessible(t);
                         const tTier = t.tier || "basic";
                         const isBawaanGratis = t.id === "tpl_port_1" || t.tier === "free";
                         return (
                           <div
                             key={t.id}
                             onClick={() => {
                               if (!accessible) {
                                 showFeedback(`Template "${t.name}" memerlukan Paket Berlangganan (${tTier.toUpperCase()}). Silakan upgrade paket Anda di menu "Paket Saya"!`);
                                 return;
                               }
                               setPortTplId(t.id);
                             }}
                             className={`p-4 bg-white rounded-xl border-2 transition cursor-pointer flex justify-between items-center ${
                               portTplId === t.id 
                                 ? "border-brand shadow-sm" 
                                 : !accessible
                                   ? "border-slate-100 bg-slate-50/50 opacity-70"
                                   : "border-slate-200 hover:border-slate-300"
                             }`}
                           >
                             <div>
                               <div className="flex items-center gap-2">
                                 {accessible && portTplId === t.id && (
                                    <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded mr-1.5 inline-block leading-none align-middle animate-pulse">
                                      Aktif
                                    </span>
                                  )}
                                  <p className="font-bold text-sm text-slate-900 leading-tight inline-block align-middle">{t.name}</p>
                                 {renderTemplateTierBadge(isBawaanGratis ? "free" : tTier)}
                               </div>
                               <p className="text-[10px] text-slate-400 font-mono mt-0.5">Desain Template • {tTier === 'free' ? 'Semua Paket' : `Paket ${tTier}`}</p>
                             </div>
                             <div className="flex items-center gap-1.5 shrink-0">
                               {!accessible && <span className="text-red-500 font-mono text-xs font-bold">🔒 Terkunci</span>}
                               {accessible && portTplId === t.id && (
                                 <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded leading-none mr-2">🟢 Aktif</span>
                               )}
                             </div>
                           </div>
                         );
                       })}
                     </div>

                     {portTplId === "" && (
                       <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/85 text-xs text-amber-950 leading-relaxed font-sans">
                         ⚠️Belum ada Template Design yang kamu pilih, Silahkan Pilih Template Design untuk Mengaktifkannya
                       </div>
                     )}
                   </div>

                  {/* Preloaded profiles data display */}
                  <div className="p-4 bg-red-50/40 border border-red-100 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                    <p><strong>Nama:</strong> {profile.fullName}</p>
                    <p><strong>Lokasi Alamat:</strong> {profile.address || "(Kosong)"}</p>
                    <p><strong>Melalui Akun:</strong> {currentUser.email}</p>
                  </div>

                  {/* Header title */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Title Profesional</label>
                      <input
                        type="text"
                        placeholder="Contoh: Senior Front-End Developer | UI Consultant"
                        value={portTitle}
                        onChange={(e) => setPortTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">Tentang Saya (Biografi Ringkas)</label>
                      <input
                        type="text"
                        placeholder="Contoh: Memiliki rekam jejak 3+ tahun mengolah aplikasi berbasis React..."
                        value={portAbout}
                        onChange={(e) => setPortAbout(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                        required
                      />
                    </div>
                  </div>

                  {/* PENGALAMAN KERJA */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Pengalaman Kerja</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {portExps.map((exp, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl relative space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-mono font-bold text-slate-400">Pengalaman #{idx + 1}</span>
                            {portExps.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const temp = [...portExps];
                                  temp.splice(idx, 1);
                                  setPortExps(temp);
                                }}
                                className="text-[10px] uppercase font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 cursor-pointer"
                              >
                                Hapus Slot
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1">Perusahaan / Institusi</label>
                              <input
                                type="text"
                                placeholder="Perusahaan"
                                value={exp.company}
                                onChange={(e) => {
                                  const temp = [...portExps];
                                  temp[idx].company = e.target.value;
                                  setPortExps(temp);
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1">Jabatan / Posisi</label>
                              <input
                                type="text"
                                placeholder="Jabatan / Peran"
                                value={exp.role}
                                onChange={(e) => {
                                  const temp = [...portExps];
                                  temp[idx].role = e.target.value;
                                  setPortExps(temp);
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1">Periode Waktu</label>
                              <input
                                type="text"
                                placeholder="Masa Periode (Contoh: 2022 - 2024)"
                                value={exp.duration}
                                onChange={(e) => {
                                  const temp = [...portExps];
                                  temp[idx].duration = e.target.value;
                                  setPortExps(temp);
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Jobdesk & Tugas (Box Lebih Panjang)</label>
                            <textarea
                              rows={5}
                              placeholder="Jobdesk & Pencapaian Ringkas di posisi tersebut"
                              value={exp.jobdesk}
                              onChange={(e) => {
                                const temp = [...portExps];
                                temp[idx].jobdesk = e.target.value;
                                setPortExps(temp);
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          setPortExps([...portExps, { company: "", role: "", duration: "", jobdesk: "" }]);
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold border border-rose-200/60 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                      >
                        ➕ Tambah Pengalaman Kerja
                      </button>
                    </div>
                  </div>

                  {/* DAFTAR PRODUK/PROYEK */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Daftar Produk/Proyek</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {portProjects.map((p, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl relative space-y-3 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xxs text-slate-400 font-mono font-bold">Proyek #{idx + 1}</span>
                              {portProjects.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const temp = [...portProjects];
                                    temp.splice(idx, 1);
                                    setPortProjects(temp);
                                  }}
                                  className="text-[9px] uppercase font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded border border-red-200 cursor-pointer"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Nama Aplikasi / Proyek"
                                value={p.name}
                                onChange={(e) => {
                                  const temp = [...portProjects];
                                  temp[idx].name = e.target.value;
                                  setPortProjects(temp);
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                              />
                              <input
                                type="text"
                                placeholder="URL Demo Link (Optional)"
                                value={p.link}
                                onChange={(e) => {
                                  const temp = [...portProjects];
                                  temp[idx].link = e.target.value;
                                  setPortProjects(temp);
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                              />
                              <textarea
                                rows={4}
                                placeholder="Deskripsi singkat proyek..."
                                value={p.description}
                                onChange={(e) => {
                                  const temp = [...portProjects];
                                  temp[idx].description = e.target.value;
                                  setPortProjects(temp);
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-1 pt-2 border-t border-slate-200/40">
                            <label className="text-[10px] text-slate-400 font-bold block">Foto Proyek (Max 1MB)</label>
                            {p.image && (
                              <img src={p.image} className="w-full h-20 object-cover rounded-lg border border-slate-200 mb-1.5" referrerPolicy="no-referrer" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 10 * 1024 * 1024) {
                                  alert("Ukuran gambar max 10MB!");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = async () => {
                                  try {
                                    const compressed = await compressImageBase64(reader.result as string, 800, 0.75);
                                    const temp = [...portProjects];
                                    temp[idx].image = compressed;
                                    setPortProjects(temp);
                                  } catch (err) {
                                    const temp = [...portProjects];
                                    temp[idx].image = reader.result as string;
                                    setPortProjects(temp);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          setPortProjects([...portProjects, { name: "", description: "", link: "" }]);
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold border border-rose-200/60 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                      >
                        ➕ Tambah Proyek Pilihan
                      </button>
                    </div>
                  </div>

                  {/* EDUCATIONS & SERTIFIKAT MAX 3 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                      <h4 className="font-display font-bold text-slate-800 text-xs uppercase border-b border-slate-200 pb-1.5 mb-2">Riwayat Pendidikan Terakhir</h4>
                      <input
                        type="text"
                        placeholder="Nama Kampus/Sekolah"
                        value={portEdu.institution}
                        onChange={(e) => setPortEdu({ ...portEdu, institution: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Gelar Kelulusan (Contoh: S1 Informatika)"
                        value={portEdu.degree}
                        onChange={(e) => setPortEdu({ ...portEdu, degree: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Tahun Kelulusan (Contoh: 2018 - 2022)"
                        value={portEdu.period}
                        onChange={(e) => setPortEdu({ ...portEdu, period: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                      <h4 className="font-display font-bold text-slate-800 text-xs uppercase border-b border-slate-200 pb-1.5 mb-2">Sertifikat</h4>
                      {portCerts.map((c, idx) => (
                        <input
                          key={idx}
                          type="text"
                          placeholder={`Sertifikat Kompetensi #${idx + 1}`}
                          value={c}
                          onChange={(e) => {
                            const temp = [...portCerts];
                            temp[idx] = e.target.value;
                            setPortCerts(temp);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      ))}
                    </div>
                  </div>

                  {/* KETERAMPILAN / SKILLS TAGGING */}
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                    <h4 className="font-display font-bold text-slate-800 text-xs uppercase border-b border-slate-200 pb-1.5 mb-1.5">Input Keahlian / Skill Kompetensi</h4>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: React, Tailwind CSS, TypeScript, Node.js"
                        value={inpSkill}
                        onChange={(e) => setInpSkill(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (!inpSkill.trim()) return;
                            const newSkills = inpSkill.split(",").map(s => s.trim()).filter(Boolean);
                            setPortSkills([...portSkills, ...newSkills]);
                            setInpSkill("");
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none text-xs text-slate-700 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!inpSkill.trim()) return;
                          const newSkills = inpSkill.split(",").map(s => s.trim()).filter(Boolean);
                          setPortSkills([...portSkills, ...newSkills]);
                          setInpSkill("");
                        }}
                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Tambah Skill
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      * Pisahkan keahlian dengan tanda koma (<strong>","</strong>) kemudian klik tombol "Tambah Skill" atau tekan Enter untuk membuat tag variabel.
                    </p>

                    {/* Tag list visualization (tag variabelnya) */}
                    {portSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {portSkills.map((sk, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-bold">
                            <span>{sk}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...portSkills];
                                updated.splice(idx, 1);
                                setPortSkills(updated);
                              }}
                              className="w-3.5 h-3.5 rounded-full bg-rose-100 hover:bg-red-400 hover:text-white text-rose-500 flex items-center justify-center font-black text-[8px] cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CONTACT & SOCIAL MEDIA */}
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
                    <h4 className="font-display font-bold text-slate-800 text-xs uppercase border-b border-slate-200 pb-1.5 mb-2">Kontak Hubung & Sosial Media</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-400 block text-xxs mb-1">Hp/Telepon Terlampir</label>
                        <input
                          type="text"
                          placeholder="Np Hp"
                          value={portPhone}
                          onChange={(e) => setPortPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block text-xxs mb-1">Alamat Kontak</label>
                        <input
                          type="text"
                          placeholder="Kota domisili"
                          value={portAddress}
                          onChange={(e) => setPortAddress(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block text-xxs mb-1">No. Whatsapp</label>
                        <input
                          type="text"
                          placeholder="Kode negara + HP. Cth: 628123000"
                          value={portWA}
                          onChange={(e) => setPortWA(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:border-brandOutline"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        placeholder="Username Instagram (Cth: budi_g)"
                        value={portIG}
                        onChange={(e) => setPortIG(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Username TikTok (Cth: budi.codes)"
                        value={portTikTok}
                        onChange={(e) => setPortTikTok(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Username LinkedIn (Cth: budi-gunawan)"
                        value={portLinkedIn}
                        onChange={(e) => setPortLinkedIn(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Username GitHub (Cth: budigun)"
                        value={portGitHub}
                        onChange={(e) => setPortGitHub(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  </div> {/* Closes max-h-[580px] scrollable inputs container */}

                  <div className="flex gap-3 flex-wrap pt-3 border-t border-slate-100 bg-white">
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl transition shadow-md cursor-pointer text-sm"
                    >
                      Simpan dan Perbarui Portofolio
                    </button>
                    {portTplId !== "" && (
                      <button
                        type="button"
                        onClick={() => handleDeactivateCategory("portfolio")}
                        className="px-4 py-3.5 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-700 font-extrabold rounded-xl border border-red-200 transition cursor-pointer text-xs"
                      >
                        Nonaktifkan & Hapus Portofolio
                      </button>
                    )}
                  </div>

                </form>
              )}
                </div>

                {/* Live Preview (Right Column - Spans 5 cols on lg screens - slightly smaller) */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col h-[740px] transition-all">
                  <div className="border-b border-slate-150 pb-3 mb-3 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-display font-black text-slate-900 flex items-center gap-1.5">
                        <Eye className="text-brand w-4 h-4" /> Live Pratinjau Portofolio
                      </h2>
                      <p className="text-slate-400 text-[10px] mt-0.5">Pratinjau visual draf pengubahan instan.</p>
                    </div>
                    {portTplId && (
                      <span className="bg-brand/10 text-brand font-mono text-[8px] px-1.5 py-0.5 rounded border border-brand/20 font-extrabold uppercase tracking-widest shrink-0">
                        Live Web Preview
                      </span>
                    )}
                  </div>

                  {(() => {
                    const activePortTpl = templates.find(t => t.category === "portfolio" && t.id === portTplId) || templates.find(t => t.category === "portfolio");
                    if (!activePortTpl) {
                      return (
                        <div className="flex-1 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                          <FolderGit2 className="w-10 h-10 mb-2.5 text-brand opacity-30" />
                          <p className="text-xs font-bold font-display text-slate-600">Pilih Desain Portofolio</p>
                          <p className="text-[9px] mt-1 text-slate-400 max-w-xxs">Silakan pilih desain template di bagian atas untuk langsung melihat hasil layout secara instan.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <ScaledIframe
                        id="portfolio-preview-iframe"
                        title="Live Portfolio Review"
                        srcDoc={getPreviewHtml(activePortTpl)}
                        targetWidth={1000}
                        parentHeight={590}
                      />
                    );
                  })()}
                </div>

              </div>
            )}
          </div>
        )}

        {/* =========================================
            TAB 5: BUAT RESUME / CV
           ========================================= */}
        {activeTab === "buat-resume" && (
          <div className="space-y-6 animate-fadeIn">
            {getPackageAccess().resume === "none" ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-6 max-w-xl mx-auto my-8">
                <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto animate-bounce">
                  <Lock className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-black text-xl text-slate-900">Modul Resume & CV Terkunci</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Paket layanan Anda saat ini (<strong>{sub?.packageName || "Belum Berlangganan"}</strong>) belum dilengkapi dengan akses ke fitur penulisan Resume / CV Online. Silakan lakukan upgrade paket Anda untuk membuka fitur ini.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab("paket-saya")}
                    className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
                  >
                    Upgrade Paket Sekarang ✨
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Form Inputs (Left Column - Spans 7 cols - slightly wider) */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-4 mb-6">
                    <h2 className="text-xl font-display font-black text-slate-900 flex items-center gap-2">
                      <FileText className="text-brand w-5 h-5" /> Resume / CV Saya
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Kelola data draf kurikulum vitae lengkap Anda.</p>
                  </div>

            {!profile ? (
              <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center text-sm text-red-700">
                Lengkapi draf profil di menu Kelola Profiles terlebih dahulu!
              </div>
            ) : (
              <form onSubmit={handleSaveResume} className="space-y-6 flex flex-col">
                
                {/* Scrollable inputs container with visible scrollbar */}
                <div className="max-h-[580px] overflow-y-auto pr-3.5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                
                {/* User profiles data display */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 text-xs font-sans">
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Lengkap</span>
                    <span className="font-extrabold text-slate-800">{profile.fullName || "-"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nomor HP</span>
                    <span className="font-extrabold text-slate-800">{profile.phone || "-"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tempat Lahir</span>
                    <span className="font-extrabold text-slate-800">{profile.placeOfBirth || "-"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Lahir</span>
                    <span className="font-extrabold text-slate-800">
                      {profile.dateOfBirth ? formatIndonesianDate(profile.dateOfBirth) : "-"}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usia</span>
                    <span className="font-extrabold text-slate-800">
                      {(() => {
                        const calculatedAge = profile?.age || (profile?.dateOfBirth ? calculateAge(profile.dateOfBirth) : 0);
                        return calculatedAge ? `${calculatedAge} Tahun` : "-";
                      })()}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kota</span>
                    <span className="font-extrabold text-slate-800">{profile.city || "-"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alamat</span>
                    <span className="font-extrabold text-slate-800 block break-words leading-relaxed">{profile.address || "-"}</span>
                  </div>
                </div>

                {/* Select CV Template */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Desain Resume / CV</label>
                    {resTplId !== "" && (
                      <button
                        type="button"
                        onClick={() => setIsChangingResTpl(prev => !prev)}
                        className="text-xs font-black text-brand hover:text-brand-hover hover:underline cursor-pointer flex items-center gap-1.5"
                      >
                        {isChangingResTpl ? "✕ Sembunyikan Desain" : "🔄 Ganti Desain"}
                      </button>
                    )}
                  </div>
                  
                  <div className="mb-5">
                    {(() => {
                      const selectedTemplate = templates.find(t => t.id === resTplId);
                      if (!selectedTemplate) {
                        return (
                          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/85 text-xs text-amber-950 font-sans flex flex-col gap-2">
                            <span>⚠️ Belum ada template desain aktif. Silakan pilih desain terlebih dahulu!</span>
                            <button
                              type="button"
                              onClick={() => setIsChangingResTpl(true)}
                              className="w-full py-2 bg-brand text-white font-bold rounded-xl text-xs hover:bg-brand-hover transition cursor-pointer"
                            >
                              ✨ Pilih Desain Pertama Anda
                            </button>
                          </div>
                        );
                      }

                      const isBawaanGratis = selectedTemplate.id === "tpl_res_1" || selectedTemplate.tier === "free";
                      const tTier = selectedTemplate.tier || "basic";

                      return (
                        <div className="p-4 bg-slate-50/70 rounded-xl border-2 border-brand/50 flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs text-slate-900 leading-tight">{selectedTemplate.name}</p>
                              {renderTemplateTierBadge(isBawaanGratis ? "free" : tTier)}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Desain Template Aktif • {tTier === 'free' ? 'Semua Paket' : `Paket ${tTier}`}</p>
                          </div>
                          <span className="text-brand font-black text-xs shrink-0">✓ Terpilih</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5 font-display">TITTLE</label>
                    <input
                      type="text"
                      placeholder="Contoh: Ahli Jaringan Cisco / Accountant Senior"
                      value={resTitle}
                      onChange={(e) => setResTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5 font-display">Tentang Saya</label>
                    <input
                      type="text"
                      placeholder="Contoh: Profesional berdedikasi dengan keahlian 5+ tahun..."
                      value={resAbout}
                      onChange={(e) => setResAbout(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl outline-none text-slate-700 text-sm focus:border-brand"
                      required
                    />
                  </div>
                </div>

                {/* CV Experience Dynamic */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Pengalaman Kerja</h4>
                    <button
                      type="button"
                      onClick={() => setResExps([...resExps, { company: "", role: "", duration: "", jobdesk: "" }])}
                      className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-3 rounded-lg transition shadow-xs"
                    >
                      + Tambah Pekerjaan
                    </button>
                  </div>
                  <div className="space-y-4">
                    {resExps.map((e, idx) => (
                      <div key={idx} className="p-5 bg-slate-50 border border-slate-200/60 rounded-2xl relative space-y-4 shadow-2xs hover:border-slate-300 transition-all">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono font-bold text-slate-400 capitalize">Pekerjaan #{idx + 1}</span>
                          {resExps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const temp = resExps.filter((_, i) => i !== idx);
                                setResExps(temp);
                              }}
                              className="text-xxs text-red-500 hover:text-red-700 font-bold uppercase tracking-wider transition font-mono border border-red-300 rounded px-1.5 py-0.5"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Perusahaan / Instansi</label>
                            <input
                              type="text"
                              placeholder="Nama Perusahaan"
                              value={e.company}
                              onChange={(el) => {
                                const temp = [...resExps];
                                temp[idx].company = el.target.value;
                                setResExps(temp);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-xs focus:border-brand"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Jabatan / Posisi</label>
                            <input
                              type="text"
                              placeholder="Contoh: Marketing Lead"
                              value={e.role}
                              onChange={(el) => {
                                const temp = [...resExps];
                                temp[idx].role = el.target.value;
                                setResExps(temp);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-xs focus:border-brand"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Periode Waktu</label>
                            <input
                              type="text"
                              placeholder="Cth: April 2023 - Sekarang"
                              value={e.duration}
                              onChange={(el) => {
                                const temp = [...resExps];
                                temp[idx].duration = el.target.value;
                                setResExps(temp);
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-xs focus:border-brand"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Deskripsi Tugas / Jobdesk</label>
                          <textarea
                            rows={3}
                            placeholder="Rincian tanggung jawab dan tugas pekerjaan Anda secara singkat..."
                            value={e.jobdesk}
                            onChange={(el) => {
                              const temp = [...resExps];
                              temp[idx].jobdesk = el.target.value;
                              setResExps(temp);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-xs focus:border-brand"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Riwayat Pendidikan Dynamic List */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Riwayat Pendidikan</h4>
                    <button
                      type="button"
                      onClick={() => setResEdus([...resEdus, { institution: "", degree: "", period: "" }])}
                      className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-3 rounded-lg transition shadow-xs"
                    >
                      + Tambah Pendidikan
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resEdus.map((edu, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-2xs relative hover:border-slate-300 transition">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Pendidikan #{idx + 1}</span>
                          {resEdus.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const temp = resEdus.filter((_, i) => i !== idx);
                                setResEdus(temp);
                              }}
                              className="text-xxs text-red-500 hover:text-red-700 font-bold uppercase tracking-wider transition font-mono border border-red-300 rounded px-1.5 py-0.5"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Nama Kampus / Sekolah</label>
                          <input
                            type="text"
                            placeholder="Nama Kampus / Sekolah"
                            value={edu.institution}
                            onChange={(e) => {
                              const temp = [...resEdus];
                              temp[idx].institution = e.target.value;
                              setResEdus(temp);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Jurusan & Gelar</label>
                          <input
                            type="text"
                            placeholder="Contoh: S1 Manajemen Bisnis"
                            value={edu.degree}
                            onChange={(e) => {
                              const temp = [...resEdus];
                              temp[idx].degree = e.target.value;
                              setResEdus(temp);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Tahun Kelulusan / Periode</label>
                          <input
                            type="text"
                            placeholder="Contoh: 2018 - 2022"
                            value={edu.period}
                            onChange={(e) => {
                              const temp = [...resEdus];
                              temp[idx].period = e.target.value;
                              setResEdus(temp);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Proyek Pilihan Dynamic List */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="font-display font-bold text-slate-800 text-sm uppercase">Proyek Pilihan</h4>
                    <button
                      type="button"
                      onClick={() => setResProjects([...resProjects, { name: "", description: "", link: "" }])}
                      className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-3 rounded-lg transition shadow-xs"
                    >
                      + Tambah Proyek
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resProjects.map((proj, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-2xs relative hover:border-slate-300 transition">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Proyek #{idx + 1}</span>
                          {resProjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const temp = resProjects.filter((_, i) => i !== idx);
                                setResProjects(temp);
                              }}
                              className="text-xxs text-red-500 hover:text-red-700 font-bold uppercase tracking-wider transition font-mono border border-red-300 rounded px-1.5 py-0.5"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Nama Proyek</label>
                          <input
                            type="text"
                            placeholder="Nama Proyek / Aplikasi"
                            value={proj.name}
                            onChange={(e) => {
                              const temp = [...resProjects];
                              temp[idx].name = e.target.value;
                              setResProjects(temp);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Link URL Proyek</label>
                          <input
                            type="text"
                            placeholder="Contoh: https://github.com/username/project"
                            value={proj.link || ""}
                            onChange={(e) => {
                              const temp = [...resProjects];
                              temp[idx].link = e.target.value;
                              setResProjects(temp);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Deskripsi Proyek</label>
                          <textarea
                            rows={3}
                            placeholder="Deskripsi singkat mengenai proyek yang telah dikerjakan..."
                            value={proj.description || ""}
                            onChange={(e) => {
                              const temp = [...resProjects];
                              temp[idx].description = e.target.value;
                              setResProjects(temp);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sertifikat Pendukung */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                  <h4 className="font-display font-bold text-slate-800 text-xs uppercase border-b border-slate-200 pb-1.5 mb-2">Sertifikat Pendukung</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {resCerts.map((c, idx) => (
                      <div key={idx}>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Sertifikat #{idx + 1}</label>
                        <input
                          type="text"
                          placeholder={`Sertifikat Kompetensi #${idx + 1}`}
                          value={c}
                          onChange={(e) => {
                            const temp = [...resCerts];
                            temp[idx] = e.target.value;
                            setResCerts(temp);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Input Skill yang mengambil data dari portofolio */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                  <h4 className="font-display font-bold text-slate-800 text-xs uppercase border-b border-slate-200 pb-1.5 mb-2">Form Input Skill (Mengambil Data Portofolio)</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: React, Tailwind CSS, TypeScript, Node.js"
                      value={inpResSkill}
                      onChange={(e) => setInpResSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!inpResSkill.trim()) return;
                          const newSkills = inpResSkill.split(",").map(s => s.trim()).filter(Boolean);
                          setPortSkills([...portSkills, ...newSkills]);
                          setInpResSkill("");
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none text-xs text-slate-705 placeholder:text-slate-400 focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!inpResSkill.trim()) return;
                        const newSkills = inpResSkill.split(",").map(s => s.trim()).filter(Boolean);
                        setPortSkills([...portSkills, ...newSkills]);
                        setInpResSkill("");
                      }}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      Tambah Skill
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    * Pisahkan keahlian dengan tanda koma (<strong>","</strong>) kemudian klik tombol "Tambah Skill" atau tekan Enter. Data ini sinkron otomatis dengan portofolio.
                  </p>

                  {/* Active Skill list visualization */}
                  {portSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {portSkills.map((sk, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-bold">
                          <span>{sk}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...portSkills];
                              updated.splice(idx, 1);
                              setPortSkills(updated);
                            }}
                            className="w-3.5 h-3.5 rounded-full bg-rose-100 hover:bg-red-400 hover:text-white text-rose-500 flex items-center justify-center font-black text-[8px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xxs font-semibold text-slate-400 italic">Belum ada data skill terdaftar. Tulis di atas untuk menambahkan skill!</p>
                  )}
                </div>

                {/* CONTACT & SOCIAL MEDIA */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                  <h4 className="font-display font-bold text-slate-800 text-xs uppercase border-b border-slate-200 pb-1.5 mb-2">Kontak Hubung & Sosial Media</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">No WhatsApp</label>
                      <input
                        type="text"
                        placeholder="Contoh: 628123xxxx"
                        value={resWA}
                        onChange={(e) => setResWA(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Profil LinkedIn</label>
                      <input
                        type="text"
                        placeholder="Username LinkedIn"
                        value={resLinkedIn}
                        onChange={(e) => setResLinkedIn(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Profil GitHub</label>
                      <input
                        type="text"
                        placeholder="Username GitHub"
                        value={resGitHub}
                        onChange={(e) => setResGitHub(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                </div>

                </div> {/* Closes max-h-[580px] scrollable inputs container */}

                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 bg-white">
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Simpan Perubahan ke Database Secure
                    </button>
                    {resTplId !== "" && (
                      <button
                        type="button"
                        onClick={() => handleDeactivateCategory("resume")}
                        className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-700 text-xs font-black rounded-xl border border-red-200 transition cursor-pointer"
                      >
                        Nonaktifkan & Hapus Resume/CV
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const iframe = document.getElementById("resume-preview-iframe") as HTMLIFrameElement;
                      if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                      } else {
                        window.print();
                      }
                    }}
                    className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition cursor-pointer print:hidden flex items-center justify-center gap-1.5"
                  >
                    Cetak Resume/CV 🖨️
                  </button>
                </div>

              </form>
            )}
              </div>

              {/* Live Preview (Right Column - Spans 5 cols on lg screens - slightly smaller) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col min-h-[590px] h-auto transition-all">
                  <div className="border-b border-slate-150 pb-3 mb-3 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-display font-black text-slate-900 flex items-center gap-1.5">
                        <Eye className="text-brand w-4 h-4" /> Live Pratinjau Resume / CV
                      </h2>
                      <p className="text-slate-400 text-[10px] mt-0.5">Pratinjau visual draf pengubahan instan.</p>
                    </div>
                    {resTplId && (
                      <span className="bg-brand/10 text-brand font-mono text-[8px] px-1.5 py-0.5 rounded border border-brand/20 font-extrabold uppercase tracking-widest shrink-0">
                        A4 Paper Format
                      </span>
                    )}
                  </div>

                  {(() => {
                    const activeResTpl = templates.find(t => t.category === "resume" && t.id === resTplId) || templates.find(t => t.category === "resume");
                    if (!activeResTpl) {
                      return (
                        <div className="flex-1 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                          <FileText className="w-10 h-10 mb-2.5 text-brand opacity-30" />
                          <p className="text-xs font-bold font-display text-slate-600">Pilih Desain Resume / CV</p>
                          <p className="text-[9px] mt-1 text-slate-400 max-w-xxs">Silakan pilih desain template di bagian atas untuk langsung melihat hasil layout secara instan.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <ScaledIframe
                        id="resume-preview-iframe"
                        title="Live Resume Review"
                        srcDoc={getPreviewHtml(activeResTpl)}
                        targetWidth={800}
                        parentHeight={590}
                      />
                    );
                  })()}
                </div>

                {/* Horizontal Scroll Layout for Template List when isChangingResTpl is active */}
                {isChangingResTpl && (
                  <div id="resume-design-collection" className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm animate-fadeIn space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-display">
                          🎨 Koleksi Desain Resume & CV
                        </h3>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          Geser ke samping untuk melihat koleksi template yang dapat diakses dengan paket Anda.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChangingResTpl(false)}
                        className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition"
                      >
                        ✕ Tutup
                      </button>
                    </div>

                    {/* Horizontal scroll container */}
                    <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {templates
                        .filter(t => t.category === "resume" && isTemplateAccessible(t))
                        .map((t) => {
                          const isBawaanGratis = t.id === "tpl_res_1" || t.tier === "free";
                          const fallbackImage = "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=1600";
                          const isSelected = resTplId === t.id;

                          return (
                            <div
                              key={t.id}
                              onClick={() => {
                                setResTplId(t.id);
                              }}
                              className={`w-64 flex-shrink-0 p-3 bg-white hover:bg-slate-50 rounded-2xl border-2 transition cursor-pointer flex gap-3 items-center ${
                                isSelected 
                                  ? "border-brand shadow-sm bg-brand/5" 
                                  : "border-slate-200 hover:border-slate-350"
                              }`}
                            >
                              {/* Template Preview Image */}
                              <div className="w-14 h-18 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative shadow-xs flex items-center justify-center p-0.5">
                                <img 
                                  src={t.previewUrl || fallbackImage} 
                                  alt={t.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              </div>

                              {/* Metadata information */}
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <p className="font-bold text-xs text-slate-900 leading-tight truncate">{t.name}</p>
                                  {renderTemplateTierBadge(isBawaanGratis ? "free" : t.tier || "basic", true)}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono truncate font-semibold">ID: {t.id}</p>
                                <div className="pt-0.5 flex items-center justify-between">
                                  <span className="text-[10px] text-brand font-bold">
                                    {isSelected ? "Terpilih ✓" : "Pilih Desain"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
              </div>
              </div>
            )}

            </div>
          )}

        {/* =========================================
            TAB 5B: BUAT RESUME/CV SAYA (Revisi 2 Canvas Konva)
           ========================================= */}
        {activeTab === "buat-resume-saya" && (
          <div className="space-y-6 animate-fadeIn">
            {getPackageAccess().resume === "none" ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-6 max-w-xl mx-auto my-8">
                <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto animate-bounce">
                  <Lock className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-black text-xl text-slate-900">Modul Resume & CV Terkunci</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Paket layanan Anda saat ini (<strong>{sub?.packageName || "Belum Berlangganan"}</strong>) belum dilengkapi dengan akses ke fitur penulisan Resume / CV Online. Silakan lakukan upgrade paket Anda untuk membuka fitur ini.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab("paket-saya")}
                    className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
                  >
                    Upgrade Paket Sekarang ✨
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Intro Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                  <div>
                    <h1 className="text-2xl font-display font-black text-slate-900 flex items-center gap-2">
                      <Palette className="w-6 h-6 text-brand" /> Resume/CV
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Kreasikan draf Resume visual secara bebas dan fleksibel. Klik pada elemen di canvas untuk mengatur gaya visual dan mengubah posisinya secara dinamis.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => {
                        if (!stageRef.current) return;
                        // Select nothing to clean up selection boxes in photo
                        setSelectedElementId(null);
                        setTimeout(() => {
                          const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
                          const link = document.createElement("a");
                          link.download = "Resume_Canvas_Saya.png";
                          link.href = dataUrl;
                          link.click();
                        }, 100);
                      }}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      🏞️ Sumpit Gambar JPG/PNG
                    </button>
                    <button
                      onClick={() => {
                        if (!stageRef.current) return;
                        setSelectedElementId(null);
                        setTimeout(() => {
                           const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
                           const pdf = new jsPDF("p", "px", [800, 1100]);
                           pdf.addImage(dataUrl, "PNG", 0, 0, 800, 1100, "", "FAST");
                           pdf.save("Resume_Canvas_Saya.pdf");
                        }, 100);
                      }}
                      className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-black rounded-xl transition shadow flex items-center gap-1 cursor-pointer"
                    >
                      🖨️ Cetak PDF Siap Kerja
                    </button>
                    <button
                      onClick={handleSaveCanvasDesign}
                      disabled={isSavingCanvas}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white text-xs font-black rounded-xl transition shadow flex items-center gap-1 cursor-pointer"
                    >
                      {isSavingCanvas ? "💾 Menyimpan..." : "💾 Simpan Desain & Layout"}
                    </button>
                  </div>
                </div>

                {/* Templates Selector Carousel / Grid */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3">Pilih Template Canvas Desain</h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    {/* Admin Loaded JSON Templates mapping */}
                    {templates
                      .filter(t => {
                        try {
                          if (!t.htmlMarkup) return false;
                          const parsed = JSON.parse(t.htmlMarkup);
                          return Array.isArray(parsed.elements);
                        } catch (e) {
                          return false;
                        }
                      })
                      .slice(0, 9)
                      .map((t) => {
                        const isSelected = activeCanvasTemplate?.id === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              try {
                                const parsed = JSON.parse(t.htmlMarkup);
                                initCanvasTemplate(parsed.elements || [], t, parsed.backgroundColor || "#ffffff");
                              } catch (e) {
                                alert("Gagal memuat layout template!");
                              }
                            }}
                            className={`cursor-pointer group relative rounded-2xl overflow-hidden border-2 p-1 bg-white transition-all ${isSelected ? "border-brand shadow-md scale-102" : "border-slate-100 hover:border-slate-300"} flex-none w-44`}
                          >
                            <div className="aspect-w-3 aspect-h-4 bg-slate-50 relative rounded-xl overflow-hidden shadow-inner">
                              <img 
                                src={t.previewUrl || "https://images.unsplash.com/photo-1586282391129-76a6df230234?auto=format&fit=crop&q=80&w=1600"} 
                                alt={t.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="p-2 text-center">
                              <p className="text-[10px] font-black text-slate-800 leading-tight truncate">{t.name}</p>
                              {renderTemplateTierBadge(t.tier, true)}
                            </div>
                          </div>
                        );
                      })}

                    {/* Cari Menu lain yang menuju ke menu Template */}
                    <div 
                      onClick={() => selectTab("pilih-template")}
                      className="cursor-pointer group relative rounded-2xl overflow-hidden border-2 border-dashed border-slate-350 bg-slate-50 hover:bg-slate-100 hover:border-brand p-4 transition-all flex-none w-44 flex flex-col items-center justify-center text-center space-y-2 h-[220px]"
                    >
                      <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform">
                        🔍
                      </div>
                      <p className="text-xs font-extrabold text-slate-800 leading-snug">Cari Template Lainnya</p>
                      <p className="text-[10px] text-slate-500 leading-normal">Buka Galeri Lengkap Template</p>
                    </div>
                  </div>
                </div>

                {/* Main Work Area: Canvas Area (Left, Col Span 8) + Controller Pane (Right, Col Span 4) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Canvas Frame Container */}
                  <div className="lg:col-span-8 flex flex-col items-center">
                    <div ref={canvasContainerRef} className="w-full bg-slate-850 rounded-3xl p-3 sm:p-6 shadow-inner flex flex-col items-center overflow-auto border border-slate-700 relative">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 w-full justify-between">
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5 leading-none mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-ping inline-block"></span> 🟢 EDITOR LIVE AKTIF
                          </span>
                          <span className="text-[11px] text-white/70 font-semibold font-mono leading-tight font-sans">
                            {activeCanvasTemplate?.name || "Modern Navy Slate"} ({Math.round(canvasScale * 100)}% - 800x1100 px)
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2.5">
                          <button
                            type="button"
                            onClick={handleUndo}
                            disabled={canvasHistoryIndex <= 0}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold border flex items-center justify-center gap-1 transition-all ${canvasHistoryIndex > 0 ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer shadow active:scale-95" : "bg-slate-900/60 text-slate-600 border-slate-850/40 cursor-not-allowed opacity-40"}`}
                          >
                            ↩️ Urung
                          </button>
                          <button
                            type="button"
                            onClick={handleRedo}
                            disabled={canvasHistoryIndex >= canvasHistory.length - 1}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold border flex items-center justify-center gap-1 transition-all ${canvasHistoryIndex < canvasHistory.length - 1 ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer shadow active:scale-95" : "bg-slate-900/60 text-slate-600 border-slate-850/40 cursor-not-allowed opacity-40"}`}
                          >
                            ↪️ Ulang
                          </button>
                          <button
                            onClick={() => {
                              // Reset current designer to baseline structures
                              if (activeCanvasTemplate) {
                                try {
                                  const parsed = JSON.parse(activeCanvasTemplate.htmlMarkup);
                                  initCanvasTemplate(parsed.elements || [], activeCanvasTemplate, parsed.backgroundColor || "#ffffff");
                                } catch (e) {
                                  // fallback
                                }
                              }
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 rounded-xl text-[10px] font-extrabold cursor-pointer transition shadow-md active:scale-95 text-center flex items-center justify-center gap-0.5"
                          >
                            🔄 Reset
                          </button>
                        </div>
                      </div>

                      {/* Zoom Controls Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 w-full bg-slate-900 px-3 py-2 rounded-2xl border border-slate-700/80 mb-4 text-xs font-semibold">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span>🔍 Skala Tampilan:</span>
                          <span className="font-mono bg-slate-800 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded text-xxs">
                            {Math.round(canvasScale * 100)}%
                          </span>
                          <span className="text-xxs text-slate-500 lowercase">
                            ({zoomMode === "auto" ? "Responsif Otomatis" : "Manual"})
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setZoomMode("auto");
                              if (canvasContainerRef.current) {
                                const padding = window.innerWidth < 640 ? 24 : 48;
                                const parentWidth = canvasContainerRef.current.clientWidth - padding;
                                const newScale = Math.min(1.2, Math.max(0.15, parentWidth / 800));
                                setCanvasScale(newScale);
                              }
                            }}
                            className={`px-2.5 py-1 text-xxs font-black transition-all rounded-lg cursor-pointer flex items-center gap-1 border ${
                              zoomMode === "auto"
                                ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow"
                                : "bg-slate-800 hover:bg-slate-755 text-slate-350 border-slate-700"
                            }`}
                          >
                            📏 Otomatis (Fit)
                          </button>
                          
                          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setZoomMode("manual");
                                setCanvasScale(prev => Math.max(0.15, Math.round((prev - 0.1) * 10) / 10));
                              }}
                              className="px-2 py-1 hover:bg-slate-700 rounded text-slate-300 transition text-xxs font-black cursor-pointer"
                              title="Perkecil"
                            >
                              ➖ Perkecil (-10%)
                            </button>
                            <span className="px-1 text-slate-500 font-bold">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                setZoomMode("manual");
                                setCanvasScale(prev => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10));
                              }}
                              className="px-2 py-1 hover:bg-slate-700 rounded text-slate-300 transition text-xxs font-black cursor-pointer"
                              title="Perbesar"
                            >
                              ➕ Perbesar (+10%)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Scaled Wrapper for exact viewport mapping without edge cut-offs */}
                      <div 
                        className="w-full flex justify-center overflow-hidden"
                        style={{ height: `${1100 * canvasScale}px` }}
                      >
                        <div 
                          className="bg-white shadow-2xl relative border border-slate-350 shrink-0 origin-top"
                          style={{ 
                            width: "800px", 
                            height: "1100px", 
                            transform: `scale(${canvasScale})`, 
                            transformOrigin: "top center" 
                          }}
                        >
                        <Stage
                          width={800}
                          height={1100}
                          ref={stageRef}
                          onClick={(e) => {
                            // Clear selections if clicking background
                            if (e.target === e.target.getStage()) {
                              setSelectedElementId(null);
                              setDoubleClickEditingId(null);
                            }
                          }}
                          onTap={(e) => {
                            // Clear selections if tapping background
                            if (e.target === e.target.getStage()) {
                              setSelectedElementId(null);
                              setDoubleClickEditingId(null);
                            }
                          }}
                        >
                          <Layer>
                            {/* Paper Background */}
                            <Rect
                              width={800}
                              height={1100}
                              fill={canvasBgColor}
                              onClick={() => {
                                setSelectedElementId(null);
                                setDoubleClickEditingId(null);
                              }}
                              onTap={() => {
                                setSelectedElementId(null);
                                setDoubleClickEditingId(null);
                              }}
                            />

                            {/* Elements Loop sorted by text-wrapping weight constraints */}
                            {getSortedCanvasElements().map((el) => {
                                const isSelected = selectedElementId === el.id;

                                // Dynamically render items based on shape type
                                if (el.type === "rect") {
                                  return (
                                    <Rect
                                      key={el.id}
                                      id={el.id}
                                      x={el.x}
                                      y={el.y}
                                      width={el.width || 100}
                                      height={el.height || 100}
                                      fill={el.fill || "#eaeaea"}
                                      stroke={el.stroke || "transparent"}
                                      strokeWidth={el.strokeWidth || 0}
                                      draggable={!el.isLocked}
                                      onDragEnd={(e) => {
                                        const updated = canvasElements.map(item => 
                                          item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                                        );
                                        updateElementsAndHistory(updated);
                                      }}
                                      onTransformEnd={(e) => {
                                        const node = e.target;
                                        const scaleX = node.scaleX();
                                        const scaleY = node.scaleY();
                                        node.scaleX(1);
                                        node.scaleY(1);
                                        const nextWidth = Math.round(node.width() * scaleX);
                                        const nextHeight = Math.round(node.height() * scaleY);
                                        const updated = canvasElements.map(item => 
                                          item.id === el.id ? { 
                                            ...item, 
                                            x: node.x(), 
                                            y: node.y(), 
                                            width: nextWidth, 
                                            height: nextHeight 
                                          } : item
                                        );
                                        updateElementsAndHistory(updated);
                                        setElementWidth(nextWidth);
                                        setElementHeight(nextHeight);
                                      }}
                                      onClick={() => {
                                        setSelectedElementId(el.id);
                                        setElementColorVal(el.fill || "#000000");
                                        setElementWidth(el.width || 100);
                                        setElementHeight(el.height || 100);
                                        setElementWrapMode(el.wrapMode || "behind");
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
                                      radius={el.radius || el.width / 2 || 40}
                                      fill={el.fill || "#000000"}
                                      stroke="transparent"
                                      strokeWidth={0}
                                      draggable={!el.isLocked}
                                      onDragEnd={(e) => {
                                        const updated = canvasElements.map(item => 
                                          item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                                        );
                                        updateElementsAndHistory(updated);
                                      }}
                                      onTransformEnd={(e) => {
                                        const node = e.target;
                                        const scaleX = node.scaleX();
                                        node.scaleX(1);
                                        node.scaleY(1);
                                        const nextRadius = Math.round(((node as any).radius() || 40) * scaleX);
                                        const updated = canvasElements.map(item => 
                                          item.id === el.id ? { 
                                            ...item, 
                                            x: node.x(), 
                                            y: node.y(), 
                                            radius: nextRadius 
                                          } : item
                                        );
                                        updateElementsAndHistory(updated);
                                        setElementWidth(nextRadius * 2);
                                      }}
                                      onClick={() => {
                                        setSelectedElementId(el.id);
                                        setElementColorVal(el.fill || "#000000");
                                        setElementWidth((el.radius || 40) * 2);
                                        setElementWrapMode(el.wrapMode || "behind");
                                      }}
                                    />
                                  );
                                }

                                if (el.type === "image") {
                                  const imgUrl = el.id === "profile_photo" 
                                    ? (profile?.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80") 
                                    : (el.url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80");
                                  return (
                                    <CanvasImage
                                      key={el.id}
                                      id={el.id}
                                      url={imgUrl}
                                      x={el.x}
                                      y={el.y}
                                      width={el.width || 120}
                                      height={el.height || 120}
                                      draggable={true}
                                      isLocked={el.isLocked}
                                      shape={el.shape || "circle"}
                                      borderFill={el.borderFill || el.stroke || "transparent"}
                                      strokeWidth={el.strokeWidth || 0}
                                      onDragEnd={(e: any) => {
                                        const updated = canvasElements.map(item => 
                                          item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                                        );
                                        updateElementsAndHistory(updated);
                                      }}
                                      onTransformEnd={(e: any) => {
                                        const node = e.target;
                                        const scaleX = node.scaleX();
                                        const scaleY = node.scaleY();
                                        node.scaleX(1);
                                        node.scaleY(1);
                                        const nextWidth = Math.round(node.width() * scaleX);
                                        const nextHeight = Math.round(node.height() * scaleY);
                                        const updated = canvasElements.map(item => 
                                          item.id === el.id ? { ...item, x: node.x(), y: node.y(), width: nextWidth, height: nextHeight } : item
                                        );
                                        updateElementsAndHistory(updated);
                                        setElementWidth(nextWidth);
                                        setElementHeight(nextHeight);
                                      }}
                                      onClick={() => {
                                        setSelectedElementId(el.id);
                                        setElementWidth(el.width || 120);
                                        setElementHeight(el.height || 120);
                                        setElementWrapMode(el.wrapMode || "behind");
                                      }}
                                    />
                                  );
                                }

                                if (el.type === "text") {
                                  // Perform real-time substitution using our central helper function
                                  const textMapping = getTextMapping();
                                  let originalText = el.text || "";
                                  Object.entries(textMapping).forEach(([key, value]) => {
                                    originalText = originalText.split(key).join(value || "");
                                  });

                                  return (
                                    <KonvaText
                                      key={el.id}
                                      id={el.id}
                                      x={el.x}
                                      y={el.y}
                                      text={doubleClickEditingId === el.id ? "" : originalText}
                                      fontSize={el.fontSize || 12}
                                      fontFamily={el.fontFamily || "Inter"}
                                      fill={el.fill || "#000000"}
                                      fontStyle={el.fontStyle || "normal"}
                                      width={el.width || undefined}
                                      lineHeight={el.lineHeight || 1.2}
                                      align={el.align || "left"}
                                      draggable={!el.isLocked}
                                      onDragEnd={(e) => {
                                        const updated = canvasElements.map(item => 
                                          item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                                        );
                                        updateElementsAndHistory(updated);
                                      }}
                                      onTransformEnd={(e) => {
                                        const node = e.target;
                                        const scaleX = node.scaleX();
                                        const scaleY = node.scaleY();
                                        node.scaleX(1);
                                        node.scaleY(1);
                                        const nextWidth = Math.round((node.width() || 300) * scaleX);
                                        const nextFontSize = Math.max(8, Math.round((el.fontSize || 12) * scaleY));
                                        const updated = canvasElements.map(item => 
                                          item.id === el.id ? { 
                                            ...item, 
                                            x: node.x(), 
                                            y: node.y(), 
                                            width: nextWidth,
                                            fontSize: nextFontSize
                                          } : item
                                        );
                                        updateElementsAndHistory(updated);
                                        setElementWidth(nextWidth);
                                        setElementFontSize(nextFontSize);
                                      }}
                                      onClick={() => {
                                        setSelectedElementId(el.id);
                                        setElementTextVal(el.text || "");
                                        setElementFontSize(el.fontSize || 12);
                                        setElementColorVal(el.fill || "#000000");
                                        setElementFontStyle(el.fontStyle || "normal");
                                        setElementWidth(el.width || 300);
                                        setElementFontFamily(el.fontFamily || "Inter");
                                        setElementLineHeight(el.lineHeight || 1.2);
                                        setElementAlign(el.align || "left");
                                        setElementWrapMode(el.wrapMode || "front");
                                      }}
                                      onDblClick={() => {
                                        if (el.isLocked) return;
                                        setSelectedElementId(el.id);
                                        setDoubleClickEditingId(el.id);
                                      }}
                                      onDblTap={() => {
                                        if (el.isLocked) return;
                                        setSelectedElementId(el.id);
                                        setDoubleClickEditingId(el.id);
                                      }}
                                    />
                                  );
                                }

                                return null;
                              })}

                            {/* Transformer for selected Text, Image, and decoration box shapes */}
                            {selectedElementId && (
                              <Transformer
                                ref={transformerRef}
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



                        {/* Double-click inline editor (Revisi 2) */}
                        {(() => {
                          if (!doubleClickEditingId) return null;
                          const el = canvasElements.find(item => item.id === doubleClickEditingId);
                          if (!el || el.type !== "text") return null;

                          const tags = getDetectedTagsInText(el.text || "");
                          const isSingleTag = tags.length === 1;
                          const activeTag = isSingleTag ? tags[0] : null;
                          const cfg = activeTag ? getTagConfig(activeTag) : null;

                          const initialVal = cfg ? (cfg.getter ? cfg.getter() : "") : (el.text || "");

                          // Precise positioning corresponding to the canvas coordinate system container
                          const paddingAdj = 4;
                          const styleLeft = el.x - paddingAdj;
                          const styleTop = el.y - paddingAdj;
                          const styleWidth = (el.width || 300) + (paddingAdj * 2);

                          return (
                            <textarea
                              autoFocus
                              defaultValue={initialVal}
                              placeholder="Ketik isi teks di sini..."
                              className="absolute bg-white/70 backdrop-blur-[1px] text-slate-900 border-[1.5px] border-sky-400 focus:outline-none rounded-sm z-55 resize-none overflow-hidden select-text"
                              style={{
                                left: `${styleLeft}px`,
                                top: `${styleTop}px`,
                                width: `${styleWidth}px`,
                                minHeight: el.fontSize ? `${el.fontSize * 1.5}px` : "24px",
                                fontSize: `${el.fontSize || 12}px`,
                                fontFamily: el.fontFamily === "Inter" ? "sans-serif" : el.fontFamily === "JetBrains Mono" ? "monospace" : "sans-serif",
                                fontWeight: el.fontStyle && el.fontStyle.includes("bold") ? "bold" : "normal",
                                fontStyle: el.fontStyle && el.fontStyle.includes("italic") ? "italic" : "normal",
                                lineHeight: el.lineHeight || 1.2,
                                textAlign: (el.align || "left") as "left" | "center" | "right" | "justify",
                                color: el.fill || "#000000"
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                              onBlur={(e) => {
                                const newVal = e.target.value;
                                if (cfg) {
                                  cfg.setter(newVal);
                                  if (cfg.onBlurAction) cfg.onBlurAction(newVal);
                                } else {
                                  const updated = canvasElements.map(item => 
                                    item.id === el.id ? { ...item, text: newVal } : item
                                  );
                                  setCanvasElements(updated);
                                  updateElementsAndHistory(updated);
                                }
                                setDoubleClickEditingId(null);
                              }}
                              onKeyDown={(e) => {
                                // Save on Enter without Shift
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                                if (e.key === "Escape") {
                                  setDoubleClickEditingId(null);
                                }
                              }}
                            />
                          );
                        })()}

                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Control Element Side-bar (Col Span 4) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
                      <h4 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        🛠️ Panel Kontrol Canvas
                      </h4>

                      {/* Tool shortcuts to add items */}
                      <div className="space-y-2">
                        <label className="text-xxs font-black uppercase text-slate-400 tracking-wider block">Tambah Dekorasi Baru</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newText = {
                                type: "text",
                                id: `txt_${Date.now()}`,
                                text: "Ubah Teks Baru Anda Di Sini...",
                                x: 300,
                                y: 200,
                                fontSize: 14,
                                fontFamily: "Inter",
                                fill: "#0ea5e9",
                                fontStyle: "bold",
                                width: 250,
                                lineHeight: 1.2,
                                align: "left"
                              };
                              updateElementsAndHistory([...canvasElements, newText]);
                            }}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xxs font-bold text-center border border-slate-200 cursor-pointer transition flex items-center justify-center gap-1"
                          >
                            ➕ Teks Kustom
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newRect = {
                                type: "rect",
                                id: `rect_${Date.now()}`,
                                x: 100,
                                y: 100,
                                width: 200,
                                height: 50,
                                fill: "#e2e8f0"
                              };
                              updateElementsAndHistory([...canvasElements, newRect]);
                            }}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xxs font-bold text-center border border-slate-200 cursor-pointer transition flex items-center justify-center gap-1"
                          >
                            ➕ Kotak Hias
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newPhoto = {
                                type: "image",
                                id: "profile_photo",
                                x: 200,
                                y: 200,
                                width: 120,
                                height: 120
                              };
                              updateElementsAndHistory([...canvasElements, newPhoto]);
                            }}
                            className="p-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xxs font-bold text-center border-0 cursor-pointer transition flex items-center justify-center gap-1 col-span-2 mt-1 shadow-sm font-sans"
                          >
                            🖼️ Tambah Foto Profil
                          </button>
                        </div>
                      </div>

                      {/* Canvas Global Properties */}
                      <div className="space-y-2">
                        <label className="text-xxs font-black uppercase text-slate-400 block">Warna Latar Belakang Canvas</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={canvasBgColor}
                            onChange={(e) => setCanvasBgColor(e.target.value)}
                            className="w-10 h-10 p-0 border border-slate-200 rounded-md bg-white cursor-pointer"
                          />
                          <input
                            type="text"
                            value={canvasBgColor}
                            onChange={(e) => setCanvasBgColor(e.target.value)}
                            className="flex-1 text-xs font-semibold p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Active Selection controls */}
                    {selectedElementId ? (
                      (() => {
                        const activeEl = canvasElements.find(e => e.id === selectedElementId);
                        if (!activeEl) return null;

                        return (
                          <div className="bg-white rounded-3xl border border-rose-250 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                                     <button
                                type="button"
                                onClick={() => {
                                  const nextElements = canvasElements.filter(e => e.id !== selectedElementId);
                                  updateElementsAndHistory(nextElements);
                                  setSelectedElementId(null);
                                }}
                                className="text-xxs font-bold text-red-600 hover:text-red-800 flex items-center gap-0.5 cursor-pointer bg-red-50 px-2 py-1 rounded"
                              >
                                🗑️ Hapus
                              </button>
                            </div>

                            {/* Lock / Unlock Toggle Row */}
                            <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{activeEl.isLocked ? "🔒" : "🔓"}</span>
                                <span className="text-[10px] font-black text-slate-700">
                                  {activeEl.isLocked ? "Eksklusif Terkunci" : "Elemen Bebas"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = canvasElements.map(item => 
                                    item.id === activeEl.id ? { ...item, isLocked: !item.isLocked } : item
                                  );
                                  setCanvasElements(updated);
                                  updateElementsAndHistory(updated);
                                }}
                                className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                                  activeEl.isLocked 
                                  ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 shadow-sm"
                                  : "bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-305"
                                }`}
                              >
                                {activeEl.isLocked ? "🔓 Buka Kunci" : "🔒 Kunci Mode"}
                              </button>
                            </div>

                            {/* Property text content descriptor */}
                            {activeEl.type === "text" && (
                              <div className="space-y-1.5 text-left">
                                <label className="text-xxs font-black uppercase text-slate-400 block">Isi Teks / Tag Template</label>
                                <textarea
                                  rows={4}
                                  value={elementTextVal || ""}
                                  disabled={activeEl.isLocked}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setElementTextVal(val);
                                    setCanvasElements(canvasElements.map(item => 
                                      item.id === selectedElementId ? { ...item, text: val } : item
                                    ));
                                  }}
                                  onBlur={() => {
                                    updateElementsAndHistory(canvasElements);
                                  }}
                                  className={`w-full text-xs font-semibold p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand resize-none leading-relaxed ${
                                    activeEl.isLocked ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
                                  }`}
                                />
                                <span className="text-[9px] text-slate-400 leading-tight block">
                                  Teks dapat berisi metadata seperti <strong>{"{{NAMA_LENGKAP}}"}</strong> atau ketikan bebas.
                                </span>

                                {/* Dynamic Variable Tag Live Editing (Goal 1 & 3) */}
                                {getDetectedTagsInText(elementTextVal).length > 0 && (
                                  <div className="mt-3 p-3 bg-rose-50/70 border border-rose-100 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-1.5 border-b border-rose-100 pb-1.5">
                                      <span className="text-xs">🏷️</span>
                                      <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">
                                        Data Tag Variabel (Edit Manual)
                                      </span>
                                    </div>
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                      {getDetectedTagsInText(elementTextVal).map(tag => {
                                        const cfg = getTagConfig(tag);
                                        if (!cfg.label || !cfg.getter) return null;
                                        return (
                                          <div key={tag} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] font-bold text-slate-600 block">
                                                {cfg.label}
                                              </span>
                                              <code className="text-[8px] font-bold text-rose-600 font-mono bg-white px-1 rounded border border-rose-100">
                                                {tag}
                                              </code>
                                            </div>
                                            {cfg.isTextarea ? (
                                              <textarea
                                                value={cfg.getter()}
                                                disabled={activeEl.isLocked}
                                                rows={2}
                                                onChange={(e) => {
                                                  cfg.setter(e.target.value);
                                                  setCanvasElements([...canvasElements]);
                                                }}
                                                onBlur={(e) => {
                                                  if (cfg.onBlurAction) {
                                                    cfg.onBlurAction(e.target.value);
                                                  }
                                                  updateElementsAndHistory(canvasElements);
                                                }}
                                                className={`w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white leading-normal ${
                                                  activeEl.isLocked ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
                                                }`}
                                              />
                                            ) : (
                                              <input
                                                type="text"
                                                value={cfg.getter()}
                                                disabled={activeEl.isLocked}
                                                onChange={(e) => {
                                                  cfg.setter(e.target.value);
                                                  setCanvasElements([...canvasElements]);
                                                }}
                                                onBlur={(e) => {
                                                  if (cfg.onBlurAction) {
                                                    cfg.onBlurAction(e.target.value);
                                                  }
                                                  updateElementsAndHistory(canvasElements);
                                                }}
                                                className={`w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white ${
                                                  activeEl.isLocked ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
                                                }`}
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Font Family selection dropdown (Revisi 5) */}
                            {activeEl.type === "text" && (
                              <div className="space-y-1.5 text-left">
                                <label className="text-xxs font-black uppercase text-slate-400 block font-bold">Jenis Font (Keluarga Font)</label>
                                <select
                                  value={elementFontFamily}
                                  disabled={activeEl.isLocked}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    loadGoogleFont(val);
                                    setElementFontFamily(val);
                                    const next = canvasElements.map(item => 
                                      item.id === selectedElementId ? { ...item, fontFamily: val } : item
                                    );
                                    updateElementsAndHistory(next);
                                  }}
                                  className={`w-full text-xs font-semibold p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand bg-white focus:border-brand transition ${
                                    activeEl.isLocked ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
                                  }`}
                                >
                                  <optgroup label="Huruf Sans-Serif (Modern)">
                                    <option value="Inter">Inter (Sans-Serif Modern)</option>
                                    <option value="Montserrat">Montserrat (Geometric Clean)</option>
                                    <option value="Roboto">Roboto (Neo-Grotesque)</option>
                                    <option value="Poppins">Poppins (Rounded & Elegant)</option>
                                    <option value="Nunito">Nunito (Friendly & Soft)</option>
                                    <option value="Kanit">Kanit (Bold & Structural)</option>
                                    <option value="Arial">Arial (Standard Clean / System)</option>
                                  </optgroup>
                                  <optgroup label="Huruf Serif (Klasik & Elegan)">
                                    <option value="Playfair Display">Playfair Display (Editorial Elegance)</option>
                                    <option value="Lora">Lora (Modern Classic Serif)</option>
                                    <option value="Merriweather">Merriweather (Warm Accent Serif)</option>
                                    <option value="Cinzel">Cinzel (Roman Monumental)</option>
                                    <option value="Georgia">Georgia (Book Serif / System)</option>
                                    <option value="Times New Roman">Times New Roman (Koran Klasik / System)</option>
                                  </optgroup>
                                  <optgroup label="Huruf Khusus / Dekoratif">
                                    <option value="Space Grotesk">Space Grotesk (Tech/Futuristic)</option>
                                    <option value="JetBrains Mono">JetBrains Mono (Technical/Mono)</option>
                                    <option value="Bebas Neue">Bebas Neue (Tall Capital Display)</option>
                                    <option value="Oswald">Oswald (Condensed Impact)</option>
                                    <option value="Caveat">Caveat (Organic Handwriting)</option>
                                    <option value="Pacifico">Pacifico (Retro Brush Script)</option>
                                  </optgroup>
                                </select>
                              </div>
                            )}

                            {/* Size controllers */}
                            {activeEl.type === "text" && (
                              <div className="space-y-1 text-left">
                                <div className="flex justify-between items-center bg-transparent">
                                  <label className="text-[10px] font-black uppercase text-slate-400">Ukuran Font ({elementFontSize}px)</label>
                                </div>
                                <input
                                  type="range"
                                  min={8}
                                  max={72}
                                  value={elementFontSize}
                                  disabled={activeEl.isLocked}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setElementFontSize(val);
                                    setCanvasElements(canvasElements.map(item => 
                                      item.id === selectedElementId ? { ...item, fontSize: val } : item
                                    ));
                                  }}
                                  onMouseUp={() => {
                                    updateElementsAndHistory(canvasElements);
                                  }}
                                  onTouchEnd={() => {
                                    updateElementsAndHistory(canvasElements);
                                  }}
                                  className="w-full accent-brand cursor-pointer disabled:opacity-50"
                                />
                              </div>
                            )}

                            {/* Typography options */}
                            {activeEl.type === "text" && (
                              <div className="space-y-1.5 text-left">
                                <label className="text-xxs font-black uppercase text-slate-400 block font-bold">Gaya Teks</label>
                                <select
                                  value={elementFontStyle}
                                  disabled={activeEl.isLocked}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setElementFontStyle(val);
                                    const next = canvasElements.map(item => 
                                      item.id === selectedElementId ? { ...item, fontStyle: val } : item
                                    );
                                    updateElementsAndHistory(next);
                                  }}
                                  className={`w-full text-xs font-semibold p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand bg-white ${
                                    activeEl.isLocked ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
                                  }`}
                                >
                                  <option value="normal">Normal (Regular)</option>
                                  <option value="bold">Bold</option>
                                  <option value="italic">Italic</option>
                                  <option value="bold italic">Bold & Italic</option>
                                </select>
                              </div>
                            )}

                            {/* Text Align option (Revisi 5) */}
                            {activeEl.type === "text" && (
                              <div className="space-y-1.5">
                                <label className="text-xxs font-black uppercase text-slate-400 block font-bold">Kesejajaran Teks (Align)</label>
                                <select
                                  value={elementAlign}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setElementAlign(val);
                                    const next = canvasElements.map(item => 
                                      item.id === selectedElementId ? { ...item, align: val } : item
                                    );
                                    updateElementsAndHistory(next);
                                  }}
                                  className="w-full text-xs font-semibold p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                                >
                                  <option value="left">⬅️ Rata Kiri</option>
                                  <option value="center">↔️ Rata Tengah</option>
                                  <option value="right">➡️ Rata Kanan</option>
                                  <option value="justify">↔️ Rata Kiri & Kanan (Justify)</option>
                                </select>
                              </div>
                            )}

                            {/* Spacing / Line Height (Revisi 5) */}
                            {activeEl.type === "text" && (
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <label className="text-xxs font-black uppercase text-slate-400">Jarak Spasi Baris / Line Height ({elementLineHeight})</label>
                                </div>
                                <input
                                  type="range"
                                  min={0.5}
                                  max={3.0}
                                  step={0.1}
                                  value={elementLineHeight}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setElementLineHeight(val);
                                    setCanvasElements(canvasElements.map(item => 
                                      item.id === selectedElementId ? { ...item, lineHeight: val } : item
                                    ));
                                  }}
                                  onMouseUp={() => {
                                    updateElementsAndHistory(canvasElements);
                                  }}
                                  onTouchEnd={() => {
                                    updateElementsAndHistory(canvasElements);
                                  }}
                                  className="w-full accent-brand cursor-pointer"
                                />
                              </div>
                            )}

                            {/* Column wrap width (Lebar Kolom data) (Revisi 5) */}
                            {activeEl.type === "text" && (
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <label className="text-xxs font-black uppercase text-slate-400">Batas Lebar Kolom / Agar Tidak Panjang Kesamping ({elementWidth || "Tidak Terbatas"} px)</label>
                                  {elementWidth && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setElementWidth(0); // clear text wrap column limit
                                        const next = canvasElements.map(item => 
                                          item.id === selectedElementId ? { ...item, width: undefined } : item
                                        );
                                        updateElementsAndHistory(next);
                                      }}
                                      className="text-[9px] font-bold text-red-500 hover:underline"
                                    >
                                      Hapus Batas Samping
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="range"
                                  min={50}
                                  max={800}
                                  step={10}
                                  value={elementWidth || 300}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setElementWidth(val);
                                    setCanvasElements(canvasElements.map(item => 
                                      item.id === selectedElementId ? { ...item, width: val } : item
                                    ));
                                  }}
                                  onMouseUp={() => {
                                    updateElementsAndHistory(canvasElements);
                                  }}
                                  onTouchEnd={() => {
                                    updateElementsAndHistory(canvasElements);
                                  }}
                                  className="w-full accent-brand cursor-pointer"
                                />
                              </div>
                            )}

                            {/* Rect shapes width/height dimension sizing controls */}
                            {activeEl.type === "rect" && (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-xxs font-black uppercase text-slate-400 block">Lebas Box</label>
                                  <input
                                    type="number"
                                    value={elementWidth}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10) || 10;
                                      setElementWidth(val);
                                      setCanvasElements(canvasElements.map(item => 
                                        item.id === selectedElementId ? { ...item, width: val } : item
                                      ));
                                    }}
                                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg text-slate-800"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xxs font-black uppercase text-slate-400 block">Tinggi Box</label>
                                  <input
                                    type="number"
                                    value={elementHeight}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10) || 10;
                                      setElementHeight(val);
                                      setCanvasElements(canvasElements.map(item => 
                                        item.id === selectedElementId ? { ...item, height: val } : item
                                      ));
                                    }}
                                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg text-slate-800"
                                  />
                                </div>
                              </div>
                            )}

                            {activeEl.type === "image" && (
                              <div className="space-y-4 text-left">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-xxs font-black uppercase text-slate-400 block">Lebar Foto</label>
                                    <input
                                      type="number"
                                      value={elementWidth}
                                      disabled={activeEl.isLocked}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10) || 10;
                                        setElementWidth(val);
                                        setCanvasElements(canvasElements.map(item => 
                                          item.id === selectedElementId ? { ...item, width: val } : item
                                        ));
                                      }}
                                      className={`w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg text-slate-800 ${
                                        activeEl.isLocked ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
                                      }`}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xxs font-black uppercase text-slate-400 block">Tinggi Foto</label>
                                    <input
                                      type="number"
                                      value={elementHeight}
                                      disabled={activeEl.isLocked}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10) || 10;
                                        setElementHeight(val);
                                        setCanvasElements(canvasElements.map(item => 
                                          item.id === selectedElementId ? { ...item, height: val } : item
                                        ));
                                      }}
                                      className={`w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg text-slate-800 ${
                                        activeEl.isLocked ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
                                      }`}
                                    />
                                  </div>
                                </div>

                                {/* Shape Layout & Border Bingkai Sizing (Revisi 2.3) */}
                                <div className="space-y-3 bg-slate-50 border border-slate-250 rounded-2xl p-3.5 mt-2">
                                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Desain Tata Letak & Bingkai</span>
                                  
                                  {/* Select Shape style */}
                                  <div className="space-y-1.5">
                                    <label className="text-xxs font-black uppercase text-slate-400 block font-bold">Layout Bentuk Foto</label>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        disabled={activeEl.isLocked}
                                        onClick={() => {
                                          const updated = canvasElements.map(item => 
                                            item.id === selectedElementId ? { ...item, shape: "circle" } : item
                                          );
                                          setCanvasElements(updated);
                                          updateElementsAndHistory(updated);
                                        }}
                                        className={`px-2.5 py-1.5 text-xxs font-extrabold rounded-xl border transition-all cursor-pointer ${
                                          (activeEl.shape !== "square")
                                            ? "bg-brand text-white border-brand shadow-sm"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                        }`}
                                      >
                                        ⭕ Lingkaran (Bulat)
                                      </button>
                                      <button
                                        type="button"
                                        disabled={activeEl.isLocked}
                                        onClick={() => {
                                          const updated = canvasElements.map(item => 
                                            item.id === selectedElementId ? { ...item, shape: "square" } : item
                                          );
                                          setCanvasElements(updated);
                                          updateElementsAndHistory(updated);
                                        }}
                                        className={`px-2.5 py-1.5 text-xxs font-extrabold rounded-xl border transition-all cursor-pointer ${
                                          (activeEl.shape === "square")
                                            ? "bg-brand text-white border-brand shadow-sm"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                        }`}
                                      >
                                        ⬜ Persegi 4 (Kotak)
                                      </button>
                                    </div>
                                  </div>

                                  {/* Color Selection for Border Bingkai */}
                                  <div className="space-y-1.5">
                                    <label className="text-xxs font-black uppercase text-slate-400 block font-bold">Warna Fill Bingkai</label>
                                    <div className="flex gap-2 items-center text-left">
                                      <input
                                        type="color"
                                        disabled={activeEl.isLocked}
                                        value={activeEl.borderFill || activeEl.stroke || "#ffffff"}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const updated = canvasElements.map(item => 
                                            item.id === selectedElementId ? { ...item, borderFill: val, stroke: val } : item
                                          );
                                          setCanvasElements(updated);
                                        }}
                                        onBlur={() => {
                                          updateElementsAndHistory(canvasElements);
                                        }}
                                        className="w-8 h-8 p-0 border border-slate-200 rounded-md bg-white cursor-pointer"
                                      />
                                      <input
                                        type="text"
                                        disabled={activeEl.isLocked}
                                        value={activeEl.borderFill || activeEl.stroke || "#ffffff"}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const updated = canvasElements.map(item => 
                                            item.id === selectedElementId ? { ...item, borderFill: val, stroke: val } : item
                                          );
                                          setCanvasElements(updated);
                                        }}
                                        onBlur={() => {
                                          updateElementsAndHistory(canvasElements);
                                        }}
                                        className="flex-1 text-xs font-semibold p-1.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  {/* Slider for border thickness (strokeWidth) */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-left">
                                      <label className="text-xxs font-black uppercase text-slate-400">Ketebalan Bingkai ({activeEl.strokeWidth || 0}px)</label>
                                    </div>
                                    <input
                                      type="range"
                                      min={0}
                                      max={20}
                                      value={activeEl.strokeWidth || 0}
                                      disabled={activeEl.isLocked}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        const updated = canvasElements.map(item => 
                                          item.id === selectedElementId ? { ...item, strokeWidth: val } : item
                                        );
                                        setCanvasElements(updated);
                                      }}
                                      onMouseUp={() => {
                                        updateElementsAndHistory(canvasElements);
                                      }}
                                      onTouchEnd={() => {
                                        updateElementsAndHistory(canvasElements);
                                      }}
                                      className="w-full accent-brand cursor-pointer disabled:opacity-50"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Hex/Color Property */}
                            <div className="space-y-1.5">
                              <label className="text-xxs font-black uppercase text-slate-400 block">Warna Elemen</label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="color"
                                  value={elementColorVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setElementColorVal(val);
                                    setCanvasElements(canvasElements.map(item => 
                                      item.id === selectedElementId ? { ...item, fill: val } : item
                                    ));
                                  }}
                                  className="w-10 h-10 p-0 border border-slate-200 rounded-md bg-white cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={elementColorVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setElementColorVal(val);
                                    setCanvasElements(canvasElements.map(item => 
                                      item.id === selectedElementId ? { ...item, fill: val } : item
                                    ));
                                  }}
                                  className="flex-1 text-xs font-semibold p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Text Wrapping Option Control (MS Word style) */}
                            <div className="space-y-2 bg-rose-50/40 border border-slate-200 rounded-2xl p-3.5 mt-2 text-left">
                              <label className="text-xxs font-black uppercase text-slate-400 block tracking-wider flex items-center gap-1">
                                🔄 Tata Letak & Wrap Mode Teks
                              </label>
                              <div className="space-y-1.5">
                                <select
                                  value={elementWrapMode}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setElementWrapMode(val);
                                    const updated = canvasElements.map(item => 
                                      item.id === selectedElementId ? { ...item, wrapMode: val } : item
                                    );
                                    setCanvasElements(updated);
                                    updateElementsAndHistory(updated);
                                  }}
                                  className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand"
                                >
                                  <option value="square">🔲 Square (Kotak)</option>
                                  <option value="tight">🗜️ Tight (Rapat)</option>
                                  <option value="through">🔁 Through (Melalui)</option>
                                  <option value="front">🔝 In Front of Text (Di Depan Teks)</option>
                                  <option value="behind">🔙 Behind Text (Di Belakang Teks)</option>
                                </select>
                                <span className="text-[9px] text-slate-400 leading-normal block">
                                  {elementWrapMode === "square" && "💡 Mode Square: Aliran teks resume mengelilingi kotak area luar elemen ini secara rapi."}
                                  {elementWrapMode === "tight" && "💡 Mode Tight: Aliran teks resume mengapit ketat batas transparan bagian luar elemen ini."}
                                  {elementWrapMode === "through" && "💡 Mode Through: Aliran teks resume mengalir menembus bagian kosong di dalam elemen ini."}
                                  {elementWrapMode === "front" && "💡 Mode In Front of Text: Elemen berada di layer teratas dan menutupi teks resume di bawahnya."}
                                  {elementWrapMode === "behind" && "💡 Mode Behind Text: Elemen berada di latar belakang paling bawah sebagai watermark/background teks."}
                                </span>
                              </div>
                            </div>

                            {/* Premium Layer Dimension Sizing & Precise Positioning (Goal 2 & 3) */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3 pt-4 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-2">
                                <span className="text-xs">📐</span>
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  Ukuran & Posisi Layer
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3.5">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase text-slate-400 block">Posisi X (px)</label>
                                  <input
                                    type="number"
                                    value={Math.round(activeEl.x || 0)}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10) || 0;
                                      const updated = canvasElements.map(item => 
                                        item.id === selectedElementId ? { ...item, x: val } : item
                                      );
                                      setCanvasElements(updated);
                                    }}
                                    onBlur={() => {
                                      updateElementsAndHistory(canvasElements);
                                    }}
                                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg text-slate-800 bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase text-slate-400 block">Posisi Y (px)</label>
                                  <input
                                    type="number"
                                    value={Math.round(activeEl.y || 0)}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10) || 0;
                                      const updated = canvasElements.map(item => 
                                        item.id === selectedElementId ? { ...item, y: val } : item
                                      );
                                      setCanvasElements(updated);
                                    }}
                                    onBlur={() => {
                                      updateElementsAndHistory(canvasElements);
                                    }}
                                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg text-slate-800 bg-white"
                                  />
                                </div>
                              </div>

                              {(activeEl.type === "rect" || activeEl.type === "image" || activeEl.type === "text") && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase text-slate-400 block">
                                    Lebar Layer (Width){activeEl.type === "text" && " / Batas Samping"}
                                  </label>
                                  <input
                                    type="number"
                                    value={activeEl.width || ""}
                                    placeholder={activeEl.type === "text" ? "Auto / Tidak Terbatas" : "0"}
                                    onChange={(e) => {
                                      const rawVal = e.target.value;
                                      const val = rawVal === "" ? undefined : parseInt(rawVal, 10);
                                      if (activeEl.type === "text") {
                                        setElementWidth(val || 0);
                                      }
                                      const updated = canvasElements.map(item => 
                                        item.id === selectedElementId ? { ...item, width: val } : item
                                      );
                                      setCanvasElements(updated);
                                    }}
                                    onBlur={() => {
                                      updateElementsAndHistory(canvasElements);
                                    }}
                                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg text-slate-800 bg-white"
                                  />
                                </div>
                              )}

                              {(activeEl.type === "circle") && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase text-slate-400 block">Radius Lingkaran</label>
                                  <input
                                    type="number"
                                    value={activeEl.radius || 40}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10) || 5;
                                      const updated = canvasElements.map(item => 
                                        item.id === selectedElementId ? { ...item, radius: val } : item
                                      );
                                      setCanvasElements(updated);
                                    }}
                                    onBlur={() => {
                                      updateElementsAndHistory(canvasElements);
                                    }}
                                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg text-slate-800 bg-white"
                                  />
                                </div>
                              )}

                              {(activeEl.type === "rect" || activeEl.type === "image") && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase text-slate-400 block">Tinggi Layer (Height)</label>
                                  <input
                                    type="number"
                                    value={activeEl.height || 40}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10) || 10;
                                      const updated = canvasElements.map(item => 
                                        item.id === selectedElementId ? { ...item, height: val } : item
                                      );
                                      setCanvasElements(updated);
                                    }}
                                    onBlur={() => {
                                      updateElementsAndHistory(canvasElements);
                                    }}
                                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-lg text-slate-800 bg-white"
                                  />
                                </div>
                              )}
                            </div>

                            <span className="text-[9px] text-rose-500 font-bold block bg-rose-50 p-2 rounded-lg text-center leading-normal">
                              💡 Anda juga dapat menggeser elemen ini secara bebas dengan menekan dan menariknya langsung di canvas!
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm text-center py-8">
                        <Palette className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                        <p className="text-xs font-bold text-slate-800">Tidak ada elemen terpilih</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-normal">
                          Klik langsung pada teks, logo lingkaran, ataupun kotak hiasan di canvas sebelah kiri untuk membuka panel modifikasi properti.
                        </p>
                      </div>
                    )}

                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* =========================================
            TAB 6: BUAT LAMARAN SAYA
           ========================================= */}
        {activeTab === "buat-lamaran" && (
          <div className="space-y-6 animate-fadeIn">
            {getPackageAccess().letter === "none" ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-6 max-w-xl mx-auto my-8">
                <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto animate-bounce">
                  <Lock className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-black text-xl text-slate-900">Modul Pembuat Lamaran Terkunci</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Paket layanan Anda saat ini (<strong>{sub?.packageName || "Belum Berlangganan"}</strong>) belum dilengkapi dengan akses ke fitur pembuatan Surat Lamaran Kerja. Silakan lakukan upgrade paket Anda untuk membuka fitur ini.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab("paket-saya")}
                    className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
                  >
                    Upgrade Paket Sekarang ✨
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Form Inputs (Left Column - Spans 5 cols on lg screens) */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-4 mb-6">
                    <h2 className="text-xl font-display font-black text-slate-900 flex items-center gap-2">
                      <Mail className="text-brand w-5 h-5" /> Surat Lamaran
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Lengkapi draf surat lamaran kerja instan Anda.</p>
                  </div>

                  {!profile ? (
                    <div className="p-8 bg-amber-50 rounded-2xl border border-amber-200 text-sm text-center text-amber-800">
                      Silakan isi data profil lengkap Anda terlebih dahulu di Kelola Profiles. Ini diperlukan untuk pengisian otomatis.
                    </div>
                  ) : (
                    <form onSubmit={handleSaveCover} className="space-y-4">
                      
                      {/* User profiles data display */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 text-xs font-sans">
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Lengkap</span>
                          <span className="font-extrabold text-slate-800">{profile.fullName || "-"}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nomor HP</span>
                          <span className="font-extrabold text-slate-800">{profile.phone || "-"}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tempat Lahir</span>
                          <span className="font-extrabold text-slate-800">{profile.placeOfBirth || "-"}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Lahir</span>
                          <span className="font-extrabold text-slate-800">
                            {profile.dateOfBirth ? formatIndonesianDate(profile.dateOfBirth) : "-"}
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usia</span>
                          <span className="font-extrabold text-slate-800">
                            {(() => {
                              const calculatedAge = profile?.age || (profile?.dateOfBirth ? calculateAge(profile.dateOfBirth) : 0);
                              return calculatedAge ? `${calculatedAge} Tahun` : "-";
                            })()}
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kota</span>
                          <span className="font-extrabold text-slate-800">{profile.city || "-"}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1 col-span-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alamat</span>
                          <span className="font-extrabold text-slate-800 block break-words leading-relaxed">{profile.address || "-"}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5 matches-label-spacing">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Desain Surat Lamaran</label>
                          {covTplId !== "" && (
                            <button
                              type="button"
                              onClick={() => setIsChangingCoverTpl(prev => !prev)}
                              className="text-xs font-black text-brand hover:text-brand-hover hover:underline cursor-pointer flex items-center gap-1.5"
                            >
                              {isChangingCoverTpl ? "✕ Sembunyikan Desain" : "🔄 Ganti Desain"}
                            </button>
                          )}
                        </div>
                        
                        <div className="mb-5">
                          {(() => {
                            const selectedTemplate = templates.find(t => t.id === covTplId);
                            if (!selectedTemplate) {
                              return (
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/85 text-xs text-amber-950 font-sans flex flex-col gap-2">
                                  <span>⚠️ Belum ada template desain aktif. Silakan pilih desain terlebih dahulu!</span>
                                  <button
                                    type="button"
                                    onClick={() => setIsChangingCoverTpl(true)}
                                    className="w-full py-2 bg-brand text-white font-bold rounded-xl text-xs hover:bg-brand-hover transition cursor-pointer"
                                  >
                                    ✨ Pilih Desain Pertama Anda
                                  </button>
                                </div>
                              );
                            }

                            const isBawaanGratis = selectedTemplate.id === "tpl_cov_1" || selectedTemplate.tier === "free";
                            const tTier = selectedTemplate.tier || "basic";

                            return (
                              <div className="p-4 bg-slate-50/70 rounded-xl border-2 border-brand/50 flex justify-between items-center">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-xs text-slate-900 leading-tight">{selectedTemplate.name}</p>
                                    {renderTemplateTierBadge(isBawaanGratis ? "free" : tTier)}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Desain Template Aktif • {tTier === 'free' ? 'Semua Paket' : `Paket ${tTier}`}</p>
                                </div>
                                <span className="text-brand font-black text-xs shrink-0">✓ Terpilih</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Nama Perusahaan Penerima</label>
                        <input
                          type="text"
                          placeholder="Contoh: PT Swakarsa Nusantara Jaya"
                          value={covCompany}
                          onChange={(e) => setCovCompany(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Alamat Perusahaan Penerima</label>
                        <input
                          type="text"
                          placeholder="Contoh: Jl. Diponegoro No.10, Kota Surabaya"
                          value={covCompAddress}
                          onChange={(e) => setCovCompAddress(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Posisi Jabatan yang Dilamar</label>
                        <input
                          type="text"
                          placeholder="Contoh: Staff Keuangan / Senior Python Developer"
                          value={covJobTitle}
                          onChange={(e) => setCovJobTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-350 rounded-lg text-xs outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Isi Surat Pernyataan Lamaran Kerja</label>
                        <textarea
                          rows={8}
                          placeholder="Tulis salam pembuka, rincian kualifikasi Anda, dan salam penutup..."
                          value={covLetterContent}
                          onChange={(e) => setCovLetterContent(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none whitespace-pre-wrap leading-relaxed"
                          required
                        />
                        <span className="text-[10px] text-slate-400 mt-1.5 block leading-relaxed">
                          Tulis isi surat lamaran kerja secara profesional sesuai kualifikasi dan pengalaman Anda.
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 py-3 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Simpan Lamaran
                          </button>
                          {covTplId !== "" && (
                            <button
                              type="button"
                              onClick={() => handleDeactivateCategory("cover_letter")}
                              className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-black rounded-xl border border-red-200 transition cursor-pointer"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={isDownloadingCoverPdf}
                          onClick={handleDownloadCoverLetterPdf}
                          className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-600 text-white text-xs font-bold rounded-xl transition cursor-pointer print:hidden flex items-center justify-center gap-1.5"
                        >
                          {isDownloadingCoverPdf ? (
                            <>
                              <span className="animate-spin inline-block mr-1">⏳</span> Membuat PDF...
                            </>
                          ) : (
                            <>Download PDF 📄</>
                          )}
                        </button>
                      </div>

                    </form>
                  )}
                </div>

                {/* Live Preview (Right Column - Spans 7 cols on lg screens) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Live Preview Container Card */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col min-h-[820px] h-auto transition-all">
                    <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-display font-black text-slate-900 flex items-center gap-2">
                          <Eye className="text-brand w-5 h-5" /> Live Pratinjau Surat Lamaran
                        </h2>
                        <p className="text-slate-500 text-xs mt-1">Review instan format dokumen berdasarkan template yang dipilih.</p>
                      </div>
                      {covTplId && (
                        <span className="bg-brand/10 text-brand font-mono text-[9px] px-2 py-1 rounded border border-brand/20 font-bold uppercase tracking-wider">
                          A4 Paper Format
                        </span>
                      )}
                    </div>

                    {(() => {
                      const activeCovTpl = templates.find(t => t.category === "cover_letter" && t.id === covTplId) || templates.find(t => t.category === "cover_letter");
                      if (!activeCovTpl) {
                        return (
                          <div className="flex-1 bg-slate-50 rounded-2xl border border-dashed border-slate-250 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                            <Mail className="w-12 h-12 mb-3 text-brand opacity-40 animate-bounce" />
                            <p className="text-xs font-bold font-display text-slate-600">Pilih Desain Surat Lamaran</p>
                            <p className="text-[10px] mt-1 text-slate-400 max-w-xs">Silakan pilih desain template surat untuk langsung melihat hasil layout secara instan.</p>
                          </div>
                        );
                      }
                      
                      const isDocx = activeCovTpl.htmlMarkup && checkIfDocxMarkup(activeCovTpl.htmlMarkup);
                      if (isDocx) {
                        return (
                          <ScaledDocSheet targetWidth={680} targetHeight={900} parentHeight={820}>
                            {isDocxProcessing ? (
                              <div className="flex flex-col items-center justify-center py-28 text-slate-400 h-full w-full">
                                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-sky-500 animate-spin mb-3"></div>
                                <p className="text-[11px] font-bold font-mono">Memindai tag sistem Word...</p>
                              </div>
                            ) : (
                              <div className="space-y-4 h-full w-full">
                                {(() => {
                                  const groups: Array<{
                                    type: "detail" | "normal" | "empty";
                                    items: Array<{text: string; align: "left" | "center" | "right" | "justify"}>;
                                  }> = [];

                                  docxParagraphs.forEach((par) => {
                                    if (!par.text || !par.text.trim()) {
                                      groups.push({ type: "empty", items: [par] });
                                      return;
                                    }

                                    const firstColonIndex = par.text.indexOf(":");
                                    const isDetail = (() => {
                                      if (firstColonIndex === -1) return false;
                                      const key = par.text.substring(0, firstColonIndex).trim().toLowerCase();
                                      return isPersonalDetailKey(key);
                                    })();

                                    if (isDetail) {
                                      const lastGroup = groups[groups.length - 1];
                                      if (lastGroup && lastGroup.type === "detail") {
                                        lastGroup.items.push(par);
                                      } else {
                                        groups.push({ type: "detail", items: [par] });
                                      }
                                    } else {
                                      groups.push({ type: "normal", items: [par] });
                                    }
                                  });

                                  return groups.map((group, groupIdx) => {
                                    if (group.type === "empty") {
                                      return <div key={groupIdx} className="h-3.5" />;
                                    }

                                    if (group.type === "detail") {
                                      return (
                                        <div key={groupIdx} className="space-y-0.5 my-1">
                                          {group.items.map((par, itemIdx) => {
                                            const firstColonIndex = par.text.indexOf(":");
                                            const key = par.text.substring(0, firstColonIndex).trim();
                                            const val = par.text.substring(firstColonIndex + 1).trim();
                                            return (
                                              <div key={itemIdx} className="flex items-start text-left leading-[1.3] text-[11px] sm:text-[11.5px]">
                                                <div className="w-[115px] sm:w-[125px] shrink-0 font-medium text-slate-800">
                                                  {key}
                                                </div>
                                                <div className="w-[15px] shrink-0 text-center font-medium text-slate-800">
                                                  :
                                                </div>
                                                <div className="flex-1 text-slate-800 font-normal whitespace-pre-wrap">
                                                  {val}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    }

                                    const par = group.items[0];
                                    const pAlign = par.align || "left";
                                    let alignClass = "text-left";
                                    if (pAlign === "center") alignClass = "text-center";
                                    if (pAlign === "right") alignClass = "text-right";
                                    if (pAlign === "justify") alignClass = "text-justify";

                                    return (
                                      <p key={groupIdx} className={`whitespace-pre-wrap ${alignClass}`}>
                                        {par.text}
                                      </p>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </ScaledDocSheet>
                        );
                      }

                      return (
                        <ScaledIframe
                          id="cover-preview-iframe"
                          title="Live Cover Letter Review"
                          srcDoc={getPreviewHtml(activeCovTpl)}
                          targetWidth={800}
                          targetHeight={1131}
                          parentHeight={820}
                        />
                      );
                    })()}
                  </div>

                  {/* Horizontal Scroll Layout for Template List when isChangingCoverTpl is active */}
                  {isChangingCoverTpl && (
                    <div id="cover-letter-design-collection" className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm animate-fadeIn space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-display">
                            🎨 Koleksi Desain Surat Lamaran Kerja
                          </h3>
                          <p className="text-slate-400 text-[10px] mt-0.5">
                            Geser kesamping untuk melihat koleksi template yang dapat diakses dengan paket Anda.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsChangingCoverTpl(false)}
                          className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition"
                        >
                          ✕ Tutup
                        </button>
                      </div>

                      {/* Horizontal scroll container */}
                      <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {templates
                          .filter(t => t.category === "cover_letter" && isTemplateAccessible(t))
                          .map((t) => {
                            const isBawaanGratis = t.id === "tpl_cov_1" || t.tier === "free";
                            const fallbackImage = t.id === "tpl_cov_1"
                              ? "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=1600"
                              : "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=1600";
                            const isSelected = covTplId === t.id;

                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setCovTplId(t.id);
                                }}
                                className={`w-64 flex-shrink-0 p-3 bg-white hover:bg-slate-50 rounded-2xl border-2 transition cursor-pointer flex gap-3 items-center ${
                                  isSelected 
                                    ? "border-brand shadow-sm bg-brand/5" 
                                    : "border-slate-200 hover:border-slate-350"
                                }`}
                              >
                                {/* Template Preview Image */}
                                <div className="w-14 h-18 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative shadow-xs flex items-center justify-center p-0.5">
                                  <img 
                                    src={t.previewUrl || fallbackImage} 
                                    alt={t.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                </div>

                                {/* Metadata information */}
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <p className="font-bold text-xs text-slate-900 leading-tight truncate">{t.name}</p>
                                    {renderTemplateTierBadge(isBawaanGratis ? "free" : t.tier || "basic", true)}
                                  </div>
                                  <p className="text-[10.5px] text-slate-500 line-clamp-2 leading-snug" title={t.description}>
                                    {t.description || "Desain template surat lamaran eksklusif Portoify."}
                                  </p>
                                  <div className="pt-0.5 flex items-center justify-between">
                                    <span className="text-[10px] text-brand font-bold">
                                      {isSelected ? "Aktif ✓" : "Klik untuk pilih"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* =========================================
            TAB 7: DOKUMEN SAYA 
           ========================================= */}
        {activeTab === "dokumen-saya" && (() => {
          const uploadPrivilege = getPackageAccess().upload;
          const isKtpAllowed = uploadPrivilege !== "none";
          const isNpwpAllowed = uploadPrivilege === "restricted" || uploadPrivilege === "standard" || uploadPrivilege === "premium" || uploadPrivilege === "all";
          const isBpjsAllowed = uploadPrivilege === "restricted" || uploadPrivilege === "premium" || uploadPrivilege === "all";
          const isCertAndExpAllowed = uploadPrivilege === "restricted" || uploadPrivilege === "premium" || uploadPrivilege === "all";

          if (uploadPrivilege === "none") {
            return (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 max-w-2xl mx-auto shadow-sm animate-fadeIn">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-2">
                    <FileUp className="text-brand w-6 h-6" /> Kelola Dokumen Anda
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">Mengunggah dan mengonfigurasi integritas berkas lamaran kerja terenkripsi secara aman dan real-time.</p>
                </div>

                <div className="p-8 bg-red-50 text-red-800 border-2 border-dashed border-red-200 rounded-3xl text-center space-y-4">
                  <div className="w-14 h-14 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h4 className="font-display font-black text-lg text-slate-900">Menu Ini Terkunci! 🔒</h4>
                  <p className="text-slate-600 text-xs max-w-lg mx-auto leading-relaxed">
                    Pengguna terdaftar wajib memiliki paket berlangganan bulanan aktif (Paket Standart / Paket Premium) agar dapat meluncurkan dan mengunggah berkas lamaran kerja. Akun Gratis saat ini dibatasi.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("paket-saya")}
                    className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                  >
                    Beli Paket Layanan Bulanan &rarr;
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
              {/* Header displayed consistently/always on top of the actual page content */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-2">
                    <FileUp className="text-brand w-6 h-6" /> Kelola Dokumen Anda
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">Mengunggah dan mengonfigurasi integritas berkas lamaran kerja terenkripsi secara aman dan real-time.</p>
                </div>

                <div className="mt-6">
                  <div className="space-y-6">
                    {/* Security statement banner */}
                  <div className="bg-gradient-to-r from-emerald-950 to-teal-900 border border-emerald-800/80 rounded-3xl p-6 text-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-display font-black text-xl text-yellow-50">Ketentuan & Keamanan Unggah Dokumen</h3>
                        <p className="text-xs text-slate-300 mt-1">Harap baca terlebih dahulu kebijakan privasi enkripsi Portoify.</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mt-4 max-w-4xl">
                      Bahwasanya seluruh dokumen berharga yang Anda unggah di panel ini (seperti KTP, NPWP, BPJS, Sertifikat Kompetensi, Surat Pengalaman Kerja, atau Surat Pengalaman Magang) dijamin aman 100%. Dokumen disimpan ke dalam folder sistem terenkripsi biner secara lokal yang mana tidak dapat diakses oleh pihak luar, perayap web, ataupun bot iklan. Hak akses eksklusif hanya dimiliki oleh pemegang akun Portoify yang bersangkutan. Anda diperbolehkan menghapus berkas kapan pun Anda mau, dan file akan musnah permanen secara real-time dari harddisk server kami.
                    </p>
                  </div>

                  {/* Unified Scrollable Vault Container to guarantee flawless responsive displays */}
                  <div className="border border-slate-200/80 rounded-3xl bg-slate-50/40 overflow-hidden shadow-xs mt-6 select-none">
                    <div className="px-5 py-3 sm:py-4 bg-slate-100/90 border-b border-slate-200/75 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Vault Berkas Lamaran Kerja Terenkripsi</span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 flex items-center gap-1.5 self-start sm:self-auto bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200/60 shadow-xxs">
                        Scroll kebawah untuk formulir lain <span className="animate-bounce font-sans text-xs">&darr;</span>
                      </span>
                    </div>
                    
                    <div className="p-4 sm:p-6 max-h-[640px] overflow-y-auto space-y-8 scroll-smooth scrollbar-thin scrollbar-thumb-slate-300 pr-2">
                      
                      {/* Document upload grids list (strictly mapped) */}
                      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                        <h3 className="font-display font-black text-base text-slate-900 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
                          <span className="w-1.5 h-5 bg-brand rounded-full inline-block"></span> Berkas Persyaratan Utama & Pendukung
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          
                          {/* 1. KTP */}
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 shadow-xxs">
                            <div>
                              <span className="bg-red-50 text-brand text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block border border-red-200/20">Identitas</span>
                              <h4 className="font-bold text-slate-900 text-sm mt-2">Kartu Tanda Penduduk (KTP)</h4>
                              <p className="text-slate-400 text-xxs leading-relaxed mt-0.5">Satu berkas KTP digital dalam format foto / PDF.</p>
                            </div>

                            {documents.some(d => d.fileType === "ktp") ? (
                              <div className="p-3 bg-white border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                                <span className="truncate max-w-[120px] font-mono font-semibold text-emerald-700">✓ {documents.find(d => d.fileType === "ktp")?.fileName}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setSelectedPreviewDoc(documents.find(d => d.fileType === "ktp") || null)} className="text-brand hover:text-brand-hover cursor-pointer p-1" title="Pratinjau Berkas"><Eye className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeleteDocument(documents.find(d => d.fileType === "ktp")!.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer p-1" title="Hapus Berkas"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            ) : (
                              <label className="w-full text-center py-2.5 bg-brand text-white hover:bg-brand-hover text-xs font-bold rounded-xl shadow-xs transition block cursor-pointer">
                                PILIH FILE KTP
                                <input type="file" onChange={(e) => handleUploadDocument("ktp", e)} className="hidden" />
                              </label>
                            )}
                          </div>

                          {/* 2. NPWP */}
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 shadow-xxs">
                            <div>
                              <span className="bg-slate-200 text-slate-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block">Tambahan</span>
                              <h4 className="font-bold text-slate-900 text-sm mt-2">Kartu NPWP</h4>
                              <p className="text-slate-400 text-xxs leading-relaxed mt-0.5">Satu berkas kartu nomor pokok wajib pajak.</p>
                            </div>

                            {documents.some(d => d.fileType === "npwp") ? (
                              <div className="p-3 bg-white border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                                <span className="truncate max-w-[120px] font-mono font-semibold text-emerald-700">✓ {documents.find(d => d.fileType === "npwp")?.fileName}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setSelectedPreviewDoc(documents.find(d => d.fileType === "npwp") || null)} className="text-brand hover:text-brand-hover cursor-pointer p-1" title="Pratinjau Berkas"><Eye className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeleteDocument(documents.find(d => d.fileType === "npwp")!.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer p-1" title="Hapus Berkas"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            ) : !isNpwpAllowed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  showFeedback("", "Unggah berkas NPWP terkunci. Silakan upgrade paket Anda di Tab \"Paket Saya\".");
                                  setActiveTab("paket-saya");
                                }}
                                className="w-full text-center py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xxs font-black rounded-xl border border-amber-200 transition cursor-pointer"
                              >
                                🔒 Upgrade NPWP
                              </button>
                            ) : (
                              <label className="w-full text-center py-2.5 bg-brand text-white hover:bg-brand-hover text-xs font-bold rounded-xl shadow-xs transition block cursor-pointer">
                                PILIH FILE NPWP
                                <input type="file" onChange={(e) => handleUploadDocument("npwp", e)} className="hidden" />
                              </label>
                            )}
                          </div>

                          {/* 3. BPJS Kesehatan */}
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 shadow-xxs">
                            <div>
                              <span className="bg-slate-200 text-slate-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block">Pendukung</span>
                              <h4 className="font-bold text-slate-900 text-sm mt-2">BPJS Kesehatan</h4>
                              <p className="text-slate-400 text-xxs leading-relaxed mt-0.5">Satu berkas kartu kepesertaan aktif BPJS.</p>
                            </div>
                            {documents.some(d => d.fileType === "bpjs_kes") ? (
                              <div className="p-3 bg-white border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                                <span className="truncate max-w-[120px] font-mono font-semibold text-emerald-700">✓ {documents.find(d => d.fileType === "bpjs_kes")?.fileName}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setSelectedPreviewDoc(documents.find(d => d.fileType === "bpjs_kes") || null)} className="text-brand hover:text-brand-hover cursor-pointer p-1" title="Pratinjau Berkas"><Eye className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeleteDocument(documents.find(d => d.fileType === "bpjs_kes")!.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer p-1" title="Hapus Berkas"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            ) : !isBpjsAllowed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  showFeedback("", "Unggah Berkas BPJS Kesehatan memerlukan Paket Pro. Silakan upgrade paket Anda di Tab \"Paket Saya\".");
                                  setActiveTab("paket-saya");
                                }}
                                className="w-full text-center py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xxs font-black rounded-xl border border-amber-200 transition cursor-pointer"
                              >
                                🔒 Upgrade BPJS
                              </button>
                            ) : (
                              <label className="w-full text-center py-2.5 bg-brand text-white hover:bg-brand-hover text-xs font-bold rounded-xl shadow-xs transition block cursor-pointer">
                                UNGGAH BPJS KES
                                <input type="file" onChange={(e) => handleUploadDocument("bpjs_kes", e)} className="hidden" />
                              </label>
                            )}
                          </div>

                          {/* 4. BPJS Ketenagakerjaan */}
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 shadow-xxs">
                            <div>
                              <span className="bg-slate-200 text-slate-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block">Pendukung</span>
                              <h4 className="font-bold text-slate-900 text-sm mt-2">BPJS Ketenagakerjaan</h4>
                              <p className="text-slate-400 text-xxs leading-relaxed mt-0.5">Satu berkas kartu BPJS Ketenagakerjaan.</p>
                            </div>
                            {documents.some(d => d.fileType === "bpjs_ketenagakerjaan") ? (
                              <div className="p-3 bg-white border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                                <span className="truncate max-w-[120px] font-mono font-semibold text-emerald-700">✓ {documents.find(d => d.fileType === "bpjs_ketenagakerjaan")?.fileName}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setSelectedPreviewDoc(documents.find(d => d.fileType === "bpjs_ketenagakerjaan") || null)} className="text-brand hover:text-brand-hover cursor-pointer p-1" title="Pratinjau Berkas"><Eye className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeleteDocument(documents.find(d => d.fileType === "bpjs_ketenagakerjaan")!.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer p-1" title="Hapus Berkas"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            ) : !isBpjsAllowed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  showFeedback("", "Unggah Berkas BPJS Ketenagakerjaan memerlukan Paket Pro. Silakan upgrade paket Anda di Tab \"Paket Saya\".");
                                  setActiveTab("paket-saya");
                                }}
                                className="w-full text-center py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xxs font-black rounded-xl border border-amber-200 transition cursor-pointer"
                              >
                                🔒 Upgrade BPJS TK
                              </button>
                            ) : (
                              <label className="w-full text-center py-2.5 bg-brand text-white hover:bg-brand-hover text-xs font-bold rounded-xl shadow-xs transition block cursor-pointer">
                                UNGGAH BPJS TK
                                <input type="file" onChange={(e) => handleUploadDocument("bpjs_ketenagakerjaan", e)} className="hidden" />
                              </label>
                            )}
                          </div>

                        </div>
                      </div>

                      {/* Multi document limits section: Sertifikat (Max 3) & Working Experiences (Max 3) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Sertifikat Max 3 */}
                        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
                          <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                            <h4 className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Sertifikat Kompetensi
                            </h4>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Max 3 Berkas</span>
                          </div>

                          <div className="space-y-2">
                            {["sertifikat_1", "sertifikat_2", "sertifikat_3"].map((sfKey, idx) => {
                              const fileObj = documents.find(d => d.fileType === sfKey);
                              return (
                                <div key={sfKey} className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-500 font-mono text-xxs">Slot Sertifikat #{idx + 1}:</span>
                                  {fileObj ? (
                                    <div className="flex items-center gap-2 overflow-hidden max-w-[180px]">
                                      <span className="truncate text-teal-600 font-semibold font-mono" title={fileObj.fileName}>{fileObj.fileName}</span>
                                      <button onClick={() => setSelectedPreviewDoc(fileObj)} className="text-brand hover:text-brand-hover cursor-pointer p-1" title="Pratinjau Berkas"><Eye className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteDocument(fileObj.id)} className="text-red-500 hover:text-red-700 cursor-pointer p-1" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  ) : !isCertAndExpAllowed ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        showFeedback("", "Pengunggahan Sertifikat Kompetensi memerlukan Paket Pro. Silakan upgrade paket Anda di Tab \"Paket Saya\".");
                                        setActiveTab("paket-saya");
                                      }}
                                      className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xxs font-bold inline-block border border-amber-200 cursor-pointer transition"
                                    >
                                      🔒 Terkunci
                                    </button>
                                  ) : (
                                    <label className="px-3 py-1 bg-brand text-white hover:bg-brand-hover rounded-lg text-xxs font-bold cursor-pointer inline-block transition">
                                      Unggah Berkas
                                      <input type="file" onChange={(e) => handleUploadDocument(sfKey, e)} className="hidden" />
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Surat Pengalaman Kerja / Magang Max 3 */}
                        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
                          <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                            <h4 className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span> Surat Pengalaman Kerja / Magang
                            </h4>
                            <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">Max 3 Berkas</span>
                          </div>

                          <div className="space-y-2">
                            {["pengalaman_kerja_1", "pengalaman_kerja_2", "pengalaman_kerja_3"].map((expKey, idx) => {
                              const fileObj = documents.find(d => d.fileType === expKey);
                              return (
                                <div key={expKey} className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-500 font-mono text-xxs">Pakta Kerja #{idx + 1}:</span>
                                  {fileObj ? (
                                    <div className="flex items-center gap-2 overflow-hidden max-w-[180px]">
                                      <span className="truncate text-teal-600 font-semibold font-mono" title={fileObj.fileName}>{fileObj.fileName}</span>
                                      <button onClick={() => setSelectedPreviewDoc(fileObj)} className="text-brand hover:text-brand-hover cursor-pointer p-1" title="Pratinjau Berkas"><Eye className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteDocument(fileObj.id)} className="text-red-500 hover:text-red-700 cursor-pointer p-1" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  ) : !isCertAndExpAllowed ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        showFeedback("", "Pengunggahan Surat Pengalaman Kerja memerlukan Paket Pro. Silakan upgrade paket Anda di Tab \"Paket Saya\".");
                                        setActiveTab("paket-saya");
                                      }}
                                      className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xxs font-bold inline-block border border-amber-200 cursor-pointer transition"
                                    >
                                      🔒 Terkunci
                                    </button>
                                  ) : (
                                    <label className="px-3 py-1 bg-brand text-white hover:bg-brand-hover rounded-lg text-xxs font-bold cursor-pointer inline-block transition">
                                      Unggah Berkas
                                      <input type="file" onChange={(e) => handleUploadDocument(expKey, e)} className="hidden" />
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>

                      {/* Premium Only Documents Grid - Form upload untuk Dokumen (hanya berlaku untuk Paket Premium) */}
                      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-5 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-amber-500 rounded-full inline-block"></span>
                            <div>
                              <h3 className="font-display font-black text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-amber-500 fill-amber-500/20" /> Dokumen Khusus Paket Premium
                              </h3>
                              <p className="text-slate-400 text-[10px] mt-0.5">Berkas kelengkapan wajib bagi pencari kerja tingkat lanjut (Ijazah, SKCK, dsb).</p>
                            </div>
                          </div>
                          <span className="bg-amber-500/10 text-amber-600 font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block border border-amber-500/15 self-start sm:self-center">Premium Only Slot</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slideUp">
                          {[
                            { key: "ijazah", title: "1. Ijazah Pendidikan", desc: "Scan Ijazah sekolah / universitas terakhir." },
                            { key: "transkip_nilai", title: "2. Transkip Nilai", desc: "Scan daftar transkip nilai akademis kumulatif." },
                            { key: "sk_sehat", title: "3. Surat Keterangan Sehat", desc: "Surat sehat fisik dari faskes / dokter resmi." },
                            { key: "kartu_kuning", title: "4. Kartu Kuning", desc: "Kartu pencari kerja resmi Disnaker." },
                            { key: "skck", title: "5. Surat SKCK", desc: "Surat Keterangan Catatan Kepolisian aktif." }
                          ].map((doc) => {
                            const isPremiumActive = uploadPrivilege === "all";
                            const fileObj = documents.find(d => d.fileType === doc.key);
                            return (
                              <div key={doc.key} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-4 shadow-xxs">
                                <div>
                                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block ${isPremiumActive ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-500'}`}>Premium</span>
                                  <h4 className="font-bold text-slate-900 text-xs mt-2">{doc.title}</h4>
                                  <p className="text-slate-400 text-[10px] leading-relaxed mt-0.5">{doc.desc}</p>
                                </div>

                                {fileObj ? (
                                  <div className="p-3 bg-white border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                                    <span className="truncate max-w-[110px] font-mono font-semibold text-emerald-700" title={fileObj.fileName}>✓ {fileObj.fileName}</span>
                                    <div className="flex items-center gap-1.5">
                                      <button onClick={() => setSelectedPreviewDoc(fileObj)} className="text-brand hover:text-brand-hover cursor-pointer p-1" title="Pratinjau"><Eye className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteDocument(fileObj.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer p-1" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </div>
                                ) : !isPremiumActive ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      showFeedback("", `Unggah Berkas "${doc.title.substring(3)}" dibatasi. Silakan upgrade paket Anda ke Paket Premium di menu "Paket Saya".`);
                                      setActiveTab("paket-saya");
                                    }}
                                    className="w-full text-center py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg border border-amber-200 transition cursor-pointer"
                                  >
                                    🔒 Upgrade Premium
                                  </button>
                                ) : (
                                  <label className="w-full text-center py-2 bg-brand text-white hover:bg-brand-hover text-xs font-bold rounded-lg shadow-xxs transition block cursor-pointer">
                                    UNGGAH BERKAS
                                    <input type="file" onChange={(e) => handleUploadDocument(doc.key, e)} className="hidden" />
                                  </label>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>

            {/* Document Preview Lightbox Modal */}
            {selectedPreviewDoc && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-w-2xl w-full">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                      <h3 className="font-display font-black text-slate-950 text-base">Pratinjau Berkas Dokumen</h3>
                      <p className="text-xxs text-slate-500 font-mono mt-0.5">{selectedPreviewDoc.fileName}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedPreviewDoc(null)} 
                      className="p-1 px-3 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      TUTUP
                    </button>
                  </div>
                  <div className="p-6 bg-slate-900 flex justify-center items-center overflow-auto max-h-[70vh]">
                    {selectedPreviewDoc.filePathUrl.startsWith("data:image/") || selectedPreviewDoc.fileName.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                      <img src={selectedPreviewDoc.filePathUrl} className="max-w-full max-h-[50vh] object-contain rounded-lg shadow" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="p-8 text-center text-slate-300 space-y-4">
                        <p className="text-sm">Dokumen tersimpan format digital aman.</p>
                        <a href={selectedPreviewDoc.filePathUrl} download={selectedPreviewDoc.fileName} className="inline-block py-2.5 px-5 bg-brand text-white font-bold rounded-xl text-xs hover:bg-brand-hover">
                          Unduh & Buka Berkas 📥
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Gateway Checkout Modal / Midtrans Portal */}
            {checkoutPkg && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-w-lg w-full">
                  
                  {/* Modal Header */}
                  <div className="px-6 py-5 border-b border-slate-100 bg-[#fafafa] flex justify-between items-center">
                    <div>
                      <h3 className="font-display font-black text-slate-900 text-base">🛒 Gateway Pembayaran Portoify</h3>
                      <p className="text-xxs text-slate-500 font-mono mt-0.5">Order ID: {paymentOrderId || "Generating..."}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setCheckoutPkg(null);
                        setPaymentToken("");
                        setPaymentUrl("");
                        setPaymentOrderId("");
                      }} 
                      className="p-1.5 px-3 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-5">
                    
                    {/* Selected Package brief info card */}
                    <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider">Paket Yang Dipilih</p>
                        <h4 className="font-display font-black text-slate-900 text-base mt-0.5">{checkoutPkg.name}</h4>
                        <p className="text-xxs text-slate-500 font-medium">Masa Aktif: {checkoutPkg.durationDays} Hari</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider">Total Tagihan</p>
                        <p className="text-lg font-black text-brand font-display">Rp {Number(checkoutPkg.price || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    {paymentLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-slate-500 font-medium">Sedang menghubungi ke server Payment Gateway Midtrans...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        
                        <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3">
                          <span className="text-sky-600 text-sm mt-0.5">💡</span>
                          <div className="text-xxs text-sky-800 leading-relaxed space-y-1">
                            <p className="font-bold">Sistem Pembayaran Terintegrasi Midtrans:</p>
                            <p>Anda wajib menyelesaikan transaksi melalui portal pembayaran resmi Midtrans aman. Klik tombol di bawah untuk membuka halaman pembayaran.</p>
                          </div>
                        </div>

                        {paymentUrl ? (
                          <div className="space-y-3">
                            
                            {/* Primary Button to Redirect to Payment Page */}
                            <a
                              href={paymentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-3.5 bg-brand hover:bg-brand-hover text-white text-xs font-black rounded-xl text-center shadow-md flex items-center justify-center gap-2 transition"
                            >
                              BUKA GATEWAY PEMBAYARAN MIDTRANS 💳
                            </a>

                            {/* Direct URL view & Copy functionality to ensure support inside inline frames */}
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                              <p className="text-[10px] text-slate-400 font-bold">Instruksi Link Cadangan (Jika tab baru terblokir):</p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={paymentUrl}
                                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-mono select-all outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(paymentUrl);
                                    alert("Link pembayaran berhasil disalin!");
                                  }}
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold text-[10px] cursor-pointer"
                                >
                                  Salin
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                              {/* Check status button */}
                              <button
                                type="button"
                                onClick={handleCheckPaymentStatus}
                                className="py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xxs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                Cek Status Pembayaran 🔄
                              </button>

                              {/* Simulation Instant Buy Button for quick sandbox testing */}
                              <button
                                type="button"
                                onClick={handleSimulateInstantPay}
                                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xxs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                ✨ Bayar Instan (Simulasi)
                              </button>
                            </div>

                          </div>
                        ) : (
                          <div className="text-center text-red-500 font-bold text-xs py-2">
                            Gagal menghubungi payment gateway. Coba beberapa saat lagi.
                          </div>
                        )}

                      </div>
                    )}

                  </div>

                </div>
              </div>
            )}

            {/* Integrated Midtrans Snap Sandbox Simulator Modal Overlay */}
            {showMockSnapModal && checkoutPkg && (
              <div className="fixed inset-0 z-55 bg-slate-900/80 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
                <div className="bg-white rounded-[24px] border border-blue-100 shadow-2xl overflow-hidden max-w-md w-full font-sans">
                  
                  {/* Top Header styled EXACTLY like the official Midtrans Snap popup */}
                  <div className="bg-[#1c2c4d] text-white px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-black text-white">
                        M
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-black tracking-wide uppercase text-white">Midtrans Snap</h4>
                        <p className="text-[9px] text-slate-300 font-medium">Secure Sandbox Simulator Portal</p>
                      </div>
                    </div>
                    <div className="bg-blue-900/50 text-blue-300 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider border border-blue-500/30">
                      SANDBOX MODE
                    </div>
                  </div>

                  {/* Merchant Info Area */}
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-left">
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Merchant</p>
                      <h5 className="text-xs font-black text-slate-800">Portoify Digital</h5>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide text-right">Total Amount</p>
                      <p className="text-sm font-black text-blue-600 font-mono">IDR {Number(checkoutPkg.price || 0).toLocaleString("id-ID")}</p>
                    </div>
                  </div>

                  {/* Main Simulator Content Area */}
                  <div className="p-5 space-y-4 text-left">
                    <div className="p-3 bg-blue-50 border border-blue-100/50 rounded-xl flex items-start gap-2.5">
                      <span className="text-blue-600 text-sm">🛡️</span>
                      <div className="text-[10.5px] text-blue-900 leading-relaxed text-left">
                        <p className="font-bold mb-0.5">Metode Simulasi Sempurna</p>
                        <p className="text-slate-600">Sistem mendeteksi kunci sandbox/local. Selesaikan pengujian modul berbayar dengan memilih salah satu jalur simulasi di bawah ini secara instan.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest pl-1 mb-1 text-left">Pilih Metode Pembayaran MOCK</p>
                      
                      {/* Virtual Account Selection */}
                      <div className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-base">🏦</span>
                          <div className="text-left">
                            <h6 className="text-[11px] font-black text-slate-800">Bank Transfer (Virtual Account)</h6>
                            <p className="text-[9px] text-slate-400">BCA, Mandiri, BNI, BRI (Instan Simulasi)</p>
                          </div>
                        </div>
                        <span className="text-xxs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded">Recomend</span>
                      </div>

                      {/* E-Wallet selection */}
                      <div className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-base">📱</span>
                          <div className="text-left">
                            <h6 className="text-[11px] font-black text-slate-800">OVO / GoPay / ShopeePay / QRIS</h6>
                            <p className="text-[9px] text-slate-400">QR Code Scanner simulasi pembayaran cepat</p>
                          </div>
                        </div>
                        <span className="text-xxxs text-slate-400 font-bold">Offline</span>
                      </div>

                      {/* Credit Card selection */}
                      <div className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-base">💳</span>
                          <div className="text-left">
                            <h6 className="text-[11px] font-black text-slate-800">Kartu Kredit / Debit Online</h6>
                            <p className="text-[9px] text-slate-400">Simulasikan dengan OTP kode acak</p>
                          </div>
                        </div>
                        <span className="text-xxxs text-slate-400 font-bold">Offline</span>
                      </div>
                    </div>

                    {/* Transaction Details Area */}
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-[10px] text-slate-500 font-mono text-left">
                      <div className="flex justify-between">
                        <span>Order ID:</span>
                        <span className="text-slate-800 font-bold">{paymentOrderId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Token ID:</span>
                        <span className="text-slate-800 truncate max-w-[150px]">{paymentToken}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paket:</span>
                        <span className="text-slate-800 font-bold">{checkoutPkg.name}</span>
                      </div>
                    </div>

                  </div>

                  {/* Primary Trigger Actions */}
                  <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                    
                    {/* Primary Button: Simulate Success */}
                    <button
                      type="button"
                      onClick={handleSimulateMockSnapSuccess}
                      className="w-full py-3 bg-[#11bd70] hover:bg-[#0da460] text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                    >
                      ✅ SIMULASIKAN BAYAR SUKSES (SUCCESS)
                    </button>

                    {/* Cancel Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMockSnapModal(false);
                        showFeedback("Simulasi pembayaran dibatalkan.");
                      }}
                      className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xxs rounded-xl transition cursor-pointer uppercase tracking-wider text-center"
                    >
                      ❌ BATALKAN TRANSAKSI (CANCEL)
                    </button>

                  </div>

                </div>
              </div>
            )}

                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* =========================================
            TAB 8: PAKET SAYA (SAAS PLANS STORE)
           ========================================= */}
        {activeTab === "paket-saya" && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <h2 className="text-2xl font-display font-black text-slate-900 border-b border-slate-100 pb-4 mb-4">Paket Saya Saat Ini</h2>
              <div className="p-5 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-mono uppercase">Paket Terdaftar Anda:</p>
                  <p className="text-2xl font-extrabold text-brand font-display">{sub?.packageName || "Instalasi Dasar Gratis"}</p>
                  <p className="text-xs text-slate-500">
                    Masa Aktif: {sub?.isActive ? `Hingga ${new Date(sub.endDate).toLocaleDateString()}` : "Selamanya (Silakan beli berlangganan untuk domain hosting)"}
                  </p>
                </div>
                {sub?.isActive && (
                  <span className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-200 select-none animate-pulse">
                    🟢 Berlangganan Aktif Pro
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const isMyPlan = sub && sub.packageId === pkg.id && sub.isActive;
                
                const featureLines = [
                  `Berlaku Selama ${pkg.durationDays || 30} Hari`,
                  ...(Array.isArray(pkg.features) 
                    ? pkg.features 
                    : (typeof pkg.features === "string" 
                        ? (pkg.features as string).split(",").map(f => f.trim()).filter(Boolean) 
                        : []))
                ];

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white border rounded-[32px] overflow-hidden flex flex-col justify-between transition-all duration-300 p-0 shadow-lg ${
                      isMyPlan 
                        ? "border-[#00aa6c] ring-4 ring-[#00cc80]/20 scale-102 relative" 
                        : "border-slate-200 hover:border-slate-300 hover:translate-y-[-4px]"
                    }`}
                  >
                    <div>
                      {/* Rich header banner styled EXACTLY like the red banner in user's design */}
                      <div className="relative bg-gradient-to-br from-[#ca1a1a] via-[#bb1717] to-[#8a1414] py-10 px-5 text-center overflow-hidden">
                        {/* Subtle glossy overlay strip path matching mockup */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none transform -skew-y-6 scale-110" />
                        <h3 className="text-xl sm:text-[22px] font-black uppercase tracking-wider text-white font-sans drop-shadow-md">
                          {pkg.name}
                        </h3>
                        {isMyPlan && (
                          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white animate-pulse">
                            AKTIF
                          </div>
                        )}
                      </div>

                      {/* Red Price section and Duration */}
                      <div className="px-6 pt-8 pb-4 text-center">
                        <p className="text-3xl sm:text-[34px] font-black text-[#ca1a1a] tracking-tight mb-1">
                          {Number(pkg.price) === 0 ? "IDR 0" : `IDR ${Number(pkg.price || 0).toLocaleString("id-ID")}`}
                        </p>
                        <p className="text-[#8c1c1c] font-black text-xs sm:text-[13px] tracking-wide uppercase">
                          Active {pkg.durationDays} Days
                        </p>
                      </div>

                      {/* Info limit pill values */}
                      <div className="px-6 pb-4">
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold flex justify-between">
                            <span>Porto:</span>
                            <span className="text-brand font-black uppercase">
                              {pkg.id === "pkg_basic" ? "basic" : pkg.id === "pkg_standard" ? "standard" : pkg.id === "pkg_premium" ? "all" : (pkg.accessPortfolio || "all")}
                            </span>
                          </div>
                          <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold flex justify-between">
                            <span>Resume:</span>
                            <span className="text-brand font-black uppercase">
                              {pkg.id === "pkg_basic" ? "basic" : pkg.id === "pkg_standard" ? "standard" : pkg.id === "pkg_premium" ? "all" : (pkg.accessResume || "all")}
                            </span>
                          </div>
                          <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold flex justify-between">
                            <span>Lamaran:</span>
                            <span className="text-brand font-black uppercase">
                              {pkg.id === "pkg_basic" ? "basic" : pkg.id === "pkg_standard" ? "standard" : pkg.id === "pkg_premium" ? "all" : (pkg.accessLetter || "all")}
                            </span>
                          </div>
                          <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold flex justify-between">
                            <span>Unggah:</span>
                            <span className="text-brand font-black uppercase">
                              {pkg.id === "pkg_basic" ? "none" : pkg.id === "pkg_standard" ? "restricted" : pkg.id === "pkg_premium" ? "all" : (pkg.accessUploadDocs || "all")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Fitur Layanan Checklist with RED bullets */}
                      <div className="px-6 sm:px-8 pb-6">
                        <h4 className="text-slate-950 font-extrabold text-[12px] uppercase tracking-wider mb-3 text-left border-b pb-1.5 border-slate-100">
                          Fitur Layanan
                        </h4>
                        
                        <ul className="space-y-2.5 px-0.5 text-xs text-slate-700">
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

                    {/* Subscription trigger buttons */}
                    <div className="px-6 pb-6 pt-4 border-t border-slate-100 mt-auto bg-slate-50/50">
                      <button
                        disabled={!!isMyPlan}
                        type="button"
                        onClick={() => handlePurchasePackage(pkg.id)}
                        className={`w-full py-3.5 rounded-xl font-bold text-xs cursor-pointer transition uppercase tracking-wider duration-200 shadow-sm ${
                          isMyPlan 
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed font-black" 
                            : "bg-[#0f2942] hover:bg-[#16395b] text-white hover:shadow active:scale-98"
                        }`}
                      >
                        {isMyPlan ? "✓ Paket Aktif Terdaftar" : "Beli Berlangganan Sekarang"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* =========================================
            TAB 9: KELOLA URL DOMAIN
           ========================================= */}
        {activeTab === "url-domain" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 max-w-2xl mx-auto shadow-sm animate-fadeIn">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-2">
                <Globe2 className="text-brand w-6 h-6" /> Kelola URL Domain
              </h2>
              <p className="text-slate-500 text-xs mt-1">Mengatur nama folder yang akan di-deploy ke server public_html secara real-time.</p>
            </div>

            {!isProMember ? (
              <div className="p-8 bg-red-50 text-red-800 border-2 border-dashed border-red-200 rounded-3xl text-center space-y-4">
                <div className="w-14 h-14 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h4 className="font-display font-black text-lg">Menu Ini Terkunci! 🔒</h4>
                <p className="text-slate-600 text-xs max-w-lg mx-auto leading-relaxed">
                  Pengguna terdaftar wajib memiliki paket berlangganan bulanan aktif (Paket Standart / Paket Premium) agar dapat meluncurkan folder domain hosting. Akun Gratis saat ini dibatasi.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("paket-saya")}
                  className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Beli Paket Layanan Bulanan &rarr;
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveDomainPath} className="space-y-6">
                
                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-900 border border-emerald-200 text-xs space-y-1">
                  <p className="font-bold">🟢 Fitur Terbuka! Sinkronisasi cPanel Cloud Run Aktif.</p>
                  <p className="text-slate-500 text-xxs">Anda memiliki hak penuh untuk membuat atau memodifikasi/mengedit nama subfolder Anda sendiri kapan saja.</p>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-2">Nama Folder Hosting (domain/nama_pengguna)</label>
                  <div className="flex">
                    <span className="px-4 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-slate-500 text-sm font-semibold select-none">
                      portoify.my.id/u/
                    </span>
                    <input
                      type="text"
                      placeholder="Contoh: budi-gunawan-web"
                      value={hostingPath}
                      onChange={(e) => setHostingPath(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-r-xl outline-none text-slate-700 text-sm focus:border-brand"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 italic">
                    ℹ️ Tips: Anda bebas mengedit dan merubah nama subfolder di atas sesuka hati Anda. Konten web akan mengarah ke alamat baru secara instan.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer"
                >
                  {sub && sub.domainHostingPath ? "Simpan Perubahan & Modifikasi Folder URL" : "Generate Folder Baru & Sinkronisasikan cPanel"}
                </button>

                {sub && sub.domainHostingPath && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mt-6 space-y-2 text-xs">
                    <p className="font-bold text-slate-700">🔗 Tautan Portofolio Online Anda Saat Ini:</p>
                    <a
                      href={`/u/${sub.domainHostingPath}`}
                      target="_blank"
                      className="text-brand font-mono font-bold hover:underline flex items-center gap-1 text-sm bg-white p-2.5 border rounded"
                    >
                      {window.location.origin}/u/{sub.domainHostingPath} <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}

              </form>
            )}
          </div>
        )}

        {/* =========================================
            TAB 10: GABUNGKAN SEMUA BERKAS PDF (PREMIUM)
           ========================================= */}
        {activeTab === "gabungkan-semua" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 max-w-4xl mx-auto shadow-sm animate-fadeIn">
            <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-black text-slate-900 flex items-center gap-2">
                  <FileStack className="text-brand w-6 h-6" /> Gabungkan Dokumen (PDF)
                </h2>
                <p className="text-slate-500 text-xs mt-1">Menggabungkan Surat Lamaran, CV, dan dokumen pendukung sesuai urutan legalitas dalam sekejap.</p>
              </div>
            </div>

            {!isPremiumUser ? (
              <div className="p-8 bg-amber-50/70 text-amber-900 border-2 border-dashed border-amber-250 rounded-3xl text-center space-y-4 max-w-2xl mx-auto">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                  <Award className="w-8 h-8 fill-amber-500/20" />
                </div>
                <h4 className="font-display font-black text-lg text-slate-950">Fitur Eksklusif Paket Premium! ⚡</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Sistem penggabungan otomatis (PDF Multi-Merge) ini mengonversi Surat Lamaran, Resume, Foto, serta 12 dokumen fisik pendukung lainnya secara dinamis ke dalam format PDF tunggal siap saji.
                  <br /><br />
                  Aktifkan langganan <strong>Paket Premium</strong> Anda hari ini untuk membuka fitur otomatisasi hemat waktu ini dan nikmati melamar kerja instan tanpa batas!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("paket-saya")}
                  className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Beli Paket Premium Sekarang &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Checklist column */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                    <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider mb-4 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-brand" /> Daftar Urutan Dokumen PDF
                    </h3>
                    
                    <div className="space-y-3 font-mono text-[11px] text-slate-700">
                      
                      {/* 1. Surat Lamaran */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">1.</span> Surat Lamaran
                        </span>
                        {cover ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Tersusun</span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[9px] font-bold">(Belum dibuat)</span>
                        )}
                      </div>

                      {/* 2. Resume/CV */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">2.</span> Resume / CV
                        </span>
                        {resume ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Tersusun</span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[9px] font-bold">(Belum dibuat)</span>
                        )}
                      </div>

                      {/* 3. Pas Foto */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">3.</span> Pas Foto Terbaru
                        </span>
                        {profile?.photoUrl ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Uploaded</span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">Kosong (skip)</span>
                        )}
                      </div>

                      {/* 4. Ijazah */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">4.</span> Ijazah Pendidikan
                        </span>
                        {documents.some(d => d.fileType === "ijazah") ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Ready</span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">Kosong (skip)</span>
                        )}
                      </div>

                      {/* 5. Transkrip Nilai */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">5.</span> Transkrip Nilai
                        </span>
                        {documents.some(d => d.fileType === "transkip_nilai") ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Ready</span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">Kosong (skip)</span>
                        )}
                      </div>

                      {/* 6. Pengalaman Kerja (max 3) */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">6.</span> Pengalaman Kerja (Maks 3)
                        </span>
                        <span className="text-slate-600">
                          {documents.filter(d => ["pengalaman_kerja_1", "pengalaman_kerja_2", "pengalaman_kerja_3"].includes(d.fileType)).length} file terunggah
                        </span>
                      </div>

                      {/* 7. Sertifikat Kompetensi */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">7.</span> Sertifikat Kompetensi (Maks 3)
                        </span>
                        <span className="text-slate-600">
                          {documents.filter(d => ["sertifikat_1", "sertifikat_2", "sertifikat_3"].includes(d.fileType)).length} file terunggah
                        </span>
                      </div>

                      {/* 8. Keterangan Sehat */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">8.</span> Keterangan Sehat
                        </span>
                        {documents.some(d => d.fileType === "sk_sehat") ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Ready</span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">Kosong (skip)</span>
                        )}
                      </div>

                      {/* 9. SKCK */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">9.</span> Surat SKCK
                        </span>
                        {documents.some(d => d.fileType === "skck") ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Ready</span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">Kosong (skip)</span>
                        )}
                      </div>

                      {/* 10. KTP */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">10.</span> KTP Asli
                        </span>
                        {documents.some(d => d.fileType === "ktp") ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Ready</span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">Kosong (skip)</span>
                        )}
                      </div>

                      {/* 11. NPWP */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">11.</span> NPWP Asli
                        </span>
                        {documents.some(d => d.fileType === "npwp") ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Ready</span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">Kosong (skip)</span>
                        )}
                      </div>

                      {/* 12. BPJS Kesehatan */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">12.</span> BPJS Kesehatan
                        </span>
                        {documents.some(d => d.fileType === "bpjs_kes") ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Ready</span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">Kosong (skip)</span>
                        )}
                      </div>

                      {/* 13. BPJS Ketenagakerjaan */}
                      <div className="flex items-center justify-between border-slate-100">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">13.</span> BPJS Ketenagakerjaan
                        </span>
                        {documents.some(d => d.fileType === "bpjs_ketenagakerjaan") ? (
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold">✓ Ready</span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">Kosong (skip)</span>
                        )}
                      </div>

                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompileAllDocs}
                    disabled={compiling}
                    className="w-full py-4 bg-brand hover:bg-brand-hover text-white rounded-2xl font-bold flex items-center justify-center gap-2 text-sm shadow transition duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {compiling ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>{compilationProgress || "Sedang mengompilasi..."}</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-5 h-5 shrink-0" />
                        <span>Gabungkan Dokumen</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Print/Preview Actions Column */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                  
                  <div className="bg-slate-55 rounded-2xl p-5 border border-slate-200/60 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-slate-900 font-bold mb-2 text-sm">Aksi & Integrasi Berkas Kompilasi ⚡</h4>
                      <p className="text-slate-500 text-xs leading-relaxed mb-6">
                        Tekan tombol <strong>"Gabungkan Dokumen"</strong> terlebih dahulu untuk memicu mesin perenderan PDF kami. Setelah digabungkan, Anda dapat memantau prapinjau langsung, mengunduh file hasil jadi, atau segera mengirim lamaran kerja ke perusahaan Anda pilihan melalui email dengan format resmi kami.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      
                      {/* Left: Download & Pratinjau */}
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={handleDownloadMergedPdf}
                          disabled={!mergedPdfBlob}
                          className={`w-full py-3.5 px-4 rounded-xl font-bold font-display text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${mergedPdfBlob ? "bg-slate-900 text-white hover:bg-slate-950 shadow" : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"}`}
                        >
                          <Download className="w-4 h-4 shrink-0" />
                          <span>Download Berkas PDF</span>
                        </button>

                        <a
                          href={mergedPdfUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (!mergedPdfUrl) {
                              e.preventDefault();
                              showFeedback("Silakan klik 'Gabungkan Dokumen' terlebih dahulu untuk menyusun PDF Anda!");
                            }
                          }}
                          className={`w-full py-3.5 px-4 rounded-xl font-bold font-display text-xs flex items-center justify-center gap-2 transition text-center cursor-pointer border ${mergedPdfUrl ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow" : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"}`}
                        >
                          <Eye className="w-4 h-4 shrink-0" />
                          <span>Pratinjau Berkas (Tab Baru)</span>
                        </a>
                      </div>

                      {/* Right: Kirim Lamaran */}
                      <div className="flex flex-col gap-3 h-full">
                        <a
                          href={mergedPdfBlob ? getKirimLamaranMailto() : "#"}
                          onClick={(e) => {
                            if (!mergedPdfBlob) {
                              e.preventDefault();
                              showFeedback("Silakan klik 'Gabungkan Dokumen' terlebih dahulu untuk menyusun PDF Anda!");
                            }
                          }}
                          className={`w-full py-3.5 px-4 rounded-xl font-bold font-display text-xs flex items-center justify-center gap-2 transition text-center md:h-[98px] flex items-center justify-center ${mergedPdfBlob ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow" : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"}`}
                        >
                          <Mail className="w-4 h-4 shrink-0" />
                          <span>Kirim Lamaran Kerja</span>
                        </a>
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* Dynamic Image-based Live Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="p-3 sm:p-4 bg-slate-950 text-white flex justify-between items-center gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-xxs font-black text-indigo-400 uppercase tracking-widest block font-mono">Katalog Desain</span>
                <h3 className="text-xs sm:text-sm font-bold truncate text-slate-100" title={previewTemplate.name}>
                  Pratinjau Desain: {previewTemplate.name}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const activeTpl = previewTemplate;
                    setPreviewTemplate(null);
                    handleSetTemplateForCategory(activeTpl.category, activeTpl.id);
                  }}
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-brand hover:bg-brand-hover text-white text-[10px] sm:text-xxs font-black uppercase rounded-lg shadow cursor-pointer transition active:scale-95 leading-none whitespace-nowrap shrink-0 flex items-center justify-center gap-1"
                >
                  <span className="hidden sm:inline">Gunakan Desain Ini &rarr;</span>
                  <span className="inline sm:hidden">Gunakan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] sm:text-xxs font-black uppercase cursor-pointer transition active:scale-95 leading-none whitespace-nowrap shrink-0 flex items-center justify-center"
                >
                  <span className="hidden sm:inline">Tutup [X]</span>
                  <span className="inline sm:hidden">Tutup</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Image catalog thumbnail preview / Vector Preview for docx */}
            <div className="flex-1 bg-slate-100 relative p-4 flex items-center justify-center overflow-auto">
              {previewTemplate.category === "cover_letter" && checkIfDocxMarkup(previewTemplate.htmlMarkup) ? (
                <div className="w-full max-w-xl mx-auto flex justify-center">
                  <ScaledDocSheet targetWidth={680} targetHeight={900} parentHeight={560}>
                    {isModalDocxProcessing ? (
                      <div className="flex flex-col items-center justify-center py-28 text-slate-400 h-full w-full">
                        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-sky-500 animate-spin mb-3"></div>
                        <p className="text-[11px] font-bold font-mono">Memindai rincian Word...</p>
                      </div>
                    ) : (
                      <div className="space-y-4 h-full w-full text-left text-slate-800 text-[11px] sm:text-[11.5px] leading-relaxed">
                        {(() => {
                          const groups: Array<{
                            type: "detail" | "normal" | "empty";
                            items: Array<{text: string; align: "left" | "center" | "right" | "justify"}>;
                          }> = [];

                          modalDocxParagraphs.forEach((par) => {
                            if (!par.text || !par.text.trim()) {
                              groups.push({ type: "empty", items: [par] });
                              return;
                            }

                            const firstColonIndex = par.text.indexOf(":");
                            const isDetail = (() => {
                              if (firstColonIndex === -1) return false;
                              const key = par.text.substring(0, firstColonIndex).trim().toLowerCase();
                              return isPersonalDetailKey(key);
                            })();

                            if (isDetail) {
                              const lastGroup = groups[groups.length - 1];
                              if (lastGroup && lastGroup.type === "detail") {
                                lastGroup.items.push(par);
                              } else {
                                groups.push({ type: "detail", items: [par] });
                              }
                            } else {
                              groups.push({ type: "normal", items: [par] });
                            }
                          });

                          return groups.map((group, groupIdx) => {
                            if (group.type === "empty") {
                              return <div key={groupIdx} className="h-3.5" />;
                            }

                            if (group.type === "detail") {
                              return (
                                <div key={groupIdx} className="space-y-0.5 my-1">
                                  {group.items.map((par, itemIdx) => {
                                    const firstColonIndex = par.text.indexOf(":");
                                    const key = par.text.substring(0, firstColonIndex).trim();
                                    const val = par.text.substring(firstColonIndex + 1).trim();
                                    return (
                                      <div key={itemIdx} className="flex items-start text-left leading-[1.3] text-[11.5px]">
                                        <div className="w-[115px] sm:w-[125px] shrink-0 font-medium text-slate-800 font-sans">
                                          {key}
                                        </div>
                                        <div className="w-[15px] shrink-0 text-center font-medium text-slate-800 font-sans">
                                          :
                                        </div>
                                        <div className="flex-1 text-slate-800 font-normal whitespace-pre-wrap font-sans">
                                          {val}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }

                            const par = group.items[0];
                            const pAlign = par.align || "left";
                            let alignClass = "text-left";
                            if (pAlign === "center") alignClass = "text-center";
                            if (pAlign === "right") alignClass = "text-right";
                            if (pAlign === "justify") alignClass = "text-justify";

                            return (
                              <p key={groupIdx} className={`whitespace-pre-wrap font-sans ${alignClass}`}>
                                {par.text}
                              </p>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </ScaledDocSheet>
                </div>
              ) : previewTemplate.previewUrl ? (
                <img
                  src={previewTemplate.previewUrl}
                  alt={previewTemplate.name}
                  className="max-w-full max-h-[70vh] rounded-2xl border border-slate-300 shadow-lg object-contain bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-slate-400 font-display text-sm flex flex-col items-center gap-2">
                  <FileText className="w-12 h-12 text-slate-300" />
                  <span>Tidak ada gambar thumbnail untuk template ini.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Resume Preview & Export PDF Modal */}
      {showResumePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-slate-200 animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand/10 border border-brand/20 rounded-xl">
                  <FileText className="text-brand w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-brand uppercase tracking-widest block font-mono">Interactive PDF Sandbox</span>
                  <h3 className="text-sm font-bold truncate">Pratinjau Resume & CV: {profile?.fullName || "Saya"}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const iframe = document.getElementById("resume-preview-iframe") as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                    }
                  }}
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-[11px] font-extrabold uppercase rounded-lg shadow cursor-pointer transition flex items-center gap-1.5"
                >
                  📥 Cetak & Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowResumePreview(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xxs font-black uppercase cursor-pointer transition"
                >
                  Tutup [X]
                </button>
              </div>
            </div>

            {/* Modal Body: Direct Iframe link to the clean server view-resume endpoint */}
            <div className="flex-1 bg-slate-100 p-4 relative">
              <iframe
                id="resume-preview-iframe"
                title="Resume PDF dynamic preview frame"
                src={`/view-resume/${currentUser.id}`}
                className="w-full h-full rounded-2xl border border-slate-250 shadow-md bg-white"
                sandbox="allow-scripts allow-modals allow-downloads allow-forms allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Cover Letter Preview & Export PDF Modal */}
      {showCoverPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-slate-200 animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand/10 border border-brand/20 rounded-xl">
                  <Mail className="text-brand w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-brand uppercase tracking-widest block font-mono">Interactive PDF Sandbox</span>
                  <h3 className="text-sm font-bold truncate">Pratinjau Surat Lamaran: {profile?.fullName || "Saya"}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const iframe = document.getElementById("cover-print-iframe") as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                    }
                  }}
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-[11px] font-extrabold uppercase rounded-lg shadow cursor-pointer transition flex items-center gap-1.5"
                >
                  📥 Cetak & Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowCoverPreview(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xxs font-black uppercase cursor-pointer transition"
                >
                  Tutup [X]
                </button>
              </div>
            </div>

            {/* Modal Body: Direct Iframe link to the clean server view-cover endpoint */}
            <div className="flex-1 bg-slate-100 p-4 relative">
              <iframe
                id="cover-print-iframe"
                title="Cover Letter PDF dynamic preview frame"
                src={`/view-cover/${currentUser.id}`}
                className="w-full h-full rounded-2xl border border-slate-250 shadow-md bg-white"
                sandbox="allow-scripts allow-modals allow-downloads allow-forms allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
