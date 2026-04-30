import { BrowserRouter, Navigate, Routes, Route } from "react-router"
import Home from "@/pages/home"
import Documentation from "@/pages/documentation"
import Login from "@/pages/login"
import Signup from "@/pages/signup"
import Pricing from "@/pages/pricing"

import Dashboard from "@/pages/Dashboard/dashboard"
import Overview from "@/pages/Dashboard/Overview/index"
import Traces from "@/pages/Dashboard/Traces/index"
import Agents from "@/pages/Dashboard/Agents/index"
import Tests from "@/pages/Dashboard/Tests/index"
import Optimize from "@/pages/Dashboard/Optimize/index"
import ApiManagement from "@/pages/Dashboard/ApiManagement/index"
import Profile from "@/pages/Dashboard/Profile/index"

import RequireAuth from "@/components/RequireAuth"

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="traces" element={<Traces />} />
          <Route path="agents" element={<Agents />} />
          <Route path="tests" element={<Tests />} />
          <Route path="optimize" element={<Optimize />} />
          <Route path="api-management" element={<ApiManagement />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
