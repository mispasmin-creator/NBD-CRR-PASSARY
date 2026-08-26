"use client";

import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { AuthContext } from "../App";
import { MessageSquareIcon } from "../components/Icons";
import axios from "axios";

const STORAGE_KEY = "nbd_customer_complaints_tracker_data";

export const COMPLAINT_STEPS = [
  "Problem Assigned",
  "Site Report",
  "Problem Not Solve Next Action",
  "History",
];

const TABS = ["All Complaints", ...COMPLAINT_STEPS];

// Default headers exactly as specified by user
const DEFAULT_HEADERS = [
  "Timestamp",
  "Complaint No.",
  "Date",
  "Firm Name",
  "Customer Name",
  "Person Name (Complainer)",
  "Problem",
  "Complain Received By whom",
  "Planned 1",
  "Actual 1",
  "Person Assign Name 1",
  "Date Of Visit",
  "Action To Be Taken 1",
  "Planned 2",
  "Actual 2",
  "Planned 3",
  "Actual 3",
  "Planned 4",
  "Actual 4",
  "Status Of Solved",
  "Site Report",
  "Remark",
  "Action To Be Taken 3",
  "Next Date",
  "Freq",
];

// Helper to format date in Indian DD/MM/YYYY HH:mm:ss format exactly as requested: 30/06/2021 15:04:00
const formatIndianTimestamp = (dateObj = new Date()) => {
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  const seconds = String(dateObj.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// Helper to format ISO dates (like 2026-06-25T18:30:00.000Z) to clean display DD/MM/YYYY
const formatDisplayDate = (dStr) => {
  if (!dStr) return "";
  if (String(dStr).includes("T")) {
    const dt = new Date(dStr);
    if (!isNaN(dt)) {
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const yyyy = dt.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  return dStr;
};

// Helper to find exact column index dynamically regardless of sheet shifts
const findColIndex = (hdrs, possibleNames, defaultIdx) => {
  if (!hdrs || !Array.isArray(hdrs)) return defaultIdx;
  for (const name of possibleNames) {
    const cleanN = name.toLowerCase().trim().replace(/\.$/, "");
    const idx = hdrs.findIndex(
      (h) => String(h || "").toLowerCase().trim().replace(/\.$/, "") === cleanN
    );
    if (idx !== -1) return idx;
  }
  return defaultIdx;
};

export default function CustomerComplaint() {
  const { showNotification, currentUser } = useContext(AuthContext);
  const [complaints, setComplaints] = useState([]);
  const [activeTab, setActiveTab] = useState("All Complaints");
  const [searchQuery, setSearchQuery] = useState("");
  const [firmFilter, setFirmFilter] = useState("all");
  const [sheetHeaders, setSheetHeaders] = useState(DEFAULT_HEADERS);

  const [firmNamesList, setFirmNamesList] = useState([
    "Apex Industries Ltd",
    "Sterling Alloys Pvt Ltd",
    "Nova Tech Solutions",
    "Passary Group",
    "ABC Corp",
    "XYZ Ltd",
  ]);

  // Modals state
  const [showNewModal, setShowNewModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedComplaintIds, setSelectedComplaintIds] = useState([]);

  // Form states exactly matching requested fields (no auto fields shown)
  const [newForm, setNewForm] = useState({
    date: new Date().toISOString().split("T")[0],
    firmName: "",
    customerName: "",
    personName: "",
    problem: "",
    receivedBy: currentUser?.username || "Admin",
  });

  const [processForm, setProcessForm] = useState({
    remarks: "",
    assignedPerson: "",
    targetDate: "",
    isSolved: "No",
    personAssignName1: "",
    dateOfVisit: new Date().toISOString().split("T")[0],
    actionToBeTaken1: "",
    statusOfSolved: "No",
    siteReport: "",
    personAssignName3: "",
    dateOfVisit3: new Date().toISOString().split("T")[0],
    actionToBeTaken3: "",
  });

  // Fetch firm names dropdown from Master sheet
  const fetchMasterFirms = useCallback(async () => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    const masterSheet = import.meta.env.VITE_MASTER_SHEET_NAME || "Master";
    if (!scriptUrl) return;

    try {
      const res = await axios.get(`${scriptUrl}?sheet=${masterSheet}&t=${Date.now()}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const rows = res.data.data.slice(1);
        const firms = [...new Set(rows.map((r) => r[0]).filter(Boolean))];
        if (firms.length > 0) setFirmNamesList(firms);
      }
    } catch (err) {
      console.warn("Using default firm names list:", err.message);
    }
  }, []);

  // Determine FMS stage based on row cells and active headers
  const determineCurrentStep = (row, hdrs = DEFAULT_HEADERS) => {
    const getVal = (names, fallback) => {
      const idx = findColIndex(hdrs, names, fallback);
      return (idx !== -1 && row && row[idx]) ? String(row[idx]).trim() : "";
    };

    const p1 = getVal(["Planned 1"], 8);
    const a1 = getVal(["Actual 1"], 9);
    const action1 = getVal(["Action To Be Taken 1", "Action To Be Taken", "Action 1"], 12);
    const p2 = getVal(["Planned 2"], 13);
    const a2 = getVal(["Actual 2"], 14);
    const p3 = getVal(["Planned 3"], 15);
    const a3 = getVal(["Actual 3"], 16);
    const p4 = getVal(["Planned 4"], 17);
    const a4 = getVal(["Actual 4"], 18);
    const statusOfSolved = getVal(["Status  Of Solved", "Status Of Solved", "Status of Solved", "Status"], 19);

    // 0. If Action 1 is Reject or Status is Rejected -> History
    if (action1.toLowerCase() === "reject" || statusOfSolved.toLowerCase() === "rejected") {
      return "History";
    }

    const action3 = getVal(["Action To Be Taken 3", "Action To Be Taken", "Action 3"], 22);

    const isSolvedStatus =
      statusOfSolved.toLowerCase() === "problem solved" ||
      statusOfSolved.toLowerCase() === "solved" ||
      statusOfSolved.toLowerCase() === "yes" ||
      action3.toLowerCase() === "problem solved";

    // 1. If Status Of Solved is "Problem Solved" -> History
    if (isSolvedStatus && (a2 !== "" || a3 !== "" || a4 !== "")) {
      return "History";
    }

    // 2. If status is Still Pending or Not solved -> Loop in Problem Not Solve Next Action
    if (
      statusOfSolved.toLowerCase() === "still pending" ||
      statusOfSolved.toLowerCase() === "not solved" ||
      action3.toLowerCase() === "still pending" ||
      action3.toLowerCase() === "not solved"
    ) {
      return "Problem Not Solve Next Action";
    }

    // 3. Problem Not Solve Next Action (Planned 3 is filled, and not solved yet)
    if (p3 !== "") {
      return "Problem Not Solve Next Action";
    }

    // 4. Site Report (Planned 2 is filled, Actual 2 is empty)
    if (p2 !== "" && a2 === "") {
      return "Site Report";
    }

    // 5. Problem Assigned (Planned 1 is filled, Actual 1 is empty)
    if (p1 !== "" && a1 === "") {
      return "Problem Assigned";
    }

    // 6. If Actual 2 is filled and no pending stage -> History
    if (a2 !== "") {
      return "History";
    }

    return "Problem Assigned";
  };

  // Fetch sheet rows & detect headers dynamically
  const fetchComplaintTrackerData = useCallback(async () => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    const sheetName =
      import.meta.env.VITE_COMPLAINT_TRACKER_SHEET_NAME || "Complaint Tracker";
    if (!scriptUrl) return;

    try {
      const res = await axios.get(
        `${scriptUrl}?sheet=${sheetName}&t=${new Date().getTime()}`
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        const rawRows = res.data.data;
        let headerIdx = rawRows.findIndex(
          (r) =>
            Array.isArray(r) &&
            (r.includes("Complaint No.") ||
              r.includes("Complaint No") ||
              r.includes("Timestamp") ||
              r.includes("Firm Name"))
        );
        if (headerIdx === -1) headerIdx = 0;

        let curHeaders = DEFAULT_HEADERS;
        if (rawRows[headerIdx]) {
          const detectedHeaders = rawRows[headerIdx].map((h) =>
            String(h || "").trim()
          );
          setSheetHeaders(detectedHeaders);
          curHeaders = detectedHeaders;
        }

        const dataRows = rawRows.slice(headerIdx + 1);
        const mapped = dataRows
          .map((row, idx) => {
            if (!row || row.every((c) => !c)) return null;

            const getColVal = (names, defIdx) => {
              const cIdx = findColIndex(curHeaders, names, defIdx);
              return (cIdx !== -1 && row[cIdx]) ? String(row[cIdx]).trim() : "";
            };

            const complaintNo =
              getColVal(["Complaint No.", "Complaint No", "Complaint ID"], 1) ||
              `CO-${String(idx + 1).padStart(3, "0")}`;
            const tsVal = getColVal(["Timestamp"], 0);
            const dateVal = getColVal(["Date"], 2);
            const firmVal = getColVal(["Firm Name", "Firm"], 3);
            const custVal = getColVal(["Customer Name", "Customer"], 4);
            const personVal = getColVal(
              ["Person Name (Complainer)", "Person Name", "Complainer"],
              5
            );
            const probVal = getColVal(["Problem", "Issue"], 6);
            const rcvVal = getColVal(
              ["Complain Received By whom", "Complaint Received By whom", "Received By"],
              7
            );
            const planned1Val = getColVal(["Planned 1", "Planned1", "Plan 1"], 8);
            const actual1Val = getColVal(["Actual 1", "Actual1", "Act 1"], 9);
            const personAssignName1Val = getColVal(["Person Assign Name 1", "Person Assign Name", "Person Assign", "Assign Name 1", "Assigned Person 1", "Person Assigned 1", "Assign Person 1"], 10);
            const dateOfVisitVal = getColVal(["Date Of Visit", "Date Of Visite", "Date Of Visit 1", "Visit Date", "Date of Visit"], 11);
            const actionToBeTaken1Val = getColVal(["Action To Be Taken 1", "Action To Be Taken", "Action 1", "Action To be Taken 1"], 12);
            const planned2Val = getColVal(["Planned 2", "Planned2", "Plan 2"], 13);
            const actual2Val = getColVal(["Actual 2", "Actual2", "Act 2"], 14);
            const planned3Val = getColVal(["Planned 3", "Planned3", "Plan 3"], 15);
            const actual3Val = getColVal(["Actual 3", "Actual3", "Act 3"], 16);
            const planned4Val = getColVal(["Planned 4", "Planned4", "Plan 4"], 17);
            const actual4Val = getColVal(["Actual 4", "Actual4", "Act 4"], 18);
            const statusOfSolvedVal = getColVal(["Status  Of Solved", "Status Of Solved", "Status of Solved", "Status"], 19);
            const siteReportVal = getColVal(["Remark", "Remarks", "Site Report", "Site Report Remarks", "Report"], 20);
            const actionToBeTaken3Val = getColVal(["Action To Be Taken 3", "Action To Be Taken", "Action 3"], 22);
            const nextDateVal = getColVal(["Next Date", "Next Date Of Visit", "Date Of Visite", "Date Of Visit 3", "Date Of Visit"], 23);
            const freqVal = getColVal(["Freq", "Frequency", "Frequency Of Visit"], 24);

            return {
              id: complaintNo,
              timestamp: tsVal,
              date: dateVal,
              firmName: firmVal,
              customerName: custVal,
              personName: personVal,
              problem: probVal,
              receivedBy: rcvVal,
              planned1: planned1Val,
              actual1: actual1Val,
              personAssignName1: personAssignName1Val,
              dateOfVisit: dateOfVisitVal,
              actionToBeTaken1: actionToBeTaken1Val,
              planned2: planned2Val,
              actual2: actual2Val,
              planned3: planned3Val,
              actual3: actual3Val,
              planned4: planned4Val,
              actual4: actual4Val,
              statusOfSolved: statusOfSolvedVal,
              siteReport: siteReportVal,
              remark: siteReportVal,
              actionToBeTaken3: actionToBeTaken3Val,
              dateOfVisit3: nextDateVal,
              freq: freqVal || "0",
              currentStep: determineCurrentStep(row, curHeaders),
              rawRow: [...row],
              sheetRowIndex: headerIdx + 2 + idx,
            };
          })
          .filter(Boolean);

        // Deduplicate complaints by ID
        const seenComplaintNos = new Set();
        const uniqueComplaints = [];
        for (const c of mapped.reverse()) {
          if (!c || !c.id) continue;
          const normId = c.id.trim().toUpperCase();
          if (seenComplaintNos.has(normId)) continue;
          seenComplaintNos.add(normId);
          uniqueComplaints.push(c);
        }

        setComplaints(uniqueComplaints);
      }
    } catch (err) {
      console.warn("Sheet fetch failed:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchMasterFirms();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Storage clear error:", e);
    }
    fetchComplaintTrackerData();
  }, [fetchMasterFirms, fetchComplaintTrackerData]);

  useEffect(() => {
    setSelectedComplaintIds([]);
  }, [activeTab]);

  const saveComplaints = (newList) => {
    setComplaints(newList);
  };

  const syncToSheet = async (rowDataArray, actionType = "insert", rowIndex = null) => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    const sheetName =
      import.meta.env.VITE_COMPLAINT_TRACKER_SHEET_NAME || "Complaint Tracker";
    if (!scriptUrl) return;

    try {
      const payload = new URLSearchParams();
      payload.append("action", actionType);
      payload.append("sheetName", sheetName);
      payload.append("rowData", JSON.stringify(rowDataArray));
      if (rowIndex !== null) payload.append("rowIndex", String(rowIndex));
      const res = await axios.post(scriptUrl, payload);
      if (res.data && res.data.success === false) {
        throw new Error(res.data.error || "Sheet update was rejected by the server");
      }
    } catch (err) {
      console.warn("Background sync failed:", err.message);
      throw err;
    }
  };

  const syncToMarketingVisit = async (visitData) => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    const sheetName =
      import.meta.env.VITE_MARKETING_VISIT_SHEET_NAME || "Marketing Visit";
    const spreadsheetId =
      import.meta.env.VITE_SPREADSHEET_ID || "1aF5orXK7u4hI9b-19mO3eiUL6TWZ91GL9uqrEDag9Cc";
    if (!scriptUrl) return;

    let hdrs = [
      "Status Of Complaint",
      "Timestamp",
      "Task ID",
      "Visit Date",
      "Sales Person",
      "Name Of Plant",
      "Contact Person",
      "Designation",
      "Content Details",
      "Department",
      "Shutdown",
      "Remark",
      "Frequency Of Visit",
      "Planned",
      "Actual",
      "Delay",
      "Status",
    ];

    try {
      const resHeaders = await axios.get(
        `${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&spreadsheetId=${spreadsheetId}&t=${Date.now()}`
      );
      if (resHeaders?.data?.success && Array.isArray(resHeaders.data.data)) {
        const raw = resHeaders.data.data;
        const hIdx = raw.findIndex(
          (r) =>
            Array.isArray(r) &&
            (r.some(c => String(c).toLowerCase().includes("task id")) ||
              r.some(c => String(c).toLowerCase().includes("timestamp")) ||
              r.some(c => String(c).toLowerCase().includes("plant")) ||
              r.some(c => String(c).toLowerCase().includes("sales person")))
        );
        if (hIdx !== -1 && raw[hIdx]) {
          hdrs = raw[hIdx].map((h) => String(h || "").trim());
        }
      }
    } catch (e) {
      console.warn("Could not fetch Marketing Visit headers, using default:", e);
    }

    // Only populate columns 0-12 (A-M) to leave Planned (N) untouched for formula calculation
    let sheetRow = new Array(13).fill("");
    const setColVal = (names, val, defIdx) => {
      const idx = findColIndex(hdrs, names, defIdx);
      if (idx !== -1 && idx < 13) sheetRow[idx] = val;
    };

    setColVal(["Status Of Complaint"], "", 0);
    setColVal(["Timestamp", "Time Stamp"], visitData.timestamp || formatIndianTimestamp(new Date()), 1);
    setColVal(["Task ID", "Task ID.", "Task Id", "TaskID", "Complaint No.", "Complaint No"], visitData.taskId, 2);
    setColVal(["Visit Date", "VisitDate", "Date of Visit"], visitData.visitDate || "", 3);
    setColVal(["Sales Person", "SalesPerson"], visitData.salesPerson || "Admin", 4);
    setColVal(["Name Of Plant", "Plant Name", "Name of Plant / Client"], visitData.nameOfPlant || "", 5);
    setColVal(["Contact Person"], visitData.contactPerson || "", 6);
    setColVal(["Designation"], visitData.designation || "Complainer", 7);
    setColVal(["Content Details", "Content no.", "Discussion Details"], visitData.contentDetails || "", 8);
    setColVal(["Department", "Departments", "Dept"], visitData.department || "Complaint", 9);
    setColVal(["Shutdown"], visitData.shutdown || "Customer Complaint", 10);
    setColVal(["Remark", "Remarks"], visitData.remark || "", 11);
    setColVal(["Frequency Of Visit", "Frequency"], visitData.frequencyOfVisit || "1", 12);

    try {
      const payload = new URLSearchParams();
      payload.append("action", "insert");
      payload.append("sheetName", sheetName);
      payload.append("spreadsheetId", spreadsheetId);
      payload.append("rowData", JSON.stringify(sheetRow));
      const res = await axios.post(scriptUrl, payload);
      if (res.data && res.data.success === false) {
        throw new Error(res.data.error || "Marketing Visit insert was rejected by the server");
      }
    } catch (err) {
      console.warn("Marketing Visit sync failed:", err.message);
      throw err;
    }
  };

  const getTabCount = (tabName) => {
    if (tabName === "All Complaints") return complaints.length;
    return complaints.filter((c) => c.currentStep === tabName).length;
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesTab =
        activeTab === "All Complaints" || c.currentStep === activeTab;
      const matchesSearch =
        searchQuery.trim() === "" ||
        (c.customerName && c.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.id && c.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.firmName && c.firmName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.personName && c.personName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.problem && c.problem.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFirm =
        firmFilter === "all" ||
        (c.firmName && c.firmName.toLowerCase() === firmFilter.toLowerCase());

      return matchesTab && matchesSearch && matchesFirm;
    });
  }, [complaints, activeTab, searchQuery, firmFilter]);

  const handleCreateComplaint = (e) => {
    e.preventDefault();
    if (!newForm.firmName || !newForm.customerName || !newForm.problem) {
      showNotification("Please fill required fields", "error");
      return;
    }

    const timestampStr = formatIndianTimestamp(new Date());
    const nextNum = complaints.length + 1;
    const autoComplaintNo = `CO-${String(nextNum).padStart(3, "0")}`;

    const hdrs =
      sheetHeaders && sheetHeaders.length > 0 ? sheetHeaders : DEFAULT_HEADERS;
    let sheetRow = new Array(Math.max(hdrs.length, 25)).fill("");

    const setColVal = (names, val, defaultIdx) => {
      const idx = findColIndex(hdrs, names, defaultIdx);
      if (idx !== -1) sheetRow[idx] = val;
    };

    setColVal(["Timestamp"], timestampStr, 0);
    setColVal(["Complaint No.", "Complaint No", "Complaint ID"], autoComplaintNo, 1);
    setColVal(["Date"], newForm.date, 2);
    setColVal(["Firm Name", "Firm"], newForm.firmName, 3);
    setColVal(["Customer Name", "Customer"], newForm.customerName, 4);
    setColVal(
      ["Person Name (Complainer)", "Person Name", "Complainer"],
      newForm.personName || "N/A",
      5
    );
    setColVal(["Problem", "Issue"], newForm.problem, 6);
    setColVal(
      ["Complain Received By whom", "Complaint Received By whom", "Received By"],
      newForm.receivedBy || "Admin",
      7
    );
    setColVal(["Planned 1", "Planned1", "Plan 1"], timestampStr, 8);

    const newRecord = {
      id: autoComplaintNo,
      timestamp: timestampStr,
      date: newForm.date,
      firmName: newForm.firmName,
      customerName: newForm.customerName,
      personName: newForm.personName || "N/A",
      problem: newForm.problem,
      receivedBy: newForm.receivedBy || "Admin",
      planned1: timestampStr,
      actual1: "",
      personAssignName1: "",
      dateOfVisit: "",
      actionToBeTaken1: "",
      planned2: "",
      actual2: "",
      statusOfSolved: "",
      siteReport: "",
      currentStep: "Problem Assigned",
      rawRow: [...sheetRow],
      sheetRowIndex: complaints.length + 2,
      history: [
        {
          step: "Problem Assigned",
          updatedBy: newForm.receivedBy || "Admin",
          updatedAt: timestampStr,
          remarks: "Complaint registered in Complaint Tracker.",
        },
      ],
    };

    const updatedList = [newRecord, ...complaints];
    saveComplaints(updatedList);

    syncToSheet(sheetRow, "insert")
      .then(() => fetchComplaintTrackerData())
      .catch((err) =>
        console.warn("New complaint sync failed:", err.message)
      );

    setShowNewModal(false);
    setNewForm({
      date: new Date().toISOString().split("T")[0],
      firmName: "",
      customerName: "",
      personName: "",
      problem: "",
      receivedBy: currentUser?.username || "Admin",
    });
    showNotification(
      `Complaint ${autoComplaintNo} registered successfully`,
      "success"
    );
  };

  const openProcessModal = (complaint) => {
    setSelectedComplaint(complaint);
    setProcessForm({
      remarks: "",
      assignedPerson: "",
      targetDate: "",
      isSolved: "Problem Not Solved",
      personAssignName1: complaint.personAssignName1 || "",
      dateOfVisit: complaint.dateOfVisit || new Date().toISOString().split("T")[0],
      actionToBeTaken1: complaint.actionToBeTaken1 || "",
      statusOfSolved: complaint.statusOfSolved || "Problem Not Solved",
      siteReport: complaint.siteReport || "",
      personAssignName3: "",
      dateOfVisit3: new Date().toISOString().split("T")[0],
      actionToBeTaken3: "",
    });
    setShowProcessModal(true);
  };

  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const currentIdx = COMPLAINT_STEPS.indexOf(selectedComplaint.currentStep);
    let nextStep = selectedComplaint.currentStep;

    if (selectedComplaint.currentStep === "Problem Assigned") {
      const actionChosen = processForm.actionToBeTaken1;
      if (actionChosen === "Approved" || actionChosen === "Arrange Visit") {
        nextStep = "Site Report";
      } else {
        // If Reject -> Do not proceed forward, mark as History/Rejected
        nextStep = "History";
      }
    } else if (selectedComplaint.currentStep === "Site Report") {
      const isSolved =
        processForm.statusOfSolved === "Problem Solved" ||
        processForm.statusOfSolved === "Yes" ||
        processForm.isSolved === "Problem Solved" ||
        processForm.isSolved === "Yes";

      if (isSolved) {
        nextStep = "History";
      } else {
        nextStep = "Problem Not Solve Next Action";
      }
    } else if (selectedComplaint.currentStep === "Problem Not Solve Next Action") {
      if (processForm.actionToBeTaken3 === "Problem Solved") {
        nextStep = "History";
      } else {
        // Still Pending / Not solved -> Remains in loop in Problem Not Solve Next Action
        nextStep = "Problem Not Solve Next Action";
      }
    } else if (selectedComplaint.currentStep === "History") {
      nextStep = "History";
    } else if (currentIdx !== -1 && currentIdx < COMPLAINT_STEPS.length - 1) {
      nextStep = COMPLAINT_STEPS[currentIdx + 1];
    }

    const timestampStr = formatIndianTimestamp(new Date());
    const isSolved =
      processForm.statusOfSolved === "Problem Solved" ||
      processForm.statusOfSolved === "Yes" ||
      processForm.isSolved === "Problem Solved" ||
      processForm.isSolved === "Yes";
    const solvedVal = isSolved ? "Problem Solved" : "Problem Not Solved";

    const newHistoryItem = {
      step: selectedComplaint.currentStep,
      movedTo: nextStep,
      updatedBy: currentUser?.username || "Admin",
      updatedAt: timestampStr,
      remarks:
        selectedComplaint.currentStep === "Problem Assigned"
          ? `Action: ${processForm.actionToBeTaken1}, Assigned: ${processForm.personAssignName1}, Visit: ${processForm.dateOfVisit}`
          : selectedComplaint.currentStep === "Site Report"
          ? `Status: ${solvedVal}, Site Report: ${processForm.siteReport}`
          : selectedComplaint.currentStep === "Problem Not Solve Next Action"
          ? `Action: ${processForm.actionToBeTaken3}, Next Date: ${processForm.dateOfVisit3 || "N/A"}, Remarks: ${processForm.remarks || ""}`
          : processForm.remarks ||
            `Processed stage: ${selectedComplaint.currentStep} -> ${nextStep}`,
      personAssignName1: processForm.personAssignName1 || "",
    };

    const hdrs =
      sheetHeaders && sheetHeaders.length > 0 ? sheetHeaders : DEFAULT_HEADERS;
    const updatedSheetRow = selectedComplaint.rawRow
      ? [...selectedComplaint.rawRow]
      : new Array(Math.max(hdrs.length, 30)).fill("");
    while (updatedSheetRow.length < 30) updatedSheetRow.push("");

    const setRowVal = (names, val, defIdx) => {
      const idx = findColIndex(hdrs, names, defIdx);
      if (idx !== -1) updatedSheetRow[idx] = val;
    };

    if (selectedComplaint.currentStep === "Problem Assigned") {
      setRowVal(["Actual 1", "Actual1", "Act 1", "Actual - 1"], timestampStr, 9);
      setRowVal(["Person Assign Name 1", "Person Assign Name", "Person Assign", "Assign Name 1", "Assigned Person 1", "Person Assigned 1", "Assign Person 1"], processForm.personAssignName1 || "", 10);
      setRowVal(["Date Of Visit", "Date Of Visite", "Date Of Visit 1", "Visit Date", "Date of Visit"], processForm.dateOfVisit || "", 11);
      setRowVal(["Action To Be Taken 1", "Action To Be Taken", "Action 1", "Action To be Taken 1"], processForm.actionToBeTaken1 || "", 12);

      if (processForm.actionToBeTaken1 === "Approved" || processForm.actionToBeTaken1 === "Arrange Visit") {
        setRowVal(["Planned 2", "Planned2", "Plan 2", "Planned - 2"], timestampStr, 13);
      } else {
        // Reject: Do not set Planned 2 (do not move to Site Report)
        setRowVal(["Planned 2", "Planned2", "Plan 2", "Planned - 2"], "", 13);
        setRowVal(["Status  Of Solved", "Status Of Solved", "Status of Solved", "Status"], "Rejected", 19);
        setRowVal(["Site Report", "Site Report Remarks", "Report"], "Complaint Rejected at Problem Assigned", 20);
      }
    } else if (selectedComplaint.currentStep === "Site Report") {
      setRowVal(["Actual 2", "Actual2", "Act 2", "Actual - 2"], timestampStr, 14);
      setRowVal(["Status  Of Solved", "Status Of Solved", "Status of Solved", "Status"], solvedVal, 19);
      setRowVal(["Site Report", "Site Report Remarks", "Report"], processForm.siteReport || "", 20);
      if (!isSolved) {
        setRowVal(["Planned 3", "Planned3", "Plan 3", "Planned - 3"], timestampStr, 15);
      }
    } else if (selectedComplaint.currentStep === "Problem Not Solve Next Action") {
      setRowVal(["Actual 3", "Actual3", "Act 3", "Actual - 3"], timestampStr, 16);
      setRowVal(["Action To Be Taken 3", "Action To Be Taken", "Action 3"], processForm.actionToBeTaken3 || "", 22);

      const currentFreqNum = parseInt(selectedComplaint.freq || "0", 10) || 0;
      let newFreqStr = selectedComplaint.freq || "0";

      if (processForm.actionToBeTaken3 === "Problem Solved") {
        setRowVal(["Status  Of Solved", "Status Of Solved", "Status of Solved", "Status"], "Problem Solved", 19);
        setRowVal(["Remark", "Remarks", "Site Report", "Site Report Remarks", "Report"], processForm.remarks || "Problem Solved", 20);
        setRowVal(["Planned 4", "Planned4", "Plan 4", "Planned - 4"], timestampStr, 17);
        setRowVal(["Actual 4", "Actual4", "Act 4", "Actual - 4"], timestampStr, 18);
      } else if (processForm.actionToBeTaken3 === "Still Pending") {
        newFreqStr = String(currentFreqNum + 1);
        setRowVal(["Status  Of Solved", "Status Of Solved", "Status of Solved", "Status"], "Still Pending", 19);
        setRowVal(["Next Date", "Next Date Of Visit", "Date Of Visite", "Date Of Visit 3", "Date Of Visit", "Next Call Date"], processForm.dateOfVisit3 || "", 23);
        setRowVal(["Remark", "Remarks", "Site Report", "Site Report Remarks", "Report"], processForm.remarks || "", 20);
        setRowVal(["Freq", "Frequency", "Frequency Of Visit"], newFreqStr, 24);
        setRowVal(["Planned 3", "Planned3", "Plan 3", "Planned - 3"], timestampStr, 15);
      } else if (processForm.actionToBeTaken3 === "Not solved") {
        setRowVal(["Status  Of Solved", "Status Of Solved", "Status of Solved", "Status"], "Not solved", 19);
        setRowVal(["Remark", "Remarks", "Site Report", "Site Report Remarks", "Report"], processForm.remarks || "", 20);
        setRowVal(["Planned 3", "Planned3", "Plan 3", "Planned - 3"], timestampStr, 15);
      }
    } else if (selectedComplaint.currentStep === "History") {
      setRowVal(["Actual 4", "Actual4", "Act 4", "Actual - 4"], timestampStr, 18);
    }

    const currentFreqNum = parseInt(selectedComplaint.freq || "0", 10) || 0;
    const resolvedFreq = (selectedComplaint.currentStep === "Problem Not Solve Next Action" && processForm.actionToBeTaken3 === "Still Pending")
      ? String(currentFreqNum + 1)
      : (selectedComplaint.freq || "0");

    const updatedRecord = {
      ...selectedComplaint,
      currentStep: nextStep,
      freq: resolvedFreq,
      actual1: selectedComplaint.currentStep === "Problem Assigned" ? timestampStr : selectedComplaint.actual1,
      personAssignName1: selectedComplaint.currentStep === "Problem Assigned" ? (processForm.personAssignName1 || "") : selectedComplaint.personAssignName1,
      dateOfVisit: selectedComplaint.currentStep === "Problem Assigned" ? (processForm.dateOfVisit || "") : selectedComplaint.dateOfVisit,
      actionToBeTaken1: selectedComplaint.currentStep === "Problem Assigned" ? (processForm.actionToBeTaken1 || "") : selectedComplaint.actionToBeTaken1,
      planned2: selectedComplaint.currentStep === "Problem Assigned" ? ((processForm.actionToBeTaken1 === "Approved" || processForm.actionToBeTaken1 === "Arrange Visit") ? timestampStr : "") : selectedComplaint.planned2,
      statusOfSolved: selectedComplaint.currentStep === "Problem Assigned" ? (processForm.actionToBeTaken1 === "Reject" ? "Rejected" : selectedComplaint.statusOfSolved) : (selectedComplaint.currentStep === "Site Report" ? solvedVal : (selectedComplaint.currentStep === "Problem Not Solve Next Action" ? processForm.actionToBeTaken3 : selectedComplaint.statusOfSolved)),
      siteReport: selectedComplaint.currentStep === "Problem Assigned" ? (processForm.actionToBeTaken1 === "Reject" ? "Complaint Rejected at Problem Assigned" : selectedComplaint.siteReport) : (selectedComplaint.currentStep === "Site Report" ? (processForm.siteReport || "") : (selectedComplaint.currentStep === "Problem Not Solve Next Action" ? (processForm.remarks || "") : selectedComplaint.siteReport)),
      rawRow: [...updatedSheetRow],
      history: [...(selectedComplaint.history || []), newHistoryItem],
    };

    const updatedList = complaints.map((c) =>
      c.id === selectedComplaint.id ? updatedRecord : c
    );

    saveComplaints(updatedList);

    let syncError = null;

    if (selectedComplaint.sheetRowIndex) {
      try {
        await syncToSheet(updatedSheetRow, "update", selectedComplaint.sheetRowIndex);
      } catch (err) {
        syncError = err;
      }
    }

    if (
      selectedComplaint.currentStep === "Problem Assigned" &&
      processForm.actionToBeTaken1 === "Arrange Visit"
    ) {
      const visitDateFormatted = processForm.dateOfVisit
        ? (() => {
            const parts = processForm.dateOfVisit.split("-");
            return parts.length === 3
              ? `${parts[2]}-${parts[1]}-${parts[0]}`
              : processForm.dateOfVisit;
          })()
        : "";

      try {
        await syncToMarketingVisit({
          timestamp: timestampStr,
          taskId: `TSK-${selectedComplaint.id}`,
          visitDate: visitDateFormatted,
          salesPerson: processForm.personAssignName1 || currentUser?.username || "Admin",
          nameOfPlant: selectedComplaint.firmName || "",
          contactPerson: selectedComplaint.personName || selectedComplaint.customerName || "",
          designation: "Complainer",
          contentDetails: `Complaint Visit: ${selectedComplaint.problem || ""}`,
          department: "Complaint",
          shutdown: "Customer Complaint",
          remark: `Complaint Visit: ${selectedComplaint.problem || ""} [Ref: Customer Complaint #${selectedComplaint.id}]`,
          frequencyOfVisit: "1",
        });
      } catch (err) {
        syncError = syncError || err;
      }
    }

    setShowProcessModal(false);
    setSelectedComplaint(null);

    if (syncError) {
      showNotification(
        `Complaint moved to "${nextStep}" locally, but syncing to the sheet failed: ${syncError.message}. It may not persist after a refresh — please retry.`,
        "error"
      );
    } else {
      showNotification(`Complaint updated to "${nextStep}"`, "success");
    }

    fetchComplaintTrackerData();
  };

  const handleBulkSubmitTakeSiteReport = async () => {
    if (selectedComplaintIds.length === 0) return;

    const timestampStr = formatIndianTimestamp(new Date());
    const complaintsToUpdate = complaints.filter((c) =>
      selectedComplaintIds.includes(c.id)
    );

    const updatedList = complaints.map((c) => {
      if (selectedComplaintIds.includes(c.id)) {
        const nextStep = "History";
        const newHistoryItem = {
          step: c.currentStep,
          movedTo: nextStep,
          updatedBy: currentUser?.username || "Admin",
          updatedAt: timestampStr,
          remarks: "Bulk action: completed Site Report.",
        };
        return {
          ...c,
          currentStep: nextStep,
          history: [...(c.history || []), newHistoryItem],
        };
      }
      return c;
    });

    saveComplaints(updatedList);
    setSelectedComplaintIds([]);

    for (const c of complaintsToUpdate) {
      if (c.sheetRowIndex && c.rawRow) {
        const hdrs =
          sheetHeaders && sheetHeaders.length > 0 ? sheetHeaders : DEFAULT_HEADERS;
        const updatedSheetRow = [...c.rawRow];
        while (updatedSheetRow.length < 30) updatedSheetRow.push("");

        const setRowVal = (names, val, defIdx) => {
          const idx = findColIndex(hdrs, names, defIdx);
          if (idx !== -1) updatedSheetRow[idx] = val;
        };

        setRowVal(["Actual 4"], timestampStr, 18);
        try {
          await syncToSheet(updatedSheetRow, "update", c.sheetRowIndex);
        } catch (err) {
          console.warn("Bulk sync failed for", c.id, err.message);
        }
      }
    }

    showNotification(
      `Successfully processed ${complaintsToUpdate.length} complaints to History`,
      "success"
    );
    fetchComplaintTrackerData();
  };

  const getStepColor = (step) => {
    switch (step) {
      case "Problem Assigned":
        return "bg-indigo-100 text-indigo-800 font-medium";
      case "Site Report":
        return "bg-purple-100 text-purple-800 font-medium";
      case "Problem Not Solve Next Action":
        return "bg-amber-100 text-amber-800 font-medium";
      case "History":
        return "bg-slate-100 text-slate-800 font-medium";
      case "Resolved":
        return "bg-green-100 text-green-800 font-semibold";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="py-2">


        {/* Tabs Bar */}
        <div className="flex space-x-2 rounded-2xl bg-white p-1.5 mb-8 w-fit mx-auto overflow-x-auto border border-slate-200 shadow-sm">
          {TABS.map((tab) => {
            const count = getTabCount(tab);
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium leading-5 transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <MessageSquareIcon
                  className={`h-4 w-4 ${isActive ? "" : "text-gray-400"}`}
                />
                {tab}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? "bg-sky-100 text-sky-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Controls Bar */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <input
                type="text"
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border rounded-md flex-1 focus:ring-2 focus:ring-sky-500 border-gray-300 text-sm"
              />
              <select
                value={firmFilter}
                onChange={(e) => setFirmFilter(e.target.value)}
                className="px-4 py-2 border rounded-md border-gray-300 bg-card text-sm max-w-xs truncate"
              >
                <option value="all">All Firms</option>
                {firmNamesList.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewModal(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md whitespace-nowrap text-sm shadow-sm"
              >
                + Register new Complaint
              </button>
            </div>
          </div>
        </div>

        {/* Complaints Table: Action first on workflow pages, proper columns */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  {activeTab !== "History" && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                      Action
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Complaint No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Firm Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Customer Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Person Name (Complainer)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Problem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Complain Received By whom
                  </th>
                  {(activeTab === "Site Report" || activeTab === "Problem Not Solve Next Action" || activeTab === "History") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                      Status Of Solved
                    </th>
                  )}
                  {(activeTab === "Site Report" || activeTab === "Problem Not Solve Next Action" || activeTab === "History") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                      Site Report
                    </th>
                  )}
                  {(activeTab === "Problem Not Solve Next Action" || activeTab === "History") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                      Freq
                    </th>
                  )}
                  {activeTab === "All Complaints" && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                      Current Stage
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-muted">
                    {activeTab !== "History" && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {c.currentStep !== "History" && c.currentStep !== "Resolved" && (
                            <button
                              onClick={() => openProcessModal(c)}
                              className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded text-xs font-medium shadow-sm transition"
                            >
                              Action
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 text-sm font-semibold">
                        {c.id}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDisplayDate(c.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-foreground">
                      {c.firmName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {c.customerName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-muted-foreground">
                      {c.personName}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate" title={c.problem}>
                      {c.problem}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {c.receivedBy}
                    </td>
                    {(activeTab === "Site Report" || activeTab === "Problem Not Solve Next Action" || activeTab === "History") && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.statusOfSolved ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              c.statusOfSolved === "Problem Solved" || c.statusOfSolved === "Yes"
                                ? "bg-green-100 text-green-800 ring-1 ring-green-300"
                                : c.statusOfSolved === "Still Pending"
                                ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                                : "bg-rose-100 text-rose-800 ring-1 ring-rose-300"
                            }`}
                          >
                            {c.statusOfSolved}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    {(activeTab === "Site Report" || activeTab === "Problem Not Solve Next Action" || activeTab === "History") && (
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate" title={c.siteReport}>
                        {c.siteReport || <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    )}
                    {(activeTab === "Problem Not Solve Next Action" || activeTab === "History") && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {c.freq || "0"}
                        </span>
                      </td>
                    )}
                    {activeTab === "All Complaints" && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            c.currentStep === "History" || c.currentStep === "Resolved"
                              ? "bg-slate-100 text-slate-800 ring-1 ring-slate-300"
                              : getStepColor(c.currentStep)
                          }`}
                        >
                          {c.currentStep}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredComplaints.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No complaints found in Complaint Tracker.
              </div>
            )}
          </div>
        </div>

        {/* ── Popup: Register new Complaint (Clean 6 fields) ─────────────────── */}
        {showNewModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewModal(false)}
          >
            <div
              className="bg-card rounded-lg shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4 text-foreground border-b pb-2">
                Register new Complaint
              </h2>
              <form onSubmit={handleCreateComplaint} className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-muted-foreground mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={newForm.date}
                      onChange={(e) =>
                        setNewForm({ ...newForm, date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-muted-foreground mb-1">
                      Firm Name *
                    </label>
                    <select
                      required
                      value={newForm.firmName}
                      onChange={(e) =>
                        setNewForm({ ...newForm, firmName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 bg-card"
                    >
                      <option value="">Select Firm Name</option>
                      {firmNamesList.map((firm) => (
                        <option key={firm} value={firm}>
                          {firm}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-muted-foreground mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Customer Name"
                      value={newForm.customerName}
                      onChange={(e) =>
                        setNewForm({ ...newForm, customerName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-muted-foreground mb-1">
                      Person Name (Complainer) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Person Name"
                      value={newForm.personName}
                      onChange={(e) =>
                        setNewForm({ ...newForm, personName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Problem *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe exact problem experienced..."
                    value={newForm.problem}
                    onChange={(e) =>
                      setNewForm({ ...newForm, problem: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                  ></textarea>
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    Complain Received By whom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Received By whom"
                    value={newForm.receivedBy}
                    onChange={(e) =>
                      setNewForm({ ...newForm, receivedBy: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white py-2 px-6 rounded-md font-medium"
                  >
                    Register Complaint
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-foreground py-2 px-6 rounded-md font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Popup: Action / Process Workflow Step ───────────────────────────── */}
        {showProcessModal && selectedComplaint && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowProcessModal(false)}
          >
            <div
              className="bg-card rounded-lg shadow-xl p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-1 text-foreground border-b pb-2">
                Take Action — {selectedComplaint.currentStep}
              </h2>
              <p className="text-xs text-muted-foreground my-3">
                <span className="font-semibold text-muted-foreground">Complaint No:</span>{" "}
                {selectedComplaint.id} |{" "}
                <span className="font-semibold text-muted-foreground">Customer:</span>{" "}
                {selectedComplaint.customerName}
              </p>

              <form onSubmit={handleProcessSubmit} className="space-y-4 text-sm">
                {selectedComplaint.currentStep === "Problem Assigned" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Person Assign Name 1 *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter Person Assign Name"
                        value={processForm.personAssignName1}
                        onChange={(e) =>
                          setProcessForm({
                            ...processForm,
                            personAssignName1: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Date Of Visit *
                      </label>
                      <input
                        type="date"
                        required
                        value={processForm.dateOfVisit}
                        onChange={(e) =>
                          setProcessForm({
                            ...processForm,
                            dateOfVisit: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Action To Be Taken 1 *
                      </label>
                      <select
                        required
                        value={processForm.actionToBeTaken1}
                        onChange={(e) =>
                          setProcessForm({
                            ...processForm,
                            actionToBeTaken1: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 bg-card"
                      >
                        <option value="">Select action...</option>
                        <option value="Arrange Visit">Arrange Visit</option>
                        <option value="Reject">Reject</option>
                        <option value="Approved">Approved</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedComplaint.currentStep === "Site Report" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Status Of Solved *
                      </label>
                      <select
                        required
                        value={processForm.statusOfSolved}
                        onChange={(e) =>
                          setProcessForm({
                            ...processForm,
                            statusOfSolved: e.target.value,
                            isSolved: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 bg-card"
                      >
                        <option value="Problem Not Solved">Problem Not Solved</option>
                        <option value="Problem Solved">Problem Solved</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Site Report *
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Site visit observations..."
                        value={processForm.siteReport}
                        onChange={(e) =>
                          setProcessForm({
                            ...processForm,
                            siteReport: e.target.value,
                            remarks: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                      ></textarea>
                    </div>
                  </div>
                )}

                {selectedComplaint.currentStep === "Problem Not Solve Next Action" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-medium text-muted-foreground mb-1">
                        Action To Be Taken *
                      </label>
                      <select
                        required
                        value={processForm.actionToBeTaken3}
                        onChange={(e) =>
                          setProcessForm({
                            ...processForm,
                            actionToBeTaken3: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 bg-card"
                      >
                        <option value="">Select Action...</option>
                        <option value="Problem Solved">Problem Solved</option>
                        <option value="Still Pending">Still Pending</option>
                        <option value="Not solved">Not solved</option>
                      </select>
                    </div>

                    {processForm.actionToBeTaken3 === "Still Pending" && (
                      <>
                        <div>
                          <label className="block font-medium text-muted-foreground mb-1">
                            Next Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={processForm.dateOfVisit3}
                            onChange={(e) =>
                              setProcessForm({
                                ...processForm,
                                dateOfVisit3: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 bg-card"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-muted-foreground mb-1">
                            Remark *
                          </label>
                          <textarea
                            rows={3}
                            required
                            placeholder="Enter remark..."
                            value={processForm.remarks}
                            onChange={(e) =>
                              setProcessForm({
                                ...processForm,
                                remarks: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                          ></textarea>
                        </div>
                      </>
                    )}

                    {processForm.actionToBeTaken3 === "Not solved" && (
                      <div>
                        <label className="block font-medium text-muted-foreground mb-1">
                          Remark *
                        </label>
                        <textarea
                          rows={3}
                          required
                          placeholder="Enter remark..."
                          value={processForm.remarks}
                          onChange={(e) =>
                            setProcessForm({
                              ...processForm,
                              remarks: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                        ></textarea>
                      </div>
                    )}
                  </div>
                )}

                {selectedComplaint.currentStep === "Take Site Report 2" && (
                  <div>
                    <label className="block font-medium text-muted-foreground mb-1">
                      Final Resolution Sign-off Notes
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Resolution sign-off notes"
                      value={processForm.remarks}
                      onChange={(e) =>
                        setProcessForm({ ...processForm, remarks: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500"
                    ></textarea>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    type="submit"
                    className="bg-[#0f4d38] hover:bg-[#0b3b2b] text-white font-semibold py-2 px-6 rounded-md shadow-sm transition"
                  >
                    Confirm & Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProcessModal(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-foreground font-semibold py-2 px-6 rounded-md transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Popup: Complaint Details & History ─────────────────────────────── */}
        {showDetailModal && selectedComplaint && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <div
              className="bg-card rounded-lg shadow-xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-1 text-foreground border-b pb-2">
                Complaint Tracker Details ({selectedComplaint.id})
              </h2>
              <div className="space-y-2 text-sm my-4">
                <p>
                  <span className="font-semibold text-muted-foreground">Firm:</span>{" "}
                  {selectedComplaint.firmName}
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Customer:</span>{" "}
                  {selectedComplaint.customerName}
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Complainer:</span>{" "}
                  {selectedComplaint.personName}
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Received By:</span>{" "}
                  {selectedComplaint.receivedBy}
                </p>
                <div className="bg-muted p-3 rounded border">
                  <span className="font-semibold text-muted-foreground block text-xs uppercase">
                    Problem
                  </span>
                  <p className="mt-1">{selectedComplaint.problem}</p>
                </div>
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase pt-2">
                Workflow History
              </p>
              <div className="flex-1 overflow-y-auto space-y-2 border-l-2 border-sky-500 pl-4 ml-1 my-2">
                {(selectedComplaint.history || []).map((h, i) => (
                  <div key={i} className="text-sm py-1">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span className="font-semibold text-muted-foreground">
                        {h.step} {h.movedTo ? `→ ${h.movedTo}` : ""}
                      </span>
                      <span>{h.updatedAt}</span>
                    </div>
                    {h.remarks && (
                      <p className="text-muted-foreground text-xs mt-0.5">"{h.remarks}"</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">By: {h.updatedBy}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3 border-t">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-foreground py-2 px-6 rounded-md font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
