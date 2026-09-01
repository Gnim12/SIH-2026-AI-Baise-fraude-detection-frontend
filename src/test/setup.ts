import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom has no URL.createObjectURL/revokeObjectURL — CaptureScreen's
// document/live-frame previews need both to exist.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}

// jsdom implements neither getUserMedia nor MediaRecorder. CaptureScreen's
// LiveFaceCapture/VideoSweepPanel need both to exist so component code can
// call them; individual tests override the getUserMedia mock's resolved/
// rejected value to exercise the granted/denied/no-camera paths.
if (!('mediaDevices' in navigator)) {
  Object.defineProperty(navigator, 'mediaDevices', { value: {}, writable: true, configurable: true });
}
(navigator.mediaDevices as unknown as { getUserMedia: typeof vi.fn }).getUserMedia = vi.fn();

// jsdom's HTMLMediaElement.play()/pause() throw "Not implemented" — stub
// them so <video> elements in tests behave like a real, silently-autoplaying
// element instead of crashing.
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();

class MockMediaRecorder {
  static isTypeSupported() {
    return true;
  }
  stream: MediaStream;
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(stream: MediaStream) {
    this.stream = stream;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    if (this.state !== 'recording') return;
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['sweep'], { type: 'video/webm' }) });
    this.onstop?.();
  }
}

// @ts-expect-error jsdom has no real MediaRecorder implementation.
window.MediaRecorder = MockMediaRecorder;

// jsdom has no ResizeObserver — recharts' <ResponsiveContainer> (used
// throughout DashboardScreen's charts) constructs one to measure its own
// box. DashboardScreen tests mock ResponsiveContainer itself to a
// fixed-size wrapper (jsdom never lays out real pixel sizes anyway), but
// other recharts internals (Legend, Tooltip cursor tracking) also touch
// ResizeObserver at construction time, so a no-op stub belongs here
// rather than duplicated per test file.
if (typeof window.ResizeObserver === 'undefined') {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = MockResizeObserver;
}
