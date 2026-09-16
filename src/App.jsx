import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase.js";
import { Users, TrendingUp, MapPin, Droplets, Ruler, Video, Link2, CircleDot, Download, Youtube, ChefHat, Music, Image as ImageIcon, Share2, Footprints, Weight, Repeat, CalendarCheck, Activity, Zap, Star, Pencil, Camera, Hand, MessageCircle, Type, Award, Lock, Sparkle, Bookmark, Store, Globe, SkipForward, Timer as TimerIcon, Layers, Play, Pause, RotateCcw, Minus, Shield, Settings as Gear, Bot, Mic, Send, Volume2, VolumeX, Copy, Moon, Sun, Palette, Save, Upload, Dumbbell, Swords, Utensils, User, Plus, X, Check, Flame, Sparkles, Trash2, Loader2, ChevronDown, ChevronLeft, ChevronRight, Trophy, RefreshCw, CalendarDays, Crown } from "lucide-react";

/* ---------- Moderation ---------- */
const reportItem = async (key, reason = "Inappropriate content") => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("reports").insert({
      reported_item_key: key,
      reported_by: session.user.id,
      reason: reason
    });
    alert("Reported successfully. An admin will review this.");
  } catch (e) {
    console.error("Report failed", e);
  }
};

/* ---------- Theme ---------- */
const THEMES = {
  dark: {
    bg: "#000000", text: "#F2F8FF", dim: "#A3B6CF", mute: "#71869F", sub: "#CFDCEE",
    blue: "#0A84FF", cyan: "#00D9FF", soft: "#03080F", line: "rgba(0,217,255,.26)", border: "#10283F",
    track: "#081530", sheet: "#040A1C", accentBg: "#0C2350", navBg: "rgba(0,0,0,.96)", badgeBg: "rgba(2,6,16,.8)",
    inpBg: "#000000", panelTop: "rgba(0,34,70,.42)", panelBot: "rgba(0,0,0,.94)", glow: "rgba(0,217,255,.75)",
    grid: "rgba(0,217,255,.028)", halo: "rgba(0,160,255,.22)",
    gold: "#FFD447", green: "#39E68F", orange: "#FF9340", red: "#FF4D6D",
  },
  light: {
    bg: "#EEF4FA", text: "#07162A", dim: "#3F5873", mute: "#6F849C", sub: "#2A4461",
    blue: "#0070F0", cyan: "#0088CC", soft: "#FFFFFF", line: "rgba(0,120,210,.28)", border: "#C9D9EA",
    track: "#D6E3F0", sheet: "#FFFFFF", accentBg: "#DDEEFF", navBg: "rgba(255,255,255,.96)", badgeBg: "rgba(255,255,255,.92)",
    inpBg: "#FFFFFF", panelTop: "rgba(255,255,255,.97)", panelBot: "rgba(230,240,250,.97)", glow: "rgba(0,136,204,.3)",
    grid: "rgba(0,120,210,.06)", halo: "rgba(0,144,255,.18)",
    gold: "#D99A00", green: "#12A860", orange: "#E8740C", red: "#E0284A",
  },
};
const ZEST = {
  dark: { cyan: "#FF5AD9", blue: "#8A5CFF", line: "rgba(255,90,217,.35)", glow: "rgba(255,90,217,.8)", accentBg: "#2A0A3A", track: "#1B0B2C" },
  light: { cyan: "#D01FAE", blue: "#7A3CFF", line: "rgba(208,31,174,.3)", glow: "rgba(208,31,174,.3)", accentBg: "#FBE3F7", track: "#EBDDF5" },
};
const C = { ...THEMES.dark };
const RAINBOW = "linear-gradient(90deg,#ff3cac,#ffb43c,#f7ff3c,#3cff9e,#3cc8ff,#9b5cff,#ff3cac)";

/* ---------- Game data ---------- */
const RANKS = [
  { id: "E", color: "#9AA7BD", alt: "#DDE6F2", glow: "rgba(154,167,189,.4)" },
  { id: "D", color: "#3DF08A", alt: "#B6FFD9", glow: "rgba(61,240,138,.55)" },
  { id: "C", color: "#38C6FF", alt: "#B3ECFF", glow: "rgba(56,198,255,.6)" },
  { id: "B", color: "#B14BFF", alt: "#E6BFFF", glow: "rgba(177,75,255,.65)" },
  { id: "A", color: "#FF2D6F", alt: "#FF9A3D", glow: "rgba(255,45,111,.7)" },
  { id: "S", color: "#FFD447", alt: "#FFFFFF", glow: "rgba(255,212,71,.85)" },
  { id: "SS", color: "#F4FBFF", alt: "#7DF9FF", glow: "rgba(200,240,255,.95)" },
];
const RANK_DARK = RANKS.map((r) => r.color);
const RANK_LIGHT = ["#66748A", "#15A34A", "#0284C7", "#7C3AED", "#D6194F", "#C28A00", "#0B1220"];
function applyTheme(settings = {}) {
  const mode = settings.theme === "light" ? "light" : "dark";
  Object.keys(C).forEach((k) => delete C[k]);
  Object.assign(C, THEMES[mode], settings.zesty ? ZEST[mode] : {}, settings.custom?.on && !settings.zesty ? customTheme(settings.custom) : {});
  RANKS.forEach((r, i) => { r.color = mode === "light" ? RANK_LIGHT[i] : RANK_DARK[i]; });
}
const RATIO_STEPS = [1.0, 1.35, 1.7, 2.1, 2.55];
const REP_STEPS = [10, 17, 24, 33, 42];
const DIVS = ["III", "II", "I"];
const RANK_INFO = {
  E: ["Awakening", "Just getting started. Everyone begins here."],
  D: ["Beginner", "The habit is forming and form is dialed in."],
  C: ["Regular", "Consistent lifter with a real foundation."],
  B: ["Strong", "Clearly trained. Stronger than most people in any gym."],
  A: ["Advanced", "Years of serious, disciplined training."],
  S: ["Elite", "Genuinely jacked for your frame. Very few ever get here."],
  SS: ["Gym God", "Beyond elite. Nobody is supposed to get here."],
};
const FACTOR_FLOOR = { Chest: 0.35, Back: 0.4, Legs: 0.5, Shoulders: 0.25, Arms: 0.3, Core: 1.3 };
const GROUP_HARD = { Shoulders: 1.25, Arms: 1.1 };
const GROUP_WEIGHT = { Legs: 3, Back: 3, Chest: 3, Shoulders: 2, Arms: 1, Core: 1 };
const GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];

const EXERCISES = [
  { name: "Bench Press", group: "Chest", type: "weighted", factor: 1, xp: 12 },
  { name: "Incline Bench Press", group: "Chest", type: "weighted", factor: 0.85, xp: 12 },
  { name: "Smith Machine Bench Press", group: "Chest", type: "weighted", factor: 1.05, xp: 11 },
  { name: "Chest Press Machine", group: "Chest", type: "weighted", factor: 1.1, xp: 10 },
  { name: "Dumbbell Press", group: "Chest", type: "weighted", factor: 0.4, perHand: true, xp: 11 },
  { name: "Incline Dumbbell Press", group: "Chest", type: "weighted", factor: 0.35, perHand: true, xp: 11 },
  { name: "Pec Deck", group: "Chest", type: "weighted", factor: 0.75, xp: 8 },
  { name: "Cable Crossover", group: "Chest", type: "weighted", factor: 0.35, perHand: true, xp: 8 },
  { name: "Low Cable Fly", group: "Chest", type: "weighted", factor: 0.33, perHand: true, xp: 8 },
  { name: "Cable Chest Press", group: "Chest", type: "weighted", factor: 0.45, perHand: true, xp: 10 },
  { name: "Chest Fly (dumbbell)", group: "Chest", type: "weighted", factor: 0.25, perHand: true, xp: 8 },
  { name: "Push-up", group: "Chest", type: "bodyweight", reps: 2.8, xp: 8 },
  { name: "Dip", group: "Chest", type: "bodyweight", reps: 1.3, xp: 11 },
  { name: "Assisted Dip Machine", group: "Chest", type: "weighted", factor: 0.6, xp: 8 },
  { name: "Deadlift", group: "Back", type: "weighted", factor: 1.5, xp: 18 },
  { name: "Trap Bar Deadlift", group: "Back", type: "weighted", factor: 1.6, xp: 17 },
  { name: "Barbell Row", group: "Back", type: "weighted", factor: 0.85, xp: 12 },
  { name: "T-Bar Row", group: "Back", type: "weighted", factor: 0.9, xp: 12 },
  { name: "Dumbbell Row", group: "Back", type: "weighted", factor: 0.4, perHand: true, xp: 10 },
  { name: "Machine Row", group: "Back", type: "weighted", factor: 0.9, xp: 10 },
  { name: "Seated Cable Row", group: "Back", type: "weighted", factor: 0.8, xp: 10 },
  { name: "Lat Pulldown", group: "Back", type: "weighted", factor: 0.8, xp: 10 },
  { name: "Straight-Arm Pulldown", group: "Back", type: "weighted", factor: 0.45, xp: 7 },
  { name: "Cable Pullover", group: "Back", type: "weighted", factor: 0.45, xp: 7 },
  { name: "Single-Arm Cable Row", group: "Back", type: "weighted", factor: 0.4, perHand: true, xp: 9 },
  { name: "Cable Pull-Through", group: "Legs", type: "weighted", factor: 0.7, xp: 8 },
  { name: "Assisted Pull-up Machine", group: "Back", type: "weighted", factor: 0.6, xp: 9 },
  { name: "Pull-up", group: "Back", type: "bodyweight", reps: 0.85, xp: 14 },
  { name: "Chin-up", group: "Back", type: "bodyweight", reps: 0.95, xp: 13 },
  { name: "Back Extension", group: "Back", type: "bodyweight", reps: 1.2, xp: 6 },
  { name: "Dead Hang", group: "Back", type: "timed", xp: 5 },
  { name: "Squat", group: "Legs", type: "weighted", factor: 1.25, xp: 16 },
  { name: "Front Squat", group: "Legs", type: "weighted", factor: 1, xp: 16 },
  { name: "Smith Machine Squat", group: "Legs", type: "weighted", factor: 1.3, xp: 14 },
  { name: "Hack Squat", group: "Legs", type: "weighted", factor: 1.6, xp: 14 },
  { name: "Leg Press", group: "Legs", type: "weighted", factor: 2.4, xp: 13 },
  { name: "Romanian Deadlift", group: "Legs", type: "weighted", factor: 1.1, xp: 14 },
  { name: "Hip Thrust", group: "Legs", type: "weighted", factor: 1.5, xp: 12 },
  { name: "Bulgarian Split Squat", group: "Legs", type: "weighted", factor: 0.35, perHand: true, xp: 14 },
  { name: "Goblet Squat", group: "Legs", type: "weighted", factor: 0.55, xp: 12 },
  { name: "Leg Extension", group: "Legs", type: "weighted", factor: 0.7, xp: 8 },
  { name: "Leg Curl", group: "Legs", type: "weighted", factor: 0.55, xp: 8 },
  { name: "Hip Abduction Machine", group: "Legs", type: "weighted", factor: 0.7, xp: 6 },
  { name: "Hip Adduction Machine", group: "Legs", type: "weighted", factor: 0.7, xp: 6 },
  { name: "Calf Raise", group: "Legs", type: "weighted", factor: 1.5, xp: 6 },
  { name: "Seated Calf Raise", group: "Legs", type: "weighted", factor: 0.8, xp: 6 },
  { name: "Walking Lunge", group: "Legs", type: "bodyweight", reps: 2, xp: 10 },
  { name: "Air Squat", group: "Legs", type: "bodyweight", reps: 3, xp: 5 },
  { name: "Overhead Press", group: "Shoulders", type: "weighted", factor: 0.65, xp: 12 },
  { name: "Shoulder Press Machine", group: "Shoulders", type: "weighted", factor: 0.7, xp: 10 },
  { name: "Dumbbell Shoulder Press", group: "Shoulders", type: "weighted", factor: 0.28, perHand: true, xp: 11 },
  { name: "Arnold Press", group: "Shoulders", type: "weighted", factor: 0.25, perHand: true, xp: 11 },
  { name: "Lateral Raise", group: "Shoulders", type: "weighted", factor: 0.1, perHand: true, xp: 7 },
  { name: "Cable Lateral Raise", group: "Shoulders", type: "weighted", factor: 0.09, perHand: true, xp: 7 },
  { name: "Lateral Raise Machine", group: "Shoulders", type: "weighted", factor: 0.55, xp: 7 },
  { name: "Front Raise", group: "Shoulders", type: "weighted", factor: 0.1, perHand: true, xp: 6 },
  { name: "Rear Delt Fly (dumbbell)", group: "Shoulders", type: "weighted", factor: 0.09, perHand: true, xp: 7 },
  { name: "Reverse Fly Machine", group: "Shoulders", type: "weighted", factor: 0.6, xp: 7 },
  { name: "Face Pull", group: "Shoulders", type: "weighted", factor: 0.4, xp: 7 },
  { name: "Cable Rear Delt Fly", group: "Shoulders", type: "weighted", factor: 0.35, xp: 7 },
  { name: "Cable Front Raise", group: "Shoulders", type: "weighted", factor: 0.3, xp: 6 },
  { name: "Cable Upright Row", group: "Shoulders", type: "weighted", factor: 0.45, xp: 7 },
  { name: "Cable Shrug", group: "Shoulders", type: "weighted", factor: 1.1, xp: 6 },
  { name: "Upright Row", group: "Shoulders", type: "weighted", factor: 0.45, xp: 8 },
  { name: "Shrug", group: "Shoulders", type: "weighted", factor: 1.2, xp: 7 },
  { name: "Barbell Curl", group: "Arms", type: "weighted", factor: 0.45, xp: 8 },
  { name: "EZ Bar Curl", group: "Arms", type: "weighted", factor: 0.45, xp: 8 },
  { name: "Dumbbell Curl", group: "Arms", type: "weighted", factor: 0.17, perHand: true, xp: 7 },
  { name: "Hammer Curl", group: "Arms", type: "weighted", factor: 0.19, perHand: true, xp: 7 },
  { name: "Preacher Curl", group: "Arms", type: "weighted", factor: 0.4, xp: 7 },
  { name: "Cable Curl", group: "Arms", type: "weighted", factor: 0.45, xp: 7 },
  { name: "Rope Hammer Curl", group: "Arms", type: "weighted", factor: 0.45, xp: 7 },
  { name: "Rope Pushdown", group: "Arms", type: "weighted", factor: 0.42, xp: 7 },
  { name: "Cable Overhead Extension", group: "Arms", type: "weighted", factor: 0.4, xp: 7 },
  { name: "Cable Kickback", group: "Arms", type: "weighted", factor: 0.15, perHand: true, xp: 6 },
  { name: "Bicep Curl Machine", group: "Arms", type: "weighted", factor: 0.5, xp: 7 },
  { name: "Tricep Pushdown", group: "Arms", type: "weighted", factor: 0.45, xp: 7 },
  { name: "Overhead Tricep Extension", group: "Arms", type: "weighted", factor: 0.4, xp: 7 },
  { name: "Skull Crusher", group: "Arms", type: "weighted", factor: 0.4, xp: 8 },
  { name: "Tricep Extension Machine", group: "Arms", type: "weighted", factor: 0.55, xp: 7 },
  { name: "Close-Grip Bench Press", group: "Arms", type: "weighted", factor: 0.85, xp: 11 },
  { name: "Plank", group: "Core", type: "timed", xp: 8 },
  { name: "Hanging Leg Raise", group: "Core", type: "bodyweight", reps: 0.8, xp: 9 },
  { name: "Cable Crunch", group: "Core", type: "weighted", factor: 1.3, xp: 7 },
  { name: "Cable Woodchop", group: "Core", type: "weighted", factor: 0.45, xp: 7 },
  { name: "Cable Pallof Press", group: "Core", type: "weighted", factor: 0.3, xp: 6 },
  { name: "Ab Crunch Machine", group: "Core", type: "weighted", factor: 1.3, xp: 7 },
  { name: "Russian Twist", group: "Core", type: "bodyweight", reps: 2.5, xp: 5 },
  { name: "Sit-up", group: "Core", type: "bodyweight", reps: 3, xp: 5 },
  { name: "Farmer's Carry", group: "Core", type: "weighted", factor: 0.5, perHand: true, xp: 9 },
  { name: "Running", group: "Cardio", type: "timed", xp: 6 },
  { name: "Walking", group: "Cardio", type: "timed", xp: 3 },
  { name: "Incline Walk", group: "Cardio", type: "timed", xp: 4 },
  { name: "Cycling", group: "Cardio", type: "timed", xp: 5 },
  { name: "Stairmaster", group: "Cardio", type: "timed", xp: 6 },
  { name: "Elliptical", group: "Cardio", type: "timed", xp: 5 },
  { name: "Rowing Machine", group: "Cardio", type: "timed", xp: 6 },
  { name: "Swimming", group: "Cardio", type: "timed", xp: 7 },
  { name: "Jump Rope", group: "Cardio", type: "timed", xp: 7 },
  { name: "Battle Ropes", group: "Cardio", type: "timed", xp: 8 },
  { name: "Burpee", group: "Cardio", type: "bodyweight", reps: 2, xp: 9 },
];
const allExercises = (s) => {
  const seen = new Set();
  const local = [...EXERCISES, ...(s.custom || [])].filter((e) => { const k = e.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  const names = new Set(local.map((e) => e.name.toLowerCase()));
  return [...local, ...(s.community?.ex || []).filter((e) => e.name && !names.has(e.name.toLowerCase())).map((e) => ({ ...e, community: true }))].map((e) =>
  e.type === "weighted" ? { ...e, factor: Math.max(e.factor || 0.5, (FACTOR_FLOOR[e.group] || 0.2) * (e.perHand ? 0.4 : 1)) } : e);
};
const findEx = (s, name) => allExercises(s).find((d) => d.name === name) || { name, group: "Core", type: "weighted", factor: 1.2, xp: 8 };

const QUEST_POOL = [
  { qid: "pushups", title: "push-ups", target: 100, unit: "reps", xp: 60 },
  { qid: "squats", title: "air squats", target: 100, unit: "reps", xp: 60 },
  { qid: "situps", title: "sit-ups", target: 100, unit: "reps", xp: 60 },
  { qid: "run", title: "Run or walk", target: 3, unit: "mi", xp: 80 },
  { qid: "water", title: "Drink water", target: 16, unit: "cups", xp: 40 },
  { qid: "plank", title: "Plank (total)", target: 5, unit: "min", xp: 50 },
  { qid: "pullups", title: "pull-ups", target: 30, unit: "reps", xp: 70 },
  { qid: "steps", title: "Walk", target: 10000, unit: "steps", xp: 50 },
  { qid: "stretch", title: "Stretch", target: 15, unit: "min", xp: 30 },
  { qid: "lunges", title: "walking lunges", target: 60, unit: "reps", xp: 55 },
  { qid: "burpees", title: "burpees", target: 40, unit: "reps", xp: 70 },
  { qid: "jumprope", title: "Jump rope", target: 10, unit: "min", xp: 60 },
  { qid: "dips", title: "dips", target: 40, unit: "reps", xp: 60 },
  { qid: "hang", title: "Dead hang (total)", target: 3, unit: "min", xp: 45 },
];
const DAILY_REROLLS = 3;
const QUEST_EX = { pushups: "Push-up", squats: "Air Squat", situps: "Sit-up", pullups: "Pull-up", plank: "Plank", lunges: "Walking Lunge", burpees: "Burpee", jumprope: "Jump Rope", dips: "Dip", hang: "Dead Hang" };
const questStep = (q) => (q.target >= 1000 ? 1000 : q.target >= 50 ? 10 : q.unit === "min" ? 1 : 5);
const FUEL_XP = 75;

const FOODS = [
  { name: "Chicken breast (4 oz cooked)", cal: 187, p: 35, c: 0, f: 4 },
  { name: "Ground beef 90/10 (4 oz cooked)", cal: 240, p: 30, c: 0, f: 13 },
  { name: "Salmon (4 oz cooked)", cal: 233, p: 25, c: 0, f: 14 },
  { name: "Egg (large)", cal: 72, p: 6, c: 0, f: 5 },
  { name: "Egg whites (1 cup)", cal: 126, p: 26, c: 2, f: 0 },
  { name: "Greek yogurt nonfat (1 cup)", cal: 130, p: 23, c: 9, f: 0 },
  { name: "Whole milk (1 cup)", cal: 150, p: 8, c: 12, f: 8 },
  { name: "Whey protein (1 scoop)", cal: 120, p: 24, c: 3, f: 1.5 },
  { name: "White rice (1 cup cooked)", cal: 205, p: 4, c: 45, f: 0 },
  { name: "Oats (1/2 cup dry)", cal: 150, p: 5, c: 27, f: 3 },
  { name: "Pasta (1 cup cooked)", cal: 220, p: 8, c: 43, f: 1 },
  { name: "Potato (medium)", cal: 160, p: 4, c: 37, f: 0 },
  { name: "Sweet potato (medium)", cal: 112, p: 2, c: 26, f: 0 },
  { name: "Bread slice", cal: 80, p: 3, c: 15, f: 1 },
  { name: "Tortilla (flour, 10\")", cal: 210, p: 6, c: 35, f: 5 },
  { name: "Banana", cal: 105, p: 1, c: 27, f: 0 },
  { name: "Apple", cal: 95, p: 0, c: 25, f: 0 },
  { name: "Peanut butter (2 tbsp)", cal: 190, p: 7, c: 7, f: 16 },
  { name: "Olive oil (1 tbsp)", cal: 120, p: 0, c: 0, f: 14 },
  { name: "Avocado (half)", cal: 120, p: 1, c: 6, f: 11 },
  { name: "Cheddar cheese (1 oz)", cal: 115, p: 7, c: 0, f: 9 },
  { name: "Broccoli (1 cup)", cal: 55, p: 4, c: 11, f: 0 },
  { name: "Black beans (1/2 cup)", cal: 110, p: 7, c: 20, f: 0 },
  { name: "Almonds (1 oz)", cal: 165, p: 6, c: 6, f: 14 },
];

const RESTAURANT_FOODS = [
  ...[
    ["Hamburger", 394, 22, 27, 19.5], ["Hamburger lettuce wrap", 255, 19, 9, 16.5], ["Cheeseburger", 464, 26, 28, 25.5], ["Cheeseburger lettuce wrap", 370, 23, 10, 22],
    ["Double cheeseburger", 743, 51, 29, 45], ["Double cheeseburger lettuce wrap", 588, 48, 11, 41], ["Grilled chicken burger", 406, 31, 27, 15], ["Grilled chicken burger lettuce wrap", 236, 27, 1, 12],
    ["Crispy chicken burger", 606, 34, 44, 29], ["Spicy crispy chicken burger", 621, 34, 44, 29], ["Crispy chicken bites (8 pc)", 300, 42, 13, 13], ["Veggie burger", 403, 12, 46, 19],
    ["Egg burger w/ cheese", 280, 13, 28, 12.5], ["Egg burger w/ cheese & bacon", 385, 17.5, 28, 21.5], ["Egg burger w/ cheese & sausage", 450, 20, 28, 28.5], ["French fries", 386, 5, 50, 18],
    ["Oatmeal chocolate chip cookie", 241, 4, 27, 13], ["Banana bread", 192, 4.5, 45, 1.7], ["Vanilla shake (small)", 555, 16, 91, 14], ["Chocolate shake (small)", 722, 16, 136, 14], ["Oreo shake (small)", 577, 16, 93, 16],
  ].map(([n, cal, p, c, f]) => ({ r: "P. Terry's", name: `P. Terry's ${n}`, cal, p, c, f })),
  ...[
    ["Trailer Park", 298, 17, 22, 15], ["Trailer Park (trashy)", 355, 19, 23, 20], ["Chicken Fajita", 353, 20, 20, 21], ["Brushfire", 300, 18, 25, 14], ["Tipsy Chick", 453, 22, 40, 22],
    ["Democrat", 168, 10, 20, 5], ["Crossroads", 346, 20, 18, 22], ["Steak Fajita", 449, 20, 20, 26], ["Republican", 474, 16, 35, 29], ["Green Chile Pork", 217, 11, 26, 10], ["Hogfather", 428, 20, 32, 25],
    ["Baja Shrimp", 267, 12, 24, 14], ["Grilled Baja Shrimp", 169, 9, 6, 12], ["Mr. Orange", 207, 14, 23, 10], ["Fresh Avocado", 249, 8, 24, 14], ["Fried Avocado", 269, 9, 27, 14],
    ["Migas taco", 379, 17, 27, 23], ["The Wrangler", 456, 23, 24, 29], ["Ranch Hand", 451, 23, 19, 31], ["Bacon, egg & cheese taco", 383, 21, 17, 25], ["Potato, egg & cheese taco", 384, 18, 25, 22], ["Chorizo, egg & cheese taco", 388, 19, 19, 26],
    ["Breakfast burrito", 1139, 49, 100, 62], ["Big Tipsy Bowl (fajita chicken)", 990, 39, 111, 43], ["Big Tipsy Bowl (fried chicken)", 999, 44, 116, 39], ["Bonfire bowl (jerk chicken)", 771, 33, 94, 23], ["Bonfire bowl (salmon)", 762, 39, 98, 24],
    ["Outlaw Bowl (fajita chicken)", 786, 29, 109, 26], ["Outlaw Bowl (fried chicken)", 794, 35, 113, 22], ["Grande burrito", 797, 23, 96, 35], ["Green chile queso & chips", 643, 21, 32, 46], ["Guacamole & chips", 423, 6, 23, 33],
    ["Street corn", 383, 8, 48, 22], ["Damn Good Tots", 680, 19, 44, 42], ["Refried pinto beans", 198, 12, 35, 1], ["Black beans", 162, 9, 31, 1], ["Mexican rice", 241, 5, 48, 3], ["Trailer Park (hillbilly style)", 560, 31, 24, 36],
  ].map(([n, cal, p, c, f]) => ({ r: "Torchy's", name: `Torchy's ${n}`, cal, p, c, f })),
  ...[
    ["chicken (4 oz)", 180, 32, 0, 7], ["steak (4 oz)", 150, 21, 1, 6], ["barbacoa (4 oz)", 170, 24, 2, 7], ["carnitas (4 oz)", 210, 23, 0, 12], ["sofritas (4 oz)", 150, 8, 9, 10],
    ["white rice (4 oz)", 210, 4, 40, 4], ["brown rice (4 oz)", 210, 4, 36, 6], ["black beans (4 oz)", 130, 8, 22, 1.5], ["pinto beans (4 oz)", 130, 8, 21, 1.5], ["fajita veggies", 20, 0, 5, 0],
    ["burrito tortilla", 320, 8, 50, 9], ["taco flour tortilla", 80, 2, 13, 2.5], ["crispy corn taco shell", 70, 1, 10, 3], ["guacamole (4 oz)", 230, 2, 8, 22],
  ].map(([n, cal, p, c, f]) => ({ r: "Chipotle", name: `Chipotle ${n}`, cal, p, c, f })),
  { r: "Chick-fil-A", name: "Chick-fil-A grilled nuggets (8 ct)", cal: 130, p: 25, c: 1, f: 3 },
  { r: "Raising Cane's", name: "Raising Cane's chicken finger (1)", cal: 130, p: 12, c: 5, f: 7, approx: true },
  { r: "Raising Cane's", name: "Raising Cane's Cane's Sauce (1 cup)", cal: 190, p: 0, c: 4, f: 19, approx: true },
  { r: "Raising Cane's", name: "Raising Cane's crinkle-cut fries", cal: 400, p: 5, c: 52, f: 18, approx: true },
  { r: "Raising Cane's", name: "Raising Cane's Texas toast", cal: 150, p: 4, c: 18, f: 7, approx: true },
  { r: "Whataburger", name: "Whataburger (original)", cal: 590, p: 29, c: 52, f: 32, approx: true },
  { r: "Whataburger", name: "Whataburger Double Meat", cal: 830, p: 47, c: 62, f: 44, approx: true },
  { r: "Whataburger", name: "Whataburger Honey Butter Chicken Biscuit", cal: 570, p: 18, c: 52, f: 32, approx: true },
];
const RESTAURANTS = [...new Set(RESTAURANT_FOODS.map((f) => f.r))];

const ACTIVITY = [
  { id: 1.2, label: "Mostly sitting" },
  { id: 1.375, label: "Train 1–3 days/week" },
  { id: 1.55, label: "Train 3–5 days/week" },
  { id: 1.725, label: "Train 6–7 days/week" },
];
const GOALS = [
  { id: "cut", label: "Cut", adj: -400 },
  { id: "maintain", label: "Maintain", adj: 0 },
  { id: "lean", label: "Lean bulk", adj: 250 },
  { id: "bulk", label: "Bulk", adj: 450 },
];

/* ---------- Helpers ---------- */
const AskRef = { current: (msg, fn) => fn() };
const ask = (message, onYes, yesLabel) => AskRef.current(message, onYes, yesLabel);
function fillQuests(p, d, exercises) {
  const day = p.days?.[d] || newDay();
  const list = day.list.map((q) => {
    const exName = QUEST_EX[q.qid];
    if (q.claimed || !exName) return q;
    const amt = exercises.filter((e) => e.name === exName).reduce((a, e) => a + e.sets.reduce((b, st) => b + (+st.r || 0), 0), 0);
    return amt ? { ...q, progress: q.progress + amt, fromWorkout: (q.fromWorkout || 0) + amt } : q;
  });
  return { ...p, days: { ...p.days, [d]: { ...day, list } } };
}
function addWorkout(p, workout) {
  return { ...fillQuests(p, workout.date, workout.exercises), workouts: [...p.workouts, workout] };
}
function addDeckSet(p, sessionId, name, reps, xp) {
  const d = today();
  const set = { w: "", r: reps, done: true };
  const existing = p.workouts.find((w) => w.id === sessionId);
  let workouts;
  if (existing) {
    workouts = p.workouts.map((w) => {
      if (w.id !== sessionId) return w;
      const has = w.exercises.some((e) => e.name === name);
      const exercises = has ? w.exercises.map((e) => (e.name === name ? { ...e, sets: [...e.sets, set] } : e)) : [...w.exercises, { name, sets: [set] }];
      return { ...w, exercises, xp: (w.xp || 0) + xp };
    });
  } else {
    workouts = [...p.workouts, { id: sessionId, date: d, source: "deck", exercises: [{ name, sets: [set] }], xp, volume: 0 }];
  }
  return { ...fillQuests(p, d, [{ name, sets: [set] }]), workouts };
}

const dkey = (dt) => dt.toLocaleDateString("en-CA");
const today = () => dkey(new Date());
const shift = (d, n) => { const x = new Date(d + "T12:00"); x.setDate(x.getDate() + n); return dkey(x); };
const uid = () => Math.random().toString(36).slice(2, 10);
const e1rm = (w, r) => (r <= 0 ? 0 : w * (1 + r / 30));
const fmtDay = (d) => new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

function strengthScale(p) {
  const bw = Math.max(80, +p.weight || 170), h = Math.max(48, +p.height || 70) * 0.0254;
  const frameLb = 24 * h * h * 2.2046; 
  const mass = 0.65 * bw + 0.35 * frameLb;
  return 180 * Math.pow(mass / 180, 0.67) * (p.sex === "f" ? 0.65 : 1);
}
function thresholds(ex, p) {
  if (ex.type === "bodyweight") return REP_STEPS.map((r) => Math.round(r * (ex.reps || 1) * (p.sex === "f" ? 0.6 : 1)));
  const sc = strengthScale(p);
  const hard = GROUP_HARD[ex.group] || 1;
  return RATIO_STEPS.map((r) => Math.round((r * ex.factor * sc * hard) / 5) * 5);
}
function scoreFor(best, steps) {
  if (best < steps[0]) return best / steps[0];
  for (let i = 1; i < steps.length; i++) if (best < steps[i]) return i + (best - steps[i - 1]) / (steps[i] - steps[i - 1]);
  const s6 = steps[4] * 1.35, s7 = steps[4] * 1.75;
  if (best < s6) return 5 + (best - steps[4]) / (s6 - steps[4]);
  return Math.min(7, 6 + (best - s6) / (s7 - s6));
}
function valueAt(t, steps) {
  if (t <= 1) return t * steps[0];
  if (t <= 5) { const i = Math.floor(t); return i === 5 ? steps[4] : steps[i - 1] + (t - i) * (steps[i] - steps[i - 1]); }
  if (t <= 6) return steps[4] * (1 + 0.35 * (t - 5));
  return steps[4] * (1.35 + 0.4 * (t - 6));
}
function rankFromScore(score) {
  const i = Math.min(6, Math.floor(score));
  const frac = Math.min(0.999, score - i);
  const d = Math.min(2, Math.floor(frac * 3));
  return { rank: RANKS[i], div: DIVS[d], label: `${RANKS[i].id} ${DIVS[d]}`, divPct: Math.round(((frac * 3) - d) * 100) };
}
function rankFor(ex, best, p) {
  const steps = thresholds(ex, p);
  const score = scoreFor(best, steps);
  const r = rankFromScore(score);
  const nextT = Math.floor(score * 3 + 1e-9) / 3 + 1 / 3;
  const next = score >= 6.999 ? null : Math.ceil(valueAt(Math.min(7, nextT), steps));
  const nextLabel = next ? rankFromScore(Math.min(6.999, nextT + 1e-6)).label : null;
  return { ...r, score, pct: r.divPct, next, nextLabel, steps };
}
function levelFromXp(xp) {
  let lvl = 1, need = 100, left = xp;
  while (left >= need) { left -= need; lvl++; need = Math.round(100 * Math.pow(lvl, 1.25)); }
  return { lvl, into: left, need };
}

function effW(def, ex, w) {
  const userHand = ex?.wMode ? ex.wMode === "hand" : !!def.perHand;
  if (userHand === !!def.perHand) return w;
  return def.perHand ? w / 2 : w * 2;
}
function bestValue(def, st, p, ex) {
  if (def.type === "bodyweight") return (+st.r || 0) * (1 + (+st.w || 0) / Math.max(80, +p.weight || 170));
  return e1rm(effW(def, ex, +st.w || 0), +st.r);
}
function computeBests(s) {
  const b = {};
  s.workouts.forEach((w) => w.exercises.forEach((ex) => {
    const def = findEx(s, ex.name);
    if (def.type === "timed") return;
    ex.sets.forEach((st) => {
      const v = bestValue(def, st, s.profile, ex);
      if (v > (b[ex.name] || 0)) b[ex.name] = v;
    });
  }));
  return b;
}
function rankedLifts(s) {
  const bests = computeBests(s);
  return allExercises(s).filter((e) => e.type !== "timed" && bests[e.name]).map((e) => ({ e, best: bests[e.name], ...rankFor(e, bests[e.name], s.profile) }));
}
function groupScores(s) {
  const g = {};
  rankedLifts(s).forEach((r) => { if (GROUP_WEIGHT[r.e.group]) g[r.e.group] = Math.max(g[r.e.group] || 0, r.score); });
  return g;
}
function overallInfo(s) {
  const g = groupScores(s);
  const total = Object.values(GROUP_WEIGHT).reduce((a, b) => a + b, 0);
  const score = Object.entries(GROUP_WEIGHT).reduce((a, [k, w]) => a + (g[k] || 0) * w, 0) / total;
  return { score, groups: g, ...rankFromScore(score) };
}
const overallRank = (s) => overallInfo(s).rank;
function pointsOf(s) {
  const fromWorkouts = s.workouts.reduce((a, w) => a + (w.xp || 0), 0);
  const fromRanks = rankedLifts(s).reduce((a, r) => a + Math.round(r.score * r.score * 30), 0);
  return fromWorkouts + fromRanks;
}
function activeDays(s) {
  const days = new Set(s.workouts.map((w) => w.date));
  Object.entries(s.days || {}).forEach(([d, v]) => v.list?.some((q) => q.claimed) && days.add(d));
  return days;
}
function streakOf(s) {
  const days = activeDays(s);
  let n = 0, d = today();
  if (!days.has(d)) d = shift(d, -1);
  while (days.has(d)) { n++; d = shift(d, -1); }
  return n;
}
function weekStart() { const x = new Date(); x.setDate(x.getDate() - x.getDay()); return dkey(x); }

function targets(p) {
  const kg = p.weight * 0.4536, cm = p.height * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === "m" ? 5 : -161);
  const tdee = Math.round(bmr * p.activity);
  const goal = GOALS.find((g) => g.id === p.goal) || GOALS[1];
  const cal = tdee + goal.adj;
  const protein = Math.round(p.weight * (p.goal === "cut" ? 1 : 0.85));
  const fat = Math.round((cal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
  return { tdee, cal, protein, fat, carbs };
}
const mealTotals = (meals = []) => meals.reduce((a, m) => ({ cal: a.cal + m.cal * m.qty, p: a.p + m.p * m.qty, c: a.c + m.c * m.qty, f: a.f + m.f * m.qty }), { cal: 0, p: 0, c: 0, f: 0 });

function makeQuest(exclude = [], tier = 1) {
  const pool = QUEST_POOL.filter((q) => !exclude.includes(q.qid));
  const q = pool[Math.floor(Math.random() * pool.length)] || QUEST_POOL[0];
  const mult = tier === 1 ? 1 : 1 + 0.5 * (tier - 1);
  const target = q.target >= 1000 ? Math.round((q.target * mult) / 1000) * 1000 : Math.round(q.target * mult);
  return { id: uid(), qid: q.qid, title: q.title, target, unit: q.unit, xp: Math.round(q.xp * mult), progress: 0, claimed: false, tier };
}
const newDay = () => {
  const list = [];
  while (list.length < 3) list.push(makeQuest(list.map((q) => q.qid)));
  return { list, rerolls: 0, bonuses: 0 };
};

/* ---------- XP, achievements, community ---------- */
const publishShared = async (key, obj) => { try { if (window.storage?.set) await window.storage.set(key, JSON.stringify(obj), true); } catch (e) { /* offline or preview */ } };
const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
async function loadCommunity() {
  if (!window.storage?.list) return null;
  const read = async (prefix) => {
    const res = await window.storage.list(prefix, true);
    const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } }));
    return items.filter((x) => x && x.name);
  };
  return { ex: await read("ex:"), foods: await read("food:") };
}

