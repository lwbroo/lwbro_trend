/* Claude Vision：只負責「辨識」照片中的食物與份量。
 * GI 值優先查本地資料庫（gidb.js），資料庫沒有的才用 AI 附帶的估計值。
 * 進食順序與建議由本地規則引擎（order.js）計算，不耗 token。 */
const GlycoAPI = (() => {
  const API_URL = "https://api.anthropic.com/v1/messages";

  const SYSTEM_PROMPT = `你是食物辨識助手。使用者會給你一張餐點照片（可能附文字補充），請辨識照片中所有食物與飲料。
規則：
- 名稱用台灣常見的通用稱呼（例如：白飯、滷雞腿、燙青菜、珍珠奶茶），一項一筆，不要合併
- grams 為該項份量的估計克數（飲料以毫升當克數）
- 每項附上你對該食物的 GI 估計值與每100克碳水克數，作為備用參考
- 若照片模糊或無法確認，在 photo_note 說明；照片中沒有食物則 foods 回傳空陣列
全部使用繁體中文，只做辨識，不要給任何建議。`;

  const OUTPUT_SCHEMA = {
    type: "object",
    properties: {
      foods: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "台灣常見稱呼" },
            grams: { type: "number", description: "估計克數（飲料為毫升）" },
            portion_desc: { type: "string", description: "份量口語描述，例如「一碗」" },
            category: { type: "string", enum: ["蔬菜", "蛋白質", "脂肪", "澱粉", "水果", "飲料", "點心", "其他"] },
            gi_fallback: { type: "integer", description: "GI 估計值 0-110" },
            carbs100_fallback: { type: "number", description: "每100g碳水克數估計" }
          },
          required: ["name", "grams", "portion_desc", "category", "gi_fallback", "carbs100_fallback"],
          additionalProperties: false
        }
      },
      photo_note: { type: "string", description: "照片狀況備註，沒有就空字串" }
    },
    required: ["foods", "photo_note"],
    additionalProperties: false
  };

  /** 將照片縮到適合上傳的大小，回傳 { data, thumb }（皆為不含前綴的 base64 JPEG） */
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
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("無法讀取這張圖片")); };
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

  /** 步驟一：AI 辨識照片 → { foods: [...], photo_note } */
  async function recognize({ apiKey, model, imageBase64, note }) {
    const userText = note
      ? `請辨識這張餐點照片裡的食物。使用者補充：${note}`
      : "請辨識這張餐點照片裡的食物。";

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
          // 允許瀏覽器直接呼叫 API（key 只存在使用者自己的裝置上）
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error("網路連線失敗，請確認網路後再試一次。");
    }

    if (!resp.ok) {
      let detail = "";
      try { detail = (await resp.json()).error?.message || ""; } catch {}
      if (resp.status === 401) throw new Error("API Key 無效，請到「設定」檢查。");
      if (resp.status === 429) throw new Error("請求太頻繁，稍等一下再試。");
      throw new Error(`分析失敗（${resp.status}）${detail}`);
    }

    const message = await resp.json();

    if (message.stop_reason === "refusal") {
      throw new Error("模型拒絕分析這張照片，請換一張餐點照片試試。");
    }
    if (message.stop_reason === "max_tokens") {
      throw new Error("回應被截斷，請再試一次。");
    }

    const textBlock = (message.content || []).find(b => b.type === "text");
    if (!textBlock) throw new Error("沒有收到分析結果，請再試一次。");

    try {
      return JSON.parse(textBlock.text);
    } catch {
      throw new Error("分析結果格式錯誤，請再試一次。");
    }
  }

  /** 步驟二：本地資料庫比對，資料庫優先、AI 估計值備援 */
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
        category: item.category === "其他" ? "澱粉" : item.category,
        gi,
        gi_level: GIDB.giLevel(gi),
        carbs_g: ((Number(item.carbs100_fallback) || 0) * grams) / 100,
        source: "ai"
      };
    });
    return { foods, photo_note: recognized.photo_note || "" };
  }

  /** 完整流程：辨識 → 資料庫比對 → 本地排序引擎 */
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
