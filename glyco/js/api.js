/* Claude Vision 分析：照片 → 食物清單 + GI + 進食順序 */
const GlycoAPI = (() => {
  const API_URL = "https://api.anthropic.com/v1/messages";

  const SYSTEM_PROMPT = `你是一位專精於血糖管理的營養師。使用者會給你一張餐點照片（可能附上文字補充），你要：
1. 辨識照片中所有的食物與飲料，估計份量。
2. 為每項食物估計升糖指數（GI）等級與數值、碳水化合物克數，並歸類（蔬菜／蛋白質／脂肪／澱粉／水果／飲料／其他）。
3. 根據「先纖維、再蛋白質與脂肪、澱粉與糖最後」的原則，給出具體的進食順序，並簡短說明每一步的理由。
4. 給 2–4 條針對這一餐的控糖建議（例如飯量減半、飲料換無糖、餐後散步等）。
全部使用繁體中文。份量與 GI 為合理估計即可，若照片模糊或無法辨識某項食物，在該項的 note 中說明。若照片中沒有食物，foods 回傳空陣列並在 meal_summary 說明。`;

  const OUTPUT_SCHEMA = {
    type: "object",
    properties: {
      meal_summary: { type: "string", description: "這一餐的一句話總結，包含整體升糖負擔評估" },
      foods: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            portion: { type: "string", description: "估計份量，例如「一碗約200g」" },
            category: { type: "string", enum: ["蔬菜", "蛋白質", "脂肪", "澱粉", "水果", "飲料", "其他"] },
            gi_level: { type: "string", enum: ["低", "中", "高"] },
            gi_estimate: { type: "integer", description: "估計 GI 值 0-110" },
            carbs_g: { type: "number", description: "估計碳水化合物克數" },
            note: { type: "string", description: "補充說明，沒有就給空字串" }
          },
          required: ["name", "portion", "category", "gi_level", "gi_estimate", "carbs_g", "note"],
          additionalProperties: false
        }
      },
      eating_order: {
        type: "array",
        items: {
          type: "object",
          properties: {
            items: { type: "array", items: { type: "string" }, description: "這一步要吃的食物名稱" },
            reason: { type: "string", description: "為什麼這一步先吃這些" }
          },
          required: ["items", "reason"],
          additionalProperties: false
        }
      },
      tips: { type: "array", items: { type: "string" } }
    },
    required: ["meal_summary", "foods", "eating_order", "tips"],
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

  /** 呼叫 Claude 分析餐點照片，回傳結構化結果 */
  async function analyzeMeal({ apiKey, model, imageBase64, note }) {
    const userText = note
      ? `請分析這張餐點照片。使用者補充：${note}`
      : "請分析這張餐點照片。";

    const body = {
      model,
      max_tokens: 4096,
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

  return { prepareImage, analyzeMeal };
})();
