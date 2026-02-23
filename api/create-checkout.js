const fs = require('fs');
module.exports = async (req, res) => {
  if(req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { price } = req.body || {};
  if(!price) return res.status(400).send('Missing price');
  const sk = JSON.parse(fs.readFileSync('/root/.openclaw/secure/stripe_keys.json','utf8')).secret;
  const stripe = require('stripe')(sk);
  const origin = req.headers['origin'] || 'https://maya-test-repo-dfqhgim5x-mayacaldwell-ais-projects.vercel.app';
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{price: price, quantity:1}],
    mode: 'payment',
    success_url: `${origin}/success.html`,
    cancel_url: `${origin}/`
  });
  res.json({url: session.url});
};
