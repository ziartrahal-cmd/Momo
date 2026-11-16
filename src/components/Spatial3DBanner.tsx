import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ChevronDown, ChevronUp, Pause, Play } from "lucide-react";
import type { AppLanguage } from "../utils/i18n";
import {
  acquireSafeWebGL2Context,
  projectVec3,
  rotateVec3,
  type Vec3,
} from "../utils/spatial3d";

interface Spatial3DBannerProps {
  language: AppLanguage;
  activeEmail?: string | null;
  platformsCount: number;
  draftsCount: number;
  notesCount: number;
  onJumpToDirectory: () => void;
  onJumpToPublishing: () => void;
}

const SPATIAL_COPY: Record<
  AppLanguage,
  {
    kineticHeadline: string;
    subtitle: string;
    ribbonItems: string[];
    collapseLabel: string;
    expandLabel: string;
    pauseLabel: string;
    resumeLabel: string;
    openDirectoryBtn: string;
    openPublishingBtn: string;
    collapsedTitle: string;
    statsPlatforms: string;
    statsDrafts: string;
    statsNotes: string;
  }
> = {
  ar: {
    kineticHeadline: "رحّال بلس · مساحة الذكاء والقنوات الموحدة",
    subtitle:
      "منظومة سريعة تدمج المساعد الشخصي والنشر التلقائي ودليل المنصات مع حساب جوجل النشط في واجهة ثلاثية الأبعاد متفاعلة.",
    ribbonItems: [
      "Google Workspace",
      "YouTube Studio",
      "Gemini AI",
      "Facebook",
      "Instagram",
      "TikTok",
      "Unified Notes",
    ],
    collapseLabel: "طيّ العرض ثلاثي الأبعاد",
    expandLabel: "إظهار العرض ثلاثي الأبعاد",
    pauseLabel: "إيقاف حركة 3D مؤقتاً",
    resumeLabel: "تشغيل حركة 3D",
    openDirectoryBtn: "تشغيل المنصات المدمجة",
    openPublishingBtn: "فتح النشر الموحد",
    collapsedTitle: "العرض المكاني 3D مطوي لتسريع التركيز",
    statsPlatforms: "منصة",
    statsDrafts: "مسودة",
    statsNotes: "ملاحظة",
  },
  en: {
    kineticHeadline: "Rahal Plus · Unified Spatial Studio",
    subtitle:
      "High-speed workspace unifying your personal AI assistant, multi-channel publishing, and merged platform workflows under one Google login.",
    ribbonItems: [
      "Google Workspace",
      "YouTube Studio",
      "Gemini AI",
      "Facebook",
      "Instagram",
      "TikTok",
      "Unified Notes",
    ],
    collapseLabel: "Collapse 3D showcase",
    expandLabel: "Expand 3D showcase",
    pauseLabel: "Pause 3D motion",
    resumeLabel: "Resume 3D motion",
    openDirectoryBtn: "Open Merged Platforms",
    openPublishingBtn: "Open Unified Publisher",
    collapsedTitle: "3D Spatial showcase collapsed",
    statsPlatforms: "Platforms",
    statsDrafts: "Drafts",
    statsNotes: "Notes",
  },
  ru: {
    kineticHeadline: "Rahal Plus · Единая 3D-студия",
    subtitle:
      "Быстрое пространство, объединяющее личного ИИ-ассистента, мультиканальную публикацию и единый вход через Google.",
    ribbonItems: [
      "Google Workspace",
      "YouTube Studio",
      "Gemini AI",
      "Facebook",
      "Instagram",
      "TikTok",
      "Unified Notes",
    ],
    collapseLabel: "Свернуть 3D-сцену",
    expandLabel: "Показать 3D-сцену",
    pauseLabel: "Пауза 3D",
    resumeLabel: "Запустить 3D",
    openDirectoryBtn: "Объединённые платформы",
    openPublishingBtn: "Единая публикация",
    collapsedTitle: "3D-сцена свёрнута для компактного вида",
    statsPlatforms: "Платформ",
    statsDrafts: "Черновиков",
    statsNotes: "Заметок",
  },
};

// Pre-allocated Three.js math helpers (zero per-frame GC inside animation loop)
const _dummy = new THREE.Object3D();
const _moteColor = new THREE.Color();

