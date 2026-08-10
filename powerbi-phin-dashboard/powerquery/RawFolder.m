// Query name: fnLoadPhin
// ---------------------------------------------------------------
// Shared loader for the PHIN datasheet workbooks in data/raw/.
//
// 1. Create a Power BI *parameter* named RawFolder (type Text) whose value
//    is the absolute path of powerbi-phin-dashboard/data/raw on your machine,
//    e.g.  C:\repos\placeholdr\powerbi-phin-dashboard\data\raw
// 2. Create a Blank Query, open Advanced Editor, paste this file, and name
//    the query fnLoadPhin.
// 3. Paste each dataset query (AdverseEvents.m, PatientFeedback.m,
//    NeverEvents.m, Infections.m) as its own query.
//
// fnLoadPhin(fileKeyword) finds the workbook whose file name contains the
// keyword, scans every sheet for the first row containing "Hospital" (the
// header row), promotes it, and appends all matching sheets.
// ---------------------------------------------------------------
(fileKeyword as text) as table =>
let
    Files = Folder.Files(RawFolder),
    Match = Table.SelectRows(Files, each
        Text.Contains(Text.Lower([Name]), Text.Lower(fileKeyword))
        and [Extension] = ".xlsx"),
    Book = Excel.Workbook(Match{0}[Content], false),
    Sheets = Table.SelectRows(Book, each [Kind] = "Sheet"),

    LoadSheet = (sheetData as table) as nullable table =>
        let
            HeaderIdx = List.PositionOf(
                List.Transform(
                    Table.ToRows(Table.FirstN(sheetData, 25)),
                    each List.AnyTrue(List.Transform(_, (c) =>
                        c <> null and Text.Contains(Text.Lower(Text.From(c)), "hospital")))),
                true),
            Result =
                if HeaderIdx < 0 then null
                else
                    let
                        Trimmed = Table.Skip(sheetData, HeaderIdx),
                        Promoted = Table.PromoteHeaders(Trimmed, [PromoteAllScalars = true]),
                        NoNullCols = Table.SelectColumns(Promoted,
                            List.Select(Table.ColumnNames(Promoted),
                                each not Text.StartsWith(_, "Column"))),
                        HospitalCol = List.First(List.Select(Table.ColumnNames(NoNullCols),
                            each Text.Contains(Text.Lower(_), "hospital")
                              or Text.Contains(Text.Lower(_), "site"))),
                        NoBlanks = Table.SelectRows(NoNullCols, each
                            Record.Field(_, HospitalCol) <> null
                            and not List.Contains({"total", "all hospitals"},
                                Text.Lower(Text.Trim(Text.From(Record.Field(_, HospitalCol))))))
                    in
                        NoBlanks
        in
            Result,

    Loaded = List.RemoveNulls(
        List.Transform(Sheets[Data], each LoadSheet(_))),
    Combined = if List.Count(Loaded) = 0
        then error "No sheet with a 'Hospital' header row found — open the workbook and check its layout."
        else Table.Combine(Loaded)
in
    Combined
