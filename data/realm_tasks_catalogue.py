# RT-2 (Oct 27 2026): the realm task catalogue. Types per realm, then tasks.
# Tasks marked with an activity key (k=...) are Alex's 52 picks from Oct 13 (myDay.REALM_ACTIVITIES) -> status kept.
# Everything else is a proposal Alex keeps / edits / drops in the app. Loaded into realm_tasks (dedup trigger).
TYPES = {
 'producer': [('create','🎹','Create'),('finish','🎚','Finish & mix'),('sound','🔊','Sound design & digging'),('learn','🎓','Learn & practise'),('catalog','🗂','Catalogue & organise')],
 'creator': [('plan','📝','Plan & script'),('film','🎥','Film'),('edit','✂️','Edit'),('post','📤','Post & engage'),('grow','📈','Learn & analyse')],
 'hustler': [('sell','💰','Sell & list'),('outreach','📨','Outreach'),('followup','🔁','Follow up'),('brand','🏷','Brand & store'),('biz','📊','Business')],
 'chef': [('plan','📋','Plan & shop'),('cook','🍳','Cook'),('learn','🎓','Learn'),('kitchen','🧺','Kitchen & stock'),('recipes','📖','Recipes')],
 'athlete': [('strength','🏋️','Strength'),('cardio','🏃','Cardio'),('mobility','🧘','Mobility & recovery'),('fuel','🥩','Fuel & body'),('track','📈','Track & plan')],
 'scholar': [('read','📚','Read'),('study','📝','Study'),('watch','🎬','Watch & analyse'),('review','🔁','Review & recall'),('write','✍️','Write & teach')],
 'life': [('plan','🗓','Plan & review'),('admin','📎','Admin & errands'),('journal','📓','Journal'),('habits','🔁','Habits'),('self','✨','Self-care & style')],
 'homekeeper': [('clean','🧽','Clean'),('declutter','📦','Declutter'),('maintain','🔧','Fix & maintain'),('supplies','🧴','Supplies'),('laundry','👕','Laundry')],
 'mind': [('calm','🧘','Calm'),('digital','📵','Digital detox'),('sleep','😴','Sleep'),('reflect','💭','Reflect'),('grow','🌱','Mindset')],
 'steward': [('budget','💷','Budget'),('track','🧾','Track spending'),('save','🏦','Save'),('shop','🛍','Smart buying'),('plan','📈','Money plan')],
 'explorer': [('trips','✈️','Trips'),('local','📍','Local'),('culture','🎭','Culture'),('language','🗣','Languages'),('research','🔎','Research')],
 'connector': [('family','👪','Family'),('friends','🤝','Friends'),('music','🎵','Music network'),('community','🌍','Community'),('care','💌','Care')],
 'builder': [('test','🧪','Test RPGACE'),('ideas','💡','Ideas & flags'),('code','💻','Code'),('learn','🎓','Learn tech'),('ship','🚀','Ship & review')],
}
# (type, title, mins, extra) ; extra: k=activity key (kept), once=True, earns/opens/how
T = lambda ty, title, mins=30, **kw: dict(type=ty, title=title, mins=mins, **kw)
TASKS = {
 'producer': [
  T('create','Make a beat',90,k='beat',earns='real',how='log it in Beat Log',opens='pipeline'),
  T('create','Flip a sample',60), T('create','Make a beat in a genre you never use',90), T('create','30-minute beat challenge',30),
  T('create','Sketch 3 loop ideas',45), T('create','Recreate a reference track\'s drums',45), T('create','Write a melody with no drums first',30),
  T('finish','Finish or mix a WIP beat',60,k='wip',earns='real',how='mark the beat finished',opens='pipeline'),
  T('finish','Arrange a loop into a full beat',60), T('finish','Mix a beat against a reference track',45),
  T('finish','Bounce stems for a finished beat',20), T('finish','Check a mix on car, phone and headphones',20),
  T('sound','Sound design / digging',45,k='sound'), T('sound','Dig for 10 new samples',30), T('sound','Design 5 drum sounds',30),
  T('sound','Build a custom drum kit',60), T('sound','Make 5 synth presets',45), T('sound','Record one-shots or foley at home',30),
  T('learn','Practise a technique',30,k='technique'), T('learn','Study a producer breakdown video',30), T('learn','Learn one music theory idea',20),
  T('learn','Practise chord progressions on keys',20), T('learn','Learn a new plugin feature',20), T('learn','Ear training',15),
  T('catalog','Name and tag finished beats',20), T('catalog','Back up the beat folder',15), T('catalog','Clean up the WIP folder',20),
  T('catalog','Add BPM and key to untagged beats',20), T('catalog','Pick 3 beats to release this week',15)],
 'creator': [
  T('plan','Write captions or a script',20,k='captions',opens='oracle'), T('plan','Brainstorm 10 video hooks',20), T('plan','Plan this week\'s posts',20),
  T('plan','Write a shot list',15), T('plan','Storyboard a beat video',30),
  T('film','Film / record content',60,k='film'), T('film','Film studio-life B-roll',30), T('film','Screen-record a beat being made',60),
  T('film','Film 3 short clips in one go',45), T('film','Take photos for posts',20),
  T('edit','Edit a short',45), T('edit','Make a beat video',60), T('edit','Visual treatment for a beat',45,k='treatment',earns='real',how='finish the treatment',opens='pipeline'),
  T('edit','Make thumbnails for 3 videos',30), T('edit','Add subtitles to a video',20),
  T('post','Post a short',30,k='post',earns='real',how='post the video',opens='pipeline'), T('post','Reply to comments',15),
  T('post','Engage with 10 producers\' posts',20), T('post','Cross-post to every platform',15), T('post','Post a story update',10),
  T('grow','Review last week\'s post stats',15), T('grow','Study a top creator\'s format',30), T('grow','Test a new hook style',30), T('grow','Update bios and links',15,once=True)],
 'hustler': [
  T('sell','Make a Beatstars listing',30,k='beatstars',opens='pipeline'), T('sell','List 3 beats for sale',30), T('sell','Make a beat bundle',30),
  T('sell','Run a discount or promo',20), T('sell','Compare licence prices with other producers',20,once=True),
  T('outreach','Message 3 artists',20,k='outreach',earns='real',how='log each message in the outreach log',opens='outreach'),
  T('outreach','Research artists to pitch',30,k='research'), T('outreach','Send beats to a playlist curator',20),
  T('outreach','Pitch for a placement',30), T('outreach','Find 5 artists in your genre',20),
  T('followup','Follow up a collab',15,k='followup',opens='outreach'), T('followup','Follow up pitches that are due',15),
  T('followup','Ask a buyer for feedback',10), T('followup','Check in with a past collaborator',10),
  T('brand','Update the beat store page',30), T('brand','Make a promo graphic or clip',30), T('brand','Collect a testimonial',15), T('brand','Write a producer bio / press kit',45,once=True),
  T('biz','Check this month\'s income',15), T('biz','Read a music business article',20), T('biz','Register songs with PRS',30,once=True),
  T('biz','Review your licence agreement',30,once=True), T('biz','Set this month\'s sales goal',10)],
 'chef': [
  T('plan','Plan this week\'s cooks',20), T('plan','Write the shopping list',10), T('plan','Do the food shop',60),
  T('cook','Meal prep',90,k='mealprep',earns='real',how='finish the cook',opens='cooking'), T('cook','Cook a saved recipe',60,opens='cooking'),
  T('cook','Cook a new cuisine',60), T('cook','Batch-cook for the freezer',90), T('cook','Cook a high-protein meal',45),
  T('learn','Learn a technique',20,k='technique'), T('learn','Practise knife skills',20), T('learn','Master a sauce',30), T('learn','Learn a baking basic',45),
  T('kitchen','Update kitchen stock',10,k='stock',opens='cooking'), T('kitchen','Clear out the fridge',15), T('kitchen','Organise the spices',15), T('kitchen','Use up something about to go off',30),
  T('recipes','Generate & save a new recipe',30,k='recipe',earns='real',how='save the recipe',opens='cooking'),
  T('recipes','Rate and note a recipe you cooked',5), T('recipes','Recreate a restaurant dish at home',60), T('recipes','Save a recipe from a video',10)],
 'athlete': [
  T('strength','Gym session',60,k='gym',earns='real',how='log it in the Gym tracker',opens='gym'), T('strength','Home workout',30,k='home'),
  T('strength','Follow today\'s gym plan',60,opens='gym'), T('strength','Bodyweight circuit',20), T('strength','Work towards a PB',60,opens='gym'),
  T('cardio','Run or walk',30,k='run'), T('cardio','Hit 10k steps',90), T('cardio','Cycle or swim',45), T('cardio','HIIT',15),
  T('mobility','Stretch / mobility',15,k='stretch'), T('mobility','Foam roll',10), T('mobility','Yoga session',30), T('mobility','Posture reset after a studio session',10),
  T('fuel','Hit today\'s protein target',5), T('fuel','Drink 8 glasses of water',5), T('fuel','Log today\'s food',10), T('fuel','Prep healthy snacks',20),
  T('track','Weigh in and log it',5), T('track','Review the week\'s training',15), T('track','Plan next week\'s sessions',15), T('track','Take progress photos',5)],
 'scholar': [
  T('read','Read a Bookworm chapter',30,k='chapter',earns='real',how='analyse the chapter',opens='bookworm'), T('read','Read 20 pages',30),
  T('read','Read an article in your field',15), T('read','Start a new book',30),
  T('study','Exam practice (Study)',20,k='study',earns='real',how='finish a practice round',opens='study'), T('study','Study a lesson',30,opens='study'), T('study','Do a course module',45),
  T('watch','Watch & analyse a video',30,k='video',opens='bookworm'), T('watch','Watch a documentary',60), T('watch','Watch a masterclass and take notes',60),
  T('review','Review 10 jargon terms',15,k='jargon',earns='real',how='review the terms',opens='taxonomy'), T('review','Recall due idea cards',10), T('review','Review last week\'s notes',15),
  T('write','Explain something back in your own words',15), T('write','Write a book summary',30), T('write','Teach someone what you learned',20)],
 'life': [
  T('plan','Plan tomorrow',10,k='plan',opens='plan_tomorrow'), T('plan','Weekly review',15,k='review'), T('plan','Set this month\'s goals',20), T('plan','Check progress on your goals',15),
  T('admin','Admin & errands',30,k='admin'), T('admin','Clear the email inbox',20), T('admin','Book an appointment',10), T('admin','Renew a document',20,once=True),
  T('journal','Journal — 3 lines',5,k='journal',earns='real',how='write the entry',opens='journal'), T('journal','Write a gratitude list',5), T('journal','Write through a big decision',20),
  T('habits','Start a new habit',10), T('habits','Review your habit streaks',10),
  T('self','Get a haircut',45), T('self','Sort the wardrobe',30), T('self','Skincare routine',10)],
 'homekeeper': [
  T('clean','Deep clean one area',45,k='deep'), T('clean','Clean the bathroom',30), T('clean','Clean the kitchen',30), T('clean','Hoover and mop',30), T('clean','Clean the studio desk',15),
  T('declutter','Declutter one spot',20,k='declutter'), T('declutter','Sell or donate 5 things',30), T('declutter','Sort cables and gear',20),
  T('maintain','Fix or repair something',30,k='fix'), T('maintain','Test the smoke alarm',5), T('maintain','Change the bedsheets',15),
  T('supplies','Restock household items',10,k='restock'), T('supplies','Check cleaning supplies',5),
  T('laundry','Do a wash',15), T('laundry','Fold and put clothes away',15), T('laundry','Iron for the week',30)],
 'mind': [
  T('calm','Meditate',10,k='meditate'), T('calm','Walk outside / breathing',15,k='walk'), T('calm','Box breathing',5), T('calm','Sit in silence',10),
  T('digital','Screen-free hour',60,k='screenfree'), T('digital','Phone in another room while you work',60), T('digital','No social media before noon',5),
  T('sleep','Wind-down routine',20,k='winddown',earns='real',how='tick your sleep routine'), T('sleep','In bed by your target time',5), T('sleep','No caffeine after 2pm',5),
  T('reflect','Answer shadow-work questions',20), T('reflect','Write out what is on your mind',10), T('reflect','Name one win from today',5),
  T('grow','Read a mindset chapter',20), T('grow','Do one hard thing on purpose',30), T('grow','Stay smoke-free today',5)],
 'steward': [
  T('budget','Budget check',15,k='budget',opens='chronicles'), T('budget','Set this week\'s spend limit',5),
  T('track','Log this week\'s spending',10,k='spend',earns='real',how='log each expense',opens='chronicles'), T('track','Log receipts',10), T('track','Review subscriptions',15),
  T('save','Move money to savings',5), T('save','Put the old smoking money aside',5), T('save','Check your savings goal',5),
  T('shop','Review Wishlist',10,k='wishlist',opens='wishlist'), T('shop','Compare prices for a big buy',20),
  T('plan','Plan bills & savings',20,k='bills'), T('plan','Review business costs for the tax year',30), T('plan','Set a 3-month money goal',15)],
 'explorer': [
  T('trips','Plan a trip or day out',20,k='trip',earns='real',how='save the plan',opens='plans'), T('trips','Book something for a trip',20),
  T('local','Try somewhere new locally',60,k='local'), T('local','Try a new café or restaurant in Derby',60), T('local','Go to a park or nature spot',60),
  T('culture','Go to a gig or club night',180), T('culture','Visit a museum or gallery',90),
  T('language','Practise a language',20,k='language'), T('language','Learn 10 words in French or Russian',15),
  T('research','Research a place or event',20,k='research',opens='plans'), T('research','Find events on this month',15)],
 'connector': [
  T('family','Message a friend or family',10,k='message'), T('family','Plan a family visit',15),
  T('friends','Catch up with someone',20,k='catchup',earns='real',how='log it in People',opens='plans'), T('friends','Plan a meetup',15,k='meetup',opens='plans'), T('friends','Invite a friend to something',10),
  T('music','Collab with another producer',60), T('music','DM a producer you admire',10), T('music','Go to a producer meetup',120),
  T('community','Join a community / event',30,k='community'), T('community','Help someone in a music community',15),
  T('care','Remember an upcoming birthday',5), T('care','Send a thank-you message',5)],
 'builder': [
  T('test','Hand-test RPGACE features',15,k='handtest',earns='real',how='tick each feature on the smoke test page',opens='smoke'),
  T('test','Report a bug you found',10),
  T('ideas','Flag an idea to Claude Code',5,k='flag',earns='real',how='flag it from Oracle',opens='oracle'), T('ideas','Write down 3 app ideas',10), T('ideas','Review Oracle\'s suggestions',10),
  T('code','Coding session',60,k='code'), T('code','Build a small script or tool',60),
  T('learn','Learn a coding skill',30,k='learncode'),
  T('ship','Read this week\'s patch notes',10), T('ship','Plan the next RPGACE feature',20)],
}

