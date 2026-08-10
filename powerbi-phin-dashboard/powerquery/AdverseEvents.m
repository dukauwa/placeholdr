// Query name: FactAdverseEvents
// Requires the fnLoadPhin function and RawFolder parameter (see RawFolder.m).
// Loads the Hospital Reported Adverse Events datasheet.
let
    Source = fnLoadPhin("adverse"),
    // Rename whatever PHIN called the key columns to canonical names.
    // Table.TransformColumnNames keeps columns we don't recognise untouched.
    Canonical = Table.TransformColumnNames(Source, each
        let l = Text.Lower(_) in
        if Text.Contains(l, "hospital") or Text.Contains(l, "site") then "Hospital"
        else if Text.Contains(l, "provider") or Text.Contains(l, "group") then "Provider"
        else if Text.Contains(l, "region") or Text.Contains(l, "country") then "Region"
        else if Text.Contains(l, "period") or Text.Contains(l, "reporting") then "Period"
        else if Text.Contains(l, "category") or Text.Contains(l, "event type") then "EventCategory"
        else if Text.Contains(l, "adverse") or Text.Contains(l, "number of events") or l = "count" then "AdverseEvents"
        else if Text.Contains(l, "episode") or Text.Contains(l, "admission") then "Episodes"
        else _),
    Typed = Table.TransformColumnTypes(Canonical,
        List.Transform(
            List.Intersect({Table.ColumnNames(Canonical), {"AdverseEvents", "Episodes"}}),
            each {_, type nullable number}))
in
    Typed
