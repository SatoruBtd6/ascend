export async function scanMealPhoto(dataUrl) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5", max_tokens: 500,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: dataUrl.split(",")[1] } },
        { type: "text", text: `Identify the food in this photo and estimate nutrition for what is visible, as one serving each. Use typical US portions and standard nutrition values. Be practical, not cautious. If it's a packaged product with a label, read the label. Respond ONLY with JSON: {"items": [{"name": "food with portion, e.g. Grilled chicken breast (6 oz)", "cal": n, "p": n, "c": n, "f": n}], "note": "under 12 words about confidence or what you assumed"}` },
      ] }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const r = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  return { note: r.note || "", items: (r.items || []).map((it) => ({ name: String(it.name || "Food").slice(0, 60), cal: Math.round(+it.cal || 0), p: Math.round(+it.p || 0), c: Math.round(+it.c || 0), f: Math.round(+it.f || 0) })) };
}
