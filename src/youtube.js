
import axios from 'axios';
import { getCached, setCached } from './cache.js';
import { exec } from 'child_process';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Buscar video en YouTube
export async function searchYouTube(query) {
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
	const cmd = `yt-dlp -g -f "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio" https://www.youtube.com/watch?v=${videoId}`;
	return new Promise((resolve) => {
		exec(cmd, { timeout: 5000 }, (err, stdout) => {
			if (err) {
				console.error('yt-dlp error:', err);
				return resolve(null);
			}
			const url = stdout.trim();
			if (url && (url.endsWith('.m4a') || url.endsWith('.mp3'))) {
				setCached(cacheKey, url, 300); // 5 minutos
				resolve(url);
			} else {
				resolve(null);
			}
		});
	});
}
