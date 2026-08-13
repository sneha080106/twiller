"use client";

import React, { useRef, useState } from "react";
import axios from "axios";
import { Mic, Square, Upload, X, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import LoadingSpinner from "./loading-spinner";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";

const BACKEND_ORIGIN = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
const MAX_DURATION_SECONDS = 5 * 60;
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPosted: (tweet: any) => void;
}

export default function AudioTweetModal({ isOpen, onClose, onPosted }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [step, setStep] = useState<"compose" | "otp">("compose");
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!isOpen || !user) return null;

  const resetAll = () => {
    setContent("");
    setIsRecording(false);
    setRecordSeconds(0);
    setAudioBlob(null);
    setPreviewUrl("");
    setStep("compose");
    setOtpCode("");
    setDevOtp("");
    setError("");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (s + 1 >= MAX_DURATION_SECONDS) {
            stopRecording();
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      setError("Couldn't access your microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_BYTES) {
      setError("Audio file exceeds the 100MB limit.");
      return;
    }
    setAudioBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const handleRequestOtp = async () => {
    if (!audioBlob) {
      setError("Please record or upload an audio clip first.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await axiosInstance.post("/otp/send", { email: user.email, purpose: "audio-upload" });
      setDevOtp(res.data.devOtp || "");
      setStep("otp");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Couldn't send a verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioBlob || !otpCode.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("author", user._id);
      formData.append("content", content);
      formData.append("otp", otpCode.trim());
      const filename = audioBlob instanceof File ? audioBlob.name : "recording.webm";
      formData.append("audio", audioBlob, filename);

      const res = await axios.post(`${BACKEND_ORIGIN}/post/audio`, formData);
      onPosted(res.data);
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Couldn't post your audio tweet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-black border-gray-800 text-white">
        <CardHeader className="relative pb-4 border-b border-gray-800">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4 text-white hover:bg-gray-900" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
          <CardTitle className="text-xl font-bold">Audio tweet</CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            Audio tweets can only be posted between 2:00 PM–7:00 PM IST. Max 5 minutes, 100MB.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">{error}</div>
          )}

          {step === "compose" && (
            <>
              <Textarea
                placeholder="Add a caption (optional)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-transparent border-gray-700 text-white placeholder-gray-500 resize-none min-h-[70px]"
              />

              <div className="rounded-xl border border-gray-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Record</span>
                  {isRecording && <span className="text-red-400 text-sm font-mono">{formatTime(recordSeconds)}</span>}
                </div>
                <div className="flex items-center space-x-3">
                  {!isRecording ? (
                    <Button type="button" onClick={startRecording} className="bg-blue-500 hover:bg-blue-600 rounded-full">
                      <Mic className="h-4 w-4 mr-2" /> Start recording
                    </Button>
                  ) : (
                    <Button type="button" onClick={stopRecording} className="bg-red-500 hover:bg-red-600 rounded-full">
                      <Square className="h-4 w-4 mr-2" /> Stop
                    </Button>
                  )}
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-1 border-t border-gray-800" />
                  <span className="px-2 text-xs text-gray-500">OR</span>
                  <div className="flex-1 border-t border-gray-800" />
                </div>

                <div>
                  <Label htmlFor="audioUpload" className="text-sm text-gray-400 mb-2 block">Upload a file</Label>
                  <label
                    htmlFor="audioUpload"
                    className="flex items-center justify-center border border-dashed border-gray-700 rounded-lg py-3 cursor-pointer hover:bg-gray-950 text-gray-400"
                  >
                    <Upload className="h-4 w-4 mr-2" /> Choose audio file
                  </label>
                  <input id="audioUpload" type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
                </div>

                {previewUrl && (
                  <audio controls src={previewUrl} className="w-full mt-2" />
                )}
              </div>

              <Button
                onClick={handleRequestOtp}
                disabled={!audioBlob || isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 rounded-full py-3 font-semibold"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Sending code...</span>
                  </div>
                ) : (
                  "Continue"
                )}
              </Button>
            </>
          )}

          {step === "otp" && (
            <form onSubmit={handlePostAudio} className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-blue-300 text-sm flex items-start space-x-2">
                <ShieldCheck className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>
                  We sent a verification code to {user.email}.
                  {devOtp && (
                    <span className="block mt-1 text-yellow-300">
                      Dev mode (no email configured) — your code is: <b>{devOtp}</b>
                    </span>
                  )}
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="audioOtp" className="text-white">Verification code</Label>
                <Input
                  id="audioOtp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="bg-transparent border-gray-600 text-white text-center text-lg tracking-widest"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !otpCode.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 rounded-full py-3 font-semibold"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Posting...</span>
                  </div>
                ) : (
                  "Post audio tweet"
                )}
              </Button>
              <Button type="button" variant="link" className="w-full text-gray-400" onClick={() => setStep("compose")}>
                Back
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
