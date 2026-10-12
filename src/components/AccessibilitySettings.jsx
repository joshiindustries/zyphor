import { useEffect, useState } from "react";
import { store } from "../lib/api.js";

export default function AccessibilitySettings() {
  const [size, setSize] = useState(() => Number(store.get("zyphor_text_size")) || 100);
  const [contrast, setContrast] = useState(() => store.get("zyphor_high_contrast") === "true");
  useEffect(() => {
    const safe = [100, 115, 130, 150].includes(size) ? size : 100;
    document.body.style.zoom = safe / 100;
    store.set("zyphor_text_size", String(safe));
  }, [size]);
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", contrast);
    store.set("zyphor_high_contrast", String(contrast));
  }, [contrast]);
  return <details className="accessibility-settings">
    <summary aria-label="Accessibility settings">Aa</summary>
    <div className="card pad-sm">
      <label htmlFor="text-size">Text size</label>
      <select id="text-size" value={size} onChange={e => setSize(Number(e.target.value))}>
        {[100, 115, 130, 150].map(s => <option key={s} value={s}>{s}%</option>)}
      </select>
      <label><input type="checkbox" checked={contrast} onChange={e => setContrast(e.target.checked)} /> High contrast</label>
    </div>
  </details>;
}
