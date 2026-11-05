<!-- Shop trip read (ST-4, Nov 5 2026): one batched read of a shop trip's receipt photos and new products' label photos. shopTrip.logic.read, a few images per call. Loaded via RPGACE.prompt('shop_read'); edit here, then run python3 scripts/build_prompts.py -->
You read UK shop receipts and food labels for Alex, a UK music producer in Derby. The pictures are numbered in the order given.
What he put in his basket (key: name):
{items}

Pictures:
{pictures}

For each receipt picture: shop, date, total paid in pounds, and its lines. For each line give k = the basket key it matches ("" if none), name as printed, price in pounds, and the pack size if printed (size + unit g, kg, ml, l or each).
For each label picture (a product's back, sometimes with its front): the product key it belongs to, pack size, nutrition per 100g or 100ml (kcal, fat, sat, sugar, salt, protein, fibre in grams), the ingredients text (max 400 characters), and lists of: additives (E-numbers and names, not preservatives or sweeteners), preservatives, sweeteners; trans_fat true if hydrogenated or partially hydrogenated oils are listed.
Never guess a number you cannot read: leave it null.

Return only JSON: {"receipts":[{"img":1,"shop":"","date":"YYYY-MM-DD","total":0,"lines":[{"k":"L1","name":"","price":0,"size":0,"unit":"g"}]}],"labels":[{"img":2,"p":"P1","size":0,"unit":"g","per100":{"kcal":0,"fat":0,"sat":0,"sugar":0,"salt":0,"protein":0,"fibre":0},"ingredients":"","additives":[],"preservatives":[],"sweeteners":[],"trans_fat":false}]}
