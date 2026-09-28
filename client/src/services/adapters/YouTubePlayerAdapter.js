import MediaPlayerAdapter from './MediaPlayerAdapter';

/**
 * YouTube IFrame API Player Adapter
 * Wraps official YT.Player instance.
 */
export class YouTubePlayerAdapter extends MediaPlayerAdapter {
  constructor(ytPlayerInstance, options = {}) {
    super(ytPlayerInstance, options);
    this.ytPlayer = ytPlayerInstance;
  }

  play() {
    if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      this.ytPlayer.playVideo();
    }
  }

  pause() {
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      this.ytPlayer.pauseVideo();
    }
  }

  seek(positionSeconds) {
    if (this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(Math.max(0, positionSeconds), true);
    }
  }

  getCurrentTime() {
    if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
      return this.ytPlayer.getCurrentTime() || 0;
    }
    return 0;
  }

  getDuration() {
    if (this.ytPlayer && typeof this.ytPlayer.getDuration === 'function') {
      return this.ytPlayer.getDuration() || 0;
    }
    return 0;
  }

  getState() {
    if (this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
      const stateCode = this.ytPlayer.getPlayerState();
      // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING
      if (stateCode === 1) return 'playing';
      if (stateCode === 3) return 'buffering';
      return 'paused';
    }
    return 'paused';
  }

  destroy() {
    if (this.ytPlayer && typeof this.ytPlayer.destroy === 'function') {
      try {
        this.ytPlayer.destroy();
      } catch {}
    }
    this.ytPlayer = null;
  }
}

export default YouTubePlayerAdapter;
