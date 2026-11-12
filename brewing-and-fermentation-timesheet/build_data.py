#!/usr/bin/env python3
"""
build_data.py - the recipe data for the Brewing and Fermentation Timesheet, written as plain,
commented Python. Running it writes data.json, which the web page (app.js) reads.

    python3 build_data.py

HOW TO READ THIS FILE
  Every recipe is a Python dictionary made with the helper functions below. Amounts are written
  PER ONE UNIT OF THE BASE (for example "grams per litre of water", or "grams per kilogram of
  cabbage"), so the page can scale a recipe to any batch size by multiplying.

  Each recipe says how well it is backed up:
    status "sourced"        the main figures come from a published recipe (listed in SOURCES below)
    status "starting point" typical home practice that has NOT yet been checked against a published
                            source. The page says so plainly. Please treat these as a first try.

  This is a work in progress. Not everything here is actively maintained. Fermenting is safe when
  you follow the safety notes (see the Safety tab); when in doubt, leave it out.
"""
import json

MIN = 1          # steps are written in minutes ...
H = 60           # ... so an hour is 60
D = 24 * 60      # ... and a day is 1440


# --------------------------------------------------------------------------------------------
# Small helpers that keep the recipes below short and readable.
# --------------------------------------------------------------------------------------------
def ing(name, per, unit="g", note="", group="", var=False, mult=1, sugar=0.0, vol=0.0):
    """One ingredient.
    per    amount for ONE base unit (e.g. grams per litre)
    unit   'g', 'ml', 'tsp', 'tbsp', 'tablet' or 'item'
    var    True if the Plan tab's adjustable box sets this amount (amount = box value x mult)
    sugar  fraction of the weight that is fermentable sugar (honey 0.8, table sugar 1.0): used for the OG estimate
    vol    litres this ingredient adds to the liquid per kilogram (sugar 0.63, honey 0.70): used for the OG estimate
    """
    return {"name": name, "per": per, "unit": unit, "note": note, "group": group,
            "var": var, "mult": mult, "sugar": sugar, "vol": vol}


def step(name, minutes, how="", done="", temp=False, marks=None, hands=None):
    """One step on the timeline.
    temp   True if the time changes with room temperature (fermentation), False if it does not (chilling, cooking)
    marks  moments inside the step that need you, as [[minutes after the step starts, 'what to do'], ...]
    hands  True if the step needs you the whole time (for the 'two bakes need your hands' warning)
    """
    return {"name": name, "minutes": minutes, "how": how, "done_when": done, "temp_sensitive": temp,
            "start_offset": 0, "marks": marks or [], "hands": hands}


def recipe(key, group, family, name, desc, base_label, base_unit, default_amount, ingredients, steps,
           status, ref_temp=20.0, var=None, og=None, safety=None, notes="", yield_text="", sources=None,
           amount_step=1, amount_min=0.1, amount_max=500):
    """One recipe. group is 'drinks' or 'food'; family decides where it sits in the Sources tab."""
    return {"key": key, "group": group, "family": family, "name": name, "description": desc,
            "base_label": base_label, "base_unit": base_unit, "default_amount": default_amount,
            "amount_step": amount_step, "amount_min": amount_min, "amount_max": amount_max,
            "ingredients": ingredients, "steps": steps, "status": status, "ref_temp_c": ref_temp,
            "var": var, "og": og, "safety": safety or [], "notes": notes, "yield": yield_text,
            "sources": sources or []}


# --------------------------------------------------------------------------------------------
# SOURCES: every published page the numbers were taken from. Nothing is copied word for word:
# each is a recipe or a guide that was read, with the figures it gave used here.
# --------------------------------------------------------------------------------------------
SOURCES = [
    {"id": "nchfp_kombucha", "name": "Kombucha tea", "origin": "National Center for Home Food Preservation (University of Georgia)",
     "url": "https://nchfp.uga.edu/how/ferment/recipes/kombucha-tea/",
     "used": "1 gallon water, 3 tablespoons black tea (or 6 bags), 1 cup sugar, 1 SCOBY with starter liquid; 7-10 days at 20-25 C (68-77 F); starter liquid must be pH 4.0 or lower; tea below 35 C (95 F) before the SCOBY goes in; keep up to 30 days chilled."},
    {"id": "uvm_kraut", "name": "Sauerkraut: DIY fabulous fermented food", "origin": "University of Vermont Extension",
     "url": "https://www.uvm.edu/extension/news/sauerkraut-diy-fabulous-fermented-food",
     "used": "800 g sliced cabbage with 2 % salt by weight (range 1.5-2.5 %), 18-22 C (65-72 F) for up to four weeks, keep it submerged, finished pH 4.6 or lower."},
    {"id": "aha_mead", "name": "Mead Day 2020 Traditional Mead", "origin": "American Homebrewers Association",
     "url": "https://homebrewersassociation.org/homebrew-recipe/mead-day-2020-traditional-mead/",
     "used": "1 gallon batch: 3 lb (1.4 kg) honey in 0.75 gallon (2.8 L) water, 5 g wine yeast, nutrient in four doses at 24, 48, 72 and 96 hours, ferment at 17 C (62 F), original gravity 1.108."},
    {"id": "cern_gingerbeer", "name": "Ginger beer: a traditional fermented low-alcohol drink", "origin": "Science in School (published by CERN and partners)",
     "url": "https://scienceinschool.web.cern.ch/article/2008/gingerbeer",
     "used": "Per litre: 150 g ginger, 1 lemon, 140 g sugar, 4 g cream of tartar, 4 g dried yeast; 24 hours, then bottle in PET plastic bottles for no more than 48 hours at about 21 C, then refrigerate and drink within six days."},
    {"id": "kitchn_kimchi", "name": "How to make easy kimchi at home", "origin": "The Kitchn",
     "url": "https://www.thekitchn.com/how-to-make-easy-kimchi-at-home-189390",
     "used": "About 2 lb (900 g) napa cabbage, 1/4 cup salt for a 1-2 hour brine, garlic, ginger, sugar, fish sauce, 1-5 tablespoons gochugaru, 8 oz radish, 4 scallions; 1-5 days at cool room temperature then the fridge."},
    {"id": "nchfp_jam", "name": "Making jams and jellies: jam without added pectin", "origin": "National Center for Home Food Preservation (archived copy)",
     "url": "https://webarchive.library.unt.edu/eot2008/20090116024238/http:/www.uga.edu/nchfp/how/can_07/jam_without_pectin.html",
     "used": "Berries: 4 cups crushed fruit to 4 cups sugar; setting temperature 105 C (220 F) at sea level, lower at altitude; freezer-plate test; boiling-water canner 5 minutes (up to 300 m), 10 minutes (300-1800 m)."},
    {"id": "psu_pickles", "name": "Fermenting dill pickles", "origin": "Penn State Extension",
     "url": "https://extension.psu.edu/fermenting-dill-pickles",
     "used": "Ferment at 21-24 C (70-75 F) for about 3-4 weeks; keep the cucumbers under the brine; do not omit or reduce the salt or vinegar; discard soft, slimy or bad-smelling pickles. It sends you to the National Center for Home Food Preservation recipe for exact amounts, which this tool has not yet checked."},
    {"id": "fermentary_kvass", "name": "Rye kvass (Zhivoi kvass)", "origin": "The Fermentary",
     "url": "https://www.thefermentary.com.au/blogs/wild-drinks-and-kvass/rye-kvass",
     "used": "800 g dark rye bread (dried and roasted), 4 litres water, 300 g sugar, 100 g honey, 100 g malt, raisins, orange peel, mint; about a week covered, a day sealed for fizz; thick or swing-top bottles."},
    {"id": "midwest_blackberry", "name": "How to make blackberry wine", "origin": "Midwest Supplies",
     "url": "https://midwestsupplies.com/blogs/bottled-knowledge/blackberry-wine-recipe",
     "used": "1 gallon: 4 lb blackberries, 2.5 lb sugar, 1 gallon water, 1 tsp acid blend, 1/2 tsp pectic enzyme, 1 tsp yeast nutrient, 1-2 Campden tablets, wine yeast; rack at about 1 week, 1 month and 3-4 months, then bottle age 6 months."},
    {"id": "aha_columbus", "name": "Columbus Pale Ale (extract)", "origin": "American Homebrewers Association",
     "url": "https://www.homebrewersassociation.org/wp-content/uploads/2015/04/Columbus-Pale-Ale-Extract.pdf",
     "used": "5 gallons (18.9 L): 7.5 lb (3.4 kg) light liquid malt extract, hops at 60, 15, 5 and 0 minutes plus dry hops, 20 C for 9 + 9 days, 113 g priming sugar, OG 1.056, FG 1.012, 5.8 % ABV."},
    {"id": "kk_waterkefir", "name": "How to make water kefir (tibicos)", "origin": "Kombucha Kamp",
     "url": "https://kombuchakamp.com/water-kefir-recipe",
     "used": "Per quart (about 1 litre): 1/4 cup sugar, 2 tablespoons hydrated grains; 24-48 hours at 20-26 C; never longer than 72 hours; optional 1-3 day second ferment."},
    {"id": "alpha_garlichoney", "name": "Fermented garlic honey", "origin": "Alphafoodie (a food blog, not a laboratory)",
     "url": "https://www.alphafoodie.com/fermented-garlic-honey/comment-page-2/",
     "used": "1 cup garlic cloves to 1 cup raw honey; open and re-close the lid daily for about 14-21 days; a pH under 4.6 is considered safe; never for babies under 12 months."},
    {"id": "masterclass_makgeolli", "name": "Makgeolli recipe", "origin": "MasterClass",
     "url": "https://www.masterclass.com/articles/makgeolli-recipe",
     "used": "Cooked rice, nuruk and 7 cups water, then 7 more cups after straining; about a week at cool room temperature (20 C is ideal); finished makgeolli is typically 7-8 % alcohol. The page does not give the rice or nuruk weights."},
]

