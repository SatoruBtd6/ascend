import { hexRgb } from "../../theme.js";
export const darken = (hex, k = 0.45) => { const c = hexRgb(hex); return c ? `rgb(${c.map((v) => Math.round(v * k)).join(",")})` : hex; };
