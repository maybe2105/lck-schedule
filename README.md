# lck-schedule

Chrome extension popup widget for LCK (League of Legends Champions Korea) match schedules. Day-grouped upcoming matches plus a toolbar LIVE badge for Twitch streamer [caedrel](https://www.twitch.tv/caedrel).

## Features

- Toolbar popup with live / later today / tomorrow / week sections
- Team logos, codes, Bo3/Bo5 format, week label, completed match scores
- Toolbar LIVE badge when caedrel is streaming on Twitch (optional, toggle in settings)
- `caedrel` button in popup → opens twitch.tv/caedrel
- Live LCK match cards are clickable → opens twitch.tv/caedrel
- Background service worker polls Twitch GQL every 2min while badge enabled
- Times shown in user's local timezone

## Install (unpacked)

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked** → select this folder
4. Pin the extension to the toolbar
5. Click icon → ⚙ → toggle **Notice caedrel live** to enable the badge

## Files

```
manifest.json    Manifest v3
popup.html       Popup UI (380px)
popup.js         Fetch + render LCK schedule
background.js    Service worker, alarms + Twitch live polling
icons/           16/32/48/128 PNG
```

## Data sources

- LCK schedule: `https://esports-api.lolesports.com/persisted/gw/getSchedule` with the public `x-api-key` header used by lolesports.com.
- Twitch live status: `https://gql.twitch.tv/gql` with the public web `Client-ID` used by twitch.tv.
