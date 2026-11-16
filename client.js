window.__ModuleLoader__.load({
  id: 'dsh-wage-pet',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef } = React;

    const NS = 'dsh-wage-pet';

    /* ------------------------------------------------------------------ i18n */
    const zh = {
      'title': '今日进账',
      'pet.name': '工钱袋',
      'status.working': '工作中',
      'status.lunch': '午休中',
      'status.before': '还没上班',
      'status.after': '已下班',
      'status.rest': '今天休息',
      'perSecond': '每秒',
      'hourly': '时薪',
      'daily': '日薪',
      'target': '今日目标',
      'progress': '今日进度',
      'toEnd': '距离下班',
      'toStart': '距离上班',
      'toLunchEnd': '午休还剩',
      'settings': '设置',
      'back': '返回',
      'save': '保存',
      'saved': '已保存',
      'cancel': '取消',
      'unsaved': '未保存',
      'collapse': '收起',
      'expand': '展开',
      'cfg.mode': '计薪方式',
      'cfg.mode.month': '月薪',
      'cfg.mode.day': '日薪',
      'cfg.mode.hour': '时薪',
      'cfg.amount': '金额（元）',
      'cfg.schedule': '工作制',
      'cfg.schedule.double': '双休',
      'cfg.schedule.single': '单休',
      'cfg.schedule.alternate': '大小周',
      'cfg.schedule.custom': '自定义',
      'cfg.daysPerWeek': '每周工作天数',
      'cfg.start': '上班',
      'cfg.end': '下班',
      'cfg.lunchStart': '午休开始',
      'cfg.lunchMinutes': '午休分钟',
      'cfg.summary': '折算结果',
      'cfg.monthHours': '月工时',
      'cfg.reset': '恢复默认',
      'hint.drag': '拖动可移动，点一下收起',
    };

    const en = {
      'title': "Today's earnings",
      'pet.name': 'Pay purse',
      'status.working': 'On the clock',
      'status.lunch': 'Lunch break',
      'status.before': 'Not started',
      'status.after': 'Clock out',
      'status.rest': 'Day off',
      'perSecond': 'per second',
      'hourly': 'Hourly',
      'daily': 'Daily',
      'target': 'Daily target',
      'progress': 'Progress',
      'toEnd': 'Until clock-out',
      'toStart': 'Until clock-in',
      'toLunchEnd': 'Break left',
      'settings': 'Settings',
      'back': 'Back',
      'save': 'Save',
      'saved': 'Saved',
      'cancel': 'Cancel',
      'unsaved': 'Unsaved',
      'collapse': 'Collapse',
      'expand': 'Expand',
      'cfg.mode': 'Pay basis',
      'cfg.mode.month': 'Monthly',
      'cfg.mode.day': 'Daily',
      'cfg.mode.hour': 'Hourly',
      'cfg.amount': 'Amount (CNY)',
      'cfg.schedule': 'Work week',
      'cfg.schedule.double': 'Five days',
      'cfg.schedule.single': 'Six days',
      'cfg.schedule.alternate': 'Alternating',
      'cfg.schedule.custom': 'Custom',
      'cfg.daysPerWeek': 'Days per week',
      'cfg.start': 'Start',
      'cfg.end': 'End',
      'cfg.lunchStart': 'Lunch at',
      'cfg.lunchMinutes': 'Lunch min',
      'cfg.summary': 'Derived',
      'cfg.monthHours': 'Month hours',
      'cfg.reset': 'Reset',
      'hint.drag': 'Drag to move, tap to fold',
    };

    let t = (k) => k;
    const localeListeners = new Set();

    /* --------------------------------------------------------------- storage */
    const CFG_KEY = 'dsh-wage-pet:cfg:v1';
    const POS_KEY = 'dsh-wage-pet:pos:v1';

    const DEFAULTS = {
      mode: 'month',
      amount: 8000,
      schedule: 'double',
      daysPerWeek: 5,
      start: '09:00',
      end: '18:00',
      lunchStart: '12:00',
      lunchMinutes: 60,
    };

    function readJSON(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        const value = JSON.parse(raw);
        return value && typeof value === 'object' ? value : fallback;
      } catch {
        return fallback;
      }
    }

    function writeJSON(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage may be blocked; the pet still works for this page */
      }
    }

    function loadCfg() {
      const stored = readJSON(CFG_KEY, null);
      return Object.assign({}, DEFAULTS, stored || {});
    }

    /* ------------------------------------------------------------ calculation */
    const MIN = 60000;
    const DAY = 86400000;
    /** A gap longer than this is clock-out plus a later shift, not a break. */
    const GAP_MINUTES = 180;

    function toMinutes(value, fallback) {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
      if (!m) return fallback;
      const hh = Math.min(23, Math.max(0, Number(m[1])));
      const mm = Math.min(59, Math.max(0, Number(m[2])));
      return hh * 60 + mm;
    }

    function startOfDay(date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    function isoWeek(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dow = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - dow + 3);
      const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
      const fDow = (firstThursday.getUTCDay() + 6) % 7;
      firstThursday.setUTCDate(firstThursday.getUTCDate() - fDow + 3);
      return 1 + Math.round((d - firstThursday) / (7 * DAY));
    }

    function weeklyDays(cfg) {
      if (cfg.schedule === 'single') return 6;
      if (cfg.schedule === 'alternate') return 5.5;
      if (cfg.schedule === 'custom') return Math.min(7, Math.max(1, Number(cfg.daysPerWeek) || 5));
      return 5;
    }

    function isWorkday(date, cfg) {
      const idx = (date.getDay() + 6) % 7;
      if (cfg.schedule === 'single') return idx < 6;
      if (cfg.schedule === 'custom') return idx < weeklyDays(cfg);
      if (cfg.schedule === 'alternate') return idx < (isoWeek(date) % 2 === 1 ? 6 : 5);
      return idx < 5;
    }

    function shiftBounds(cfg) {
      const start = toMinutes(cfg.start, 9 * 60);
      let end = toMinutes(cfg.end, 18 * 60);
      if (end <= start) end += 1440;
      return { start, end };
    }

    function dailyHours(cfg) {
      const { start, end } = shiftBounds(cfg);
      const lunch = Math.max(0, Number(cfg.lunchMinutes) || 0);
      return Math.max(0.1, (end - start - lunch) / 60);
    }

    function rates(cfg) {
      const hours = dailyHours(cfg);
      const monthHours = (weeklyDays(cfg) * hours * 52) / 12;
      const amount = Math.max(0, Number(cfg.amount) || 0);
      let hourly = amount;
      if (cfg.mode === 'month') hourly = monthHours > 0 ? amount / monthHours : 0;
      else if (cfg.mode === 'day') hourly = hours > 0 ? amount / hours : 0;
      return {
        hourly,
        daily: hourly * hours,
        perSecond: hourly / 3600,
        monthHours,
        dailyHours: hours,
      };
    }

    /** Work windows for one calendar day, in ms timestamps. */
    function segmentsOf(dayStart, cfg) {
      const { start, end } = shiftBounds(cfg);
      const lunch = Math.max(0, Number(cfg.lunchMinutes) || 0);
      const base = dayStart.getTime();
      const spans = [];

      if (lunch > 0) {
        let lunchStart = toMinutes(cfg.lunchStart, 12 * 60);
        if (lunchStart < start) lunchStart += 1440;
        const from = Math.max(start, Math.min(lunchStart, end));
        const to = Math.max(start, Math.min(lunchStart + lunch, end));
        if (from > start) spans.push([start, from]);
        if (end > to) spans.push([to, end]);
        if (spans.length === 0) spans.push([start, end]);
      } else {
        spans.push([start, end]);
      }

      return spans.map(([a, b]) => [base + a * MIN, base + b * MIN]);
    }

    /**
     * Every work span overlapping the calendar day, yesterday's carry included.
     * `from`/`to` are clipped to the day for accumulation; `realTo` keeps the true
     * shift end so a night shift counts down to 06:00 instead of to midnight.
     */
    function spansInWindow(today, cfg) {
      const dayStart = today.getTime();
      const dayEnd = dayStart + DAY;
      const yesterday = new Date(dayStart - DAY);
      const raw = [];
      if (isWorkday(yesterday, cfg)) raw.push(...segmentsOf(yesterday, cfg));
      if (isWorkday(today, cfg)) raw.push(...segmentsOf(today, cfg));

      const spans = [];
      for (const [rawFrom, rawTo] of raw) {
        const from = Math.max(rawFrom, dayStart);
        const to = Math.min(rawTo, dayEnd);
        if (to > from) spans.push({ from, to, realTo: rawTo });
      }
      return spans;
    }

    /** Spans joined by a short gap form one shift; a shift keeps its own work spans. */
    function groupShifts(spans) {
      const groups = [];
      for (const span of spans) {
        const last = groups[groups.length - 1];
        if (last && (span.from - last.to) / MIN <= GAP_MINUTES) {
          last.spans.push(span);
          last.to = span.to;
          last.realTo = Math.max(last.realTo, span.realTo);
        } else {
          groups.push({
            from: span.from,
            to: span.to,
            realTo: span.realTo,
            spans: [span],
          });
        }
      }
      return groups;
    }

    function snapshot(now, cfg) {
      const today = startOfDay(now);
      const rate = rates(cfg);
      const spans = spansInWindow(today, cfg);
      const groups = groupShifts(spans);
      const workday = spans.length > 0;

      let seconds = 0;
      let targetSeconds = 0;
      for (const span of spans) {
        targetSeconds += (span.to - span.from) / 1000;
        const reached = Math.min(span.to, now);
        if (reached > span.from) seconds += (reached - span.from) / 1000;
      }

      const earned = seconds * rate.perSecond;
      const target = targetSeconds * rate.perSecond;

      let state = 'rest';
      let countdown = 0;
      const current = groups.find((group) => now >= group.from && now < group.to);
      const upcoming = groups.filter((group) => group.from > now);

      if (current) {
        const active = current.spans.find((span) => now >= span.from && now < span.to);
        if (active) {
          state = 'working';
          countdown = (current.realTo - now) / 1000;
        } else {
          // Inside the shift but between two work spans: the configured break.
          state = 'lunch';
          const next = current.spans.find((span) => span.from > now);
          countdown = next ? (next.from - now) / 1000 : 0;
        }
      } else if (upcoming.length > 0) {
        const previous = groups.filter((group) => group.to <= now).pop();
        if (previous && now - previous.to < upcoming[0].from - now) {
          state = 'after';
        } else {
          state = 'before';
          countdown = (upcoming[0].from - now) / 1000;
        }
      } else if (groups.length > 0) {
        state = 'after';
      }

      return {
        earned,
        target,
        seconds,
        targetSeconds,
        rate,
        state,
        countdown,
        workday,
        ratio: target > 0 ? Math.min(1, earned / target) : 0,
      };
    }

    function money(value) {
      const parts = Math.max(0, value).toFixed(4).split('.');
      return { yuan: parts[0], jiao: parts[1].slice(0, 2), li: parts[1].slice(2) };
    }

    /** Draft keeps every field as the string the input holds, so partial typing is not lost. */
    function toDraft(cfg) {
      return {
        mode: cfg.mode,
        amount: String(cfg.amount),
        schedule: cfg.schedule,
        daysPerWeek: String(cfg.daysPerWeek),
        start: cfg.start,
        end: cfg.end,
        lunchStart: cfg.lunchStart,
        lunchMinutes: String(cfg.lunchMinutes),
      };
    }

    /** Coerce the draft back into a saved config; empty or invalid numbers fall back to the default. */
    function fromDraft(draft) {
      const num = (raw, fallback, min, max) => {
        const text = String(raw).trim();
        if (text === '') return fallback;
        const value = Number(text);
        if (!Number.isFinite(value)) return fallback;
        return Math.min(max, Math.max(min, value));
      };
      const clockOf = (raw, fallback) => {
        const match = /^(\d{1,2}):(\d{2})$/.exec(String(raw).trim());
        if (!match) return fallback;
        const hh = Number(match[1]);
        const mm = Number(match[2]);
        if (hh > 23 || mm > 59) return fallback;
        return `${String(hh).padStart(2, '0')}:${match[2]}`;
      };
      return {
        mode: draft.mode,
        amount: num(draft.amount, DEFAULTS.amount, 0, 100000000),
        schedule: draft.schedule,
        daysPerWeek: Math.round(num(draft.daysPerWeek, DEFAULTS.daysPerWeek, 1, 7)),
        start: clockOf(draft.start, DEFAULTS.start),
        end: clockOf(draft.end, DEFAULTS.end),
        lunchStart: clockOf(draft.lunchStart, DEFAULTS.lunchStart),
        lunchMinutes: Math.round(num(draft.lunchMinutes, DEFAULTS.lunchMinutes, 0, 720)),
      };
    }

    function clock(seconds) {
      const s = Math.max(0, Math.floor(seconds));
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    }

    /* ----------------------------------------------------------------- styles */
    const CSS = `
.wp-root{position:fixed;z-index:1000;pointer-events:auto;font-family:inherit;
  color:var(--dsw-alias-label-primary,#e8e8ea);}
.wp-card{width:266px;box-sizing:border-box;padding:13px 14px 14px;display:flex;flex-direction:column;gap:11px;
  background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1,#1b1f27));
  border:1px solid var(--dsw-alias-border-l1,rgba(130,130,140,.26));border-radius:16px;
  box-shadow:0 14px 34px -14px rgba(0,0,0,.55),0 2px 8px -4px rgba(0,0,0,.35);}
.wp-head{display:flex;align-items:center;gap:9px;min-width:0;}
.wp-headText{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;}
.wp-title{font-size:12px;line-height:1.25;color:var(--dsw-alias-label-secondary,#a0a0a8);letter-spacing:.02em;}
.wp-status{font-size:12.5px;line-height:1.3;font-weight:600;overflow-wrap:anywhere;}
.wp-status.isWorking{color:var(--dsw-alias-state-success-primary,#4caf7d);}
.wp-status.isIdle{color:var(--dsw-alias-label-secondary,#a0a0a8);}
.wp-iconBtn{flex:none;width:26px;height:26px;display:grid;place-items:center;padding:0;border:0;border-radius:8px;
  background:transparent;color:var(--dsw-alias-label-secondary,#a0a0a8);cursor:pointer;font-size:13px;line-height:1;}
.wp-iconBtn:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.07));color:var(--dsw-alias-label-primary,#e8e8ea);}
.wp-iconBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#6a9cf0);outline-offset:1px;}

.wp-coin{position:relative;flex:none;width:38px;height:38px;border-radius:50%;cursor:grab;touch-action:none;
  background:radial-gradient(circle at 34% 24%,#f6d489,#c8912f 56%,#7f5516);
  box-shadow:inset 0 -2px 4px rgba(60,34,0,.5),inset 0 2px 3px rgba(255,232,180,.45),0 2px 6px -2px rgba(0,0,0,.5);}
.wp-coin:active{cursor:grabbing;}
.wp-coin:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#6a9cf0);outline-offset:2px;}
.wp-hole{position:absolute;left:50%;top:22px;width:11px;height:11px;transform:translateX(-50%);
  background:#171a20;border-radius:1.5px;
  box-shadow:inset 0 1px 2px rgba(0,0,0,.85),0 1px 0 rgba(255,226,160,.4);}
.wp-eye{position:absolute;top:8px;width:3.5px;height:5.5px;border-radius:2px;background:#3b2708;
  transform-origin:center;animation:wp-blink 4.6s infinite;}
.wp-eye.l{left:11px;}
.wp-eye.r{right:11px;animation-delay:.12s;}
.wp-coin.isAsleep .wp-eye{height:2px;border-radius:1px;animation:none;top:10px;}
.wp-coin.isAwake .wp-eye{animation-duration:3.4s;}
.wp-zzz{position:absolute;right:-4px;top:-10px;font-size:9px;color:var(--dsw-alias-label-secondary,#a0a0a8);
  animation:wp-float 2.8s ease-in-out infinite;}
@keyframes wp-blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.12)}}
@keyframes wp-float{0%,100%{transform:translateY(0);opacity:.55}50%{transform:translateY(-3px);opacity:.95}}

.wp-money{display:flex;align-items:baseline;gap:1px;font-variant-numeric:tabular-nums;
  font-feature-settings:"tnum" 1;letter-spacing:-.015em;line-height:1;}
.wp-cur{font-size:15px;color:var(--dsw-alias-label-secondary,#a0a0a8);margin-right:2px;align-self:flex-start;padding-top:4px;}
.wp-int{font-size:30px;font-weight:650;}
.wp-dot{font-size:24px;font-weight:600;color:var(--dsw-alias-label-secondary,#a0a0a8);}
.wp-jiao{font-size:19px;font-weight:600;color:var(--dsw-alias-label-secondary,#c8c8d0);}
.wp-li{font-size:12px;color:var(--dsw-alias-label-secondary,#a0a0a8);opacity:.72;margin-left:1px;}
.wp-sub{display:flex;gap:10px;font-size:11px;color:var(--dsw-alias-label-secondary,#a0a0a8);
  font-variant-numeric:tabular-nums;overflow-wrap:anywhere;}
.wp-sub b{font-weight:600;color:var(--dsw-alias-label-primary,#e8e8ea);}

.wp-bar{position:relative;height:4px;border-radius:2px;overflow:hidden;
  background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.09));}
.wp-barFill{position:absolute;inset:0 auto 0 0;border-radius:2px;
  background:linear-gradient(90deg,#c8912f,#e8b84b);transition:width .25s linear;}
.wp-barHead{display:flex;justify-content:space-between;font-size:11px;
  color:var(--dsw-alias-label-secondary,#a0a0a8);font-variant-numeric:tabular-nums;margin-bottom:5px;}

.wp-form{display:flex;flex-direction:column;gap:7px;}
.wp-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;}
.wp-rowLabel{font-size:11.5px;color:var(--dsw-alias-label-secondary,#a0a0a8);flex:none;white-space:nowrap;}
.wp-field{width:104px;min-width:0;box-sizing:border-box;height:25px;padding:0 6px;font:inherit;font-size:12px;
  color:var(--dsw-alias-label-primary,#e8e8ea);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));
  border:1px solid var(--dsw-alias-border-l1,rgba(130,130,140,.26));border-radius:7px;
  font-variant-numeric:tabular-nums;}
.wp-field:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#6a9cf0);}
.wp-field.wp-narrow{width:58px;}
.wp-summary{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:11px;
  color:var(--dsw-alias-label-secondary,#a0a0a8);font-variant-numeric:tabular-nums;
  border-top:1px solid var(--dsw-alias-border-l1,rgba(130,130,140,.2));padding-top:8px;}
.wp-summary span:nth-child(even){text-align:right;color:var(--dsw-alias-label-primary,#e8e8ea);}
.wp-actions{display:flex;gap:8px;}
.wp-btn{flex:1;height:28px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1,rgba(130,130,140,.26));
  background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));color:var(--dsw-alias-label-primary,#e8e8ea);
  font:inherit;font-size:12px;cursor:pointer;}
.wp-btn:hover{background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.1));}
.wp-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#6a9cf0);outline-offset:1px;}
.wp-btn:disabled{cursor:default;opacity:.55;}
.wp-btn:disabled:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));}
.wp-btnPrimary{border-color:transparent;background:var(--dsw-alias-brand-primary,#6a9cf0);color:#fff;font-weight:600;}
.wp-btnPrimary:hover{background:var(--dsw-alias-brand-primary,#6a9cf0);filter:brightness(1.08);}
.wp-btnPrimary:disabled{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));
  color:var(--dsw-alias-label-secondary,#a0a0a8);opacity:1;filter:none;}
.wp-btnGhost{height:24px;font-size:11.5px;background:transparent;border-style:dashed;
  color:var(--dsw-alias-label-secondary,#a0a0a8);}
.wp-btnGhost:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));
  color:var(--dsw-alias-label-primary,#e8e8ea);}
.wp-hint{font-size:10.5px;color:var(--dsw-alias-label-secondary,#a0a0a8);opacity:.8;}

.wp-mini{display:flex;align-items:center;gap:9px;padding:7px 14px 7px 7px;border-radius:999px;
  background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1,#1b1f27));
  border:1px solid var(--dsw-alias-border-l1,rgba(130,130,140,.26));
  box-shadow:0 8px 22px -12px rgba(0,0,0,.55);cursor:grab;touch-action:none;}
.wp-mini:active{cursor:grabbing;}
.wp-mini:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#6a9cf0);outline-offset:2px;}
.wp-miniText{font-size:13.5px;font-variant-numeric:tabular-nums;font-weight:600;letter-spacing:-.01em;}
.wp-mini .wp-coin{pointer-events:none;}

@media (prefers-reduced-motion:reduce){
  .wp-eye,.wp-zzz{animation:none;}
  .wp-barFill{transition:none;}
}
`;

    /* -------------------------------------------------------------- components */
    function useLocaleRefresh() {
      const [, bump] = useState(0);
      useEffect(() => {
        const fn = () => bump((v) => v + 1);
        localeListeners.add(fn);
        return () => {
          localeListeners.delete(fn);
        };
      }, []);
    }

    function Coin(props) {
      const state = props.state;
      const asleep = state === 'rest' || state === 'after';
      const awake = state === 'working';
      const cls =
        'wp-coin' + (asleep ? ' isAsleep' : '') + (awake ? ' isAwake' : '');
      return h(
        'div',
        {
          className: cls,
          role: 'button',
          tabIndex: 0,
          'aria-label': t('pet.name'),
          onPointerDown: props.onPointerDown,
          onPointerMove: props.onPointerMove,
          onPointerUp: props.onPointerUp,
          onPointerCancel: props.onPointerUp,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              props.onActivate();
            }
          },
          onClick: props.onClick,
        },
        h('span', { className: 'wp-eye l' }),
        h('span', { className: 'wp-eye r' }),
        h('span', { className: 'wp-hole' }),
        asleep ? h('span', { className: 'wp-zzz' }, 'z') : null,
      );
    }

    function Money(props) {
      const parts = money(props.value);
      return h(
        'div',
        { className: 'wp-money', 'aria-label': `¥${parts.yuan}.${parts.jiao}${parts.li}` },
        h('span', { className: 'wp-cur' }, '¥'),
        h('span', { className: 'wp-int' }, parts.yuan),
        h('span', { className: 'wp-dot' }, '.'),
        h('span', { className: 'wp-jiao' }, parts.jiao),
        h('span', { className: 'wp-li' }, parts.li),
      );
    }

    function Settings(props) {
      const [draft, setDraft] = useState(() => toDraft(props.cfg));
      const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(props.cfg));
      const preview = rates(fromDraft(draft));
      const patch = (key, value) => setDraft((current) => Object.assign({}, current, { [key]: value }));

      const num = (key, extra) =>
        h('input', {
          className: 'wp-field' + (extra ? ' ' + extra : ''),
          type: 'number',
          inputMode: 'decimal',
          value: draft[key],
          onChange: (event) => patch(key, event.target.value),
        });
      const time = (key) =>
        h('input', {
          className: 'wp-field',
          type: 'time',
          value: draft[key],
          onChange: (event) => patch(key, event.target.value),
        });
      const pick = (key, options) =>
        h(
          'select',
          {
            className: 'wp-field',
            value: draft[key],
            onChange: (event) => patch(key, event.target.value),
          },
          options.map(([value, label]) => h('option', { key: value, value }, t(label))),
        );

      return h(
        'div',
        { className: 'wp-form' },
        h('div', { className: 'wp-row' },
          h('span', { className: 'wp-rowLabel' }, t('cfg.mode')),
          pick('mode', [['month', 'cfg.mode.month'], ['day', 'cfg.mode.day'], ['hour', 'cfg.mode.hour']]),
        ),
        h('div', { className: 'wp-row' },
          h('span', { className: 'wp-rowLabel' }, t('cfg.amount')),
          num('amount'),
        ),
        h('div', { className: 'wp-row' },
          h('span', { className: 'wp-rowLabel' }, t('cfg.schedule')),
          pick('schedule', [
            ['double', 'cfg.schedule.double'],
            ['single', 'cfg.schedule.single'],
            ['alternate', 'cfg.schedule.alternate'],
            ['custom', 'cfg.schedule.custom'],
          ]),
        ),
        draft.schedule === 'custom'
          ? h('div', { className: 'wp-row' },
              h('span', { className: 'wp-rowLabel' }, t('cfg.daysPerWeek')),
              num('daysPerWeek', 'wp-narrow'),
            )
          : null,
        h('div', { className: 'wp-row' },
          h('span', { className: 'wp-rowLabel' }, t('cfg.start')),
          time('start'),
        ),
        h('div', { className: 'wp-row' },
          h('span', { className: 'wp-rowLabel' }, t('cfg.end')),
          time('end'),
        ),
        h('div', { className: 'wp-row' },
          h('span', { className: 'wp-rowLabel' }, t('cfg.lunchStart')),
          time('lunchStart'),
        ),
        h('div', { className: 'wp-row' },
          h('span', { className: 'wp-rowLabel' }, t('cfg.lunchMinutes')),
          num('lunchMinutes', 'wp-narrow'),
        ),
        h('div', { className: 'wp-summary' },
          h('span', null, t('hourly')), h('span', null, `¥${preview.hourly.toFixed(2)}`),
          h('span', null, t('daily')), h('span', null, `¥${preview.daily.toFixed(2)}`),
          h('span', null, t('perSecond')), h('span', null, `¥${preview.perSecond.toFixed(4)}`),
          h('span', null, t('cfg.monthHours')), h('span', null, `${preview.monthHours.toFixed(1)} h`),
        ),
        h('button', {
          type: 'button',
          className: 'wp-btn wp-btnGhost',
          onClick: () => setDraft(toDraft(DEFAULTS)),
        }, t('cfg.reset')),
        h('div', { className: 'wp-actions' },
          h('button', {
            type: 'button',
            className: 'wp-btn',
            onClick: props.onCancel,
          }, t('cancel')),
          h('button', {
            type: 'button',
            className: 'wp-btn wp-btnPrimary',
            disabled: !dirty,
            onClick: () => props.onSave(fromDraft(draft)),
          }, dirty ? t('save') : t('saved')),
        ),
      );
    }

    function Pet() {
      useLocaleRefresh();

      const styleEl = React.useMemo(
        () => h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        [],
      );

      const [cfg, setCfg] = useState(loadCfg);
      const [pos, setPos] = useState(() => readJSON(POS_KEY, null));
      const [folded, setFolded] = useState(false);
      const [view, setView] = useState('main');
      const [now, setNow] = useState(() => Date.now());

      const rootRef = useRef(null);
      const posRef = useRef(pos);
      const dragRef = useRef(null);
      const skipClickRef = useRef(false);

      useEffect(() => {
        writeJSON(CFG_KEY, cfg);
      }, [cfg]);

      useEffect(() => {
        let frame = 0;
        let last = 0;
        const loop = (time) => {
          if (time - last >= 100) {
            last = time;
            setNow(Date.now());
          }
          frame = window.requestAnimationFrame(loop);
        };
        frame = window.requestAnimationFrame(loop);
        return () => window.cancelAnimationFrame(frame);
      }, []);

      const moveTo = (next) => {
        posRef.current = next;
        setPos(next);
      };

      const onPointerDown = (event) => {
        if (event.button !== 0) return;
        const el = rootRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        dragRef.current = {
          id: event.pointerId,
          dx: event.clientX - rect.left,
          dy: event.clientY - rect.top,
          sx: event.clientX,
          sy: event.clientY,
          w: rect.width,
          h: rect.height,
          moved: false,
        };
        skipClickRef.current = false;
        if (event.currentTarget.setPointerCapture) {
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* capture is optional */
          }
        }
      };

      const onPointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.id !== event.pointerId) return;
        if (!drag.moved) {
          if (Math.hypot(event.clientX - drag.sx, event.clientY - drag.sy) < 4) return;
          drag.moved = true;
          skipClickRef.current = true;
        }
        const maxX = Math.max(0, window.innerWidth - drag.w - 8);
        const maxY = Math.max(0, window.innerHeight - drag.h - 8);
        moveTo({
          x: Math.min(maxX, Math.max(8, event.clientX - drag.dx)),
          y: Math.min(maxY, Math.max(8, event.clientY - drag.dy)),
        });
      };

      const onPointerUp = () => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag && drag.moved) writeJSON(POS_KEY, posRef.current);
      };

      const onActivate = () => {
        if (skipClickRef.current) {
          skipClickRef.current = false;
          return;
        }
        setFolded((value) => !value);
        setView('main');
      };

      const snap = snapshot(now, cfg);
      const stateLabel =
        snap.state === 'working' ? 'status.working'
        : snap.state === 'lunch' ? 'status.lunch'
        : snap.state === 'before' ? 'status.before'
        : snap.state === 'after' ? 'status.after'
        : 'status.rest';
      const countdownLabel =
        snap.state === 'before'
          ? t('toStart')
          : snap.state === 'lunch'
            ? t('toLunchEnd')
            : t('toEnd');

      const style = pos
        ? { left: `${pos.x}px`, top: `${pos.y}px` }
        : { right: '26px', bottom: '120px' };

      const coin = h(Coin, {
        state: snap.state,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onClick: onActivate,
        onActivate,
      });

      const body = folded
        ? h(
            'div',
            {
              className: 'wp-mini',
              role: 'button',
              tabIndex: 0,
              'aria-label': `${t('title')} ¥${snap.earned.toFixed(2)}`,
              onPointerDown,
              onPointerMove,
              onPointerUp,
              onPointerCancel: onPointerUp,
              onClick: onActivate,
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onActivate();
                }
              },
            },
            coin,
            h('span', { className: 'wp-miniText' }, `¥${snap.earned.toFixed(2)}`),
          )
        : h(
            'div',
            { className: 'wp-card' },
            h(
              'div',
              { className: 'wp-head' },
              coin,
              h(
                'div',
                { className: 'wp-headText' },
                h('span', { className: 'wp-title' }, t('title')),
                h(
                  'span',
                  {
                    className:
                      'wp-status ' + (snap.state === 'working' ? 'isWorking' : 'isIdle'),
                  },
                  t(stateLabel),
                ),
              ),
              view === 'main'
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'wp-iconBtn',
                      title: t('settings'),
                      'aria-label': t('settings'),
                      onClick: () => setView('settings'),
                    },
                    '⚙',
                  )
                : null,
            ),
            view === 'settings'
              ? h(Settings, {
                  cfg,
                  onSave: (next) => {
                    setCfg(next);
                    setView('main');
                  },
                  onCancel: () => setView('main'),
                })
              : h(
                  React.Fragment,
                  null,
                  h(Money, { value: snap.earned }),
                  h(
                    'div',
                    { className: 'wp-sub' },
                    h('span', null, t('perSecond'), ' ', h('b', null, `+${snap.rate.perSecond.toFixed(4)}`)),
                    h('span', null, t('hourly'), ' ', h('b', null, `¥${snap.rate.hourly.toFixed(2)}`)),
                  ),
                  h(
                    'div',
                    null,
                    h(
                      'div',
                      { className: 'wp-barHead' },
                      h('span', null, t('progress')),
                      h('span', null, `${(snap.ratio * 100).toFixed(1)}%`),
                    ),
                    h(
                      'div',
                      {
                        className: 'wp-bar',
                        role: 'progressbar',
                        'aria-valuemin': 0,
                        'aria-valuemax': 100,
                        'aria-valuenow': Math.round(snap.ratio * 100),
                      },
                      h('div', {
                        className: 'wp-barFill',
                        style: { width: `${Math.max(0, snap.ratio * 100).toFixed(2)}%` },
                      }),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'wp-sub' },
                    h('span', null, t('target'), ' ', h('b', null, `¥${snap.target.toFixed(2)}`)),
                    snap.state === 'working' || snap.state === 'before' || snap.state === 'lunch'
                      ? h('span', null, countdownLabel, ' ', h('b', null, clock(snap.countdown)))
                      : null,
                  ),
                  h('div', { className: 'wp-hint' }, t('hint.drag')),
                ),
          );

      const root = h(
        'div',
        { className: 'wp-root', style, ref: rootRef },
        styleEl,
        body,
      );

      try {
        const rd = require('react-dom');
        if (rd && typeof rd.createPortal === 'function' && document.body) {
          return rd.createPortal(root, document.body);
        }
      } catch {
        /* fall back to the overlay's own flow */
      }
      return root;
    }

    /* ------------------------------------------------------------------ apply */
    function apply(ctx) {
      ctx.effect(() => {
        const disposers = [];
        if (ctx.locale && typeof ctx.locale.register === 'function') {
          disposers.push(ctx.locale.register(NS, { zh, en }));
          t = ctx.locale.bind(NS);
        }
        const off =
          ctx.locale && typeof ctx.locale.subscribe === 'function'
            ? ctx.locale.subscribe(() => localeListeners.forEach((fn) => fn()))
            : () => {};
        return () => {
          off();
          for (const dispose of disposers) dispose();
          t = (key) => key;
        };
      }, 'dsh-wage-pet: dictionaries');

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          { name: 'shell.overlay', id: 'dsh-wage-pet', order: 30 },
          Pet,
        ),
      );
    }

    return { name: 'dsh-wage-pet', inject: ['slots', 'locale'], apply };
  },
});
