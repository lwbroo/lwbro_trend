/* Server-side food recognition call. Moved here from the client (glyco/js/api.js) so the
 * Anthropic API key never ships to a browser/app bundle, and the prompt/schema can be
 * tuned without a client release. Model is intentionally hardcoded — the client no longer
 * gets to pick (fewer client-controlled knobs, no way to force expensive calls through). */
const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 2048;

const SYSTEM_PROMPT = {
  en: `You are a food recognition assistant. The user sends a photo of a meal (possibly with a text note). Identify every food and drink in the photo.
Rules:
- Use common everyday food names in English (e.g. "White rice", "Fried chicken", "Bubble tea"); one entry per distinct item, don't merge
- grams = estimated weight of that item's portion (use ml as grams for drinks)
- For each item also include your own GI estimate and carbs per 100g as backup reference values
- If the photo is blurry or an item is uncertain, say so in photo_note; if there is no food, return an empty foods array
Recognition only — do not give any advice.`,
  zh: `你是食物辨識助手。使用者會給你一張餐點照片（可能附文字補充），請辨識照片中所有食物與飲料。
規則：
- 名稱用台灣常見的通用稱呼（例如：白飯、炸雞、珍珠奶茶），一項一筆，不要合併
- grams 為該項份量的估計克數（飲料以毫升當克數）
- 每項附上你對該食物的 GI 估計值與每100克碳水克數，作為備用參考
- 若照片模糊或無法確認，在 photo_note 說明；照片中沒有食物則 foods 回傳空陣列
只做辨識，不要給任何建議。`
};

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    foods: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "common English food name" },
          grams: { type: "number", description: "estimated grams (ml for drinks)" },
          portion_desc: { type: "string", description: "human portion description, e.g. '1 bowl'" },
          category: { type: "string", enum: ["vegetable", "protein", "fat", "starch", "fruit", "drink", "dessert", "other"] },
          gi_fallback: { type: "integer", description: "estimated GI 0-110" },
          carbs100_fallback: { type: "number", description: "estimated carbs per 100g" }
        },
        required: ["name", "grams", "portion_desc", "category", "gi_fallback", "carbs100_fallback"],
        additionalProperties: false
      }
    },
    photo_note: { type: "string", description: "note about photo quality/uncertainty, empty string if none" }
  },
  required: ["foods", "photo_note"],
  additionalProperties: false
};

function userText(lang, note) {
  return lang === "zh"
    ? (note ? `請辨識這張餐點照片裡的食物。使用者補充：${note}` : "請辨識這張餐點照片裡的食物。")
    : (note ? `Identify the foods in this meal photo. User note: ${note}` : "Identify the foods in this meal photo.");
}

/** Custom error carrying the failure kind so routes can map it to the right HTTP status
 * without re-deriving it from the message string. */
class RecognitionError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // "network" | "rate_limited" | "refusal" | "max_tokens" | "bad_response" | "upstream"
  }
}

/** Calls Anthropic and returns the raw recognition JSON: { foods, photo_note }. */
async function recognize({ imageBase64, note, lang }) {
  const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT[lang] || SYSTEM_PROMPT.en,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
        { type: "text", text: userText(lang, note) }
      ]
    }]
  };

  let resp;
  try {
    resp = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });
  } catch {
    throw new RecognitionError("network", "network error calling Anthropic");
  }

  if (!resp.ok) {
    if (resp.status === 429) throw new RecognitionError("rate_limited", "Anthropic rate limited");
    throw new RecognitionError("upstream", `Anthropic returned ${resp.status}`);
  }

  const message = await resp.json();
  if (message.stop_reason === "refusal") throw new RecognitionError("refusal", "model declined the request");
  if (message.stop_reason === "max_tokens") throw new RecognitionError("max_tokens", "response truncated");

  const textBlock = (message.content || []).find(b => b.type === "text");
  if (!textBlock) throw new RecognitionError("bad_response", "no text content in response");

  try {
    return JSON.parse(textBlock.text);
  } catch {
    throw new RecognitionError("bad_response", "response was not valid JSON");
  }
}

module.exports = { recognize, RecognitionError, MODEL };
