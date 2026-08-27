"use client";

import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { X, ClipboardList, Send, Plus, Search, FileText, PhoneCall, History, CheckCircle, XCircle, Image as ImageIcon } from "lucide-react";

const STORAGE_KEY = "nbd_marketing_visit_tracker_data";

const TABS = ["All", "Assign Marketing", "Report", "Call Tracker", "History"];

const DEPARTMENT_OPTIONS = [
  "Boiler",
  "Dri",
  "Dri (Project)",
  "Ferro",
  "Pellet Plant",
  "Pet Coke Plant",
  "Power Plant",
  "Project",
  "Rolling Mill",
  "Sms",
  "Steel Ladle",
];

// Helper to format date in Indian DD/MM/YYYY HH:mm:ss format
const formatIndianTimestamp = (dateObj = new Date()) => {
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  const seconds = String(dateObj.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// Helper to format ISO dates to clean display DD/MM/YYYY
const formatDisplayDate = (dStr) => {
  if (!dStr) return "";
  if (String(dStr).includes("T") || String(dStr).includes("-")) {
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

// Helper to get today's date in YYYY-MM-DD format for HTML date input
const getTodayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to format YYYY-MM-DD to DD-MM-YYYY
const formatToIndianDate = (isoStr) => {
  if (!isoStr) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(isoStr)) {
    const parts = isoStr.split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoStr;
};

// Helper to parse date strings (DD-MM-YYYY, YYYY-MM-DD, etc.) into Date object
const parseDateObj = (dStr) => {
  if (!dStr) return null;
  const str = String(dStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const dt = new Date(str.substring(0, 10));
    if (!isNaN(dt)) return dt;
  }
  const parts = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (parts) {
    const dd = parseInt(parts[1], 10);
    const mm = parseInt(parts[2], 10) - 1;
    const yyyy = parseInt(parts[3], 10);
    const dt = new Date(yyyy, mm, dd);
    if (!isNaN(dt)) return dt;
  }
  const dt = new Date(str);
  return isNaN(dt) ? null : dt;
};

const DEFAULT_HEADERS = [
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
  "Planned 1",
  "Actual 1",
  "Time Delay 1",
  "Status 1",
  "Planned 2",
  "Actual 2",
  "Marketing Visit Status",
  "Status 2",
  "What did Customer Says",
  "Next Call Date",
];

// Check if visit is due for Marketing tab (e.g. Visit Date + Frequency days <= Today)
const isDueForMarketingTab = (v) => {
  if (v.currentStep !== "Marketing" && v.currentStep !== "Assign Marketing") return false;
  const match = String(v.frequencyOfVisit || "").match(/\d+/);
  const freqDays = match ? parseInt(match[0], 10) : 0;
  
  const baseStr = v.visitDate || v.timestamp;
  const baseDate = parseDateObj(baseStr);
  if (!baseDate) return true;

  baseDate.setHours(0, 0, 0, 0);
  const dueDate = new Date(baseDate);
  dueDate.setDate(dueDate.getDate() + freqDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today >= dueDate;
};

// Check if visit is in Assign Marketing tab (Actual is null/empty)
const isAssignMarketingTab = (v) => {
  if (v?.source === "NBD Lead" || v?.source === "NBD Enquiry") {
    return true;
  }
  if (v?.source === "Manual") {
    const a = String(v?.actual || "").trim();
    return a === "";
  }
  return false;
};

// Check if visit is in Report tab (Planned 1 is not null/empty and Actual 1 is null/empty)
const isReportTab = (v) => {
  if (v?.source !== "Manual") return false;
  const p1 = String(v?.planned1 || "").trim();
  const a1 = String(v?.actual1 || "").trim();
  return p1 !== "" && a1 === "";
};

// Check if visit is in Call Tracker tab (Planned 2 is not null/empty and Actual 2 is null/empty)
const isCallTrackerTab = (v) => {
  if (v?.source !== "Manual") return false;
  const p2 = String(v?.planned2 || "").trim();
  const a2 = String(v?.actual2 || "").trim();
  return p2 !== "" && a2 === "";
};

// Check if visit is in History tab (Planned 2 is not null/empty and Actual 2 is not null/empty)
const isHistoryTab = (v) => {
  if (v?.source !== "Manual") return false;
  const p2 = String(v?.planned2 || "").trim();
  const a2 = String(v?.actual2 || "").trim();
  return p2 !== "" && a2 !== "";
};

// Helper to check if any status/remarks indicate cancellation, rejection, or regret
const isCancelledOrRejected = (...values) => {
  return values.some((val) => {
    if (!val) return false;
    const str = String(val).trim().toLowerCase();
    return (
      str === "cancel" ||
      str === "cancelled" ||
      str === "canceled" ||
      str === "reject" ||
      str === "rejected" ||
      str === "regret" ||
      str === "order cancelled" ||
      str === "order cancel" ||
      str.includes("cancel") ||
      str.includes("reject") ||
      str.includes("regret")
    );
  });
};

export default function MarketingVisitTracker() {
  const { showNotification = () => {}, currentUser = null, isAdmin = () => false } = useContext(AuthContext) || {};
  const location = useLocation();
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [firmFilter, setFirmFilter] = useState("all");
  const [sheetHeaders, setSheetHeaders] = useState([]);
  // Client plant/party names come strictly from the live Master sheet — populated by fetchMasterFirms below
  const [existingParties, setExistingParties] = useState([]);

  // Sales person options come strictly from the live Master sheet — populated by fetchAllData below
  const [salesPersonsList, setSalesPersonsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState(DEPARTMENT_OPTIONS);

  // Form modals state
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // New Visit form states
  const [formData, setFormData] = useState({
    visitDate: getTodayISO(),
    nameOfPlant: "",
    contactPerson: "",
    designation: "",
    contentDetails: "",
    department: "",
    shutdown: "Project",
    remark: "",
    frequencyOfVisit: ""
  });

  const [selectedSalesPerson, setSelectedSalesPerson] = useState(currentUser?.username || "Admin");
  const [customPlantActive, setCustomPlantActive] = useState(false);
  const [customDeptActive, setCustomDeptActive] = useState(false);

  // Helper to generate sequential Task ID (TSK-001, TSK-002, ...)
  const generateNextTaskId = useCallback((visitList = visits) => {
    let maxNum = 0;
    (visitList || []).forEach((v) => {
      if (!v || !v.id) return;
      const strId = String(v.id).trim();
      const match = strId.match(/^TSK-(\d{1,4})$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nextNum = maxNum + 1;
    return `TSK-${String(nextNum).padStart(3, "0")}`;
  }, [visits]);

  // Generate Task ID
  const [currentTaskId, setCurrentTaskId] = useState("");

  const resetForm = () => {
    setFormData({
      visitDate: getTodayISO(),
      nameOfPlant: "",
      contactPerson: "",
      designation: "",
      contentDetails: "",
      department: "",
      shutdown: "Project",
      remark: "",
      frequencyOfVisit: ""
    });
    setSelectedSalesPerson(currentUser?.username || "Admin");
    setCustomPlantActive(false);
    setCustomDeptActive(false);
    setErrorMsg("");
    // Generate sequential TSK id starting from TSK-001
    setCurrentTaskId(generateNextTaskId(visits));
  };

  const openNewModal = () => {
    resetForm();
    setShowNewModal(true);
  };

  // Handoff from NBD Lead: "Arrange Visit" opens this Log Client Plant Visit Report form, prefilled
  useEffect(() => {
    if (location.state?.openNewVisit) {
      const lead = location.state.lead || {};
      resetForm();
      setFormData((prev) => ({
        ...prev,
        nameOfPlant: lead.companyName || prev.nameOfPlant,
        department: lead.department || prev.department,
      }));
      if (lead.salesPerson) setSelectedSalesPerson(lead.salesPerson);
      setShowNewModal(true);
      // Clear the handoff state so a refresh/back doesn't reopen it
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Status Modal states (for Assign Marketing and Report)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalType, setStatusModalType] = useState("Assign Marketing"); // "Assign Marketing" | "Report"
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [selectedStatusValue, setSelectedStatusValue] = useState("Approved");
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  // Extra fields captured when closing out an "Assign Marketing" task
  const [orderStatusValue, setOrderStatusValue] = useState("Pending"); // "Yes" | "No" | "Pending"
  const [customerSayValue, setCustomerSayValue] = useState("");
  const [visitPhotos, setVisitPhotos] = useState([null, null, null]); // File objects for Photo 1/2/3
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  // Call Tracker Modal states
  const [showCallTrackerModal, setShowCallTrackerModal] = useState(false);
  const [callTrackerForm, setCallTrackerForm] = useState({
    marketingVisitStatus: "Pending", // "Pending" | "Yes" | "No"
    status: "WARM",
    customerSay: "",
    nextCallDate: getTodayISO(),
  });
  const [isCallTrackerSubmitting, setIsCallTrackerSubmitting] = useState(false);

  const openCallTrackerModal = (visit) => {
    setSelectedVisit(visit);
    setCallTrackerForm({
      marketingVisitStatus: visit.marketingVisitStatus || "Pending",
      status: visit.status2 || "WARM",
      customerSay: visit.customerSays || visit.actionToBeTaken1 || "",
      nextCallDate: getTodayISO(),
    });
    setShowCallTrackerModal(true);
  };

  const handleCallTrackerSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setIsCallTrackerSubmitting(true);
    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
      const sheetName = import.meta.env.VITE_MARKETING_VISIT_SHEET_NAME || "Marketing Visit";
      const targetRowIndex = selectedVisit.sheetRowIndex;
      const now = new Date();
      const actualTimestamp = formatIndianTimestamp(now);
      const formattedNextDate = formatToIndianDate(callTrackerForm.nextCallDate);
      const isCompleted = callTrackerForm.marketingVisitStatus === "Yes" || callTrackerForm.marketingVisitStatus === "No";

      // 1. Update Actual 2 cell (col 22 -> 1-based column index 23)
      // Only set Actual 2 when status is Yes or No. If Pending, keep empty.
      const actual2ColIdx = findColIndex(sheetHeaders, ["Actual 2", "Actual2"], 22) + 1;
      const actualPayload = new URLSearchParams();
      actualPayload.append("action", "updateCell");
      actualPayload.append("sheetName", sheetName);
      actualPayload.append("rowIndex", targetRowIndex.toString());
      actualPayload.append("columnIndex", actual2ColIdx.toString());
      actualPayload.append("value", isCompleted ? actualTimestamp : "");
      await axios.post(scriptUrl, actualPayload);

      // 2. Update Marketing Visit Status cell (col 23 -> 1-based column index 24)
      const mvStatusColIdx = findColIndex(sheetHeaders, ["Marketing Visit Status", "MarketingVisitStatus", "Person Assign Name 1", "Person Assign Name", "Order Received"], 23) + 1;
      const mvStatusPayload = new URLSearchParams();
      mvStatusPayload.append("action", "updateCell");
      mvStatusPayload.append("sheetName", sheetName);
      mvStatusPayload.append("rowIndex", targetRowIndex.toString());
      mvStatusPayload.append("columnIndex", mvStatusColIdx.toString());
      mvStatusPayload.append("value", callTrackerForm.marketingVisitStatus);
      await axios.post(scriptUrl, mvStatusPayload);

      // 3. Update Status 2 cell (col 24 -> 1-based column index 25)
      const status2ColIdx = findColIndex(sheetHeaders, ["Status 2", "Status2"], 24) + 1;
      const status2Payload = new URLSearchParams();
      status2Payload.append("action", "updateCell");
      status2Payload.append("sheetName", sheetName);
      status2Payload.append("rowIndex", targetRowIndex.toString());
      status2Payload.append("columnIndex", status2ColIdx.toString());
      status2Payload.append("value", callTrackerForm.status);
      await axios.post(scriptUrl, status2Payload);

      // 4. Update What did Customer Says cell (col 25 -> 1-based column index 26)
      const customerSayColIdx = findColIndex(sheetHeaders, ["What did Customer Says", "What did the Customer say", "What Did The Customer Say", "Action To Be Taken 1", "Action To Be Taken"], 25) + 1;
      const customerSayPayload = new URLSearchParams();
      customerSayPayload.append("action", "updateCell");
      customerSayPayload.append("sheetName", sheetName);
      customerSayPayload.append("rowIndex", targetRowIndex.toString());
      customerSayPayload.append("columnIndex", customerSayColIdx.toString());
      customerSayPayload.append("value", callTrackerForm.customerSay || "");
      await axios.post(scriptUrl, customerSayPayload);

      // 5. Update Next Call Date cell (col 26 -> 1-based column index 27)
      // Only set Next Call Date when Pending; clear when Yes/No
      const nextDateColIdx = findColIndex(sheetHeaders, ["Next Call Date", "Next Date Of Call", "Date Of Visit"], 26) + 1;
      const nextDatePayload = new URLSearchParams();
      nextDatePayload.append("action", "updateCell");
      nextDatePayload.append("sheetName", sheetName);
      nextDatePayload.append("rowIndex", targetRowIndex.toString());
      nextDatePayload.append("columnIndex", nextDateColIdx.toString());
      nextDatePayload.append("value", callTrackerForm.marketingVisitStatus === "Pending" ? formattedNextDate : "");
      await axios.post(scriptUrl, nextDatePayload);

      showNotification(
        isCompleted
          ? `Call Tracker status (${callTrackerForm.marketingVisitStatus}) saved & moved to History!`
          : "Call Tracker status updated to Pending!",
        "success"
      );
      setShowCallTrackerModal(false);
      setSelectedVisit(null);
      fetchVisitTrackerData();
    } catch (err) {
      console.error("Failed to submit call tracker:", err);
      showNotification("Failed to submit call tracker: " + (err.message || err.toString()), "error");
    } finally {
      setIsCallTrackerSubmitting(false);
    }
  };

  const openStatusModal = (visit, type = "Assign Marketing") => {
    setSelectedVisit(visit);
    setStatusModalType(type);
    setSelectedStatusValue("Approved");
    setOrderStatusValue("Pending");
    setCustomerSayValue("");
    setVisitPhotos([null, null, null]);
    setShowStatusModal(true);
  };

  // Upload one visit photo to Google Drive, same pattern used for Offer/Enquiry file uploads
  const uploadVisitPhotoToDrive = async (file) => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    const folderId = import.meta.env.VITE_NBD_DRIVE_FOLDER_ID;
    if (!scriptUrl || !folderId) throw new Error("Google Drive folder ID or script URL missing in .env");

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const payload = new URLSearchParams();
    payload.append("action", "uploadFile");
    payload.append("fileName", file.name);
    payload.append("mimeType", file.type);
    payload.append("base64Data", base64);
    payload.append("folderId", folderId);

    const response = await axios.post(scriptUrl, payload);
    if (response.data && response.data.success) {
      return response.data.fileUrl || response.data.url;
    }
    throw new Error(response.data?.error || "Photo upload failed");
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setIsStatusSubmitting(true);
    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
      const sheetName = import.meta.env.VITE_MARKETING_VISIT_SHEET_NAME || "Marketing Visit";
      const targetRowIndex = selectedVisit.sheetRowIndex;
      const now = new Date();
      const actualTimestamp = formatIndianTimestamp(now);
      const timestampStr = selectedVisit.timestamp || actualTimestamp;

      // Upload any attached photos first (Assign Marketing only)
      let photoUrls = ["", "", ""];
      if (statusModalType === "Assign Marketing" && visitPhotos.some(Boolean)) {
        setIsUploadingPhotos(true);
        try {
          photoUrls = await Promise.all(
            visitPhotos.map((file) => (file ? uploadVisitPhotoToDrive(file) : Promise.resolve("")))
          );
        } finally {
          setIsUploadingPhotos(false);
        }
      }

      // Writes the extra Assign Marketing fields (Order Status, Customer Say, Photos) that
      // don't have dedicated columns yet — appended right after the last existing column
      // ("Next Call Date"), same way the rest of this app tolerates sheets growing over time.
      const writeAssignMarketingExtras = async (rowIndex) => {
        if (statusModalType !== "Assign Marketing") return;
        const extras = [
          { names: ["Order Status"], val: orderStatusValue, defaultIdx: 27 },
          { names: ["What did Customer Says", "What Did Customer Say"], val: customerSayValue, defaultIdx: 25 },
          { names: ["Photo 1"], val: photoUrls[0], defaultIdx: 28 },
          { names: ["Photo 2"], val: photoUrls[1], defaultIdx: 29 },
          { names: ["Photo 3"], val: photoUrls[2], defaultIdx: 30 },
        ];
        for (const extra of extras) {
          if (!extra.val) continue;
          const idx = findColIndex(sheetHeaders, extra.names, extra.defaultIdx);
          const payload = new URLSearchParams();
          payload.append("action", "updateCell");
          payload.append("sheetName", sheetName);
          payload.append("rowIndex", rowIndex.toString());
          payload.append("columnIndex", (idx + 1).toString());
          payload.append("value", extra.val);
          await axios.post(scriptUrl, payload);
        }
      };

      // Case 1: External source (NBD Lead or NBD Enquiry) in Assign Marketing -> Insert into Marketing Visit sheet
      if (statusModalType === "Assign Marketing" && (selectedVisit.source === "NBD Lead" || selectedVisit.source === "NBD Enquiry")) {
        const nextTaskId = generateNextTaskId(visits);
        const hdrs = sheetHeaders.length > 0 ? sheetHeaders : DEFAULT_HEADERS;
        
        // Insert only columns 0-12 (A-M) to keep Planned (col 13/N) untouched for spreadsheet formulas
        let sheetRow = new Array(13).fill("");

        const setColVal = (names, val, defaultIdx) => {
          const idx = findColIndex(hdrs, names, defaultIdx);
          if (idx < 13) sheetRow[idx] = val;
        };

        setColVal(["Status Of Complaint"], "", 0);
        setColVal(["Timestamp", "Time Stamp"], timestampStr, 1);
        setColVal(["Task ID", "Task ID."], nextTaskId, 2);
        setColVal(["Visit Date", "VisitDate", "Date of Visit"], selectedVisit.visitDate || formatToIndianDate(getTodayISO()), 3);
        setColVal(["Sales Person", "SalesPerson"], selectedVisit.salesPerson || currentUser?.username || "Admin", 4);
        setColVal(["Name Of Plant", "Plant Name", "Name of Plant / Client"], selectedVisit.nameOfPlant || "", 5);
        setColVal(["Contact Person"], selectedVisit.contactPerson || "", 6);
        setColVal(["Designation"], selectedVisit.designation || "", 7);
        setColVal(["Content Details", "Content no.", "Discussion Details"], selectedVisit.contentDetails || "", 8);
        setColVal(["Department", "Departments", "Dept"], selectedVisit.department || "", 9);
        setColVal(["Shutdown"], selectedVisit.shutdown || "", 10);
        const remarkWithRef = selectedVisit.remark
          ? `${selectedVisit.remark} [Ref: ${selectedVisit.source} #${selectedVisit.id}]`
          : `[Ref: ${selectedVisit.source} #${selectedVisit.id}]`;
        setColVal(["Remark", "Remarks"], remarkWithRef, 11);
        setColVal(["Frequency Of Visit", "Frequency"], selectedVisit.frequencyOfVisit || "", 12);

        const syncRes = await syncToSheet(sheetRow, "insert");
        if (syncRes && syncRes.success === false) {
          throw new Error(syncRes.error || "Submission rejected by spreadsheet server");
        }

        // Update Actual and Status cells for the newly inserted row
        const currentDataRes = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&spreadsheetId=${import.meta.env.VITE_SPREADSHEET_ID || "1aF5orXK7u4hI9b-19mO3eiUL6TWZ91GL9uqrEDag9Cc"}&t=${Date.now()}`);
        const totalRows = currentDataRes?.data?.data?.length || (visits.length + 5);
        const actualColIdx = findColIndex(hdrs, ["Actual"], 14) + 1;
        const actualPayload = new URLSearchParams();
        actualPayload.append("action", "updateCell");
        actualPayload.append("sheetName", sheetName);
        actualPayload.append("rowIndex", totalRows.toString());
        actualPayload.append("columnIndex", actualColIdx.toString());
        actualPayload.append("value", actualTimestamp);
        await axios.post(scriptUrl, actualPayload);

        const statusColIdx = findColIndex(hdrs, ["Status"], 16) + 1;
        const statusPayload = new URLSearchParams();
        statusPayload.append("action", "updateCell");
        statusPayload.append("sheetName", sheetName);
        statusPayload.append("rowIndex", totalRows.toString());
        statusPayload.append("columnIndex", statusColIdx.toString());
        statusPayload.append("value", selectedStatusValue);
        await axios.post(scriptUrl, statusPayload);

        await writeAssignMarketingExtras(totalRows);

        showNotification(`${selectedVisit.source} stored in Marketing Visit & marked as ${selectedStatusValue} successfully!`, "success");
      } else if (statusModalType === "Assign Marketing") {
        // Case 2: Manual Visit in Assign Marketing -> Update Actual & Status cells in Marketing Visit sheet
        // 1. Update Actual cell (col 14 -> 1-based column index 15)
        const actualColIdx = findColIndex(sheetHeaders, ["Actual"], 14) + 1;
        const actualPayload = new URLSearchParams();
        actualPayload.append("action", "updateCell");
        actualPayload.append("sheetName", sheetName);
        actualPayload.append("rowIndex", targetRowIndex.toString());
        actualPayload.append("columnIndex", actualColIdx.toString());
        actualPayload.append("value", actualTimestamp);
        await axios.post(scriptUrl, actualPayload);

        // 2. Update Status cell (col 16 -> 1-based column index 17)
        const statusColIdx = findColIndex(sheetHeaders, ["Status"], 16) + 1;
        const statusPayload = new URLSearchParams();
        statusPayload.append("action", "updateCell");
        statusPayload.append("sheetName", sheetName);
        statusPayload.append("rowIndex", targetRowIndex.toString());
        statusPayload.append("columnIndex", statusColIdx.toString());
        statusPayload.append("value", selectedStatusValue);
        await axios.post(scriptUrl, statusPayload);

        await writeAssignMarketingExtras(targetRowIndex);

        showNotification(`Marketing status marked as ${selectedStatusValue} successfully!`, "success");
      } else if (statusModalType === "Report") {
        // Case 3: Report Tab -> Update Actual 1 & Status 1 cells in Marketing Visit sheet
        // 1. Update Actual 1 cell (col 18 -> 1-based column index 19)
        const actual1ColIdx = findColIndex(sheetHeaders, ["Actual 1", "Actual1"], 18) + 1;
        const actualPayload = new URLSearchParams();
        actualPayload.append("action", "updateCell");
        actualPayload.append("sheetName", sheetName);
        actualPayload.append("rowIndex", targetRowIndex.toString());
        actualPayload.append("columnIndex", actual1ColIdx.toString());
        actualPayload.append("value", actualTimestamp);
        await axios.post(scriptUrl, actualPayload);

        // 2. Update Status 1 cell (col 20 -> 1-based column index 21)
        const status1ColIdx = findColIndex(sheetHeaders, ["Status 1", "Status1"], 20) + 1;
        const statusPayload = new URLSearchParams();
        statusPayload.append("action", "updateCell");
        statusPayload.append("sheetName", sheetName);
        statusPayload.append("rowIndex", targetRowIndex.toString());
        statusPayload.append("columnIndex", status1ColIdx.toString());
        statusPayload.append("value", selectedStatusValue);
        await axios.post(scriptUrl, statusPayload);

        showNotification(`Report marked as ${selectedStatusValue} successfully!`, "success");
      }

      setShowStatusModal(false);
      setSelectedVisit(null);
      fetchVisitTrackerData();
    } catch (err) {
      console.error("Failed to update status:", err);
      showNotification("Failed to update status: " + (err.message || err.toString()), "error");
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  // Fetch firm names dropdown from Master sheet
  const fetchMasterFirms = useCallback(async () => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    const masterSheet = import.meta.env.VITE_MASTER_SHEET_NAME || "Master";
    const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1aF5orXK7u4hI9b-19mO3eiUL6TWZ91GL9uqrEDag9Cc";
    if (!scriptUrl) return;

    try {
      const res = await axios.get(`${scriptUrl}?sheet=${encodeURIComponent(masterSheet)}&spreadsheetId=${spreadsheetId}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const allRows = res.data.data;
        const firstRow = (allRows[0] || []).map(h => String(h || "").trim().toLowerCase());
        const rows = allRows.slice(1);

        const getUniqueVal = (possibleNames, defaultIdx) => {
          let foundIdx = firstRow.findIndex(h => possibleNames.some(name => h === name.toLowerCase() || h.includes(name.toLowerCase())));
          const activeIdx = foundIdx !== -1 ? foundIdx : defaultIdx;
          return [...new Set(rows.map((r) => String(r[activeIdx] || "").trim()).filter(Boolean))];
        };

        const parties = getUniqueVal(["party name", "party names", "party", "client"], 1);
        if (parties.length > 0) setExistingParties(parties);

        const salesPersons = getUniqueVal(["name of the sales person", "sales persons", "sales person", "sales executive"], 3);
        if (salesPersons.length > 0) setSalesPersonsList(salesPersons);

        const depts = getUniqueVal(["department", "departments", "dept"], 4);
        if (depts.length > 0) setDepartmentsList(depts);
      }
    } catch (err) {
      console.warn("Using default lists:", err.message);
    }
  }, []);

  // Fetch sheet rows from Marketing Visit, FMS (NBD Lead), and NBD Enquiry
  const fetchVisitTrackerData = useCallback(async () => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    const sheetName =
      import.meta.env.VITE_MARKETING_VISIT_SHEET_NAME || "Marketing Visit";
    const fmsSheetName = import.meta.env.VITE_FMS_SHEET_NAME || "FMS";
    const nbdEnquirySheetName = import.meta.env.VITE_NBD_ENQUIRY_SHEET_NAME || "NBD ENQUIRY FMS";
    const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1aF5orXK7u4hI9b-19mO3eiUL6TWZ91GL9uqrEDag9Cc";
    if (!scriptUrl) return;

    try {
      const [resManual, resFms, resEnquiry] = await Promise.all([
        axios.get(`${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&spreadsheetId=${spreadsheetId}&t=${Date.now()}`).catch(() => null),
        axios.get(`${scriptUrl}?sheet=${encodeURIComponent(fmsSheetName)}&spreadsheetId=${spreadsheetId}&t=${Date.now()}`).catch(() => null),
        axios.get(`${scriptUrl}?sheet=${encodeURIComponent(nbdEnquirySheetName)}&spreadsheetId=${spreadsheetId}&t=${Date.now()}`).catch(() => null)
      ]);

      let manualVisits = [];
      if (resManual?.data?.success && Array.isArray(resManual.data.data)) {
        const rawRows = resManual.data.data;
        let headerIdx = rawRows.findIndex(
          (r) =>
            Array.isArray(r) &&
            (r.includes("Task ID") ||
              r.includes("Task ID.") ||
              r.includes("Timestamp") ||
              r.includes("Name Of Plant"))
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
        manualVisits = dataRows
          .map((row, idx) => {
            if (!row || row.every((c) => !c)) return null;

            const getColVal = (names, defIdx) => {
              const cIdx = findColIndex(curHeaders, names, defIdx);
              return row[cIdx] ? String(row[cIdx]).trim() : "";
            };

            const planned = getColVal(["Planned"], 13);
            const actual = getColVal(["Actual"], 14);
            const delay = getColVal(["Delay"], 15);
            const status = getColVal(["Status"], 16);
            const planned1 = getColVal(["Planned 1", "Planned1"], 17);
            const actual1 = getColVal(["Actual 1", "Actual1"], 18);
            const timeDelay1 = getColVal(["Time Delay 1", "Delay 1", "Delay1"], 19);
            const status1 = getColVal(["Status 1", "Status1"], 20);
            const planned2 = getColVal(["Planned 2", "Planned2"], 21);
            const actual2 = getColVal(["Actual 2", "Actual2"], 22);
            const marketingVisitStatus = getColVal(["Marketing Visit Status", "MarketingVisitStatus", "Person Assign Name 1", "Person Assign Name", "Order Received"], 23);
            const status2 = getColVal(["Status 2", "Status2"], 24);
            const customerSays = getColVal(["What did Customer Says", "What did the Customer say", "What Did The Customer Say", "Action To Be Taken 1", "Action To Be Taken"], 25);
            const nextCallDate = getColVal(["Next Call Date", "Next Date Of Call", "Date Of Visit"], 26);
            const stage = getColVal(["Stage"], 16) || "Marketing";
            const remark = getColVal(["Remark", "Remarks"], 11);
            const shutdown = getColVal(["Shutdown"], 10);

            // Exclude if cancelled or rejected
            if (isCancelledOrRejected(status, status1, status2, marketingVisitStatus, stage, remark, shutdown)) return null;

            let idVal = getColVal(["Task ID", "Task ID.", "Task Id", "TaskID", "Complaint No.", "Complaint No", "Complaint ID", "ID"], 2);
            let timestampVal = getColVal(["Timestamp", "Time Stamp"], 1);
            let visitDateVal = getColVal(["Visit Date", "VisitDate", "Date of Visit", "Date"], 3);
            let salesPersonVal = getColVal(["Sales Person", "SalesPerson", "Person Name"], 4);
            let plantNameVal = getColVal(["Name Of Plant", "Name Of Plant / Client", "Plant Name", "Firm Name", "Party Name"], 5);
            let contactPersonVal = getColVal(["Contact Person", "Customer Name"], 6);
            let designationVal = getColVal(["Designation"], 7);
            let contentDetailsVal = getColVal(["Content Details", "Content no.", "Discussion Details", "Problem"], 8);
            let departmentVal = getColVal(["Department", "Departments", "Dept"], 9);
            let shutdownVal = getColVal(["Shutdown"], 10);
            let remarkVal = getColVal(["Remark", "Remarks"], 11);
            let freqVal = getColVal(["Frequency Of Visit", "Frequency"], 12);

            // Auto-heal shifted rows where column 1 was filled with visitDate instead of Task ID
            const isDatePattern = (str) => /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(String(str || "").trim());
            if (isDatePattern(idVal) && !isDatePattern(visitDateVal)) {
              const fullRowText = (row || []).join(" ");
              const complaintMatch = fullRowText.match(/CO-\d+/i);
              const extractedId = complaintMatch ? complaintMatch[0].toUpperCase() : `CO-${String(idx + 1).padStart(3, "0")}`;

              visitDateVal = idVal;
              salesPersonVal = row[2] ? String(row[2]).trim() : salesPersonVal;
              plantNameVal = row[3] ? String(row[3]).trim() : plantNameVal;
              contactPersonVal = row[4] ? String(row[4]).trim() : contactPersonVal;
              designationVal = row[5] ? String(row[5]).trim() : designationVal;
              contentDetailsVal = row[6] ? String(row[6]).trim() : contentDetailsVal;
              departmentVal = row[7] ? String(row[7]).trim() : departmentVal;
              shutdownVal = row[8] ? String(row[8]).trim() : shutdownVal;
              remarkVal = row[9] ? String(row[9]).trim() : remarkVal;
              freqVal = row[10] ? String(row[10]).trim() : freqVal;
              idVal = extractedId;
            }

            // If ID has TSK-CO- prefix, strip TSK- to show Complaint No. (e.g. CO-001)
            if (/^TSK-CO-\d+/i.test(idVal)) {
              idVal = idVal.replace(/^TSK-/i, "");
            }

            if (!idVal) {
              idVal = `TSK-TEMP-${idx}`;
            }

            return {
              id: idVal,
              timestamp: timestampVal,
              visitDate: visitDateVal,
              salesPerson: salesPersonVal,
              nameOfPlant: plantNameVal,
              contactPerson: contactPersonVal,
              designation: designationVal,
              contentDetails: contentDetailsVal,
              department: departmentVal,
              shutdown: shutdownVal,
              remark: remarkVal,
              frequencyOfVisit: freqVal,
              planned,
              actual,
              delay,
              status,
              planned1,
              actual1,
              timeDelay1,
              status1,
              planned2,
              actual2,
              status2,
              marketingVisitStatus,
              personAssign1: marketingVisitStatus,
              nextCallDate,
              dateOfVisit1: nextCallDate,
              customerSays,
              actionToBeTaken1: customerSays,
              currentStep: marketingVisitStatus || status2 || status1 || status || stage,
              source: "Manual",
              rawRow: [...row],
              sheetRowIndex: headerIdx + 2 + idx,
            };
          })
          .filter(Boolean);
      }

      // 2. Map leads from FMS Sheet (NBD Lead) ONLY where Next Action is "Arrange visit" & not cancelled/rejected
      let nbdLeadVisits = [];
      if (resFms?.data?.success && Array.isArray(resFms.data.data)) {
        const fmsRows = resFms.data.data.slice(6); // Data starts row 7
        nbdLeadVisits = fmsRows
          .filter((row) => {
            if (!row || !row[0] || !String(row[16] || "").trim()) return false;
            const leadId = String(row[1] || "").trim();
            const plantName = String(row[5] || "").trim();
            const contactPerson = String(row[12] || "").trim();

            // If already imported into Marketing Visit sheet, do not show duplicate
            if (manualVisits.some((m) => (leadId && (m.id === leadId || m.remark?.includes(leadId))) || (m.nameOfPlant && plantName && m.nameOfPlant.toLowerCase() === plantName.toLowerCase() && m.contactPerson?.toLowerCase() === contactPerson.toLowerCase()))) {
              return false;
            }

            const nextAction = String(row[16] || "").trim();
            const callStatus = String(row[17] || "").trim();
            const enquiryReceived = String(row[18] || "").trim();
            const remarks = String(row[19] || row[15] || "").trim();

            // Only show if Next Action is "Arrange visit"
            const cleanAction = nextAction.toLowerCase();
            const isArrangeVisit = cleanAction === "arrange visit" || cleanAction.includes("arrange visit") || cleanAction === "visit";
            if (!isArrangeVisit) return false;

            // Strictly exclude if Enquiry Received is Cancel, or if any field contains Cancel/Reject
            if (isCancelledOrRejected(enquiryReceived, callStatus, nextAction, remarks)) {
              return false;
            }
            return true;
          })
          .map((row, idx) => ({
            id: String(row[1] || "").trim() || `LEAD-${idx + 1}`,
            timestamp: formatDisplayDate(row[0]) || "",
            visitDate: formatDisplayDate(row[20]) || formatDisplayDate(row[9]) || formatDisplayDate(row[0]) || "",
            salesPerson: String(row[4] || "").trim(),
            nameOfPlant: String(row[5] || "").trim(),
            contactPerson: String(row[12] || "").trim(),
            designation: String(row[7] || "").trim(), // Location
            department: String(row[6] || "").trim(),
            contentDetails: String(row[16] || "").trim() + (row[11] ? ` (${row[11]})` : ""), // Next Action + Product
            shutdown: String(row[7] || "").trim() || "Lead",
            remark: String(row[19] || row[15] || "").trim(), // Cust. Remarks / Update remarks
            frequencyOfVisit: "",
            currentStep: String(row[17] || "Marketing").trim() || "Marketing",
            source: "NBD Lead",
            rawRow: [...row],
            sheetRowIndex: 7 + idx,
          }));
      }

      // 3. Map enquiries from NBD Enquiry Sheet where Stage is present & not cancelled/rejected
      let nbdEnquiryVisits = [];
      if (resEnquiry?.data?.success && Array.isArray(resEnquiry.data.data)) {
        const allEnquiryRows = resEnquiry.data.data;
        let enqHeaderIdx = 4;
        for (let i = 0; i < Math.min(allEnquiryRows.length, 10); i++) {
          const r = (allEnquiryRows[i] || []).map((c) => String(c || "").trim().toLowerCase().replace(/\.$/, ""));
          if (r.some((cell) => cell === "enquiry no")) {
            enqHeaderIdx = i;
            break;
          }
        }
        const enqHeaders = (allEnquiryRows[enqHeaderIdx] || []).map((c) => String(c || "").trim());
        const enqData = allEnquiryRows.slice(enqHeaderIdx + 1);

        const getEnqCol = (r, name) => {
          const clean = name.toLowerCase().trim().replace(/\.$/, "");
          const idx = enqHeaders.findIndex((h) => h.toLowerCase().trim().replace(/\.$/, "") === clean);
          return idx !== -1 ? String(r[idx] || "").trim() : "";
        };

        nbdEnquiryVisits = enqData
          .filter((row) => {
            if (!row || !getEnqCol(row, "Enquiry No.")) return false;
            const enqNo = getEnqCol(row, "Enquiry No.");
            const partyName = getEnqCol(row, "Party Name") || getEnqCol(row, "Firm Name");
            const contactPerson = getEnqCol(row, "Contact Person Name");

            // If already imported into Marketing Visit sheet, do not show duplicate
            if (manualVisits.some((m) => (enqNo && (m.id === enqNo || m.remark?.includes(enqNo))) || (m.nameOfPlant && partyName && m.nameOfPlant.toLowerCase() === partyName.toLowerCase() && m.contactPerson?.toLowerCase() === contactPerson.toLowerCase()))) {
              return false;
            }

            const enqStatus = getEnqCol(row, "Enquiry status");
            const genStatus = getEnqCol(row, "Status");
            const orderReceived = getEnqCol(row, "Order Recived") || getEnqCol(row, "Order Received");
            const currentStage = getEnqCol(row, "Current Stage");
            const remarks = getEnqCol(row, "What Did the Customer say");

            if (!currentStage && !enqStatus && !orderReceived) return false;

            // Strictly exclude if order is Cancel / Reject / Regret
            if (isCancelledOrRejected(enqStatus, genStatus, orderReceived, currentStage, remarks)) {
              return false;
            }
            return true;
          })
          .map((row, idx) => ({
            id: getEnqCol(row, "Enquiry No.") || `ENQ-${idx + 1}`,
            timestamp: formatDisplayDate(getEnqCol(row, "Timestamp")),
            visitDate: formatDisplayDate(getEnqCol(row, "When Required")) || formatDisplayDate(getEnqCol(row, "Actual 1")) || formatDisplayDate(getEnqCol(row, "Timestamp")),
            salesPerson: getEnqCol(row, "Name Of Sales Person"),
            nameOfPlant: getEnqCol(row, "Party Name") || getEnqCol(row, "Firm Name"),
            contactPerson: getEnqCol(row, "Contact Person Name"),
            designation: getEnqCol(row, "Contact Person Mobile No."),
            department: getEnqCol(row, "Department"),
            contentDetails: getEnqCol(row, "Current Stage") || getEnqCol(row, "Type Of Enquiry") || getEnqCol(row, "Area Of Application"),
            shutdown: getEnqCol(row, "Location") || "Enquiry",
            remark: getEnqCol(row, "What Did the Customer say") || getEnqCol(row, "Proposal Remarks 1"),
            frequencyOfVisit: getEnqCol(row, "Total Order Qty"),
            currentStep: getEnqCol(row, "Enquiry status") || "Marketing",
            source: "NBD Enquiry",
            rawRow: [...row],
            sheetRowIndex: enqHeaderIdx + 2 + idx,
          }));
      }

      // Deduplicate manual visits: If duplicate entries exist for the same ID (e.g. CO-001), keep only the latest one
      const seenIds = new Set();
      const uniqueManualVisits = [];
      for (const v of manualVisits.slice().reverse()) {
        if (!v || !v.id) continue;
        const normId = v.id.trim().toUpperCase();
        if (normId.startsWith("CO-") || normId.startsWith("TSK-") || normId.startsWith("LEAD-") || normId.startsWith("ENQ-")) {
          if (seenIds.has(normId)) {
            continue;
          }
          seenIds.add(normId);
        }
        uniqueManualVisits.push(v);
      }

      // Combine all sources: Manual visits first, then NBD Leads and NBD Enquiries
      const allCombined = [...uniqueManualVisits, ...nbdLeadVisits.reverse(), ...nbdEnquiryVisits.reverse()];
      setVisits(allCombined);
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
    fetchVisitTrackerData();
  }, [fetchMasterFirms, fetchVisitTrackerData]);

  const saveVisits = (newList) => {
    setVisits(newList);
  };

  const syncToSheet = async (rowDataArray, actionType = "insert", rowIndex = null) => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    const sheetName =
      import.meta.env.VITE_MARKETING_VISIT_SHEET_NAME || "Marketing Visit";
    const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1aF5orXK7u4hI9b-19mO3eiUL6TWZ91GL9uqrEDag9Cc";
    if (!scriptUrl) return { success: false, error: "No Script URL configured" };

    try {
      const payload = new URLSearchParams();
      payload.append("action", actionType);
      payload.append("sheetName", sheetName);
      payload.append("spreadsheetId", spreadsheetId);
      payload.append("rowData", JSON.stringify(rowDataArray));
      if (rowIndex !== null) payload.append("rowIndex", String(rowIndex));
      const res = await axios.post(scriptUrl, payload);
      return res.data;
    } catch (err) {
      console.warn("Background sync failed:", err.message);
      throw err;
    }
  };

  const getTabCount = (tabName) => {
    if (tabName === "All") return visits.filter((v) => !isHistoryTab(v)).length;
    if (tabName === "Assign Marketing") {
      return visits.filter(isAssignMarketingTab).length;
    }
    if (tabName === "Report") {
      return visits.filter(isReportTab).length;
    }
    if (tabName === "Call Tracker") {
      return visits.filter(isCallTrackerTab).length;
    }
    if (tabName === "History") {
      return visits.filter(isHistoryTab).length;
    }
    return visits.filter((c) => c.currentStep === tabName).length;
  };

  const finalSalesPersonsList = useMemo(() => {
    const list = [...salesPersonsList];
    const userVal = currentUser?.username || "Admin";
    if (!list.includes(userVal)) {
      list.push(userVal);
    }
    return Array.from(new Set(list));
  }, [salesPersonsList, currentUser]);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      let matchesTab = false;
      if (activeTab === "All") {
        matchesTab = !isHistoryTab(v);
      } else if (activeTab === "Assign Marketing") {
        matchesTab = isAssignMarketingTab(v);
      } else if (activeTab === "Report") {
        matchesTab = isReportTab(v);
      } else if (activeTab === "Call Tracker") {
        matchesTab = isCallTrackerTab(v);
      } else if (activeTab === "History") {
        matchesTab = isHistoryTab(v);
      } else {
        matchesTab = v.currentStep === activeTab;
      }

      const matchesSearch =
        searchQuery.trim() === "" ||
        (v.nameOfPlant && v.nameOfPlant.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.id && v.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.source && v.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.salesPerson && v.salesPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.contentDetails && v.contentDetails.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.status1 && v.status1.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFirm =
        firmFilter === "all" ||
        (v.nameOfPlant && v.nameOfPlant.toLowerCase() === firmFilter.toLowerCase());

      return matchesTab && matchesSearch && matchesFirm;
    });
  }, [visits, activeTab, searchQuery, firmFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nameOfPlant) {
      setErrorMsg("Plant Name is required");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const now = new Date();
      const timestampStr = formatIndianTimestamp(now);
      const formattedVisitDate = formatToIndianDate(formData.visitDate);

      const newRecord = {
        id: currentTaskId,
        timestamp: timestampStr,
        visitDate: formattedVisitDate,
        salesPerson: selectedSalesPerson,
        nameOfPlant: formData.nameOfPlant,
        contactPerson: formData.contactPerson,
        designation: formData.designation,
        contentDetails: formData.contentDetails,
        department: formData.department,
        shutdown: formData.shutdown,
        remark: formData.remark,
        frequencyOfVisit: formData.frequencyOfVisit,
        currentStep: "Marketing",
        source: "Manual",
      };

      const hdrs = sheetHeaders.length > 0 ? sheetHeaders : DEFAULT_HEADERS;
      
      // Only populate columns 0 to 12 (Status Of Complaint up to Frequency Of Visit).
      // Column 13 ("Planned") and subsequent columns are formula-driven or updated in later stages.
      // Keeping sheetRow length to 13 prevents overwriting/corrupting spreadsheet formulas.
      let sheetRow = new Array(13).fill("");

      const setColVal = (names, val, defaultIdx) => {
        const idx = findColIndex(hdrs, names, defaultIdx);
        if (idx < 13) {
          sheetRow[idx] = val;
        }
      };

      setColVal(["Status Of Complaint"], "", 0);
      setColVal(["Timestamp", "Time Stamp"], timestampStr, 1);
      setColVal(["Task ID", "Task ID.", "Task Id", "TaskID"], currentTaskId, 2);
      setColVal(["Visit Date", "VisitDate", "Date of Visit", "Date"], formattedVisitDate, 3);
      setColVal(["Sales Person", "SalesPerson", "Person Name"], newRecord.salesPerson, 4);
      setColVal(["Name Of Plant", "Plant Name", "Name of Plant / Client", "Firm Name", "Party Name"], formData.nameOfPlant, 5);
      setColVal(["Contact Person", "Customer Name"], formData.contactPerson, 6);
      setColVal(["Designation"], formData.designation, 7);
      setColVal(["Content Details", "Content no.", "Discussion Details", "Problem"], newRecord.contentDetails, 8);
      setColVal(["Department", "Departments", "Dept"], newRecord.department, 9);
      setColVal(["Shutdown"], formData.shutdown, 10);
      setColVal(["Remark", "Remarks"], formData.remark, 11);
      setColVal(["Frequency Of Visit", "Frequency"], formData.frequencyOfVisit, 12);

      const syncRes = await syncToSheet(sheetRow, "insert");
      if (syncRes && syncRes.success === false) {
        throw new Error(syncRes.error || "Submission rejected by spreadsheet server");
      }
      setShowNewModal(false);
      resetForm();
      showNotification(`Visit report saved successfully`, "success");
      fetchVisitTrackerData();
    } catch (err) {
      setErrorMsg(`Failed submission: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="py-2">
        
        {/* Error banner */}
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex space-x-2 rounded-2xl bg-white p-1.5 mb-8 w-fit mx-auto overflow-x-auto border border-slate-200 shadow-sm">
          {TABS.map((tab) => {
            const count = getTabCount(tab);
            const isActive = activeTab === tab;
            const iconCls = `h-4 w-4 ${isActive ? "" : "text-gray-400"}`;
            const renderTabIcon = () => {
              if (tab === "All") return <ClipboardList className={iconCls} />;
              if (tab === "Assign Marketing") return <Send className={iconCls} />;
              if (tab === "Report") return <FileText className={iconCls} />;
              if (tab === "Call Tracker") return <PhoneCall className={iconCls} />;
              if (tab === "History") return <History className={iconCls} />;
              return <ClipboardList className={iconCls} />;
            };

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center text-xs font-medium leading-4 transition-all duration-200 [&>svg]:hidden sm:flex-row sm:gap-2 sm:px-4 sm:text-left sm:text-sm sm:leading-5 sm:whitespace-nowrap sm:[&>svg]:block ${
                  isActive
                    ? "bg-[#14533a]/10 text-[#14533a] shadow-sm ring-1 ring-[#14533a]/20"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {renderTabIcon()}
                {tab}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? "bg-[#14533a]/10 text-[#14533a]" : "bg-gray-100 text-gray-500"
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
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search visits (Plant, Person, Source, Details)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-[#14533a]/50 focus:border-[#14533a] border-gray-300 text-sm"
                />
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
              </div>
              <select
                value={firmFilter}
                onChange={(e) => setFirmFilter(e.target.value)}
                className="px-4 py-2 border rounded-md border-gray-300 bg-card text-sm max-w-xs truncate focus:outline-none focus:ring-2 focus:ring-[#14533a]/50 focus:border-[#14533a]"
              >
                <option value="all">All Plants</option>
                {existingParties.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={openNewModal}
              className="bg-[#14533a] hover:bg-[#0f3f2b] text-white font-medium py-2 px-4 rounded-md whitespace-nowrap text-sm shadow-sm transition flex items-center gap-1.5 justify-center"
            >
              <Plus size={16} />
              Log Client Plant Visit Report
            </button>
          </div>
        </div>

        {/* Visits Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  {(activeTab === "Assign Marketing" || activeTab === "Report" || activeTab === "Call Tracker") && (
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                      Action
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Task ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Visit Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Sales Person
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Plant Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Contact Person
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Designation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Discussion Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Remarks
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Status 1
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Status 2
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Marketing Visit Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                    Stage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-muted">
                    {activeTab === "Assign Marketing" && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <button
                          type="button"
                          onClick={() => openStatusModal(v, "Assign Marketing")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14533a] hover:bg-[#0f3f2b] text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <CheckCircle size={14} />
                          Action
                        </button>
                      </td>
                    )}
                    {activeTab === "Report" && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <button
                          type="button"
                          onClick={() => openStatusModal(v, "Report")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14533a] hover:bg-[#0f3f2b] text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <CheckCircle size={14} />
                          Action
                        </button>
                      </td>
                    )}
                    {activeTab === "Call Tracker" && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <button
                          type="button"
                          onClick={() => openCallTrackerModal(v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14533a] hover:bg-[#0f3f2b] text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <PhoneCall size={14} />
                          Action
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 text-sm font-semibold">
                        {v.id}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {v.source === "NBD Lead" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                          NBD Lead
                        </span>
                      ) : v.source === "NBD Enquiry" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          NBD Enquiry
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground font-medium">
                      {v.visitDate || formatDisplayDate(v.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-foreground">
                      {v.salesPerson}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {v.nameOfPlant}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {v.contactPerson}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {v.designation}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {v.department}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate" title={v.contentDetails}>
                      {v.contentDetails}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {v.shutdown}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate" title={v.remark}>
                      {v.remark}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {v.status ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          String(v.status).toLowerCase() === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : String(v.status).toLowerCase() === "rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {v.status}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {v.status1 ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          String(v.status1).toLowerCase() === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : String(v.status1).toLowerCase() === "rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {v.status1}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {v.status2 ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          String(v.status2).toUpperCase() === "HOT"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : String(v.status2).toUpperCase() === "WARM"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {v.status2}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {v.marketingVisitStatus ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          String(v.marketingVisitStatus).toLowerCase() === "yes"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : String(v.marketingVisitStatus).toLowerCase() === "no"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {v.marketingVisitStatus}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      <span className="bg-[#e8f3ee] text-[#14533a] px-2.5 py-1 rounded-full text-xs font-semibold border border-[#14533a]/20">
                        {v.currentStep}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredVisits.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No visit reports found.
              </div>
            )}
          </div>
        </div>

        {/* Modal: Log Client Plant Visit Report */}
        {showNewModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewModal(false)}
          >
            <div
              className="bg-card rounded-xl shadow-xl border border-slate-100 overflow-hidden w-full max-w-2xl mx-auto flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#14533a] px-6 py-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-2">
                  <ClipboardList size={20} />
                  <h2 className="text-base md:text-lg font-bold tracking-tight">Log Client Plant Visit Report</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="text-white hover:text-green-200 transition-colors p-1 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                  {/* Read-Only Prefills Bar */}
                  <div className="bg-primary/20 border border-emerald-100 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground font-medium block mb-1">Generated Task ID</span>
                      <span className="font-mono font-bold text-[#14533a] bg-card px-2 py-1 rounded border border-primary/30 block">
                        {currentTaskId}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium block mb-1">Visit Date</span>
                      <input
                        type="date"
                        name="visitDate"
                        required
                        value={formData.visitDate}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1 bg-card border border-primary/30 rounded text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-[#14533a] cursor-pointer text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium block mb-1">Assigned Sales Executive</span>
                      {(isAdmin && isAdmin()) ? (
                        <select
                          value={selectedSalesPerson}
                          onChange={(e) => setSelectedSalesPerson(e.target.value)}
                          className="w-full px-2 py-1 bg-card border border-primary/30 rounded text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-[#14533a] cursor-pointer text-xs"
                        >
                          {finalSalesPersonsList.map((sp, idx) => (
                            <option key={idx} value={sp}>
                              {sp}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-bold text-[#14533a] bg-card px-2 py-0.5 rounded border border-emerald-100">
                          {currentUser?.username || "Admin"}
                        </span>
                      )}
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-semibold">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  {/* Name of Plant */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Name of Plant / Client <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPlantActive(!customPlantActive);
                          setFormData((prev) => ({ ...prev, nameOfPlant: "" }));
                        }}
                        className="text-xs text-[#14533a] hover:text-[#0f3f2b] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {customPlantActive ? (
                          <>Select from Registered List</>
                        ) : (
                          <>
                            <Plus size={13} />
                            Add New Custom Plant
                          </>
                        )}
                      </button>
                    </div>

                    {customPlantActive ? (
                      <input
                        type="text"
                        name="nameOfPlant"
                        required
                        placeholder=""
                        value={formData.nameOfPlant}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a] text-foreground text-sm"
                      />
                    ) : (
                      <select
                        name="nameOfPlant"
                        value={formData.nameOfPlant}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a] text-foreground text-sm"
                      >
                        <option value="">-- Choose Client Plant --</option>
                        {existingParties.map((p, idx) => (
                          <option key={idx} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Contact Person & Designation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Contact Person <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="contactPerson"
                        required
                        placeholder=""
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a] text-foreground text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Designation <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="designation"
                        required
                        placeholder=""
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a] text-foreground text-sm"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Department <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required={!customDeptActive}
                      value={customDeptActive ? "__custom__" : formData.department}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setCustomDeptActive(true);
                          setFormData((prev) => ({ ...prev, department: "" }));
                        } else {
                          setCustomDeptActive(false);
                          setFormData((prev) => ({ ...prev, department: e.target.value }));
                        }
                      }}
                      className="w-full px-3 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a] text-foreground text-sm"
                    >
                      <option value="">-- Select Department --</option>
                      {departmentsList.map((dept, idx) => (
                        <option key={idx} value={dept}>{dept}</option>
                      ))}
                      <option value="__custom__">Custom...</option>
                    </select>
                    {customDeptActive && (
                      <input
                        type="text"
                        name="department"
                        required
                        placeholder="Enter custom department name"
                        value={formData.department}
                        onChange={handleInputChange}
                        autoFocus
                        className="w-full px-3 py-3 bg-card border border-[#14533a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a] text-foreground text-sm"
                      />
                    )}
                  </div>

                  {/* Discussion & Content Details */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Content no. / Discussion Details <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      name="contentDetails"
                      required
                      rows={4}
                      placeholder=""
                      value={formData.contentDetails}
                      onChange={handleInputChange}
                      className="w-full px-3 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a] text-foreground text-sm"
                    />
                  </div>

                  {/* Type */}
                  <div className="p-4 bg-muted rounded-xl border border-border/60">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Type?
                      </label>
                      <select
                        name="shutdown"
                        value={formData.shutdown}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a]"
                      >
                        <option value="Project">Project</option>
                        <option value="Shutdown">Shutdown</option>
                      </select>
                    </div>
                  </div>

                  {/* Next Visit Frequency — drives when this plant shows up again as "due for a visit" */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Next Visit Due In <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="frequencyOfVisit"
                      required
                      value={formData.frequencyOfVisit}
                      onChange={handleInputChange}
                      className="w-full px-3 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a] text-foreground text-sm"
                    >
                      <option value="">-- Select Frequency --</option>
                      <option value="7">Every 7 days</option>
                      <option value="15">Every 15 days</option>
                      <option value="30">Every 30 days</option>
                      <option value="45">Every 45 days</option>
                      <option value="60">Every 60 days</option>
                      <option value="90">Every 90 days</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground">This plant will reappear in "Assign Marketing" once this many days have passed since the visit date.</p>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Remarks & Immediate Action Items
                    </label>
                    <textarea
                      name="remark"
                      rows={2}
                      placeholder=""
                      value={formData.remark}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a] text-foreground text-sm"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end border-t border-slate-100 px-6 py-4 shrink-0 bg-card">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    disabled={loading}
                    className="px-4 py-2 bg-muted/50 hover:bg-slate-200 text-muted-foreground font-semibold text-xs md:text-sm rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-[#14533a] hover:bg-[#0f3f2b] text-white font-bold text-xs md:text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Logging Report...
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Submit and Save to Spreadsheet
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Update Status (Approved / Rejected) for Assign Marketing or Report */}
        {showStatusModal && selectedVisit && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => !isStatusSubmitting && setShowStatusModal(false)}
          >
            <div
              className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden w-full max-w-xl mx-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-[#14533a] px-6 py-5 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <FileText size={22} />
                  <h2 className="text-base md:text-xl font-bold tracking-tight">
                    {statusModalType === "Assign Marketing" ? "Assign Marketing Action & Status" : "Report Action & Status"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => !isStatusSubmitting && setShowStatusModal(false)}
                  disabled={isStatusSubmitting}
                  className="text-white hover:text-green-200 transition-colors p-1 cursor-pointer disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleStatusSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 sm:p-8 space-y-7 overflow-y-auto flex-1">
                {/* Details Summary Card */}
                <div className="bg-primary/20 border border-emerald-100 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground font-semibold shrink-0">Task ID:</span>
                    <span className="font-mono font-bold text-[#14533a] bg-card px-2 py-0.5 rounded border border-primary/30">
                      {selectedVisit.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground font-semibold shrink-0">Visit Date:</span>
                    <span className="font-medium text-foreground">{selectedVisit.visitDate || formatDisplayDate(selectedVisit.timestamp)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground font-semibold shrink-0">Plant Name:</span>
                    <span className="font-bold text-foreground truncate">{selectedVisit.nameOfPlant}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground font-semibold shrink-0">Sales Person:</span>
                    <span className="font-medium text-foreground truncate">{selectedVisit.salesPerson}</span>
                  </div>
                </div>

                {/* Status Selection Cards — kept for Report tab; hidden for Assign Marketing
                    since Order Status below already captures the meaningful outcome there */}
                {statusModalType !== "Assign Marketing" && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Select Status 1
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Approved Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedStatusValue("Approved")}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedStatusValue === "Approved"
                            ? "border-emerald-600 bg-emerald-50/80 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20"
                            : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <CheckCircle className={`h-8 w-8 mb-2 ${selectedStatusValue === "Approved" ? "text-emerald-600" : "text-muted-foreground/60"}`} />
                        <span className="font-bold text-sm">Approved</span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Approve and proceed</span>
                      </button>

                      {/* Rejected Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedStatusValue("Rejected")}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedStatusValue === "Rejected"
                            ? "border-rose-600 bg-rose-50/80 text-rose-800 shadow-sm ring-2 ring-rose-500/20"
                            : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <XCircle className={`h-8 w-8 mb-2 ${selectedStatusValue === "Rejected" ? "text-rose-600" : "text-muted-foreground/60"}`} />
                        <span className="font-bold text-sm">Rejected</span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Reject status</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Extra close-out fields — only when logging an actual visit outcome */}
                {statusModalType === "Assign Marketing" && (
                  <>
                    {/* Order Status */}
                    <div className="space-y-2.5">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Order Status
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {["Yes", "No", "Pending"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setOrderStatusValue(opt)}
                            className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer ${
                              orderStatusValue === opt
                                ? opt === "Yes"
                                  ? "border-emerald-600 bg-emerald-50/80 text-emerald-800 shadow-sm"
                                  : opt === "No"
                                    ? "border-rose-600 bg-rose-50/80 text-rose-800 shadow-sm"
                                    : "border-amber-500 bg-amber-50/80 text-amber-800 shadow-sm"
                                : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            {opt === "Yes" && <CheckCircle className="h-5 w-5" />}
                            {opt === "No" && <XCircle className="h-5 w-5" />}
                            {opt === "Pending" && <History className="h-5 w-5" />}
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* What Did The Customer Say */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        What Did The Customer Say
                      </label>
                      <textarea
                        rows={4}
                        value={customerSayValue}
                        onChange={(e) => setCustomerSayValue(e.target.value)}
                        placeholder="Enter customer feedback from the visit..."
                        className="w-full px-3.5 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14533a]/20 focus:border-[#14533a] text-foreground text-sm resize-none"
                      />
                    </div>

                    {/* Visit Photos */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Visit Photos <span className="normal-case font-medium text-muted-foreground/70">(optional)</span>
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              id={`visit-photo-${i}`}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setVisitPhotos((prev) => prev.map((p, idx) => (idx === i ? file : p)));
                              }}
                            />
                            <label
                              htmlFor={`visit-photo-${i}`}
                              className={`flex flex-col items-center justify-center gap-1 h-24 rounded-xl border-2 border-dashed cursor-pointer text-center px-1.5 transition-colors ${
                                visitPhotos[i]
                                  ? "border-emerald-400 bg-emerald-50/60 text-emerald-700"
                                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:border-[#14533a]/40"
                              }`}
                            >
                              {visitPhotos[i] ? (
                                <>
                                  <CheckCircle className="h-5 w-5" />
                                  <span className="text-[10px] font-semibold truncate w-full">{visitPhotos[i].name}</span>
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="h-5 w-5" />
                                  <span className="text-[11px] font-semibold">Photo {i + 1}</span>
                                </>
                              )}
                            </label>
                            {visitPhotos[i] && (
                              <button
                                type="button"
                                onClick={() => setVisitPhotos((prev) => prev.map((p, idx) => (idx === i ? null : p)))}
                                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow cursor-pointer"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end px-6 py-4 border-t border-border shrink-0 bg-card">
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(false)}
                    disabled={isStatusSubmitting}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold text-xs md:text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isStatusSubmitting}
                    className="px-5 py-2 bg-[#14533a] hover:bg-[#0f3f2b] text-white font-bold text-xs md:text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isStatusSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {isUploadingPhotos ? "Uploading photos..." : "Submitting..."}
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Submit Status
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Call Tracker Action Modal */}
        {showCallTrackerModal && selectedVisit && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => !isCallTrackerSubmitting && setShowCallTrackerModal(false)}
          >
            <div
              className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden w-full max-w-md mx-auto flex flex-col animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-3 flex justify-between items-center border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <PhoneCall size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Call Tracker</h2>
                    <p className="text-xs text-muted-foreground font-medium">
                      {selectedVisit.nameOfPlant || "Plant"} · <span className="font-bold text-emerald-700">{selectedVisit.id}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isCallTrackerSubmitting && setShowCallTrackerModal(false)}
                  disabled={isCallTrackerSubmitting}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted cursor-pointer disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCallTrackerSubmit} className="p-6 space-y-4">
                {/* 1. MARKETING VISIT STATUS */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    MARKETING VISIT STATUS
                  </label>
                  <select
                    value={callTrackerForm.marketingVisitStatus}
                    onChange={(e) => setCallTrackerForm((prev) => ({ ...prev, marketingVisitStatus: e.target.value }))}
                    className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* 2. STATUS */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    STATUS
                  </label>
                  <select
                    value={callTrackerForm.status}
                    onChange={(e) => setCallTrackerForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  >
                    <option value="WARM">WARM</option>
                    <option value="HOT">HOT</option>
                    <option value="COLD">COLD</option>
                  </select>
                </div>

                {/* 3. WHAT DID THE CUSTOMER SAY * */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    WHAT DID THE CUSTOMER SAY <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={callTrackerForm.customerSay}
                    onChange={(e) => setCallTrackerForm((prev) => ({ ...prev, customerSay: e.target.value }))}
                    rows={3}
                    required
                    placeholder="Enter customer feedback or remarks..."
                    className="w-full px-3.5 py-2.5 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-none"
                  />
                </div>

                {/* 4. NEXT DATE OF CALL (Only shown when Status is Pending) */}
                {callTrackerForm.marketingVisitStatus === "Pending" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      NEXT DATE OF CALL
                    </label>
                    <input
                      type="date"
                      value={callTrackerForm.nextCallDate}
                      onChange={(e) => setCallTrackerForm((prev) => ({ ...prev, nextCallDate: e.target.value }))}
                      className="w-full h-10 px-3 border border-border rounded-xl text-[13px] text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowCallTrackerModal(false)}
                    disabled={isCallTrackerSubmitting}
                    className="h-10 px-5 border border-border rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCallTrackerSubmitting}
                    className="h-10 px-6 bg-[#14533a] hover:bg-[#0f3f2b] disabled:opacity-50 text-white rounded-xl font-semibold text-[13px] flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    {isCallTrackerSubmitting && (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/40 border-t-white" />
                    )}
                    {isCallTrackerSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
