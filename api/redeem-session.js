const fs=require('fs');
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).send('Method Not Allowed');
  const sid=req.body && req.body.session_id;
  if(!sid) return res.status(400).send('Missing session_id');
  const tokensFile='/tmp/download_tokens.json';
  let store={}; try{store=JSON.parse(fs.readFileSync(tokensFile,'utf8'))}catch(e){}
  for(const token in store){
    const rec=store[token];
    if(rec.session_id===sid){
      const url=(process.env.BASE_URL || 'https://maya-test-repo-iesjda6v0-mayacaldwell-ais-projects.vercel.app')+`/download?token=${token}`;
      return res.json({url});
    }
  }
  return res.status(404).json({error:'not found'});
};
