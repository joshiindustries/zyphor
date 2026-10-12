import { useEffect, useState } from "react";
import { store } from "./api.js";

const key = "zyphor_low_bandwidth";
const changed = "zyphor-network-preference";
export function lowBandwidthEnabled() { return store.get(key) === "true"; }
export function setLowBandwidth(enabled) {
  store.set(key, String(enabled));
  window.dispatchEvent(new Event(changed));
}
export function useLowBandwidth() {
  const [enabled, setEnabled] = useState(lowBandwidthEnabled);
  useEffect(() => {
    const sync = () => setEnabled(lowBandwidthEnabled());
    window.addEventListener(changed, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(changed, sync); window.removeEventListener("storage", sync); };
  }, []);
  return enabled;
}
