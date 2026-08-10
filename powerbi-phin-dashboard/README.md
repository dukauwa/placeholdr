# PHIN Private Healthcare — Power BI Dashboard Kit

This folder contains everything needed to build a Power BI dashboard from the
public datasheets published by **PHIN (Private Healthcare Information Network,
[phin.org.uk](https://www.phin.org.uk))**, covering four measures:

| Measure | PHIN datasheet page |
|---|---|
| Hospital Reported Adverse Events | <https://www.phin.org.uk/data/hospital-reported-adverse-events-datasheets> |
| Patient Feedback (satisfaction) | <https://www.phin.org.uk/data/patient-feedback-datasheets> |
| Never Events | <https://www.phin.org.uk/data/never-events-datasheets> |
| Infections (HCAIs) | <https://www.phin.org.uk/data/infections-datasheets> |

All datasheet pages are also linked from PHIN's main data page:
<https://www.phin.org.uk/data> (see "Datasheets").

> **Why the files aren't in this repo:** PHIN's website sits behind a firewall
> that blocks automated/cloud access (captcha challenge), so the datasheets
> could not be downloaded from the build environment. They download normally in
> a regular browser. Step 1 below takes about two minutes.

## Quick start

1. **Download the four Excel datasheets** from the pages above (latest
   published version of each) and save them into [`data/raw/`](data/raw/).
   Keep PHIN's original file names — the scripts recognise the datasets by
   keywords in the file name (`adverse`, `feedback`/`satisfaction`, `never`,
   `infection`).
2. **Prepare tidy tables** (choose one route):
   - **Python route (recommended):** run
     `python scripts/prepare_phin_data.py` — it reads every workbook in
     `data/raw/`, auto-detects the header rows, and writes clean CSVs to
     `data/processed/` (one fact table per measure plus `dim_hospital.csv`).
     Run with `--inspect` first to see each workbook's sheets and columns.
   - **Power Query route:** import the `.m` scripts in
     [`powerquery/`](powerquery/) directly into Power BI Desktop
     (*Get Data → Blank Query → Advanced Editor*, paste each script). They
     read the same `data/raw/` folder.
3. **Model the data** following [`docs/data-model.md`](docs/data-model.md)
   (star schema: hospital and period dimensions shared by the four fact
   tables).
4. **Add the measures** from [`dax/measures.dax`](dax/measures.dax)
   (copy each `MEASURE` block into the model, or paste via Tabular Editor).
5. **Apply the report theme** [`theme/phin-dashboard-theme.json`](theme/phin-dashboard-theme.json)
   (*View → Themes → Browse for themes*).
6. **Lay out the report pages** following
   [`docs/dashboard-design.md`](docs/dashboard-design.md) — a four-page
   design: Overview, Patient Safety, Infections, Patient Feedback.

## Folder contents

```
powerbi-phin-dashboard/
├── README.md                     ← you are here
├── data/
│   ├── raw/                      ← drop the downloaded PHIN .xlsx files here (git-ignored)
│   └── processed/                ← tidy CSVs written by the prep script (git-ignored)
├── scripts/
│   └── prepare_phin_data.py      ← xlsx → tidy CSV pipeline (auto header detection)
├── powerquery/                   ← Power Query (M) alternative to the Python script
│   ├── RawFolder.m               ← shared parameter/loader
│   ├── AdverseEvents.m
│   ├── PatientFeedback.m
│   ├── NeverEvents.m
│   └── Infections.m
├── dax/
│   └── measures.dax              ← all report measures
├── theme/
│   └── phin-dashboard-theme.json ← Power BI report theme (validated palette)
└── docs/
    ├── data-model.md             ← star schema, relationships, column mapping
    └── dashboard-design.md       ← page-by-page layout and visual spec
```

## Notes on the source data

- PHIN publishes datasheets a few times a year (recent drops: March 2025,
  June 2025). Each covers a rolling 12-month reporting period; keep the
  period label from the workbook so periods can be compared when you add a
  new drop.
- Hospital-level rows are the grain for all four measures. Never Events are
  rare (tens per year across the whole sector), so most hospital rows are
  zero — the dashboard treats them as counts, not rates.
- Infections come with a **bed days** denominator; PHIN reports HCAI rates
  per 100,000 bed days. The DAX file recomputes rates from the raw counts so
  they aggregate correctly across any slicer selection (never average
  pre-computed rate columns).
- Exact column headers can change between drops. Both pipelines detect
  columns by keyword; if a drop renames something beyond recognition, the
  Python script tells you which file/sheet it couldn't map and
  `docs/data-model.md` lists the expected mapping to adjust.