# Reminders shown on every drink and food: the Safety tab repeats and expands these.
BOTTLE = "Fizzy drinks in sealed bottles build pressure. Use bottles made for it (swing-top or crown-cap glass, or PET plastic), never a thin jar, open one over a sink, and chill the bottles to stop the fermentation."
ALCOHOL = "Contains alcohol: not for children, pregnancy, driving or anyone who avoids alcohol."

# --------------------------------------------------------------------------------------------
# DRINKS
# --------------------------------------------------------------------------------------------
RECIPES = []

# ---- Traditional mead -----------------------------------------------------------------------
RECIPES.append(recipe(
    "mead", "drinks", "mead", "Mead (traditional, honey and water)",
    "Honey, water and yeast, nothing else. Dry to medium, roughly 12-15 % alcohol. Patience is the main ingredient.",
    "Litres of water", "L", 2.8,
    [ing("Honey", 500, "g", "any honey that tastes good raw", var=True, sugar=0.80, vol=0.70),
     ing("Water (spring or dechlorinated)", 1000, "ml"),
     ing("Wine or mead yeast", 1.8, "g", "dried; rehydrate as the packet says"),
     ing("Yeast nutrient", 1.3, "g", "split into four doses at 24, 48, 72 and 96 hours"),
     ing("Campden tablet or potassium metabisulfite (optional, at bottling)", 0.36, "g", "1 g in 2.8 L, with sorbate, only if you back-sweeten")],
    [step("Clean and sanitise everything", 30, "Wash, then sanitise the bucket, spoon, airlock and thermometer with a no-rinse sanitiser.", "Nothing that touches the mead is left unsanitised.", hands=True),
     step("Mix the must", 30, "Dissolve the honey in about half the water, warm if needed, top up with cool water, and stir hard for a minute to add air. Take a gravity reading if you have a hydrometer.", "No honey left on the bottom; liquid is at 18-22 C.", hands=True),
     step("Pitch the yeast", 15, "Rehydrate the yeast as its packet says, then stir it in. Fit the airlock.", "Airlock fitted.", hands=True),
     step("Active fermentation", 14 * D, "Keep at 17-20 C, out of sunlight. Add the nutrient in four equal doses.", "Bubbling has slowed to one bubble every minute or so, and the gravity is steady for three days.", temp=True,
          marks=[[1 * D, "Nutrient dose 1 of 4"], [2 * D, "Nutrient dose 2 of 4"], [3 * D, "Nutrient dose 3 of 4"], [4 * D, "Nutrient dose 4 of 4"]]),
     step("Rack off the sediment and clear", 60 * D, "Siphon the mead into a clean, sanitised vessel, leaving the sediment, and fill it close to the neck.", "Clear, with no new sediment and no bubbles for a month.", temp=True),
     step("Bottle", 60, "Siphon into clean bottles. Back-sweeten only after stabilising.", "Bottled and capped.", hands=True),
     step("Age", 90 * D, "Store cool and dark. Strong mead is harsh young and softens with months.", "Tastes smooth.", temp=False)],
    "sourced", 18.0,
    var={"label": "Honey (g per litre of water)", "unit": "g", "default": 500, "min": 250, "max": 700, "step": 10, "hint": "About 250 g gives roughly 7 %, 400 g about 11 %, 500 g about 13 %."},
    og={"fg": 1.000, "note": "The published batch is 1.4 kg honey in 2.8 L water, OG 1.108."},
    safety=[ALCOHOL, "A fermenting vessel must be able to let gas out: always use an airlock, never a sealed lid, until it has fully stopped."],
    notes="Honey amount drives the strength: the estimate is only a guide, so measure with a hydrometer if you can.",
    yield_text="About 1.35 litres of mead for every litre of water.", sources=["aha_mead"], amount_step=0.5))

