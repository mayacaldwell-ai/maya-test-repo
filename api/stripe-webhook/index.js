const crypto = require('crypto')

// Stripe signing secret will be provided via environment variable STRIPE_WEBHOOK_SECRET
// We also read STRIPE_SECRET_KEY for possible debug use (not used here)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    res.end('Method Not Allowed')
    return
  }

  const sigHeader = req.headers['stripe-signature'] || req.headers['Stripe-Signature']
  if (!sigHeader) {
    res.statusCode = 400
    res.end('Missing Stripe-Signature header')
    return
  }

  // Get raw body as string
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const buf = Buffer.concat(chunks)
  const payload = buf.toString('utf8')

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('No STRIPE_WEBHOOK_SECRET configured')
    res.statusCode = 500
    res.end('Server misconfigured')
    return
  }

  // Parse the header, which contains timestamp and one or more signatures
  // Format: t=timestamp,v1=signature,v0=...
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=')
    acc[k] = v
    return acc
  }, {})

  const timestamp = parts.t
  const signature = parts['v1']
  if (!timestamp || !signature) {
    res.statusCode = 400
    res.end('Invalid signature header')
    return
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`
  const expectedSig = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

  // Use timingSafeEqual
  const sigBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSig)
  let valid = false
  try {
    if (sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      valid = true
    }
  } catch (e) {
    valid = false
  }

  if (!valid) {
    console.error('Webhook signature verification failed')
    res.statusCode = 400
    res.end('Signature verification failed')
    return
  }

  let event
  try {
    event = JSON.parse(payload)
  } catch (e) {
    res.statusCode = 400
    res.end('Invalid payload')
    return
  }

  // Simple handler: log event to file (/tmp/stripe_events.log) for inspection
  const fs = require('fs')
  const logLine = `${new Date().toISOString()} ${event.type} ${event.id} ${JSON.stringify(event)}\n`;
  try {
    fs.appendFileSync('/tmp/stripe_events.log', logLine)
  } catch (e) {
    console.error('Failed to write log', e)
  }

  // Respond success
  res.statusCode = 200
  res.end('Received')
}
