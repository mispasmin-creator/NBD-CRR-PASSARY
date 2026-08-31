// Vercel serverless function — holds the Groq API key server-side so it never
// reaches the browser bundle. The chat widget calls this instead of Groq directly.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: "Server is not configured with a Groq API key" })
  }

  const { messages } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" })
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages,
        temperature: 0.4,
        max_tokens: 600,
      }),
    })

    const data = await groqRes.json()

    if (!groqRes.ok) {
      return res.status(groqRes.status).json({ error: data?.error?.message || "Groq API error" })
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate a response."
    return res.status(200).json({ reply })
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unexpected server error" })
  }
}
