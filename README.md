# dsh-wage-pet

A desktop pet for DeepSeek Harness that counts today's earnings while you work. A brass coin with a face sits in the corner of the window and its number climbs every second; it squints and shows a `z` once you clock out.

## Install

```sh
dsh plugin --profile desktop add dsh-wage-pet
```

Then restart DSH. On the desktop client the pet appears in the bottom-right corner.

## What it does

- **Pay basis** — monthly, daily or hourly. Pick one, the other two are derived and shown in settings.
- **Work week** — five days, six days, alternating weeks (ISO week parity), or a custom number of days.
- **Live counter** — earnings accrue per second while the shift is running, pause over lunch, stop at clock-out, and read zero on a rest day.
- **Pet states** — the coin opens its eyes while you work, blinks faster when the counter is live, and narrows its eyes with a floating `z` when the day is over.
- **Drag and fold** — drag the coin anywhere and the position is remembered; click it to fold into a small capsule showing only the amount.
- **Settings** — amount, work week, shift start/end, lunch start and length. Edits stay in a draft until you press Save; Cancel discards them.

## Notes

- Colors come from the host theme tokens, so light and dark follow the app. Only the coin itself uses fixed brass colors.
- Night shifts that cross midnight are handled, as are breaks that split the shift in two.
- Settings are stored in `localStorage` under `dsh-wage-pet:cfg:v1`; the window position under `dsh-wage-pet:pos:v1`.
- Changing your pay re-derives the day's running total from the new rate, so the number answers "at this pay, how much have I earned so far".

## License

MIT
