export const FOODS = [
  { name: "Chicken breast (4 oz cooked)", cal: 187, p: 35, c: 0, f: 4 },
  { name: "Ground beef 90/10 (4 oz cooked)", cal: 240, p: 30, c: 0, f: 13 },
  { name: "Salmon (4 oz cooked)", cal: 233, p: 25, c: 0, f: 14 },
  { name: "Egg (large)", cal: 72, p: 6, c: 0, f: 5 },
  { name: "Egg whites (1 cup)", cal: 126, p: 26, c: 2, f: 0 },
  { name: "Greek yogurt nonfat (1 cup)", cal: 130, p: 23, c: 9, f: 0 },
  { name: "Whole milk (1 cup)", cal: 150, p: 8, c: 12, f: 8 },
  { name: "Whey protein (1 scoop)", cal: 120, p: 24, c: 3, f: 1.5 },
  { name: "White rice (1 cup cooked)", cal: 205, p: 4, c: 45, f: 0 },
  { name: "Oats (1/2 cup dry)", cal: 150, p: 5, c: 27, f: 3 },
  { name: "Pasta (1 cup cooked)", cal: 220, p: 8, c: 43, f: 1 },
  { name: "Potato (medium)", cal: 160, p: 4, c: 37, f: 0 },
  { name: "Sweet potato (medium)", cal: 112, p: 2, c: 26, f: 0 },
  { name: "Bread slice", cal: 80, p: 3, c: 15, f: 1 },
  { name: "Tortilla (flour, 10\")", cal: 210, p: 6, c: 35, f: 5 },
  { name: "Banana", cal: 105, p: 1, c: 27, f: 0 },
  { name: "Apple", cal: 95, p: 0, c: 25, f: 0 },
  { name: "Peanut butter (2 tbsp)", cal: 190, p: 7, c: 7, f: 16 },
  { name: "Olive oil (1 tbsp)", cal: 120, p: 0, c: 0, f: 14 },
  { name: "Avocado (half)", cal: 120, p: 1, c: 6, f: 11 },
  { name: "Cheddar cheese (1 oz)", cal: 115, p: 7, c: 0, f: 9 },
  { name: "Broccoli (1 cup)", cal: 55, p: 4, c: 11, f: 0 },
  { name: "Black beans (1/2 cup)", cal: 110, p: 7, c: 20, f: 0 },
  { name: "Almonds (1 oz)", cal: 165, p: 6, c: 6, f: 14 },
];

