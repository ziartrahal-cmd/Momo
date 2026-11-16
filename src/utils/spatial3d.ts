export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  scale: number;
}

const SOFTWARE_RENDERER_REGEX =
  /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i;

export function isSoftwareGpuName(rendererName: string): boolean {
  return SOFTWARE_RENDERER_REGEX.test(rendererName);
}

/**
 * Rotates a 3D point by Euler angles (rx, ry, rz) in XYZ order.
 */
export function rotateVec3(
  point: Vec3,
  rx: number,
  ry: number,
  rz: number
): Vec3 {
  // Rotate X
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y1 = point.y * cosX - point.z * sinX;
  const z1 = point.y * sinX + point.z * cosX;

  // Rotate Y
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x2 = point.x * cosY + z1 * sinY;
  const z2 = -point.x * sinY + z1 * cosY;

  // Rotate Z
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x2 * cosZ - y1 * sinZ;
  const y3 = x2 * sinZ + y1 * cosZ;

  return { x: x3, y: y3, z: z2 };
}

/**
 * Projects a 3D world point onto 2D viewport coordinates using a pinhole camera.
 */
export function projectVec3(
  point: Vec3,
  centerX: number,
  centerY: number,
  focalLength: number,
  cameraZ = 5.4
): ProjectedPoint {
  const depth = Math.max(cameraZ - point.z, 0.35);
  const scale = focalLength / depth;
  return {
    x: centerX + point.x * scale,
    y: centerY - point.y * scale,
    z: point.z,
    scale,
  };
}

/**
 * Safely attempts to obtain a single WebGL2 context on the provided canvas
 * without throwing or invoking THREE.WebGLRenderer when WebGL2 is unavailable.
 */
export function acquireSafeWebGL2Context(canvas: HTMLCanvasElement): {
  context: WebGL2RenderingContext | null;
  isSoftwareGl: boolean;
} {
  try {
    const attrs: WebGLContextAttributes = {
      alpha: false,
      depth: true,
      stencil: false,
      antialias: true,
      powerPreference: "default",
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false,
    };
    const gl = canvas.getContext(
      "webgl2",
      attrs
    ) as WebGL2RenderingContext | null;

    if (!gl || gl.isContextLost()) {
      return { context: null, isSoftwareGl: true };
    }

    let gpuName = "";
    try {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      gpuName = String(gl.getParameter(param) ?? "");
    } catch {
      gpuName = "";
    }

    return {
      context: gl,
      isSoftwareGl: isSoftwareGpuName(gpuName),
    };
  } catch {
    return { context: null, isSoftwareGl: true };
  }
}
