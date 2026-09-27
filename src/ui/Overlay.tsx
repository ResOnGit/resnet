import type { CSSProperties } from "react";
import { levelAt } from "../content/levels";
import { useBrowse } from "../experience/browse";

export function Overlay() {
  const { focus, story, slide } = useBrowse();
  const level = focus >= 0 ? levelAt(focus) : null;
  const telling = story >= 0 && level;

  return (
    <div className="overlay" data-phase="black">
      <div className="flicker" data-intro="flicker" />
      <div className="intro-center">
        <h1 className="resnet-word" data-intro="word">
          RESNET
        </h1>
        <p className="resnet-meta" data-intro="meta">
          000
        </p>
      </div>
      <aside className="narrative" data-mode={telling ? "story" : level ? "level" : "home"}>
        <div className="narrative-home">
          <p className="narrative-hello" data-intro="line1">
            HELLO THERE.
          </p>
          <p className="narrative-prompt" data-intro="line2">
            Anything you would like to know?
          </p>
          <p className="narrative-hint">SCROLL TO DESCEND</p>
        </div>
        {level && !telling && (
          <div className="narrative-level" key={`glance-${focus}`}>
            <p className="narrative-index">SECTION {level.number}</p>
            <p className="narrative-title">{level.title}</p>
            <p className="narrative-copy">{level.slides[0]?.line}</p>
          </div>
        )}
        {telling && (
          <div className="narrative-story" key={`story-${story}`}>
            <p className="narrative-index">SECTION {level.number}</p>
            <StoryReel lines={level.slides.map((item) => item.line)} slide={slide} />
          </div>
        )}
      </aside>
    </div>
  );
}

function StoryReel({ lines, slide }: { lines: string[]; slide: number }) {
  return (
    <div className="story-window">
      <ol className="story-slides" style={{ "--slide": slide } as CSSProperties}>
        {lines.map((line, index) => (
          <li key={line} data-current={index === slide ? "true" : "false"}>
            <p className="story-line">{line}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
