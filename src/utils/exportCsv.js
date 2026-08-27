// Lightweight client-side CSV export — no new dependency required.
// `columns`: [{ label: "Company", value: (row) => row.companyName }]
// `rows`: array of data objects
export function exportToCsv(filename, columns, rows) {
  const escapeCell = (value) => {
    const str = value === null || value === undefined ? "" : String(value)
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headerLine = columns.map((col) => escapeCell(col.label)).join(",")
  const dataLines = rows.map((row) =>
    columns.map((col) => escapeCell(col.value(row))).join(",")
  )
  const csvContent = [headerLine, ...dataLines].join("\r\n")

  // Prepend BOM so Excel opens UTF-8 (e.g. ₹, names with accents) correctly
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
