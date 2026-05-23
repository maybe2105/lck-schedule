// Public lolesports.com hardcoded API key (bundled in their own client JS, used by every community LoL esports tracker).
const API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";
const LCK_ID = "98767991310872058";
const API_URL = `https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US&leagueId=${LCK_ID}`;

const $ = (sel) => document.querySelector(sel);
const content = $("#content");
const updated = $("#updated");
const refreshBtn = $("#refreshBtn");
const settingsBtn = $("#settingsBtn");
const twitchBtn = $("#twitchBtn");
const backBtn = $("#backBtn");
const scheduleView = $("#scheduleView");
const settingsView = $("#settingsView");
const liveSwitch = $("#liveSwitch");

async function fetchSchedule() {
  const r = await fetch(API_URL, { headers: { "x-api-key": API_KEY } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

function fmtTimeParts(d) {
  const s = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const m = s.match(/(\d+:\d+)\s*([AP]M)?/i);
  if (m) return { h: m[1], ap: m[2] || "" };
  return { h: s, ap: "" };
}

function dayBucket(d, now) {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return "Later Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderMatch(ev) {
  const m = ev.match || {};
  const [t1 = {}, t2 = {}] = m.teams || [];
  const t = new Date(ev.startTime);
  const { h, ap } = fmtTimeParts(t);
  const isLive = ev.state === "inProgress";
  const isDone = ev.state === "completed";
  const bo = m.strategy ? `Bo${m.strategy.count}` : "";
  const week = escapeHtml(ev.blockName || "");
  const league = escapeHtml(ev.league?.name || "LCK");
  const w1 = t1.result?.outcome === "win";
  const w2 = t2.result?.outcome === "win";
  const cls1 = isDone ? (w1 ? "winner" : "loser") : "";
  const cls2 = isDone ? (w2 ? "winner" : "loser") : "";
  const score = isDone
    ? `<span class="score"><span class="${w1 ? "w" : ""}">${t1.result?.gameWins ?? ""}</span>:<span class="${w2 ? "w" : ""}">${t2.result?.gameWins ?? ""}</span></span>`
    : "";

  const open = isLive
    ? `<a class="match match-live" href="https://www.twitch.tv/caedrel" target="_blank" rel="noopener" title="Watch caedrel on Twitch">`
    : `<div class="match">`;
  const close = isLive ? `</a>` : `</div>`;

  return `
    ${open}
      <div class="row">
        <div class="time"><span class="h">${escapeHtml(h)}</span><span class="ap">${escapeHtml(ap)}</span></div>
        <div class="teams">
          <div class="team left ${cls1}">
            <span class="code">${escapeHtml(t1.code || "TBD")}</span>
            ${t1.image ? `<img src="${escapeHtml(t1.image)}" alt="">` : ""}
          </div>
          <div class="vs">/</div>
          <div class="team right ${cls2}">
            ${t2.image ? `<img src="${escapeHtml(t2.image)}" alt="">` : ""}
            <span class="code">${escapeHtml(t2.code || "TBD")}</span>
          </div>
        </div>
      </div>
      <div class="foot">
        <span class="league-badge">${league}</span>
        <span class="center">${league} • ${week} ${isLive ? '• <span style="color:#ef4444;font-weight:700">LIVE</span>' : ""}</span>
        <span class="right">${score || bo}</span>
      </div>
    ${close}
  `;
}

function render(data) {
  const events = (data?.data?.schedule?.events || []).filter((e) => e.type === "match");
  const now = new Date();
  const live = [];
  const upcoming = [];
  for (const e of events) {
    const t = new Date(e.startTime);
    if (e.state === "inProgress") { live.push(e); continue; }
    if (e.state === "unstarted" && t >= new Date(now.getTime() - 3 * 3600 * 1000)) upcoming.push(e);
  }
  upcoming.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const groups = new Map();
  if (live.length) groups.set("Live", live);
  for (const e of upcoming) {
    const b = dayBucket(new Date(e.startTime), now);
    if (!b) continue;
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b).push(e);
  }

  if (groups.size === 0) {
    content.innerHTML = `<div class="empty">No upcoming LCK matches.</div>`;
    return;
  }

  let html = "";
  for (const [name, list] of groups) {
    const isLive = name === "Live";
    html += `<div class="section"><h2>${escapeHtml(name)}${isLive ? '<span class="badge">LIVE</span>' : ""}</h2>`;
    for (const e of list) html += renderMatch(e);
    html += `</div>`;
  }
  content.innerHTML = html;
}

async function reload() {
  try {
    const data = await fetchSchedule();
    render(data);
    updated.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    content.innerHTML = `<div class="error">Failed: ${escapeHtml(e.message)}</div>`;
  }
}

function showSettings() {
  scheduleView.hidden = true;
  settingsView.hidden = false;
  settingsBtn.classList.add("on");
}
function showSchedule() {
  scheduleView.hidden = false;
  settingsView.hidden = true;
  settingsBtn.classList.remove("on");
}

async function loadLiveSwitchState() {
  const { notifyLive = false } = await chrome.storage.local.get("notifyLive");
  liveSwitch.classList.toggle("on", notifyLive);
  liveSwitch.setAttribute("aria-checked", String(notifyLive));
}

async function toggleLive() {
  const { notifyLive = false } = await chrome.storage.local.get("notifyLive");
  const next = !notifyLive;
  await chrome.storage.local.set({ notifyLive: next });
  loadLiveSwitchState();
  if (next) {
    chrome.runtime.sendMessage({ type: "CHECK_LIVE_NOW" }).catch(() => {});
  }
}

settingsBtn.addEventListener("click", () => {
  if (settingsView.hidden) showSettings(); else showSchedule();
});
backBtn.addEventListener("click", showSchedule);
refreshBtn.addEventListener("click", reload);
twitchBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://www.twitch.tv/caedrel" });
});
liveSwitch.addEventListener("click", toggleLive);
liveSwitch.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleLive(); }
});

loadLiveSwitchState();
reload();
setInterval(reload, 60_000);
