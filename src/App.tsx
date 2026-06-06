import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router"
import { useEffect } from "react"

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function PrerenderReady() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Data-driven blog pages signal readiness themselves (after their fetch
    // resolves) so the prerendered HTML contains the real content.
    if (pathname.startsWith('/blog')) return
    document.dispatchEvent(new Event('app-prerender-ready'))
  }, [pathname])
  return null
}
import Home from "@/pages/Home/index"
import Login from "@/pages/Authentication/login"
import Signup from "@/pages/Authentication/signup"
import ForgotPassword from "@/pages/Authentication/forgot-password"
import ResetPassword from "@/pages/Authentication/reset-password"
import AuthCallback from "@/pages/Authentication/auth-callback"
import Pricing from "@/pages/pricing"
import Contact from "@/pages/contact"
import Privacy from "@/pages/Legal/privacy"
import Terms from "@/pages/Legal/terms"

import DocLayout from "@/pages/Documentation/DocLayout"
import QuickstartPage from "@/pages/Documentation/QuickstartPage"
import ObservabilityPage from "@/pages/Documentation/ObservabilityPage"
import OptimizationPage from "@/pages/Documentation/OptimizationPage"
import SecurityPage from "@/pages/Documentation/SecurityPage"
import EvaluationPage from "@/pages/Documentation/EvaluationPage"
import PromptsPage from "@/pages/Documentation/PromptsPage"
import ConfigurationPage from "@/pages/Documentation/ConfigurationPage"

import ExamplesLayout from "@/pages/Documentation/ExamplesLayout"
import ObservabilityExamplesPage from "@/pages/Documentation/ObservabilityExamplesPage"
import SecurityExamplesPage from "@/pages/Documentation/SecurityExamplesPage"
import EvaluationExamplesPage from "@/pages/Documentation/EvaluationExamplesPage"
import OptimizationExamplesPage from "@/pages/Documentation/OptimizationExamplesPage"
import PromptsExamplesPage from "@/pages/Documentation/PromptsExamplesPage"

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
import AuditLog from "@/pages/Dashboard/Audit/index"
import Guardrails from "@/pages/Dashboard/Guardrails/index"
import Profile from "@/pages/Dashboard/Profile/index"

import IntegrationsIndex from "@/pages/Integrations/index"
import IntegrationRoute from "@/pages/Integrations/IntegrationRoute"

import BlogIndex from "@/pages/Blog/index"
import BlogPost from "@/pages/Blog/BlogPost"

import LangSmithAlternative from "@/pages/Comparisons/langsmith-alternative"
import LangfuseAlternative from "@/pages/Comparisons/langfuse-alternative"
import HeliconeAlternative from "@/pages/Comparisons/helicone-alternative"
import BraintrustAlternative from "@/pages/Comparisons/braintrust-alternative"
import PortkeyAlternative from "@/pages/Comparisons/portkey-alternative"
import LakeraAlternative from "@/pages/Comparisons/lakera-alternative"

import AdminLayout from "@/pages/Admin/admin"
import AdminOverview from "@/pages/Admin/Overview/index"
import AdminUsers from "@/pages/Admin/Users/index"
import AdminOrganizations from "@/pages/Admin/Organizations/index"
import AdminPlans from "@/pages/Admin/Plans/index"
import AdminBlog from "@/pages/Admin/Blog/index"
import BlogEditor from "@/pages/Admin/Blog/BlogEditor"

import RequireAuth from "@/components/RequireAuth"
import RequireAdmin from "@/components/RequireAdmin"
import { ThemeProvider } from "@/contexts/ThemeContext"

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <PrerenderReady />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms"   element={<Terms />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Integration pages */}
          <Route path="/integrations" element={<IntegrationsIndex />} />
          <Route path="/integrations/:slug" element={<IntegrationRoute />} />

          {/* Blog */}
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          {/* Comparison / alternative pages */}
          <Route path="/langsmith-alternative"  element={<LangSmithAlternative />} />
          <Route path="/langfuse-alternative"   element={<LangfuseAlternative />} />
          <Route path="/helicone-alternative"   element={<HeliconeAlternative />} />
          <Route path="/braintrust-alternative" element={<BraintrustAlternative />} />
          <Route path="/portkey-alternative"    element={<PortkeyAlternative />} />
          <Route path="/lakera-alternative"     element={<LakeraAlternative />} />

          {/* Documentation */}
          <Route path="/documentation" element={<DocLayout />}>
            <Route index element={<Navigate to="quickstart" replace />} />
            <Route path="quickstart"     element={<QuickstartPage />} />
            <Route path="observability"  element={<ObservabilityPage />} />
            <Route path="optimization"   element={<OptimizationPage />} />
            <Route path="security"       element={<SecurityPage />} />
            <Route path="evaluation"     element={<EvaluationPage />} />
            <Route path="prompts"        element={<PromptsPage />} />
            <Route path="configuration"  element={<ConfigurationPage />} />
          </Route>

          {/* Examples */}
          <Route path="/examples" element={<ExamplesLayout />}>
            <Route index element={<Navigate to="observability" replace />} />
            <Route path="observability" element={<ObservabilityExamplesPage />} />
            <Route path="security"      element={<SecurityExamplesPage />} />
            <Route path="evaluation"    element={<EvaluationExamplesPage />} />
            <Route path="optimization"  element={<OptimizationExamplesPage />} />
            <Route path="prompts"       element={<PromptsExamplesPage />} />
          </Route>

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to={localStorage.getItem(VISITED_KEY) === "true" ? "overview" : "getting-started"} replace />} />
            <Route path="getting-started"  element={<GettingStarted />} />
            <Route path="overview"         element={<Overview />} />
            <Route path="traces"           element={<Traces />} />
            <Route path="agents"           element={<Agents />} />
            <Route path="tests"            element={<Tests />} />
            <Route path="datasets"         element={<Datasets />} />
            <Route path="prompts"          element={<Prompts />} />
            <Route path="security"         element={<SecurityOverview />} />
            <Route path="audit"            element={<AuditLog />} />
            <Route path="guardrails"       element={<Guardrails />} />
            <Route path="optimize"         element={<Optimize />} />
            <Route path="api-management"   element={<ApiManagement />} />
            <Route path="profile"          element={<Profile />} />
          </Route>

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview"      element={<AdminOverview />} />
            <Route path="users"         element={<AdminUsers />} />
            <Route path="organizations" element={<AdminOrganizations />} />
            <Route path="plans"         element={<AdminPlans />} />
            <Route path="blog"          element={<AdminBlog />} />
            <Route path="blog/new"      element={<BlogEditor />} />
            <Route path="blog/:postId"  element={<BlogEditor />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
