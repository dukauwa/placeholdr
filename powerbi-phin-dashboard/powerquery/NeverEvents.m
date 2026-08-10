// Query name: FactNeverEvents
// Requires the fnLoadPhin function and RawFolder parameter (see RawFolder.m).
// Loads the Never Events datasheet.
let
    Source = fnLoadPhin("never"),
    Canonical = Table.TransformColumnNames(Source, each
        let l = Text.Lower(_) in
        if Text.Contains(l, "hospital") or Text.Contains(l, "site") then "Hospital"
        else if Text.Contains(l, "provider") or Text.Contains(l, "group") then "Provider"
        else if Text.Contains(l, "region") or Text.Contains(l, "country") then "Region"
        else if Text.Contains(l, "period") or Text.Contains(l, "reporting") then "Period"
        else if Text.Contains(l, "category") or Text.Contains(l, "type") or Text.Contains(l, "description") then "EventCategory"
        else if Text.Contains(l, "never") or Text.Contains(l, "number of events") or l = "count" then "NeverEvents"
        else _),
    Typed = Table.TransformColumnTypes(Canonical,
        List.Transform(
            List.Intersect({Table.ColumnNames(Canonical), {"NeverEvents"}}),
            each {_, type nullable number}))
in
    Typed
