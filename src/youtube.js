import https from 'https';
// Descarga un archivo desde una URL y lo guarda en el path indicado
function downloadFile(url, dest) {
	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(dest);
		https.get(url, (response) => {
			if (response.statusCode !== 200) {
				return reject(new Error('Respuesta no exitosa al descargar mp3'));
			}
			response.pipe(file);
			file.on('finish', () => {
				file.close(() => resolve(true));
			});
		}).on('error', (err) => {
			fs.unlink(dest, () => reject(err));
		});
	});
}

// Usar API externa para convertir y descargar mp3
export async function getAudioUrlFromApi(youtubeUrl, videoId, rapidApiKey) {
	const audioDir = path.resolve('public/audio');
	const mp3Path = path.join(audioDir, `${videoId}.mp3`);
	const mp3Url = `/audio/${videoId}.mp3`;
	if (fs.existsSync(mp3Path)) return mp3Url;

	// 1. Solicitar conversión usando query parameters
	const apiUrl = 'https://youtube-to-mp315.p.rapidapi.com/download';
	const headers = {
		'X-RapidAPI-Host': 'youtube-to-mp315.p.rapidapi.com',
		'X-RapidAPI-Key': rapidApiKey
	};
	try {
		const params = new URLSearchParams({ url: youtubeUrl, format: 'mp3' });
		const { data } = await axios.post(`${apiUrl}?${params.toString()}`, null, { headers });
		if (data.status === 'AVAILABLE' && data.downloadUrl) {
			await downloadFile(data.downloadUrl, mp3Path);
			return mp3Url;
		}
		// Si está CONVERTING, consultar estado hasta que esté listo (máx 10 intentos)
		if (data.status === 'CONVERTING' && data.id) {
			for (let i = 0; i < 10; i++) {
				await new Promise(r => setTimeout(r, 3000));
				const statusUrl = `https://youtube-to-mp315.p.rapidapi.com/status/${data.id}`;
				const statusResp = await axios.get(statusUrl, { headers });
				if (statusResp.data.status === 'AVAILABLE' && statusResp.data.downloadUrl) {
					await downloadFile(statusResp.data.downloadUrl, mp3Path);
					return mp3Url;
				}
				if (statusResp.data.status === 'CONVERSION_ERROR' || statusResp.data.status === 'EXPIRED') {
					break;
				}
			}
		}
	} catch (e) {
		console.error('Error usando API externa YouTube-to-mp3:', e.message);
	}
	return null;
}


import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { getCached, setCached } from './cache.js';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Buscar hasta 5 videos en YouTube
export async function searchYouTube(query, maxResults = 5) {
	console.log('YOUTUBE_API_KEY en searchYouTube:', YOUTUBE_API_KEY);
	const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
	const { data } = await axios.get(url, { timeout: 4000 });
	return data.items || [];
}

// Intenta descargar el audio de una lista de videos hasta que uno funcione
export async function getAudioUrlFromVideos(videos) {
	for (const video of videos) {
		const videoId = video.id.videoId;
		const url = await getAudioUrl(videoId);
		if (url) return { url, video };
	}
	return null;
}


// Descargar y convertir a mp3 usando yt-dlp y servirlo localmente
export async function getAudioUrl(videoId) {
	const cacheKey = `audioUrl:${videoId}`;
	const cached = getCached(cacheKey);
	if (cached) return cached;

	// Ruta donde se guardará el mp3
	const audioDir = path.resolve('public/audio');
	const mp3Path = path.join(audioDir, `${videoId}.mp3`);
	const mp3Url = `/audio/${videoId}.mp3`;

	// Si ya existe el mp3, devolver la URL
	if (fs.existsSync(mp3Path)) {
		setCached(cacheKey, mp3Url, 300);
		return mp3Url;
	}

	// Descargar y convertir a mp3 usando yt-dlp y ffmpeg
	// yt-dlp debe estar instalado y ffmpeg disponible
	return new Promise((resolve) => {
		// Primer intento: formatos preferidos
		const cmd1 = `yt-dlp --cookies cookies.txt -f "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio" --no-playlist --no-warnings --extract-audio --audio-format mp3 -o \"${mp3Path}\" https://www.youtube.com/watch?v=${videoId}`;
		exec(cmd1, { timeout: 60000 }, (err, stdout, stderr) => {
			if (!err && fs.existsSync(mp3Path)) {
				setCached(cacheKey, mp3Url, 300);
				return resolve(mp3Url);
			}
			// Si falla, intentar con el mejor audio disponible
			console.warn('Primer intento yt-dlp falló, probando con bestaudio disponible...');
			const cmd2 = `yt-dlp --cookies cookies.txt -f bestaudio --no-playlist --no-warnings --extract-audio --audio-format mp3 -o \"${mp3Path}\" https://www.youtube.com/watch?v=${videoId}`;
			exec(cmd2, { timeout: 60000 }, (err2, stdout2, stderr2) => {
				if (err2) {
					if (err2.killed && err2.signal === 'SIGTERM') {
						console.error('yt-dlp fue terminado por timeout (60s) en fallback.');
					} else {
						console.error('yt-dlp error (fallback):', err2);
					}
					console.error('yt-dlp stderr (fallback):', stderr2);
					console.error('yt-dlp stdout (fallback):', stdout2);
					return resolve(null);
				}
				if (fs.existsSync(mp3Path)) {
					setCached(cacheKey, mp3Url, 300);
					resolve(mp3Url);
				} else {
					console.error('No se generó el mp3 ni con fallback:', mp3Path);
					resolve(null);
				}
			});
		});
	});
}


