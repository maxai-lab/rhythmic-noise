# Rhythmic Noise demo

A static HTML, CSS, and JavaScript page with the seed-phase experiment and all 10 video comparisons. No framework, package installation, build step, backend, or external services are required to view it.

## View locally

From the `demo-page` directory:

```sh
python3 src/serve.py
```

Open **http://localhost:8000/src/**. You can also open `src/index.html` directly in a browser.

The preview script serves static files with HTTP byte-range support so audio and video seeking work in Chrome. Python's basic `http.server` does not support this. Use `--port 8080` if port 8000 is already occupied.

The page references the original images, audio, and videos in `../data/`. Keep `src/` and `data/` together when hosting; serve their parent directory and link to `/src/`. For deployment under a subdirectory, the same relative layout works. Use a static host that supports your video file sizes and byte-range requests for efficient seeking.

## Contents

- `index.html` — page structure and source → DramaBox → seed 42 / seed 1235 diagram.
- `styles.css` — responsive layout; comparison rows scroll horizontally on small screens.
- `app.js` — gallery, accessible media controls, full-size image links, and automatic pausing of other clips.
- `data.js` — generated asset index, transcripts, and media durations. Loaded as a classic script so the page also works from `file://`.
- `assets/posters/` — small preview frames from each actual video. Videos and audio use `preload="none"` and load on interaction.
- `generate_data.py` — refreshes the index and posters from the dataset, validating that every sample has one video per method.
- `serve.py` — optional local static-file server with byte-range support; not needed on a static host.

## Refresh after changing data

Python 3, `ffmpeg`, and `ffprobe` are needed only to regenerate the asset index and previews:

```sh
python3 src/generate_data.py
```

Use `--refresh-posters` to regenerate all preview frames. Add display-name corrections to `NAMES` in the generator when needed. Original transcripts come from each Rhythmic Noise result's `transcript_used.txt`; text such as `<laughter>` is displayed literally.

The generator handles the existing `rhythimic-noise` directory spelling and the differently named Yann LeCun source video. It leaves all original data untouched.
