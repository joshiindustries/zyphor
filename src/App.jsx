import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireRole, useAuth } from "./lib/auth.jsx";
import { ConfirmHost, Loading, ToastHost } from "./components/ui.jsx";
import { homeFor, loadBackendConfig } from "./lib/api.js";
import { ErrorBoundary, ConnectionNotice } from "./components/Recovery.jsx";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient.js";
import Home from "./pages/Home.jsx";

import Login from "./pages/Login.jsx";
import AccountAccess from "./pages/AccountAccess.jsx";
import StudentDashboard from "./pages/student/Dashboard.jsx";
import { PublicSkillPassport } from "./pages/student/SkillPassport.jsx";
import AccessibilitySettings from "./components/AccessibilitySettings.jsx";
import CertificateVerification from "./pages/student/CertificateVerification.jsx";

const Console = lazy(() => import("./pages/admin/Console.jsx"));
const CoordinatorDashboard = lazy(() => import("./pages/coordinator/CoordinatorDashboard.jsx"));
const Teams = lazy(() => import("./pages/student/Teams.jsx"));
const MoodlePortal = lazy(() => import("./pages/MoodlePortal.jsx"));
const LtiLaunch = lazy(() => import("./pages/MoodlePortal.jsx").then(m => ({ default: m.LtiLaunch })));

// The code editor is most of the bundle, and only the exam page needs it.
// A tab opened before a new deploy asks for a chunk that no longer exists; reload once to pick up
// the new build instead of leaving a blank page.
const RELOAD_FLAG = "zyphor_chunk_reload";
const Exam = lazy(() => import("./pages/student/Exam.jsx")
  .then((mod) => { try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ } return mod; })
  .catch((err) => {
    let reloaded = false;
    try { reloaded = sessionStorage.getItem(RELOAD_FLAG) === "1"; sessionStorage.setItem(RELOAD_FLAG, "1"); } catch { /* ignore */ }
    if (!reloaded) { window.location.reload(); return new Promise(() => {}); }
    throw err;
  }));

function Root() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user.role) : "/login"} replace />;
}

function PrivateApp() {
  const [configured, setConfigured] = useState(false);
  useEffect(() => { loadBackendConfig().finally(() => setConfigured(true)); }, []);
  if (!configured) return <div className="pre-start"><Loading label="Connecting to workspace…" /></div>;
  return (
    <AuthProvider>
      <ConfirmHost>
        <Suspense fallback={<div className="pre-start"><Loading label="Loading…" /></div>}>
          <Routes>
            <Route path="/passport/:token" element={<PublicSkillPassport />} />
            <Route path="/certificates/:token" element={<CertificateVerification />} />
            <Route path="/lti/launch" element={<LtiLaunch />} />
            <Route path="/moodle" element={<RequireRole roles={["super_admin", "college_admin", "coordinator", "student"]}><MoodlePortal /></RequireRole>} />
            <Route path="/" element={<Root />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<AccountAccess mode="signup" />} />
            <Route path="/verify-email" element={<AccountAccess mode="verify" />} />
            <Route path="/forgot-password" element={<AccountAccess mode="forgot" />} />
            <Route path="/reset-password" element={<AccountAccess mode="reset" />} />
            <Route
              path="/console/*"
              element={
                <RequireRole roles={["super_admin", "college_admin"]}>
                  <Console />
                </RequireRole>
              }
            />
            <Route
              path="/student"
              element={
                <RequireRole roles={["student"]}>
                  <StudentDashboard />
                </RequireRole>
              }
            />
            <Route path="/student/teams" element={<RequireRole roles={["student"]}><Teams /></RequireRole>} />
            <Route path="/coordinator" element={<RequireRole roles={["coordinator"]}><CoordinatorDashboard /></RequireRole>} />
            <Route
              path="/exam/:examId"
              element={
                <RequireRole roles={["student"]}>
                  <Exam />
                </RequireRole>
              }
            />
            <Route path="*" element={<Root />} />
          </Routes>
        </Suspense>
      </ConfirmHost>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ToastHost>
          <ConnectionNotice />
          <AccessibilitySettings />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/*" element={<PrivateApp />} />
          </Routes>
        </ToastHost>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
