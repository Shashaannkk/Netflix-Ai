import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Stream local Watch Together demo movie file bit-by-bit using HTTP Range requests (206 Partial Content)
 */
export const streamKantaraMovie = (req, res) => {
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'watch-together-demo.mp4'),
    path.join(process.cwd(), 'watch-together-demo.mp4'),
    path.join(__dirname, '..', '..', 'kantara-chapter-1.mp4'),
    path.join(process.cwd(), 'kantara-chapter-1.mp4'),
    path.join(__dirname, '..', '..', 'Kantara-Chapter.1.2025.1080p.WEB-DL.Hindi.5.1-Kannad.mkv'),
    path.join(process.cwd(), 'Kantara-Chapter.1.2025.1080p.WEB-DL.Hindi.5.1-Kannad.mkv'),
  ];

  let filePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    return res.status(404).json({ error: 'Watch Together demo media file not found on server' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 15 * 1024 * 1024, fileSize - 1); // 15MB chunks bit-by-bit

    if (start >= fileSize) {
      res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
};
