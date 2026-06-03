import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/AppShell";

// Pages
import IntroPage from "./pages/IntroPage";
import HomePage from "./pages/HomePage";
import ProjectsPage from "./pages/ProjectsPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectNotesListPage from "./pages/ProjectNotesListPage";
import PlotNotesPage from "./pages/PlotNotesPage";
import EditNotePage from "./pages/EditNotePage";
import DiaryPage from "./pages/DiaryPage";
// import PhotosPage from "./pages/PhotosPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
// import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const shellHiddenPaths = new Set(["/", "/splash", "/login", "/signup", "/forgot-password"]);
  const showShell = !shellHiddenPaths.has(location.pathname);

  return showShell ? <AppShell>{children}</AppShell> : <>{children}</>;
};

const App = () => (
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
            <Route path="/home" element={<HomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/new" element={<CreateProjectPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:projectId/notes" element={<ProjectNotesListPage />} />
            <Route path="/projects/:projectId/plot/:plotId" element={<PlotNotesPage />} />
            <Route path="/projects/:projectId/plot/:plotId/note/:noteId" element={<EditNotePage />} />
            <Route path="/diary" element={<DiaryPage />} />
            {/* Web photos page is intentionally disabled; keep PhotosPage code available for later. */}
            {/* <Route path="/photos" element={<PhotosPage />} /> */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