function setXp(s, def, st, ex) {
  const p = s.profile, r = +st.r || 0, w = def.type === "weighted" ? effW(def, ex, +st.w || 0) : +st.w || 0;
  if (r <= 0) return { xp: 0, note: "" };
  if (def.type === "timed") {
    const mi = def.group === "Cardio" ? w : 0;
    return { xp: Math.round(r * def.xp + mi * 10), note: `${r} min × ${def.xp}${mi ? ` + ${mi} mi × 10` : ""}` };
  }
  const steps = thresholds(def, p), sTop = steps[4];
  const bw = Math.max(80, +p.weight || 170);
  const val = def.type === "bodyweight" ? r * (1 + w / bw) : e1rm(w, r);
  const effort = def.type === "bodyweight" ? (val / sTop) * 6 : (w * r) / sTop;
  const score = scoreFor(val, steps);
  const mult = 0.5 + score * 0.3;
  const xp = Math.max(Math.ceil(def.xp / 2), Math.round(def.xp * 0.7 * effort * mult));
  return { xp, note: `${rankFromScore(score).label}-level set`, score };
}
function workoutXp(s, exercises, bests) {
  let xp = 0, prs = 0, volume = 0, sets = 0;
  const lines = [];
  exercises.forEach((ex) => {
    const def = findEx(s, ex.name);
    const line = { name: ex.name, xp: 0, sets: [] };
    ex.sets.forEach((st) => {
      sets++;
      const { xp: sx, note } = setXp(s, def, st, ex);
      line.xp += sx; xp += sx;
      const label = def.type === "timed" ? `${st.w ? `${st.w} mi · ` : ""}${st.r} min` : st.w ? `${st.w}×${st.r}` : `${st.r} reps`;
      let pr = false;
      if (def.type !== "timed") {
        volume += (+st.w || 0) * (+st.r || 0);
        const v = bestValue(def, st, s.profile, ex);
        if (bests && v > (bests[ex.name] || 0)) { prs++; pr = true; bests[ex.name] = v; }
      }
      line.sets.push({ label, xp: sx, note, pr });
    });
    lines.push(line);
  });
  return { xp: xp + prs * 40, prs, volume, sets, lines, prBonus: prs * 40 };
}

const TIER_STYLE = [null,
  { name: "Bronze", color: "#D08A4A", glow: "rgba(208,138,74,.55)", xp: 100 },
  { name: "Silver", color: "#D9E2EE", glow: "rgba(217,226,238,.6)", xp: 250 },
  { name: "Gold", color: "#FFD447", glow: "rgba(255,212,71,.7)", xp: 600 },
  { name: "Platinum", color: "#7CF0FF", glow: "rgba(124,240,255,.75)", xp: 1500 },
  { name: "Mythic", color: "#FF5AD9", glow: "rgba(255,90,217,.85)", xp: 4000 },
];
const ACH_ICONS = { Footprints, Weight, Repeat, CalendarCheck, Flame, Activity, Zap, Dumbbell, Shield, Swords, Star };
const ACH_SERIES = [
  { key: "miles", icon: "Footprints", title: "Road Runner", unit: "miles", steps: [10, 50, 100, 250, 1000], get: (st) => st.miles },
  { key: "volume", icon: "Weight", title: "Iron Mover", unit: "lb lifted", steps: [50000, 250000, 1000000, 5000000, 20000000], get: (st) => st.volume },
  { key: "reps", icon: "Repeat", title: "Rep Machine", unit: "total reps", steps: [1000, 5000, 25000, 100000, 500000], get: (st) => st.reps },
  { key: "workouts", icon: "CalendarCheck", title: "Show Up", unit: "workouts", steps: [10, 50, 150, 365, 1000], get: (st) => st.workouts },
  { key: "streak", icon: "Flame", title: "Unbroken", unit: "day streak", steps: [7, 30, 100, 365], get: (st) => st.longestStreak },
  { key: "pushups", icon: "Activity", title: "Push-up King", unit: "push-ups", steps: [500, 2500, 10000, 50000], get: (st) => st.pushups },
  { key: "pullups", icon: "Zap", title: "Bar Hanger", unit: "pull-ups", steps: [100, 1000, 5000, 25000], get: (st) => st.pullups },
  { key: "bench", icon: "Dumbbell", title: "Bench Club", unit: "lb bench (est. max)", steps: [135, 225, 315, 405, 495], get: (st) => st.bench },
  { key: "squat", icon: "Dumbbell", title: "Squat Club", unit: "lb squat (est. max)", steps: [225, 315, 405, 495, 600], get: (st) => st.squat },
  { key: "deadlift", icon: "Dumbbell", title: "Deadlift Club", unit: "lb deadlift (est. max)", steps: [225, 315, 405, 495, 600], get: (st) => st.deadlift },
  { key: "rank", icon: "Shield", title: "Ascension", labels: ["First C-rank lift", "First B-rank lift", "First A-rank lift", "First S-rank lift", "Overall S-rank"], steps: [1, 2, 3, 4, 5], get: (st) => st.rankTier },
  { key: "quests", icon: "Swords", title: "Quest Hunter", unit: "quests cleared", steps: [10, 50, 250, 1000], get: (st) => st.quests },
  { key: "level", icon: "Star", title: "Leveler", unit: "level", steps: [10, 25, 50, 100], get: (st) => st.level },
];
const ROMAN = ["I", "II", "III", "IV", "V"];
function allAchievements() {
  return ACH_SERIES.flatMap((series) => series.steps.map((v, i) => ({ id: `${series.key}-${i}`, series, tier: i + 1, value: v, title: `${series.title} ${ROMAN[i]}`, desc: series.labels ? series.labels[i] : `${v.toLocaleString()} ${series.unit}`, xp: TIER_STYLE[i + 1].xp })));
}
function lifetimeStats(s) {
  let miles = 0, volume = 0, reps = 0, workouts = 0, pushups = 0, pullups = 0;
  const bests = computeBests(s);
  s.workouts.forEach((w) => {
    if (w.source !== "quest") workouts++;
    w.exercises.forEach((ex) => {
      const def = findEx(s, ex.name);
      ex.sets.forEach((st) => {
        const r = +st.r || 0, wt = +st.w || 0;
        if (def.type === "timed") { if (def.group === "Cardio") miles += wt; return; }
        reps += r; volume += wt * r;
        if (/push-?up/i.test(ex.name)) pushups += r;
        if (/pull-?up|chin-?up/i.test(ex.name)) pullups += r;
      });
    });
  });
  let quests = 0;
  Object.values(s.days || {}).forEach((day) => (day.list || []).forEach((q) => { if (q.claimed) { quests++; if (q.qid === "run") miles += q.progress || q.target || 0; } }));
  const days = [...activeDays(s)].sort();
  let longest = 0, run = 0, prev = null;
  days.forEach((d) => { run = prev && shift(prev, 1) === d ? run + 1 : 1; longest = Math.max(longest, run); prev = d; });
  const ranked = rankedLifts(s);
  const maxScore = ranked.reduce((a, r) => Math.max(a, r.score), 0);
  const overall = overallInfo(s).score;
  const rankTier = overall >= 5 ? 5 : maxScore >= 5 ? 4 : maxScore >= 4 ? 3 : maxScore >= 3 ? 2 : maxScore >= 2 ? 1 : 0;
  return {
    miles: Math.round(miles * 10) / 10, volume: Math.round(volume), reps, workouts, pushups, pullups, quests, longestStreak: longest,
    bench: Math.round(bests["Bench Press"] || 0), squat: Math.round(bests["Squat"] || 0), deadlift: Math.round(bests["Deadlift"] || 0),
    rankTier, level: levelFromXp(s.xp).lvl, since: s.workouts[0]?.date || null,
  };
}
function reconcileAchievements(s, rankOnly = false) {
  const earned = new Set(earnedAchievements(s).map((a) => a.id));
  const all = Object.fromEntries(allAchievements().map((a) => [a.id, a]));
  const lost = Object.keys(s.ach || {}).filter((id) => !earned.has(id) && (!rankOnly || id.startsWith("rank-")));
  if (!lost.length) return { ...s, achV: 3 };
  const refund = lost.reduce((a, id) => a + (all[id]?.xp || 0), 0);
  const ach = { ...s.ach }; lost.forEach((id) => delete ach[id]);
  return { ...s, ach, achV: 3, xp: Math.max(0, s.xp - refund) };
}
function earnedAchievements(s) {
  const st = lifetimeStats(s);
  return allAchievements().filter((a) => a.series.get(st) >= a.value);
}

const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgbaOf = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixRgb = (a, b, t) => `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(",")})`;
function customTheme(cu) {
  const cy = hexRgb(cu.cyan), bl = hexRgb(cu.blue), bg = hexRgb(cu.bg);
  if (!cy || !bl || !bg) return {};
  const light = (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) / 255 > 0.5;
  const fg = light ? [7, 22, 42] : [230, 246, 255];
  return {
    bg: mixRgb(bg, bg, 0), text: mixRgb(fg, fg, 0), dim: mixRgb(fg, bg, 0.34), mute: mixRgb(fg, bg, 0.52), sub: mixRgb(fg, bg, 0.16),
    cyan: cu.cyan, blue: cu.blue, soft: mixRgb(bg, cy, 0.05), sheet: mixRgb(bg, cy, 0.06), accentBg: mixRgb(bg, cy, 0.18), track: mixRgb(bg, cy, 0.12), border: mixRgb(bg, cy, 0.24), inpBg: mixRgb(bg, bg, 0),
    line: rgbaOf(cy, 0.3), glow: rgbaOf(cy, light ? 0.35 : 0.75), grid: rgbaOf(cy, 0.05), halo: rgbaOf(bl, light ? 0.18 : 0.3), navBg: rgbaOf(bg, 0.96), badgeBg: rgbaOf(bg, 0.85), panelTop: rgbaOf(cy, 0.12), panelBot: rgbaOf(bg, 0.94),
  };
}

const DEFAULT = {
  profile: { name: "", weight: 170, height: 70, age: 20, sex: "m", activity: 1.55, goal: "lean" },
  xp: 0, xpLog: {}, workouts: [], active: null, days: {}, meals: {}, weekly: {}, monthly: {}, rankSnap: null, rankHist: {}, checkins: {}, atGym: null, water: {}, dayTemplates: [], measure: {}, groupClaimed: {}, duelClaimed: {}, lastSummary: null, playerId: null, lb: false, custom: [], fuelClaimed: {}, chat: [], ach: {}, achV: 3, mogClaimed: {}, xpDetail: {}, presets: [], weightLog: {}, community: { ex: [], foods: [] }, savedFoods: [],
  settings: { theme: "dark", zesty: false, voice: true, voiceStyle: "goblin", sounds: true, rest: 90, dysFont: false, custom: { on: false, cyan: "#00D9FF", blue: "#0A84FF", bg: "#000000" } },
};

