import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { markdownToHtml } from "../lib/format.js";
import { apiUrl } from "../lib/api.js";
import ZyphorLogo from "./ZyphorLogo.jsx";
import ZyphorLoader from "./ZyphorLoader.jsx";

/* ── Brand ─────────────────────────────────────────────────────────── */
export function Mark({ size = 30 }) {
  return <ZyphorLogo size={size} showName={false} className="mark" />;
}

export function Brand({ sub, style }) {
  return (
    <div className="brand" style={style}>
      <Mark />
      <span className="wordmark">Zyphor{sub && <span className="sub">{sub}</span>}</span>
    </div>
  );
}

/** Credit line shown on every screen. */
export const Credit = ({ style }) => <div className="credit" style={style}>Zyphor assessment platform</div>;

/** The organization's own logo and name when its branding add-on is on, else the Zyphor mark. */
export function OrgBrand({ branding, sub, style }) {
  if (!branding) return <Brand sub={sub} style={style} />;
  return (
    <div className="brand" style={style}>
      {branding.logo
        ? <img src={apiUrl(branding.logo)} alt="" style={{ height: 34, maxWidth: 120, objectFit: "contain", borderRadius: 6 }} />
        : <Mark />}
      <span className="wordmark" style={branding.color ? { color: branding.color } : undefined}>
        {branding.name}{sub && <span className="sub">{sub}</span>}
      </span>
    </div>
  );
}

/* ── Small primitives ──────────────────────────────────────────────── */
export const Spinner = ({ lg }) => <span className={"spinner" + (lg ? " lg" : "")} aria-hidden="true" />;

export const Loading = ({ label = "Loading…" }) => <ZyphorLoader message={label} />;

export const Badge = ({ color = "", dot = false, children, ...rest }) => (
  <span className={`badge ${color}${dot ? " dot" : ""}`} {...rest}>{children}</span>
);

export const Empty = ({ title, hint }) => (
  <div className="card empty">
    <span className="big">{title}</span>
    {hint && <span className="small">{hint}</span>}
  </div>
);

