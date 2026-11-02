"use strict";
(() => {
  const audio = document.getElementById("preview-audio");
  const play = document.getElementById("play-button");
  const seek = document.getElementById("preview-seek");
  const elapsed = document.getElementById("elapsed");
  const status = document.getElementById("player-status");
  const error = document.getElementById("player-error");
  const milestones = new Set();
  let started = false;
  let listened = 0;
  let lastTime = 0;
  let pendingSeek = null;
  const send = (name, extra = {}) => window.MikaAnalytics?.track(name, extra);
  const time = seconds => `${Math.floor(seconds / 60).toString().padStart(2,"0")}:${Math.floor(seconds % 60).toString().padStart(2,"0")}`;
  document.getElementById("year").textContent = new Date().getFullYear();

  function render() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 60;
    seek.max = duration;
    seek.value = audio.currentTime;
    seek.style.setProperty("--progress", `${audio.currentTime / duration * 100}%`);
    seek.setAttribute("aria-valuetext", `${Math.floor(audio.currentTime)} seconds of ${Math.round(duration)} seconds`);
    elapsed.textContent = time(audio.currentTime);
  }
  play.addEventListener("click", async () => {
    error.hidden = true;
    if (!audio.paused) { audio.pause(); return; }
    if (audio.ended) audio.currentTime = 0;
    play.disabled = true;
    status.textContent = "Loading preview";
    try { await audio.play(); }
    catch (_) {
      error.hidden = false;
      status.textContent = "Preview unavailable";
    } finally { play.disabled = false; }
  });
  audio.addEventListener("playing", () => {
    play.setAttribute("aria-pressed", "true");
    play.setAttribute("aria-label", "Pause track preview");
    status.textContent = "Preview playing";
    lastTime = audio.currentTime;
    if (!started) { started = true; send("preview_start"); }
  });
  audio.addEventListener("pause", () => {
    play.setAttribute("aria-pressed", "false");
    play.setAttribute("aria-label", "Play track preview");
    status.textContent = audio.ended ? "Preview finished" : "Preview paused";
  });
  audio.addEventListener("timeupdate", () => {
    const delta = audio.currentTime - lastTime;
    // Count actual playback, not scrubbing forward, toward listening milestones.
    if (!audio.paused && !audio.seeking && delta > 0 && delta < 2) listened += delta;
    lastTime = audio.currentTime;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 60;
    for (const percentage of [25, 50, 75, 95]) {
      if (listened >= duration * percentage / 100 && !milestones.has(percentage)) {
        milestones.add(percentage);
        send(percentage === 95 ? "preview_complete" : "preview_progress", {preview_percent: percentage});
      }
    }
    render();
  });
  audio.addEventListener("seeking", () => { lastTime = audio.currentTime; });
  audio.addEventListener("seeked", () => { lastTime = audio.currentTime; });
  audio.addEventListener("loadedmetadata", () => {
    if (pendingSeek !== null) { audio.currentTime = Math.min(pendingSeek, audio.duration); pendingSeek = null; }
    render();
  });
  audio.addEventListener("error", () => { error.hidden = false; play.disabled = false; });
  seek.addEventListener("input", () => {
    const target = Number(seek.value);
    if (audio.readyState >= 1) audio.currentTime = target;
    else { pendingSeek = target; audio.load(); }
  });
  document.addEventListener("click", event => {
    const link = event.target.closest("a[data-store]");
    if (!link) return;
    send("store_click", {store_platform: link.dataset.store, link_url: link.href, placement: link.dataset.placement});
    // Normal links remain usable if analytics is disabled, blocked or declined.
  });
})();
