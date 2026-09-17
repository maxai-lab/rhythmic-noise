(() => {
  "use strict";

  const data = window.DEMO_DATA;
  const allPlayers = [];
  const icons = {
    play: '<path d="m5 3 11 7-11 7V3Z" fill="currentColor"/>',
    pause: '<path d="M5 3h3v14H5zm7 0h3v14h-3z" fill="currentColor"/>',
    fullscreen: '<path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  };

  function icon(name) {
    return `<svg viewBox="0 0 20 20" aria-hidden="true">${icons[name]}</svg>`;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  }

  function iconButton(name, label) {
    const button = element("button", "icon-button");
    button.type = "button";
    button.innerHTML = icon(name);
    button.setAttribute("aria-label", label);
    button.title = label;
    return button;
  }

  // A single audio/video controller keeps every comparison audible in isolation.
  function addPlayer(media, container, duration, label, overlay = null) {
    const controls = element("div", "player-controls");
    const play = iconButton("play", `Play ${label}`);
    const seek = element("input", "seek");
    seek.type = "range";
    seek.min = "0";
    seek.max = String(duration);
    seek.step = "0.01";
    seek.value = "0";
    seek.setAttribute("aria-label", `Seek ${label}`);
    const time = element("span", "player-time", formatTime(duration));
    time.setAttribute("aria-hidden", "true");
    controls.append(play, seek, time);

    if (media instanceof HTMLVideoElement && (media.requestFullscreen || media.webkitEnterFullscreen)) {
      const fullscreen = iconButton("fullscreen", `Fullscreen ${label}`);
      fullscreen.addEventListener("click", async () => {
        try {
          media.controls = true;
          if (media.requestFullscreen) await media.requestFullscreen();
          else media.webkitEnterFullscreen();
        } catch {
          media.controls = false;
        }
      });
      document.addEventListener("fullscreenchange", () => {
        media.controls = document.fullscreenElement === media;
      });
      media.addEventListener("webkitendfullscreen", () => { media.controls = false; });
      controls.append(fullscreen);
    }

    const error = element("p", "player-error");
    error.hidden = true;
    error.setAttribute("role", "status");
    const fallback = element("a", "", "Open the media file");
    fallback.href = media.src;
    error.append("Unable to play this clip. ", fallback, ".");

    let pendingSeek = null;
    let playRequest = 0;
    function showError() {
      error.hidden = false;
      update();
    }

    function update() {
      const total = Number.isFinite(media.duration) ? media.duration : duration;
      const current = pendingSeek ?? media.currentTime;
      const playing = !media.paused && !media.ended;
      seek.max = String(total);
      seek.value = String(current);
      seek.style.setProperty("--progress", `${total > 0 ? current / total * 100 : 0}%`);
      seek.setAttribute("aria-valuetext", `${formatTime(current)} of ${formatTime(total)}`);
      time.textContent = formatTime(current > 0 && !media.ended ? current : total);
      const action = `${playing ? "Pause" : "Play"} ${label}`;
      play.innerHTML = icon(playing ? "pause" : "play");
      play.setAttribute("aria-label", action);
      play.title = action;
      container.classList.toggle("is-playing", playing);
      if (overlay) {
        overlay.innerHTML = `<span>${icon(playing ? "pause" : "play")}</span>`;
        overlay.setAttribute("aria-label", action);
        overlay.title = action;
      }
    }

    async function toggle() {
      if (!media.paused) {
        media.pause();
        return;
      }
      error.hidden = true;
      const request = ++playRequest;
      try {
        if (media.ended) media.currentTime = 0;
        await media.play();
      } catch (reason) {
        // Rapidly switching clips can cancel a pending play request normally.
        if (request === playRequest && reason.name !== "AbortError") showError();
      }
    }

    function setTime(value) {
      if (media.readyState === 0) {
        pendingSeek = value;
        media.load();
      } else {
        pendingSeek = null;
        media.currentTime = Math.min(value, Number.isFinite(media.duration) ? media.duration : duration);
      }
      update();
    }

    media.addEventListener("loadedmetadata", () => {
      if (pendingSeek !== null) setTime(pendingSeek);
      update();
    });
    media.addEventListener("play", () => {
      for (const otherMedia of allPlayers) {
        if (otherMedia !== media) otherMedia.pause();
      }
      update();
    });
    for (const event of ["pause", "ended", "timeupdate", "durationchange", "seeked"]) {
      media.addEventListener(event, update);
    }
    media.addEventListener("error", showError);
    play.addEventListener("click", toggle);
    overlay?.addEventListener("click", toggle);
    seek.addEventListener("input", () => setTime(Number(seek.value)));

    allPlayers.push(media);
    media.controls = false;
    container.append(controls, error);
    update();
  }

  function spectrogram(clip) {
    const card = element("figure", "spectrogram-card");
    const caption = element("figcaption", "spectrogram-caption");
    caption.append(element("span", "", clip.label), element("span", "clip-kind", clip.id === "source" ? "INPUT" : "OUTPUT"));
    const link = element("a", "spectrogram-visual");
    link.href = clip.image;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", `View full-size spectrogram: ${clip.label}`);
    const image = element("img");
    image.src = clip.image;
    image.alt = `${clip.label} spectrogram, showing frequency content over time`;
    image.width = 1920;
    image.height = 912;
    link.append(image);
    const audio = element("audio");
    audio.src = clip.audio;
    audio.preload = "none";
    audio.controls = true;
    audio.setAttribute("aria-label", clip.label);
    card.append(caption, link, audio);
    addPlayer(audio, card, clip.duration, clip.label.toLowerCase());
    return card;
  }

  function videoCard(sample, method) {
    const asset = sample.videos[method.id];
    const card = element("figure", `video-card${method.id === "rhythmic-noise" ? " is-ours" : ""}`);
    const caption = element("figcaption", "video-caption");
    caption.append(element("span", "", method.label), element("span", "method-kind", method.kind));
    const visual = element("div", "video-visual");
    const video = element("video");
    video.src = asset.src;
    video.poster = asset.poster;
    video.controls = true;
    video.playsInline = true;
    video.preload = "none";
    video.setAttribute("aria-label", `${sample.name} — ${method.label}`);
    const overlay = element("button", "poster-play");
    overlay.type = "button";
    visual.append(video, overlay);
    card.append(caption, visual);
    addPlayer(video, card, asset.duration, `${sample.name}, ${method.label}`, overlay);
    return card;
  }

  function sampleRow(sample, index) {
    const article = element("article", "sample");
    article.id = sample.id;
    article.setAttribute("aria-label", `Sample ${index + 1}`);
    const header = element("header", "sample-header");
    const title = element("div", "sample-title");
    title.append(element("span", "sample-index", String(index + 1).padStart(2, "0")));
    header.append(title);

    const grid = element("div", "video-grid");
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", `${sample.name}: source and method comparisons`);
    // Make the comparison strip keyboard-scrollable on narrow screens.
    grid.tabIndex = 0;
    for (const method of data.methods) {
      grid.append(videoCard(sample, method));
    }

    const transcript = element("div", "transcript");
    transcript.append(element("span", "text-label", "Original transcript"), element("p", "", sample.transcript));
    article.append(header, grid, transcript);
    return article;
  }

  if (!data) {
    document.getElementById("gallery").textContent = "The sample index could not be loaded. Make sure data.js is beside index.html.";
    return;
  }

  for (const clip of data.experiment.clips) {
    document.getElementById(clip.id === "source" ? "source-spectrogram" : "result-spectrograms").append(spectrogram(clip));
  }
  document.getElementById("experiment-transcript").textContent = `“${data.experiment.transcript}”`;
  document.getElementById("total-samples").textContent = `${data.samples.length} samples`;

  const gallery = document.getElementById("gallery");
  data.samples.forEach((sample, index) => {
    gallery.append(sampleRow(sample, index));
  });
})();