# ---- Metheglin -------------------------------------------------------------------------------
RECIPES.append(recipe(
    "metheglin", "drinks", "mead", "Metheglin (spiced mead)",
    "Mead with spices or herbs added: the old English name for it is metheglin. Lighter honey, so the spices show.",
    "Litres of water", "L", 2.8,
    [ing("Honey", 400, "g", var=True, sugar=0.80, vol=0.70),
     ing("Water (spring or dechlorinated)", 1000, "ml"),
     ing("Whole spices (cinnamon, cloves, ginger, citrus peel)", 1.0, "g", "start light: about 1 g per litre in total, added after the first week, tasted every few days"),
     ing("Wine or mead yeast", 1.8, "g"),
     ing("Yeast nutrient", 1.3, "g", "four doses at 24, 48, 72 and 96 hours")],
    [step("Clean and sanitise everything", 30, "Wash and sanitise everything that touches the mead.", "", hands=True),
     step("Mix the must and pitch the yeast", 45, "Dissolve the honey in warm water, top up, stir hard to add air, then pitch the yeast and fit an airlock.", "At 18-22 C with the airlock fitted.", hands=True),
     step("Active fermentation", 7 * D, "Keep at 17-20 C. Add nutrient in four doses.", "Fermentation is vigorous.", temp=True,
          marks=[[1 * D, "Nutrient dose 1 of 4"], [2 * D, "Nutrient dose 2 of 4"], [3 * D, "Nutrient dose 3 of 4"], [4 * D, "Nutrient dose 4 of 4"]]),
     step("Add the spices", 15, "Add whole spices in a sanitised mesh bag so they can be removed.", "Spices in.", hands=True),
     step("Infuse", 10 * D, "Taste every two or three days and take the spices out when it tastes right. Spices overpower quickly.", "Spice is clear but not harsh.", temp=True),
     step("Rack and clear", 45 * D, "Siphon off the sediment into a clean vessel and let it clear.", "Clear and still.", temp=True),
     step("Bottle and age", 90 * D, "Bottle, then age cool and dark.", "Tastes balanced.", temp=False)],
    "starting point", 18.0,
    var={"label": "Honey (g per litre of water)", "unit": "g", "default": 400, "min": 250, "max": 600, "step": 10, "hint": "400 g gives roughly 11 %."},
    og={"fg": 1.000, "note": "Same method as the traditional mead above; the spice figures are a cautious first try, not yet checked against a published recipe."},
    safety=[ALCOHOL], notes="Use whole, fresh spices and add little: you can add more, you cannot take it out.",
    yield_text="About 1.3 litres per litre of water.", sources=["aha_mead"], amount_step=0.5))

# ---- Country wine (blackberry) ---------------------------------------------------------------
RECIPES.append(recipe(
    "country_wine", "drinks", "wine", "Country wine (blackberry)",
    "Fruit wine in the old country tradition. The method works for most soft fruit: change the fruit, keep the process.",
    "Litres of water", "L", 3.8,
    [ing("Blackberries (fresh or frozen)", 480, "g", var=False, sugar=0.05),
     ing("White sugar", 300, "g", sugar=1.0, vol=0.63),
     ing("Water", 1000, "ml"),
     ing("Acid blend", 0.25, "tsp"),
     ing("Pectic enzyme", 0.13, "tsp", "clears the haze"),
     ing("Yeast nutrient", 0.25, "tsp"),
     ing("Campden tablet", 0.27, "tablet", "crushed, at the start (about 1 per 4 litres)"),
     ing("Red wine yeast", 1.3, "g")],
    [step("Clean and sanitise everything", 30, "Wash and sanitise the pan, bucket, spoon, siphon and airlock.", "", hands=True),
     step("Simmer the fruit, sugar and water", 40, "Simmer for 30 minutes, then add the acid, enzyme and nutrient and let it cool to room temperature. Take a gravity reading.", "Cool to 20-25 C.", hands=True),
     step("Add the Campden tablet and wait", 12 * H, "Stir in the crushed Campden tablet, cover, and wait at least 12 hours before the yeast so the sulphite can work.", "12 hours have passed.", temp=False),
     step("Pitch the yeast and stir daily", 7 * D, "Add the yeast. Stir daily and push the fruit down until the gravity is 1.020 or lower.", "Gravity is 1.020 or below.", temp=True),
     step("Rack to a carboy", 30 * D, "Siphon off the fruit into a sanitised carboy with an airlock and leave it for about a month.", "Bubbling has slowed a lot.", temp=True),
     step("Rack again and clear", 75 * D, "Siphon off the sediment and leave it for 2-3 months.", "Clear.", temp=True),
     step("Rack, stabilise and bottle", 90 * D, "Rack once more. When it has been still for about a month, check the gravity is steady, then stabilise and bottle.", "Gravity steady for a month.", temp=True),
     step("Bottle age", 180 * D, "At least six months in the bottle before the first taste.", "", temp=False)],
    "sourced", 20.0,
    og={"fg": 0.998, "note": "The published batch is 4 lb (1.8 kg) berries, 2.5 lb (1.1 kg) sugar and 1 gallon of water; this runs to about 13-14 % if it ferments dry. The yeast tolerates less than some people expect."},
    safety=[ALCOHOL, "Fermentation needs an airlock, not a sealed lid."],
    notes="Sugar is the only thing you should change for strength; less sugar gives a lighter, drier wine.",
    yield_text="About 1.2 litres of wine per litre of water.", sources=["midwest_blackberry"], amount_step=0.5))

# ---- Kvass -----------------------------------------------------------------------------------
RECIPES.append(recipe(
    "kvass", "drinks", "kvass", "Rye bread kvass",
    "A tart, lightly fizzy, low-alcohol drink from dried rye bread. Often the first fermented drink people try.",
    "Litres of water", "L", 4,
    [ing("Dark rye bread, cubed, dried and roasted", 200, "g", "180 C until dry like rusks"),
     ing("Sugar", 75, "g"),
     ing("Honey", 25, "g"),
     ing("Malt (or more honey or sugar)", 25, "g"),
     ing("Raisins", 4, "g", "a small handful per 4 L"),
     ing("Orange peel", 0.25, "item", "one strip per 4 L"),
     ing("Mint", 0.25, "item", "one sprig per 4 L"),
     ing("Sourdough starter (optional)", 4, "g")],
    [step("Roast the bread", 45, "Cube the bread and roast at 180 C until dried like rusks and browned, not burnt.", "Dry and golden-brown.", hands=True),
     step("Steep", 6 * H, "Pour hot (not boiling) water over the bread, sugar, honey and malt. Cover and steep until cool.", "Cool to about room temperature.", temp=False),
     step("Strain and add the culture", 20, "Strain into a clean jar. Add the raisins, peel, mint and starter. Cover with a cloth, not a lid.", "Covered with a cloth.", hands=True),
     step("Ferment", 6 * D, "Stir now and then. Taste from day 5: it is ready when sour, with depth and a slight fizz.", "Pleasantly sour.", temp=True, marks=[[5 * D, "Start tasting"]]),
     step("Bottle and fizz", 24 * H, "Strain into thick or swing-top bottles. A few raisins in each bottle add fizz.", "Bottled.", temp=True),
     step("Chill", 12 * H, "Move to the fridge to stop it. Drink within about a week.", "Cold.", temp=False)],
    "sourced", 20.0,
    safety=["Low alcohol, but not none: it is a live ferment and it climbs the longer it sits warm. Not for children or anyone avoiding alcohol.", BOTTLE],
    notes="The source gives no alcohol figure: treat it as low but not zero.",
    yield_text="A little less than the water you started with.", sources=["fermentary_kvass"], amount_step=0.5))

