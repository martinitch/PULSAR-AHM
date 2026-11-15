/* One-page PDF, generated in the browser (Helvetica, WinAnsi). No library. */

const WIN: Record<string, string> = {
  "é": "\\351", "è": "\\350", "ê": "\\352", "ë": "\\353",
  "à": "\\340", "â": "\\342", "ä": "\\344", "ù": "\\371", "û": "\\373", "ü": "\\374",
  "ô": "\\364", "ö": "\\366", "î": "\\356", "ï": "\\357", "ç": "\\347",
  "É": "\\311", "È": "\\310", "Ê": "\\312", "À": "\\300", "Ç": "\\307",
  "œ": "oe", "Œ": "OE", "’": "'", "‘": "'", "—": "-", "–": "-", "·": "\\267",
  "«": "\"", "»": "\"",
};

function pdfEscape(s: string) {
  return s.replace(/[()\\]/g, (c) => `\\${c}`).replace(/[^\x20-\x7E]/g, (ch) => WIN[ch] ?? "?");
}

/** Downloads a text PDF (one page). */
export function downloadPdf(filename: string, lines: string[]) {
  const stream = lines.slice(0, 40).map((line, i) => `BT /F1 11 Tf 48 ${750 - i * 16} Td (${pdfEscape(line)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
