// Stable, numeric-aware sort used by every table's clickable column headers.
// `getValue(row)` returns the raw value to compare for the active sort key.
export function sortRows(rows, direction, getValue) {
  if (!direction) return rows

  const withIndex = rows.map((row, index) => ({ row, index }))

  withIndex.sort((a, b) => {
    const va = getValue(a.row)
    const vb = getValue(b.row)

    const na = typeof va === "string" ? va.trim() : va
    const nb = typeof vb === "string" ? vb.trim() : vb

    const emptyA = na === "" || na == null
    const emptyB = nb === "" || nb == null
    if (emptyA && emptyB) return a.index - b.index
    if (emptyA) return 1
    if (emptyB) return -1

    const numA = Number(na)
    const numB = Number(nb)
    let cmp
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      cmp = numA - numB
    } else {
      cmp = String(na).toLowerCase().localeCompare(String(nb).toLowerCase())
    }
    if (cmp === 0) return a.index - b.index
    return direction === "asc" ? cmp : -cmp
  })

  return withIndex.map((e) => e.row)
}

// Cycles a column's sort state: unsorted -> asc -> desc -> unsorted.
export function nextSortDirection(sortConfig, key) {
  if (sortConfig.key !== key) return "asc"
  if (sortConfig.direction === "asc") return "desc"
  return null
}
