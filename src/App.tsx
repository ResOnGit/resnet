import { useEffect } from "react";
import { bindBrowseInput } from "./experience/browse";
import { startIntro } from "./experience/intro";
import { bindPointer } from "./experience/pointer";
import { Scene } from "./scene/Scene";
import { Cursor } from "./ui/Cursor";
import { Overlay } from "./ui/Overlay";

export function App() {
  useEffect(() => startIntro(), []);
  useEffect(() => bindBrowseInput(), []);
  useEffect(() => bindPointer(), []);

  return (
    <>
      <Scene />
      <Overlay />
      <Cursor />
    </>
  );
}