# ---- Rice wine (makgeolli) -------------------------------------------------------------------
RECIPES.append(recipe(
    "rice_wine", "drinks", "rice_wine", "Rice wine (makgeolli style)",
    "Milky, lightly sparkling Korean rice wine made with steamed rice and nuruk (a starter of grain, mould and yeast). About 7-8 %. This is the fermented drink; soju is distilled from a wine like this and is not covered.",
    "Kilograms of dry rice", "kg", 1,
    [ing("Short-grain rice, washed and soaked", 1000, "g"),
     ing("Nuruk (starter)", 200, "g", "check the packet: strengths vary"),
     ing("Water for the first mix", 1000, "ml", "the source uses 7 cups at the start for its batch"),
     ing("Water for the second mix (after straining)", 1000, "ml")],
    [step("Soak and steam the rice", 2 * H, "Soak, then steam or cook the rice until soft but not mushy. Spread it to cool to body temperature.", "Cool to 30 C or below.", hands=True),
     step("Mix", 30, "Combine the rice, crumbled nuruk and the first water in a very clean jar or crock. Mix with a sanitised hand or spoon.", "Mixed.", hands=True),
     step("Ferment, stirring", 7 * D, "Keep at about 20 C. Stir a few times a day with a sanitised spoon, and cover with a cloth.", "No more bubbles; the liquid settles to light gold.", temp=True),
     step("Strain and dilute", 30, "Strain through muslin, pressing the rice. Add the second water to the strained liquid.", "Milky liquid.", hands=True),
     step("Chill and drink", 12 * H, "Chill. It keeps for only a few days in the fridge and goes on fermenting.", "Cold.", temp=False)],
    "starting point", 20.0,
    safety=[ALCOHOL, "Keep the fermenter clean. Gas is released during fermentation, so do not seal the jar until it has settled.", "This tool does not cover distilling. Home distillation is illegal in many places, including the UK, and is dangerous."],
    notes="The published page gives the water (7 cups, then 7 more), the time (about a week) and the strength (7-8 %) but not the rice or nuruk weights. The weights here are typical home ratios and have not been checked.",
    yield_text="Several litres: about 2.5 litres per kilogram of rice.", sources=["masterclass_makgeolli"], amount_step=0.5))

# ---- Beer -----------------------------------------------------------------------------------
RECIPES.append(recipe(
    "beer", "drinks", "beer", "Pale ale (malt extract)",
    "A first beer from malt extract. No mashing: boil, add the hops, cool, ferment.",
    "Litres of finished beer", "L", 18.9,
    [ing("Light liquid malt extract", 180, "g", sugar=0.80),
     ing("Bittering hops (60 min)", 0.74, "g", "example: Columbus, 13.9 % alpha", group="Hops"),
     ing("Hops at 15 minutes", 0.74, "g", group="Hops"),
     ing("Hops at 5 minutes", 0.74, "g", group="Hops"),
     ing("Hops at flame-out (0 minutes)", 1.48, "g", group="Hops"),
     ing("Dry hops (after the first week)", 2.27, "g", "example: Centennial", group="Hops"),
     ing("Ale yeast (dried)", 0.6, "g", "about one 11.5 g packet per 19 litres"),
     ing("Priming sugar (corn sugar) for bottling", 6.0, "g", "see the pressure warning on the Safety tab")],
    [step("Clean and sanitise everything", 45, "Everything that touches the beer after the boil needs sanitising.", "", hands=True),
     step("Boil", 60, "Dissolve the malt extract in hot water, bring to the boil and add the hops on schedule.", "60 minutes done.", hands=True,
          marks=[[0, "Bittering hops in"], [45, "Hops at 15 minutes in"], [55, "Hops at 5 minutes in"], [60, "Flame-out hops in"]]),
     step("Cool and pitch", 45, "Cool to 20 C quickly (a sink of cold water works), transfer, aerate and pitch the yeast.", "At 20 C with the airlock fitted.", hands=True),
     step("Primary fermentation", 9 * D, "Keep at about 20 C.", "Gravity steady for two days.", temp=True),
     step("Dry hop", 9 * D, "Add the dry hops and rest at about 20 C.", "Hop flavour in.", temp=True),
     step("Prime and bottle", 90, "Dissolve the priming sugar in boiled water, mix gently into the beer, bottle and cap.", "Capped.", hands=True),
     step("Bottle condition", 14 * D, "Keep warm (about 20 C) for two weeks, then chill before opening.", "Fizzy and clear after chilling.", temp=True)],
    "sourced", 20.0,
    og={"fg": 1.012, "note": "The published beer has OG 1.056 and FG 1.012, about 5.8 %."},
    safety=[ALCOHOL, BOTTLE, "Too much priming sugar or a bottled beer that was not finished fermenting can burst bottles."],
    notes="Malt extract weights come from the published 5 gallon batch (3.4 kg liquid extract); a different extract may be thicker or thinner.",
    yield_text="Roughly 40 pint bottles from 19 litres.", sources=["aha_columbus"], amount_step=1))

# ---- Ginger beer ------------------------------------------------------------------------------
RECIPES.append(recipe(
    "ginger_beer", "drinks", "ginger_beer", "Ginger beer",
    "A spicy, fizzy drink, kept very low in alcohol by a short ferment and a cold finish. This is the plain-yeast version; the Cultures tab shows a ginger bug instead.",
    "Litres of ginger beer", "L", 2,
    [ing("Root ginger, sliced thin and bruised", 150, "g"),
     ing("Lemon (zest and juice)", 1, "item", "unwaxed"),
     ing("Sugar", 140, "g", "brown or white", sugar=1.0, vol=0.63),
     ing("Cream of tartar", 4, "g"),
     ing("Dried ale or bread yeast", 4, "g"),
     ing("Boiling water", 1000, "ml")],
    [step("Make the base", 20, "Pour boiling water over the ginger, zest, juice, sugar and cream of tartar.", "Sugar dissolved.", hands=True),
     step("Cool", 90, "Cool to 25-30 C.", "Warm to the touch, not hot.", temp=False),
     step("First ferment", 24 * H, "Add the yeast, cover, and leave somewhere warm.", "A thick froth on top.", temp=True),
     step("Strain and bottle", 20, "Skim, strain into clean PET plastic bottles, leaving a 3-5 cm gap at the top.", "Bottled.", hands=True),
     step("Fizz", 48 * H, "Leave at about 21 C. Squeeze the bottle each day: when it is rock hard, move it to the fridge.", "Bottle is firm.", temp=True,
          marks=[[24 * H, "Check the bottles by squeezing"]]),
     step("Chill and drink", 12 * H, "Refrigerate. Drink within six days.", "Cold.", temp=False)],
    "sourced", 21.0,
    safety=["Use PET plastic bottles only. Glass bottles must never be used for this one: the pressure can burst them.", BOTTLE],
    notes="The source recipe uses commercial yeast. A ginger bug (a wild starter) takes longer and varies from batch to batch.",
    yield_text="Just under one litre per litre of water.", sources=["cern_gingerbeer"], amount_step=1))

