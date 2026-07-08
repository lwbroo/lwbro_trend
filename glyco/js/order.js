/* 本地規則引擎：進食順序 + 控糖建議 + 整餐摘要（不用 AI，純邏輯） */
const OrderEngine = (() => {

  /** foods: [{name, category, gi, gi_level, carbs_g, source}] */
  function plan(foods) {
    const veg = foods.filter(f => f.category === "蔬菜");
    const protein = foods.filter(f => f.category === "蛋白質" || f.category === "脂肪");
    const starch = foods.filter(f => f.category === "澱粉" || f.category === "點心");
    const fruit = foods.filter(f => f.category === "水果");
    const drinks = foods.filter(f => f.category === "飲料");
    const sugaryDrinks = drinks.filter(d => d.gi >= 40);
    const freeDrinks = drinks.filter(d => d.gi < 40);

    const steps = [];
    if (veg.length) steps.push({
      items: veg.map(f => f.name),
      reason: "蔬菜的纖維先進胃，形成屏障減緩後續糖分吸收"
    });
    if (protein.length) steps.push({
      items: protein.map(f => f.name),
      reason: "蛋白質與脂肪刺激腸泌素分泌，延緩胃排空、增加飽足感"
    });
    if (starch.length) steps.push({
      items: starch.map(f => f.name),
      reason: "澱粉放最後吃，此時血糖上升速度最平緩"
    });
    if (fruit.length) steps.push({
      items: fruit.map(f => f.name),
      reason: "水果含果糖，放餐末少量吃，避免空腹吃造成血糖快速上升"
    });
    if (sugaryDrinks.length) steps.push({
      items: sugaryDrinks.map(f => f.name),
      reason: "含糖飲料升糖最快，留到最後且盡量少喝（能換無糖最好）"
    });
    if (freeDrinks.length && steps.length) {
      steps[0].reason += `；${freeDrinks.map(f => f.name).join("、")}無糖，隨餐喝即可`;
    }
    if (!steps.length && foods.length) steps.push({
      items: foods.map(f => f.name),
      reason: "細嚼慢嚥、放慢速度，血糖上升會比較平緩"
    });

    return { steps, tips: makeTips({ veg, protein, starch, fruit, sugaryDrinks, foods }), summary: makeSummary(foods) };
  }

  function makeTips({ veg, starch, fruit, sugaryDrinks, foods }) {
    const tips = [];
    const highStarch = starch.filter(f => f.gi >= 70);
    if (highStarch.length) {
      tips.push(`${highStarch.map(f => f.name).join("、")}屬高 GI，可考慮減量 1/4～1/3，或換成糙米、全麥等低 GI 版本`);
    }
    if (sugaryDrinks.length) {
      tips.push(`${sugaryDrinks.map(f => f.name).join("、")}建議改無糖或微糖，這是這餐最容易省下的血糖負擔`);
    }
    if (!veg.length) {
      tips.push("這一餐缺乏蔬菜，若能加一份燙青菜或沙拉，控糖效果會明顯更好");
    }
    const totalCarbs = foods.reduce((s, f) => s + (f.carbs_g || 0), 0);
    if (totalCarbs >= 90) {
      tips.push(`整餐碳水約 ${Math.round(totalCarbs)}g 偏高，餐後散步 10–15 分鐘能有效壓低血糖峰值`);
    }
    if (fruit.length && fruit.some(f => f.gi >= 60)) {
      tips.push("這餐的水果屬中高 GI，控制在一份（約一個拳頭）以內");
    }
    if (tips.length < 2) tips.push("每一步之間放慢速度、細嚼慢嚥，整餐拉長到 20 分鐘以上");
    if (tips.length < 2) tips.push("用餐順序的效果需要吃到七、八分飽內才明顯，避免過量");
    return tips.slice(0, 4);
  }

  /** 整餐統計：總碳水 + 總升糖負荷（GL = Σ GI × 碳水 / 100） */
  function stats(foods) {
    const totalCarbs = foods.reduce((s, f) => s + (f.carbs_g || 0), 0);
    const totalGL = foods.reduce((s, f) => s + (f.gi * (f.carbs_g || 0)) / 100, 0);
    const level = totalGL < 20 ? "輕度" : totalGL < 40 ? "中等" : "偏高";
    return { count: foods.length, totalCarbs, totalGL, level };
  }

  function makeSummary(foods) {
    if (!foods.length) return "沒有辨識到食物。";
    const s = stats(foods);
    return `共 ${s.count} 項，碳水約 ${Math.round(s.totalCarbs)}g，整餐升糖負荷 GL ≈ ${Math.round(s.totalGL)}（${s.level}）。`;
  }

  return { plan, stats };
})();
