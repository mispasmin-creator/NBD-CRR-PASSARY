"use client"

import { useState, useEffect, createContext } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Leads from "./pages/Leads"
import FollowUp from "./pages/FollowUp"
import NewFollowUp from "./pages/NewFollowUp"
import CallTracker from "./pages/CallTracker"
import NewCallTracker from "./pages/NewCallTracker"
import Quotation from "./pages/Quotation/Quotation"
import CRREnquiry from "./pages/CRREnquiry"
import NonConverted from "./pages/NonConverted"
import VisitFMS from "./pages/VisitFMS"
import Complaints from "./pages/Complaints"
import Analytics from "./pages/Analytics"
import Offer from "./pages/Offer"
import ControlPanel from "./pages/ControlPanel"
import RiskControl from "./pages/RiskControl"
import AdminConfig from "./pages/AdminConfig"
import MainNav from "./components/MainNav"
import Footer from "./components/Footer"
import Notification from "./components/Notification"
import Sidebar from "./components/Sidebar"
import { mockApi } from "./services/mockApi"

// Create auth context
export const AuthContext = createContext(null)
// Create data context to manage data access based on user type
export const DataContext = createContext(null)

// Component to track route changes
function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    // Don't track login page
    if (location.pathname !== '/login') {
      localStorage.setItem('lastVisitedRoute', location.pathname)
    }
  }, [location])

  return null
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [notification, setNotification] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [userType, setUserType] = useState(null)
  const [userData, setUserData] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    const storedUser = localStorage.getItem("currentUser")
    const storedUserType = localStorage.getItem("userType")

    if (auth === "true" && storedUser) {
      setIsAuthenticated(true)
      setCurrentUser(JSON.parse(storedUser))
      setUserType(storedUserType)
      fetchUserData(JSON.parse(storedUser).username, storedUserType)
    }
  }, [])

  const fetchUserData = async (username, userType) => {
    try {
      const data = await mockApi.fetchUserData(username, userType)
      setUserData(data)
    } catch (error) {
      console.error("Data fetching error:", error)
      showNotification("An error occurred while fetching data", "error")
    }
  }

  const login = async (username, password) => {
    try {
      const result = await mockApi.login(username, password)
      if (result.success) {
        const userInfo = result.user
        setIsAuthenticated(true)
        setCurrentUser(userInfo)
        setUserType(userInfo.userType)
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("currentUser", JSON.stringify(userInfo))
        localStorage.setItem("userType", userInfo.userType)
        await fetchUserData(userInfo.username, userInfo.userType)
        showNotification(`Welcome, ${username}! (${userInfo.userType})`, "success")
        return true
      } else {
        showNotification(result.message || "Invalid credentials", "error")
        return false
      }
    } catch (error) {
      console.error("Login error:", error)
      showNotification("An error occurred during login", "error")
      return false
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    setUserType(null)
    setUserData(null)
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("userType")
    showNotification("Logged out successfully", "success")
  }

  const showNotification = (message, type = "info") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const isAdmin = () => userType === "admin"

  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!isAuthenticated) return <Navigate to="/login" />
    if (adminOnly && !isAdmin()) {
      showNotification("You don't have permission to access this page", "error")
      return <Navigate to="/" />
    }
    return children
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, showNotification, currentUser, userType, isAdmin }}>
      <DataContext.Provider value={{ userData, fetchUserData }}>
        <Router>
          <div className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden">
            {isAuthenticated && <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />}

            <div className="flex flex-1 flex-col overflow-hidden">
              {isAuthenticated && <MainNav logout={logout} setMobileMenuOpen={setMobileMenuOpen} />}

              <main className="flex-1 overflow-auto p-4 md:p-5">
                {isAuthenticated && <RouteTracker />}
                <Routes>
                  <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
                  <Route path="/follow-up" element={<ProtectedRoute><FollowUp /></ProtectedRoute>} />
                  <Route path="/follow-up/new" element={<ProtectedRoute><NewFollowUp /></ProtectedRoute>} />
                  <Route path="/call-tracker" element={<ProtectedRoute><CallTracker /></ProtectedRoute>} />
                  <Route path="/call-tracker/new" element={<ProtectedRoute><NewCallTracker /></ProtectedRoute>} />
                  <Route path="/quotation" element={<ProtectedRoute><Quotation /></ProtectedRoute>} />
                  <Route path="/crr-enquiry" element={<ProtectedRoute><CRREnquiry /></ProtectedRoute>} />
                  <Route path="/non-converted" element={<ProtectedRoute><NonConverted /></ProtectedRoute>} />
                  <Route path="/visit-fms" element={<ProtectedRoute><VisitFMS /></ProtectedRoute>} />
                  <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                  <Route path="/offer" element={<ProtectedRoute><Offer /></ProtectedRoute>} />
                  <Route path="/control-panel" element={<ProtectedRoute adminOnly={true}><ControlPanel /></ProtectedRoute>} />
                  <Route path="/risk-control" element={<ProtectedRoute adminOnly={true}><RiskControl /></ProtectedRoute>} />
                  <Route path="/admin-config" element={<ProtectedRoute adminOnly={true}><AdminConfig /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
              {isAuthenticated && <Footer />}
            </div>

            {notification && <Notification message={notification.message} type={notification.type} />}
          </div>
        </Router>
      </DataContext.Provider>
    </AuthContext.Provider>
  )
}

export default App