import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Trophy,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Key,
  Users,
  BookOpen,
  LogOut,
  Sparkles,
  RefreshCw,
  MonitorCheck,
  Check,
} from "lucide-react";
import { api } from "../../lib/api.js";
import { useAuth } from "../../lib/auth.jsx";
import { fmtDate } from "../../lib/format.js";
import { Credit, OrgBrand, ThemeToggle, useToast } from "../../components/ui.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Badge } from "../../components/ui/badge.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs.jsx";
import ChangePassword from "./ChangePassword.jsx";
import ResultModal from "./ResultModal.jsx";
import LeaderboardModal from "./LeaderboardModal.jsx";
import EvaluationSheetModal from "./EvaluationSheetModal.jsx";
import SkillPassport from "./SkillPassport.jsx";

const ORDER = { in_progress: 0, live: 1, paused: 2, upcoming: 3, completed: 4, missed: 5 };

function SystemReadinessCard() {
  const [fullscreenSupported, setFullscreenSupported] = useState(true);
  const [singleDisplay, setSingleDisplay] = useState(true);

  useEffect(() => {
    setFullscreenSupported(Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled));
    if (window.screen && window.screen.isExtended) {
      setSingleDisplay(false);
    }
  }, []);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zyphor-indigo-50 text-zyphor-indigo-600 dark:bg-zyphor-indigo-950 dark:text-zyphor-indigo-400">
          <MonitorCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 m-0">System Readiness Check</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Pre-exam diagnostic for distraction-free testing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
          <CheckCircle2 className="h-4 w-4 text-zyphor-green-600 flex-shrink-0" />
          <div className="text-xs">
            <div className="font-medium text-slate-800 dark:text-slate-200">Modern Browser</div>
            <div className="text-slate-500">Chrome, Edge, Firefox</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
          {fullscreenSupported ? (
            <CheckCircle2 className="h-4 w-4 text-zyphor-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          )}
          <div className="text-xs">
            <div className="font-medium text-slate-800 dark:text-slate-200">Fullscreen Mode</div>
            <div className="text-slate-500">{fullscreenSupported ? "Supported" : "Not supported"}</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
          {singleDisplay ? (
            <CheckCircle2 className="h-4 w-4 text-zyphor-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          )}
          <div className="text-xs">
            <div className="font-medium text-slate-800 dark:text-slate-200">Display Check</div>
            <div className="text-slate-500">{singleDisplay ? "Single display active" : "Multiple displays detected"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamCard({ e, onResult, onLeaderboard, onEvaluation }) {
  let statusBadge = null;
  let actionButton = null;

  switch (e.state) {
    case "live":
      statusBadge = <Badge variant="success" dot>Open Now</Badge>;
      actionButton = (
        <Button asChild size="lg" className="shadow-md shadow-zyphor-indigo-500/20 w-full sm:w-auto">
          <Link to={`/exam/${e.id}`}>
            Start Exam <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      );
      break;
    case "in_progress":
      statusBadge = <Badge variant="warning" dot>In Progress</Badge>;
      actionButton = (
        <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700 text-white shadow-md w-full sm:w-auto">
          <Link to={`/exam/${e.id}`}>
            Resume Exam <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      );
      break;
    case "upcoming":
      statusBadge = <Badge variant="default">Coming Soon</Badge>;
      actionButton = (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
          Scheduled by organizers
        </span>
      );
      break;
    case "paused":
      statusBadge = <Badge variant="warning">Paused</Badge>;
      actionButton = (
        <span className="text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 px-3 py-2 rounded-lg">
          Paused temporarily
        </span>
      );
      break;
    case "completed":
      statusBadge = <Badge variant="secondary">Completed</Badge>;
      actionButton = (
        <div className="flex items-center gap-2 flex-wrap">
          {e.evaluation_available && (
            e.evaluation_submitted ? (
              <Badge variant="success">Sheet Submitted</Badge>
            ) : (
              <Button size="sm" onClick={() => onEvaluation(e.attempt_id)}>
                Evaluation Sheet
              </Button>
            )
          )}
          {e.leaderboard_available && (
            <Button variant="outline" size="sm" onClick={() => onLeaderboard(e.id)}>
              Leaderboard
            </Button>
          )}
          {e.result_available && (
            <Button variant="outline" size="sm" onClick={() => onResult(e.attempt_id)}>
              View Result {e.score !== null ? `(${e.score}/${e.max_score})` : ""}
            </Button>
          )}
        </div>
      );
      break;
    case "missed":
      statusBadge = <Badge variant="destructive">Missed</Badge>;
      actionButton = <span className="text-xs text-slate-400">Window closed</span>;
      break;
    default:
      break;
  }

  const isLive = e.state === "live" || e.state === "in_progress";

  return (
    <div
      className={`rounded-xl border transition-all p-5 sm:p-6 bg-white shadow-sm dark:bg-slate-900 ${
        isLive
          ? "border-zyphor-indigo-200 dark:border-zyphor-indigo-800/80 ring-1 ring-zyphor-indigo-100 dark:ring-zyphor-indigo-950"
          : "border-slate-200/80 dark:border-slate-800"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">{e.title}</h3>
            {statusBadge}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {e.duration_minutes} min
            </span>
            <span>·</span>
            <span>{e.question_count} questions</span>
            <span>·</span>
            <span>{e.max_score} marks</span>
            <span>·</span>
            <span>
              {e.state === "upcoming" || e.state === "paused"
                ? "Coming soon"
                : `${fmtDate(e.start_at)} → ${fmtDate(e.end_at)}`}
            </span>
          </div>

          {e.sections?.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {e.sections.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {e.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 line-clamp-2 m-0 max-w-2xl">
              {e.description}
            </p>
          )}
        </div>

        <div className="sm:self-center flex-shrink-0 pt-2 sm:pt-0">{actionButton}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  const [showPwd, setShowPwd] = useState(false);
  const [showPassport, setShowPassport] = useState(false);
  const [result, setResult] = useState(null);
  const [boardExam, setBoardExam] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const closeBoard = useCallback(() => setBoardExam(null), []);
  const mustChange = Boolean(user?.must_change_password);

  // TanStack Query for Student Dashboard with 15s auto-polling
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["student", "dashboard"],
    queryFn: () => api("GET", "/api/zyphor/student/dashboard"),
    refetchInterval: 15000,
  });

  const openResult = useCallback(
    async (attemptId) => {
      try {
        setResult(await api("GET", `/api/zyphor/student/attempts/${attemptId}/result`));
      } catch (err) {
        toast(err.message, "error");
      }
    },
    [toast]
  );

  const openEvaluation = useCallback(
    async (attemptId) => {
      try {
        setEvaluation(await api("GET", `/api/zyphor/student/attempts/${attemptId}/evaluation-sheet`));
      } catch (err) {
        toast(err.message, "error");
        refetch();
      }
    },
    [refetch, toast]
  );

  // Deep link from exam submission: /student?result=<attemptId>
  useEffect(() => {
    const id = params.get("result");
    if (id) {
      openResult(id);
      setParams({}, { replace: true });
    }
  }, [params, setParams, openResult]);

  const exams = (data?.exams || [])
    .slice()
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || new Date(a.start_at) - new Date(b.start_at));

  const active = exams.filter((e) => ["in_progress", "live", "paused", "upcoming"].includes(e.state));
  const past = exams.filter((e) => ["completed", "missed"].includes(e.state));
  const isEvent = user?.college?.org_type === "event";
  const liveCount = active.filter((e) => e.state === "live" || e.state === "in_progress").length;

  useEffect(() => {
    if (isEvent && user?.college?.name) document.title = user.college.name;
    return () => {
      document.title = "Zyphor";
    };
  }, [isEvent, user?.college?.name]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <OrgBrand
            branding={user?.college?.branding}
            style={{ padding: 0 }}
            sub={user?.college?.branding ? "Powered by Zyphor" : isEvent ? user?.college?.name : "Student Workspace"}
          />

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden md:inline-flex items-center text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1.5">{user?.name}</span>
              <span>· {isEvent ? "Team ID" : "Roll"}: <strong>{user?.roll_no}</strong></span>
              {user?.college && (
                <span className="ml-1.5">
                  · {isEvent ? "Event" : "College"}: <strong>{user.college.code}</strong>
                </span>
              )}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPassport(true)}
              className="gap-1.5 text-xs hidden sm:inline-flex"
            >
              <Sparkles className="h-3.5 w-3.5 text-zyphor-indigo-600" />
              Skill Passport
            </Button>

            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs hidden lg:inline-flex">
              <Link to="/student/teams">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                Teams
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs hidden lg:inline-flex">
              <Link to="/moodle">
                <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                Moodle Hub
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPwd(true)}
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400"
              title="Change Password"
            >
              <Key className="h-3.5 w-3.5" />
            </Button>

            <ThemeToggle className="btn ghost sm" />

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="gap-1 text-xs text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome & Live Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isEvent ? `Welcome to ${user?.college?.name || "Event"}` : `Welcome back, ${user?.name ? user.name.split(" ")[0] : "Student"}`}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {liveCount ? (
                <span className="inline-flex items-center gap-1.5 text-zyphor-green-600 dark:text-zyphor-green-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-zyphor-green-600 animate-pulse" />
                  You have {liveCount} active exam{liveCount > 1 ? "s" : ""} open right now.
                </span>
              ) : (
                "No active exams running currently. Scheduled exams and your past records are shown below."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 text-xs text-slate-600"
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Query error alert */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 mb-6 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{error.message || "Failed to load dashboard data. Please verify your connection."}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="border-rose-300 dark:border-rose-800 text-xs">
              Retry
            </Button>
          </div>
        )}

        {/* Statistics Cards */}
        {data?.stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
                <GraduationCap className="h-4 w-4 text-zyphor-green-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.stats.completed}</div>
              <div className="text-xs text-slate-400 mt-1">Exams finished</div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Average Score</span>
                <Trophy className="h-4 w-4 text-zyphor-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {data.stats.average_percentage === null ? "—" : `${data.stats.average_percentage}%`}
              </div>
              <div className="text-xs text-slate-400 mt-1">Cumulative average</div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Upcoming / Open</span>
                <Calendar className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.stats.upcoming}</div>
              <div className="text-xs text-slate-400 mt-1">Available sessions</div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">{isEvent ? "Team ID" : "Branch"}</span>
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {isEvent ? user?.roll_no : user?.branch || "—"} {!isEvent && (user?.section || "")}
              </div>
              <div className="text-xs text-slate-400 mt-1 truncate">{user?.roll_no}</div>
            </div>
          </div>
        )}

        {/* Announcements Banner */}
        {data?.announcements?.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/40 mb-8 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span>Announcements from Organizers</span>
            </div>
            {data.announcements.map((a) => (
              <div key={a.id} className="text-xs text-slate-700 dark:text-slate-300 border-t border-amber-200/60 dark:border-amber-900/60 pt-2.5">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {a.title} <span className="text-slate-400 font-normal ml-2">{fmtDate(a.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{a.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* System Readiness & Diagnostic Section */}
        <SystemReadinessCard />

        {/* Tabs for Active Exams, Past Exams, and Guidelines */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <TabsTrigger value="active" className="text-xs sm:text-sm font-semibold rounded-lg px-4 py-2">
              Available & Upcoming Exams ({active.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="text-xs sm:text-sm font-semibold rounded-lg px-4 py-2">
              Past Exams & Marks ({past.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Loading your assigned exams…</div>
            ) : active.length > 0 ? (
              <div className="space-y-3">
                {active.map((e) => (
                  <ExamCard
                    key={e.id}
                    e={e}
                    onResult={openResult}
                    onLeaderboard={setBoardExam}
                    onEvaluation={openEvaluation}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Calendar className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No active exams right now</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Exams that you have registered for or are assigned to will appear here when scheduled.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {past.length > 0 ? (
              <div className="space-y-3">
                {past.map((e) => (
                  <ExamCard
                    key={e.id}
                    e={e}
                    onResult={openResult}
                    onLeaderboard={setBoardExam}
                    onEvaluation={openEvaluation}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <GraduationCap className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No past attempts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Your completed assessments, score reports, and evaluation sheets will be recorded here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 py-6 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <Credit />
        </div>
      </footer>

      {/* Modals */}
      {showPassport && <SkillPassport onClose={() => setShowPassport(false)} />}
      {(showPwd || mustChange) && (
        <ChangePassword
          forced={mustChange}
          onClose={() => setShowPwd(false)}
          onDone={() => {
            setShowPwd(false);
            refetch();
          }}
        />
      )}
      {result && <ResultModal result={result} onClose={() => setResult(null)} />}
      {boardExam && <LeaderboardModal examId={boardExam} onClose={closeBoard} />}
      {evaluation && (
        <EvaluationSheetModal
          sheet={evaluation}
          onClose={() => setEvaluation(null)}
          onSubmitted={() => {
            setEvaluation(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
