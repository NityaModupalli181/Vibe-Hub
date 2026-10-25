// Fills the database with starter content the first time the app runs.
// Online sources (TheMealDB, PoetryDB, Wikipedia) are used live when reachable;
// everything here is the offline library and fallback.
const db = require('./db');

// Short quotations, each credited to the person (or tradition) it comes from.
// Quotes commonly misattributed online (e.g. to Einstein, Twain, Wilde) were left out on purpose.
const quotes = [
  ['The best way out is always through.', 'Robert Frost, “A Servant to Servants”'],
  ['Well done is better than well said.', 'Benjamin Franklin, Poor Richard’s Almanack'],
  ['You miss 100% of the shots you don’t take.', 'Wayne Gretzky'],
  ['The only way to do great work is to love what you do.', 'Steve Jobs, Stanford commencement, 2005'],
  ['Talent wins games, but teamwork and intelligence win championships.', 'Michael Jordan, I Can’t Accept Not Trying'],
  ['Nothing great was ever achieved without enthusiasm.', 'Ralph Waldo Emerson, “Circles”'],
  ['Isn’t it nice to think that tomorrow is a new day with no mistakes in it yet?', 'L. M. Montgomery, Anne of Green Gables'],
  ['A year from now you may wish you had started today.', 'Karen Lamb'],
  ['To strive, to seek, to find, and not to yield.', 'Alfred, Lord Tennyson, “Ulysses”'],
  ['Alone we can do so little; together we can do so much.', 'Helen Keller'],
  ['Make voyages! Attempt them! There’s nothing else.', 'Tennessee Williams, Camino Real'],
  ['Dream big and dare to fail.', 'Norman Vaughan'],
  ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Will Durant, The Story of Philosophy'],
  ['Do what you can, with what you have, where you are.', 'Squire Bill Widener, quoted by Theodore Roosevelt'],
  ['Our doubts are traitors, and make us lose the good we oft might win by fearing to attempt.', 'William Shakespeare, Measure for Measure'],
  ['I am not afraid of storms, for I am learning how to sail my ship.', 'Louisa May Alcott, Little Women'],
  ['No one is useless in this world who lightens the burden of it to any one else.', 'Charles Dickens, Our Mutual Friend'],
  ['All we have to decide is what to do with the time that is given us.', 'J. R. R. Tolkien, The Fellowship of the Ring'],
  ['Not all those who wander are lost.', 'J. R. R. Tolkien, The Fellowship of the Ring'],
  ['Life is like riding a bicycle. To keep your balance, you must keep moving.', 'Albert Einstein, letter to his son, 1930'],
  ['Knowing is not enough; we must apply. Willing is not enough; we must do.', 'Johann Wolfgang von Goethe'],
  ['Courage is grace under pressure.', 'Ernest Hemingway'],
  ['Fall seven times, stand up eight.', 'Japanese proverb'],
  ['The journey of a thousand miles begins with a single step.', 'Laozi, Tao Te Ching'],
  ['Imagination is more important than knowledge.', 'Albert Einstein, 1929 interview'],
  ['Hold fast to dreams.', 'Langston Hughes, “Dreams”'],
  ['I can’t change the direction of the wind, but I can adjust my sails to always reach my destination.', 'Jimmy Dean'],
  ['We keep moving forward, opening up new doors and doing new things.', 'Walt Disney'],
  ['Teamwork makes the dream work.', 'John C. Maxwell'],
  ['“Hope” is the thing with feathers that perches in the soul.', 'Emily Dickinson'],
];

