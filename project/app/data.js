// data.js — seed data, schedule engine, formatters for Claude Routines
(function () {
  'use strict';

  // ── tiny seeded rng ────────────────────────────────────────
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const uid = () => Math.random().toString(36).slice(2, 10);

  const MODELS = [
    { id: 'sonnet', label: 'Sonnet', desc: 'Fast, balanced — good default' },
    { id: 'opus', label: 'Opus', desc: 'Most capable, slower' },
    { id: 'haiku', label: 'Haiku', desc: 'Cheapest, light tasks' },
  ];

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // ── schedule model ─────────────────────────────────────────
  // { freq:'daily'|'weekdays'|'weekly'|'hourly', time:'HH:MM', days:[0-6], everyHours:n }

  function fmtClock(time) {
    const [h, m] = time.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hh} ${ap}` : `${hh}:${String(m).padStart(2, '0')} ${ap}`;
  }

  function describeSchedule(s) {
    if (s.freq === 'hourly') return s.everyHours === 1 ? 'Every hour' : `Every ${s.everyHours} hours`;
    if (s.freq === 'daily') return `Every day at ${fmtClock(s.time)}`;
    if (s.freq === 'weekdays') return `Weekdays at ${fmtClock(s.time)}`;
    if (s.freq === 'weekly') {
      const days = (s.days || []).slice().sort().map((d) => DAY_NAMES[d]).join(', ');
      return `${days} at ${fmtClock(s.time)}`;
    }
    return 'Custom';
  }

  function scheduleTimesForDay(s, date) {
    const dow = date.getDay();
    if (s.freq === 'hourly') {
      const out = [];
      for (let h = 0; h < 24; h += s.everyHours || 6) out.push(`${String(h).padStart(2, '0')}:00`);
      return out;
    }
    if (s.freq === 'daily') return [s.time];
    if (s.freq === 'weekdays') return dow >= 1 && dow <= 5 ? [s.time] : [];
    if (s.freq === 'weekly') return (s.days || []).includes(dow) ? [s.time] : [];
    return [];
  }

  function computeNextRun(s, from) {
    const now = from || new Date();
    for (let i = 0; i < 14; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const times = scheduleTimesForDay(s, day);
      for (const t of times) {
        const [h, m] = t.split(':').map(Number);
        const cand = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
        if (cand > now) return cand;
      }
    }
    return null;
  }

  // ── natural language parsing ───────────────────────────────
  const DAY_MAP = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
    sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };

  function parseNL(str) {
    const t = (str || '').toLowerCase().trim();
    if (!t) return null;
    let time = '09:00';
    const tm = t.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (tm) {
      let h = parseInt(tm[1], 10);
      const m = tm[2] ? parseInt(tm[2], 10) : 0;
      if (tm[3] === 'pm' && h < 12) h += 12;
      if (tm[3] === 'am' && h === 12) h = 0;
      if (h > 23 || m > 59) return null;
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    const hr = t.match(/every\s+(\d+)\s+hours?/);
    if (hr) return { freq: 'hourly', everyHours: Math.max(1, Math.min(12, parseInt(hr[1], 10))), time: '00:00', days: [] };
    if (/every\s+hour|hourly/.test(t)) return { freq: 'hourly', everyHours: 1, time: '00:00', days: [] };
    const days = [];
    for (const [name, idx] of Object.entries(DAY_MAP)) {
      if (new RegExp(`\\b${name}s?\\b`).test(t) && !days.includes(idx)) days.push(idx);
    }
    if (days.length) return { freq: 'weekly', days: days.sort(), time, days_: undefined, everyHours: 0 };
    if (/weekday/.test(t)) return { freq: 'weekdays', time, days: [], everyHours: 0 };
    if (/every\s+day|daily|each\s+day|every\s+morning|every\s+night|every\s+evening/.test(t)) {
      let tt = time;
      if (!tm && /morning/.test(t)) tt = '09:00';
      if (!tm && /night|evening/.test(t)) tt = '21:00';
      return { freq: 'daily', time: tt, days: [], everyHours: 0 };
    }
    if (tm) return { freq: 'daily', time, days: [], everyHours: 0 };
    return null;
  }

  function scheduleToNL(s) {
    if (s.freq === 'hourly') return s.everyHours === 1 ? 'every hour' : `every ${s.everyHours} hours`;
    if (s.freq === 'daily') return `every day at ${fmtClock(s.time).toLowerCase()}`;
    if (s.freq === 'weekdays') return `every weekday at ${fmtClock(s.time).toLowerCase()}`;
    if (s.freq === 'weekly') {
      const names = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      return `every ${(s.days || []).map((d) => names[d]).join(' and ')} at ${fmtClock(s.time).toLowerCase()}`;
    }
    return '';
  }

  // ── seed routines ──────────────────────────────────────────
  const seedRoutines = [
    {
      id: 'rt-triage', name: 'Morning issue triage', model: 'sonnet', enabled: true,
      dir: '~/work/ledger-live',
      schedule: { freq: 'weekdays', time: '09:00', days: [], everyHours: 0 },
      prompt: 'Review all GitHub issues opened in the last 24 hours. Label each one (bug, feature, question), flag anything that looks like a regression in the latest release, and write a one-line summary per issue in triage-notes.md.',
    },
    {
      id: 'rt-deps', name: 'Nightly dependency audit', model: 'sonnet', enabled: true,
      dir: '~/work/ledger-live',
      schedule: { freq: 'daily', time: '02:00', days: [], everyHours: 0 },
      prompt: 'Run npm audit and check for outdated dependencies. For patch and minor updates with passing tests, open a single PR with the bumps. Flag any major updates or advisories that need a human decision.',
    },
    {
      id: 'rt-changelog', name: 'Changelog draft', model: 'opus', enabled: true,
      dir: '~/work/ledger-live',
      schedule: { freq: 'weekly', time: '16:00', days: [5], everyHours: 0 },
      prompt: 'Read every commit merged to main since the last changelog entry. Draft a user-facing changelog grouped by Added / Changed / Fixed, written in plain language, and save it to CHANGELOG-draft.md.',
    },
    {
      id: 'rt-flaky', name: 'Flaky test hunter', model: 'haiku', enabled: true,
      dir: '~/work/ledger-live-mobile',
      schedule: { freq: 'hourly', everyHours: 6, time: '00:00', days: [] },
      prompt: 'Pull the latest CI results. Identify tests that failed and then passed on retry. Keep a running tally in flaky-tests.json and open an issue for any test that flaked 3+ times this week.',
    },
    {
      id: 'rt-docs', name: 'Docs link checker', model: 'haiku', enabled: false,
      dir: '~/work/developer-portal',
      schedule: { freq: 'weekly', time: '07:00', days: [1], everyHours: 0 },
      prompt: 'Crawl all markdown files in /docs and verify every external link resolves. Replace moved pages with their new URLs where redirects make the target obvious; list dead links in a report.',
    },
  ];

  // ── run generation ─────────────────────────────────────────
  const RUN_TEMPLATES = {
    'rt-triage': {
      summaries: [
        '14 new issues triaged — 3 bugs, 9 questions, 2 feature requests. One possible regression flagged.',
        '8 new issues triaged — all labeled, no regressions found.',
        '21 new issues triaged — busy day after release. 5 bugs, 2 marked critical.',
        '11 new issues triaged — 1 duplicate closed, 4 bugs labeled.',
      ],
      changes: [
        [{ t: 'edit', x: 'triage-notes.md' }, { t: 'label', x: '14 issues labeled on GitHub' }],
        [{ t: 'edit', x: 'triage-notes.md' }, { t: 'label', x: '8 issues labeled on GitHub' }],
      ],
      transcript: (p) => [
        { role: 'user', text: p },
        { role: 'tool', name: 'Bash', arg: 'gh issue list --state open --search "created:>=yesterday" --json number,title,body' },
        { role: 'result', text: 'Fetched 14 issues' },
        { role: 'assistant', text: 'I reviewed all 14 issues opened since yesterday. Three look like genuine bugs — #4821 reports balance display freezing after the 2.92 update, which matches the symptoms in #4809, so I flagged it as a possible regression.' },
        { role: 'tool', name: 'Bash', arg: 'gh issue edit 4821 --add-label "bug,regression?"' },
        { role: 'tool', name: 'Write', arg: 'triage-notes.md' },
        { role: 'assistant', text: 'Done. Summary written to triage-notes.md — one item needs your attention: #4821 (possible regression in 2.92).' },
      ],
    },
    'rt-deps': {
      summaries: [
        '6 patch bumps, tests green. PR #2381 opened. One moderate advisory in ws@8.x flagged.',
        'No advisories. 3 minor bumps PR\'d, all tests passing.',
        '2 advisories found — one auto-fixed, one major (vite 6→7) left for review.',
        'All dependencies current. Nothing to do.',
      ],
      changes: [
        [{ t: 'commit', x: 'chore(deps): bump 6 patch versions' }, { t: 'pr', x: 'PR #2381 opened' }],
        [{ t: 'commit', x: 'chore(deps): minor bumps' }, { t: 'pr', x: 'PR #2374 opened' }],
        [],
      ],
      transcript: (p) => [
        { role: 'user', text: p },
        { role: 'tool', name: 'Bash', arg: 'npm audit --json' },
        { role: 'result', text: '1 moderate severity advisory' },
        { role: 'tool', name: 'Bash', arg: 'npm outdated --json' },
        { role: 'assistant', text: 'Six packages have patch updates available and one moderate advisory affects ws@8.17.0. The advisory fix is in 8.17.1, which is within the patch range — including it in the bump set.' },
        { role: 'tool', name: 'Bash', arg: 'npm test' },
        { role: 'result', text: '842 passing, 0 failing' },
        { role: 'tool', name: 'Bash', arg: 'gh pr create --title "chore(deps): bump 6 patch versions"' },
        { role: 'assistant', text: 'PR #2381 opened with 6 patch bumps, tests green. No major updates needed a decision this time.' },
      ],
    },
    'rt-changelog': {
      summaries: [
        'Drafted changelog for 38 commits — 4 added, 7 changed, 11 fixed. Ready for review.',
        'Drafted changelog for 22 commits. Two commits had unclear intent — marked with TODO.',
      ],
      changes: [
        [{ t: 'edit', x: 'CHANGELOG-draft.md' }],
      ],
      transcript: (p) => [
        { role: 'user', text: p },
        { role: 'tool', name: 'Bash', arg: 'git log v2.92.0..main --oneline' },
        { role: 'result', text: '38 commits' },
        { role: 'assistant', text: 'I read through all 38 commits since v2.92.0. Most map cleanly to user-facing changes; internal refactors are excluded. Grouping into Added (4), Changed (7), Fixed (11).' },
        { role: 'tool', name: 'Write', arg: 'CHANGELOG-draft.md' },
        { role: 'assistant', text: 'Draft saved. The wording targets end users — e.g. "Fixed a freeze when switching accounts quickly" rather than commit-speak.' },
      ],
    },
    'rt-flaky': {
      summaries: [
        '2 flaky tests detected this window. swap-flow.spec.ts now at 4 flakes — issue #1182 opened.',
        'No new flakes in the last window.',
        '1 new flake: onboarding.e2e.ts (1st occurrence). Tally updated.',
        'No new flakes. send-flow.spec.ts recovered — 0 flakes in 7 days.',
      ],
      changes: [
        [{ t: 'edit', x: 'flaky-tests.json' }, { t: 'pr', x: 'Issue #1182 opened' }],
        [],
        [{ t: 'edit', x: 'flaky-tests.json' }],
      ],
      transcript: (p) => [
        { role: 'user', text: p },
        { role: 'tool', name: 'Bash', arg: 'gh run list --limit 40 --json conclusion,databaseId' },
        { role: 'result', text: '40 runs fetched' },
        { role: 'assistant', text: 'Comparing first-attempt failures against retry results: swap-flow.spec.ts failed then passed twice in this window. That brings it to 4 flakes this week — over the threshold.' },
        { role: 'tool', name: 'Edit', arg: 'flaky-tests.json' },
        { role: 'tool', name: 'Bash', arg: 'gh issue create --title "Flaky: swap-flow.spec.ts (4 flakes this week)"' },
        { role: 'assistant', text: 'Tally updated and issue #1182 opened with links to the four failing runs.' },
      ],
    },
    'rt-docs': {
      summaries: [
        '212 links checked — 3 dead, 5 redirected (fixed). Report saved.',
        '208 links checked — all healthy.',
      ],
      changes: [
        [{ t: 'edit', x: '5 files updated' }, { t: 'edit', x: 'link-report.md' }],
        [],
      ],
      transcript: (p) => [
        { role: 'user', text: p },
        { role: 'tool', name: 'Bash', arg: 'grep -roh "https?://[^) ]*" docs/ | sort -u | wc -l' },
        { role: 'result', text: '212' },
        { role: 'assistant', text: 'Checked all 212 external links. Five returned permanent redirects with obvious targets — updated in place. Three are dead with no clear replacement; listed in link-report.md for a human call.' },
        { role: 'tool', name: 'Edit', arg: 'docs/connect/getting-started.md (+4 more)' },
        { role: 'assistant', text: 'Done — 5 files updated, report saved.' },
      ],
    },
  };

  function genSeedRuns(routines, now) {
    const runs = [];
    for (const r of routines) {
      const tpl = RUN_TEMPLATES[r.id];
      if (!tpl) continue;
      const rng = mulberry32(r.id.split('').reduce((a, c) => a + c.charCodeAt(0), 7));
      const backDays = r.schedule.freq === 'hourly' ? 10 : 45;
      for (let i = backDays; i >= 0; i--) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        // disabled routine: only history older than 12 days
        if (!r.enabled && i < 12) continue;
        for (const t of scheduleTimesForDay(r.schedule, day)) {
          const [h, m] = t.split(':').map(Number);
          const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, Math.floor(rng() * 50));
          if (start >= now) continue;
          const failed = rng() < 0.09;
          const durationSec = Math.round(40 + rng() * (r.model === 'opus' ? 420 : 240));
          const tokens = Math.round(8 + rng() * (r.model === 'opus' ? 160 : 90)) * 1000;
          const cost = +(tokens / 1000 * (r.model === 'opus' ? 0.03 : r.model === 'haiku' ? 0.004 : 0.012)).toFixed(2);
          const si = Math.floor(rng() * tpl.summaries.length);
          runs.push({
            id: `run-${r.id}-${start.getTime()}`,
            routineId: r.id,
            start: start.toISOString(),
            durationSec,
            status: failed ? 'failed' : 'success',
            costUsd: cost,
            tokens,
            summary: failed
              ? 'Run failed — `gh` returned 401 (token expired). No changes were made.'
              : tpl.summaries[si],
            changes: failed ? [] : tpl.changes[si % tpl.changes.length],
            transcript: failed
              ? [
                  { role: 'user', text: r.prompt },
                  { role: 'tool', name: 'Bash', arg: 'gh auth status' },
                  { role: 'result', text: 'HTTP 401: Bad credentials', err: true },
                  { role: 'assistant', text: 'The GitHub token has expired, so I can\'t reach the API. Stopping here without making changes — re-run `gh auth login` and this routine will pick up next cycle.' },
                ]
              : tpl.transcript(r.prompt),
          });
        }
      }
    }
    // one live "running" run for the flaky hunter, started 6 min ago
    const live = new Date(now.getTime() - 6 * 60 * 1000);
    runs.push({
      id: 'run-live-1', routineId: 'rt-flaky', start: live.toISOString(),
      durationSec: null, status: 'running', costUsd: null, tokens: null,
      summary: 'Pulling latest CI results…',
      changes: [],
      transcript: [
        { role: 'user', text: routines.find((r) => r.id === 'rt-flaky').prompt },
        { role: 'tool', name: 'Bash', arg: 'gh run list --limit 40 --json conclusion,databaseId' },
        { role: 'result', text: 'Running…' },
      ],
    });
    runs.sort((a, b) => new Date(b.start) - new Date(a.start));
    return runs;
  }

  // ── formatters ─────────────────────────────────────────────
  const fmtTime = (d) => {
    d = new Date(d);
    const h = d.getHours(), m = d.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
  };
  const fmtDate = (d) => { d = new Date(d); return `${DAY_NAMES[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`; };
  const fmtDateTime = (d) => `${fmtDate(d)} · ${fmtTime(d)}`;
  const fmtDur = (s) => {
    if (s == null) return '—';
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };
  const fmtCost = (c) => (c == null ? '—' : `$${c.toFixed(2)}`);
  const fmtTokens = (t) => (t == null ? '—' : t >= 1000 ? `${Math.round(t / 1000)}k` : String(t));
  const relTime = (d, now) => {
    const ms = (now || new Date()) - new Date(d);
    const min = Math.round(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.round(h / 24);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  };
  const relUntil = (d, now) => {
    const ms = new Date(d) - (now || new Date());
    const min = Math.round(ms / 60000);
    if (min < 1) return 'now';
    if (min < 60) return `in ${min}m`;
    const h = Math.round(min / 60);
    if (h < 24) return `in ${h}h`;
    return `in ${Math.round(h / 24)}d`;
  };

  window.CCR = {
    uid, MODELS, DAY_NAMES, MONTHS,
    seedRoutines, genSeedRuns, RUN_TEMPLATES,
    describeSchedule, computeNextRun, scheduleTimesForDay, parseNL, scheduleToNL, fmtClock,
    fmtTime, fmtDate, fmtDateTime, fmtDur, fmtCost, fmtTokens, relTime, relUntil,
  };
})();
