import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Stream the local Watch Together Kantara Chapter 1 video
 * using HTTP Range requests (206 Partial Content).
 *
 * Video file:
 *   kantara-chapter-1.mp4
 *
 * Expected location:
 *   Project root / kantara-chapter-1.mp4
 */
export const streamKantaraMovie = (req, res) => {
  // Only use the dedicated Kantara MP4 for Watch Together.
  // Do NOT fall back to Oceans.mp4 or the MKV file.
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'kantara-chapter-1.mp4'),
    path.join(process.cwd(), 'kantara-chapter-1.mp4'),
  ];

  let filePath = null;

  // Find the Kantara MP4 file.
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  // If the Kantara file cannot be found, return a clear error.
  // We intentionally do NOT redirect to Oceans.mp4 because
  // every Watch Together participant must use the same video.
  if (!filePath) {
    console.error(
      '[Watch Together] Kantara video not found. Checked:',
      possiblePaths
    );

    return res.status(404).json({
      error: 'Watch Together video not found',
      file: 'kantara-chapter-1.mp4',
    });
  }

  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Allow the frontend to request the video cross-origin.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'video/mp4');

    /**
     * Handle HTTP Range requests.
     *
     * This allows the browser to request only the required
     * portion of the video when seeking/streaming.
     */
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');

      const start = parseInt(parts[0], 10);

      // If no end is supplied, send up to 15 MB.
      const requestedEnd = parts[1]
        ? parseInt(parts[1], 10)
        : start + 15 * 1024 * 1024 - 1;

      const end = Math.min(requestedEnd, fileSize - 1);

      // Validate the requested starting byte.
      if (
        Number.isNaN(start) ||
        start < 0 ||
        start >= fileSize
      ) {
        res.status(416).setHeader(
          'Content-Range',
          `bytes */${fileSize}`
        );

        return res.end();
      }

      // Make sure the end is valid.
      if (
        Number.isNaN(end) ||
        end < start
      ) {
        res.status(416).setHeader(
          'Content-Range',
          `bytes */${fileSize}`
        );

        return res.end();
      }

      const chunksize = end - start + 1;

      const file = fs.createReadStream(filePath, {
        start,
        end,
      });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
      };

      res.writeHead(206, head);

      file.on('error', (error) => {
        console.error(
          '[Watch Together] Video stream error:',
          error
        );

        if (!res.headersSent) {
          res.status(500).json({
            error: 'Video streaming failed',
          });
        } else {
          res.destroy(error);
        }
      });

      file.pipe(res);

      return;
    }

    /**
     * No Range header:
     * send the complete video.
     */
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    };

    res.writeHead(200, head);

    const file = fs.createReadStream(filePath);

    file.on('error', (error) => {
      console.error(
        '[Watch Together] Video stream error:',
        error
      );

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Video streaming failed',
        });
      } else {
        res.destroy(error);
      }
    });

    file.pipe(res);
  } catch (error) {
    console.error(
      '[Watch Together] Failed to prepare video:',
      error
    );

    return res.status(500).json({
      error: 'Failed to prepare Watch Together video',
    });
  }
};