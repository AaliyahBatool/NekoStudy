# ADR-014: Ambient Scene Backgrounds as Looping Video

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

NekoStudy rooms use atmospheric backgrounds to create an immersive study environment. The intended experience is similar to an ambient video playing behind floating application panels.

The application does not require interactive 3D environments or real-time 3D rendering.

## Decision

Use regular HTML video elements for ambient scenes.

- Scene backgrounds are looping MP4 videos.
- Videos use H.264 encoding, a maximum resolution of 1920×1080, and 24 or 30 FPS.
- Videos contain no audio and play muted, inline, and on loop.
- Each video has a poster image for loading and fallback states.
- Optional ambient audio is handled independently from the background video.
- Scene metadata and relative asset keys are stored in PostgreSQL.
- The API resolves asset keys into URLs using `ASSET_BASE_URL`.
- Local development serves assets from the API's static asset directory.
- Production assets will be served through object storage and a CDN.

## Synchronization

The server synchronizes the selected scene for room members. Each client plays the video independently; frame-perfect playback synchronization is not required.

## Consequences

- No Three.js, WebGL, or 3D rendering dependency is required.
- Video playback is relatively lightweight and broadly supported.
- Video assets must be optimized for bandwidth and mobile playback.
- Scene assets must have appropriate distribution and usage licenses.
