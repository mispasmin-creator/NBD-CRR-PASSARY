"use client";

import {
  useState,
  useEffect,
  createContext,
  useCallback,
  useMemo,
  useContext,
  lazy,
  Suspense,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Login from "./pages/Login";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const FollowUp = lazy(() => import("./pages/FollowUp"));
const NewFollowUp = lazy(() => import("./pages/NewFollowUp"));
const CallTracker = lazy(() => import("./pages/CallTracker"));
const NewCallTracker = lazy(() => import("./pages/NewCallTracker"));
const Quotation = lazy(() => import("./pages/Quotation/Quotation"));
const CRREnquiry = lazy(() => import("./pages/CRREnquiry"));
const NonConverted = lazy(() => import("./pages/NonConverted"));
const VisitFMS = lazy(() => import("./pages/VisitFMS"));
const Complaints = lazy(() => import("./pages/Complaints"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Offer = lazy(() => import("./pages/Offer"));
const CustomerComplaint = lazy(() => import("./pages/CustomerComplaint"));
const MarketingVisitTracker = lazy(() => import("./pages/MarketingVisitTracker"));
const OrderNotReceivedFMS = lazy(() => import("./pages/OrderNotReceivedFMS"));
const ControlPanel = lazy(() => import("./pages/ControlPanel"));
const RiskControl = lazy(() => import("./pages/RiskControl"));
const AdminConfig = lazy(() => import("./pages/AdminConfig"));
const MasterSheet = lazy(() => import("./pages/MasterSheet"));
import Footer from "./components/Footer";
import Notification from "./components/Notification";
import Sidebar from "./components/Sidebar";
import { MenuIcon } from "./components/Icons";
import { mockApi } from "./services/mockApi";

const MotionDiv = motion.div;

import { AuthContext, DataContext } from "./context/AuthContext";
export { AuthContext, DataContext };

// Component to track route changes
function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Don't track login page
    if (location.pathname !== "/login") {
      localStorage.setItem("lastVisitedRoute", location.pathname);
    }
  }, [location]);

  return null;
}

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, showNotification, authInitialized } =
    useContext(AuthContext);
  if (!authInitialized) return null;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin()) {
    showNotification("You don't have permission to access this page", "error");
    return <Navigate to="/" />;
  }
  return children;
};

// All routes, wrapped in a fast cross-fade so navigating between pages feels smooth
function AnimatedRoutes() {
  const { isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <MotionDiv
        key={location.pathname}
        className="h-full flex flex-col"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Routes location={location}>
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/" />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <Leads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/follow-up"
            element={
              <ProtectedRoute>
                <FollowUp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/follow-up/new"
            element={
              <ProtectedRoute>
                <NewFollowUp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/call-tracker"
            element={
              <ProtectedRoute>
                <CallTracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/call-tracker/new"
            element={
              <ProtectedRoute>
                <NewCallTracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quotation"
            element={
              <ProtectedRoute>
                <Quotation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crr-enquiry"
            element={
              <ProtectedRoute>
                <CRREnquiry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/non-converted"
            element={
              <ProtectedRoute>
                <NonConverted />
              </ProtectedRoute>
            }
          />
          <Route
            path="/visit-fms"
            element={
              <ProtectedRoute>
                <VisitFMS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints"
            element={
              <ProtectedRoute>
                <Complaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/offer"
            element={
              <ProtectedRoute>
                <Offer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer-complaint"
            element={
              <ProtectedRoute>
                <CustomerComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketing-visit-tracker"
            element={
              <ProtectedRoute>
                <MarketingVisitTracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-not-received-fms"
            element={
              <ProtectedRoute>
                <OrderNotReceivedFMS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/control-panel"
            element={
              <ProtectedRoute adminOnly={true}>
                <ControlPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk-control"
            element={
              <ProtectedRoute adminOnly={true}>
                <RiskControl />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-config"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminConfig />
              </ProtectedRoute>
            }
          />
          <Route
            path="/master-sheet"
            element={
              <ProtectedRoute adminOnly={true}>
                <MasterSheet />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </MotionDiv>
    </AnimatePresence>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [userData, setUserData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated");
    const storedUser = localStorage.getItem("currentUser");
    const storedUserType = localStorage.getItem("userType");

    if (auth === "true" && storedUser) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(storedUser));
      setUserType(storedUserType);
      fetchUserData(JSON.parse(storedUser).username, storedUserType);
    }

    setAuthInitialized(true);
  }, []);

  const showNotification = useCallback((message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const fetchUserData = useCallback(
    async (username, userType) => {
      try {
        const data = await mockApi.fetchUserData(username, userType);
        setUserData(data);
      } catch (error) {
        console.error("Data fetching error:", error);
        showNotification("An error occurred while fetching data", "error");
      }
    },
    [showNotification],
  );

  const login = useCallback(
    async (username, password) => {
      try {
        const result = await mockApi.login(username, password);
        if (result.success) {
          const userInfo = result.user;
          setIsAuthenticated(true);
          setCurrentUser(userInfo);
          setUserType(userInfo.userType);
          localStorage.setItem("isAuthenticated", "true");
          localStorage.setItem("currentUser", JSON.stringify(userInfo));
          localStorage.setItem("userType", userInfo.userType);
          await fetchUserData(userInfo.username, userInfo.userType);
          showNotification(
            `Welcome, ${username}! (${userInfo.userType})`,
            "success",
          );
          return true;
        } else {
          showNotification(result.message || "Invalid credentials", "error");
          return false;
        }
      } catch (error) {
        console.error("Login error:", error);
        showNotification("An error occurred during login", "error");
        return false;
      }
    },
    [fetchUserData, showNotification],
  );

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserType(null);
    setUserData(null);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userType");
    showNotification("Logged out successfully", "success");
  }, [showNotification]);

  const isAdmin = useCallback(() => userType === "admin", [userType]);

  const authContextValue = useMemo(
    () => ({
      isAuthenticated,
      authInitialized,
      login,
      logout,
      showNotification,
      currentUser,
      userType,
      isAdmin,
    }),
    [
      isAuthenticated,
      authInitialized,
      login,
      logout,
      showNotification,
      currentUser,
      userType,
      isAdmin,
    ],
  );

  const dataContextValue = useMemo(
    () => ({
      userData,
      fetchUserData,
    }),
    [userData, fetchUserData],
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      <DataContext.Provider value={dataContextValue}>
        <Router>
          <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
            {isAuthenticated && (
              <Sidebar
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
              />
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
              {isAuthenticated && (
                <button
                  type="button"
                  className="fixed left-3 top-3 z-30 rounded-lg bg-card p-2 text-slate-500 shadow-md hover:bg-slate-50 hover:text-slate-700 md:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <MenuIcon className="h-5 w-5" />
                </button>
              )}

              <main
                className={`flex-1 overflow-auto ${isAuthenticated ? "p-4 md:p-5" : ""}`}
              >
                {isAuthenticated && <RouteTracker />}
                <Suspense
                  fallback={
                    <div className="flex h-full w-full items-center justify-center p-10">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 rounded-full border-[3px] border-indigo-600 border-t-transparent animate-spin" />
                        <p className="text-xs font-semibold text-slate-400">Loading…</p>
                      </div>
                    </div>
                  }
                >
                  <AnimatedRoutes />
                </Suspense>
              </main>
              {isAuthenticated && <Footer />}
            </div>

            {notification && (
              <Notification
                message={notification.message}
                type={notification.type}
              />
            )}
          </div>
        </Router>
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
