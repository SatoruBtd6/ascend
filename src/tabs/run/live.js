import { ensureSegments } from "../../run.js";
export const LIVE_KEY = "ascend-live-run";
export const saveLive = (r) => { try { localStorage.setItem(LIVE_KEY, JSON.stringify(r)); } catch (e) { /* storage full */ } };
export const loadLive = () => { try { const r = JSON.parse(localStorage.getItem(LIVE_KEY) || "null"); return r ? ensureSegments(r) : null; } catch { return null; } };
export const clearLive = () => { try { localStorage.removeItem(LIVE_KEY); } catch (e) { /* ignore */ } };
