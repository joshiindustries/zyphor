"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Shield } from "lucide-react";
import { generateAESKey, encryptTextWithAES, decryptTextWithAES } from "@/lib/crypto";

export function CalendarClient({ sessionUser }: { sessionUser: any }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    const init = async () => {
      // 1. Fetch calendars
      const calRes = await fetch("/api/calendars");
      const calData = await calRes.json();
      let defaultCalendar = null;
      if (calData.success && calData.calendars.length > 0) {
        setCalendars(calData.calendars);
        defaultCalendar = calData.calendars[0];
      } else {
        // Create default calendar
        const createRes = await fetch("/api/calendars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "My Calendar", color: "#e74c3c" })
        });
        const createData = await createRes.json();
        setCalendars([createData.calendar]);
        defaultCalendar = createData.calendar;
      }

      // Generate a temporary session AES key for demo E2EE
      const key = await generateAESKey();
      setAesKey(key);

      // Fetch events for current month
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
      const eventsRes = await fetch(`/api/calendars/events?start=${start}&end=${end}`);
      const eventsData = await eventsRes.json();

      if (eventsData.success) {
        setEvents(eventsData.events);
      }
    };
    init();
  }, [currentDate.getMonth()]);

  const handleCreateEvent = async (day: number) => {
    if (!calendars.length || !aesKey) return;
    
    const title = prompt("Enter event title:");
    if (!title) return;

    const encryptedTitle = await encryptTextWithAES(aesKey, title);
    const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0);

    const res = await fetch("/api/calendars/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calendar_id: calendars[0].id,
        encrypted_title: encryptedTitle,
        start_time: eventDate.toISOString(),
        end_time: new Date(eventDate.getTime() + 60*60*1000).toISOString(),
        is_all_day: false
      })
    });

    if (res.ok) {
      const data = await res.json();
      setEvents([...events, data.event]);
    }
  };

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-main)" }}>
      {/* Header */}
      <header style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", background: "var(--glass-bg)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>Zyphor Calendar</h1>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#e74c3c", background: "rgba(231,76,60,0.1)", padding: "0.25rem 0.5rem", borderRadius: "10px" }}>
            <Shield size={14} /> <span style={{ fontSize: "0.75rem", fontWeight: "600" }}>End-to-End Encrypted</span>
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
                <div key={day} onClick={() => handleCreateEvent(day)} style={{ padding: "0.5rem", borderRight: "1px solid var(--glass-border)", borderBottom: "1px solid var(--glass-border)", position: "relative", cursor: "pointer" }} className="hover:bg-[rgba(255,255,255,0.05)]">
                  <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "600" }}>{day}</span>
                  <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {dayEvents.map(e => (
                      <div key={e.id} style={{ background: "rgba(231,76,60,0.2)", border: "1px solid rgba(231,76,60,0.5)", color: "#fff", padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Encrypted Event
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