// Octahedron wireframe vertices & edges for crisp 2D-3D projection fallback
const OCTA_VERTS: Vec3[] = [
  { x: 0, y: 1.05, z: 0 },
  { x: 1.05, y: 0, z: 0 },
  { x: 0, y: 0, z: 1.05 },
  { x: -1.05, y: 0, z: 0 },
  { x: 0, y: 0, z: -1.05 },
  { x: 0, y: -1.05, z: 0 },
];
const OCTA_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [5, 1],
  [5, 2],
  [5, 3],
  [5, 4],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 1],
];

const INNER_DIAMOND_VERTS: Vec3[] = [
  { x: 0, y: 0.68, z: 0 },
  { x: 0.62, y: 0.2, z: 0.35 },
  { x: -0.62, y: 0.2, z: 0.35 },
  { x: 0, y: 0.2, z: -0.65 },
  { x: 0.58, y: -0.25, z: -0.35 },
  { x: -0.58, y: -0.25, z: -0.35 },
  { x: 0, y: -0.25, z: 0.65 },
  { x: 0, y: -0.68, z: 0 },
];
const INNER_DIAMOND_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 6],
  [2, 6],
  [1, 4],
  [2, 5],
  [3, 4],
  [3, 5],
  [7, 4],
  [7, 5],
  [7, 6],
  [1, 2],
  [4, 5],
  [1, 3],
  [2, 3],
  [4, 6],
  [5, 6],
];

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, "rgba(2, 6, 23, 0.72)");
    grad.addColorStop(0.45, "rgba(30, 64, 175, 0.28)");
    grad.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Software 2D-Canvas 3D projection engine used automatically whenever WebGL2
 * is blocked, sandboxed, or unavailable on legacy/headless GPUs.
 * Produces zero console errors while preserving real 3D geometry & parallax.
 */
