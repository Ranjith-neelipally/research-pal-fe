import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, FolderKanban, Images, Lightbulb, User } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/diary", label: "Ideas", icon: Lightbulb },
  { to: "/photos", label: "Photos", icon: Images },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const routeHeaders = [
  {
    match: /^\/home\/?$/,
    title: "Good day, researcher",
    subtitle: "Capture a small idea, jot a quick observation, or revisit your week.",
  },
  { match: /^\/projects\/new\/?$/, title: "New Project", subtitle: "Create a structured research project" },
  { match: /^\/projects\/[^/]+\/notes\/?$/, title: "Project Notes", subtitle: "Date-wise observations and notes" },
  { match: /^\/projects\/[^/]+\/observations\/[^/]+\/?$/, title: "Observation", subtitle: "Structured field data" },
  { match: /^\/projects\/[^/]+\/plot\/[^/]+\/note\/[^/]+\/?$/, title: "Edit Note", subtitle: "Update your plot observation" },
  { match: /^\/projects\/[^/]+\/plot\/[^/]+\/?$/, title: "Plot Notes", subtitle: "Observations for this plot" },
  { match: /^\/projects\/[^/]+\/?$/, title: "Project Details", subtitle: "Plots, treatments, and observations" },
  { match: /^\/projects\/?$/, title: "Projects", subtitle: "Manage your research experiments" },
  { match: /^\/diary\/?$/, title: "Diary", subtitle: "Daily research journal" },
  { match: /^\/photos\/?$/, title: "Photos", subtitle: "Images across all research" },
  { match: /^\/profile\/?$/, title: "Profile", subtitle: "Your identity, research footprint, and preferences." },
] as const;

function getRouteHeader(pathname: string) {
  return (
    routeHeaders.find((header) => header.match.test(pathname)) ?? {
      title: "ResearchPal",
      subtitle: "Record, observe, grow",
    }
  );
}

function getBackTarget(pathname: string) {
  if (/^\/projects\/new\/?$/.test(pathname)) return "/projects";

  const noteMatch = pathname.match(/^\/projects\/([^/]+)\/plot\/([^/]+)\/note\/[^/]+\/?$/);
  if (noteMatch) return `/projects/${noteMatch[1]}/plot/${noteMatch[2]}`;

  const plotMatch = pathname.match(/^\/projects\/([^/]+)\/plot\/[^/]+\/?$/);
  if (plotMatch) return `/projects/${plotMatch[1]}`;

  const notesMatch = pathname.match(/^\/projects\/([^/]+)\/notes\/?$/);
  if (notesMatch) return `/projects/${notesMatch[1]}`;
  const observationMatch = pathname.match(/^\/projects\/([^/]+)\/observations\/[^/]+\/?$/);
  if (observationMatch) return `/projects/${observationMatch[1]}`;

  const detailMatch = pathname.match(/^\/projects\/[^/]+\/?$/);
  if (detailMatch) return "/projects";

  return null;
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={[
        "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      ].join(" ")}
    >
      <Icon
        className={[
          "h-5 w-5 shrink-0 transition-colors",
          active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
        ].join(" ")}
      />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const header = getRouteHeader(pathname);
  const backTarget = getBackTarget(pathname);
  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside className="hidden h-screen w-64 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-4 flex items-center gap-3 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <img src="/app-icon.png" alt="ResearchPal" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight">ResearchPal</div>
            <div className="text-xs text-muted-foreground">Field notebook</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {tabs.map((t) => (
            <NavItem key={t.to} {...t} active={isActive(t.to)} />
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-4 text-xs text-muted-foreground">
          Record · Observe · Grow
        </div>
      </aside>

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <PageHeader
          title={header.title}
          subtitle={header.subtitle}
          onBack={backTarget ? () => navigate(backTarget) : undefined}
        />
        <div className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-0">
          {children ?? <Outlet />}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-sidebar-border bg-sidebar/95 backdrop-blur px-2 py-2">
        <div className="flex items-center justify-around">
          {tabs.map((t) => {
            const a = isActive(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={[
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors",
                  a ? "text-primary" : "text-sidebar-foreground/70",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