const doodleWords = {
  adjective: ['sleepy', 'grumpy', 'dancing', 'tiny', 'giant', 'surprised', 'royal', 'sparkly', 'shy',
    'heroic', 'confused', 'fluffy', 'robotic', 'ancient', 'jolly', 'nervous', 'spooky', 'chill', 'fancy', 'brave'],
  subject: ['cactus', 'cat', 'teapot', 'octopus', 'cloud', 'avocado', 'dragon', 'penguin', 'lighthouse',
    'sloth', 'rocket', 'mushroom', 'snail', 'umbrella', 'whale', 'toaster', 'owl', 'pineapple', 'dinosaur',
    'hot-air balloon', 'fox', 'donut', 'treehouse', 'jellyfish', 'bicycle', 'moon', 'hedgehog', 'robot'],
  action: ['wearing a scarf', 'on a skateboard', 'reading a book', 'at a birthday party', 'in outer space',
    'surfing a wave', 'drinking bubble tea', 'playing guitar', 'hiding in a teacup', 'on a rainy day',
    'with tiny wings', 'lifting weights', 'at the beach', 'baking cookies', 'in a snow globe',
    'riding a train', 'wearing sunglasses', 'flying a kite', 'having a picnic', 'under the stars'],
};

const doodleTips = [
  'Start with simple shapes — circles, ovals and boxes — then add details.',
  'Give it a face! Two dots and a curve add instant personality.',
  'Try drawing it with one continuous line, without lifting your pen.',
  'Pick only three colours and stick to them.',
  'Set a 5-minute timer and don’t overthink it.',
  'Add a little background: a ground line, a sun, or some stars.',
  'Exaggerate one feature — huge eyes, tiny legs, an enormous hat.',
  'Use thick lines for the outline and thin ones for the details.',
];