export const Progress = ({ value, max, color = "", label }) => (
  <div className={`progress ${color}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max || 100} aria-label={label}>
    <span style={{ width: `${max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%` }} />
  </div>
);

export const Markdown = ({ children, className = "md", style }) => (
  <div className={className} style={style}
       dangerouslySetInnerHTML={{ __html: markdownToHtml(children) }} />
);

export function Field({ label, hint, children, error, style, htmlFor, id }) {
  const fieldId = useId();
  const inputId = id || fieldId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field" style={style}>
      {label && <label htmlFor={inputId}>{label}</label>}
      {React.isValidElement(children) ? React.cloneElement(children, {
        id: inputId,
        "aria-describedby": describedBy,
        "aria-invalid": !!error,
      }) : children}
      {hint && <div id={hintId} className="hint">{hint}</div>}
      {error && <div id={errorId} className="hint" style={{ color: "var(--danger)" }} role="alert">{error}</div>}
    </div>
  );
}

/* ── Skeleton Loader ───────────────────────────────────────────────── */
export function Skeleton({ variant = "text", width, height, count = 1 }) {
  const items = Array.from({ length: count }, (_, i) => (
    <div key={i} className={`skeleton skeleton-${variant}`} style={{ width, height }} aria-hidden="true" />
  ));
  return <div className="skeleton-group" style={{ display: "flex", flexDirection: "column", gap: 8 }}>{items}</div>;
}

/* ── Toasts ────────────────────────────────────────────────────────── */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = "info", ms = 3500) => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, message, type }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), ms);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div id="toasts" aria-live="polite" aria-atomic="false" role="region" aria-label="Notifications">
          {items.map((t) => (
            <div key={t.id} className={"toast " + t.type} role="alert" aria-live="assertive">
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

/* ── Modal ─────────────────────────────────────────────────────────── */
export function Modal({ title, children, actions, onClose, wide, narrow, closable = true, size }) {
  const backdrop = useRef(null);
  const dialog = useRef(null);
  const titleId = useId();
  const previousActive = useRef(null);

  useEffect(() => {
    previousActive.current = document.activeElement;
    dialog.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (previousActive.current?.isConnected) previousActive.current.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== dialog.current) return;
      if (e.key === "Escape" && closable) { e.preventDefault(); onClose?.(); }
      if (e.key !== "Tab") return;
      const nodes = [...dialog.current.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')]
        .filter(n => !n.disabled && n.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { e.preventDefault(); dialog.current.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, closable]);

  const sizeClass = size ? ` modal-${size}` : wide ? " modal-wide" : narrow ? " modal-narrow" : "";

  return createPortal(
    <div
      className="modal-backdrop"
      ref={backdrop}
      onMouseDown={(e) => { if (closable && e.target === backdrop.current) onClose?.(); }}
    >
      <div ref={dialog} tabIndex={-1} className={`modal${sizeClass}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          {closable && (
            <button className="btn ghost sm" onClick={onClose} aria-label="Close dialog">✕</button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-foot">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}

/** Async-aware footer button: disables itself while its handler runs. */
export function ModalButton({ onClick, cls = "", children, disabled }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={"btn " + cls}
      disabled={busy || disabled}
      onClick={async () => {
        if (!onClick) return;
        setBusy(true);
        try { await onClick(); } finally { setBusy(false); }
      }}
    >
      {busy && <Spinner />} {children}
    </button>
  );
}

/** Promise-based confirm, mounted by ConfirmHost. */
const ConfirmCtx = createContext(() => Promise.resolve(false));
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmHost({ children }) {
  const [req, setReq] = useState(null);
  const ask = useCallback(
    (title, message, okLabel = "Confirm", danger = false) =>
      new Promise((resolve) => setReq({ title, message, okLabel, danger, resolve })),
    []
  );
  const settle = (value) => { req?.resolve(value); setReq(null); };

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      {req && (
        <Modal
          title={req.title}
          narrow
          onClose={() => settle(false)}
          actions={
            <>
              <button className="btn" onClick={() => settle(false)}>Cancel</button>
              <button className={"btn " + (req.danger ? "danger solid" : "primary")}
                      onClick={() => settle(true)}>{req.okLabel}</button>
            </>
          }
        >
          <p>{req.message}</p>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────── */
export function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div className={"tabs " + (className || "")} role="tablist" aria-label="Tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          id={`tab-${tab.id}`}
          className={activeTab === tab.id ? "active" : ""}
          onClick={() => onChange(tab.id)}
          tabIndex={activeTab === tab.id ? 0 : -1}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, activeTab, children }) {
  if (activeTab !== id) return null;
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0}>
      {children}
    </div>
  );
}

/* ── Alert/Banner ──────────────────────────────────────────────────── */
export function Alert({ variant = "info", title, children, onDismiss, dismissible = false }) {
  const icons = {
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    danger: "✕",
  };
  const icon = icons[variant] || icons.info;
  return (
    <div className={`banner ${variant}`} role="alert" aria-live="polite">
      <span className="banner-icon" aria-hidden="true">{icon}</span>
      <div className="banner-content">
        {title && <h3>{title}</h3>}
        <div>{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button className="btn ghost sm" onClick={onDismiss} aria-label="Dismiss">✕</button>
      )}
    </div>
  );
}

/* ── Tooltip ───────────────────────────────────────────────────────── */
export function Tooltip({ content, children, position = "top" }) {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    let top, left;
    switch (position) {
      case "top":
        top = trigger.top - tooltip.height - 8;
        left = trigger.left + trigger.width / 2 - tooltip.width / 2;
        break;
      case "bottom":
        top = trigger.bottom + 8;
        left = trigger.left + trigger.width / 2 - tooltip.width / 2;
        break;
      case "left":
        top = trigger.top + trigger.height / 2 - tooltip.height / 2;
        left = trigger.left - tooltip.width - 8;
        break;
      case "right":
        top = trigger.top + trigger.height / 2 - tooltip.height / 2;
        left = trigger.right + 8;
        break;
    }
    Object.assign(tooltipRef.current.style, { top: `${top}px`, left: `${left}px` });
  }, [visible, position]);

  const child = React.Children.only(children);
  return (
    <>
      {React.cloneElement(child, {
        ref: triggerRef,
        onMouseEnter: () => setVisible(true),
        onMouseLeave: () => setVisible(false),
        onFocus: () => setVisible(true),
        onBlur: () => setVisible(false),
      })}
      {visible && createPortal(
        <div ref={tooltipRef} className={`tooltip tooltip-${position}`} role="tooltip">{content}</div>,
        document.body
      )}
    </>
  );
}

