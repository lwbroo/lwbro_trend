/* Calls the GlycoOrder backend proxy (glyco-server) instead of Anthropic directly.
 * The proxy holds the Anthropic key server-side, runs recognition on Claude Haiku 4.5,
 * and enforces the free-tier weekly quota / paid-tier entitlement — this file no longer
 * needs (or accepts) a user-supplied API key or a model choice.
 * GI values come from the local database (gidb.js) first; AI fallback values are used
 * only for foods the database doesn't know. Eating order & tips are computed locally
 * (order.js) at zero token cost. */
const GlycoAPI = (() => {
  // TODO: point at the deployed glyco-server Render URL once it exists.
  const PROXY_BASE = "https://glycoorder-api.onrender.com";
  const PROXY_URL = `${PROXY_BASE}/api/analyze`;

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

  /** Step 1: proxy recognizes the photo → { foods: [...], photo_note, quota } */
  async function recognize({ deviceId, imageBase64, note }) {
    let resp;
    try {
      resp = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId, imageBase64, note, lang: I18n.getLang() })
      });
    } catch (e) {
      throw new Error(I18n.t("err_network"));
    }

    if (resp.status === 402) {
      const body = await resp.json().catch(() => ({}));
      const err = new Error(I18n.t("quota_exceeded_body"));
      err.code = "quota_exceeded";
      err.quota = body.quota || null;
      throw err;
    }

    if (!resp.ok) {
      if (resp.status === 429) throw new Error(I18n.t("err_rate"));
      if (resp.status === 422) throw new Error(I18n.t("err_refusal"));
      throw new Error(I18n.t("err_service"));
    }

    return resp.json(); // { foods, photo_note, quota }
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
    return { foods, photo_note: recognized.photo_note || "", quota: recognized.quota || null };
  }

  /** Full pipeline: recognize (via proxy) → DB match. The order/tips/summary are built
   *  by the app at render time so they always follow the current UI language. */
  async function analyzeMeal(opts) {
    const recognized = await recognize(opts);
    return enrich(recognized); // { foods, photo_note, quota }
  }

  return { prepareImage, analyzeMeal, recognize, enrich, PROXY_BASE };
})();
