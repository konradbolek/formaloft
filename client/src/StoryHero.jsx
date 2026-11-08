import { Embers } from "./Embers.jsx";
import { Ribbon } from "./Ribbon.jsx";

export function StoryHero({ kicker, title, lede }) {
  return (
    <>
      <header className="story-hero">
        <Embers />
        <div className="story-hero-copy">
          <p className="section-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="lede">{lede}</p>
        </div>
      </header>
      <Ribbon />
    </>
  );
}
