# Dashboard design

Four report pages. Apply `theme/phin-dashboard-theme.json` first (View →
Themes → Browse for themes) — it carries the validated colour palette; the
rules below say which colour does which job so the theme stays meaningful.

Global rules (every page):

- **Slicers in one row across the top:** Period, Provider, Region. Horizontal
  chips style, "All" default. Nothing else filters across pages.
- **One axis per chart.** Two measures of different scale get two charts side
  by side, never a dual y-axis.
- **Colour by job:** ranked bars of one measure use one colour (theme
  colour 1, blue) — colour carries no extra information in a ranked bar, so
  don't paint each bar differently. Multi-series identity uses the theme's
  categorical order (blue, orange, aqua, ...) and a series keeps its colour
  when filters change. Good/bad state (KPI deltas) uses the status greens/reds,
  which are never used as series colours.
- **Counts are integers, rates one decimal.** Data labels on the top few bars
  only (turn on "Value" labels but set the density low), not every bar.
- **Footnote on every page** (text box, muted ink): "Source: PHIN datasheets,
  phin.org.uk — <period label>. Small counts may be suppressed in the source;
  totals are a minimum."

## Page 1 — Overview

The at-a-glance answer: how safe, how clean, how liked.

| Zone | Visual |
|---|---|
| Top row | 4 KPI cards: **Adverse Events**, **Never Events**, **HCAI Rate per 100k Bed Days**, **% Would Recommend** — with `Hospitals in Scope` as a fifth, smaller card |
| Left, middle | Clustered bar: Adverse Events by Provider (top 10, sorted desc, single colour) |
| Right, middle | Bar: HCAI Rate per 100k Bed Days by Provider (same top-10 provider set, single colour) — paired with the left chart instead of a dual axis |
| Bottom | Table: Hospital · Provider · Region · Adverse Events · Never Events · Infections · HCAI Rate · % Recommend — the drill-down / accessibility table for the whole report |

When a second data drop is loaded, swap the KPI cards to show
`HCAI Rate Change vs Previous` as the delta (status colours: improvement
green `#0ca30c`, worsening red `#d03b3b`, with an arrow icon — never colour
alone).

## Page 2 — Patient Safety (adverse events + never events)

| Zone | Visual |
|---|---|
| Top left | Card: Adverse Events; Card: Adverse Events per 1,000 Episodes |
| Top right | Card: Never Events; Card: Hospitals with a Never Event (of `Hospitals in Scope`) |
| Middle left | Bar: Adverse Events by EventCategory (if the datasheet publishes categories; otherwise by Region), single colour |
| Middle right | Bar: Never Events by EventCategory — Never Events are rare; show plain counts, and if mostly zero replace with a table of the actual events (Hospital · Category · Count) |
| Bottom | Table: Hospital · Adverse Events · Episodes · per-1,000 rate · Never Events, sorted by per-1,000 rate desc |

Do **not** plot never events as a rate — the numbers are single digits per
hospital; a count table communicates honestly where a bar chart would
exaggerate.

## Page 3 — Infections

| Zone | Visual |
|---|---|
| Top | Cards: Infections, Bed Days, HCAI Rate per 100k Bed Days |
| Left | Bar: HCAI Rate per 100k Bed Days by Provider (single colour, sorted) |
| Right | 100% stacked bar: Infections by Provider, legend = InfectionType — **cap at the top 3 infection types + "Other"** (group the rest in a calculated column or the visual's Top-N + Others); more than 3-4 simultaneous colours stops being readable |
| Bottom | Scatter: x = Bed Days, y = HCAI Rate per 100k Bed Days, one dot per hospital, single colour, tooltip = Hospital/Provider/Infections. This shows whether small hospitals' high rates are just small denominators |

Legend always on for the stacked bar; InfectionType keeps its colour across
filter changes (set the legend field's data colours explicitly in Format →
Data colors so filtering can't re-map them).

## Page 4 — Patient Feedback

| Zone | Visual |
|---|---|
| Top | Cards: % Would Recommend, Feedback Responses, Average Rating |
| Left | Histogram-style bar: hospitals bucketed by PctRecommend band (90-100 / 80-90 / <80 — calculated column), single colour |
| Right | Scatter: x = Responses, y = PctRecommend, one dot per hospital — small samples with extreme scores are visible instead of misleading |
| Bottom | Table: Hospital · Provider · Responses · % Recommend · Avg Rating, sorted by Responses desc |

Weighted measures (`% Would Recommend` weights by Responses) mean provider
and region aggregates are already sample-size-honest; the scatter makes the
per-hospital caveat visible.

## Colour reference (what the theme file encodes)

| Job | Colour |
|---|---|
| Single-measure bars/lines (default series) | `#2a78d6` blue |
| Categorical series 2..8, in fixed order | `#eb6834`, `#1baf7a`, `#eda100`, `#e87ba4`, `#008300`, `#4a3aa7`, `#e34948` |
| Good / improvement | `#0ca30c` (+ icon/arrow, never colour alone) |
| Critical / worsening | `#d03b3b` (+ icon/arrow) |
| Page background | `#f9f9f7`; visuals on `#fcfcfb` |
| Primary / secondary text | `#0b0b0b` / `#52514e` |

Three light-mode series colours (magenta, yellow, aqua) sit below 3:1
contrast on the light surface — which is why every page carries a table view
and the stacked bar keeps direct labels on.
