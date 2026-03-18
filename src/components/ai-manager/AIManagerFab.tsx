"use client";

import { useState, useRef } from "react";
import ActionCard, { ActionCardData } from "./ActionCard";
import "./ai-manager.css";

export default function AIManagerFab() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [actionPayload, setActionPayload] = useState<ActionCardData | null>(null);
  const [hasMicError, setHasMicError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
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
      setHasMicError(true);
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

      const actionCardHeader = response.headers.get("X-Action-Card");
      if (actionCardHeader) {
          try {
              const payload = JSON.parse(actionCardHeader);
              setActionPayload(payload);
          } catch (e) {
              console.error("Failed to parse Action Card JSON", e);
          }
      }

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

  let fabStateClass = "idle";
  if (isRecording) fabStateClass = "recording";
  else if (isProcessing) fabStateClass = "processing";

  return (
    <>
      <ActionCard payload={actionPayload} onClose={() => setActionPayload(null)} />
      
      <div className="ai-fab-container">
        {isRecording && <div className="ai-fab-status listening">Listening...</div>}
        {isProcessing && <div className="ai-fab-status thinking">Thinking...</div>}
        {isPlaying && <div className="ai-fab-status speaking">Speaking...</div>}

        <button
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          className={`ai-fab-btn ${fabStateClass}`}
          aria-label="Push to talk to AI Manager"
        >
          {isProcessing ? (
             <div className="ai-fab-spinner" />
          ) : (
             <span className="ai-fab-icon">🎤</span>
          )}

          {!isRecording && !isProcessing && !isPlaying && (
             <span className="ai-fab-ripple" />
          )}
        </button>
      </div>

      {hasMicError && (
          <div className="ai-mic-helper-overlay">
              <div className="ai-mic-helper-modal">
                  <span className="ai-mic-helper-icon">🎙️</span>
                  <h3 className="ai-mic-helper-title">Microphone Access Needed</h3>
                  <div className="ai-mic-helper-text" style={{ textAlign: "left", fontSize: "13px" }}>
                      <p style={{ marginTop: 0 }}>To talk to the AI Manager, you need to allow microphone access:</p>
                      <ul style={{ paddingLeft: "20px", margin: "12px 0", color: "#e0e0e8" }}>
                          <li style={{ marginBottom: "8px" }}><b>iOS (Safari):</b> Go to Settings App → Safari → Microphone → set to <i>Allow</i>. Then refresh this page.</li>
                          <li><b>Android (Chrome):</b> Tap the padlock 🔒 icon in the URL bar → Permissions → Microphone → set to <i>Allow</i>.</li>
                      </ul>
                  </div>
                  <button className="ai-mic-helper-btn" onClick={() => setHasMicError(false)}>
                      Okay, I'll check settings
                  </button>
              </div>
          </div>
      )}
    </>
  );
}
