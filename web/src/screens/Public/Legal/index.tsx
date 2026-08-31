import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

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
  <LegalLayout title="Privacy Policy" updated="August 28, 2026">
    <section><h2 className="text-xl font-semibold">What ResearchPal processes</h2><p>ResearchPal processes your email address, profile name and profession, authentication sessions, projects, plots, observations, notes and Ideas. Photos you attach are stored in the app's local sandbox. A project location label may be saved when you enter one or choose your approximate current location.</p></section>
    <section><h2 className="text-xl font-semibold">How data is used</h2><p>We use this information to create and secure your account, synchronize your research workspace, display charts, support exports, deliver account emails, and provide optional Idea reminders and weather information. ResearchPal does not contain advertising SDKs and does not track you across other companies' apps or websites.</p></section>
    <section><h2 className="text-xl font-semibold">Storage and service providers</h2><p>Account and research records are stored on ResearchPal's server database. Authentication and transactional email are processed by the ResearchPal backend and its configured database, hosting, and email providers. Weather and location searches contact Open-Meteo, ipwho.is, and OpenStreetMap Nominatim when those features are used. Data is transmitted over HTTPS in production.</p></section>
    <section><h2 className="text-xl font-semibold">Retention and deletion</h2><p>We retain account data while your account is active. You can permanently delete your account from Settings → Security → Delete account. Account-owned server data and local ResearchPal data are deleted after email verification. Operational records may be retained only where required for security, fraud prevention, or law.</p></section>
    <section><h2 className="text-xl font-semibold">Your choices</h2><p>Location, camera, photo, and notification access are optional and requested when you use the related feature. You can deny or later revoke these permissions in system settings. Manual location entry remains available without location access.</p></section>
    <section><h2 className="text-xl font-semibold">Contact</h2><p>For privacy or support requests, contact the ResearchPal support address published on the ResearchPal website or store listing.</p></section>
  </LegalLayout>
);

export const AccountDeletionPage = () => (
  <LegalLayout title="Delete your ResearchPal account" updated="August 28, 2026">
    <p>You can initiate permanent deletion from the ResearchPal mobile app or signed-in web application.</p>
    <ol className="list-decimal space-y-2 pl-6"><li>Sign in to your ResearchPal account.</li><li>Open Settings or Profile, then Security.</li><li>Select <strong>Delete account</strong> and continue.</li><li>Enter the six-digit code sent to your registered email.</li><li>Select <strong>Verify and delete</strong>.</li></ol>
    <p>Deletion removes your profile, projects, plots, observations, observation types, notes, Ideas, photo metadata, synchronization records, active sessions, and account-deletion codes. ResearchPal photos and cached account data stored by the mobile app are also removed. This cannot be undone.</p>
    <p>If you cannot access the app, <Link className="text-primary underline" to="/login">sign in on the web</Link> and use the Profile deletion flow. Do not send passwords or verification codes to support.</p>
  </LegalLayout>
);