// Restaurant menu items from published nutrition info (checked September 2026). Menus change, so use "Look up online" for anything missing.
export const RESTAURANT_FOODS = [
  // P. Terry's official nutrition sheet (rev. 3/7/2024)
  ...[
    ["Hamburger", 394, 22, 27, 19.5], ["Hamburger lettuce wrap", 255, 19, 9, 16.5], ["Cheeseburger", 464, 26, 28, 25.5], ["Cheeseburger lettuce wrap", 370, 23, 10, 22],
    ["Double cheeseburger", 743, 51, 29, 45], ["Double cheeseburger lettuce wrap", 588, 48, 11, 41], ["Grilled chicken burger", 406, 31, 27, 15], ["Grilled chicken burger lettuce wrap", 236, 27, 1, 12],
    ["Crispy chicken burger", 606, 34, 44, 29], ["Spicy crispy chicken burger", 621, 34, 44, 29], ["Crispy chicken bites (8 pc)", 300, 42, 13, 13], ["Veggie burger", 403, 12, 46, 19],
    ["Egg burger w/ cheese", 280, 13, 28, 12.5], ["Egg burger w/ cheese & bacon", 385, 17.5, 28, 21.5], ["Egg burger w/ cheese & sausage", 450, 20, 28, 28.5], ["French fries", 386, 5, 50, 18],
    ["Oatmeal chocolate chip cookie", 241, 4, 27, 13], ["Banana bread", 192, 4.5, 45, 1.7], ["Vanilla shake (small)", 555, 16, 91, 14], ["Chocolate shake (small)", 722, 16, 136, 14], ["Oreo shake (small)", 577, 16, 93, 16],
  ].map(([n, cal, p, c, f]) => ({ r: "P. Terry's", name: `P. Terry's ${n}`, cal, p, c, f })),
  // Torchy's Tacos 2026 nutritional evaluations
  ...[
    ["Trailer Park", 298, 17, 22, 15], ["Trailer Park (trashy)", 355, 19, 23, 20], ["Chicken Fajita", 353, 20, 20, 21], ["Brushfire", 300, 18, 25, 14], ["Tipsy Chick", 453, 22, 40, 22],
    ["Democrat", 168, 10, 20, 5], ["Crossroads", 346, 20, 18, 22], ["Steak Fajita", 449, 20, 20, 26], ["Republican", 474, 16, 35, 29], ["Green Chile Pork", 217, 11, 26, 10], ["Hogfather", 428, 20, 32, 25],
    ["Baja Shrimp", 267, 12, 24, 14], ["Grilled Baja Shrimp", 169, 9, 6, 12], ["Mr. Orange", 207, 14, 23, 10], ["Fresh Avocado", 249, 8, 24, 14], ["Fried Avocado", 269, 9, 27, 14],
    ["Migas taco", 379, 17, 27, 23], ["The Wrangler", 456, 23, 24, 29], ["Ranch Hand", 451, 23, 19, 31], ["Bacon, egg & cheese taco", 383, 21, 17, 25], ["Potato, egg & cheese taco", 384, 18, 25, 22], ["Chorizo, egg & cheese taco", 388, 19, 19, 26],
    ["Breakfast burrito", 1139, 49, 100, 62], ["Big Tipsy Bowl (fajita chicken)", 990, 39, 111, 43], ["Big Tipsy Bowl (fried chicken)", 999, 44, 116, 39], ["Bonfire bowl (jerk chicken)", 771, 33, 94, 23], ["Bonfire bowl (salmon)", 762, 39, 98, 24],
    ["Outlaw Bowl (fajita chicken)", 786, 29, 109, 26], ["Outlaw Bowl (fried chicken)", 794, 35, 113, 22], ["Grande burrito", 797, 23, 96, 35], ["Green chile queso & chips", 643, 21, 32, 46], ["Guacamole & chips", 423, 6, 23, 33],
    ["Street corn", 383, 8, 48, 22], ["Damn Good Tots", 680, 19, 44, 42], ["Refried pinto beans", 198, 12, 35, 1], ["Black beans", 162, 9, 31, 1], ["Mexican rice", 241, 5, 48, 3], ["Trailer Park (hillbilly style)", 560, 31, 24, 36],
  ].map(([n, cal, p, c, f]) => ({ r: "Torchy's", name: `Torchy's ${n}`, cal, p, c, f })),
  // Chipotle official nutrition facts (March 2025)
  ...[
    ["chicken (4 oz)", 180, 32, 0, 7], ["steak (4 oz)", 150, 21, 1, 6], ["barbacoa (4 oz)", 170, 24, 2, 7], ["carnitas (4 oz)", 210, 23, 0, 12], ["sofritas (4 oz)", 150, 8, 9, 10],
    ["white rice (4 oz)", 210, 4, 40, 4], ["brown rice (4 oz)", 210, 4, 36, 6], ["black beans (4 oz)", 130, 8, 22, 1.5], ["pinto beans (4 oz)", 130, 8, 21, 1.5], ["fajita veggies", 20, 0, 5, 0],
    ["burrito tortilla", 320, 8, 50, 9], ["taco flour tortilla", 80, 2, 13, 2.5], ["crispy corn taco shell", 70, 1, 10, 3], ["guacamole (4 oz)", 230, 2, 8, 22],
  ].map(([n, cal, p, c, f]) => ({ r: "Chipotle", name: `Chipotle ${n}`, cal, p, c, f })),
  { r: "Chick-fil-A", name: "Chick-fil-A grilled nuggets (8 ct)", cal: 130, p: 25, c: 1, f: 3 },
  // Raising Cane's: calories published; macro split estimated from published calorie breakdown
  { r: "Raising Cane's", name: "Raising Cane's chicken finger (1)", cal: 130, p: 12, c: 5, f: 7, approx: true },
  { r: "Raising Cane's", name: "Raising Cane's Cane's Sauce (1 cup)", cal: 190, p: 0, c: 4, f: 19, approx: true },
  { r: "Raising Cane's", name: "Raising Cane's crinkle-cut fries", cal: 400, p: 5, c: 52, f: 18, approx: true },
  { r: "Raising Cane's", name: "Raising Cane's Texas toast", cal: 150, p: 4, c: 18, f: 7, approx: true },
  // Whataburger: third-party compiled figures, may differ from store
  { r: "Whataburger", name: "Whataburger (original)", cal: 590, p: 29, c: 52, f: 32, approx: true },
  { r: "Whataburger", name: "Whataburger Double Meat", cal: 830, p: 47, c: 62, f: 44, approx: true },
  { r: "Whataburger", name: "Whataburger Honey Butter Chicken Biscuit", cal: 570, p: 18, c: 52, f: 32, approx: true },
];
export const RESTAURANTS = [...new Set(RESTAURANT_FOODS.map((f) => f.r))];

export const ACTIVITY = [
  { id: 1.2, label: "Mostly sitting" },
  { id: 1.375, label: "Train 1–3 days/week" },
  { id: 1.55, label: "Train 3–5 days/week" },
  { id: 1.725, label: "Train 6–7 days/week" },
];
export const GOALS = [
  { id: "cut", label: "Cut", adj: -400 },
  { id: "maintain", label: "Maintain", adj: 0 },
  { id: "lean", label: "Lean bulk", adj: 250 },
  { id: "bulk", label: "Bulk", adj: 450 },
];
