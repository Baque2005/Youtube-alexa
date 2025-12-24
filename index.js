

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import alexaHandler from './src/alexaHandler.js';

console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY);

const app = express();
app.use(express.json());

app.post('/alexa', alexaHandler);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor Alexa YouTube Audio escuchando en puerto ${PORT}`);
});
