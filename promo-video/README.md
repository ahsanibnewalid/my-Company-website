# Axiom Labs Launch Video

A 20-second, vertical 9:16 launch teaser for the Axiom Labs project.

## Render locally or in GitHub Codespaces

From the repository root:

```bash
cd promo-video
npm install
npm run render
```

The output is `promo-video/out/axiom-labs-launch.mp4` (1080 × 1920, 30 fps, H.264).

To preview/edit the composition:

```bash
npm run preview
```

## GitHub Actions render

The workflow at `.github/workflows/render-launch-video.yml` runs on pushes to the launch-video branch and can also be started manually from the Actions tab using **Render Axiom Labs Launch Video**. Download the `axiom-labs-launch-video` artifact from the completed workflow run.

This is a motion-graphics teaser with generated CSS visuals; it does not use live screenshots of the website. Verify product claims and replace mock UI with actual product captures before public launch.
