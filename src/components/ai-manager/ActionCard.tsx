"use client";

import { useEffect, useState } from "react";

export type ActionCardData = {
  type: "generic_text" | "draft_contract" | "gig_request" | "agenda" | "seeds_overview" | "seed_adjusted";
  data: any;
};

export default function ActionCard({ payload, onClose }: { payload: ActionCardData | null, onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (payload) {
      setIsVisible(true);
      // Auto dismiss after 10 seconds generic text
      if (payload.type === "generic_text") {
        const timer = setTimeout(() => {
           setIsVisible(false);
           setTimeout(onClose, 300);
        }, 8000);
        return () => clearTimeout(timer);
      }
    } else {
        setIsVisible(false);
    }
  }, [payload, onClose]);

  const handleClose = () => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for transition
  };

  if (!payload && !isVisible) return null;

  return (
    <div 
      className={`fixed top-20 right-6 w-80 bg-[#1e1e2e] border border-[#333355] rounded-xl shadow-2xl z-50 overflow-hidden transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#333355] bg-[#14141f]">
        <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="text-sm font-semibold text-[#a855f7]">AI Manager</span>
        </div>
        <button onClick={handleClose} className="text-[#9999bb] hover:text-white transition-colors">✕</button>
      </div>

      <div className="p-4">
        {payload?.type === "generic_text" && (
          <p className="text-sm text-[#e0e0e8] leading-relaxed">{payload.data.text}</p>
        )}

        {payload?.type === "draft_contract" && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Drafted Contract</h4>
            <div className="bg-[#14141f] p-3 rounded border border-[#333355] text-xs space-y-2">
                <div className="flex justify-between">
                    <span className="text-[#9999bb]">Client</span>
                    <span className="font-medium text-white">{payload.data.client || "TBA"}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#9999bb]">Action</span>
                    <span className="font-medium text-[#00d4e6] uppercase">{payload.data.action}</span>
                </div>
                {payload.data.amount && (
                    <div className="flex justify-between">
                        <span className="text-[#9999bb]">Amount</span>
                        <span className="font-medium text-[#00e676]">${payload.data.amount}</span>
                    </div>
                )}
                {payload.data.deposit && (
                    <div className="flex justify-between">
                        <span className="text-[#9999bb]">Deposit Required</span>
                        <span className="font-medium text-white">{payload.data.deposit}%</span>
                    </div>
                )}
            </div>
            <button 
                onClick={handleClose}
                className="w-full mt-2 py-2 bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
                Approve &amp; Send
            </button>
          </div>
        )}

        {payload?.type === "gig_request" && (
          <div className="space-y-3">
            <div className="px-2 py-1 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded text-xs inline-block uppercase tracking-widest font-bold mb-2">New Request</div>
            <div className="text-sm">
                <span className="font-bold text-white">{payload.data.client}</span> wants to book you for a <span className="text-[#00d4e6]">{payload.data.type}</span> on <span className="font-semibold">{payload.data.date}</span>.
            </div>
            <div className="text-2xl font-black text-[#00e676]">${payload.data.amount}</div>
          </div>
        )}

        {payload?.type === "agenda" && (
            <div className="space-y-3">
             <h4 className="text-sm font-bold text-white uppercase tracking-wider">Your Schedule</h4>
             <div className="text-xs text-[#9999bb]">You have no confirmed gigs for {payload.data.date}.</div>
           </div>
        )}

        {payload?.type === "seeds_overview" && (
            <div className="space-y-3">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Lead Finder</h4>
                    <span className="text-[#a855f7] bg-[#a855f7]/10 px-2 py-1 rounded-md text-xs font-bold">ACTIVE</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#14141f] border border-[#333355] rounded-lg p-3 text-center">
                        <div className="text-2xl font-black text-white">{payload.data.activeSeeds}</div>
                        <div className="text-[10px] text-[#9999bb] uppercase tracking-wider mt-1">Active Seeds</div>
                    </div>
                    <div className="bg-[#14141f] border border-[#00d4e6]/30 rounded-lg p-3 text-center">
                        <div className="text-2xl font-black text-[#00d4e6]">{payload.data.totalLeads}</div>
                        <div className="text-[10px] text-[#00d4e6]/70 uppercase tracking-wider mt-1">New Leads</div>
                    </div>
                </div>
                <div className="text-[11px] text-[#9999bb] text-center mt-2">To change your focus, ask me to add or modify a seed.</div>
            </div>
        )}

        {payload?.type === "seed_adjusted" && (
            <div className="space-y-3">
                <div className="px-2 py-1 bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/30 rounded text-xs inline-block uppercase tracking-widest font-bold mb-2">Seed {payload.data.action}</div>
                <div className="bg-[#14141f] p-3 rounded border border-[#333355] text-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-[#9999bb]">Region</span>
                        <span className="font-medium text-white">{payload.data.region}</span>
                    </div>
                    {payload.data.keywords && payload.data.keywords.length > 0 && (
                        <div className="flex justify-between">
                            <span className="text-[#9999bb]">Keywords</span>
                            <span className="font-medium text-[#00d4e6]">{payload.data.keywords.join(", ")}</span>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
