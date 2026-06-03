import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Building2,
  CheckCircle2,
  Download,
  Globe,
  KeyRound,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Pencil,
  Ruler,
  Smartphone,
  Sun,
  Tag,
  User as UserIcon,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ClientOnly } from "@/components/ClientOnly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type ThemePreference = "dark" | "light" | "auto";
type UnitPreference = "metric" | "imperial";

type Profile = {
  name: string;
  email: string;
  organization: string;
  institution: string;
  department: string;
  role: string;
  status: "active" | "inactive";
  createdAt: string;
  lastActiveAt: string;
  interests: string[];
  expertise: string[];
  preferences: {
    theme: ThemePreference;
    units: UnitPreference;
    language: string;
    autoWeather: boolean;
    autoGps: boolean;
  };
};

const initialProfile: Profile = {
  name: "Alex Researcher",
  email: "alex@research.edu",
  organization: "ResearchPal Field Lab",
  institution: "Open Research Institute",
  department: "Applied Agronomy",
  role: "Researcher",
  status: "active",
  createdAt: "2026-04-18T10:00:00.000Z",
  lastActiveAt: new Date().toISOString(),
  interests: ["field-notes", "plot-trials", "soil-health"],
  expertise: ["Crop monitoring", "Experimental design", "Observation workflows"],
  preferences: {
    theme: "dark",
    units: "metric",
    language: "English",
    autoWeather: true,
    autoGps: false,
  },
};

