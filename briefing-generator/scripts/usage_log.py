"""Shared usage recorder — one append-only file the Usage dashboard reads.

Nothing recorded API usage before this, so the dashboard's history starts the
day this shipped; there is no way to backfill CourtListener requests or Claude
tokens after the fact (neither the repo nor the Actions logs carry per-call
counts).

Each run appends ONE row per (task, provider) pair:

    {"ts": "2026-08-14T18:22:04Z", "date": "2026-08-14",
     "task": "docket-sync", "provider": "courtlistener",
     "requests": 88, "tokens_in": 0, "tokens_out": 0, "ok": true}

Design notes:
  · Append-only and tiny (one row per task per run), so it stays cheap to read
    whole in the browser. Rows older than RETAIN_DAYS are dropped on write.
  · Never raises. Telemetry must not be able to fail a scan — every entry
    point is wrapped, and a corrupt file is replaced rather than crashed on.
  · Writes are last-writer-wins. Scans are scheduled sequentially, so the
    practical risk is low; a lost row costs one bar on a chart.
"""
import datetime as dt
import json
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
LOG_PATH = REPO_ROOT / "usage-log.json"
RETAIN_DAYS = 120

def _load():
    try:
        raw = json.loads(LOG_PATH.read_text(encoding="utf-8"))
        rows = raw.get("runs") if isinstance(raw, dict) else raw
        return [r for r in (rows or []) if isinstance(r, dict)]
    except Exception:
        return []


def record(task, provider, requests=0, tokens_in=0, tokens_out=0,
           model=None, ok=True, note=""):
    """Append one usage row. Swallows every error by design."""
    try:
        now = dt.datetime.now(dt.timezone.utc)
        row = {
            "ts": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "date": now.strftime("%Y-%m-%d"),
            "task": str(task)[:60],
            "provider": str(provider)[:24],
            "requests": int(requests or 0),
            "tokens_in": int(tokens_in or 0),
            "tokens_out": int(tokens_out or 0),
            "ok": bool(ok),
        }
        if model:
            row["model"] = str(model)[:40]
        if note:
            row["note"] = str(note)[:120]

        rows = _load()
        rows.append(row)
        cutoff = (now - dt.timedelta(days=RETAIN_DAYS)).strftime("%Y-%m-%d")
        rows = [r for r in rows if (r.get("date") or "") >= cutoff]

        tmp = LOG_PATH.with_suffix(".json.tmp")
        tmp.write_text(json.dumps({"runs": rows}, indent=2) + "\n", encoding="utf-8")
        os.replace(tmp, LOG_PATH)   # atomic, so a reader never sees a half file
        return True
    except Exception:
        return False


class Counter:
    """Tally a run's calls, then flush one row.

        u = Counter("news-scan", "anthropic", model=MODEL)
        u.add_tokens(resp)      # or u.add_request()
        u.flush()
    """

    def __init__(self, task, provider, model=None):
        self.task, self.provider, self.model = task, provider, model
        self.requests = self.tokens_in = self.tokens_out = 0
        self.ok = True

    def add_request(self, n=1):
        self.requests += n

    def add_tokens(self, response):
        """Accepts an Anthropic response (reads .usage) or an explicit pair."""
        self.requests += 1
        try:
            u = getattr(response, "usage", None)
            if u is not None:
                self.tokens_in += int(getattr(u, "input_tokens", 0) or 0)
                self.tokens_out += int(getattr(u, "output_tokens", 0) or 0)
        except Exception:
            pass

    def add_counts(self, tokens_in=0, tokens_out=0, requests=1):
        self.requests += requests
        self.tokens_in += int(tokens_in or 0)
        self.tokens_out += int(tokens_out or 0)

    def fail(self):
        self.ok = False

    def flush(self, note=""):
        if not (self.requests or self.tokens_in or self.tokens_out):
            return False
        return record(self.task, self.provider, self.requests, self.tokens_in,
                      self.tokens_out, self.model, self.ok, note)