const recipes = [
  // ---------- Vegetarian ----------
  {
    diet: 'veg', title: 'Creamy Tomato Basil Pasta', cuisine: 'Italian', minutes: 25, serves: 2,
    ingredients: ['200 g pasta (penne or spaghetti)', '2 tbsp olive oil', '3 garlic cloves, minced',
      '400 g canned crushed tomatoes', '1/2 tsp chilli flakes', '1/2 cup cream or milk',
      'Handful fresh basil', 'Salt and pepper', 'Grated parmesan to serve'],
    steps: ['Boil the pasta in well-salted water until al dente; save 1/2 cup of pasta water.',
      'Warm the olive oil in a pan and gently fry the garlic and chilli flakes for 1 minute.',
      'Add the crushed tomatoes, season, and simmer for 8–10 minutes.',
      'Stir in the cream and torn basil, then toss in the drained pasta.',
      'Loosen with a splash of pasta water and serve with parmesan.'],
  },
  {
    diet: 'veg', title: 'Paneer Butter Masala', cuisine: 'Indian', minutes: 35, serves: 3,
    ingredients: ['250 g paneer, cubed', '2 tbsp butter', '1 onion, chopped', '3 tomatoes, chopped',
      '10 cashews', '1 tsp ginger-garlic paste', '1 tsp Kashmiri chilli powder', '1 tsp garam masala',
      '1/4 cup cream', '1 tsp dried fenugreek (kasuri methi)', 'Salt to taste'],
    steps: ['Cook the onion, tomatoes and cashews with a splash of water for 10 minutes, then blend smooth.',
      'Melt butter, fry the ginger-garlic paste for a minute, then add chilli powder.',
      'Pour in the blended sauce and simmer for 8 minutes until it thickens.',
      'Add garam masala, salt, crushed kasuri methi and cream.',
      'Fold in the paneer, simmer 3 minutes, and serve with naan or rice.'],
  },
  {
    diet: 'veg', title: 'Crispy Veggie Fried Rice', cuisine: 'Chinese', minutes: 20, serves: 2,
    ingredients: ['2 cups cooked rice (preferably day-old)', '2 tbsp oil', '2 garlic cloves, minced',
      '1 carrot, diced', '1/2 cup peas', '1/2 bell pepper, diced', '2 spring onions, sliced',
      '2 tbsp soy sauce', '1 tsp sesame oil', 'Pepper to taste'],
    steps: ['Heat the oil in a wok until very hot and fry the garlic for 20 seconds.',
      'Add carrot, peas and pepper; stir-fry for 3 minutes.',
      'Add the rice and press it against the wok so it crisps a little.',
      'Season with soy sauce, sesame oil and pepper and toss well.',
      'Finish with spring onions and serve hot.'],
  },
  {
    diet: 'veg', title: 'Chickpea & Spinach Curry', cuisine: 'Indian', minutes: 30, serves: 3,
    ingredients: ['1 can chickpeas, drained', '2 handfuls spinach', '1 onion, chopped', '2 tomatoes, chopped',
      '1 tsp cumin seeds', '1 tsp turmeric', '1 tsp coriander powder', '1 tsp garam masala',
      '200 ml coconut milk', '2 tbsp oil', 'Salt and lemon juice'],
    steps: ['Heat oil, crackle the cumin seeds, then cook the onion until golden.',
      'Add the tomatoes and spices; cook until the oil separates.',
      'Stir in the chickpeas and coconut milk and simmer 10 minutes.',
      'Wilt in the spinach, season with salt and a squeeze of lemon.',
      'Serve with rice or flatbread.'],
  },
  {
    diet: 'veg', title: 'Loaded Veggie Quesadillas', cuisine: 'Mexican', minutes: 15, serves: 2,
    ingredients: ['4 flour tortillas', '1 cup grated cheese', '1/2 cup black beans', '1/2 cup sweetcorn',
      '1/2 red onion, finely chopped', '1 tsp smoked paprika', 'Fresh coriander', 'Salsa and sour cream to serve'],
    steps: ['Mix the beans, corn, onion, paprika and coriander in a bowl.',
      'Sprinkle cheese over half of each tortilla, top with the filling, then more cheese.',
      'Fold over and cook in a dry pan for 2–3 minutes per side until golden.',
      'Cut into wedges and serve with salsa and sour cream.'],
  },
  {
    diet: 'veg', title: 'Mushroom Risotto', cuisine: 'Italian', minutes: 40, serves: 2,
    ingredients: ['1 cup arborio rice', '250 g mushrooms, sliced', '1 small onion, finely chopped',
      '2 garlic cloves', '3 cups hot vegetable stock', '2 tbsp butter', '1/3 cup parmesan',
      'Fresh thyme', 'Salt and pepper'],
    steps: ['Brown the mushrooms in half the butter, then set aside.',
      'Soften the onion and garlic in the rest of the butter, then add the rice and toast 1 minute.',
      'Add stock a ladle at a time, stirring, waiting until each is absorbed (about 18 minutes).',
      'Stir in the mushrooms, parmesan and thyme; season.',
      'Rest for 2 minutes, then serve.'],
  },
  // ---------- Non-vegetarian ----------
  {
    diet: 'nonveg', title: 'Classic Butter Chicken', cuisine: 'Indian', minutes: 45, serves: 4,
    ingredients: ['600 g boneless chicken', '1/2 cup yogurt', '2 tsp ginger-garlic paste', '2 tsp garam masala',
      '1 tsp chilli powder', '3 tbsp butter', '1 onion, chopped', '400 g tomato puree', '1/2 cup cream',
      '1 tsp kasuri methi', 'Salt to taste'],
    steps: ['Marinate the chicken in yogurt, half the ginger-garlic paste and spices for 20 minutes.',
      'Sear the chicken in a hot pan until browned; set aside.',
      'Melt butter, cook the onion and remaining ginger-garlic paste until soft.',
      'Add tomato puree and simmer 10 minutes, then blend if you like it smooth.',
      'Return the chicken, add cream and kasuri methi, and simmer 10 minutes. Serve with naan.'],
  },
  {
    diet: 'nonveg', title: 'Garlic Butter Shrimp', cuisine: 'American', minutes: 15, serves: 2,
    ingredients: ['300 g shrimp, peeled', '3 tbsp butter', '4 garlic cloves, minced', '1/2 tsp chilli flakes',
      'Juice of 1/2 lemon', '2 tbsp chopped parsley', 'Salt and pepper'],
    steps: ['Pat the shrimp dry and season with salt and pepper.',
      'Melt butter in a pan, add garlic and chilli flakes, and cook 30 seconds.',
      'Add shrimp in one layer; cook 1–2 minutes per side until pink.',
      'Squeeze in lemon juice and toss with parsley.',
      'Serve over rice, pasta or with crusty bread.'],
  },
  {
    diet: 'nonveg', title: 'Chicken Teriyaki Bowl', cuisine: 'Japanese', minutes: 25, serves: 2,
    ingredients: ['2 chicken thighs, sliced', '3 tbsp soy sauce', '2 tbsp honey', '1 tbsp rice vinegar',
      '1 tsp grated ginger', '1 tsp cornflour', '1 tbsp oil', '2 cups cooked rice', 'Sesame seeds and spring onion'],
    steps: ['Whisk soy, honey, vinegar, ginger and cornflour with 2 tbsp water.',
      'Fry the chicken in oil until golden and cooked through.',
      'Pour in the sauce and bubble until sticky and glossy.',
      'Spoon over rice and top with sesame seeds and spring onion.'],
  },
  {
    diet: 'nonveg', title: 'Spicy Egg Bhurji', cuisine: 'Indian', minutes: 15, serves: 2,
    ingredients: ['4 eggs', '1 onion, finely chopped', '1 tomato, chopped', '1 green chilli, chopped',
      '1/4 tsp turmeric', '1/2 tsp chilli powder', '1 tbsp butter or oil', 'Fresh coriander', 'Salt'],
    steps: ['Heat butter and cook the onion and chilli until soft.',
      'Add tomato and spices; cook 2 minutes.',
      'Pour in the beaten eggs and stir gently over low heat until softly set.',
      'Finish with coriander and serve with toast or paratha.'],
  },
  {
    diet: 'nonveg', title: 'Lemon Herb Baked Salmon', cuisine: 'Mediterranean', minutes: 25, serves: 2,
    ingredients: ['2 salmon fillets', '2 tbsp olive oil', '1 lemon (zest and slices)', '2 garlic cloves, grated',
      '1 tsp dried oregano', 'Fresh dill or parsley', 'Salt and pepper'],
    steps: ['Heat the oven to 200°C (400°F).',
      'Mix olive oil, lemon zest, garlic, oregano, salt and pepper.',
      'Brush over the salmon and lay lemon slices on top.',
      'Bake for 12–15 minutes until it flakes easily.',
      'Scatter with fresh herbs and serve with salad or potatoes.'],
  },
  {
    diet: 'nonveg', title: 'Beef Tacos', cuisine: 'Mexican', minutes: 25, serves: 3,
    ingredients: ['400 g minced beef', '1 onion, chopped', '2 garlic cloves', '1 tsp cumin', '1 tsp smoked paprika',
      '1/2 tsp chilli powder', '6 small tortillas', 'Lettuce, tomato, cheese, lime', 'Salt'],
    steps: ['Brown the beef in a hot pan, breaking it up.',
      'Add onion and garlic; cook until soft.',
      'Stir in the spices, salt and a splash of water; simmer 5 minutes.',
      'Warm the tortillas and fill with beef and toppings. Finish with lime.'],
  },
];

