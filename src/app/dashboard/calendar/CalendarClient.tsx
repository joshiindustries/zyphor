"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Shield, Lock, Trash2, X } from "lucide-react";
import { deriveKey, encryptTextWithAES, decryptTextWithAES } from "@/lib/crypto";

export function CalendarClient({ sessionUser }: { sessionUser: any }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  
  // Vault State
  const [masterPassword, setMasterPassword] = useState("");
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAddingEvent, setIsAddingEvent] = useState<Date | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    const pwd = sessionStorage.getItem("zyphor_vault_pwd");
    if (pwd) {
      setMasterPassword(pwd);
    }
  }, []);

  useEffect(() => {
    if (masterKey) {
      loadData(masterKey);
    }
  }, [currentDate.getMonth(), masterKey]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const saltRes = await fetch("/api/vault/salt");
      const saltData = await saltRes.json();
      if (!saltData.success) throw new Error("Vault not initialized.");

      const key = await deriveKey(masterPassword, saltData.salt);
      
      const validationRes = await fetch("/api/vault/verify");
      const validationData = await validationRes.json();
      
      try {
        await decryptTextWithAES(key, validationData.encrypted_validation);
      } catch (err) {
        throw new Error("Incorrect master password.");
      }

      setMasterKey(key);
      sessionStorage.setItem("zyphor_vault_pwd", masterPassword);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (key: CryptoKey) => {
    // 1. Fetch calendars
    const calRes = await fetch("/api/calendars");
    const calData = await calRes.json();
    let defaultCalendar = null;
    let loadedCalendars = [];
    
    if (calData.success && calData.calendars.length > 0) {
      loadedCalendars = calData.calendars;
      defaultCalendar = calData.calendars[0];
    } else {
      // Create default calendar securely
      const encryptedName = await encryptTextWithAES(key, "My Calendar");
      const createRes = await fetch("/api/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted_name: encryptedName, color_hex: "#e74c3c" })
      });
      const createData = await createRes.json();
      loadedCalendars = [createData.calendar];
      defaultCalendar = createData.calendar;
    }
    
    setCalendars(loadedCalendars);

    // Fetch events for current month
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
    const eventsRes = await fetch(`/api/calendars/events?start=${start}&end=${end}`);
    const eventsData = await eventsRes.json();

    if (eventsData.success) {
      const decryptedEvents = [];
      for (const e of eventsData.events) {
        try {
          e.title = await decryptTextWithAES(key, e.encrypted_title);
          if (e.encrypted_description) {
            e.description = await decryptTextWithAES(key, e.encrypted_description);
          }
        } catch {
          e.title = "Failed to decrypt";
        }
        decryptedEvents.push(e);
      }
      setEvents(decryptedEvents);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calendars.length || !masterKey || !isAddingEvent || !newEventTitle.trim()) return;
    
    setLoading(true);
    try {
      const encryptedTitle = await encryptTextWithAES(masterKey, newEventTitle);
      const encryptedDesc = newEventDesc.trim() ? await encryptTextWithAES(masterKey, newEventDesc) : null;
      
      const eventDate = new Date(isAddingEvent.getFullYear(), isAddingEvent.getMonth(), isAddingEvent.getDate(), 12, 0);

      const res = await fetch("/api/calendars/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendar_id: calendars[0].id,
          encrypted_title: encryptedTitle,
          encrypted_description: encryptedDesc,
          start_time: eventDate.toISOString(),
          end_time: new Date(eventDate.getTime() + 60*60*1000).toISOString(),
          is_all_day: false
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Optimistic append, but need to decrypt title for local display
        data.event.title = newEventTitle;
        data.event.description = newEventDesc;
        setEvents([...events, data.event]);
        
        setIsAddingEvent(null);
        setNewEventTitle("");
        setNewEventDesc("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await fetch(`/api/calendars/events?id=${eventId}`, { method: "DELETE" });
      setEvents(events.filter(e => e.id !== eventId));
      setSelectedEvent(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (!masterKey) {
    return (
      <div style={{ padding: "4rem 2rem", maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)" }}>
          <Lock size={48} color="var(--accent-blue)" style={{ margin: "0 auto 1.5rem" }} />
          <h1 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>Unlock Calendar</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.95rem" }}>
            Your schedule is End-to-End Encrypted. Enter your Master Vault Password to unlock it.
          </p>
          <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input 
              type="password" 
              placeholder="Master Password" 
              value={masterPassword} 
              onChange={e => setMasterPassword(e.target.value)}
              className="input-field" 
              required
            />
            {error && <div style={{ color: "var(--accent-red)", fontSize: "0.9rem" }}>{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: "0.75rem" }}>
              {loading ? "Decrypting..." : "Unlock Calendar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-main)", position: "relative" }}>
      {/* Header */}
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>Zyphor Calendar</h1>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-green)", background: "rgba(46,204,113,0.1)", padding: "0.25rem 0.5rem", borderRadius: "10px" }}>
            <Shield size={14} /> <span style={{ fontSize: "0.75rem", fontWeight: "600" }}>E2EE Active</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn btn-secondary" style={{ padding: "0.5rem", border: "1px solid var(--glass-border)", background: "transparent", cursor: "pointer" }} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", width: "150px", textAlign: "center", margin: 0 }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button className="btn btn-secondary" style={{ padding: "0.5rem", border: "1px solid var(--glass-border)", background: "transparent", cursor: "pointer" }} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
            <ChevronRight size={20} />
          </button>
        </div>

        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: "2rem" }}>
        {/* Calendar Grid */}
        <div style={{ flex: 1, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} style={{ padding: "1rem", textAlign: "center", fontWeight: "600", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                {day}
              </div>
            ))}
          </div>

          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "1fr" }}>
            {paddingDays.map(i => (
              <div key={`pad-${i}`} style={{ borderRight: "1px solid var(--glass-border)", borderBottom: "1px solid var(--glass-border)", opacity: 0.3 }} />
            ))}
            
            {days.map(day => {
              const dayEvents = events.filter(e => {
                const eDate = new Date(e.start_time);
                return eDate.getDate() === day && eDate.getMonth() === currentDate.getMonth() && eDate.getFullYear() === currentDate.getFullYear();
              });

              return (
                <div 
                  key={day} 
                  onClick={() => setIsAddingEvent(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))} 
                  style={{ padding: "0.5rem", borderRight: "1px solid var(--glass-border)", borderBottom: "1px solid var(--glass-border)", position: "relative", cursor: "pointer", overflow: "hidden" }} 
                  className="hover:bg-[rgba(255,255,255,0.05)]"
                >
                  <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "600" }}>{day}</span>
                  <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {dayEvents.map(e => (
                      <div 
                        key={e.id} 
                        onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); }}
                        style={{ background: "rgba(231,76,60,0.2)", border: "1px solid rgba(231,76,60,0.5)", color: "#fff", padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                        className="hover:bg-red-500 hover:border-red-600 transition-colors"
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {isAddingEvent && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-main)", padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", width: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem" }}>
              Add Event to {monthNames[isAddingEvent.getMonth()]} {isAddingEvent.getDate()}
            </h2>
            <form onSubmit={handleCreateEvent} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="text" placeholder="Event Title" className="input-field" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} required autoFocus />
              <textarea placeholder="Description (Optional)" className="input-field" value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} rows={3} />
              
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddingEvent(null)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>{loading ? "Encrypting..." : "Save Event"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(4px)" }} onClick={() => setSelectedEvent(null)}>
          <div style={{ background: "var(--bg-main)", padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", width: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", wordBreak: "break-word" }}>{selectedEvent.title}</h2>
              <button onClick={() => setSelectedEvent(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            
            {selectedEvent.description && (
              <div style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {selectedEvent.description}
              </div>
            )}
            
            <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => handleDeleteEvent(selectedEvent.id)} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-red)", borderColor: "var(--accent-red)" }}>
                <Trash2 size={16} /> Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
