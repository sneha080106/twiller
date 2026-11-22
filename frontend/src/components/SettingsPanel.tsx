"use client";

import React, { useEffect, useState } from "react";
import { X, Bell, Phone, Globe, History, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import LoadingSpinner from "./loading-spinner";
import { useAuth } from "@/context/AuthContext";
import { useLanguage, LANGUAGES, LanguageCode } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axiosInstance";
import { requestNotificationPermission } from "@/lib/notifications";
import SubscribeModal from "./SubscribeModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: Props) {
  const { user, updateProfile, refreshUser } = useAuth();
  const { language, setLanguageLocal, t } = useLanguage();

  const [phone, setPhone] = useState(user?.phone || "");
  const [notifSaving, setNotifSaving] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  // --- Feature 5: language switch with OTP ---
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode | null>(null);
  const [langChannel, setLangChannel] = useState<"email" | "phone" | null>(null);
  const [langCode, setLangCode] = useState("");
  const [langDevOtp, setLangDevOtp] = useState("");
  const [langError, setLangError] = useState("");
  const [langLoading, setLangLoading] = useState(false);

  // --- Feature 6: login history ---
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showSubscribe, setShowSubscribe] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setPhone(user.phone || "");
      setHistoryLoading(true);
      axiosInstance
        .get(`/loginhistory/${user.email}`)
        .then((res) => setLoginHistory(res.data || []))
        .catch(() => {})
        .finally(() => setHistoryLoading(false));
    }
  }, [isOpen, user?.email]);

  if (!isOpen || !user) return null;

  // --- Feature 1: Notifications ---
  const handleToggleNotifications = async () => {
    const next = !user.notificationsEnabled;
    if (next) {
      const permission = await requestNotificationPermission();
      if (permission === "denied") {
        alert("Notifications are blocked in your browser settings. Please allow them to enable this feature.");
        return;
      }
    }
    setNotifSaving(true);
    try {
      await updateProfile({ notificationsEnabled: next });
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSavePhone = async () => {
    setPhoneSaving(true);
    setPhoneSaved(false);
    try {
      await updateProfile({ phone: phone.trim() });
      setPhoneSaved(true);
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleRequestLanguageSwitch = async (lang: LanguageCode) => {
    if (lang === language) return;
    setLangError("");
    setLangCode("");
    setLangDevOtp("");
    setLangLoading(true);
    try {
      const res = await axiosInstance.post("/language/request-switch", { email: user.email, language: lang });
      if (res.data.alreadyActive) {
        setLanguageLocal(lang);
        return;
      }
      setPendingLanguage(lang);
      setLangChannel(res.data.channel);
      setLangDevOtp(res.data.devOtp || "");
    } catch (err: any) {
      setLangError(err?.response?.data?.error || "Couldn't send a verification code.");
    } finally {
      setLangLoading(false);
    }
  };

  const handleConfirmLanguageSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLanguage || !langCode.trim()) return;
    setLangLoading(true);
    setLangError("");
    try {
      await axiosInstance.post("/language/confirm-switch", {
        email: user.email,
        language: pendingLanguage,
        code: langCode.trim(),
      });
      setLanguageLocal(pendingLanguage);
      await refreshUser();
      setPendingLanguage(null);
      setLangCode("");
    } catch (err: any) {
      setLangError(err?.response?.data?.error || "Invalid verification code.");
    } finally {
      setLangLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-black border-gray-800 text-white max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative pb-4 border-b border-gray-800">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4 text-white hover:bg-gray-900" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <CardTitle className="text-xl font-bold">{t("settings")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-8 pt-4">
          {/* Feature 1: Notifications */}
          <section>
            <div className="flex items-center space-x-2 mb-2">
              <Bell className="h-5 w-5 text-blue-400" />
              <h3 className="font-bold">Notifications</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Get a browser popup whenever a tweet mentions "cricket" or "science".
            </p>
            <Button
              onClick={handleToggleNotifications}
              disabled={notifSaving}
              variant="outline"
              className={`rounded-full border-gray-600 ${user.notificationsEnabled ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-black text-white"}`}
            >
              {notifSaving ? <LoadingSpinner size="sm" /> : user.notificationsEnabled ? "Enabled — tap to disable" : "Disabled — tap to enable"}
            </Button>
          </section>

          {/* Phone number, needed for phone-based OTP flows */}
          <section>
            <div className="flex items-center space-x-2 mb-2">
              <Phone className="h-5 w-5 text-blue-400" />
              <h3 className="font-bold">Phone number</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Used to verify password resets and language switches other than French.
            </p>
            <div className="flex space-x-2">
              <Input
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneSaved(false); }}
                placeholder="+91XXXXXXXXXX"
                className="bg-transparent border-gray-600 text-white"
              />
              <Button onClick={handleSavePhone} disabled={phoneSaving} className="bg-white text-black hover:bg-gray-200 rounded-full px-6">
                {phoneSaving ? <LoadingSpinner size="sm" /> : t("save")}
              </Button>
            </div>
            {phoneSaved && <p className="text-green-400 text-xs mt-1">Saved.</p>}
          </section>

          {/* Feature 5: Multi-language */}
          <section>
            <div className="flex items-center space-x-2 mb-2">
              <Globe className="h-5 w-5 text-blue-400" />
              <h3 className="font-bold">Language</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              French is verified by email; every other language is verified by your phone number.
            </p>
            {langError && <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm mb-2">{langError}</div>}
            <div className="flex flex-wrap gap-2 mb-2">
              {LANGUAGES.map((l) => (
                <Button
                  key={l.code}
                  variant="outline"
                  disabled={langLoading}
                  onClick={() => handleRequestLanguageSwitch(l.code)}
                  className={`rounded-full border-gray-600 ${language === l.code ? "bg-blue-500 text-white" : "bg-black text-white"}`}
                >
                  {l.label}
                </Button>
              ))}
            </div>

            {pendingLanguage && (
              <form onSubmit={handleConfirmLanguageSwitch} className="mt-3 space-y-2 border border-gray-800 rounded-lg p-3">
                <div className="flex items-start space-x-2 text-blue-300 text-sm">
                  <ShieldCheck className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>
                    Verification code sent via {langChannel === "email" ? "email" : "SMS"}.
                    {langDevOtp && <span className="block mt-1 text-yellow-300">Dev mode — your code is: <b>{langDevOtp}</b></span>}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={langCode}
                    onChange={(e) => setLangCode(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                    className="bg-transparent border-gray-600 text-white"
                  />
                  <Button type="submit" disabled={langLoading || !langCode.trim()} className="bg-blue-500 hover:bg-blue-600 rounded-full px-6">
                    {langLoading ? <LoadingSpinner size="sm" /> : "Verify"}
                  </Button>
                </div>
              </form>
            )}
          </section>

          {/* Feature 4: Subscription */}
          <section>
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="h-5 w-5 text-blue-400" />
              <h3 className="font-bold">Subscription</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Current plan: <b className="capitalize">{user.plan || "free"}</b> · {user.tweetsUsedThisCycle ?? 0} tweet
              {(user.tweetsUsedThisCycle ?? 0) === 1 ? "" : "s"} used this month.
            </p>
            <Button onClick={() => setShowSubscribe(true)} className="bg-blue-500 hover:bg-blue-600 rounded-full">
              Manage subscription
            </Button>
          </section>

          {/* Feature 6: Login history */}
          <section>
            <div className="flex items-center space-x-2 mb-2">
              <History className="h-5 w-5 text-blue-400" />
              <h3 className="font-bold">Login history</h3>
            </div>
            {historyLoading ? (
              <LoadingSpinner size="sm" />
            ) : loginHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No login history yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-800">
                      <th className="py-2 pr-4">When</th>
                      <th className="py-2 pr-4">Browser</th>
                      <th className="py-2 pr-4">OS</th>
                      <th className="py-2 pr-4">Device</th>
                      <th className="py-2 pr-4">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginHistory.map((entry, i) => (
                      <tr key={i} className="border-b border-gray-900">
                        <td className="py-2 pr-4 text-gray-300">{new Date(entry.timestamp).toLocaleString()}</td>
                        <td className="py-2 pr-4 text-gray-300">{entry.browser}</td>
                        <td className="py-2 pr-4 text-gray-300">{entry.os}</td>
                        <td className="py-2 pr-4 text-gray-300 capitalize">{entry.device}</td>
                        <td className="py-2 pr-4 text-gray-500">{entry.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </CardContent>
      </Card>

      <SubscribeModal isOpen={showSubscribe} onClose={() => setShowSubscribe(false)} />
    </div>
  );
}
