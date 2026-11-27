# StudScore `community.json` schema

The community price file `community.js` reads from `./community.json` at the site root. `pipeline/build_community.py` writes it every day (`github-workflow-community.yml`) from the community Worker's `/export` aggregates. The app ignores a missing file.

It holds **aggregates only**: no names, notes, quantities, totals, locations, IPs, submission ids or single reports.

## Root object

```json
{
  "updated": "2026-11-17",
  "currency": "USD",
  "source": "StudScore community",
  "min_reports": 3,
  "items": {
    "75192-1": {
      "new":  {"price": 810.0, "count": 8, "history": [["2026-09", 800.0, 3], ["2026-10", 820.0, 5]]},
      "used": {"price": 590.0, "count": 4, "history": []}
    },
    "sw0001a": {"used": {"price": 12.5, "count": 3, "price_month": "2025-04", "history": [["2025-04", 12.5, 3]]}}
  }
}
```

| Field | Meaning |
| --- | --- |
| `items` keys | Rebrickable set number with suffix (`75192-1`), Rebrickable fig id (`fig-012345`) or lowercase BrickLink fig id (`sw0001a`). |
| `new` / `used` | Present only when it passes the 3-report rule. Sealed/new/unbuilt counts as new; used/built/opened/incomplete counts as used; no condition in an upload means new. |
| `price` | Median of all qualifying reports from the last 12 months. |
| `count` | Number of reports behind `price`. |
| `price_month` | Only present when nothing in the last 12 months qualifies. `price` is then the latest qualifying month's median. |
| `history` | `[month, median, count]`, oldest first. Each month qualifies on its own. |

## The 3-report rule

A price or history month is published only when **3 or more distinct submissions** back it. On the Worker side, those submissions must also come from 3 or more distinct sources, where a source is a salted, monthly-rotated hash of the IP. `community.js` checks `count >= 3` again before showing anything.

Only rows in `COMMUNITY_CURRENCY` (default `USD`) are published. Rows in other currencies stay in the database and are left out of the file.

## Optional store seed (the store's sold prices)

The store's own **sold** prices can be merged in to get things started. Listing or asking prices never go in.

- Set the `COMMUNITY_SEED_CSV` Actions secret to the CSV text. The workflow writes it to `$RUNNER_TEMP`, points `COMMUNITY_SEED_PATH` at it, and deletes it after the build. The builder refuses a seed path inside the repo, so the file can't be committed.
- Accepted layouts:
  - `item_number,item_type,condition,sale_price_usd,sale_month`: the store export, one row per unit sold. Always USD, always sold. Case doesn't matter (`Part`, `New`). `item_type` is set, minifig or part. Parts are skipped because community prices cover sets and minifigs only. BrickLink set numbers without a suffix become `-1`, and minifig ids are lowercased.
  - `id,condition,price,currency,month[,kind]`: if `kind` is present, it must be `sold`.
  - `condition` is `N`/`U` or `new`/`used`. Months are `YYYY-MM` (a day part is ignored). Rows with no valid month, price, condition, currency or id are skipped and counted in the log.
- **The store counts as ONE distinct submission and ONE report per item + condition + month**, however many units it sold. That voice is the median of those units. In the 12-month price, the store is still one voice: the median of its monthly medians. It can never reach the minimum alone, so at least 2 other collectors are needed. Load one seed file only, because two files covering the same sales would double-count.
- When a seed is present, the builder asks `/export?min_distinct=2` so a 2-collector group plus the store can reach 3. Nothing below 3 is ever written.
- Merged medians: the export only gives a median and count for the community side, so the merged median treats those reports as `count` values at that median, plus the store's one value. This is a close approximation.

## Rows sent by the app (`POST /submit`)

```json
{"v": 1, "rows": [{"id": "75192-1", "cond": "new", "price": 799.99, "currency": "USD", "month": "2025-11", "kind": "paid"}]}
```

- Sent only when the collector turns on "Share my prices anonymously" (off by default). The demo collection is never sent.
- `kind: "paid"` comes only from cost columns (cost, paid, price paid, purchase price, and similar). `kind: "sold"` comes only from explicit sold-price columns. Value, price and asking columns, and BrickLink XML `<PRICE>`, are estimates or asking prices and are never sent.
- A row needs a real month (a bare year doesn't count), a price over 0 and under 20,000, and a recognised set or minifig id.
- At most 500 rows per request. Rows already sent are remembered as short hashes in `localStorage` (`studShareSent`) and not sent again.
