import test from "node:test";
import assert from "node:assert/strict";
import {
  acquireSafeWebGL2Context,
  isSoftwareGpuName,
  projectVec3,
  rotateVec3,
} from "./spatial3d";

test("isSoftwareGpuName identifies SwiftShader and software renderers accurately", () => {
  assert.equal(isSoftwareGpuName("Google SwiftShader"), true);
  assert.equal(isSoftwareGpuName("llvmpipe (LLVM 15.0.7, 256 bits)"), true);
  assert.equal(isSoftwareGpuName("Apple M2 Pro"), false);
  assert.equal(isSoftwareGpuName("NVIDIA GeForce RTX 4070"), false);
});

test("rotateVec3 rotates 3D coordinates around Y axis cleanly", () => {
  const rotated = rotateVec3({ x: 1, y: 0, z: 0 }, 0, Math.PI / 2, 0);
  assert.ok(Math.abs(rotated.x) < 1e-6);
  assert.ok(Math.abs(rotated.y) < 1e-6);
  assert.ok(Math.abs(rotated.z + 1) < 1e-6);
});

test("projectVec3 scales closer points larger than distant points", () => {
  const near = projectVec3({ x: 1, y: 0, z: 2 }, 500, 120, 420, 5.4);
  const far = projectVec3({ x: 1, y: 0, z: -2 }, 500, 120, 420, 5.4);
  assert.ok(near.scale > far.scale);
  assert.ok(near.x > far.x);
});

test("acquireSafeWebGL2Context returns null safely when canvas context creation fails", () => {
  const fakeCanvas = {
    getContext: () => null,
  } as unknown as HTMLCanvasElement;
  const result = acquireSafeWebGL2Context(fakeCanvas);
  assert.equal(result.context, null);
  assert.equal(result.isSoftwareGl, true);

  const throwingCanvas = {
    getContext: () => {
      throw new Error("BindToCurrentSequence failed");
    },
  } as unknown as HTMLCanvasElement;
  const throwingResult = acquireSafeWebGL2Context(throwingCanvas);
  assert.equal(throwingResult.context, null);
  assert.equal(throwingResult.isSoftwareGl, true);
});
