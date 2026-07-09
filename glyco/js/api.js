/* Claude Vision: recognition only — identifies foods & portions in the photo.
 * GI values come from the local database (gidb.js) first; AI fallback values
 * are used only for foods the database doesn't know.
 * Eating order & tips are computed locally (order.js) at zero token cost. */
const GlycoAPI = (() => {
  const API_URL = "https://api.anthropic.com/v1/messages";

  const SYSTEM_PROMPT = `You are a food recognition assistant. The user sends a photo of a meal (possibly with a text note). Identify every food and drink in the photo.
Rules:
- Use common everyday food names in English (e.g. "White rice", "Fried chicken", "Bubble tea"); one entry per distinct item, don't merge
- grams = estimated weight of that item's portion (use ml as grams for drinks)
- For each item also include your own GI estimate and carbs per 100g as backup reference values
- If the photo is blurry or an item is uncertain, say so in photo_note; if there is no food, return an empty foods array
Recognition only — do not give any advice.`;

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
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read this image.")); };
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
    const userText = note
      ? `Identify the foods in this meal photo. User note: ${note}`
      : "Identify the foods in this meal photo.";

    const body = {
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
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
      throw new Error("Network error — please check your connection and try again.");
    }

    if (!resp.ok) {
      let detail = "";
      try { detail = (await resp.json()).error?.message || ""; } catch {}
      if (resp.status === 401) throw new Error("Invalid API key — please check it in Settings.");
      if (resp.status === 429) throw new Error("Too many requests — please wait a moment and retry.");
      throw new Error(`Analysis failed (${resp.status}) ${detail}`);
    }

    const message = await resp.json();

    if (message.stop_reason === "refusal") {
      throw new Error("The model declined to analyze this photo — please try a different meal photo.");
    }
    if (message.stop_reason === "max_tokens") {
      throw new Error("The response was cut off — please try again.");
    }

    const textBlock = (message.content || []).find(b => b.type === "text");
    if (!textBlock) throw new Error("No result received — please try again.");

    try {
      return JSON.parse(textBlock.text);
    } catch {
      throw new Error("Unexpected result format — please try again.");
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

  /** Full pipeline: recognize → DB match → local order engine */
  async function analyzeMeal(opts) {
    const recognized = await recognize(opts);
    const { foods, photo_note } = enrich(recognized);
    const { steps, tips, summary } = OrderEngine.plan(foods);
    return {
      meal_summary: summary,
      photo_note,
      foods,
      eating_order: steps,
      tips
    };
  }

  return { prepareImage, analyzeMeal, recognize, enrich };
})();
