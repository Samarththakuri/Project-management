import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button, Input, Checkbox } from "../../components/ui";
import useAuthStore from "../../store/authStore";
import { register as registerUser } from "../../api/auth.api";

const schema = z.object({
  username: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  terms: z.boolean().refine((v) => v === true, "You must accept the terms"),
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(data) {
    // console.log("FORM DATA:", data);
    // console.log(data);
    setServerError("");
    try {
      const res = await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
      });
      // console.log("REGISTER RESPONSE:", res);
      setSuccess(true);
    } catch (err) {
      setServerError(err.response?.data?.message || "Registration failed");
    }
  }
  // console.log(errors);
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-surface-container-low border-r border-outline-variant p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary-fixed-dim" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary-fixed-dim" />

        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-on-surface"
              style={{ left: `${(i + 1) * 12.5}%` }}
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-on-surface"
              style={{ top: `${(i + 1) * 16.67}%` }}
            />
          ))}
        </div>

        <div className="relative">
          <p className="text-mono-label font-mono text-primary-fixed-dim uppercase tracking-widest mb-2">
            Project Camp
          </p>
          <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
            Technical Operations
          </p>
        </div>

        <div className="relative">
          <h1 className="text-headline-lg font-geist text-on-surface leading-tight mb-4">
            Join the
            <br />
            <span className="text-primary-fixed-dim">operations grid.</span>
          </h1>
          <p className="text-body-lg font-geist text-on-surface-variant max-w-sm">
            Deploy your team's project infrastructure with precision and speed.
          </p>
        </div>

        <div className="relative">
          <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
            Trusted by engineering teams worldwide
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 relative">
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-outline-variant" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-outline-variant" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-outline-variant" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-outline-variant" />

        <div className="w-full max-w-sm">
          {success ? (
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-primary-fixed-dim flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-primary-fixed-dim text-[24px]">
                  mark_email_read
                </span>
              </div>
              <h2 className="text-headline-md font-geist text-on-surface mb-3">
                Check your inbox
              </h2>
              <p className="text-body-md font-geist text-on-surface-variant mb-6">
                A verification link has been sent to your email. Verify to
                activate your account.
              </p>
              <Link to="/login">
                <Button variant="secondary" className="w-full">
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-mono-label font-mono text-primary-fixed-dim uppercase tracking-widest mb-2">
                  New Operator
                </p>
                <h2 className="text-headline-md font-geist text-on-surface">
                  Create account
                </h2>
              </div>

              {serverError && (
                <div className="mb-4 px-4 py-3 border border-error bg-error-container/20 text-error text-body-md font-geist">
                  {serverError}
                </div>
              )}

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-5"
              >
                <Input
                  id="username"
                  label="Full Name"
                  type="text"
                  placeholder="Ada Lovelace"
                  icon="person"
                  error={errors.username?.message}
                  {...register("username")}
                />
                <Input
                  id="email"
                  label="Work Email"
                  type="email"
                  placeholder="you@company.com"
                  icon="mail"
                  error={errors.email?.message}
                  {...register("email")}
                />
                <Input
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="Min. 8 characters"
                  icon="lock"
                  error={errors.password?.message}
                  {...register("password")}
                />
                <Checkbox
                  id="terms"
                  label="I accept the terms of service"
                  error={errors.terms?.message}
                  {...register("terms")}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Initializing..." : "Initialize Sequence"}
                </Button>
              </form>

              <p className="mt-6 text-body-md font-geist text-on-surface-variant text-center">
                Already have access?{" "}
                <Link
                  to="/login"
                  className="text-primary-fixed-dim hover:text-primary-fixed transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
