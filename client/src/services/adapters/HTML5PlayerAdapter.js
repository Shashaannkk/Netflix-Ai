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

  destroy() {
    this.video = null;
  }
}

export default HTML5PlayerAdapter;
