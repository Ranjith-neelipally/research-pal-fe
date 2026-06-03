import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Provider } from "react-redux";
import { AppShell } from "@/components/AppShell";
import { store } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { clearSession, selectAuthUser } from "@/store/auth";
import { setSessionExpiredHandler } from "@/services/api";

// Pages
import IntroPage from "./screens/Public/Intro";
import HomePage from "./screens/Root/Home";
import ProjectsPage from "./screens/Root/Projects";
import CreateProjectPage from "./screens/Root/Projects/AddNewProject";
import ProjectDetailPage from "./screens/Root/Projects/ProjectDetails";
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

const queryClient = new QueryClient();

setSessionExpiredHandler(() => {
  store.dispatch(clearSession());
});

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const shellHiddenPaths = new Set(["/", "/splash", "/login", "/signup", "/forgot-password"]);
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
            <AppLayout>
              <Routes>
                {/* <Route path="/splash" element={<SplashPage />} /> */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/" element={<IntroPage />} />
                <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                <Route path="/projects/new" element={<ProtectedRoute><CreateProjectPage /></ProtectedRoute>} />
                <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
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
