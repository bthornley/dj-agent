"use client";

import { useEffect, useState } from "react";
import "./ai-manager.css";

export type ActionCardData = {
  type: "generic_text" | "draft_contract" | "gig_request" | "agenda" | "seeds_overview" | "seed_adjusted" | "read_leads";
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
      setTimeout(onClose, 300);
  };

  if (!payload && !isVisible) return null;

  return (
    <div className={`ai-action-card ${isVisible ? 'visible' : ''}`}>
      <div className="ai-card-header">
        <div className="ai-card-title">
            <span style={{ fontSize: '20px' }}>🤖</span>
            <span>AI Manager</span>
        </div>
        <button onClick={handleClose} className="ai-card-close">✕</button>
      </div>

      <div className="ai-card-body">
        {payload?.type === "generic_text" && (
          <p className="ai-card-text">{payload.data.text}</p>
        )}

        {payload?.type === "draft_contract" && (
          <div className="ai-card-section">
            <h4 className="ai-card-subtitle">Drafted Contract</h4>
            <div className="ai-card-box">
                <div className="ai-card-row">
                    <span className="ai-card-label">Client</span>
                    <span className="ai-card-value">{payload.data.client || "TBA"}</span>
                </div>
                <div className="ai-card-row">
                    <span className="ai-card-label">Action</span>
                    <span className="ai-card-value highlight">{payload.data.action}</span>
                </div>
                {payload.data.amount && (
                    <div className="ai-card-row">
                        <span className="ai-card-label">Amount</span>
                        <span className="ai-card-value success">${payload.data.amount}</span>
                    </div>
                )}
                {payload.data.deposit && (
                    <div className="ai-card-row">
                        <span className="ai-card-label">Deposit Required</span>
                        <span className="ai-card-value">{payload.data.deposit}%</span>
                    </div>
                )}
            </div>
            <button onClick={handleClose} className="ai-card-btn">Approve &amp; Send</button>
          </div>
        )}

        {payload?.type === "gig_request" && (
          <div className="ai-card-section">
            <div className="ai-card-badge warning">New Request</div>
            <div className="ai-card-msg">
                <span className="ai-card-value">{payload.data.client}</span> wants to book you for a <span className="ai-card-value highlight" style={{textTransform: 'none'}}>{payload.data.type}</span> on <span style={{fontWeight: 600, color: 'white'}}>{payload.data.date}</span>.
            </div>
            <div className="ai-card-value large">${payload.data.amount}</div>
          </div>
        )}

        {payload?.type === "agenda" && (
            <div className="ai-card-section">
             <h4 className="ai-card-subtitle">Your Schedule</h4>
             <div className="ai-card-label" style={{fontSize: '12px'}}>You have no confirmed gigs for {payload.data.date}.</div>
           </div>
        )}

        {payload?.type === "seeds_overview" && (
            <div className="ai-card-section">
                <div className="ai-card-flex">
                    <h4 className="ai-card-subtitle" style={{margin: 0}}>Lead Finder</h4>
                    <span className="ai-card-badge active">Active</span>
                </div>
                <div className="ai-card-grid">
                    <div className="ai-card-stat">
                        <div className="ai-card-stat-val">{payload.data.activeSeeds}</div>
                        <div className="ai-card-stat-label">Active Seeds</div>
                    </div>
                    <div className="ai-card-stat highlight">
                        <div className="ai-card-stat-val highlight">{payload.data.totalLeads}</div>
                        <div className="ai-card-stat-label highlight">New Leads</div>
                    </div>
                </div>
                <div className="ai-card-footer">To change your focus, ask me to add or modify a seed.</div>
            </div>
        )}

        {payload?.type === "read_leads" && (
            <div className="ai-card-section">
                <div className="ai-card-badge success" style={{width: 'fit-content', marginBottom: '12px'}}>Top New Leads</div>
                <div className="ai-card-box list-container">
                    {payload.data.leads.map((lead: any, i: number) => (
                        <div key={i} className="ai-card-row" style={{ padding: '8px 0', borderBottom: i !== payload.data.leads.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className="ai-card-value highlight" style={{ textTransform: 'none', fontSize: '15px' }}>{lead.name}</span>
                                <span className="ai-card-label" style={{ fontSize: '12px' }}>{lead.location}</span>
                            </div>
                            <span className="ai-card-badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>{lead.match} Match</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {payload?.type === "seed_adjusted" && (
            <div className="ai-card-section">
                <div className="ai-card-badge success" style={{width: 'fit-content'}}>Seed {payload.data.action}</div>
                <div className="ai-card-box">
                    <div className="ai-card-row">
                        <span className="ai-card-label">Region</span>
                        <span className="ai-card-value">{payload.data.region}</span>
                    </div>
                    {payload.data.keywords && payload.data.keywords.length > 0 && (
                        <div className="ai-card-row">
                            <span className="ai-card-label">Keywords</span>
                            <span className="ai-card-value highlight" style={{textTransform: 'none'}}>{payload.data.keywords.join(", ")}</span>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
