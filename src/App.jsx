import React, { useState, useEffect, useMemo, useRef } from "react";
import { Users, TrendingUp, MapPin, Droplets, Ruler, Video, Link2, CircleDot, Download, Youtube, ChefHat, Music, Image as ImageIcon, Share2, Footprints, Weight, Repeat, CalendarCheck, Activity, Zap, Star, Pencil, Camera, Hand, MessageCircle, Type, Award, Lock, Sparkle, Bookmark, Store, Globe, SkipForward, Timer as TimerIcon, Layers, Play, Pause, RotateCcw, Minus, Shield, Settings as Gear, Bot, Mic, Send, Volume2, VolumeX, Copy, Moon, Sun, Palette, Save, Upload, Dumbbell, Swords, Utensils, User, Plus, X, Check, Flame, Sparkles, Trash2, Loader2, ChevronDown, ChevronLeft, ChevronRight, Trophy, RefreshCw, CalendarDays, Crown } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";

/* ---------- Theme ---------- */
const THEMES = {
  dark: {
    bg: "#000000", text: "#F2F8FF", dim: "#A3B6CF", mute: "#71869F", sub: "#CFDCEE",
    blue: "#0A84FF", cyan: "#00D9FF", soft: "#03080F", line: "rgba(0,217,255,.26)", border: "#10283F",
    track: "#081530", sheet: "#040A1C", accentBg: "#0C2350", navBg: "rgba(0,0,0,.96)", badgeBg: "rgba(2,6,16,.8)",
    inpBg: "#000000", panelTop: "rgba(0,34,70,.42)", panelBot: "rgba(0,0,0,.94)", glow: "rgba(0,217,255,.75)",
    grid: "rgba(0,217,255,.028)", halo: "rgba(40,110,255,.20)", glass: "rgba(255,255,255,.045)", glassLine: "rgba(255,255,255,.09)",
    gold: "#FFD447", green: "#39E68F", orange: "#FF9340", red: "#FF4D6D",
  },
  light: {
    bg: "#EEF4FA", text: "#07162A", dim: "#3F5873", mute: "#6F849C", sub: "#2A4461",
    blue: "#0070F0", cyan: "#0088CC", soft: "#FFFFFF", line: "rgba(0,120,210,.28)", border: "#C9D9EA",
    track: "#D6E3F0", sheet: "#FFFFFF", accentBg: "#DDEEFF", navBg: "rgba(255,255,255,.96)", badgeBg: "rgba(255,255,255,.92)",
    inpBg: "#FFFFFF", panelTop: "rgba(255,255,255,.97)", panelBot: "rgba(230,240,250,.97)", glow: "rgba(0,136,204,.3)",
    grid: "rgba(0,120,210,.06)", halo: "rgba(0,144,255,.18)", glass: "rgba(255,255,255,.72)", glassLine: "rgba(10,30,60,.08)",
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
// Bench-equivalent strength multiples for D, C, B, A, S at the reference lifter (180 lb, 5'10", male).
// S (1.95) is elite territory: about a 350 lb bench for a 180 lb lifter.
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
// Minimum strength factor per group so custom lifts (especially machines) can't be rated too easy
const FACTOR_FLOOR = { Chest: 0.35, Back: 0.4, Legs: 0.5, Shoulders: 0.25, Arms: 0.3, Core: 1.3 };
// Some muscle groups are held to a stricter standard for rank
const GROUP_HARD = { Shoulders: 1.25, Arms: 1.1 };
// How much each muscle group counts toward overall rank; groups you haven't trained count as zero
const GROUP_WEIGHT = { Legs: 3, Back: 3, Chest: 3, Shoulders: 2, Arms: 1, Core: 1 };

const GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];
// type: weighted (lb x reps, ranked vs bodyweight) | bodyweight (reps, ranked by reps) | timed (minutes, no rank)
// xp: XP per set (weighted/bodyweight) or per minute (timed)
// perHand: weight is entered per hand (dumbbells, single-arm cables). The factor is for the weight as entered.
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
  { name: "Assisted Dip Machine", group: "Chest", type: "assisted", rankAs: "Dip", xp: 9 },
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
  { name: "Assisted Pull-up Machine", group: "Back", type: "assisted", rankAs: "Pull-up", xp: 10 },
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
// Which quests are the same as a logged exercise (quest progress and workout sets feed each other)
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

// Restaurant menu items from published nutrition info (checked September 2026). Menus change, so use "Look up online" for anything missing.
const RESTAURANT_FOODS = [
  // P. Terry's official nutrition sheet (rev. 3/7/2024)
  ...[
    ["Hamburger", 394, 22, 27, 19.5], ["Hamburger lettuce wrap", 255, 19, 9, 16.5], ["Cheeseburger", 464, 26, 28, 25.5], ["Cheeseburger lettuce wrap", 370, 23, 10, 22],
    ["Double cheeseburger", 743, 51, 29, 45], ["Double cheeseburger lettuce wrap", 588, 48, 11, 41], ["Grilled chicken burger", 406, 31, 27, 15], ["Grilled chicken burger lettuce wrap", 236, 27, 1, 12],
    ["Crispy chicken burger", 606, 34, 44, 29], ["Spicy crispy chicken burger", 621, 34, 44, 29], ["Crispy chicken bites (8 pc)", 300, 42, 13, 13], ["Veggie burger", 403, 12, 46, 19],
    ["Egg burger w/ cheese", 280, 13, 28, 12.5], ["Egg burger w/ cheese & bacon", 385, 17.5, 28, 21.5], ["Egg burger w/ cheese & sausage", 450, 20, 28, 28.5], ["French fries", 386, 5, 50, 18],
    ["Oatmeal chocolate chip cookie", 241, 4, 27, 13], ["Banana bread", 192, 4.5, 45, 1.7], ["Vanilla shake (small)", 555, 16, 91, 14], ["Chocolate shake (small)", 722, 16, 136, 14], ["Oreo shake (small)", 577, 16, 93, 16],
  ].map(([n, cal, p, c, f]) => ({ r: "P. Terry's", name: `P. Terry's ${n}`, cal, p, c, f })),
  // Torchy's Tacos 2026 nutritional evaluations
  ...[
    ["Trailer Park", 298, 17, 22, 15], ["Trailer Park (trashy)", 355, 19, 23, 20], ["Chicken Fajita", 353, 20, 20, 21], ["Brushfire", 300, 18, 25, 14], ["Tipsy Chick", 453, 22, 40, 22],
    ["Democrat", 168, 10, 20, 5], ["Crossroads", 346, 20, 18, 22], ["Steak Fajita", 449, 20, 20, 26], ["Republican", 474, 16, 35, 29], ["Green Chile Pork", 217, 11, 26, 10], ["Hogfather", 428, 20, 32, 25],
    ["Baja Shrimp", 267, 12, 24, 14], ["Grilled Baja Shrimp", 169, 9, 6, 12], ["Mr. Orange", 207, 14, 23, 10], ["Fresh Avocado", 249, 8, 24, 14], ["Fried Avocado", 269, 9, 27, 14],
    ["Migas taco", 379, 17, 27, 23], ["The Wrangler", 456, 23, 24, 29], ["Ranch Hand", 451, 23, 19, 31], ["Bacon, egg & cheese taco", 383, 21, 17, 25], ["Potato, egg & cheese taco", 384, 18, 25, 22], ["Chorizo, egg & cheese taco", 388, 19, 19, 26],
    ["Breakfast burrito", 1139, 49, 100, 62], ["Big Tipsy Bowl (fajita chicken)", 990, 39, 111, 43], ["Big Tipsy Bowl (fried chicken)", 999, 44, 116, 39], ["Bonfire bowl (jerk chicken)", 771, 33, 94, 23], ["Bonfire bowl (salmon)", 762, 39, 98, 24],
    ["Outlaw Bowl (fajita chicken)", 786, 29, 109, 26], ["Outlaw Bowl (fried chicken)", 794, 35, 113, 22], ["Grande burrito", 797, 23, 96, 35], ["Green chile queso & chips", 643, 21, 32, 46], ["Guacamole & chips", 423, 6, 23, 33],
    ["Street corn", 383, 8, 48, 22], ["Damn Good Tots", 680, 19, 44, 42], ["Refried pinto beans", 198, 12, 35, 1], ["Black beans", 162, 9, 31, 1], ["Mexican rice", 241, 5, 48, 3], ["Trailer Park (hillbilly style)", 560, 31, 24, 36],
  ].map(([n, cal, p, c, f]) => ({ r: "Torchy's", name: `Torchy's ${n}`, cal, p, c, f })),
  // Chipotle official nutrition facts (March 2025)
  ...[
    ["chicken (4 oz)", 180, 32, 0, 7], ["steak (4 oz)", 150, 21, 1, 6], ["barbacoa (4 oz)", 170, 24, 2, 7], ["carnitas (4 oz)", 210, 23, 0, 12], ["sofritas (4 oz)", 150, 8, 9, 10],
    ["white rice (4 oz)", 210, 4, 40, 4], ["brown rice (4 oz)", 210, 4, 36, 6], ["black beans (4 oz)", 130, 8, 22, 1.5], ["pinto beans (4 oz)", 130, 8, 21, 1.5], ["fajita veggies", 20, 0, 5, 0],
    ["burrito tortilla", 320, 8, 50, 9], ["taco flour tortilla", 80, 2, 13, 2.5], ["crispy corn taco shell", 70, 1, 10, 3], ["guacamole (4 oz)", 230, 2, 8, 22],
  ].map(([n, cal, p, c, f]) => ({ r: "Chipotle", name: `Chipotle ${n}`, cal, p, c, f })),
  { r: "Chick-fil-A", name: "Chick-fil-A grilled nuggets (8 ct)", cal: 130, p: 25, c: 1, f: 3 },
  // Raising Cane's: calories published; macro split estimated from published calorie breakdown
  { r: "Raising Cane's", name: "Raising Cane's chicken finger (1)", cal: 130, p: 12, c: 5, f: 7, approx: true },
  { r: "Raising Cane's", name: "Raising Cane's Cane's Sauce (1 cup)", cal: 190, p: 0, c: 4, f: 19, approx: true },
  { r: "Raising Cane's", name: "Raising Cane's crinkle-cut fries", cal: 400, p: 5, c: 52, f: 18, approx: true },
  { r: "Raising Cane's", name: "Raising Cane's Texas toast", cal: 150, p: 4, c: 18, f: 7, approx: true },
  // Whataburger: third-party compiled figures, may differ from store
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
// In-app confirm dialog (window.confirm is blocked in published apps)
const AskRef = { current: (msg, fn) => fn() };
const ask = (message, onYes, yesLabel) => AskRef.current(message, onYes, yesLabel);
// Add a finished workout and push its reps into matching daily quests
function fillQuests(p, d, exercises) {
  const day = p.days?.[d] || newDay();
  const list = day.list.map((q) => {
    if (q.qid === "run" && !q.claimed) {
      const mi = exercises.filter((e) => /^(Running|Walking|Incline Walk)$/.test(e.name)).reduce((a, e) => a + e.sets.reduce((b, st) => b + (+st.w || 0), 0), 0);
      return mi ? { ...q, progress: Math.round((q.progress + mi) * 100) / 100, fromWorkout: Math.round(((q.fromWorkout || 0) + mi) * 100) / 100 } : q;
    }
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
// Add one completed card to today's deck session workout (creates it on the first card)
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

// Strength scale in lb for this person. Heavier lifters need more (but not linearly, since strength
// grows slower than bodyweight), and taller frames need more because a jacked physique at that height carries more muscle.
function strengthScale(p) {
  const bw = Math.max(80, +p.weight || 170), h = Math.max(48, +p.height || 70) * 0.0254;
  const frameLb = 24 * h * h * 2.2046; // bodyweight of a very muscular build at this height
  const mass = 0.65 * bw + 0.35 * frameLb;
  return 180 * Math.pow(mass / 180, 0.67) * (p.sex === "f" ? 0.65 : 1);
}
function thresholds(ex, p) {
  if (ex.type === "assisted") return REP_STEPS.map((r) => Math.round(r * (p.sex === "f" ? 0.6 : 1)));
  if (ex.type === "bodyweight") return REP_STEPS.map((r) => Math.round(r * (ex.reps || 1) * (p.sex === "f" ? 0.6 : 1)));
  const sc = strengthScale(p);
  const hard = GROUP_HARD[ex.group] || 1;
  return RATIO_STEPS.map((r) => Math.round((r * ex.factor * sc * hard) / 5) * 5);
}
// Score from 0 to 6: E is 0–1, D 1–2 ... S 5–6 (S I is 15% past the S line)
// Score 0–7: E 0–1 … S 5–6, and a hidden SS tier 6–7. S I ends 35% past the S line; SS caps at 75% past it.
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

// Weight as the exercise's factor expects it: per hand for dumbbell-style moves, total for bars and machines
function effW(def, ex, w) {
  const userHand = ex?.wMode ? ex.wMode === "hand" : !!def.perHand;
  if (userHand === !!def.perHand) return w;
  return def.perHand ? w / 2 : w * 2;
}
// Assisted machines: the weight entered is the help you got. What you actually moved is bodyweight minus that.
const movedLb = (p, assist) => Math.max(0, Math.max(80, +p.weight || 170) - (+assist || 0));
const assistedReps = (p, st) => (+st.r || 0) * (movedLb(p, st.w) / Math.max(80, +p.weight || 170));
function bestValue(def, st, p, ex) {
  if (def.type === "assisted") return assistedReps(p, st);
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
      const k = def.type === "assisted" ? def.rankAs : ex.name;
      if (v > (b[k] || 0)) b[k] = v;
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
// Leaderboard points: all workout XP + points for the rank of every lift
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

// XP for one set: effort (how much work relative to your personal S-rank line) × difficulty (which rank the set lands in)
function setXp(s, def, st, ex) {
  if (def.type === "assisted") {
    const base = findEx(s, def.rankAs), eq = assistedReps(s.profile, st);
    const out = setXp(s, { ...base, xp: def.xp }, { r: eq, w: 0 }, ex);
    return { ...out, note: `${Math.round(movedLb(s.profile, st.w))} lb moved · ${out.note}` };
  }
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
      const label = def.type === "timed" ? `${st.w ? `${st.w} mi · ` : ""}${st.r} min` : def.type === "assisted" ? `${st.r} reps, ${+st.w || 0} lb assist` : st.w ? `${st.w}×${st.r}` : `${st.r} reps`;
      let pr = false;
      if (def.type !== "timed") {
        volume += (def.type === "assisted" ? movedLb(s.profile, st.w) : (+st.w || 0)) * (+st.r || 0);
        const v = bestValue(def, st, s.profile, ex);
        const k = def.type === "assisted" ? def.rankAs : ex.name;
        if (bests && v > (bests[k] || 0)) { prs++; pr = true; bests[k] = v; }
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
  { key: "steps", icon: "Footprints", title: "Wanderer", unit: "lifetime steps", steps: [100000, 500000, 1000000, 5000000, 10000000], get: (st) => st.steps || 0 },
  { key: "yogurt", icon: "Star", title: "Yogurt Male", names: ["Yogurt Male"], unit: "yogurts logged", steps: [100], tierOffset: 2, get: (st) => st.yogurt || 0 },
];
const ROMAN = ["I", "II", "III", "IV", "V"];
function allAchievements() {
  return ACH_SERIES.flatMap((series) => series.steps.map((v, i) => ({ id: `${series.key}-${i}`, series, tier: i + 1 + (series.tierOffset || 0), value: v, title: series.names ? series.names[i] : `${series.title} ${ROMAN[i]}`, desc: series.labels ? series.labels[i] : `${v.toLocaleString()} ${series.unit}`, xp: TIER_STYLE[i + 1 + (series.tierOffset || 0)].xp })));
}
function lifetimeStats(s) {
  let miles = 0, volume = 0, reps = 0, workouts = 0, pushups = 0, pullups = 0, yogurt = 0;
  Object.values(s.meals || {}).forEach((list) => (list || []).forEach((m) => {
    const q = +m.qty || 0;
    if (/yogh?urt/i.test(m.name || "")) yogurt += q;
    else if (m.ingredients) m.ingredients.forEach((it) => { if (/yogh?urt/i.test(it.name || "")) yogurt += q * (+it.qty || 1); });
  }));
  const bests = computeBests(s);
  s.workouts.forEach((w) => {
    if (w.source !== "quest") workouts++;
    w.exercises.forEach((ex) => {
      const def = findEx(s, ex.name);
      ex.sets.forEach((st) => {
        const r = +st.r || 0, wt = +st.w || 0;
        if (def.type === "timed") { if (def.group === "Cardio") miles += wt; return; }
        reps += r; volume += (def.type === "assisted" ? movedLb(s.profile, wt) : wt) * r;
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
    yogurt: Math.round(yogurt * 10) / 10, steps: Object.values(s.steps || {}).reduce((a, n) => a + (+n || 0), 0), miles: Math.round(miles * 10) / 10, volume: Math.round(volume), reps, workouts, pushups, pullups, quests, longestStreak: longest,
    bench: Math.round(bests["Bench Press"] || 0), squat: Math.round(bests["Squat"] || 0), deadlift: Math.round(bests["Deadlift"] || 0),
    rankTier, level: levelFromXp(s.xp).lvl, since: s.workouts[0]?.date || null,
  };
}
// Drop achievements that no longer hold up (e.g. ranks earned under the old, easier scale) and take back their XP
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

// Custom RGB theme: derive every color from three picks
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
    glass: light ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.05)", glassLine: light ? "rgba(10,30,60,.08)" : rgbaOf(cy, 0.14), line: rgbaOf(cy, 0.3), glow: rgbaOf(cy, light ? 0.35 : 0.75), grid: rgbaOf(cy, 0.05), halo: rgbaOf(bl, light ? 0.18 : 0.3), navBg: rgbaOf(bg, 0.96), badgeBg: rgbaOf(bg, 0.85), panelTop: rgbaOf(cy, 0.12), panelBot: rgbaOf(bg, 0.94),
  };
}

const DEFAULT = {
  profile: { name: "", weight: 170, height: 70, age: 20, sex: "m", activity: 1.55, goal: "lean" },
  xp: 0, xpLog: {}, workouts: [], active: null, days: {}, meals: {}, weekly: {}, monthly: {}, rankSnap: null, rankHist: {}, steps: {}, stepXp: {}, savedRoutes: [], stepToken: null, stepTokenHash: null, loot: {}, seasonBadges: {}, nemesis: null, nemesisSeen: {}, roasts: {}, checkins: {}, atGym: null, water: {}, dayTemplates: [], measure: {}, groupClaimed: {}, duelClaimed: {}, lastSummary: null, playerId: null, lb: false, custom: [], fuelClaimed: {}, chat: [], ach: {}, achV: 3, mogClaimed: {}, xpDetail: {}, xpDone: {}, presets: [], weightLog: {}, community: { ex: [], foods: [] }, savedFoods: [],
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
  const [burst, setBurst] = useState(null);
  const xpSeen = useRef(new Set());
  const [confetti, setConfetti] = useState(false);
  const [onboard, setOnboard] = useState(null);
  const [liveRun, setLiveRun] = useState(() => loadLive());
  const startRun = (mode, guide) => { const r = newRun(mode, guide); saveLive(r); setLiveRun(r); };
  const pullSteps = async () => {
    try { const r = await window.storage.get("steps-inbox", false); const inbox = r?.value ? JSON.parse(r.value) : null; if (inbox) setS((p) => mergeSteps(p, inbox) || p); } catch (e) { /* none yet */ }
  };
  useEffect(() => { const v = () => { if (document.visibilityState === "visible") pullSteps(); }; document.addEventListener("visibilitychange", v); return () => document.removeEventListener("visibilitychange", v); }, []);
  useEffect(() => {
    const on = (e) => {
      const kind = e.detail; setBurst({ kind, id: Date.now() });
      const root = document.getElementById("ascend-root");
      if (root) { root.classList.remove("shake-pr", "shake-soft"); void root.offsetWidth; root.classList.add(kind === "pr" ? "shake-pr" : "shake-soft"); setTimeout(() => root.classList.remove("shake-pr", "shake-soft"), 700); }
      setTimeout(() => setBurst(null), 1500);
    };
    window.addEventListener("ascend-juice", on);
    return () => window.removeEventListener("ascend-juice", on);
  }, []);
  const [offline, setOffline] = useState(false);
  useEffect(() => { songPushed.current = false; }, [s.profile.song, s.lb]);
  const openProfile = (id) => { setProfileId(id || null); setTab("profile"); window.scrollTo?.(0, 0); };
  AskRef.current = (message, onYes, yesLabel = "Confirm") => setDialog({ message, onYes, yesLabel });
  const [party, setPartyState] = useState(false);
  const setParty = (on) => { if (on) Groove.start(); else Groove.stop(); setPartyState(on); };
  useEffect(() => { if (!s.settings?.zesty && party) setParty(false); }, [s.settings?.zesty]);
  useEffect(() => () => Groove.stop(), []);
  // Load fonts with <link> tags too, in case the @import inside the style tag is ignored
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
      if (!st.onboarded && !st.workouts?.length) setOnboard(st.profile?.name ? 1 : 0);
      if ((st.achV || 1) < 3) st = reconcileAchievements(st, true);
      if (!st.assistV) {
        const bw = Math.max(80, +st.profile?.weight || 170);
        st = { ...st, assistV: 1, workouts: (st.workouts || []).map((w) => ({ ...w, exercises: w.exercises.map((ex) => (/^Assisted (Dip|Pull-up) Machine$/.test(ex.name) ? { ...ex, sets: ex.sets.map((x) => (+x.w >= bw * 0.5 ? { ...x, w: Math.max(0, Math.round(bw - +x.w)) } : x)) } : ex)) })) };
      }
      let ok = !!window.storage?.set;
      if (ok) { try { await window.storage.set("ascend-probe", "1", false); } catch (e) { ok = false; } }
      setStorageOk(ok);
      setS(st); setLoaded(true);
      loadCommunity().then((c) => { if (c) setS((p) => ({ ...p, community: c })); }).catch(() => { /* offline */ });
      setTimeout(pullSteps, 800);
    })();
  }, []);

  // Save state; if it fails (no signal), keep retrying until it lands
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
  // Settings also live on this device so colors and fonts survive account or connection hiccups
  useEffect(() => { if (loaded) { try { localStorage.setItem("ascend-settings", JSON.stringify(s.settings)); } catch (e) { /* private mode */ } } }, [s.settings, loaded]);

  // Push leaderboard card whenever progress changes
  useEffect(() => {
    if (!loaded || !s.lb || !s.profile.name) return;
    const t = setTimeout(async () => {
      const card = profileCard(s);
      if (s.profile.song?.type === "clip" && !songPushed.current) { try { const r = await window.storage.get("ascend-song", false); if (r?.value) { await window.storage.set(`song:${s.playerId}`, r.value, true); songPushed.current = true; } } catch (e) { /* skip */ } }
      try { await window.storage.set(`lb:${s.playerId}`, JSON.stringify(card), true); } catch (e) { console.error(e); }
    }, 1200);
    return () => clearTimeout(t);
  }, [loaded, s.lb, s.profile.name, s.profile.avatar, s.profile.look, s.profile.song, s.seasonBadges, s.xp, s.workouts, s.profile.weight, s.days, s.custom, s.ach, s.weightLog]);

  const gainXp = (amt, msg, once = null) => {
    if (!amt) return;
    // `once` is an event id: the same award can never be counted twice, even if a listener fires twice
    if (once) { if (xpSeen.current.has(once) || (sRef.current.xpDone || {})[once]) return; xpSeen.current.add(once); }
    const before = levelFromXp(sRef.current.xp).lvl, after = levelFromXp(Math.max(0, sRef.current.xp + amt)).lvl;
    const d = today();
    setS((p) => ({ ...p, xp: Math.max(0, p.xp + amt), xpLog: { ...p.xpLog, [d]: (p.xpLog?.[d] || 0) + amt },
      xpDone: once ? { ...(p.xpDone || {}), [once]: 1 } : p.xpDone,
      xpDetail: { ...(p.xpDetail || {}), [d]: [...((p.xpDetail || {})[d] || []), { m: msg, a: amt, t: Date.now() }].slice(-120) } }));
    if (after > before) SFX.levelUp();
    setToast(after > before ? { big: true, text: `Level up · Level ${after}` } : { text: `${amt >= 0 ? "+" : ""}${amt} XP · ${msg}` });
    setTimeout(() => setToast(null), 2600);
  };

  // Award achievements as soon as they're earned
  useEffect(() => {
    if (!loaded) return;
    const fresh = earnedAchievements(s).filter((a) => !(s.ach || {})[a.id]);
    if (!fresh.length) return;
    const amt = fresh.reduce((a, x) => a + x.xp, 0), d = today();
    if (fresh.every((a) => xpSeen.current.has(`ach_${a.id}`))) return;
    fresh.forEach((a) => xpSeen.current.add(`ach_${a.id}`));
    setS((p) => {
      const already = Object.keys(p.ach || {});
      const add = fresh.filter((a) => !already.includes(a.id));
      if (!add.length) return p;
      const sum = add.reduce((x, a) => x + a.xp, 0);
      return { ...p, xp: p.xp + sum, ach: { ...(p.ach || {}), ...Object.fromEntries(add.map((a) => [a.id, d])) },
        xpLog: { ...p.xpLog, [d]: (p.xpLog?.[d] || 0) + sum }, xpDetail: { ...(p.xpDetail || {}), [d]: [...((p.xpDetail || {})[d] || []), ...add.map((a) => ({ m: `Achievement: ${a.title}`, a: a.xp, t: Date.now() }))].slice(-120) } };
    });
    setToast({ big: true, text: fresh.length === 1 ? `${fresh[0].title} unlocked · +${amt} XP` : `${fresh.length} achievements · +${amt} XP` });
    SFX.achievement();
    if (fresh.length <= 3) fresh.forEach((a) => postFeed(s, "ach", `unlocked ${a.title} (${TIER_STYLE[a.tier].name})`, {}, `ach_${a.id}`));
    setTimeout(() => setToast(null), 3200);
  }, [loaded, s.workouts, s.days, s.xp, s.profile.weight]);

  // Rank-up ceremony: compare current tiers to the last snapshot
  useEffect(() => {
    if (!loaded) return;
    const snap = rankSnapshot(s);
    if (!s.rankSnap) { setS((p) => ({ ...p, rankSnap: snap })); return; }
    const prev = s.rankSnap;
    let cer = null;
    if (snap.overall > (prev.overall || 0) && snap.overall >= 1) { const r = rankFromScore(snap.overall); cer = { kind: "overall", rank: r.rank, label: `${r.rank.id}-Rank · ${RANK_INFO[r.rank.id][0]}` }; }
    else { const up = Object.entries(snap.lifts).find(([n, t]) => t > (prev.lifts?.[n] ?? 0) && t >= 1); if (up) { const full = rankedLifts(s).find((x) => x.e.name === up[0]); const r = RANKS[Math.min(6, up[1])]; cer = { kind: "lift", name: up[0], rank: r, label: full ? full.label : `${r.id}-Rank`, tier: up[1] }; } }
    const changed = snap.overall !== prev.overall || JSON.stringify(snap.lifts) !== JSON.stringify(prev.lifts);
    if (changed) setS((p) => ({ ...p, rankSnap: snap }));
    if (cer) { setCeremony(cer); postFeed(s, "rank", cer.kind === "overall" ? `ranked up to ${cer.label} overall` : `${cer.name} hit ${cer.label}`, { tier: cer.kind === "overall" ? Math.floor(snap.overall) : cer.tier }, `rank_${cer.kind === "overall" ? "overall" : slug(cer.name)}_${cer.rank.id}`); }
  }, [loaded, s.workouts, s.profile.weight, s.custom]);

  // Weekly snapshot for the rank report
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
    <div className={`min-h-screen relative ${s.settings?.zesty ? "zesty" : ""} ${s.settings?.dysFont ? "dys" : ""}`} id="ascend-root" style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Lexend:wght@400;600;800&family=Orbitron:wght@700;900&family=Bangers&family=Cinzel:wght@700;900&family=Permanent+Marker&family=Press+Start+2P&family=Pacifico&family=Creepster&display=swap');
        .body{font-family:'Inter',system-ui,sans-serif;line-height:1.45;letter-spacing:.005em}
        h1,h2{letter-spacing:.01em}
        .dys,.dys *,.dys .body{font-family:'Lexend',system-ui,sans-serif!important;letter-spacing:.03em;word-spacing:.08em}
        .fancyname,.fancyname *,.dys .fancyname,.dys .fancyname *{font-family:var(--nf)!important;letter-spacing:normal}
        .bgfx{position:fixed;inset:0;pointer-events:none;background:
          radial-gradient(70% 38% at 50% -8%, ${C.halo}, transparent 70%),
          radial-gradient(60% 40% at 100% 100%, ${C.halo}, transparent 70%), ${C.bg}}
        .panel{position:relative;background:${C.glass};border:1px solid ${C.glassLine};border-radius:16px;-webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%);box-shadow:0 8px 30px rgba(0,0,0,.18)}
        .panel::before,.panel::after{content:none}
        .space-y-4>:not([hidden])~:not([hidden]){margin-top:1.15rem}
        h1{font-weight:700;letter-spacing:-.01em} h2{font-weight:650;letter-spacing:-.005em}
        @keyframes auraorbit{from{transform:rotate(var(--a)) translate(var(--r)) rotate(calc(-1 * var(--a)))}to{transform:rotate(calc(var(--a) + 360deg)) translate(var(--r)) rotate(calc(-1 * var(--a) - 360deg))}}
        @keyframes aurabob{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-70%) scale(1.15)}}
        @keyframes musclein{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
        @keyframes aurapulse{0%,100%{opacity:.5;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes juiceflash{0%{opacity:1}100%{opacity:0}}
        @keyframes juicespark{0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(.2);opacity:0}}
        @keyframes juicetext{0%{transform:translateX(-50%) scale(.4);opacity:0}25%{transform:translateX(-50%) scale(1.25);opacity:1}70%{opacity:1}100%{transform:translateX(-50%) scale(1);opacity:0}}
        @keyframes shake{0%,100%{transform:translate(0,0)}15%{transform:translate(-8px,4px)}30%{transform:translate(7px,-5px)}45%{transform:translate(-6px,-3px)}60%{transform:translate(5px,4px)}75%{transform:translate(-3px,2px)}}
        @keyframes shakesoft{0%,100%{transform:translate(0,0)}30%{transform:translate(-3px,2px)}60%{transform:translate(3px,-2px)}}
        .shake-pr{animation:shake .55s cubic-bezier(.36,.07,.19,.97)} .shake-soft{animation:shakesoft .3s ease-out}
        @keyframes bossidle{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes bosshit{0%{transform:scale(1)}30%{transform:scale(.85) rotate(-6deg);filter:brightness(2)}100%{transform:scale(1)}}
        .inp{background:${C.inpBg};border:1px solid ${C.glassLine};border-radius:10px;padding:8px 10px;color:${C.text};width:100%}
        .inp:focus,button:focus-visible{outline:2px solid ${C.cyan};outline-offset:1px;box-shadow:0 0 12px ${C.glow}}
        .btn{background:linear-gradient(180deg,${C.cyan},${C.blue});box-shadow:0 6px 18px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.3);border-radius:12px;color:#001018;font-weight:800;letter-spacing:.02em}
        .ghost{background:${C.glass};border:1px solid ${C.glassLine};border-radius:12px;color:${C.text}}
        .glowtext{text-shadow:none}
        .ranklabel{font-family:'Inter',system-ui,sans-serif;font-weight:800;letter-spacing:.02em}
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

      <div className="relative max-w-md mx-auto px-5" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 170px)" }}>
        <div className="flex items-center justify-center mb-3" style={{ height: 36 }}><img src="/logo-sm.webp" alt="Ascend" width="38" height="36" style={{ height: 32, width: "auto", opacity: 0.95 }} /></div>
        {onboard !== null && <Onboarding s={s} setS={setS} step={onboard} onNext={() => { if (onboard >= 2) { setOnboard(null); setS((p) => ({ ...p, onboarded: true })); setConfetti(true); setTab("status"); } else setOnboard(onboard + 1); }} />}
        {onboard !== null ? null : tab === "status" && <Status s={s} setS={setS} gainXp={gainXp} openAssistant={() => setTab("assistant")} openSettings={() => setTab("settings")} openProfile={(pid) => openProfile(typeof pid === "string" ? pid : null)} openMuscle={openMuscle} openExercise={openExercise} goTrain={() => setTab("train")} goRun={() => setTab("run")} openXp={() => setTab("xp")} />}
        {onboard === null && tab === "exercise" && <ExercisePage s={s} name={exercisePick} onBack={() => setTab(exerciseFrom)} openMuscle={(g) => openMuscle(g, "exercise")} />}
        {onboard === null && tab === "run" && <RunHub s={s} setS={setS} gainXp={gainXp} onBack={() => setTab("train")} startRun={startRun} />}
        {onboard === null && tab === "muscle" && <MusclePage s={s} group={musclePick} onBack={() => setTab(muscleFrom)} openExercise={(n) => openExercise(n, "muscle")} />}
        {onboard === null && tab === "profile" && <ProfilePage s={s} setS={setS} gainXp={gainXp} targetId={profileId} onBack={() => setTab(profileId ? "board" : "status")} />}
        {!storageOk && (
          <div className="panel p-3 mb-4 body text-sm" style={{ borderColor: C.orange, color: C.orange }}>
            Progress can't save right now. Check your connection, or sign out and back in from Settings.
          </div>
        )}
        {onboard === null && tab === "xp" && <XpLedger s={s} onBack={() => setTab("status")} />}
        {onboard === null && tab === "settings" && <SettingsPage s={s} setS={setS} onBack={() => setTab("status")} party={party} setParty={setParty} openTool={setTab} />}
        <IntervalTimer visible={tab === "timer"} onBack={() => setTab("settings")} onOpen={() => setTab("timer")} />
        <CardDeck visible={tab === "cards"} s={s} setS={setS} gainXp={gainXp} onBack={() => setTab("settings")} />
        {onboard === null && tab === "assistant" && <Assistant s={s} setS={setS} onBack={() => setTab("status")} />}
        {onboard === null && tab === "train" && <Train s={s} setS={setS} gainXp={gainXp} openRun={() => setTab("run")} />}
        {onboard === null && tab === "quests" && <Quests s={s} setS={setS} gainXp={gainXp} />}
        {onboard === null && tab === "fuel" && <Fuel s={s} setS={setS} gainXp={gainXp} />}
        {onboard === null && tab === "calendar" && <Calendar s={s} setS={setS} />}
        {onboard === null && tab === "ranks" && <Ranks s={s} openMuscle={(g) => openMuscle(g, "ranks")} />}
        {onboard === null && tab === "board" && <Board s={s} setS={setS} openProfile={openProfile} gainXp={gainXp} />}
      </div>

      {toast && (
        <div className="fixed left-1/2 z-50 px-5 py-2.5 text-sm font-bold" style={{ top: "calc(env(safe-area-inset-top) + 12px)", transform: "translateX(-50%)", animation: "pop .3s ease-out", borderRadius: 999, whiteSpace: "nowrap",
          background: toast.big ? C.gold : C.sheet, color: toast.big ? "#0A1630" : C.cyan, border: `1px solid ${toast.big ? C.gold : C.blue}`,
          boxShadow: toast.big ? "0 0 30px rgba(255,212,71,.6)" : `0 0 22px ${C.glow}` }}>{toast.text}</div>
      )}

      {party && <DiscoParty />}
      {ceremony && <Ceremony c={ceremony} onClose={() => setCeremony(null)} />}
      {burst && <JuiceBurst key={burst.id} kind={burst.kind} />}
      {confetti && <Confetti onDone={() => setConfetti(false)} />}
      {liveRun && <RunTracker key={liveRun.id} s={s} setS={setS} gainXp={gainXp} initial={liveRun} onClose={() => { setLiveRun(null); setTab("run"); }} />}
      {offline && <div className="fixed right-2 z-50" style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}><div className=" px-3 py-1 text-xs font-bold" style={{ borderRadius: 999, background: C.sheet, color: C.orange, border: `1px solid ${C.orange}` }}>Offline · will sync</div></div>}
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
        <button aria-label={party ? "Stop the disco" : "Start the disco"} onClick={() => setParty(!party)} className="fixed z-40 flex items-center justify-center" style={{ right: 20, bottom: "calc(env(safe-area-inset-bottom) + 148px)", width: 44, height: 44, borderRadius: 999, background: party ? RAINBOW : C.soft, backgroundSize: "200% auto", animation: party ? "rainbow 2s linear infinite" : "none", border: `1px solid ${C.border}`, boxShadow: "0 0 18px rgba(255,60,172,.5)" }}>
          <DiscoIcon size={24} spinning={party} />
        </button>
      )}
      {tab !== "assistant" && (
        <button aria-label="Open voice assistant" onClick={() => setTab("assistant")} className="btn fixed z-40 flex items-center justify-center" style={{ right: 16, bottom: "calc(env(safe-area-inset-bottom) + 86px)", width: 52, height: 52, borderRadius: 999 }}>
          <Bot size={24} />
        </button>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40" style={{ background: C.glass, borderTop: `1px solid ${C.glassLine}`, backdropFilter: "blur(22px) saturate(150%)", WebkitBackdropFilter: "blur(22px) saturate(150%)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-md mx-auto grid grid-cols-7">
          {tabs.map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)} className="pt-2.5 pb-3 flex flex-col items-center gap-1 relative" style={{ fontSize: 10, color: tab === id ? C.cyan : C.mute, filter: tab === id ? `drop-shadow(0 0 6px ${C.glow})` : "none" }}>
              {tab === id && <span className="absolute top-0 left-1/4 right-1/4" style={{ height: 2, background: C.cyan, boxShadow: `0 0 10px ${C.cyan}` }} />}
              <Icon size={19} strokeWidth={tab === id ? 2.4 : 1.8} />{label}
            </button>
          ))}
        </div>
      </nav>
      <Analytics />
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
function Status({ s, setS, gainXp, openAssistant, openSettings, openProfile, openMuscle, openExercise, goTrain, goRun, openXp, openRival }) {
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
            <button aria-label="Open your profile" onClick={openProfile}><Avatar src={s.profile.avatar} name={s.profile.name} size={44} ring={oc.color} look={s.profile.look} /></button>
            <button onClick={() => setEditName(true)} className="text-2xl font-bold tracking-wide truncate">{s.profile.name ? <FancyName name={s.profile.name} look={s.profile.look} className="glowtext" /> : "Set your name"}</button>
          </div>
        )}
        <div className="flex items-center gap-1 font-semibold" style={{ color: C.orange, textShadow: "0 0 10px rgba(255,147,64,.6)" }}><Flame size={20} />{streak}
          <button aria-label="Settings" onClick={openSettings} className="ml-3 p-1.5 ghost" style={{ color: C.cyan }}><Gear size={18} /></button></div>
      </div>

      <div className="panel p-5 overflow-hidden">
        <div className="absolute -right-4 -top-10 font-extrabold select-none" style={{ fontSize: 170, color: oc.color, opacity: 0.07, lineHeight: 1 }}>{oc.id}</div>
        <div className="flex items-center gap-4 relative">
          <div className="flex-1 min-w-0">
            <div className="breathe inline-block" style={{ "--g": oc.glow }}><RankBadge rank={oc} size={60} /></div>
            <div className="text-sm body mt-2" style={{ color: C.dim }}>Overall rank · {RANK_INFO[oc.id][0]}</div>
            <div className="ranklabel text-4xl" style={{ color: oc.color }}>{overall.label}</div>
          </div>
          <Physique tier={overall.score} height={150} aura={s.profile.look?.aura} />
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
          <button onClick={() => openXp()} className="body text-sm underline" style={{ color: C.cyan }}>XP history</button>
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

      <Dashboard s={s} setS={setS} goTrain={goTrain} goRun={goRun} />
      <StepsPanel s={s} setS={setS} gainXp={gainXp} openRun={goRun} openAssistant={openAssistant} />
      <RoastCard s={s} setS={setS} />
      <NemesisAlert s={s} setS={setS} openProfile={openProfile} />
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
          <button className="col-span-2 mt-1 text-xs underline" style={{ color: C.red }} onClick={() => ask("Reset all progress? This can't be undone.", () => setS({ ...DEFAULT, playerId: s.playerId, settings: s.settings }), "Reset")}>Reset all progress</button>
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
const setLabel = (def, st) => (def.type === "assisted" ? `${st.r} (−${+st.w || 0})` : def.type === "timed" ? `${st.w ? `${st.w}mi ` : ""}${st.r}m` : st.w ? `${st.w}×${st.r}` : `${st.r}`);

function Train({ s, setS, gainXp, openRun }) {
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
    juice(prs ? "pr" : "finish");
    if (prs) { postFeed(s, "pr", `set ${prs} new PR${prs > 1 ? "s" : ""}${workout.title ? ` on ${workout.title} day` : ""}`, { detail: lines.filter((l) => l.sets.some((st) => st.pr)).map((l) => `${l.name} ${l.sets.filter((st) => st.pr).map((st) => st.label).join(", ")}`).join(" · ") }, `pr_${workout.id}`); }
    gainXp(xp, prs ? `Workout · ${prs} new PR${prs > 1 ? "s" : ""}` : "Workout complete", `wo_${workout.id}`);
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
        <div className="grid gap-2" style={{ gridTemplateColumns: "1.6fr 1fr 1fr" }}>
          <button onClick={() => setTitling(true)} className="btn py-4 text-lg">Start workout</button>
          <button onClick={openRun} className="ghost py-4 font-bold flex items-center justify-center gap-2" style={{ color: C.green }}><Footprints size={18} />Run</button>
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
            <ReceiptButton label="Share card" make={() => buildReceipt({ s, kind: s.lastSummary.prs ? "New PR" : "Workout complete", headline: s.lastSummary.prs ? `${s.lastSummary.prs} new PR${s.lastSummary.prs > 1 ? "s" : ""}` : (s.lastSummary.title ? `${s.lastSummary.title} day` : "Session done"), sub: s.lastSummary.prNames?.length ? s.lastSummary.prNames.join(", ") : s.lastSummary.title || "", tierImg: Math.floor(overallInfo(s).score), rows: [["XP earned", `+${s.lastSummary.xp}`], ["Volume", `${Math.round(s.lastSummary.volume).toLocaleString()} lb`], ["Time", s.lastSummary.minutes ? `${s.lastSummary.minutes} min` : "–"], ["Streak", `${streakOf(s)} days`]] })} />
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
                  {!w.source && <ReceiptButton small label="Share card" make={() => buildReceipt({ s, kind: "Workout", headline: w.title ? `${w.title} day` : "Workout", sub: fmtDay(w.date), tierImg: Math.floor(overallInfo(s).score), rows: [["XP earned", `+${w.xp || 0}`], ["Volume", `${Math.round(w.volume || 0).toLocaleString()} lb`], ["Exercises", w.exercises.length], ["Sets", w.exercises.reduce((a, e) => a + e.sets.length, 0)]] })} />}
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

      {!a.editId && <WarmUp s={s} a={a} setActive={setActive} />}
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
              <span>Set</span><span>Previous</span>{showW && <span>{cardio ? "Miles" : def.type === "assisted" ? "Assist lb" : def.type === "bodyweight" ? "+lb" : (ex.wMode || (def.perHand ? "hand" : "total")) === "hand" ? "lb/hand" : "lb"}</span>}<span>{timed ? "Minutes" : "Reps"}</span><span /><span />
            </div>
            {ex.sets.map((st, si) => {
              const pv = prev[si];
              const cmp = st.done && pv && +st.r > 0 ? ((+st.w || 0) * (+st.r || 0) || +st.r) - ((+pv.w || 0) * (+pv.r || 0) || +pv.r) : null;
              return (
                <React.Fragment key={si}>
                <div className="grid gap-2 items-center py-1 px-1" style={{ gridTemplateColumns: cols, background: st.done ? "rgba(79,209,139,.14)" : "transparent", borderRadius: 3 }}>
                  <span className="font-semibold text-center">{si + 1}</span>
                  <span className="body text-xs" style={{ color: cmp === null ? C.dim : cmp >= 0 ? C.green : C.orange }}>{pv ? setLabel(def, pv) : "–"}{cmp !== null && pv ? (cmp > 0 ? " ▲" : cmp < 0 ? " ▼" : " =") : ""}</span>
                  {showW && <input type="number" inputMode="decimal" className="inp text-center" value={st.w} placeholder={pv?.w || "0"} onChange={(e) => upd(si, { w: e.target.value })} />}
                  <input type="number" inputMode="decimal" className="inp text-center" value={st.r} placeholder={pv?.r || "0"} onChange={(e) => upd(si, { r: e.target.value })} />
                  <button aria-label="Mark set done" onClick={() => { const turningOn = !st.done; upd(si, turningOn && !st.r && pv ? { done: true, r: pv.r, w: st.w || pv.w } : { done: !st.done }); if (turningOn) { SFX.click(); const secs = s.settings?.rest ?? 90; if (secs > 0 && !a.editId) { Beeper.unlock(); setRest({ end: Date.now() + secs * 1000 }); } } }}
                    className="h-8 flex items-center justify-center" style={{ background: st.done ? C.green : C.soft, borderRadius: 3, color: st.done ? "#02040B" : C.dim }}><Check size={16} /></button>
                  <button aria-label="Delete set" onClick={() => delSet(si)} className="h-8 flex items-center justify-center" style={{ color: C.mute }}><X size={14} /></button>
                </div>
                {def.type === "assisted" && (+st.w > 0 || +st.r > 0) && <div className="body text-xs pl-9 -mt-0.5 mb-1" style={{ color: C.dim }}>You moved <span style={{ color: C.text, fontWeight: 600 }}>{Math.round(movedLb(s.profile, st.w))} lb</span> ({Math.round(Math.max(80, +s.profile.weight || 170))} − {+st.w || 0}){+st.r > 0 ? ` · counts as ${Math.round(assistedReps(s.profile, st) * 10) / 10} ${def.rankAs.toLowerCase()}s` : ""}</div>}
                </React.Fragment>
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

// Full page (not a popup) so it scrolls normally on phones
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
    gainXp(q.xp, `Quest: ${q.title}`, `quest_${d}_${q.id}`);
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

      <div className="panel p-5 flex items-center gap-4">
        {isToday && <HydrationBar s={s} setS={setS} gainXp={gainXp} d={d} />}
        <svg width="104" height="104" viewBox="0 0 110 110" className="shrink-0">
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
              <button disabled={!ready} onClick={() => { setS((x) => ({ ...x, fuelClaimed: { ...(x.fuelClaimed || {}), [d]: true } })); gainXp(FUEL_XP, "Fuel goal hit", `fuel_${d}`); }} className="w-full mt-3 py-2 font-bold" style={{ borderRadius: 4, background: ready ? C.gold : C.soft, color: ready ? "#0A1630" : C.mute, border: `1px solid ${C.border}` }}>Claim</button>}
          </div>
        );
      })()}
      <div className="body text-xs" style={{ color: C.mute }}>Maintenance is about {t.tdee} cal/day from your body stats. Every day's food saves automatically, and you can look back with the arrows or the Log tab.</div>

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
  const [loading, setLoading] = useState(null); // "estimate" | "lookup"
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

  // Recent foods from the log, newest first
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
      {scanning && <PhotoScan sState={s} onShare onCancel={() => setScanning(false)} onAddAll={(items) => { items.forEach((it) => onAdd({ name: it.name, cal: it.cal, p: it.p, c: it.c, f: it.f })); }} />}
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
          <div className="flex gap-2"><button onClick={() => saveAndAdd(found)} className="btn flex-1 py-3">Add and save</button><ShareMealButton s={s} food={found} /></div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["All", "Meals", "Community feed", ...(saved.length ? ["Saved"] : []), "Community", ...RESTAURANTS, "Basics"].map((g) => (
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

      {src === "Community feed" && <CommunityMeals s={s} setS={setS} onAdd={onAdd} />}
      {src !== "Community feed" && list.length === 0 && <Empty>No match here. Tap "Look up restaurant online" to search the restaurant's nutrition info.</Empty>}
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
function Calendar({ s, setS }) {
  const [sheet, setSheet] = useState(null);
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
        {(() => { const ci = s.checkins?.[sel] || {}; const wt = s.weightLog?.[sel]; const steps = s.steps?.[sel]; const parts = [ci.sleep ? `${ci.sleep}h sleep` : null, ci.mood ? `feeling ${ci.mood.toLowerCase()}` : null, steps ? `${steps.toLocaleString()} steps` : null, wt ? `${wt} lb` : null].filter(Boolean);
          return parts.length ? <div className="body text-xs mt-2 pt-2" style={{ borderTop: `1px solid ${C.line}`, color: C.sub }}>{parts.join(" · ")}</div> : null; })()}
        {di.ws.length > 0 ? di.ws.map((w) => (
          <button key={w.id} onClick={() => setSheet(w)} className="mt-3 body text-sm w-full text-left" style={{ color: C.sub }}>
            <div className="flex justify-between items-center"><span className="font-semibold" style={{ color: C.text }}>{w.title || "Workout"}{w.run ? ` · ${w.run.miles} mi` : ""}</span><span className="body text-xs" style={{ color: C.cyan }}>Details ›</span></div>
            {w.exercises.map((ex) => <div key={ex.name}><span style={{ color: C.cyan }}>{ex.name}</span>: {ex.sets.map((st) => setLabel(findEx(s, ex.name), st)).join(", ")}</div>)}
          </button>
        )) : <div className="mt-3 body text-sm" style={{ color: C.mute }}>No workout this day.</div>}
      </div>

      {sheet && <LogWorkoutSheet s={s} setS={setS} w={sheet} onClose={() => setSheet(null)} />}
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
  const [sort, setSort] = useState("season");
  const [muscle, setMuscle] = useState("Chest");
  const [err, setErr] = useState("");

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
      const got = cards.filter(Boolean);
      setRows(got);
      settleSeason(s, setS, got).catch(() => {});
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (view !== "crew") return; const t = setInterval(load, 30000); return () => clearInterval(t); }, [view]);

  const leave = async () => {
    setS((p) => ({ ...p, lb: false }));
    try { await window.storage.delete(`lb:${s.playerId}`, true); } catch (e) { /* not listed */ }
    setRows((r) => r.filter((x) => x.key !== `lb:${s.playerId}`));
  };

  const ws = weekStart();
  const mk = monthKey();
  const sk = seasonKey();
  const SORTS = {
    season: ["Season", "season XP", (r) => (r.season?.key === sk ? r.season.xp : 0)],
    points: ["Points", "pts", (r) => r.points || 0], xp: ["XP", "XP", (r) => r.xp || 0], month: ["Month", "XP this month", (r) => (r.month?.key === mk ? r.month.xp : 0)],
    streak: ["Streak", "days", (r) => r.streak || 0], week: ["Week", "workouts", (r) => (r.weekOf === ws ? r.week : 0)],
    muscle: ["Muscles", "", (r) => r.groups?.[muscle] || 0, (r) => { const sc = r.groups?.[muscle] || 0; return sc ? rankFromScore(sc).label : "–"; }],
  };
  const [, unit, val, fmt] = SORTS[sort];
  const show = (r) => (fmt ? fmt(r) : val(r).toLocaleString());
  const sorted = [...rows].sort((a, b) => val(b) - val(a));
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
      {view === "crew" && <Crew s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} />}
      {view === "board" && !s.lb ? (
        <div className="panel p-4 space-y-3">
          <div className="font-bold">Join the leaderboard</div>
          <div className="body text-sm" style={{ color: C.dim }}>Everyone using this app will see your profile: name, photo, level, points, rank, streak, achievements, lifetime stats, top lifts, and weight trend. Your food log and individual workouts stay private.</div>
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
      {sort === "season" && <SeasonBanner />}
      {sort === "month" && <div className="body text-xs" style={{ color: C.mute }}>XP earned since the 1st. Resets every month, so anyone can take the top spot.</div>}
      {sort === "muscle" && <div className="body text-xs" style={{ color: C.mute }}>Ranked by each player's best lift in {muscle}. Numbers hide, ranks show.</div>}
      {sort === "points" && <div className="body text-xs" style={{ color: C.mute }}>Points come from all XP earned in workouts, plus a bonus for the rank of every lift that grows fast as you climb (about 1,000 for a maxed S lift).</div>}

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
                <Avatar src={r.avatar} name={r.name} size={P.place === 1 ? 48 : 38} ring={rank.color} look={r.look} />
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
              <Avatar src={r.avatar} name={r.name} size={32} ring={rank.color} look={r.look} />
              <div className="flex-1 min-w-0 ml-1">
                <div className="font-bold truncate"><FancyName name={r.name} look={r.look} style={{ color: r.look?.bg && r.look.bg !== "none" ? "#fff" : C.text }} />{isMe(r) && <span className="body text-xs ml-2" style={{ color: C.cyan }}>you</span>}{s.nemesis?.id === r.id && <span className="ml-1" title="Your nemesis">😈</span>}{Object.values(r.badges || {}).some((b) => b.place === 1) && <span className="ml-1" title="Season champion">🏆</span>}</div>
                {r.title && <div className="text-xs font-bold tracking-wider uppercase" style={{ color: r.look?.accent || C.cyan }}>{r.title}</div>}
                <div className="body text-xs" style={{ color: C.dim }}><span className="ranklabel">{r.rank}{r.div ? ` ${r.div}` : ""}</span> · Level {r.lvl} · {r.streak} day streak{r.atGym && Date.now() - r.atGym < 3 * 3600 * 1000 ? <span style={{ color: C.green }}> · at the gym</span> : null}</div>
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
  const all = allExercises(s).filter((e) => e.type !== "timed" && e.type !== "assisted");
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
        Targets are built for you: {p.weight} lb, {ft}'{inch}", {p.sex === "f" ? "female" : "male"}. Heavier lifters need to lift more, and taller frames need more too, because being jacked at your height means carrying more muscle. Update your body stats on the Status tab whenever they change.
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
      <div className="body text-xs" style={{ color: C.mute }}>Each rank has three divisions: III, II, then I. S I sits 35% past the S line. Rumour has it there's something above S.</div>

      <h2 className="text-lg font-bold glowtext pt-2">What each rank takes</h2>
      <div className="panel p-3">
        <div className="grid gap-1 pb-1 text-xs font-bold" style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)" }}>
          <span style={{ color: C.dim }}>Lift</span>
          {RANKS.slice(1, 6).map((r) => <span key={r.id} className="text-center" style={{ color: r.color, textShadow: `0 0 8px ${r.glow}` }}>{r.id}</span>)}
        </div>
        {key.map((n) => { const e = all.find((x) => x.name === n); return e ? <Row key={n} e={e} /> : null; })}
        <div className="body text-xs pt-2" style={{ color: C.mute }}>Weighted lifts show estimated one-rep max in lb, so 225 × 5 counts as about a 263 lb max. Lifts marked /hand use the weight in one hand. Pull-ups show strict reps in one set, and added weight counts extra. Shoulders and arms are held to a stricter standard.</div>
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
        <div className="body text-sm" style={{ color: C.dim }}>Your best lift in each muscle group counts, weighted like this. To be overall S, you need to be elite across your whole body, not on one machine.</div>
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
        <div className="body text-xs" style={{ color: C.mute }}>Cardio and timed exercises earn XP but don't affect rank.</div>
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
    try { await navigator.clipboard.writeText(c); setCopied(true); } catch (e) { /* user can copy manually */ }
  };
  const shareSave = async () => {
    const c = code || await encodeSave(s);
    setCode(c);
    try { await navigator.share({ title: "Ascend save code", text: c }); } catch (e) { try { await navigator.clipboard.writeText(c); setCopied(true); } catch (e2) { /* manual copy */ } }
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
            <div className="body text-xs" style={{ color: C.dim }}>Rainbow everything, plus disco music and a disco ball. Tap the disco ball button to start or stop the party.</div>
          </div>
          <Toggle label="Zesty mode" on={!!st.zesty} onClick={() => { const on = !st.zesty; setSet("zesty", on); setParty(on); }} />
        </div>
        <div className="flex items-center gap-3">
          <Type size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Easy-read font</div>
            <div className="body text-xs" style={{ color: C.dim }}>Switches everything to Lexend, a rounder font with wider spacing that's easier to read for dyslexia.</div>
          </div>
          <Toggle label="Easy-read font" on={!!st.dysFont} onClick={() => setSet("dysFont", !st.dysFont)} />
        </div>
        <div className="flex items-center gap-3">
          <Palette size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Custom colors</div>
            <div className="body text-xs" style={{ color: C.dim }}>Pick your own accent, secondary, and background. Zesty mode overrides this while it's on.</div>
          </div>
          <Toggle label="Custom colors" on={!!st.custom?.on} onClick={() => setSet("custom", { ...(st.custom || DEFAULT.settings.custom), on: !st.custom?.on })} />
        </div>
        {st.custom?.on && (
          <div className="grid grid-cols-3 gap-2 body text-sm">
            {[["cyan", "Accent"], ["blue", "Secondary"], ["bg", "Background"]].map(([k, l]) => (
              <label key={k} className="flex flex-col items-center gap-1">
                <input type="color" value={st.custom[k] || DEFAULT.settings.custom[k]} onChange={(e) => setSet("custom", { ...st.custom, [k]: e.target.value })} aria-label={`${l} color`} style={{ width: "100%", height: 44, border: `1px solid ${C.border}`, borderRadius: 4, background: "transparent" }} />
                <span style={{ color: C.dim }}>{l}</span>
              </label>
            ))}
            <button onClick={() => setSet("custom", { ...DEFAULT.settings.custom, on: true })} className="col-span-3 ghost py-2 text-sm">Reset colors</button>
            <div className="col-span-3 body text-xs flex items-center gap-1" style={{ color: C.green }}><Check size={14} />Saved to your account and this device{st.savedAt ? ` · ${new Date(st.savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}</div>
          </div>
        )}
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
          <div className="flex-1"><div className="font-bold">Sound effects</div><div className="body text-xs" style={{ color: C.dim }}>Set clicks, PR chime, level-up and rank-up fanfares.</div></div>
          <Toggle label="Sound effects" on={st.sounds !== false} onClick={() => setSet("sounds", st.sounds === false)} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimerIcon size={22} style={{ color: C.cyan }} />
          <div className="flex-1"><div className="font-bold">Rest timer</div><div className="body text-xs" style={{ color: C.dim }}>Starts when you check off a set.</div></div>
          <div className="flex gap-1">{[0, 60, 90, 120, 180].map((v) => <button key={v} onClick={() => setSet("rest", v)} className="px-2 py-1 text-xs font-semibold" style={{ borderRadius: 999, background: (st.rest ?? 90) === v ? C.blue : C.soft, color: (st.rest ?? 90) === v ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{v ? `${v}s` : "Off"}</button>)}</div>
        </div>
        {st.voice && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(VOICE_STYLES).map(([id, v]) => (
              <button key={id} onClick={() => setSet("voiceStyle", id)} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: (st.voiceStyle || "goblin") === id ? C.blue : C.soft, color: (st.voiceStyle || "goblin") === id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{v.name}</button>
            ))}
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold">Workout tools</h2>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => openTool("timer")} className="panel p-4 text-left">
          <TimerIcon size={26} style={{ color: C.cyan }} />
          <div className="font-bold mt-2">Interval timer</div>
          <div className="body text-xs mt-0.5" style={{ color: C.dim }}>Beeps for work and rest</div>
        </button>
        <button onClick={() => openTool("cards")} className="panel p-4 text-left">
          <Layers size={26} style={{ color: C.cyan }} />
          <div className="font-bold mt-2">Deck of cards</div>
          <div className="body text-xs mt-0.5" style={{ color: C.dim }}>Draw a card, do the reps</div>
        </button>
      </div>

      {window.ascendAuth && (
        <div className="panel p-4 flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="font-bold">Account</div><div className="body text-xs truncate" style={{ color: C.dim }}>{window.ascendAuth.email}</div></div>
          <button onClick={() => ask("Sign out on this device? Your progress stays saved in your account.", () => window.ascendAuth.signOut(), "Sign out")} className="ghost px-4 py-2 text-sm font-bold" style={{ color: C.red }}>Sign out</button>
        </div>
      )}

      <h2 className="text-lg font-bold">Contact support</h2>
      <SupportForm s={s} />

      <h2 className="text-lg font-bold">Achievements</h2>
      <div className="panel p-4 space-y-2">
        <div className="body text-sm" style={{ color: C.dim }}>Achievements from the old, easier rank scale were already removed. If anything else looks wrong, recheck: any badge you no longer qualify for is removed and its XP taken back.</div>
        <button onClick={() => ask("Recheck all achievements against your current data?", () => { const before = Object.keys(s.ach || {}).length; const next = reconcileAchievements(s); setS(next); setMsg({ ok: true, text: `Rechecked. ${before - Object.keys(next.ach).length} removed.` }); }, "Recheck")} className="ghost w-full py-3 font-bold" style={{ color: C.cyan }}>Recheck achievements</button>
      </div>

      <h2 className="text-lg font-bold">Export</h2>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => exportWorkouts(s)} className="ghost py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Download size={16} />Workouts CSV</button>
        <button onClick={() => exportFood(s)} className="ghost py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Download size={16} />Food log CSV</button>
      </div>

      <h2 className="text-lg font-bold">Save files</h2>
      <div className="panel p-4 space-y-3">
        <div className="body text-sm" style={{ color: C.dim }}>Before switching to a new version of the app, make a save code and keep it somewhere like your Notes app. Then paste it into the new version to get all your progress back. Only load your own save, since it includes your leaderboard identity.</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={makeSave} className="btn py-3 flex items-center justify-center gap-2"><Save size={18} />Copy save code</button>
          <button onClick={shareSave} className="ghost py-3 font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Share2 size={18} />Share…</button>
        </div>
        <div className="body text-xs" style={{ color: C.mute }}>Codes are compressed now, so they're a fraction of the old length. "Share…" opens your phone's share sheet so you can drop it straight into Notes or a text to yourself. Old ASCEND- codes still load.</div>
        {code && (
          <>
            <textarea readOnly value={code} onFocus={(e) => e.target.select()} className="inp body text-xs" rows={3} aria-label="Save code" style={{ wordBreak: "break-all" }} />
            <div className="body text-xs" style={{ color: C.dim }}>{code.length.toLocaleString()} characters</div>
            <div className="body text-xs flex items-center gap-2" style={{ color: copied ? C.green : C.dim }}>
              {copied ? <><Check size={14} />Copied. Paste it somewhere safe.</> : <><Copy size={14} />Tap the box, select all, and copy it.</>}
            </div>
          </>
        )}
        <div className="neonline" />
        <textarea value={paste} onChange={(e) => { setPaste(e.target.value); setMsg(null); }} className="inp body text-xs" rows={3} placeholder="Paste a save code here" aria-label="Paste save code" />
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
    .map((r) => `${r.e.name}: ${r.label} (best ${Math.round(r.best)}${r.e.type === "bodyweight" ? " reps" : " lb est. 1RM"}${r.next ? `, next ${r.nextLabel} at ${r.next}` : ""})`).join("; ");
  const quests = (s.days?.[d]?.list || []).map((q) => `${q.title} ${q.progress}/${q.target} ${q.unit}${q.claimed ? " (cleared)" : ""}`).join("; ");
  const tot = mealTotals(s.meals[d]);
  const recent = s.workouts.filter((w) => w.source !== "quest").slice(-5).map((w) => `${w.date}${w.title ? ` (${w.title})` : ""}: ${w.exercises.map((e) => `${e.name} ${e.sets.map((x) => (x.w ? `${x.w}x${x.r}` : x.r)).join(",")}`).join(" | ")}`).join("\n");
  return `Name: ${p.name || "unknown"}. Bodyweight ${p.weight} lb, height ${p.height} in, age ${p.age}, ${p.sex === "f" ? "female" : "male"}. Goal: ${GOALS.find((g) => g.id === p.goal)?.label}.
Level ${levelFromXp(s.xp).lvl} (${s.xp} XP), overall rank ${o.label}, streak ${streakOf(s)} days, leaderboard points ${pointsOf(s)}.
Lift ranks: ${lifts || "none logged yet"}.
Today (${d}) quests: ${quests || "none yet"}.
Today's food: ${Math.round(tot.cal)}/${t.cal} cal, protein ${Math.round(tot.p)}/${t.protein}g, carbs ${Math.round(tot.c)}/${t.carbs}g, fat ${Math.round(tot.f)}/${t.fat}g.
Recent workouts:\n${recent || "none yet"}
Today's check-in: ${s.checkins?.[d]?.sleep ? `${s.checkins[d].sleep}h sleep` : "sleep not logged"}, mood ${s.checkins?.[d]?.mood || "not logged"}.`;
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

const STEP_COACH = `The user just asked for help setting up automatic step syncing. Walk them through it like a friendly personal trainer, not tech support: warm, encouraging, plain language, one step at a time, and ask them to say "next" when each step is done. The setup: 1) In Ascend, open Status and find the Steps card, then tap the sync line and "Create my sync code" (the code and the sync URL appear there, and they can tap either to copy). 2) On iPhone open the Shortcuts app, go to the Automation tab, tap +, choose Time of Day, pick 11:45 PM daily, Run Immediately, then New Blank Automation. 3) Add the action "Find Health Samples", set Type to Steps and Start Date to Today. 4) Add "Calculate Statistics" and choose Sum. 5) Add "Format Date" with Current Date and custom format yyyy-MM-dd. 6) Add "Get Contents of URL", paste the sync URL, set Method to POST and Request Body to JSON, then add three fields: token (their sync code), steps (the Statistics result), date (the formatted date). 7) Tap Done, run it once to test, then reopen Ascend. Troubleshoot patiently if they get stuck, and mention they can always type steps in by hand instead.`;
function Assistant({ s, setS, onBack }) {
  const chat = s.chat || [];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [note, setNote] = useState("");
  const recRef = useRef(null);
  const endRef = useRef(null);
  const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const voiceOn = s.settings?.voice !== false;

  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }); }, [chat.length, busy]);
  useEffect(() => {
    window.speechSynthesis?.getVoices?.();
    return () => { try { window.speechSynthesis?.cancel(); recRef.current?.abort?.(); } catch (e) { /* ignore */ } };
  }, []);

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

  const send = async (textArg, coachMode = false) => {
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    // Unlock speech on iPhone while we still have the tap
    if (voiceOn && window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) { /* ignore */ } }
    const next = [...chat, { role: "user", content: text }].slice(-20);
    setS((p) => ({ ...p, chat: next }));
    setInput(""); setBusy(true); setNote("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `${coachMode ? `${STEP_COACH}\n\n` : ""}You are Sterling, the built-in AI coach inside Ascend, a leveling-style gym tracking app. You are a deeply unhinged British butler: posh vocabulary, wildly over-the-top hype, dramatic exclamations like "GOOD HEAVENS" and "by the barbell", occasional absurd similes, and you treat every set like a matter of national importance. Be funny, but the training and nutrition advice underneath must stay accurate and practical. Your replies are read aloud in a silly voice, so keep them to 1 to 3 short sentences unless asked for detail, and never use markdown, bullet points, or emojis. Whenever the user asks how to do an exercise, its form, or technique, give one or two key cues and then add a tag at the very end in exactly this format: [[yt:Exercise Name]] (the app turns it into a YouTube how-to button, so never mention the tag or the word YouTube yourself). Give practical, accurate training and nutrition guidance using the user's real data below. If they mention pain, injury, or a medical issue, advise seeing a qualified professional. App facts: ranks go E, D, C, B, A, S with divisions III, II, I; lift ranks use estimated one-rep max scaled to bodyweight and height; overall rank weights legs, back and chest most; daily quests link to logged exercises; hitting calories within 10% plus the protein target earns ${FUEL_XP} XP.\n\nUser data:\n${buildContext(s)}`,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = (data.content || []).map((i) => i.text || "").join("").trim() || "Terribly sorry, I seem to have lost my train of thought. Do ask again.";
      setS((p) => ({ ...p, chat: [...(p.chat || []), { role: "assistant", content: reply }].slice(-20) }));
      if (voiceOn) speak(reply);
    } catch (e) {
      setNote("Sterling couldn't connect. Check your connection and try again.");
    }
    setBusy(false);
  };

  const toggleMic = () => {
    if (listening) { try { recRef.current?.stop(); } catch (e) { /* ignore */ } return; }
    if (!SR) { setNote("Voice input isn't supported here, so type your question instead."); return; }
    try {
      window.speechSynthesis?.cancel();
      const rec = new SR();
      rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
      let finalText = "";
      rec.onresult = (e) => {
        let txt = "";
        for (let i = 0; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) finalText = txt; }
        setInput(txt);
      };
      rec.onerror = (e) => { setListening(false); setNote(e.error === "not-allowed" || e.error === "service-not-allowed" ? "The mic is blocked in this app, so type your question instead." : "Didn't catch that. Try again or type it."); };
      rec.onend = () => { setListening(false); if (finalText.trim()) send(finalText); };
      recRef.current = rec;
      rec.start(); setListening(true); setNote("");
    } catch (e) {
      setListening(false); setNote("Voice input isn't available here, so type your question instead.");
    }
  };

  const suggestions = ["What should I train today?", "How close am I to my next rank?", "What should I eat to hit my protein?"];
  // Opened from the Steps card: Sterling starts the setup himself
  useEffect(() => {
    const on = () => { if (!busy) send("Walk me through setting up automatic step tracking on my iPhone, one step at a time.", true); };
    window.addEventListener("ascend-sterling-steps", on);
    return () => window.removeEventListener("ascend-sterling-steps", on);
  }, [busy, chat.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={() => { window.speechSynthesis?.cancel(); onBack(); }} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold glowtext">Sterling</h1>
          <div className="body text-xs" style={{ color: C.dim }}>Your AI coach</div>
        </div>
        {speaking && (
          <button aria-label="Stop speaking" onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }} className="flex items-end gap-0.5 h-6 px-2">
            {[0, 1, 2, 3].map((i) => <span key={i} className="w-1 h-full barfill" style={{ background: C.cyan, borderRadius: 2, transformOrigin: "bottom", animation: `eq .8s ${i * 0.12}s ease-in-out infinite` }} />)}
          </button>
        )}
        <button aria-label={voiceOn ? "Mute voice" : "Unmute voice"} onClick={() => { if (voiceOn) window.speechSynthesis?.cancel(); setS((p) => ({ ...p, settings: { ...p.settings, voice: !voiceOn } })); }} className="ghost p-2" style={{ color: voiceOn ? C.cyan : C.mute }}>
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {chat.length === 0 && (
        <div className="panel p-4 space-y-3">
          <div className="body text-sm" style={{ color: C.sub }}>Good day. I can see your ranks, quests, workouts and today's food, so ask me anything about your training.</div>
          <div className="flex flex-col gap-2">
            {suggestions.map((q) => <button key={q} onClick={() => send(q)} className="ghost text-left p-3 body text-sm" style={{ color: C.cyan }}>{q}</button>)}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[80%] px-3 py-2 body text-sm" style={{ background: C.blue, color: "#fff", borderRadius: "10px 10px 2px 10px" }}>{m.content}</div>
            ) : (
              <div className="panel max-w-[85%] px-3 py-2">
                <div className="body text-sm" style={{ color: C.text }}>{stripYt(m.content)}</div>
                {[...m.content.matchAll(YT_RE)].map((mm, k) => <a key={k} href={ytUrl(mm[1].trim())} target="_blank" rel="noreferrer" className="btn mt-2 px-3 py-1.5 text-xs inline-flex items-center gap-1 mr-2"><Youtube size={14} />How to: {mm[1].trim()}</a>)}
                <button aria-label="Play reply" onClick={() => speak(m.content)} className="mt-1 flex items-center gap-1 text-xs" style={{ color: C.dim }}><Volume2 size={13} />Play</button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={16} className="animate-spin" />Sterling is thinking…</div>}
        <div ref={endRef} />
      </div>

      {note && <div className="body text-sm" style={{ color: C.orange }}>{note}</div>}

      <div className="panel p-2 flex items-center gap-2">
        <button aria-label={listening ? "Stop listening" : "Speak your question"} onClick={toggleMic} className="shrink-0 flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 999, background: listening ? C.red : C.soft, color: listening ? "#fff" : C.cyan, border: `1px solid ${C.border}`, boxShadow: listening ? "0 0 18px rgba(255,77,109,.6)" : "none" }}>
          <Mic size={20} />
        </button>
        <input className="inp" placeholder={listening ? "Listening…" : "Ask Sterling"} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button aria-label="Send" onClick={() => send()} disabled={!input.trim() || busy} className="btn shrink-0 flex items-center justify-center" style={{ width: 44, height: 44, opacity: !input.trim() || busy ? 0.5 : 1 }}><Send size={18} /></button>
      </div>
      {chat.length > 0 && <button onClick={() => { window.speechSynthesis?.cancel(); setS((p) => ({ ...p, chat: [] })); }} className="body text-xs underline" style={{ color: C.mute }}>Clear conversation</button>}
    </div>
  );
}

/* ---------- Zesty disco: original synthesized funk loop ---------- */
const Groove = {
  ctx: null, master: null, timer: null, step: 0, nextTime: 0, noise: null,
  bpm: 114,
  start() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) {
        this.ctx = new AC();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 4;
        this.master = this.ctx.createGain(); this.master.gain.value = 0.5;
        this.master.connect(comp); comp.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      this.ctx.resume();
      if (this.timer) return;
      this.step = 0; this.nextTime = this.ctx.currentTime + 0.08;
      this.timer = setInterval(() => this.schedule(), 25);
    } catch (e) { /* audio not available */ }
  },
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    try { this.ctx?.suspend(); } catch (e) { /* ignore */ }
  },
  schedule() {
    const sixteenth = 60 / this.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      // light swing on the off 16ths
      const t = this.nextTime + (this.step % 2 ? sixteenth * 0.12 : 0);
      this.playStep(this.step, t, sixteenth);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  },
  playStep(st, t, s16) {
    const b = st % 16, bar = Math.floor(st / 16);
    if (b % 4 === 0) this.kick(t);
    if (b === 4 || b === 12) this.clap(t);
    if (b % 4 === 2) this.hat(t, 0.16, 0.09);
    else if (b % 2 === 1) this.hat(t, 0.05, 0.03);
    // bass: syncopated octave line over Em7 / Am7 / Em7 / B7
    const roots = [28, 33, 28, 35]; // E1, A1, E1, B1
    const pat = { 0: 0, 3: 12, 6: 0, 7: 10, 10: 12, 11: 7, 14: 10 };
    if (pat[b] !== undefined) this.bass(t, roots[bar] + 12 + pat[b], s16 * (b === 0 ? 2.5 : 1.4));
    // chord stabs on the offbeats
    const chords = [[52, 55, 59, 62, 66], [57, 60, 64, 67, 71], [52, 55, 59, 62, 66], [59, 63, 66, 69]];
    if (b === 2 || b === 7 || b === 10) this.stab(t, chords[bar], s16 * 1.2);
    // shimmer arpeggio every other bar
    if (bar % 2 === 1 && b % 2 === 0) this.bell(t, chords[bar][(b / 2) % chords[bar].length] + 12);
  },
  hz: (m) => 440 * Math.pow(2, (m - 69) / 12),
  env(g, t, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); },
  kick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.9, 0.32); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.35);
  },
  noiseHit(t, type, freq, peak, dec) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain(); this.env(g, t, peak, dec);
    n.connect(f); f.connect(g); g.connect(this.master); n.start(t, Math.random() * 0.5); n.stop(t + dec + 0.02);
  },
  clap(t) { [0, 0.012, 0.024].forEach((d, i) => this.noiseHit(t + d, "bandpass", 1400, i === 2 ? 0.5 : 0.25, i === 2 ? 0.16 : 0.03)); },
  hat(t, peak, dec) { this.noiseHit(t, "highpass", 7500, peak, dec); },
  bass(t, midi, dur) {
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = this.hz(midi);
    f.type = "lowpass"; f.Q.value = 9; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  stab(t, notes, dur) {
    const f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = "lowpass"; f.Q.value = 6; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + dur);
    this.env(g, t, 0.07, dur); f.connect(g); g.connect(this.master);
    notes.forEach((m, i) => {
      const o = this.ctx.createOscillator(); o.type = "square"; o.frequency.value = this.hz(m); o.detune.value = i % 2 ? 6 : -6;
      o.connect(f); o.start(t); o.stop(t + dur + 0.02);
    });
  },
  bell(t, midi) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "triangle"; o.frequency.value = this.hz(midi);
    this.env(g, t, 0.05, 0.25); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.28);
  },
};

function DiscoIcon({ size = 24, spinning }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ animation: spinning ? "discospin 2s linear infinite" : "none" }}>
      <defs><radialGradient id="dball" cx="35%" cy="30%"><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#b9c6d6" /><stop offset="1" stopColor="#5d6b7d" /></radialGradient></defs>
      <circle cx="12" cy="12" r="10" fill="url(#dball)" stroke="#fff" strokeWidth=".6" />
      {[-6, -2, 2, 6].map((y) => <line key={y} x1="2.5" x2="21.5" y1={12 + y} y2={12 + y} stroke="#3a4656" strokeWidth=".5" />)}
      {[-6, -2, 2, 6].map((x) => <ellipse key={x} cx="12" cy="12" rx={Math.abs(x) + 0.01} ry="10" fill="none" stroke="#3a4656" strokeWidth=".5" />)}
    </svg>
  );
}

function DiscoParty() {
  const spots = ["#ff3cac", "#3cc8ff", "#f7ff3c", "#3cff9e", "#9b5cff", "#ffb43c", "#ff3cac", "#3cc8ff"];
  const tiles = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const x = 6 + c * 12, y = 6 + r * 12;
    if ((x - 54) ** 2 + (y - 54) ** 2 < 50 * 50) tiles.push([x, y, (r * 7 + c * 3) % 5]);
  }
  return (
    <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes discodrop{0%{transform:translate(-50%,-260px)}70%{transform:translate(-50%,12px)}100%{transform:translate(-50%,0)}}
        @keyframes discospin{to{transform:rotate(360deg)}}
        @keyframes sparkle{0%,100%{opacity:.25}50%{opacity:1}}
        @keyframes sweep{0%{transform:translate(-10vw,10vh) scale(1)}25%{transform:translate(70vw,40vh) scale(1.4)}50%{transform:translate(30vw,85vh) scale(.9)}75%{transform:translate(85vw,15vh) scale(1.2)}100%{transform:translate(-10vw,10vh) scale(1)}}
        @keyframes beams{to{transform:translateX(-50%) rotate(360deg)}}
        .dspot{position:absolute;top:0;left:0;width:120px;height:120px;border-radius:999px;mix-blend-mode:screen;filter:blur(18px);opacity:.55}
      `}</style>
      <div className="absolute left-1/2 top-0" style={{ width: 600, height: 600, marginTop: -180, transform: "translateX(-50%)", animation: "beams 9s linear infinite",
        background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.10) 0deg 4deg, transparent 4deg 22deg)", maskImage: "radial-gradient(circle, black 20%, transparent 70%)", WebkitMaskImage: "radial-gradient(circle, black 20%, transparent 70%)" }} />
      {spots.map((c, i) => (
        <div key={i} className="dspot" style={{ background: c, animation: `sweep ${7 + i * 1.3}s ${-i * 1.7}s ease-in-out infinite` }} />
      ))}
      <div className="absolute left-1/2 top-0 flex flex-col items-center" style={{ animation: "discodrop .9s cubic-bezier(.2,.8,.3,1.2) both" }}>
        <div style={{ width: 2, height: 46, background: "linear-gradient(#999,#ddd)" }} />
        <svg width="108" height="108" viewBox="0 0 108 108" style={{ animation: "discospin 6s linear infinite", filter: "drop-shadow(0 0 22px rgba(255,255,255,.7)) drop-shadow(0 0 40px rgba(255,60,172,.5))" }}>
          <defs>
            <radialGradient id="ballbase" cx="38%" cy="32%"><stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor="#aab6c5" /><stop offset="1" stopColor="#3b4655" /></radialGradient>
            <clipPath id="ballclip"><circle cx="54" cy="54" r="50" /></clipPath>
          </defs>
          <circle cx="54" cy="54" r="50" fill="url(#ballbase)" />
          <g clipPath="url(#ballclip)">
            {tiles.map(([x, y, k], i) => (
              <rect key={i} x={x - 5.5} y={y - 5.5} width="11" height="11" rx="1" fill={spots[k]} opacity=".35" style={{ animation: `sparkle ${0.6 + k * 0.25}s ${i * 0.05}s ease-in-out infinite`, mixBlendMode: "screen" }} />
            ))}
            {[...Array(9)].map((_, i) => <line key={`h${i}`} x1="0" x2="108" y1={i * 12} y2={i * 12} stroke="rgba(30,40,55,.55)" strokeWidth="1" />)}
            {[...Array(9)].map((_, i) => <line key={`v${i}`} y1="0" y2="108" x1={i * 12} x2={i * 12} stroke="rgba(30,40,55,.55)" strokeWidth="1" />)}
          </g>
          <circle cx="38" cy="34" r="9" fill="#fff" opacity=".8" style={{ animation: "sparkle 1.1s ease-in-out infinite" }} />
        </svg>
      </div>
    </div>
  );
}

/* ---------- Beeps ---------- */
const Beeper = {
  ctx: null,
  unlock() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      this.ctx.resume();
    } catch (e) { /* no audio */ }
  },
  tone(freq, dur = 0.15, delay = 0, vol = 0.5) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "square"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  tick() { this.tone(660, 0.08, 0, 0.3); },
  work() { this.tone(1046, 0.14); this.tone(1318, 0.22, 0.16); },
  rest() { this.tone(523, 0.3); },
  done() { [0, 0.2, 0.4].forEach((d) => this.tone(1318, 0.16, d)); this.tone(1760, 0.5, 0.6); },
};

const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;

/* ---------- Interval timer ---------- */
function IntervalTimer({ visible, onBack, onOpen }) {
  const [work, setWork] = useState(20);
  const [rest, setRest] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [run, setRun] = useState(null); // { phase, left, round, paused }
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

  const releaseWake = () => { try { wakeRef.current?.release(); } catch (e) { /* ignore */ } wakeRef.current = null; };
  useEffect(() => { if (run && run.phase !== "done") document.title = `${run.paused ? "❚❚" : "⏱"} ${run.phase === "work" ? "Work" : run.phase === "rest" ? "Rest" : "Ready"} ${fmtClock(run.left)} · Ascend`; else document.title = "Ascend"; }, [run?.left, run?.phase, run?.paused]);
  useEffect(() => () => releaseWake(), []);

  const start = async () => {
    Beeper.unlock(); Beeper.tick();
    setRun({ phase: "ready", left: 3, round: 1, paused: false });
    try { wakeRef.current = await navigator.wakeLock?.request("screen"); } catch (e) { /* not supported */ }
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

  // Floating mini timer on other pages while it's running
  if (!visible) {
    if (!run || run.phase === "done") return null;
    return (
      <button onClick={onOpen} aria-label="Open interval timer" className="fixed z-40 flex items-center gap-2 px-3 py-2 font-bold tabular-nums" style={{ left: 16, bottom: "calc(env(safe-area-inset-bottom) + 90px)", borderRadius: 999, background: C.sheet, color: phaseColor, border: `1px solid ${phaseColor}`, boxShadow: `0 0 16px ${phaseColor}66` }}>
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

      <div className="body text-xs" style={{ color: C.dim }}>Quick picks</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[["Tabata", 20, 10, 8], ["30 / 15", 30, 15, 10], ["40 / 20", 40, 20, 8], ["Every 10s", 10, 0, 0], ["EMOM", 60, 0, 10]].map(([n, w, r, rd]) => (
          <button key={n} disabled={!!run} onClick={() => { setWork(w); setRest(r); setRounds(rd); }} className="ghost px-3 py-2 text-sm font-semibold whitespace-nowrap shrink-0" style={{ color: work === w && rest === r && rounds === rd ? C.cyan : C.text, borderColor: work === w && rest === r && rounds === rd ? C.cyan : C.border }}>{n}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stepper label="Work" value={work} set={setWork} step={5} min={5} max={600} fmt={fmtClock} />
        <Stepper label="Rest" value={rest} set={setRest} step={5} min={0} max={300} fmt={(v) => (v ? fmtClock(v) : "None")} />
        <Stepper label="Rounds" value={rounds} set={setRounds} step={1} min={0} max={99} fmt={(v) => (v ? v : "∞")} />
      </div>
      <div className="body text-xs" style={{ color: C.mute }}>It beeps when each work or rest period starts, with a countdown tick for the last 3 seconds. Set rest to None to beep every interval nonstop. The timer keeps running if you switch tabs. Turn off silent mode to hear the beeps.</div>
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
  const [current, setCurrent] = useState(null); // { card, status: "open" }
  const [log, setLog] = useState([]); // completed or skipped cards
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
    gainXp(xp + bonus, lastCard ? "Card deck cleared" : `Card deck · ${reps} ${name}`, `deck_${sessionId}_${log.length}`);
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

  const doneCards = log.filter((x) => x.done);
  const totals = {};
  doneCards.forEach((x) => { totals[x.name] = (totals[x.name] || 0) + x.reps; });
  const sessionXp = doneCards.reduce((a, x) => a + x.xp, 0);
  const card = current || (log.length ? log[log.length - 1].card : null);
  const suit = card && SUITS.find((x) => x.id === card.suit);
  const cardColor = card ? (card.suit === "J" ? "#9b5cff" : suit.red ? "#E0284A" : "#0B1220") : C.text;
  const finished = !deck.length && !current;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext flex-1">Deck of cards</h1>
        <span className="body text-sm" style={{ color: C.dim }}>{deck.length + (current ? 1 : 0)} left</span>
      </div>

      <style>{`@keyframes cardin{0%{transform:translateY(-30px) rotateY(90deg) scale(.9);opacity:0}100%{transform:none;opacity:1}}`}</style>
      <div className="flex justify-center" style={{ perspective: 800 }}>
        {current ? (
          <div key={flip} className="relative flex flex-col justify-between p-3" style={{ width: 210, height: 294, borderRadius: 14, background: "#FDFDFB", color: cardColor, boxShadow: `0 0 28px ${C.glow}, 0 10px 30px rgba(0,0,0,.4)`, animation: "cardin .35s ease-out", fontFamily: "Georgia, serif" }}>
            <div className="text-left leading-none"><div className="text-3xl font-bold">{card.suit === "J" ? "★" : card.face}</div><div className="text-2xl">{suit ? suit.sym : ""}</div></div>
            <div className="absolute inset-0 flex items-center justify-center"><div style={{ fontSize: card.suit === "J" ? 64 : 88, lineHeight: 1 }}>{card.suit === "J" ? "🃏" : suit.sym}</div></div>
            <div className="text-right leading-none" style={{ transform: "rotate(180deg)" }}><div className="text-3xl font-bold">{card.suit === "J" ? "★" : card.face}</div><div className="text-2xl">{suit ? suit.sym : ""}</div></div>
          </div>
        ) : (
          <button onClick={finished ? reshuffle : draw} aria-label={finished ? "Start a new deck" : "Draw a card"} className="relative flex items-center justify-center" style={{ width: 210, height: 294, borderRadius: 14, background: `repeating-linear-gradient(45deg, ${C.blue} 0 10px, ${C.accentBg} 10px 20px)`, border: `4px solid ${C.soft}`, boxShadow: `0 0 28px ${C.glow}` }}>
            <span className="px-4 py-2 font-extrabold text-lg" style={{ background: C.sheet, color: C.cyan, borderRadius: 4 }}>{finished ? "New deck" : "Tap to draw"}</span>
          </button>
        )}
      </div>

      {current && (
        <div className="panel p-4 text-center">
          <div className="text-4xl font-extrabold glowtext">{repsFor(current)} reps</div>
          <div className="text-xl font-bold mt-1" style={{ color: C.cyan }}>{exFor(current)}</div>
          <div className="body text-sm mt-1 font-bold" style={{ color: C.gold }}>Worth +{xpFor(current)} XP{deck.length === 0 ? " · +150 for the last card" : ""}</div>
        </div>
      )}

      {current ? (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={complete} className="btn col-span-2 py-4 text-lg flex items-center justify-center gap-2"><Check size={20} />Done</button>
          <button onClick={skip} className="ghost py-4 font-bold flex items-center justify-center gap-1"><SkipForward size={18} />Skip</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={finished ? reshuffle : draw} className="btn py-4 text-lg">{finished ? "New deck" : log.length ? "Next card" : "Draw card"}</button>
          <button onClick={() => (log.length ? ask("Start a fresh deck? Reps you already finished stay saved.", reshuffle, "Reshuffle") : reshuffle())} className="ghost py-4 font-bold flex items-center justify-center gap-2"><RotateCcw size={18} />Reshuffle</button>
        </div>
      )}
      <div className="body text-xs" style={{ color: C.mute }}>Tap Done after each card. Every finished card saves right away, earns XP, counts toward that exercise's rank, and fills matching daily quests. Skipped cards earn nothing.</div>

      {log.length > 0 && (
        <div className="panel p-4 space-y-2">
          <div className="flex justify-between font-bold"><span>This deck</span><span style={{ color: C.gold }}>+{sessionXp} XP</span></div>
          <div className="body text-xs" style={{ color: C.dim }}>{doneCards.length} done{log.length - doneCards.length ? ` · ${log.length - doneCards.length} skipped` : ""}</div>
          {Object.entries(totals).map(([n, r]) => (
            <div key={n} className="flex justify-between body text-sm" style={{ color: C.sub }}><span>{n}</span><span>{r} reps</span></div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-bold pt-2">Your deck</h2>
      <div className="panel p-4 space-y-3">
        {SUITS.map((su) => (
          <label key={su.id} className="flex items-center gap-3 body text-sm">
            <span className="w-8 text-2xl text-center" style={{ color: su.red ? C.red : C.text }}>{su.sym}</span>
            <select className="inp" value={cfg[su.id]} onChange={(e) => setCfg({ ...cfg, [su.id]: e.target.value })} aria-label={`${su.name} exercise`}>
              {all.map((e) => <option key={e.name}>{e.name}</option>)}
            </select>
          </label>
        ))}
        <div className="grid grid-cols-2 gap-2 body text-sm">
          <label>J, Q, K count as<select className="inp mt-1" value={cfg.faces} onChange={(e) => setCfg({ ...cfg, faces: e.target.value })}><option value="ten">10 reps</option><option value="rank">11, 12, 13</option></select></label>
          <label>Aces count as<select className="inp mt-1" value={cfg.aces} onChange={(e) => setCfg({ ...cfg, aces: +e.target.value })}><option value={1}>1 rep</option><option value={11}>11 reps</option><option value={15}>15 reps</option></select></label>
        </div>
        <label className="flex items-center gap-3 body text-sm">
          <input type="checkbox" checked={cfg.jokers} onChange={(e) => setCfg({ ...cfg, jokers: e.target.checked })} style={{ width: 20, height: 20, accentColor: C.cyan }} />
          <span className="flex-1">Add 2 jokers (applies on next reshuffle)</span>
        </label>
        {cfg.jokers && (
          <div className="grid grid-cols-2 gap-2 body text-sm">
            <label>Joker exercise<select className="inp mt-1" value={cfg.jokerEx} onChange={(e) => setCfg({ ...cfg, jokerEx: e.target.value })}>{all.map((e) => <option key={e.name}>{e.name}</option>)}</select></label>
            <label>Joker reps<input type="number" className="inp mt-1" value={cfg.jokerReps} onChange={(e) => setCfg({ ...cfg, jokerReps: Math.max(1, +e.target.value || 1) })} /></label>
          </div>
        )}
        <div className="body text-xs" style={{ color: C.mute }}>A full deck with these settings is about {(() => { let t = 0; FACES.forEach((f, i) => { const r = i + 1; t += 4 * (r === 1 ? cfg.aces : r > 10 ? (cfg.faces === "ten" ? 10 : r) : r); }); return t + (cfg.jokers ? 2 * cfg.jokerReps : 0); })()} total reps.</div>
      </div>
    </div>
  );
}

/* ---------- Profile looks, theme songs, comment photos ---------- */
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
// Keeps a photo's shape but limits its size, for comment pictures
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
// Turns an uploaded song into a small 20-second mono WAV clip that plays on every phone
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
  try { ctx.close?.(); } catch (e) { /* ignore */ }
  return "data:audio/wav;base64," + b64(bytes);
}
const b64 = (bytes) => { let bin = ""; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(bin); };
const b64url = (bytes) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (t) => { const s = t.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(s + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0)); };
const songLinkLabel = (url) => (/youtu\.?be/i.test(url) ? "YouTube" : /spotify/i.test(url) ? "Spotify" : /apple/i.test(url) ? "Apple Music" : /soundcloud/i.test(url) ? "SoundCloud" : "Link");

/* ---------- Profiles ---------- */
function Avatar({ src, name, size = 48, ring, look }) {
  const color = ring || C.cyan;
  const border = BORDERS.find((b) => b.id === look?.border && b.css);
  const inner = src ? (
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", border: border ? "none" : `2px solid ${color}`, flexShrink: 0, display: "block" }} />
  ) : (
    <div className="flex items-center justify-center font-bold shrink-0" style={{ width: size, height: size, borderRadius: 999, background: C.accentBg, color, border: border ? "none" : `2px solid ${color}`, fontSize: size * 0.42 }}>{((name || "?").trim()[0] || "?").toUpperCase()}</div>
  );
  if (!border && (!look?.aura || look.aura === "none")) return inner;
  const pad = border ? Math.max(2, Math.round(size / 22)) : 0;
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size + pad * 2, height: size + pad * 2 }}>
      {look?.aura && look.aura !== "none" && <AuraRing aura={look.aura} size={(size + pad * 2) * 1.45} style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />}
      {border && <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: 999, background: border.css, animation: border.spin ? "rkspin 4s linear infinite" : "none" }} />}
      <div className="relative" style={{ borderRadius: 999, overflow: "hidden" }}>{inner}</div>
    </div>
  );
}

// Shrinks an uploaded photo to a small square JPEG so it fits in storage and loads fast on the board
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
      <div className="flex items-center justify-center relative" style={{ width: size, height: size, borderRadius: a.tier >= 4 ? 12 : 999, transform: a.tier >= 4 ? "rotate(45deg)" : "none",
        background: earned ? (mythic ? RAINBOW : `radial-gradient(circle at 35% 30%, ${t.color}, ${C.bg} 85%)`) : C.soft, backgroundSize: mythic ? "300% auto" : undefined,
        border: `2px solid ${earned ? t.color : C.border}`, boxShadow: earned ? `0 0 ${8 + a.tier * 5}px ${t.glow}` : "none", opacity: earned ? 1 : 0.45, animation: earned && mythic ? "rainbow 3s linear infinite" : "none" }}>
        <div style={{ transform: a.tier >= 4 ? "rotate(-45deg)" : "none", color: earned ? (a.tier === 2 ? "#0B1220" : mythic ? "#fff" : "#0B1220") : C.mute }}>
          {earned ? <Icon size={size * 0.45} strokeWidth={2.2} /> : <Lock size={size * 0.38} />}
        </div>
        {earned && a.tier >= 3 && !mythic && <span className="absolute" style={{ top: -4, right: -4, transform: a.tier >= 4 ? "rotate(-45deg)" : "none" }}><Sparkle size={14} style={{ color: t.color, filter: `drop-shadow(0 0 4px ${t.color})` }} /></span>}
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
        <path d={path} fill="none" stroke={C.cyan} strokeWidth="2.5" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${C.glow})` }} />
        {pts.map((p, i) => <circle key={p.d} cx={x(i)} cy={y(p.w)} r="3" fill={C.bg} stroke={C.cyan} strokeWidth="2" />)}
        <text x={padL} y={H - 6} fontSize="10" fill={C.dim}>{new Date(first.d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text>
        <text x={W - padR} y={H - 6} fontSize="10" fill={C.dim} textAnchor="end">{new Date(last.d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text>
      </svg>
      <div className="body text-xs flex justify-between" style={{ color: C.dim }}>
        <span>{pts.length} entries</span>
        <span style={{ color: diff === 0 ? C.dim : (target === "cut" ? diff < 0 : diff > 0) ? C.green : C.orange }}>{diff > 0 ? "+" : ""}{diff} lb since {new Date(first.d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
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
    title: (TITLES.find((t) => t.id === ({ wyrmslayer: "boss_wyrm", icebreaker: "boss_colossus", gravebane: "boss_gravemaw" }[s.profile.title] || s.profile.title) && t.req(s)) || null)?.name || null,
    weekXp: Object.entries(s.xpLog || {}).filter(([d]) => d >= ws).reduce((a, [, v]) => a + v, 0),
    prevWeek: (() => { const pw = shift(ws, -7); return { key: pw, xp: Object.entries(s.xpLog || {}).filter(([d]) => d >= pw && d < ws).reduce((a, [, v]) => a + v, 0) }; })(),
    atGym: s.atGym && Date.now() - s.atGym < 3 * 3600 * 1000 ? s.atGym : null,
    xp: s.xp, points: pointsOf(s), lvl: levelFromXp(s.xp).lvl, rank: overallRank(s).id, div: overallInfo(s).div,
    streak: streakOf(s), week: s.workouts.filter((w) => w.date >= ws && w.source !== "quest").length, weekOf: ws, updated: Date.now(),
    ach: Object.keys(s.ach || {}), stats: st, weightLog: Object.fromEntries(wl),
    month: (() => { const mk = monthKey(); let volume = 0, reps = 0, miles = 0; s.workouts.filter((w) => w.date.startsWith(mk)).forEach((w) => w.exercises.forEach((ex) => { const d = findEx(s, ex.name); ex.sets.forEach((st) => { if (d.type === "timed") { if (d.group === "Cardio") miles += +st.w || 0; } else { reps += +st.r || 0; volume += (+st.w || 0) * (+st.r || 0); } }); })); return { key: mk, xp: Object.entries(s.xpLog || {}).filter(([d]) => d.startsWith(mk)).reduce((a, [, v]) => a + v, 0), workouts: s.workouts.filter((w) => w.date.startsWith(mk) && w.source !== "quest").length, volume: Math.round(volume), reps, miles: Math.round(miles * 10) / 10 }; })(),
    uid: window.ascendUserId || null, tier: bestTier(s),
    season: { key: seasonKey(), xp: seasonXp(s, seasonKey()) }, prevSeason: { key: prevSeasonKey(seasonKey()), xp: seasonXp(s, prevSeasonKey(seasonKey())) },
    badges: s.seasonBadges || {},
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
  const [wIn, setWIn] = useState("");
  const [pick, setPick] = useState(null);
  const fileRef = useRef(null);
  const id = me ? s.playerId : targetId;
  const data = me ? profileCard(s) : card;

  const loadSocial = async () => {
    if (!window.storage?.list) return;
    const read = async (prefix) => {
      try {
        const res = await window.storage.list(prefix, true);
        const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? { key: k, ...JSON.parse(r.value) } : null; } catch { return null; } }));
        return items.filter(Boolean);
      } catch { return []; }
    };
    const [fives, comments] = await Promise.all([read(`hf:${id}:`), read(`cm:${id}:`)]);
    setSocial({ fives, comments: comments.sort((a, b) => (b.t || 0) - (a.t || 0)) });
  };
  useEffect(() => {
    (async () => {
      if (!me) {
        try { const r = await window.storage.get(`lb:${targetId}`, true); setCard(r?.value ? JSON.parse(r.value) : null); } catch { setCard(null); }
        setLoading(false);
      }
      loadSocial();
    })();
  }, [targetId]);

  const highFive = async () => {
    if (!s.lb || !s.profile.name) { setNote("Join the leaderboard first so people know who the high-five is from."); return; }
    setBusy(true);
    const key = `hf:${id}:${s.playerId}`;
    const mine = social.fives.find((f) => f.key === key);
    const rec = { n: (mine?.n || 0) + 1, name: s.profile.name, from: s.playerId, t: Date.now() };
    try { await window.storage.set(key, JSON.stringify(rec), true); setSocial((x) => ({ ...x, fives: [...x.fives.filter((f) => f.key !== key), { key, ...rec }] })); }
    catch { setNote("Couldn't send that. Check your connection."); }
    setBusy(false);
  };
  const postComment = async () => {
    const text = comment.trim().slice(0, 140);
    if (!text && !cImg) return;
    if (!s.lb || !s.profile.name) { setNote("Join the leaderboard first so your name shows on comments."); return; }
    setBusy(true);
    const t = Date.now(), key = `cm:${id}:${t}_${s.playerId}`;
    const rec = { text, img: cImg || null, name: s.profile.name, from: s.playerId, t };
    try { await window.storage.set(key, JSON.stringify(rec), true); setSocial((x) => ({ ...x, comments: [{ key, ...rec }, ...x.comments] })); setComment(""); setCImg(null); }
    catch { setNote("Couldn't post that. Check your connection."); }
    setBusy(false);
  };
  const deleteComment = async (c) => {
    try { await window.storage.delete(c.key, true); setSocial((x) => ({ ...x, comments: x.comments.filter((y) => y.key !== c.key) })); } catch { /* ignore */ }
  };
  const logWeight = () => {
    const w = +wIn; if (!w) return;
    const d = today();
    setS((p) => ({ ...p, profile: { ...p.profile, weight: w }, weightLog: { ...(p.weightLog || {}), [d]: w } }));
    setWIn("");
  };
  const [songBusy, setSongBusy] = useState(false);
  const [songLink, setSongLink] = useState("");
  const songRef = useRef(null);
  const onSong = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setSongBusy(true); setNote("");
    try {
      const clip = await makeClip(f);
      await window.storage.set("ascend-song", clip, false);
      if (s.lb) await window.storage.set(`song:${s.playerId}`, clip, true);
      setS((p) => ({ ...p, profile: { ...p.profile, song: { type: "clip", name: f.name.replace(/\.[^.]+$/, "").slice(0, 40) } } }));
    } catch (err) { setNote("Couldn't make a clip from that file. Try an mp3 or m4a."); }
    setSongBusy(false); e.target.value = "";
  };
  const saveLink = () => {
    const url = songLink.trim(); if (!/^https?:\/\//i.test(url)) return;
    setS((p) => ({ ...p, profile: { ...p.profile, song: { type: "link", url, name: songLinkLabel(url) } } })); setSongLink("");
  };
  const removeSong = async () => {
    setS((p) => ({ ...p, profile: { ...p.profile, song: null } }));
    try { await window.storage.delete("ascend-song", false); } catch (e) { /* none */ }
    try { await window.storage.delete(`song:${s.playerId}`, true); } catch (e) { /* none */ }
  };
  const [cImg, setCImg] = useState(null);
  const cImgRef = useRef(null);
  const onCommentPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { setCImg(await shrinkPhoto(f)); } catch (err) { setNote("Couldn't read that photo."); }
    e.target.value = "";
  };
  const [bigImg, setBigImg] = useState(null);
  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const src = await shrinkImage(f); setS((p) => ({ ...p, profile: { ...p.profile, avatar: src } })); }
    catch { setNote("Couldn't read that photo. Try a different one."); }
    e.target.value = "";
  };

  const fives = social.fives.reduce((a, f) => a + (f.n || 0), 0);
  const all = allAchievements();
  const earnedIds = new Set(data?.ach || []);
  const earned = all.filter((a) => earnedIds.has(a.id)), locked = all.filter((a) => !earnedIds.has(a.id));
  const rank = data ? RANKS.find((r) => r.id === data.rank) || RANKS[0] : RANKS[0];
  const st = data?.stats;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">{me ? "Your profile" : "Profile"}</h1>
      </div>

      {loading && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={16} className="animate-spin" />Loading profile…</div>}
      {!loading && !data && <Empty>This player isn't on the leaderboard anymore.</Empty>}

      {data && (
        <>
          <div className="panel p-5" style={lookStyle(data.look)}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar src={data.avatar} name={data.name} size={76} ring={data.look?.accent || rank.color} look={data.look} />
                {me && (
                  <>
                    <button aria-label="Change profile photo" onClick={() => fileRef.current?.click()} className="absolute flex items-center justify-center" style={{ right: -4, bottom: -4, width: 28, height: 28, borderRadius: 999, background: C.cyan, color: "#001018" }}><Camera size={15} /></button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold truncate"><FancyName name={data.name} look={data.look} className="glowtext" /></div>
                {data.title && <div className="text-xs font-bold tracking-wider uppercase" style={{ color: data.look?.accent || C.cyan }}>{data.title}</div>}
                {Object.keys(data.badges || {}).length > 0 && <div className="mt-1"><SeasonBadges badges={data.badges} /></div>}
                <div className="body text-sm" style={{ color: rank.color }}>{data.rank}{data.div ? ` ${data.div}` : ""} · Level {data.lvl}</div>
                <div className="body text-xs mt-0.5" style={{ color: C.dim }}>{(data.points || 0).toLocaleString()} pts · {data.streak} day streak{st?.since ? ` · since ${new Date(st.since + "T12:00").toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : ""}</div>
              </div>
            </div>
            {me && data.avatar && <button onClick={() => setS((p) => ({ ...p, profile: { ...p.profile, avatar: null } }))} className="body text-xs underline mt-3" style={{ color: C.mute }}>Remove photo</button>}
            <div className="flex items-center gap-3 flex-wrap mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-1 font-bold" style={{ color: C.gold }}><Hand size={18} />{fives} high-five{fives === 1 ? "" : "s"}</div>
              {!me && <button onClick={highFive} disabled={busy} className="btn px-4 py-2 text-sm flex items-center gap-1"><Hand size={16} />High five</button>}
              <SongPlayer playerId={id} meta={data.song} me={me} />
            </div>
          </div>

          {me && (
            <div className="panel p-4 space-y-3">
              <div className="font-bold">Customize your look</div>
              <div className="flex justify-center"><Physique tier={overallInfo(s).score} height={200} aura={s.profile.look?.aura} caption={`Physique · ${overallInfo(s).label}`} /></div>
              <div className="body text-xs" style={{ color: C.dim }}>Aura</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {AURAS.map((a) => { const ok = unlocked(a, s), sel = (s.profile.look?.aura || "none") === a.id; return <button key={a.id} disabled={!ok} title={a.how} onClick={() => setS((p) => ({ ...p, profile: { ...p.profile, look: { ...(p.profile.look || {}), aura: a.id } } }))} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5" style={{ borderRadius: 999, background: sel ? C.blue : C.glass, color: sel ? "#fff" : ok ? C.text : C.mute, border: `1px solid ${C.glassLine}`, opacity: ok ? 1 : 0.6 }}>{a.colors ? <span style={{ width: 10, height: 10, borderRadius: 999, background: `linear-gradient(135deg,${a.colors[0]},${a.colors[1]})` }} /> : null}{!ok && <Lock size={10} />}{a.name}</button>; })}
              </div>
              <div className="body text-xs" style={{ color: C.dim }}>Profile border</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {BORDERS.map((b) => { const ok = unlocked(b, s), sel = (s.profile.look?.border || "none") === b.id; return <button key={b.id} disabled={!ok} title={b.how} onClick={() => setS((p) => ({ ...p, profile: { ...p.profile, look: { ...(p.profile.look || {}), border: b.id } } }))} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5" style={{ borderRadius: 999, background: sel ? C.blue : C.glass, color: sel ? "#fff" : ok ? C.text : C.mute, border: `1px solid ${C.glassLine}`, opacity: ok ? 1 : 0.6 }}>{b.css ? <span style={{ width: 10, height: 10, borderRadius: 999, background: b.css }} /> : null}{!ok && <Lock size={10} />}{b.name}</button>; })}
              </div>
              <details className="body text-xs" style={{ color: C.mute }}><summary style={{ cursor: "pointer", color: C.dim }}>How to unlock auras and borders</summary>
                <div className="mt-1 space-y-0.5">{[...AURAS, ...BORDERS].filter((x) => x.how).map((x) => <div key={`${x.id}-${x.name}`} className="flex justify-between gap-2"><span style={{ color: unlocked(x, s) ? C.green : C.mute }}>{unlocked(x, s) ? "✓ " : ""}{x.name}</span><span>{x.how}</span></div>)}</div>
              </details>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {PROFILE_BGS.map((b) => (
                  <button key={b.id} aria-label={`${b.name} background`} onClick={() => setS((p) => ({ ...p, profile: { ...p.profile, look: { ...(p.profile.look || {}), bg: b.id } } }))} className="shrink-0 flex flex-col items-center gap-1">
                    <span style={{ width: 52, height: 36, borderRadius: 6, background: b.css || C.soft, border: `2px solid ${(s.profile.look?.bg || "none") === b.id ? C.cyan : C.border}` }} />
                    <span className="body text-xs" style={{ color: C.dim }}>{b.name}</span>
                  </button>
                ))}
              </div>
              <div className="body text-xs" style={{ color: C.dim }}>Name font</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {NAME_FONTS.map((f) => <button key={f.id} onClick={() => setS((p) => ({ ...p, profile: { ...p.profile, look: { ...(p.profile.look || {}), font: f.id } } }))} className="fancyname px-3 py-2 whitespace-nowrap shrink-0" style={{ fontFamily: f.family, "--nf": f.family, fontSize: f.id === "pixel" ? 11 : 15, borderRadius: 4, background: (s.profile.look?.font || "default") === f.id ? C.blue : C.soft, color: (s.profile.look?.font || "default") === f.id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{f.name}</button>)}
              </div>
              <div className="body text-xs" style={{ color: C.dim }}>Title <span style={{ color: C.mute }}>· {TITLES.filter((t) => t.req(s)).length} of {TITLES.length} unlocked</span></div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {TITLES.map((t) => { const ok = t.req(s), sel = (s.profile.title || "rookie") === t.id; return <button key={t.id} disabled={!ok} title={t.how} onClick={() => setS((p) => ({ ...p, profile: { ...p.profile, title: t.id } }))} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1" style={{ borderRadius: 999, background: sel ? C.blue : C.soft, color: sel ? "#fff" : ok ? C.text : C.mute, border: `1px solid ${C.border}`, opacity: ok ? 1 : 0.6 }}>{!ok && <Lock size={10} />}{t.name}</button>; })}
              </div>
              <details className="body text-xs" style={{ color: C.mute }}><summary style={{ cursor: "pointer", color: C.dim }}>How to earn every title</summary>
                <div className="grid grid-cols-1 gap-0.5 mt-1">{TITLES.map((t) => <div key={t.id} className="flex justify-between gap-2"><span style={{ color: t.req(s) ? C.green : C.mute }}>{t.req(s) ? "✓ " : ""}{t.name}</span><span className="text-right">{t.how}</span></div>)}</div>
              </details>
              <div className="body text-xs" style={{ color: C.dim }}>Name animation</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {NAME_ANIMS.map((a) => <button key={a.id} onClick={() => setS((p) => ({ ...p, profile: { ...p.profile, look: { ...(p.profile.look || {}), anim: a.id } } }))} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: (s.profile.look?.anim || "none") === a.id ? C.blue : C.soft, color: (s.profile.look?.anim || "none") === a.id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{a.name}</button>)}
              </div>
              <div className="flex items-center gap-3 body text-sm">
                <span style={{ color: C.dim }}>Name color</span>
                <input type="color" value={s.profile.look?.accent || "#00D9FF"} onChange={(e) => setS((p) => ({ ...p, profile: { ...p.profile, look: { ...(p.profile.look || {}), accent: e.target.value } } }))} aria-label="Accent color" style={{ width: 44, height: 32, border: `1px solid ${C.border}`, borderRadius: 4, background: "transparent" }} />
                {s.profile.look?.accent && <button onClick={() => setS((p) => ({ ...p, profile: { ...p.profile, look: { ...(p.profile.look || {}), accent: null } } }))} className="underline text-xs" style={{ color: C.mute }}>Reset</button>}
              </div>
              <div className="neonline" />
              <div className="font-bold flex items-center gap-2"><Music size={16} />Theme song</div>
              {s.profile.song && <div className="body text-sm" style={{ color: C.sub }}>Current: {s.profile.song.type === "link" ? `${songLinkLabel(s.profile.song.url)} link` : s.profile.song.type === "theme" ? `${s.profile.song.name} (built-in)` : `${s.profile.song.name || "clip"} (20 sec clip)`} <button onClick={removeSong} className="underline ml-2" style={{ color: C.red }}>Remove</button></div>}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => songRef.current?.click()} disabled={songBusy} className="ghost py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}>{songBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{songBusy ? "Making clip…" : "Upload mp3"}</button>
                <input ref={songRef} type="file" accept=".mp3,.m4a,.aac,.wav,.ogg,.flac,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/*" onChange={onSong} style={{ display: "none" }} />
                <div className="flex gap-1">
                  <input className="inp text-sm" placeholder="YouTube / Spotify / Apple Music link" value={songLink} onChange={(e) => setSongLink(e.target.value)} />
                  <button onClick={saveLink} disabled={!/^https?:\/\//i.test(songLink.trim())} className="btn px-3 text-sm">Set</button>
                </div>
              </div>
              <div className="body text-xs" style={{ color: C.dim }}>Or pick a built-in theme (tap to preview, tap again to stop):</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {Object.entries(THEMES_MUSIC).map(([id, t]) => { const sel = s.profile.song?.type === "theme" && s.profile.song.id === id; return (
                  <button key={id} onClick={() => { if (Jingle.id === id) { Jingle.stop(); } else { Jingle.start(id); } setS((p) => ({ ...p, profile: { ...p.profile, song: { type: "theme", id, name: t.name } } })); }} className="px-3 py-2 text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1" style={{ borderRadius: 999, background: sel ? C.blue : C.soft, color: sel ? "#fff" : C.text, border: `1px solid ${C.border}` }}><Music size={12} />{t.name}</button>
                ); })}
              </div>
              <div className="body text-xs" style={{ color: C.mute }}>Uploads keep the first 20 seconds as a small clip. YouTube, Spotify, and Apple Music links play right inside your profile.</div>
            </div>
          )}

          {st && (
            <div className="grid grid-cols-3 gap-2">
              {[["Workouts", st.workouts], ["Lifted", `${st.volume >= 1000000 ? `${(st.volume / 1000000).toFixed(1)}M` : `${Math.round(st.volume / 1000)}k`} lb`], ["Reps", st.reps.toLocaleString()], ["Miles", st.miles], ["Longest streak", `${st.longestStreak}d`], ["Quests", st.quests], ["Bench", st.bench ? `${st.bench} lb` : "–"], ["Squat", st.squat ? `${st.squat} lb` : "–"], ["Deadlift", st.deadlift ? `${st.deadlift} lb` : "–"]].map(([l, v]) => (
                <div key={l} className="panel py-3 px-2 text-center"><div className="text-xs body" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold glowtext">{v}</div></div>
              ))}
            </div>
          )}

          <h2 className="text-lg font-bold">Achievements <span className="body text-sm font-normal" style={{ color: C.dim }}>{earned.length} / {all.length}</span></h2>
          {pick && (
            <div className="panel p-3 body text-sm" style={{ borderColor: TIER_STYLE[pick.tier].color }}>
              <div className="font-bold" style={{ color: TIER_STYLE[pick.tier].color }}>{pick.title} · {TIER_STYLE[pick.tier].name}</div>
              <div>{pick.desc}</div>
              <div className="text-xs mt-1" style={{ color: C.gold }}>+{pick.xp} XP{earnedIds.has(pick.id) ? " · earned" : ""}</div>
              {!earnedIds.has(pick.id) && st && typeof pick.series.get(st) === "number" && (
                <div className="mt-2"><Bar pct={(pick.series.get(st) / pick.value) * 100} color={TIER_STYLE[pick.tier].color} /><div className="text-xs mt-1" style={{ color: C.dim }}>{Math.floor(pick.series.get(st)).toLocaleString()} / {pick.value.toLocaleString()} {pick.series.unit}</div></div>
              )}
            </div>
          )}
          <div className="panel p-3">
            {earned.length === 0 && <div className="body text-sm mb-2" style={{ color: C.dim }}>Nothing earned yet. Tap a locked badge to see what it takes.</div>}
            <div className="flex flex-wrap gap-1 justify-center">
              {[...earned.sort((a, b) => b.tier - a.tier), ...locked].map((a) => <AchBadge key={a.id} a={a} earned={earnedIds.has(a.id)} onClick={() => setPick(a)} />)}
            </div>
          </div>

          {me && (
            <>
              <h2 className="text-lg font-bold">Body</h2>
              <ProgressPhotos s={s} />
              <Measurements s={s} setS={setS} />
            </>
          )}
          {me && <StepsPanel s={s} setS={setS} gainXp={gainXp} />}
          <h2 className="text-lg font-bold">Weight over time</h2>
          <div className="panel p-4 space-y-3">
            {me && (
              <div className="flex gap-2 items-center">
                <input type="number" inputMode="decimal" className="inp" placeholder={`Today's weight (now ${s.profile.weight} lb)`} value={wIn} onChange={(e) => setWIn(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logWeight()} />
                <button onClick={logWeight} disabled={!+wIn} className="btn px-4 py-2 text-sm whitespace-nowrap" style={!+wIn ? { opacity: 0.5 } : null}>Log</button>
              </div>
            )}
            <WeightChart log={data.weightLog} target={data.goal} />
          </div>

          {data.lifts?.length > 0 && (
            <>
              <h2 className="text-lg font-bold">Top lifts</h2>
              <div className="space-y-2">
                {data.lifts.map((l) => { const r = RANKS.find((x) => x.id === l.rank) || RANKS[0]; return (
                  <div key={l.name} className="panel p-3 flex items-center gap-3"><RankBadge rank={r} size={30} /><span className="flex-1 font-semibold ml-1">{l.name}</span><span className="font-bold" style={{ color: r.color }}>{l.label}</span><span className="body text-xs" style={{ color: C.dim }}>{l.best}{l.bw ? " reps" : " lb"}</span></div>
                ); })}
              </div>
            </>
          )}

          {!me && <div className="flex justify-center"><Physique tier={data.tier ?? (RANKS.findIndex((r) => r.id === data.rank) || 0)} height={220} aura={data.look?.aura} caption={`${data.name}'s physique`} /></div>}
          {!me ? <VersusPanel s={s} data={data} me={me} id={id} setS={setS} gainXp={gainXp} /> : <MogSection s={s} setS={setS} gainXp={gainXp} me={me} targetId={id} targetName={data.name} />}

          <h2 className="text-lg font-bold flex items-center gap-2"><MessageCircle size={18} />Comments</h2>
          {note && <div className="body text-sm" style={{ color: C.orange }}>{note}</div>}
          {!me && (
            <div className="panel p-2 space-y-2">
              {cImg && <div className="flex items-center gap-2"><img src={cImg} alt="" style={{ height: 64, borderRadius: 6 }} /><button onClick={() => setCImg(null)} aria-label="Remove photo" className="ghost p-1"><X size={14} /></button></div>}
              <div className="flex gap-2">
                <button aria-label="Add a photo" onClick={() => cImgRef.current?.click()} className="ghost px-3 flex items-center" style={{ color: cImg ? C.green : C.cyan }}><ImageIcon size={18} /></button>
                <input ref={cImgRef} type="file" accept="image/*" onChange={onCommentPhoto} style={{ display: "none" }} />
                <input className="inp" placeholder="Say something (140 max)" maxLength={140} value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && postComment()} />
                <button onClick={postComment} disabled={busy || (!comment.trim() && !cImg)} className="btn px-4 py-2 text-sm">Post</button>
              </div>
            </div>
          )}
          {social.comments.length === 0 && <Empty>{me ? "No comments yet. When your cousins visit your profile from the Board tab, they can leave one." : "Be the first to leave a comment."}</Empty>}
          <div className="space-y-2">
            {social.comments.map((c) => (
              <div key={c.key} className="panel p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-sm">{c.name}<span className="body text-xs font-normal ml-2" style={{ color: C.mute }}>{new Date(c.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
                  {(me || c.from === s.playerId) && <button aria-label="Delete comment" onClick={() => ask("Delete this comment?", () => deleteComment(c), "Delete")} style={{ color: C.mute }}><Trash2 size={14} /></button>}
                </div>
                {c.text && <div className="body text-sm mt-1" style={{ color: C.sub }}>{c.text}</div>}
                {c.img && <button onClick={() => setBigImg(bigImg === c.key ? null : c.key)} className="mt-2 block"><img src={c.img} alt="Photo in comment" style={{ maxHeight: bigImg === c.key ? 400 : 120, maxWidth: "100%", borderRadius: 6, border: `1px solid ${C.border}` }} /></button>}
              </div>
            ))}
          </div>
          {social.fives.length > 0 && <div className="body text-xs" style={{ color: C.mute }}>High-fives from {social.fives.map((f) => `${f.name} (${f.n})`).join(", ")}</div>}
        </>
      )}
    </div>
  );
}

/* ---------- Name fonts + animations ---------- */
const NAME_FONTS = [
  { id: "default", name: "Ascend", family: "'Oxanium', sans-serif" },
  { id: "orbitron", name: "Orbitron", family: "'Orbitron', sans-serif" },
  { id: "bangers", name: "Comic", family: "'Bangers', cursive" },
  { id: "cinzel", name: "Royal", family: "'Cinzel', serif" },
  { id: "marker", name: "Marker", family: "'Permanent Marker', cursive" },
  { id: "pixel", name: "Pixel", family: "'Press Start 2P', monospace" },
  { id: "pacifico", name: "Script", family: "'Pacifico', cursive" },
  { id: "creepster", name: "Creepy", family: "'Creepster', cursive" },
];
const NAME_ANIMS = [
  { id: "none", name: "None" }, { id: "pulse", name: "Pulse" }, { id: "rainbow", name: "Rainbow" }, { id: "wave", name: "Wave" },
  { id: "wobble", name: "Wobble" }, { id: "flicker", name: "Flicker" }, { id: "float", name: "Float" }, { id: "shake", name: "Shake" },
];
function FancyName({ name, look, className = "", style = {}, size }) {
  const font = NAME_FONTS.find((f) => f.id === look?.font) || NAME_FONTS[0];
  const anim = look?.anim && look.anim !== "none" ? look.anim : null;
  const color = look?.accent || style.color;
  const base = { ...style, fontFamily: font.family, "--nf": font.family, color, fontSize: size, display: "inline-block", maxWidth: "100%" };
  className = `fancyname ${className}`;
  if (anim) className = className.replace("glowtext", "").trim();
  if (look?.font === "pixel") base.fontSize = size ? size * 0.7 : "0.8em";
  const text = name || "Unnamed";
  if (anim === "wave" || anim === "shake") {
    return (
      <span className={className} style={base} aria-label={text}>
        {[...text].map((ch, i) => <span key={i} aria-hidden="true" style={{ display: "inline-block", whiteSpace: "pre", animation: `nm-${anim} ${anim === "wave" ? 1.6 : 0.5}s ${i * (anim === "wave" ? 0.08 : 0.03)}s ease-in-out infinite` }}>{ch}</span>)}
      </span>
    );
  }
  const cls = anim ? `nm-${anim}` : "";
  if (anim === "rainbow") return <span className={`${className} ${cls}`} style={{ ...base, color: undefined }}>{text}</span>;
  return <span className={`${className} ${cls}`} style={{ ...base, "--nc": color || C.cyan }}>{text}</span>;
}

/* ---------- Rank emblems ---------- */
const darken = (hex, k = 0.45) => { const c = hexRgb(hex); return c ? `rgb(${c.map((v) => Math.round(v * k)).join(",")})` : hex; };
/* ---------- Meal builder ---------- */
function MealBuilder({ s, setS, pool, onDone, onBack }) {
  const [name, setName] = useState("");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const matches = q.trim().length > 1 ? pool.filter((f) => !f.meal && f.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const tot = items.reduce((a, it) => ({ cal: a.cal + it.cal * it.qty, p: a.p + it.p * it.qty, c: a.c + it.c * it.qty, f: a.f + it.f * it.qty }), { cal: 0, p: 0, c: 0, f: 0 });
  const add = (f, qty = 1) => { setItems((x) => [...x, { name: f.name, cal: +f.cal || 0, p: +f.p || 0, c: +f.c || 0, f: +f.f || 0, qty }]); setQ(""); };
  const build = async () => {
    setBusy(true); setErr("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: `Turn this description into a recipe with per-ingredient nutrition: "${desc}". Use typical US portions and standard nutrition values. Respond ONLY with JSON, no markdown: {"name": short meal name, "ingredients": [{"name": "ingredient with portion, e.g. Whey protein (1 scoop)", "cal": number, "p": grams protein, "c": grams carbs, "f": grams fat}]}` }] }),
      });
      const data = await res.json();
      const text = (data.content || []).map((i) => i.text || "").join("").replace(/```json|```/g, "").trim();
      const r = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
      if (!name.trim() && r.name) setName(String(r.name).slice(0, 50));
      (r.ingredients || []).forEach((it) => add(it, 1));
      setDesc("");
    } catch (e) { setErr("Couldn't build that. Try listing the ingredients, like \"2 scoops whey, banana, cup of milk, tbsp peanut butter\"."); }
    setBusy(false);
  };
  const save = () => {
    const meal = { name: name.trim() || "My meal", meal: true, ingredients: items, cal: Math.round(tot.cal), p: Math.round(tot.p), c: Math.round(tot.c), f: Math.round(tot.f), r: "Meals" };
    setS((x) => ({ ...x, savedFoods: [meal, ...(x.savedFoods || []).filter((y) => y.name !== meal.name)].slice(0, 80) }));
    publishShared(`food:${slug(meal.name)}`, { ...meal, by: s.profile.name || "a player", t: Date.now() });
    onDone(meal);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Create a meal</h1>
      </div>
      <div className="body text-sm" style={{ color: C.dim }}>Build a shake or a full meal once, and it saves with all its ingredients. It's shared with everyone, so your cousins can log it in one tap too.</div>
      <input className="inp font-bold" placeholder="Meal name, e.g. Post-workout shake" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="panel p-3 space-y-2">
        <div className="font-bold text-sm">Describe it and let AI fill the ingredients</div>
        <div className="flex gap-2">
          <input className="inp" placeholder="e.g. 2 scoops whey, banana, oats, milk" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && desc.trim() && build()} />
          <button onClick={build} disabled={busy || desc.trim().length < 3} className="btn px-3 text-sm flex items-center gap-1">{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}Build</button>
        </div>
        {err && <div className="body text-xs" style={{ color: C.red }}>{err}</div>}
      </div>

      <div className="panel p-3 space-y-2">
        <div className="font-bold text-sm">Or add ingredients from the food list</div>
        <input className="inp" placeholder="Search ingredients" value={q} onChange={(e) => setQ(e.target.value)} />
        {matches.map((f) => <button key={f.name} onClick={() => add(f)} className="ghost w-full text-left p-2 text-sm flex justify-between"><span>{f.name}</span><span style={{ color: C.dim }}>{f.cal} cal</span></button>)}
      </div>

      {items.length > 0 && (
        <div className="panel p-3 space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0"><div className="truncate font-semibold">{it.name}</div><div className="body text-xs" style={{ color: C.dim }}>{Math.round(it.cal * it.qty)} cal · P {Math.round(it.p * it.qty)} · C {Math.round(it.c * it.qty)} · F {Math.round(it.f * it.qty)}</div></div>
              <input type="number" step="0.5" min="0.5" className="inp text-center" style={{ width: 56 }} value={it.qty} aria-label="Quantity" onChange={(e) => setItems((x) => x.map((y, j) => j === i ? { ...y, qty: +e.target.value || 0 } : y))} />
              <button aria-label="Remove ingredient" onClick={() => setItems((x) => x.filter((_, j) => j !== i))} style={{ color: C.mute }}><X size={16} /></button>
            </div>
          ))}
          <div className="flex justify-between font-bold pt-2" style={{ borderTop: `1px solid ${C.line}` }}><span>Total</span><span style={{ color: C.gold }}>{Math.round(tot.cal)} cal · P {Math.round(tot.p)} · C {Math.round(tot.c)} · F {Math.round(tot.f)}</span></div>
        </div>
      )}
      <button onClick={save} disabled={!items.length} className="btn w-full py-3" style={!items.length ? { opacity: 0.5 } : null}>Save meal, share it, and log it</button>
    </div>
  );
}

/* ---------- Mog-off ---------- */
const MOG_XP = 10;
async function rateMog(dataUrl) {
  const b64data = dataUrl.split(",")[1];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 400,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64data } },
        { type: "text", text: `This is a silly game between friends called a mog-off. Judge ONLY the facial expression performance, never the person's looks. The goal is the classic fashion-model "Blue Steel" face: dead-serious stare, puffed fishy pouty lips, intense eyebrows, chin up, zero smile. Score each 0-20 as integers: pucker (fishy lips), brows (intensity), stare (seriousness of the eyes), jaw (chin/jaw drama), commitment (how fully they sold it, laughing or smiling loses points). Respond ONLY with JSON: {"pucker": n, "brows": n, "stare": n, "jaw": n, "commitment": n, "quip": "one short playful judge comment, under 12 words"}` },
      ] }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const r = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  const clamp = (v) => Math.max(0, Math.min(20, Math.round(+v || 0)));
  const parts = { pucker: clamp(r.pucker), brows: clamp(r.brows), stare: clamp(r.stare), jaw: clamp(r.jaw), commitment: clamp(r.commitment) };
  return { ...parts, total: Object.values(parts).reduce((a, b) => a + b, 0), quip: String(r.quip || "The judges have spoken.").slice(0, 80) };
}
function MogSection({ s, setS, gainXp, me, targetId, targetName, targetUid, embedded }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(null);
  const camRef = useRef(null);
  const pendingRef = useRef(null); // challenge being accepted, or null for a new challenge
  const load = async () => {
    if (!window.storage?.list) return;
    try {
      const res = await window.storage.list("mog:", true);
      const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? { key: k, ...JSON.parse(r.value) } : null; } catch { return null; } }));
      setList(items.filter((m) => m && (m.from === s.playerId || m.to === s.playerId)).sort((a, b) => (b.t || 0) - (a.t || 0)));
    } catch { /* offline */ }
  };
  useEffect(() => { load(); }, [targetId]);

  const snap = (pending) => { if (!s.lb || !s.profile.name) { setNote("Join the leaderboard first so the challenge has your name on it."); return; } pendingRef.current = pending; camRef.current?.click(); };
  const onShot = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true); setNote("");
    try {
      const img = await shrinkPhoto(f, 260);
      let score;
      try { score = await rateMog(img); } catch { const seed = img.length % 37; score = { pucker: 8 + seed % 9, brows: 6 + seed % 11, stare: 7 + seed % 10, jaw: 5 + seed % 12, commitment: 9 + seed % 8, quip: "The judge blinked, so this one's on vibes.", total: 0 }; score.total = score.pucker + score.brows + score.stare + score.jaw + score.commitment; }
      const entry = { ...score, img, name: s.profile.name, t: Date.now() };
      const pending = pendingRef.current;
      if (pending) {
        const winner = entry.total > pending.a.total ? s.playerId : entry.total < pending.a.total ? pending.from : "tie";
        const rec = { ...pending, b: entry, status: "done", winner };
        delete rec.key;
        await window.storage.set(pending.key, JSON.stringify(rec), true);
      } else {
        const id = uid();
        const rec = { id, from: s.playerId, fromUid: window.ascendUserId || null, fromName: s.profile.name, to: targetId, toUid: targetUid || null, toName: targetName, t: Date.now(), a: entry, b: null, status: "pending" };
        await window.storage.set(`mog:${id}`, JSON.stringify(rec), true);
      }
      await load();
    } catch (err) { setNote("Couldn't process that photo. Try again in better light."); }
    setBusy(false);
  };
  const claim = (m) => {
    setS((p) => ({ ...p, mogClaimed: { ...(p.mogClaimed || {}), [m.id]: true } }));
    gainXp(MOG_XP, "Mog-off win", `mog_${m.id}`);
  };
  const remove = async (m) => { try { await window.storage.delete(m.key, true); setList((l) => l.filter((x) => x.key !== m.key)); } catch { /* ignore */ } };
  const Face = ({ e, label, win }) => (
    <div className="flex-1 text-center">
      <img src={e.img} alt={`${label}'s mog`} style={{ width: "100%", maxWidth: 140, aspectRatio: "1", objectFit: "cover", borderRadius: 8, margin: "0 auto", border: `2px solid ${win ? C.gold : C.border}`, boxShadow: win ? `0 0 16px ${C.gold}` : "none" }} />
      <div className="font-bold text-sm mt-1 truncate">{label}</div>
      <div className="text-2xl font-extrabold glowtext" style={{ color: win ? C.gold : C.text }}>{e.total}</div>
      <div className="body text-xs" style={{ color: C.dim }}>lips {e.pucker} · brows {e.brows} · stare {e.stare} · jaw {e.jaw} · commit {e.commitment}</div>
      <div className="body text-xs italic mt-1" style={{ color: C.sub }}>"{e.quip}"</div>
    </div>
  );
  const rows = me ? list : list.filter((m) => (m.from === targetId || m.to === targetId));
  return (
    <div className="space-y-2">
      {!embedded && <h2 className="text-lg font-bold flex items-center gap-2"><Swords size={18} style={{ color: "#FF2D6F" }} />PvP · mog-offs</h2>}
      <input ref={camRef} type="file" accept="image/*" capture="user" onChange={onShot} style={{ display: "none" }} />
      {!me && (
        <button onClick={() => snap(null)} disabled={busy} className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}{busy ? "Judging your mog…" : `🐟 Mog-off ${targetName || "them"} (+${MOG_XP} XP)`}</button>
      )}
      {note && <div className="body text-sm" style={{ color: C.orange }}>{note}</div>}
      {me && rows.length === 0 && <Empty>No mog-offs yet. Open a cousin's profile from the Board tab and challenge them. When someone challenges you, it shows here and on your Status tab.</Empty>}
      {!s.lb && me && <div className="body text-xs" style={{ color: C.orange }}>Join the leaderboard (Board tab) to send and receive mog-offs.</div>}
      {rows.map((m) => {
        const iAmTarget = m.to === s.playerId, iAmFrom = m.from === s.playerId;
        const isOpen = open === m.key;
        return (
          <div key={m.key} className="panel p-3 space-y-2">
            <div className="flex justify-between items-center gap-2">
              <div className="font-bold text-sm truncate">{m.fromName} vs {m.toName}</div>
              <div className="body text-xs" style={{ color: C.dim }}>{new Date(m.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
            </div>
            {m.status === "pending" && iAmTarget && (
              <button onClick={() => snap(m)} disabled={busy} className="btn w-full py-3 flex items-center justify-center gap-2">{busy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}{busy ? "Judging…" : `Accept: mog back at ${m.fromName}`}</button>
            )}
            {m.status === "pending" && !iAmTarget && <div className="body text-sm" style={{ color: C.dim }}>Waiting for {m.toName} to accept. Your score: {m.a.total}.</div>}
            {m.status === "pending" && iAmTarget && <div className="body text-xs" style={{ color: C.dim }}>{m.fromName} scored {m.a.total}. Beat it to win {MOG_XP} XP.</div>}
            {m.status === "done" && (
              <>
                <div className="flex justify-end"><ReceiptButton label="Share result" make={() => buildReceipt({ s, kind: "Mog-off", headline: m.winner === "tie" ? "Dead heat" : `${m.winner === m.from ? m.fromName : m.toName} mogged`, sub: `${m.fromName} ${m.a.total} vs ${m.toName} ${m.b?.total ?? "–"}`, rows: [["Lips", `${m.a.pucker} vs ${m.b?.pucker ?? "–"}`], ["Brows", `${m.a.brows} vs ${m.b?.brows ?? "–"}`], ["Stare", `${m.a.stare} vs ${m.b?.stare ?? "–"}`], ["Commitment", `${m.a.commitment} vs ${m.b?.commitment ?? "–"}`]] })} /></div>
                <div className="text-center font-extrabold" style={{ color: C.gold }}>{m.winner === "tie" ? "It's a tie. Both mogged equally hard." : `${m.winner === m.from ? m.fromName : m.toName} wins the mog-off`}</div>
                <button onClick={() => setOpen(isOpen ? null : m.key)} className="body text-xs underline w-full" style={{ color: C.cyan }}>{isOpen ? "Hide faces" : "Show the faces and scores"}</button>
                {isOpen && <div className="flex gap-3"><Face e={m.a} label={m.fromName} win={m.winner === m.from} /><Face e={m.b} label={m.toName} win={m.winner === m.to} /></div>}
                {m.winner === s.playerId && !(s.mogClaimed || {})[m.id] && <button onClick={() => claim(m)} className="w-full py-2 font-bold" style={{ borderRadius: 4, background: C.gold, color: "#0A1630" }}>Claim +{MOG_XP} XP</button>}
              </>
            )}
            {(iAmFrom || iAmTarget) && me && <button onClick={() => ask("Delete this mog-off?", () => remove(m), "Delete")} className="body text-xs underline" style={{ color: C.mute }}>Delete</button>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Sterling coaching cards ---------- */
async function askJson(system, user, maxTokens = 900) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
}
const STERLING_SYS = "You are Sterling, the wildly over-the-top but genuinely competent British butler coach inside the Ascend gym app. Be brief and funny in the quip fields, but keep every recommendation accurate and practical.";

// Pops up on the Fuel tab once most of the day's calories are in, with foods that finish the macros
function FuelCoach({ s, setS, t, tot, onAdd }) {
  const [state, setState] = useState({ status: "idle", picks: [], quip: "" });
  const [hidden, setHidden] = useState(false);
  const remCal = Math.round(t.cal - tot.cal), remP = Math.round(t.protein - tot.p), remC = Math.round(t.carbs - tot.c), remF = Math.round(t.fat - tot.f);
  const close = tot.cal >= t.cal * 0.55 && remCal > 80;
  const key = `${Math.round(tot.cal / 150)}-${Math.round(tot.p / 15)}`;
  const fetchedKey = useRef(null);
  const fetchPicks = async () => {
    setState((x) => ({ ...x, status: "loading" }));
    const menu = [...(s.savedFoods || []), ...(s.community?.foods || []), ...FOODS].map((f) => `${f.name} (${f.cal} cal, P${f.p} C${f.c} F${f.f})`).slice(0, 90).join("; ");
    try {
      const r = await askJson(STERLING_SYS, `The user has ${remCal} calories, ${remP}g protein, ${remC}g carbs and ${remF}g fat left today (negative means over). Goal: ${GOALS.find((g) => g.id === s.profile.goal)?.label}. Suggest 3 things to eat that land them close to their targets, preferring items from this list when they fit: ${menu}. You may also suggest simple common foods. Respond ONLY with JSON: {"quip": "one short funny line", "picks": [{"name": "food with portion", "cal": n, "p": n, "c": n, "f": n, "why": "under 10 words"}]}`);
      setState({ status: "done", picks: (r.picks || []).slice(0, 3).map((p) => ({ name: String(p.name).slice(0, 60), cal: Math.round(+p.cal || 0), p: Math.round(+p.p || 0), c: Math.round(+p.c || 0), f: Math.round(+p.f || 0), why: p.why || "" })), quip: r.quip || "" });
    } catch (e) { setState({ status: "error", picks: [], quip: "" }); }
  };
  useEffect(() => { if (close && !hidden && fetchedKey.current !== key) { fetchedKey.current = key; fetchPicks(); } }, [close, key, hidden]);
  if (!close || hidden) return null;
  return (
    <div className="panel p-4 space-y-2" style={{ borderColor: C.cyan }}>
      <div className="flex justify-between items-center">
        <div className="font-bold flex items-center gap-2"><Bot size={18} style={{ color: C.cyan }} />Sterling: finish your macros</div>
        <button aria-label="Hide" onClick={() => setHidden(true)} style={{ color: C.mute }}><X size={16} /></button>
      </div>
      <div className="body text-xs" style={{ color: C.dim }}>Left today: {remCal} cal · P {remP}g · C {remC}g · F {remF}g</div>
      {state.status === "loading" && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Sterling is rummaging through the pantry…</div>}
      {state.status === "error" && <button onClick={fetchPicks} className="ghost w-full py-2 text-sm">Couldn't reach Sterling. Try again</button>}
      {state.quip && <div className="body text-sm italic" style={{ color: C.sub }}>"{state.quip}"</div>}
      {state.picks.map((p, i) => (
        <div key={i} className="ghost p-2 flex items-center gap-2">
          <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{p.name}</div><div className="body text-xs" style={{ color: C.dim }}>{p.cal} cal · P {p.p} · C {p.c} · F {p.f}{p.why ? ` · ${p.why}` : ""}</div></div>
          <button onClick={() => onAdd(p)} className="btn px-3 py-1.5 text-xs">Log</button>
        </div>
      ))}
      {state.status === "done" && <button onClick={fetchPicks} className="body text-xs underline" style={{ color: C.mute }}>Different ideas</button>}
    </div>
  );
}

// Shows during a workout with what to do next and a form-check video when it matters
function TrainCoach({ s, a, onAdd }) {
  const [state, setState] = useState({ status: "idle", next: [], tip: "", form: null, quip: "" });
  const [hidden, setHidden] = useState(false);
  const doneEx = a.exercises.filter((e) => e.sets.some((st) => st.done && +st.r > 0));
  const key = `${a.title || ""}|${doneEx.map((e) => `${e.name}:${e.sets.filter((st) => st.done).length}`).join(",")}`;
  const fetchedKey = useRef(null);
  const fetchNext = async () => {
    setState((x) => ({ ...x, status: "loading" }));
    const done = doneEx.map((e) => { const def = findEx(s, e.name); return `${e.name}: ${e.sets.filter((st) => st.done).map((st) => setLabel(def, st)).join(", ")}`; }).join(" | ");
    const names = allExercises(s).map((e) => e.name).join(", ");
    const history = s.workouts.filter((w) => w.source !== "quest").slice(-6).map((w) => `${w.date}${w.title ? ` (${w.title})` : ""}: ${w.exercises.map((e) => e.name).join(", ")}`).join("\n");
    const ranks = rankedLifts(s).slice(0, 10).map((r) => `${r.e.name} ${r.label}`).join(", ");
    try {
      const r = await askJson(STERLING_SYS, `Workout title: "${a.title || "untitled"}". Done so far this session: ${done || "nothing yet"}. Recent workouts:\n${history || "none"}\nLift ranks: ${ranks || "none"}. Bodyweight ${s.profile.weight} lb.
Recommend what to do next to make this workout as effective as possible for the stated title (balance muscle groups, sensible order, reasonable volume, don't repeat what's done unless more sets are warranted). Choose exercise names ONLY from this list, spelled exactly: ${names}.
Respond ONLY with JSON: {"quip": "one short funny line", "tip": "one sentence of practical advice about the session so far", "next": [{"exercise": "exact name from list", "sets": n, "reps": "e.g. 8-10", "why": "under 10 words"}], "form": "exact exercise name from what they've done that most commonly needs form correction, or null"}`);
      const valid = new Set(allExercises(s).map((e) => e.name));
      setState({ status: "done", quip: r.quip || "", tip: r.tip || "", form: valid.has(r.form) ? r.form : null, next: (r.next || []).filter((n) => valid.has(n.exercise)).slice(0, 3) });
    } catch (e) { setState({ status: "error", next: [], tip: "", form: null, quip: "" }); }
  };
  useEffect(() => {
    if (hidden || doneEx.length === 0 || fetchedKey.current === key) return;
    const t = setTimeout(() => { fetchedKey.current = key; fetchNext(); }, 2500);
    return () => clearTimeout(t);
  }, [key, hidden]);
  if (hidden || doneEx.length === 0 || a.editId) return null;
  return (
    <div className="panel p-4 space-y-2" style={{ borderColor: C.cyan }}>
      <div className="flex justify-between items-center">
        <div className="font-bold flex items-center gap-2"><Bot size={18} style={{ color: C.cyan }} />Sterling: what's next</div>
        <button aria-label="Hide" onClick={() => setHidden(true)} style={{ color: C.mute }}><X size={16} /></button>
      </div>
      {state.status === "loading" && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Sterling is consulting the ancient scrolls…</div>}
      {state.status === "error" && <button onClick={fetchNext} className="ghost w-full py-2 text-sm">Couldn't reach Sterling. Try again</button>}
      {state.quip && <div className="body text-sm italic" style={{ color: C.sub }}>"{state.quip}"</div>}
      {state.tip && <div className="body text-sm" style={{ color: C.text }}>{state.tip}</div>}
      {state.next.map((n, i) => {
        const already = a.exercises.some((e) => e.name === n.exercise);
        return (
          <div key={i} className="ghost p-2 flex items-center gap-2">
            <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{n.exercise}</div><div className="body text-xs" style={{ color: C.dim }}>{n.sets} × {n.reps}{n.why ? ` · ${n.why}` : ""}</div></div>
            <a href={ytUrl(n.exercise)} target="_blank" rel="noreferrer" aria-label={`How to ${n.exercise}`} className="px-2" style={{ color: C.mute }}><Youtube size={16} /></a>
            <button onClick={() => onAdd(n.exercise, +n.sets || 3)} className="btn px-3 py-1.5 text-xs">{already ? "Add sets" : "Add"}</button>
          </div>
        );
      })}
      {state.form && <a href={ytUrl(state.form)} target="_blank" rel="noreferrer" className="ghost w-full py-2 text-sm font-semibold flex items-center justify-center gap-2" style={{ color: C.orange }}><Youtube size={16} />Form check: {state.form}</a>}
    </div>
  );
}

const WORKOUT_TITLES = ["Push", "Pull", "Legs", "Upper", "Lower", "Full body", "Chest & back", "Arms", "Shoulders", "Core", "Cardio"];
function TitlePicker({ onPick, onBack }) {
  const [custom, setCustom] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">What are you training?</h1>
      </div>
      <div className="body text-sm" style={{ color: C.dim }}>The title helps Sterling plan your next moves and keeps your history sorted.</div>
      <div className="grid grid-cols-3 gap-2">
        {WORKOUT_TITLES.map((t) => <button key={t} onClick={() => onPick(t)} className="ghost py-3 font-bold text-sm">{t}</button>)}
      </div>
      <div className="flex gap-2">
        <input autoFocus className="inp" placeholder="Or type your own" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onPick(custom.trim())} />
        <button onClick={() => onPick(custom.trim())} className="btn px-4 text-sm">Go</button>
      </div>
      <button onClick={() => onPick("")} className="body text-sm underline w-full" style={{ color: C.mute }}>Skip, no title</button>
    </div>
  );
}

// Pending mog-off challenges, shown on the Status tab so nobody misses one
function MogInbox({ s, openProfile }) {
  const [pending, setPending] = useState([]);
  useEffect(() => {
    (async () => {
      if (!window.storage?.list || !s.lb) return;
      try {
        const res = await window.storage.list("mog:", true);
        const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } }));
        setPending(items.filter((m) => m && m.status === "pending" && m.to === s.playerId));
      } catch { /* offline */ }
    })();
  }, [s.lb, s.playerId]);
  if (!pending.length) return null;
  return (
    <button onClick={() => openProfile()} className="panel p-3 w-full text-left flex items-center gap-3" style={{ borderColor: C.gold }}>
      <span className="text-2xl">🐟</span>
      <div className="flex-1">
        <div className="font-bold" style={{ color: C.gold }}>{pending.length === 1 ? `${pending[0].fromName} challenged you to a mog-off` : `${pending.length} mog-off challenges waiting`}</div>
        <div className="body text-xs" style={{ color: C.dim }}>Tap to open your profile and mog back.</div>
      </div>
      <ChevronRight size={18} style={{ color: C.gold }} />
    </button>
  );
}

/* ---------- Rank emblems v3 ---------- */
function RankBadge({ rank, size = 44, still = false }) {
  const tier = Math.max(0, RANKS.indexOf(rank));
  const id = `rk${rank.id}`;
  const hex = (r, cx = 50, cy = 50, rot = 0) => Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i - Math.PI / 2 + rot; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
  const anim = !still;
  const c2 = rank.alt || rank.color;
  const sparks = tier >= 3 ? 6 + tier * 2 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0" role="img" aria-label={`${rank.id} rank`} style={{ filter: `drop-shadow(0 0 ${5 + tier * 3}px ${rank.glow})`, overflow: "visible" }}>
      <defs>
        <radialGradient id={`${id}core`} cx="50%" cy="42%" r="60%"><stop offset="0" stopColor="#fff" stopOpacity={0.35 + tier * 0.08} /><stop offset=".35" stopColor={rank.color} stopOpacity=".55" /><stop offset="1" stopColor="#02040c" /></radialGradient>
        <linearGradient id={`${id}ring`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset=".3" stopColor={rank.color} /><stop offset=".65" stopColor={c2} /><stop offset="1" stopColor="#fff" /></linearGradient>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".4" stopColor={rank.color} /><stop offset=".55" stopColor={darken(rank.color, 0.55)} /><stop offset=".75" stopColor={c2} /><stop offset="1" stopColor="#ffffff" /></linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".7" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id={`${id}c`}><polygon points={hex(42)} /></clipPath>
      </defs>
      {tier >= 4 && (
        <g style={anim ? { transformOrigin: "50px 50px", animation: `rkspin ${16 - tier * 2}s linear infinite` } : null} opacity=".7">
          {Array.from({ length: 16 }, (_, i) => <line key={i} x1="50" y1="50" x2={50 + 66 * Math.cos((Math.PI / 8) * i)} y2={50 + 66 * Math.sin((Math.PI / 8) * i)} stroke={i % 2 ? c2 : rank.color} strokeWidth={i % 4 === 0 ? 3 : 1.2} strokeLinecap="round" opacity={i % 2 ? 0.5 : 0.95} />)}
        </g>
      )}
      {tier >= 5 && <circle cx="50" cy="50" r="58" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="2 14" opacity=".9" style={anim ? { transformOrigin: "50px 50px", animation: "rkspin 4s linear infinite reverse" } : null} />}
      {tier >= 2 && <polygon points={hex(52, 50, 50, Math.PI / 6)} fill="none" stroke={`url(#${id}ring)`} strokeWidth={tier >= 4 ? 2.5 : 1.5} strokeDasharray={tier >= 4 ? "18 8" : "8 8"} opacity=".9" style={anim ? { transformOrigin: "50px 50px", animation: `rkspin ${12 - tier}s linear infinite reverse` } : null} />}
      {tier >= 1 && <polygon points={hex(48)} fill="none" stroke={rank.color} strokeWidth="1" opacity=".5" style={anim ? { transformOrigin: "50px 50px", animation: `rkbreathe 2.6s ease-in-out infinite` } : null} />}
      <polygon points={hex(42)} fill={`url(#${id}core)`} stroke={`url(#${id}ring)`} strokeWidth="3.5" strokeLinejoin="round" />
      <polygon points={hex(34)} fill="none" stroke="#fff" strokeWidth={0.6 + tier * 0.25} opacity={0.25 + tier * 0.08} strokeDasharray={tier >= 3 ? "4 3" : "0"} style={anim && tier >= 3 ? { transformOrigin: "50px 50px", animation: "rkspin 20s linear infinite" } : null} />
      {tier >= 2 && <polygon points={hex(38, 50, 50, Math.PI / 6)} fill="none" stroke={c2} strokeWidth="1" opacity=".55" />}
      <text x="50" y="66" textAnchor="middle" fontSize="48" fontWeight="900" fontFamily="'Cinzel', 'Oxanium', serif" fill={`url(#${id}m)`} stroke={darken(rank.color, 0.3)} strokeWidth="1.4" paintOrder="stroke" style={anim && tier >= 1 ? { animation: `rkpulse ${3.5 - tier * 0.35}s ease-in-out infinite` } : null}>{rank.id}</text>
      {anim && tier >= 1 && <g clipPath={`url(#${id}c)`}><rect x="-60" y="0" width="34" height="100" fill={`url(#${id}s)`} transform="skewX(-22)" style={{ animation: `rkshine ${4.2 - tier * 0.45}s ease-in-out infinite` }} /></g>}
      {sparks > 0 && Array.from({ length: sparks }, (_, i) => {
        const a = (2 * Math.PI * i) / sparks, r = 46 + (i % 3) * 6;
        return <circle key={i} cx={50 + r * Math.cos(a)} cy={50 + r * Math.sin(a)} r={i % 3 === 0 ? 2.2 : 1.3} fill={i % 2 ? "#fff" : c2} style={anim ? { transformOrigin: "50px 50px", animation: `rkorbit ${7 + (i % 4) * 2}s linear infinite${i % 2 ? " reverse" : ""}, rktwinkle ${1 + (i % 5) * 0.3}s ease-in-out infinite` } : null} />;
      })}
      {tier >= 5 && <circle cx="50" cy="50" r="30" fill="none" stroke="#fff" strokeWidth="6" opacity=".18" style={anim ? { transformOrigin: "50px 50px", animation: "rkhalo 2.2s ease-out infinite" } : null} />}
    </svg>
  );
}

/* ---------- Muscle pages ---------- */
const MUSCLE_INFO = {
  Chest: { name: "Chest", key: ["Bench Press", "Incline Bench Press", "Dumbbell Press"], tips: ["Anchor the group on a heavy press (barbell or dumbbell) for 3–5 sets of 5–8, adding weight or a rep every week.", "Add an incline press for the upper chest and a fly or cable crossover for a stretch under load.", "Chest rank uses your best press. Push the estimated max up with heavier low-rep sets, not just more volume."] },
  Back: { name: "Back", key: ["Deadlift", "Barbell Row", "Pull-up", "Lat Pulldown"], tips: ["Pull twice as much as you push: one vertical pull (pull-ups or pulldowns) and one horizontal pull (rows) every week.", "Deadlift or trap-bar deadlift moves this rank fastest because its factor is the highest of any lift.", "Log weighted pull-ups with the added weight in the +lb column, it counts extra."] },
  Legs: { name: "Legs", key: ["Squat", "Leg Press", "Romanian Deadlift", "Hack Squat"], tips: ["Squat or hack squat heavy once a week, then a second lighter leg day with leg press, RDLs, and single-leg work.", "Legs count the most toward overall rank, so this is the highest-value muscle group to grind.", "Leg press numbers need to be big to rank: the machine's threshold is 2.4× your bench standard."] },
  Shoulders: { name: "Shoulders", key: ["Overhead Press", "Dumbbell Shoulder Press", "Lateral Raise"], tips: ["Overhead press is the rank driver here. Press standing, strict, 4–5 sets of 5–8.", "Lateral raises and rear delt work add width but rank slowly; their thresholds are strict on purpose.", "Shoulders are held to a 25% stricter standard, so expect this group to lag your chest by a rank or so."] },
  Arms: { name: "Arms", key: ["Barbell Curl", "Tricep Pushdown", "Close-Grip Bench Press"], tips: ["Barbell curl and close-grip bench move arm rank fastest, they have the highest factors in the group.", "Two exercises each for biceps and triceps, 3 sets of 8–12, and add a little weight every week.", "Arms only count 8% of overall rank, so treat this as the finisher, not the priority."] },
  Core: { name: "Core", key: ["Cable Crunch", "Hanging Leg Raise", "Ab Crunch Machine"], tips: ["Weighted core work ranks: cable crunches or the crunch machine with real load, 3 sets of 10–15.", "Hanging leg raises count by reps. Strict, slow reps with no swing.", "Planks and holds earn XP but don't affect rank since they're timed."] },
};
function MuscleFigure({ group, score, color }) {
  const k = 1 + Math.min(6, score) * 0.11; // muscles grow with rank
  const def = 0.15 + Math.min(6, score) * 0.12; // definition lines get sharper
  const on = (g) => g === group;
  const base = C.mute, skin = "#1a2436";
  const M = (g, el) => <g style={{ transformOrigin: "100px 130px", transform: on(g) ? `scale(${k})` : "none", transition: "transform .6s" }} opacity={on(g) ? 1 : 0.35}>{el}</g>;
  const fill = (g) => (on(g) ? color : base);
  const lat = on("Back") ? 12 * (k - 1) + 4 : 0;
  return (
    <svg viewBox="0 0 200 300" width="100%" style={{ maxHeight: 340 }} role="img" aria-label={`${group} muscle model`}>
      <defs>
        <radialGradient id="mgl" cx="50%" cy="45%" r="50%"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient>
        <linearGradient id="msk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3852" /><stop offset="1" stopColor={skin} /></linearGradient>
      </defs>
      <circle cx="100" cy="130" r="120" fill="url(#mgl)" />
      {/* body silhouette */}
      <circle cx="100" cy="36" r="17" fill="url(#msk)" />
      <rect x="93" y="50" width="14" height="14" fill="url(#msk)" />
      <path d={`M${60 - lat},70 Q100,58 ${140 + lat},70 L${132 + lat * 0.4},150 Q100,165 ${68 - lat * 0.4},150 Z`} fill="url(#msk)" stroke={on("Back") ? color : "none"} strokeWidth="2" />
      <path d="M72,152 Q100,160 128,152 L124,215 L106,215 L100,190 L94,215 L76,215 Z" fill="url(#msk)" />
      <path d="M78,216 L94,216 L92,290 L76,290 Z M106,216 L122,216 L124,290 L108,290 Z" fill="url(#msk)" />
      <path d={`M${58 - lat},72 Q42,80 38,120 L32,165 L46,168 L54,120 Q56,95 ${68 - lat},88 Z`} fill="url(#msk)" />
      <path d={`M${142 + lat},72 Q158,80 162,120 L168,165 L154,168 L146,120 Q144,95 ${132 + lat},88 Z`} fill="url(#msk)" />
      {/* muscle overlays */}
      {M("Shoulders", <><ellipse cx="62" cy="80" rx="15" ry="13" fill={fill("Shoulders")} /><ellipse cx="138" cy="80" rx="15" ry="13" fill={fill("Shoulders")} /></>)}
      {M("Chest", <><path d="M70,84 Q98,80 99,105 Q90,118 72,110 Z" fill={fill("Chest")} /><path d="M130,84 Q102,80 101,105 Q110,118 128,110 Z" fill={fill("Chest")} /><line x1="100" y1="84" x2="100" y2="112" stroke="#000" strokeOpacity={def} strokeWidth="1.5" /></>)}
      {M("Arms", <><ellipse cx="50" cy="112" rx="9" ry="20" fill={fill("Arms")} transform="rotate(8 50 112)" /><ellipse cx="150" cy="112" rx="9" ry="20" fill={fill("Arms")} transform="rotate(-8 150 112)" /><ellipse cx="42" cy="148" rx="7" ry="16" fill={fill("Arms")} opacity=".8" /><ellipse cx="158" cy="148" rx="7" ry="16" fill={fill("Arms")} opacity=".8" /></>)}
      {M("Core", <>{[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={90 + c * 11} y={118 + r * 13} width="9" height="11" rx="2" fill={fill("Core")} opacity={0.9 - r * 0.15} />))}<line x1="100" y1="116" x2="100" y2="156" stroke="#000" strokeOpacity={def} /></>)}
      {M("Legs", <><path d="M78,160 Q92,158 98,170 L96,212 L80,212 Z" fill={fill("Legs")} /><path d="M122,160 Q108,158 102,170 L104,212 L120,212 Z" fill={fill("Legs")} /><path d="M80,222 L92,222 L90,270 L80,270 Z" fill={fill("Legs")} opacity=".8" /><path d="M108,222 L120,222 L120,270 L110,270 Z" fill={fill("Legs")} opacity=".8" /></>)}
      {on("Back") && <>
        <path d={`M${64 - lat},72 L${76 - lat * 0.3},140 L100,150 L${124 + lat * 0.3},140 L${136 + lat},72 Q100,66 ${64 - lat},72 Z`} fill={color} opacity=".85" />
        <line x1="100" y1="70" x2="100" y2="150" stroke="#000" strokeOpacity={def + 0.2} strokeWidth="2" />
        {[0, 1, 2].map((i) => <line key={i} x1={78 - lat * 0.2} y1={88 + i * 18} x2={122 + lat * 0.2} y2={88 + i * 18} stroke="#000" strokeOpacity={def} />)}
      </>}
      {score > 0 && <g opacity={def}>{[74, 84, 94, 106, 116, 126].map((x) => <line key={x} x1={x} y1="160" x2={x} y2="164" stroke={color} strokeWidth="1" />)}</g>}
    </svg>
  );
}
function MusclePage({ s, group, onBack, openExercise }) {
  const [preview, setPreview] = useState(null);
  const info = MUSCLE_INFO[group] || { name: group, key: [], tips: [] };
  const sc = groupScores(s)[group] || 0;
  const r = rankFromScore(sc);
  const lifts = rankedLifts(s).filter((x) => x.e.group === group).sort((a, b) => b.score - a.score);
  const since30 = shift(today(), -30);
  let sets30 = 0, vol30 = 0, sessions30 = new Set(), volAll = 0;
  s.workouts.forEach((w) => w.exercises.forEach((ex) => { const d = findEx(s, ex.name); if (d.group !== group || d.type === "timed") return; const v = ex.sets.reduce((a, st) => a + (+st.w || 0) * (+st.r || 0), 0); volAll += v; if (w.date >= since30) { sets30 += ex.sets.length; vol30 += v; sessions30.add(w.date); } }));
  const [ai, setAi] = useState({ status: "idle", text: "", next: [] });
  const askAi = async () => {
    setAi({ status: "loading", text: "", next: [] });
    try {
      const rr = await askJson(STERLING_SYS, `Muscle group: ${group}. Current group rank ${sc ? r.label : "untrained"} (score ${sc.toFixed(2)} of 6). Lifts logged: ${lifts.map((x) => `${x.e.name} ${x.label} best ${Math.round(x.best)}${x.e.type === "bodyweight" ? " reps" : " lb est max"}${x.next ? `, next rank at ${x.next}` : ""}`).join("; ") || "none"}. Last 30 days: ${sessions30.size} sessions, ${sets30} sets, ${Math.round(vol30).toLocaleString()} lb volume. Bodyweight ${s.profile.weight} lb. Give a specific plan to raise this muscle group's rank. Respond ONLY with JSON: {"quip": "one funny line", "plan": "2-3 sentences of specific advice", "next": [{"exercise": "name", "scheme": "e.g. 4×6", "why": "under 10 words"}]}`);
      setAi({ status: "done", text: `${rr.quip ? `"${rr.quip}" ` : ""}${rr.plan || ""}`, next: (rr.next || []).slice(0, 3) });
    } catch (e) { setAi({ status: "error", text: "", next: [] }); }
  };
  const steps = [0, 1, 2, 3, 4, 5];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext flex-1">{info.name}</h1>
        <span className="font-extrabold text-xl" style={{ color: sc ? r.rank.color : C.mute, textShadow: `0 0 12px ${r.rank.glow}` }}>{sc ? r.label : "Untrained"}</span>
      </div>
      <div className="panel p-3">
        <MusclePhoto group={group} tier={preview ?? sc} height={300} />
        <div className="body text-xs text-center mb-2" style={{ color: preview !== null ? C.cyan : C.dim }}>{preview !== null ? `Preview: ${RANKS[preview].id}-rank ${info.name.toLowerCase()} · tap again to go back` : `Your ${info.name.toLowerCase()} at ${sc ? r.label : "untrained"} · tap a rank to preview`}</div>
        <div className="flex justify-between items-center px-1">
          {[0, 1, 2, 3, 4, 5, 6].map((t) => { const rk = RANKS[t]; const reached = sc >= t; return <button key={t} onClick={() => setPreview(preview === t ? null : t)} className="flex flex-col items-center gap-1" style={{ opacity: reached || preview === t ? 1 : 0.4, transform: preview === t ? "scale(1.15)" : "none", transition: "transform .2s" }}><RankBadge rank={rk} size={26} still /><span className="text-xs body" style={{ color: reached ? rk.color : C.mute }}>{rk.id}</span></button>; })}
        </div>
        <div className="mt-2"><Bar pct={(sc / 6) * 100} color={sc ? r.rank.color : C.mute} /></div>
        <div className="body text-xs mt-1" style={{ color: C.dim }}>The photo grows as your best lift in this group climbs. Group rank = your best-ranked lift here.</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[["Sessions (30d)", sessions30.size], ["Sets (30d)", sets30], ["Volume (30d)", `${Math.round(vol30 / 1000)}k lb`], ["Lifetime volume", volAll >= 1000000 ? `${(volAll / 1000000).toFixed(1)}M lb` : `${Math.round(volAll / 1000)}k lb`], ["Lifts ranked", lifts.length], ["Counts toward overall", `${Math.round(((GROUP_WEIGHT[group] || 0) / Object.values(GROUP_WEIGHT).reduce((a, b) => a + b, 0)) * 100)}%`]].map(([l, v]) => (
          <div key={l} className="panel py-3 px-2 text-center"><div className="text-xs body" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold glowtext">{v}</div></div>
        ))}
      </div>
      <h2 className="text-lg font-bold">Your lifts here</h2>
      {lifts.length === 0 && <Empty>Nothing logged for {info.name} yet. Start with {info.key.slice(0, 2).join(" or ")}.</Empty>}
      <div className="space-y-2">
        {lifts.map((x) => (
          <button key={x.e.name} onClick={() => openExercise?.(x.e.name)} className="panel p-3 flex items-center gap-3 w-full text-left">
            <RankBadge rank={x.rank} size={30} />
            <div className="flex-1 min-w-0"><div className="font-semibold truncate">{x.e.name}</div><div className="body text-xs" style={{ color: C.dim }}>Best {Math.round(x.best)}{x.e.type === "bodyweight" ? " reps" : " lb est. max"}{x.next ? ` · ${x.nextLabel} at ${x.next}` : " · maxed"}</div></div>
            <span className="font-bold" style={{ color: x.rank.color }}>{x.label}</span>
          </button>
        ))}
      </div>
      <h2 className="text-lg font-bold">How to rank up</h2>
      <div className="panel p-4 space-y-2">
        {info.tips.map((t, i) => <div key={i} className="body text-sm flex gap-2" style={{ color: C.sub }}><span style={{ color: C.cyan }}>▸</span><span>{t}</span></div>)}
        <div className="body text-xs pt-1" style={{ color: C.mute }}>Rank-driving lifts: {info.key.join(", ")}.</div>
      </div>
      <div className="panel p-4 space-y-2" style={{ borderColor: C.cyan }}>
        <div className="font-bold flex items-center gap-2"><Bot size={18} style={{ color: C.cyan }} />Sterling's plan for your {info.name.toLowerCase()}</div>
        {ai.status === "idle" && <button onClick={askAi} className="btn w-full py-2 text-sm">Build me a plan</button>}
        {ai.status === "loading" && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Sterling is measuring your {info.name.toLowerCase()} with a tape…</div>}
        {ai.status === "error" && <button onClick={askAi} className="ghost w-full py-2 text-sm">Couldn't reach Sterling. Try again</button>}
        {ai.text && <div className="body text-sm" style={{ color: C.text }}>{ai.text}</div>}
        {ai.next.map((n, i) => <div key={i} className="ghost p-2 flex items-center gap-2 text-sm"><div className="flex-1 min-w-0"><span className="font-semibold">{n.exercise}</span> <span style={{ color: C.dim }}>{n.scheme}{n.why ? ` · ${n.why}` : ""}</span></div><a href={ytUrl(n.exercise)} target="_blank" rel="noreferrer" aria-label={`How to ${n.exercise}`} style={{ color: C.mute }}><Youtube size={16} /></a></div>)}
        {ai.status === "done" && <button onClick={askAi} className="body text-xs underline" style={{ color: C.mute }}>New plan</button>}
      </div>
    </div>
  );
}

/* ---------- Weekly + monthly challenges ---------- */
const monthKey = (d = today()) => d.slice(0, 7);
const rangeStats = (s, from, to = "9999") => {
  const ws = s.workouts.filter((w) => w.date >= from && w.date <= to && w.source !== "quest");
  const groups = new Set();
  let volume = 0, prs = 0, miles = 0;
  ws.forEach((w) => { volume += w.volume || 0; prs += Math.round((w.prBonus || 0) / 40); w.exercises.forEach((ex) => { const d = findEx(s, ex.name); if (d.type !== "timed") groups.add(d.group); else if (d.group === "Cardio") ex.sets.forEach((st) => { miles += +st.w || 0; }); }); });
  const quests = Object.entries(s.days || {}).filter(([d]) => d >= from && d <= to).reduce((a, [, day]) => a + (day.list || []).filter((q) => q.claimed).length, 0);
  const fuel = Object.keys(s.fuelClaimed || {}).filter((d) => d >= from && d <= to).length;
  const xp = Object.entries(s.xpLog || {}).filter(([d]) => d >= from && d <= to).reduce((a, [, v]) => a + v, 0);
  const weights = Object.keys(s.weightLog || {}).filter((d) => d >= from && d <= to).length;
  const days = new Set(ws.map((w) => w.date));
  let best = 0, run = 0, prev = null;
  [...days].sort().forEach((d) => { run = prev && shift(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return { workouts: ws.length, volume, prs, miles, quests, fuel, xp, groups: groups.size, weights, streak: best };
};
const WEEKLY_POOL = [
  { id: "w-train4", title: "Train 4 times this week", target: 4, unit: "workouts", xp: 300, get: (st) => st.workouts, fixed: true },
  { id: "w-vol", title: "Move 25,000 lb this week", target: 25000, unit: "lb", xp: 350, get: (st) => st.volume },
  { id: "w-quests", title: "Clear 12 daily quests", target: 12, unit: "quests", xp: 300, get: (st) => st.quests },
  { id: "w-fuel", title: "Hit your fuel goal 4 days", target: 4, unit: "days", xp: 350, get: (st) => st.fuel },
  { id: "w-groups", title: "Train 5 different muscle groups", target: 5, unit: "groups", xp: 300, get: (st) => st.groups },
  { id: "w-prs", title: "Set 3 new PRs", target: 3, unit: "PRs", xp: 400, get: (st) => st.prs },
  { id: "w-miles", title: "Cover 8 miles of cardio", target: 8, unit: "mi", xp: 350, get: (st) => st.miles },
  { id: "w-streak", title: "Train 3 days in a row", target: 3, unit: "days", xp: 300, get: (st) => st.streak },
];
const MONTHLY_POOL = [
  { id: "m-train16", title: "16 workouts this month", target: 16, unit: "workouts", xp: 1500, get: (st) => st.workouts, fixed: true },
  { id: "m-vol", title: "Move 150,000 lb this month", target: 150000, unit: "lb", xp: 2000, get: (st) => st.volume },
  { id: "m-quests", title: "Clear 50 daily quests", target: 50, unit: "quests", xp: 1500, get: (st) => st.quests },
  { id: "m-fuel", title: "Hit your fuel goal 15 days", target: 15, unit: "days", xp: 2000, get: (st) => st.fuel },
  { id: "m-prs", title: "Set 10 new PRs", target: 10, unit: "PRs", xp: 2500, get: (st) => st.prs },
  { id: "m-miles", title: "Cover 30 miles of cardio", target: 30, unit: "mi", xp: 1800, get: (st) => st.miles },
  { id: "m-weigh", title: "Log your weight 12 days", target: 12, unit: "days", xp: 1000, get: (st) => st.weights },
  { id: "m-streak", title: "Train 7 days in a row", target: 7, unit: "days", xp: 2200, get: (st) => st.streak },
];
function pickChallenges(pool, seedStr, n) {
  let seed = [...seedStr].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const fixed = pool.filter((c) => c.fixed), rest = pool.filter((c) => !c.fixed), out = [...fixed];
  while (out.length < n && rest.length) { seed = (seed * 1103515245 + 12345) >>> 0; out.push(rest.splice(seed % rest.length, 1)[0]); }
  return out;
}
function ChallengeCard({ c, value, claimed, onClaim, color }) {
  const done = value >= c.target;
  const fmt = (v) => (c.unit === "lb" ? Math.round(v).toLocaleString() : c.unit === "mi" ? Math.round(v * 10) / 10 : Math.round(v));
  return (
    <div className="panel p-4" style={claimed ? { borderColor: "rgba(79,209,139,.55)" } : null}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex gap-3 items-center"><Trophy style={{ color }} /><div><div className="font-bold">{c.title}</div><div className="body text-sm" style={{ color: C.dim }}>{fmt(Math.min(value, c.target))} / {fmt(c.target)} {c.unit}</div></div></div>
        <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.gold }}>+{c.xp.toLocaleString()} XP</span>
      </div>
      <div className="my-3"><Bar pct={(value / c.target) * 100} color={claimed ? C.green : color} /></div>
      {claimed ? <div className="text-sm font-semibold flex items-center gap-1" style={{ color: C.green }}><Check size={16} />Cleared</div> :
        <button disabled={!done} onClick={onClaim} className="w-full py-2 font-bold" style={{ borderRadius: 4, background: done ? C.gold : C.soft, color: done ? "#0A1630" : C.mute, boxShadow: done ? "0 0 16px rgba(255,212,71,.5)" : "none" }}>Claim</button>}
    </div>
  );
}
function Challenges({ s, setS, gainXp }) {
  const ws = weekStart(), we = shift(ws, 6), mk = monthKey(), mStart = `${mk}-01`, mEnd = `${mk}-31`;
  const wst = rangeStats(s, ws, we), mst = rangeStats(s, mStart, mEnd);
  const weekly = pickChallenges(WEEKLY_POOL, ws, 3), monthly = pickChallenges(MONTHLY_POOL, mk, 3);
  const wc = s.weekly?.[ws]; const wClaimed = wc === true ? { "w-train4": true } : (wc || {});
  const mClaimed = s.monthly?.[mk] || {};
  const claimW = (c) => { setS((p) => { const cur = p.weekly?.[ws]; const obj = cur === true ? { "w-train4": true } : (cur || {}); return { ...p, weekly: { ...(p.weekly || {}), [ws]: { ...obj, [c.id]: true } } }; }); gainXp(c.xp, `Weekly: ${c.title}`, `wk_${ws}_${c.id}`); };
  const claimM = (c) => { setS((p) => ({ ...p, monthly: { ...(p.monthly || {}), [mk]: { ...(p.monthly?.[mk] || {}), [c.id]: true } } })); gainXp(c.xp, `Monthly: ${c.title}`, `mo_${mk}_${c.id}`); };
  const monthName = new Date(mStart + "T12:00").toLocaleDateString(undefined, { month: "long" });
  return (
    <>
      <h2 className="text-lg font-bold pt-2">Weekly challenges <span className="body text-sm font-normal" style={{ color: C.dim }}>resets Sunday</span></h2>
      {weekly.map((c) => <ChallengeCard key={c.id} c={c} value={c.get(wst)} claimed={!!wClaimed[c.id]} onClaim={() => claimW(c)} color={C.orange} />)}
      <h2 className="text-lg font-bold pt-2">{monthName} challenges <span className="body text-sm font-normal" style={{ color: C.dim }}>big XP</span></h2>
      {monthly.map((c) => <ChallengeCard key={c.id} c={c} value={c.get(mst)} claimed={!!mClaimed[c.id]} onClaim={() => claimM(c)} color="#B14BFF" />)}
      <div className="body text-xs" style={{ color: C.mute }}>Weekly and monthly progress is tracked automatically from your workouts, quests, fuel goals, and weigh-ins. New ones roll in every week and month.</div>
    </>
  );
}

/* ---------- Photo meal scanner ---------- */
async function scanMealPhoto(dataUrl) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 900,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: dataUrl.split(",")[1] } },
        { type: "text", text: `Identify the food in this photo and estimate nutrition for what is visible, as one serving each. Use typical US portions and standard nutrition values. Be practical, not cautious. If it's a packaged product with a label, read the label. Respond ONLY with JSON: {"items": [{"name": "food with portion, e.g. Grilled chicken breast (6 oz)", "cal": n, "p": n, "c": n, "f": n}], "note": "under 12 words about confidence or what you assumed"}` },
      ] }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const r = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  return { note: r.note || "", items: (r.items || []).map((it) => ({ name: String(it.name || "Food").slice(0, 60), cal: Math.round(+it.cal || 0), p: Math.round(+it.p || 0), c: Math.round(+it.c || 0), f: Math.round(+it.f || 0) })) };
}
function PhotoScan({ onAddAll, onCancel, sState, onShare }) {
  const camRef = useRef(null), libRef = useRef(null);
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true); setErr(""); setItems(null);
    try {
      const small = await shrinkPhoto(f, 900);
      setImg(small);
      const r = await scanMealPhoto(small);
      if (!r.items.length) throw new Error("nothing");
      setItems(r.items); setNote(r.note);
    } catch (e2) { setErr("Couldn't read a meal from that photo. Try a clearer shot from above with good light."); }
    setBusy(false);
  };
  const tot = (items || []).reduce((a, it) => ({ cal: a.cal + it.cal, p: a.p + it.p, c: a.c + it.c, f: a.f + it.f }), { cal: 0, p: 0, c: 0, f: 0 });
  const upd = (i, k, v) => setItems((x) => x.map((it, j) => (j === i ? { ...it, [k]: k === "name" ? v : +v || 0 } : it)));
  return (
    <div className="panel p-4 space-y-3" style={{ borderColor: C.cyan }}>
      <div className="flex justify-between items-center"><div className="font-bold flex items-center gap-2"><Camera size={18} style={{ color: C.cyan }} />Scan a meal</div><button aria-label="Close" onClick={onCancel} style={{ color: C.mute }}><X size={18} /></button></div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
      <input ref={libRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      {!items && !busy && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => camRef.current?.click()} className="btn py-3 text-sm flex items-center justify-center gap-2"><Camera size={16} />Take photo</button>
          <button onClick={() => libRef.current?.click()} className="ghost py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><ImageIcon size={16} />Choose photo</button>
        </div>
      )}
      {busy && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={16} className="animate-spin" />Looking at your food…</div>}
      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}
      {img && <img src={img} alt="Your meal" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />}
      {items && (
        <>
          <div className="body text-sm" style={{ color: C.sub }}>Here's what I think you're eating. Fix anything that's off, then add it.{note ? <span style={{ color: C.dim }}> ({note})</span> : null}</div>
          {items.map((it, i) => (
            <div key={i} className="ghost p-2 space-y-1">
              <div className="flex gap-2 items-center">
                <input className="inp text-sm font-semibold" value={it.name} onChange={(e) => upd(i, "name", e.target.value)} aria-label="Food name" />
                <button aria-label="Remove item" onClick={() => setItems((x) => x.filter((_, j) => j !== i))} style={{ color: C.mute }}><X size={16} /></button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[["cal", "Cal"], ["p", "Protein"], ["c", "Carbs"], ["f", "Fat"]].map(([k, l]) => <label key={k} className="body text-xs text-center" style={{ color: C.dim }}>{l}<input type="number" inputMode="numeric" className="inp text-center mt-0.5" value={it[k]} onChange={(e) => upd(i, k, e.target.value)} /></label>)}
              </div>
            </div>
          ))}
          <button onClick={() => setItems((x) => [...x, { name: "Something else", cal: 0, p: 0, c: 0, f: 0 }])} className="body text-xs underline" style={{ color: C.cyan }}>+ Add something the scan missed</button>
          <div className="flex justify-between font-bold pt-2" style={{ borderTop: `1px solid ${C.line}` }}><span>Total</span><span style={{ color: C.gold }}>{tot.cal} cal · P {tot.p} · C {tot.c} · F {tot.f}</span></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setItems(null); setImg(null); }} className="ghost py-3 text-sm font-bold">Rescan</button>
            <button onClick={() => onAddAll(items.filter((it) => it.name.trim()))} disabled={!items.length} className="btn py-3 text-sm">Add {items.length} item{items.length === 1 ? "" : "s"} to today</button>
          {onShare && items.length > 0 && <div className="col-span-2 flex justify-center"><ShareMealButton s={sState} food={{ name: items.map((i2) => i2.name).join(" + ").slice(0, 60), cal: tot.cal, p: tot.p, c: tot.c, f: tot.f, ingredients: items.map((i2) => ({ name: i2.name, qty: 1, cal: i2.cal, p: i2.p, c: i2.c, f: i2.f })) }} /></div>}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Built-in synth themes (original, no licensing) ---------- */
const THEMES_MUSIC = {
  epic: { name: "Epic entrance", bpm: 92, wave: "sawtooth", bass: [36, 36, 43, 43, 41, 41, 39, 39], lead: [60, 63, 67, 72, 70, 67, 63, 60, 62, 65, 69, 74, 72, 69, 65, 62], drums: "kick" },
  hype: { name: "Hype trap", bpm: 140, wave: "square", bass: [33, 33, 33, 33, 31, 31, 36, 36], lead: [57, 60, 64, 60, 57, 60, 64, 67, 55, 59, 62, 59, 55, 59, 62, 66], drums: "trap" },
  bit: { name: "8-bit boss", bpm: 150, wave: "square", bass: [40, 40, 47, 47, 45, 45, 43, 43], lead: [64, 67, 71, 76, 74, 71, 67, 64, 66, 69, 73, 78, 76, 73, 69, 66], drums: "kick" },
  disco: { name: "Disco strut", bpm: 118, wave: "triangle", bass: [28, 40, 28, 40, 33, 45, 33, 45], lead: [64, 67, 71, 74, 69, 72, 76, 79, 64, 67, 71, 74, 71, 74, 78, 81], drums: "disco" },
  dark: { name: "Dark arrival", bpm: 80, wave: "sawtooth", bass: [29, 29, 29, 29, 32, 32, 27, 27], lead: [53, 56, 60, 56, 53, 51, 48, 51, 53, 56, 60, 63, 60, 56, 53, 51], drums: "kick" },
  lofi: { name: "Chill lo-fi", bpm: 84, wave: "triangle", bass: [38, 38, 41, 41, 43, 43, 36, 36], lead: [62, 65, 69, 72, 69, 65, 62, 60, 62, 65, 69, 74, 72, 69, 65, 62], drums: "soft" },
};
const Jingle = {
  ctx: null, timer: null, master: null, id: null,
  hz: (m) => 440 * Math.pow(2, (m - 69) / 12),
  start(id, onEnd) {
    this.stop();
    const T = THEMES_MUSIC[id]; if (!T) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      this.ctx.resume();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ctx.destination);
      this.id = id;
      const step = 60 / T.bpm / 2, t0 = this.ctx.currentTime + 0.05, total = 32;
      for (let i = 0; i < total; i++) {
        const t = t0 + i * step;
        this.note(T.wave, T.lead[i % T.lead.length], t, step * 0.9, 0.16);
        if (i % 2 === 0) this.note("sawtooth", T.bass[(i / 2) % T.bass.length], t, step * 1.6, 0.22, 500);
        if (i % 4 === 0) this.kick(t);
        if (T.drums === "trap" && i % 2 === 1) this.hat(t, 0.05);
        if (T.drums === "disco" && i % 2 === 1) this.hat(t, 0.08);
        if ((T.drums === "kick" || T.drums === "disco") && i % 8 === 4) this.snare(t);
        if (T.drums === "soft" && i % 8 === 4) this.hat(t, 0.06);
      }
      if (id === "epic") { for (let i = 0; i < 4; i++) this.note("sawtooth", 48 + [0, 3, 7, 12][i], t0 + total * step - 1.2, 1.6, 0.14, 1400); }
      this.timer = setTimeout(() => { this.stop(); onEnd?.(); }, (total * step + 1.8) * 1000);
    } catch (e) { onEnd?.(); }
  },
  stop() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } try { this.master?.disconnect(); } catch (e) { /* ignore */ } this.master = null; this.id = null; },
  note(wave, midi, t, dur, vol, cutoff = 2600) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = wave; o.frequency.value = this.hz(midi); f.type = "lowpass"; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  kick(t) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.32); },
  noise(t, dur, vol, type, freq) { const b = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const n = this.ctx.createBufferSource(); n.buffer = b; const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(f); f.connect(g); g.connect(this.master); n.start(t); },
  hat(t, vol) { this.noise(t, 0.05, vol, "highpass", 7000); },
  snare(t) { this.noise(t, 0.16, 0.35, "bandpass", 1800); },
};
const embedFor = (url) => {
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { kind: "YouTube", src: `https://www.youtube.com/embed/${yt[1]}?rel=0`, h: 200 };
  const sp = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
  if (sp) return { kind: "Spotify", src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}?theme=0`, h: sp[1] === "track" || sp[1] === "episode" ? 152 : 352 };
  const am = url.match(/music\.apple\.com\/(.+)/);
  if (am) return { kind: "Apple Music", src: `https://embed.music.apple.com/${am[1]}`, h: 175 };
  return null;
};
function SongPlayer({ playerId, meta, me }) {
  const [state, setState] = useState("idle"); // idle | loading | playing
  const [open, setOpen] = useState(false);
  const audioRef = useRef(null);
  useEffect(() => () => { try { audioRef.current?.pause(); } catch (e) { /* ignore */ } if (Jingle.id) Jingle.stop(); }, []);
  if (!meta) return null;
  if (meta.type === "link") {
    const emb = embedFor(meta.url);
    if (!emb) return <a href={meta.url} target="_blank" rel="noreferrer" className="btn px-4 py-2 text-sm inline-flex items-center gap-2"><Music size={16} />Open theme link</a>;
    return (
      <div className="w-full">
        {!open ? <button onClick={() => setOpen(true)} className="btn px-4 py-2 text-sm inline-flex items-center gap-2"><Music size={16} />Play theme on {emb.kind}</button> : (
          <div className="space-y-1">
            <iframe title={`${emb.kind} theme song`} src={emb.src} width="100%" height={emb.h} style={{ border: 0, borderRadius: 8 }} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
            <button onClick={() => setOpen(false)} className="body text-xs underline" style={{ color: C.mute }}>Hide player</button>
          </div>
        )}
      </div>
    );
  }
  const play = async () => {
    if (state === "playing") { audioRef.current?.pause(); Jingle.stop(); setState("idle"); return; }
    if (meta.type === "theme") { setState("playing"); Jingle.start(meta.id, () => setState("idle")); return; }
    setState("loading");
    try {
      let src = null;
      if (me) { try { const r = await window.storage.get("ascend-song", false); src = r?.value; } catch (e) { /* fall through */ } }
      if (!src) { const r = await window.storage.get(`song:${playerId}`, true); src = r?.value; }
      if (!src) throw new Error("missing");
      const a = new Audio(src); audioRef.current = a;
      a.onended = () => setState("idle"); a.onerror = () => setState("idle");
      await a.play(); setState("playing");
    } catch (e) { setState("idle"); }
  };
  const label = meta.type === "theme" ? THEMES_MUSIC[meta.id]?.name || "theme" : meta.name;
  return (
    <button onClick={play} className="btn px-4 py-2 text-sm inline-flex items-center gap-2">
      {state === "loading" ? <Loader2 size={16} className="animate-spin" /> : state === "playing" ? <Pause size={16} /> : <Music size={16} />}
      {state === "playing" ? "Stop" : state === "loading" ? "Loading…" : `Play theme${label ? `: ${label}` : ""}`}
    </button>
  );
}

/* ---------- Sound effects ---------- */
const SFX = {
  ctx: null, enabled: true,
  ctxGet() { try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; if (!this.ctx) this.ctx = new AC(); this.ctx.resume(); return this.ctx; } catch (e) { return null; } },
  tone(f, dur, delay = 0, vol = 0.18, type = "sine") { const c = this.ctxGet(); if (!c || !this.enabled) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02); },
  click() { this.tone(880, 0.05, 0, 0.12, "square"); },
  pr() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, i * 0.09, 0.2)); },
  levelUp() { [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, i * 0.1, 0.2, "triangle")); this.tone(1568, 0.6, 0.5, 0.15); },
  rankUp() { [262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.3, i * 0.12, 0.22, "sawtooth")); [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.9, 0.75 + i * 0.05, 0.16)); },
  achievement() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.25, i * 0.08, 0.18, "triangle")); },
  water() { this.tone(660, 0.08, 0, 0.1); this.tone(990, 0.12, 0.08, 0.1); },
  noise(dur, vol, cutoff, delay = 0) { const c = this.ctxGet(); if (!c || !this.enabled) return; const t = c.currentTime + delay, b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); const n = c.createBufferSource(); n.buffer = b; const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff; const g = c.createGain(); g.gain.value = vol; n.connect(f); f.connect(g); g.connect(c.destination); n.start(t); },
  sweep(f1, f2, dur, vol, type = "sine", delay = 0) { const c = this.ctxGet(); if (!c || !this.enabled) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02); },
  slam() { this.sweep(140, 32, 0.9, 0.9); this.noise(0.35, 0.7, 900); [211, 347, 529, 811].forEach((f, i) => this.tone(f, 1.1 - i * 0.15, 0.02, 0.07, "square")); this.sweep(90, 40, 0.5, 0.5, "triangle", 0.12); },
  thud() { this.sweep(110, 45, 0.45, 0.6); this.noise(0.18, 0.35, 700); },
};

/* ---------- Rank-up ceremony ---------- */
function rankSnapshot(s) {
  const o = overallInfo(s);
  const lifts = {};
  rankedLifts(s).forEach((r) => { lifts[r.e.name] = Math.floor(r.score); });
  return { overall: Math.floor(o.score), lifts };
}
function Ceremony({ c, onClose }) {
  const rank = c.rank;
  useEffect(() => { SFX.rankUp(); const t = setTimeout(onClose, 9000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(0,0,0,.6), rgba(0,0,0,.95))", backdropFilter: "blur(6px)" }} onClick={onClose} role="dialog" aria-label="Rank up">
      <style>{`@keyframes cerein{0%{transform:scale(.3) rotate(-20deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0)}}
        @keyframes ceretext{0%{transform:translateY(20px);opacity:0}100%{transform:none;opacity:1}}
        @keyframes cerespark{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}}`}</style>
      {Array.from({ length: 26 }, (_, i) => { const a = (i / 26) * Math.PI * 2, d = 120 + (i % 5) * 40; return <span key={i} className="absolute rounded-full" style={{ left: "50%", top: "45%", width: i % 3 ? 6 : 10, height: i % 3 ? 6 : 10, background: i % 2 ? "#fff" : rank.color, boxShadow: `0 0 10px ${rank.color}`, "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d}px`, animation: `cerespark ${1.2 + (i % 4) * 0.3}s ${(i % 6) * 0.08}s ease-out forwards` }} />; })}
      <div style={{ animation: "cerein .9s cubic-bezier(.2,.9,.3,1.3) both" }}><RankBadge rank={rank} size={170} /></div>
      <div className="text-4xl font-extrabold tracking-widest mt-6" style={{ color: rank.color, textShadow: `0 0 24px ${rank.glow}`, animation: "ceretext .6s .5s ease-out both", fontFamily: "'Oxanium', sans-serif" }}>RANK UP</div>
      <div className="text-xl font-bold mt-2 text-center" style={{ color: "#fff", animation: "ceretext .6s .7s ease-out both" }}>{c.kind === "overall" ? "Overall rank" : c.name}</div>
      <div className="text-2xl font-extrabold mt-1" style={{ color: rank.color, animation: "ceretext .6s .85s ease-out both" }}>{c.label}</div>
      <div className="body text-sm mt-8" style={{ color: "#9DB2CC", animation: "ceretext .6s 1.2s ease-out both" }}>Tap anywhere to continue</div>
    </div>
  );
}

/* ---------- Titles ---------- */
const TITLES = [
  { id: "rookie", name: "Rookie", req: () => true, how: "Everyone starts here" },
  { id: "showup", name: "Regular", req: (s) => !!s.ach?.["workouts-0"], how: "Show Up I" },
  { id: "roadrunner", name: "Road Runner", req: (s) => !!s.ach?.["miles-1"], how: "Road Runner II" },
  { id: "cardio", name: "Cardio Menace", req: (s) => !!s.ach?.["miles-2"], how: "Road Runner III" },
  { id: "iron", name: "Iron Mover", req: (s) => !!s.ach?.["volume-1"], how: "Iron Mover II" },
  { id: "rep", name: "Rep Machine", req: (s) => !!s.ach?.["reps-1"], how: "Rep Machine II" },
  { id: "unbroken", name: "Unbroken", req: (s) => !!s.ach?.["streak-1"], how: "Unbroken II (30-day streak)" },
  { id: "barhanger", name: "Bar Hanger", req: (s) => !!s.ach?.["pullups-1"], how: "Bar Hanger II" },
  { id: "plates", name: "Two Plates", req: (s) => !!s.ach?.["bench-1"], how: "Bench Club II (225)" },
  { id: "squatlord", name: "Squat Lord", req: (s) => !!s.ach?.["squat-2"], how: "Squat Club III (405)" },
  { id: "deadking", name: "Deadlift King", req: (s) => !!s.ach?.["deadlift-2"], how: "Deadlift Club III (405)" },
  { id: "quester", name: "Quest Hunter", req: (s) => !!s.ach?.["quests-1"], how: "Quest Hunter II" },
  { id: "ascended", name: "Ascended", req: (s) => !!s.ach?.["rank-2"], how: "First A-rank lift" },
  { id: "mythic", name: "Mythic", req: (s) => Object.keys(s.ach || {}).some((id) => allAchievements().find((a) => a.id === id)?.tier === 5), how: "Any Mythic achievement" },
  { id: "elite", name: "Elite", req: (s) => overallInfo(s).score >= 5, how: "Reach S overall" },
  { id: "gymgod", name: "Gym God", req: (s) => overallInfo(s).score >= 6, how: "????" },
  { id: "boss_wyrm", name: "Wyrmslayer", req: (s) => (s.loot?.bosses || []).includes("wyrm"), how: "Defeat The Iron Wyrm" },
  { id: "boss_colossus", name: "Icebreaker", req: (s) => (s.loot?.bosses || []).includes("colossus"), how: "Defeat Frost Colossus" },
  { id: "boss_gravemaw", name: "Gravebane", req: (s) => (s.loot?.bosses || []).includes("gravemaw"), how: "Defeat Gravemaw" },
  { id: "boss_chud", name: "Chud King", req: (s) => (s.loot?.bosses || []).includes("chud"), how: "Defeat The Chud King" },
  { id: "boss_rust", name: "Titanbreaker", req: (s) => (s.loot?.bosses || []).includes("rust"), how: "Defeat The Rust Titan" },
  { id: "boss_harpy", name: "Stormbound", req: (s) => (s.loot?.bosses || []).includes("harpy"), how: "Defeat Stormcaller Harpy" },
  { id: "boss_warden", name: "Wardenbane", req: (s) => (s.loot?.bosses || []).includes("warden"), how: "Defeat The Hollow Warden" },
  { id: "boss_leviathan", name: "Tidebreaker", req: (s) => (s.loot?.bosses || []).includes("leviathan"), how: "Defeat Leviathan of the Deep" },
  { id: "boss_behemoth", name: "Magmaforged", req: (s) => (s.loot?.bosses || []).includes("behemoth"), how: "Defeat Molten Behemoth" },
  { id: "boss_ratlord", name: "Ratcatcher", req: (s) => (s.loot?.bosses || []).includes("ratlord"), how: "Defeat The Plague Rat Lord" },
  { id: "boss_pharaoh", name: "Sunbreaker", req: (s) => (s.loot?.bosses || []).includes("pharaoh"), how: "Defeat Sandstorm Pharaoh" },
  { id: "boss_void", name: "Voidwalker", req: (s) => (s.loot?.bosses || []).includes("void"), how: "Defeat The Void Sovereign" },
  { id: "yogurtmale", name: "Yogurt Male", req: (s) => !!s.ach?.["yogurt-0"], how: "Log 100 yogurts" },
  { id: "champion", name: "Season Champion", req: (s) => Object.values(s.seasonBadges || {}).some((b) => b.place === 1), how: "Finish a season in 1st" },
  { id: "contender", name: "Contender", req: (s) => Object.keys(s.seasonBadges || {}).length > 0, how: "Finish a season in the top 3" },
];

/* ---------- Progression + coaching helpers ---------- */
function suggestNext(s, name, excludeId) {
  const def = findEx(s, name);
  if (def.type !== "weighted") return null;
  const last = pastSessions(s, name, excludeId, 1)[0];
  if (!last) return null;
  const sets = last.sets.filter((st) => +st.r > 0);
  if (!sets.length) return null;
  const w = Math.max(...sets.map((st) => +st.w || 0));
  const reps = sets.filter((st) => (+st.w || 0) === w).map((st) => +st.r);
  const minR = Math.min(...reps);
  const big = (def.group === "Legs" || def.group === "Back") && def.factor >= 1;
  const step = def.perHand ? 5 : big ? 10 : 5;
  if (minR >= 8) return { w: w + step, r: Math.max(5, minR - 2), why: `all sets hit ${minR}+` };
  if (minR >= 5) return { w, r: minR + 1, why: "add a rep" };
  return { w, r: minR, why: "repeat, get every set" };
}
function stalledLifts(s) {
  const out = [];
  rankedLifts(s).forEach((r) => {
    const sess = pastSessions(s, r.e.name, null, 3);
    if (sess.length < 3) return;
    const bests = sess.map((ps) => Math.max(...ps.sets.map((st) => bestValue(r.e, st, s.profile))));
    if (bests[0] <= bests[1] && bests[1] <= bests[2]) out.push({ name: r.e.name, best: Math.round(bests[0]) });
  });
  return out;
}
function daysSinceTraining(s) {
  const last = [...s.workouts].reverse().find((w) => w.source !== "quest");
  if (!last) return null;
  return Math.round((new Date(today() + "T12:00") - new Date(last.date + "T12:00")) / 86400000);
}
function Nudges({ s, openExercise, goTrain }) {
  const stalled = stalledLifts(s).slice(0, 2);
  const gap = daysSinceTraining(s);
  const lines = [];
  if (gap !== null && gap >= 3) lines.push({ text: `Right then. ${gap} days without training. The iron has feelings too.`, action: "Train now", onClick: goTrain });
  stalled.forEach((x) => lines.push({ text: `${x.name} has been stuck around ${x.best} for 3 sessions. Drop 10%, do 5 sets of 5, rebuild.`, action: "See lift", onClick: () => openExercise(x.name) }));
  if (!lines.length) return null;
  return (
    <div className="panel p-3 space-y-2" style={{ borderColor: C.cyan }}>
      <div className="font-bold text-sm flex items-center gap-2"><Bot size={16} style={{ color: C.cyan }} />Sterling</div>
      {lines.map((l, i) => (
        <div key={i} className="flex items-center gap-2"><div className="body text-sm flex-1" style={{ color: C.sub }}>{l.text}</div><button onClick={l.onClick} className="ghost px-3 py-1.5 text-xs font-bold whitespace-nowrap" style={{ color: C.cyan }}>{l.action}</button></div>
      ))}
    </div>
  );
}
function WeeklyReport({ s }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(s.rankHist || {}).sort();
  if (keys.length < 2) return null;
  const cur = s.rankHist[keys[keys.length - 1]], prev = s.rankHist[keys[keys.length - 2]];
  const ups = [], downs = [];
  Object.entries(cur.lifts || {}).forEach(([n, sc]) => { const p = prev.lifts?.[n]; if (p === undefined) return; if (sc - p >= 0.34) ups.push(n); else if (p - sc >= 0.34) downs.push(n); });
  const dOverall = (cur.overall || 0) - (prev.overall || 0);
  const xpGain = (cur.xp || 0) - (prev.xp || 0);
  const focus = downs[0] || stalledLifts(s)[0]?.name || Object.entries(GROUP_WEIGHT).sort((a, b) => ((cur.groups?.[a[0]] || 0) - (cur.groups?.[b[0]] || 0)))[0][0];
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><TrendingUp size={16} style={{ color: C.cyan }} />Weekly rank report</span><ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 body text-sm space-y-1" style={{ color: C.sub }}>
          <div>Overall score {dOverall >= 0 ? "+" : ""}{dOverall.toFixed(2)} · {xpGain.toLocaleString()} XP earned</div>
          <div style={{ color: C.green }}>Moved up: {ups.length ? ups.join(", ") : "nothing yet"}</div>
          <div style={{ color: C.orange }}>Slipping: {downs.length ? downs.join(", ") : "nothing"}</div>
          <div style={{ color: C.cyan }}>Focus next week: {focus}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- Rest timer + plates ---------- */
function RestBubble({ end, onDone, onClose }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  useEffect(() => { if (left === 0) { Beeper.unlock(); Beeper.work(); onDone(); } }, [left]);
  useEffect(() => { document.title = `⏱ ${fmtClock(left)} rest · Ascend`; }, [left]);
  useEffect(() => () => { document.title = "Ascend"; }, []);
  return (
    <button onClick={onClose} aria-label="Dismiss rest timer" className="fixed z-40 flex items-center gap-2 px-4 py-2 font-bold tabular-nums" style={{ left: 16, bottom: "calc(env(safe-area-inset-bottom) + 90px)", borderRadius: 999, background: C.sheet, color: left <= 5 ? C.orange : C.cyan, border: `1px solid ${left <= 5 ? C.orange : C.cyan}`, boxShadow: `0 0 16px ${C.glow}` }}>
      <TimerIcon size={16} />Rest {fmtClock(left)}
    </button>
  );
}
function platesFor(total, bar = 45) {
  let side = (total - bar) / 2;
  if (side < 0) return null;
  const out = [];
  [45, 35, 25, 10, 5, 2.5].forEach((p) => { while (side >= p - 1e-9) { out.push(p); side -= p; } });
  return out;
}
function PlateSheet({ weight, onClose }) {
  const [w, setW] = useState(weight || 135);
  const [bar, setBar] = useState(45);
  const plates = platesFor(+w || 0, bar);
  return (
    <Sheet title="Plate calculator" onClose={onClose}>
      <div className="flex gap-2 items-center">
        <input type="number" inputMode="decimal" className="inp text-center text-xl font-bold" value={w} onChange={(e) => setW(e.target.value)} aria-label="Total weight" />
        <span className="body text-sm" style={{ color: C.dim }}>lb total</span>
      </div>
      <div className="flex gap-2">{[45, 35, 15].map((b) => <button key={b} onClick={() => setBar(b)} className="flex-1 py-2 text-sm font-semibold" style={{ borderRadius: 4, background: bar === b ? C.blue : C.soft, color: bar === b ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{b} lb bar</button>)}</div>
      {plates === null ? <div className="body text-sm" style={{ color: C.dim }}>Lighter than the bar.</div> : (
        <div className="panel p-3">
          <div className="body text-xs mb-2" style={{ color: C.dim }}>Per side</div>
          <div className="flex items-end gap-1 justify-center" style={{ height: 90 }}>
            {plates.length === 0 && <span className="body text-sm" style={{ color: C.dim }}>Just the bar</span>}
            {plates.map((p, i) => <div key={i} className="flex items-end justify-center font-bold text-xs" style={{ width: p >= 25 ? 22 : 16, height: p >= 45 ? 90 : p >= 35 ? 78 : p >= 25 ? 64 : p >= 10 ? 46 : p >= 5 ? 36 : 28, borderRadius: 4, background: p >= 45 ? "#2F6BFF" : p >= 35 ? "#FFD447" : p >= 25 ? "#3DF08A" : p >= 10 ? "#fff" : p >= 5 ? "#FF2D6F" : "#9AA7BD", color: p >= 10 && p < 25 ? "#000" : "#fff", paddingBottom: 4 }}>{p}</div>)}
          </div>
          <div className="text-center font-bold mt-2">{plates.join(" + ") || "0"} each side{plates.length ? ` · ${(+w - bar) / 2} lb per side` : ""}</div>
        </div>
      )}
    </Sheet>
  );
}

/* ---------- Generic line chart + exercise page ---------- */
function LineChart({ pts, color, unit = "", fmt = (v) => Math.round(v) }) {
  if (!pts || pts.length < 2) return <div className="body text-sm" style={{ color: C.dim }}>Log this at least twice to see a trend.</div>;
  const W = 320, H = 130, padL = 38, padR = 10, padT = 12, padB = 22;
  const vs = pts.map((p) => p.v), lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const x = (i) => padL + (i / (pts.length - 1)) * (W - padL - padR), y = (v) => padT + (1 - (v - lo) / span) * (H - padT - padB);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const fd = (d) => new Date(d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Trend chart">
      {[lo, (lo + hi) / 2, hi].map((v, i) => <g key={i}><line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={C.line} strokeDasharray="3 4" /><text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill={C.dim}>{fmt(v)}</text></g>)}
      <path d={`${path} L${x(pts.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`} fill={color} opacity=".12" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.v)} r="3" fill={C.bg} stroke={color} strokeWidth="2" />)}
      <text x={padL} y={H - 6} fontSize="10" fill={C.dim}>{fd(pts[0].d)}</text>
      <text x={W - padR} y={H - 6} fontSize="10" fill={C.dim} textAnchor="end">{fd(pts[pts.length - 1].d)}{unit ? ` · ${unit}` : ""}</text>
    </svg>
  );
}
async function videoFrames(file, n = 5, size = 360) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error("video")); setTimeout(() => rej(new Error("timeout")), 8000); });
    const dur = Math.min(v.duration || 10, 30);
    const c = document.createElement("canvas");
    const k = Math.min(1, size / Math.max(v.videoWidth || size, v.videoHeight || size));
    c.width = Math.round((v.videoWidth || size) * k); c.height = Math.round((v.videoHeight || size) * k);
    const ctx = c.getContext("2d");
    const frames = [];
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n) * dur;
      await new Promise((res, rej) => { v.onseeked = res; v.onerror = () => rej(new Error("seek")); v.currentTime = t; setTimeout(res, 2500); });
      ctx.drawImage(v, 0, 0, c.width, c.height);
      frames.push(c.toDataURL("image/jpeg", 0.6));
    }
    return frames;
  } finally { URL.revokeObjectURL(url); }
}
function FormCheck({ exercise }) {
  const ref = useRef(null);
  const [state, setState] = useState({ status: "idle", text: "" });
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setState({ status: "loading", text: "" });
    try {
      const frames = await videoFrames(f);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, system: STERLING_SYS, messages: [{ role: "user", content: [
          ...frames.map((fr) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: fr.split(",")[1] } })),
          { type: "text", text: `These are frames from a short video of someone doing ${exercise}, in time order. Give a form check: what looks good, the one or two most important fixes, and a cue to think about next set. Plain text, 3 to 5 short sentences, no markdown. If the frames don't show the lift clearly, say what angle to film from instead.` },
        ] }] }),
      });
      const data = await res.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      if (!text) throw new Error("empty");
      setState({ status: "done", text });
    } catch (err) { setState({ status: "error", text: "Couldn't read that video. Try a 5–15 second clip filmed from the side." }); }
  };
  return (
    <div className="panel p-4 space-y-2" style={{ borderColor: C.cyan }}>
      <div className="font-bold flex items-center gap-2"><Video size={18} style={{ color: C.cyan }} />Form check by video</div>
      <div className="body text-xs" style={{ color: C.dim }}>Film one set from the side, 5–15 seconds. Sterling looks at a few frames and gives cues. Videos aren't stored.</div>
      <input ref={ref} type="file" accept="video/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
      <button onClick={() => ref.current?.click()} disabled={state.status === "loading"} className="btn w-full py-2.5 text-sm flex items-center justify-center gap-2">{state.status === "loading" ? <><Loader2 size={16} className="animate-spin" />Watching your set…</> : <><Camera size={16} />Record or choose a clip</>}</button>
      {state.text && <div className="body text-sm" style={{ color: state.status === "error" ? C.red : C.text }}>{state.text}</div>}
    </div>
  );
}
function ExercisePage({ s, name, onBack, openMuscle }) {
  const def = findEx(s, name);
  const p = s.profile;
  const bw = Math.max(80, +p.weight || 170);
  const sessions = [];
  s.workouts.forEach((w) => { const ex = w.exercises.find((e) => e.name === name); if (!ex) return; const sets = ex.sets.filter((st) => +st.r > 0); if (!sets.length) return; const best = def.type === "timed" ? Math.max(...sets.map((st) => +st.r)) : Math.max(...sets.map((st) => bestValue(def, st, p, ex))); const vol = sets.reduce((a, st) => a + (+st.w || 0) * (+st.r || 0), 0); sessions.push({ d: w.date, best, vol, sets, id: w.id, title: w.title }); });
  const byDay = {};
  sessions.forEach((x) => { const cur = byDay[x.d]; byDay[x.d] = cur ? { ...cur, best: Math.max(cur.best, x.best), vol: cur.vol + x.vol } : x; });
  const pts = Object.values(byDay).sort((a, b) => (a.d < b.d ? -1 : 1));
  const r = rankedLifts(s).find((x) => x.e.name === name);
  const sug = suggestNext(s, name);
  const unit = def.type === "bodyweight" ? "reps" : def.type === "timed" ? "min" : "lb";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <div className="flex-1 min-w-0"><h1 className="text-2xl font-bold glowtext truncate">{name}</h1><button onClick={() => openMuscle(def.group)} className="body text-xs underline" style={{ color: C.dim }}>{def.group}{def.perHand ? " · per hand" : ""} · muscle page</button></div>
        {r && <RankBadge rank={r.rank} size={44} />}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[["Rank", r ? r.label : "–"], [def.type === "bodyweight" ? "Best reps" : def.type === "timed" ? "Longest" : "Est. max", r ? `${Math.round(r.best)} ${unit}` : pts.length ? `${Math.round(pts[pts.length - 1].best)} ${unit}` : "–"], ["× bodyweight", r && def.type === "weighted" ? `${(r.best / bw).toFixed(2)}×` : "–"], ["Sessions", pts.length], ["Next rank", r?.next ? `${r.next} ${unit}` : r ? "maxed" : "–"], ["Next time", sug ? `${sug.w}×${sug.r}` : "–"]].map(([l, v]) => (
          <div key={l} className="panel py-3 px-2 text-center"><div className="text-xs body" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold glowtext">{v}</div></div>
        ))}
      </div>
      {sug && <div className="body text-xs" style={{ color: C.dim }}>Suggested next session: {sug.w}×{sug.r} ({sug.why}).</div>}
      <div className="panel p-3"><div className="font-bold text-sm mb-1">{def.type === "timed" ? "Minutes per session" : def.type === "bodyweight" ? "Best set (reps)" : "Estimated max"}</div><LineChart pts={pts.map((x) => ({ d: x.d, v: x.best }))} color={C.cyan} unit={unit} /></div>
      {def.type === "weighted" && <div className="panel p-3"><div className="font-bold text-sm mb-1">Volume per session</div><LineChart pts={pts.map((x) => ({ d: x.d, v: x.vol }))} color={C.green} unit="lb" fmt={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : Math.round(v))} /></div>}
      <FormCheck exercise={name} />
      <a href={ytUrl(name)} target="_blank" rel="noreferrer" className="ghost w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Youtube size={16} />How-to videos</a>
      <h2 className="text-lg font-bold">History</h2>
      {[...pts].reverse().slice(0, 15).map((x) => (
        <div key={x.d} className="panel p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0"><div className="font-semibold">{fmtDay(x.d)}{x.title ? <span className="body text-xs ml-2" style={{ color: C.dim }}>{x.title}</span> : null}</div><div className="body text-xs truncate" style={{ color: C.sub }}>{sessions.filter((sx) => sx.d === x.d).flatMap((sx) => sx.sets).map((st) => setLabel(def, st)).join(", ")}</div></div>
          <div className="text-right"><div className="font-bold">{Math.round(x.best)}</div><div className="body text-xs" style={{ color: C.mute }}>{unit}</div></div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Today dashboard + check-in ---------- */
const SLEEP_OPTS = [5, 6, 7, 8, 9];
const SCALE_COLORS = ["#FF4D6D", "#FF9340", "#FFD447", "#9BE15D", "#3DF08A"];
const MOOD_OPTS = ["Wrecked", "Meh", "Good", "Fired up"];
function Dashboard({ s, setS, goTrain, goRun }) {
  const d = today();
  const t = targets(s.profile), tot = mealTotals(s.meals[d]);
  const day = s.days?.[d];
  const qDone = (day?.list || []).filter((q) => q.claimed).length, qAll = Math.max(3, (day?.list || []).length || 3);
  const ci = s.checkins?.[d] || {};
  const setCi = (k, v) => setS((p) => ({ ...p, checkins: { ...(p.checkins || {}), [d]: { ...(p.checkins?.[d] || {}), [k]: v } } }));
  const atGym = s.atGym && Date.now() - s.atGym < 3 * 3600 * 1000;
  return (
    <div className="panel p-3 space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[["Streak", `${streakOf(s)}d`, C.orange], ["Quests", `${qDone}/${qAll}`, C.gold], ["Cal left", Math.max(0, Math.round(t.cal - tot.cal)), C.cyan], ["Protein left", `${Math.max(0, Math.round(t.protein - tot.p))}g`, C.green]].map(([l, v, c]) => (
          <div key={l}><div className="text-xs body" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold" style={{ color: c }}>{v}</div></div>
        ))}
      </div>
      <button onClick={goRun} className="w-full flex items-center gap-3 px-1" aria-label="Open run and steps">
        <Footprints size={16} style={{ color: C.green }} />
        <div className="flex-1"><div className="h-1.5 overflow-hidden" style={{ borderRadius: 999, background: C.glassLine }}><div style={{ height: "100%", width: `${Math.min(100, ((s.steps?.[d] || 0) / (s.settings?.stepGoal || 10000)) * 100)}%`, background: C.green, borderRadius: 999 }} /></div></div>
        <span className="body text-xs tabular-nums" style={{ color: C.dim }}>{(s.steps?.[d] || 0).toLocaleString()} steps</span>
        <ChevronRight size={14} style={{ color: C.mute }} />
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={goTrain} className="btn py-2.5 text-sm flex items-center justify-center gap-2"><Dumbbell size={16} />{s.active ? "Resume workout" : "Start training"}</button>
        <button onClick={() => setS((p) => ({ ...p, atGym: atGym ? null : Date.now() }))} className="ghost py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: atGym ? C.green : C.cyan, borderColor: atGym ? C.green : C.border }}><MapPin size={16} />{atGym ? "At the gym ✓" : "Check in at gym"}</button>
      </div>
      {ci.sleep && ci.mood && !ci.edit ? (
        <button onClick={() => setCi("edit", true)} className="w-full flex items-center justify-between body text-xs px-1">
          <span style={{ color: C.dim }}>Checked in <Check size={12} className="inline" style={{ color: C.green }} /></span>
          <span><span style={{ color: SCALE_COLORS[SLEEP_OPTS.indexOf(ci.sleep)] }}>{ci.sleep}{ci.sleep === 9 ? "+" : ""}h sleep</span> · <span style={{ color: SCALE_COLORS[[0, 1, 3, 4][MOOD_OPTS.indexOf(ci.mood)]] }}>{ci.mood}</span></span>
        </button>
      ) : (
        <>
          <div className="flex items-center gap-1.5 flex-wrap body text-xs">
            <span className="w-10" style={{ color: C.dim }}>Sleep</span>
            {SLEEP_OPTS.map((h, i) => { const col = SCALE_COLORS[i], on = ci.sleep === h; return <button key={h} onClick={() => setCi("sleep", h) || setCi("edit", false)} className="px-2.5 py-1 font-bold" style={{ borderRadius: 999, background: on ? col : "transparent", color: on ? "#06101A" : col, border: `1px solid ${col}`, opacity: ci.sleep && !on ? 0.45 : 1 }}>{h}{h === 9 ? "+" : ""}h</button>; })}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap body text-xs">
            <span className="w-10" style={{ color: C.dim }}>Mood</span>
            {MOOD_OPTS.map((m, i) => { const col = SCALE_COLORS[[0, 1, 3, 4][i]], on = ci.mood === m; return <button key={m} onClick={() => setCi("mood", m) || setCi("edit", false)} className="px-2.5 py-1 font-bold" style={{ borderRadius: 999, background: on ? col : "transparent", color: on ? "#06101A" : col, border: `1px solid ${col}`, opacity: ci.mood && !on ? 0.45 : 1 }}>{m}</button>; })}
          </div>
        </>
      )}
    </div>
  );
}


/* ---------- Fuel extras ---------- */
const WATER_XP = 25;
function WaterTracker({ s, setS, gainXp, d }) {
  const target = Math.max(8, Math.round((+s.profile.weight || 170) / 2 / 8));
  const w = s.water?.[d] || { n: 0, xp: false };
  const set = (n) => setS((p) => {
    const cur = p.water?.[d] || { n: 0, xp: false };
    const next = { ...cur, n: Math.max(0, n) };
    let hit = false;
    if (!cur.xp && next.n >= target) { next.xp = true; hit = true; }
    if (hit) setTimeout(() => { gainXp(WATER_XP, "Water goal", `water_${d}`); SFX.water(); }, 0);
    return { ...p, water: { ...(p.water || {}), [d]: next } };
  });
  return (
    <div className="panel p-3 flex items-center gap-3">
      <Droplets size={20} style={{ color: C.cyan }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm"><span className="font-semibold">Water</span><span className="body" style={{ color: w.n >= target ? C.green : C.dim }}>{w.n} / {target} cups{w.xp ? " · +25 XP" : ""}</span></div>
        <div className="mt-1"><Bar pct={(w.n / target) * 100} color={C.cyan} /></div>
      </div>
      <button aria-label="Less water" onClick={() => set(w.n - 1)} className="ghost w-8 h-8 flex items-center justify-center"><Minus size={14} /></button>
      <button aria-label="Add a cup" onClick={() => set(w.n + 1)} className="btn w-8 h-8 flex items-center justify-center"><Plus size={14} /></button>
    </div>
  );
}
function DayTemplates({ s, setS, d, meals }) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const tpls = s.dayTemplates || [];
  const save = () => {
    const nm = name.trim() || `Day ${tpls.length + 1}`;
    const items = meals.map(({ id, ...m }) => m);
    setS((p) => ({ ...p, dayTemplates: [...(p.dayTemplates || []).filter((t) => t.name !== nm), { id: uid(), name: nm, items }] }));
    setNaming(false); setName("");
  };
  const load = (t) => setS((p) => ({ ...p, meals: { ...p.meals, [d]: [...(p.meals[d] || []), ...t.items.map((m) => ({ ...m, id: uid() }))] } }));
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><Layers size={16} style={{ color: C.cyan }} />Day templates{tpls.length ? ` (${tpls.length})` : ""}</span><ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {tpls.map((t) => (
            <div key={t.id} className="ghost flex items-center">
              <button onClick={() => load(t)} className="flex-1 text-left p-2 min-w-0"><div className="font-semibold text-sm">{t.name}</div><div className="body text-xs truncate" style={{ color: C.dim }}>{t.items.length} items · {Math.round(mealTotals(t.items).cal)} cal · P {Math.round(mealTotals(t.items).p)}</div></button>
              <button aria-label={`Delete template ${t.name}`} onClick={() => ask(`Delete template "${t.name}"?`, () => setS((p) => ({ ...p, dayTemplates: p.dayTemplates.filter((x) => x.id !== t.id) })), "Delete")} className="px-3" style={{ color: C.mute }}><Trash2 size={14} /></button>
            </div>
          ))}
          {tpls.length === 0 && <div className="body text-xs" style={{ color: C.dim }}>Save a whole day of eating once, then log it in one tap.</div>}
          {meals.length > 0 && (naming ? (
            <div className="flex gap-2"><input autoFocus className="inp text-sm" placeholder="Template name, e.g. Work day" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} /><button onClick={save} className="btn px-3 text-sm">Save</button></div>
          ) : <button onClick={() => setNaming(true)} className="ghost w-full py-2 text-sm font-semibold" style={{ color: C.cyan }}>Save this day as a template</button>)}
        </div>
      )}
    </div>
  );
}
function NutritionReport({ s }) {
  const [open, setOpen] = useState(false);
  const t = targets(s.profile);
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = shift(today(), -i); const m = s.meals?.[d] || []; if (m.length) days.push({ d, ...mealTotals(m) }); }
  if (days.length < 2) return null;
  const avg = (k) => Math.round(days.reduce((a, x) => a + x[k], 0) / days.length);
  const closeness = (x) => Math.abs(x.cal - t.cal) / t.cal + Math.max(0, t.protein - x.p) / t.protein;
  const best = [...days].sort((a, b) => closeness(a) - closeness(b))[0], worst = [...days].sort((a, b) => closeness(b) - closeness(a))[0];
  const dp = avg("p") - t.protein, dc = avg("cal") - t.cal;
  const tip = dp < -15 ? `Protein runs ${-dp}g short per day. Add a shake or an extra 6 oz of chicken.` : dc > t.cal * 0.1 ? `About ${dc} calories over target on average. Trim the biggest snack.` : dc < -t.cal * 0.1 ? `About ${-dc} calories under. Add a carb source to your post-workout meal.` : "Dialed in this week. Keep it steady.";
  const fd = (d) => new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "short" });
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><TrendingUp size={16} style={{ color: C.cyan }} />7-day nutrition report</span><ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 body text-sm space-y-1" style={{ color: C.sub }}>
          <div>Average: {avg("cal")} cal · P {avg("p")} · C {avg("c")} · F {avg("f")} ({days.length} days logged)</div>
          <div style={{ color: C.green }}>Best day: {fd(best.d)} ({Math.round(best.cal)} cal, {Math.round(best.p)}g protein)</div>
          <div style={{ color: C.orange }}>Roughest day: {fd(worst.d)} ({Math.round(worst.cal)} cal, {Math.round(worst.p)}g protein)</div>
          <div style={{ color: C.cyan }}>{tip}</div>
        </div>
      )}
    </div>
  );
}
async function barcodeLookup(dataUrl) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 200, messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: dataUrl.split(",")[1] } },
      { type: "text", text: `Read the barcode number printed under the bars in this photo (UPC/EAN, 8 to 14 digits). Respond ONLY with JSON: {"code": "digits or empty string", "product": "product name if visible or empty"}` },
    ] }] }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const r = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  const code = String(r.code || "").replace(/\D/g, "");
  if (code.length < 8) throw new Error("nocode");
  const off = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_size`);
  const j = await off.json();
  if (!j.product) throw new Error("notfound");
  const n = j.product.nutriments || {};
  const per = n["energy-kcal_serving"] != null ? "serving" : "100g";
  const val = (k) => Math.round(+(n[`${k}_${per}`] ?? n[`${k}_100g`] ?? 0));
  return { name: `${j.product.brands ? `${j.product.brands} ` : ""}${j.product.product_name || r.product || "Product"} (${per === "serving" ? j.product.serving_size || "1 serving" : "100 g"})`.slice(0, 70), cal: val("energy-kcal"), p: val("proteins"), c: val("carbohydrates"), f: val("fat"), source: "official", note: `Open Food Facts · barcode ${code}` };
}

/* ---------- Body tracking ---------- */
function ProgressPhotos({ s }) {
  const [keys, setKeys] = useState([]);
  const [imgs, setImgs] = useState({});
  const [pick, setPick] = useState([]);
  const [slider, setSlider] = useState(50);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const camRef = useRef(null), libRef = useRef(null);
  const load = async () => {
    try { const res = await window.storage.list("photo:", false); const ks = (res?.keys || []).sort().reverse(); setKeys(ks); const out = {}; await Promise.all(ks.slice(0, 12).map(async (k) => { try { const r = await window.storage.get(k, false); if (r?.value) out[k] = r.value; } catch (e) { /* skip */ } })); setImgs(out); } catch (e) { /* offline */ }
  };
  useEffect(() => { if (open) load(); }, [open]);
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true);
    try { const small = await shrinkPhoto(f, 700); const k = `photo:${today()}-${Date.now().toString(36)}`; await window.storage.set(k, small, false); await load(); } catch (err) { /* ignore */ }
    setBusy(false);
  };
  const del = async (k) => { try { await window.storage.delete(k, false); setPick((x) => x.filter((y) => y !== k)); await load(); } catch (e) { /* ignore */ } };
  const label = (k) => { const m = k.match(/^photo:(\d{4}-\d{2}-\d{2})/); return m ? new Date(m[1] + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }) : ""; };
  const [a, b] = pick;
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><ImageIcon size={16} style={{ color: C.cyan }} />Progress photos{keys.length ? ` (${keys.length})` : ""}</span><ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div className="body text-xs" style={{ color: C.dim }}>Private to you. Take one a month in the same spot and light. Tap two to compare.</div>
          <input ref={camRef} type="file" accept="image/*" capture="user" onChange={onFile} style={{ display: "none" }} />
          <input ref={libRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => camRef.current?.click()} disabled={busy} className="btn py-2.5 text-sm flex items-center justify-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}Take photo</button>
            <button onClick={() => libRef.current?.click()} disabled={busy} className="ghost py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Upload size={16} />Choose photo</button>
          </div>
          {a && b && imgs[a] && imgs[b] && (
            <div className="space-y-2">
              <div className="relative select-none" style={{ aspectRatio: "3/4", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <img src={imgs[b]} alt="Before" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, width: `${slider}%`, overflow: "hidden" }}><img src={imgs[a]} alt="After" style={{ width: `${10000 / slider}%`, height: "100%", objectFit: "cover", maxWidth: "none" }} /></div>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${slider}%`, width: 2, background: C.cyan, boxShadow: `0 0 8px ${C.glow}` }} />
                <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold" style={{ background: "rgba(0,0,0,.6)", color: "#fff", borderRadius: 4 }}>{label(a)}</span>
                <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold" style={{ background: "rgba(0,0,0,.6)", color: "#fff", borderRadius: 4 }}>{label(b)}</span>
              </div>
              <input type="range" min="2" max="98" value={slider} onChange={(e) => setSlider(+e.target.value)} className="w-full" aria-label="Compare slider" style={{ accentColor: C.cyan }} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {keys.slice(0, 12).map((k) => (
              <div key={k} className="relative">
                <button onClick={() => setPick((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k].slice(-2)))} className="w-full" style={{ aspectRatio: "3/4", borderRadius: 6, overflow: "hidden", border: `2px solid ${pick.includes(k) ? C.cyan : C.border}`, background: C.soft }}>
                  {imgs[k] ? <img src={imgs[k]} alt={label(k)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Loader2 size={16} className="animate-spin m-auto" />}
                </button>
                <div className="flex justify-between items-center body text-xs mt-0.5" style={{ color: C.dim }}><span>{label(k)}</span><button aria-label="Delete photo" onClick={() => ask("Delete this photo?", () => del(k), "Delete")} style={{ color: C.mute }}><Trash2 size={12} /></button></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
const MEASURES = [["arms", "Arms"], ["chest", "Chest"], ["waist", "Waist"], ["legs", "Thighs"]];
function Measurements({ s, setS }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({});
  const [pick, setPick] = useState("arms");
  const log = s.measure || {};
  const dates = Object.keys(log).sort();
  const last = dates.length ? log[dates[dates.length - 1]] : {};
  const save = () => {
    const entry = {}; MEASURES.forEach(([k]) => { if (+vals[k]) entry[k] = +vals[k]; });
    if (!Object.keys(entry).length) return;
    setS((p) => ({ ...p, measure: { ...(p.measure || {}), [today()]: { ...(p.measure?.[today()] || {}), ...entry } } })); setVals({});
  };
  const pts = dates.filter((d) => log[d][pick]).map((d) => ({ d, v: log[d][pick] }));
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><Ruler size={16} style={{ color: C.cyan }} />Measurements{dates.length ? ` · ${MEASURES.filter(([k]) => last[k]).map(([k, l]) => `${l} ${last[k]}"`).join(", ")}` : ""}</span><ChevronDown size={16} className="shrink-0" style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">{MEASURES.map(([k, l]) => <label key={k} className="body text-xs text-center" style={{ color: C.dim }}>{l}<input type="number" inputMode="decimal" step="0.25" className="inp text-center mt-0.5" placeholder={last[k] || "in"} value={vals[k] || ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></label>)}</div>
          <button onClick={save} className="btn w-full py-2 text-sm">Log today</button>
          {dates.length > 0 && (
            <>
              <div className="flex gap-2">{MEASURES.map(([k, l]) => <button key={k} onClick={() => setPick(k)} className="flex-1 py-1.5 text-xs font-semibold" style={{ borderRadius: 999, background: pick === k ? C.blue : C.soft, color: pick === k ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{l}</button>)}</div>
              <LineChart pts={pts} color={C.cyan} unit="in" fmt={(v) => v.toFixed(1)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Social: feed, crew goal, duels, sharing ---------- */
function postFeed(s, type, text, extra = {}, eventId = null) {
  if (!s.lb || !s.profile.name) return;
  const key = eventId ? `feed:${s.playerId}_${eventId}` : `feed:${Date.now()}_${s.playerId}`;
  publishShared(key, { type, text, name: s.profile.name, from: s.playerId, look: s.profile.look || null, t: Date.now(), ...extra });
}
async function readShared(prefix) {
  if (!window.storage?.list) return [];
  try {
    const res = await window.storage.list(prefix, true);
    const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? { key: k, ...JSON.parse(r.value) } : null; } catch { return null; } }));
    return items.filter(Boolean);
  } catch { return []; }
}
function Feed({ s, openProfile }) {
  const [items, setItems] = useState(null);
  const load = async () => {
    const all = (await readShared("feed:")).sort((a, b) => (b.t || 0) - (a.t || 0));
    const seen = new Map(), keep = [], dupes = [];
    all.forEach((x) => {
      const sig = `${x.from}|${x.type}|${(x.text || "").replace(/\+\d+ XP/, "")}|${x.detail || ""}`;
      const prev = seen.get(sig);
      if (prev && Math.abs((prev.t || 0) - (x.t || 0)) < 24 * 3600 * 1000) { dupes.push(x); return; }
      seen.set(sig, x); keep.push(x);
    });
    setItems(keep.slice(0, 40));
    dupes.filter((x) => x.from === s.playerId).slice(0, 25).forEach((x) => window.storage.delete(x.key, true).catch(() => {}));
    const cutoff = Date.now() - 14 * 86400000;
    all.filter((x) => (x.t || 0) < cutoff).slice(0, 10).forEach((x) => window.storage.delete(x.key, true).catch(() => {}));
  };
  useEffect(() => { load(); }, []);
  const icon = { pr: "🏆", rank: "⬆️", ach: "🎖️", workout: "🏋️", duel: "⚔️", mog: "🐟", level: "✨" };
  const tint = { pr: C.gold, rank: "#B14BFF", ach: C.orange, workout: C.cyan, duel: "#FF2D6F", mog: C.green, level: C.gold };
  const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; };
  return (
    <div>
      {items === null && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Loading feed…</div>}
      {items?.length === 0 && <Empty>Nothing yet. PRs, rank-ups, achievements, and shared workouts from the whole crew show up here.</Empty>}
      {items?.length > 0 && (
        <div className="panel overflow-hidden">
          {items.map((it, i) => (
            <div key={it.key} className="flex gap-3 items-start px-3 py-3" style={{ ...(i ? { borderTop: `1px solid ${C.border}` } : null), ...(it.type === "rank" && it.tier >= 5 ? { background: `linear-gradient(90deg, ${RANKS[Math.min(6, it.tier)].glow}, transparent 70%)`, borderLeft: `3px solid ${RANKS[Math.min(6, it.tier)].color}`, boxShadow: `inset 0 0 22px ${RANKS[Math.min(6, it.tier)].glow}` } : null) }}>
              <div className="shrink-0 flex items-center justify-center text-lg" style={{ width: 36, height: 36, borderRadius: 999, background: `${tint[it.type] || C.cyan}22`, border: `1px solid ${tint[it.type] || C.cyan}55` }}>{icon[it.type] || "•"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <button onClick={() => openProfile(it.from)} className="font-bold text-sm truncate"><FancyName name={it.name} look={it.look} /></button>
                  <span className="body text-xs shrink-0" style={{ color: C.mute }}>{ago(it.t)}</span>
                </div>
                <div className="body text-sm" style={{ color: C.text }}>{it.text}</div>
                {it.detail && <div className="body text-xs mt-0.5 truncate" style={{ color: C.dim }}>{it.detail}</div>}
              </div>
              {it.from === s.playerId && <button aria-label="Delete post" onClick={() => ask("Delete this post?", async () => { try { await window.storage.delete(it.key, true); setItems((x) => x.filter((y) => y.key !== it.key)); } catch (e) { /* ignore */ } }, "Delete")} className="p-1 shrink-0" style={{ color: C.mute }}><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const CREW_PER_PLAYER = 12, CREW_XP = 500, DUEL_XP = 100;
function Crew({ s, setS, gainXp, rows, openProfile }) {
  const ws = weekStart();
  const [duels, setDuels] = useState([]);
  useEffect(() => { readShared("duel:").then((d) => setDuels(d.filter((x) => x.from === s.playerId || x.to === s.playerId).sort((a, b) => (b.t || 0) - (a.t || 0)))); }, []);
  const cardOf = (id) => rows.find((r) => r.id === id || r.key === `lb:${id}`);
  const weekXpOf = (id, key) => { const c = cardOf(id); if (!c) return null; if (c.weekOf === key) return c.weekXp || 0; if (c.prevWeek?.key === key) return c.prevWeek.xp; return null; };
  const accept = async (d) => { try { await window.storage.set(d.key, JSON.stringify({ ...d, key: undefined, status: "on" }), true); setDuels((x) => x.map((y) => (y.key === d.key ? { ...y, status: "on" } : y))); } catch (e) { /* ignore */ } };
  const remove = async (d) => { try { await window.storage.delete(d.key, true); setDuels((x) => x.filter((y) => y.key !== d.key)); } catch (e) { /* ignore */ } };
  return (
    <div className="space-y-3">
      <CrewPanel s={s} setS={setS} rows={rows} />
      {s.crew?.code && <BossFight s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} scope="crew" crewId={s.crew.code} />}
      <BossFight s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} scope="global" />
      <h2 className="text-lg font-bold flex items-center gap-2"><Swords size={18} />XP duels</h2>
      {duels.length === 0 && <Empty>No duels. Open a cousin's profile from the board and challenge them to a 7-day XP duel.</Empty>}
      {duels.map((d) => {
        const me = d.from === s.playerId, other = me ? d.toName : d.fromName, otherId = me ? d.to : d.from;
        const over = ws > d.ws;
        const mine = weekXpOf(s.playerId, d.ws), theirs = weekXpOf(otherId, d.ws);
        const liveMine = d.ws === ws ? Object.entries(s.xpLog || {}).filter(([k]) => k >= ws).reduce((a, [, v]) => a + v, 0) : mine;
        const winner = over && liveMine !== null && theirs !== null ? (liveMine > theirs ? s.playerId : theirs > liveMine ? otherId : "tie") : null;
        return (
          <div key={d.key} className="panel p-3 space-y-1">
            {(() => { const mc = cardOf(s.playerId), oc = cardOf(otherId); return (
              <div className="flex items-center gap-2">
                <div className="flex-1 text-right min-w-0"><div className="font-bold text-sm truncate"><FancyName name={s.profile.name} look={s.profile.look} /></div>{mc?.title && <div className="text-xs font-bold uppercase tracking-wider" style={{ color: s.profile.look?.accent || C.cyan }}>{mc.title}</div>}</div>
                <span className="font-extrabold px-2" style={{ color: "#FF2D6F", fontFamily: "'Cinzel', serif" }}>VS</span>
                <button onClick={() => openProfile(otherId)} className="flex-1 text-left min-w-0"><div className="font-bold text-sm truncate"><FancyName name={other} look={oc?.look} /></div>{oc?.title && <div className="text-xs font-bold uppercase tracking-wider" style={{ color: oc?.look?.accent || C.cyan }}>{oc.title}</div>}</button>
              </div>
            ); })()}
            <div className="body text-xs text-center" style={{ color: C.dim }}>week of {new Date(d.ws + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
            {d.forfeit && <div className="body text-xs" style={{ color: C.orange }}>Loser: {d.forfeit}</div>}
            {d.status === "pending" && !me && <button onClick={() => accept(d)} className="btn w-full py-2 text-sm">Accept duel</button>}
            {d.status === "pending" && me && <div className="body text-xs" style={{ color: C.dim }}>Waiting for {other} to accept.</div>}
            {d.status === "on" && !over && <div className="body text-sm">You {liveMine ?? "?"} XP · {other} {theirs ?? "?"} XP <span style={{ color: C.dim }}>(live this week)</span></div>}
            {d.status === "on" && over && winner === null && <div className="body text-xs" style={{ color: C.dim }}>Waiting for {other} to open the app so their final score posts.</div>}
            {winner && <div className="font-bold" style={{ color: C.gold }}>{winner === "tie" ? "Dead heat." : winner === s.playerId ? `You won ${liveMine} to ${theirs}` : `${other} won ${theirs} to ${liveMine}`}{winner === s.playerId && !(s.duelClaimed || {})[d.id] && <button onClick={() => { setS((p) => ({ ...p, duelClaimed: { ...(p.duelClaimed || {}), [d.id]: true } })); gainXp(DUEL_XP, "Duel win", `duel_${d.id}`); }} className="ml-2 px-3 py-1 text-xs" style={{ borderRadius: 4, background: C.gold, color: "#0A1630" }}>Claim +{DUEL_XP}</button>}</div>}
            <button onClick={() => ask("Delete this duel?", () => remove(d), "Delete")} className="body text-xs underline" style={{ color: C.mute }}>Delete</button>
          </div>
        );
      })}
    </div>
  );
}
function DuelButton({ s, targetId, targetName, targetUid }) {
  const [forfeit, setForfeit] = useState("");
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const send = async () => {
    if (!s.lb || !s.profile.name) return;
    const id = uid();
    try { await window.storage.set(`duel:${id}`, JSON.stringify({ id, from: s.playerId, fromUid: window.ascendUserId || null, fromName: s.profile.name, to: targetId, toUid: targetUid || null, toName: targetName, ws: weekStart(), forfeit: forfeit.trim().slice(0, 60), status: "pending", t: Date.now() }), true); setSent(true); } catch (e) { /* ignore */ }
  };
  if (sent) return <div className="body text-sm" style={{ color: C.green }}>Duel sent. Check the Crew tab on the Board for standings.</div>;
  if (!open) return <button onClick={() => setOpen(true)} className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Swords size={16} />Challenge to a 7-day XP duel</button>;
  return (
    <div className="panel p-3 space-y-2">
      <div className="body text-sm" style={{ color: C.sub }}>Most XP earned this week wins {DUEL_XP} XP. Loser owes the forfeit.</div>
      <input className="inp text-sm" placeholder="Forfeit (optional), e.g. buys the shakes" value={forfeit} onChange={(e) => setForfeit(e.target.value)} />
      <div className="grid grid-cols-2 gap-2"><button onClick={() => setOpen(false)} className="ghost py-2 text-sm">Cancel</button><button onClick={send} className="btn py-2 text-sm">Send duel</button></div>
    </div>
  );
}
function SharePreset({ s, workout }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [done, setDone] = useState("");
  useEffect(() => { if (open) readShared("lb:").then((r) => setRows(r.filter((x) => x.id !== s.playerId && x.name))); }, [open]);
  const send = async (r) => {
    const exercises = workout.exercises.map((e) => ({ name: e.name, sets: e.sets.length }));
    try { await window.storage.set(`preset:${uid()}`, JSON.stringify({ to: r.id, toUid: r.uid || null, fromUid: window.ascendUserId || null, from: s.playerId, fromName: s.profile.name, name: workout.title || `${s.profile.name}'s workout`, exercises, t: Date.now() }), true); setDone(r.name); } catch (e) { /* ignore */ }
  };
  if (done) return <span className="body text-xs" style={{ color: C.green }}>Sent to {done}</span>;
  if (!open) return <button aria-label="Send as preset" onClick={() => setOpen(true)} style={{ color: C.cyan }}><Send size={16} /></button>;
  return <div className="flex gap-1 flex-wrap">{rows.length === 0 ? <span className="body text-xs" style={{ color: C.dim }}>No one else on the board</span> : rows.map((r) => <button key={r.id} onClick={() => send(r)} className="ghost px-2 py-1 text-xs">{r.name}</button>)}<button onClick={() => setOpen(false)} className="body text-xs" style={{ color: C.mute }}>×</button></div>;
}
function SharedPresets({ s, setS }) {
  const [items, setItems] = useState([]);
  useEffect(() => { readShared("preset:").then((r) => setItems(r.filter((x) => x.to === s.playerId))); }, []);
  if (!items.length) return null;
  const save = async (it) => { setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== it.name), { id: uid(), name: it.name, exercises: it.exercises }] })); try { await window.storage.delete(it.key, true); } catch (e) { /* ignore */ } setItems((x) => x.filter((y) => y.key !== it.key)); };
  return (
    <div className="space-y-1">
      <div className="body text-xs font-bold" style={{ color: C.cyan }}>Shared with you</div>
      {items.map((it) => <div key={it.key} className="ghost flex items-center"><div className="flex-1 p-2 min-w-0"><div className="font-semibold text-sm">{it.name} <span className="body text-xs font-normal" style={{ color: C.dim }}>from {it.fromName}</span></div><div className="body text-xs truncate" style={{ color: C.dim }}>{it.exercises.map((e) => `${e.name} ×${e.sets}`).join(" · ")}</div></div><button onClick={() => save(it)} className="btn px-3 py-1.5 text-xs mr-2">Save</button></div>)}
    </div>
  );
}

/* ---------- Sterling weekly plan ---------- */
function PlanGenerator({ s, setS }) {
  const [state, setState] = useState({ status: "idle", days: [] });
  const build = async () => {
    setState({ status: "loading", days: [] });
    try {
      const names = allExercises(s).map((e) => e.name).join(", ");
      const ranks = rankedLifts(s).slice(0, 12).map((r) => `${r.e.name} ${r.label}`).join(", ");
      const titles = [...new Set(s.workouts.map((w) => w.title).filter(Boolean))].join(", ");
      const g = groupScores(s);
      const weak = Object.keys(GROUP_WEIGHT).sort((a, b) => (g[a] || 0) - (g[b] || 0)).slice(0, 2).join(" and ");
      const r = await askJson(STERLING_SYS, `Write a 4-day training week for this lifter. Ranks: ${ranks || "none yet"}. Weakest groups: ${weak}. Titles they usually use: ${titles || "none"}. Bodyweight ${s.profile.weight} lb. Use exercise names ONLY from this list, spelled exactly: ${names}. 5 to 7 exercises per day, 3 to 4 sets each, sensible splits. Respond ONLY with JSON: {"quip": "one funny line", "days": [{"name": "short day title", "exercises": [{"name": "exact name", "sets": n}]}]}`, 1400);
      const valid = new Set(allExercises(s).map((e) => e.name));
      const days = (r.days || []).map((d) => ({ name: String(d.name || "Day").slice(0, 24), exercises: (d.exercises || []).filter((e) => valid.has(e.name)).map((e) => ({ name: e.name, sets: Math.max(1, Math.min(6, +e.sets || 3)) })) })).filter((d) => d.exercises.length);
      if (!days.length) throw new Error("empty");
      setState({ status: "done", days, quip: r.quip });
    } catch (e) { setState({ status: "error", days: [] }); }
  };
  const save = () => { setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => !state.days.some((d) => d.name === x.name)), ...state.days.map((d) => ({ id: uid(), name: d.name, exercises: d.exercises }))] })); setState({ status: "saved", days: [] }); };
  return (
    <div className="space-y-2">
      {state.status === "idle" && <button onClick={build} className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Bot size={16} />Sterling, build my week</button>}
      {state.status === "loading" && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Drafting a week that respects your weaknesses…</div>}
      {state.status === "error" && <button onClick={build} className="ghost w-full py-2 text-sm">Couldn't reach Sterling. Try again</button>}
      {state.status === "saved" && <div className="body text-sm" style={{ color: C.green }}>Saved as presets. Load one to start.</div>}
      {state.status === "done" && (
        <div className="panel p-3 space-y-2">
          {state.quip && <div className="body text-sm italic" style={{ color: C.sub }}>"{state.quip}"</div>}
          {state.days.map((d, i) => <div key={i} className="body text-sm"><span className="font-bold" style={{ color: C.cyan }}>{d.name}:</span> <span style={{ color: C.sub }}>{d.exercises.map((e) => `${e.name} ×${e.sets}`).join(", ")}</span></div>)}
          <div className="grid grid-cols-2 gap-2"><button onClick={build} className="ghost py-2 text-sm">Redo</button><button onClick={save} className="btn py-2 text-sm">Save all as presets</button></div>
        </div>
      )}
    </div>
  );
}

/* ---------- Export ---------- */
function downloadText(name, text) {
  const blob = new Blob([text], { type: "text/csv" }), url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
function exportWorkouts(s) {
  const rows = [["date", "title", "exercise", "set", "weight", "reps", "workout_xp"]];
  s.workouts.forEach((w) => w.exercises.forEach((ex) => ex.sets.forEach((st, i) => rows.push([w.date, w.title || "", ex.name, i + 1, st.w ?? "", st.r ?? "", w.xp ?? ""]))));
  downloadText("ascend-workouts.csv", rows.map((r) => r.map(csvCell).join(",")).join("\n"));
}
function exportFood(s) {
  const rows = [["date", "food", "servings", "calories", "protein", "carbs", "fat"]];
  Object.keys(s.meals || {}).sort().forEach((d) => (s.meals[d] || []).forEach((m) => rows.push([d, m.name, m.qty, Math.round(m.cal * m.qty), Math.round(m.p * m.qty), Math.round(m.c * m.qty), Math.round(m.f * m.qty)])));
  downloadText("ascend-food.csv", rows.map((r) => r.map(csvCell).join(",")).join("\n"));
}

/* ---------- Versus (PvP) ---------- */
function VersusPanel({ s, data, me, id, setS, gainXp }) {
  const mine = profileCard(s);
  const them = data;
  const mr = RANKS.find((r) => r.id === mine.rank) || RANKS[0], tr = RANKS.find((r) => r.id === them.rank) || RANKS[0];
  const Side = ({ c, r, right }) => (
    <div className={`flex-1 flex flex-col items-center text-center min-w-0 ${right ? "" : ""}`}>
      <Avatar src={c.avatar} name={c.name} size={64} ring={c.look?.accent || r.color} look={c.look} />
      <div className="font-bold mt-2 truncate w-full"><FancyName name={c.name} look={c.look} /></div>
      {c.title && <div className="text-xs font-bold tracking-wider uppercase" style={{ color: c.look?.accent || C.cyan }}>{c.title}</div>}
      <div className="mt-1"><RankBadge rank={r} size={34} /></div>
      <div className="ranklabel text-sm font-bold" style={{ color: r.color }}>{c.rank}{c.div ? ` ${c.div}` : ""}</div>
    </div>
  );
  const row = (label, a, b, fmt = (v) => v) => {
    const av = a ?? 0, bv = b ?? 0;
    return <div key={label} className="grid items-center text-sm" style={{ gridTemplateColumns: "1fr auto 1fr" }}><span className="text-right font-bold" style={{ color: av > bv ? C.green : av < bv ? C.dim : C.text }}>{fmt(av)}</span><span className="body text-xs px-3" style={{ color: C.mute }}>{label}</span><span className="font-bold" style={{ color: bv > av ? C.green : bv < av ? C.dim : C.text }}>{fmt(bv)}</span></div>;
  };
  return (
    <div className="panel p-4 space-y-3" style={{ borderColor: "#FF2D6F" }}>
      <div className="flex items-center justify-between"><div className="font-bold flex items-center gap-2"><Swords size={18} style={{ color: "#FF2D6F" }} />Versus</div><span className="body text-xs" style={{ color: C.dim }}>duels & mog-offs</span></div>
      <div className="flex items-center gap-2">
        <Side c={mine} r={mr} />
        <div className="text-3xl font-extrabold shrink-0" style={{ color: "#FF2D6F", textShadow: "0 0 14px rgba(255,45,111,.7)", fontFamily: "'Cinzel', serif" }}>VS</div>
        <Side c={them} r={tr} right />
      </div>
      <div className="space-y-1 py-2" style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        {row("level", mine.lvl, them.lvl)}
        {row("points", mine.points, them.points, (v) => v.toLocaleString())}
        {row("streak", mine.streak, them.streak, (v) => `${v}d`)}
        {row("XP this week", mine.weekXp, them.weekOf === mine.weekOf ? them.weekXp : 0, (v) => v.toLocaleString())}
        {row("workouts", mine.stats?.workouts, them.stats?.workouts)}
      </div>
      <button onClick={() => setS((p) => ({ ...p, nemesis: p.nemesis?.id === id ? null : { id, name: them.name }, nemesisSeen: {} }))} className="ghost w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2" style={{ color: s.nemesis?.id === id ? "#FF6B8F" : C.text, borderColor: s.nemesis?.id === id ? "rgba(255,45,111,.5)" : C.glassLine }}>😈 {s.nemesis?.id === id ? "Your nemesis · tap to remove" : "Mark as nemesis"}</button>
      <DuelButton s={s} targetId={id} targetName={them.name} targetUid={them.uid} />
      <MogSection s={s} setS={setS} gainXp={gainXp} me={me} targetId={id} targetName={them.name} targetUid={them.uid} embedded />
    </div>
  );
}


function QuestAdd({ unit, onAdd }) {
  const [v, setV] = useState("");
  const go = () => { const n = +v; if (n > 0) { onAdd(n); setV(""); } };
  return (
    <div className="flex items-center gap-1">
      <input type="number" inputMode="decimal" className="inp text-sm" style={{ width: 62, padding: "5px 6px" }} placeholder={unit} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} aria-label={`Add ${unit}`} />
      <button onClick={go} disabled={!(+v > 0)} className="btn px-2.5 py-1.5 text-sm">Add</button>
    </div>
  );
}

/* ---------- Physique avatars ---------- */
const TIER_IDS = ["E", "D", "C", "B", "A", "S", "SS"];
function Physique({ tier = 0, height = 220, aura, caption }) {
  const id = TIER_IDS[Math.max(0, Math.min(6, Math.floor(tier)))];
  const rank = RANKS[Math.max(0, Math.min(6, Math.floor(tier)))];
  return (
    <div className="relative flex flex-col items-center" style={{ height: height + (caption ? 24 : 0) }}>
      <div className="absolute" style={{ top: height * 0.08, width: height * 0.62, height: height * 0.8, borderRadius: "50%", background: `radial-gradient(closest-side, ${rank.glow}, transparent)`, filter: "blur(10px)" }} />
      {aura && aura !== "none" && <AuraRing aura={aura} size={height * 0.7} style={{ top: height * 0.05 }} />}
      <img src={`/avatars/${id}.webp`} alt={`${id}-rank physique`} loading="lazy" style={{ height, width: "auto", position: "relative", filter: `drop-shadow(0 8px 24px rgba(0,0,0,.6))` }} />
      {caption && <div className="body text-xs mt-1" style={{ color: C.dim }}>{caption}</div>}
    </div>
  );
}

/* ---------- Auras + borders ---------- */
const AURAS = [
  { id: "none", name: "None", how: "" },
  { id: "ember", name: "Ember", how: "Any lift at D", tier: 1, colors: ["#FF9340", "#FF4D6D"] },
  { id: "tide", name: "Tide", how: "Any lift at C", tier: 2, colors: ["#38C6FF", "#2F6BFF"] },
  { id: "storm", name: "Storm", how: "Any lift at B", tier: 3, colors: ["#B14BFF", "#38C6FF"] },
  { id: "inferno", name: "Inferno", how: "Any lift at A", tier: 4, colors: ["#FF2D6F", "#FFB43C"] },
  { id: "halo", name: "Halo", how: "Any lift at S", tier: 5, colors: ["#FFD447", "#FFFFFF"] },
  { id: "godray", name: "Godray", how: "Any lift at SS", tier: 6, colors: ["#FFFFFF", "#7DF9FF"] },
  { id: "wyrm", name: "Wyrmfire", how: "Defeat the Iron Wyrm", loot: "wyrm", colors: ["#3DF08A", "#FFD447"] },
  { id: "frost", name: "Frostbite", how: "Defeat the Frost Colossus", loot: "colossus", colors: ["#B3ECFF", "#FFFFFF"] },
  { id: "abyss", name: "Abyss", how: "Defeat the Gravemaw", loot: "gravemaw", colors: ["#6A00FF", "#FF2D6F"] },
  { id: "chud", name: "Chud", how: "Defeat the Chud King", loot: "chud", colors: ["#FFB43C", "#8BC34A"], emoji: ["🍔", "💨", "🍔", "💨", "🍟"] },
  { id: "rust", name: "Rustfall", how: "Defeat the Rust Titan", loot: "rust", colors: ["#C7743A", "#6B3A1E"] },
  { id: "thunder", name: "Thunderhead", how: "Defeat the Stormcaller Harpy", loot: "harpy", colors: ["#7DD3FC", "#FFF27A"], emoji: ["⚡", "⚡", "⚡"] },
  { id: "hollow", name: "Hollow Steel", how: "Defeat the Hollow Warden", loot: "warden", colors: ["#9AA7BD", "#FFFFFF"] },
  { id: "deep", name: "The Deep", how: "Defeat the Leviathan", loot: "leviathan", colors: ["#2F6BFF", "#00D9FF"], emoji: ["🫧", "🫧", "🫧"] },
  { id: "magma", name: "Magma", how: "Defeat the Molten Behemoth", loot: "behemoth", colors: ["#FF5A1F", "#FFD447"] },
  { id: "plague", name: "Plague", how: "Defeat the Plague Rat Lord", loot: "ratlord", colors: ["#8BC34A", "#3E5F1A"] },
  { id: "sand", name: "Sandstorm", how: "Defeat the Sandstorm Pharaoh", loot: "pharaoh", colors: ["#E8C872", "#B8860B"] },
  { id: "void", name: "Void", how: "Defeat the Void Sovereign", loot: "void", colors: ["#6A00FF", "#000000"] },
  { id: "yogurt", name: "Yogurt", how: "Yogurt Male achievement (100 yogurts)", ach: "yogurt-0", colors: ["#FFF8E7", "#F1DDB5"], emoji: ["🥣", "🥛", "🥣"] },
  { id: "champion", name: "Champion", how: "Win a season", season: true, colors: ["#FFD447", "#FF9340"] },
];
const BORDERS = [
  { id: "none", name: "Default", how: "" },
  { id: "steel", name: "Steel", how: "Any lift at D", tier: 1, css: "linear-gradient(135deg,#dfe6ee,#6f7c8c,#dfe6ee)" },
  { id: "gold", name: "Gold", how: "Any lift at B", tier: 3, css: "linear-gradient(135deg,#fff1b8,#c9962e,#fff1b8)" },
  { id: "prism", name: "Prism", how: "Any lift at A", tier: 4, css: "conic-gradient(#ff3cac,#ffb43c,#3cff9e,#3cc8ff,#9b5cff,#ff3cac)", spin: true },
  { id: "obsidian", name: "Obsidian", how: "Any lift at S", tier: 5, css: "conic-gradient(#000,#FFD447,#000,#FFD447,#000)", spin: true },
  { id: "bone", name: "Bone crown", how: "Defeat any boss", loot: "any", css: "linear-gradient(135deg,#f4ead2,#8a7a5c,#f4ead2)" },
  { id: "laurel", name: "Laurel", how: "Top 3 in a season", season: true, css: "linear-gradient(135deg,#caffb0,#2f8f3a,#caffb0)" },
];
const bestTier = (s) => Math.floor(Object.values(groupScores(s)).reduce((a, b) => Math.max(a, b), 0));
function unlocked(item, s) {
  if (item.id === "none") return true;
  if (item.tier !== undefined) return bestTier(s) >= item.tier;
  if (item.loot) return item.loot === "any" ? (s.loot?.bosses || []).length > 0 : (s.loot?.bosses || []).includes(item.loot);
  if (item.ach) return !!s.ach?.[item.ach];
  if (item.season) return item.id === "champion" ? Object.values(s.seasonBadges || {}).some((b) => b.place === 1) : Object.keys(s.seasonBadges || {}).length > 0;
  return false;
}
function AuraRing({ aura, size, style }) {
  const a = AURAS.find((x) => x.id === aura);
  if (!a || !a.colors) return null;
  const [c1, c2] = a.colors;
  return (
    <div aria-hidden="true" className="absolute pointer-events-none" style={{ width: size, height: size, borderRadius: "50%", ...style }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(from 0deg, ${c1}, transparent 30%, ${c2}, transparent 70%, ${c1})`, filter: `blur(${Math.max(4, size / 12)}px)`, opacity: 0.85, animation: "rkspin 6s linear infinite" }} />
      <div style={{ position: "absolute", inset: size * 0.08, borderRadius: "50%", background: `radial-gradient(closest-side, ${c2}55, transparent)`, animation: "aurapulse 2.8s ease-in-out infinite" }} />
      {a.emoji && a.emoji.map((em, i) => {
        const n = a.emoji.length, ang = (i / n) * 360;
        return <span key={i} style={{ position: "absolute", left: "50%", top: "50%", fontSize: Math.max(10, size * 0.14), lineHeight: 1, transformOrigin: "0 0", animation: `auraorbit ${7 + i}s linear infinite`, animationDelay: `${-i * 1.3}s`, "--r": `${size * 0.46}px`, "--a": `${ang}deg` }}><span style={{ display: "inline-block", transform: "translate(-50%,-50%)", animation: `aurabob ${1.8 + (i % 3) * 0.4}s ease-in-out infinite` }}>{em}</span></span>;
      })}
    </div>
  );
}

/* ---------- The Juice ---------- */
function juice(kind = "pr") {
  try { window.dispatchEvent(new CustomEvent("ascend-juice", { detail: kind })); } catch (e) { /* ignore */ }
  if (kind === "pr") { SFX.slam(); try { navigator.vibrate?.([70, 40, 140]); } catch (e) { /* unsupported */ } }
  else { SFX.thud(); try { navigator.vibrate?.(60); } catch (e) { /* unsupported */ } }
}
function JuiceBurst({ kind }) {
  const big = kind === "pr";
  const n = big ? 42 : 22;
  const cols = big ? ["#FFD447", "#FFFFFF", "#FF9340", "#F5D27A"] : ["#38C6FF", "#FFFFFF", "#3DF08A"];
  return (
    <div aria-hidden="true" className="fixed inset-0 z-[65] pointer-events-none overflow-hidden">
      <div className="absolute inset-0" style={{ background: big ? "radial-gradient(circle at 50% 45%, rgba(255,212,71,.35), transparent 60%)" : "radial-gradient(circle at 50% 45%, rgba(56,198,255,.22), transparent 55%)", animation: "juiceflash .7s ease-out forwards" }} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2, d = (big ? 180 : 120) + ((i * 37) % 120);
        return <span key={i} style={{ position: "absolute", left: "50%", top: "45%", width: i % 4 ? 6 : 10, height: i % 5 ? 6 : 14, borderRadius: i % 3 ? 999 : 2, background: cols[i % cols.length], boxShadow: `0 0 8px ${cols[i % cols.length]}`, "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d + 60}px`, "--rot": `${(i * 47) % 360}deg`, animation: `juicespark ${0.9 + (i % 5) * 0.12}s cubic-bezier(.15,.8,.3,1) forwards` }} />;
      })}
      {big && <div className="absolute left-1/2 top-[38%] text-5xl font-black tracking-widest" style={{ transform: "translateX(-50%)", color: "#FFD447", textShadow: "0 0 30px rgba(255,212,71,.9)", fontFamily: "'Cinzel', serif", animation: "juicetext 1.4s ease-out forwards" }}>PR</div>}
    </div>
  );
}

/* ---------- Share receipts ---------- */
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
async function buildReceipt({ s, kind, headline, sub, rows, tierImg, footer }) {
  const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const oc = overallRank(s);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0b1430"); g.addColorStop(1, "#000"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const rg = x.createRadialGradient(W / 2, 380, 40, W / 2, 380, 620); rg.addColorStop(0, `${oc.color}55`); rg.addColorStop(1, "transparent"); x.fillStyle = rg; x.fillRect(0, 0, W, H);
  const [logo, phys] = await Promise.all([loadImg("/logo.webp"), tierImg !== undefined ? loadImg(`/avatars/${TIER_IDS[tierImg]}.webp`) : Promise.resolve(null)]);
  if (logo) { const lw = 150, lh = (logo.height / logo.width) * lw; x.drawImage(logo, 70, 60, lw, lh); }
  x.fillStyle = "#C9B57A"; x.font = "600 28px Inter, system-ui, sans-serif"; x.textAlign = "right"; x.fillText("ASCEND", W - 70, 110);
  x.fillStyle = "rgba(255,255,255,.55)"; x.font = "500 26px Inter, system-ui, sans-serif"; x.fillText(new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }), W - 70, 150);
  if (phys) { const ph = 620, pw = (phys.width / phys.height) * ph; x.globalAlpha = 0.9; x.drawImage(phys, W - pw - 20, 250, pw, ph); x.globalAlpha = 1; }
  x.textAlign = "left";
  x.fillStyle = oc.color; x.font = "700 30px Inter, system-ui, sans-serif"; x.fillText(kind.toUpperCase(), 70, 300);
  x.fillStyle = "#fff"; x.font = "800 92px Inter, system-ui, sans-serif";
  const words = String(headline).split(" "); let line = "", y = 400;
  words.forEach((w) => { const t = line ? `${line} ${w}` : w; if (x.measureText(t).width > 620 && line) { x.fillText(line, 70, y); line = w; y += 100; } else line = t; });
  x.fillText(line, 70, y);
  if (sub) { x.fillStyle = "rgba(255,255,255,.7)"; x.font = "500 36px Inter, system-ui, sans-serif"; x.fillText(sub, 70, y + 64); }
  let ry = 960;
  (rows || []).slice(0, 4).forEach(([label, value]) => {
    x.fillStyle = "rgba(255,255,255,.07)"; x.beginPath(); x.roundRect?.(70, ry - 58, W - 140, 84, 20); if (!x.roundRect) x.rect(70, ry - 58, W - 140, 84); x.fill();
    x.fillStyle = "rgba(255,255,255,.65)"; x.font = "500 32px Inter, system-ui, sans-serif"; x.fillText(label, 100, ry);
    x.fillStyle = "#fff"; x.font = "700 36px Inter, system-ui, sans-serif"; x.textAlign = "right"; x.fillText(String(value), W - 100, ry); x.textAlign = "left";
    ry += 100;
  });
  x.fillStyle = "#fff"; x.font = "700 40px Inter, system-ui, sans-serif"; x.fillText(s.profile.name || "Ascend lifter", 70, H - 90);
  x.fillStyle = oc.color; x.font = "600 30px Inter, system-ui, sans-serif"; x.fillText(`${overallInfo(s).label} · Level ${levelFromXp(s.xp).lvl}`, 70, H - 48);
  x.fillStyle = "rgba(255,255,255,.5)"; x.textAlign = "right"; x.font = "500 28px Inter, system-ui, sans-serif"; x.fillText(footer || "ascendfit.site", W - 70, H - 48);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}
function ReceiptButton({ make, label = "Share card", small }) {
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState(false);
  const blobRef = useRef(null);
  const open = async () => { setBusy(true); try { const b = await make(); blobRef.current = b; setImg(URL.createObjectURL(b)); } catch (e) { /* ignore */ } setBusy(false); };
  const close = () => { if (img) URL.revokeObjectURL(img); setImg(null); };
  const share = async () => {
    const file = new File([blobRef.current], "ascend.png", { type: "image/png" });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Ascend" }); return; } } catch (e) { if (e?.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = img; a.download = "ascend.png"; document.body.appendChild(a); a.click(); a.remove();
  };
  return (
    <>
      <button onClick={open} disabled={busy} aria-label={label} className={small ? "" : "ghost px-3 py-2 text-sm font-semibold flex items-center gap-2"} style={{ color: C.cyan }}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}{small ? null : label}
      </button>
      {img && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-5 gap-3" style={{ background: "rgba(0,0,0,.85)", backdropFilter: "blur(8px)" }} onClick={close}>
          <img src={img} alt="Share card" style={{ maxHeight: "70vh", maxWidth: "100%", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.6)" }} onClick={(e) => e.stopPropagation()} />
          <div className="flex gap-2 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button onClick={close} className="ghost flex-1 py-3 font-semibold">Close</button>
            <button onClick={share} className="btn flex-1 py-3">Share or save</button>
          </div>
          <div className="body text-xs" style={{ color: "rgba(255,255,255,.6)" }}>On iPhone, choose "Save Image" to post it anywhere.</div>
        </div>
      )}
    </>
  );
}

/* ---------- Boss fights ---------- */
const BOSSES = [
  { id: "wyrm", name: "The Iron Wyrm", tag: "Coils of cold steel", color: "#3DF08A", icon: "🐉", title: "Wyrmslayer", aura: "wyrm" },
  { id: "colossus", name: "Frost Colossus", tag: "A glacier that learned to walk", color: "#B3ECFF", icon: "🧊", title: "Icebreaker", aura: "frost" },
  { id: "gravemaw", name: "Gravemaw", tag: "It eats skipped leg days", color: "#B14BFF", icon: "💀", title: "Gravebane", aura: "abyss" },
  { id: "chud", name: "The Chud King", tag: "Rules from a throne of double cheeseburgers", color: "#FFB43C", icon: "chud", title: "Chud King", aura: "chud" },
  { id: "rust", name: "The Rust Titan", tag: "Every rep a grinding gear", color: "#C7743A", icon: "⚙️", title: "Titanbreaker", aura: "rust" },
  { id: "harpy", name: "Stormcaller Harpy", tag: "Screeches at half reps", color: "#7DD3FC", icon: "⚡", title: "Stormbound", aura: "thunder" },
  { id: "warden", name: "The Hollow Warden", tag: "An empty suit of armor that never skips a set", color: "#9AA7BD", icon: "🗡️", title: "Wardenbane", aura: "hollow" },
  { id: "leviathan", name: "Leviathan of the Deep", tag: "Drags lifters into the abyss of cardio", color: "#2F6BFF", icon: "🐙", title: "Tidebreaker", aura: "deep" },
  { id: "behemoth", name: "Molten Behemoth", tag: "Sweats lava, lifts mountains", color: "#FF5A1F", icon: "🌋", title: "Magmaforged", aura: "magma" },
  { id: "ratlord", name: "The Plague Rat Lord", tag: "Hoards chalk and dirty towels", color: "#8BC34A", icon: "🐀", title: "Ratcatcher", aura: "plague" },
  { id: "pharaoh", name: "Sandstorm Pharaoh", tag: "Buried his gains for 3,000 years", color: "#E8C872", icon: "🏺", title: "Sunbreaker", aura: "sand" },
  { id: "void", name: "The Void Sovereign", tag: "The end of all excuses", color: "#6A00FF", icon: "🌑", title: "Voidwalker", aura: "void" },
];
const BOSS_HP_PER_PLAYER = 60000, BOSS_XP = 600;
// Sleeping well and feeling good makes you hit harder today
function buffToday(s) {
  if (!s) return 1;
  const ci = s.checkins?.[today()] || {};
  let m = 1;
  if (ci.sleep >= 8) m += 0.05; else if (ci.sleep === 7) m += 0.02;
  if (ci.mood === "Fired up") m += 0.05; else if (ci.mood === "Good") m += 0.02;
  return Math.round(m * 100) / 100;
}
const bossDamage = (card, mk, selfState = null) => {
  const base = card?.month?.key === mk ? Math.round((card.month.volume || 0) + (card.month.reps || 0) * 5 + (card.month.miles || 0) * 800) : 0;
  return Math.round(base * (selfState ? buffToday(selfState) : 1));
};
function BossFight({ s, setS, gainXp, rows, openProfile, scope = "global", crewId = null }) {
  const mk = monthKey();
  const [crew, setCrew] = useState(null);
  useEffect(() => { if (crewId) readCrew(crewId).then(setCrew); }, [crewId]);
  const mi = (parseInt(mk.slice(5, 7), 10) - 1) % BOSSES.length;
  const boss = scope === "crew" ? BOSSES[(mi + 6) % BOSSES.length] : BOSSES[mi];
  const crewRows = scope === "crew" ? rows.filter((r) => (crew?.members || [s.playerId]).includes(r.id)) : rows;
  const players = Math.max(1, crewRows.length);
  // crews get a smaller pool; the global boss scales with everyone in the season
  const hp = scope === "crew" ? Math.round(BOSS_HP_PER_PLAYER * 0.6 * players) : Math.round(BOSS_HP_PER_PLAYER * (players + 2) * 1.15);
  const dmg = crewRows.map((r) => ({ r, d: bossDamage(r, mk, r.id === s.playerId ? s : null) })).sort((a, b) => b.d - a.d);
  const total = dmg.reduce((a, x) => a + x.d, 0);
  const left = Math.max(0, hp - total), dead = left === 0, pct = left / hp;
  const mine = dmg.find((x) => x.r.id === s.playerId)?.d || 0;
  const claimed = s.loot?.claimed?.[`${mk}_${scope}`] || (scope === "global" && s.loot?.claimed?.[mk]);
  const [hit, setHit] = useState(false);
  const prev = useRef(total);
  useEffect(() => { if (total > prev.current) { setHit(true); const t = setTimeout(() => setHit(false), 500); prev.current = total; return () => clearTimeout(t); } prev.current = total; }, [total]);
  const monthName = new Date(`${mk}-01T12:00`).toLocaleDateString(undefined, { month: "long" });
  const claim = () => {
    setS((p) => ({ ...p, loot: { ...(p.loot || {}), bosses: [...new Set([...(p.loot?.bosses || []), boss.id])], claimed: { ...(p.loot?.claimed || {}), [`${mk}_${scope}`]: true } } }));
    gainXp(BOSS_XP, `Defeated ${boss.name}`, `boss_${mk}_${boss.id}${crewId ? `_${crewId}` : ""}`); juice("pr");
  };
  return (
    <div className="panel p-5 space-y-4 overflow-hidden" style={{ borderColor: `${boss.color}55` }}>
      <div className="flex items-center gap-4">
<BossArt boss={boss} pct={pct} dead={dead} hit={hit} />
        <div className="flex-1 min-w-0">
          <div className="body text-xs font-semibold uppercase tracking-wider" style={{ color: C.dim }}>{scope === "crew" ? `${crew?.name || "Crew"} boss` : `Global boss · ${monthName}`}{pct <= 0.5 && !dead ? " · ENRAGED" : ""}</div>
          <div className="text-xl font-bold" style={{ color: dead ? C.dim : C.text, textDecoration: dead ? "line-through" : "none" }}>{boss.name}</div>
          <div className="body text-xs" style={{ color: C.dim }}>{boss.tag}</div>
        </div>
      </div>
      <div>
        <div className="h-4 overflow-hidden relative" style={{ borderRadius: 999, background: "rgba(255,255,255,.08)", boxShadow: pct <= 0.5 && !dead ? "0 0 14px rgba(255,45,45,.5)" : "none" }}>
          <div className="h-full" style={{ width: `${(left / hp) * 100}%`, borderRadius: 999, background: `linear-gradient(90deg, #FF2D6F, ${boss.color})`, transition: "width .8s cubic-bezier(.2,.8,.2,1)", boxShadow: `0 0 14px ${boss.color}` }} />
        </div>
        <div className="flex justify-between body text-xs mt-1.5" style={{ color: C.dim }}><span>{dead ? "Defeated" : `${left.toLocaleString()} HP left`}</span><span>{hp.toLocaleString()} HP</span></div>
      </div>
      <div className="body text-xs" style={{ color: C.dim }}>{scope === "crew" ? "Only your crew's damage counts here." : `Scaled to the ${players} player${players === 1 ? "" : "s"} in the season.`} Every pound lifted is 1 damage, every rep is 5, and every cardio mile is 800. Logging 8h sleep and a good mood adds up to a 1.1× multiplier today (yours: {buffToday(s)}×). Loot: the {AURAS.find((a) => a.loot === boss.id)?.name} aura, the {boss.title} title, the Bone crown border, and {BOSS_XP} XP for everyone who hit it.</div>
      {dmg.filter((x) => x.d > 0).length > 0 && (
        <div className="space-y-1.5">
          {dmg.filter((x) => x.d > 0).slice(0, 6).map(({ r, d }) => (
            <button key={r.key || r.id} onClick={() => openProfile(r.id)} className="w-full flex items-center gap-2 text-sm">
              <span className="flex-1 text-left truncate"><FancyName name={r.name} look={r.look} /></span>
              <span className="body text-xs" style={{ color: C.dim }}>{Math.round((d / Math.max(1, total)) * 100)}%</span>
              <span className="font-semibold tabular-nums">{d.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
      {dead && mine > 0 && !claimed && <button onClick={claim} className="btn w-full py-3">Claim loot</button>}
      {claimed && <div className="body text-sm text-center" style={{ color: C.green }}>Loot claimed. Equip it in Profile → Customize.</div>}
      {dead && mine === 0 && <div className="body text-xs text-center" style={{ color: C.dim }}>Log a workout this month to earn a share of the loot.</div>}
    </div>
  );
}

/* ---------- Seasons ---------- */
const seasonKey = (d = today()) => `${d.slice(0, 4)}-S${Math.floor((parseInt(d.slice(5, 7), 10) - 1) / 3) + 1}`;
const seasonStart = (key) => { const [y, q] = key.split("-S"); return `${y}-${String((+q - 1) * 3 + 1).padStart(2, "0")}-01`; };
const nextSeasonStart = (key) => { const [y, q] = key.split("-S").map(Number); return q === 4 ? `${y + 1}-01-01` : `${y}-${String(q * 3 + 1).padStart(2, "0")}-01`; };
const prevSeasonKey = (key) => { const [y, q] = key.split("-S").map(Number); return q === 1 ? `${y - 1}-S4` : `${y}-S${q - 1}`; };
const seasonXp = (s, key) => { const a = seasonStart(key), b = nextSeasonStart(key); return Object.entries(s.xpLog || {}).filter(([d]) => d >= a && d < b).reduce((t, [, v]) => t + v, 0); };
async function settleSeason(s, setS, rows) {
  const last = prevSeasonKey(seasonKey());
  let rec = null;
  try { const r = await window.storage.get(`season:${last}`, true); rec = r?.value ? JSON.parse(r.value) : null; } catch (e) { rec = null; }
  if (!rec) {
    const ranked = rows.filter((r) => r.prevSeason?.key === last && r.prevSeason.xp > 0).sort((a, b) => b.prevSeason.xp - a.prevSeason.xp).slice(0, 3);
    if (!ranked.length) return;
    rec = { key: last, winners: ranked.map((r, i) => ({ id: r.id, name: r.name, xp: r.prevSeason.xp, place: i + 1 })), t: Date.now() };
    try { await window.storage.set(`season:${last}`, JSON.stringify(rec), true); } catch (e) { /* someone else already wrote it */ }
  }
  const mine = rec.winners?.find((w) => w.id === s.playerId);
  if (mine && !s.seasonBadges?.[last]) setS((p) => ({ ...p, seasonBadges: { ...(p.seasonBadges || {}), [last]: { place: mine.place, xp: mine.xp } } }));
}
function SeasonBanner() {
  const key = seasonKey();
  const days = Math.max(0, Math.ceil((new Date(nextSeasonStart(key) + "T00:00") - new Date()) / 86400000));
  return (
    <div className="panel px-4 py-3 flex items-center justify-between">
      <div><div className="body text-xs uppercase tracking-wider font-semibold" style={{ color: C.dim }}>Season {key.split("-S")[1]} · {key.slice(0, 4)}</div><div className="text-sm font-semibold">Top 3 earn permanent badges</div></div>
      <div className="text-right"><div className="text-xl font-bold tabular-nums">{days}</div><div className="body text-xs" style={{ color: C.dim }}>days left</div></div>
    </div>
  );
}
const MEDAL = ["", "🥇", "🥈", "🥉"];
function SeasonBadges({ badges }) {
  const list = Object.entries(badges || {}).sort(([a], [b]) => (a < b ? 1 : -1));
  if (!list.length) return null;
  return <div className="flex gap-2 flex-wrap">{list.map(([k, b]) => <span key={k} className="px-2.5 py-1 text-xs font-semibold" style={{ borderRadius: 999, background: "rgba(255,212,71,.12)", border: "1px solid rgba(255,212,71,.35)", color: "#FFD447" }}>{MEDAL[b.place]} {k.replace("-S", " S")}</span>)}</div>;
}

/* ---------- Nemesis ---------- */
function NemesisAlert({ s, setS, openProfile }) {
  const [card, setCard] = useState(null);
  const nem = s.nemesis;
  useEffect(() => { if (!nem?.id) return; window.storage.get(`lb:${nem.id}`, true).then((r) => setCard(r?.value ? JSON.parse(r.value) : null)).catch(() => {}); }, [nem?.id]);
  useEffect(() => { if (card && s.nemesisSeen?.workouts === undefined) setS((p) => ({ ...p, nemesisSeen: { workouts: card.stats?.workouts || 0, points: card.points || 0 } })); }, [card]);
  if (!nem?.id || !card) return null;
  const seen = s.nemesisSeen || {};
  const myPoints = pointsOf(s);
  const alerts = [];
  if ((card.stats?.workouts || 0) > (seen.workouts ?? card.stats?.workouts ?? 0)) alerts.push(`${card.name} just logged a workout.`);
  if ((card.points || 0) > myPoints && (seen.points ?? 0) <= myPoints) alerts.push(`${card.name} passed you in points (${card.points.toLocaleString()} vs ${myPoints.toLocaleString()}).`);
  if (seen.workouts === undefined || !alerts.length) return null;
  const dismiss = () => setS((p) => ({ ...p, nemesisSeen: { workouts: card.stats?.workouts || 0, points: card.points || 0 } }));
  return (
    <div className="panel p-4 flex items-start gap-3" style={{ borderColor: "rgba(255,45,111,.45)" }}>
      <span className="text-2xl">😈</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: "#FF6B8F" }}>Nemesis alert</div>
        {alerts.map((a, i) => <div key={i} className="body text-sm" style={{ color: C.text }}>{a}</div>)}
        <div className="flex gap-3 mt-2"><button onClick={() => { dismiss(); openProfile(nem.id); }} className="body text-sm font-semibold" style={{ color: C.cyan }}>View rival</button><button onClick={dismiss} className="body text-sm" style={{ color: C.dim }}>Dismiss</button></div>
      </div>
    </div>
  );
}

/* ---------- Proactive Sterling ---------- */
function sterlingSay(s, text) {
  if (!window.speechSynthesis || s.settings?.voice === false) return;
  try {
    window.speechSynthesis.cancel();
    const style = VOICE_STYLES[s.settings?.voiceStyle] || VOICE_STYLES.goblin;
    const v = pickBritishVoice();
    text.split(/(?<=[.!?])\s+/).filter(Boolean).forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part); if (v) u.voice = v;
      const [pitch, rate] = style.seq[i % style.seq.length]; u.lang = "en-GB"; u.pitch = pitch; u.rate = rate;
      window.speechSynthesis.speak(u);
    });
  } catch (e) { /* ignore */ }
}
function brokenStreak(s) {
  const days = [...activeDays(s)].sort();
  if (!days.length) return null;
  const last = days[days.length - 1];
  const gap = Math.round((new Date(today() + "T12:00") - new Date(last + "T12:00")) / 86400000);
  if (gap < 2) return null;
  let run = 1, d = last;
  while (days.includes(shift(d, -1))) { run++; d = shift(d, -1); }
  return run >= 2 ? { run, gap } : null;
}
const ROAST_FALLBACK = [
  "A {run}-day streak, abandoned like a gym membership in February. The dumbbells have filed a missing persons report.",
  "{gap} days off. Even your shadow has been lifting more than you. Shall we fix that, or shall I inform the family?",
  "I had your {run}-day streak framed. I've now had to use the frame for kindling. Back to it.",
];
function RoastCard({ s, setS }) {
  const d = today();
  const b = brokenStreak(s);
  const [busy, setBusy] = useState(false);
  if (!b || s.roasts?.[d]?.dismissed) return null;
  const cached = s.roasts?.[d]?.text;
  const play = async () => {
    if (cached) { sterlingSay(s, cached); return; }
    if (window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) { /* unlock */ } }
    setBusy(true);
    let text = ROAST_FALLBACK[(b.run + b.gap) % ROAST_FALLBACK.length].replace("{run}", b.run).replace("{gap}", b.gap);
    try { const r = await askJson(STERLING_SYS, `The user had a ${b.run}-day training streak and has now skipped ${b.gap} days. Write a short, savage but affectionate roast in 2 sentences that ends by pushing them to train today. No insults about their body. Respond ONLY with JSON: {"text": "..."}`, 300); if (r.text) text = String(r.text).slice(0, 280); } catch (e) { /* fallback */ }
    setBusy(false);
    setS((p) => ({ ...p, roasts: { ...(p.roasts || {}), [d]: { text } } }));
    sterlingSay(s, text);
  };
  return (
    <div className="panel p-4 flex items-center gap-3">
      <button onClick={play} aria-label="Play Sterling's message" className="btn shrink-0 flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 999 }}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}</button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">Sterling left you a message</div>
        <div className="body text-xs" style={{ color: C.dim }}>{cached || `About that ${b.run}-day streak…`}</div>
      </div>
      <button aria-label="Dismiss" onClick={() => setS((p) => ({ ...p, roasts: { ...(p.roasts || {}), [d]: { ...(p.roasts?.[d] || {}), dismissed: true } } }))} style={{ color: C.mute }}><X size={16} /></button>
    </div>
  );
}

/* ---------- Dynamic warm-ups ---------- */
const WARMUP_FALLBACK = {
  upper: [["Arm circles", 30, "Big slow circles, both directions"], ["Band pull-aparts", 40, "Squeeze shoulder blades"], ["Cat-cow", 30, "Move through the whole spine"], ["Push-up to downward dog", 40, "Slow and controlled"], ["Light set of first lift", 40, "50% of working weight"]],
  lower: [["Leg swings", 30, "Front-to-back, then side-to-side"], ["Bodyweight squats", 40, "Pause at the bottom"], ["Hip 90/90 switches", 40, "Keep chest tall"], ["Glute bridges", 30, "Squeeze at the top"], ["Walking lunges", 40, "Long stride, knee soft"]],
  full: [["Jumping jacks", 30, "Easy pace"], ["World's greatest stretch", 50, "Alternate sides"], ["Bodyweight squats", 30, "Full depth"], ["Arm circles", 30, "Both directions"], ["Inchworms", 40, "Walk hands out and back"]],
};
function WarmUp({ s, a, setActive }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const steps = a.warmup;
  const build = async () => {
    setOpen(true); if (steps) return;
    setBusy(true);
    const names = a.exercises.map((e) => e.name).join(", ");
    const lower = /leg|lower|squat|dead/i.test(`${a.title} ${names}`), upper = /push|pull|upper|chest|back|arm|shoulder/i.test(`${a.title} ${names}`);
    let out = WARMUP_FALLBACK[lower && !upper ? "lower" : upper && !lower ? "upper" : "full"].map(([name, secs, cue]) => ({ name, secs, cue }));
    try {
      const r = await askJson(STERLING_SYS, `Workout title: "${a.title || "untitled"}". Exercises planned: ${names || "not chosen yet"}. Give a 3-minute dynamic mobility warm-up of 5 or 6 moves that prepares the joints and muscles used today. Respond ONLY with JSON: {"steps": [{"name": "move", "secs": seconds, "cue": "under 8 words"}]}`, 500);
      const st = (r.steps || []).slice(0, 7).map((x) => ({ name: String(x.name).slice(0, 40), secs: Math.max(15, Math.min(60, +x.secs || 30)), cue: String(x.cue || "").slice(0, 60) }));
      if (st.length >= 3) out = st;
    } catch (e) { /* fallback */ }
    setActive((w) => ({ ...w, warmup: out }));
    setBusy(false);
  };
  const done = a.warmupDone || [];
  if (!open) return <button onClick={build} className="ghost w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Activity size={16} />3-minute warm-up</button>;
  return (
    <div className="panel p-4 space-y-2">
      <div className="flex justify-between items-center"><div className="font-semibold text-sm flex items-center gap-2"><Activity size={16} style={{ color: C.cyan }} />Warm-up</div><button aria-label="Hide warm-up" onClick={() => setOpen(false)} style={{ color: C.mute }}><ChevronDown size={16} style={{ transform: "rotate(180deg)" }} /></button></div>
      {busy && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Sterling is picking your moves…</div>}
      {(steps || []).map((x, i) => { const on = done.includes(i); return (
        <button key={i} onClick={() => setActive((w) => ({ ...w, warmupDone: on ? (w.warmupDone || []).filter((j) => j !== i) : [...(w.warmupDone || []), i] }))} className="w-full flex items-center gap-3 text-left py-1">
          <span className="shrink-0 flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 999, border: `1.5px solid ${on ? C.green : C.border}`, background: on ? C.green : "transparent", color: "#02040B" }}>{on && <Check size={13} />}</span>
          <span className="flex-1 min-w-0"><span className="text-sm font-medium" style={{ color: on ? C.dim : C.text, textDecoration: on ? "line-through" : "none" }}>{x.name}</span><span className="body text-xs block" style={{ color: C.dim }}>{x.cue}</span></span>
          <span className="body text-xs tabular-nums" style={{ color: C.dim }}>{x.secs}s</span>
        </button>
      ); })}
    </div>
  );
}

/* ---------- Muscle photos ---------- */
const MUSCLE_SLUG = { Chest: "chest", Back: "back", Legs: "legs", Shoulders: "shoulders", Arms: "arms", Core: "core" };
function MusclePhoto({ group, tier = 0, height = 300 }) {
  const t = Math.max(0, Math.min(6, Math.floor(tier)));
  const id = TIER_IDS[t], rank = RANKS[t];
  return (
    <div className="relative flex items-center justify-center" style={{ height }}>
      <div className="absolute" style={{ width: "70%", height: "80%", borderRadius: "50%", background: `radial-gradient(closest-side, ${rank.glow}, transparent)`, filter: "blur(14px)" }} />
      <img key={`${group}-${id}`} src={`/muscles/${MUSCLE_SLUG[group] || "chest"}_${id}.webp`} alt={`${group} at ${id} rank`} style={{ maxHeight: height, maxWidth: "100%", width: "auto", position: "relative", objectFit: "contain", animation: "musclein .35s ease-out", filter: "drop-shadow(0 10px 28px rgba(0,0,0,.55))" }} />
    </div>
  );
}

/* ---------- Chud King ---------- */
function ChudKing({ size = 64, dead }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="The Chud King" style={{ opacity: dead ? 0.4 : 1, overflow: "visible" }}>
      {/* burger throne */}
      <ellipse cx="60" cy="108" rx="50" ry="9" fill="#C98A3A" />
      <rect x="12" y="96" width="96" height="9" rx="4" fill="#5B8C2A" />
      <rect x="10" y="88" width="100" height="10" rx="5" fill="#7A3E1C" />
      <rect x="14" y="84" width="92" height="6" rx="3" fill="#F2C230" />
      {/* body */}
      <ellipse cx="60" cy="68" rx="40" ry="30" fill="#F2C6A0" stroke="#B9835D" strokeWidth="2" />
      <ellipse cx="60" cy="74" rx="26" ry="18" fill="#F6D4B4" />
      <circle cx="60" cy="78" r="2.2" fill="#B9835D" />
      <path d="M30 60 Q18 70 24 84" stroke="#F2C6A0" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M90 60 Q104 66 98 80" stroke="#F2C6A0" strokeWidth="11" strokeLinecap="round" fill="none" />
      {/* burger in hand */}
      <g transform="translate(94 74)"><ellipse cx="0" cy="-4" rx="9" ry="5" fill="#D9973F" /><rect x="-9" y="-2" width="18" height="3" fill="#5B8C2A" /><rect x="-9" y="1" width="18" height="4" rx="2" fill="#7A3E1C" /><ellipse cx="0" cy="6" rx="9" ry="3" fill="#D9973F" /></g>
      {/* head */}
      <circle cx="60" cy="34" r="19" fill="#F2C6A0" stroke="#B9835D" strokeWidth="2" />
      <ellipse cx="60" cy="47" rx="15" ry="7" fill="#F2C6A0" stroke="#B9835D" strokeWidth="1.5" />
      <circle cx="53" cy="32" r="2.4" fill="#2a1a10" /><circle cx="67" cy="32" r="2.4" fill="#2a1a10" />
      <path d="M52 41 Q60 46 68 41" stroke="#8a4b2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="46" cy="38" r="3.5" fill="#F29A9A" opacity=".6" /><circle cx="74" cy="38" r="3.5" fill="#F29A9A" opacity=".6" />
      {/* crown */}
      <path d="M43 18 L47 6 L54 14 L60 2 L66 14 L73 6 L77 18 Z" fill="#FFD447" stroke="#B8860B" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="60" cy="10" r="2" fill="#FF2D6F" /><circle cx="49" cy="13" r="1.6" fill="#38C6FF" /><circle cx="71" cy="13" r="1.6" fill="#3DF08A" />
    </svg>
  );
}

/* ---------- Support ---------- */
function SupportForm({ s, tab = "settings" }) {
  const [cat, setCat] = useState("Bug");
  const [msg, setMsg] = useState("");
  const [state, setState] = useState({ status: "idle", text: "" });
  const send = async () => {
    setState({ status: "sending", text: "" });
    try {
      const auth = window.ascendAuth;
      const token = auth?.token ? await auth.token() : "";
      const r = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ category: cat, message: msg, name: s.profile.name, info: { tab, ua: navigator.userAgent } }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Couldn't send");
      setMsg(""); setState({ status: "sent", text: "Sent. You'll get a reply at your account email." });
    } catch (e) { setState({ status: "error", text: String(e.message || e) }); }
  };
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["Bug", "Feature idea", "Account", "Other"].map((c) => <button key={c} onClick={() => setCat(c)} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: cat === c ? C.blue : C.glass, color: cat === c ? "#fff" : C.text, border: `1px solid ${C.glassLine}` }}>{c}</button>)}
      </div>
      <textarea className="inp body text-sm" rows={4} maxLength={4000} placeholder={cat === "Bug" ? "What happened, and what did you expect?" : "Tell us what's on your mind"} value={msg} onChange={(e) => { setMsg(e.target.value); if (state.status !== "sending") setState({ status: "idle", text: "" }); }} aria-label="Support message" />
      <button onClick={send} disabled={msg.trim().length < 5 || state.status === "sending"} className="btn w-full py-3 flex items-center justify-center gap-2" style={msg.trim().length < 5 ? { opacity: 0.5 } : null}>{state.status === "sending" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Send to support</button>
      {state.text && <div className="body text-sm" style={{ color: state.status === "sent" ? C.green : C.red }}>{state.text}</div>}
    </div>
  );
}

/* ---------- Geo helpers ---------- */
const MI_M = 1609.344;
function havM(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}
function encodePoly(pts) {
  let out = "", pLat = 0, pLng = 0;
  const enc = (v) => { v = v < 0 ? ~(v << 1) : v << 1; let s = ""; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); };
  pts.forEach(([la, ln]) => { const a = Math.round(la * 1e5), b = Math.round(ln * 1e5); out += enc(a - pLat) + enc(b - pLng); pLat = a; pLng = b; });
  return out;
}
function decodePoly(str) {
  const pts = []; let i = 0, lat = 0, lng = 0;
  while (i < (str || "").length) {
    for (const k of [0, 1]) {
      let b, shift = 0, result = 0;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (k === 0) lat += d; else lng += d;
    }
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}
function thinPts(pts, minGapM = 8, maxPts = 900) {
  if (!pts.length) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) if (havM(out[out.length - 1], pts[i]) >= minGapM || i === pts.length - 1) out.push(pts[i]);
  if (out.length <= maxPts) return out;
  const step = out.length / maxPts, res = [];
  for (let i = 0; i < out.length; i += step) res.push(out[Math.floor(i)]);
  res.push(out[out.length - 1]);
  return res;
}
const fmtDur = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s2 = sec % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(s2).padStart(2, "0")}` : `${m}:${String(s2).padStart(2, "0")}`; };
const fmtPace = (secPerMi) => (!isFinite(secPerMi) || secPerMi <= 0 || secPerMi > 3600 ? "–:––" : fmtDur(secPerMi));

/* ---------- GPS engine (pure, testable) ---------- */
const RUN_LIMITS = { run: { max: 7.5 }, walk: { max: 3.2 } };
const M_LAT = 111320;
function newRun(mode = "run", guide = null) {
  return { id: uid(), mode, guide, startedAt: Date.now(), pausedTotal: 0, pausedAt: null, dist: 0, pts: [], last: null, kf: null, anchor: null, rejects: 0, splits: [], gapM: 0, weak: false, fixes: 0, o: null };
}
function runElapsed(r, now = Date.now()) {
  return Math.max(0, (now - r.startedAt - r.pausedTotal - (r.pausedAt ? now - r.pausedAt : 0)) / 1000);
}
// Feed one GPS fix; returns a new run state.
// 1) a small Kalman filter smooths the position, 2) distance only counts when the smoothed position
// has clearly moved from the last anchor point, 3) teleport glitches are rejected, 4) screen-lock gaps are bridged.
function addFix(r, fix) {
  const next = { ...r, fixes: r.fixes + 1 };
  if (r.pausedAt) { next.kf = null; next.anchor = null; return next; }
  if (!isFinite(fix.lat) || !isFinite(fix.lng)) return next;
  if (fix.acc > 35) { next.weak = true; return next; }
  next.weak = fix.acc > 20;
  const o = r.o || { lat: fix.lat, lng: fix.lng, k: M_LAT * Math.cos((fix.lat * Math.PI) / 180) };
  next.o = o;
  const zx = (fix.lng - o.lng) * o.k, zy = (fix.lat - o.lat) * M_LAT, R = Math.max(9, fix.acc * fix.acc);
  const toLL = (x, y) => [o.lat + y / M_LAT, o.lng + x / o.k];
  const max = RUN_LIMITS[r.mode]?.max || 7.5;

  if (!r.kf) {
    next.kf = { x: zx, y: zy, P: R, t: fix.t };
    if (!r.anchor) {
      next.anchor = { x: zx, y: zy, t: fix.t };
      next.pts = [...r.pts, [...toLL(zx, zy), fix.t, r.pts.length ? 1 : 0]];
    }
    next.last = { p: toLL(zx, zy), t: fix.t, acc: fix.acc };
    return next;
  }
  const dt = (fix.t - r.kf.t) / 1000;
  if (dt <= 0) return next;

  // Screen was off: bridge the gap with a straight line if the speed is believable
  if (dt > 25) {
    const a = r.anchor || { x: r.kf.x, y: r.kf.y, t: r.kf.t };
    const d = Math.hypot(zx - a.x, zy - a.y), sp = d / ((fix.t - a.t) / 1000);
    next.kf = { x: zx, y: zy, P: R, t: fix.t };
    next.anchor = { x: zx, y: zy, t: fix.t };
    if (sp <= max) { next.dist = r.dist + d; next.gapM = r.gapM + d; }
    next.pts = [...r.pts, [...toLL(zx, zy), fix.t, 1]];
    next.last = { p: toLL(zx, zy), t: fix.t, acc: fix.acc };
    return withSplits(r, next, fix.t);
  }

  // Predict, then reject teleports that don't match where we could possibly be
  const Q = 2.5 * dt * (1 + dt);
  const P = r.kf.P + Q;
  const innov = Math.hypot(zx - r.kf.x, zy - r.kf.y);
  if (innov > Math.max(45, 3 * Math.sqrt(P + R)) && innov / dt > max * 1.5) {
    next.rejects = r.rejects + 1;
    if (next.rejects >= 4) { next.kf = { x: zx, y: zy, P: R, t: fix.t }; next.anchor = { x: zx, y: zy, t: fix.t }; next.rejects = 0; next.pts = [...r.pts, [...toLL(zx, zy), fix.t, 2]]; }
    return next;
  }
  next.rejects = 0;
  const K = P / (P + R);
  const kx = r.kf.x + K * (zx - r.kf.x), ky = r.kf.y + K * (zy - r.kf.y);
  next.kf = { x: kx, y: ky, P: (1 - K) * P, t: fix.t };
  next.last = { p: toLL(kx, ky), t: fix.t, acc: fix.acc };

  const a = r.anchor || { x: kx, y: ky, t: fix.t };
  const d = Math.hypot(kx - a.x, ky - a.y);
  const need = Math.max(11, Math.min(25, fix.acc * 1.1));
  if (d >= need) {
    const sp = d / Math.max(1, (fix.t - a.t) / 1000);
    if (sp <= max * 1.3) next.dist = r.dist + d;
    next.anchor = { x: kx, y: ky, t: fix.t };
    next.pts = [...r.pts, [...toLL(kx, ky), fix.t, 0]];
  }
  return withSplits(r, next, fix.t);
}
function withSplits(prev, next, t) {
  const miles = Math.floor(next.dist / MI_M);
  if (miles > prev.splits.length) {
    const el = runElapsed(next, t);
    const done = prev.splits.reduce((a, x) => a + x, 0);
    const add = [];
    for (let k = prev.splits.length; k < miles; k++) add.push(Math.round((el - done) / (miles - prev.splits.length)));
    return { ...next, splits: [...prev.splits, ...add] };
  }
  return next;
}
function currentPace(r, now = Date.now()) {
  const recent = r.pts.filter((x) => now - x[2] <= 40000 && x[3] !== 2);
  if (recent.length < 2) return Infinity;
  let d = 0; for (let i = 1; i < recent.length; i++) d += havM(recent[i - 1], recent[i]);
  const dt = (recent[recent.length - 1][2] - recent[0][2]) / 1000;
  return d > 15 ? dt / (d / MI_M) : Infinity;
}

/* ---------- Map (Leaflet, loaded only when needed) ---------- */
let leafletP = null;
const loadLeaflet = () => (leafletP ||= Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([m]) => m.default || m));
function RouteMap({ lines = [], follow = null, height = 240, fit = true, interactive = true }) {
  const el = useRef(null), mapRef = useRef(null), layerRef = useRef(null), meRef = useRef(null), fitted = useRef(false);
  const [failed, setFailed] = useState(false);
  const light = String(C.text || "").startsWith("#07");
  useEffect(() => {
    let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !el.current || mapRef.current) return;
      const map = L.map(el.current, { zoomControl: false, attributionControl: true, dragging: interactive, scrollWheelZoom: false, tap: interactive });
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/${light ? "light_all" : "dark_all"}/{z}/{x}/{y}{r}.png`, { maxZoom: 19, subdomains: "abcd", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>' }).addTo(map);
      map.setView(follow || lines[0]?.pts?.[0] || [30.2672, -97.7431], 15);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 60);
      draw(L);
    }).catch(() => setFailed(true));
    return () => { dead = true; try { mapRef.current?.remove(); } catch (e) { /* ignore */ } mapRef.current = null; };
  }, []);
  const draw = (L) => {
    const map = mapRef.current; if (!map || !layerRef.current) return;
    layerRef.current.clearLayers();
    let all = [];
    lines.forEach((ln) => {
      if (!ln.pts?.length) return;
      L.polyline(ln.pts, { color: ln.color || C.cyan, weight: ln.weight || 5, opacity: ln.opacity ?? 0.95, dashArray: ln.dash || null, lineJoin: "round" }).addTo(layerRef.current);
      if (ln.startDot) L.circleMarker(ln.pts[0], { radius: 6, color: "#fff", weight: 2, fillColor: "#3DF08A", fillOpacity: 1 }).addTo(layerRef.current);
      all = all.concat(ln.pts);
    });
    if (follow) {
      if (!meRef.current) meRef.current = L.circleMarker(follow, { radius: 8, color: "#fff", weight: 3, fillColor: "#2F8CFF", fillOpacity: 1 });
      meRef.current.setLatLng(follow).addTo(layerRef.current);
      map.panTo(follow, { animate: true });
    } else if (fit && all.length > 1 && !fitted.current) { map.fitBounds(L.latLngBounds(all), { padding: [24, 24] }); fitted.current = true; }
  };
  useEffect(() => { if (mapRef.current) loadLeaflet().then(draw); }, [lines, follow?.[0], follow?.[1]]);
  if (failed) return <div className="panel flex items-center justify-center body text-sm" style={{ height, color: C.dim }}>Map couldn't load. Your run still tracks.</div>;
  return <div ref={el} style={{ height, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.glassLine}`, background: "#0b1020" }} />;
}

/* ---------- Live run tracker (full screen) ---------- */
const LIVE_KEY = "ascend-live-run";
const saveLive = (r) => { try { localStorage.setItem(LIVE_KEY, JSON.stringify(r)); } catch (e) { /* storage full */ } };
const loadLive = () => { try { return JSON.parse(localStorage.getItem(LIVE_KEY) || "null"); } catch { return null; } };
const clearLive = () => { try { localStorage.removeItem(LIVE_KEY); } catch (e) { /* ignore */ } };

function RunTracker({ s, setS, gainXp, initial, onClose }) {
  const [run, setRun] = useState(initial);
  const runRef = useRef(initial); runRef.current = run;
  const [now, setNow] = useState(Date.now());
  const [gps, setGps] = useState({ status: "waiting", msg: "" });
  const [phase, setPhase] = useState(initial.resumed ? "resume" : "live"); // resume | live | summary
  const [wake, setWake] = useState(null);
  const [cues, setCues] = useState(s.settings?.runCues !== false);
  const watchRef = useRef(null), wakeRef = useRef(null), lastSave = useRef(0), cuedMiles = useRef(initial.splits?.length || 0), hiddenAt = useRef(null);
  const [gapNote, setGapNote] = useState("");
  const guide = useMemo(() => (initial.guide ? decodePoly(initial.guide.poly) : null), [initial.guide]);

  const startWatch = () => {
    if (!navigator.geolocation) { setGps({ status: "error", msg: "This browser can't use GPS." }); return; }
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy || 50, t: pos.timestamp || Date.now() };
        setGps({ status: fix.acc > 35 ? "weak" : "ok", msg: `±${Math.round(fix.acc)} m` });
        setRun((r) => addFix(r, fix));
      },
      (err) => setGps({ status: "error", msg: err.code === 1 ? "Location is blocked. Allow it in Settings → Privacy → Location Services → Safari Websites." : "Searching for GPS…" }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };
  const lockScreen = async () => {
    try { if (navigator.wakeLock) { wakeRef.current = await navigator.wakeLock.request("screen"); setWake(true); wakeRef.current.addEventListener?.("release", () => setWake(false)); } else setWake(false); } catch (e) { setWake(false); }
  };
  useEffect(() => {
    if (phase !== "live") return;
    startWatch(); lockScreen();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const vis = () => {
      if (document.visibilityState === "hidden") { hiddenAt.current = Date.now(); return; }
      if (hiddenAt.current && Date.now() - hiddenAt.current > 20000) setGapNote(`GPS paused for ${Math.round((Date.now() - hiddenAt.current) / 1000)}s while the screen was off. The distance gets filled in with a straight line.`);
      hiddenAt.current = null; startWatch(); lockScreen();
    };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", vis); if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; try { wakeRef.current?.release(); } catch (e) { /* ignore */ } };
  }, [phase]);
  // Crash-safe: keep the run on the phone every few seconds
  useEffect(() => { if (phase === "live" && Date.now() - lastSave.current > 4000) { lastSave.current = Date.now(); saveLive({ ...run, resumed: true }); } }, [run, phase]);
  // Tab title + mile cues
  useEffect(() => { if (phase === "live") document.title = `🏃 ${(run.dist / MI_M).toFixed(2)} mi · ${fmtDur(runElapsed(run, now))}`; return () => { document.title = "Ascend"; }; }, [now, phase]);
  useEffect(() => {
    if (run.splits.length > cuedMiles.current) {
      cuedMiles.current = run.splits.length;
      SFX.tone(880, 0.15); SFX.tone(1320, 0.2, 0.18);
      if (cues) sterlingSay(s, `Mile ${run.splits.length}. ${Math.floor(run.splits[run.splits.length - 1] / 60)} minutes ${run.splits[run.splits.length - 1] % 60} seconds. Splendid.`);
    }
  }, [run.splits.length]);

  const el = runElapsed(run, now), miles = run.dist / MI_M;
  const avgPace = miles > 0.02 ? el / miles : Infinity, curPace = currentPace(run, now);
  const path = useMemo(() => run.pts.filter((x) => x[3] !== 2).map((x) => [x[0], x[1]]), [run.pts.length]);
  const me = run.last?.p || null;
  const liveLines = useMemo(() => [...(guide ? [{ pts: guide, color: C.mute, weight: 5, dash: "6 8", opacity: 0.8 }] : []), { pts: path, color: C.cyan }], [path, guide]);

  const pause = () => setRun((r) => (r.pausedAt ? { ...r, pausedTotal: r.pausedTotal + (Date.now() - r.pausedAt), pausedAt: null, last: null } : { ...r, pausedAt: Date.now() }));
  const stop = () => { setRun((r) => (r.pausedAt ? { ...r, pausedTotal: r.pausedTotal + (Date.now() - r.pausedAt), pausedAt: null } : r)); setPhase("summary"); saveLive({ ...runRef.current, resumed: true, stopped: true }); };
  const discard = () => ask("Discard this run? It won't be saved.", () => { clearLive(); onClose(); }, "Discard");
  const save = async () => {
    const r = runRef.current, secs = runElapsed(r), mi = Math.round((r.dist / MI_M) * 100) / 100;
    if (mi < 0.05) { ask("That run is under 0.05 miles. Discard it?", () => { clearLive(); onClose(); }, "Discard"); return; }
    const exName = r.mode === "walk" ? "Walking" : "Running";
    const exercises = [{ name: exName, sets: [{ w: mi, r: Math.round((secs / 60) * 10) / 10, done: true }] }];
    const { xp } = workoutXp(s, exercises, null);
    const runInfo = { id: r.id, mode: r.mode, miles: mi, secs: Math.round(secs), pace: Math.round(secs / Math.max(0.01, mi)), splits: r.splits, gapMi: Math.round((r.gapM / MI_M) * 100) / 100, guideName: r.guide?.name || null, hasMap: path.length > 1 };
    const workout = { id: r.id, date: today(), title: r.mode === "walk" ? "Walk" : "Run", exercises, xp, volume: 0, minutes: Math.round(secs / 60), run: runInfo };
    if (path.length > 1) { try { await window.storage.set(`run:${r.id}`, encodePoly(thinPts(path)), false); } catch (e) { /* map just won't show */ } }
    setS((p) => addWorkout(p, workout));
    gainXp(xp, `${mi} mi ${r.mode === "walk" ? "walk" : "run"}`);
    juice(mi >= 3 ? "pr" : "finish");
    postFeed(s, "workout", `${r.mode === "walk" ? "walked" : "ran"} ${mi} mi · ${fmtPace(runInfo.pace)} /mi`, {}, `run_${r.id}`);
    clearLive(); onClose(workout);
  };

  const gpsColor = gps.status === "ok" ? C.green : gps.status === "weak" ? C.orange : gps.status === "error" ? C.red : C.dim;
  const shell = { position: "fixed", inset: 0, zIndex: 58, background: C.bg, color: C.text, paddingTop: "calc(env(safe-area-inset-top) + 8px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)", overflowY: "auto" };

  if (phase === "resume") {
    return (
      <div style={shell} className="px-5 flex flex-col justify-center">
        <div className="panel p-5 space-y-3 max-w-md mx-auto w-full">
          <div className="text-xl font-bold">Unfinished {run.mode === "walk" ? "walk" : "run"}</div>
          <div className="body text-sm" style={{ color: C.dim }}>{(run.dist / MI_M).toFixed(2)} mi so far. The app closed during it. Pick up where you left off, or finish and save it now.</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setRun((r) => ({ ...r, pausedAt: r.pausedAt || Date.now(), last: null })); setPhase("live"); }} className="btn py-3">Resume</button>
            <button onClick={() => { setRun((r) => ({ ...r, pausedTotal: r.pausedTotal + Math.max(0, Date.now() - (r.last?.t || r.startedAt)) })); setPhase("summary"); }} className="ghost py-3 font-semibold">Finish & save</button>
          </div>
          <button onClick={discard} className="body text-sm w-full" style={{ color: C.dim }}>Discard</button>
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    const secs = runElapsed(run);
    return (
      <div style={shell} className="px-5">
        <div className="max-w-md mx-auto space-y-4 pt-2">
          <div className="text-2xl font-bold">{run.mode === "walk" ? "Walk" : "Run"} complete</div>
          {path.length > 1 ? <RouteMap lines={[...(guide ? [{ pts: guide, color: C.mute, weight: 4, dash: "6 8", opacity: 0.7 }] : []), { pts: path, color: C.cyan, startDot: true }]} height={220} /> : <div className="panel p-4 body text-sm" style={{ color: C.dim }}>No GPS path was recorded.</div>}
          <div className="grid grid-cols-3 gap-2">
            {[["Distance", `${miles.toFixed(2)} mi`], ["Time", fmtDur(secs)], ["Avg pace", `${fmtPace(miles > 0 ? secs / miles : Infinity)}`]].map(([l, v]) => <div key={l} className="panel py-3 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold tabular-nums">{v}</div></div>)}
          </div>
          {run.splits.length > 0 && <div className="panel p-4"><div className="font-semibold text-sm mb-2">Splits</div>{run.splits.map((sp, i) => <div key={i} className="flex justify-between body text-sm py-0.5"><span style={{ color: C.dim }}>Mile {i + 1}</span><span className="tabular-nums font-semibold">{fmtDur(sp)}</span></div>)}</div>}
          {run.gapM > 30 && <div className="body text-xs" style={{ color: C.orange }}>{(run.gapM / MI_M).toFixed(2)} mi was filled in while GPS was paused (screen off).</div>}
          <button onClick={save} className="btn w-full py-4 text-lg">Save {run.mode === "walk" ? "walk" : "run"}</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPhase("live")} className="ghost py-3 font-semibold">Keep going</button>
            <button onClick={discard} className="py-3 font-semibold" style={{ borderRadius: 12, color: "#FF4D6D", border: "1px solid rgba(255,77,109,.4)" }}>Discard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shell} className="px-4">
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 body text-xs font-semibold" style={{ color: gpsColor }}><span style={{ width: 8, height: 8, borderRadius: 999, background: gpsColor, boxShadow: `0 0 8px ${gpsColor}` }} />{gps.status === "waiting" ? "Finding GPS…" : gps.status === "weak" ? `Weak GPS ${gps.msg}` : gps.status === "error" ? "GPS problem" : `GPS ${gps.msg}`}</div>
          <button onClick={() => setCues(!cues)} className="body text-xs flex items-center gap-1" style={{ color: cues ? C.cyan : C.mute }}>{cues ? <Volume2 size={14} /> : <VolumeX size={14} />}Mile cues</button>
        </div>
        {gps.status === "error" && <div className="body text-xs" style={{ color: C.red }}>{gps.msg}</div>}
        <RouteMap lines={liveLines} follow={me} height={Math.min(300, typeof window !== "undefined" ? window.innerHeight * 0.34 : 260)} />
        <div className="text-center pt-1">
          <div className="text-7xl font-black tabular-nums tracking-tight">{miles.toFixed(2)}</div>
          <div className="body text-sm -mt-1" style={{ color: C.dim }}>miles</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["Time", fmtDur(el)], ["Pace now", fmtPace(curPace)], ["Avg pace", fmtPace(avgPace)]].map(([l, v]) => <div key={l} className="panel py-3 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="text-xl font-bold tabular-nums">{v}</div></div>)}
        </div>
        {run.pausedAt && <div className="text-center font-bold" style={{ color: C.orange }}>Paused</div>}
        {gapNote && <div className="body text-xs text-center" style={{ color: C.orange }}>{gapNote}</div>}
        {wake === false && <div className="body text-xs text-center" style={{ color: C.dim }}>Keep Ascend open with the screen on. iPhone pauses GPS for websites when the screen locks.</div>}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={pause} className="py-4 text-lg font-bold flex items-center justify-center gap-2" style={{ borderRadius: 16, background: run.pausedAt ? C.green : C.glass, color: run.pausedAt ? "#02040B" : C.text, border: `1px solid ${C.glassLine}` }}>{run.pausedAt ? <><Play size={20} />Resume</> : <><Pause size={20} />Pause</>}</button>
          <button onClick={stop} className="py-4 text-lg font-bold flex items-center justify-center gap-2" style={{ borderRadius: 16, background: "#FF2D55", color: "#fff" }}><X size={20} />Finish</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Steps ---------- */
const STEP_GOAL_XP = 40;
function mergeSteps(s, inbox) {
  const cur = s.steps || {};
  let changed = false;
  const steps = { ...cur };
  Object.entries(inbox || {}).forEach(([d, n]) => { const v = Math.round(+n || 0); if (v > (steps[d] || 0)) { steps[d] = v; changed = true; } });
  if (!changed) return null;
  const d = today();
  let next = { ...s, steps };
  const day = next.days?.[d];
  if (day && steps[d]) next = { ...next, days: { ...next.days, [d]: { ...day, list: day.list.map((q) => (q.qid === "steps" && !q.claimed ? { ...q, progress: Math.max(q.progress, steps[d]) } : q)) } } };
  return next;
}
async function sha256hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function StepsPanel({ s, setS, gainXp, openRun, openAssistant }) {
  const d = today();
  const goal = s.settings?.stepGoal || 10000;
  const todaySteps = s.steps?.[d] || 0;
  const [manual, setManual] = useState("");
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [err, setErr] = useState("");
  const week = Array.from({ length: 7 }, (_, i) => { const k = shift(d, i - 6); return { k, n: s.steps?.[k] || 0 }; });
  const maxN = Math.max(goal, ...week.map((w) => w.n));
  useEffect(() => {
    if (todaySteps >= goal && !s.stepXp?.[d]) { setS((p) => ({ ...p, stepXp: { ...(p.stepXp || {}), [d]: true } })); gainXp(STEP_GOAL_XP, "Step goal", `steps_${d}`); }
  }, [todaySteps, goal]);
  const saveManual = () => {
    const n = Math.round(+manual); if (!(n >= 0) || manual === "") return;
    setS((p) => { const base = { ...p, steps: { ...(p.steps || {}), [d]: n } }; const day = base.days?.[d]; return day ? { ...base, days: { ...base.days, [d]: { ...day, list: day.list.map((q) => (q.qid === "steps" && !q.claimed ? { ...q, progress: Math.max(q.progress, n) } : q)) } } } : base; });
    setManual("");
  };
  const makeCode = async () => {
    setBusy(true); setErr("");
    try {
      const code = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
      const hash = await sha256hex(code);
      await window.ascendAuth.registerStepToken(hash, s.stepTokenHash || null);
      setS((p) => ({ ...p, stepToken: code, stepTokenHash: hash }));
    } catch (e) { setErr("Couldn't create a sync code. Check your connection, and make sure the steps SQL was run in Supabase."); }
    setBusy(false);
  };
  const copy = async (text, label) => { try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 1800); } catch (e) { /* select manually */ } };
  const url = `${typeof window !== "undefined" ? window.location.origin : "https://www.ascendfit.site"}/api/steps`;
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-end justify-between">
        <div><div className="body text-xs font-semibold uppercase tracking-wider" style={{ color: C.dim }}>Steps today</div><div className="text-3xl font-bold tabular-nums">{todaySteps.toLocaleString()}</div></div>
        <div className="body text-xs text-right" style={{ color: todaySteps >= goal ? C.green : C.dim }}>{todaySteps >= goal ? `Goal hit · +${STEP_GOAL_XP} XP` : `${(goal - todaySteps).toLocaleString()} to ${goal.toLocaleString()}`}</div>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 70 }} role="img" aria-label="Steps over the last 7 days">
        {week.map((w) => <div key={w.k} className="flex-1 flex flex-col items-center gap-1"><div style={{ width: "100%", height: `${Math.max(3, (w.n / maxN) * 56)}px`, borderRadius: 6, background: w.n >= goal ? C.green : w.k === d ? C.cyan : C.glassLine }} /><span className="body" style={{ fontSize: 10, color: C.dim }}>{new Date(w.k + "T12:00").toLocaleDateString(undefined, { weekday: "narrow" })}</span></div>)}
      </div>
      <div className="flex gap-2">
        <input type="number" inputMode="numeric" className="inp text-sm" placeholder="Enter today's steps" value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveManual()} aria-label="Today's steps" />
        <button onClick={saveManual} disabled={!(+manual >= 0) || manual === ""} className="btn px-4 text-sm">Save</button>
      </div>
      <button onClick={() => { if (!setup && openAssistant) { openAssistant(); setTimeout(() => window.dispatchEvent(new CustomEvent("ascend-sterling-steps")), 350); } setSetup(!setup); }} className="body text-sm font-semibold w-full text-left flex items-center justify-between" style={{ color: C.cyan }}><span>{s.stepToken ? "Automatic sync is set up · ask Sterling" : "Sync steps automatically (Sterling walks you through it)"}</span><ChevronDown size={16} style={{ transform: setup ? "rotate(180deg)" : "none" }} /></button>
      {setup && (
        <div className="space-y-3 body text-sm" style={{ color: C.sub }}>
          {!s.stepToken ? (
            <button onClick={makeCode} disabled={busy} className="btn w-full py-2.5 text-sm">{busy ? "Creating…" : "Create my sync code"}</button>
          ) : (
            <>
              <div className="space-y-1.5">
                <div className="text-xs" style={{ color: C.dim }}>Your sync code (keep it private)</div>
                <button onClick={() => copy(s.stepToken, "code")} className="ghost w-full p-2.5 text-left font-mono text-xs break-all">{s.stepToken}</button>
                <div className="text-xs" style={{ color: C.dim }}>Sync URL</div>
                <button onClick={() => copy(url, "url")} className="ghost w-full p-2.5 text-left font-mono text-xs break-all">{url}</button>
                {copied && <div className="text-xs" style={{ color: C.green }}>Copied {copied}</div>}
              </div>
              <button onClick={() => { openAssistant?.(); setTimeout(() => window.dispatchEvent(new CustomEvent("ascend-sterling-steps")), 350); }} className="btn w-full py-2.5 text-sm flex items-center justify-center gap-2"><Bot size={16} />Have Sterling walk me through it</button>
              <details className="text-xs" style={{ color: C.mute }}><summary style={{ cursor: "pointer", color: C.dim }}>Or read the steps yourself</summary>
              <ol className="space-y-1.5 list-decimal pl-5 text-sm mt-1">
                <li>Open the <b>Shortcuts</b> app → <b>Automation</b> → <b>+</b> → <b>Time of Day</b>. Pick <b>11:45 PM</b>, <b>Daily</b>, <b>Run Immediately</b> → Next → <b>New Blank Automation</b>.</li>
                <li>Add <b>Find Health Samples</b>: Type is <b>Steps</b>, Start Date is <b>Today</b>.</li>
                <li>Add <b>Calculate Statistics</b>: <b>Sum</b> of Health Samples.</li>
                <li>Add <b>Format Date</b>: Current Date, Date Format <b>Custom</b>, format <b>yyyy-MM-dd</b>.</li>
                <li>Add <b>Get Contents of URL</b>: paste the Sync URL. Method <b>POST</b>, Request Body <b>JSON</b>, add three fields: <b>token</b> (Text: your sync code), <b>steps</b> (Number: Statistics), <b>date</b> (Text: Formatted Date).</li>
                <li>Tap <b>Done</b>. Tap the automation once to test it, then pull this page down to refresh.</li>
              </ol>
              </details>
              <div className="text-xs" style={{ color: C.dim }}>Want steps to update during the day? Duplicate the automation for noon and 6 PM. Ascend always keeps the highest count for each day.</div>
              <button onClick={() => ask("Make a new sync code? The old one stops working, so you'd need to update your Shortcut.", makeCode, "New code")} className="text-xs underline" style={{ color: C.mute }}>Make a new code</button>
            </>
          )}
          {err && <div className="text-xs" style={{ color: C.red }}>{err}</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- Route planner + run hub ---------- */
function RoutePlanner({ s, setS, onRun }) {
  const [miles, setMiles] = useState(3);
  const [pref, setPref] = useState("");
  const [state, setState] = useState({ status: "idle", routes: [], pick: 0, notes: [], quip: "" });
  const [naming, setNaming] = useState("");
  const plan = async () => {
    setState({ status: "locating", routes: [], pick: 0, notes: [], quip: "" });
    let pos;
    try {
      pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }));
    } catch (e) {
      setState({ status: "error", routes: [], pick: 0, notes: [], quip: "", err: e?.code === 1 ? "Location is blocked. Allow it for Safari in Settings → Privacy → Location Services." : "Couldn't get your location. Try again outside." });
      return;
    }
    setState((x) => ({ ...x, status: "routing" }));
    try {
      const token = await window.ascendAuth.token();
      const r = await fetch("/api/route", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, miles, pref }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Route service error");
      const routes = j.routes;
      let pick = 0, notes = routes.map((rt) => `${(rt.meters / MI_M).toFixed(1)} mi · ${Math.round(rt.ascent * 3.281)} ft climb${rt.streets.length ? ` · ${rt.streets.slice(0, 2).join(", ")}` : ""}`), quip = "";
      if (/flat|easy|no hill/i.test(pref)) pick = routes.reduce((bi, rt, i, arr) => (rt.ascent < arr[bi].ascent ? i : bi), 0);
      try {
        const ai = await askJson(STERLING_SYS, `A runner wants a ${miles}-mile loop${pref ? ` with this preference: "${pref}"` : ""}. Candidate routes: ${routes.map((rt, i) => `#${i}: ${(rt.meters / MI_M).toFixed(2)} mi, ${Math.round(rt.ascent * 3.281)} ft of climbing, main streets/paths: ${rt.streets.join(", ") || "unknown"}`).join(" | ")}. Pick the best one for their preference and write a short description for each (under 16 words, mention the terrain and notable streets or paths; don't invent landmarks that aren't in the street names). Respond ONLY with JSON: {"pick": index, "quip": "one short Sterling line", "notes": ["...", "...", "..."]}`, 500);
        if (Number.isInteger(ai.pick) && routes[ai.pick]) pick = ai.pick;
        if (Array.isArray(ai.notes)) notes = routes.map((rt, i) => (ai.notes[i] ? `${(rt.meters / MI_M).toFixed(1)} mi · ${ai.notes[i]}` : notes[i]));
        quip = ai.quip || "";
      } catch (e) { /* stats-only notes */ }
      setState({ status: "done", routes, pick, notes, quip });
    } catch (e) { setState({ status: "error", routes: [], pick: 0, notes: [], quip: "", err: String(e.message || e) }); }
  };
  const cur = state.routes[state.pick];
  const saveRoute = () => {
    if (!cur) return;
    const name = naming.trim() || `${(cur.meters / MI_M).toFixed(1)} mi loop`;
    setS((p) => ({ ...p, savedRoutes: [{ id: uid(), name, miles: Math.round((cur.meters / MI_M) * 100) / 100, ascentFt: Math.round(cur.ascent * 3.281), poly: encodePoly(cur.coords), streets: cur.streets.slice(0, 3), t: Date.now() }, ...(p.savedRoutes || [])].slice(0, 30) }));
    setNaming(""); setState((x) => ({ ...x, saved: true }));
  };
  return (
    <div className="panel p-4 space-y-3">
      <div className="font-semibold flex items-center gap-2"><Bot size={18} style={{ color: C.cyan }} />Sterling, find me a route</div>
      <div className="flex gap-2 overflow-x-auto pb-1">{[1, 2, 3, 4, 5, 6.2].map((m) => <button key={m} onClick={() => setMiles(m)} className="px-3 py-1.5 text-sm font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: miles === m ? C.blue : C.glass, color: miles === m ? "#fff" : C.text, border: `1px solid ${C.glassLine}` }}>{m === 6.2 ? "10K" : `${m} mi`}</button>)}</div>
      <input className="inp text-sm" placeholder="Anything special? e.g. flat, through a park, quiet streets" value={pref} onChange={(e) => setPref(e.target.value)} />
      <button onClick={plan} disabled={state.status === "locating" || state.status === "routing"} className="btn w-full py-2.5 text-sm flex items-center justify-center gap-2">{state.status === "locating" ? <><Loader2 size={16} className="animate-spin" />Finding you…</> : state.status === "routing" ? <><Loader2 size={16} className="animate-spin" />Plotting loops…</> : <><MapPin size={16} />Plan a loop from here</>}</button>
      {state.status === "error" && <div className="body text-sm" style={{ color: C.red }}>{state.err}</div>}
      {state.status === "done" && cur && (
        <div className="space-y-2">
          {state.quip && <div className="body text-sm italic" style={{ color: C.sub }}>"{state.quip}"</div>}
          <RouteMap key={state.pick} lines={[{ pts: cur.coords, color: C.cyan, startDot: true }]} height={220} />
          <div className="space-y-1.5">
            {state.routes.map((rt, i) => <button key={rt.seed} onClick={() => setState((x) => ({ ...x, pick: i, saved: false }))} className="w-full text-left p-2.5 body text-sm" style={{ borderRadius: 12, background: i === state.pick ? `${C.cyan}22` : "transparent", border: `1px solid ${i === state.pick ? C.cyan : C.glassLine}`, color: C.text }}><span className="font-semibold">Option {i + 1}{i === state.pick ? " · selected" : ""}</span><br /><span style={{ color: C.dim }}>{state.notes[i]}</span></button>)}
          </div>
          <div className="flex gap-2">
            <input className="inp text-sm" placeholder="Name it to save (optional)" value={naming} onChange={(e) => setNaming(e.target.value)} />
            <button onClick={saveRoute} disabled={state.saved} className="ghost px-3 text-sm font-semibold whitespace-nowrap" style={{ color: state.saved ? C.green : C.cyan }}>{state.saved ? "Saved ✓" : "Save"}</button>
          </div>
          <button onClick={() => onRun({ name: naming.trim() || "Planned loop", poly: encodePoly(cur.coords) })} className="btn w-full py-3">Run this route</button>
        </div>
      )}
    </div>
  );
}
function RunDetail({ s, setS, w, onClose }) {
  const [pts, setPts] = useState(null);
  useEffect(() => { if (!w.run?.hasMap) { setPts([]); return; } window.storage.get(`run:${w.run.id}`, false).then((r) => setPts(decodePoly(r?.value || ""))).catch(() => setPts([])); }, [w.id]);
  const r = w.run;
  const saveAsRoute = () => { if (!pts?.length) return; setS((p) => ({ ...p, savedRoutes: [{ id: uid(), name: `${r.miles} mi from ${fmtDay(w.date)}`, miles: r.miles, ascentFt: null, poly: encodePoly(thinPts(pts, 15, 400)), streets: [], t: Date.now() }, ...(p.savedRoutes || [])].slice(0, 30) })); };
  return (
    <Sheet title={`${r.mode === "walk" ? "Walk" : "Run"} · ${fmtDay(w.date)}`} onClose={onClose}>
      {pts === null ? <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Loading map…</div> : pts.length > 1 ? <RouteMap lines={[{ pts, color: C.cyan, startDot: true }]} height={220} /> : <div className="body text-sm" style={{ color: C.dim }}>No map for this one.</div>}
      <div className="grid grid-cols-3 gap-2">{[["Distance", `${r.miles} mi`], ["Time", fmtDur(r.secs)], ["Pace", `${fmtPace(r.pace)} /mi`]].map(([l, v]) => <div key={l} className="panel py-3 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold tabular-nums">{v}</div></div>)}</div>
      {r.splits?.length > 0 && <div className="panel p-3">{r.splits.map((sp, i) => <div key={i} className="flex justify-between body text-sm py-0.5"><span style={{ color: C.dim }}>Mile {i + 1}</span><span className="tabular-nums font-semibold">{fmtDur(sp)}</span></div>)}</div>}
      <div className="grid grid-cols-2 gap-2">
        {pts?.length > 1 && <button onClick={saveAsRoute} className="ghost py-2.5 text-sm font-semibold" style={{ color: C.cyan }}>Save as route</button>}
        <ReceiptButton label="Share card" make={() => buildReceipt({ s, kind: r.mode === "walk" ? "Walk" : "Run", headline: `${r.miles} miles`, sub: fmtDay(w.date), tierImg: Math.floor(overallInfo(s).score), rows: [["Time", fmtDur(r.secs)], ["Avg pace", `${fmtPace(r.pace)} /mi`], ["Fastest mile", r.splits?.length ? fmtDur(Math.min(...r.splits)) : "–"], ["XP", `+${w.xp || 0}`]] })} />
      </div>
      <div className="body text-xs" style={{ color: C.mute }}>Maps stay private to you. Share cards don't include your route.</div>
    </Sheet>
  );
}
function RunHub({ s, setS, gainXp, onBack, startRun }) {
  const [mode, setMode] = useState("run");
  const [detail, setDetail] = useState(null);
  const runs = [...s.workouts].reverse().filter((w) => w.run).slice(0, 20);
  const saved = s.savedRoutes || [];
  const monthMi = s.workouts.filter((w) => w.date.startsWith(monthKey())).reduce((a, w) => a + (w.run?.miles || 0), 0);
  const best = runs.reduce((b, w) => (w.run.mode !== "walk" && w.run.miles >= 1 && (!b || w.run.pace < b.run.pace) ? w : b), null);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold flex-1">Run & steps</h1>
      </div>
      <div className="panel p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">{[["run", "Run"], ["walk", "Walk"]].map(([id, l]) => <button key={id} onClick={() => setMode(id)} className="py-2 text-sm font-semibold" style={{ borderRadius: 10, background: mode === id ? C.blue : C.glass, color: mode === id ? "#fff" : C.text, border: `1px solid ${C.glassLine}` }}>{l}</button>)}</div>
        <button onClick={() => startRun(mode, null)} className="w-full py-5 text-xl font-black flex items-center justify-center gap-2" style={{ borderRadius: 18, background: "linear-gradient(180deg,#3DF08A,#12A860)", color: "#021a0c", boxShadow: "0 10px 30px rgba(61,240,138,.25)" }}><Play size={24} />Start {mode === "walk" ? "walk" : "run"}</button>
        <div className="grid grid-cols-3 gap-2 text-center">{[["This month", `${monthMi.toFixed(1)} mi`], ["Runs logged", runs.length], ["Best pace", best ? fmtPace(best.run.pace) : "–"]].map(([l, v]) => <div key={l}><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold tabular-nums">{v}</div></div>)}</div>
        <div className="body text-xs" style={{ color: C.mute }}>Keep Ascend open with the screen on while you run. Phones pause GPS for websites when locked.</div>
      </div>
      <RoutePlanner s={s} setS={setS} onRun={(guide) => startRun(mode, guide)} />
      {saved.length > 0 && (
        <>
          <h2 className="text-lg font-bold">Saved routes</h2>
          <div className="space-y-2">{saved.map((rt) => (
            <div key={rt.id} className="panel p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0"><div className="font-semibold truncate">{rt.name}</div><div className="body text-xs" style={{ color: C.dim }}>{rt.miles} mi{rt.ascentFt != null ? ` · ${rt.ascentFt} ft climb` : ""}{rt.streets?.length ? ` · ${rt.streets.join(", ")}` : ""}</div></div>
              <button onClick={() => startRun(mode, { name: rt.name, poly: rt.poly })} className="btn px-3 py-2 text-sm">Run</button>
              <button aria-label={`Delete ${rt.name}`} onClick={() => ask(`Delete route "${rt.name}"?`, () => setS((p) => ({ ...p, savedRoutes: (p.savedRoutes || []).filter((x) => x.id !== rt.id) })), "Delete")} style={{ color: C.mute }}><Trash2 size={16} /></button>
            </div>
          ))}</div>
        </>
      )}
      <h2 className="text-lg font-bold">Recent runs</h2>
      {runs.length === 0 && <Empty>No runs yet. Tap Start run and your distance, pace, splits, and route map save here.</Empty>}
      <div className="space-y-2">{runs.map((w) => (
        <button key={w.id} onClick={() => setDetail(w)} className="panel p-3 w-full text-left flex items-center gap-3">
          <div className="shrink-0 flex items-center justify-center text-lg" style={{ width: 40, height: 40, borderRadius: 12, background: `${C.green}22` }}>{w.run.mode === "walk" ? "🚶" : "🏃"}</div>
          <div className="flex-1 min-w-0"><div className="font-semibold">{w.run.miles} mi <span className="body text-xs font-normal" style={{ color: C.dim }}>· {fmtDay(w.date)}</span></div><div className="body text-xs" style={{ color: C.dim }}>{fmtDur(w.run.secs)} · {fmtPace(w.run.pace)} /mi{w.run.guideName ? ` · ${w.run.guideName}` : ""}</div></div>
          <ChevronRight size={16} style={{ color: C.mute }} />
        </button>
      ))}</div>
      {detail && <RunDetail s={s} setS={setS} w={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ---------- Onboarding ---------- */
function Confetti({ onDone }) {
  useEffect(() => { SFX.levelUp(); const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  const cols = ["#FFD447", "#3DF08A", "#38C6FF", "#B14BFF", "#FF2D6F", "#FFFFFF"];
  return (
    <div className="fixed inset-0 z-[68] pointer-events-none overflow-hidden" aria-hidden="true">
      {Array.from({ length: 70 }, (_, i) => (
        <span key={i} style={{ position: "absolute", left: `${(i * 37) % 100}%`, top: -20, width: i % 3 ? 8 : 12, height: i % 4 ? 12 : 6, background: cols[i % cols.length], borderRadius: i % 3 ? 2 : 999, "--sx": `${((i * 53) % 120) - 60}px`, "--rot": `${(i * 97) % 720}deg`, animation: `confetti ${1.6 + ((i * 13) % 10) / 10}s ${(i % 8) * 0.07}s cubic-bezier(.2,.6,.4,1) forwards` }} />
      ))}
    </div>
  );
}
function Onboarding({ s, setS, step, onNext }) {
  const p = s.profile;
  const set = (k, v) => setS((x) => ({ ...x, profile: { ...x.profile, [k]: v } }));
  const [name, setName] = useState(p.name || "");
  const ft = Math.floor((p.height || 70) / 12), inch = Math.round((p.height || 70) % 12);
  const setHeight = (f, i2) => set("height", Math.max(48, Math.min(90, f * 12 + i2)));
  const wrap = (children) => (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-1.5 pt-2">{[0, 1, 2].map((i) => <span key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 999, background: i <= step ? C.cyan : C.glassLine, transition: "width .2s" }} />)}</div>
      {children}
    </div>
  );
  if (step === 0) {
    return wrap(
      <div className="panel p-5 space-y-4">
        <img src="/logo.webp" alt="" style={{ width: 96, margin: "0 auto", display: "block" }} />
        <div className="text-center"><div className="text-2xl font-bold">Welcome to Ascend</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Your lifts get ranked E through S, scaled to your body. First, the basics.</div></div>
        <label className="body text-sm block">What should we call you?
          <input autoFocus className="inp mt-1" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && (set("name", name.trim()), onNext())} />
        </label>
        <button disabled={!name.trim()} onClick={() => { set("name", name.trim()); onNext(); }} className="btn w-full py-3" style={!name.trim() ? { opacity: 0.5 } : null}>Continue</button>
      </div>,
    );
  }
  if (step === 1) {
    return wrap(
      <div className="panel p-5 space-y-4">
        <div><div className="text-xl font-bold">Your body stats</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Every rank target and calorie goal is built from these. You can change them any time.</div></div>
        <div className="grid grid-cols-2 gap-3 body text-sm">
          <label>Weight (lb)<input type="number" inputMode="decimal" className="inp mt-1" value={p.weight} onChange={(e) => set("weight", +e.target.value)} /></label>
          <label>Age<input type="number" inputMode="numeric" className="inp mt-1" value={p.age} onChange={(e) => set("age", +e.target.value)} /></label>
          <label>Height<div className="flex gap-1 mt-1"><input type="number" inputMode="numeric" className="inp text-center" value={ft} onChange={(e) => setHeight(+e.target.value || 0, inch)} aria-label="Feet" /><span className="self-center body text-xs" style={{ color: C.dim }}>ft</span><input type="number" inputMode="numeric" className="inp text-center" value={inch} onChange={(e) => setHeight(ft, +e.target.value || 0)} aria-label="Inches" /><span className="self-center body text-xs" style={{ color: C.dim }}>in</span></div></label>
          <label>Sex<select className="inp mt-1" value={p.sex} onChange={(e) => set("sex", e.target.value)}><option value="m">Male</option><option value="f">Female</option></select></label>
          <label className="col-span-2">Training now<select className="inp mt-1" value={p.activity} onChange={(e) => set("activity", +e.target.value)}>{ACTIVITY.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          <label className="col-span-2">Goal<select className="inp mt-1" value={p.goal} onChange={(e) => set("goal", e.target.value)}>{GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
        </div>
        <button onClick={() => { setS((x) => ({ ...x, weightLog: { ...(x.weightLog || {}), [today()]: +x.profile.weight || 170 } })); onNext(); }} className="btn w-full py-3">Save stats</button>
      </div>,
    );
  }
  return wrap(
    <div className="panel p-5 space-y-4">
      <div><div className="text-xl font-bold">Join the season</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Season {seasonKey().split("-S")[1]} is live. Joining puts you on the leaderboard, the feed, boss fights, and duels. Your food log and workout details stay private.</div></div>
      <div className="panel p-3 flex items-center gap-3" style={{ background: "transparent" }}>
        <Avatar name={p.name} size={44} ring={C.cyan} />
        <div className="min-w-0"><div className="font-bold truncate">{p.name}</div><div className="body text-xs" style={{ color: C.dim }}>{p.weight} lb · {ft}'{inch}" · {GOALS.find((g) => g.id === p.goal)?.label}</div></div>
      </div>
      <button onClick={() => { setS((x) => ({ ...x, lb: true })); onNext(); }} className="btn w-full py-3">Join the leaderboard</button>
      <button onClick={onNext} className="body text-sm w-full" style={{ color: C.mute }}>Skip for now</button>
    </div>,
  );
}

/* ---------- Crews ---------- */
const crewCode = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
async function readCrew(code) {
  try { const r = await window.storage.get(`crew:${code}`, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; }
}
function CrewPanel({ s, setS, rows }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [crew, setCrew] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const mine = s.crew;
  useEffect(() => { if (mine?.code) readCrew(mine.code).then(setCrew); }, [mine?.code]);
  const create = async () => {
    if (!s.lb || !s.profile.name) { setErr("Join the leaderboard first."); return; }
    setBusy(true); setErr("");
    const c = crewCode(), rec = { code: c, name: name.trim().slice(0, 30) || `${s.profile.name}'s crew`, owner: s.playerId, members: [s.playerId], t: Date.now() };
    try { await window.storage.set(`crew:${c}`, JSON.stringify(rec), true); setS((p) => ({ ...p, crew: { code: c, name: rec.name } })); setCrew(rec); }
    catch (e) { setErr("Couldn't create the crew. Check your connection."); }
    setBusy(false);
  };
  const join = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    setBusy(true); setErr("");
    const rec = await readCrew(c);
    if (!rec) { setErr("No crew with that code."); setBusy(false); return; }
    const members = [...new Set([...(rec.members || []), s.playerId])];
    try { await window.storage.set(`crew:${c}`, JSON.stringify({ ...rec, members }), true); } catch (e) { /* owner-only write blocked; membership still tracked locally */ }
    setS((p) => ({ ...p, crew: { code: c, name: rec.name } })); setCrew({ ...rec, members }); setCode(""); setBusy(false);
  };
  const leave = () => ask("Leave this crew? You'll go back to the global boss only.", () => { setS((p) => ({ ...p, crew: null })); setCrew(null); }, "Leave");
  const memberRows = crew ? rows.filter((r) => (crew.members || []).includes(r.id)) : [];
  if (mine?.code) {
    return (
      <div className="panel p-4 space-y-2">
        <div className="flex justify-between items-start"><div><div className="body text-xs uppercase tracking-wider font-semibold" style={{ color: C.dim }}>Your crew</div><div className="font-bold">{crew?.name || mine.name}</div></div><div className="text-right"><div className="font-mono font-bold" style={{ color: C.cyan }}>{mine.code}</div><div className="body text-xs" style={{ color: C.dim }}>{memberRows.length || 1} member{(memberRows.length || 1) === 1 ? "" : "s"}</div></div></div>
        <div className="body text-xs" style={{ color: C.dim }}>Share the code so others can join. Your crew boss is sized to your crew.</div>
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard?.writeText(mine.code)} className="ghost flex-1 py-2 text-sm font-semibold" style={{ color: C.cyan }}>Copy code</button>
          <button onClick={leave} className="ghost px-3 py-2 text-sm" style={{ color: C.red }}>Leave</button>
        </div>
      </div>
    );
  }
  return (
    <div className="panel p-4 space-y-3">
      <div><div className="font-bold">Start or join a crew</div><div className="body text-xs mt-0.5" style={{ color: C.dim }}>Crews get their own boss, sized to how many of you there are. You'll still fight the global boss with everyone.</div></div>
      <div className="flex gap-2"><input className="inp text-sm" placeholder="Crew name" value={name} onChange={(e) => setName(e.target.value)} /><button onClick={create} disabled={busy} className="btn px-4 text-sm whitespace-nowrap">Create</button></div>
      <div className="flex gap-2"><input className="inp text-sm font-mono" placeholder="Invite code" value={code} maxLength={8} onChange={(e) => setCode(e.target.value.toUpperCase())} /><button onClick={join} disabled={busy || code.trim().length < 4} className="ghost px-4 text-sm font-bold" style={{ color: C.cyan }}>Join</button></div>
      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}
    </div>
  );
}

/* ---------- Animated boss art ---------- */
function BossArt({ boss, pct, dead, hit, size = 84 }) {
  const enraged = pct <= 0.5 && !dead;
  const eye = enraged ? "#FF2D2D" : boss.color;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {!dead && <div style={{ position: "absolute", inset: -6, borderRadius: "50%", background: `radial-gradient(closest-side, ${enraged ? "rgba(255,45,45,.35)" : `${boss.color}33`}, transparent)`, animation: `aurapulse ${enraged ? 1.1 : 2.6}s ease-in-out infinite` }} />}
      {enraged && Array.from({ length: 6 }, (_, i) => <span key={i} style={{ position: "absolute", left: "50%", top: "60%", width: 5, height: 5, borderRadius: 999, background: i % 2 ? "#FF7A2D" : "#FF2D2D", "--dx": `${((i * 47) % 70) - 35}px`, "--dy": `${-30 - ((i * 23) % 40)}px`, "--rot": "0deg", animation: `juicespark ${1.2 + (i % 3) * 0.3}s ${i * 0.18}s linear infinite` }} />)}
      <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: size * 0.62, filter: `drop-shadow(0 0 ${enraged ? 18 : 10}px ${enraged ? "#FF2D2D" : boss.color})`, opacity: dead ? 0.35 : 1, animation: hit ? "bosshit .45s ease-out" : dead ? "none" : `${enraged ? "bossrage .9s" : "bossidle 3s"} ease-in-out infinite` }}>
        {boss.icon === "chud" ? <ChudKing size={size * 0.95} dead={dead} /> : boss.icon}
      </div>
      {!dead && <><span style={{ position: "absolute", left: "34%", top: "40%", width: 6, height: 6, borderRadius: 999, background: eye, boxShadow: `0 0 ${enraged ? 10 : 5}px ${eye}`, animation: enraged ? "rktwinkle .7s ease-in-out infinite" : "none", opacity: enraged ? 1 : 0 }} /><span style={{ position: "absolute", left: "58%", top: "40%", width: 6, height: 6, borderRadius: 999, background: eye, boxShadow: `0 0 ${enraged ? 10 : 5}px ${eye}`, animation: enraged ? "rktwinkle .7s ease-in-out infinite" : "none", opacity: enraged ? 1 : 0 }} /></>}
    </div>
  );
}

/* ---------- XP ledger ---------- */
function XpLedger({ s, onBack }) {
  const days = Object.keys(s.xpDetail || {}).sort().reverse();
  const total = Object.values(s.xpLog || {}).reduce((a, v) => a + v, 0);
  const kinds = {};
  days.forEach((d) => (s.xpDetail[d] || []).forEach((x) => { const k = x.m.replace(/\d+/g, "").trim(); kinds[k] = (kinds[k] || 0) + x.a; }));
  const top = Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button><h1 className="text-2xl font-bold flex-1">XP history</h1></div>
      <div className="panel p-4">
        <div className="flex justify-between items-baseline"><span className="body text-sm" style={{ color: C.dim }}>Total XP</span><span className="text-2xl font-bold">{s.xp.toLocaleString()}</span></div>
        <div className="body text-xs mt-1" style={{ color: C.mute }}>Logged history covers {total.toLocaleString()} XP across {days.length} days.{Math.abs(total - s.xp) > 50 ? " Older XP was earned before this ledger existed." : ""}</div>
      </div>
      {top.length > 0 && (
        <div className="panel p-4 space-y-1.5">
          <div className="font-semibold text-sm mb-1">Where it came from</div>
          {top.map(([k, v]) => <div key={k}><div className="flex justify-between body text-sm"><span style={{ color: C.sub }}>{k}</span><span className="font-semibold">{v.toLocaleString()}</span></div><div className="mt-0.5"><Bar pct={(v / top[0][1]) * 100} color={C.cyan} /></div></div>)}
        </div>
      )}
      {days.length === 0 && <Empty>Nothing logged yet. Every XP gain from here on shows up in this list.</Empty>}
      {days.map((d) => (
        <div key={d} className="panel p-3">
          <div className="flex justify-between items-center mb-1"><span className="font-semibold text-sm">{fmtDay(d)}</span><span className="font-bold" style={{ color: C.gold }}>+{(s.xpLog?.[d] || 0).toLocaleString()}</span></div>
          {(s.xpDetail[d] || []).slice().reverse().map((x, i) => (
            <div key={i} className="flex justify-between body text-sm py-0.5"><span style={{ color: C.sub }}>{x.m}</span><span className="tabular-nums" style={{ color: x.a >= 0 ? C.dim : C.orange }}>{x.a >= 0 ? "+" : ""}{x.a}</span></div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- Community meals ---------- */
function ShareMealButton({ s, food }) {
  const [sent, setSent] = useState(false);
  if (!s.lb) return null;
  const share = () => {
    publishShared(`cmeal:${uid()}`, { name: food.name, cal: food.cal, p: food.p, c: food.c, f: food.f, ingredients: food.ingredients || null, by: s.profile.name || "a player", from: s.playerId, t: Date.now() });
    setSent(true);
  };
  return <button onClick={share} disabled={sent} className="ghost px-3 py-2 text-xs font-semibold flex items-center gap-1" style={{ color: sent ? C.green : C.cyan }}>{sent ? <><Check size={13} />Shared</> : <><Share2 size={13} />Share to community</>}</button>;
}
function CommunityMeals({ s, setS, onAdd }) {
  const [items, setItems] = useState(null);
  const [scale, setScale] = useState({});
  useEffect(() => { readShared("cmeal:").then((r) => setItems(r.sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 30))); }, []);
  if (items === null) return <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Loading community meals…</div>;
  if (!items.length) return <Empty>No shared meals yet. When you log a meal from a photo or AI estimate, tap "Share to community" to put it here.</Empty>;
  return (
    <div className="space-y-2">
      {items.map((m) => {
        const k = scale[m.key] ?? 1;
        const v = (n) => Math.round((n || 0) * k);
        return (
          <div key={m.key} className="panel p-3 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0"><div className="font-semibold truncate">{m.name}</div><div className="body text-xs" style={{ color: C.dim }}>by {m.by}{m.ingredients?.length ? ` · ${m.ingredients.length} ingredients` : ""}</div></div>
              {m.from === s.playerId && <button aria-label="Delete" onClick={() => ask("Remove this from the community feed?", async () => { try { await window.storage.delete(m.key, true); setItems((x) => x.filter((y) => y.key !== m.key)); } catch (e) { /* ignore */ } }, "Delete")} style={{ color: C.mute }}><Trash2 size={14} /></button>}
            </div>
            <div className="body text-sm" style={{ color: C.sub }}>{v(m.cal)} cal · P {v(m.p)} · C {v(m.c)} · F {v(m.f)}</div>
            <div className="flex items-center gap-2">
              <input type="range" min="0.25" max="2" step="0.25" value={k} onChange={(e) => setScale({ ...scale, [m.key]: +e.target.value })} className="flex-1" style={{ accentColor: C.cyan }} aria-label="Portion size" />
              <span className="body text-xs tabular-nums w-10 text-right" style={{ color: C.dim }}>{k}×</span>
              <button onClick={() => onAdd({ name: `${m.name}${k !== 1 ? ` (${k}×)` : ""}`, cal: v(m.cal), p: v(m.p), c: v(m.c), f: v(m.f), ingredients: m.ingredients || undefined, meal: !!m.ingredients })} className="btn px-3 py-1.5 text-xs">Copy meal</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Log tab: workout detail ---------- */
function LogWorkoutSheet({ s, setS, w, onClose }) {
  const [saved, setSaved] = useState(false);
  const savePreset = () => {
    const name = w.title ? `${w.title} (${fmtDay(w.date)})` : `Workout ${fmtDay(w.date)}`;
    setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== name), { id: uid(), name, exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets.length })) }] }));
    setSaved(true);
  };
  return (
    <Sheet title={`${w.title || "Workout"} · ${fmtDay(w.date)}`} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {[["XP", `+${w.xp || 0}`], ["Volume", `${Math.round(w.volume || 0).toLocaleString()} lb`], ["Time", w.minutes ? `${w.minutes} min` : "–"]].map(([l, v]) => <div key={l} className="panel py-2.5 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold">{v}</div></div>)}
      </div>
      {w.exercises.map((ex, i) => {
        const def = findEx(s, ex.name);
        return (
          <div key={i} className="panel p-3">
            <div className="font-semibold" style={{ color: C.cyan }}>{ex.name}</div>
            {ex.sets.map((st, j) => <div key={j} className="flex justify-between body text-sm py-0.5"><span style={{ color: C.dim }}>Set {j + 1}</span><span className="font-semibold">{setLabel(def, st)}</span></div>)}
          </div>
        );
      })}
      <button onClick={savePreset} disabled={saved} className="btn w-full py-3 flex items-center justify-center gap-2">{saved ? <><Check size={16} />Saved to presets</> : <><Bookmark size={16} />Save as my preset</>}</button>
    </Sheet>
  );
}

/* ---------- Hydration bar (sits beside the macros) ---------- */
function HydrationBar({ s, setS, gainXp, d }) {
  const target = Math.max(8, Math.round((+s.profile.weight || 170) / 2 / 8));
  const w = s.water?.[d] || { n: 0, xp: false };
  const pct = Math.min(100, (w.n / target) * 100);
  const set = (n) => setS((p) => {
    const cur = p.water?.[d] || { n: 0, xp: false };
    const next = { ...cur, n: Math.max(0, n) };
    if (!cur.xp && next.n >= target) { next.xp = true; setTimeout(() => { gainXp(WATER_XP, "Water goal", `water_${d}`); SFX.water(); }, 0); }
    return { ...p, water: { ...(p.water || {}), [d]: next } };
  });
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 54 }}>
      <button aria-label="Add a cup of water" onClick={() => set(w.n + 1)} className="relative overflow-hidden" style={{ width: 34, height: 104, borderRadius: 10, border: `1px solid ${C.glassLine}`, background: C.track }}>
        <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${pct}%`, background: `linear-gradient(180deg, ${C.cyan}, #2F6BFF)`, transition: "height .4s cubic-bezier(.2,.8,.2,1)", boxShadow: `0 0 12px ${C.glow}` }} />
        <span style={{ position: "absolute", left: 0, right: 0, bottom: `calc(${pct}% - 3px)`, height: 3, background: "rgba(255,255,255,.55)", opacity: pct > 0 && pct < 100 ? 1 : 0 }} />
        <Droplets size={15} style={{ position: "absolute", left: "50%", top: 6, transform: "translateX(-50%)", color: pct > 85 ? "#fff" : C.dim }} />
      </button>
      <div className="body text-xs text-center leading-tight" style={{ color: w.n >= target ? C.green : C.dim }}>{w.n}/{target}<br />cups</div>
      <button aria-label="Remove a cup" onClick={() => set(w.n - 1)} className="body text-xs px-2" style={{ color: C.mute }}>−</button>
    </div>
  );
}
