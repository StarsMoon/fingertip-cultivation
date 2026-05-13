/**
 * Jest global setup — mock wx APIs for test environment.
 */

const mockCanvas = {
  width: 375,
  height: 667,
  getContext: () => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    font: '',
    fillText: jest.fn(),
    drawImage: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    globalAlpha: 1,
  }),
};

const mockAudio = {
  src: '',
  volume: 1,
  loop: false,
  autoplay: false,
  startTime: 0,
  duration: 0,
  currentTime: 0,
  paused: true,
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  seek: jest.fn(),
  destroy: jest.fn(),
  onPlay: jest.fn(),
  onPause: jest.fn(),
  onStop: jest.fn(),
  onEnded: jest.fn(),
  onError: jest.fn(),
};

const mockStorage: Record<string, string> = {};

(globalThis as unknown as { wx: typeof wx }).wx = {
  createCanvas: jest.fn(() => mockCanvas),
  createImage: jest.fn(() => ({ src: '', width: 0, height: 0, onload: null, onerror: null })),
  createInnerAudioContext: jest.fn(() => ({ ...mockAudio })),
  onTouchStart: jest.fn(),
  onTouchMove: jest.fn(),
  onTouchEnd: jest.fn(),
  setStorageSync: jest.fn((key: string, data: string) => { mockStorage[key] = data; }),
  getStorageSync: jest.fn((key: string) => mockStorage[key] || ''),
  removeStorageSync: jest.fn((key: string) => { delete mockStorage[key]; }),
  getSystemInfoSync: jest.fn(() => ({
    brand: 'test', model: 'test', pixelRatio: 2,
    screenWidth: 375, screenHeight: 667,
    windowWidth: 375, windowHeight: 667,
    statusBarHeight: 20, language: 'zh_CN',
    version: '1.0.0', system: 'test', platform: 'devtools',
    SDKVersion: '3.0.0',
  })),
  onShow: jest.fn(),
  onHide: jest.fn(),
  onError: jest.fn(),
  vibrateShort: jest.fn(),
  login: jest.fn(),
  request: jest.fn(),
  shareAppMessage: jest.fn(),
  loadSubpackage: jest.fn(),
};
