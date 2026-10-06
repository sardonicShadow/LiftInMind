# LiftInMind

A weightlifting tracker built around one question: did I beat last time?

Pick exercises from a catalog, build workouts and multi-week plans, follow them on a weekly calendar, and log sets with last time's weight and reps shown next to every set. Each month gets a progressive overload report per exercise.

This is the web proof of concept. It is an [Expo](https://docs.expo.dev) (React Native) app, so the same code can later ship as iPhone and Android apps.

## Run it

```bash
npm install
npm run web        # dev server; open the printed URL, or the LAN URL on your phone
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm test` | Unit tests for progression, volume and report logic |
| `npm run typecheck` | TypeScript check |
| `npm run build:web` | Static site in `dist/`, ready for any static host |

To try it on a phone, use GitHub Pages: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. Every push to `main` then builds and deploys the app to https://sardonicshadow.github.io/LiftInMind/ (`.github/workflows/pages.yml`). Open the link in Safari or Chrome on your phone and use **Share → Add to Home Screen** for a full-screen app icon. `vercel.json` also works if you'd rather host on Vercel.

## What's in the proof of concept

- **Exercise catalog**: about 110 machine, free weight, cable and bodyweight exercises, with search ("lat pull", "db row"), equipment and muscle filters, and custom exercises.
- **Workouts**: sets, rep range, rest time and an optional per-exercise progression override.
- **Plans**: a weekly schedule over N weeks, optional deload week, and double (default) or linear progression.
- **Week calendar**: the plan's days, what's done, and each day's workout with last time's numbers. Tap any day, past or future, to log a workout for it. A workout's date can also be changed while logging it or from its summary, and "last time" and targets always come from sessions before that date.
- **Live logging**: a "Last time" strip, previous sets in every row, a progression target, warm-up sets (logged but never counted), a rest timer, and live exercise and session volume.
- **Session summary**: total volume vs the last time you did that workout, volume per exercise, and new bests.
- **Exercise history**: best set, estimated 1RM, and volume per session.
- **Monthly report**: a Progressed, Maintained or Regressed verdict per exercise, plus stalls that last two months.
- **Units**: lb by default, kg in settings.
- **Sample data**: "Load sample plan and history" fills in eight weeks of a Push Pull Legs + Upper plan so the calendar, history and reports have something to show.

Data is stored on the device (`AsyncStorage`, which is `localStorage` on the web). There is no account or sync yet.

## Not in the proof of concept yet

- A push notification when the monthly report is ready (the Week tab shows a banner instead)
- Moving or skipping a planned day on the calendar
- Drag-to-reorder in the workout builder (it uses up and down buttons)
- Sharing the report as an image or CSV
- Cloud sync and backup
- Offline loading of the app itself (logging works offline once the page has loaded)

## Layout

```
src/app/        screens (Expo Router: (tabs) for the four tabs, plus session, summary, workout, plan, exercise, report)
src/lib/        catalog, types, dates, units, store, sample data, and logic.ts (pure, unit tested)
src/ui/         theme, shared components, icons, exercise picker
```
