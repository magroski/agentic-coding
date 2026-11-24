// Total of an invoice's lines, in currency units with two decimals.
export function invoiceTotal(lines) {
  const total = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  return Math.floor(total * 100) / 100;
}
