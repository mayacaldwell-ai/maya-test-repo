const crypto = require('crypto');
const fs = require('fs');
const fetch = require('node-fetch');
module.exports = async (req, res) => {
  const sigHeader = req.headers['stripe-signature'] || req.headers['Stripe-Signature'];
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const payload = Buffer.concat(chunks).toString('utf8');
  const secretObj = JSON.parse(fs.readFileSync('/root/.openclaw/secure/stripe_webhook_secret.json','utf8'));
  const secret = secretObj.secret;
  if(!sigHeader){res.status(400).end('Missing signature');return}
  const parts = sigHeader.split(',').reduce((a,p)=>{const kv=p.split('=');a[kv[0]]=kv[1];return a;},{});
  const timestamp = parts.t; const signature = parts['v1'];
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload,'utf8').digest('hex');
  try{ if(!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))){res.status(400).end('Invalid sig');return} }catch(e){res.status(400).end('Invalid sig');return}
  const event = JSON.parse(payload);
  if(event.type === 'checkout.session.completed'){
    const sess = event.data.object;
    const email = (sess.customer_details && sess.customer_details.email) || sess.customer_email;
    const token = crypto.randomBytes(24).toString('hex');
    const tokensFile = '/tmp/download_tokens.json';
    let store = {};
    try{store = JSON.parse(fs.readFileSync(tokensFile,'utf8'))}catch(e){}
    store[token] = {session_id: sess.id, email: email, created: Date.now(), sku: 'pro'}
    fs.writeFileSync(tokensFile, JSON.stringify(store));
    const raw = `From: maya.caldwell@peacockmg.com
To: ${email}
Subject: Your Freelancer Kit Download

Thank you! Download link: ${process.env.BASE_URL || 'https://maya-test-repo-dfqhgim5x-mayacaldwell-ais-projects.vercel.app'}/download?token=${token}

This link expires in 24 hours.`;
    const gmailCreds = JSON.parse(fs.readFileSync('/root/.openclaw/secure/email_creds.json','utf8'));
    const resp = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:gmailCreds.client_id,client_secret:gmailCreds.client_secret,refresh_token:gmailCreds.refresh_token,grant_type:'refresh_token'})});
    const j = await resp.json();
    const access = j.access_token;
    const rawb = Buffer.from(raw).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{'Authorization':`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify({raw:rawb})});
  }
  res.status(200).end('ok');
};
