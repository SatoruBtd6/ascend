// Flat config for ESLint 9/10. No plugins so `npx eslint` works without extra installs.
const browserGlobals = [
  "window", "document", "navigator", "location", "history", "screen", "console", "localStorage", "sessionStorage",
  "fetch", "Request", "Response", "Headers", "FormData", "URL", "URLSearchParams", "Blob", "File", "FileReader",
  "Image", "Audio", "AudioContext", "webkitAudioContext", "MediaRecorder", "SpeechSynthesisUtterance", "speechSynthesis",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame",
  "performance", "crypto", "atob", "btoa", "alert", "confirm", "prompt", "structuredClone",
  "TextEncoder", "TextDecoder", "CompressionStream", "DecompressionStream", "AbortController", "ReadableStream",
  "IntersectionObserver", "ResizeObserver", "MutationObserver", "matchMedia", "getComputedStyle",
  "CustomEvent", "Event", "DOMParser", "HTMLElement", "Node", "CanvasRenderingContext2D", "OffscreenCanvas",
  "geolocation", "Notification", "caches", "indexedDB", "Worker", "WebSocket", "queueMicrotask", "reportError",
];
const nodeGlobals = ["process", "Buffer", "__dirname", "__filename", "global"];
const readonly = (names) => Object.fromEntries(names.map((n) => [n, "readonly"]));

export default [
  { ignores: ["dist/**", "node_modules/**", "public/**"] },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...readonly(browserGlobals), ...readonly(nodeGlobals) },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-dupe-else-if": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-const-assign": "error",
      "no-self-compare": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "use-isnan": "error",
      "valid-typeof": "error",
      eqeqeq: ["warn", "smart"],
    },
  },
];
