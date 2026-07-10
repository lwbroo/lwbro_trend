/* Local rule engine: eating order + tips + meal summary (pure logic, zero tokens)
 * All user-facing strings go through I18n.t() so the plan follows the UI language. */
const OrderEngine = (() => {

  /** foods: [{name, category, gi, gi_level, carbs_g, source}] */
  function plan(foods) {
    const veg = foods.filter(f => f.category === "vegetable");
    const protein = foods.filter(f => f.category === "protein" || f.category === "fat");
    const starch = foods.filter(f => f.category === "starch" || f.category === "dessert");
    const fruit = foods.filter(f => f.category === "fruit");
    const drinks = foods.filter(f => f.category === "drink");
    const sugaryDrinks = drinks.filter(d => d.gi >= 40);
    const freeDrinks = drinks.filter(d => d.gi < 40);
    const names = arr => arr.map(f => f.name).join(I18n.getLang() === "zh" ? "、" : ", ");

    const steps = [];
    if (veg.length) steps.push({ items: veg.map(f => f.name), reason: I18n.t("r_fiber") });
    if (protein.length) steps.push({ items: protein.map(f => f.name), reason: I18n.t("r_protein") });
    if (starch.length) steps.push({ items: starch.map(f => f.name), reason: I18n.t("r_starch") });
    if (fruit.length) steps.push({ items: fruit.map(f => f.name), reason: I18n.t("r_fruit") });
    if (sugaryDrinks.length) steps.push({ items: sugaryDrinks.map(f => f.name), reason: I18n.t("r_sugary") });
    if (freeDrinks.length && steps.length) {
      steps[0].reason += I18n.t("r_freedrink", { items: names(freeDrinks) });
    }
    if (!steps.length && foods.length) steps.push({ items: foods.map(f => f.name), reason: I18n.t("r_pace") });

    return { steps, tips: makeTips({ veg, starch, fruit, sugaryDrinks, foods, names }), summary: makeSummary(foods) };
  }

  function makeTips({ veg, starch, fruit, sugaryDrinks, foods, names }) {
    const tips = [];
    const highStarch = starch.filter(f => f.gi >= 70);
    if (highStarch.length) tips.push(I18n.t("t_high_starch", { items: names(highStarch) }));
    if (sugaryDrinks.length) tips.push(I18n.t("t_sugary", { items: names(sugaryDrinks) }));
    if (!veg.length) tips.push(I18n.t("t_no_veg"));
    const totalCarbs = foods.reduce((s, f) => s + (f.carbs_g || 0), 0);
    if (totalCarbs >= 90) tips.push(I18n.t("t_high_carbs", { c: Math.round(totalCarbs) }));
    if (fruit.length && fruit.some(f => f.gi >= 60)) tips.push(I18n.t("t_high_fruit"));
    if (tips.length < 2) tips.push(I18n.t("t_slow"));
    if (tips.length < 2) tips.push(I18n.t("t_stop_full"));
    return tips.slice(0, 4);
  }

  /** Meal stats: total carbs + glycemic load (GL = Σ GI × carbs / 100) */
  function stats(foods) {
    const totalCarbs = foods.reduce((s, f) => s + (f.carbs_g || 0), 0);
    const totalGL = foods.reduce((s, f) => s + (f.gi * (f.carbs_g || 0)) / 100, 0);
    const level = totalGL < 20 ? "light" : totalGL < 40 ? "moderate" : "high"; // key
    return { count: foods.length, totalCarbs, totalGL, level };
  }

  function makeSummary(foods) {
    if (!foods.length) return I18n.t("no_food");
    const s = stats(foods);
    return I18n.t("summary", {
      n: s.count, c: Math.round(s.totalCarbs), gl: Math.round(s.totalGL), level: I18n.t("gl_" + s.level)
    });
  }

  return { plan, stats };
})();
