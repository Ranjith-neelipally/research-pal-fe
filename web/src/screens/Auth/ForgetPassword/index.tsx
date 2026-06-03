import { useState } from "react";
import { Link } from "react-router-dom";
import { Leaf, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mock password reset - in production, integrate with auth service
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1000);
  };

  return (
    <div className="mobile-container bg-background min-h-screen flex flex-col">
      <div className="flex-1 px-6 py-12 flex flex-col justify-center">
        {/* Back button */}
        <Link 
          to="/login" 
          className="absolute top-6 left-4 p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </Link>

        {!isSubmitted ? (
          <>
            {/* Logo */}
            <div className="text-center mb-12 page-enter">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Leaf size={32} className="text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                Enter your email and we'll send you instructions to reset your password
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 stagger-item" style={{ animationDelay: "100ms" }}>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 bg-secondary border-border rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center page-enter">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle size={32} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-8">
              We've sent a password reset link to <span className="text-foreground font-medium">{email}</span>
            </p>
            <Link to="/login">
              <Button variant="outline" className="rounded-xl px-6">
                Back to Login
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;