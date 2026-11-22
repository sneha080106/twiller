"use client";

import React, { useState } from "react";
import { X, Check, CreditCard } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import LoadingSpinner from "./loading-spinner";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PLANS = [
  { key: "free", name: "Free", price: 0, limit: "1 tweet / month" },
  { key: "bronze", name: "Bronze", price: 100, limit: "3 tweets / month" },
  { key: "silver", name: "Silver", price: 300, limit: "5 tweets / month" },
  { key: "gold", name: "Gold", price: 1000, limit: "Unlimited tweets" },
];

export default function SubscribeModal({ isOpen, onClose }: Props) {
  const { user, refreshUser } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen || !user) return null;

  const handleSubscribe = async (planKey: string) => {
    if (planKey === "free" || planKey === user.plan) return;
    setLoadingPlan(planKey);
    setError("");
    setSuccess("");
    try {
      const res = await axiosInstance.post("/payment/create-checkout-session", {
        email: user.email,
        plan: planKey,
      });
      if (res.data.url) {
        // Real Stripe checkout — hand off to Stripe's hosted page.
        window.location.href = res.data.url;
        return;
      }
      // Dev mode: subscription was applied directly.
      setSuccess(res.data.message);
      await refreshUser();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Couldn't start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-black border-gray-800 text-white max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative pb-4 border-b border-gray-800">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4 text-white hover:bg-gray-900" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <CreditCard className="h-6 w-6 text-blue-400" />
            <CardTitle className="text-xl font-bold">Subscribe to Twiller</CardTitle>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Payments can only be made between 10:00 AM–11:00 AM IST. Your current plan: <b className="capitalize">{user.plan || "free"}</b>{" "}
            ({user.tweetsUsedThisCycle ?? 0} tweet{(user.tweetsUsedThisCycle ?? 0) === 1 ? "" : "s"} used this month).
          </p>
        </CardHeader>

        <CardContent className="pt-4 space-y-3">
          {error && <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">{error}</div>}
          {success && <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-green-300 text-sm">{success}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLANS.map((plan) => {
              const isCurrent = (user.plan || "free") === plan.key;
              return (
                <div key={plan.key} className={`rounded-xl border p-4 ${isCurrent ? "border-blue-500 bg-blue-950/20" : "border-gray-800"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    {isCurrent && <Check className="h-5 w-5 text-blue-400" />}
                  </div>
                  <p className="text-2xl font-bold mb-1">{plan.price === 0 ? "Free" : `₹${plan.price}`}<span className="text-sm text-gray-500 font-normal">{plan.price === 0 ? "" : " / month"}</span></p>
                  <p className="text-gray-400 text-sm mb-4">{plan.limit}</p>
                  <Button
                    disabled={plan.key === "free" || isCurrent || loadingPlan !== null}
                    onClick={() => handleSubscribe(plan.key)}
                    className="w-full rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-800 disabled:text-gray-500"
                  >
                    {loadingPlan === plan.key ? (
                      <div className="flex items-center justify-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <span>Processing...</span>
                      </div>
                    ) : isCurrent ? (
                      "Current plan"
                    ) : plan.key === "free" ? (
                      "Default plan"
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
