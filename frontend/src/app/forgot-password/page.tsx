"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/loading-spinner";
import TwitterLogo from "@/components/Twitterlogo";
import axiosInstance from "@/lib/axiosInstance";

// Feature 3: dedicated Forgot Password page + route (as opposed to a modal),
// reachable directly at /forgot-password.
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "verify" | "done">("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [devPassword, setDevPassword] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/auth/forgot-password/request", { identifier: identifier.trim() });
      setInfo(res.data.message);
      setDevOtp(res.data.devOtp || "");
      setStep("verify");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/auth/forgot-password/reset", {
        identifier: identifier.trim(),
        code: code.trim(),
      });
      setInfo(res.data.message);
      setDevPassword(res.data.devPassword || "");
      setStep("done");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <TwitterLogo size="xl" className="text-white" />
      </div>
      <Card className="w-full max-w-md bg-black border-gray-800 text-white">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <KeyRound className="h-6 w-6 text-blue-400" />
            <CardTitle className="text-xl font-bold">Reset your password</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === "request" && (
            <form onSubmit={handleRequest} className="space-y-4">
              <p className="text-gray-400 text-sm">
                Enter your registered email address or phone number and we'll send you a verification code.
                You can only do this once per day.
              </p>
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-white">Email or phone number</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="you@example.com or +91XXXXXXXXXX"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full"
                disabled={isLoading || !identifier.trim()}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Sending code...</span>
                  </div>
                ) : (
                  "Send verification code"
                )}
              </Button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-4">
              {info && (
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-blue-300 text-sm">
                  {info}
                  {devOtp && (
                    <span className="block mt-1 text-yellow-300">
                      Dev mode — your code is: <b>{devOtp}</b>
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code" className="text-white">Verification code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 text-center text-lg tracking-widest"
                  disabled={isLoading}
                  maxLength={6}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full"
                disabled={isLoading || !code.trim()}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify & reset password"
                )}
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-green-300 text-sm">
                {info}
                {devPassword && (
                  <span className="block mt-1 text-yellow-300">
                    Dev mode — your new password is: <b>{devPassword}</b>
                  </span>
                )}
              </div>
              <Link href="/">
                <Button className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3 rounded-full">
                  Back to sign in
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
      <Link href="/" className="mt-6 text-gray-400 hover:text-white flex items-center text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Twiller
      </Link>
    </div>
  );
}
