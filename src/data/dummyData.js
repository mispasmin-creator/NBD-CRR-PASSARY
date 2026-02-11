
export const users = [
    { username: "admin", password: "123", userType: "admin" },
    { username: "user1", password: "123", userType: "user" },
    { username: "Shadab", password: "123", userType: "admin" }
];

export const dropdowns = {
    receivers: ["Shadab", "Sajit", "Musaib", "Faizan"],
    sources: ["Indiamart", "Justdial", "Social Media", "Website", "Referral", "Other"],
    states: ["Andhra Pradesh", "Assam", "Bihar", "Delhi", "Gujarat", "Haryana", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"],
    creditDays: ["7 days", "15 days", "30 days", "45 days", "60 days"],
    creditLimits: ["₹50,000", "₹100,000", "₹500,000", "₹1,000,000"],
    designations: ["Manager", "Director", "CEO", "CFO", "Proprietor", "Purchase Manager"],
    nobs: ["Manufacturing", "Trading", "Service", "Retail", "OEM"],
    statuses: ["hot", "warm", "cold"],
    feedbacks: ["Interested", "Not Interested", "Asked for Quotation", "Callback Later", "Busy", "Wrong Number"]
};

export const companies = [
    {
        name: "ABC Corp",
        salesPerson: "Shadab",
        phoneNumber: "9876543210",
        email: "contact@abccorp.com",
        location: "Mumbai",
        consignorState: "Maharashtra",
        consignorAddress: "123, Industrial Area, Mumbai",
        consignorGSTIN: "27ABCDE1234F1Z5"
    },
    {
        name: "XYZ Pvt Ltd",
        salesPerson: "Sajit",
        phoneNumber: "8765432109",
        email: "info@xyz.com",
        location: "Delhi",
        consignorState: "Delhi",
        consignorAddress: "456, Okhla Phase 3, Delhi",
        consignorGSTIN: "07VWXYZ1234F1Z5"
    }
];

export const fmsData = [
    {
        date: "01/12/2024",
        leadNumber: "LD-001",
        receiver: "Shadab",
        source: "Indiamart",
        company: "ABC Corp",
        assignedUser: "Shadab",
        status: "Pending", // Example status
        followUpDate: "05/12/2024",
        hasPendingFollowUp: true
    },
    {
        date: "02/12/2024",
        leadNumber: "LD-002",
        receiver: "Sajit",
        source: "Website",
        company: "XYZ Pvt Ltd",
        assignedUser: "Sajit",
        status: "Completed",
        followUpDate: "",
        hasPendingFollowUp: false
    }
];

export const quotations = [
    {
        date: "03/12/2024",
        quotationNo: "NBD-001",
        assignedUser: "Shadab",
        companyName: "ABC Corp",
        total: 50000,
        items: []
    }
];

export const enquiryTracker = [
    {
        date: "04/12/2024",
        enquiryNo: "ENQ-001",
        assignedUser: "Shadab",
        orderReceived: "Yes",
        status: "Closed"
    },
    {
        date: "05/12/2024",
        enquiryNo: "ENQ-002",
        assignedUser: "Sajit",
        orderReceived: "No",
        status: "Pending"
    }
];

export const enquiryToOrder = [
    {
        date: "04/12/2024",
        enquiryNo: "ENQ-001",
        assignedUser: "Shadab",
        status: "Pending"
    }
];

export const products = [
    { code: "P001", name: "Product A", description: "High quality widget", rate: 1000 },
    { code: "P002", name: "Product B", description: "Premium gadget", rate: 2500 },
    { code: "P003", name: "Product C", description: "Standard component", rate: 500 }
];
