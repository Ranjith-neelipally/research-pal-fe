import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PrivacyPolicyContent } from "./PrivacyPolicyContent";

const LegalLayout = ({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) => (
  <main className="min-h-screen bg-background text-foreground px-6 py-12">
    <article className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 font-semibold text-primary">
        <Leaf size={20} /> ResearchPal
      </Link>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
      <div className="mt-8 space-y-6 leading-7 text-card-foreground">{children}</div>
    </article>
  </main>
);

export const PrivacyPolicyPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] via-[#e8eef5] to-[#dce4ed] text-slate-900 dark:from-[hsl(220,20%,6%)] dark:via-[hsl(220,20%,8%)] dark:to-[hsl(220,18%,10%)] dark:text-slate-100">
    <PublicHeader />
    <main className="px-6 py-12">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200/60 bg-white/80 p-6 text-sm leading-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300 sm:p-10">
        <h1 className="mb-8 text-3xl font-bold text-slate-900 dark:text-slate-100">Privacy Policy</h1>
        <PrivacyPolicyContent />
      </article>
    </main>
  </div>
);

export const AccountDeletionPage = () => (
  <LegalLayout title="Delete your ResearchPal account" updated="August 28, 2026">
    <p>You can initiate permanent deletion from the ResearchPal mobile app or signed-in web application.</p>
    <ol className="list-decimal space-y-2 pl-6"><li>Sign in to your ResearchPal account.</li><li>Open Settings or Profile, then Security.</li><li>Select <strong>Delete account</strong> and continue.</li><li>Enter the six-digit code sent to your registered email.</li><li>Select <strong>Verify and delete</strong>.</li></ol>
    <p>Deletion removes your profile, projects, plots, observations, observation types, notes, Ideas, photo metadata, synchronization records, active sessions, and account-deletion codes. ResearchPal photos and cached account data stored by the mobile app are also removed. This cannot be undone.</p>
    <p>If you cannot access the app, <Link className="text-primary underline" to="/login">sign in on the web</Link> and use the Profile deletion flow. Do not send passwords or verification codes to support.</p>
  </LegalLayout>
);
