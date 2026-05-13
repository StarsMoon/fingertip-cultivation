/// <reference path="./wx.d.ts" />

// WeChat Mini Game global declarations
// These are provided by the WeChat runtime, not imported

declare interface Window {
  canvas: CanvasRenderingContext2D;
}

// wx global — provided by WeChat runtime
declare const wx: {
  createCanvas(): WXCanvas;
  createImage(): WXImage;
  createInnerAudioContext(): InnerAudioContext;
  onTouchStart(callback: (res: WXTouchEvent) => void): void;
  onTouchMove(callback: (res: WXTouchEvent) => void): void;
  onTouchEnd(callback: (res: WXTouchEvent) => void): void;
  setStorageSync(key: string, data: string): void;
  getStorageSync(key: string): string;
  removeStorageSync(key: string): void;
  getSystemInfoSync(): WXSystemInfo;
  onShow(callback: () => void): void;
  onHide(callback: () => void): void;
  onError(callback: (error: string) => void): void;
  vibrateShort(object?: { type?: string }): void;
  login(object?: { success?: (res: { code: string }) => void }): void;
  request(object: { url: string; method?: string; data?: unknown; success?: (res: { data: unknown }) => void; fail?: (res: { errMsg: string }) => void }): void;
  shareAppMessage(object?: { title?: string; imageUrl?: string }): void;
  loadSubpackage(object: { name: string; success?: () => void; fail?: (res: { errMsg: string }) => void }): void;
};

interface WXCanvas {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D;
}

interface WXImage {
  src: string;
  width: number;
  height: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
}

interface InnerAudioContext {
  src: string;
  volume: number;
  loop: boolean;
  autoplay: boolean;
  startTime: number;
  duration: number;
  currentTime: number;
  paused: boolean;
  play(): void;
  pause(): void;
  stop(): void;
  seek(position: number): void;
  destroy(): void;
  onPlay(callback: () => void): void;
  onPause(callback: () => void): void;
  onStop(callback: () => void): void;
  onEnded(callback: () => void): void;
  onCanplay(callback: () => void): void;
  onError(callback: (res: { errMsg: string }) => void): void;
}

interface WXTouchEvent {
  touches: ReadonlyArray<{ identifier: number; clientX: number; clientY: number; pageX: number; pageY: number }>;
  changedTouches: ReadonlyArray<{ identifier: number; clientX: number; clientY: number; pageX: number; pageY: number }>;
  timeStamp: number;
}

interface WXSystemInfo {
  brand: string;
  model: string;
  pixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  statusBarHeight: number;
  language: string;
  version: string;
  system: string;
  platform: string;
  SDKVersion: string;
}
