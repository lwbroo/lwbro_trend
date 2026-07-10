/* Claude Vision: recognition only — identifies foods & portions in the photo.
 * GI values come from the local database (gidb.js) first; AI fallback values
 * are used only for foods the database doesn't know.
 * Eating order & tips are computed locally (order.js) at zero token cost. */
const GlycoAPI = (() => {
  const API_URL = "https://api.anthropic.com/v1/messages";

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

  /** Downscale the photo for upload; returns { data, thumb } (raw base64 JPEG) */
  function prepareImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          resolve({
            data: drawToJpeg(img, 1344, 0.85),
            thumb: drawToJpeg(img, 160, 0.6)
          });
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(I18n.t("err_read_image"))); };
      img.src = url;
    });
  }

  function drawToJpeg(img, maxEdge, quality) {
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality).split(",")[1];
  }

  /** Step 1: AI recognizes the photo → { foods: [...], photo_note } */
  async function recognize({ apiKey, model, imageBase64, note }) {
    const lang = I18n.getLang();
    const userText = lang === "zh"
      ? (note ? `請辨識這張餐點照片裡的食物。使用者補充：${note}` : "請辨識這張餐點照片裡的食物。")
      : (note ? `Identify the foods in this meal photo. User note: ${note}` : "Identify the foods in this meal photo.");

    const body = {
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT[lang] || SYSTEM_PROMPT.en,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
          { type: "text", text: userText }
        ]
      }]
    };

    let resp;
    try {
      resp = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          // Direct browser access — the key lives only on the user's own device
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error(I18n.t("err_network"));
    }

    if (!resp.ok) {
      let detail = "";
      try { detail = (await resp.json()).error?.message || ""; } catch {}
      if (resp.status === 401) throw new Error(I18n.t("err_key"));
      if (resp.status === 429) throw new Error(I18n.t("err_rate"));
      throw new Error(`${I18n.t("err_failed")} (${resp.status}) ${detail}`);
    }

    const message = await resp.json();

    if (message.stop_reason === "refusal") throw new Error(I18n.t("err_refusal"));
    if (message.stop_reason === "max_tokens") throw new Error(I18n.t("err_maxtokens"));

    const textBlock = (message.content || []).find(b => b.type === "text");
    if (!textBlock) throw new Error(I18n.t("err_noresult"));

    try {
      return JSON.parse(textBlock.text);
    } catch {
      throw new Error(I18n.t("err_format"));
    }
  }

  /** Step 2: match against the local DB — database first, AI values as fallback */
  function enrich(recognized) {
    const foods = (recognized.foods || []).map(item => {
      const hit = GIDB.lookup(item.name);
      const grams = Math.max(1, Number(item.grams) || 100);
      if (hit) {
        return {
          name: item.name,
          matched_as: hit.n === item.name ? null : hit.n,
          portion_desc: item.portion_desc || hit.u,
          category: hit.c,
          gi: hit.gi,
          gi_level: GIDB.giLevel(hit.gi),
          carbs_g: (hit.cb * grams) / 100,
          source: "db"
        };
      }
      const gi = Math.min(110, Math.max(0, Math.round(Number(item.gi_fallback) || 50)));
      return {
        name: item.name,
        matched_as: null,
        portion_desc: item.portion_desc || "",
        category: item.category === "other" ? "starch" : item.category,
        gi,
        gi_level: GIDB.giLevel(gi),
        carbs_g: ((Number(item.carbs100_fallback) || 0) * grams) / 100,
        source: "ai"
      };
    });
    return { foods, photo_note: recognized.photo_note || "" };
  }

  /** Full pipeline: recognize → DB match. The order/tips/summary are built by the
   *  app at render time so they always follow the current UI language. */
  async function analyzeMeal(opts) {
    const recognized = await recognize(opts);
    return enrich(recognized); // { foods, photo_note }
  }

  return { prepareImage, analyzeMeal, recognize, enrich };
})();
