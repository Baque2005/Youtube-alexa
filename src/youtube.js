

import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { getCached, setCached } from './cache.js';
import { exec } from 'child_process';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Buscar video en YouTube
export async function searchYouTube(query) {
	console.log('YOUTUBE_API_KEY en searchYouTube:', YOUTUBE_API_KEY);
	const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
	const { data } = await axios.get(url, { timeout: 4000 });
	return data.items?.[0] || null;
}

// Obtener URL directa de audio usando yt-dlp y cachear 5 min
export async function getAudioUrl(videoId) {
	const cacheKey = `audioUrl:${videoId}`;
	const cached = getCached(cacheKey);
	if (cached) return cached;

	// yt-dlp debe estar instalado en el entorno de Render
	// Forzar solo audio directo (no HLS/m3u8)
	const cmd = `yt-dlp -g --cookies cookies.txt -f "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio" --no-playlist --no-warnings https://www.youtube.com/watch?v=${videoId}`;
	return new Promise((resolve) => {
		exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
			if (err) {
				console.error('yt-dlp error:', err);
				console.error('yt-dlp stderr:', stderr);
				console.error('yt-dlp stdout:', stdout);
				return resolve(null);
			}
			const url = stdout.trim();
			if (url && !url.includes('.m3u8') && !url.includes('playlist')) {
				setCached(cacheKey, url, 300); // 5 minutos
				resolve(url);
			} else {
				console.error('yt-dlp devolvió una URL no compatible con Alexa (HLS/m3u8 o playlist). stdout:', stdout, 'stderr:', stderr);
				resolve(null);
			}
		});
	});
}

