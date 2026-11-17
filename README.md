# AI Agent Readiness Check

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-AI%20Agent%20Readiness%20Check-7c5cff?logo=github)](https://github.com/marketplace/actions/ai-agent-readiness-check)
[![License: MIT](https://img.shields.io/badge/license-MIT-2ee6f0)](LICENSE)

People now send **ChatGPT, Claude and Perplexity** to research, book and buy for them. This action checks, on every push or deploy, whether those AI agents can **find, read and use your website**. It fails the build if a robots.txt change or a firewall rule starts blocking the AI assistants your customers send.

It scores your site out of 100 and writes a full report to the job summary, with copy-paste fixes.

## Usage

```yaml
name: Agent readiness
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1' # every Monday
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: rudraneel93/agent-readiness-action@v1
        with:
          url: example.com
          min-score: 70                      # optional: fail below this score
          fail-on-blocked-assistants: true   # optional (default true)
```

Run it after your deploy step to check the live site.

## What it checks

| Check | Points |
|---|---|
| robots.txt lets AI assistants (ChatGPT-User, Claude-User, Perplexity-User) visit for your customers | 20 |
| Live test: those assistants aren't blocked by your firewall or bot protection | 20 |
| AI search crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot) can index you | 10 |
| An `llms.txt` guide for AI agents | 10 |
| Content readable without JavaScript | 10 |
| Structured data (JSON-LD) | 8 |
| An MCP server or agent API is discoverable | 7 |
| A sitemap | 5 |
| A clear title and description | 5 |
| Agents can be verified (who owns them, what they may do) | 5 |

Blocking model-training crawlers such as GPTBot or CCBot is a legitimate choice and never lowers the score.

## Inputs

| Input | Default | Description |
|---|---|---|
| `url` | (required) | Website to check |
| `min-score` | `0` | Fail if the score is below this |
| `fail-on-blocked-assistants` | `true` | Fail if robots.txt or the firewall blocks AI assistants |
| `api` | `https://reverse-captcha.onrender.com` | Checker server |

## Outputs

`score` (0–100), `grade` (A–F), `report-url` (full result with fixes).

```yaml
      - uses: rudraneel93/agent-readiness-action@v1
        id: agents
        with: { url: example.com }
      - run: echo "Agent readiness ${{ steps.agents.outputs.score }}/100"
```

## How it works

The action calls the free [Turingate agent-readiness checker](https://reverse-captcha.onrender.com/check), which fetches your home page, robots.txt, llms.txt, sitemap and standard MCP locations, and visits as each AI assistant to compare with a normal browser. It sends only the URL you configure. Results are cached for 30 minutes.

See how the world's top sites score in the [State of the Agent-Ready Web report](https://reverse-captcha.onrender.com/report).

## Let good agents in, keep bad ones out

Opening the door to every bot invites scrapers. [Turingate](https://reverse-captcha.onrender.com) is a reverse CAPTCHA: AI agents pass it and get a signed pass naming the verified person behind them, their permissions and spending limit, so you can let verified agents through and ban abusers across every Turingate site. SDK: [rudraneel93/turingate-sdk](https://github.com/rudraneel93/turingate-sdk).

## License

MIT
