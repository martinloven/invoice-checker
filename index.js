const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json({ limit: '20mb' }));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ✏️ PASTE YOUR PRICE LIST HERE — replace the examples with your real prices
const PRICE_LIST = `
  Labour: $85/hr
  Call out fee: $150
  skruer: $45 each
  Part B: $30 each
  (add your real prices here)
`;

app.post('/check-invoice', async (req, res) => {
  try {
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'No PDF provided' });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64
            }
          },
          {
            type: 'text',
            text: `You are an invoice auditor. Our agreed price list is:

${PRICE_LIST}

Review this invoice carefully. Check every line item against the price list above.

If you find any overcharges, list them clearly like this:
- Item: [name]
- Billed: $[amount]
- Should be: $[amount]
- Overcharge: $[difference]

Also extract the invoice/case ID number from the document and include it at the top of your reply like: "Case ID: XXXX"

If everything looks correct, just reply: "INVOICE OK - Case ID: XXXX"`
          }
        ]
      }]
    });

    const result = response.content[0].text;
    const isOvercharge = !result.includes('INVOICE OK');

    res.json({
      result,
      overchargeDetected: isOvercharge
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check so Railway knows the app is running
app.get('/', (req, res) => {
  res.json({ status: 'Invoice checker is running ✓' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
