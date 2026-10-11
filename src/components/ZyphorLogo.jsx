export default function ZyphorLogo({ size = 64, showName = true, className = "" }) {
  return (
    <div className={`zyphor-brand ${className}`} style={{ "--logo-size": `${size}px` }}>
      <img src={`${import.meta.env.BASE_URL}zyphor.png`} alt={showName ? "" : "Zyphor"}
        className="zyphor-brand__image" />
      {showName && <span className="zyphor-brand__name">Zyphor</span>}
    </div>
  );
}
