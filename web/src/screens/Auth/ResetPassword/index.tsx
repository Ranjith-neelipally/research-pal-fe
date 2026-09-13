import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Eye, EyeOff, Leaf, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { updatePassword, verifyResetPassword } from "@/store/auth";
import { useAppDispatch } from "@/store/hooks";
import { validateBackendPassword } from "@/utils/authValidation";

const ResetPasswordPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(Boolean(token));
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    let active = true;

    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        return;
      }

      try {
        await dispatch(verifyResetPassword({ token })).unwrap();
        if (active) setIsTokenValid(true);
      } catch (error) {
        if (active) {
          toast({
            title: "Reset link invalid",
            description: error instanceof Error ? error.message : String(error),
            variant: "destructive",
          });
        }
      } finally {
        if (active) setIsValidating(false);
      }
    };

    validateToken();

    return () => {
      active = false;
    };
  }, [dispatch, toast, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: { password?: string; confirmPassword?: string } = {
      password: validateBackendPassword(password),
    };
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (password.trim() !== confirmPassword.trim()) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setIsLoading(true);

    try {
      await dispatch(updatePassword({ token: token.trim(), password: password.trim() })).unwrap();
      setIsSubmitted(true);
    } catch (error) {
      toast({
        title: "Password reset failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = isTokenValid && password && confirmPassword && !isLoading;

  return (
    <div className="mobile-container bg-background min-h-screen flex flex-col mx-auto">
      <div className="flex-1 px-6 py-12 flex flex-col justify-center">
        <Link
          to="/login"
          className="absolute top-6 left-4 p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </Link>

        {isSubmitted ? (
          <div className="text-center page-enter">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle size={32} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Password Updated</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-8">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Button className="rounded-xl px-6" onClick={() => navigate("/login", { replace: true })}>
              Back to Login
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-12 page-enter">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Leaf size={32} className="text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                Enter a new password for your account
              </p>
            </div>

            {!token || (!isValidating && !isTokenValid) ? (
              <div className="text-center stagger-item" style={{ animationDelay: "100ms" }}>
                <p className="text-sm text-muted-foreground mb-6">
                  This reset link is invalid or expired. Please request a new password reset link.
                </p>
                <Link to="/forgot-password">
                  <Button variant="outline" className="rounded-xl px-6">
                    Request New Link
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 stagger-item" style={{ animationDelay: "100ms" }}>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">New Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      className="pl-12 pr-12 h-12 bg-secondary border-border rounded-xl"
                      disabled={isValidating}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Confirm Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
                      className="pl-12 pr-12 h-12 bg-secondary border-border rounded-xl"
                      disabled={isValidating}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-medium"
                  disabled={!canSubmit}
                >
                  {isValidating ? "Checking link..." : isLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
