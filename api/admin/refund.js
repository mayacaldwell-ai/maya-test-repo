const fetch = require('node-fetch');
const fs = require('fs');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).send('Unauthorized');
  const token = auth.slice(7);

  const expected = fs.readFileSync('/root/.openclaw/secure/admin_token.txt','utf8').trim();
  if (token !== expected) return res.status(403).send('Forbidden');

  const { charge_id } = req.body || {};
  if (!charge_id) return res.status(400).send('Missing charge_id');

  // Mark charge metadata refund_requested=true via Stripe API
  const sk = JSON.parse(fs.readFileSync('/root/.openclaw/secure/stripe_keys.json','utf8')).secret;
  try {
    const params = new URLSearchParams();
    params.append('metadata[refund_requested]', 'true');
    const resp = await fetch(`https://api.stripe.com/v1/charges/${charge_id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(sk+':').toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    const data = await resp.text();
    if (!resp.ok) return res.status(500).send(`Stripe error: ${data}`);
    return res.status(200).send(`Marked charge ${charge_id} refund_requested=true`);
  } catch (e) {
    console.error(e);
    return res.status(500).send('Server error');
  }
};
