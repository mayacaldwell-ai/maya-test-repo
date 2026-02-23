const fs = require('fs');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const evt = req.body && req.body.event;
  if (!evt) return res.status(400).send('Missing event');
  const PATH = '/root/.openclaw/workspace/reports/tracking.json';
  let data = {visits:0,checkout_starts:0,purchases:0,events:[]};
  try { data = JSON.parse(fs.readFileSync(PATH,'utf8')); } catch(e){}
  data.events.push({t:Date.now(),evt});
  if (evt === 'visit') data.visits += 1;
  if (evt === 'checkout_start') data.checkout_starts += 1;
  if (evt === 'purchase') data.purchases += 1;
  fs.writeFileSync(PATH, JSON.stringify(data));
  res.json({ok:true});
};
