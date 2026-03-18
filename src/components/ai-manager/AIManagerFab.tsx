"use client";

import React, { useState, useRef } from "react";
import ActionCard, { ActionCardData } from "./ActionCard";

export default function AIManagerFab() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [actionPayload, setActionPayload] = useState<ActionCardData | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      // Clear previous states
      setActionPayload(null);
      if (audioPlayerRef.current) {
         audioPlayerRef.current.pause();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the mic
        stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        setIsProcessing(true);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to use the AI Manager.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudio = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "user-input.webm");

      const response = await fetch("/api/ai-manager", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process audio.");
      }

      // Read custom JSON header for the Action Card UI
      const actionCardHeader = response.headers.get("X-Action-Card");
      if (actionCardHeader) {
          try {
              const payload = JSON.parse(actionCardHeader);
              setActionPayload(payload);
          } catch (e) {
              console.error("Failed to parse Action Card JSON", e);
          }
      }

      // Read audio blob for playback
      const audioBuffer = await response.blob();
      const audioUrl = URL.createObjectURL(audioBuffer);
      
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      
      audio.onplay = () => {
          setIsProcessing(false);
          setIsPlaying(true);
      };
      audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
      };

      audio.play();

    } catch (error) {
      console.error("AI Manager Error:", error);
      setIsProcessing(false);
    }
  };

  return (
    <>
      <ActionCard payload={actionPayload} onClose={() => setActionPayload(null)} />
      
      <div className="fixed bottom-6 right-6 z-50 flex items-center justify-center">
        {isRecording && (
            <div className="absolute -top-12 bg-[#a855f7] px-3 py-1 rounded-full text-xs font-bold text-white shadow shadow-[#a855f7]/50 animate-pulse">
                Listening...
            </div>
        )}
        
        {isProcessing && (
            <div className="absolute -top-12 bg-[#00d4e6] px-3 py-1 rounded-full text-xs font-bold text-[#0f0f23] shadow shadow-[#00d4e6]/50 animate-pulse">
                Thinking...
            </div>
        )}

        {isPlaying && (
            <div className="absolute -top-12 bg-[#00e676] px-3 py-1 rounded-full text-xs font-bold text-[#0f0f23] shadow shadow-[#00e676]/50">
                Speaking...
            </div>
        )}

        <button
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          className={`relative flex items-center justify-center w-16 h-16 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300 ${isRecording ? 'scale-110 bg-gradient-to-r from-[#ff5555] to-[#f53d3d] shadow-[0_0_30px_rgba(255,85,85,0.6)]' : ''} ${isProcessing ? 'bg-[#333355]' : ''} ${!isRecording && !isProcessing ? 'bg-gradient-to-r from-[#a855f7] to-[#7c3aed] hover:scale-105' : ''}`}
          style={{ touchAction: 'none' }}
          aria-label="Push to talk to AI Manager"
        >
          {isProcessing ? (
             <div className="w-6 h-6 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
          ) : (
             <span className="text-3xl filter drop-shadow-md pb-1">🎤</span>
          )}

          {/* Ripple effect rings when idle */}
          {!isRecording && !isProcessing && !isPlaying && (
             <span className="absolute inset-0 rounded-full border border-[#a855f7] opacity-30 animate-ping" />
          )}
        </button>
      </div>
    </>
  );
}
