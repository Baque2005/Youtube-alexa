
import { searchYouTube, getAudioUrl } from './youtube.js';

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
				const video = await searchYouTube(query);
				if (!video) return res.json(buildSimpleResponse('No encontré resultados en YouTube.'));
				const audioUrl = await getAudioUrl(video.id.videoId);
				if (!audioUrl) return res.json(buildSimpleResponse('No pude obtener el audio. Intenta de nuevo.'));
				return res.json(buildAudioPlayerResponse(video, audioUrl));
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