# ---- Kombucha ---------------------------------------------------------------------------------
RECIPES.append(recipe(
    "kombucha", "drinks", "kombucha", "Kombucha",
    "Sweet tea fermented by a SCOBY into a tart, lightly fizzy drink.",
    "Litres of kombucha", "L", 3.8,
    [ing("Black tea", 2.4, "g", "about 0.8 tablespoon, or 1.6 tea bags"),
     ing("Sugar", 53, "g"),
     ing("Hot water for steeping", 270, "ml", "heat to 70-75 C"),
     ing("Cold water", 730, "ml", "tea must be below 35 C before the SCOBY goes in"),
     ing("Starter liquid from a previous batch", 100, "ml", "must test pH 4.0 or lower"),
     ing("SCOBY", 0.26, "item", "one per batch is plenty")],
    [step("Clean everything", 20, "Wash hands and equipment. Sanitise with hot water over 77 C for 30 seconds.", "", hands=True),
     step("Steep and sweeten", 20, "Steep the tea in hot water for 2 minutes, strain, stir in the sugar.", "Sugar dissolved.", hands=True),
     step("Cool and test", 120, "Add the cold water. Test the starter liquid with a pH strip (4.0 or lower), then add it and the SCOBY.", "Below 35 C; starter at pH 4.0 or lower.", hands=True),
     step("First ferment", 8 * D, "Cover with a cloth. Keep at 20-25 C out of direct sun. Taste from day 7.", "Tart, with the sweetness gone down.", temp=True, marks=[[7 * D, "Start tasting"]]),
     step("Bottle and chill", 30, "Keep some as starter for the next batch. Bottle the rest and refrigerate straight away.", "Chilled; use within 30 days.", hands=True)],
    "sourced", 23.0,
    safety=["The starter liquid must be pH 4.0 or lower before you use it. If it is higher, get fresh starter.", "Do not add the SCOBY until the tea is below 35 C.", "Airtight containers can build pressure and burst; the finished drink should be chilled and used within 30 days.", "Not for children, pregnant people or people with weak immune systems unless a professional has said it is fine."],
    notes="Amounts are the National Center for Home Food Preservation's per gallon, scaled to litres.",
    yield_text="About one litre per litre of water.", sources=["nchfp_kombucha"], amount_step=0.5))

# ---- Jun ---------------------------------------------------------------------------------------
RECIPES.append(recipe(
    "jun", "drinks", "jun", "Jun tea",
    "Like kombucha, but made with green tea and honey. Lighter and faster. It needs its own culture (a Jun SCOBY).",
    "Litres of jun", "L", 3.8,
    [ing("Green tea", 3, "g"),
     ing("Honey (raw)", 90, "g"),
     ing("Hot water for steeping", 300, "ml", "about 70 C"),
     ing("Cold water", 700, "ml"),
     ing("Jun starter liquid", 100, "ml"),
     ing("Jun SCOBY", 0.26, "item")],
    [step("Clean everything", 20, "Wash hands and sanitise equipment.", "", hands=True),
     step("Steep and sweeten", 20, "Steep the tea for a few minutes, strain, stir in the honey.", "Honey dissolved.", hands=True),
     step("Cool and add the culture", 90, "Top up with cold water, cool below 35 C, then add the starter liquid and SCOBY.", "Below 35 C.", hands=True),
     step("Ferment", 5 * D, "Cover with a cloth. Keep at 22-26 C. Taste from day 3.", "Tart and lightly sweet.", temp=True, marks=[[3 * D, "Start tasting"]]),
     step("Bottle and chill", 30, "Keep some back as starter. Bottle the rest and refrigerate.", "Chilled.", hands=True)],
    "starting point", 24.0,
    safety=["Use the same starter-liquid rule as kombucha: pH 4.0 or lower.", BOTTLE],
    notes="Amounts are typical home practice and have not been checked against a published source. Jun is more sensitive to temperature than kombucha.",
    yield_text="About one litre per litre of water.", sources=[], amount_step=0.5))

# ---- Water kefir ------------------------------------------------------------------------------
RECIPES.append(recipe(
    "water_kefir", "drinks", "kefir", "Water kefir",
    "Sugar water cultured by water kefir grains into a light, fizzy drink.",
    "Litres of water kefir", "L", 1,
    [ing("Sugar", 53, "g", "plain white sugar is easiest for the grains; avoid raw honey"),
     ing("Hydrated water kefir grains", 32, "g", "about 2 tablespoons per quart"),
     ing("Chlorine-free water", 1000, "ml")],
    [step("Dissolve the sugar", 10, "Dissolve the sugar in the water, at room temperature.", "Dissolved and not hot.", hands=True),
     step("First ferment", 36 * H, "Add the grains, cover with a cloth, keep at 20-26 C. Never leave it longer than 72 hours or the grains starve.", "Slightly cloudy, less sweet.", temp=True),
     step("Strain", 10, "Strain out the grains and start the next batch with them straight away.", "Grains out.", hands=True),
     step("Optional second ferment", 36 * H, "Bottle the liquid with fruit or ginger for flavour and fizz.", "Fizzy; chill.", temp=True),
     step("Chill", 6 * H, "Refrigerate to stop it.", "Cold.", temp=False)],
    "sourced", 23.0,
    safety=[BOTTLE, "Alcohol builds if bottles stay warm and sweet: chill early. Low, but not guaranteed zero."],
    notes="Make the next batch with the grains the moment you strain them.", yield_text="About one litre per litre of water.", sources=["kk_waterkefir"], amount_step=0.5))

# ---- Milk kefir -------------------------------------------------------------------------------
RECIPES.append(recipe(
    "milk_kefir", "drinks", "kefir", "Milk kefir",
    "Milk cultured by kefir grains into a tangy, drinkable yoghurt. Easier than it sounds.",
    "Litres of milk", "L", 1,
    [ing("Whole milk", 1000, "ml", "any dairy milk"),
     ing("Milk kefir grains", 25, "g", "about 1 tablespoon per 500 ml; adjust to taste")],
    [step("Combine", 5, "Put the grains in a clean jar and add the milk. Cover with a cloth.", "", hands=True),
     step("Ferment", 24 * H, "Keep at about 20-24 C, out of direct sun.", "Thick, tangy and starting to separate.", temp=True),
     step("Strain", 10, "Strain the grains out with a plastic or steel sieve and start the next batch.", "Grains out.", hands=True),
     step("Chill", 6 * H, "Refrigerate. Keeps a week or two.", "Cold.", temp=False)],
    "starting point", 22.0,
    safety=["If it smells rotten, goes pink or shows mould, discard it. A clean tangy smell is normal."],
    notes="Typical home practice: not yet checked against a published source.", yield_text="Slightly less than the milk started with.", sources=[], amount_step=0.5))

