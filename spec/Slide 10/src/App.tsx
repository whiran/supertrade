import { useState } from "react";

type Item = { id: number; name: string; price: number };

const START: Item[] = [
  { id: 1, name: "Air Jordan 1", price: 180 },
  { id: 2, name: "Yeezy 350", price: 230 },
  { id: 3, name: "Nike Dunk Low", price: 120 },
  { id: 4, name: "New Balance 550", price: 110 },
];

type Copy = { rows: Item[]; ghosts: number[] };

const mk = (): Copy => ({ rows: START.map((r) => ({ ...r })), ghosts: [] });

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="max-w-5xl mx-auto px-5 py-14">
      <div className="flex items-center gap-3 mb-6">
        <span className="h-9 w-9 rounded-full bg-fuchsia-500 text-white grid place-items-center font-bold">{n}</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Table({ copy, title, tag, tagColor }: { copy: Copy; title: string; tag: string; tagColor: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm">{title}</h4>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${tagColor}`}>{tag}</span>
      </div>
      <ul className="space-y-1.5 min-h-[190px]">
        {copy.rows.map((r) => {
          const ghost = copy.ghosts.includes(r.id);
          return (
            <li
              key={r.id}
              className={`flex justify-between text-sm rounded-lg px-3 py-2 ${
                ghost ? "bg-red-500/15 border border-red-500/40 text-red-300" : "bg-slate-800"
              }`}
            >
              <span>
                {ghost && "👻 "}
                {r.name}
              </span>
              <span>${r.price}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Simulator() {
  const [src, setSrc] = useState<Item[]>(START.map((r) => ({ ...r })));
  const [ts, setTs] = useState<Copy>(mk());
  const [tr, setTr] = useState<Copy>(mk());
  const [lg, setLg] = useState<Copy>(mk());
  const [trWrites, setTrWrites] = useState(0);
  const [nextId, setNextId] = useState(5);
  const [msg, setMsg] = useState("Do something to the store's inventory ↓");

  const applyAll = (fn: (c: Copy) => Copy) => {
    setTs((c) => fn(c));
    setTr((c) => fn(c));
    setLg((c) => fn(c));
  };

  const add = () => {
    const it = { id: nextId, name: ["Adidas Samba", "Puma Speedcat", "Asics Gel-1130", "Converse Chuck 70"][nextId % 4], price: 90 + (nextId % 5) * 10 };
    setNextId(nextId + 1);
    setSrc((s) => [...s, it]);
    applyAll((c) => ({ ...c, rows: [...c.rows, it] }));
    setTrWrites((w) => w + 2);
    setMsg(`➕ Added ${it.name}. Every method sees new rows.`);
  };

  const edit = () => {
    if (!src.length) return;
    const t = src[0];
    const upd = { ...t, price: t.price + 20 };
    setSrc((s) => s.map((r) => (r.id === t.id ? upd : r)));
    applyAll((c) => ({ ...c, rows: c.rows.map((r) => (r.id === t.id ? upd : r)) }));
    setTrWrites((w) => w + 2);
    setMsg(`✏️ ${t.name} price went up $20. Every method sees edits.`);
  };

  const del = () => {
    if (!src.length) return;
    const t = src[src.length - 1];
    setSrc((s) => s.filter((r) => r.id !== t.id));
    // timestamp: row just vanishes, query never returns it -> ghost stays
    setTs((c) => ({ ...c, ghosts: [...c.ghosts, t.id] }));
    const rm = (c: Copy) => ({ rows: c.rows.filter((r) => r.id !== t.id), ghosts: c.ghosts });
    setTr(rm);
    setLg(rm);
    setTrWrites((w) => w + 2);
    setMsg(`🗑️ Deleted ${t.name}. Watch the Timestamp copy… it never finds out.`);
  };

  const reset = () => {
    setSrc(START.map((r) => ({ ...r })));
    setTs(mk());
    setTr(mk());
    setLg(mk());
    setTrWrites(0);
    setNextId(5);
    setMsg("Reset. Try deleting a sneaker!");
  };

  const btn = "px-4 py-2 rounded-xl font-semibold text-sm transition active:scale-95";

  return (
    <div>
      <div className="rounded-2xl bg-slate-900 border border-fuchsia-500/40 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h4 className="font-bold mr-auto">🏪 KickDrop's real database (the source)</h4>
          <button onClick={add} className={`${btn} bg-emerald-500 text-slate-950`}>+ Add shoe</button>
          <button onClick={edit} className={`${btn} bg-amber-400 text-slate-950`}>✏️ Raise a price</button>
          <button onClick={del} className={`${btn} bg-red-500 text-white`}>🗑️ Delete a shoe</button>
          <button onClick={reset} className={`${btn} bg-slate-700`}>Reset</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {src.length === 0 && <span className="text-slate-500 text-sm">Empty store!</span>}
          {src.map((r) => (
            <span key={r.id} className="bg-slate-800 rounded-lg px-3 py-1.5 text-sm">
              {r.name} <b className="text-fuchsia-300">${r.price}</b>
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-cyan-300">{msg}</p>
      </div>

      <div className="text-center text-slate-500 text-sm mb-2">⬇ what each CDC method copies into the data warehouse ⬇</div>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Table copy={ts} title="1. Timestamp copy" tag={ts.ghosts.length ? `${ts.ghosts.length} ghost row(s)!` : "in sync"} tagColor={ts.ghosts.length ? "bg-red-500/30 text-red-300" : "bg-emerald-500/20 text-emerald-300"} />
          <p className="text-xs text-slate-400 mt-2">Asks “what was updated since last time?” A deleted row can't answer, so it's a 👻 ghost.</p>
        </div>
        <div>
          <Table copy={tr} title="2. Trigger copy" tag="in sync" tagColor="bg-emerald-500/20 text-emerald-300" />
          <p className="text-xs text-slate-400 mt-2">
            Correct, but the store did <b className="text-amber-300">{trWrites} extra writes</b> (a 2nd notebook entry for every action).
          </p>
        </div>
        <div>
          <Table copy={lg} title="3. Log-based copy" tag="in sync" tagColor="bg-emerald-500/20 text-emerald-300" />
          <p className="text-xs text-slate-400 mt-2">
            Correct, with <b className="text-emerald-300">0 extra writes</b>. It just reads the diary the database already keeps.
          </p>
        </div>
      </div>
    </div>
  );
}

const methods = [
  {
    icon: "🕒",
    name: "Timestamp / Audit Column",
    analogy: "Your friend asks: “Show me every shoe whose sticker says ‘edited today’.”",
    how: "Add an UpdatedAt column. A script regularly asks: “give me rows updated since my last check.”",
    del: "❌ Hard deletes are invisible. The fix is a “soft delete”: keep the row and flip IsDeleted = 1.",
    pro: "Super simple. Basic SQL.",
    con: "Scans big tables repeatedly and misses real deletes.",
    color: "from-sky-500 to-cyan-400",
  },
  {
    icon: "🪤",
    name: "Database Triggers",
    analogy: "Every time the cashier changes the stock, they ALSO write it in a second notebook, instantly.",
    how: "A rule inside the database copies each INSERT/UPDATE/DELETE into a “shadow” table in the same step.",
    del: "✅ Catches deletes: the trigger saves a record before the row disappears.",
    pro: "Catches everything, right away.",
    con: "Two writes per action. On a flash-sale day the app slows down.",
    color: "from-amber-400 to-orange-500",
  },
  {
    icon: "📜",
    name: "Log Scraping (Log-Based CDC)",
    analogy: "Databases already keep a diary for crash recovery. A silent reader (e.g. Debezium) just reads it.",
    how: "Tools read the transaction log (MySQL binlog, PostgreSQL WAL) and stream changes elsewhere.",
    del: "✅ Every delete must be in the log, so every delete is caught automatically.",
    pro: "Near real-time, almost zero load.",
    con: "Harder to set up, and it can break if the vendor changes the log format.",
    color: "from-fuchsia-500 to-violet-500",
  },
];

type Sys = { icon: string; name: string; why: string; answer: number; detail: string };
const options = ["Batch timestamp / file diff", "Log-based capture", "modified_since or webhooks"];
const systems: Sys[] = [
  {
    icon: "🏛️",
    name: "30-year-old Legacy Mainframe",
    answer: 0,
    detail: "You can't install modern log agents, and triggers could crash a critical system. Take a nightly snapshot and compare today's file with yesterday's (file diff). Rows missing today = deletes.",
    why: "Think: old, fragile, untouchable.",
  },
  {
    icon: "☁️",
    name: "Cloud MySQL Production DB",
    answer: 1,
    detail: "Cloud MySQL exposes its binlog natively. You get inserts, updates and hard deletes in near real-time without adding load to the live app.",
    why: "Think: modern, busy, and it keeps a log.",
  },
  {
    icon: "🔌",
    name: "SaaS API (HubSpot, Stripe)",
    answer: 2,
    detail: "You can't touch their database, so you use what the API gives you: poll ?updated_since=… or subscribe to webhooks like customer.deleted. Webhooks are what tell you about deletes.",
    why: "Think: you only get what the vendor exposes.",
  },
];

function Matchmaking() {
  const [picks, setPicks] = useState<(number | null)[]>([null, null, null]);
  const [revealed, setRevealed] = useState(false);
  const score = picks.filter((p, i) => p === systems[i].answer).length;

  return (
    <div>
      <p className="text-slate-300 mb-5">Take 60 seconds. Pick the best CDC method for each system, then reveal.</p>
      <div className="grid md:grid-cols-3 gap-4">
        {systems.map((s, i) => (
          <div key={s.name} className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col">
            <div className="text-4xl">{s.icon}</div>
            <h4 className="font-bold mt-2">{s.name}</h4>
            <p className="text-xs text-slate-400 mb-3">{s.why}</p>
            <div className="space-y-2 mt-auto">
              {options.map((o, j) => {
                const chosen = picks[i] === j;
                const right = revealed && j === s.answer;
                const wrong = revealed && chosen && j !== s.answer;
                return (
                  <button
                    key={o}
                    disabled={revealed}
                    onClick={() => setPicks((p) => p.map((v, k) => (k === i ? j : v)))}
                    className={`w-full text-left text-sm rounded-lg px-3 py-2 border transition ${
                      right
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                        : wrong
                        ? "bg-red-500/20 border-red-400 text-red-200"
                        : chosen
                        ? "bg-fuchsia-500/20 border-fuchsia-400"
                        : "bg-slate-800 border-transparent hover:border-slate-600"
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {revealed && <p className="text-xs text-slate-300 mt-3 leading-relaxed">{s.detail}</p>}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-4">
        {!revealed ? (
          <button onClick={() => setRevealed(true)} className="px-5 py-2.5 rounded-xl bg-fuchsia-500 font-bold hover:bg-fuchsia-400">
            Reveal answers
          </button>
        ) : (
          <>
            <span className="font-bold text-lg">You got {score}/3 {score === 3 ? "🎉" : "💪"}</span>
            <button
              onClick={() => {
                setRevealed(false);
                setPicks([null, null, null]);
              }}
              className="px-4 py-2 rounded-xl bg-slate-700 text-sm"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/30 via-slate-950 to-cyan-500/20" />
        <div className="relative max-w-5xl mx-auto px-5 pt-20 pb-16">
          <span className="text-xs uppercase tracking-widest text-fuchsia-300">Data Engineering · Slide 10</span>
          <h1 className="text-4xl sm:text-6xl font-black mt-3 leading-tight">
            Change Data Capture:
            <br />
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">“What changed?”</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-2xl">
            Imagine you run <b>KickDrop</b>, a sneaker store. Your friend keeps a copy of your stock list for the analytics dashboard.
            How does the friend's copy stay <i>exactly</i> right without re-copying the whole list every time?
            That's CDC.
          </p>
        </div>
      </header>

      <Section n="1" title="The problem: the vanishing sneaker">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <p className="text-slate-300 leading-relaxed">
              Last slide, we used a <code className="bg-slate-800 px-1.5 rounded text-fuchsia-300">LastModifiedDate</code> watermark: “give me rows changed since my last run.”
              It's like your friend asking, <i>“Which shoes have a ‘changed today’ sticker?”</i>
            </p>
            <p className="text-slate-300 leading-relaxed mt-4">
              But if you <b className="text-red-300">delete</b> a shoe from the shelf, there's no shoe to carry a sticker. The query
              never sees it, so the warehouse keeps a <b>👻 ghost record</b> forever.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-fuchsia-600/20 to-cyan-500/10 border border-fuchsia-500/30 p-6">
            <h3 className="font-bold text-lg mb-2">So what is CDC?</h3>
            <p className="text-slate-200 leading-relaxed">
              <b>Change Data Capture</b> = techniques to reliably track every <span className="text-emerald-300">INSERT</span>,{" "}
              <span className="text-amber-300">UPDATE</span> and <span className="text-red-300">DELETE</span> in a source system, so
              the warehouse mirrors reality.
            </p>
            <p className="text-sm text-slate-400 mt-4">
              Real-life version: when you delete a post on Instagram, it should vanish from the search index too, not just stop updating.
            </p>
          </div>
        </div>
      </Section>

      <Section n="2" title="Play with it: delete a sneaker 👟">
        <p className="text-slate-300 mb-5">Click the buttons and watch the three warehouse copies. Try “Delete a shoe” first.</p>
        <Simulator />
      </Section>

      <Section n="3" title="The three CDC techniques">
        <div className="grid md:grid-cols-3 gap-5">
          {methods.map((m) => (
            <div key={m.name} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
              <div className={`bg-gradient-to-r ${m.color} p-4 text-slate-950`}>
                <div className="text-3xl">{m.icon}</div>
                <h3 className="font-extrabold text-lg leading-tight">{m.name}</h3>
              </div>
              <div className="p-4 space-y-3 text-sm flex-1">
                <p className="italic text-cyan-200">{m.analogy}</p>
                <p><b>How:</b> <span className="text-slate-300">{m.how}</span></p>
                <p><b>Deletes?</b> <span className="text-slate-300">{m.del}</span></p>
                <p className="text-emerald-300">👍 {m.pro}</p>
                <p className="text-red-300">👎 {m.con}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="p-3">Method</th>
                <th className="p-3">Catches hard deletes?</th>
                <th className="p-3">Load on main DB</th>
                <th className="p-3">Setup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr><td className="p-3 font-semibold">Timestamp</td><td className="p-3 text-red-300">No (needs soft deletes)</td><td className="p-3">High (extra reads)</td><td className="p-3 text-emerald-300">Easy</td></tr>
              <tr><td className="p-3 font-semibold">Triggers</td><td className="p-3 text-emerald-300">Yes</td><td className="p-3">High (extra writes)</td><td className="p-3 text-amber-300">Medium</td></tr>
              <tr><td className="p-3 font-semibold">Log-based</td><td className="p-3 text-emerald-300">Yes</td><td className="p-3 text-emerald-300">Very low</td><td className="p-3 text-red-300">Hard</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section n="4" title="Matchmaking game: pick the right method">
        <Matchmaking />
      </Section>

      <section className="max-w-5xl mx-auto px-5 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 p-8 sm:p-10 text-slate-950">
          <div className="text-sm font-bold uppercase tracking-widest opacity-70">The Golden Check ✅</div>
          <p className="text-2xl sm:text-4xl font-black mt-2">“Can this method detect deletes?”</p>
          <p className="mt-3 font-medium">
            Ask it before you sign off on any design. If the answer is no, your warehouse counts will slowly drift away from reality, and the dashboard will
            show shoes you stopped selling months ago.
          </p>
        </div>
      </section>
    </div>
  );
}
