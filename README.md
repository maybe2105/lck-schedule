# lck-schedule

Chrome extension popup widget for LCK (League of Legends Champions Korea) match schedules. Live status, day-grouped upcoming matches, and desktop notifications 15min before each match.

## Features

- Toolbar popup with today / tomorrow / week sections
- Live match badge with pulse animation
- Team logos, codes, Bo3/Bo5 format, week label
- Background service worker polls lolesports API every 5min
- Desktop notification 15min before each upcoming match
- Click notification → opens lolesports schedule page
- Times shown in user's local timezone

## Install (unpacked)

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked** → select this folder
4. Pin the extension to the toolbar
5. Click icon → click 🔔 to enable notifications

## Files

```
manifest.json    Manifest v3
popup.html       Popup UI (380px)
popup.js         Fetch + render schedule
background.js    Service worker, alarms + notifications
icons/           16/32/48/128 PNG
```

## Data source

`https://esports-api.lolesports.com/persisted/gw/getSchedule` with the public `x-api-key` header used by lolesports.com.
