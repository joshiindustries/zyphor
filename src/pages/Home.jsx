import { Link } from "react-router-dom";
import { Mark } from "../components/ui.jsx";

const features = [
  ["01", "Secure assessments", "Timed attempts, randomized papers, session controls, and server-side submission rules."],
  ["02", "Flexible question banks", "Build MCQ and coding exams, or import question sets from common document formats."],
  ["03", "Live oversight", "Track exam progress and review session activity from the staff console."],
  ["04", "Clear results", "Review submissions, scoring, participant progress, and downloadable reports."],
];

export default function Home() {
  return <main className="zy-home">
    <header className="zy-nav">
      <Link className="zy-brand" to="/" aria-label="Zyphor home"><Mark size={38} /><span>Zyphor</span></Link>
      <nav aria-label="Main navigation"><a href="#platform">Platform</a><a href="#features">Features</a><Link className="zy-login" to="/login">Sign in <span aria-hidden="true">↗</span></Link></nav>
    </header>
    <section className="zy-hero" id="platform">
      <div className="zy-hero-copy">
        <div className="zy-eyebrow"><i /> EXAMINATION, WITHOUT THE FRICTION</div>
        <h1>Assess what matters.<br /><em>With confidence.</em></h1>
        <p>Zyphor brings secure online examinations, live coding assessments, participant management, and clear results together in one dependable platform.</p>
        <div className="zy-actions"><Link className="zy-primary" to="/login">Enter your workspace <span aria-hidden="true">→</span></Link><a className="zy-secondary" href="#features">Explore the platform <span aria-hidden="true">↓</span></a></div>
        <div className="zy-proof"><span className="zy-proof-icon">✓</span><span>Purpose-built for focused, fair assessments</span></div>
      </div>
      <div className="zy-visual" aria-label="Assessment workflow illustration">
        <div className="zy-orbit zy-orbit-one" /><div className="zy-orbit zy-orbit-two" />
        <div className="zy-card zy-card-main"><div className="zy-card-top"><span>ASSESSMENT SESSION</span><b><i /> LIVE</b></div><div className="zy-session-title">Foundations of<br />problem solving</div><div className="zy-session-meta"><span>Question 08 of 24</span><span>32:18 remaining</span></div><div className="zy-progress"><i /></div><div className="zy-answer"><b>A</b><span>Break down the problem</span><strong>✓</strong></div><div className="zy-answer zy-answer-muted"><b>B</b><span>Start with the final output</span></div><div className="zy-card-foot"><span>Autosaved just now</span><span>●●●●●●●○○○○○○○○○○</span></div></div>
        <div className="zy-float zy-float-a"><span className="zy-float-icon">↗</span><span><b>Progress synced</b><small>Responses are up to date</small></span></div>
        <div className="zy-float zy-float-b"><span className="zy-float-icon">◎</span><span><b>One clear view</b><small>Attempts · scores · insights</small></span></div>
        <div className="zy-spark zy-spark-a">✳</div><div className="zy-spark zy-spark-b">✦</div>
      </div>
      <div className="zy-hero-bottom"><span>BUILT FOR BETTER ASSESSMENT</span><div><span>SECURE BY DESIGN</span><i /><span>READY FOR REAL EXAMS</span><i /><span>MADE FOR EVERY SCREEN</span></div></div>
    </section>
    <section className="zy-features" id="features"><div className="zy-section-head"><div><div className="zy-eyebrow">THE PLATFORM</div><h2>Everything you need to<br />run a better exam.</h2></div><p>From the first question to the final report, keep every part of the assessment experience connected.</p></div>
      <div className="zy-feature-grid">{features.map(([n, title, body]) => <article className="zy-feature" key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p><i aria-hidden="true">↗</i></article>)}</div>
    </section>
    <section className="zy-cta"><div><div className="zy-eyebrow">YOUR NEXT ASSESSMENT STARTS HERE</div><h2>Make every assessment count.</h2></div><Link className="zy-primary" to="/login">Sign in to Zyphor <span aria-hidden="true">→</span></Link></section>
    <footer className="zy-footer"><Link className="zy-brand" to="/"><Mark size={30} /><span>Zyphor</span></Link><span>Secure assessments. Clear outcomes.</span><span>© {new Date().getFullYear()} Zyphor</span></footer>
  </main>;
}
