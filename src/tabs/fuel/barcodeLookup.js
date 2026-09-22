export async function barcodeLookup(dataUrl) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 120, messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: dataUrl.split(",")[1] } },
      { type: "text", text: `Read the barcode number printed under the bars in this photo (UPC/EAN, 8 to 14 digits). Respond ONLY with JSON: {"code": "digits or empty string", "product": "product name if visible or empty"}` },
    ] }] }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const r = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  const code = String(r.code || "").replace(/\D/g, "");
  if (code.length < 8) throw new Error("nocode");
  const off = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_size`);
  const j = await off.json();
  if (!j.product) throw new Error("notfound");
  const n = j.product.nutriments || {};
  const per = n["energy-kcal_serving"] != null ? "serving" : "100g";
  const val = (k) => Math.round(+(n[`${k}_${per}`] ?? n[`${k}_100g`] ?? 0));
  return { name: `${j.product.brands ? `${j.product.brands} ` : ""}${j.product.product_name || r.product || "Product"} (${per === "serving" ? j.product.serving_size || "1 serving" : "100 g"})`.slice(0, 70), cal: val("energy-kcal"), p: val("proteins"), c: val("carbohydrates"), f: val("fat"), source: "official", note: `Open Food Facts · barcode ${code}` };
}