const readings = [
  // ---------- Short stories (original) ----------
  {
    kind: 'story', title: 'Juniper and the Hundred and Twelve Steps', author: 'Vibe Hub Originals',
    body: `Every night at nine, Juniper the cat climbed the hundred and twelve steps of the old lighthouse to watch the lamp come on.

The keeper, an old man named Teodor, never invited her. She simply arrived, sat on the windowsill, and stared at the sea as if she were the one responsible for every ship out there.

One winter the lamp failed. A storm had cracked the wiring, and Teodor fumbled in the dark with cold fingers. Juniper didn't move from the sill. She stared, unblinking, at a single point on the horizon.

Teodor followed her gaze and saw it: the faint light of a fishing boat, far too close to the rocks.

He grabbed the hand lantern, the one he'd kept for fifty years and never needed, and swung it in long arcs through the window. The boat turned. Slowly, then surely, it found the safe channel.

In the morning, the fisherman climbed the hundred and twelve steps with a parcel of fresh sardines. "For whoever was watching," he said.

Teodor nodded toward the windowsill. Juniper accepted the sardines as if she'd been expecting them all along.`,
  },
  {
    kind: 'story', title: 'The Seed in Grandma’s Coat', author: 'Vibe Hub Originals',
    body: `Mira found the seed in the pocket of her grandmother's gardening coat, a month after the funeral.

It was small and grey, with a ridge down one side like a closed eye. No label. No note. Just a seed.

She planted it in a chipped teacup on her apartment windowsill, mostly because she didn't know what else to do with it. She watered it every morning before work and talked to it a little, the way her grandmother used to talk to the tomatoes.

For three weeks, nothing happened.

On the twenty-second day, a pale green loop pushed through the soil, like something stretching after a long sleep. By spring it had climbed the curtain rod. By summer it bloomed: a single orange flower that smelled exactly like her grandmother's kitchen — cardamom, warm bread, and rain on the porch.

Mira saved the seeds from that flower. She gave one to each of her cousins, in a small envelope, with no label and no note.

Some things, she decided, you have to discover for yourself.`,
  },
  {
    kind: 'story', title: 'Thanks, Stranger', author: 'Vibe Hub Originals',
    body: `The text arrived at 11:48 p.m.: "Did you make it home okay?"

Dev didn't recognise the number. He typed "I think you have the wrong person" — then deleted it. Instead he wrote: "Yes, home safe. Thanks for checking."

"Good," came the reply. "I always worry."

He should have stopped there. But the next evening he got another message: "Big presentation tomorrow. Wish me luck." So he did. And the day after: "It went great!!" with three exploding-firework emojis.

For two weeks, Dev cheered on a stranger he would never meet. He learned she was afraid of pigeons, loved terrible puns, and was training for her first 10K.

Then one day: "Wait. My brother just told me he never got any of my texts. WHO IS THIS?"

Dev sat very still. Then he typed the truth.

There was a long pause. Then: "So a random stranger has been my biggest supporter for two weeks?"

"Pretty much," he wrote. "Good luck on the 10K."

On race day, she sent him a photo from the finish line. She was holding a sign that said: THANKS, WRONG NUMBER.`,
  },
  {
    kind: 'story', title: 'Mr. Okafor’s Library Card', author: 'Vibe Hub Originals',
    body: `Nobody believed Ana when she said the books rearranged themselves at night.

She was the newest librarian, and she closed up alone on Thursdays. Every Friday morning, a few books were somewhere new: a cookbook in the astronomy section, a poetry collection propped open in the children's corner.

So one Thursday she hid behind the returns desk and waited.

At midnight, nothing magical happened. No floating books, no whispers. Instead, the night cleaner, a quiet older man named Mr. Okafor, wandered the aisles with his mop, pulled out a book that caught his eye, and read a page or two before slipping it back — wherever he happened to be standing.

Ana stepped out. He jumped. "I'm sorry," he said. "I never finished school. I've been reading my way through this place for eleven years."

The next Thursday, Ana left a library card on his cart with his name on it, and a note: "Take them home. Bring them back to the right shelf. Or don't — I like the surprises."`,
  },
  // ---------- Poems (public domain) ----------
  {
    kind: 'poem', title: '“Hope” is the thing with feathers', author: 'Emily Dickinson',
    body: `“Hope” is the thing with feathers -
That perches in the soul -
And sings the tune without the words -
And never stops - at all -

And sweetest - in the Gale - is heard -
And sore must be the storm -
That could abash the little Bird
That kept so many warm -

I’ve heard it in the chillest land -
And on the strangest Sea -
Yet - never - in Extremity,
It asked a crumb - of me.`,
  },
  {
    kind: 'poem', title: 'I Wandered Lonely as a Cloud', author: 'William Wordsworth',
    body: `I wandered lonely as a cloud
That floats on high o'er vales and hills,
When all at once I saw a crowd,
A host, of golden daffodils;
Beside the lake, beneath the trees,
Fluttering and dancing in the breeze.

Continuous as the stars that shine
And twinkle on the milky way,
They stretched in never-ending line
Along the margin of a bay:
Ten thousand saw I at a glance,
Tossing their heads in sprightly dance.

The waves beside them danced; but they
Out-did the sparkling waves in glee:
A poet could not but be gay,
In such a jocund company:
I gazed—and gazed—but little thought
What wealth the show to me had brought:

For oft, when on my couch I lie
In vacant or in pensive mood,
They flash upon that inward eye
Which is the bliss of solitude;
And then my heart with pleasure fills,
And dances with the daffodils.`,
  },
  {
    kind: 'poem', title: 'The Road Not Taken', author: 'Robert Frost',
    body: `Two roads diverged in a yellow wood,
And sorry I could not travel both
And be one traveler, long I stood
And looked down one as far as I could
To where it bent in the undergrowth;

Then took the other, as just as fair,
And having perhaps the better claim,
Because it was grassy and wanted wear;
Though as for that the passing there
Had worn them really about the same,

And both that morning equally lay
In leaves no step had trodden black.
Oh, I kept the first for another day!
Yet knowing how way leads on to way,
I doubted if I should ever come back.

I shall be telling this with a sigh
Somewhere ages and ages hence:
Two roads diverged in a wood, and I—
I took the one less traveled by,
And that has made all the difference.`,
  },
  {
    kind: 'poem', title: 'Ozymandias', author: 'Percy Bysshe Shelley',
    body: `I met a traveller from an antique land,
Who said—“Two vast and trunkless legs of stone
Stand in the desert. . . . Near them, on the sand,
Half sunk a shattered visage lies, whose frown,
And wrinkled lip, and sneer of cold command,
Tell that its sculptor well those passions read
Which yet survive, stamped on these lifeless things,
The hand that mocked them, and the heart that fed;
And on the pedestal, these words appear:
My name is Ozymandias, King of Kings;
Look on my Works, ye Mighty, and despair!
Nothing beside remains. Round the decay
Of that colossal Wreck, boundless and bare
The lone and level sands stretch far away.”`,
  },
  // ---------- Short articles (original) ----------
  {
    kind: 'article', title: 'Why Doodling Is Good for Your Brain', author: 'Vibe Hub Originals',
    body: `Doodling has a reputation as a sign of boredom, but research suggests the opposite: drawing simple shapes while listening can actually help you pay attention.

In a 2009 study, psychologist Jackie Andrade at the University of Plymouth asked people to listen to a dull phone message. Those who were asked to doodle while listening remembered noticeably more of its details afterwards than those who simply listened. Her explanation is that light, low-stakes drawing keeps the brain just busy enough to stop it from drifting into daydreams.

Doodling also lowers the pressure of "making art." There's no blank canvas to be scared of — just a pen, a margin and a few minutes. That makes it a gentle way to practise creativity every day.

Try it: set a five-minute timer, pick one simple object, and draw it three different ways. You might be surprised how quickly your hand loosens up.`,
  },
  {
    kind: 'article', title: 'The Surprising Science of Playing Together', author: 'Vibe Hub Originals',
    body: `Team sports and group classes do more for us than burn calories.

When people move in sync — dancing to the same beat, rowing together, or passing a ball back and forth — many report feeling closer to each other afterwards. In a 2009 study, Stanford researchers Scott Wiltermuth and Chip Heath found that people who had sung or moved in time together cooperated more in a group game afterwards.

Group exercise also helps with consistency. It's easy to skip a solo workout, but much harder to cancel when three friends are waiting at the court. Accountability turns a good intention into a habit.

And there's the simple fact that laughing with other people is fun. A missed shot or a clumsy dance move is far less embarrassing — and far more memorable — when you're sharing it.

If you've been meaning to get active, try finding your people first. The workout often follows.`,
  },
  {
    kind: 'article', title: 'A Beginner’s Guide to Cooking Without a Recipe', author: 'Vibe Hub Originals',
    body: `Recipes are great teachers, but the real joy of cooking starts when you learn a few patterns you can improvise around.

Most savoury dishes follow a simple shape: fat, aromatics, main ingredient, liquid, seasoning, and something fresh at the end. Oil and onions, then garlic; vegetables or protein; a splash of stock, tomatoes or coconut milk; salt and spice; and finally herbs or a squeeze of citrus.

Once you see that shape, a stir-fry, a curry and a pasta sauce start to look like cousins.

Taste as you go. If something feels flat, it often needs salt or acid. If it's too sharp, a little fat or sweetness rounds it out. If it's too heavy, add something fresh and crunchy.

Start with dishes you've cooked from a recipe a few times, then change one thing. That's how cooks are made.`,
  },
];

