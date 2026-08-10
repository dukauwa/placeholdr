# Data model

A small star schema: four fact tables at hospital grain, sharing a hospital
dimension and (once you have more than one PHIN data drop) a period dimension.

```
                    ┌────────────────┐
                    │  DimHospital   │
                    │  Hospital (key)│
                    │  Provider      │
                    │  Region        │
                    └──────┬─────────┘
          1:* to Hospital in each fact
   ┌───────────────┬───────┴───────┬─────────────────┐
   ▼               ▼               ▼                 ▼
FactAdverse    FactNever      FactInfections   FactPatientFeedback
Events         Events
   ▲               ▲               ▲                 ▲
   └───────────────┴───────┬───────┴─────────────────┘
                    *:1 on Period
                    ┌──────┴─────────┐
                    │   DimPeriod    │
                    │ Period (label) │
                    │ PeriodOrder    │
                    └────────────────┘
```

## Tables

### DimHospital
One row per private hospital site. Built by the Python script
(`dim_hospital.csv`) or, in the Power Query route, by referencing the four
fact queries, keeping `Hospital`, `Provider`, `Region`, appending, and
removing duplicates on `Hospital`.

| Column | Notes |
|---|---|
| Hospital | Site name — the relationship key (PHIN datasheets are site-level) |
| Provider | Hospital group (Spire, Circle, Nuffield, HCA, ...) |
| Region | Region / country |

### DimPeriod
One row per reporting period. With a single data drop this has one row; add a
row per drop as you accumulate them. Create it as a manual "Enter data" table:

| Period | PeriodOrder |
|---|---|
| e.g. "12 months to 30 Sep 2024" | 1 |
| e.g. "12 months to 31 Mar 2025" | 2 |

`PeriodOrder` drives the previous-period measures; set the Period column's
*Sort by column* to PeriodOrder.

### Fact tables

| Table | Grain | Key numeric columns |
|---|---|---|
| FactAdverseEvents | hospital (× event category if published) | AdverseEvents, Episodes |
| FactNeverEvents | hospital (× event category if published) | NeverEvents |
| FactInfections | hospital × infection type | Infections, BedDays, PublishedRatePer100k |
| FactPatientFeedback | hospital | Responses, PctRecommend, AvgRating |

## Relationships

- `DimHospital[Hospital]` 1 → * `Fact*[Hospital]` (all four facts), single
  direction, filter from dimension to fact.
- `DimPeriod[Period]` 1 → * `Fact*[Period]` (all four facts).
- **No relationships between fact tables.** Cross-measure views always go
  through DimHospital / DimPeriod.

## Column mapping expectations

Both pipelines map source headers by keyword. What each canonical column
expects to find in the PHIN workbook:

| Canonical | Typical PHIN header contains |
|---|---|
| Hospital | "Hospital", "Site" |
| Provider | "Provider", "Group", "Operator" |
| Region | "Region", "Country" |
| Period | "Period", "Reporting", "12 month" |
| AdverseEvents / NeverEvents | "...events...", "Count" |
| Episodes | "Episodes", "Admissions" |
| Infections | "Number of infections", "Cases" (or one column per organism — auto-unpivoted) |
| BedDays | "Bed days" |
| PctRecommend | "...recommend..." |
| Responses | "Responses", "Surveys", "Sample" |

If a new PHIN drop renames a header beyond these keywords, extend the keyword
list in `scripts/prepare_phin_data.py` (`DATASETS` dict) or the
`Table.TransformColumnNames` block of the matching `.m` query.

## Gotchas

- **Never average PHIN's pre-computed rate columns.** Keep
  `PublishedRatePer100k` only for row-level validation against
  `[HCAI Rate per 100k Bed Days]`; aggregate rates are always
  `SUM(count) / SUM(denominator)`.
- **Bed days repeat across infection-type rows** after unpivoting — the
  `[Bed Days]` measure de-duplicates via SUMMARIZE; don't `SUM` the column
  directly.
- **Suppression:** PHIN suppresses small numbers in some datasheets (shown as
  `*` or `<5`). Both pipelines type counts as nullable numbers, so suppressed
  cells become blank — meaning totals are a floor, not an exact figure. Note
  this on the dashboard (the design doc places a footnote).
- **Hospital names as keys** work because they come from the same publisher,
  but check for duplicates after loading a new drop (e.g. renamed sites);
  fix-ups belong in the prep script, not the model.