function mountCanvas2D3DFallback(params: {
  mountEl: HTMLDivElement;
  containerEl: HTMLDivElement;
  language: AppLanguage;
  prefersReducedMotion: boolean;
  pausedRef: React.MutableRefObject<boolean>;
  isVisibleRef: React.MutableRefObject<boolean>;
  pointerTargetRef: React.MutableRefObject<{ x: number; y: number }>;
  resumeLoopRef: React.MutableRefObject<(() => void) | null>;
}): () => void {
  const {
    mountEl,
    containerEl,
    language,
    prefersReducedMotion,
    pausedRef,
    isVisibleRef,
    pointerTargetRef,
    resumeLoopRef,
  } = params;

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  mountEl.innerHTML = "";
  mountEl.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return () => {
      mountEl.innerHTML = "";
    };
  }

  let width = Math.max(mountEl.clientWidth, 320);
  let height = Math.max(mountEl.clientHeight, 210);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function updateSize(w: number, h: number) {
    width = Math.max(Math.floor(w), 300);
    height = Math.max(Math.floor(h), 180);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  updateSize(width, height);

  const isRtl = language === "ar";
  const satelliteColors = [
    "#4285f4",
    "#ef4444",
    "#2563eb",
    "#e1306c",
    "#14b8a6",
  ];
  const moteSeeds = Array.from({ length: 32 }, (_, idx) => ({
    angle: (idx / 32) * Math.PI * 2,
    radius: 2.1 + (idx % 5) * 0.65,
    yBase: ((idx % 7) - 3) * 0.44,
    speed: 0.24 + (idx % 4) * 0.09,
    size: 1.4 + (idx % 3) * 0.7,
    color: idx % 4 === 0 ? "#fbbf24" : idx % 2 === 0 ? "#93c5fd" : "#e2e8f0",
  }));

  let disposed = false;
  let frameId = 0;
  let lastTimeMs = performance.now();
  let elapsedAcc = 0;
  let smoothPointerX = 0;
  let smoothPointerY = 0;

  function handlePointerMove(e: PointerEvent) {
    const rect = containerEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointerTargetRef.current.x = Math.max(-1, Math.min(1, nx));
    pointerTargetRef.current.y = Math.max(-1, Math.min(1, ny));
  }

  function handlePointerLeave() {
    pointerTargetRef.current.x = 0;
    pointerTargetRef.current.y = 0;
  }

  containerEl.addEventListener("pointermove", handlePointerMove, {
    passive: true,
  });
  containerEl.addEventListener("pointerleave", handlePointerLeave, {
    passive: true,
  });

  function drawSceneFrame() {
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);

    // Background slate-obsidian gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#0b1120");
    bgGrad.addColorStop(0.55, "#0f172a");
    bgGrad.addColorStop(1, "#172554");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const isMobile = width < 640;
    const cx = isMobile
      ? width * (isRtl ? 0.26 : 0.74)
      : width * (isRtl ? 0.25 : 0.75);
    const cy = height * 0.5 + Math.sin(elapsedAcc * 1.5) * 4;
    const focal = Math.min(width, height) * (isMobile ? 0.72 : 0.92);

    // Subtle cobalt core radial glow
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, focal * 0.85);
    glow.addColorStop(0, "rgba(59, 130, 246, 0.34)");
    glow.addColorStop(0.5, "rgba(37, 99, 235, 0.12)");
    glow.addColorStop(1, "rgba(11, 17, 32, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Contact grounding shadow
    ctx.save();
    ctx.fillStyle = "rgba(2, 6, 23, 0.52)";
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy + focal * 0.34,
      focal * 0.34,
      focal * 0.08,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    const pRx = smoothPointerY * 0.22;
    const pRy = smoothPointerX * 0.35;

    // 1. Background 3D starfield motes
    for (const s of moteSeeds) {
      const a = s.angle + elapsedAcc * s.speed * 0.25;
      const world: Vec3 = {
        x: Math.cos(a) * s.radius,
        y: s.yBase + Math.sin(elapsedAcc * s.speed + s.angle) * 0.12,
        z: Math.sin(a) * s.radius * 0.55 - 1.1,
      };
      const proj = projectVec3(world, cx, cy, focal * 0.7, 5.4);
      ctx.globalAlpha = Math.max(0.18, Math.min(0.85, (proj.z + 2.8) / 4.2));
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Helper to draw a 3D ring using 48 segments
    const drawOrbitRing = (
      radius: number,
      rx: number,
      ry: number,
      rz: number,
      strokeStyle: string,
      lineWidth: number
    ) => {
      const steps = 44;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const basePt = {
          x: Math.cos(theta) * radius,
          y: Math.sin(theta) * radius,
          z: 0,
        };
        const rLocal = rotateVec3(basePt, rx, ry, rz);
        const rWorld = rotateVec3(rLocal, pRx, pRy, 0);
        const proj = projectVec3(rWorld, cx, cy, focal, 5.4);
        if (i === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      }
      ctx.stroke();
    };

    // 2. Three precision orbital gimbal rings
    drawOrbitRing(
      1.56,
      Math.PI * 0.34,
      Math.PI * 0.15,
      elapsedAcc * 0.28,
      "rgba(226, 232, 240, 0.72)",
      1.6
    );
    drawOrbitRing(
      1.32,
      -Math.PI * 0.28 + elapsedAcc * 0.34,
      Math.PI * 0.4,
      0.2,
      "rgba(96, 165, 250, 0.76)",
      1.4
    );
    drawOrbitRing(
      1.06,
      Math.PI * 0.12,
      -Math.PI * 0.22 - elapsedAcc * 0.46,
      Math.PI * 0.35,
      "rgba(245, 158, 11, 0.8)",
      1.2
    );

    // 3. Outer optical octahedron crystal cage
    const shellRotX = pRx + elapsedAcc * 0.14;
    const shellRotY = pRy - elapsedAcc * 0.34;
    const shellRotZ = elapsedAcc * 0.18;
    const projectedShell = OCTA_VERTS.map((v) =>
      projectVec3(rotateVec3(v, shellRotX, shellRotY, shellRotZ), cx, cy, focal, 5.4)
    );
    ctx.strokeStyle = "rgba(186, 230, 253, 0.55)";
    ctx.lineWidth = 1.15;
    for (const [a, b] of OCTA_EDGES) {
      ctx.beginPath();
      ctx.moveTo(projectedShell[a].x, projectedShell[a].y);
      ctx.lineTo(projectedShell[b].x, projectedShell[b].y);
      ctx.stroke();
    }

    // 4. Inner cobalt-titanium core
    const coreRotX = pRx + elapsedAcc * 0.24;
    const coreRotY = pRy + elapsedAcc * 0.55;
    const projectedCore = INNER_DIAMOND_VERTS.map((v) =>
      projectVec3(rotateVec3(v, coreRotX, coreRotY, 0), cx, cy, focal, 5.4)
    );
    const coreGrad = ctx.createRadialGradient(
      cx - 8,
      cy - 8,
      2,
      cx,
      cy,
      focal * 0.18
    );
    coreGrad.addColorStop(0, "#60a5fa");
    coreGrad.addColorStop(0.65, "#2563eb");
    coreGrad.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, focal * 0.145, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(219, 234, 254, 0.72)";
    ctx.lineWidth = 1;
    for (const [a, b] of INNER_DIAMOND_EDGES) {
      ctx.beginPath();
      ctx.moveTo(projectedCore[a].x, projectedCore[a].y);
      ctx.lineTo(projectedCore[b].x, projectedCore[b].y);
      ctx.stroke();
    }

    // 5. Five orbiting satellite nodes (depth-sorted)
    const satNodes = satelliteColors
      .map((color, idx) => {
        const phase = elapsedAcc * 0.72 + (idx * Math.PI * 2) / 5;
        const pos = rotateVec3(
          {
            x: Math.cos(phase) * 1.56,
            y: Math.sin(phase * 1.3) * 0.52,
            z: Math.sin(phase) * 1.56,
          },
          pRx,
          pRy,
          0
        );
        const proj = projectVec3(pos, cx, cy, focal, 5.4);
        return { color, proj };
      })
      .sort((a, b) => a.proj.z - b.proj.z);

    for (const node of satNodes) {
      const r = Math.max(3.5, Math.min(7.5, node.proj.scale * 0.055));
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.proj.x, node.proj.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  function tick() {
    if (disposed) return;
    const now = performance.now();
    const delta = Math.min((now - lastTimeMs) / 1000, 0.05);
    lastTimeMs = now;

    const animateActive =
      !pausedRef.current &&
      !prefersReducedMotion &&
      isVisibleRef.current &&
      document.visibilityState === "visible";

    if (animateActive) {
      elapsedAcc += Math.max(delta, 0);
      smoothPointerX += (pointerTargetRef.current.x - smoothPointerX) * 0.1;
      smoothPointerY += (pointerTargetRef.current.y - smoothPointerY) * 0.1;
    }

    drawSceneFrame();

    if (!animateActive) return;
    frameId = requestAnimationFrame(tick);
  }

  resumeLoopRef.current = () => {
    if (disposed) return;
    lastTimeMs = performance.now();
    cancelAnimationFrame(frameId);
    tick();
  };

  const resizeObserver = new ResizeObserver((entries) => {
    if (disposed) return;
    const entry = entries[0];
    if (!entry) return;
    updateSize(entry.contentRect.width, entry.contentRect.height);
    drawSceneFrame();
  });
  resizeObserver.observe(mountEl);

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      const nextVisible = Boolean(entries[0]?.isIntersecting);
      const wasVisible = isVisibleRef.current;
      isVisibleRef.current = nextVisible;
      if (
        nextVisible &&
        !wasVisible &&
        !pausedRef.current &&
        !prefersReducedMotion
      ) {
        resumeLoopRef.current?.();
      }
    },
    { threshold: 0.05 }
  );
  intersectionObserver.observe(containerEl);

  function handleVisibilityChange() {
    if (
      document.visibilityState === "visible" &&
      !pausedRef.current &&
      !prefersReducedMotion &&
      isVisibleRef.current
    ) {
      resumeLoopRef.current?.();
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange);

  tick();

  return () => {
    disposed = true;
    resumeLoopRef.current = null;
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    containerEl.removeEventListener("pointermove", handlePointerMove);
    containerEl.removeEventListener("pointerleave", handlePointerLeave);
    mountEl.innerHTML = "";
  };
}

export function Spatial3DBanner({
  language,
  activeEmail,
  platformsCount,
  draftsCount,
  notesCount,
  onJumpToDirectory,
  onJumpToPublishing,
}: Spatial3DBannerProps) {
  const copy = SPATIAL_COPY[language];
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(isPaused);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const isVisibleRef = useRef(true);
  const resumeLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    pausedRef.current = isPaused;
    if (!isPaused) {
      resumeLoopRef.current?.();
    }
  }, [isPaused]);

  useEffect(() => {
    if (isCollapsed) return;
    const mountEl = canvasMountRef.current;
    const containerEl = stageRef.current;
    if (!mountEl || !containerEl) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Single-context probe: never invoke THREE.WebGLRenderer if WebGL2 cannot be acquired,
    // preventing THREE.WebGLRenderer console errors on legacy/sandboxed GPUs.
    const glCanvas = document.createElement("canvas");
    const { context: sharedGlContext, isSoftwareGl } =
      acquireSafeWebGL2Context(glCanvas);

    let renderer: THREE.WebGLRenderer | null = null;
    if (sharedGlContext) {
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: glCanvas,
          context: sharedGlContext,
          antialias: !isSoftwareGl,
          powerPreference: "default",
          alpha: false,
        });
      } catch {
        renderer = null;
      }
    }

    if (!renderer) {
      return mountCanvas2D3DFallback({
        mountEl,
        containerEl,
        language,
        prefersReducedMotion,
        pausedRef,
        isVisibleRef,
        pointerTargetRef,
        resumeLoopRef,
      });
    }

    const activeRenderer = renderer;
    activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
    activeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    activeRenderer.toneMappingExposure = 1.15;
    activeRenderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    activeRenderer.shadowMap.enabled = !isSoftwareGl;
    activeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initialWidth = Math.max(mountEl.clientWidth, 320);
    const initialHeight = Math.max(mountEl.clientHeight, 210);
    activeRenderer.setSize(initialWidth, initialHeight);
    activeRenderer.domElement.style.display = "block";
    activeRenderer.domElement.style.width = "100%";
    activeRenderer.domElement.style.height = "100%";
    mountEl.innerHTML = "";
    mountEl.appendChild(activeRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    scene.fog = new THREE.FogExp2(0x0b1120, 0.048);

    const camera = new THREE.PerspectiveCamera(
      40,
      initialWidth / initialHeight,
      0.1,
      60
    );
    camera.position.set(0, 0.45, 6.2);
    camera.lookAt(0, 0, 0);

    // Procedural Studio IBL (guarded for restricted drivers)
    let envTarget: THREE.WebGLRenderTarget | null = null;
    try {
      const pmremGenerator = new THREE.PMREMGenerator(activeRenderer);
      const roomEnv = new RoomEnvironment();
      envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envTarget.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();
    } catch {
      envTarget = null;
    }

    // 3-Point Studio Lighting (Warm Key + Cool Hemisphere + Cobalt Rim)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.3);
    keyLight.position.set(4.5, 5.5, 4.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -4;
      keyLight.shadow.camera.right = 4;
      keyLight.shadow.camera.top = 4;
      keyLight.shadow.camera.bottom = -4;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.9);
    rimLight.position.set(-4.2, 1.5, -3.5);
    scene.add(rimLight);

    // Composite 3D Procedural Spatial Nexus Group
    const heroGroup = new THREE.Group();
    const isRtl = language === "ar";
    const applyResponsiveGroupPose = (width: number) => {
      if (width < 640) {
        heroGroup.position.set(isRtl ? -0.95 : 0.95, -0.18, -0.4);
        heroGroup.scale.setScalar(0.76);
      } else {
        heroGroup.position.set(isRtl ? -1.85 : 1.85, 0.08, 0);
        heroGroup.scale.setScalar(1);
      }
    };
    applyResponsiveGroupPose(initialWidth);
    scene.add(heroGroup);

    // 1. Brushed cobalt-titanium faceted core
    const coreGeo = new THREE.IcosahedronGeometry(0.78, 0);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x2563eb,
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.castShadow = !isSoftwareGl;
    heroGroup.add(coreMesh);

    // 2. Optical inner glass cage
    const shellGeo = new THREE.OctahedronGeometry(1.12, 0);
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      metalness: 0.05,
      roughness: 0.08,
      transmission: isSoftwareGl ? 0 : 0.82,
      transparent: true,
      opacity: isSoftwareGl ? 0.34 : 0.92,
      ior: 1.6,
      thickness: 1.2,
      clearcoat: 1.0,
      depthWrite: false,
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    shellMesh.renderOrder = 2;
    heroGroup.add(shellMesh);

    // 3. Three tilted precision orbital gimbal rings
    const ringOuterGeo = new THREE.TorusGeometry(1.56, 0.032, 16, 72);
    const ringOuterMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.18,
    });
    const ringOuter = new THREE.Mesh(ringOuterGeo, ringOuterMat);
    ringOuter.rotation.set(Math.PI * 0.34, Math.PI * 0.15, 0);
    heroGroup.add(ringOuter);

    const ringMidGeo = new THREE.TorusGeometry(1.32, 0.028, 16, 64);
    const ringMidMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      metalness: 0.52,
      roughness: 0.48,
    });
    const ringMid = new THREE.Mesh(ringMidGeo, ringMidMat);
    ringMid.rotation.set(-Math.PI * 0.28, Math.PI * 0.4, 0.2);
    heroGroup.add(ringMid);

    const ringInnerGeo = new THREE.TorusGeometry(1.06, 0.022, 14, 56);
    const ringInnerMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.92,
      roughness: 0.22,
    });
    const ringInner = new THREE.Mesh(ringInnerGeo, ringInnerMat);
    ringInner.rotation.set(Math.PI * 0.12, -Math.PI * 0.22, Math.PI * 0.35);
    heroGroup.add(ringInner);

    // 4. Five orbiting satellite platform nodes
    const satellitePalette = [0x4285f4, 0xef4444, 0x2563eb, 0xe1306c, 0x14b8a6];
    const satelliteGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const satelliteMeshes: THREE.Mesh[] = [];
    const satelliteMats: THREE.MeshStandardMaterial[] = [];

    for (let i = 0; i < satellitePalette.length; i++) {
      const satMat = new THREE.MeshStandardMaterial({
        color: satellitePalette[i],
        metalness: 0.65,
        roughness: 0.26,
      });
      const satMesh = new THREE.Mesh(satelliteGeo, satMat);
      satelliteMeshes.push(satMesh);
      satelliteMats.push(satMat);
      heroGroup.add(satMesh);
    }

    // 5. Contact shadow grounding plane
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.CircleGeometry(2.2, 40);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -1.62, 0);
    heroGroup.add(shadowPlane);

    // 6. Instanced background geometric starfield motes
    const moteCount = 36;
    const moteGeo = new THREE.OctahedronGeometry(0.055, 0);
    const moteMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      metalness: 0.6,
      roughness: 0.35,
    });
    const moteMesh = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
    moteMesh.frustumCulled = false;

    const moteSeeds = Array.from({ length: moteCount }, (_, idx) => {
      const angle = (idx / moteCount) * Math.PI * 2;
      const radius = 2.4 + (idx % 5) * 0.72;
      const yBase = ((idx % 7) - 3) * 0.48;
      const speed = 0.22 + (idx % 4) * 0.09;
      const scale = 0.65 + (idx % 3) * 0.28;
      return { angle, radius, yBase, speed, scale };
    });

    for (let i = 0; i < moteCount; i++) {
      const s = moteSeeds[i];
      _dummy.position.set(
        Math.cos(s.angle) * s.radius,
        s.yBase,
        Math.sin(s.angle) * s.radius * 0.6 - 1.4
      );
      _dummy.scale.setScalar(s.scale);
      _dummy.updateMatrix();
      moteMesh.setMatrixAt(i, _dummy.matrix);
      _moteColor.setHex(
        i % 4 === 0 ? 0xfbbf24 : i % 2 === 0 ? 0x93c5fd : 0xe2e8f0
      );
      moteMesh.setColorAt(i, _moteColor);
    }
    moteMesh.instanceMatrix.needsUpdate = true;
    if (moteMesh.instanceColor) moteMesh.instanceColor.needsUpdate = true;
    moteMesh.computeBoundingSphere();
    scene.add(moteMesh);

    if (!isSoftwareGl) {
      activeRenderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    let lastTimeMs = performance.now();

    function handleContextLost(e: Event) {
      e.preventDefault();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
    }

    function handleContextRestored() {
      if (!disposed) {
        activeRenderer.render(scene, camera);
      }
    }

    activeRenderer.domElement.addEventListener(
      "webglcontextlost",
      handleContextLost
    );
    activeRenderer.domElement.addEventListener(
      "webglcontextrestored",
      handleContextRestored
    );

    function handlePointerMove(e: PointerEvent) {
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      pointerTargetRef.current.x = THREE.MathUtils.clamp(nx, -1, 1);
      pointerTargetRef.current.y = THREE.MathUtils.clamp(ny, -1, 1);
    }

    function handlePointerLeave() {
      pointerTargetRef.current.x = 0;
      pointerTargetRef.current.y = 0;
    }

    containerEl.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    containerEl.addEventListener("pointerleave", handlePointerLeave, {
      passive: true,
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (disposed) return;
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(Math.floor(entry.contentRect.width), 300);
      const h = Math.max(Math.floor(entry.contentRect.height), 180);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      activeRenderer.setSize(w, h);
      applyResponsiveGroupPose(w);
      activeRenderer.render(scene, camera);
    });
    resizeObserver.observe(mountEl);

    function consumeDeltaSec(): number {
      const now = performance.now();
      const dt = Math.min((now - lastTimeMs) / 1000, 0.05);
      lastTimeMs = now;
      return Math.max(dt, 0);
    }

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = activeRenderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === "function") {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    let elapsedAcc = 0;

    function tick() {
      if (disposed) return;

      const delta = consumeDeltaSec();
      const animateActive =
        !pausedRef.current &&
        !prefersReducedMotion &&
        isVisibleRef.current &&
        document.visibilityState === "visible";

      if (animateActive) {
        elapsedAcc += delta;

        coreMesh.rotation.y += delta * 0.55;
        coreMesh.rotation.x += delta * 0.22;
        shellMesh.rotation.y -= delta * 0.34;
        shellMesh.rotation.z += delta * 0.18;

        ringOuter.rotation.z += delta * 0.28;
        ringMid.rotation.x += delta * 0.36;
        ringInner.rotation.y -= delta * 0.48;

        for (let i = 0; i < satelliteMeshes.length; i++) {
          const phase =
            elapsedAcc * 0.72 + (i * Math.PI * 2) / satelliteMeshes.length;
          const sat = satelliteMeshes[i];
          sat.position.set(
            Math.cos(phase) * 1.56,
            Math.sin(phase * 1.3) * 0.52,
            Math.sin(phase) * 1.56
          );
          sat.rotation.x += delta * 0.9;
          sat.rotation.y += delta * 1.1;
        }

        heroGroup.position.y = 0.08 + Math.sin(elapsedAcc * 1.6) * 0.08;

        heroGroup.rotation.y = THREE.MathUtils.damp(
          heroGroup.rotation.y,
          pointerTargetRef.current.x * 0.35,
          5.5,
          delta
        );
        heroGroup.rotation.x = THREE.MathUtils.damp(
          heroGroup.rotation.x,
          pointerTargetRef.current.y * 0.22,
          5.5,
          delta
        );

        for (let i = 0; i < moteCount; i++) {
          const s = moteSeeds[i];
          const a = s.angle + elapsedAcc * s.speed * 0.25;
          _dummy.position.set(
            Math.cos(a) * s.radius,
            s.yBase + Math.sin(elapsedAcc * s.speed + i) * 0.12,
            Math.sin(a) * s.radius * 0.55 - 1.4
          );
          _dummy.rotation.set(a, a * 0.7, 0);
          _dummy.scale.setScalar(s.scale);
          _dummy.updateMatrix();
          moteMesh.setMatrixAt(i, _dummy.matrix);
        }
        moteMesh.instanceMatrix.needsUpdate = true;
      }

      activeRenderer.render(scene, camera);

      if (prefersReducedMotion || pausedRef.current || !isVisibleRef.current) {
        return;
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    resumeLoopRef.current = () => {
      if (disposed) return;
      lastTimeMs = performance.now();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      tick();
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const nextVisible = Boolean(entry?.isIntersecting);
        const wasVisible = isVisibleRef.current;
        isVisibleRef.current = nextVisible;
        if (
          nextVisible &&
          !wasVisible &&
          !pausedRef.current &&
          !prefersReducedMotion
        ) {
          resumeLoopRef.current?.();
        }
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(containerEl);

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        !pausedRef.current &&
        !prefersReducedMotion &&
        isVisibleRef.current
      ) {
        resumeLoopRef.current?.();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    tick();

    return () => {
      disposed = true;
      resumeLoopRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      containerEl.removeEventListener("pointermove", handlePointerMove);
      containerEl.removeEventListener("pointerleave", handlePointerLeave);
      activeRenderer.domElement.removeEventListener(
        "webglcontextlost",
        handleContextLost
      );
      activeRenderer.domElement.removeEventListener(
        "webglcontextrestored",
        handleContextRestored
      );

      coreGeo.dispose();
      coreMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      ringOuterGeo.dispose();
      ringOuterMat.dispose();
      ringMidGeo.dispose();
      ringMidMat.dispose();
      ringInnerGeo.dispose();
      ringInnerMat.dispose();
      satelliteGeo.dispose();
      satelliteMats.forEach((m) => m.dispose());
      shadowTex.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      envTarget?.dispose();
      activeRenderer.dispose();
      mountEl.innerHTML = "";
    };
  }, [isCollapsed, language]);

  if (isCollapsed) {
    return (
      <div
        data-testid="spatial-3d-collapsed"
        className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between gap-3"
      >
        <span className="text-xs font-medium text-slate-600 truncate">
          {copy.collapsedTitle}
        </span>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{copy.expandLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <section
      ref={stageRef}
      data-testid="spatial-3d-banner"
      aria-label={copy.kineticHeadline}
      className="relative mb-6 rounded-2xl overflow-hidden border border-slate-800/80 bg-[#0B1120] text-white min-h-[220px] sm:min-h-[248px]"
    >
      {/* Isolated 3D canvas container (WebGL2 or zero-error 2D-3D projection fallback) */}
      <div
        ref={canvasMountRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Measured gradient scrim ensuring >4.5:1 text contrast over 3D geometry */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none ${
          language === "ar"
            ? "bg-gradient-to-l from-[#0B1120]/95 via-[#0B1120]/80 to-[#0B1120]/25"
            : "bg-gradient-to-r from-[#0B1120]/95 via-[#0B1120]/80 to-[#0B1120]/25"
        }`}
      />

      {/* Semantic Foreground DOM Overlay */}
      <div className="relative z-10 p-5 sm:p-7 flex flex-col justify-between gap-5 min-h-[220px] sm:min-h-[248px]">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <h2 className="font-display text-xl sm:text-2xl lg:text-[26px] font-bold tracking-tight text-white">
              <span className="kinetic-title-sway">{copy.kineticHeadline}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
              {copy.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-0.5">
              <span className="tabular-nums text-slate-200 font-medium">
                {platformsCount} {copy.statsPlatforms}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums text-slate-200 font-medium">
                {draftsCount} {copy.statsDrafts}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums text-slate-200 font-medium">
                {notesCount} {copy.statsNotes}
              </span>
              {activeEmail && (
                <>
                  <span aria-hidden="true">·</span>
                  <span dir="ltr" className="font-mono text-emerald-300">
                    {activeEmail}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              aria-label={isPaused ? copy.resumeLabel : copy.pauseLabel}
              className="p-2 rounded-lg bg-slate-900/90 border border-white/15 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              {isPaused ? (
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Pause className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              aria-label={copy.collapseLabel}
              className="p-2 rounded-lg bg-slate-900/90 border border-white/15 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Bottom row: Back-and-forth kinetic platform typography + 1-click navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="overflow-hidden max-w-full md:max-w-lg py-1">
            <div className="kinetic-ribbon-glide items-center gap-2 text-xs font-display font-semibold text-blue-200 whitespace-nowrap">
              {copy.ribbonItems.map((item, idx) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span>{item}</span>
                  {idx < copy.ribbonItems.length - 1 && (
                    <span aria-hidden="true" className="text-slate-500">
                      /
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onJumpToDirectory}
              className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copy.openDirectoryBtn}
            </button>
            <button
              type="button"
              onClick={onJumpToPublishing}
              className="px-3.5 py-2 text-xs font-medium text-slate-100 bg-slate-900/90 border border-white/15 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copy.openPublishingBtn}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
