#!/usr/bin/env python3
"""Build StudScore's community.json from the community Worker's /export aggregates.

Environment (GitHub Actions secrets):
  COMMUNITY_ENDPOINT       Worker URL, e.g. https://studscore-community.<account>.workers.dev (a trailing /submit is fine)
  COMMUNITY_EXPORT_TOKEN   same value as the Worker's EXPORT_TOKEN secret
Optional:
  COMMUNITY_CURRENCY       currency to publish (default USD); aggregates in other currencies are left out
  COMMUNITY_SEED_PATH      path to a CSV of the store's SOLD prices (id, condition, price, currency, month).
                           Must live outside the repository (the workflow writes it to $RUNNER_TEMP). Never commit it.

If the endpoint or token is missing, prints a message and exits 0 without writing anything.
Nothing is published unless 3+ distinct submissions back it. The store seed counts as ONE submission per
item + condition + month, so it can never reach the minimum on its own. See pipeline/COMMUNITY_SCHEMA.md.

Usage:
  python pipeline/build_community.py --output community.json
  python pipeline/build_community.py --export-json saved_export.json --output /tmp/community.json   # offline test
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path
from statistics import median as _median

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
MIN_DISTINCT = 3
MAX_PRICE = 20000
SET_RE = re.compile(r"^[0-9A-Za-z]{2,15}-\d{1,3}$")
FIG_RE = re.compile(r"^(fig-\d{6}|[a-z]{2,8}\d{2,5}[a-z]{0,2})$")
MONTH_RE = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")
USER_AGENT = "StudScore-Community/1.0 (+https://studscore.github.io)"


def med(values: list[float]) -> float:
    return round(float(_median(values)), 2)


def months_back(month: str, n: int) -> str:
    y, m = map(int, month.split("-"))
    m -= n
    while m <= 0:
        m += 12
        y -= 1
    return f"{y}-{m:02d}"


def fetch_export(endpoint: str, token: str, min_distinct: int) -> dict:
    base = re.sub(r"/(submit|export)?/?$", "", endpoint.strip())
    req = urllib.request.Request(f"{base}/export?min_distinct={min_distinct}",
                                 headers={"Authorization": f"Bearer {token}", "User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.load(res)


TYPE_WORDS = {"s": "set", "set": "set", "sets": "set", "m": "minifig", "minifig": "minifig", "minifigure": "minifig", "minifigs": "minifig",
              "p": "part", "part": "part", "parts": "part"}


def seed_item_id(number: str, item_type: str | None) -> tuple[str | None, str]:
    """Map a store item number to StudScore's ids. Returns (id, reason-if-skipped)."""
    n = number.strip()
    t = TYPE_WORDS.get((item_type or "").strip().lower(), "" if item_type is None else "other")
    if t == "part":
        return None, "part (community prices cover sets and minifigs only)"
    if t == "other":
        return None, "unsupported item type"
    if t == "minifig" or n.lower().startswith("fig-") or (t == "" and FIG_RE.match(n.lower()) and "-" not in n):
        f = n.lower()
        return (f, "") if FIG_RE.match(f) else (None, "minifig id the app can't key")
    k = n if "-" in n else n + "-1"  # BrickLink 75192 / 75192-1 -> Rebrickable 75192-1
    return (k, "") if SET_RE.match(k) else (None, "set number in an unexpected format")


