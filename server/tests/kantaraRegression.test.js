import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getServerStreamUrl,
  classifySource,
  getPlayerMode,
  isObsoleteSampleUrl,
  SERVER_8_CANONICAL_SOURCE,
} from '../../client/src/services/movieServers.js';

describe('Kantara A Legend: Chapter 1 — Source Resolution Regression Audit', () => {

  const OBSOLETE_GOOGLE_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
  const OBSOLETE_BUNNY_URL  = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  it('1. isObsoleteSampleUrl accurately identifies broken Google Cloud sample URLs', () => {
    assert.strictEqual(isObsoleteSampleUrl(OBSOLETE_GOOGLE_URL), true);
    assert.strictEqual(isObsoleteSampleUrl(OBSOLETE_BUNNY_URL), true);
    assert.strictEqual(isObsoleteSampleUrl(SERVER_8_CANONICAL_SOURCE), false);
    assert.strictEqual(isObsoleteSampleUrl('https://my-custom-domain.com/my-movie.mp4'), false);
  });

  it('2. classifySource marks obsolete Google Cloud sample URLs as INVALID', () => {
    assert.strictEqual(classifySource(OBSOLETE_GOOGLE_URL), 'INVALID');
    assert.strictEqual(classifySource(OBSOLETE_BUNNY_URL), 'INVALID');
    assert.strictEqual(classifySource(SERVER_8_CANONICAL_SOURCE), 'DIRECT_MEDIA');
    assert.strictEqual(classifySource('https://vidsrc.me/embed/movie?tmdb=550'), 'EMBED_PROVIDER');
  });

  it('3. getPlayerMode marks obsolete Google Cloud sample URLs as invalid', () => {
    assert.strictEqual(getPlayerMode(OBSOLETE_GOOGLE_URL), 'invalid');
    assert.strictEqual(getPlayerMode(SERVER_8_CANONICAL_SOURCE), 'native');
    assert.strictEqual(getPlayerMode('https://vidsrc.me/embed/movie?tmdb=550'), 'provider');
  });

  it('4. Server 8 ALWAYS resolves to SERVER_8_CANONICAL_SOURCE regardless of TMDB ID or title metadata', () => {
    const res = getServerStreamUrl({
      tmdbId: null,
      isTv: false,
      season: 1,
      episode: 1,
      serverNum: 8,
    });
    assert.strictEqual(res, SERVER_8_CANONICAL_SOURCE);
    assert.strictEqual(res, 'https://vjs.zencdn.net/v/oceans.mp4');
  });

  it('5. Kantara title without TMDB ID falls back safely to SERVER_8_CANONICAL_SOURCE instead of Google Cloud URL', () => {
    const kantaraTitle = {
      title: 'Kantara A Legend: Chapter 1',
      tmdbId: null,
      videoAssetUrl: OBSOLETE_GOOGLE_URL,
    };

    let videoSrc = getServerStreamUrl({
      tmdbId: kantaraTitle.tmdbId,
      isTv: false,
      season: 1,
      episode: 1,
      serverNum: 1,
    });

    if (!videoSrc && kantaraTitle.videoAssetUrl) {
      const existingUrl = kantaraTitle.videoAssetUrl;
      if (
        typeof existingUrl === 'string' &&
        (existingUrl.startsWith('http://') || existingUrl.startsWith('https://')) &&
        !isObsoleteSampleUrl(existingUrl)
      ) {
        videoSrc = existingUrl;
      }
    }

    if (!videoSrc || classifySource(videoSrc) === 'INVALID') {
      videoSrc = SERVER_8_CANONICAL_SOURCE;
    }

    assert.strictEqual(videoSrc, SERVER_8_CANONICAL_SOURCE);
    assert.notStrictEqual(videoSrc, OBSOLETE_GOOGLE_URL);
  });

  it('6. Servers 1-7 retain provider source generation when valid TMDB ID is present', () => {
    const tmdbId = 964980; // Kantara TMDB ID
    assert.strictEqual(getServerStreamUrl({ tmdbId, serverNum: 1 }), 'https://vidsrc.me/embed/movie?tmdb=964980');
    assert.strictEqual(getServerStreamUrl({ tmdbId, serverNum: 2 }), 'https://player.autoembed.cc/embed/movie/964980');
    assert.strictEqual(getServerStreamUrl({ tmdbId, serverNum: 3 }), 'https://vidsrc.to/embed/movie/964980');
    assert.strictEqual(getServerStreamUrl({ tmdbId, serverNum: 4 }), 'https://www.2embed.cc/embed/964980');
    assert.strictEqual(getServerStreamUrl({ tmdbId, serverNum: 5 }), 'https://vidbinge.dev/embed/movie/964980');
    assert.strictEqual(getServerStreamUrl({ tmdbId, serverNum: 6 }), 'https://vidsrc.me/embed/movie?tmdb=964980');
    assert.strictEqual(getServerStreamUrl({ tmdbId, serverNum: 7 }), 'https://embed.smashystream.com/playere.php?tmdb=964980');
    assert.strictEqual(getServerStreamUrl({ tmdbId, serverNum: 8 }), SERVER_8_CANONICAL_SOURCE);
  });

  it('7. Legitimate non-obsolete custom videoAssetUrls are preserved when tmdbId is missing and server is not 8', () => {
    const customAssetUrl = 'https://my-cdn.com/videos/kantara_direct.mp4';
    let videoSrc = getServerStreamUrl({
      tmdbId: null,
      serverNum: 1,
    });

    if (!videoSrc && customAssetUrl) {
      if (
        typeof customAssetUrl === 'string' &&
        (customAssetUrl.startsWith('http://') || customAssetUrl.startsWith('https://')) &&
        !isObsoleteSampleUrl(customAssetUrl)
      ) {
        videoSrc = customAssetUrl;
      }
    }

    assert.strictEqual(videoSrc, customAssetUrl);
  });
});
