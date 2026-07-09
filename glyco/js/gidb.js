/* Local GI database
 * gi: glycemic index (glucose = 100; primarily referenced from the University
 *     of Sydney GI Database and common nutrition literature)
 * cb: carbohydrate grams per 100g (approximate)
 * p:  typical portion in grams; u: portion label
 * categories: starch / vegetable / protein / fat / fruit / drink / dessert
 * GI level: <=55 Low, 56-69 Medium, >=70 High
 * Aliases include Chinese names so Asian meals still match.
 */
const GIDB = (() => {
  const F = [
    /* ── Starches & staples ── */
    { n:"White rice", a:["rice","steamed rice","白飯","白米飯","米飯"], c:"starch", gi:84, cb:41, p:200, u:"1 bowl" },
    { n:"Brown rice", a:["糙米飯","糙米"], c:"starch", gi:60, cb:37, p:200, u:"1 bowl" },
    { n:"Multigrain rice", a:["mixed grain rice","五穀飯","雜糧飯","十穀飯"], c:"starch", gi:55, cb:36, p:200, u:"1 bowl" },
    { n:"Sticky rice", a:["glutinous rice","糯米飯","糯米","油飯"], c:"starch", gi:87, cb:42, p:180, u:"1 bowl" },
    { n:"Congee", a:["rice porridge","porridge","白粥","稀飯","粥"], c:"starch", gi:88, cb:17, p:300, u:"1 bowl" },
    { n:"Fried rice", a:["炒飯","蛋炒飯"], c:"starch", gi:80, cb:35, p:250, u:"1 plate" },
    { n:"Braised pork rice", a:["braised pork on rice","lu rou fan","滷肉飯","魯肉飯","肉燥飯"], c:"starch", gi:80, cb:34, p:250, u:"1 bowl" },
    { n:"Curry rice", a:["curry with rice","咖哩飯"], c:"starch", gi:78, cb:30, p:350, u:"1 plate" },
    { n:"Sushi", a:["sushi roll","壽司"], c:"starch", gi:73, cb:30, p:180, u:"8 pieces" },
    { n:"Rice ball", a:["onigiri","飯糰"], c:"starch", gi:78, cb:36, p:150, u:"1 piece" },
    { n:"Risotto", a:[], c:"starch", gi:69, cb:23, p:250, u:"1 plate" },
    { n:"Quinoa", a:["藜麥"], c:"starch", gi:53, cb:21, p:185, u:"1 cup" },
    { n:"Couscous", a:[], c:"starch", gi:65, cb:23, p:150, u:"1 serving" },
    { n:"Noodles", a:["wheat noodles","noodle soup","陽春麵","麵條","湯麵","油麵","拉麵","ramen"], c:"starch", gi:65, cb:26, p:250, u:"1 bowl" },
    { n:"Beef noodle soup", a:["牛肉麵"], c:"starch", gi:65, cb:22, p:450, u:"1 bowl" },
    { n:"Stir-fried noodles", a:["chow mein","fried noodles","炒麵"], c:"starch", gi:70, cb:28, p:250, u:"1 plate" },
    { n:"Udon", a:["烏龍麵"], c:"starch", gi:62, cb:21, p:300, u:"1 bowl" },
    { n:"Soba", a:["buckwheat noodles","蕎麥麵"], c:"starch", gi:54, cb:24, p:250, u:"1 bowl" },
    { n:"Pasta", a:["spaghetti","義大利麵","義麵"], c:"starch", gi:49, cb:27, p:250, u:"1 plate" },
    { n:"Macaroni and cheese", a:["mac and cheese","通心粉"], c:"starch", gi:64, cb:20, p:250, u:"1 plate" },
    { n:"Glass noodles", a:["mung bean noodles","冬粉","粉絲"], c:"starch", gi:33, cb:20, p:200, u:"1 bowl" },
    { n:"Rice vermicelli", a:["rice noodles thin","米粉","炒米粉"], c:"starch", gi:61, cb:25, p:200, u:"1 bowl" },
    { n:"Rice noodles", a:["flat rice noodles","pho noodles","粿條","河粉","板條"], c:"starch", gi:75, cb:24, p:250, u:"1 bowl" },
    { n:"Pho", a:["vietnamese noodle soup","越南河粉"], c:"starch", gi:60, cb:16, p:450, u:"1 bowl" },
    { n:"Pad thai", a:["泰式炒河粉"], c:"starch", gi:60, cb:25, p:300, u:"1 plate" },
    { n:"White bread", a:["toast","white toast","白吐司","吐司","土司"], c:"starch", gi:75, cb:49, p:60, u:"2 slices" },
    { n:"Whole wheat bread", a:["wholemeal bread","whole grain bread","全麥吐司","全麥麵包"], c:"starch", gi:69, cb:44, p:60, u:"2 slices" },
    { n:"Sourdough bread", a:["sourdough"], c:"starch", gi:54, cb:47, p:60, u:"2 slices" },
    { n:"Baguette", a:["french bread","法國麵包"], c:"starch", gi:95, cb:55, p:60, u:"1 piece" },
    { n:"Bagel", a:["貝果"], c:"starch", gi:72, cb:50, p:90, u:"1 bagel" },
    { n:"Croissant", a:["可頌","牛角麵包"], c:"starch", gi:67, cb:45, p:60, u:"1 piece" },
    { n:"Sweet bun", a:["pineapple bun","菠蘿麵包","甜麵包"], c:"starch", gi:75, cb:55, p:80, u:"1 bun" },
    { n:"Steamed bun", a:["mantou","饅頭"], c:"starch", gi:88, cb:47, p:100, u:"1 bun" },
    { n:"Pork bun", a:["baozi","steamed pork bun","肉包","包子"], c:"starch", gi:63, cb:38, p:110, u:"1 bun" },
    { n:"Dumplings", a:["potstickers","gyoza","水餃","餃子","鍋貼"], c:"starch", gi:52, cb:25, p:200, u:"10 pieces" },
    { n:"Scallion pancake", a:["green onion pancake","蔥油餅"], c:"starch", gi:75, cb:40, p:120, u:"1 piece" },
    { n:"Egg crepe", a:["danbing","taiwanese egg crepe","蛋餅"], c:"starch", gi:60, cb:25, p:150, u:"1 roll" },
    { n:"Turnip cake", a:["radish cake","蘿蔔糕"], c:"starch", gi:75, cb:25, p:150, u:"2 pieces" },
    { n:"Pancakes", a:["hotcakes","鬆餅"], c:"starch", gi:67, cb:28, p:150, u:"2 pancakes" },
    { n:"Waffle", a:["waffles"], c:"starch", gi:76, cb:33, p:100, u:"1 waffle" },
    { n:"Tortilla", a:["flour tortilla","wrap"], c:"starch", gi:30, cb:45, p:60, u:"1 piece" },
    { n:"Naan", a:["印度烤餅"], c:"starch", gi:71, cb:50, p:90, u:"1 piece" },
    { n:"Pizza", a:["pizza slice","披薩"], c:"starch", gi:60, cb:30, p:120, u:"1 slice" },
    { n:"Hamburger", a:["burger","cheeseburger","漢堡"], c:"starch", gi:66, cb:24, p:220, u:"1 burger" },
    { n:"Sandwich", a:["三明治"], c:"starch", gi:59, cb:24, p:200, u:"1 sandwich" },
    { n:"Hot dog with bun", a:["hot dog","大亨堡"], c:"starch", gi:60, cb:22, p:150, u:"1 piece" },
    { n:"Burrito", a:["墨西哥捲餅"], c:"starch", gi:55, cb:22, p:300, u:"1 burrito" },
    { n:"Taco", a:["塔可"], c:"starch", gi:52, cb:20, p:150, u:"2 tacos" },
    { n:"Potato", a:["boiled potato","baked potato","馬鈴薯","洋芋"], c:"starch", gi:78, cb:17, p:150, u:"1 medium" },
    { n:"Mashed potatoes", a:["薯泥","馬鈴薯泥"], c:"starch", gi:85, cb:15, p:150, u:"1 serving" },
    { n:"French fries", a:["fries","薯條"], c:"starch", gi:75, cb:38, p:110, u:"medium" },
    { n:"Hash browns", a:["薯餅"], c:"starch", gi:75, cb:24, p:80, u:"1 piece" },
    { n:"Roasted sweet potato", a:["baked sweet potato","烤地瓜","烤番薯"], c:"starch", gi:94, cb:28, p:150, u:"1 medium" },
    { n:"Steamed sweet potato", a:["sweet potato","boiled sweet potato","蒸地瓜","地瓜","番薯"], c:"starch", gi:63, cb:27, p:150, u:"1 medium" },
    { n:"Taro", a:["芋頭"], c:"starch", gi:53, cb:25, p:100, u:"1 serving" },
    { n:"Pumpkin", a:["squash","南瓜"], c:"starch", gi:75, cb:9, p:150, u:"1 serving" },
    { n:"Yam", a:["chinese yam","山藥"], c:"starch", gi:53, cb:20, p:100, u:"1 serving" },
    { n:"Corn", a:["sweet corn","corn on the cob","玉米"], c:"starch", gi:52, cb:18, p:150, u:"1 ear" },
    { n:"Instant oatmeal", a:["instant oats","quick oats","即食燕麥","麥片"], c:"starch", gi:83, cb:62, p:40, u:"1 serving" },
    { n:"Rolled oats", a:["oatmeal","steel cut oats","傳統燕麥","燕麥"], c:"starch", gi:55, cb:60, p:40, u:"1 serving" },
    { n:"Corn flakes", a:["cereal","breakfast cereal","玉米片"], c:"starch", gi:81, cb:84, p:30, u:"1 bowl" },
    { n:"Granola", a:["muesli"], c:"starch", gi:61, cb:60, p:50, u:"1 serving" },
    { n:"Crackers", a:["saltine crackers","soda crackers","蘇打餅乾"], c:"starch", gi:70, cb:70, p:30, u:"small pack" },

    /* ── Vegetables ── */
    { n:"Leafy greens", a:["sauteed greens","stir-fried greens","boiled greens","greens","燙青菜","青菜","炒青菜","地瓜葉","空心菜","菠菜","spinach","青江菜","bok choy","kale"], c:"vegetable", gi:15, cb:4, p:100, u:"1 serving" },
    { n:"Salad", a:["garden salad","green salad","生菜沙拉","沙拉","生菜","lettuce"], c:"vegetable", gi:15, cb:3, p:100, u:"1 bowl" },
    { n:"Cabbage", a:["高麗菜","大白菜","白菜"], c:"vegetable", gi:15, cb:5, p:100, u:"1 serving" },
    { n:"Broccoli", a:["青花菜","綠花椰","花椰菜","cauliflower","白花椰"], c:"vegetable", gi:15, cb:4, p:100, u:"1 serving" },
    { n:"Cucumber", a:["小黃瓜","黃瓜"], c:"vegetable", gi:15, cb:2, p:100, u:"1 serving" },
    { n:"Tomato", a:["cherry tomatoes","番茄","小番茄"], c:"vegetable", gi:30, cb:4, p:100, u:"1 medium" },
    { n:"Bitter melon", a:["苦瓜"], c:"vegetable", gi:15, cb:3, p:100, u:"1 serving" },
    { n:"Eggplant", a:["aubergine","茄子"], c:"vegetable", gi:15, cb:5, p:100, u:"1 serving" },
    { n:"Green beans", a:["string beans","四季豆","敏豆"], c:"vegetable", gi:30, cb:6, p:100, u:"1 serving" },
    { n:"Bean sprouts", a:["豆芽菜","豆芽"], c:"vegetable", gi:15, cb:3, p:100, u:"1 serving" },
    { n:"Onion", a:["洋蔥"], c:"vegetable", gi:15, cb:9, p:80, u:"half" },
    { n:"Carrot", a:["紅蘿蔔","胡蘿蔔"], c:"vegetable", gi:47, cb:8, p:80, u:"half" },
    { n:"Bamboo shoots", a:["竹筍","筍子"], c:"vegetable", gi:15, cb:4, p:100, u:"1 serving" },
    { n:"Mushrooms", a:["shiitake","king oyster mushroom","香菇","菇類","蘑菇","杏鮑菇","金針菇","enoki"], c:"vegetable", gi:15, cb:5, p:80, u:"1 serving" },
    { n:"Wood ear", a:["black fungus","木耳","黑木耳"], c:"vegetable", gi:15, cb:7, p:80, u:"1 serving" },
    { n:"Seaweed", a:["kelp","wakame","海帶","海帶芽","昆布"], c:"vegetable", gi:15, cb:4, p:80, u:"1 serving" },
    { n:"Okra", a:["秋葵"], c:"vegetable", gi:20, cb:7, p:80, u:"1 serving" },
    { n:"Asparagus", a:["蘆筍"], c:"vegetable", gi:15, cb:4, p:80, u:"1 serving" },
    { n:"Celery", a:["芹菜"], c:"vegetable", gi:15, cb:3, p:80, u:"1 serving" },
    { n:"Bell pepper", a:["sweet pepper","甜椒","彩椒","青椒"], c:"vegetable", gi:15, cb:5, p:80, u:"1 serving" },
    { n:"Zucchini", a:["courgette","櫛瓜","絲瓜","loofah"], c:"vegetable", gi:15, cb:4, p:100, u:"1 serving" },
    { n:"Winter melon", a:["冬瓜"], c:"vegetable", gi:15, cb:2, p:100, u:"1 serving" },
    { n:"Daikon", a:["white radish","白蘿蔔","蘿蔔"], c:"vegetable", gi:25, cb:4, p:100, u:"1 serving" },
    { n:"Kimchi", a:["泡菜","韓式泡菜"], c:"vegetable", gi:20, cb:5, p:50, u:"small dish" },
    { n:"Coleslaw", a:["涼拌高麗菜"], c:"vegetable", gi:30, cb:8, p:80, u:"1 serving" },

    /* ── Protein ── */
    { n:"Chicken breast", a:["grilled chicken","poached chicken","雞胸肉"], c:"protein", gi:0, cb:0, p:120, u:"1 serving" },
    { n:"Chicken thigh", a:["roasted chicken","braised chicken leg","雞腿","滷雞腿","烤雞腿"], c:"protein", gi:0, cb:0, p:120, u:"1 piece" },
    { n:"Fried chicken", a:["chicken cutlet","popcorn chicken","炸雞","雞排","炸雞排","鹹酥雞"], c:"protein", gi:30, cb:10, p:150, u:"1 serving" },
    { n:"Chicken nuggets", a:["雞塊"], c:"protein", gi:46, cb:15, p:100, u:"6 pieces" },
    { n:"Fish", a:["grilled fish","steamed fish","pan-fried fish","魚","煎魚","蒸魚","烤魚","鱈魚","cod","tilapia","虱目魚"], c:"protein", gi:0, cb:0, p:100, u:"1 fillet" },
    { n:"Salmon", a:["鮭魚"], c:"protein", gi:0, cb:0, p:100, u:"1 fillet" },
    { n:"Tuna", a:["鮪魚"], c:"protein", gi:0, cb:0, p:100, u:"1 serving" },
    { n:"Mackerel", a:["鯖魚"], c:"protein", gi:0, cb:0, p:100, u:"1 fillet" },
    { n:"Shrimp", a:["prawns","蝦子","蝦","蝦仁"], c:"protein", gi:0, cb:0, p:80, u:"1 serving" },
    { n:"Squid", a:["calamari","花枝","魷魚","透抽","小卷"], c:"protein", gi:0, cb:1, p:80, u:"1 serving" },
    { n:"Clams", a:["蛤蜊","蛤蠣"], c:"protein", gi:0, cb:2, p:80, u:"1 serving" },
    { n:"Oysters", a:["牡蠣","蚵仔"], c:"protein", gi:0, cb:4, p:80, u:"1 serving" },
    { n:"Pork chop", a:["fried pork cutlet","tonkatsu","豬排","炸豬排"], c:"protein", gi:30, cb:8, p:150, u:"1 piece" },
    { n:"Braised pork", a:["pork belly","紅燒肉","爌肉","焢肉","控肉","五花肉","三層肉"], c:"protein", gi:0, cb:2, p:100, u:"1 piece" },
    { n:"BBQ pork", a:["char siu","叉燒","叉燒肉"], c:"protein", gi:10, cb:5, p:80, u:"1 serving" },
    { n:"Steak", a:["beef steak","牛排"], c:"protein", gi:0, cb:0, p:200, u:"1 steak" },
    { n:"Braised beef", a:["beef brisket","滷牛腱","牛腱","牛腩"], c:"protein", gi:0, cb:1, p:100, u:"1 serving" },
    { n:"Ground beef", a:["minced beef","牛絞肉"], c:"protein", gi:0, cb:0, p:100, u:"1 serving" },
    { n:"Lamb", a:["羊肉"], c:"protein", gi:0, cb:0, p:100, u:"1 serving" },
    { n:"Duck", a:["roast duck","鴨肉","烤鴨"], c:"protein", gi:0, cb:0, p:100, u:"1 serving" },
    { n:"Turkey", a:["火雞"], c:"protein", gi:0, cb:0, p:100, u:"1 serving" },
    { n:"Boiled egg", a:["hard boiled egg","egg","水煮蛋","雞蛋","茶葉蛋","tea egg"], c:"protein", gi:0, cb:1, p:55, u:"1 egg" },
    { n:"Fried egg", a:["sunny side up","荷包蛋","煎蛋"], c:"protein", gi:0, cb:1, p:55, u:"1 egg" },
    { n:"Scrambled eggs", a:["炒蛋"], c:"protein", gi:0, cb:2, p:100, u:"2 eggs" },
    { n:"Omelette", a:["歐姆蛋"], c:"protein", gi:5, cb:3, p:120, u:"1 omelette" },
    { n:"Steamed egg", a:["chawanmushi","蒸蛋","茶碗蒸"], c:"protein", gi:0, cb:2, p:120, u:"1 bowl" },
    { n:"Tofu", a:["豆腐","板豆腐","嫩豆腐"], c:"protein", gi:15, cb:4, p:140, u:"half block" },
    { n:"Stinky tofu", a:["臭豆腐"], c:"protein", gi:25, cb:8, p:150, u:"1 serving" },
    { n:"Dried tofu", a:["tofu skin","豆干","滷豆干","豆皮","豆包"], c:"protein", gi:24, cb:7, p:60, u:"1 serving" },
    { n:"Edamame", a:["毛豆"], c:"protein", gi:18, cb:9, p:80, u:"1 serving" },
    { n:"Unsweetened soy milk", a:["無糖豆漿"], c:"protein", gi:15, cb:2, p:350, u:"1 cup" },
    { n:"Meatballs", a:["fish balls","貢丸","魚丸","肉丸"], c:"protein", gi:40, cb:10, p:60, u:"3 pieces" },
    { n:"Tempura fish cake", a:["甜不辣","黑輪"], c:"protein", gi:47, cb:20, p:100, u:"1 serving" },
    { n:"Sausage", a:["香腸","烤香腸","熱狗","hot dog sausage"], c:"protein", gi:28, cb:8, p:60, u:"1 link" },
    { n:"Ham", a:["火腿"], c:"protein", gi:25, cb:5, p:45, u:"3 slices" },
    { n:"Bacon", a:["培根"], c:"protein", gi:0, cb:1, p:40, u:"2 strips" },
    { n:"Greek yogurt", a:["plain yogurt","unsweetened yogurt","無糖優格","希臘優格","優格"], c:"protein", gi:30, cb:5, p:150, u:"1 cup" },
    { n:"Protein shake", a:["乳清蛋白"], c:"protein", gi:30, cb:5, p:300, u:"1 shake" },
    { n:"Hummus", a:["鷹嘴豆泥"], c:"protein", gi:6, cb:14, p:60, u:"1 serving" },
    { n:"Lentils", a:["扁豆"], c:"protein", gi:32, cb:20, p:150, u:"1 serving" },
    { n:"Baked beans", a:["焗豆"], c:"protein", gi:40, cb:15, p:130, u:"1 serving" },

    /* ── Fats ── */
    { n:"Avocado", a:["酪梨","牛油果"], c:"fat", gi:15, cb:8, p:100, u:"half" },
    { n:"Nuts", a:["mixed nuts","almonds","walnuts","cashews","堅果","杏仁","核桃","腰果"], c:"fat", gi:20, cb:20, p:30, u:"small handful" },
    { n:"Peanuts", a:["花生"], c:"fat", gi:14, cb:16, p:30, u:"small handful" },
    { n:"Peanut butter", a:["花生醬"], c:"fat", gi:14, cb:20, p:32, u:"2 tbsp" },
    { n:"Cheese", a:["起司","乳酪","起士"], c:"fat", gi:27, cb:3, p:25, u:"1 slice" },
    { n:"Butter", a:["奶油"], c:"fat", gi:0, cb:0, p:10, u:"1 pat" },

    /* ── Fruits ── */
    { n:"Watermelon", a:["西瓜"], c:"fruit", gi:72, cb:8, p:150, u:"1 slice" },
    { n:"Pineapple", a:["鳳梨"], c:"fruit", gi:66, cb:13, p:120, u:"1 serving" },
    { n:"Lychee", a:["荔枝"], c:"fruit", gi:57, cb:17, p:100, u:"6 pieces" },
    { n:"Mango", a:["芒果"], c:"fruit", gi:51, cb:14, p:120, u:"half" },
    { n:"Banana", a:["香蕉"], c:"fruit", gi:52, cb:22, p:100, u:"1 banana" },
    { n:"Papaya", a:["木瓜"], c:"fruit", gi:59, cb:10, p:150, u:"1 serving" },
    { n:"Cantaloupe", a:["melon","哈密瓜","香瓜"], c:"fruit", gi:65, cb:8, p:150, u:"1 slice" },
    { n:"Grapes", a:["葡萄"], c:"fruit", gi:53, cb:17, p:100, u:"10 grapes" },
    { n:"Apple", a:["蘋果"], c:"fruit", gi:36, cb:14, p:130, u:"1 apple" },
    { n:"Pear", a:["水梨","梨子"], c:"fruit", gi:38, cb:12, p:150, u:"half" },
    { n:"Guava", a:["芭樂","番石榴"], c:"fruit", gi:31, cb:10, p:160, u:"half" },
    { n:"Orange", a:["柳丁","柳橙","橘子","tangerine","mandarin"], c:"fruit", gi:43, cb:11, p:130, u:"1 orange" },
    { n:"Grapefruit", a:["葡萄柚"], c:"fruit", gi:25, cb:9, p:150, u:"half" },
    { n:"Kiwi", a:["kiwifruit","奇異果"], c:"fruit", gi:53, cb:15, p:100, u:"1 kiwi" },
    { n:"Strawberries", a:["草莓"], c:"fruit", gi:40, cb:8, p:100, u:"6 berries" },
    { n:"Blueberries", a:["藍莓"], c:"fruit", gi:53, cb:14, p:80, u:"1 serving" },
    { n:"Cherries", a:["櫻桃"], c:"fruit", gi:22, cb:16, p:80, u:"10 cherries" },
    { n:"Peach", a:["水蜜桃","桃子"], c:"fruit", gi:42, cb:10, p:130, u:"1 peach" },
    { n:"Plum", a:["李子"], c:"fruit", gi:39, cb:11, p:80, u:"2 plums" },
    { n:"Dragon fruit", a:["火龍果"], c:"fruit", gi:48, cb:12, p:150, u:"half" },
    { n:"Durian", a:["榴槤"], c:"fruit", gi:49, cb:27, p:100, u:"1 serving" },
    { n:"Persimmon", a:["柿子"], c:"fruit", gi:50, cb:18, p:130, u:"1 fruit" },
    { n:"Raisins", a:["dried fruit","葡萄乾","果乾"], c:"fruit", gi:64, cb:75, p:30, u:"small handful" },

    /* ── Drinks ── */
    { n:"Bubble tea", a:["boba","boba tea","pearl milk tea","珍珠奶茶","珍奶","波霸奶茶"], c:"drink", gi:65, cb:18, p:500, u:"1 cup" },
    { n:"Milk tea", a:["奶茶"], c:"drink", gi:60, cb:10, p:500, u:"1 cup" },
    { n:"Sweetened tea", a:["sweet tea","sugary drink","含糖手搖飲","手搖飲","含糖飲料"], c:"drink", gi:65, cb:10, p:500, u:"1 cup" },
    { n:"Unsweetened tea", a:["green tea","black tea","oolong tea","無糖綠茶","綠茶","無糖紅茶","紅茶","烏龍茶","無糖烏龍茶","tea"], c:"drink", gi:0, cb:0, p:500, u:"1 cup" },
    { n:"Black coffee", a:["americano","coffee","黑咖啡","美式咖啡","咖啡"], c:"drink", gi:0, cb:0, p:350, u:"1 cup" },
    { n:"Latte", a:["cafe latte","拿鐵","咖啡拿鐵"], c:"drink", gi:30, cb:5, p:350, u:"1 cup" },
    { n:"Milk", a:["whole milk","low fat milk","牛奶","鮮奶","全脂牛奶","低脂牛奶"], c:"drink", gi:31, cb:5, p:250, u:"1 glass" },
    { n:"Sweetened yogurt drink", a:["drinkable yogurt","優酪乳","含糖優酪乳","養樂多","yakult"], c:"drink", gi:44, cb:13, p:200, u:"1 bottle" },
    { n:"Cola", a:["coke","soda","soft drink","可樂","汽水","雪碧","sprite"], c:"drink", gi:63, cb:11, p:330, u:"1 can" },
    { n:"Diet soda", a:["zero sugar soda","diet coke","零卡可樂"], c:"drink", gi:0, cb:0, p:330, u:"1 can" },
    { n:"Orange juice", a:["juice","柳橙汁","橙汁","果汁"], c:"drink", gi:50, cb:10, p:300, u:"1 glass" },
    { n:"Apple juice", a:["蘋果汁"], c:"drink", gi:41, cb:11, p:300, u:"1 glass" },
    { n:"Smoothie", a:["fruit smoothie","果昔"], c:"drink", gi:45, cb:12, p:350, u:"1 cup" },
    { n:"Sports drink", a:["gatorade","運動飲料","舒跑","寶礦力"], c:"drink", gi:78, cb:6, p:350, u:"1 bottle" },
    { n:"Energy drink", a:["能量飲料"], c:"drink", gi:70, cb:11, p:250, u:"1 can" },
    { n:"Honey water", a:["honey","蜂蜜水","蜂蜜"], c:"drink", gi:61, cb:8, p:300, u:"1 glass" },
    { n:"Winter melon tea", a:["冬瓜茶"], c:"drink", gi:70, cb:10, p:500, u:"1 cup" },
    { n:"Sweetened soy milk", a:["soy milk","含糖豆漿","甜豆漿","豆漿"], c:"drink", gi:40, cb:7, p:350, u:"1 cup" },
    { n:"Beer", a:["啤酒"], c:"drink", gi:66, cb:3, p:330, u:"1 can" },
    { n:"Wine", a:["red wine","white wine","紅酒","白酒"], c:"drink", gi:0, cb:1, p:150, u:"1 glass" },

    /* ── Desserts & snacks ── */
    { n:"Cake", a:["birthday cake","sponge cake","蛋糕","奶油蛋糕"], c:"dessert", gi:55, cb:45, p:80, u:"1 slice" },
    { n:"Cheesecake", a:["起司蛋糕"], c:"dessert", gi:50, cb:30, p:80, u:"1 slice" },
    { n:"Brownie", a:["布朗尼"], c:"dessert", gi:42, cb:50, p:60, u:"1 piece" },
    { n:"Apple pie", a:["pie","蘋果派"], c:"dessert", gi:41, cb:34, p:110, u:"1 slice" },
    { n:"Donut", a:["doughnut","甜甜圈"], c:"dessert", gi:76, cb:50, p:60, u:"1 donut" },
    { n:"Muffin", a:["瑪芬"], c:"dessert", gi:62, cb:45, p:110, u:"1 muffin" },
    { n:"Pineapple cake", a:["鳳梨酥"], c:"dessert", gi:65, cb:60, p:45, u:"1 piece" },
    { n:"Mooncake", a:["月餅"], c:"dessert", gi:65, cb:55, p:60, u:"1 piece" },
    { n:"Red bean soup", a:["紅豆湯","綠豆湯","mung bean soup"], c:"dessert", gi:58, cb:19, p:250, u:"1 bowl" },
    { n:"Tofu pudding", a:["douhua","豆花","豆腐花"], c:"dessert", gi:55, cb:15, p:300, u:"1 bowl" },
    { n:"Grass jelly", a:["仙草","仙草凍","燒仙草"], c:"dessert", gi:55, cb:12, p:300, u:"1 bowl" },
    { n:"Pudding", a:["custard","布丁"], c:"dessert", gi:50, cb:18, p:100, u:"1 cup" },
    { n:"Ice cream", a:["冰淇淋","霜淇淋"], c:"dessert", gi:51, cb:24, p:80, u:"1 scoop" },
    { n:"Dark chocolate", a:["黑巧克力"], c:"dessert", gi:23, cb:45, p:25, u:"few squares" },
    { n:"Milk chocolate", a:["chocolate","巧克力"], c:"dessert", gi:43, cb:57, p:25, u:"few squares" },
    { n:"Cookies", a:["cookie","biscuits","餅乾","曲奇"], c:"dessert", gi:70, cb:65, p:40, u:"few pieces" },
    { n:"Mochi", a:["麻糬"], c:"dessert", gi:87, cb:50, p:60, u:"2 pieces" },
    { n:"Tangyuan", a:["glutinous rice balls","湯圓","元宵"], c:"dessert", gi:85, cb:45, p:120, u:"4 balls" },
    { n:"Wheel cake", a:["imagawayaki","車輪餅","紅豆餅"], c:"dessert", gi:70, cb:40, p:90, u:"1 piece" },
    { n:"Castella", a:["honey cake","蜂蜜蛋糕","長崎蛋糕"], c:"dessert", gi:60, cb:55, p:60, u:"1 slice" },
    { n:"Potato chips", a:["chips","crisps","洋芋片","薯片"], c:"dessert", gi:56, cb:50, p:50, u:"half bag" },
    { n:"Popcorn", a:["爆米花"], c:"dessert", gi:72, cb:60, p:30, u:"1 serving" },
    { n:"Candy", a:["gummies","糖果","軟糖"], c:"dessert", gi:78, cb:90, p:30, u:"small pack" },
    { n:"Granola bar", a:["energy bar","燕麥棒"], c:"dessert", gi:61, cb:60, p:40, u:"1 bar" }
  ];

  // Index canonical names and aliases → entry
  const index = new Map();
  F.forEach(f => {
    index.set(norm(f.n), f);
    (f.a || []).forEach(a => { if (!index.has(norm(a))) index.set(norm(a), f); });
  });
  const allKeys = [...index.keys()].sort((x, y) => y.length - x.length); // longest first

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[\s（）()\-'’]/g, "");
  }

  /** Look up by name; falls back to containment match (longest key wins) */
  function lookup(name) {
    const key = norm(name);
    if (!key) return null;
    if (index.has(key)) return index.get(key);
    for (const k of allKeys) {
      if (k.length >= 3 && (key.includes(k) || k.includes(key))) return index.get(k);
    }
    return null;
  }

  function giLevel(gi) {
    return gi <= 55 ? "Low" : gi <= 69 ? "Medium" : "High";
  }

  return { lookup, giLevel, size: F.length };
})();
