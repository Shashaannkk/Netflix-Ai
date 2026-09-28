import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.resolve(__dirname, '../../client/public/images');
const POSTERS_DIR = path.join(PUBLIC_DIR, 'posters');
const BACKDROPS_DIR = path.join(PUBLIC_DIR, 'backdrops');
const BRANDING_DIR = path.join(PUBLIC_DIR, 'branding');

// Ensure directories exist
[PUBLIC_DIR, POSTERS_DIR, BACKDROPS_DIR, BRANDING_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: Status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(destPath));
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading Cineby site branding...');
  try {
    await downloadFile('https://cineby.ninja/icon.webp', path.join(BRANDING_DIR, 'cineby-icon.webp'));
    console.log('Downloaded cineby-icon.webp');
  } catch (err) {
    console.error('Cineby icon download error:', err.message);
  }

  try {
    await downloadFile('https://cineby.ninja/og-image.jpg', path.join(BRANDING_DIR, 'cineby-og.jpg'));
    console.log('Downloaded cineby-og.jpg');
  } catch (err) {
    console.error('Cineby OG image download error:', err.message);
  }

  console.log('Fetching Cineby TMDB titles & images...');
  const tmdbApiKey = '484366b7235bc8db84aba0f9e3b1bec6';

  const fetchJson = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  try {
    const trending = await fetchJson(`https://api.themoviedb.org/3/trending/all/week?api_key=${tmdbApiKey}`);
    const popularMovies = await fetchJson(`https://api.themoviedb.org/3/movie/popular?api_key=${tmdbApiKey}`);
    const popularTV = await fetchJson(`https://api.themoviedb.org/3/tv/popular?api_key=${tmdbApiKey}`);

    const allItems = [
      ...(trending.results || []),
      ...(popularMovies.results || []),
      ...(popularTV.results || [])
    ];

    // Deduplicate items by ID
    const uniqueItems = [];
    const seenIds = new Set();
    for (const item of allItems) {
      if (!seenIds.has(item.id) && (item.poster_path || item.backdrop_path)) {
        seenIds.add(item.id);
        uniqueItems.push(item);
      }
    }

    console.log(`Found ${uniqueItems.length} unique titles from Cineby TMDB source.`);

    const titlesData = [];

    for (let i = 0; i < Math.min(uniqueItems.length, 15); i++) {
      const item = uniqueItems[i];
      const titleName = item.title || item.name || item.original_title || item.original_name;
      const slug = titleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      let posterLocal = '';
      let posterTmdb = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
      if (item.poster_path) {
        const posterFilename = `${slug}-poster.jpg`;
        const posterPath = path.join(POSTERS_DIR, posterFilename);
        try {
          await downloadFile(posterTmdb, posterPath);
          posterLocal = `/images/posters/${posterFilename}`;
          console.log(`[${i + 1}/${Math.min(uniqueItems.length, 15)}] Saved poster: ${posterFilename}`);
        } catch (e) {
          console.error(`Failed poster download for ${titleName}:`, e.message);
        }
      }

      let backdropLocal = '';
      let backdropTmdb = item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '';
      if (item.backdrop_path) {
        const backdropFilename = `${slug}-backdrop.jpg`;
        const backdropPath = path.join(BACKDROPS_DIR, backdropFilename);
        try {
          await downloadFile(backdropTmdb, backdropPath);
          backdropLocal = `/images/backdrops/${backdropFilename}`;
          console.log(`[${i + 1}/${Math.min(uniqueItems.length, 15)}] Saved backdrop: ${backdropFilename}`);
        } catch (e) {
          console.error(`Failed backdrop download for ${titleName}:`, e.message);
        }
      }

      titlesData.push({
        id: item.id,
        title: titleName,
        overview: item.overview,
        releaseYear: item.release_date ? parseInt(item.release_date.substring(0, 4)) : (item.first_air_date ? parseInt(item.first_air_date.substring(0, 4)) : 2024),
        rating: item.vote_average ? item.vote_average.toFixed(1) : '8.5',
        posterLocal,
        posterTmdb,
        backdropLocal,
        backdropTmdb,
        mediaType: item.media_type || (item.title ? 'movie' : 'tv')
      });
    }

    fs.writeFileSync(
      path.join(PUBLIC_DIR, 'cineby_titles.json'),
      JSON.stringify(titlesData, null, 2)
    );
    console.log('Saved cineby_titles.json successfully!');

  } catch (err) {
    console.error('Error fetching Cineby items:', err);
  }
}

main();