/* ---------- App ---------- */
export default function App() {
  const [s, setS] = useState(DEFAULT);
  const sRef = useRef(s); sRef.current = s;
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("status");
  const [toast, setToast] = useState(null);
  const [storageOk, setStorageOk] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const songPushed = useRef(false);
  const [musclePick, setMusclePick] = useState("Chest");
  const [muscleFrom, setMuscleFrom] = useState("status");
  const openMuscle = (g, from = "status") => { setMusclePick(g); setMuscleFrom(from); setTab("muscle"); window.scrollTo?.(0, 0); };
  const [exercisePick, setExercisePick] = useState(null);
  const [exerciseFrom, setExerciseFrom] = useState("status");
  const openExercise = (name, from = "status") => { setExercisePick(name); setExerciseFrom(from); setTab("exercise"); window.scrollTo?.(0, 0); };
  const [ceremony, setCeremony] = useState(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => { songPushed.current = false; }, [s.profile.song, s.lb]);
  const openProfile = (id) => { setProfileId(id || null); setTab("profile"); window.scrollTo?.(0, 0); };
  AskRef.current = (message, onYes, yesLabel = "Confirm") => setDialog({ message, onYes, yesLabel });
  const [party, setPartyState] = useState(false);
  const setParty = (on) => { if (on) Groove.start(); else Groove.stop(); setPartyState(on); };
  useEffect(() => { if (!s.settings?.zesty && party) setParty(false); }, [s.settings?.zesty]);
  useEffect(() => () => Groove.stop(), []);

  useEffect(() => {
    const fams = ["Oxanium:wght@400;500;600;700;800", "Inter:wght@400;500;600", "Lexend:wght@400;600;800", "Orbitron:wght@700;900", "Bangers", "Cinzel:wght@700;900", "Permanent+Marker", "Press+Start+2P", "Pacifico", "Creepster"];
    fams.forEach((f) => {
      const href = `https://fonts.googleapis.com/css2?family=${f}&display=swap`;
      if (document.querySelector(`link[href="${href}"]`)) return;
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l);
    });
  }, []);

  useEffect(() => {
    (async () => {
      let st = DEFAULT;
      try {
        const r = await window.storage.get("ascend-state", false);
        if (r?.value) { const v = JSON.parse(r.value); st = { ...DEFAULT, ...v, settings: { ...DEFAULT.settings, ...(v.settings || {}) } }; }
      } catch (e) { /* first run */ }
      try {
        const ls = JSON.parse(localStorage.getItem("ascend-settings") || "null");
        if (ls && (ls.savedAt || 0) > (st.settings?.savedAt || 0)) st = { ...st, settings: { ...st.settings, ...ls } };
      } catch (e) { /* first run */ }
      if (!st.playerId) st = { ...st, playerId: window.ascendUserId || uid() + uid() };
      if ((st.achV || 1) < 3) st = reconcileAchievements(st, true);
      let ok = !!window.storage?.set;
      if (ok) { try { await window.storage.set("ascend-probe", "1", false); } catch (e) { ok = false; } }
      setStorageOk(ok);
      setS(st); setLoaded(true);
      loadCommunity().then((c) => { if (c) setS((p) => ({ ...p, community: c })); }).catch(() => { /* offline */ });
    })();
  }, []);

  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!loaded) return;
    dirtyRef.current = true;
    const t = setTimeout(async () => {
      try { await window.storage.set("ascend-state", JSON.stringify(sRef.current), false); dirtyRef.current = false; setOffline(false); }
      catch (e) { setOffline(true); }
    }, 400);
    return () => clearTimeout(t);
  }, [s, loaded]);
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(async () => {
      if (!dirtyRef.current) return;
      try { await window.storage.set("ascend-state", JSON.stringify(sRef.current), false); dirtyRef.current = false; setOffline(false); } catch (e) { setOffline(true); }
    }, 15000);
    return () => clearInterval(id);
  }, [loaded]);
  useEffect(() => { if (loaded) { try { localStorage.setItem("ascend-settings", JSON.stringify(s.settings)); } catch (e) { /* private mode */ } } }, [s.settings, loaded]);

  useEffect(() => {
    if (!loaded || !s.lb || !s.profile.name) return;
    const t = setTimeout(async () => {
      const card = profileCard(s);
      if (s.profile.song?.type === "clip" && !songPushed.current) { try { const r = await window.storage.get("ascend-song", false); if (r?.value) { await window.storage.set(`song:${s.playerId}`, r.value, true); songPushed.current = true; } } catch (e) { /* skip */ } }
      try { await window.storage.set(`lb:${s.playerId}`, JSON.stringify(card), true); } catch (e) { console.error(e); }
    }, 1200);
    return () => clearTimeout(t);
  }, [loaded, s.lb, s.profile.name, s.profile.avatar, s.profile.look, s.profile.song, s.xp, s.workouts, s.profile.weight, s.days, s.custom, s.ach, s.weightLog]);

  const gainXp = (amt, msg) => {
    const before = levelFromXp(sRef.current.xp).lvl, after = levelFromXp(Math.max(0, sRef.current.xp + amt)).lvl;
    const d = today();
    setS((p) => ({ ...p, xp: Math.max(0, p.xp + amt), xpLog: { ...p.xpLog, [d]: (p.xpLog?.[d] || 0) + amt }, xpDetail: { ...(p.xpDetail || {}), [d]: [...((p.xpDetail || {})[d] || []), { m: msg, a: amt }].slice(-40) } }));
    if (after > before) SFX.levelUp();
    setToast(after > before ? { big: true, text: `Level up · Level ${after}` } : { text: `${amt >= 0 ? "+" : ""}${amt} XP · ${msg}` });
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    if (!loaded) return;
    const fresh = earnedAchievements(s).filter((a) => !(s.ach || {})[a.id]);
    if (!fresh.length) return;
    const amt = fresh.reduce((a, x) => a + x.xp, 0), d = today();
    setS((p) => ({ ...p, xp: p.xp + amt, ach: { ...(p.ach || {}), ...Object.fromEntries(fresh.map((a) => [a.id, d])) },
      xpLog: { ...p.xpLog, [d]: (p.xpLog?.[d] || 0) + amt }, xpDetail: { ...(p.xpDetail || {}), [d]: [...((p.xpDetail || {})[d] || []), ...fresh.map((a) => ({ m: `Achievement: ${a.title}`, a: a.xp }))].slice(-40) } }));
    setToast({ big: true, text: fresh.length === 1 ? `${fresh[0].title} unlocked · +${amt} XP` : `${fresh.length} achievements · +${amt} XP` });
    SFX.achievement();
    if (fresh.length <= 3) fresh.forEach((a) => postFeed(s, "ach", `unlocked ${a.title} (${TIER_STYLE[a.tier].name})`, {}, `ach_${a.id}`));
    setTimeout(() => setToast(null), 3200);
  }, [loaded, s.workouts, s.days, s.xp, s.profile.weight]);

  useEffect(() => {
    if (!loaded) return;
    const snap = rankSnapshot(s);
    if (!s.rankSnap) { setS((p) => ({ ...p, rankSnap: snap })); return; }
    const prev = s.rankSnap;
    let cer = null;
    if (snap.overall > (prev.overall || 0) && snap.overall >= 1) { const r = rankFromScore(snap.overall); cer = { kind: "overall", rank: r.rank, label: `${r.rank.id}-Rank · ${RANK_INFO[r.rank.id][0]}` }; }
    else { const up = Object.entries(snap.lifts).find(([n, t]) => t > (prev.lifts?.[n] ?? 0) && t >= 1); if (up) { const r = RANKS[Math.min(6, up[1])]; cer = { kind: "lift", name: up[0], rank: r, label: `${r.id}-Rank` }; } }
    const changed = snap.overall !== prev.overall || JSON.stringify(snap.lifts) !== JSON.stringify(prev.lifts);
    if (changed) setS((p) => ({ ...p, rankSnap: snap }));
    if (cer) { setCeremony(cer); postFeed(s, "rank", cer.kind === "overall" ? `ranked up to ${cer.label} overall` : `${cer.name} hit ${cer.label}`, {}, `rank_${cer.kind === "overall" ? "overall" : slug(cer.name)}_${cer.rank.id}`); }
  }, [loaded, s.workouts, s.profile.weight, s.custom]);

  useEffect(() => {
    if (!loaded) return;
    const ws = weekStart();
    if (s.rankHist?.[ws]) return;
    const o = overallInfo(s); const lifts = {}; rankedLifts(s).forEach((r) => { lifts[r.e.name] = r.score; });
    setS((p) => ({ ...p, rankHist: { ...(p.rankHist || {}), [ws]: { overall: o.score, groups: o.groups, lifts, xp: p.xp } } }));
  }, [loaded, s.workouts]);

  applyTheme(s.settings);
  SFX.enabled = s.settings?.sounds !== false;
  if (!loaded) return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg, color: C.dim }}><Loader2 className="animate-spin" /></div>;

  const tabs = [["status", User, "Status"], ["train", Dumbbell, "Train"], ["quests", Swords, "Quests"], ["fuel", Utensils, "Fuel"], ["calendar", CalendarDays, "Log"], ["ranks", Shield, "Ranks"], ["board", Crown, "Board"]];

  return (
    <div className={`min-h-screen relative ${s.settings?.zesty ? "zesty" : ""} ${s.settings?.dysFont ? "dys" : ""}`} style={{ background: C.bg, color: C.text, fontFamily: "'Oxanium', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Lexend:wght@400;600;800&family=Orbitron:wght@700;900&family=Bangers&family=Cinzel:wght@700;900&family=Permanent+Marker&family=Press+Start+2P&family=Pacifico&family=Creepster&display=swap');
        .body{font-family:'Inter',system-ui,sans-serif;line-height:1.45;letter-spacing:.005em}
        h1,h2{letter-spacing:.01em}
        .dys,.dys *,.dys .body{font-family:'Lexend',system-ui,sans-serif!important;letter-spacing:.03em;word-spacing:.08em}
        .fancyname,.fancyname *,.dys .fancyname,.dys .fancyname *{font-family:var(--nf)!important;letter-spacing:normal}
        .bgfx{position:fixed;inset:0;pointer-events:none;background:
          radial-gradient(70% 38% at 50% -8%, ${C.halo}, transparent 70%),
          linear-gradient(${C.grid} 1px, transparent 1px) 0 0/44px 44px,
          linear-gradient(90deg, ${C.grid} 1px, transparent 1px) 0 0/44px 44px, ${C.bg}}
        .panel{position:relative;background:linear-gradient(180deg,${C.panelTop},${C.panelBot} 70%);border:1px solid ${C.line};border-radius:8px;box-shadow:0 1px 0 ${C.line} inset}
        .panel::before,.panel::after{content:"";position:absolute;width:10px;height:10px;border-color:${C.cyan};pointer-events:none;opacity:.55}
        .panel::before{top:-1px;left:-1px;border-top:2px solid;border-left:2px solid}
        .panel::after{bottom:-1px;right:-1px;border-bottom:2px solid;border-right:2px solid}
        .inp{background:${C.inpBg};border:1px solid ${C.border};border-radius:6px;padding:8px 10px;color:${C.text};width:100%}
        .inp:focus,button:focus-visible{outline:2px solid ${C.cyan};outline-offset:1px;box-shadow:0 0 12px ${C.glow}}
        .btn{background:linear-gradient(180deg,${C.cyan},${C.blue});box-shadow:0 0 14px ${C.glow}, inset 0 1px 0 rgba(255,255,255,.35);border-radius:6px;color:#001018;font-weight:800;letter-spacing:.02em}
        .ghost{background:${C.soft};border:1px solid ${C.border};border-radius:6px;color:${C.text}}
        .glowtext{text-shadow:0 0 8px ${C.glow}}
        .ranklabel{font-family:'Cinzel','Oxanium',serif;letter-spacing:.06em}
        .neonline{height:1px;background:linear-gradient(90deg,transparent,${C.cyan},transparent);box-shadow:0 0 8px ${C.cyan}}
        @keyframes breathe{0%,100%{filter:drop-shadow(0 0 6px var(--g))}50%{filter:drop-shadow(0 0 20px var(--g))}}
        .breathe{animation:breathe 3.2s ease-in-out infinite}
        @keyframes rainbow{0%{background-position:0% 50%}100%{background-position:200% 50%}}
        @keyframes eq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
        .zesty .bgfx{background:
          radial-gradient(55% 32% at 8% 0%, rgba(255,60,172,.30), transparent 70%),
          radial-gradient(55% 32% at 95% 12%, rgba(60,200,255,.28), transparent 70%),
          radial-gradient(70% 38% at 50% 105%, rgba(155,92,255,.30), transparent 70%),
          radial-gradient(45% 28% at 0% 70%, rgba(60,255,158,.18), transparent 70%),
          linear-gradient(${C.grid} 1px, transparent 1px) 0 0/28px 28px,
          linear-gradient(90deg, ${C.grid} 1px, transparent 1px) 0 0/28px 28px, ${C.bg}}
        .zesty .panel{border:1.5px solid transparent;background:linear-gradient(180deg,${C.panelTop},${C.panelBot} 70%) padding-box, ${RAINBOW} border-box;background-size:100% 100%, 200% 100%;animation:rainbow 6s linear infinite;box-shadow:0 0 18px rgba(255,60,172,.18)}
        .zesty .panel::before{border-color:#ffb43c}.zesty .panel::after{border-color:#3cc8ff}
        .zesty .glowtext{background:${RAINBOW};background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:rainbow 4s linear infinite;text-shadow:none}
        .zesty .btn{background:${RAINBOW};background-size:200% auto;animation:rainbow 3s linear infinite;color:#1a0020;box-shadow:0 0 22px rgba(255,60,172,.45)}
        .zesty .neonline{background:${RAINBOW};box-shadow:0 0 10px rgba(255,60,172,.7)}
        .zesty .barfill{background-image:${RAINBOW}!important;background-size:200% auto!important;animation:rainbow 5s linear infinite;box-shadow:0 0 10px rgba(255,60,172,.6)!important}
        @keyframes rkspin{to{transform:rotate(360deg)}}
        @keyframes rkbreathe{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.06);opacity:.9}}
        @keyframes rkpulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.6)}}
        @keyframes rkorbit{to{transform:rotate(360deg)}}
        @keyframes rktwinkle{0%,100%{opacity:.2}50%{opacity:1}}
        @keyframes rkhalo{0%{transform:scale(.6);opacity:.4}100%{transform:scale(2);opacity:0}}
        @keyframes rkshine{0%,60%{transform:skewX(-20deg) translateX(0)}100%{transform:skewX(-20deg) translateX(190px)}}
        @keyframes nm-pulse{0%,100%{text-shadow:0 0 4px var(--nc)}50%{text-shadow:0 0 12px var(--nc)}}
        .fancyname{background:transparent}
        .fancyname:not(.nm-rainbow),.zesty .fancyname:not(.nm-rainbow){background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;-webkit-text-fill-color:currentColor!important}
        .fancyname.nm-wave,.fancyname.nm-shake{text-shadow:none!important}
        .nm-pulse{animation:nm-pulse 1.6s ease-in-out infinite}
        .nm-rainbow{background:${RAINBOW};background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:rainbow 3s linear infinite;text-shadow:none}
        @keyframes nm-wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes nm-shake{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(1px,-1px) rotate(2deg)}75%{transform:translate(-1px,1px) rotate(-2deg)}}
        @keyframes nm-wobble{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
        .nm-wobble{animation:nm-wobble 1.2s ease-in-out infinite;transform-origin:center}
        @keyframes nm-flicker{0%,19%,21%,23%,54%,56%,100%{opacity:1;text-shadow:0 0 8px var(--nc)}20%,22%,55%{opacity:.35;text-shadow:none}}
        .nm-flicker{animation:nm-flicker 3s linear infinite}
        @keyframes nm-float{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-5px) rotate(1deg)}}
        .nm-float{animation:nm-float 2.4s ease-in-out infinite}
        @keyframes pop{0%{transform:translate(-50%,-14px) scale(.96);opacity:0}100%{transform:translate(-50%,0) scale(1);opacity:1}}
        @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`}</style>
      <div className="bgfx" />

      <div className="relative max-w-md mx-auto pb-44 px-4 pt-5">
        {tab === "status" && <Status s={s} setS={setS} openSettings={() => setTab("settings")} openProfile={() => openProfile(null)} openMuscle={openMuscle} openExercise={openExercise} goTrain={() => setTab("train")} />}
        {tab === "exercise" && <ExercisePage s={s} name={exercisePick} onBack={() => setTab(exerciseFrom)} openMuscle={(g) => openMuscle(g, "exercise")} />}
        {tab === "muscle" && <MusclePage s={s} group={musclePick} onBack={() => setTab(muscleFrom)} openExercise={(n) => openExercise(n, "muscle")} />}
        {tab === "profile" && <ProfilePage s={s} setS={setS} gainXp={gainXp} targetId={profileId} onBack={() => setTab(profileId ? "board" : "status")} />}
        {!storageOk && (
          <div className="panel p-3 mb-4 body text-sm" style={{ borderColor: C.orange, color: C.orange }}>
            Progress can't save right now. Check your connection, or sign out and back in from Settings.
          </div>
        )}
        {tab === "settings" && <SettingsPage s={s} setS={setS} onBack={() => setTab("status")} party={party} setParty={setParty} openTool={setTab} />}
        <IntervalTimer visible={tab === "timer"} onBack={() => setTab("settings")} onOpen={() => setTab("timer")} />
        <CardDeck visible={tab === "cards"} s={s} setS={setS} gainXp={gainXp} onBack={() => setTab("settings")} />
        {tab === "assistant" && <Assistant s={s} setS={setS} onBack={() => setTab("status")} />}
        {tab === "train" && <Train s={s} setS={setS} gainXp={gainXp} />}
        {tab === "quests" && <Quests s={s} setS={setS} gainXp={gainXp} />}
        {tab === "fuel" && <Fuel s={s} setS={setS} gainXp={gainXp} />}
        {tab === "calendar" && <Calendar s={s} />}
        {tab === "ranks" && <Ranks s={s} openMuscle={(g) => openMuscle(g, "ranks")} />}
        {tab === "board" && <Board s={s} setS={setS} openProfile={openProfile} gainXp={gainXp} />}
      </div>

      {toast && (
        <div className="fixed top-4 left-1/2 z-50 px-5 py-2.5 text-sm font-bold" style={{ transform: "translateX(-50%)", animation: "pop .3s ease-out", borderRadius: 4, whiteSpace: "nowrap",
          background: toast.big ? C.gold : C.sheet, color: toast.big ? "#0A1630" : C.cyan, border: `1px solid ${toast.big ? C.gold : C.blue}`,
          boxShadow: toast.big ? "0 0 30px rgba(255,212,71,.6)" : `0 0 22px ${C.glow}` }}>{toast.text}</div>
      )}

      {party && <DiscoParty />}
      {ceremony && <Ceremony c={ceremony} onClose={() => setCeremony(null)} />}
      {offline && <div className="fixed top-2 right-2 z-50 px-3 py-1 text-xs font-bold" style={{ borderRadius: 999, background: C.sheet, color: C.orange, border: `1px solid ${C.orange}` }}>Offline · will sync</div>}
      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,.65)" }} onClick={() => setDialog(null)}>
          <div role="dialog" aria-modal="true" className="panel w-full max-w-sm p-5" style={{ background: C.sheet }} onClick={(e) => e.stopPropagation()}>
            <div className="body text-base" style={{ color: C.text }}>{dialog.message}</div>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button autoFocus onClick={() => setDialog(null)} className="ghost py-3 font-bold">Cancel</button>
              <button onClick={() => { const fn = dialog.onYes; setDialog(null); fn(); }} className="py-3 font-bold" style={{ borderRadius: 3, background: C.red, color: "#fff", boxShadow: `0 0 16px ${C.red}66` }}>{dialog.yesLabel}</button>
            </div>
          </div>
        </div>
      )}
      {s.settings?.zesty && tab !== "assistant" && (
        <button aria-label={party ? "Stop the disco" : "Start the disco"} onClick={() => setParty(!party)} className="fixed z-40 flex items-center justify-center" style={{ right: 20, bottom: 148, width: 44, height: 44, borderRadius: 999, background: party ? RAINBOW : C.soft, backgroundSize: "200% auto", animation: party ? "rainbow 2s linear infinite" : "none", border: `1px solid ${C.border}`, boxShadow: "0 0 18px rgba(255,60,172,.5)" }}>
          <DiscoIcon size={24} spinning={party} />
        </button>
      )}
      {tab !== "assistant" && (
        <button aria-label="Open voice assistant" onClick={() => setTab("assistant")} className="btn fixed z-40 flex items-center justify-center" style={{ right: 16, bottom: 86, width: 52, height: 52, borderRadius: 999 }}>
          <Bot size={24} />
        </button>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40" style={{ background: C.navBg, backdropFilter: "blur(10px)" }}>
        <div className="neonline" />
        <div className="max-w-md mx-auto grid grid-cols-7">
          {tabs.map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)} className="pt-2.5 pb-3 flex flex-col items-center gap-1 relative" style={{ fontSize: 10, color: tab === id ? C.cyan : C.mute, filter: tab === id ? `drop-shadow(0 0 6px ${C.glow})` : "none" }}>
              {tab === id && <span className="absolute top-0 left-1/4 right-1/4" style={{ height: 2, background: C.cyan, boxShadow: `0 0 10px ${C.cyan}` }} />}
              <Icon size={19} strokeWidth={tab === id ? 2.4 : 1.8} />{label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
/* ---------- Shared bits ---------- */
const Bar = ({ pct, color = C.blue }) => (
  <div className="h-2 overflow-hidden" style={{ background: C.track, borderRadius: 2 }}>
    <div className="h-full barfill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color, boxShadow: `0 0 10px ${color}`, transition: "width .5s", borderRadius: 2 }} />
  </div>
);
const Title = ({ children, right }) => (
  <div className="flex justify-between items-center">
    <h1 className="text-2xl font-bold tracking-wide glowtext" style={{ color: C.text }}>{children}</h1>{right}
  </div>
);
const Empty = ({ children }) => <div className="panel p-5 body text-sm" style={{ color: C.dim }}>{children}</div>;

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,.7)" }} onClick={onClose}>
      <div className="w-full max-w-md mx-auto p-4 max-h-[80vh] overflow-y-auto" style={{ background: C.sheet, borderTop: `1px solid ${C.blue}`, boxShadow: `0 -10px 40px ${C.line}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-bold">{title}</h3><button aria-label="Close" onClick={onClose}><X /></button></div>
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Status ---------- */
function Status({ s, setS, openSettings, openProfile, openMuscle, openExercise, goTrain }) {
  const { lvl, into, need } = levelFromXp(s.xp);
  const ranked = rankedLifts(s);
  const points = pointsOf(s);
  const overall = overallInfo(s);
  const streak = streakOf(s);
  const g = overall.groups;
  const stat = (...ks) => Math.min(100, Math.round((ks.reduce((a, k) => a + (g[k] || 0), 0) / ks.length) * (100 / 6)));
  const [editName, setEditName] = useState(!s.profile.name);
  const oc = overall.rank;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {editName ? (
          <input autoFocus className="inp text-lg font-bold" style={{ maxWidth: 220 }} placeholder="Your name" defaultValue={s.profile.name}
            onBlur={(e) => { setS((p) => ({ ...p, profile: { ...p.profile, name: e.target.value.trim() } })); setEditName(false); }} />
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <button aria-label="Open your profile" onClick={openProfile}><Avatar src={s.profile.avatar} name={s.profile.name} size={44} ring={oc.color} /></button>
            <button onClick={() => setEditName(true)} className="text-2xl font-bold tracking-wide truncate">{s.profile.name ? <FancyName name={s.profile.name} look={s.profile.look} className="glowtext" /> : "Set your name"}</button>
          </div>
        )}
        <div className="flex items-center gap-1 font-semibold" style={{ color: C.orange, textShadow: "0 0 10px rgba(255,147,64,.6)" }}><Flame size={20} />{streak}
          <button aria-label="Settings" onClick={openSettings} className="ml-3 p-1.5 ghost" style={{ color: C.cyan }}><Gear size={18} /></button></div>
      </div>

      <div className="panel p-5 overflow-hidden">
        <div className="absolute -right-4 -top-10 font-extrabold select-none" style={{ fontSize: 170, color: oc.color, opacity: 0.07, lineHeight: 1 }}>{oc.id}</div>
        <div className="flex items-center gap-5 relative">
          <div className="breathe" style={{ "--g": oc.glow }}><RankBadge rank={oc} size={66} /></div>
          <div className="flex-1">
            <div className="text-sm body" style={{ color: C.dim }}>Overall rank · {RANK_INFO[oc.id][0]}</div>
            <div className="ranklabel text-4xl font-extrabold" style={{ color: oc.color, textShadow: `0 0 18px ${oc.glow}` }}>{overall.label}</div>
          </div>
        </div>
        <div className="mt-3 relative"><Bar pct={overall.divPct} color={oc.color} /></div>
        <button onClick={openProfile} className="btn mt-4 w-full py-2.5 text-sm flex items-center justify-center gap-2 relative"><User size={16} />Profile · achievements · weight chart</button>
        <div className="body text-xs mt-1 relative" style={{ color: C.mute }}>Overall counts every muscle group. Groups you haven't trained count as zero.</div>

        <div className="neonline my-4" />
        <div className="flex justify-between items-baseline relative">
          <span className="text-xl font-bold">Level {lvl}</span>
          <span className="text-sm body" style={{ color: C.dim }}>{into} / {need} XP</span>
        </div>
        <div className="mt-2"><Bar pct={(into / need) * 100} color={C.cyan} /></div>
        <div className="mt-4 flex justify-between items-baseline relative">
          <span className="body text-sm" style={{ color: C.dim }}>Leaderboard points</span>
          <span className="text-xl font-bold" style={{ color: C.gold, textShadow: "0 0 12px rgba(255,212,71,.5)" }}>{points.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[["STR", stat("Legs", "Back")], ["PWR", stat("Chest", "Shoulders")], ["ARM", stat("Arms")], ["CORE", stat("Core")]].map(([k, v]) => (
          <div key={k} className="panel py-3 text-center">
            <div className="text-xs" style={{ color: C.dim }}>{k}</div>
            <div className="text-2xl font-bold glowtext">{v}</div>
          </div>
        ))}
      </div>

      <Dashboard s={s} setS={setS} goTrain={goTrain} />
      <Nudges s={s} openExercise={openExercise} goTrain={goTrain} />
      <WeeklyReport s={s} />
      <MogInbox s={s} openProfile={openProfile} />

      <h2 className="text-lg font-bold glowtext">Muscle groups <span className="body text-sm font-normal" style={{ color: C.dim }}>tap one</span></h2>
      <div className="grid grid-cols-3 gap-2">
        {Object.keys(GROUP_WEIGHT).map((gk) => { const sc = g[gk] || 0; const rr = rankFromScore(sc); return (
          <button key={gk} onClick={() => openMuscle(gk)} className="panel p-2 flex flex-col items-center gap-1">
            <RankBadge rank={sc ? rr.rank : RANKS[0]} size={40} still={!sc} />
            <div className="text-xs font-bold">{gk}</div>
            <div className="ranklabel text-xs" style={{ color: sc ? rr.rank.color : C.mute }}>{sc ? rr.label : "–"}</div>
          </button>
        ); })}
      </div>

      <h2 className="text-lg font-bold glowtext">Lift ranks</h2>
      {ranked.length === 0 ? (
        <Empty>Log a workout in Train to get ranked on each lift. Check the Ranks tab to see what every rank takes for your height and weight.</Empty>
      ) : (
        <div className="space-y-2">
          {ranked.sort((a, b) => b.score - a.score).map(({ e, best, rank, label, pct, next, nextLabel }) => {
            const unit = e.type === "bodyweight" ? " reps" : " lb";
            return (
              <button key={e.name} onClick={() => openExercise(e.name)} className="panel p-3 flex items-center gap-4 w-full text-left">
                <RankBadge rank={rank} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold truncate">{e.name}</span>
                    <span className="ranklabel font-bold whitespace-nowrap" style={{ color: rank.color }}>{label}</span>
                  </div>
                  <div className="mt-1.5"><Bar pct={pct} color={rank.color} /></div>
                  <div className="text-xs body mt-1 flex justify-between gap-2" style={{ color: C.mute }}>
                    <span>Best {Math.round(best)}{e.type === "bodyweight" ? " reps" : " lb est. max"}</span>
                    <span>{next ? `${nextLabel} at ${next}${unit}` : "Maxed out"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <Profile s={s} setS={setS} />
    </div>
  );
}

function Profile({ s, setS }) {
  const [open, setOpen] = useState(false);
  const p = s.profile;
  const set = (k, v) => setS((x) => ({ ...x, profile: { ...x.profile, [k]: v } }));
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex justify-between items-center font-semibold">
        Body stats <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-3 body text-sm">
          <label>Weight (lb)<input type="number" className="inp mt-1" value={p.weight} onChange={(e) => { const w = +e.target.value; set("weight", w); if (w > 50) setS((x) => ({ ...x, weightLog: { ...(x.weightLog || {}), [today()]: w } })); }} /></label>
          <label>Height (in)<input type="number" className="inp mt-1" value={p.height} onChange={(e) => set("height", +e.target.value)} /></label>
          <label>Age<input type="number" className="inp mt-1" value={p.age} onChange={(e) => set("age", +e.target.value)} /></label>
          <label>Sex<select className="inp mt-1" value={p.sex} onChange={(e) => set("sex", e.target.value)}><option value="m">Male</option><option value="f">Female</option></select></label>
          <label className="col-span-2">Activity<select className="inp mt-1" value={p.activity} onChange={(e) => set("activity", +e.target.value)}>{ACTIVITY.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          <button className="col-span-2 mt-1 text-xs underline" style={{ color: C.red }} onClick={() => ask("Reset all progress? This can't be undone.", () => setS({ ...DEFAULT, playerId: s.playerId, settings: s.settings }), "Reset")} >Reset all progress</button>
        </div>
      )}
    </div>
  );
}

/* ---------- Train ---------- */
function pastSessions(s, name, excludeId, n = 3) {
  const out = [];
  for (let i = s.workouts.length - 1; i >= 0 && out.length < n; i--) {
    const w = s.workouts[i];
    if (w.id === excludeId) continue;
    const ex = w.exercises.find((e) => e.name === name);
    if (ex) out.push({ date: w.date, sets: ex.sets, id: w.id });
  }
  return out;
}
const setLabel = (def, st) => (def.type === "timed" ? `${st.w ? `${st.w}mi ` : ""}${st.r}m` : st.w ? `${st.w}×${st.r}` : `${st.r}`);

function Train({ s, setS, gainXp }) {
  const [picker, setPicker] = useState(false);
  const [rest, setRest] = useState(null);
  const [plates, setPlates] = useState(null);
  const [titling, setTitling] = useState(false);
  const [filter, setFilter] = useState("All");
  const [showPresets, setShowPresets] = useState(false);
  const [naming, setNaming] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [open, setOpen] = useState({});
  const a = s.active;
  const setActive = (fn) => setS((p) => ({ ...p, active: fn(p.active) }));
  const lastSets = (name) => pastSessions(s, name, a?.editId, 1)[0]?.sets || [];
  const cleaned = (ws) => ws.map((e) => ({ ...e, sets: e.sets.filter((st) => st.done && +st.r > 0) })).filter((e) => e.sets.length);

  const finish = () => {
    const exercises = cleaned(a.exercises);
    if (!exercises.length) { setS((p) => ({ ...p, active: null })); return; }
    if (a.editId) {
      const old = s.workouts.find((w) => w.id === a.editId);
      const res = workoutXp(s, exercises, computeBests({ ...s, workouts: s.workouts.filter((w) => w.id !== a.editId) }));
      const delta = res.xp - (old?.xp || 0);
      setS((p) => ({ ...p, active: null, workouts: p.workouts.map((w) => w.id === a.editId ? { ...w, title: a.title || "", exercises, volume: res.volume, xp: res.xp, lines: res.lines, prBonus: res.prBonus } : w) }));
      gainXp(delta, "Workout updated");
      return;
    }
    const { xp, prs, volume, lines, prBonus } = workoutXp(s, exercises, computeBests(s));
    const d = today();
    const workout = { id: uid(), date: d, title: a.title || "", exercises, volume, xp, lines, prBonus, minutes: Math.round((Date.now() - a.start) / 60000) };
    const after = { ...s, workouts: [...s.workouts, workout] };
    const suggestions = exercises.map((e) => ({ name: e.name, next: suggestNext(after, e.name) })).filter((x) => x.next);
    setS((p) => ({ ...addWorkout(p, workout), active: null, lastSummary: { xp, prs, volume, minutes: workout.minutes, title: workout.title, suggestions, prNames: lines.filter((l) => l.sets.some((st) => st.pr)).map((l) => l.name) } }));
    if (prs) { SFX.pr(); postFeed(s, "pr", `set ${prs} new PR${prs > 1 ? "s" : ""}${workout.title ? ` on ${workout.title} day` : ""}`, { detail: lines.filter((l) => l.sets.some((st) => st.pr)).map((l) => `${l.name} ${l.sets.filter((st) => st.pr).map((st) => st.label).join(", ")}`).join(" · ") }, `pr_${workout.id}`); }
    gainXp(xp, prs ? `${prs} new PR${prs > 1 ? "s" : ""}` : "Workout complete");
    setRest(null);
  };

  const addExercise = (name) => {
    setActive((w) => ({ ...w, exercises: [...w.exercises, { name, sets: [{ w: "", r: "", done: false }] }] }));
    setPicker(false);
    window.scrollTo?.(0, 0);
  };
  const startPreset = (pr) => {
    setS((p) => ({ ...p, active: { start: Date.now(), preset: pr.name, title: pr.name, exercises: pr.exercises.map((e) => ({ name: e.name, sets: Array.from({ length: e.sets || 3 }, () => ({ w: "", r: "", done: false })) })) } }));
    setShowPresets(false); window.scrollTo?.(0, 0);
  };
  const savePreset = () => {
    const name = presetName.trim() || `Preset ${(s.presets || []).length + 1}`;
    const exercises = a.exercises.map((e) => ({ name: e.name, sets: e.sets.length }));
    setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== name), { id: uid(), name, exercises }] }));
    setNaming(false); setPresetName("");
  };
  const editWorkout = (w) => {
    setS((p) => ({ ...p, active: { start: Date.now(), editId: w.id, date: w.date, title: w.title || "", exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets.map((st) => ({ w: st.w ?? "", r: st.r ?? "", done: true })) })) } }));
    window.scrollTo?.(0, 0);
  };

  if (a && picker) return <ExercisePicker s={s} setS={setS} onPick={addExercise} onBack={() => setPicker(false)} />;
  if (!a && titling) return <TitlePicker onBack={() => setTitling(false)} onPick={(title) => { setTitling(false); setS((p) => ({ ...p, active: { start: Date.now(), title, exercises: [] } })); window.scrollTo?.(0, 0); }} />;

  if (!a) {
    const presets = s.presets || [];
    return (
      <div className="space-y-4">
        <Title>Train</Title>
        <div className="grid gap-2" style={{ gridTemplateColumns: "2fr 1fr" }}>
          <button onClick={() => setTitling(true)} className="btn py-4 text-lg">Start workout</button>
          <button onClick={() => setShowPresets(!showPresets)} className="ghost py-4 font-bold flex items-center justify-center gap-2" style={{ color: showPresets ? C.cyan : C.text, borderColor: showPresets ? C.cyan : C.border }}><Layers size={18} />Presets</button>
        </div>
        {showPresets && (
          <div className="panel p-4 space-y-2">
            <div className="font-bold">Workout presets</div>
            {presets.length === 0 && <div className="body text-sm" style={{ color: C.dim }}>None yet. Start a workout, add your exercises, then tap "Save as preset" at the bottom. Next time, load it and just fill in the numbers.</div>}
            <SharedPresets s={s} setS={setS} />
            <PlanGenerator s={s} setS={setS} />
            {presets.map((pr) => (
              <div key={pr.id} className="ghost flex items-center">
                <button onClick={() => startPreset(pr)} className="flex-1 text-left p-3 min-w-0">
                  <div className="font-semibold">{pr.name}</div>
                  <div className="body text-xs truncate" style={{ color: C.dim }}>{pr.exercises.map((e) => `${e.name} ×${e.sets}`).join(" · ")}</div>
                </button>
                <button aria-label={`Delete preset ${pr.name}`} onClick={() => ask(`Delete preset "${pr.name}"?`, () => setS((p) => ({ ...p, presets: p.presets.filter((x) => x.id !== pr.id) })), "Delete")} className="px-3" style={{ color: C.mute }}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}

        {s.lastSummary && (
          <div className="panel p-4 space-y-2" style={{ borderColor: C.green }}>
            <div className="flex justify-between items-center"><div className="font-bold">Last workout{s.lastSummary.title ? ` · ${s.lastSummary.title}` : ""}</div><button aria-label="Dismiss" onClick={() => setS((p) => ({ ...p, lastSummary: null }))} style={{ color: C.mute }}><X size={16} /></button></div>
            <div className="body text-sm" style={{ color: C.sub }}>+{s.lastSummary.xp} XP · {Math.round(s.lastSummary.volume).toLocaleString()} lb{s.lastSummary.minutes ? ` · ${s.lastSummary.minutes} min` : ""}{s.lastSummary.prs ? ` · ${s.lastSummary.prs} PR${s.lastSummary.prs > 1 ? "s" : ""} (${s.lastSummary.prNames.join(", ")})` : ""}</div>
            {s.lastSummary.suggestions.length > 0 && <div className="body text-xs" style={{ color: C.dim }}>Next time: {s.lastSummary.suggestions.map((x) => `${x.name} ${x.next.w}×${x.next.r}`).join(" · ")}</div>}
          </div>
        )}

        <h2 className="text-lg font-bold pt-2">History</h2>
        {(() => { const titles = [...new Set(s.workouts.map((w) => w.title).filter(Boolean))]; return titles.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["All", ...titles].map((t) => <button key={t} onClick={() => setFilter(t)} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: filter === t ? C.blue : C.soft, color: filter === t ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{t}</button>)}
          </div>
        ) : null; })()}
        {s.workouts.length === 0 && <Empty>No workouts yet. XP comes from how much you lift and how many reps you do, scaled to your body and rank.</Empty>}
        {[...s.workouts].reverse().filter((w) => filter === "All" || w.title === filter).slice(0, 25).map((w) => {
          const isOpen = !!open[w.id];
          return (
            <div key={w.id} className="panel p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{w.title ? <span style={{ color: C.cyan }}>{w.title} · </span> : null}{fmtDay(w.date)}{w.source && <span className="body text-xs ml-2" style={{ color: C.cyan }}>{w.source === "deck" ? "card deck" : "from quest"}</span>}</span>
                <div className="flex items-center gap-3">
                  {w.xp ? <button onClick={() => setOpen((o) => ({ ...o, [w.id]: !isOpen }))} className="text-sm font-bold flex items-center gap-1" style={{ color: C.gold }}>+{w.xp} XP<ChevronDown size={14} style={{ transform: isOpen ? "rotate(180deg)" : "none" }} /></button> : null}
                  {!w.source && s.lb && <button aria-label={w.shared ? "Shared to feed" : "Share to feed"} disabled={w.shared} onClick={() => { if (w.shared) return; postFeed(s, "workout", `finished a ${w.title ? `${w.title} ` : ""}workout · +${w.xp || 0} XP`, { detail: w.exercises.map((ex) => ex.name).join(", ") }, `workout_${w.id}`); setS((p) => ({ ...p, workouts: p.workouts.map((x) => (x.id === w.id ? { ...x, shared: true } : x)) })); }} style={{ color: w.shared ? C.green : C.cyan }}>{w.shared ? <Check size={16} /> : <Share2 size={16} />}</button>}
                  {!w.source && s.lb && <SharePreset s={s} workout={w} />}
                  <button aria-label="Edit workout" onClick={() => editWorkout(w)} style={{ color: C.cyan }}><Pencil size={16} /></button>
                  <button aria-label="Delete workout" onClick={() => ask("Delete this workout? The XP you earned stays.", () => setS((p) => ({ ...p, workouts: p.workouts.filter((x) => x.id !== w.id) })), "Delete")} style={{ color: C.mute }}><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="body text-sm mt-1 space-y-0.5" style={{ color: C.sub }}>
                {w.exercises.map((ex, i) => {
                  const def = findEx(s, ex.name);
                  return <div key={i}>{ex.name}: {ex.sets.map((st) => setLabel(def, st)).join(", ")}</div>;
                })}
              </div>
              {isOpen && (
                <div className="mt-3 pt-3 body text-xs space-y-1" style={{ borderTop: `1px solid ${C.line}`, color: C.dim }}>
                  <div className="font-bold" style={{ color: C.text }}>XP breakdown</div>
                  {w.lines ? w.lines.map((l, i) => (
                    <div key={i}>
                      <div className="flex justify-between font-semibold" style={{ color: C.sub }}><span>{l.name}</span><span style={{ color: C.gold }}>+{l.xp}</span></div>
                      {l.sets.map((st, j) => <div key={j} className="flex justify-between pl-3"><span>{st.label} · {st.note}{st.pr ? " · PR" : ""}</span><span>+{st.xp}</span></div>)}
                    </div>
                  )) : <div>Logged before detailed breakdowns existed.</div>}
                  {w.prBonus ? <div className="flex justify-between font-semibold" style={{ color: C.green }}><span>PR bonus</span><span>+{w.prBonus}</span></div> : null}
                  {w.volume ? <div className="pt-1">Volume {Math.round(w.volume).toLocaleString()} lb{w.minutes ? ` · ${w.minutes} min` : ""}</div> : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const live = workoutXp(s, cleaned(a.exercises), computeBests(a.editId ? { ...s, workouts: s.workouts.filter((w) => w.id !== a.editId) } : s));
  const hasWork = a.exercises.some((e) => e.sets.some((st) => st.done));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          {a.editId ? <div className="text-xl font-bold glowtext">Editing {fmtDay(a.date)}</div> : <Timer start={a.start} />}
          <input className="inp text-sm mt-1" style={{ maxWidth: 190, padding: "4px 8px" }} placeholder="Workout title" value={a.title || ""} onChange={(e) => setActive((w) => ({ ...w, title: e.target.value }))} aria-label="Workout title" />
          <div className="text-sm font-bold" style={{ color: C.gold }}>≈ {live.xp} XP{live.prs ? ` · ${live.prs} PR${live.prs > 1 ? "s" : ""}` : ""}</div>
        </div>
        <button onClick={finish} className="px-5 py-2.5 text-sm font-bold" style={{ background: C.green, color: "#02040B", borderRadius: 4, boxShadow: "0 0 16px rgba(79,209,139,.5)" }}>{a.editId ? "Save changes" : "Finish"}</button>
      </div>

      {a.exercises.length === 0 && <Empty>Add your first exercise. Check off each set as you finish it, and only checked sets count.</Empty>}

      {a.exercises.map((ex, ei) => {
        const def = findEx(s, ex.name);
        const timed = def.type === "timed";
        const cardio = timed && def.group === "Cardio";
        const showW = !timed || cardio;
        const prev = lastSets(ex.name);
        const past = pastSessions(s, ex.name, a.editId, 3);
        const upd = (si, patch) => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.map((st, j) => j !== si ? st : { ...st, ...patch }) }) }));
        const delSet = (si) => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.filter((_, j) => j !== si) }) }));
        const cols = showW ? "26px 1fr 1fr 1fr 34px 22px" : "26px 1fr 1fr 34px 22px";
        return (
          <div key={ei} className="panel p-3" style={ex.ss ? { borderColor: C.green, marginBottom: 0 } : a.exercises[ei - 1]?.ss ? { borderColor: C.green, borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0 } : null}>
            {a.exercises[ei - 1]?.ss && <div className="body text-xs font-bold -mt-1 mb-1" style={{ color: C.green }}>⇅ superset with {a.exercises[ei - 1].name}</div>}
            <div className="flex justify-between items-center mb-1">
              <div>
                <span className="font-bold glowtext" style={{ color: C.cyan }}>{ex.name}</span>
                <span className="body text-xs ml-2" style={{ color: C.mute }}>{def.group}</span>
                {def.type === "weighted" && !def.perHand && <button aria-label="Plate calculator" onClick={() => setPlates({ w: +ex.sets.find((st) => +st.w)?.w || +prev[0]?.w || 135 })} className="ml-1 px-1.5 py-0.5" style={{ color: C.mute }}><CircleDot size={14} /></button>}
                {ei < a.exercises.length - 1 && <button aria-label={ex.ss ? "Unlink superset" : "Superset with next"} onClick={() => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => (i === ei ? { ...e, ss: !e.ss } : e)) }))} className="ml-1 px-1.5 py-0.5" style={{ color: ex.ss ? C.green : C.mute }}><Link2 size={14} /></button>}
                {def.type === "weighted" && (() => { const mode = ex.wMode || (def.perHand ? "hand" : "total"); return (
                  <button onClick={() => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, wMode: mode === "hand" ? "total" : "hand" }) }))} className="ml-2 px-2 py-0.5 text-xs font-semibold" style={{ borderRadius: 999, background: C.accentBg, color: C.cyan, border: `1px solid ${C.border}` }}>{mode === "hand" ? "per hand" : "total lb"}</button>
                ); })()}
              </div>
              <button aria-label="Remove exercise" onClick={() => setActive((w) => ({ ...w, exercises: w.exercises.filter((_, i) => i !== ei) }))} style={{ color: C.mute }}><X size={18} /></button>
            </div>
            {(() => { const sg = suggestNext(s, ex.name, a.editId); return sg ? <div className="body text-xs mb-1 font-semibold" style={{ color: C.green }}>Target today: {sg.w}×{sg.r} · {sg.why}</div> : null; })()}
            {past.length > 0 && (
              <div className="body text-xs mb-2 space-y-0.5" style={{ color: C.dim }}>
                {past.map((ps) => <div key={ps.id} className="truncate"><span style={{ color: C.mute }}>{new Date(ps.date + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}:</span> {ps.sets.map((st) => setLabel(def, st)).join(", ")}</div>)}
              </div>
            )}
            <div className="grid gap-2 text-xs body mb-1 px-1" style={{ gridTemplateColumns: cols, color: C.mute }}>
              <span>Set</span><span>Previous</span>{showW && <span>{cardio ? "Miles" : def.type === "bodyweight" ? "+lb" : (ex.wMode || (def.perHand ? "hand" : "total")) === "hand" ? "lb/hand" : "lb"}</span>}<span>{timed ? "Minutes" : "Reps"}</span><span /><span />
            </div>
            {ex.sets.map((st, si) => {
              const pv = prev[si];
              const cmp = st.done && pv && +st.r > 0 ? ((+st.w || 0) * (+st.r || 0) || +st.r) - ((+pv.w || 0) * (+pv.r || 0) || +pv.r) : null;
              return (
                <div key={si} className="grid gap-2 items-center py-1 px-1" style={{ gridTemplateColumns: cols, background: st.done ? "rgba(79,209,139,.14)" : "transparent", borderRadius: 3 }}>
                  <span className="font-semibold text-center">{si + 1}</span>
                  <span className="body text-xs" style={{ color: cmp === null ? C.dim : cmp >= 0 ? C.green : C.orange }}>{pv ? setLabel(def, pv) : "–"}{cmp !== null && pv ? (cmp > 0 ? " ▲" : cmp < 0 ? " ▼" : " =") : ""}</span>
                  {showW && <input type="number" inputMode="decimal" className="inp text-center" value={st.w} placeholder={pv?.w || "0"} onChange={(e) => upd(si, { w: e.target.value })} />}
                  <input type="number" inputMode="decimal" className="inp text-center" value={st.r} placeholder={pv?.r || "0"} onChange={(e) => upd(si, { r: e.target.value })} />
                  <button aria-label="Mark set done" onClick={() => { const turningOn = !st.done; upd(si, turningOn && !st.r && pv ? { done: true, r: pv.r, w: st.w || pv.w } : { done: !st.done }); if (turningOn) { SFX.click(); const secs = s.settings?.rest ?? 90; if (secs > 0 && !a.editId) { Beeper.unlock(); setRest({ end: Date.now() + secs * 1000 }); } } }}
                    className="h-8 flex items-center justify-center" style={{ background: st.done ? C.green : C.soft, borderRadius: 3, color: st.done ? "#02040B" : C.dim }}><Check size={16} /></button>
                  <button aria-label="Delete set" onClick={() => delSet(si)} className="h-8 flex items-center justify-center" style={{ color: C.mute }}><X size={14} /></button>
                </div>
              );
            })}
            <button onClick={() => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: [...e.sets, { w: e.sets.at(-1)?.w || "", r: "", done: false }] }) }))} className="ghost w-full mt-2 py-2 text-sm font-semibold">Add set</button>
          </div>
        );
      })}

      <button onClick={() => setPicker(true)} className="w-full py-3 font-semibold flex items-center justify-center gap-2" style={{ border: `1px dashed ${C.blue}`, color: C.cyan, borderRadius: 4 }}><Plus size={18} />Add exercise</button>

      {rest && <RestBubble end={rest.end} onDone={() => setRest(null)} onClose={() => setRest(null)} />}
      {plates && <PlateSheet weight={plates.w} onClose={() => setPlates(null)} />}

      <TrainCoach s={s} a={a} onAdd={(name, n) => setActive((w) => w.exercises.some((e) => e.name === name)
        ? { ...w, exercises: w.exercises.map((e) => e.name === name ? { ...e, sets: [...e.sets, ...Array.from({ length: n }, () => ({ w: "", r: "", done: false }))] } : e) }
        : { ...w, exercises: [...w.exercises, { name, sets: Array.from({ length: n }, () => ({ w: "", r: "", done: false })) }] })} />

      {a.exercises.length > 0 && !a.editId && (
        naming ? (
          <div className="panel p-3 flex gap-2 items-center">
            <input autoFocus className="inp" placeholder="Preset name, e.g. Push day" value={presetName} onChange={(e) => setPresetName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePreset()} />
            <button onClick={savePreset} className="btn px-4 py-2 text-sm">Save</button>
            <button aria-label="Cancel" onClick={() => setNaming(false)} className="ghost px-3 py-2"><X size={16} /></button>
          </div>
        ) : (
          <button onClick={() => { setPresetName(a.preset || ""); setNaming(true); }} className="ghost w-full py-3 font-semibold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Bookmark size={18} />Save as preset</button>
        )
      )}

      <div style={{ height: 40 }} />
      <button
        onClick={() => { const discard = () => setS((p) => ({ ...p, active: null })); if (a.editId || !hasWork) discard(); else ask("Are you sure you want to discard this workout? (Aidan lock in)", discard, "Discard"); }}
        className="w-full py-4 font-extrabold text-lg tracking-wide"
        style={{ borderRadius: 4, background: "#0A0004", color: "#FF2A55", border: "2px solid #FF2A55", boxShadow: "0 0 24px rgba(255,42,85,.7), inset 0 0 18px rgba(255,42,85,.25)", textShadow: "0 0 10px rgba(255,42,85,.9)" }}>
        {a.editId ? "Cancel editing" : "Discard workout"}
      </button>
    </div>
  );
}

