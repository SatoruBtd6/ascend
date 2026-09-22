import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, Hand, Image as ImageIcon, Loader2, MessageCircle, Music, Trash2, Upload, X, Zap } from "lucide-react";
import { TIER_STYLE } from "../../data/achievements.js";
import { RANKS } from "../../data/ranks.js";
import { ask } from "../../lib/ask.js";
import { allAchievements, fmtCredit } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { Bar, Empty } from "../../ui/primitives.jsx";
import { shrinkPhoto } from "../fuel/shrinkPhoto.js";
import { StepsPanel } from "../run/StepsPanel.jsx";
import { RankBadge } from "../train/RankBadge.jsx";
import { AchBadge, Avatar, FancyName, WeightChart, shrinkImage } from "./Avatar.jsx";
import { CrateVault } from "./CrateVault.jsx";
import { lookStyle, makeClip, songLinkLabel } from "./lookConsts.js";
import { Measurements } from "./Measurements.jsx";
import { MogSection } from "./Mog.jsx";
import { Jingle, THEMES_MUSIC } from "./music.js";
import { Physique } from "./Physique.jsx";
import { profileCard } from "./profileCard.js";
import { CrewBanner, RivalBadge, SeasonBadges, VersusPanel } from "./profileWidgets.jsx";
import { ProgressPhotos } from "./ProgressPhotos.jsx";
import { nemesisWins } from "./rivalryStats.js";
import { SongPlayer } from "./SongPlayer.jsx";
import { LookStudio } from "./Studio.jsx";
export function ProfilePage({ s, setS, targetId, onBack, gainXp, openXp }) {
  const me = !targetId || targetId === s.playerId;
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(!me);
  const [social, setSocial] = useState({ fives: [], comments: [] });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
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
    setBusy(true); setNote("");
    const t = Date.now(), key = `cm:${id}:${t}_${s.playerId}`;
    const imgKey = cImg ? `cmi:${id}:${t}_${s.playerId}` : null;
    const rec = { text, img: cImg || null, imgKey, name: s.profile.name, from: s.playerId, fromUid: window.ascendUserId || null, to: id, toUid: data?.uid || (me ? window.ascendUserId : null), t };
    try {
      if (imgKey) await window.storage.set(imgKey, cImg, true);
      await window.storage.set(key, JSON.stringify(rec), true);
      setSocial((x) => ({ ...x, comments: [{ key, ...rec }, ...x.comments] })); setComment(""); setCImg(null);
    } catch { setNote("Couldn't post that. Check your connection."); }
    setBusy(false);
  };
  const deleteComment = async (c) => {
    setNote("");
    try {
      if (c.imgKey) { try { await window.storage.delete(c.imgKey, true); } catch (e) { /* try the comment row anyway */ } }
      else if (c.img) { try { await window.storage.purgeValue?.(c.img); } catch (e) { /* inline jpeg */ } }
      await window.storage.delete(c.key, true);
      setSocial((x) => ({ ...x, comments: x.comments.filter((y) => y.key !== c.key) }));
    } catch { setNote("Couldn't delete that. Check your connection, or try again from the account that posted it."); }
  };
  const removeAvatar = async () => {
    const prev = s.profile.avatar;
    setS((p) => ({ ...p, profile: { ...p.profile, avatar: null } }));
    try { await window.storage.purgeValue?.(prev); } catch (e) { /* data url or already gone */ }
    try {
      if (s.lb) {
        const card = profileCard({ ...s, profile: { ...s.profile, avatar: null } });
        await window.storage.set(`lb:${s.playerId}`, JSON.stringify(card), true);
      }
    } catch { setNote("Photo cleared here, but the board copy may take a moment to catch up."); }
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
                <Avatar src={data.avatar} name={data.name} size={76} ring={data.look?.accent || rank.color} look={(!data.reigning && !(me && (s.lbReigning || s.test)) && data.look?.aura === "ascended") ? { ...(data.look || {}), aura: (data.look?.auraPrev && data.look.auraPrev !== "ascended") ? data.look.auraPrev : "none" } : data.look} />
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
                {(me ? nemesisWins(s) : data.nemWins) > 0 && <div className="mt-1"><RivalBadge wins={me ? nemesisWins(s) : data.nemWins} /></div>}
                {Object.keys(data.badges || {}).length > 0 && <div className="mt-1"><SeasonBadges badges={data.badges} /></div>}
                {(data.cb || 0) > 0 && <div className="mt-1"><CrewBanner count={data.cb} /></div>}
                <div className="body text-sm" style={{ color: rank.color }}>{data.rank}{data.div ? ` ${data.div}` : ""} · Level {data.lvl}</div>
                <div className="body text-xs mt-0.5" style={{ color: C.dim }}>{(data.points || 0).toLocaleString()} pts · {data.streak} day streak{st?.since ? ` · since ${new Date(st.since + "T12:00").toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : ""}</div>
              </div>
            </div>
            {me && data.avatar && <button onClick={() => ask("Remove your profile photo? This deletes it from your profile and the board.", removeAvatar, "Remove")} className="body text-xs underline mt-3" style={{ color: C.mute }}>Remove photo</button>}
            <div className="flex items-center gap-3 flex-wrap mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-1 font-bold" style={{ color: C.gold }}><Hand size={18} />{fives} high-five{fives === 1 ? "" : "s"}</div>
              {!me && <button onClick={highFive} disabled={busy} className="btn px-4 py-2 text-sm flex items-center gap-1"><Hand size={16} />High five</button>}
              {me && openXp && <button onClick={openXp} className="ghost px-3 py-1.5 text-sm font-bold flex items-center gap-1.5" style={{ color: C.gold }}><Zap size={15} />XP history</button>}
              <SongPlayer playerId={id} meta={data.song} me={me} />
            </div>
          </div>

          {me && <CrateVault s={s} setS={setS} />}
          {me && <LookStudio s={s} setS={setS} />}
          {me && (
            <div className="panel p-4 space-y-3">
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
              {[["Workouts", fmtCredit(st.workouts)], ["Lifted", `${st.volume >= 1000000 ? `${(st.volume / 1000000).toFixed(1)}M` : `${Math.round(st.volume / 1000)}k`} lb`], ["Reps", st.reps.toLocaleString()], ["Miles", st.miles], ["Longest streak", `${st.longestStreak}d`], ["Quests", st.quests], ["Bench", st.bench ? `${st.bench} lb` : "–"], ["Squat", st.squat ? `${st.squat} lb` : "–"], ["Deadlift", st.deadlift ? `${st.deadlift} lb` : "–"]].map(([l, v]) => (
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
          {!me && data.weightLog && Object.keys(data.weightLog).length > 1 && (
            <>
              <h2 className="text-lg font-bold">Weight over time</h2>
              <div className="panel p-4"><WeightChart log={data.weightLog} target={data.goal} /></div>
            </>
          )}

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

          {!me && <div className="flex justify-center"><Physique tier={data.tier ?? (RANKS.findIndex((r) => r.id === data.rank) || 0)} height={220} aura={data.look?.aura} sex={data.sex} caption={`${data.name}'s physique`} /></div>}
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
                  {(me || c.from === s.playerId) && <button aria-label="Delete comment" onClick={() => ask(c.img ? "Delete this comment and its photo? They're removed from the board for everyone." : "Delete this comment?", () => deleteComment(c), "Delete")} style={{ color: C.mute }}><Trash2 size={14} /></button>}
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
