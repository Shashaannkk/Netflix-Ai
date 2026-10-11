import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper to stream an MP4 file with full HTTP 206 Range support.
 * Ensures fast start, seeking, and cross-origin access.
 */
const streamVideoFile = (req, res, targetFileNames) => {
  const searchNames = Array.isArray(targetFileNames) ? targetFileNames : [targetFileNames];
  const possibleRoots = [
    path.join(__dirname, '..', '..'),
    process.cwd(),
    path.join(__dirname, '..', '..', 'client', 'public'),
  ];

  let filePath = null;

  for (const name of searchNames) {
    for (const root of possibleRoots) {
      const candidate = path.join(root, name);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }
    if (filePath) break;
  }

  // Fallback to watch-together-demo.mp4 if a requested file is missing
  if (!filePath) {
    for (const root of possibleRoots) {
      const candidate = path.join(root, 'watch-together-demo.mp4');
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }
  }

  if (!filePath) {
    console.error('[MediaController] No playable video file found. Checked:', searchNames);
    return res.status(404).json({
      error: 'Watch Together media file not found on server',
      checked: searchNames,
    });
  }

  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'video/mp4');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const requestedEnd = parts[1]
        ? parseInt(parts[1], 10)
        : start + 15 * 1024 * 1024 - 1; // 15MB chunks
      const end = Math.min(requestedEnd, fileSize - 1);

      if (Number.isNaN(start) || start < 0 || start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      if (Number.isNaN(end) || end < start) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
      });

      fileStream.on('error', (err) => {
        console.error('[MediaController] Stream chunk error:', err?.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Video streaming failed' });
        } else {
          res.destroy(err);
        }
      });

      fileStream.pipe(res);
      return;
    }

    // No range header: serve complete stream
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      console.error('[MediaController] Full stream error:', err?.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Video streaming failed' });
      } else {
        res.destroy(err);
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error('[MediaController] Failed to prepare video stream:', error?.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to prepare video stream' });
    }
  }
};

/**
 * Stream the web-compatible H.264/AAC Watch Together Demo video (Tears of Steel).
 * Universally supported by 100% of browsers (Chrome, Edge, Firefox, Safari)
 * with zero black screen and immediate fast-start streaming.
 */
export const streamWatchTogetherDemo = (req, res) => {
  return streamVideoFile(req, res, ['watch-together-demo.mp4']);
};

/**
 * Stream handler for Kantara route.
 * Because kantara-chapter-1.mp4 is encoded in H.265/HEVC (hev1),
 * Chrome on Windows renders a black screen due to lack of a software HEVC decoder.
 * This handler safely serves the web-compatible H.264 demo video unless explicit raw is requested.
 */
export const streamKantaraMovie = (req, res) => {
  if (req.query.raw === 'true') {
    return streamVideoFile(req, res, ['kantara-chapter-1.mp4', 'watch-together-demo.mp4']);
  }
  return streamVideoFile(req, res, ['watch-together-demo.mp4', 'kantara-chapter-1.mp4']);
};