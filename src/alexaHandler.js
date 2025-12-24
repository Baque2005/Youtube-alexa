
import { searchYouTube, getAudioUrlFromVideos, getAudioUrlFromApi } from './youtube.js';

export default async function alexaHandler(req, res) {
	try {
		const { request, session } = req.body;
		if (!request) return res.json(buildErrorResponse('Petición inválida'));

		if (request.type === 'LaunchRequest') {
			return res.json(buildSimpleResponse('Bienvenido a YouTube Audio. Dime qué quieres escuchar.'));
		}

		if (request.type === 'IntentRequest') {
			const intent = request.intent.name;
			if (intent === 'PlayAudioIntent') {
				const query = request.intent.slots?.query?.value;
				if (!query) return res.json(buildSimpleResponse('¿Qué quieres escuchar en YouTube?'));
				const videos = await searchYouTube(query, 5);
				if (!videos || videos.length === 0) return res.json(buildSimpleResponse('No encontré resultados en YouTube.'));
				// Usar la API externa para el primer video encontrado
				const video = videos[0];
				const videoId = video.id.videoId;
				const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
				const rapidApiKey = process.env.RAPIDAPI_KEY;
				if (!rapidApiKey) return res.json(buildSimpleResponse('No hay RapidAPI Key configurada.'));
				const audioUrl = await getAudioUrlFromApi(youtubeUrl, videoId, rapidApiKey);
				if (!audioUrl) return res.json(buildSimpleResponse('No pude obtener el audio usando la API externa. Intenta con otra canción.'));
				// Construir URL absoluta para Alexa
				const host = req.headers['x-forwarded-host'] || req.headers.host;
				const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
				const absoluteUrl = `${protocol}://${host}${audioUrl}`;
				return res.json(buildAudioPlayerResponse(video, absoluteUrl));
			}
			if (intent === 'AMAZON.StopIntent') {
				return res.json(buildStopResponse());
			}
		}

		return res.json(buildErrorResponse('Petición no soportada'));
	} catch (e) {
		console.error(e);
		return res.json(buildErrorResponse('Ocurrió un error interno'));
	}
}

// Helpers para respuestas Alexa
function buildSimpleResponse(text) {
	return {
		version: '1.0',
		response: {
			outputSpeech: { type: 'PlainText', text },
			shouldEndSession: false
		}
	};
}

function buildAudioPlayerResponse(video, audioUrl) {
	return {
		version: '1.0',
		response: {
			outputSpeech: {
				type: 'PlainText',
				text: `Reproduciendo ${video.snippet.title}`
			},
			directives: [
				{
					type: 'AudioPlayer.Play',
					playBehavior: 'REPLACE_ALL',
					audioItem: {
						stream: {
							token: video.id.videoId,
							url: audioUrl,
							offsetInMilliseconds: 0
						},
						metadata: {
							title: video.snippet.title,
							subtitle: video.snippet.channelTitle
						}
					}
				}
			],
			shouldEndSession: true
		}
	};
}

function buildStopResponse() {
	return {
		version: '1.0',
		response: {
			directives: [{ type: 'AudioPlayer.Stop' }],
			shouldEndSession: true
		}
	};
}

function buildErrorResponse(text) {
	return {
		version: '1.0',
		response: {
			outputSpeech: { type: 'PlainText', text },
			shouldEndSession: true
		}
	};
}
