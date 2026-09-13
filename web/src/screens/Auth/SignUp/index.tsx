import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf, Mail, Lock, Eye, EyeOff, User, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signup, verifyEmail } from "@/store/auth";
import { useAppDispatch } from "@/store/hooks";
import {
  validateBackendPassword,
  validateEmail,
  validateRequired,
  validateVerificationCode,
} from "@/utils/authValidation";

const SignupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    verificationCode?: string;
  }>({});

  const validateSignupForm = () => {
    const nextErrors: typeof errors = {
      firstName: validateRequired(firstName, "First name is required."),
      lastName: validateRequired(lastName, "Last name is required."),
      username: validateRequired(username, "Username is required."),
      email: validateEmail(email),
      password: validateBackendPassword(password),
    };

    if (username.trim().length > 0 && username.trim().length < 3) {
      nextErrors.username = "Username must be at least 3 characters.";
    } else if (username.trim().length > 20) {
      nextErrors.username = "Username must be 20 characters or fewer.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (password.trim() !== confirmPassword.trim()) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.values(nextErrors).every(error => !error);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignupForm()) return;

    setIsLoading(true);

    try {
      await dispatch(
        signup({
          email: email.trim(),
          password: password.trim(),
          userName: username.trim(),
        }),
      ).unwrap();
      setIsLoading(false);
      toast({
        title: "Check your email",
        description: "Enter the verification code we sent you.",
      });
      setShowVerification(true);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCodeError = validateVerificationCode(verificationCode);
    setErrors(prev => ({ ...prev, verificationCode: verificationCodeError }));
    if (verificationCodeError) return;

    setIsLoading(true);

    try {
      await dispatch(verifyEmail({ code: verificationCode.trim() })).unwrap();
      setIsLoading(false);
      toast({
        title: "Email verified",
        description: "You can now sign in.",
      });
      navigate("/login");
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mobile-container bg-background min-h-screen flex flex-col">
      <div className="flex-1 px-6 py-8 flex flex-col justify-center">
        {/* Logo */}
        <div className="text-center mb-8 page-enter">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Leaf size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-2">Start your research journey</p>
        </div>

        {showVerification ? (
          <form onSubmit={handleVerifyEmail} className="space-y-4 stagger-item" style={{ animationDelay: "100ms" }}>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Verification code</label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Enter code"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value);
                  if (errors.verificationCode) {
                    setErrors(prev => ({ ...prev, verificationCode: undefined }));
                  }
                }}
                className="h-11 bg-secondary border-border rounded-xl text-sm"
                required
              />
              {errors.verificationCode && (
                <p className="text-sm text-destructive">{errors.verificationCode}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify Email"}
            </Button>
          </form>
        ) : (
        <form onSubmit={handleSignup} className="space-y-3 stagger-item" style={{ animationDelay: "100ms" }}>
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">First Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="First"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (errors.firstName) setErrors(prev => ({ ...prev, firstName: undefined }));
                  }}
                  className="pl-10 h-11 bg-secondary border-border rounded-xl text-sm"
                  required
                />
              </div>
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Last Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Last"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (errors.lastName) setErrors(prev => ({ ...prev, lastName: undefined }));
                  }}
                  className="pl-10 h-11 bg-secondary border-border rounded-xl text-sm"
                  required
                />
              </div>
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Username</label>
            <div className="relative">
              <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors(prev => ({ ...prev, username: undefined }));
                }}
                className="pl-10 h-11 bg-secondary border-border rounded-xl text-sm"
                required
              />
            </div>
            {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                className="pl-10 h-11 bg-secondary border-border rounded-xl text-sm"
                required
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                className="pl-10 pr-10 h-11 bg-secondary border-border rounded-xl text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Confirm Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                className="pl-10 pr-10 h-11 bg-secondary border-border rounded-xl text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl text-sm font-medium mt-4"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        )}

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground mt-6 stagger-item" style={{ animationDelay: "200ms" }}>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