def q(s): return "'" + str(s).replace("'", "''") + "'"
def types_sql():
    rows = []
    for realm, ts in TYPES.items():
        for i, (k, icon, label) in enumerate(ts):
            rows.append('(%s,%s,%s,%s,%s,%d)' % (q(realm + ':' + k), q(realm), q(k), q(label), q(icon), i))
    return 'insert into realm_task_types (id, realm, key, label, icon, sort) values ' + ','.join(rows) + ' on conflict (id) do nothing'
def realm_sql(realm):
    rows = []
    for t in TASKS[realm]:
        kept = 'k' in t
        src = '[{"table":"realm_activities","ref":"%s"}]' % t['k'] if kept else '[{"table":"catalogue","ref":"rt2"}]'
        rows.append('(%s,%s,%s,%s,%d,%s,%s,%s,%s,%s)' % (q(realm), q(t['type']), q(t['title']), q('once' if t.get('once') else 'repeat'), t['mins'],
            q(t.get('earns', 'tick')), 'null' if not t.get('opens') else q(t['opens']), 'null' if not t.get('how') else q(t['how']),
            q('kept' if kept else 'proposed'), q(src) + '::jsonb'))
    return 'insert into realm_tasks (realm, type_key, title, kind, mins, earns, opens, how, status, sources) values ' + ','.join(rows)
if __name__ == '__main__':
    import sys
    a = sys.argv[1]
    print(types_sql() if a == 'types' else realm_sql(a))

def compact_sql(realms):
    rows = []
    for realm in realms:
        for t in TASKS[realm]:
            f = lambda v: 'null' if v is None else q(v)
            rows.append('(%s,%s,%s,%d,%s,%s,%s,%s,%s)' % (q(realm), q(t['type']), q(t['title']), t['mins'], f(t.get('k')),
                f('once' if t.get('once') else None), f(t.get('earns')), f(t.get('opens')), f(t.get('how'))))
    return ("insert into realm_tasks (realm,type_key,title,kind,mins,earns,opens,how,status,sources) select r,ty,ti,coalesce(kd,'repeat'),m,"
            "coalesce(e,'tick'),o,h,case when k is null then 'proposed' else 'kept' end,case when k is null then '[{\"table\":\"catalogue\",\"ref\":\"rt2\"}]'::jsonb "
            "else jsonb_build_array(jsonb_build_object('table','realm_activities','ref',k)) end from (values " + ','.join(rows) +
            ") v(r,ty,ti,m,k,kd,e,o,h)")
