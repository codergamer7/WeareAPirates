import express from 'express';
import cors from 'cors';
import { ANIME } from '@consumet/extensions';

const app = express();
app.use(cors());

const gogo = new ANIME.Gogoanime();

app.get('/search', async (req, res) => {
  const data = await gogo.search(req.query.q);
  res.json(data);
});

app.get('/info', async (req, res) => {
  const data = await gogo.fetchAnimeInfo(req.query.id);
  res.json(data);
});

app.get('/watch', async (req, res) => {
  const data = await gogo.fetchEpisodeSources(req.query.id);
  res.json(data);
});

app.listen(process.env.PORT || 3000);
