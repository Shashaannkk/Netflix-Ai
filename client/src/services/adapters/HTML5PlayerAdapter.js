import MediaPlayerAdapter from './MediaPlayerAdapter';

/**
 * HTML5 Video Player Adapter
 * Wraps standard HTMLVideoElement instance.
 */
export class HTML5PlayerAdapter extends MediaPlayerAdapter {
  constructor(videoElement, options = {}) {
    super(videoElement, options);
    this.video = videoElement;
  }

  play() {
    if (this.video && this.video.play) {
      return this.video.play().catch(() => {});
    }
  }

  pause() {
    if (this.video && this.video.pause) {
      this.video.pause();
    }
  }

  seek(positionSeconds) {
    if (this.video && typeof positionSeconds === 'number' && !isNaN(positionSeconds)) {
      this.video.currentTime = Math.max(0, positionSeconds);
    }
  }

  getCurrentTime() {
    return this.video ? this.video.currentTime || 0 : 0;
  }

  getDuration() {
    return this.video ? this.video.duration || 0 : 0;
  }

  getState() {
    if (!this.video) return 'paused';
    return this.video.paused ? 'paused' : 'playing';
  }

  setPlaybackRate(rate) {
    if (this.video && typeof rate === 'number' && !isNaN(rate) && rate > 0) {
      this.video.playbackRate = rate;
    }
  }

  setVolume(volume) {
    if (this.video && typeof volume === 'number' && !isNaN(volume)) {
      this.video.volume = Math.max(0, Math.min(1, volume));
      this.video.muted = volume === 0;
    }
  }

  setMuted(muted) {
    if (this.video) {
      this.video.muted = !!muted;
    }
  }

  isReady() {
    if (!this.video) return false;
    return (
      this.video.readyState >= 1 &&
      typeof this.video.duration === 'number' &&
      !Number.isNaN(this.video.duration) &&
      this.video.duration > 0
    );
  }

  destroy() {
    this.video = null;
  }
}

export default HTML5PlayerAdapter;
