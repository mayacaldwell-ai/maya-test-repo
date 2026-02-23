const fs = require('fs');
module.exports = async (req,res)=>{
  const token = req.query.token;
  if(!token) return res.status(400).send('Missing token');
  const tokensFile = '/tmp/download_tokens.json';
  let store={};
  try{store = JSON.parse(fs.readFileSync(tokensFile,'utf8'))}catch(e){}
  const rec = store[token];
  if(!rec) return res.status(404).send('Not found or expired');
  if(Date.now() - rec.created > 24*3600*1000){ delete store[token]; fs.writeFileSync(tokensFile, JSON.stringify(store)); return res.status(410).send('Expired'); }
  const pathFile = '/root/.openclaw/workspace/dist_pro.zip';
  res.setHeader('Content-Type','application/zip');
  res.setHeader('Content-Disposition','attachment; filename="freelancer-kit-pro.zip"');
  const stream = fs.createReadStream(pathFile);
  stream.pipe(res);
};
