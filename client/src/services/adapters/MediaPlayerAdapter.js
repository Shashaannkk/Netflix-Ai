/**
 * Abstract Media Player Adapter Interface
 * 
 * Provides a provider-agnostic interface for controlling video playback across
 * YouTube, HTML5 <video>, and external stream sources.
 */
export class MediaPlayerAdapter {
  constructor(elementOrRef, options = {}) {
    if (new.target === MediaPlayerAdapter) {
      throw new TypeError('Cannot construct MediaPlayerAdapter instances directly');
    }
    this.elementOrRef = elementOrRef;
    this.options = options;
  }

  play() {
    throw new Error('Method play() must be implemented');
  }

  pause() {
    throw new Error('Method pause() must be implemented');
  }

  seek(positionSeconds) {
    throw new Error('Method seek() must be implemented');
  }

  getCurrentTime() {
    throw new Error('Method getCurrentTime() must be implemented');
  }

  getDuration() {
    throw new Error('Method getDuration() must be implemented');
  }

  getState() {
    throw new Error('Method getState() must be implemented');
  }

  destroy() {
    // Optional cleanup
  }
}

export default MediaPlayerAdapter;
