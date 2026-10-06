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
- **Live logging**: a "Last time" strip, previous sets in every row, each exercise's progressive overload goal with a live check or X as you log, warm-up sets (logged but never counted), a rest timer, and live exercise and session volume. A set counts as soon as it has reps, with no confirm tap; a blank weight uses the suggested one.
- **Typo checks**: numbers that look wrong turn red as you type: more than 30 reps, a weight far above last time (over 25%), more than anyone lifts on that equipment, or far more reps than last time suggests. Moving to another exercise or finishing asks you to fix them or confirm they're right.
- **Review before saving**: finishing opens a review of every set, with flagged numbers in red, each exercise's goal and its check or X. Nothing counts toward your history until you tap Save workout, and Edit jumps back to an exercise.
- **Workout report**: pops up when you finish a workout. After you save, each exercise gets a green check if you progressively overloaded it (more weight, more reps at the same weight, or an extra set) compared with the last time you did it with the same rep range, or a red X if you didn't, plus a goal for next time. After a check the goal keeps climbing (one more rep per set, or more weight once every set tops the rep range). After an X it's the smallest step that counts: one more rep on your weakest set. Skipped sets come first: the goal is to do them all. Every goal earns a check when you hit it exactly. Misses are shown in red at the top and on their cards. Deload weeks aren't judged and don't change goals, and the next workout's target is the same goal.
- **Session summary**: total volume vs the last time you did that workout, volume per exercise with its check or X, new bests, and the workout report again.
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
