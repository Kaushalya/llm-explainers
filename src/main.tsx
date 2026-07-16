import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { create } from "zustand";
import "./style.css";

type Method = "AR" | "MTP" | "EAGLE-3" | "DFLASH";
type Token = { text: string; ok: boolean; source: "T" | "D" };
type Run = {
  committed: string[];
  proposal: Token[];
  cycle: number;
  passes: number;
  drafts: number;
  work: number;
  events: string[];
};
const examples = [
  {
    prompt: "The capital of France is",
    continuation:
      " Paris, the luminous capital of France, is known for art, history, and quiet cafés.",
  },
  {
    prompt: "Beyond the last mapped star,",
    continuation:
      " a silent library drifts through space, cataloguing the dreams of sleeping planets.",
  },
  {
    prompt: "At midnight, the old observatory",
    continuation:
      " opens its copper dome and listens for messages hidden between the stars.",
  },
  {
    prompt: "The smallest robot in the laboratory",
    continuation:
      " learned to fold paper cranes and left one beside every sleeping scientist.",
  },
  {
    prompt: "Beneath the Antarctic ice, researchers discovered",
    continuation:
      " a warm blue cavern filled with translucent flowers and slow-moving light.",
  },
  {
    prompt: "Every hundred years, the desert",
    continuation:
      " blooms overnight, tracing forgotten constellations across the red sand.",
  },
  {
    prompt: "The museum keeps one door locked because",
    continuation:
      " every painting behind it depicts a place that does not yet exist.",
  },
  {
    prompt: "When the city lost electricity,",
    continuation:
      " thousands of fireflies gathered above the streets and became a living map.",
  },
  {
    prompt: "Inside the abandoned train station,",
    continuation:
      " the clocks still announce departures to cities erased from every atlas.",
  },
  {
    prompt: "The ocean on this distant moon",
    continuation:
      " rises into the sky each evening and falls back as silver rain at dawn.",
  },
];
const distract = [
  " Lyon",
  " a",
  " modern",
  " city",
  " Europe",
  " culture",
  " ancient",
  " vibrant",
  " streets",
  " museums",
];
const tokenize = (s: string) => s.match(/\s*[\wÀ-ž'-]+|\s*[^\w\s]/g) || [];
function rng(seed: number) {
  let x = seed | 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
function blank(): Run {
  return {
    committed: [],
    proposal: [],
    cycle: 0,
    passes: 0,
    drafts: 0,
    work: 0,
    events: [],
  };
}
type Store = {
  prompt: string;
  target: string[];
  exampleIndex: number;
  seed: number;
  playing: boolean;
  speed: number;
  runs: Record<Method, Run>;
  setPrompt: (x: string) => void;
  setSeed: (x: number) => void;
  setPlaying: (x: boolean) => void;
  setSpeed: (x: number) => void;
  reset: () => void;
  randomize: () => void;
  step: (cycle?: boolean) => void;
};
const methods: Method[] = ["AR", "MTP", "EAGLE-3", "DFLASH"];
const emptyRuns = () => ({
  AR: blank(),
  MTP: blank(),
  "EAGLE-3": blank(),
  DFLASH: blank(),
});
const useSim = create<Store>((set, get) => ({
  prompt: examples[0].prompt,
  target: tokenize(examples[0].continuation),
  exampleIndex: 0,
  seed: 1042,
  playing: false,
  speed: 1,
  runs: emptyRuns(),
  setPrompt: (prompt) => set({ prompt }),
  setSeed: (seed) => set({ seed }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  reset: () => set({ playing: false, runs: emptyRuns() }),
  randomize: () =>
    set((state) => {
      let next = Math.floor(Math.random() * examples.length);
      if (next === state.exampleIndex) next = (next + 1) % examples.length;
      const example = examples[next];
      return {
        prompt: example.prompt,
        target: tokenize(example.continuation),
        exampleIndex: next,
        seed: Math.floor(Math.random() * 9000) + 1000,
        playing: false,
        runs: emptyRuns(),
      };
    }),
  step: () =>
    set((state) => {
      const target = state.target;
      const runs = { ...state.runs };
      methods.forEach((m, mi) => {
        const r = {
          ...runs[m],
          committed: [...runs[m].committed],
          events: [...runs[m].events],
        };
        if (r.committed.length >= target.length) return;
        const pos = r.committed.length;
        r.cycle++;
        if (m === "AR") {
          r.proposal = [];
          r.committed.push(target[pos]);
          r.passes++;
          r.work += 1.01;
          r.events.unshift(
            `T${String(pos + 1).padStart(2, "0")} committed by target pass`,
          );
        } else {
          const len = Math.min(4, target.length - pos),
            base = m === "MTP" ? 0.82 : m === "EAGLE-3" ? 0.88 : 0.86,
            dec = m === "MTP" ? 0.12 : m === "EAGLE-3" ? 0.08 : 0.07;
          const random = rng(state.seed + mi * 991 + r.cycle * 73);
          let broken = false;
          const prop: Token[] = [];
          for (let i = 0; i < len; i++) {
            const ok = !broken && random() < base * Math.exp(-dec * i);
            if (!ok) broken = m !== "DFLASH";
            prop.push({
              text: ok
                ? target[pos + i]
                : distract[Math.floor(random() * distract.length)],
              ok,
              source: "D",
            });
          }
          r.proposal = prop;
          r.drafts += m === "DFLASH" ? 1 : len;
          r.passes++;
          let accepted = 0;
          while (accepted < prop.length && prop[accepted].ok) {
            r.committed.push(target[pos + accepted]);
            accepted++;
          }
          if (accepted === 0 || accepted < prop.length) {
            if (r.committed.length < target.length)
              r.committed.push(target[r.committed.length]);
          }
          r.work +=
            (m === "MTP"
              ? len * 0.08
              : m === "EAGLE-3"
                ? 0.05 + len * 0.1
                : 0.28 + 0.015 * len) +
            1 +
            0.06 * (len - 1) +
            0.01;
          r.events.unshift(
            `V${String(r.cycle).padStart(2, "0")} ${accepted}/${len} accepted${accepted < len ? " · bonus T" : ""}`,
          );
        }
        runs[m] = r;
      });
      return { runs };
    }),
}));

const Btn = ({
  children,
  onClick,
  disabled = false,
  hot = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  hot?: boolean;
}) => (
  <button className={hot ? "hot" : ""} onClick={onClick} disabled={disabled}>
    {children}
  </button>
);
function Tokens({
  items,
  proposal = false,
}: {
  items: (string | Token)[];
  proposal?: boolean;
}) {
  return (
    <div className="tokens">
      {items.length ? (
        items.map((v, i) => {
          const t =
            typeof v === "string"
              ? { text: v, ok: true, source: "T" as const }
              : v;
          return (
            <span
              key={i}
              className={`${proposal ? "draft " : ""}${!t.ok ? "bad" : ""}`}
              title={`position ${i + 1} · ${t.ok ? "accepted" : "rejected"}`}
            >
              <b>{proposal ? (t.ok ? "✓" : "×") : "C"}</b>
              {t.text.replace(/^ /, "·")}
            </span>
          );
        })
      ) : (
        <em>awaiting cycle_</em>
      )}
    </div>
  );
}
const Metric = ({ k, v }: { k: string; v: string | number }) => (
  <div>
    <span>{k}</span>
    <strong>{v}</strong>
  </div>
);
function Panel({ method, num }: { method: Method; num: number }) {
  const r = useSim((s) => s.runs[method]);
  const targetLength = useSim((s) => s.target.length);
  const accepted = r.proposal.filter((x) => x.ok).length;
  const ratio = r.proposal.length
    ? Math.round((accepted / r.proposal.length) * 100)
    : 0;
  const visual =
    method === "AR" ? (
      <div className="flow">
        <i>TARGET</i>
        <b>→</b>
        <i> TOKEN</i>
        <b>→</b>
        <i> KV +1</i>
      </div>
    ) : method === "MTP" ? (
      <div className="flow cyan">
        <i>TARGET h</i>
        <b>→</b>
        <i>MTP</i>
        <b>→ d₁ → d₂ → d₃ → d₄</b>
      </div>
    ) : method === "EAGLE-3" ? (
      <div className="fusion">
        <span>
          EARLY ─┐
          <br />
          MID ───┼─
        </span>
        <i>FUSE</i>
        <b>→ d₁ → d₂ → d₃ → d₄</b>
      </div>
    ) : (
      <div className="block">
        <span>ANCHOR</span>
        <b>⇢</b>
        {[1, 2, 3, 4].map((x) => (
          <i key={x}>{r.cycle ? "d" + x : "■"}</i>
        ))}
        <small>↔ BIDIRECTIONAL ↔</small>
      </div>
    );
  return (
    <section className={`panel p${num}`}>
      <header>
        <span>PROC 0{num}</span>
        <h2>{method === "AR" ? "VANILLA AR" : method}</h2>
        <mark>{r.committed.length >= targetLength ? "HALT" : "RUN"}</mark>
      </header>
      <div className="body">
        <label>
          COMMITTED SEQUENCE{" "}
          <small>
            {r.committed.length}/{targetLength}
          </small>
        </label>
        <Tokens items={r.committed} />
        <label>
          {method === "AR" ? "TARGET-PASS CHAIN" : "PROPOSE → VERIFY → COMMIT"}
        </label>
        {visual}
        {method !== "AR" && (
          <>
            <label>
              LAST PROPOSAL <small>cycle {r.cycle}</small>
            </label>
            <Tokens items={r.proposal} proposal />
          </>
        )}
        <div className="meters">
          <Metric k="TARGET PASSES" v={r.passes} />
          <Metric k="DRAFT OPS" v={r.drafts} />
          <Metric k="ACCEPT" v={`${ratio}%`} />
          <Metric k="WORK" v={r.work.toFixed(2)} />
        </div>
        <div className="event">
          › {r.events[0] || "process initialized; oracle locked"}
        </div>
      </div>
    </section>
  );
}
function App() {
  const s = useSim();
  const [tab, setTab] = useState<
    "EVENT LOG" | "METRIC MATRIX" | "TOKEN INSPECTOR"
  >("EVENT LOG");
  const [config, setConfig] = useState(false);
  useEffect(() => {
    if (!s.playing) return;
    const id = setInterval(() => s.step(), 700 / s.speed);
    return () => clearInterval(id);
  }, [s.playing, s.speed, s.step]);
  const done = Object.values(s.runs).every(
    (r) => r.committed.length >= s.target.length,
  );
  useEffect(() => {
    if (done && s.playing) s.setPlaying(false);
  }, [done, s.playing, s.setPlaying]);
  const exportTrace = () => {
    const data = {
      schemaVersion: "1.0",
      createdAt: new Date().toISOString(),
      prompt: s.prompt,
      referenceContinuation: s.target.join(""),
      model: "local/demo-oracle",
      tokenizerMode: "word-punctuation",
      seed: s.seed,
      configuration: { greedy: true, bonusToken: true },
      events: s.runs,
      metrics: {},
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    a.download = "specdec-trace.json";
    a.click();
  };
  const share = () => {
    location.hash =
      "state=" +
      btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify({ p: s.prompt, s: s.seed, t: s.target.join("") }),
          ),
        ),
      );
    navigator.clipboard?.writeText(location.href);
  };
  return (
    <main>
      <div className="topline">
        <b>
          SPECDEC-LAB <sup>1.0</sup>
        </b>
        <span>MODEL=DEMO-ORACLE</span>
        <span>SEED={s.seed}</span>
        <span>MODE=GREEDY</span>
        <strong>● {s.playing ? "RUNNING" : done ? "COMPLETE" : "READY"}</strong>
      </div>
      <div className="prompt">
        <span>PROMPT›</span>
        <input value={s.prompt} onChange={(e) => s.setPrompt(e.target.value)} />
        <i></i>
      </div>
      <nav>
        <Btn hot onClick={() => s.setPlaying(!s.playing)}>
          {s.playing ? "Ⅱ PAUSE" : "▶ RUN"}
        </Btn>
        <Btn onClick={() => s.step()}>STEP OP</Btn>
        <Btn onClick={() => s.step(true)}>STEP CYCLE</Btn>
        <Btn onClick={s.reset}>↺ RESET</Btn>
        <Btn onClick={s.randomize}>⇄ RANDOM</Btn>
        <Btn onClick={() => setConfig(!config)}>⚙ CONFIG</Btn>
        <Btn onClick={share}>⇧ SHARE</Btn>
        <Btn onClick={exportTrace}>↓ JSON</Btn>
        <label>
          SPEED{" "}
          <select value={s.speed} onChange={(e) => s.setSpeed(+e.target.value)}>
            <option>.5</option>
            <option>1</option>
            <option>2</option>
          </select>
          ×
        </label>
      </nav>
      {config && (
        <aside className="config">
          <b>SIMULATION CONFIG</b>
          <label>
            RANDOM SEED{" "}
            <input
              type="number"
              value={s.seed}
              onChange={(e) => s.setSeed(+e.target.value)}
            />
          </label>
          <label>
            REFERENCE TOKENS <input value={s.target.length} disabled />
          </label>
          <label>
            <input type="checkbox" checked readOnly /> BONUS TARGET TOKEN
          </label>
          <label>
            <input type="checkbox" disabled /> SAMPLING MODE — PLANNED
          </label>
        </aside>
      )}
      <div className="grid">
        <Panel method="AR" num={1} />
        <Panel method="MTP" num={2} />
        <Panel method="EAGLE-3" num={3} />
        <Panel method="DFLASH" num={4} />
      </div>
      <section className="timeline">
        <header>
          <b>GLOBAL TIMELINE</b>
          <span>SIMULATED-TIME ALIGNMENT</span>
          <em>SIMULATED PERFORMANCE — NOT A HARDWARE BENCHMARK</em>
        </header>
        {methods.map((m) => (
          <div className="track" key={m}>
            <label>{m}</label>
            {Array.from({ length: Math.max(1, s.runs[m].passes) }).map(
              (_, i) => (
                <i
                  key={i}
                  style={{ width: m === "AR" ? 28 : m === "DFLASH" ? 74 : 58 }}
                  title={`${m} cycle ${i + 1}`}
                >
                  {m === "AR" ? "T" : "V"}
                </i>
              ),
            )}
          </div>
        ))}
      </section>
      <section className="lower">
        <div className="tabs">
          {(["EVENT LOG", "METRIC MATRIX", "TOKEN INSPECTOR"] as const).map(
            (x) => (
              <button
                className={tab === x ? "active" : ""}
                onClick={() => setTab(x)}
                key={x}
              >
                {x}
              </button>
            ),
          )}
        </div>
        {tab === "EVENT LOG" ? (
          <div className="log">
            {methods.flatMap((m) =>
              s.runs[m].events.slice(0, 2).map((e, i) => (
                <p key={m + i}>
                  <time>{String(s.runs[m].cycle).padStart(3, "0")}</time>
                  <b>{m}</b>
                  {e}
                </p>
              )),
            )}
          </div>
        ) : tab === "METRIC MATRIX" ? (
          <div className="matrix">
            {methods.map((m) => (
              <Metric
                key={m}
                k={m}
                v={`${s.runs[m].committed.length} tok / ${s.runs[m].work.toFixed(2)} work`}
              />
            ))}
          </div>
        ) : (
          <p className="notice">
            Click any token to inspect its display index, source, match status,
            and cycle metadata.
          </p>
        )}
      </section>
      <footer>
        <div>
          <b>GREEDY MODE</b> Candidate tokens are accepted only when they match
          the target model's argmax prediction. Stochastic speculative sampling
          is not simulated in v1.
        </div>
        <div>
          <b>DISPLAY TOKENIZATION</b> Token boundaries are generated locally and
          may differ from the target API tokenizer.
        </div>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
