import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/google-assets");
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Registrations");

sheet.showGridLines = false;

sheet.getRange("A1:G1").values = [[
  "Timestamp",
  "First Name",
  "Last Name",
  "Email",
  "Phone Number",
  "Organization",
  "Consent Status",
]];

sheet.getRange("A1:G1").format.fill.color = "#153F46";
sheet.getRange("A1:G1").format.font.color = "#FFFFFF";
sheet.getRange("A1:G1").format.font.bold = true;
sheet.getRange("A1:G1").format.font.size = 11;
sheet.getRange("A1:G1").format.wrapText = true;
sheet.getRange("A1:G1").format.borders = {
  preset: "bottom",
  style: "medium",
  color: "#D4A056",
};

sheet.getRange("A2:G251").format.borders = {
  preset: "inside",
  style: "thin",
  color: "#E3E8EA",
};
sheet.getRange("A2:G251").format.font.color = "#203237";
sheet.getRange("A2:G251").format.font.size = 10;
sheet.getRange("A:A").format.columnWidth = 22;
sheet.getRange("B:C").format.columnWidth = 18;
sheet.getRange("D:D").format.columnWidth = 30;
sheet.getRange("E:E").format.columnWidth = 18;
sheet.getRange("F:F").format.columnWidth = 28;
sheet.getRange("G:G").format.columnWidth = 20;
sheet.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm");
sheet.getRange("A1:G1").format.rowHeight = 30;
sheet.freezePanes.freezeRows(1);

const check = await workbook.inspect({
  kind: "table",
  range: "Registrations!A1:G6",
  include: "values",
  tableMaxRows: 6,
  tableMaxCols: 7,
  maxChars: 2000,
});
console.log(check.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
const outputPath = path.join(outputDir, "ceali-conference-registrations.xlsx");
await output.save(outputPath);
console.log(outputPath);
