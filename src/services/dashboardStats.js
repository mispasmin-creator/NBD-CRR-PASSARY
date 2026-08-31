// Live dashboard aggregation — pulls the same Google Sheets each module page reads from
// and reduces every row to a Total / Pending / In Progress / Completed / Delayed count
// using the exact same stage/status rules each page already uses (ported, not guessed).
import axios from "axios"

const getScriptUrl = () => import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL

const fetchSheet = async (sheetName) => {
  const scriptUrl = getScriptUrl()
  if (!scriptUrl || !sheetName) return null
  try {
    const res = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`)
    if (res.data?.success && Array.isArray(res.data.data)) return res.data.data
    return null
  } catch {
    return null
  }
}

// Case/space/punctuation-insensitive header match — exact match first, substring fallback.
const findCol = (headers, names, fallback = -1) => {
  if (!headers || headers.length === 0) return fallback
  const clean = (s) => String(s || "").trim().toLowerCase().replace(/[\s_.\-]+/g, "")
  const targets = (Array.isArray(names) ? names : [names]).map(clean)
  let idx = headers.findIndex((h) => targets.includes(clean(h)))
  if (idx === -1) idx = headers.findIndex((h) => targets.some((t) => clean(h).includes(t)))
  return idx !== -1 ? idx : fallback
}

const detectHeaderRow = (rows, signatures, maxScan = 10, fallbackIdx = 0) => {
  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const row = (rows[i] || []).map((c) => String(c || "").trim().toLowerCase())
    if (signatures.some((sig) => row.some((cell) => cell.includes(sig)))) return i
  }
  return fallbackIdx
}

const isNonEmptyRow = (row) => Array.isArray(row) && row.some((c) => c !== null && c !== undefined && String(c).trim() !== "")

const parseFlexibleDate = (val) => {
  if (!val) return null
  const s = String(val).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s)
    return isNaN(d) ? null : d
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m) {
    let [, dd, mm, yyyy] = m
    if (yyyy.length === 2) yyyy = `20${yyyy}`
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
    return isNaN(d) ? null : d
  }
  return null
}

const isOverdue = (val) => {
  const d = parseFlexibleDate(val)
  if (!d) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

const isCancelledOrRejected = (...values) =>
  values.some((val) => {
    if (!val) return false
    const str = String(val).trim().toLowerCase()
    return str.includes("cancel") || str.includes("reject") || str.includes("regret")
  })

const emptyResult = (key, label, route, icon, chips) => ({
  key, label, route, icon, chips,
  total: 0, pending: 0, inProgress: 0, completed: 0, delayed: 0,
  dates: [],
  available: false,
})

// Collect parsed creation dates from a fixed timestamp column (col 0 by convention in this app).
const collectDates = (dataRows, tsIdx = 0) =>
  dataRows.map((row) => parseFlexibleDate(row[tsIdx])).filter(Boolean)

// ── NBD Lead (FMS sheet) ─────────────────────────────────────────────────────
function computeLeadsStats(rows) {
  const chips = ["pending", "completed", "delayed"]
  if (!rows) return emptyResult("leads", "NBD Lead", "/leads", "UsersIcon", chips)

  const dataRows = rows.slice(6).filter((r) => r && r[0])
  let pendingNew = 0, pendingUpdate = 0, pendingCallTracking = 0, converted = 0, notConverted = 0
  dataRows.forEach((row) => {
    const trackerEnquiry = String(row[17] || "").trim()
    if (trackerEnquiry === "Yes") { converted++; return }
    if (trackerEnquiry === "Cancel") { notConverted++; return }
    const colI = String(row[8] || "").trim()
    const colJ = String(row[9] || "").trim()
    if (!colI) { pendingNew++; return }
    if (!colJ) { pendingUpdate++; return }
    pendingCallTracking++
  })

  return {
    key: "leads", label: "NBD Lead", route: "/leads", icon: "UsersIcon", chips,
    total: dataRows.length,
    pending: pendingNew + pendingUpdate + pendingCallTracking,
    inProgress: 0,
    completed: converted,
    delayed: notConverted,
    dates: collectDates(dataRows),
    available: true,
  }
}

// ── CRR Enquiry (ENQUIRY FMS sheet) ──────────────────────────────────────────
const crrStageIdx = (headers) => ({
  p1: findCol(headers, ["Planned 1", "Planned1"], 14),
  a1: findCol(headers, ["Actual 1", "Actual1"], 15),
  p2: findCol(headers, ["Planned 2", "Planned2"], 20),
  a2: findCol(headers, ["Actual 2", "Actual2"], 21),
  s2: findCol(headers, ["Status 2", "Status2"], 24),
  p4: findCol(headers, ["Planned 4", "Planned4"], 29),
})

const isOrderNotReceivedText = (v) => String(v || "").trim().toLowerCase().replace(/[\s_-]+/g, "").includes("notreceive")

function getCrrStage(row, idx) {
  const filled = (v) => v && String(v).trim() !== ""
  if (filled(row[idx.p1]) && !filled(row[idx.a1])) return "Give Rates"
  if ((filled(row[idx.p2]) || filled(row[idx.a1])) && !filled(row[idx.a2])) return "Send Offer"
  if (filled(row[idx.a2])) return isOrderNotReceivedText(row[idx.s2]) ? "Order Not Received" : "Get Order"
  if (filled(row[idx.p4])) return "Order Not Received"
  return "Completed"
}

function computeCrrStats(rows) {
  const chips = ["pending", "inProgress", "completed", "delayed"]
  if (!rows) return emptyResult("crr", "CRR Enquiry", "/crr-enquiry", "RetentionIcon", chips)

  const headerIdx = detectHeaderRow(rows, ["enquiry number", "enquiry no", "firm name"], 10, 5)
  const headers = rows[headerIdx] || []
  const dataRows = rows.slice(headerIdx + 1).filter(isNonEmptyRow)
  const idx = crrStageIdx(headers)

  let giveRates = 0, sendOffer = 0, getOrder = 0, notReceived = 0, completed = 0
  dataRows.forEach((row) => {
    switch (getCrrStage(row, idx)) {
      case "Give Rates": giveRates++; break
      case "Send Offer": sendOffer++; break
      case "Get Order": getOrder++; break
      case "Order Not Received": notReceived++; break
      default: completed++
    }
  })

  return {
    key: "crr", label: "CRR Enquiry", route: "/crr-enquiry", icon: "RetentionIcon", chips,
    total: dataRows.length,
    pending: giveRates,
    inProgress: sendOffer,
    completed: getOrder + completed,
    delayed: notReceived,
    dates: collectDates(dataRows),
    available: true,
  }
}

// ── NBD Enquiry (NBD ENQUIRY FMS sheet, "Tracker Status" field) ─────────────
function computeNbdEnquiryStats(rows) {
  const chips = ["pending", "completed", "delayed"]
  if (!rows) return emptyResult("nbdEnquiry", "NBD Enquiry", "/call-tracker", "BarChartIcon", chips)

  const headerIdx = detectHeaderRow(rows, ["enquiry no."], 10, 4)
  const headers = rows[headerIdx] || []
  const dataRows = rows.slice(headerIdx + 1).filter(isNonEmptyRow)
  const statusIdx = findCol(headers, ["Tracker Status"], -1)
  const tsIdx = findCol(headers, ["Timestamp"], 0)

  let pending = 0, received = 0, notReceived = 0
  dataRows.forEach((row) => {
    const st = statusIdx >= 0 ? String(row[statusIdx] || "").trim() : ""
    if (st === "Yes") received++
    else if (st === "Tracker No" || st === "No") notReceived++
    else pending++
  })

  return {
    key: "nbdEnquiry", label: "NBD Enquiry", route: "/call-tracker", icon: "BarChartIcon", chips,
    total: dataRows.length, pending, inProgress: 0, completed: received, delayed: notReceived,
    dates: collectDates(dataRows, tsIdx),
    available: true,
  }
}

// ── Offer (NBD OFFER FMS sheet) — fixed pipeline in real workflow order ─────
const OFFER_STAGES = [
  { pIdx: 6, aIdx: 7 },   // Get Rates
  { pIdx: 10, aIdx: 11 }, // Accounts Check
  { pIdx: 15, aIdx: 16 }, // Sales Check
  { pIdx: 20, aIdx: 21 }, // Tech Discussion
  { pIdx: 25, aIdx: 26 }, // Send Offer Letter
]

function getOfferStageIndex(row) {
  for (let i = 0; i < OFFER_STAGES.length; i++) {
    const { pIdx, aIdx } = OFFER_STAGES[i]
    if (String(row[pIdx] || "").trim() && !String(row[aIdx] || "").trim()) return i
  }
  const lastA = String(row[OFFER_STAGES[OFFER_STAGES.length - 1].aIdx] || "").trim()
  return lastA ? -1 : 0
}

function computeOfferStats(rows) {
  const chips = ["pending", "inProgress", "completed", "delayed"]
  if (!rows) return emptyResult("offer", "Offer", "/offer", "FileTextIcon", chips)

  const headerIdx = detectHeaderRow(rows, ["enquiry no.", "enquiry no", "firm name"], 10, 0)
  const dataRows = rows.slice(headerIdx + 1).filter(isNonEmptyRow)

  let pending = 0, inProgress = 0, completed = 0, delayed = 0
  dataRows.forEach((row) => {
    const stageIdx = getOfferStageIndex(row)
    if (stageIdx === -1) { completed++; return }
    const { pIdx } = OFFER_STAGES[stageIdx]
    if (isOverdue(row[pIdx])) { delayed++; return }
    if (stageIdx <= 1) pending++
    else inProgress++
  })

  return {
    key: "offer", label: "Offer", route: "/offer", icon: "FileTextIcon", chips,
    total: dataRows.length, pending, inProgress, completed, delayed,
    dates: collectDates(dataRows),
    available: true,
  }
}

// ── Customer Complaint (Complaint Tracker sheet) ─────────────────────────────
const COMPLAINT_COLS = { p1: 8, a1: 9, action1: 12, p2: 13, a2: 14, p3: 15, a3: 16, a4: 18, statusSolved: 19, action3: 22 }

function getComplaintStep(row) {
  const val = (i) => String(row[i] || "").trim()
  const action1 = val(COMPLAINT_COLS.action1).toLowerCase()
  const statusOfSolved = val(COMPLAINT_COLS.statusSolved).toLowerCase()
  if (action1 === "reject" || statusOfSolved === "rejected") return { step: "History", rejected: true }

  const action3 = val(COMPLAINT_COLS.action3).toLowerCase()
  const a2 = val(COMPLAINT_COLS.a2), a3 = val(COMPLAINT_COLS.a3), a4 = val(COMPLAINT_COLS.a4)
  const isSolved = ["problem solved", "solved", "yes"].includes(statusOfSolved) || action3 === "problem solved"
  if (isSolved && (a2 || a3 || a4)) return { step: "History", rejected: false }

  if (["still pending", "not solved"].includes(statusOfSolved) || ["still pending", "not solved"].includes(action3)) {
    return { step: "Problem Not Solve Next Action", rejected: false, plannedIdx: COMPLAINT_COLS.p3 }
  }

  const a1 = val(COMPLAINT_COLS.a1)
  if (!a1) return { step: "Problem Assigned", rejected: false, plannedIdx: COMPLAINT_COLS.p1 }
  if (!a2) return { step: "Site Report", rejected: false, plannedIdx: COMPLAINT_COLS.p2 }
  return { step: "Problem Not Solve Next Action", rejected: false, plannedIdx: COMPLAINT_COLS.p3 }
}

function computeComplaintStats(rows) {
  const chips = ["pending", "inProgress", "completed", "delayed"]
  if (!rows) return emptyResult("complaint", "Customer Complaint", "/customer-complaint", "MessageSquareIcon", chips)

  const headerIdx = detectHeaderRow(rows, ["complaint no.", "complaint no", "firm name"], 10, 0)
  const dataRows = rows.slice(headerIdx + 1).filter(isNonEmptyRow)

  let pending = 0, inProgress = 0, completed = 0, delayed = 0
  dataRows.forEach((row) => {
    const { step, rejected } = getComplaintStep(row)
    if (step === "History") { rejected ? delayed++ : completed++; return }
    if (step === "Problem Assigned") { pending++; return }
    if (step === "Site Report") { inProgress++; return }
    delayed++ // "Problem Not Solve Next Action" — looped past first resolution attempt
  })

  return {
    key: "complaint", label: "Customer Complaint", route: "/customer-complaint", icon: "MessageSquareIcon", chips,
    total: dataRows.length, pending, inProgress, completed, delayed,
    dates: collectDates(dataRows),
    available: true,
  }
}

// ── Marketing Visit Tracker (Marketing Visit sheet) ──────────────────────────
function computeMarketingStats(rows) {
  const chips = ["pending", "completed", "delayed"]
  if (!rows) return emptyResult("marketing", "Marketing Visit", "/marketing-visit-tracker", "MapPinIcon", chips)

  const headerIdx = detectHeaderRow(rows, ["actual", "planned"], 10, 0)
  const headers = rows[headerIdx] || []
  const dataRows = rows.slice(headerIdx + 1).filter(isNonEmptyRow)
  const actualIdx = findCol(headers, ["Actual"], 14)
  const statusIdx = findCol(headers, ["Status"], -1)
  const remarkIdx = findCol(headers, ["Remark", "Remarks"], -1)
  const tsIdx = findCol(headers, ["Timestamp"], 0)

  let pending = 0, completed = 0, cancelled = 0
  dataRows.forEach((row) => {
    const status = statusIdx >= 0 ? row[statusIdx] : ""
    const remark = remarkIdx >= 0 ? row[remarkIdx] : ""
    if (isCancelledOrRejected(status, remark)) { cancelled++; return }
    const actual = String(row[actualIdx] || "").trim()
    actual ? completed++ : pending++
  })

  return {
    key: "marketing", label: "Marketing Visit", route: "/marketing-visit-tracker", icon: "MapPinIcon", chips,
    total: dataRows.length, pending, inProgress: 0, completed, delayed: cancelled,
    dates: collectDates(dataRows, tsIdx),
    available: true,
  }
}

// ── Order Not Received — own sheet pipeline + not-yet-logged pull from FMS/NBD/CRR ──
function computeOrderNotReceivedStats(onrRows, fmsRows, nbdEnquiryRows, crrRows) {
  const chips = ["pending", "inProgress", "completed"]
  const key = "orderNotReceived", label = "Order Not Received", route = "/order-not-received-fms", icon = "XCircleIcon"
  if (!onrRows && !fmsRows && !nbdEnquiryRows && !crrRows) return emptyResult(key, label, route, icon, chips)

  const headerIdx = onrRows ? detectHeaderRow(onrRows, ["onr-00", "why us not received order", "enquiry no of fms"], 10, 0) : 0
  const dataRows = onrRows ? onrRows.slice(headerIdx + 1).filter(isNonEmptyRow) : []

  const submitted = new Set()
  let getSample = 0, testing = 0, takeAction = 0, history = 0
  dataRows.forEach((row) => {
    const enquiryNo = String(row[2] || "").trim().toLowerCase()
    const onrNo = String(row[1] || "").trim().toLowerCase()
    if (enquiryNo) submitted.add(enquiryNo)
    if (onrNo) submitted.add(onrNo)
    const status1 = String(row[17] || "").trim()
    const actual2 = String(row[19] || "").trim()
    const actual3 = String(row[22] || "").trim()
    if (actual3) { history++; return }
    if (actual2) { takeAction++; return }
    if (status1) { testing++; return }
    getSample++
  })

  let notLogged = 0
  if (fmsRows) {
    fmsRows.slice(6).forEach((row) => {
      if (row && row[0] && String(row[18] || "").trim() === "Cancel") {
        const id = String(row[1] || "").trim().toLowerCase()
        if (!id || !submitted.has(id)) notLogged++
      }
    })
  }
  if (nbdEnquiryRows) {
    const headerIdx2 = detectHeaderRow(nbdEnquiryRows, ["enquiry no."], 10, 4)
    const headers2 = nbdEnquiryRows[headerIdx2] || []
    const idIdx = findCol(headers2, ["Enquiry No."], -1)
    const statusIdx = findCol(headers2, ["Tracker Status"], -1)
    nbdEnquiryRows.slice(headerIdx2 + 1).filter(isNonEmptyRow).forEach((row) => {
      const st = statusIdx >= 0 ? String(row[statusIdx] || "").trim() : ""
      if (st === "Tracker No" || st === "No") {
        const id = idIdx >= 0 ? String(row[idIdx] || "").trim().toLowerCase() : ""
        if (!id || !submitted.has(id)) notLogged++
      }
    })
  }
  if (crrRows) {
    const headerIdx3 = detectHeaderRow(crrRows, ["enquiry number", "enquiry no", "firm name"], 10, 5)
    const headers3 = crrRows[headerIdx3] || []
    const idx = crrStageIdx(headers3)
    const idIdx = findCol(headers3, ["Enquiry Number", "Enquiry No"], 1)
    crrRows.slice(headerIdx3 + 1).filter(isNonEmptyRow).forEach((row) => {
      if (getCrrStage(row, idx) === "Order Not Received") {
        const id = String(row[idIdx] || "").trim().toLowerCase()
        if (!id || !submitted.has(id)) notLogged++
      }
    })
  }

  return {
    key, label, route, icon, chips,
    total: dataRows.length + notLogged,
    pending: notLogged,
    inProgress: getSample + testing + takeAction,
    completed: history,
    delayed: 0,
    dates: collectDates(dataRows),
    available: Boolean(onrRows),
  }
}

// Bucket a flat list of dates into the last N calendar months (oldest → newest, zero-filled).
function bucketMonthly(allDates, monthsBack = 6) {
  const now = new Date()
  const buckets = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString("en-US", { month: "short" }), count: 0 })
  }
  allDates.forEach((d) => {
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth())
    if (bucket) bucket.count++
  })
  return buckets.map(({ label, count }) => ({ month: label, count }))
}

// ── Orchestrator ──────────────────────────────────────────────────────────
export async function fetchDashboardOverview() {
  const fmsSheetName = import.meta.env.VITE_FMS_SHEET_NAME
  const crrSheetName = import.meta.env.VITE_CRR_ENQUIRY_SHEET_NAME || "ENQUIRY FMS"
  const nbdEnquirySheetName = import.meta.env.VITE_NBD_ENQUIRY_SHEET_NAME || "NBD ENQUIRY FMS"
  const offerSheetName = import.meta.env.VITE_NBD_OFFER_FMS_SHEET_NAME
  const complaintSheetName = import.meta.env.VITE_COMPLAINT_TRACKER_SHEET_NAME
  const marketingSheetName = import.meta.env.VITE_MARKETING_VISIT_SHEET_NAME
  const onrSheetName = import.meta.env.VITE_ORDER_NOT_RECEIVED_SHEET_NAME || "Order Not Received"

  const [fmsRows, crrRows, nbdEnquiryRows, offerRows, complaintRows, marketingRows, onrRows] = await Promise.all([
    fetchSheet(fmsSheetName),
    fetchSheet(crrSheetName),
    fetchSheet(nbdEnquirySheetName),
    fetchSheet(offerSheetName),
    fetchSheet(complaintSheetName),
    fetchSheet(marketingSheetName),
    fetchSheet(onrSheetName),
  ])

  const modules = [
    computeLeadsStats(fmsRows),
    computeCrrStats(crrRows),
    computeNbdEnquiryStats(nbdEnquiryRows),
    computeOfferStats(offerRows),
    computeComplaintStats(complaintRows),
    computeMarketingStats(marketingRows),
    computeOrderNotReceivedStats(onrRows, fmsRows, nbdEnquiryRows, crrRows),
  ]

  const totals = modules.reduce(
    (acc, m) => ({
      total: acc.total + m.total,
      pending: acc.pending + m.pending,
      inProgress: acc.inProgress + m.inProgress,
      completed: acc.completed + m.completed,
      delayed: acc.delayed + m.delayed,
    }),
    { total: 0, pending: 0, inProgress: 0, completed: 0, delayed: 0 }
  )

  const allDates = modules.flatMap((m) => m.dates)
  const monthlyTrend = bucketMonthly(allDates, 6)

  return { modules, totals, monthlyTrend, fetchedAt: new Date() }
}
