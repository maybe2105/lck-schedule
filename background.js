console.log("[LCK] background.js loaded at", new Date().toISOString());
// Public Twitch web client-id (used by twitch.tv itself, embedded in every community Twitch tracker).
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
const STREAMER_LOGIN = "caedrel";
const POLL_ALARM = "lck-poll";
const POLL_PERIOD_MIN = 2;
const BADGE_BG = "#9146ff";

async function fetchStream() {
  const body = [
    {
      query: `query($login: String!) { user(login: $login) { id displayName stream { id type title game { name } viewersCount } } }`,
      variables: { login: STREAMER_LOGIN },
    },
  ];
  const r = await fetch(TWITCH_GQL_URL, {
    method: "POST",
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const json = await r.json();
  return json?.[0]?.data?.user || null;
}

async function clearBadge() {
  await chrome.action.setBadgeText({ text: "" });
  await chrome.action.setTitle({ title: "LCK Schedule" });
}

async function updateBadge(user) {
  const { notifyLive = false } = await chrome.storage.local.get("notifyLive");
  if (!notifyLive) {
    await clearBadge();
    return;
  }
  const stream = user?.stream;
  console.log("[LCK] caedrel live:", !!stream);
  if (!stream) {
    await clearBadge();
    return;
  }
  await chrome.action.setBadgeText({ text: "LIVE" });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_BG });
  if (chrome.action.setBadgeTextColor) {
    await chrome.action.setBadgeTextColor({ color: "#ffffff" });
  }
  const name = user.displayName || STREAMER_LOGIN;
  const game = stream.game?.name ? ` • ${stream.game.name}` : "";
  const title = stream.title ? ` — ${stream.title}` : "";
  await chrome.action.setTitle({
    title: `${name} LIVE${game}${title}`,
  });
}

async function ensureAlarm(periodInMinutes) {
  const existing = await chrome.alarms.get(POLL_ALARM);
  if (!existing || Math.abs((existing.periodInMinutes || 0) - periodInMinutes) > 0.01) {
    console.log("[LCK] alarm period →", periodInMinutes, "min");
    chrome.alarms.create(POLL_ALARM, { periodInMinutes });
  }
}

async function poll() {
  try {
    const user = await fetchStream();
    await chrome.storage.local.set({
      lastStream: user,
      lastFetched: Date.now(),
    });
    await updateBadge(user);
    await ensureAlarm(POLL_PERIOD_MIN);
  } catch (e) {
    console.error("[LCK] poll failed:", e.message);
  }
}

chrome.alarms.get(POLL_ALARM, (a) => {
  if (!a) {
    console.log("[LCK] creating alarm");
    chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_PERIOD_MIN });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[LCK] onInstalled");
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_PERIOD_MIN });
  poll();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[LCK] onStartup");
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_PERIOD_MIN });
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
