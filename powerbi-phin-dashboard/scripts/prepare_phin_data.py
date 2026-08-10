#!/usr/bin/env python3
"""Turn PHIN datasheet workbooks into tidy, Power BI-ready CSVs.

Reads every ``.xlsx`` in ``data/raw/``, matches each workbook to one of the
four PHIN measures by file name, auto-detects the header row of each data
sheet, maps columns by keyword, and writes:

    data/processed/fact_adverse_events.csv
    data/processed/fact_patient_feedback.csv
    data/processed/fact_never_events.csv
    data/processed/fact_infections.csv
    data/processed/dim_hospital.csv

Usage:
    python scripts/prepare_phin_data.py             # full run
    python scripts/prepare_phin_data.py --inspect   # just list sheets/columns

PHIN occasionally renames columns between data drops. If a column can't be
mapped the script says exactly which file/sheet/column list it saw, so the
KEYWORD tables below can be extended in one place.

Requires: pandas, openpyxl  (pip install pandas openpyxl)
"""

from __future__ import annotations

import argparse
import re
import signal
import sys
from pathlib import Path

signal.signal(signal.SIGPIPE, signal.SIG_DFL)  # quiet exit when piped to head

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data" / "processed"

# ---------------------------------------------------------------------------
# Dataset definitions
# ---------------------------------------------------------------------------
# A workbook belongs to a dataset when its file name contains one of the
# ``file_keywords``. Within a sheet, a column is mapped to a canonical name
# when its header contains one of the listed keywords (case-insensitive,
# first match wins). ``required`` columns must all be found for a sheet to be
# treated as a data sheet; other sheets (notes, definitions, covers) are
# skipped automatically.

DATASETS: dict[str, dict] = {
    "adverse_events": {
        "file_keywords": ["adverse"],
        "required": ["hospital"],
        "columns": {
            "hospital": ["hospital", "site name", "site"],
            "provider": ["provider", "group", "operator", "organisation"],
            "region": ["region", "country", "area"],
            "period": ["period", "12 month", "date range", "reporting"],
            "event_category": ["category", "type of event", "event type"],
            "event_count": ["number of adverse", "adverse events", "count", "events reported", "number of events"],
            "episodes": ["episode", "admissions", "discharges", "spells"],
            "rate": ["rate"],
        },
    },
    "patient_feedback": {
        "file_keywords": ["feedback", "satisfaction"],
        "required": ["hospital"],
        "columns": {
            "hospital": ["hospital", "site name", "site"],
            "provider": ["provider", "group", "operator", "organisation"],
            "region": ["region", "country", "area"],
            "period": ["period", "12 month", "date range", "reporting"],
            "responses": ["responses", "number of patients", "sample", "surveys"],
            "pct_recommend": ["recommend"],
            "avg_rating": ["average rating", "mean rating", "overall rating", "score"],
        },
    },
    "never_events": {
        "file_keywords": ["never"],
        "required": ["hospital"],
        "columns": {
            "hospital": ["hospital", "site name", "site"],
            "provider": ["provider", "group", "operator", "organisation"],
            "region": ["region", "country", "area"],
            "period": ["period", "12 month", "date range", "reporting"],
            "event_category": ["category", "type of never", "event type", "description"],
            "event_count": ["number of never", "never events", "count", "events reported", "number of events"],
        },
    },
    "infections": {
        "file_keywords": ["infection", "hcai"],
        "required": ["hospital"],
        "columns": {
            "hospital": ["hospital", "site name", "site"],
            "provider": ["provider", "group", "operator", "organisation"],
            "region": ["region", "country", "area"],
            "period": ["period", "12 month", "date range", "reporting"],
            "infection_type": ["infection type", "organism", "type of infection", "measure"],
            "infection_count": ["number of infections", "infections reported", "count", "cases"],
            "bed_days": ["bed days", "bed-days", "beddays"],
            "rate_per_100k": ["per 100,000", "per 100000", "rate"],
        },
    },
}

# Output column names, matching the Power Query route so the DAX measures in
# dax/measures.dax work with either pipeline.
OUTPUT_NAMES = {
    "hospital": "Hospital",
    "provider": "Provider",
    "region": "Region",
    "period": "Period",
    "event_category": "EventCategory",
    "episodes": "Episodes",
    "rate": "PublishedRate",
    "infection_type": "InfectionType",
    "infection_count": "Infections",
    "bed_days": "BedDays",
    "rate_per_100k": "PublishedRatePer100k",
    "responses": "Responses",
    "pct_recommend": "PctRecommend",
    "avg_rating": "AvgRating",
    "source_file": "SourceFile",
    "source_sheet": "SourceSheet",
}
COUNT_NAMES = {  # the generic event_count column differs per dataset
    "adverse_events": "AdverseEvents",
    "never_events": "NeverEvents",
}

# Infection-type columns that appear as separate columns (wide layout) get
# unpivoted into infection_type/infection_count rows using these labels.
INFECTION_TYPE_HEADERS = ["mrsa", "mssa", "e. coli", "e.coli", "c. difficile",
                          "c.difficile", "cdi", "klebsiella", "pseudomonas",
                          "ssi", "surgical site"]


def norm(text: object) -> str:
    return re.sub(r"\s+", " ", str(text)).strip().lower()


