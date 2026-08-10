// Query name: FactPatientFeedback
// Requires the fnLoadPhin function and RawFolder parameter (see RawFolder.m).
// Loads the Patient Feedback / Satisfaction datasheet.
let
    Source = fnLoadPhin("feedback"),
    // If PHIN names the file "satisfaction" instead, change the keyword above.
    Canonical = Table.TransformColumnNames(Source, each
        let l = Text.Lower(_) in
        if Text.Contains(l, "hospital") or Text.Contains(l, "site") then "Hospital"
        else if Text.Contains(l, "provider") or Text.Contains(l, "group") then "Provider"
        else if Text.Contains(l, "region") or Text.Contains(l, "country") then "Region"
        else if Text.Contains(l, "period") or Text.Contains(l, "reporting") then "Period"
        else if Text.Contains(l, "recommend") then "PctRecommend"
        else if Text.Contains(l, "response") or Text.Contains(l, "survey") or Text.Contains(l, "sample") then "Responses"
        else if Text.Contains(l, "rating") or Text.Contains(l, "score") then "AvgRating"
        else _),
    Typed = Table.TransformColumnTypes(Canonical,
        List.Transform(
            List.Intersect({Table.ColumnNames(Canonical), {"PctRecommend", "Responses", "AvgRating"}}),
            each {_, type nullable number}))
in
    Typed
