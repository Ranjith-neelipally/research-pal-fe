import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Provider } from "react-redux";
import { AppShell } from "@/components/AppShell";
import { store } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { clearSession, selectAuthUser, setAccessToken } from "@/store/auth";
import { setAccessTokenUpdatedHandler, setSessionExpiredHandler } from "@/services/api";
import { queryClient } from "@/lib/queryClient";

// Pages
import IntroPage from "./screens/Public/Intro";
import HomePage from "./screens/Root/Home";
import ProjectsPage from "./screens/Root/Projects";
import CreateProjectPage from "./screens/Root/Projects/AddNewProject";
import ProjectDetailPage from "./screens/Root/Projects/ProjectDetails";
import ObservationDetailsPage from "./screens/Root/Projects/ObservationDetails";
import EditProjectPage from "./screens/Root/Projects/EditProject";
import ProjectNotesListPage from "./screens/Root/Projects/ProjectNotesList";
import PlotNotesPage from "./screens/Root/Projects/PlotNotes";
import EditNotePage from "./screens/Root/Projects/ProjectNoteDetails/editor";
import DiaryPage from "./screens/Root/Diary";
// import PhotosPage from "./screens/Root/Photos";
import ProfilePage from "./screens/Root/Profile";
import NotFound from "./screens/Public/NotFound";
// import SplashPage from "./screens/Public/Splash";
import LoginPage from "./screens/Auth/Login";
import SignupPage from "./screens/Auth/SignUp";
import ForgotPasswordPage from "./screens/Auth/ForgetPassword";
import { AccountDeletionPage, PrivacyPolicyPage } from "./screens/Public/Legal";

setSessionExpiredHandler(() => {
  store.dispatch(clearSession());
});
setAccessTokenUpdatedHandler((token) => {
  store.dispatch(setAccessToken(token));
});

const getRouteTitle = (pathname: string) => {
  if (pathname === "/") return "ResearchPal | Welcome";
  if (pathname === "/login") return "ResearchPal | Login";
  if (pathname === "/signup") return "ResearchPal | Sign Up";
  if (pathname === "/forgot-password") return "ResearchPal | Forgot Password";
  if (pathname === "/privacy") return "ResearchPal | Privacy Policy";
  if (pathname === "/account-deletion") return "ResearchPal | Account Deletion";
  if (pathname === "/home") return "ResearchPal | Home";
  if (pathname === "/projects") return "ResearchPal | Projects";
  if (pathname === "/projects/new") return "ResearchPal | New Project";
  if (/^\/projects\/[^/]+\/edit\/?$/.test(pathname)) return "ResearchPal | Edit Project";
  if (/^\/projects\/[^/]+\/notes\/?$/.test(pathname)) return "ResearchPal | Project Notes";
  if (/^\/projects\/[^/]+\/observations\/[^/]+\/?$/.test(pathname)) return "ResearchPal | Observation";
  if (/^\/projects\/[^/]+\/plot\/[^/]+\/note\/[^/]+\/?$/.test(pathname)) return "ResearchPal | Edit Note";
  if (/^\/projects\/[^/]+\/plot\/[^/]+\/?$/.test(pathname)) return "ResearchPal | Plot Notes";
  if (/^\/projects\/[^/]+\/?$/.test(pathname)) return "ResearchPal | Project Details";
  if (pathname === "/diary") return "ResearchPal | Diary";
  if (pathname === "/profile") return "ResearchPal | Profile";
  return "ResearchPal | Not Found";
};

const DocumentTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = getRouteTitle(pathname);
  }, [pathname]);

  return null;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const shellHiddenPaths = new Set(["/", "/splash", "/login", "/signup", "/forgot-password", "/privacy", "/account-deletion"]);
  const showShell = !shellHiddenPaths.has(location.pathname);

  return showShell ? <AppShell>{children}</AppShell> : <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useAppSelector(selectAuthUser);
  const location = useLocation();

  if (!user?.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="researchpal-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DocumentTitle />
            <AppLayout>
              <Routes>
                {/* <Route path="/splash" element={<SplashPage />} /> */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/account-deletion" element={<AccountDeletionPage />} />
                <Route path="/" element={<IntroPage />} />
                <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                <Route path="/projects/new" element={<ProtectedRoute><CreateProjectPage /></ProtectedRoute>} />
                <Route path="/projects/:id/edit" element={<ProtectedRoute><EditProjectPage /></ProtectedRoute>} />
                <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/observations/:typeId" element={<ProtectedRoute><ObservationDetailsPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/notes" element={<ProtectedRoute><ProjectNotesListPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/plot/:plotId" element={<ProtectedRoute><PlotNotesPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/plot/:plotId/note/:noteId" element={<ProtectedRoute><EditNotePage /></ProtectedRoute>} />
                <Route path="/diary" element={<ProtectedRoute><DiaryPage /></ProtectedRoute>} />
                {/* Web photos page is intentionally disabled; keep PhotosPage code available for later. */}
                {/* <Route path="/photos" element={<PhotosPage />} /> */}
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </Provider>
);

export default App;