def find_header_row(df: pd.DataFrame, keywords: list[str], scan_rows: int = 25) -> int | None:
    """Return the index of the first row that looks like a header row."""
    for i in range(min(scan_rows, len(df))):
        cells = [norm(c) for c in df.iloc[i].tolist()]
        hits = sum(any(k in cell for k in keywords) for cell in cells if cell and cell != "nan")
        if hits >= 1 and sum(bool(c and c != "nan") for c in cells) >= 3:
            return i
    return None


def map_columns(headers: list[str], mapping: dict[str, list[str]]) -> dict[str, str]:
    """Map canonical name -> actual header, by keyword containment."""
    result: dict[str, str] = {}
    for canonical, keywords in mapping.items():
        for header in headers:
            h = norm(header)
            if any(k in h for k in keywords) and header not in result.values():
                result[canonical] = header
                break
    return result


def load_dataset(path: Path, name: str, spec: dict, inspect: bool) -> pd.DataFrame | None:
    frames = []
    book = pd.read_excel(path, sheet_name=None, header=None, engine="openpyxl")
    for sheet, raw in book.items():
        if inspect:
            preview = [norm(c) for c in raw.iloc[:3].values.flatten().tolist() if norm(c) not in ("", "nan")]
            print(f"  sheet '{sheet}': {len(raw)} rows; starts with: {preview[:8]}")
            continue
        header_idx = find_header_row(raw, spec["columns"]["hospital"])
        if header_idx is None:
            continue
        df = raw.iloc[header_idx + 1:].copy()
        df.columns = [str(c) for c in raw.iloc[header_idx].tolist()]
        df = df.dropna(axis=1, how="all").dropna(how="all")
        colmap = map_columns(list(df.columns), spec["columns"])
        if not all(req in colmap for req in spec["required"]):
            continue
        tidy = df[[colmap[k] for k in colmap]].copy()
        tidy.columns = list(colmap.keys())
        tidy = tidy[tidy["hospital"].notna()]
        tidy = tidy[~tidy["hospital"].map(norm).isin(("", "nan", "total", "all hospitals"))]

        # Wide infections layout: one column per organism -> unpivot.
        if name == "infections" and "infection_type" not in tidy.columns:
            type_cols = [c for c in df.columns
                         if any(t in norm(c) for t in INFECTION_TYPE_HEADERS)]
            if type_cols:
                keep = [c for c in ("hospital", "provider", "region", "period", "bed_days")
                        if c in tidy.columns]
                wide = pd.concat([tidy[keep].reset_index(drop=True),
                                  df[type_cols].reset_index(drop=True)], axis=1)
                tidy = wide.melt(id_vars=keep, var_name="infection_type",
                                 value_name="infection_count")

        tidy["source_file"] = path.name
        tidy["source_sheet"] = sheet
        frames.append(tidy)

    if inspect or not frames:
        return None if not frames else pd.concat(frames, ignore_index=True)
    return pd.concat(frames, ignore_index=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inspect", action="store_true",
                        help="list sheets and leading cells of each workbook, then exit")
    args = parser.parse_args()

    files = sorted(RAW_DIR.glob("*.xlsx"))
    if not files:
        print(f"No .xlsx files found in {RAW_DIR}.\n"
              "Download the PHIN datasheets first — see data/raw/README.md.")
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    facts: dict[str, pd.DataFrame] = {}
    unmatched = []

    for path in files:
        fname = norm(path.name)
        dataset = next((d for d, spec in DATASETS.items()
                        if any(k in fname for k in spec["file_keywords"])), None)
        if dataset is None:
            unmatched.append(path.name)
            continue
        print(f"{path.name} -> {dataset}")
        result = load_dataset(path, dataset, DATASETS[dataset], args.inspect)
        if args.inspect:
            continue
        if result is None or result.empty:
            print(f"  !! no mappable data sheet found in {path.name}. "
                  "Run with --inspect and extend the KEYWORD tables in this script.")
            continue
        facts[dataset] = pd.concat([facts[dataset], result], ignore_index=True) \
            if dataset in facts else result
        print(f"  {len(result)} rows")

    if unmatched:
        print("Skipped (file name matched no dataset):", ", ".join(unmatched))
    if args.inspect:
        return 0
    if not facts:
        print("Nothing extracted — no output written.")
        return 1

    # Rename to the canonical output names shared with the Power Query route.
    for dataset, df in facts.items():
        renames = dict(OUTPUT_NAMES)
        renames["event_count"] = COUNT_NAMES.get(dataset, "EventCount")
        facts[dataset] = df.rename(columns=renames)

    # Shared hospital dimension across all facts.
    dim_cols = ["Hospital", "Provider", "Region"]
    dims = [df[[c for c in dim_cols if c in df.columns]] for df in facts.values()]
    dim_hospital = (pd.concat(dims, ignore_index=True)
                    .dropna(subset=["Hospital"])
                    .drop_duplicates(subset=["Hospital"])
                    .sort_values("Hospital")
                    .reset_index(drop=True))
    dim_hospital.insert(0, "HospitalKey", dim_hospital.index + 1)
    dim_hospital.to_csv(OUT_DIR / "dim_hospital.csv", index=False)
    print(f"dim_hospital.csv: {len(dim_hospital)} hospitals")

    for dataset, df in facts.items():
        out = OUT_DIR / f"fact_{dataset}.csv"
        df.to_csv(out, index=False)
        print(f"{out.name}: {len(df)} rows")
    return 0


if __name__ == "__main__":
    sys.exit(main())
