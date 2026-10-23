import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";

const bg = "#070A14";
const blue = "#54B9FF";
const violet = "#9670FF";
const white = "#F7F8FF";
const muted = "#A4AEC8";
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const Fade: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const f = useCurrentFrame() - delay;
  const opacity = interpolate(f, [0, 14], [0, 1], clamp);
  const y = interpolate(f, [0, 18], [24, 0], clamp);
  return <div style={{ opacity, transform: `translateY(${y}px)` }}>{children}</div>;
};

const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const glow = .18 + Math.sin(f / 18) * .04;
  return <AbsoluteFill style={{ overflow: "hidden", background: bg }}>
    <div style={{ position: "absolute", width: "120%", height: "55%", left: "-30%", top: "-10%", borderRadius: "50%", filter: "blur(90px)", background: `rgba(92,83,255,${glow})` }} />
    <div style={{ position: "absolute", width: "90%", height: "55%", right: "-30%", bottom: "0", borderRadius: "50%", filter: "blur(95px)", background: "rgba(55,180,255,.16)" }} />
    <div style={{ position: "absolute", inset: 0, opacity: .12, backgroundImage: "linear-gradient(rgba(150,170,255,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(150,170,255,.18) 1px,transparent 1px)", backgroundSize: "54px 54px" }} />
  </AbsoluteFill>;
};

const Mark: React.FC<{ size?: number }> = ({ size = 72 }) => <div style={{ width: size, height: size, display: "grid", placeItems: "center", borderRadius: size * .27, background: "linear-gradient(140deg,#9D7BFF,#4ABEFF)", color: bg, fontSize: size * .52, fontWeight: 950 }}>A</div>;
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ color: blue, fontSize: 18, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase" }}>{children}</div>;
const Head: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 76 }) => <div style={{ color: white, fontSize: size, lineHeight: 1.04, fontWeight: 850, letterSpacing: -3 }}>{children}</div>;

const Hook = () => <AbsoluteFill style={{ padding: "150px 70px", justifyContent: "center", gap: 30 }}>
  <Fade><Label>Ideas deserve better</Label></Fade>
  <Fade delay={7}><Head size={100}>Build<br />something<br /><span style={{ color: blue }}>bigger.</span></Head></Fade>
  <Fade delay={17}><div style={{ color: muted, fontSize: 26 }}>Your vision. Engineered for what’s next.</div></Fade>
</AbsoluteFill>;

const Reveal = () => <AbsoluteFill style={{ padding: "125px 54px", justifyContent: "center", gap: 35 }}>
  <Fade><div style={{ display: "flex", alignItems: "center", gap: 18 }}><Mark size={68} /><div><div style={{ fontSize: 43, fontWeight: 900, color: white }}>AXIOM LABS</div><div style={{ fontSize: 16, color: muted, letterSpacing: 3 }}>ENGINEER WHAT’S NEXT</div></div></div></Fade>
  <Fade delay={8}><Head size={73}>Technology<br />with a<br /><span style={{ color: blue }}>bigger vision.</span></Head></Fade>
  <Fade delay={18}><div style={{ padding: 24, borderRadius: 26, border: "1px solid rgba(159,180,255,.22)", background: "rgba(18,25,47,.9)" }}>
    <div style={{ color: muted, fontSize: 14, marginBottom: 22 }}>axiom / digital systems</div>
    <div style={{ height: 125, borderRadius: 18, background: "linear-gradient(120deg,rgba(116,96,255,.28),rgba(60,190,255,.16))", display: "grid", placeItems: "center", fontSize: 25, fontWeight: 800 }}>Ideas → Systems → Impact</div>
    <div style={{ display: "flex", gap: 12, marginTop: 18 }}>{["BUILD","SECURE","SCALE"].map(x => <div key={x} style={{ flex: 1, textAlign: "center", padding: 14, borderRadius: 12, background: "rgba(255,255,255,.05)", color: blue, fontSize: 14, fontWeight: 850 }}>{x}</div>)}</div>
  </div></Fade>
</AbsoluteFill>;

const Feature: React.FC<{ icon: string; title: string; detail: string; delay: number }> = ({ icon, title, detail, delay }) => <Fade delay={delay}><div style={{ display: "flex", alignItems: "center", gap: 22, padding: "25px 23px", borderRadius: 24, border: "1px solid rgba(159,180,255,.19)", background: "rgba(18,25,47,.84)" }}><div style={{ width: 62, height: 62, borderRadius: 18, display: "grid", placeItems: "center", fontSize: 29, background: "rgba(89,160,255,.12)" }}>{icon}</div><div><div style={{ fontSize: 27, fontWeight: 850, color: white }}>{title}</div><div style={{ fontSize: 18, color: muted, marginTop: 7 }}>{detail}</div></div></div></Fade>;

const Highlights = () => <AbsoluteFill style={{ padding: "105px 44px", justifyContent: "center", gap: 23 }}>
  <Fade><Label>Built for what’s next</Label></Fade>
  <Fade delay={5}><Head size={70}>Smart ideas.<br /><span style={{ color: blue }}>Serious systems.</span></Head></Fade>
  <div style={{ height: 8 }} />
  <Feature icon="◈" title="Multi-tenant SaaS" detail="Architectures designed to scale" delay={12} />
  <Feature icon="⛨" title="Cybersecurity" detail="Security-conscious engineering" delay={22} />
  <Feature icon="✳" title="AI Engineering" detail="Human expertise meets AI workflows" delay={32} />
  <Fade delay={44}><div style={{ fontSize: 18, color: muted }}>Software • Cloud • Digital experiences</div></Fade>
</AbsoluteFill>;

const Outro = () => <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 55, textAlign: "center", gap: 27 }}>
  <Fade><Mark size={92} /></Fade>
  <Fade delay={7}><div style={{ fontSize: 49, fontWeight: 950, color: white }}>AXIOM LABS</div></Fade>
  <Fade delay={13}><Head size={57}>Your next idea<br />starts here.</Head></Fade>
  <Fade delay={24}><div style={{ padding: "17px 25px", borderRadius: 16, background: "linear-gradient(100deg,#8C70FF,#47BFFF)", color: "#080C18", fontWeight: 900, fontSize: 20 }}>EXPLORE THE PROJECT ↗</div></Fade>
  <Fade delay={33}><div style={{ fontSize: 16, color: muted, overflowWrap: "anywhere" }}>github.com/ahsanibnewalid/my-Company-website</div></Fade>
</AbsoluteFill>;

export const AxiomLabsLaunch: React.FC = () => <AbsoluteFill style={{ color: white, fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>
  <Backdrop />
  <Sequence from={0} durationInFrames={90}><Hook /></Sequence>
  <Sequence from={90} durationInFrames={120}><Reveal /></Sequence>
  <Sequence from={210} durationInFrames={210}><Highlights /></Sequence>
  <Sequence from={420} durationInFrames={180}><Outro /></Sequence>
  <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 35px 27px", pointerEvents: "none" }}>
    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(200,213,255,.55)", fontSize: 13, letterSpacing: 2 }}><span>AXIOM LABS</span><span>IDEAS INTO IMPACT</span></div>
  </AbsoluteFill>
</AbsoluteFill>;
