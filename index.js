// AI Agent Readiness Check: a zero-dependency GitHub Action.
// Calls the public Turingate checker API and reports the result in the job summary.
import { appendFileSync } from 'node:fs';

const input = (name, dflt = '') => (process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] ?? dflt).trim() || dflt;
const setOutput = (k, v) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
const summary = (md) => (process.env.GITHUB_STEP_SUMMARY ? appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`) : console.log(md));
const esc = (s) => String(s ?? '').replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const annotate = (level, msg) => console.log(`::${level}::${esc(msg)}`);

const url = input('url');
const minScore = Number(input('min-score', '0')) || 0;
const failBlocked = input('fail-on-blocked-assistants', 'true') !== 'false';
const api = input('api', 'https://reverse-captcha.onrender.com').replace(/\/$/, '');
if (!url) { annotate('error', 'Input "url" is required, e.g. url: example.com'); process.exit(1); }

let res, data;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    res = await fetch(`${api}/v1/check`, {
      method: 'POST', signal: AbortSignal.timeout(90_000),
      headers: { 'content-type': 'application/json', 'user-agent': 'agent-readiness-action/1', 'x-turingate-client': 'github-action' },
      body: JSON.stringify({ url }),
    });
    data = await res.json().catch(() => ({}));
    if (res.status < 500) break;
  } catch (e) { data = { error: e.message }; }
  if (attempt < 3) await new Promise((r) => setTimeout(r, 15_000 * attempt)); // the free server may need a moment to wake
}
if (!res || res.status === 429) { annotate('warning', `Agent-readiness check skipped: ${data?.error || 'service busy'}. Try again later.`); process.exit(0); }
if (!res.ok) { annotate('error', `Agent-readiness check failed for ${url}: ${data?.error || `HTTP ${res.status}`}`); process.exit(1); }

const link = `${api}/check?site=${encodeURIComponent(data.host)}&ref=github-action`;
setOutput('score', data.score); setOutput('grade', data.grade); setOutput('report-url', link);

const icon = { pass: '✅', warn: '⚠️', fail: '❌' };
const live = (a) => (a.firewallBlocked === undefined ? 'n/a' : a.firewallBlocked === null ? "couldn't tell" : a.firewallBlocked ? '❌ blocked' : '✅ got through');
summary([
  `## AI agent readiness: ${data.host} scored ${data.score}/100 (${data.grade})`,
  '', data.summary, '',
  '| | Check | Points |', '|---|---|---|',
  ...data.checks.map((c) => `| ${icon[c.status]} | **${c.title}**<br>${c.detail.replace(/\|/g, '\\|')} | ${c.points}/${c.max} |`),
  '', '### AI assistants acting for customers', '', '| Agent | robots.txt | Live test |', '|---|---|---|',
  ...data.agents.filter((a) => a.kind === 'assistant').map((a) => `| \`${a.token}\` | ${a.robotsAllowed ? '✅ allowed' : '❌ blocked'} | ${live(a)} |`),
  '', `[Full result and copy-paste fixes](${link}) · Checked by [Turingate](https://reverse-captcha.onrender.com)`,
].join('\n'));
console.log(`${data.host}: ${data.score}/100 (${data.grade}). Full result: ${link}`);

let failed = false;
for (const c of data.checks.filter((c) => c.status === 'fail')) annotate('warning', `${c.title}: ${c.detail}`);
const blocked = data.agents.filter((a) => a.kind === 'assistant' && (!a.robotsAllowed || a.firewallBlocked === true)).map((a) => a.token);
if (failBlocked && blocked.length) { annotate('error', `AI assistants blocked on ${data.host}: ${blocked.join(', ')}. They act for real customers. Fixes: ${link}`); failed = true; }
if (data.score < minScore) { annotate('error', `Agent-readiness score ${data.score} is below the minimum of ${minScore}. Fixes: ${link}`); failed = true; }
process.exit(failed ? 1 : 0);
