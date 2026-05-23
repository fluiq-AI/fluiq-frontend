import { BrowserRouter, Navigate, Routes, Route } from "react-router"
import Home from "@/pages/home"
import Documentation from "@/pages/documentation"
import Login from "@/pages/login"
import Signup from "@/pages/signup"
import ForgotPassword from "@/pages/forgot-password"
import ResetPassword from "@/pages/reset-password"
import AuthCallback from "@/pages/auth-callback"
import Pricing from "@/pages/pricing"
import Contact from "@/pages/contact"
import Examples from "@/pages/Documentation/examples"

import Dashboard from "@/pages/Dashboard/dashboard"
import GettingStarted, { VISITED_KEY } from "@/pages/Dashboard/GettingStarted/index"
import Overview from "@/pages/Dashboard/Overview/index"
import Traces from "@/pages/Dashboard/Traces/index"
import Agents from "@/pages/Dashboard/Agents/index"
import Tests from "@/pages/Dashboard/Tests/index"
import Datasets from "@/pages/Dashboard/Datasets/index"
import Prompts from "@/pages/Dashboard/Prompts/index"
import Optimize from "@/pages/Dashboard/Optimize/index"
import ApiManagement from "@/pages/Dashboard/ApiManagement/index"
import SecurityOverview from "@/pages/Dashboard/Security/index"
import Profile from "@/pages/Dashboard/Profile/index"

import AdminLayout from "@/pages/Admin/admin"
import AdminOverview from "@/pages/Admin/Overview/index"
import AdminUsers from "@/pages/Admin/Users/index"
import AdminOrganizations from "@/pages/Admin/Organizations/index"
import AdminPlans from "@/pages/Admin/Plans/index"

import RequireAuth from "@/components/RequireAuth"
import RequireAdmin from "@/components/RequireAdmin"
import { ThemeProvider } from "@/contexts/ThemeContext"

function App() {

  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/examples" element={<Examples />} />
        <Route path="/auth/callback" element={<AuthCallback/>}/>
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to={localStorage.getItem(VISITED_KEY) === "true" ? "overview" : "getting-started"} replace />} />
          <Route path="getting-started" element={<GettingStarted />} />
          <Route path="overview" element={<Overview />} />
          <Route path="traces" element={<Traces />} />
          <Route path="agents" element={<Agents />} />
          <Route path="tests" element={<Tests />} />
          <Route path="datasets" element={<Datasets />} />
          <Route path="prompts" element={<Prompts/>}/>
          <Route path="security" element={<SecurityOverview/>}/>
          <Route path="optimize" element={<Optimize />} />
          <Route path="api-management" element={<ApiManagement />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="organizations" element={<AdminOrganizations />} />
          <Route path="plans" element={<AdminPlans />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