/* ── Dropdown ──────────────────────────────────────────────────────── */
export function Dropdown({ trigger, items, align = "right", onClose }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const close = useCallback(() => { setOpen(false); onClose?.(); }, [onClose]);

  return (
    <div className="dropdown" ref={ref}>
      {React.cloneElement(trigger, {
        onClick: (e) => { e.stopPropagation(); setOpen(!open); },
        "aria-expanded": open,
        "aria-haspopup": "menu",
      })}
      {open && createPortal(
        <div className={`dropdown-menu ${align === "right" ? "dropdown-menu-right" : ""}`} role="menu">
          {items.map((item, i) => (
            <button
              key={item.id || i}
              role="menuitem"
              className="dropdown-item"
              onClick={() => { item.onClick?.(); close(); }}
              disabled={item.disabled}
            >
              {item.icon && <span className="dropdown-icon">{item.icon}</span>}
              {item.label}
              {item.shortcut && <span className="dropdown-shortcut">{item.shortcut}</span>}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Avatar ────────────────────────────────────────────────────────── */
export function Avatar({ src, name, size = 32 }) {
  const initials = name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

/* ── Table ─────────────────────────────────────────────────────────── */
export function Table({ columns, data, keyField = "id", onRowClick, sortBy, sortDir, onSort, emptyMessage = "No data", className }) {
  return (
    <div className={`table-wrap ${className || ""}`}>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className} style={col.width ? { width: col.width } : undefined}>
                {col.sortable && onSort ? (
                  <button className="th-sort" onClick={() => onSort(col.key)} style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    {col.header}
                    {sortBy === col.key && (sortDir === "asc" ? " ▲" : " ▼")}
                  </button>
                ) : col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="empty"><span className="big">{emptyMessage}</span></td></tr>
          ) : (
            data.map((row) => (
              <tr key={row[keyField]} onClick={() => onRowClick?.(row)} style={onRowClick ? { cursor: "pointer" } : undefined}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Pagination ────────────────────────────────────────────────────── */
export function Pagination({ page, pageCount, total, onPageChange, showSizeChanger, pageSize, onPageSizeChange }) {
  if (pageCount <= 1 && !showSizeChanger) return null;
  return (
    <div className="pagination row between" style={{ marginTop: 12, flexWrap: "wrap" }}>
      <span className="muted small">{total} items</span>
      <div className="row tight">
        <button className="btn sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹ Prev</button>
        <span className="small" style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>Page {page} of {Math.max(1, pageCount)}</span>
        <button className="btn sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Next ›</button>
        {showSizeChanger && (
          <select className="btn sm" value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} style={{ padding: "5px 10px", minWidth: "auto" }}>
            {[10, 25, 50, 100].map((s) => <option key={s} value={s}>{s} per page</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

/* ── Theme ─────────────────────────────────────────────────────────── */
export function ThemeToggle({ className = "btn ghost sm" }) {
  const toggle = () => {
    const current = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("zyphor_theme", next); } catch { /* ignore */ }
  };
  const current = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  return (
    <button className={className} onClick={toggle} title="Toggle dark mode" aria-label={`Switch to ${current === "dark" ? "light" : "dark"} mode`} aria-pressed={current === "dark"}>
      {current === "dark" ? "☀" : "🌙"}
    </button>
  );
}

/* ── Skip Link ─────────────────────────────────────────────────────── */
export const SkipLink = () => <a href="#main-content" className="skip-link">Skip to main content</a>;