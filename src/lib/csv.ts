export function toCsv(rows: string[][]): string {
  const bom = "\uFEFF";
  const body = rows.map((row) => row.map(escapeCsvValue).join(";")).join("\r\n");
  return `${bom}${body}\r\n`;
}

function escapeCsvValue(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
