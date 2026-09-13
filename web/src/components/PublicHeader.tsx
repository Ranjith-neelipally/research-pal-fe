import { Leaf } from "lucide-react";
import { Link } from "react-router-dom";

import { ThemeToggle } from "@/components/ThemeToggle";

export const PublicHeader = () => (
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
);
