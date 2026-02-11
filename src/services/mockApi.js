
import { users, dropdowns, companies, fmsData, quotations, enquiryTracker, enquiryToOrder, products } from '../data/dummyData';

const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 500));

export const mockApi = {
    login: async (username, password) => {
        await simulateDelay();
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            return {
                success: true,
                user: {
                    username: user.username,
                    userType: user.userType,
                    loginTime: new Date().toISOString()
                }
            };
        }
        return { success: false, message: "Invalid credentials" };
    },

    fetchUserData: async (username, userType) => {
        await simulateDelay();
        // In the original app, this returned rows from 'Data' sheet.
        // We'll mimic that by returning fmsData, filtered if necessary.
        // The original app expected raw rows. We should probably return clean objects
        // and update the app to use them. For now, let's return clean objects.
        if (userType === 'admin') {
            return fmsData;
        }
        return fmsData.filter(d => d.assignedUser === username);
    },

    fetchDropdowns: async () => {
        await simulateDelay();
        return dropdowns;
    },

    fetchCompanies: async () => {
        await simulateDelay();
        return companies;
    },

    submitLead: async (leadData) => {
        await simulateDelay();
        console.log("Submitting lead to dummy DB:", leadData);
        // In a real app we'd push to fmsData, but for now just return success
        return { success: true };
    },

    generateLeadNumber: async () => {
        await simulateDelay();
        // Find max lead number
        // sophisticated logic could be here, but "LD-003" is fine for dummy
        return "LD-003";
    },

    // Dashboard Metrics
    fetchDashboardMetrics: async (currentUser, isAdminFunc) => {
        await simulateDelay();

        // Logic adapted from DashboardMetrics.jsx
        const username = currentUser?.username;

        const filterUser = (item) => {
            if (isAdminFunc()) return true;
            return item.assignedUser === username;
        };

        const myFms = fmsData.filter(filterUser);
        const myQuotations = quotations.filter(filterUser);
        const myEnquiries = enquiryTracker.filter(filterUser);
        const myEnquiryToOrder = enquiryToOrder.filter(filterUser);

        return {
            totalLeads: myFms.length.toString(),
            pendingFollowups: myFms.filter(d => d.hasPendingFollowUp).length.toString(),
            quotationsSent: myQuotations.length.toString(),
            ordersReceived: myEnquiries.filter(d => d.orderReceived === "Yes").length.toString(),
            totalEnquiry: myEnquiryToOrder.length.toString(), // Approximated
            pendingEnquiry: myEnquiryToOrder.filter(d => d.status === "Pending").length.toString()
        };
    },

    fetchFollowUps: async (currentUser, isAdminFunc) => {
        await simulateDelay();

        // Logic adapted from FollowUp.jsx
        const username = currentUser?.username;

        // Process Pending Follow-ups from fmsData
        // Condition: has column K (index 27 in code, likely followUpDate) and column L (index 28, ??) is empty
        // In our dummy data, we used 'hasPendingFollowUp' flag for simplicity.
        // Let's refine fmsData in dummyData.js or just map it here.

        // We will just use the dummy data as is and add missing fields on the fly if needed
        // or assume dummy data is shaped correctly.

        const pendingFollowUps = fmsData.filter(row => {
            // assignedUser check
            const assignedUser = row.assignedUser;
            const shouldInclude = isAdminFunc() || assignedUser === username;
            return shouldInclude && row.hasPendingFollowUp;
        }).map(row => ({
            timestamp: row.date,
            id: row.leadNumber,
            leadId: row.leadNumber,
            companyName: row.company,
            personName: "John Doe", // Dummy
            phoneNumber: "9876543210",
            leadSource: row.source,
            location: "Mumbai",
            customerSay: "Interested",
            enquiryStatus: "New",
            createdAt: row.date,
            nextCallDate: row.followUpDate, // Mapping 'followUpDate' to 'nextCallDate'
            priority: "High",
            assignedTo: row.assignedUser,
            itemQty: ""
        }));

        // History from leadsTracker. We don't have leadsTracker in dummyData yet.
        // Let's create a quick dummy array here or use existing
        const historyFollowUps = [
            {
                timestamp: "01/12/2024",
                leadNo: "LD-001",
                companyName: "ABC Corp",
                customerSay: "Called back",
                status: "Pending",
                enquiryReceivedStatus: "New",
                enquiryReceivedDate: "01/12/2024",
                enquiryState: "Maharashtra",
                projectName: "Project A",
                salesType: "Direct",
                requiredProductDate: "10/12/2024",
                projectApproxValue: "50000",
                itemName1: "Item A",
                quantity1: "10",
                nextAction: "Call again",
                nextCallDate: "05/12/2024",
                nextCallTime: "10:00 AM",
                historyDateFilter: "Date(2024,11,5)",
                assignedTo: "Shadab",
                itemQty: ""
            }
        ].filter(row => {
            const assignedUser = row.assignedTo;
            return isAdminFunc() || assignedUser === username;
        });

        return {
            pending: pendingFollowUps,
            history: historyFollowUps
        };
    },

    fetchCallTrackers: async (currentUser, isAdminFunc) => {
        await simulateDelay();
        const username = currentUser?.username;

        // Pending Call Trackers from FMS
        // Condition: Column BA (index 52) has data AND Column BB (index 53) is empty
        const pendingCallTrackers = fmsData.filter(row => {
            const assignedUser = row.assignedUser; // Using same user assignment logic
            const shouldInclude = isAdminFunc() || assignedUser === username;
            // Dummy logic for pending call tracker
            return shouldInclude && row.hasPendingCallTracker;
        }).map((row, index) => ({
            id: index + 1,
            timestamp: row.date,
            leadId: row.leadNumber,
            receiverName: "Receiver",
            leadSource: row.source,
            salespersonName: "Salesperson",
            phoneNumber: "9876543210",
            companyName: row.company,
            createdAt: row.date,
            status: "Expected",
            priority: "Medium", // Simplified
            stage: "Pending",
            dueDate: "",
            assignedTo: row.assignedUser,
            currentStage: "Stage 1",
            callingDate: "today", // Simplified for filter testing
            itemQty: ""
        }));

        // History Call Trackers from Enquiry Tracker (using enquiryTracker dummy data)
        const historyCallTrackers = enquiryTracker.filter(row => {
            // assignedUser logic needed if present in dummyData
            // Assuming dummyData doesn't have assignedUser for enquiryTracker yet, we'll fake it or skip filter
            return true;
        }).map((row, index) => ({
            id: index + 1,
            timestamp: row.date,
            enquiryNo: row.enquiryNo,
            enquiryStatus: "Active",
            customerFeedback: "Good",
            currentStage: "Negotiation",
            sendQuotationNo: "Q-123",
            quotationSharedBy: "Sales",
            quotationNumber: "Q-123",
            valueWithoutTax: "1000",
            valueWithTax: "1180",
            quotationUpload: "",
            quotationRemarks: "",
            nextCallDate: "05/12/2024",
            nextCallTime: "10:00 AM",
            orderStatus: "Pending",
            acceptanceVia: "",
            paymentMode: "",
            paymentTerms: "",
            transportMode: "",
            registrationFrom: "",
            orderVideo: "",
            acceptanceFile: "",
            orderRemark: "",
            apologyVideo: "",
            reasonStatus: "",
            reasonRemark: "",
            holdReason: "",
            holdingDate: "",
            holdRemark: "",
            priority: "Medium",
            callingDate: "10/12/2024",
            assignedTo: currentUser?.username || "admin", // Dummy assignment
            itemQty: ""
        }));

        // Direct Enquiry Pending from Enquiry To Order (enquiryToOrder dummy data)
        const directEnquiryPendingTrackers = enquiryToOrder.filter(row => {
            return row.status === "Pending";
        }).map((row, index) => ({
            id: index + 1,
            timestamp: row.date,
            leadId: row.leadNumber,
            receiverName: "Receiver",
            leadSource: "Direct",
            salespersonName: "Salesperson",
            companyName: row.company,
            createdAt: row.date,
            status: "Expected",
            priority: "High",
            stage: "Pending",
            dueDate: "",
            assignedTo: currentUser?.username || "admin",
            currentStage: "Order",
            callingDate: "today",
            callingDate1: "today",
            itemQty: ""
        }));

        return {
            pending: pendingCallTrackers,
            history: historyCallTrackers,
            directEnquiry: directEnquiryPendingTrackers
        };
    },

    submitFollowUp: async (data) => {
        await simulateDelay();
        // Mimic success
        console.log("Mock submit follow up:", data);
        return { success: true };
    },

    submitCallTracker: async (data) => {
        await simulateDelay();
        console.log("Mock submit call tracker:", data);
        return { success: true };
    },

    fetchLatestQuotationNumber: async (enquiryNo) => {
        await simulateDelay();
        // Dummy logic
        return "Q-123";
    },

    getLatestOrderNumber: async () => {
        return "DO-05";
    },

    uploadFile: async (file) => {
        await simulateDelay();
        return "https://dummy-file-url.com/file";
    },

    fetchDashboardAppCharts: async (currentUser, isAdminFunc) => {
        await simulateDelay();

        const username = currentUser?.username;
        const isAdmin = isAdminFunc();

        // Helper to check permission
        const checkPerm = (row) => isAdmin || (row.assignedUser === username);

        // 1. Lead Data (Monthly)
        const monthlyData = {};

        // Leads from FMS
        fmsData.forEach(row => {
            if (checkPerm(row)) {
                // Assuming date is DD/MM/YYYY
                const parts = row.date.split('/');
                const month = new Date(parts[2], parts[1] - 1, parts[0]).toLocaleString('en-US', { month: 'short' });
                if (!monthlyData[month]) monthlyData[month] = { leads: 0, enquiries: 0, orders: 0 };
                monthlyData[month].leads++;
            }
        });

        // Orders from Enquiry Tracker
        enquiryTracker.forEach(row => {
            if (checkPerm(row) && row.orderReceived === "Yes") {
                const parts = row.date.split('/');
                const month = new Date(parts[2], parts[1] - 1, parts[0]).toLocaleString('en-US', { month: 'short' });
                if (!monthlyData[month]) monthlyData[month] = { leads: 0, enquiries: 0, orders: 0 };
                monthlyData[month].orders++;
            }
        });

        const leadData = Object.keys(monthlyData).map(month => ({
            month,
            leads: monthlyData[month].leads,
            enquiries: monthlyData[month].enquiries, // simplified (0 for now)
            orders: monthlyData[month].orders
        }));

        // 2. Conversion Data
        const totalLeads = fmsData.filter(checkPerm).length;
        const totalEnquiries = enquiryTracker.filter(checkPerm).length; // Simplified
        const totalQuotations = quotations.filter(checkPerm).length;
        const totalOrders = enquiryTracker.filter(r => checkPerm(r) && r.orderReceived === "Yes").length;

        const conversionData = [
            { name: "Leads", value: totalLeads, color: "#4f46e5" },
            { name: "Enquiries", value: totalEnquiries, color: "#8b5cf6" },
            { name: "Quotations", value: totalQuotations, color: "#d946ef" },
            { name: "Orders", value: totalOrders, color: "#ec4899" }
        ];

        // 3. Source Data
        const sourceCounter = {};
        fmsData.forEach(row => {
            if (checkPerm(row) && row.source) {
                sourceCounter[row.source] = (sourceCounter[row.source] || 0) + 1;
            }
        });

        const sourceData = Object.keys(sourceCounter).map((name, index) => ({
            name,
            value: sourceCounter[name],
            color: ["#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6"][index % 5]
        }));

        return { leadData, conversionData, sourceData };
    },

    // Quotation specific
    getNextQuotationNumber: async (prefix = "NBD") => {
        await simulateDelay();
        return `${prefix}-2526-003`; // Mock next number
    },

    getCompanyPrefix: async (companyName) => {
        await simulateDelay();
        return "NBD";
    },

    fetchExistingQuotations: async (isAdminFunc) => {
        await simulateDelay();
        // Return simple list of numbers
        return quotations.map(q => q.quotationNo);
    },

    getQuotationData: async (quotationNo) => {
        await simulateDelay();
        const quote = quotations.find(q => q.quotationNo === quotationNo);
        if (quote) {
            return { success: true, quotationData: quote };
        }
        return { success: false, error: "Quotation not found" };
    },

    saveQuotation: async (data, action = "save") => {
        await simulateDelay();
        console.log(`Mock ${action} quotation:`, data);
        return { success: true, quotationNumber: data.quotationNumber || "NBD-NEW-001" };
    },

    fetchLastEnquiryNumber: async () => {
        await simulateDelay();
        return "En-023"; // Mock next number
    },

    fetchEnquiryDropdowns: async () => {
        await simulateDelay();
        return {
            sources: dropdowns.sources,
            scNames: ["SC 1", "SC 2", "SC 3"], // Mock
            states: dropdowns.states,
            salesTypes: ["NBD", "CRR", "NBD_CRR"],
            productCategories: products.map(p => p.name),
            nobOptions: dropdowns.nobs,
            approachOptions: ["Phone", "Email", "Visit"],
            receivers: dropdowns.receivers,
            assignToProjects: ["Project A", "Project B"]
        };
    },

    submitEnquiry: async (data, action = "insert") => {
        await simulateDelay();
        console.log(`Mock submit enquiry (${action}):`, data);
        return { success: true };
    },

    fetchProducts: async () => {
        await simulateDelay();
        return products;
    },

    fetchQuotationDropdowns: async () => {
        await simulateDelay();
        // Construct the complex object expected by Quotation.jsx
        // This maps dummyData structures to the expected format
        const response = {
            states: {},
            companies: {},
            references: {},
            preparedBy: users.map(u => u.username)
        };

        // Populate companies
        companies.forEach(comp => {
            response.companies[comp.name] = {
                address: comp.location, // simplified mapping
                state: comp.consignorState,
                contactName: comp.salesPerson,
                contactNo: comp.phoneNumber,
                gstin: "27AA...",
                stateCode: "27"
            };
        });

        // Populate states (using generic data for now as dummyData.dropdowns.states is just a list)
        dropdowns.states.forEach(state => {
            response.states[state] = {
                bankDetails: "Account No: 1234567890\nBank Name: HDFC\nIFSC: HDFC0001234",
                consignerAddress: `Address in ${state}`,
                stateCode: "10",
                gstin: "10AAA...",
                pan: "ABC...",
                msmeNumber: "MSME..."
            };
        });
        // Populate references
        dropdowns.receivers.forEach(ref => {
            response.references[ref] = {
                mobile: "9999999999"
            };
        });

        return response;
    },

    fetchValidationDropdowns: async () => {
        await simulateDelay();
        return {
            sendStatusOptions: ["mail", "whatsapp", "both"],
            validatorNameOptions: users.map(u => u.username)
        };
    },

    fetchQuotationsForEnquiry: async (enquiryNo) => {
        await simulateDelay();
        // Return dummy quotation numbers if enquiryNo matches, or just return all/some
        return quotations.map(q => q.quotationNo);
    },

    fetchOrderStatusDropdowns: async () => {
        await simulateDelay();
        return {
            acceptanceViaOptions: ["email", "phone", "in-person", "other"],
            paymentModeOptions: ["cash", "check", "bank-transfer", "credit-card"],
            reasonStatusOptions: ["price", "competitor", "timeline", "specifications", "other"],
            holdReasonOptions: ["budget", "approval", "project-delay", "reconsideration", "other"],
            paymentTermsOptions: ["30", "45", "60", "90"],
            conveyedOptions: ["Yes", "No"],
            transportModeOptions: ["Road", "Air", "Sea", "Rail"],
            creditDaysOptions: ["30", "45", "60", "90"],
            creditLimitOptions: ["10000", "25000", "50000", "100000"]
        };
    },

    fetchOrderExpectedDropdowns: async () => {
        await simulateDelay();
        return {
            followupStatusOptions: ["Pending", "In Progress", "Completed", "Cancelled"]
        };
    },

    generateSendQuotationNo: async (enquiryNo) => {
        await simulateDelay();
        return "1"; // Mock logic
    },

    fetchLeadNumbers: async () => {
        await simulateDelay();

        const leadNumbers = {};

        // Mock FMS leads
        fmsData.forEach(row => {
            // Simulate filtering: has pending follow up (mocking the BA/BB check)
            if (row.hasPendingFollowUp) {
                leadNumbers[row.leadNumber] = {
                    sheet: "FMS",
                    companyName: row.company,
                    address: "Mock Address FMS",
                    state: "Maharashtra",
                    contactName: row.receiver,
                    contactNo: "9876543210",
                    gstin: "27ABC...",
                    rowData: [] // simplified
                };
            }
        });

        // Mock Enquiry Leads
        enquiryToOrder.forEach(row => {
            if (row.status === "Pending") {
                leadNumbers[row.enquiryNo] = {
                    sheet: "ENQUIRY",
                    companyName: "Mock Company Enquiry",
                    address: "Mock Address Enquiry",
                    state: "Delhi",
                    contactName: row.assignedUser,
                    contactNo: "8765432109",
                    gstin: "07XYZ...",
                    rowData: [] // simplified
                };
            }
        });

        return leadNumbers;
    }
};