# --------------------------------------------------------------------------------------------
# FERMENTED AND PRESERVED FOODS
# --------------------------------------------------------------------------------------------
# ---- Sauerkraut -----------------------------------------------------------------------------
RECIPES.append(recipe(
    "sauerkraut", "food", "kraut", "Sauerkraut",
    "Cabbage and salt, nothing else. Weigh the salt: that is where the safety is.",
    "Kilograms of sliced cabbage", "kg", 0.8,
    [ing("Cabbage, finely sliced", 1000, "g"),
     ing("Fine salt, no additives", 20, "g", "2 % of the cabbage by weight; the published range is 1.5-2.5 %", var=True, mult=10)],
    [step("Clean everything", 15, "Wash the jar, weight and your hands: clean tools prevent spoilage.", "", hands=True),
     step("Slice and salt", 20, "Slice the cabbage thinly, sprinkle with the salt, mix, and leave 30 minutes.", "Wet and glossy.", hands=True),
     step("Pack and weight", 20, "Pack tightly into a jar so brine covers the cabbage. Top with a whole leaf and a weight (not metal). Leave the lid loose.", "Brine above the cabbage.", hands=True),
     step("Ferment", 14 * D, "Keep at 18-22 C. Stand the jar in a bowl for overflow. Taste from the second week.", "Tart, crunchy, no mould.", temp=True, marks=[[10 * D, "Start tasting"]]),
     step("Refrigerate", 10, "Move to the fridge. It keeps for many months.", "Cold.", hands=True)],
    "sourced", 20.0,
    var={"label": "Salt (% of cabbage weight)", "unit": "%", "default": 2.0, "min": 1.5, "max": 2.5, "step": 0.1, "hint": "The published range is 1.5-2.5 %; too little salt allows bad bacteria and too much stops the fermentation."},
    safety=["Weigh the salt. Do not reduce it below the published range.", "Keep everything under the brine. Throw away anything with mould, a rotten smell or slime.", "The finished sauerkraut should have a pH of 4.6 or lower; a cheap strip will tell you."],
    notes="Use salt without anti-caking agents or iodine.", yield_text="Roughly the weight of the cabbage.", sources=["uvm_kraut"], amount_step=0.1))

# ---- Kimchi ----------------------------------------------------------------------------------
RECIPES.append(recipe(
    "kimchi", "food", "kimchi", "Kimchi (napa cabbage)",
    "Salted napa cabbage with a garlic, ginger and chilli paste. Ready to eat in a few days, better in a few weeks.",
    "Kilograms of napa cabbage", "kg", 0.9,
    [ing("Napa cabbage, cut in pieces", 1000, "g", group="Cabbage"),
     ing("Coarse sea salt for the brine", 55, "g", "the source says 1/4 cup per 2 lb; weigh your own, brands differ", group="Cabbage"),
     ing("Garlic, grated", 17, "g", group="Paste"),
     ing("Ginger, grated", 2, "g", group="Paste"),
     ing("Sugar", 4.4, "g", group="Paste"),
     ing("Fish sauce (or water for vegetarian)", 33, "ml", group="Paste"),
     ing("Gochugaru (Korean chilli flakes)", 22, "g", "the source gives 1-5 tablespoons to taste", group="Paste"),
     ing("Radish (daikon or Korean), matchsticks", 250, "g", group="Vegetables"),
     ing("Scallions (spring onions), in 2.5 cm pieces", 45, "g", group="Vegetables")],
    [step("Salt the cabbage", 90, "Dissolve the salt in water and soak the cabbage, weighted, for 1-2 hours.", "Cabbage bends without snapping.", temp=False),
     step("Rinse and drain", 30, "Rinse three times in cold water, then drain for 15-20 minutes.", "Not too salty to taste.", hands=True),
     step("Make the paste and mix", 30, "Mix the paste ingredients, then work them through the cabbage, radish and scallions (gloves help).", "Evenly red.", hands=True),
     step("Pack", 15, "Pack tightly into a jar, leaving a gap at the top. Press down so brine rises.", "Brine over the vegetables.", hands=True),
     step("Ferment", 3 * D, "Leave at a cool room temperature, out of sun, 1-5 days. Press down daily to release gas and taste.", "Pleasantly sour and fizzy.", temp=True, marks=[[1 * D, "Press down and taste"], [2 * D, "Press down and taste"]]),
     step("Refrigerate", 10, "Move to the fridge. Best after another week or two; keeps a few months.", "Cold.", hands=True)],
    "sourced", 18.0,
    safety=["Open jars slowly over a sink: gas builds. Keep the vegetables under the brine.", "Discard it if it has mould or smells rotten, rather than just sour or funky."],
    notes="The paste figures are per 900 g (2 lb) in the source, scaled. Fish sauce can be left out.", yield_text="Roughly one litre per kilogram.", sources=["kitchn_kimchi"], amount_step=0.1))

# ---- Pickles ---------------------------------------------------------------------------------
RECIPES.append(recipe(
    "pickles", "food", "pickles", "Fermented dill pickles",
    "Cucumbers fermented in a salt brine with dill and garlic, the old way. No vinegar-bath shortcut.",
    "Litres of brine", "L", 1,
    [ing("Small pickling cucumbers", 700, "g"),
     ing("Salt (no additives)", 50, "g", "a 5 % brine; use 35 g for a milder, shorter 'half-sour'", var=True, mult=10),
     ing("Water", 1000, "ml"),
     ing("Fresh dill", 15, "g"),
     ing("Garlic cloves", 4, "item"),
     ing("Vinegar (5 % acidity)", 15, "ml", "the Penn State page says not to leave the vinegar out of the tested recipe")],
    [step("Clean everything", 15, "Wash the jar, cucumbers and your hands. Cut off the blossom end (it holds an enzyme that softens pickles).", "", hands=True),
     step("Make the brine and pack", 25, "Dissolve the salt in the water. Pack the cucumbers, dill and garlic into the jar and cover with brine.", "All submerged.", hands=True),
     step("Weight", 10, "Hold them under with a plastic bag filled with brine (never plain water) or a weight.", "Nothing floating.", hands=True),
     step("Ferment", 21 * D, "Keep at 21-24 C (70-75 F). Skim off any scum. The Penn State page gives 3-4 weeks.", "Even olive colour, tart.", temp=True, marks=[[7 * D, "Skim and check"], [14 * D, "Skim and check"]]),
     step("Refrigerate", 10, "Move to the fridge. Keep up to six months.", "Cold.", hands=True)],
    "starting point", 22.0,
    var={"label": "Brine strength (% salt in the water)", "unit": "%", "default": 5, "min": 3.5, "max": 5.5, "step": 0.5, "hint": "5 % is a standard full-sour brine; 3.5 % is a milder half-sour that must be eaten sooner and kept cold."},
    safety=["Do not reduce the salt in a full-sour pickle. Throw away pickles that are soft, slimy or smell bad.", "Use food-grade containers: glass, glazed crock or food-grade plastic, never galvanised metal."],
    notes="The Penn State page does not give the brine amounts and refers readers to the National Center for Home Food Preservation. The amounts here are common brine strengths, not yet checked against that recipe.",
    yield_text="One litre of brine covers about 700 g of cucumbers.", sources=["psu_pickles"], amount_step=0.5))

