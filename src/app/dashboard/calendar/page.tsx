"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Shield } from "lucide-react";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper to get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
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
          <button className="btn btn-secondary" style={{ padding: "0.5rem", border: "1px solid var(--glass-border)", background: "transparent", cursor: "pointer" }} onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", width: "150px", textAlign: "center", margin: 0 }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button className="btn btn-secondary" style={{ padding: "0.5rem", border: "1px solid var(--glass-border)", background: "transparent", cursor: "pointer" }} onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>

        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: "260px", borderRight: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", padding: "2rem 1rem" }}>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "2rem", background: "#e74c3c", width: "100%" }}>
            <Plus size={16} /> Create Event
          </button>

          <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px", marginBottom: "1rem", paddingLeft: "0.5rem" }}>My Calendars</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", cursor: "pointer" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#e74c3c" }} />
              <span style={{ fontSize: "0.95rem" }}>Personal</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", cursor: "pointer" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#3498db" }} />
              <span style={{ fontSize: "0.95rem" }}>Work</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.5rem" }}>
          {/* Days of Week Header */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} style={{ textAlign: "center", fontWeight: "600", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "1fr", gap: "0.5rem", flex: 1 }}>
            {paddingDays.map(i => (
              <div key={`padding-${i}`} style={{ background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", border: "1px solid transparent" }} />
            ))}
            
            {days.map(day => {
              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
              
              return (
                <div key={day} style={{ background: "var(--glass-bg)", borderRadius: "var(--radius-sm)", border: isToday ? "1px solid #e74c3c" : "1px solid var(--glass-border)", padding: "0.5rem", display: "flex", flexDirection: "column", cursor: "pointer", transition: "background 0.2s" }} className="hover:bg-[rgba(255,255,255,0.05)]">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: isToday ? "700" : "500", color: isToday ? "#e74c3c" : "inherit" }}>
                      {day}
                    </span>
                  </div>
                  
                  {/* Placeholder for an event */}
                  {day === 15 && (
                    <div style={{ background: "rgba(231,76,60,0.2)", borderLeft: "3px solid #e74c3c", padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Encrypted Event...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