function ExercisePicker({ s, setS, onPick, onBack }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState(null);

  const list = allExercises(s).filter((e) =>
    (group === "All" || (group === "Custom" ? e.custom : group === "Community" ? e.community : e.group === group)) && e.name.toLowerCase().includes(q.trim().toLowerCase()));
  const exact = allExercises(s).some((e) => e.name.toLowerCase() === q.trim().toLowerCase());

  const estimate = async () => {
    setLoading(true); setErr(""); setDraft(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: `A gym app needs details for this exercise: "${q.trim()}".
Respond ONLY with JSON, no markdown:
{"name": clean title-case exercise name,
 "group": one of "Chest","Back","Legs","Shoulders","Arms","Core","Cardio",
 "type": "weighted" (tracked as lb x reps), "bodyweight" (tracked as reps), or "timed" (tracked in minutes, e.g. cardio, holds, sports),
 "perHand": true if people normally count the weight per hand (dumbbells, kettlebells, single-arm cables), false for barbells, machines, two-handed cables, and plate-loaded stacks,
 "factor": for weighted only, how an elite lifter's one-rep max on this exercise compares to their bench press max, using the weight as it is entered (per hand if perHand is true). Examples: bench press = 1.0, squat = 1.25, deadlift = 1.45, overhead press = 0.63, barbell curl = 0.45, dumbbell curl per hand = 0.2, lateral raise per hand = 0.1, reverse fly machine = 0.5, rear delt dumbbell fly per hand = 0.09, machine crunch = 1.3, leg press = 2.4, chest press machine = 1.1. Machines with light-feeling stacks should get higher factors. Use 0 if not weighted,
 "xp": XP value. For weighted/bodyweight: XP per set from 5 (small isolation) to 20 (heavy full-body compound). For timed: XP per minute from 3 (easy) to 10 (very intense),
 "why": one short sentence explaining the XP value}` }],
        }),
      });
      const data = await res.json();
      const text = data.content.map((i) => i.text || "").join("").replace(/```json|```/g, "").trim();
      const r = JSON.parse(text);
      const type = ["weighted", "bodyweight", "timed"].includes(r.type) ? r.type : "weighted";
      setDraft({
        name: String(r.name || q).slice(0, 40), group: GROUPS.includes(r.group) ? r.group : "Core", type,
        factor: type === "weighted" ? Math.min(3, Math.max(0.1, +r.factor || 0.5)) : undefined, reps: type === "bodyweight" ? 1 : undefined, perHand: type === "weighted" && !!r.perHand,
        xp: Math.round(Math.min(type === "timed" ? 10 : 20, Math.max(type === "timed" ? 2 : 4, +r.xp || 8))),
        why: r.why || "", custom: true,
      });
    } catch (e) {
      setErr("Couldn't estimate that one. Try a clearer name, like \"cable lateral raise\".");
    }
    setLoading(false);
  };

  const saveDraft = () => {
    const name = allExercises(s).some((e) => e.name.toLowerCase() === draft.name.toLowerCase()) ? `${draft.name} (custom)` : draft.name;
    const ex = { ...draft, name };
    delete ex.why;
    setS((p) => ({ ...p, custom: [...(p.custom || []), ex] }));
    publishShared(`ex:${slug(name)}`, { ...ex, custom: false, by: s.profile.name || "a player", t: Date.now() });
    onPick(name);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button aria-label="Back to workout" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Add exercise</h1>
      </div>

      <input autoFocus className="inp" placeholder="Search, or type any exercise" value={q} onChange={(e) => { setQ(e.target.value); setDraft(null); setErr(""); }} />

      {q.trim().length > 2 && !exact && !draft && (
        <button onClick={estimate} disabled={loading} className="w-full p-3 flex items-center gap-2 font-semibold text-left" style={{ background: C.accentBg, color: C.cyan, border: `1px solid ${C.blue}`, borderRadius: 4 }}>
          {loading ? <Loader2 size={18} className="animate-spin shrink-0" /> : <Sparkles size={18} className="shrink-0" />}
          {loading ? "Rating this exercise…" : `Create "${q.trim()}" and estimate its XP`}
        </button>
      )}
      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}

      {draft && (
        <div className="panel p-4 space-y-3" style={{ borderColor: C.cyan }}>
          <input className="inp font-bold" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Exercise name" />
          <div className="grid grid-cols-2 gap-2 body text-sm">
            <label>Muscle group<select className="inp mt-1" value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></label>
            <label>Tracked as<select className="inp mt-1" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value, factor: e.target.value === "weighted" ? draft.factor || 0.5 : undefined })}>
              <option value="weighted">Weight × reps</option><option value="bodyweight">Reps</option><option value="timed">Minutes</option></select></label>
          </div>
          {draft.type === "weighted" && (
            <div className="grid grid-cols-2 gap-2">
              {[[false, "Total weight (bar / machine)"], [true, "Per hand (dumbbells)"]].map(([v, l]) => (
                <button key={String(v)} onClick={() => setDraft({ ...draft, perHand: v, factor: draft.perHand === v ? draft.factor : (v ? draft.factor / 2 : draft.factor * 2) })} className="py-2 text-xs font-semibold" style={{ borderRadius: 4, background: !!draft.perHand === v ? C.blue : C.soft, color: !!draft.perHand === v ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{l}</button>
              ))}
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <span className="body text-sm" style={{ color: C.dim }}>Worth</span>
            <span className="text-xl font-bold" style={{ color: C.gold }}>{draft.xp} XP per {draft.type === "timed" ? "minute" : "set"}</span>
          </div>
          {draft.why && <div className="body text-xs" style={{ color: C.dim }}>{draft.why}</div>}
          <button onClick={saveDraft} disabled={!draft.name.trim()} className="btn w-full py-3">Save and add to workout</button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {["All", ...GROUPS, "Custom", "Community"].map((g) => (
          <button key={g} onClick={() => setGroup(g)} className="px-3 py-1.5 text-sm font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 4, background: group === g ? C.blue : C.soft, color: group === g ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{g}</button>
        ))}
      </div>

      {list.length === 0 && <Empty>{group === "Custom" && !q ? "No custom exercises yet. Type any exercise above to create one." : group === "Community" && !q ? "Nothing shared yet. Custom exercises anyone creates show up here for everyone." : "No match. Tap create above to add it as a custom exercise."}</Empty>}
      <div className="space-y-2">
        {list.map((e) => (
          <div key={e.name} className="ghost flex items-center">
            <button onClick={() => onPick(e.name)} className="flex-1 text-left p-3 flex justify-between items-center gap-2">
              <span className="font-semibold">{e.name}</span>
              <span className="body text-xs whitespace-nowrap" style={{ color: C.mute }}>{e.group}{e.perHand ? " · per hand" : ""}{e.community && e.by ? ` · by ${e.by}` : ""}</span>
            </button>
            <a href={ytUrl(e.name)} target="_blank" rel="noreferrer" aria-label={`How to do ${e.name} on YouTube`} className="px-2" style={{ color: C.mute }}><Youtube size={16} /></a>
            {e.custom && (
              <button aria-label={`Delete ${e.name}`} onClick={() => ask(`Delete custom exercise "${e.name}"? Past workouts keep it.`, () => setS((p) => ({ ...p, custom: p.custom.filter((c) => c.name !== e.name) })), "Delete")} className="px-3" style={{ color: C.mute }}><Trash2 size={16} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Timer({ start }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const sec = Math.floor((now - start) / 1000);
  const f = (n) => String(n).padStart(2, "0");
  return <span className="text-3xl font-bold tabular-nums glowtext">{f(Math.floor(sec / 3600))}:{f(Math.floor(sec / 60) % 60)}:{f(sec % 60)}</span>;
}

/* ---------- Quests ---------- */
function Quests({ s, setS, gainXp }) {
  const d = today();
  const day = s.days?.[d];
  useEffect(() => { if (!day) setS((p) => ({ ...p, days: { ...p.days, [d]: newDay() } })); }, [day, d]);
  if (!day) return null;

  const updDay = (fn) => setS((p) => ({ ...p, days: { ...p.days, [d]: fn(p.days[d]) } }));
  const setProg = (id, v) => updDay((x) => ({ ...x, list: x.list.map((q) => q.id === id ? { ...q, progress: Math.max(0, v) } : q) }));
  const reroll = (id) => updDay((x) => {
    const old = x.list.find((q) => q.id === id);
    const fresh = makeQuest(x.list.map((q) => q.qid), old.tier);
    return { ...x, rerolls: x.rerolls + 1, list: x.list.map((q) => q.id === id ? fresh : q) };
  });
  const claim = (q) => {
    const exName = QUEST_EX[q.qid];
    const extra = Math.max(0, q.progress - (q.fromWorkout || 0));
    let logged = null;
    if (exName && extra > 0) {
      const def = findEx(s, exName);
      const sets = [];
      if (def.type === "timed") sets.push({ w: "", r: extra, done: true });
      else { const size = questStep(q); let left = extra; while (left > 0) { sets.push({ w: "", r: Math.min(size, left), done: true }); left -= size; } }
      logged = { id: uid(), date: d, source: "quest", xp: 0, volume: 0, exercises: [{ name: exName, sets }] };
    }
    setS((p) => ({
      ...p,
      workouts: logged ? [...p.workouts, logged] : p.workouts,
      days: { ...p.days, [d]: { ...p.days[d], list: p.days[d].list.map((y) => y.id === q.id ? { ...y, claimed: true } : y) } },
    }));
    gainXp(q.xp, "Quest cleared");
  };

  const tiers = [...new Set(day.list.map((q) => q.tier))];
  const topTier = Math.max(...tiers);
  const tierDone = (t) => day.list.filter((q) => q.tier === t).every((q) => q.claimed);
  const canBonus = tierDone(topTier) && day.bonuses < topTier;
  const canMore = tierDone(topTier) && day.bonuses >= topTier;
  const rerollsLeft = DAILY_REROLLS - day.rerolls;


  return (
    <div className="space-y-4">
      <Title right={<span className="text-sm body flex items-center gap-1" style={{ color: C.dim }}><RefreshCw size={14} />{rerollsLeft} left</span>}>Daily quests</Title>
      <div className="body text-sm" style={{ color: C.dim }}>Don't like a quest? Reroll it (3 per day). Clear a full set to unlock a harder one. Exercise quests link to your workouts both ways.</div>

      {tiers.map((t) => (
        <div key={t} className="space-y-3">
          {t > 1 && <h2 className="text-lg font-bold pt-2" style={{ color: t >= 3 ? C.gold : C.cyan }}>Bonus set {t - 1} · {1 + 0.5 * (t - 1)}× difficulty</h2>}
          {day.list.filter((q) => q.tier === t).map((q) => {
            const done = q.progress >= q.target;
            const step = questStep(q);
            const quick = q.unit === "mi" ? [0.5, 1, 2] : q.unit === "min" ? [1, 5, 10] : q.unit === "cups" ? [1, 2] : q.unit === "steps" ? [500, 1000, 2500] : [5, 10, 25];
            const exName = QUEST_EX[q.qid];
            const label = /^[a-z]/.test(q.title) ? `${q.target.toLocaleString()} ${q.title}` : `${q.title} ${q.target.toLocaleString()} ${q.unit}`;
            return (
              <div key={q.id} className="panel p-4" style={q.claimed ? { borderColor: "rgba(79,209,139,.55)" } : null}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-bold">{label}</div>
                    <div className="body text-sm" style={{ color: C.dim }}>{q.progress.toLocaleString()} / {q.target.toLocaleString()} {q.unit}</div>
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.gold }}>+{q.xp} XP</span>
                </div>
                <div className="my-3"><Bar pct={(q.progress / q.target) * 100} color={q.claimed ? C.green : C.blue} /></div>
                {exName && !q.claimed && <div className="body text-xs -mt-1 mb-3" style={{ color: C.mute }}>Linked to {exName}: logging it in Train fills this quest, and claiming logs these {q.unit === "min" ? "minutes" : `reps in sets of ${step}`} to your history.{q.fromWorkout ? ` ${q.fromWorkout} already came from workouts.` : ""}</div>}
                {q.claimed ? (
                  <div className="text-sm font-semibold flex items-center gap-1" style={{ color: C.green }}><Check size={16} />Cleared</div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-1.5 items-center flex-wrap">
                      <button aria-label="Reroll quest" disabled={rerollsLeft <= 0 || q.progress > 0} onClick={() => reroll(q.id)} className="ghost px-2.5 py-1.5" style={{ color: rerollsLeft > 0 && q.progress === 0 ? C.cyan : C.mute }}><RefreshCw size={14} /></button>
                      {quick.map((n) => <button key={n} onClick={() => setProg(q.id, Math.round((q.progress + n) * 100) / 100)} className="ghost px-2.5 py-1.5 text-sm font-bold">+{n.toLocaleString()}</button>)}
                      <QuestAdd unit={q.unit} onAdd={(n) => setProg(q.id, Math.round((q.progress + n) * 100) / 100)} />
                      {q.progress > 0 && <button aria-label="Undo" onClick={() => setProg(q.id, Math.max(0, Math.round((q.progress - quick[0]) * 100) / 100))} className="ghost px-2.5 py-1.5 text-sm" style={{ color: C.mute }}>−{quick[0]}</button>}
                    </div>
                    <button disabled={!done} onClick={() => claim(q)} className="w-full py-2 font-bold" style={{ borderRadius: 4, background: done ? C.gold : C.soft, color: done ? "#0A1630" : C.mute, boxShadow: done ? "0 0 16px rgba(255,212,71,.5)" : "none" }}>{done ? "Claim" : `${Math.round((q.target - q.progress) * 100) / 100} ${q.unit} to go`}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {canBonus && (
        <button onClick={() => { updDay((x) => ({ ...x, bonuses: x.bonuses + 1 })); gainXp(100 * topTier, "Set cleared"); }} className="w-full py-3 font-bold flex items-center justify-center gap-2" style={{ background: C.gold, color: "#0A1630", borderRadius: 4, boxShadow: "0 0 22px rgba(255,212,71,.55)" }}>
          <Sparkles size={18} />Claim set bonus +{100 * topTier} XP
        </button>
      )}
      {canMore && (
        <button onClick={() => updDay((x) => { const add = []; while (add.length < 3) add.push(makeQuest([...x.list.filter((q) => q.tier === topTier).map((q) => q.qid), ...add.map((q) => q.qid)], topTier + 1)); return { ...x, list: [...x.list, ...add] }; })} className="btn w-full py-3 flex items-center justify-center gap-2">
          <Swords size={18} />Take on 3 harder quests
        </button>
      )}

      <Challenges s={s} setS={setS} gainXp={gainXp} />
    </div>
  );
}

/* ---------- Fuel ---------- */
function Fuel({ s, setS, gainXp }) {
  const [d, setD] = useState(today());
  const p = s.profile;
  const meals = s.meals[d] || [];
  const [adding, setAdding] = useState(false);
  const t = targets(p);
  const tot = mealTotals(meals);
  const isToday = d === today();
  const addMeal = (food) => setS((x) => ({ ...x, meals: { ...x.meals, [d]: [...(x.meals[d] || []), { ...food, id: uid(), qty: 1 }] } }));
  const pct = Math.min(100, (tot.cal / t.cal) * 100);
  if (adding) return <AddFood s={s} setS={setS} dayLabel={isToday ? "today" : fmtDay(d)} onClose={() => setAdding(false)} onAdd={(f) => { addMeal(f); setAdding(false); window.scrollTo?.(0, 0); }} />;

  return (
    <div className="space-y-4">
      <Title>Fuel</Title>

      <div className="panel p-2 flex items-center justify-between">
        <button aria-label="Previous day" onClick={() => setD(shift(d, -1))} className="p-2" style={{ color: C.cyan }}><ChevronLeft /></button>
        <button onClick={() => setD(today())} className="font-semibold">{isToday ? "Today" : fmtDay(d)}</button>
        <button aria-label="Next day" disabled={isToday} onClick={() => setD(shift(d, 1))} className="p-2" style={{ color: isToday ? C.mute : C.cyan }}><ChevronRight /></button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {GOALS.map((g) => (
          <button key={g.id} onClick={() => setS((x) => ({ ...x, profile: { ...x.profile, goal: g.id } }))} className="px-4 py-2 text-sm font-semibold whitespace-nowrap" style={{ borderRadius: 4, background: p.goal === g.id ? C.blue : C.soft, color: p.goal === g.id ? "#fff" : C.text, boxShadow: p.goal === g.id ? "0 0 14px rgba(47,140,255,.55)" : "none", border: `1px solid ${C.border}` }}>{g.label}</button>
        ))}
      </div>

      <div className="panel p-5 flex items-center gap-5">
        <svg width="110" height="110" viewBox="0 0 110 110" className="shrink-0">
          <circle cx="55" cy="55" r="46" fill="none" stroke={C.track} strokeWidth="10" />
          <circle cx="55" cy="55" r="46" fill="none" stroke={tot.cal > t.cal + 150 ? C.orange : C.cyan} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 289} 289`} transform="rotate(-90 55 55)" style={{ filter: "drop-shadow(0 0 6px rgba(124,211,255,.8))" }} />
          <text x="55" y="54" textAnchor="middle" fill={C.text} fontSize="22" fontWeight="700">{Math.round(tot.cal)}</text>
          <text x="55" y="72" textAnchor="middle" fill={C.dim} fontSize="11">of {t.cal}</text>
        </svg>
        <div className="flex-1 space-y-2 body text-sm">
          {[["Protein", tot.p, t.protein, C.cyan], ["Carbs", tot.c, t.carbs, C.green], ["Fat", tot.f, t.fat, C.orange]].map(([n, v, tg, c]) => (
            <div key={n}>
              <div className="flex justify-between"><span>{n}</span><span style={{ color: C.dim }}>{Math.round(v)} / {tg}g</span></div>
              <div className="mt-1"><Bar pct={(v / tg) * 100} color={c} /></div>
            </div>
          ))}
        </div>
      </div>
      {isToday && <FuelCoach s={s} setS={setS} t={t} tot={tot} onAdd={addMeal} />}
      {isToday && (() => {
        const calHit = meals.length > 0 && Math.abs(tot.cal - t.cal) <= t.cal * 0.1;
        const pHit = tot.p >= t.protein;
        const claimed = s.fuelClaimed?.[d];
        const ready = calHit && pHit && !claimed;
        return (
          <div className="panel p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold">Daily fuel goal</span>
              <span className="text-sm font-bold" style={{ color: C.gold }}>+{FUEL_XP} XP</span>
            </div>
            <div className="body text-sm mt-2 space-y-1">
              <div className="flex items-center gap-2" style={{ color: calHit ? C.green : C.dim }}><Check size={15} style={{ opacity: calHit ? 1 : 0.3 }} />Calories within 10% of {t.cal} ({Math.round(tot.cal)} now)</div>
              <div className="flex items-center gap-2" style={{ color: pHit ? C.green : C.dim }}><Check size={15} style={{ opacity: pHit ? 1 : 0.3 }} />Protein at least {t.protein}g ({Math.round(tot.p)}g now)</div>
            </div>
            {claimed ? <div className="text-sm font-semibold mt-3" style={{ color: C.green }}>Claimed for today</div> :
              <button disabled={!ready} onClick={() => { setS((x) => ({ ...x, fuelClaimed: { ...(x.fuelClaimed || {}), [d]: true } })); gainXp(FUEL_XP, "Fuel goal hit"); }} className="w-full mt-3 py-2 font-bold" style={{ borderRadius: 4, background: ready ? C.gold : C.soft, color: ready ? "#0A1630" : C.mute, border: `1px solid ${C.border}` }}>Claim</button>}
          </div>
        );
      })()}
      <div className="body text-xs" style={{ color: C.mute }}>Maintenance is about {t.tdee} cal/day from your body stats. Every day's food saves automatically, and you can look back with the arrows or the Log tab.</div>

      {isToday && <WaterTracker s={s} setS={setS} gainXp={gainXp} d={d} />}
      <NutritionReport s={s} />
      <DayTemplates s={s} setS={setS} d={d} meals={meals} />

      <div className="flex justify-between items-center pt-1">
        <h2 className="text-lg font-bold">{isToday ? "Today's food" : "Food logged"}</h2>
        <button onClick={() => setAdding(true)} className="btn px-3 py-2 text-sm flex items-center gap-1"><Plus size={16} />Add food</button>
      </div>
      {meals.length === 0 && <Empty>Nothing logged {isToday ? "today" : "this day"}. Add food from the list, or type any meal and get an estimate.</Empty>}
      {meals.map((m) => (
        <div key={m.id} className="panel p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{m.meal ? "🥤 " : ""}{m.name}</div>
            <div className="body text-xs" style={{ color: C.dim }}>{Math.round(m.cal * m.qty)} cal · P {Math.round(m.p * m.qty)} · C {Math.round(m.c * m.qty)} · F {Math.round(m.f * m.qty)}</div>
            {m.meal && m.ingredients?.length > 0 && <details className="body text-xs mt-1" style={{ color: C.mute }}><summary style={{ cursor: "pointer" }}>{m.ingredients.length} ingredients</summary>{m.ingredients.map((it, i) => <div key={i} className="pl-2">{it.qty !== 1 ? `${it.qty}× ` : ""}{it.name} · {Math.round(it.cal * it.qty)} cal</div>)}</details>}
          </div>
          <input type="number" step="0.5" min="0.5" aria-label="Servings" className="inp text-center" style={{ width: 58 }} value={m.qty}
            onChange={(e) => setS((x) => ({ ...x, meals: { ...x.meals, [d]: x.meals[d].map((y) => y.id === m.id ? { ...y, qty: +e.target.value || 0 } : y) } }))} />
          <button aria-label="Remove food" onClick={() => setS((x) => ({ ...x, meals: { ...x.meals, [d]: x.meals[d].filter((y) => y.id !== m.id) } }))} style={{ color: C.mute }}><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  );
}

function AddFood({ s, setS, onClose, onAdd, dayLabel }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(null);
  const [err, setErr] = useState("");
  const [src, setSrc] = useState("All");
  const [found, setFound] = useState(null);
  const [building, setBuilding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const barRef = useRef(null);
  const onBarcode = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setLoading("barcode"); setErr(""); setFound(null);
    try { const small = await shrinkPhoto(f, 1000); const food = await barcodeLookup(small); setFound({ ...food, r: "Scanned" }); }
    catch (e2) { setErr(e2.message === "notfound" ? "Barcode read, but that product isn't in the database. Try the AI estimate or a photo of the label." : "Couldn't read the barcode. Fill the frame with it, flat and in focus."); }
    setLoading(null);
  };
  const saved = s.savedFoods || [];

  const recent = useMemo(() => {
    const seen = new Set(), out = [];
    Object.keys(s.meals || {}).sort().reverse().forEach((d) => [...(s.meals[d] || [])].reverse().forEach((m) => {
      if (!seen.has(m.name) && out.length < 12) { seen.add(m.name); out.push({ name: m.name, cal: m.cal, p: m.p, c: m.c, f: m.f, r: m.r }); }
    }));
    return out;
  }, [s.meals]);

  const community = (s.community?.foods || []).map((f) => ({ ...f, r: f.r || "Community", community: true }));
  const pool = src === "All" ? [...saved, ...community, ...RESTAURANT_FOODS, ...FOODS] : src === "Saved" ? saved : src === "Basics" ? FOODS : src === "Community" ? community : src === "Meals" ? [...saved, ...community].filter((f) => f.meal) : RESTAURANT_FOODS.filter((f) => f.r === src);
  const needle = q.trim().toLowerCase().replace(/[’']/g, "");
  const list = pool.filter((f) => f.name.toLowerCase().replace(/[’']/g, "").includes(needle));

  const callClaude = async (prompt, useWeb) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
        ...(useWeb ? { tools: [{ type: "web_search_20250305", name: "web_search" }] } : {}),
      }),
    });
    const data = await res.json();
    const texts = (data.content || []).filter((b) => b.type === "text").map((b) => b.text);
    const joined = texts.join("\n").replace(/```json|```/g, "");
    const match = joined.match(/\{[\s\S]*\}/g);
    if (!match) throw new Error("no json");
    return JSON.parse(match[match.length - 1]);
  };

  const estimate = async () => {
    setLoading("estimate"); setErr(""); setFound(null);
    try {
      const food = await callClaude(`Estimate nutrition for this food or meal as one serving: "${q}". Use typical US portions if none given. Respond ONLY with JSON, no markdown: {"name": short descriptive name with portion, "cal": number, "p": grams protein, "c": grams carbs, "f": grams fat}`, false);
      onAdd({ name: food.name, cal: +food.cal || 0, p: +food.p || 0, c: +food.c || 0, f: +food.f || 0 });
    } catch (e) {
      setErr("Couldn't get an estimate. Try describing it differently, like \"2 slices pepperoni pizza\".");
    }
    setLoading(null);
  };

  const lookup = async () => {
    setLoading("lookup"); setErr(""); setFound(null);
    try {
      const food = await callClaude(`Find the published nutrition facts for this restaurant menu item: "${q}". The user is in Austin, Texas, so local chains like P. Terry's, Torchy's, Whataburger, Tacodeli, Chuy's, Kerbey Lane, Pluckers, Tumble 22 and Taco Cabana are likely. Search the web and prefer the restaurant's own nutrition page or PDF. If the restaurant doesn't publish nutrition, give your best estimate from similar items and say so.
After searching, reply with ONLY this JSON and nothing else: {"name": "Restaurant item name (portion)", "restaurant": "Restaurant", "cal": number, "p": grams protein, "c": grams carbs, "f": grams fat, "source": "official" or "third-party" or "estimate", "note": "under 12 words about where the numbers came from"}`, true);
      setFound({ name: String(food.name || q).slice(0, 70), r: food.restaurant || "", cal: Math.round(+food.cal || 0), p: Math.round(+food.p || 0), c: Math.round(+food.c || 0), f: Math.round(+food.f || 0), source: food.source, note: food.note });
    } catch (e) {
      setErr("Couldn't find that one online. Try adding the restaurant name, like \"Tacodeli Cowboy taco\".");
    }
    setLoading(null);
  };

  const saveAndAdd = (food) => {
    const clean = { name: food.name, r: food.r, cal: food.cal, p: food.p, c: food.c, f: food.f, approx: food.source !== "official" };
    setS((x) => ({ ...x, savedFoods: [clean, ...(x.savedFoods || []).filter((y) => y.name !== clean.name)].slice(0, 60) }));
    publishShared(`food:${slug(clean.name)}`, { ...clean, by: s.profile.name || "a player", t: Date.now() });
    onAdd(clean);
  };

  if (building) return <MealBuilder s={s} setS={setS} pool={[...saved, ...community, ...RESTAURANT_FOODS, ...FOODS]} onBack={() => setBuilding(false)} onDone={(meal) => { setBuilding(false); onAdd(meal); }} />;

  const Row = ({ f, onDelete }) => (
    <div className="ghost flex items-center">
      <button onClick={() => onAdd(f)} className="flex-1 text-left p-3 min-w-0">
        <div className="font-semibold">{f.meal ? "🥤 " : ""}{f.name}</div>
        <div className="body text-xs" style={{ color: C.dim }}>{f.cal} cal · P {f.p} · C {f.c} · F {f.f}{f.meal ? ` · meal · ${(f.ingredients || []).length} ingredients` : ""}{f.approx ? " · approx." : ""}{f.community && f.by ? ` · by ${f.by}` : ""}</div>
      </button>
      {onDelete && <button aria-label={`Remove ${f.name} from saved`} onClick={onDelete} className="px-3" style={{ color: C.mute }}><Trash2 size={16} /></button>}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button aria-label="Back to Fuel" onClick={onClose} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <div>
          <h1 className="text-2xl font-bold glowtext">Add food</h1>
          <div className="body text-xs" style={{ color: C.dim }}>Adding to {dayLabel}</div>
        </div>
      </div>

      <input autoFocus className="inp" placeholder="Search, e.g. P. Terry's double" value={q} onChange={(e) => { setQ(e.target.value); setFound(null); setErr(""); }} />

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setScanning(true)} className="btn py-3 text-xs flex items-center justify-center gap-1"><Camera size={16} />Meal photo</button>
        <button onClick={() => barRef.current?.click()} disabled={!!loading} className="ghost py-3 text-xs font-bold flex items-center justify-center gap-1" style={{ color: C.cyan }}>{loading === "barcode" ? <Loader2 size={16} className="animate-spin" /> : <Store size={16} />}Barcode</button>
        <button onClick={() => setBuilding(true)} className="ghost py-3 text-xs font-bold flex items-center justify-center gap-1" style={{ color: C.cyan }}><ChefHat size={16} />Recipe</button>
      </div>
      <input ref={barRef} type="file" accept="image/*" capture="environment" onChange={onBarcode} style={{ display: "none" }} />
      {loading === "barcode" && <div className="body text-xs" style={{ color: C.dim }}>Reading the barcode and looking up the product…</div>}
      {scanning && <PhotoScan onCancel={() => setScanning(false)} onAddAll={(items) => { items.forEach((it) => onAdd({ name: it.name, cal: it.cal, p: it.p, c: it.c, f: it.f })); }} />}
      {q.trim().length > 2 && !found && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={lookup} disabled={!!loading} className="p-3 flex items-center gap-2 font-semibold text-left text-sm" style={{ background: C.accentBg, color: C.cyan, border: `1px solid ${C.blue}`, borderRadius: 4 }}>
            {loading === "lookup" ? <Loader2 size={18} className="animate-spin shrink-0" /> : <Globe size={18} className="shrink-0" />}
            {loading === "lookup" ? "Searching menus…" : "Look up restaurant online"}
          </button>
          <button onClick={estimate} disabled={!!loading} className="ghost p-3 flex items-center gap-2 font-semibold text-left text-sm" style={{ color: C.text }}>
            {loading === "estimate" ? <Loader2 size={18} className="animate-spin shrink-0" /> : <Sparkles size={18} className="shrink-0" />}
            {loading === "estimate" ? "Estimating…" : "Quick AI estimate"}
          </button>
        </div>
      )}
      {loading === "lookup" && <div className="body text-xs" style={{ color: C.dim }}>Checking restaurant nutrition pages. This can take 10–20 seconds.</div>}
      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}

      {found && (
        <div className="panel p-4 space-y-2" style={{ borderColor: C.cyan }}>
          <div className="font-bold">{found.name}</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[["cal", "Cal"], ["p", "Protein"], ["c", "Carbs"], ["f", "Fat"]].map(([k, l]) => (
              <label key={k} className="body text-xs" style={{ color: C.dim }}>{l}
                <input type="number" className="inp text-center mt-1 font-bold" value={found[k]} onChange={(e) => setFound({ ...found, [k]: +e.target.value || 0 })} />
              </label>
            ))}
          </div>
          <div className="body text-xs" style={{ color: found.source === "official" ? C.green : C.orange }}>
            {found.source === "official" ? "From the restaurant's published nutrition" : found.source === "third-party" ? "From a third-party nutrition site" : "Estimate, since this restaurant doesn't publish nutrition"}{found.note ? ` · ${found.note}` : ""}
          </div>
          <button onClick={() => saveAndAdd(found)} className="btn w-full py-3">Add and save for next time</button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["All", "Meals", ...(saved.length ? ["Saved"] : []), "Community", ...RESTAURANTS, "Basics"].map((g) => (
          <button key={g} onClick={() => setSrc(g)} className="px-3 py-1.5 text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-1" style={{ borderRadius: 4, background: src === g ? C.blue : C.soft, color: src === g ? "#fff" : C.text, border: `1px solid ${C.border}` }}>
            {RESTAURANTS.includes(g) && <Store size={13} />}{g}
          </button>
        ))}
      </div>

      {!needle && src === "All" && recent.length > 0 && (
        <>
          <div className="body text-xs font-semibold pt-1" style={{ color: C.dim }}>Recent</div>
          <div className="space-y-2">{recent.map((f) => <Row key={`r-${f.name}`} f={f} />)}</div>
          <div className="body text-xs font-semibold pt-2" style={{ color: C.dim }}>Everything</div>
        </>
      )}

      {list.length === 0 && <Empty>No match here. Tap "Look up restaurant online" to search the restaurant's nutrition info.</Empty>}
      <div className="space-y-2">
        {list.map((f) => (
          <Row key={`${f.r || "b"}-${f.name}`} f={f} onDelete={saved.includes(f) ? () => setS((x) => ({ ...x, savedFoods: (x.savedFoods || []).filter((y) => y.name !== f.name) })) : null} />
        ))}
      </div>
      <div className="body text-xs pt-2" style={{ color: C.mute }}>Built-in restaurant numbers come from published nutrition info as of September 2026. Items marked approx. are less certain, and portions vary by location.</div>
    </div>
  );
}

/* ---------- Calendar ---------- */
function Calendar({ s }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(today());
  const t = targets(s.profile);

  const info = (d) => {
    const ws = s.workouts.filter((w) => w.date === d);
    const meals = s.meals[d] || [];
    const tot = mealTotals(meals);
    const quests = (s.days?.[d]?.list || []).filter((q) => q.claimed).length;
    return {
      ws, quests, meals, tot, xp: s.xpLog?.[d] || 0,
      volume: ws.reduce((a, w) => a + (w.volume ?? w.exercises.reduce((b, e) => b + e.sets.reduce((c, st) => c + (+st.w || 0) * +st.r, 0), 0)), 0),
      hit: meals.length > 0 && Math.abs(tot.cal - t.cal) <= t.cal * 0.1,
    };
  };

  const first = new Date(ym.y, ym.m, 1);
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysIn }, (_, i) => dkey(new Date(ym.y, ym.m, i + 1)))];
  const monthDays = cells.filter(Boolean).map((d) => ({ d, ...info(d) }));
  const logged = monthDays.filter((x) => x.meals.length);
  const sum = {
    workouts: monthDays.reduce((a, x) => a + x.ws.length, 0),
    quests: monthDays.reduce((a, x) => a + x.quests, 0),
    xp: monthDays.reduce((a, x) => a + x.xp, 0),
    volume: monthDays.reduce((a, x) => a + x.volume, 0),
    avgCal: logged.length ? Math.round(logged.reduce((a, x) => a + x.tot.cal, 0) / logged.length) : 0,
    avgP: logged.length ? Math.round(logged.reduce((a, x) => a + x.tot.p, 0) / logged.length) : 0,
    hits: monthDays.filter((x) => x.hit).length,
  };
  const move = (n) => setYm(({ y, m }) => { const x = new Date(y, m + n, 1); return { y: x.getFullYear(), m: x.getMonth() }; });
  const di = info(sel);
  const td = today();

  return (
    <div className="space-y-4">
      <Title>Log</Title>
      <div className="panel p-3">
        <div className="flex items-center justify-between mb-2">
          <button aria-label="Previous month" onClick={() => move(-1)} className="p-1" style={{ color: C.cyan }}><ChevronLeft /></button>
          <span className="font-bold">{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <button aria-label="Next month" onClick={() => move(1)} className="p-1" style={{ color: C.cyan }}><ChevronRight /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1" style={{ color: C.mute }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => <span key={i}>{x}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const x = info(d);
            const future = d > td;
            return (
              <button key={d} onClick={() => setSel(d)} disabled={future} className="aspect-square flex flex-col items-center justify-center gap-1"
                style={{ borderRadius: 3, background: sel === d ? "rgba(47,140,255,.28)" : x.ws.length ? "rgba(47,140,255,.1)" : "transparent", border: d === td ? `1px solid ${C.cyan}` : "1px solid transparent", opacity: future ? 0.3 : 1 }}>
                <span className="text-sm font-semibold">{+d.slice(8)}</span>
                <span className="flex gap-0.5 h-1.5">
                  {x.ws.length > 0 && <i className="w-1.5 h-1.5 rounded-full" style={{ background: C.blue, boxShadow: `0 0 4px ${C.blue}` }} />}
                  {x.quests > 0 && <i className="w-1.5 h-1.5 rounded-full" style={{ background: C.gold }} />}
                  {x.meals.length > 0 && <i className="w-1.5 h-1.5 rounded-full" style={{ background: x.hit ? C.green : C.orange }} />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 body text-xs" style={{ color: C.dim }}>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.blue }} />Workout</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.gold }} />Quests</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.green }} />Calories on target</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.orange }} />Off target</span>
        </div>
      </div>

      <div className="panel p-4">
        <div className="font-bold mb-3">{sel === td ? "Today" : fmtDay(sel)}</div>
        <div className="grid grid-cols-2 gap-3 body text-sm">
          <Stat label="XP earned" value={di.xp} />
          <Stat label="Quests cleared" value={di.quests} />
          <Stat label="Calories" value={di.meals.length ? `${Math.round(di.tot.cal)} / ${t.cal}` : "–"} />
          <Stat label="Protein" value={di.meals.length ? `${Math.round(di.tot.p)}g` : "–"} />
        </div>
        {(s.xpDetail?.[sel] || []).length > 0 && (
          <div className="mt-3 pt-3 body text-xs space-y-0.5" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="font-bold" style={{ color: C.text }}>XP breakdown</div>
            {s.xpDetail[sel].map((x, i) => <div key={i} className="flex justify-between" style={{ color: C.dim }}><span>{x.m}</span><span style={{ color: x.a >= 0 ? C.gold : C.orange }}>{x.a >= 0 ? "+" : ""}{x.a}</span></div>)}
          </div>
        )}
        {di.ws.length > 0 ? di.ws.map((w) => (
          <div key={w.id} className="mt-3 body text-sm" style={{ color: C.sub }}>
            {w.exercises.map((ex) => <div key={ex.name}><span style={{ color: C.cyan }}>{ex.name}</span>: {ex.sets.map((st) => (st.w ? `${st.w}×${st.r}` : `${st.r}`)).join(", ")}</div>)}
          </div>
        )) : <div className="mt-3 body text-sm" style={{ color: C.mute }}>No workout this day.</div>}
      </div>

      <h2 className="text-lg font-bold">This month</h2>
      <div className="grid grid-cols-2 gap-3 body text-sm">
        <Stat panel label="Workouts" value={sum.workouts} />
        <Stat panel label="Quests cleared" value={sum.quests} />
        <Stat panel label="XP earned" value={sum.xp.toLocaleString()} />
        <Stat panel label="Volume lifted" value={`${Math.round(sum.volume / 1000)}k lb`} />
        <Stat panel label="Avg calories" value={sum.avgCal || "–"} />
        <Stat panel label="Avg protein" value={sum.avgP ? `${sum.avgP}g` : "–"} />
        <Stat panel label="Days food logged" value={logged.length} />
        <Stat panel label="Days on target" value={sum.hits} />
      </div>
    </div>
  );
}
const Stat = ({ label, value, panel }) => (
  <div className={panel ? "panel p-3" : ""}>
    <div className="text-xs" style={{ color: C.dim }}>{label}</div>
    <div className="text-lg font-bold" style={{ fontFamily: "'Oxanium',sans-serif" }}>{value}</div>
  </div>
);
/* ---------- Leaderboard ---------- */
function Board({ s, setS, openProfile, gainXp }) {
  const [view, setView] = useState("board");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("points");
  const [muscle, setMuscle] = useState("Chest");
  const [err, setErr] = useState("");
  
  const [activeCrewId, setActiveCrewId] = useState(null);
  const [crewMemberIds, setCrewMemberIds] = useState([]);

  useEffect(() => {
    if (!activeCrewId) {
      setCrewMemberIds([]);
      return;
    }
    const fetchMembers = async () => {
      const { data } = await supabase.from('crew_members').select('user_id').eq('crew_id', activeCrewId);
      if (data) setCrewMemberIds(data.map(d => `lb:${d.user_id}`));
    };
    fetchMembers();
  }, [activeCrewId]);

  const load = async () => {
    setLoading(true); setErr("");
    if (!window.storage?.list) {
      setErr("The leaderboard needs a connection. Check your signal and tap refresh.");
      setLoading(false); return;
    }
    const readCard = async (k) => {
      try { const r = await window.storage.get(k, true); return r?.value ? { key: k, ...JSON.parse(r.value) } : null; } catch { return null; }
    };
    let keys = null;
    for (let attempt = 0; attempt < 2 && keys === null; attempt++) {
      try { const res = await window.storage.list("lb:", true); keys = res?.keys || []; }
      catch (e) { if (attempt === 0) await new Promise((r) => setTimeout(r, 800)); }
    }
    if (keys === null) {
      const mine = s.lb ? await readCard(`lb:${s.playerId}`) : null;
      setRows(mine ? [mine] : []);
      setErr("Couldn't reach the shared leaderboard. Check your connection and tap refresh in a moment.");
    } else {
      const cards = await Promise.all(keys.map(readCard));
      setRows(cards.filter(Boolean));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const leave = async () => {
    setS((p) => ({ ...p, lb: false }));
    try { await window.storage.delete(`lb:${s.playerId}`, true); } catch (e) { /* not listed */ }
    setRows((r) => r.filter((x) => x.key !== `lb:${s.playerId}`));
  };

  const filteredRows = activeCrewId 
    ? rows.filter(r => crewMemberIds.includes(r.key) || r.key === `lb:${s.playerId}`)
    : rows;

  const ws = weekStart();
  const mk = monthKey();
  const SORTS = {
    points: ["Points", "pts", (r) => r.points || 0], xp: ["XP", "XP", (r) => r.xp || 0], month: ["Month", "XP this month", (r) => (r.month?.key === mk ? r.month.xp : 0)],
    streak: ["Streak", "days", (r) => r.streak || 0], week: ["Week", "workouts", (r) => (r.weekOf === ws ? r.week : 0)],
    muscle: ["Muscles", "", (r) => r.groups?.[muscle] || 0, (r) => { const sc = r.groups?.[muscle] || 0; return sc ? rankFromScore(sc).label : "–"; }],
  };
  const [, unit, val, fmt] = SORTS[sort];
  const show = (r) => (fmt ? fmt(r) : val(r).toLocaleString());
  const sorted = [...filteredRows].sort((a, b) => val(b) - val(a));
  const top = sorted.slice(0, 3), rest = sorted.slice(3);
  const isMe = (r) => r.key === `lb:${s.playerId}`;

  const podiumOrder = [top[1], top[0], top[2]];
  const PLACES = [
    { place: 2, h: 92, color: "#C9D6EA", glow: "rgba(201,214,234,.45)" },
    { place: 1, h: 128, color: C.gold, glow: "rgba(255,212,71,.6)" },
    { place: 3, h: 70, color: C.orange, glow: "rgba(255,147,64,.5)" },
  ];

  return (
    <div className="space-y-4">
      <Title right={<button aria-label="Refresh" onClick={load} className="p-2" style={{ color: C.cyan }}><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>}>Leaderboard</Title>

      <div className="flex gap-2">
        {[["board", "Board"], ["feed", "Feed"], ["crew", "Crew"]].map(([id, l]) => <button key={id} onClick={() => setView(id)} className="flex-1 py-2 text-sm font-bold" style={{ borderRadius: 4, background: view === id ? C.blue : C.soft, color: view === id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{l}</button>)}
      </div>
      {view === "feed" && <Feed s={s} openProfile={openProfile} />}
      {view === "crew" && <Crew s={s} setS={setS} gainXp={gainXp} rows={filteredRows} openProfile={openProfile} activeCrewId={activeCrewId} setActiveCrewId={setActiveCrewId} />}
      {view === "board" && !s.lb ? (
        <div className="panel p-4 space-y-3">
          <div className="font-bold">Join the leaderboard</div>
          <div className="body text-sm" style={{ color: C.dim }}>Everyone using this app will see your profile. Your food log and individual workouts stay private.</div>
          {!s.profile.name && <input className="inp" placeholder="Your name" onBlur={(e) => setS((p) => ({ ...p, profile: { ...p.profile, name: e.target.value.trim() } }))} />}
          <button onClick={() => setS((p) => ({ ...p, lb: true }))} disabled={!s.profile.name} className="btn w-full py-3" style={!s.profile.name ? { opacity: 0.5 } : null}>Join as {s.profile.name || "…"}</button>
        </div>
      ) : view === "board" ? (
        <div className="body text-sm flex justify-between" style={{ color: C.dim }}>
          <span>You're on the board as {s.profile.name}</span>
          <button onClick={leave} className="underline" style={{ color: C.red }}>Leave</button>
        </div>
      ) : null}

      {view === "board" && <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Object.entries(SORTS).map(([id, [l]]) => (
          <button key={id} onClick={() => setSort(id)} className="px-3 py-2 text-sm font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 4, background: sort === id ? C.blue : C.soft, color: sort === id ? "#fff" : C.text, border: `1px solid ${C.border}`, boxShadow: sort === id ? "0 0 14px rgba(47,140,255,.5)" : "none" }}>{l}</button>
        ))}
      </div>
      {sort === "muscle" && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Object.keys(GROUP_WEIGHT).map((gk) => <button key={gk} onClick={() => setMuscle(gk)} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: muscle === gk ? C.cyan : C.soft, color: muscle === gk ? "#001018" : C.text, border: `1px solid ${C.border}` }}>{gk}</button>)}
        </div>
      )}
      {sort === "month" && <div className="body text-xs" style={{ color: C.mute }}>XP earned since the 1st. Resets every month.</div>}
      {sort === "points" && <div className="body text-xs" style={{ color: C.mute }}>Points come from all XP earned in workouts, plus a bonus for your lift ranks.</div>}

      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}
      {!loading && !err && sorted.length === 0 && <Empty>No one's on the board yet. Join and send your cousins the link.</Empty>}

      {top.length > 0 && (
        <div className="grid grid-cols-3 gap-2 items-end pt-6">
          {podiumOrder.map((r, i) => {
            const P = PLACES[i];
            if (!r) return <div key={i} />;
            const rank = RANKS.find((x) => x.id === r.rank) || RANKS[0];
            return (
              <button key={r.key} onClick={() => openProfile(r.key.slice(3))} className="flex flex-col items-center">
                {P.place === 1 && <Crown size={26} style={{ color: C.gold, filter: "drop-shadow(0 0 8px rgba(255,212,71,.8))" }} className="mb-1" />}
                <Avatar src={r.avatar} name={r.name} size={P.place === 1 ? 48 : 38} ring={rank.color} />
                <div className="font-bold text-sm mt-2 text-center w-full truncate"><FancyName name={r.name} look={r.look} style={{ color: isMe(r) ? C.cyan : C.text }} /></div>
                {r.title && <div className="text-xs font-bold tracking-wider uppercase truncate w-full text-center" style={{ color: r.look?.accent || C.cyan }}>{r.title}</div>}
                <div className="text-xs body mb-2" style={{ color: C.dim }}>{show(r)} {unit}</div>
                <div className="w-full flex items-start justify-center pt-2" style={{ height: P.h, borderRadius: "4px 4px 0 0", background: PROFILE_BGS.find((b) => b.id === r.look?.bg)?.css ? `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.6)), ${PROFILE_BGS.find((b) => b.id === r.look?.bg).css}` : `linear-gradient(180deg, ${P.glow}, ${C.bg})`, backgroundSize: "cover", border: `1px solid ${r.look?.accent || P.color}`, borderBottom: "none", boxShadow: `0 0 20px ${P.glow}` }}>
                  <span className="text-3xl font-extrabold" style={{ color: P.color, textShadow: `0 0 12px ${P.glow}` }}>{P.place}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {rest.map((r, i) => {
          const rank = RANKS.find((x) => x.id === r.rank) || RANKS[0];
          return (
            <button key={r.key} onClick={() => openProfile(r.key.slice(3))} className="panel p-3 flex items-center gap-3 w-full text-left" style={{ ...(lookStyle(r.look, 0.6) || {}), ...(isMe(r) ? { boxShadow: "0 0 20px rgba(124,211,255,.3)" } : {}) }}>
              <span className="w-7 text-center text-lg font-extrabold" style={{ color: C.dim }}>{i + 4}</span>
              <Avatar src={r.avatar} name={r.name} size={32} ring={rank.color} />
              <div className="flex-1 min-w-0 ml-1">
                <div className="font-bold truncate"><FancyName name={r.name} look={r.look} style={{ color: r.look?.bg && r.look.bg !== "none" ? "#fff" : C.text }} />{isMe(r) && <span className="body text-xs ml-2" style={{ color: C.cyan }}>you</span>}</div>
                {r.title && <div className="text-xs font-bold tracking-wider uppercase" style={{ color: r.look?.accent || C.cyan }}>{r.title}</div>}
                <div className="body text-xs" style={{ color: C.dim }}><span className="ranklabel">{r.rank}{r.div ? ` ${r.div}` : ""}</span> · Level {r.lvl} · {r.streak} day streak</div>
              </div>
              <div className="text-right">
                <div className="font-bold glowtext">{show(r)}</div>
                <div className="body text-xs" style={{ color: C.mute }}>{unit}</div>
              </div>
            </button>
          );
        })}
      </div>
      {sorted.length > 0 && <div className="body text-xs" style={{ color: C.mute }}>Tap anyone to see their profile, achievements, and leave a high-five or comment.</div>}
      </>}
    </div>
  );
}

/* ---------- Ranks guide ---------- */
function Ranks({ s, openMuscle }) {
  const p = s.profile;
  const [pick, setPick] = useState("Bench Press");
  const overall = overallInfo(s);
  const key = ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row", "Pull-up"];
  const all = allExercises(s).filter((e) => e.type !== "timed");
  const bests = computeBests(s);
  const ft = Math.floor(p.height / 12), inch = Math.round(p.height % 12);
  const totalW = Object.values(GROUP_WEIGHT).reduce((a, b) => a + b, 0);

  const Row = ({ e }) => {
    const steps = thresholds(e, p);
    const cur = bests[e.name] ? rankFor(e, bests[e.name], p) : null;
    return (
      <div className="grid items-center gap-1 py-2 text-sm" style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)", borderTop: `1px solid rgba(0,217,255,.10)` }}>
        <div className="min-w-0">
          <div className="font-semibold truncate">{e.name}{e.perHand ? <span className="body text-xs font-normal" style={{ color: C.mute }}> /hand</span> : null}</div>
          <div className="body text-xs" style={{ color: cur ? cur.rank.color : C.mute }}>{cur ? `You: ${cur.label}` : "Not logged"}</div>
        </div>
        {steps.map((v, i) => {
          const reached = cur && cur.score >= i + 1;
          return <div key={i} className="text-center font-semibold tabular-nums" style={{ color: reached ? RANKS[i + 1].color : C.sub, textShadow: reached ? `0 0 8px ${RANKS[i + 1].glow}` : "none" }}>{v}</div>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-wide glowtext">Ranks</h1>
      <div className="body text-sm" style={{ color: C.dim }}>
        Targets are built for you: {p.weight} lb, {ft}'{inch}", {p.sex === "f" ? "female" : "male"}. Update your body stats on the Status tab whenever they change.
      </div>

      <div className="space-y-2">
        {[...RANKS].reverse().filter((r) => r.id !== "SS" || overall.score >= 6).map((r) => {
          const mine = overall.rank.id === r.id;
          return (
            <div key={r.id} className="panel p-3 flex items-center gap-4" style={mine ? { borderColor: r.color, boxShadow: `0 0 22px ${r.glow}` } : null}>
              <RankBadge rank={r} size={36} />
              <div className="flex-1 ml-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold" style={{ color: r.color }}>{r.id}-Rank · {RANK_INFO[r.id][0]}</span>
                  {mine && <span className="text-xs font-bold" style={{ color: r.color }}>You · {overall.label}</span>}
                </div>
                <div className="body text-xs mt-0.5" style={{ color: C.dim }}>{RANK_INFO[r.id][1]}</div>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="text-lg font-bold glowtext pt-2">What each rank takes</h2>
      <div className="panel p-3">
        <div className="grid gap-1 pb-1 text-xs font-bold" style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)" }}>
          <span style={{ color: C.dim }}>Lift</span>
          {RANKS.slice(1, 6).map((r) => <span key={r.id} className="text-center" style={{ color: r.color, textShadow: `0 0 8px ${r.glow}` }}>{r.id}</span>)}
        </div>
        {key.map((n) => { const e = all.find((x) => x.name === n); return e ? <Row key={n} e={e} /> : null; })}
      </div>

      <div className="panel p-3 space-y-2">
        <label className="body text-sm block" style={{ color: C.dim }}>Look up any exercise
          <select className="inp mt-1" value={pick} onChange={(e) => setPick(e.target.value)}>
            {GROUPS.filter((g) => g !== "Cardio").map((g) => (
              <optgroup key={g} label={g}>{all.filter((e) => e.group === g).map((e) => <option key={e.name}>{e.name}</option>)}</optgroup>
            ))}
          </select>
        </label>
        {all.find((e) => e.name === pick) && <Row e={all.find((e) => e.name === pick)} />}
      </div>

      <h2 className="text-lg font-bold glowtext pt-2">How overall rank works</h2>
      <div className="panel p-4 space-y-3">
        {Object.entries(GROUP_WEIGHT).map(([k, w]) => {
          const sc = overall.groups[k] || 0;
          const r = rankFromScore(sc);
          return (
            <button key={k} onClick={() => openMuscle?.(k)} className="w-full text-left">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{k} <span className="body text-xs" style={{ color: C.mute }}>counts {Math.round((w / totalW) * 100)}% · tap</span></span>
                <span className="font-bold" style={{ color: sc ? r.rank.color : C.mute }}>{sc ? r.label : "Untrained"}</span>
              </div>
              <div className="mt-1"><Bar pct={(sc / 6) * 100} color={sc ? r.rank.color : C.mute} /></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
/* ---------- Settings ---------- */
async function encodeSave(s) {
  const data = { ...s, active: null, community: undefined, chat: undefined };
  const raw = new TextEncoder().encode(JSON.stringify({ app: "ascend", v: 2, saved: Date.now(), data }));
  if (typeof CompressionStream !== "undefined") {
    try {
      const gz = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
      return "ASC2-" + b64url(gz);
    } catch (e) { /* fall back to plain */ }
  }
  return "ASC1-" + b64url(raw);
}
async function decodeSave(code) {
  const t = code.trim().replace(/\s+/g, "");
  let bytes;
  if (t.startsWith("ASC2-")) bytes = new Uint8Array(await new Response(new Blob([fromB64url(t.slice(5))]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
  else if (t.startsWith("ASC1-")) bytes = fromB64url(t.slice(5));
  else bytes = Uint8Array.from(atob(t.replace(/^ASCEND-/, "")), (c) => c.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  if (parsed.app !== "ascend" || !parsed.data?.profile || !Array.isArray(parsed.data.workouts)) throw new Error("bad save");
  return parsed;
}

function SettingsPage({ s, setS, onBack, party, setParty, openTool }) {
  const st = s.settings || {};
  const setSet = (k, v) => setS((p) => ({ ...p, settings: { ...p.settings, [k]: v, savedAt: Date.now() } }));
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState(null);

  const makeSave = async () => {
    const c = await encodeSave(s);
    setCode(c); setCopied(false);
    try { await navigator.clipboard.writeText(c); setCopied(true); } catch (e) { /* manual */ }
  };
  const shareSave = async () => {
    const c = code || await encodeSave(s);
    setCode(c);
    try { await navigator.share({ title: "Ascend save code", text: c }); } catch (e) { try { await navigator.clipboard.writeText(c); setCopied(true); } catch (e2) { /* manual */ } }
  };
  const load = async () => {
    try {
      const { data, saved } = await decodeSave(paste);
      const when = new Date(saved).toLocaleString();
      ask(`Load save from ${when}? This replaces everything currently in the app.`, () => {
        setS({ ...DEFAULT, ...data, active: null, settings: { ...DEFAULT.settings, ...(data.settings || {}) }, playerId: data.playerId || s.playerId });
        setPaste(""); setMsg({ ok: true, text: `Save loaded: level ${levelFromXp(data.xp || 0).lvl}, ${data.workouts.length} workouts.` });
      }, "Load");
    } catch (e) {
      setMsg({ ok: false, text: "That code didn't work. Make sure you copied the whole thing, starting with ASC2-, ASC1-, or ASCEND-." });
    }
  };

  const Toggle = ({ on, onClick, label }) => (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick} className="relative shrink-0" style={{ width: 50, height: 28, borderRadius: 999, background: on ? C.cyan : C.track, border: `1px solid ${C.border}`, boxShadow: on ? `0 0 12px ${C.glow}` : "none", transition: "background .2s" }}>
      <span className="absolute top-0.5" style={{ left: on ? 24 : 2, width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "left .2s" }} />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Settings</h1>
      </div>

      <h2 className="text-lg font-bold">Appearance</h2>
      <div className="panel p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[["dark", Moon, "Dark"], ["light", Sun, "Light"]].map(([id, Icon, l]) => (
            <button key={id} onClick={() => setSet("theme", id)} className="py-3 flex items-center justify-center gap-2 font-bold" style={{ borderRadius: 4, background: (st.theme || "dark") === id ? C.blue : C.soft, color: (st.theme || "dark") === id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>
              <Icon size={18} />{l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Palette size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Zesty mode</div>
            <div className="body text-xs" style={{ color: C.dim }}>Rainbow everything, disco music and a disco ball.</div>
          </div>
          <Toggle label="Zesty mode" on={!!st.zesty} onClick={() => { const on = !st.zesty; setSet("zesty", on); setParty(on); }} />
        </div>
        <div className="flex items-center gap-3">
          <Type size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Easy-read font</div>
            <div className="body text-xs" style={{ color: C.dim }}>Switches everything to Lexend.</div>
          </div>
          <Toggle label="Easy-read font" on={!!st.dysFont} onClick={() => setSet("dysFont", !st.dysFont)} />
        </div>
        <div className="flex items-center gap-3">
          <Palette size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Custom colors</div>
            <div className="body text-xs" style={{ color: C.dim }}>Pick your own accent, secondary, and background.</div>
          </div>
          <Toggle label="Custom colors" on={!!st.custom?.on} onClick={() => setSet("custom", { ...(st.custom || DEFAULT.settings.custom), on: !st.custom?.on })} />
        </div>
        <div className="flex items-center gap-3">
          {st.voice ? <Volume2 size={22} style={{ color: C.cyan }} /> : <VolumeX size={22} style={{ color: C.mute }} />}
          <div className="flex-1">
            <div className="font-bold">Assistant voice</div>
            <div className="body text-xs" style={{ color: C.dim }}>Sterling reads his replies out loud.</div>
          </div>
          <Toggle label="Assistant voice" on={!!st.voice} onClick={() => setSet("voice", !st.voice)} />
        </div>
        <div className="flex items-center gap-3">
          <Volume2 size={22} style={{ color: C.cyan }} />
          <div className="flex-1"><div className="font-bold">Sound effects</div><div className="body text-xs" style={{ color: C.dim }}>Set clicks, PR chime, level-up fanfare.</div></div>
          <Toggle label="Sound effects" on={st.sounds !== false} onClick={() => setSet("sounds", st.sounds === false)} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimerIcon size={22} style={{ color: C.cyan }} />
          <div className="flex-1"><div className="font-bold">Rest timer</div><div className="body text-xs" style={{ color: C.dim }}>Starts when you check off a set.</div></div>
          <div className="flex gap-1">{[0, 60, 90, 120, 180].map((v) => <button key={v} onClick={() => setSet("rest", v)} className="px-2 py-1 text-xs font-semibold" style={{ borderRadius: 999, background: (st.rest ?? 90) === v ? C.blue : C.soft, color: (st.rest ?? 90) === v ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{v ? `${v}s` : "Off"}</button>)}</div>
        </div>
      </div>

      <h2 className="text-lg font-bold">Workout tools</h2>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => openTool("timer")} className="panel p-4 text-left">
          <TimerIcon size={26} style={{ color: C.cyan }} />
          <div className="font-bold mt-2">Interval timer</div>
        </button>
        <button onClick={() => openTool("cards")} className="panel p-4 text-left">
          <Layers size={26} style={{ color: C.cyan }} />
          <div className="font-bold mt-2">Deck of cards</div>
        </button>
      </div>

      {window.ascendAuth && (
        <div className="panel p-4 flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="font-bold">Account</div><div className="body text-xs truncate" style={{ color: C.dim }}>{window.ascendAuth.email}</div></div>
          <button onClick={() => ask("Sign out on this device?", () => window.ascendAuth.signOut(), "Sign out")} className="ghost px-4 py-2 text-sm font-bold" style={{ color: C.red }}>Sign out</button>
        </div>
      )}

      <h2 className="text-lg font-bold">Save files</h2>
      <div className="panel p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={makeSave} className="btn py-3 flex items-center justify-center gap-2"><Save size={18} />Copy save code</button>
          <button onClick={shareSave} className="ghost py-3 font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Share2 size={18} />Share…</button>
        </div>
        {code && <textarea readOnly value={code} className="inp body text-xs" rows={3} style={{ wordBreak: "break-all" }} />}
        <textarea value={paste} onChange={(e) => { setPaste(e.target.value); setMsg(null); }} className="inp body text-xs" rows={3} placeholder="Paste a save code here" />
        <button onClick={load} disabled={!paste.trim()} className="ghost w-full py-3 font-bold flex items-center justify-center gap-2" style={{ color: paste.trim() ? C.cyan : C.mute }}><Upload size={18} />Load save</button>
        {msg && <div className="body text-sm" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
      </div>
    </div>
  );
}

/* ---------- Voice assistant ---------- */
function buildContext(s) {
  const p = s.profile, d = today(), t = targets(p);
  const o = overallInfo(s);
  const lifts = rankedLifts(s).sort((a, b) => b.score - a.score).slice(0, 12)
    .map((r) => `${r.e.name}: ${r.label}`).join("; ");
  return `Name: ${p.name || "unknown"}. Bodyweight ${p.weight} lb, height ${p.height} in. Goal: ${p.goal}.
Level ${levelFromXp(s.xp).lvl} (${s.xp} XP), overall rank ${o.label}, streak ${streakOf(s)} days.
Lift ranks: ${lifts || "none logged yet"}.`;
}

const VOICE_STYLES = {
  goblin: { name: "Unhinged goblin", seq: [[2, 1.3], [0.3, 0.8], [1.9, 1.5], [0.6, 1.05]] },
  chipmunk: { name: "Chipmunk", seq: [[2, 1.4]] },
  deep: { name: "Deep bloke", seq: [[0.15, 0.8]] },
  pints: { name: "Two pints in", seq: [[0.7, 0.6]] },
  hyper: { name: "Hyper", seq: [[1.4, 1.9]] },
  posh: { name: "Posh butler (normal)", seq: [[0.92, 1.02]] },
};
const YT_RE = /\[\[yt:([^\]]+)\]\]/g;
const ytUrl = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to ${q} proper form`)}`;
const stripYt = (t) => t.replace(YT_RE, "").replace(/\s{2,}/g, " ").trim();
function pickBritishVoice() {
  const vs = window.speechSynthesis?.getVoices?.() || [];
  const gb = vs.filter((v) => /en[-_]GB/i.test(v.lang));
  return gb.find((v) => /daniel|arthur|oliver|george|uk english male|male/i.test(v.name)) || gb[0] || null;
}

function Assistant({ s, setS, onBack }) {
  const chat = s.chat || [];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voiceOn = s.settings?.voice !== false;

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const style = VOICE_STYLES[s.settings?.voiceStyle] || VOICE_STYLES.goblin;
      const v = pickBritishVoice();
      const parts = stripYt(text).split(/(?<=[.!?])\s+/).filter(Boolean);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        if (v) u.voice = v;
        const [pitch, rate] = style.seq[i % style.seq.length];
        u.lang = "en-GB"; u.pitch = pitch; u.rate = rate;
        if (i === 0) u.onstart = () => setSpeaking(true);
        if (i === parts.length - 1) u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(u);
      });
    } catch (e) { setSpeaking(false); }
  };

  const send = async (textArg) => {
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    const next = [...chat, { role: "user", content: text }].slice(-20);
    setS((p) => ({ ...p, chat: next }));
    setInput(""); setBusy(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `You are Sterling, the unhinged British butler gym coach. Keep replies to 1-3 short sentences. No markdown.\n\n${buildContext(s)}`,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = (data.content || []).map((i) => i.text || "").join("").trim();
      setS((p) => ({ ...p, chat: [...(p.chat || []), { role: "assistant", content: reply }].slice(-20) }));
      if (voiceOn) speak(reply);
    } catch (e) { /* ignore */ }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={() => { window.speechSynthesis?.cancel(); onBack(); }} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext flex-1">Sterling</h1>
      </div>

      <div className="space-y-3">
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="panel max-w-[85%] px-3 py-2 body text-sm" style={{ background: m.role === "user" ? C.blue : undefined, color: m.role === "user" ? "#fff" : C.text }}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="panel p-2 flex items-center gap-2">
        <input className="inp" placeholder="Ask Sterling" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button onClick={() => send()} disabled={!input.trim() || busy} className="btn px-4 py-2">Send</button>
      </div>
    </div>
  );
}

/* ---------- Zesty disco ---------- */
const Groove = {
  ctx: null, master: null, timer: null, step: 0, nextTime: 0, noise: null, bpm: 114,
  start() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) {
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      this.ctx.resume();
    } catch (e) {}
  },
  stop() { try { this.ctx?.suspend(); } catch (e) {} },
};

function DiscoIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#fff" />
    </svg>
  );
}

function DiscoParty() {
  return <div className="fixed inset-0 pointer-events-none z-30" style={{ background: "rgba(255,60,172,.05)" }} />;
}

/* ---------- Beeps ---------- */
const Beeper = {
  ctx: null,
  unlock() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !this.ctx) this.ctx = new AC();
      this.ctx?.resume();
    } catch (e) {}
  },
  tone(freq, dur = 0.15) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  },
  tick() { this.tone(660, 0.08); },
  work() { this.tone(1046, 0.2); },
  rest() { this.tone(523, 0.3); },
  done() { this.tone(1318, 0.4); },
};
const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;
/* ---------- Interval timer ---------- */
function IntervalTimer({ visible, onBack, onOpen }) {
  const [work, setWork] = useState(20);
  const [rest, setRest] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [run, setRun] = useState(null);
  const runRef = useRef(null); runRef.current = run;
  const cfgRef = useRef({}); cfgRef.current = { work, rest, rounds };
  const wakeRef = useRef(null);

  useEffect(() => {
    if (!run || run.paused || run.phase === "done") return;
    const id = setInterval(() => {
      const r = runRef.current, cfg = cfgRef.current;
      if (!r || r.paused) return;
      let { phase, left, round } = r;
      left -= 1;
      if (left > 0) {
        if (left <= 3) Beeper.tick();
        setRun({ ...r, left });
        return;
      }
      if (phase === "ready" || (phase === "rest")) {
        if (phase === "rest") round += 1;
        Beeper.work(); setRun({ phase: "work", left: cfg.work, round, paused: false });
      } else if (phase === "work") {
        if (cfg.rounds > 0 && round >= cfg.rounds) { Beeper.done(); setRun({ phase: "done", left: 0, round, paused: false }); releaseWake(); }
        else if (cfg.rest > 0) { Beeper.rest(); setRun({ phase: "rest", left: cfg.rest, round, paused: false }); }
        else { Beeper.work(); setRun({ phase: "work", left: cfg.work, round: round + 1, paused: false }); }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [run?.paused, run?.phase, !!run]);

  const releaseWake = () => { try { wakeRef.current?.release(); } catch (e) {} wakeRef.current = null; };
  useEffect(() => () => releaseWake(), []);

  const start = async () => {
    Beeper.unlock(); Beeper.tick();
    setRun({ phase: "ready", left: 3, round: 1, paused: false });
    try { wakeRef.current = await navigator.wakeLock?.request("screen"); } catch (e) {}
  };
  const stop = () => { setRun(null); releaseWake(); };

  const phaseColor = !run ? C.cyan : run.phase === "work" ? C.green : run.phase === "rest" ? C.orange : run.phase === "done" ? C.gold : C.cyan;
  const phaseTotal = !run ? work : run.phase === "work" ? work : run.phase === "rest" ? rest : 3;
  const pct = run && run.phase !== "done" ? run.left / phaseTotal : 1;
  const R = 110, CIRC = 2 * Math.PI * R;
  const totalTime = rounds > 0 ? rounds * work + (rounds - 1) * rest : null;

  const Stepper = ({ label, value, set, step, min, max, fmt }) => (
    <div className="panel p-3">
      <div className="body text-xs" style={{ color: C.dim }}>{label}</div>
      <div className="flex items-center justify-between mt-1">
        <button aria-label={`Less ${label}`} disabled={!!run} onClick={() => set(Math.max(min, value - step))} className="ghost w-9 h-9 flex items-center justify-center"><Minus size={16} /></button>
        <span className="text-xl font-bold tabular-nums">{fmt(value)}</span>
        <button aria-label={`More ${label}`} disabled={!!run} onClick={() => set(Math.min(max, value + step))} className="ghost w-9 h-9 flex items-center justify-center"><Plus size={16} /></button>
      </div>
    </div>
  );

  if (!visible) {
    if (!run || run.phase === "done") return null;
    return (
      <button onClick={onOpen} aria-label="Open interval timer" className="fixed z-40 flex items-center gap-2 px-3 py-2 font-bold tabular-nums" style={{ left: 16, bottom: 90, borderRadius: 999, background: C.sheet, color: phaseColor, border: `1px solid ${phaseColor}`, boxShadow: `0 0 16px ${phaseColor}66` }}>
        <TimerIcon size={16} />{run.phase === "work" ? "Work" : run.phase === "rest" ? "Rest" : "Ready"} {fmtClock(run.left)}{run.paused ? " ❚❚" : ""}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Interval timer</h1>
      </div>

      <div className="panel p-5 flex flex-col items-center">
        <svg width="250" height="250" viewBox="0 0 250 250" role="img" aria-label={run ? `${run.phase} ${run.left} seconds` : "Timer ready"}>
          <circle cx="125" cy="125" r={R} fill="none" stroke={C.track} strokeWidth="14" />
          <circle cx="125" cy="125" r={R} fill="none" stroke={phaseColor} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${CIRC * pct} ${CIRC}`} transform="rotate(-90 125 125)" style={{ transition: "stroke-dasharray 1s linear", filter: `drop-shadow(0 0 8px ${phaseColor})` }} />
          <text x="125" y="108" textAnchor="middle" fill={phaseColor} fontSize="20" fontWeight="700" style={{ letterSpacing: 3 }}>{!run ? "READY" : run.phase === "done" ? "DONE" : run.phase.toUpperCase()}</text>
          <text x="125" y="160" textAnchor="middle" fill={C.text} fontSize="58" fontWeight="800" style={{ fontVariantNumeric: "tabular-nums" }}>{run ? (run.phase === "done" ? "✓" : fmtClock(run.left)) : fmtClock(work)}</text>
          <text x="125" y="190" textAnchor="middle" fill={C.dim} fontSize="14">{run ? `Round ${run.round}${rounds > 0 ? ` of ${rounds}` : ""}` : rounds > 0 ? `${rounds} rounds · ${fmtClock(totalTime)} total` : "Endless rounds"}</text>
        </svg>

        <div className="flex gap-3 mt-3 w-full">
          {!run || run.phase === "done" ? (
            <button onClick={start} className="btn flex-1 py-4 text-lg flex items-center justify-center gap-2"><Play size={20} />Start</button>
          ) : (
            <>
              <button onClick={() => { Beeper.unlock(); setRun({ ...run, paused: !run.paused }); }} className="btn flex-1 py-4 text-lg flex items-center justify-center gap-2">{run.paused ? <><Play size={20} />Resume</> : <><Pause size={20} />Pause</>}</button>
              <button onClick={stop} aria-label="Reset timer" className="ghost px-5 flex items-center justify-center"><RotateCcw size={20} /></button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stepper label="Work" value={work} set={setWork} step={5} min={5} max={600} fmt={fmtClock} />
        <Stepper label="Rest" value={rest} set={setRest} step={5} min={0} max={300} fmt={(v) => (v ? fmtClock(v) : "None")} />
        <Stepper label="Rounds" value={rounds} set={setRounds} step={1} min={0} max={99} fmt={(v) => (v ? v : "∞")} />
      </div>
    </div>
  );
}

/* ---------- Deck of cards ---------- */
const SUITS = [
  { id: "S", sym: "♠", name: "Spades", red: false },
  { id: "H", sym: "♥", name: "Hearts", red: true },
  { id: "D", sym: "♦", name: "Diamonds", red: true },
  { id: "C", sym: "♣", name: "Clubs", red: false },
];
const FACES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
function freshDeck(jokers) {
  const d = [];
  SUITS.forEach((su) => FACES.forEach((f, i) => d.push({ suit: su.id, face: f, rank: i + 1 })));
  if (jokers) { d.push({ suit: "J", face: "JOKER", rank: 0 }); d.push({ suit: "J", face: "JOKER", rank: 0 }); }
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

function CardDeck({ visible, s, setS, gainXp, onBack }) {
  const [cfg, setCfg] = useState({ S: "Burpee", H: "Push-up", D: "Air Squat", C: "Sit-up", faces: "ten", aces: 11, jokers: false, jokerReps: 20, jokerEx: "Burpee" });
  const [deck, setDeck] = useState(() => freshDeck(false));
  const [current, setCurrent] = useState(null);
  const [log, setLog] = useState([]);
  const [flip, setFlip] = useState(0);
  const [sessionId, setSessionId] = useState(uid);
  const all = allExercises(s).filter((e) => e.type !== "timed");

  const repsFor = (card) => {
    if (card.suit === "J") return cfg.jokerReps;
    if (card.rank === 1) return cfg.aces;
    if (card.rank > 10) return cfg.faces === "ten" ? 10 : card.rank;
    return card.rank;
  };
  const exFor = (card) => (card.suit === "J" ? cfg.jokerEx : cfg[card.suit]);
  const xpFor = (card) => workoutXp(s, [{ name: exFor(card), sets: [{ w: "", r: repsFor(card) }] }], null).xp;

  const draw = () => {
    if (!deck.length || current) return;
    const [card, ...rest] = deck;
    setDeck(rest); setCurrent(card); setFlip((f) => f + 1);
  };

  const complete = () => {
    if (!current) return;
    const name = exFor(current), reps = repsFor(current);
    const { xp, prs } = workoutXp(s, [{ name, sets: [{ w: "", r: reps }] }], computeBests(s));
    const lastCard = deck.length === 0;
    const bonus = lastCard ? 150 : 0;
    setS((p) => addDeckSet(p, sessionId, name, reps, xp + bonus));
    gainXp(xp + bonus, lastCard ? "Full deck cleared!" : prs ? `New ${name} PR` : `${reps} ${name}`);
    setLog((l) => [...l, { card: current, name, reps, xp: xp + bonus, done: true }]);
    setCurrent(null);
  };

  const skip = () => {
    if (!current) return;
    setLog((l) => [...l, { card: current, name: exFor(current), reps: repsFor(current), xp: 0, done: false }]);
    setCurrent(null);
  };

  const reshuffle = () => { setDeck(freshDeck(cfg.jokers)); setCurrent(null); setLog([]); setSessionId(uid()); };

  if (!visible) return null;
  const finished = !deck.length && !current;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext flex-1">Deck of cards</h1>
        <span className="body text-sm" style={{ color: C.dim }}>{deck.length + (current ? 1 : 0)} left</span>
      </div>

      <div className="flex justify-center">
        {current ? (
          <div key={flip} className="panel p-6 text-center" style={{ width: 220, borderColor: C.cyan }}>
            <div className="text-5xl font-extrabold">{current.face}</div>
            <div className="text-2xl mt-2">{current.suit}</div>
            <div className="text-xl font-bold mt-4" style={{ color: C.cyan }}>{exFor(current)}</div>
            <div className="text-2xl font-extrabold mt-1">{repsFor(current)} reps</div>
            <div className="mt-4 flex gap-2">
              <button onClick={complete} className="btn flex-1 py-2 text-sm font-bold">Done</button>
              <button onClick={skip} className="ghost px-3 py-2 text-sm">Skip</button>
            </div>
          </div>
        ) : (
          <button onClick={finished ? reshuffle : draw} className="btn py-4 px-8 text-lg font-bold">
            {finished ? "Reshuffle Deck" : "Draw Card"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Profiles & Look Helpers ---------- */
const PROFILE_BGS = [
  { id: "none", name: "Default", css: null },
  { id: "sunset", name: "Sunset", css: "linear-gradient(135deg,#ff6a3d 0%,#ff3c8e 50%,#7b2ff7 100%)" },
  { id: "ocean", name: "Ocean", css: "linear-gradient(135deg,#00c6ff,#0072ff 60%,#001a4d)" },
  { id: "ember", name: "Ember", css: "radial-gradient(circle at 30% 20%,#ffb347,#ff2a2a 45%,#2a0000)" },
  { id: "aurora", name: "Aurora", css: "linear-gradient(135deg,#00ffa3,#00c2ff 45%,#6a00ff)" },
  { id: "galaxy", name: "Galaxy", css: "radial-gradient(circle at 70% 30%,#8a2be2,#1a0533 50%,#000)" },
  { id: "gold", name: "Gold", css: "linear-gradient(135deg,#f9d976,#c79a1a 50%,#5a3a00)" },
  { id: "carbon", name: "Carbon", css: "repeating-linear-gradient(45deg,#151515 0 6px,#2a2a2a 6px 12px)" },
  { id: "toxic", name: "Toxic", css: "linear-gradient(135deg,#a8ff78,#39ff14 50%,#004d00)" },
  { id: "rainbow", name: "Rainbow", css: "linear-gradient(90deg,#ff3cac,#ffb43c,#f7ff3c,#3cff9e,#3cc8ff,#9b5cff)" },
];
function lookStyle(look, strength = 0.55) {
  const bg = PROFILE_BGS.find((b) => b.id === look?.bg);
  const st = {};
  if (bg?.css) { st.background = `linear-gradient(rgba(0,0,0,${strength}),rgba(0,0,0,${strength + 0.15})), ${bg.css}`; st.backgroundSize = "cover"; }
  if (look?.accent) st.borderColor = look.accent;
  return Object.keys(st).length ? st : null;
}
function shrinkPhoto(file, max = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.62));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function makeClip(file, seconds = 20, rate = 11025) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("no audio");
  const ctx = new AC();
  const buf = await file.arrayBuffer();
  const decoded = await new Promise((res, rej) => { try { const r = ctx.decodeAudioData(buf, res, rej); if (r?.then) r.then(res, rej); } catch (e) { rej(e); } });
  const n = Math.min(decoded.length, Math.floor(seconds * decoded.sampleRate));
  const chans = decoded.numberOfChannels, data = Array.from({ length: chans }, (_, c) => decoded.getChannelData(c));
  const step = decoded.sampleRate / rate, outLen = Math.floor(n / step);
  const tmp = new Float32Array(outLen);
  let peak = 0;
  for (let i = 0; i < outLen; i++) {
    const a = Math.floor(i * step), b = Math.min(n, Math.max(a + 1, Math.floor((i + 1) * step)));
    let sum = 0, cnt = 0;
    for (let j = a; j < b; j++) for (let c = 0; c < chans; c++) { sum += data[c][j]; cnt++; }
    tmp[i] = cnt ? sum / cnt : 0; peak = Math.max(peak, Math.abs(tmp[i]));
  }
  const g = peak > 0 ? 0.95 / peak : 1;
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) { let v = tmp[i] * g; const rem = outLen - i; if (rem < rate) v *= rem / rate; if (i < rate / 4) v *= i / (rate / 4); pcm[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767))); }
  const bytes = new Uint8Array(44 + outLen * 2), dv = new DataView(bytes.buffer);
  const wstr = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
  wstr(0, "RIFF"); dv.setUint32(4, 36 + outLen * 2, true); wstr(8, "WAVE"); wstr(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); wstr(36, "data"); dv.setUint32(40, outLen * 2, true);
  bytes.set(new Uint8Array(pcm.buffer), 44);
  try { ctx.close?.(); } catch (e) {}
  return "data:audio/wav;base64," + b64(bytes);
}
const b64 = (bytes) => { let bin = ""; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(bin); };
const b64url = (bytes) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (t) => { const s = t.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(s + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0)); };
const songLinkLabel = (url) => (/youtu\.?be/i.test(url) ? "YouTube" : /spotify/i.test(url) ? "Spotify" : /apple/i.test(url) ? "Apple Music" : /soundcloud/i.test(url) ? "SoundCloud" : "Link");

function Avatar({ src, name, size = 48, ring }) {
  const color = ring || C.cyan;
  return src ? (
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", border: `2px solid ${color}`, boxShadow: `0 0 12px ${C.glow}`, flexShrink: 0 }} />
  ) : (
    <div className="flex items-center justify-center font-extrabold shrink-0" style={{ width: size, height: size, borderRadius: 999, background: C.accentBg, color, border: `2px solid ${color}`, fontSize: size * 0.42 }}>{((name || "?").trim()[0] || "?").toUpperCase()}</div>
  );
}

function shrinkImage(file, size = 112) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        const m = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function AchBadge({ a, earned, size = 60, onClick }) {
  const t = TIER_STYLE[a.tier];
  const Icon = ACH_ICONS[a.series.icon] || Award;
  const mythic = a.tier === 5;
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1" style={{ width: size + 16 }} aria-label={`${a.title}: ${a.desc}${earned ? ", earned" : ", locked"}`}>
      <div className="flex items-center justify-center relative" style={{ width: size, height: size, borderRadius: a.tier >= 4 ? 12 : 999,
        background: earned ? (mythic ? RAINBOW : `radial-gradient(circle at 35% 30%, ${t.color}, ${C.bg} 85%)`) : C.soft,
        border: `2px solid ${earned ? t.color : C.border}`, boxShadow: earned ? `0 0 ${8 + a.tier * 5}px ${t.glow}` : "none", opacity: earned ? 1 : 0.45 }}>
        <div style={{ color: earned ? (a.tier === 2 ? "#0B1220" : mythic ? "#fff" : "#0B1220") : C.mute }}>
          {earned ? <Icon size={size * 0.45} strokeWidth={2.2} /> : <Lock size={size * 0.38} />}
        </div>
      </div>
      <div className="text-xs font-bold text-center leading-tight" style={{ color: earned ? t.color : C.mute }}>{a.title}</div>
    </button>
  );
}

function WeightChart({ log, target }) {
  const pts = Object.entries(log || {}).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-60).map(([d, w]) => ({ d, w: +w })).filter((p) => p.w > 0);
  if (pts.length < 2) return <div className="body text-sm" style={{ color: C.dim }}>Log your weight on at least two days to see a trend line.</div>;
  const W = 320, H = 130, padL = 34, padR = 10, padT = 12, padB = 22;
  const ws = pts.map((p) => p.w), lo = Math.floor(Math.min(...ws) - 2), hi = Math.ceil(Math.max(...ws) + 2);
  const x = (i) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (w) => padT + (1 - (w - lo) / (hi - lo)) * (H - padT - padB);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join(" ");
  const first = pts[0], last = pts[pts.length - 1];
  const diff = Math.round((last.w - first.w) * 10) / 10;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Weight from ${first.w} to ${last.w} lb`}>
        {[lo, (lo + hi) / 2, hi].map((v) => <g key={v}><line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={C.line} strokeDasharray="3 4" /><text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill={C.dim}>{Math.round(v)}</text></g>)}
        <path d={`${path} L${x(pts.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`} fill={C.cyan} opacity=".12" />
        <path d={path} fill="none" stroke={C.cyan} strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={p.d} cx={x(i)} cy={y(p.w)} r="3" fill={C.bg} stroke={C.cyan} strokeWidth="2" />)}
      </svg>
      <div className="body text-xs flex justify-between" style={{ color: C.dim }}>
        <span>{pts.length} entries</span>
        <span style={{ color: diff === 0 ? C.dim : (target === "cut" ? diff < 0 : diff > 0) ? C.green : C.orange }}>{diff > 0 ? "+" : ""}{diff} lb</span>
      </div>
    </div>
  );
}

function profileCard(s) {
  const ws = weekStart();
  const st = lifetimeStats(s);
  const wl = Object.entries(s.weightLog || {}).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-40);
  return {
    id: s.playerId, name: s.profile.name, avatar: s.profile.avatar || null, goal: s.profile.goal, look: s.profile.look || null, song: s.profile.song || null,
    title: (TITLES.find((t) => t.id === s.profile.title && t.req(s)) || null)?.name || null,
    weekXp: Object.entries(s.xpLog || {}).filter(([d]) => d >= ws).reduce((a, [, v]) => a + v, 0),
    prevWeek: (() => { const pw = shift(ws, -7); return { key: pw, xp: Object.entries(s.xpLog || {}).filter(([d]) => d >= pw && d < ws).reduce((a, [, v]) => a + v, 0) }; })(),
    atGym: s.atGym && Date.now() - s.atGym < 3 * 3600 * 1000 ? s.atGym : null,
    xp: s.xp, points: pointsOf(s), lvl: levelFromXp(s.xp).lvl, rank: overallRank(s).id, div: overallInfo(s).div,
    streak: streakOf(s), week: s.workouts.filter((w) => w.date >= ws && w.source !== "quest").length, weekOf: ws, updated: Date.now(),
    ach: Object.keys(s.ach || {}), stats: st, weightLog: Object.fromEntries(wl),
    month: { key: monthKey(), xp: Object.entries(s.xpLog || {}).filter(([d]) => d.startsWith(monthKey())).reduce((a, [, v]) => a + v, 0), workouts: s.workouts.filter((w) => w.date.startsWith(monthKey()) && w.source !== "quest").length },
    groups: groupScores(s),
    lifts: rankedLifts(s).sort((a, b) => b.score - a.score).slice(0, 6).map((r) => ({ name: r.e.name, label: r.label, rank: r.rank.id, best: Math.round(r.best), bw: r.e.type === "bodyweight" })),
  };
}

function ProfilePage({ s, setS, targetId, onBack, gainXp }) {
  const me = !targetId || targetId === s.playerId;
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(!me);
  const [social, setSocial] = useState({ fives: [], comments: [] });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const fileRef = useRef(null);
  const id = me ? s.playerId : targetId;
  const data = me ? profileCard(s) : card;

  useEffect(() => {
    (async () => {
      if (!me) {
        try { const r = await window.storage.get(`lb:${targetId}`, true); setCard(r?.value ? JSON.parse(r.value) : null); } catch { setCard(null); }
        setLoading(false);
      }
    })();
  }, [targetId]);

  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const src = await shrinkImage(f); setS((p) => ({ ...p, profile: { ...p.profile, avatar: src } })); }
    catch { setNote("Couldn't read photo."); }
    e.target.value = "";
  };

  const rank = data ? RANKS.find((r) => r.id === data.rank) || RANKS[0] : RANKS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">{me ? "Your profile" : "Profile"}</h1>
      </div>

      {loading && <div className="body text-sm" style={{ color: C.dim }}>Loading...</div>}
      {data && (
        <div className="panel p-5" style={lookStyle(data.look)}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={data.avatar} name={data.name} size={76} ring={data.look?.accent || rank.color} />
              {me && (
                <>
                  <button aria-label="Change photo" onClick={() => fileRef.current?.click()} className="absolute flex items-center justify-center" style={{ right: -4, bottom: -4, width: 28, height: 28, borderRadius: 999, background: C.cyan, color: "#001018" }}><Camera size={15} /></button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold truncate"><FancyName name={data.name} look={data.look} className="glowtext" /></div>
              <div className="body text-sm" style={{ color: rank.color }}>{data.rank} · Level {data.lvl}</div>
              <div className="body text-xs mt-0.5" style={{ color: C.dim }}>{(data.points || 0).toLocaleString()} pts · {data.streak} day streak</div>
            </div>
          </div>
          {!me && (
            <button onClick={() => reportItem(`profile:${id}`)} className="ghost mt-3 text-xs py-1 px-2" style={{ color: C.red, borderColor: C.border }}>Report User</button>
          )}
        </div>
      )}
    </div>
  );
}

const NAME_FONTS = [
  { id: "default", name: "Ascend", family: "'Oxanium', sans-serif" },
  { id: "orbitron", name: "Orbitron", family: "'Orbitron', sans-serif" },
  { id: "bangers", name: "Comic", family: "'Bangers', cursive" },
  { id: "cinzel", name: "Royal", family: "'Cinzel', serif" },
];
const NAME_ANIMS = [{ id: "none", name: "None" }, { id: "pulse", name: "Pulse" }, { id: "rainbow", name: "Rainbow" }];

function FancyName({ name, look, className = "", style = {} }) {
  const font = NAME_FONTS.find((f) => f.id === look?.font) || NAME_FONTS[0];
  const color = look?.accent || style.color;
  return <span className={className} style={{ ...style, fontFamily: font.family, color: color || C.cyan }}>{name || "Unnamed"}</span>;
}

function RankBadge({ rank, size = 44, still = false }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: rank.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#000", boxShadow: `0 0 10px ${rank.glow}` }}>
      {rank.id}
    </div>
  );
}

const TITLES = [
  { id: "rookie", name: "Rookie", req: () => true, how: "Start here" },
  { id: "regular", name: "Regular", req: (s) => (s.workouts || []).length >= 5, how: "5 workouts" },
  { id: "elite", name: "Elite", req: (s) => overallInfo(s).score >= 5, how: "Reach S overall" },
];
function suggestNext() { return null; }
function stalledLifts() { return []; }
function daysSinceTraining() { return null; }
function Nudges() { return null; }
function WeeklyReport() { return null; }
function RestBubble({ onDone, onClose }) { return <button onClick={onClose} className="fixed z-40 px-4 py-2 font-bold" style={{ left: 16, bottom: 90, borderRadius: 999, background: C.sheet, color: C.cyan }}>Rest Timer</button>; }
function PlateSheet({ onClose }) { return <Sheet title="Plates" onClose={onClose}><div className="p-4">Plate Calculator</div></Sheet>; }
function ExercisePage({ name, onBack }) { return <div className="space-y-4"><button onClick={onBack} className="p-1"><ChevronLeft /></button><h1 className="text-2xl font-bold">{name}</h1></div>; }
function MusclePage({ group, onBack }) { return <div className="space-y-4"><button onClick={onBack} className="p-1"><ChevronLeft /></button><h1 className="text-2xl font-bold">{group}</h1></div>; }
function Dashboard({ goTrain }) { return <div className="panel p-3"><button onClick={goTrain} className="btn w-full py-2">Train Now</button></div>; }
function MogInbox() { return null; }
function WaterTracker() { return null; }
function DayTemplates() { return null; }
function NutritionReport() { return null; }
function FuelCoach() { return null; }
function TrainCoach() { return null; }
function TitlePicker({ onPick, onBack }) { return <div className="space-y-4"><button onClick={onBack} className="p-1"><ChevronLeft /></button><button onClick={() => onPick("Workout")} className="btn w-full py-3">Start</button></div>; }
function Challenges() { return null; }
function PhotoScan() { return null; }
function SongPlayer() { return null; }
function Ceremony({ onClose }) { return <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,.8)" }}><div className="text-2xl font-bold">Rank Up!</div></div>; }
function MealBuilder({ onBack }) { return <div className="p-4"><button onClick={onBack}><ChevronLeft /></button></div>; }
function MogSection() { return null; }
function ProgressPhotos() { return null; }
function Measurements() { return null; }
/* ---------- Feed, Crews & Helper Exports ---------- */
function postFeed(s, type, text, extra = {}, eventId = null) {
  if (!s.lb || !s.profile.name) return;
  const key = eventId ? `feed:${s.playerId}_${eventId}` : `feed:${Date.now()}_${s.playerId}`;
  publishShared(key, { type, text, name: s.profile.name, from: s.playerId, look: s.profile.look || null, t: Date.now(), ...extra });
}

async function readShared(prefix) {
  if (!window.storage?.list) return [];
  try {
    const res = await window.storage.list(prefix, true);
    const items = await Promise.all((res?.keys || []).map(async (k) => {
      try {
        const r = await window.storage.get(k, true);
        return r?.value ? { key: k, ...JSON.parse(r.value) } : null;
      } catch {
        return null;
      }
    }));
    return items.filter(Boolean);
  } catch {
    return [];
  }
}

function Feed({ s, openProfile }) {
  const [items, setItems] = useState(null);

  const load = async () => {
    const all = (await readShared("feed:")).sort((a, b) => (b.t || 0) - (a.t || 0));
    setItems(all.slice(0, 40));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-2">
      {items === null && <div className="body text-sm" style={{ color: C.dim }}>Loading feed…</div>}
      {items?.length === 0 && <Empty>Nothing yet. Workouts and rank updates will appear here.</Empty>}
      {items?.map((it) => (
        <div key={it.key} className="panel p-3 flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <button onClick={() => openProfile(it.from)} className="font-bold text-sm truncate block">
              <FancyName name={it.name} look={it.look} />
            </button>
            <div className="body text-sm mt-0.5" style={{ color: C.text }}>{it.text}</div>
            {it.detail && <div className="body text-xs mt-0.5" style={{ color: C.dim }}>{it.detail}</div>}
          </div>
          <button onClick={() => reportItem(it.key)} className="ghost text-xs px-2 py-1" style={{ color: C.red, borderColor: C.border }}>
            Report
          </button>
        </div>
      ))}
    </div>
  );
}

const CREW_PER_PLAYER = 12, CREW_XP = 500, DUEL_XP = 100;

function Crew({ s, setS, gainXp, rows, openProfile, activeCrewId, setActiveCrewId }) {
  const mk = monthKey(), ws = weekStart();
  const players = rows.length || 1;
  const goal = CREW_PER_PLAYER * players;
  const done = rows.reduce((a, r) => a + (r.month?.key === mk ? r.month.workouts || 0 : 0), 0);
  const claimed = s.groupClaimed?.[mk];
  const monthName = new Date(`${mk}-01T12:00`).toLocaleDateString(undefined, { month: "long" });

  const [duels, setDuels] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [crews, setCrews] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const loadCrews = async () => {
    const { data } = await supabase
      .from("crew_members")
      .select("crew_id, crews(id, name)")
      .eq("user_id", s.playerId);
    if (data) setCrews(data.map((d) => d.crews).filter(Boolean));
  };

  useEffect(() => {
    readShared("duel:").then((d) =>
      setDuels(d.filter((x) => x.from === s.playerId || x.to === s.playerId).sort((a, b) => (b.t || 0) - (a.t || 0)))
    );
    loadCrews();
  }, []);

  const joinCrew = async () => {
    if (!inviteCode.trim()) return;
    setBusy(true);
    setMsg("");
    const { data: crewMatch } = await supabase
      .from("crews")
      .select("id, name")
      .eq("invite_code", inviteCode.trim())
      .single();

    if (!crewMatch) {
      setMsg("Invalid invite code.");
    } else {
      const { error } = await supabase
        .from("crew_members")
        .insert({ crew_id: crewMatch.id, user_id: s.playerId });
      if (error) setMsg("You are already in this crew.");
      else {
        setMsg(`Joined ${crewMatch.name}!`);
        setInviteCode("");
        loadCrews();
      }
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="panel p-4 space-y-3">
        <div className="font-bold flex items-center gap-2">
          <Users size={18} style={{ color: C.cyan }} />Your Crews
        </div>
        {crews.length === 0 ? (
          <div className="body text-sm" style={{ color: C.dim }}>
            You aren't in any crews yet. Enter an invite code below to join one.
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCrewId(null)}
              className="px-3 py-2 text-sm font-bold"
              style={{
                borderRadius: 4,
                background: activeCrewId === null ? C.blue : C.soft,
                color: activeCrewId === null ? "#fff" : C.text,
                border: `1px solid ${C.border}`,
              }}
            >
              Global Board
            </button>
            {crews.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCrewId(c.id)}
                className="px-3 py-2 text-sm font-bold"
                style={{
                  borderRadius: 4,
                  background: activeCrewId === c.id ? C.blue : C.soft,
                  color: activeCrewId === c.id ? "#fff" : C.text,
                  border: `1px solid ${C.border}`,
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        <div className="neonline my-3" />
        <div className="font-bold text-sm">Join a Crew</div>
        <div className="flex gap-2">
          <input
            className="inp text-sm"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <button
            onClick={joinCrew}
            disabled={busy || !inviteCode.trim()}
            className="btn px-4 text-sm"
          >
            {busy ? "Joining..." : "Join"}
          </button>
        </div>
        {msg && (
          <div
            className="body text-xs"
            style={{
              color: msg.includes("Invalid") || msg.includes("already") ? C.orange : C.green,
            }}
          >
            {msg}
          </div>
        )}
      </div>

      <div className="panel p-4 space-y-2">
        <div className="flex justify-between items-start">
          <div className="font-bold flex items-center gap-2">
            <Users size={18} style={{ color: C.cyan }} />Crew goal: {goal} workouts in {monthName}
          </div>
          <span className="text-sm font-bold" style={{ color: C.gold }}>
            +{CREW_XP} XP each
          </span>
        </div>
        <div className="body text-xs" style={{ color: C.dim }}>
          {CREW_PER_PLAYER} per person across {players} player{players === 1 ? "" : "s"} on the board.
        </div>
        <Bar pct={(done / goal) * 100} color={C.cyan} />
        <div className="flex justify-between text-sm">
          <span className="font-semibold">{done} / {goal}</span>
          {claimed ? (
            <span style={{ color: C.green }}>Claimed</span>
          ) : (
            <button
              disabled={done < goal}
              onClick={() => {
                setS((p) => ({
                  ...p,
                  groupClaimed: { ...(p.groupClaimed || {}), [mk]: true },
                }));
                gainXp(CREW_XP, "Crew goal");
              }}
              className="px-3 py-1 font-bold text-sm"
              style={{
                borderRadius: 4,
                background: done >= goal ? C.gold : C.soft,
                color: done >= goal ? "#0A1630" : C.mute,
              }}
            >
              Claim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SharePreset() { return null; }
function SharedPresets() { return null; }
function PlanGenerator() { return null; }
function exportWorkouts() {}
function exportFood() {}
function VersusPanel() { return null; }
function QuestAdd({ unit, onAdd }) {
  const [v, setV] = useState("");
  const go = () => {
    const n = +v;
    if (n > 0) {
      onAdd(n);
      setV("");
    }
  };
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        inputMode="decimal"
        className="inp text-sm"
        style={{ width: 62, padding: "5px 6px" }}
        placeholder={unit}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
      />
      <button onClick={go} disabled={!(+v > 0)} className="btn px-2.5 py-1.5 text-sm">Add</button>
    </div>
  );
}