const makeupLooks = [
  {
    name: 'Soft Glam Glow', vibe: 'Glam', occasion: 'Date night or dinner',
    palette: [['Champagne', '#F3D9B1'], ['Warm Bronze', '#A0673E'], ['Rosewood', '#B5606B'], ['Nude Pink', '#D9A3A0']],
    products: ['Luminous foundation', 'Cream bronzer', 'Champagne shimmer shadow', 'Brown eyeliner', 'Rosewood lip liner', 'Nude gloss'],
    steps: ['Prep with moisturiser and a glow primer.', 'Apply a light layer of foundation and conceal only where needed.',
      'Sweep warm bronze into the crease and blend upward.', 'Pat champagne shimmer on the centre of the lid.',
      'Smudge brown liner along the upper lash line and add two coats of mascara.',
      'Line lips with rosewood and top with nude gloss.'],
  },
  {
    name: 'Clean Girl Minimal', vibe: 'Natural', occasion: 'Everyday, class or work',
    palette: [['Skin Tint', '#E8C4A2'], ['Peach Flush', '#F2A585'], ['Brow Taupe', '#7A6250'], ['Clear Balm', '#F7E7E1']],
    products: ['Skin tint', 'Spot concealer', 'Cream blush', 'Clear brow gel', 'Lengthening mascara', 'Tinted lip balm'],
    steps: ['Hydrate skin well — this look is all about healthy skin.', 'Tap on a sheer skin tint with your fingers.',
      'Conceal only redness or dark spots.', 'Dab cream blush high on the cheeks and blend toward the temples.',
      'Brush brows up with clear gel for a fluffy finish.', 'One coat of mascara and a swipe of tinted balm.'],
  },
  {
    name: 'Bold Red Lip Classic', vibe: 'Classic', occasion: 'Parties and celebrations',
    palette: [['Ivory Base', '#F1DCC7'], ['True Red', '#C1121F'], ['Soft Brown', '#8D6E63'], ['Jet Black', '#1B1B1B']],
    products: ['Matte foundation', 'Translucent powder', 'Liquid eyeliner', 'Volumising mascara', 'Red lip liner', 'Matte red lipstick'],
    steps: ['Create an even, matte base and set lightly with powder.', 'Wash a soft brown across the lids for definition.',
      'Draw a thin winged liner — keep it subtle so the lip stays the star.', 'Curl lashes and apply mascara.',
      'Outline lips precisely with red liner, then fill with matte red.', 'Clean the edges with a little concealer on a flat brush.'],
  },
  {
    name: 'Sunset Smokey Eye', vibe: 'Bold', occasion: 'Concerts or nights out',
    palette: [['Tangerine', '#F28C28'], ['Magenta', '#C2185B'], ['Plum', '#5E2750'], ['Gold Fleck', '#D4AF37']],
    products: ['Eyeshadow primer', 'Warm sunset palette', 'Gold pressed glitter', 'Black kohl', 'False lashes (optional)', 'Neutral lip'],
    steps: ['Prime lids so the colours stay vivid.', 'Blend tangerine through the crease as a transition shade.',
      'Pack magenta on the outer third and deepen the corner with plum.', 'Press gold glitter on the centre of the lid.',
      'Smoke kohl along the lower lash line and blend with plum.', 'Keep the lips neutral to balance the eyes.'],
  },
  {
    name: 'Dewy K-Beauty Gradient', vibe: 'Fresh', occasion: 'Brunch or casual hangouts',
    palette: [['Glass Skin', '#F6E3D4'], ['Peach Coral', '#FF9E80'], ['Berry Tint', '#C2185B'], ['Pearl', '#FFF5EE']],
    products: ['Hydrating essence', 'Cushion foundation', 'Liquid highlighter', 'Coral cream blush', 'Lip tint', 'Brown mascara'],
    steps: ['Layer essence and a dewy primer for the glass-skin effect.', 'Pat on cushion foundation in thin layers.',
      'Tap pearl highlight on the cheekbones, nose bridge and cupid’s bow.', 'Blend peach coral blush just under the eyes.',
      'Apply lip tint to the centre of the lips and blur outward with a fingertip for a gradient.',
      'Finish with a soft brown mascara.'],
  },
  {
    name: 'Graphic Liner Pop', vibe: 'Editorial', occasion: 'Photoshoots and creative days',
    palette: [['Electric Blue', '#1E88E5'], ['Neon Lime', '#C6FF00'], ['White', '#FFFFFF'], ['Soft Nude', '#D7B49E']],
    products: ['Coloured liquid liners', 'Tape (for sharp lines)', 'Long-wear concealer', 'Nude lipstick', 'Setting spray'],
    steps: ['Prep a clean, neutral base and set the lids with powder.', 'Use tape as a guide for a crisp outer wing.',
      'Draw a floating crease line in electric blue.', 'Add a lime accent dot or dash at the inner corner.',
      'Keep the rest minimal: nude lip and groomed brows.', 'Lock everything in with setting spray.'],
  },
  {
    name: 'Bronzed Sun-Kissed', vibe: 'Warm', occasion: 'Beach days and summer outings',
    palette: [['Golden Bronze', '#B87333'], ['Terracotta', '#C8553D'], ['Honey', '#E1A95F'], ['Caramel', '#A9744F']],
    products: ['Water-resistant tint', 'Bronzing drops', 'Terracotta blush', 'Cream bronzer stick', 'Waterproof mascara', 'Lip oil'],
    steps: ['Mix bronzing drops into moisturiser for an all-over glow.', 'Warm up the face with cream bronzer where the sun naturally hits.',
      'Blend terracotta blush across the cheeks and over the nose.', 'Sweep honey shadow over the lids with a finger.',
      'Add waterproof mascara.', 'Finish with a caramel-tinted lip oil.'],
  },
  {
    name: 'Fairy Shimmer', vibe: 'Dreamy', occasion: 'Festivals or themed parties',
    palette: [['Lilac', '#C8A2C8'], ['Iridescent', '#E0F7FA'], ['Pastel Pink', '#F8BBD0'], ['Silver', '#C0C0C0']],
    products: ['Lilac matte shadow', 'Iridescent topper', 'Face gems', 'Pink blush', 'Silver liner', 'Glossy pink lip'],
    steps: ['Blend lilac through the crease and slightly onto the brow bone.', 'Tap iridescent shimmer on the lids and inner corners.',
      'Draw a fine silver line along the lower lash line.', 'Place a few face gems at the outer corner of the eye.',
      'Apply pastel pink blush high on the cheeks.', 'Top lips with a glossy pink.'],
  },
];

