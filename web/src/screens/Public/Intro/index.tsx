import { useState } from "react";
import { Link } from "react-router-dom";
import { Leaf, FolderKanban, FileText, Grid3X3, BarChart3, ArrowRight, Check } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const features = [
  {
    icon: FolderKanban,
    title: "Project Management",
    description: "Create and manage multiple research projects with structured organization.",
  },
  {
    icon: FileText,
    title: "Notes Organization",
    description: "Capture field observations and ideas with rich text and photo support.",
  },
  {
    icon: Grid3X3,
    title: "Plot Tracking System",
    description: "Track replications, treatments, and observations across your research plots.",
  },
  {
    icon: BarChart3,
    title: "Research Structuring",
    description: "Structure your findings with date-wise notes and visual plot grids.",
  },
];

const highlights = [
  "Unlimited projects & plots",
  "Photo attachments per note",
  "Date-based note grouping",
  "Mobile-first design",
];

export default function IntroPage() {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] via-[#e8eef5] to-[#dce4ed] text-slate-900 dark:from-[hsl(220,20%,6%)] dark:via-[hsl(220,20%,8%)] dark:to-[hsl(220,18%,10%)] dark:text-slate-100">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-slate-200/60 dark:bg-[hsl(220,18%,12%)]/70 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[hsl(142,55%,42%)] flex items-center justify-center">
              <Leaf size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ResearchPal
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2 rounded-xl hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium text-white bg-[hsl(142,55%,42%)] hover:bg-[hsl(142,55%,36%)] transition-colors px-5 py-2.5 rounded-xl shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 max-w-5xl mx-auto">
        <div className="text-center page-enter">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-slate-200/60 text-xs font-medium text-slate-600 mb-8 shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,55%,42%)]" />
            Field research made simple
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6 dark:text-slate-100">
            ResearchPal - Organize
            <br />
            research effortlessly
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed dark:text-slate-400">
            Capture field notes, track plots, and manage your research projects
            in one streamlined workspace built for scientists and researchers.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(142,55%,42%)] text-white font-medium text-sm hover:bg-[hsl(142,55%,36%)] transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              Sign Up Free
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-all active:scale-[0.98] dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14 page-enter">
          <h2 className="text-2xl font-bold text-slate-900 mb-3 dark:text-slate-100">
            Everything you need for field research
          </h2>
          <p className="text-slate-500 max-w-md mx-auto dark:text-slate-400">
            A focused toolkit designed around how researchers actually work in the field.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 stagger-item">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-white/80 border border-slate-200/60 hover:border-slate-300/80 transition-all hover:shadow-lg hover:-translate-y-0.5 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-[hsl(142,55%,42%)]/10 flex items-center justify-center mb-4 group-hover:bg-[hsl(142,55%,42%)]/15 transition-colors">
                  <Icon size={20} className="text-[hsl(142,55%,42%)]" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1.5 dark:text-slate-100">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* App Preview */}
      <section className="px-6 py-20 bg-white/50 border-y border-slate-200/40 dark:bg-white/[0.02] dark:border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 page-enter">
            <h2 className="text-2xl font-bold text-slate-900 mb-3 dark:text-slate-100">
              Built for the field
            </h2>
            <p className="text-slate-500 max-w-md mx-auto dark:text-slate-400">
              A clean, mobile-first interface that works where your research happens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Project Card Mock */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm stagger-item dark:bg-white/5 dark:border-white/10" style={{ animationDelay: "0ms" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center dark:bg-white/10">
                  <FolderKanban size={18} className="text-slate-500 dark:text-slate-300" />
                </div>
                <div>
                  <div className="h-3.5 w-28 bg-slate-200 rounded-md mb-1.5 dark:bg-white/15" />
                  <div className="h-2.5 w-16 bg-slate-100 rounded-md dark:bg-white/10" />
                </div>
              </div>
              <div className="flex gap-1.5 mb-3">
                {["bg-[hsl(142,55%,42%)]","bg-[hsl(199,80%,50%)]","bg-[hsl(262,60%,55%)]","bg-[hsl(330,70%,55%)]"].map((c, i) => (
                  <div key={i} className={`w-5 h-5 rounded-md ${c} opacity-30`} />
                ))}
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-md dark:bg-white/10" />
            </div>

            {/* Notes Card Mock */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm stagger-item dark:bg-white/5 dark:border-white/10" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-slate-400 dark:text-slate-400" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide dark:text-slate-400">
                  Today
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="h-2.5 w-full bg-slate-100 rounded-md dark:bg-white/10" />
                <div className="h-2.5 w-5/6 bg-slate-100 rounded-md dark:bg-white/10" />
                <div className="h-2.5 w-4/6 bg-slate-100 rounded-md dark:bg-white/10" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10" />
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10" />
              </div>
            </div>

            {/* Plot Grid Mock */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm stagger-item dark:bg-white/5 dark:border-white/10" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide dark:text-slate-300">
                  Plot Grid
                </span>
                <Grid3X3 size={14} className="text-slate-400 dark:text-slate-400" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }).map((_, i) => {
                  const colors = [
                    "bg-[hsl(142,55%,42%)]",
                    "bg-[hsl(199,80%,50%)]",
                    "bg-[hsl(262,60%,55%)]",
                    "bg-[hsl(330,70%,55%)]",
                  ];
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg ${colors[i % 4]} opacity-20 dark:opacity-40`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center page-enter">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 dark:text-slate-100">
            Start organizing your research today
          </h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8 dark:text-slate-400">
            Join researchers who trust ResearchPal to keep their fieldwork structured and accessible.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[hsl(142,55%,42%)] text-white font-medium text-sm hover:bg-[hsl(142,55%,36%)] transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              Sign Up Free
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-all active:scale-[0.98] dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {highlights.map((h) => (
              <div key={h} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <Check size={14} className="text-[hsl(142,55%,42%)]" />
                {h}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/40 dark:bg-white/[0.02] dark:border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf size={16} className="text-[hsl(142,55%,42%)]" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              ResearchPal
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <p>Field research made simple</p>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              |
            </span>
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="font-medium text-[hsl(142,55%,42%)] transition-colors hover:text-[hsl(142,55%,32%)] dark:text-[hsl(142,55%,52%)] dark:hover:text-[hsl(142,55%,62%)]"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
    <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-[hsl(220,18%,10%)] dark:text-slate-100">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl">Privacy Policy</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            How ResearchPal handles account data, research content, photos, location features, and device information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Information we collect</h3>
            <p>
              We collect account details such as your name, email address, password, and verification status, along with
              research content you save in the app, including projects, plots, notes, ideas, dates, and photo references.
            </p>
            <p>
              On mobile, photos you capture or choose can be copied into the app’s local storage on your device. The app
              may also use location features, technical logs, IP address, user-agent, request headers, and error details to
              support normal operation and troubleshooting.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">How we use information</h3>
            <p>
              We use this information to create and secure accounts, store and sync your research data, send verification
              and password reset emails, support location-based features, and improve the reliability and security of the
              service.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">How we share information</h3>
            <p>
              We do not sell personal information. We may share data with service providers that help us run the app,
              including email delivery, database hosting, and third-party location or weather services used by specific
              features.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Storage and security</h3>
            <p>
              Passwords are hashed, refresh tokens are stored server-side in hashed form, access tokens are short-lived,
              and sensitive fields are redacted from error logs where possible. No system is perfectly secure, but we take
              reasonable steps to protect your information.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Children’s privacy</h3>
            <p>
              ResearchPal is intended for adult users and is not directed to children under 13. We do not knowingly
              collect personal information from children under 13.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Contact</h3>
            <p>
              If you have questions about this policy, contact us through the support channel provided with your ResearchPal
              deployment.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