# ---- Fermented butter ------------------------------------------------------------------------
RECIPES.append(recipe(
    "cultured_butter", "food", "butter", "Fermented (cultured) butter",
    "Cream is cultured first, then churned. Deeper, tangier, richer than sweet-cream butter. You get buttermilk as a by-product.",
    "Litres of cream", "L", 1,
    [ing("Pasteurised double cream (35-40 % fat)", 1000, "ml"),
     ing("Live yoghurt or cultured buttermilk", 60, "ml", "with live cultures on the label"),
     ing("Fine salt (optional, to taste)", 6, "g", "about 1.5 % of the butter")],
    [step("Warm the cream", 20, "Bring the cream to about 22 C. Stir in the yoghurt or buttermilk.", "Mixed.", hands=True),
     step("Culture", 18 * H, "Cover and keep at 20-24 C until slightly thickened, tangy and fragrant.", "Thicker than cream, pleasantly sour.", temp=True),
     step("Chill", 12 * H, "Chill the cultured cream in the fridge overnight.", "Cold.", temp=False),
     step("Churn", 20, "Whip in a mixer or jar until it splits into butter and buttermilk. Strain.", "Grainy lumps in thin liquid.", hands=True),
     step("Wash and salt", 20, "Rinse the butter in cold water, pressing until the water runs clear. Salt if you like.", "Rinse water clear.", hands=True),
     step("Store", 10, "Wrap and refrigerate. Use within two to three weeks, or freeze.", "Wrapped.", hands=True)],
    "starting point", 21.0,
    safety=["Start with pasteurised cream and keep it cold apart from the culturing step.", "Washing the butter thoroughly, until the water runs clear, makes it keep longer."],
    notes="Typical home practice, not yet checked against a published source. One litre of cream gives about 400 g of butter.",
    yield_text="About 400 g of butter and 600 ml of buttermilk per litre of cream.", sources=[], amount_step=0.5))

# ---- Kefir yoghurt (strained) ----------------------------------------------------------------
RECIPES.append(recipe(
    "kefir_yoghurt", "food", "kefir_food", "Kefir 'yoghurt' (strained milk kefir)",
    "Milk kefir strained until thick, like a tangy Greek-style yoghurt. Salt it and you have a soft cheese.",
    "Litres of milk", "L", 1,
    [ing("Whole milk", 1000, "ml"),
     ing("Milk kefir grains", 25, "g"),
     ing("Fine salt (optional, for a cheese)", 5, "g")],
    [step("Combine", 5, "Put the grains in a clean jar and add the milk.", "", hands=True),
     step("Ferment", 24 * H, "Keep at about 20-24 C.", "Thick, tangy, starting to separate.", temp=True),
     step("Strain the grains", 10, "Remove the grains and start the next batch.", "Grains out.", hands=True),
     step("Strain the kefir", 8 * H, "Hang the kefir in muslin over a bowl in the fridge until thick. The whey can be used in baking.", "As thick as you like.", temp=False)],
    "starting point", 22.0,
    safety=["Discard it if it smells rotten, goes pink or shows mould."],
    notes="Typical home practice. It loses about half its weight as whey.", yield_text="About 500 g per litre of milk.", sources=[], amount_step=0.5))

# ---- Fermented honey garlic ------------------------------------------------------------------
RECIPES.append(recipe(
    "honey_garlic", "food", "honey_ferment", "Fermented honey garlic",
    "Peeled garlic covered in raw honey. The garlic's water thins the honey and it slowly ferments. Sweet, mellow, savoury.",
    "Grams of peeled garlic", "g", 150,
    [ing("Garlic cloves, peeled", 1, "g"),
     ing("Raw honey", 2.1, "g", "by volume the source says 1:1 (1 cup of each)", sugar=0.0)],
    [step("Peel and dry", 30, "Peel the garlic and make sure it is dry. Use a clean, dry jar.", "No moisture.", hands=True),
     step("Fill and cover", 15, "Fill the jar no more than two-thirds, cover the garlic with honey, and push it under with a clean spoon.", "Garlic submerged.", hands=True),
     step("Burp daily", 21 * D, "Open the lid daily for the first two to three weeks to release gas, push the garlic down, and close again. Stir if you can do so cleanly.", "Bubbling has stopped and the honey is runny.", temp=True,
          marks=[[7 * D, "Burp the jar"], [14 * D, "Burp the jar and test with pH strips"]]),
     step("Mature", 30 * D, "Keep cool and dark. The garlic may turn blue or green, which is normal. It is at its best after several weeks.", "Mellow and sweet.", temp=False)],
    "starting point", 20.0,
    safety=["Never give honey to babies under 12 months.", "Check the pH after the first two weeks: under 4.6 is considered safe. If it is higher, do not eat it.", "Use dry garlic and a dry, clean jar. If it smells rotten or shows mould, discard it."],
    notes="Ratio taken from a food blog, not from a laboratory-tested recipe. The ratio here is by weight (about 2.1 g honey per gram of garlic).",
    yield_text="About a 2.5-fold weight of the garlic.", sources=["alpha_garlichoney"], amount_step=10, amount_min=10, amount_max=2000))

# ---- Fermented honey chilli ------------------------------------------------------------------
RECIPES.append(recipe(
    "honey_chilli", "food", "honey_ferment", "Fermented honey chilli",
    "Chillies in raw honey, fermented gently for a hot-sweet condiment.",
    "Grams of chillies", "g", 100,
    [ing("Fresh chillies (stems on, pricked or sliced)", 1, "g"),
     ing("Raw honey", 3, "g", "enough to cover completely")],
    [step("Prepare", 20, "Wash and dry the chillies, then prick them or cut into rings. Use a clean, dry jar.", "Dry.", hands=True),
     step("Fill and cover", 15, "Pack into the jar, cover with honey, and push under. Leave a gap at the top.", "All submerged.", hands=True),
     step("Burp daily", 21 * D, "Open the lid daily for the first weeks to release gas, push the chillies down, and close again.", "Bubbling has stopped.", temp=True, marks=[[7 * D, "Burp the jar"], [14 * D, "Burp the jar"]]),
     step("Mature", 21 * D, "Keep in a cool, dark place. Taste after three weeks.", "Hot and sweet.", temp=False)],
    "starting point", 20.0,
    safety=["Never give honey to babies under 12 months.", "Check the pH after two weeks: under 4.6 is considered safe. If it is higher, do not eat it.", "Wear gloves when handling chillies."],
    notes="Typical home practice, following the same method as the honey garlic. It has not been checked against a published source.",
    yield_text="About 3 times the chilli weight.", sources=["alpha_garlichoney"], amount_step=10, amount_min=10, amount_max=2000))

