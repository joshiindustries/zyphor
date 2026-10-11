import ZyphorLogo from "./ZyphorLogo.jsx";
import "../styles.css";

export default function ZyphorLoader({ message = "Loading your workspace…" }) {
  return (
    <div className="zyphor-loader" role="status" aria-live="polite">
      <div className="zyphor-loader__mark">
        <div className="zyphor-loader__ring" />
        <ZyphorLogo size={82} showName={false} />
      </div>
      <p className="zyphor-loader__message">{message}</p>
      <div className="zyphor-loader__track"><div className="zyphor-loader__bar" /></div>
    </div>
  );
}
