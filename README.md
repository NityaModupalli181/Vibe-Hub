# ✦ Vibe Hub

A web app where people sign up, log in, and pick something to do — **alone** or **together**.

- **Solo activities**
  - ✏️ **Doodle** — the app generates a new *doodle of the day* every day (e.g. "A sleepy penguin drinking bubble tea"). Draw it on the built-in canvas (colours, brush size, eraser, undo, 5-minute challenge), save it to your profile, download a PNG, and see everyone else's drawings of the same prompt.
  - 🍳 **Cooking** — choose **Veg** or **Non-veg** and get a full recipe (ingredients checklist + method). Recipes come live from TheMealDB, with a built-in library as fallback.
  - 📖 **Reading** — a short story, a poem (live from PoetryDB), or a random article from the internet (Wikipedia), with a reading progress bar.
  - 💄 **Makeup** — makeup inspo with a colour palette, a little face preview, product list and step-by-step instructions; filter by vibe.
  - ⭐ Save any recipe, reading or look to your **Saved** page.
- **Group activities** — Table Tennis, Badminton, Bowling, Dance, Basketball, Football, Gym.
  Picking one drops you into **today's group chat** for that activity with everyone else who picked it.
  - Real-time messages (Socket.io), typing indicators, emoji reactions, quick replies
  - Online member list and live "online now" counts in the lobby
  - **Plan a meetup**: propose what / where / when and everyone RSVPs ✅ / 🤔 / ❌
  - Each group lives for **one day**. At midnight the chat is cleared and a fresh group forms, with a countdown in the room.
- **Motivational quote banner** at the top of every page, changing every **10 seconds**.
- **SQLite database** (users, quotes, doodles, recipes, readings, looks, favourites, chat messages, reactions, meetups, RSVPs).

## Run it!

Requires **Node.js 18 or newer** (20+ recommended).

```bash
npm install
npm start
```

Open **http://localhost:3000**, create an account, and you're in.
To try the group chat, open a second browser (or a private window), register another user, and join the same activity.

For auto-restart while editing code: `npm run dev`.

## Deploy for free (Render)

1. Put this folder on GitHub (new repository → "uploading an existing file" → drag in everything inside `vibe-hub/`).
2. Sign in at [render.com](https://render.com) with GitHub → **New +** → **Blueprint** → pick the repository → **Apply**.
   `render.yaml` sets up a free Node web service with a generated `JWT_SECRET`, `NODE_ENV=production` and a health check.
3. After the build (2–4 minutes) the app is live at `https://vibe-hub-xxxx.onrender.com`.

Free-plan notes: the service sleeps after 15 minutes without visitors and takes about a minute to wake.
The free plan has no persistent disk, so the SQLite database starts fresh whenever the service restarts, sleeps or redeploys
(content is re-seeded automatically; accounts and chats are lost). To keep it awake during judging, add a free
monitor at [uptimerobot.com](https://uptimerobot.com) that visits `https://<your-app>.onrender.com/healthz` every 5 minutes.

## Configuration (optional)

Set these as environment variables:

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port to listen on |
| `JWT_SECRET` | auto-generated in `data/.jwt_secret` | Secret for signing login tokens |
| `DB_PATH` | `data/vibehub.db` | Where the SQLite file lives |
| `TZ` | system time zone | When the daily rollover (midnight) happens, e.g. `TZ=Asia/Kolkata` |
| `NODE_ENV` | — | Set to `production` to mark cookies `Secure` (requires HTTPS) |

## Database

The database file is created automatically at `data/vibehub.db` and seeded with starter content on first run.
To start over: `npm run reset-db` (then `npm start`).

You can browse it with any SQLite tool (e.g. [DB Browser for SQLite](https://sqlitebrowser.org/)). Tables:

| Table | Holds |
|---|---|
| `users` | accounts (passwords hashed with bcrypt) |
| `quotes` | motivational quotes for the banner |
| `doodle_words`, `daily_doodles` | word banks and the generated prompt for each day |
| `doodles` | drawings users saved |
| `recipes`, `readings`, `makeup_looks` | offline content library |
| `favorites` | items users saved |
| `group_messages`, `message_reactions` | daily chat rooms (`room_key = activity:YYYY-MM-DD`) |
| `meetups`, `meetup_votes` | proposed plans and RSVPs |

## Project structure

```
vibe-hub/
├── server.js            # Express app + Socket.io server
├── db.js                # SQLite connection & schema
├── seed.js              # Starter content
├── socket.js            # Real-time group chat & daily rollover
├── middleware/auth.js   # JWT cookie auth
├── routes/
│   ├── auth.js          # register / login / logout / me
│   ├── quotes.js        # quotes for the banner
│   ├── solo.js          # doodle, recipes, reading, makeup, favourites
│   └── group.js         # activity list & room info
├── lib/
│   ├── activities.js    # the 7 group activities
│   ├── chat.js          # chat/meetup DB helpers
│   ├── online.js        # TheMealDB, PoetryDB, Wikipedia fetchers
│   ├── presence.js      # who's online in each room
│   └── time.js          # day keys, midnight timer, seeded random
├── public/
│   ├── index.html       # login / register
│   ├── app.html         # the app (single page)
│   ├── css/style.css
│   └── js/              # common, auth, app, doodle, chat
├── scripts/reset-db.js
└── data/                # database lives here (created on first run)
```

## Content sources

- Recipes: [TheMealDB](https://www.themealdb.com) (free API)
- Poems: [PoetryDB](https://poetrydb.org)
- Articles: [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/)
- Built-in short stories and articles are original; built-in poems are public domain.

If the internet isn't available, everything falls back to the built-in library automatically.

## Credits and licences

Everything in this repository was written for this project, except the items below, which are credited here and in the code.

| What | Source | Licence / status |
|---|---|---|
| Express, Socket.io, better-sqlite3, bcryptjs, jsonwebtoken, cookie-parser | npm packages (used as dependencies, not copied) | MIT |
| Seeded random generator in `lib/time.js` | "xmur3" by bryc, [github.com/bryc/code](https://github.com/bryc/code/blob/master/jshash/PRNGs.md), with MurmurHash3 constants by Austin Appleby | Public domain |
| Fonts: Fraunces, DM Sans | Google Fonts | SIL Open Font License |
| Live recipes | TheMealDB free test API key, used for an educational project | TheMealDB terms |
| Live poems | PoetryDB (public-domain poems) | Public domain |
| Live articles | Wikipedia article summaries, linked back to the full article | CC BY-SA 4.0 |
| Built-in poems | Emily Dickinson, William Wordsworth, Robert Frost ("The Road Not Taken", 1916), Percy Bysshe Shelley | Public domain |
| Motivational quotes | Short quotations, each shown with its author or source | Quotation with attribution |
| Research mentioned in built-in articles | Andrade, J. (2009), "What does doodling do?", *Applied Cognitive Psychology*; Wiltermuth, S. & Heath, C. (2009), "Synchrony and Cooperation", *Psychological Science* | Cited |
| Recipes, stories, articles, makeup looks, doodle word lists, UI design and all other code | Written for Vibe Hub | MIT (see `LICENSE`) |

## Troubleshooting

- **`better-sqlite3` fails to install** — it usually downloads a prebuilt binary. If your Node version is very new and none exists, install build tools (Windows: "Desktop development with C++" from Visual Studio Build Tools; macOS: `xcode-select --install`) or switch to Node 20/22 LTS, then rerun `npm install`.
- **Port in use** — run with another port: `PORT=4000 npm start` (Windows PowerShell: `$env:PORT=4000; npm start`).
