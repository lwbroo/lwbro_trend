/* Local rule engine: eating order + tips + meal summary (pure logic, zero tokens) */
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

    const steps = [];
    if (veg.length) steps.push({
      items: veg.map(f => f.name),
      reason: "Fiber first — it forms a barrier that slows the absorption of the sugars that follow"
    });
    if (protein.length) steps.push({
      items: protein.map(f => f.name),
      reason: "Protein & fat trigger incretin hormones that slow stomach emptying and boost satiety"
    });
    if (starch.length) steps.push({
      items: starch.map(f => f.name),
      reason: "Starches last — eaten now, they raise your glucose far more gently"
    });
    if (fruit.length) steps.push({
      items: fruit.map(f => f.name),
      reason: "Fruit at the very end, in a small portion — never on an empty stomach"
    });
    if (sugaryDrinks.length) steps.push({
      items: sugaryDrinks.map(f => f.name),
      reason: "Sugary drinks spike fastest — save them for last and sip sparingly (unsweetened is best)"
    });
    if (freeDrinks.length && steps.length) {
      steps[0].reason += `; ${freeDrinks.map(f => f.name).join(", ")} is sugar-free — sip anytime`;
    }
    if (!steps.length && foods.length) steps.push({
      items: foods.map(f => f.name),
      reason: "Eat slowly and chew well — pacing alone flattens the glucose curve"
    });

    return { steps, tips: makeTips({ veg, starch, fruit, sugaryDrinks, foods }), summary: makeSummary(foods) };
  }

  function makeTips({ veg, starch, fruit, sugaryDrinks, foods }) {
    const tips = [];
    const highStarch = starch.filter(f => f.gi >= 70);
    if (highStarch.length) {
      tips.push(`${highStarch.map(f => f.name).join(", ")} is high-GI — consider cutting the portion by ¼–⅓, or swapping for a lower-GI option (brown rice, whole grain, sourdough)`);
    }
    if (sugaryDrinks.length) {
      tips.push(`${sugaryDrinks.map(f => f.name).join(", ")} → switching to unsweetened or diet is the single easiest glucose win in this meal`);
    }
    if (!veg.length) {
      tips.push("No vegetables in this meal — adding a side of greens or a salad would noticeably flatten the curve");
    }
    const totalCarbs = foods.reduce((s, f) => s + (f.carbs_g || 0), 0);
    if (totalCarbs >= 90) {
      tips.push(`Total carbs ≈ ${Math.round(totalCarbs)}g is on the high side — a 10–15 min walk right after eating blunts the spike`);
    }
    if (fruit.length && fruit.some(f => f.gi >= 60)) {
      tips.push("The fruit here is mid/high GI — keep it to one fist-sized serving");
    }
    if (tips.length < 2) tips.push("Slow down between steps — stretching the meal past 20 minutes flattens the glucose curve");
    if (tips.length < 2) tips.push("Stop at 80% full — eating order works best when you don't overeat");
    return tips.slice(0, 4);
  }

  /** Meal stats: total carbs + glycemic load (GL = Σ GI × carbs / 100) */
  function stats(foods) {
    const totalCarbs = foods.reduce((s, f) => s + (f.carbs_g || 0), 0);
    const totalGL = foods.reduce((s, f) => s + (f.gi * (f.carbs_g || 0)) / 100, 0);
    const level = totalGL < 20 ? "Light" : totalGL < 40 ? "Moderate" : "High";
    return { count: foods.length, totalCarbs, totalGL, level };
  }

  function makeSummary(foods) {
    if (!foods.length) return "No food detected.";
    const s = stats(foods);
    return `${s.count} items · ~${Math.round(s.totalCarbs)}g carbs · glycemic load ≈ ${Math.round(s.totalGL)} (${s.level}).`;
  }

  return { plan, stats };
})();
