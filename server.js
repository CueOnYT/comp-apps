// server.js
import express from 'express';
import fetch from 'node-fetch';
import morgan from 'morgan';
const app = express();
app.use(morgan('dev'));

const API_BASE = 'https://api.redgifs.com/v2';
let cache = { token:null, gotAt:0, ttlMs: 1000*60*20 };

async function getToken() {
  const now = Date.now();
  if (cache.token && now - cache.gotAt < cache.ttlMs) return cache.token;
  const r = await fetch(`${API_BASE}/auth/temporary`, { headers:{'accept':'application/json'} });
  if(!r.ok) throw new Error('Token fetch failed');
  const data = await r.json();
  const t = data?.token || data?.access_token || data?.rfToken;
  if(!t) throw new Error('Token not present');
  cache = { token:t, gotAt:now, ttlMs: cache.ttlMs };
  return t;
}

// GET /api/search?q=term&order=trending&count=30&page=1
app.get('/api/search', async (req,res) => {
  try{
    const q = (req.query.q || '').toString();
    const order = (req.query.order || 'trending').toString();
    const count = Number(req.query.count || 36);
    const page = Number(req.query.page || 1);
    if(!q) return res.status(400).json({error:'Missing q'});
    const token = await getToken();
    const u = new URL(`${API_BASE}/gifs/search`);
    u.searchParams.set('search_text', q);
    u.searchParams.set('order', order);
    u.searchParams.set('count', String(count));
    u.searchParams.set('page', String(page));
    const rr = await fetch(u, { headers:{ 'accept':'application/json', 'authorization':`Bearer ${token}` }});
    const json = await rr.json();
    res.set('cache-control','public, max-age=30');
    res.status(rr.status).json(json);
  }catch(e){
    console.error(e);
    res.status(500).json({error:'proxy_error', detail: String(e)});
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, ()=>console.log('Proxy on http://localhost:'+PORT));