def load_seed(path: str, currency: str, this_month: str) -> tuple[dict, int, dict]:
    """Store SOLD prices -> {(id, cond, month): [prices]}. Returns (groups, kept, skipped-reasons).
    Accepts either header layout:
      id, condition, price, currency, month[, kind]
      item_number, item_type, condition, sale_price_usd, sale_month      (the store export, one row per unit; always USD, always sold;
                                                                          item_type/condition may be capitalized, e.g. Part / New)
    """
    p = Path(path).resolve()
    if REPO_ROOT in p.parents:
        sys.stderr.write("COMMUNITY_SEED_PATH points inside the repository. Keep the seed file outside it so it can't be committed.\n")
        sys.exit(2)
    groups: dict[tuple[str, str, str], list[float]] = {}
    kept = 0
    skipped: dict[str, int] = {}
    skip = lambda why: skipped.__setitem__(why, skipped.get(why, 0) + 1)
    with open(p, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        cols = {c.strip().lower() for c in (reader.fieldnames or [])}
        store_fmt = {"item_number", "condition", "sale_price_usd", "sale_month"} <= cols
        if not store_fmt and not {"id", "condition", "price", "currency", "month"} <= cols:
            sys.stderr.write(f"Seed CSV columns not recognized: {sorted(cols)}. See pipeline/COMMUNITY_SCHEMA.md.\n")
            sys.exit(2)
        for raw in reader:
            r = {k.strip().lower(): (v or "").strip() for k, v in raw.items() if k}
            if store_fmt:
                iid, why = seed_item_id(r["item_number"], r.get("item_type", ""))
                cur, price_s, month, kind = "USD", r["sale_price_usd"], r["sale_month"][:7], "sold"
            else:
                iid, why = seed_item_id(r["id"], None)
                cur, price_s, month = r["currency"].upper(), r["price"], r["month"][:7]
                # Sold prices only. A kind column, if present, must say "sold" (never listing or asking prices).
                kind = (r.get("kind") or "sold").lower()
            if not iid:
                skip(why); continue
            if kind != "sold":
                skip("not a sold price"); continue
            c = r["condition"].strip().lower()
            cond = {"n": "new", "new": "new", "u": "used", "used": "used"}.get(c)
            if not cond:
                skip("condition not new/used"); continue
            try:
                price = float(price_s.replace(",", "").lstrip("$"))
            except ValueError:
                price = -1
            if not 0 < price < MAX_PRICE:
                skip("price missing or out of range"); continue
            if cur != currency:
                skip(f"currency is not {currency}"); continue
            if not MONTH_RE.match(month) or not "1949-01" <= month <= this_month:
                skip("month missing, invalid or in the future"); continue
            groups.setdefault((iid, cond, month), []).append(round(price, 2))
            kept += 1
    return groups, kept, skipped


def merge(med_c, count_c, subs_c, store_voice):
    """Combine one community aggregate (may be None) with the store's single voice (a median price, or None).
    The store is ONE report and ONE distinct submission however many units it sold. The community side only
    arrives as a median and count, so the merged median treats it as `count` reports at that median (a close approximation)."""
    subs = (subs_c or 0) + (1 if store_voice is not None else 0)
    if subs < MIN_DISTINCT:
        return None
    values = ([med_c] * count_c if med_c is not None else []) + ([store_voice] if store_voice is not None else [])
    return med(values), len(values), subs


def build(export: dict, seed: dict, currency: str, today: date) -> dict:
    this_month = f"{today.year}-{today.month:02d}"
    cutoff = months_back(this_month, 11)
    monthly: dict[tuple, dict] = {}
    for a in export.get("months", []):
        if a.get("currency") == currency:
            monthly[(a["id"], a["cond"], a["month"])] = a
    recent: dict[tuple, dict] = {}
    for a in export.get("recent", []):
        if a.get("currency") == currency:
            recent[(a["id"], a["cond"])] = a

    # The store speaks once per item + condition + month: the median of the units it sold that month.
    voice = {k: med(v) for k, v in seed.items()}
    # In the 12-month price it is still one voice: the median of its monthly medians.
    seed_recent: dict[tuple, list] = {}
    for (iid, cond, month), v in voice.items():
        if month >= cutoff:
            seed_recent.setdefault((iid, cond), []).append(v)
    recent_voice = {k: med(v) for k, v in seed_recent.items()}

    items: dict[str, dict] = {}
    hist: dict[tuple, list] = {}
    for key in set(monthly) | set(seed):
        a = monthly.get(key)
        m = merge(a and a["median"], a and a["count"] or 0, a and a["submissions"], voice.get(key))
        if m:
            hist.setdefault(key[:2], []).append([key[2], m[0], m[1]])
    for key in set(hist) | set(recent) | set(recent_voice):
        a = recent.get(key)
        m = merge(a and a["median"], a and a["count"] or 0, a and a["submissions"], recent_voice.get(key))
        h = sorted(hist.get(key, []))
        entry = None
        if m:
            entry = {"price": m[0], "count": m[1], "history": h}
        elif h:  # nothing in the last 12 months that passes; fall back to the latest month that does
            entry = {"price": h[-1][1], "count": h[-1][2], "price_month": h[-1][0], "history": h}
        if entry:
            items.setdefault(key[0], {})[key[1]] = entry
    return {
        "updated": today.isoformat(),
        "currency": currency,
        "source": "StudScore community",
        "min_reports": MIN_DISTINCT,
        "items": {k: items[k] for k in sorted(items)},
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--output", default=str(REPO_ROOT / "community.json"))
    ap.add_argument("--export-json", help="read a saved /export response instead of calling the Worker (testing)")
    ap.add_argument("--today", help="override today's date, YYYY-MM-DD (testing)")
    args = ap.parse_args()

    currency = (os.environ.get("COMMUNITY_CURRENCY") or "USD").strip().upper()
    seed_path = (os.environ.get("COMMUNITY_SEED_PATH") or "").strip()
    today = date.fromisoformat(args.today) if args.today else date.today()
    this_month = f"{today.year}-{today.month:02d}"

    seed: dict = {}
    if seed_path:
        if not Path(seed_path).is_file():
            print("COMMUNITY_SEED_PATH is set but the file doesn't exist; building without the store seed.")
        else:
            seed, kept, skipped = load_seed(seed_path, currency, this_month)
            why = "; ".join(f"{n} {k}" for k, n in sorted(skipped.items(), key=lambda x: -x[1]))
            print(f"Store seed: {kept} sold prices mapped into {len(seed)} item/condition/month groups; "
                  f"{sum(skipped.values())} rows skipped{': ' + why if why else ''}.")

    if args.export_json:
        export = json.loads(Path(args.export_json).read_text(encoding="utf-8"))
    else:
        endpoint = (os.environ.get("COMMUNITY_ENDPOINT") or "").strip()
        token = (os.environ.get("COMMUNITY_EXPORT_TOKEN") or "").strip()
        if not endpoint or not token:
            print("COMMUNITY_ENDPOINT or COMMUNITY_EXPORT_TOKEN is not set. Nothing written.")
            return 0
        try:
            # With a seed, ask for 2-submission aggregates too: the store then makes the third. Still nothing below 3 is published.
            export = fetch_export(endpoint, token, 2 if seed else 3)
        except Exception as e:  # noqa: BLE001
            sys.stderr.write(f"Couldn't read the community export: {e}. Nothing written.\n")
            return 1

    out = build(export, seed, currency, today)
    path = Path(args.output)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(out, indent=1, sort_keys=False) + "\n", encoding="utf-8")
    tmp.replace(path)
    print(f"Wrote {path} with {len(out['items'])} items ({currency}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