# ---- Jam ----------------------------------------------------------------------------------------
RECIPES.append(recipe(
    "jam", "food", "jam", "Jam (berries, no added pectin)",
    "Fruit, sugar and a little lemon, boiled to the setting point. Sugar does the preserving as well as the setting.",
    "Kilograms of fruit", "kg", 1,
    [ing("Fruit (crushed berries)", 1000, "g"),
     ing("Sugar", 830, "g", "the published berry jam is about 4 cups of sugar to 4 cups of crushed fruit", var=True),
     ing("Lemon juice", 15, "ml", "helps the set and keeps colour")],
    [step("Prepare jars", 30, "Wash the jars and keep them hot in the oven or canner.", "Jars hot.", hands=True),
     step("Cook", 25, "Crush the fruit, add the sugar and lemon, stir over a gentle heat until the sugar has dissolved, then boil hard.", "Reaches 105 C (220 F) at sea level, or a drop wrinkles on a cold plate.", temp=False, hands=True),
     step("Fill the jars", 20, "Ladle into hot jars, leaving 5 mm at the top. Wipe the rims and cap.", "Capped.", hands=True),
     step("Process or refrigerate", 15, "For shelf storage, process in a boiling-water canner for 5 minutes (0-300 m) or 10 minutes (300-1800 m); otherwise keep in the fridge.", "Sealed lids.", hands=True),
     step("Cool and set", 24 * H, "Leave undisturbed for 12-24 hours. Check the seals.", "Lids do not flex.", temp=False)],
    "sourced", 20.0,
    var={"label": "Sugar (g per kilogram of fruit)", "unit": "g", "default": 830, "min": 500, "max": 1100, "step": 10, "hint": "Less sugar means a softer set and a shorter life; sugar is a preservative."},
    safety=["Process in a boiling-water canner as the tested recipe says if you want it shelf-stable; do not use unsealed jars you are unsure about.", "Discard anything with mould, even a little."],
    notes="Setting temperature drops about 1 C for every 150 m above sea level; check the National Center for Home Food Preservation chart for your altitude.", yield_text="About 1.5 kg of jam per kg of fruit.", sources=["nchfp_jam"], amount_step=0.5))

# ---- Preserved lemons ------------------------------------------------------------------------
RECIPES.append(recipe(
    "preserved_lemons", "food", "preserves", "Preserved lemons",
    "Lemons packed in salt until the rind turns soft and mellow. A classic salt preserve.",
    "Kilograms of lemons", "kg", 1,
    [ing("Unwaxed lemons", 1000, "g"),
     ing("Coarse salt", 150, "g", "about 15 % of the lemon weight, a typical home ratio", var=True),
     ing("Extra lemon juice to top up", 200, "ml")],
    [step("Prepare jars", 20, "Wash a jar and rinse with boiling water.", "", hands=True),
     step("Cut and salt", 30, "Cut the lemons almost into quarters, stuff with salt and pack tightly.", "Packed.", hands=True),
     step("Add juice", 10, "Press down and add juice until the lemons are covered. Leave a gap at the top.", "Covered.", hands=True),
     step("Cure", 30 * D, "Keep at room temperature, turning the jar every few days.", "The rind is soft and translucent.", temp=True, marks=[[7 * D, "Turn the jar"], [14 * D, "Turn the jar"], [21 * D, "Turn the jar"]]),
     step("Refrigerate", 10, "Move to the fridge. Rinse before use. Keeps for several months.", "Cold.", hands=True)],
    "starting point", 20.0,
    var={"label": "Salt (g per kilogram of lemons)", "unit": "g", "default": 150, "min": 100, "max": 250, "step": 10, "hint": "Do not use less than about 100 g per kg."},
    safety=["Keep the lemons covered in juice. Discard the jar if it shows mould or smells off."],
    notes="Typical home practice, not yet checked against a published source.", yield_text="Fills a litre jar.", sources=[], amount_step=0.5))

# ---- Chutney ---------------------------------------------------------------------------------
RECIPES.append(recipe(
    "chutney", "food", "chutney", "Chutney (apple and onion)",
    "A slow-cooked fruit, onion, sugar and vinegar preserve. The vinegar acid and sugar keep it.",
    "Kilograms of fruit", "kg", 1,
    [ing("Apples (peeled, cored, chopped)", 1000, "g"),
     ing("Onions, chopped", 300, "g"),
     ing("Sugar (soft brown)", 450, "g", "", sugar=0.0),
     ing("Vinegar (5 % acidity or higher)", 500, "ml"),
     ing("Salt", 10, "g"),
     ing("Spices (mustard seed, ginger, chilli, cinnamon)", 8, "g", "to taste")],
    [step("Prepare jars", 30, "Wash the jars and sterilise them in a hot oven or boiling water.", "Jars hot.", hands=True),
     step("Cook", 90, "Simmer everything, stirring often, until thick and no thin liquid pools when you drag a spoon across the pan.", "A spoon leaves a clear trail.", temp=False, hands=True),
     step("Pot", 20, "Spoon into the hot jars, cap, and wipe.", "Capped.", hands=True),
     step("Mature", 28 * D, "Store cool and dark for four weeks to mellow.", "Mellow, not sharp.", temp=False)],
    "starting point", 20.0,
    safety=["Use vinegar of at least 5 % acidity. Do not reduce the vinegar or sugar: they preserve it.", "For long storage on the shelf, follow a tested canning recipe's processing times; otherwise keep it in the fridge after opening."],
    notes="Typical home ratios, not yet checked against a published tested recipe.", yield_text="About 1.3 kg of chutney per kg of fruit.", sources=[], amount_step=0.5))

# ---- Syrup -----------------------------------------------------------------------------------
RECIPES.append(recipe(
    "syrup", "food", "syrup", "Sugar syrup (simple to rich)",
    "Sugar dissolved in water. One-to-one is simple syrup; two-to-one is richer and keeps longer. Add ginger, citrus or herbs to infuse.",
    "Litres of water", "L", 0.5,
    [ing("Sugar", 1000, "g", "1 part sugar to 1 part water by weight is simple syrup, 2 to 1 is rich", var=True, mult=1),
     ing("Water", 1000, "ml"),
     ing("Flavouring (ginger, peel, herbs), optional", 100, "g")],
    [step("Dissolve", 10, "Heat the water gently, add the sugar and stir until clear. Do not boil hard.", "Clear.", hands=True),
     step("Infuse (optional)", 30, "Add flavouring and leave to steep as it cools.", "Tastes right.", temp=False),
     step("Strain and bottle", 10, "Strain into a clean bottle.", "Bottled.", hands=True),
     step("Chill", 6 * H, "Store in the fridge: simple syrup about a month, rich syrup longer.", "Cold.", temp=False)],
    "starting point", 20.0,
    var={"label": "Sugar (g per litre of water)", "unit": "g", "default": 1000, "min": 500, "max": 2000, "step": 100, "hint": "1000 g per litre is a simple syrup, 2000 g per litre a rich one."},
    safety=["Keep it chilled and use clean bottles. If it goes cloudy or grows mould, throw it away."],
    notes="Plain sugar syrup, with no source needed. Ginger syrup is a good place to start.", yield_text="About 1.6 litres of syrup per litre of water.", sources=[], amount_step=0.1))


# --------------------------------------------------------------------------------------------
# Write the file the web page reads.
# --------------------------------------------------------------------------------------------
if __name__ == "__main__":
    with open("data.json", "w", encoding="utf-8") as f:
        json.dump({"recipes": RECIPES, "sources": SOURCES}, f, ensure_ascii=False, indent=1)
    print(f"Wrote data.json: {len(RECIPES)} recipes, {len(SOURCES)} sources")
