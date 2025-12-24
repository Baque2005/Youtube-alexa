

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import alexaHandler from './src/alexaHandler.js';
import path from 'path';

console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY);

const app = express();
app.use(express.json());

// Servir archivos mp3 estáticos
const audioDir = path.resolve('public/audio');
app.use('/audio', express.static(audioDir));

app.post('/alexa', alexaHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor Alexa YouTube Audio escuchando en puerto ${PORT}`);
  console.log(`Archivos mp3 servidos desde: ${audioDir}`);
});