const stats = {
  projectsTotal: 12,
  projectsActive: 8,
  projectsCompleted: 4,
  plots: 48,
  notes: 156,
  photos: 85,
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme, setTheme } = useTheme();
  const [profile, setProfile] = useState(initialProfile);
  const [editOpen, setEditOpen] = useState(false);

  const updateProfile = (nextProfile: Partial<Profile>) => {
    setProfile((current) => ({
      ...current,
      ...nextProfile,
      lastActiveAt: new Date().toISOString(),
    }));
    toast({ title: "Profile updated" });
  };

  const updatePreferences = (nextPreferences: Partial<Profile["preferences"]>) => {
    setProfile((current) => ({
      ...current,
      preferences: { ...current.preferences, ...nextPreferences },
      lastActiveAt: new Date().toISOString(),
    }));

    if (nextPreferences.theme) {
      setTheme(nextPreferences.theme === "auto" ? "system" : nextPreferences.theme);
    }
  };

  const themeIcon = resolvedTheme === "light" ? Sun : Moon;

  return (
    <div className="min-h-screen bg-background">
      <div className="grid gap-6 p-6 md:grid-cols-3 md:p-10">
        <section className="rounded-3xl border border-border bg-card p-6 md:col-span-3">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <UserIcon className="h-9 w-9" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-semibold tracking-tight">{profile.name}</h2>
              <div className="mt-1 text-sm text-muted-foreground">
                {profile.role || "Researcher"}
                {profile.institution ? ` - ${profile.institution}` : ""}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {profile.email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  {profile.status === "active" ? "Active" : "Inactive"}
                </span>
                <span>
                  Member since{" "}
                  <ClientOnly fallback="-">
                    <span>{format(parseISO(profile.createdAt), "MMM yyyy")}</span>
                  </ClientOnly>
                </span>
                <span>
                  Last active{" "}
                  <ClientOnly fallback="-">
                    <span>
                      {formatDistanceToNow(parseISO(profile.lastActiveAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </ClientOnly>
                </span>
              </div>
            </div>
            <Button variant="secondary" className="rounded-full" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" /> Edit profile
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 md:col-span-2">
          <SectionTitle icon={Building2}>Research</SectionTitle>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Organization" value={profile.organization} />
            <Field label="Institution" value={profile.institution} />
            <Field label="Department" value={profile.department} />
            <Field label="Role" value={profile.role} />
          </dl>

          <TagList title="Interests" icon={<Tag className="h-3 w-3" />} prefix="#" items={profile.interests} />
          <TagList title="Expertise" items={profile.expertise} bordered />
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <SectionTitle icon={CheckCircle2}>Research footprint</SectionTitle>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatCell label="Projects" value={stats.projectsTotal} />
            <StatCell label="Active" value={stats.projectsActive} />
            <StatCell label="Done" value={stats.projectsCompleted} />
            <StatCell label="Plots" value={stats.plots} />
            <StatCell label="Notes" value={stats.notes} />
            <StatCell label="Photos" value={stats.photos} />
          </div>
          <Sparkline />
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 md:col-span-2">
          <SectionTitle icon={Monitor}>Preferences</SectionTitle>
          <div className="mt-4 grid gap-5">
            <Row label="Theme" icon={themeIcon}>
              <Segmented
                value={profile.preferences.theme}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                  { value: "auto", label: "Auto" },
                ]}
                onChange={(value) => updatePreferences({ theme: value as ThemePreference })}
              />
            </Row>
            <Row label="Units" icon={Ruler}>
              <Segmented
                value={profile.preferences.units}
                options={[
                  { value: "metric", label: "Metric" },
                  { value: "imperial", label: "Imperial" },
                ]}
                onChange={(value) => updatePreferences({ units: value as UnitPreference })}
              />
            </Row>
            <Row label="Language" icon={Globe}>
              <span className="rounded-lg bg-secondary px-3 py-1.5 text-sm">
                {profile.preferences.language}
              </span>
            </Row>
            <Row label="Auto-weather" icon={Sun}>
              <Toggle
                value={profile.preferences.autoWeather}
                onChange={(value) => updatePreferences({ autoWeather: value })}
              />
            </Row>
            <Row label="Auto-GPS on observations" icon={Smartphone}>
              <Toggle
                value={profile.preferences.autoGps}
                onChange={(value) => updatePreferences({ autoGps: value })}
              />
            </Row>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <SectionTitle icon={KeyRound}>Security</SectionTitle>
          <div className="mt-4 grid gap-2">
            <ActionRow icon={KeyRound} label="Change password" onClick={() => toast({ title: "Password flow coming soon" })} />
            <ActionRow icon={Smartphone} label="Active sessions (2 devices)" onClick={() => toast({ title: "Session list coming soon" })} />
            <ActionRow icon={Download} label="Export my data (JSON)" onClick={() => toast({ title: "Export queued" })} />
            <ActionRow
              icon={LogOut}
              label="Sign out everywhere"
              destructive
              onClick={() => {
                toast({ title: "Signed out everywhere" });
                navigate("/login");
              }}
            />
          </div>
        </section>
      </div>

      <EditProfileDialog
        open={editOpen}
        profile={profile}
        onOpenChange={setEditOpen}
        onSave={updateProfile}
      />
    </div>
  );
};

function SectionTitle({ icon: Icon, children }: { icon: typeof Building2; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <Icon className="h-4 w-4 text-primary" />
      <span>{children}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">
        {value || <span className="text-muted-foreground">-</span>}
      </dd>
    </div>
  );
}

function TagList({
  title,
  items,
  icon,
  prefix = "",
  bordered = false,
}: {
  title: string;
  items: string[];
  icon?: ReactNode;
  prefix?: string;
  bordered?: boolean;
}) {
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-sm text-muted-foreground">None yet</span>
        ) : (
          items.map((item) => (
            <span
              key={item}
              className={[
                "rounded-full px-2.5 py-1 text-xs",
                bordered ? "border border-border" : "bg-secondary text-muted-foreground",
              ].join(" ")}
            >
              {prefix}
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-3 py-3 text-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Sparkline() {
  const data = useMemo(() => [3, 4, 2, 6, 5, 7, 4, 5, 8, 6, 9, 7, 10, 8], []);
  const max = Math.max(...data);

  return (
    <div className="mt-5">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        Activity (14d)
      </div>
      <div className="flex h-12 items-end gap-1">
        {data.map((value, index) => (
          <div
            key={`${value}-${index}`}
            className="flex-1 rounded-sm bg-primary/30"
            style={{ height: `${(value / max) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function Row({ label, icon: Icon, children }: { label: string; icon: typeof Sun; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center rounded-full border border-border p-1 text-xs">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={[
            "rounded-full px-3 py-1.5 transition-colors",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={[
        "relative h-6 w-11 rounded-full transition-colors",
        value ? "bg-primary" : "bg-secondary",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all",
          value ? "left-[22px]" : "left-0.5",
        ].join(" ")}
      />
    </button>
  );
}

function ActionRow({
  icon: Icon,
  label,
  destructive,
  onClick,
}: {
  icon: typeof KeyRound;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center justify-between rounded-xl border border-border bg-card/40 px-3 py-3 text-sm transition-colors hover:bg-surface-elevated",
        destructive ? "text-destructive" : "",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="text-muted-foreground">-&gt;</span>
    </button>
  );
}

function EditProfileDialog({
  open,
  profile,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  profile: Profile;
  onOpenChange: (value: boolean) => void;
  onSave: (profile: Partial<Profile>) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [organization, setOrganization] = useState(profile.organization);
  const [institution, setInstitution] = useState(profile.institution);
  const [department, setDepartment] = useState(profile.department);
  const [role, setRole] = useState(profile.role);
  const [interests, setInterests] = useState(profile.interests.join(", "));
  const [expertise, setExpertise] = useState(profile.expertise.join(", "));

  const save = () => {
    onSave({
      name: name.trim(),
      email: email.trim(),
      organization: organization.trim(),
      institution: institution.trim(),
      department: department.trim(),
      role: role.trim(),
      interests: splitList(interests),
      expertise: splitList(expertise),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your researcher identity and affiliations.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Pair label="Name" value={name} onChange={setName} />
          <Pair label="Email" value={email} onChange={setEmail} type="email" />
          <Pair label="Organization" value={organization} onChange={setOrganization} />
          <Pair label="Institution" value={institution} onChange={setInstitution} />
          <Pair label="Department" value={department} onChange={setDepartment} />
          <Pair label="Role" value={role} onChange={setRole} />
          <Pair label="Interests (comma separated)" value={interests} onChange={setInterests} />
          <Pair label="Expertise (comma separated)" value={expertise} onChange={setExpertise} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Pair({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default ProfilePage;