function seed() {
  const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;

  const tx = db.transaction(() => {
    if (!count('quotes')) {
      const ins = db.prepare('INSERT INTO quotes (text, author) VALUES (?, ?)');
      quotes.forEach(([t, a]) => ins.run(t, a));
    }
    if (!count('doodle_words')) {
      const ins = db.prepare('INSERT INTO doodle_words (kind, word) VALUES (?, ?)');
      Object.entries(doodleWords).forEach(([kind, words]) => words.forEach((w) => ins.run(kind, w)));
    }
    if (!count('recipes')) {
      const ins = db.prepare(`INSERT INTO recipes (diet, title, cuisine, minutes, serves, ingredients, steps)
        VALUES (@diet, @title, @cuisine, @minutes, @serves, @ingredients, @steps)`);
      recipes.forEach((r) => ins.run({ ...r, ingredients: JSON.stringify(r.ingredients), steps: JSON.stringify(r.steps) }));
    }
    if (!count('readings')) {
      const ins = db.prepare('INSERT INTO readings (kind, title, author, body) VALUES (@kind, @title, @author, @body)');
      readings.forEach((r) => ins.run(r));
    }
    if (!count('makeup_looks')) {
      const ins = db.prepare(`INSERT INTO makeup_looks (name, vibe, occasion, palette, products, steps)
        VALUES (@name, @vibe, @occasion, @palette, @products, @steps)`);
      makeupLooks.forEach((m) => ins.run({
        ...m,
        palette: JSON.stringify(m.palette.map(([name, hex]) => ({ name, hex }))),
        products: JSON.stringify(m.products),
        steps: JSON.stringify(m.steps),
      }));
    }
  });
  tx();
}

module.exports = { seed, doodleTips };
