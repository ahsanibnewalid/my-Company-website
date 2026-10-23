import React from "react";
import { AbsoluteFill, Composition, registerRoot } from "remotion";
import { AxiomLabsLaunch } from "./Video";

const Root: React.FC = () => (
  <AbsoluteFill>
    <Composition
      id="AxiomLabsLaunch"
      component={AxiomLabsLaunch}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
    />
  </AbsoluteFill>
);

registerRoot(Root);
