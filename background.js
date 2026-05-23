// Public lolesports.com hardcoded API key (bundled in their own client JS, used by every community LoL esports tracker).
const API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";
const LCK_ID = "98767991310872058";
const API_URL = `https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US&leagueId=${LCK_ID}`;
const POLL_ALARM = "lck-poll";
const NOTIFY_WINDOW_MIN = 15;

async function fetchSchedule() {
  const r = await fetch(API_URL, { headers: { "x-api-key": API_KEY } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

async function maybeNotify(data) {
  const { notifyEnabled = false, notifyLive = false } =
    await chrome.storage.local.get(["notifyEnabled", "notifyLive"]);
  const events = (data?.data?.schedule?.events || []).filter(
    (e) => e.type === "match",
  );
  const now = Date.now();
  const { notifiedIds = [], liveNotifiedIds = [] } =
    await chrome.storage.local.get(["notifiedIds", "liveNotifiedIds"]);
  const sent = new Set(notifiedIds);
  const liveSent = new Set(liveNotifiedIds);
  let changed = false;
  let liveChanged = false;

  if (notifyEnabled) {
    for (const e of events) {
      if (e.state !== "unstarted") continue;
      const id = e.match?.id || e.startTime;
      const start = new Date(e.startTime).getTime();
      const minsLeft = Math.round((start - now) / 60000);
      if (minsLeft > 0 && minsLeft <= NOTIFY_WINDOW_MIN && !sent.has(id)) {
        const [t1 = {}, t2 = {}] = e.match?.teams || [];
        chrome.notifications.create(`lck-${id}`, {
          type: "basic",
          iconUrl: "icons/icon-128.png",
          title: `LCK in ${minsLeft}min: ${t1.code || "TBD"} vs ${t2.code || "TBD"}`,
          message: `${e.league?.name || "LCK"} • ${e.blockName || ""}`,
          priority: 2,
        });
        sent.add(id);
        changed = true;
      }
    }
  }

  if (notifyLive) {
    for (const e of events) {
      if (e.state !== "inProgress") continue;
      const id = e.match?.id || e.startTime;
      if (liveSent.has(id)) continue;
      const [t1 = {}, t2 = {}] = e.match?.teams || [];
      chrome.notifications.create(`lck-live-${id}`, {
        type: "basic",
        iconUrl: "icons/icon-128.png",
        title: `LCK LIVE NOW: ${t1.code || "TBD"} vs ${t2.code || "TBD"}`,
        message: `${e.league?.name || "LCK"} • ${e.blockName || ""}`,
        priority: 2,
      });
      liveSent.add(id);
      liveChanged = true;
    }
  }

  if (changed) {
    await chrome.storage.local.set({ notifiedIds: [...sent].slice(-100) });
  }
  if (liveChanged) {
    await chrome.storage.local.set({
      liveNotifiedIds: [...liveSent].slice(-100),
    });
  }
}

async function poll() {
  try {
    const data = await fetchSchedule();
    await chrome.storage.local.set({
      lastSchedule: data,
      lastFetched: Date.now(),
    });
    await maybeNotify(data);
  } catch (e) {
    console.error("LCK poll failed:", e.message);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: 5 });
  poll();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: 5 });
  poll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) poll();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "RESCHEDULE_NOTIFS" && msg.data) {
    maybeNotify(msg.data).then(() => sendResponse({ ok: true }));
    return true;
  }
});

chrome.notifications.onClicked.addListener((id) => {
  chrome.tabs.create({ url: "https://lolesports.com/schedule?leagues=lck" });
  chrome.notifications.clear(id);
});
