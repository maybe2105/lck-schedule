console.log("[LCK] background.js loaded at", new Date().toISOString());
// Public lolesports.com hardcoded API key (bundled in their own client JS, used by every community LoL esports tracker).
const API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";
const LCK_ID = "98767991310872058";
const API_URL = `https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US&leagueId=${LCK_ID}`;
const POLL_ALARM = "lck-poll";
const BADGE_BG = "#ef4444";

async function fetchSchedule() {
  const r = await fetch(API_URL, { headers: { "x-api-key": API_KEY } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

async function clearBadge() {
  await chrome.action.setBadgeText({ text: "" });
  await chrome.action.setTitle({ title: "LCK Schedule" });
}

async function updateBadge(data) {
  const { notifyLive = false } = await chrome.storage.local.get("notifyLive");
  if (!notifyLive) {
    await clearBadge();
    return;
  }
  const events = (data?.data?.schedule?.events || []).filter(
    (e) => e.type === "match" && e.state === "inProgress",
  );
  console.log("[LCK] live events:", events.length);
  if (events.length === 0) {
    await clearBadge();
    return;
  }
  const labels = events.map((e) => {
    const [t1 = {}, t2 = {}] = e.match?.teams || [];
    return `${t1.code || "TBD"} vs ${t2.code || "TBD"}`;
  });
  await chrome.action.setBadgeText({ text: "LIVE" });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_BG });
  if (chrome.action.setBadgeTextColor) {
    await chrome.action.setBadgeTextColor({ color: "#ffffff" });
  }
  await chrome.action.setTitle({
    title: `LCK LIVE: ${labels.join(", ")}`,
  });
}

async function poll() {
  try {
    const data = await fetchSchedule();
    await chrome.storage.local.set({
      lastSchedule: data,
      lastFetched: Date.now(),
    });
    await updateBadge(data);
  } catch (e) {
    console.error("[LCK] poll failed:", e.message);
  }
}

chrome.alarms.get(POLL_ALARM, (a) => {
  if (!a) {
    console.log("[LCK] creating alarm");
    chrome.alarms.create(POLL_ALARM, { periodInMinutes: 5 });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[LCK] onInstalled");
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: 5 });
  poll();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[LCK] onStartup");
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: 5 });
  poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) poll();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.notifyLive) {
    console.log("[LCK] notifyLive changed →", changes.notifyLive.newValue);
    poll();
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log("[LCK] message received:", msg?.type);
  if (msg?.type === "CHECK_LIVE_NOW") {
    poll().then(() => sendResponse({ ok: true }));
    return true;
  }
});
