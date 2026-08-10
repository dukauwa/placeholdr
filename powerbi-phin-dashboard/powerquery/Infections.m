// Query name: FactInfections
// Requires the fnLoadPhin function and RawFolder parameter (see RawFolder.m).
// Loads the Infections (HCAI) datasheet. Handles both layouts PHIN has used:
//   long  — an "Infection type" column with a count column, or
//   wide  — one column per organism (MRSA, MSSA, E. coli, C. difficile, ...),
//           which this query unpivots into InfectionType/Infections rows.
let
    Source = fnLoadPhin("infection"),
    Canonical = Table.TransformColumnNames(Source, each
        let l = Text.Lower(_) in
        if Text.Contains(l, "hospital") or Text.Contains(l, "site") then "Hospital"
        else if Text.Contains(l, "provider") or Text.Contains(l, "group") then "Provider"
        else if Text.Contains(l, "region") or Text.Contains(l, "country") then "Region"
        else if Text.Contains(l, "period") or Text.Contains(l, "reporting") then "Period"
        else if Text.Contains(l, "bed day") or Text.Contains(l, "bed-day") or Text.Contains(l, "bedday") then "BedDays"
        else if Text.Contains(l, "infection type") or Text.Contains(l, "organism") then "InfectionType"
        else if Text.Contains(l, "per 100") then "PublishedRatePer100k"
        else if Text.Contains(l, "number of infections") or Text.Contains(l, "cases") or l = "count" then "Infections"
        else _),
    OrganismCols = List.Select(Table.ColumnNames(Canonical), each
        List.AnyTrue(List.Transform(
            {"mrsa", "mssa", "e. coli", "e.coli", "difficile", "cdi", "klebsiella", "pseudomonas", "surgical site", "ssi"},
            (k) => Text.Contains(Text.Lower(_), k)))),
    Result =
        if Table.HasColumns(Canonical, "InfectionType") or List.Count(OrganismCols) = 0 then
            Canonical
        else
            Table.UnpivotOtherColumns(
                Table.SelectColumns(Canonical,
                    List.Intersect({Table.ColumnNames(Canonical),
                        {"Hospital", "Provider", "Region", "Period", "BedDays"} & OrganismCols})),
                List.Intersect({Table.ColumnNames(Canonical),
                    {"Hospital", "Provider", "Region", "Period", "BedDays"}}),
                "InfectionType", "Infections"),
    Typed = Table.TransformColumnTypes(Result,
        List.Transform(
            List.Intersect({Table.ColumnNames(Result), {"Infections", "BedDays", "PublishedRatePer100k"}}),
            each {_, type nullable number}))
in
    Typed
