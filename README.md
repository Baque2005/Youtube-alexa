# Alexa YouTube Audio

Backend Express para Alexa Skill que reproduce solo audio de YouTube en Echo Dot.

## Despliegue en Render

- Crea un Web Service en Render
- Node 18+
- Instala yt-dlp en el build command: `pip install yt-dlp`
- Configura variables de entorno: YOUTUBE_API_KEY
- Expón el endpoint POST /alexa

## Uso

- Alexa Skill Custom, idioma español (US)
- Intents: LaunchRequest, PlayAudioIntent, AMAZON.StopIntent
- Slot: query (AMAZON.SearchQuery)
