import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { create } from "zustand";
import gemmaMtpFigure from "./assets/gemma-mtp-architecture.png";
import "./style.css";
import DiffusionPage from "./DiffusionPage";
import HomePage from "./HomePage";
import SiteHeader from "./SiteHeader";

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

const MethodDoc = ({
  index,
  name,
  kind,
  children,
  pipeline,
  detail,
}: {
  index: string;
  name: string;
  kind: string;
  children: React.ReactNode;
  pipeline: React.ReactNode;
  detail: React.ReactNode;
}) => (
  <article className="doc-card">
    <header>
      <span>{index}</span>
      <h2>{name}</h2>
      <mark>{kind}</mark>
    </header>
    <div className="doc-card-body">
      <p>{children}</p>
      <div className="doc-pipeline">{pipeline}</div>
      <div className="doc-detail">{detail}</div>
    </div>
  </article>
);

function DocsPage() {
  return (
    <div className="page-shell">
      <header className="page-intro">
        <div>
          <span className="page-kicker">$ man specdec-methods</span>
          <h1>DECODING APPROACHES</h1>
        </div>
        <p>
          A drafter proposes several future tokens cheaply; the target verifies
          them together and commits only the longest valid prefix. Drafting
          changes the execution path—not the target model's final greedy output.
        </p>
      </header>

      <section className="why-fast">
        <header>
          <div>
            <span>EXECUTION MODEL</span>
            <h2>WHY SPECULATIVE DECODING IS FASTER</h2>
          </div>
          <p>
            It moves sequential work off the expensive target-model path. A
            cheap drafter exposes several candidate positions, allowing the
            target to score them together in one wider forward pass.
          </p>
        </header>
        <div className="speed-compare">
          <article>
            <label>WITHOUT SPECULATION · SERIAL TARGET CALLS</label>
            <h3>One expensive pass for every token</h3>
            <div className="serial-passes">
              <p>
                <b>TARGET 01</b>
                <span>… France is</span>
                <i>→</i>
                <code>Paris</code>
              </p>
              <p>
                <b>TARGET 02</b>
                <span>… is Paris</span>
                <i>→</i>
                <code>.</code>
              </p>
              <p>
                <b>TARGET 03</b>
                <span>… Paris .</span>
                <i>→</i>
                <code>The</code>
              </p>
            </div>
            <strong className="speed-result-label">
              3 SEQUENTIAL TARGET PASSES
            </strong>
          </article>
          <div className="speed-vs">VS</div>
          <article className="speculative-path">
            <label>WITH SPECULATION · BLOCK VERIFICATION</label>
            <h3>The drafter exposes parallel work</h3>
            <div className="draft-row">
              <b>DRAFT</b>
              <code>Paris</code>
              <code>.</code>
              <code>It</code>
              <code>is</code>
            </div>
            <div className="parallel-brace">
              └──────── SCORE POSITIONS TOGETHER ────────┘
            </div>
            <div className="verdict-row">
              <span>✓ Paris</span>
              <span>✓ .</span>
              <span className="reject">× It</span>
              <span className="discard">— is</span>
            </div>
            <strong className="speed-result-label">
              1 TARGET VERIFICATION PASS → 3 EMITTED TOKENS
            </strong>
          </article>
        </div>
        <div className="speed-reasons">
          <p>
            <b>FEWER SERIAL STEPS</b>
            <span>
              Several accepted tokens advance the sequence after one target
              invocation.
            </span>
          </p>
          <p>
            <b>WIDER GPU WORK</b>
            <span>
              Multiple token positions become larger, more efficient matrix
              operations.
            </span>
          </p>
          <p>
            <b>LOSSLESS OUTPUT</b>
            <span>
              The verifier rejects the first mismatch and supplies the correct
              target token.
            </span>
          </p>
        </div>
        <aside>
          <b>NOT AUTOMATICALLY γ× FASTER</b>
          Drafting has a cost, rejected suffix work is wasted, and wider
          verification uses memory. Gains are largest when proposals are cheap,
          acceptance is high, and the hardware runs a block much faster than the
          equivalent sequence of target passes.
        </aside>
      </section>

      <section className="concept-strip">
        <div>
          <b>01</b>
          <span>PROPOSE</span>
          <small>generate a cheap candidate block</small>
        </div>
        <i>→</i>
        <div>
          <b>02</b>
          <span>VERIFY</span>
          <small>score all candidate positions</small>
        </div>
        <i>→</i>
        <div>
          <b>03</b>
          <span>COMMIT</span>
          <small>emit matching prefix + correction</small>
        </div>
      </section>

      <section className="architecture-section">
        <header>
          <div>
            <span>MODEL TOPOLOGY</span>
            <h2>ARCHITECTURE AT A GLANCE</h2>
          </div>
          <p>
            The diagrams emphasize where target features enter, whether the
            draft path is serial or parallel, and where verification restores
            exact agreement with the target model.
          </p>
        </header>
        <div className="architecture-grid">
          <article className="architecture-card ar-architecture">
            <div className="architecture-card-head">
              <span>01</span>
              <h3>VANILLA AR</h3>
              <mark>SERIAL TARGET</mark>
            </div>
            <div className="architecture-diagram">
              <div className="arch-context">VERIFIED PREFIX + KV CACHE</div>
              <i>↓</i>
              <div className="arch-target">TARGET MODEL</div>
              <i>↓</i>
              <div className="arch-token-chain">
                <code>T₁</code>
                <b>→</b>
                <code>T₂</code>
                <b>→</b>
                <code>T₃</code>
                <b>→</b>
                <code>T₄</code>
              </div>
              <small>ONE TARGET PASS PER TOKEN</small>
            </div>
            <p>
              Each selected target token becomes the input dependency for the
              next pass. KV caching saves prefix recomputation, but generation
              still has a target-side sequential depth of N for N tokens.
            </p>
          </article>

          <article className="architecture-card mtp-architecture">
            <div className="architecture-card-head">
              <span>02</span>
              <h3>GEMMA-STYLE MTP</h3>
              <mark>SERIAL DRAFT</mark>
            </div>
            <div className="architecture-diagram">
              <div className="mtp-target-source">
                <span>TARGET MODEL</span>
                <code>LAST-LAYER ACTIVATION hₜ</code>
              </div>
              <div className="shared-rail">
                <small>SHARED EMBEDDING</small>
                <small>TARGET KV REUSE</small>
                <small>SHARED LM HEAD</small>
              </div>
              <i>↓ TARGET-ATTACHED CONDITIONING</i>
              <div className="arch-input-pair">
                <code>hₜ / PREVIOUS DEPTH</code>
                <b>+</b>
                <code>SAMPLED TOKEN e(dᵢ)</code>
              </div>
              <i>↓ CONCAT + PROJECT</i>
              <div className="mtp-recurrent-block">
                <div className="arch-drafter">ONE LIGHTWEIGHT MTP MODULE</div>
                <b>↻ REUSE AT EVERY DRAFT DEPTH</b>
              </div>
              <div className="arch-token-chain draft-chain">
                <code>d₁ + s₁</code>
                <b>→</b>
                <code>d₂ + s₂</code>
                <b>→</b>
                <code>d₃ + s₃</code>
                <b>→</b>
                <code>d₄</code>
              </div>
              <div className="arch-verify">TARGET VERIFY</div>
            </div>
            <p>
              MTP starts from the target's final-layer state and combines each
              previous-depth representation with the newly sampled token. The
              same target-attached module is recursively reused, often sharing
              embeddings, LM-head weights, and target KV context.
            </p>
          </article>

          <article className="architecture-card eagle-architecture">
            <div className="architecture-card-head">
              <span>03</span>
              <h3>EAGLE-3</h3>
              <mark>FUSED FEATURES</mark>
            </div>
            <div className="architecture-diagram">
              <div className="arch-feature-stack">
                <code>TARGET LOW</code>
                <code>TARGET MIDDLE</code>
                <code>TARGET HIGH</code>
              </div>
              <i>↓ CONCAT + FEATURE FUSION ↓</i>
              <div className="eagle-fused-feature">FUSED TARGET FEATURE gₜ</div>
              <i>↓ SEPARATELY TRAINED DRAFTER</i>
              <div className="eagle-feedback-block">
                <div className="arch-drafter">EAGLE-3 DRAFT TRANSFORMER</div>
                <b>↻ OUTPUT aᵢ BECOMES PROXY FEATURE</b>
              </div>
              <div className="eagle-step-flow">
                <code>gₜ + token</code>
                <i>→</i>
                <code>d₁ + a₁</code>
                <i>→</i>
                <code>d₂ + a₂</code>
              </div>
              <div className="eagle-tree">
                <span>OPTIONAL TREE</span>
                <div>
                  <code>d₁</code>
                  <b>↗</b>
                  <code>d₂a</code>
                  <b>↘</b>
                  <code>d₃</code>
                </div>
                <div>
                  <i>└</i>
                  <code>d₂b</code>
                </div>
              </div>
              <div className="arch-verify">TARGET TREE VERIFY</div>
            </div>
            <p>
              EAGLE-3 fuses low-, middle-, and high-layer target features. For
              positions the target has not processed, its separate drafter feeds
              back output vector aᵢ as a proxy for the missing target feature;
              candidates can remain a chain or expand into a verification tree.
            </p>
          </article>

          <article className="architecture-card dflash-architecture">
            <div className="architecture-card-head">
              <span>04</span>
              <h3>DFLASH</h3>
              <mark>PARALLEL DRAFT</mark>
            </div>
            <div className="architecture-diagram">
              <div className="arch-feature-stack compact-features">
                <code>TARGET FEATURES</code>
                <code>ANCHOR TOKEN</code>
              </div>
              <i>↓ KV INJECTION ↓</i>
              <div className="arch-mask-block">
                <code>■</code>
                <b>↔</b>
                <code>■</code>
                <b>↔</b>
                <code>■</code>
                <b>↔</b>
                <code>■</code>
              </div>
              <small>BIDIRECTIONAL BLOCK ATTENTION</small>
              <i>↓ ONE ATOMIC REVEAL</i>
              <div className="arch-token-chain parallel-chain">
                <code>d₁</code>
                <code>d₂</code>
                <code>d₃</code>
                <code>d₄</code>
              </div>
              <div className="arch-verify">TARGET VERIFY</div>
            </div>
            <p>
              Projected target features condition all masked future positions
              together. The entire coordinated proposal appears in one draft
              pass, removing the draft-token dependency chain.
            </p>
          </article>
        </div>
      </section>

      <section className="kv-section">
        <header>
          <div>
            <span>STATE MANAGEMENT</span>
            <h2>HOW THE KV CACHE IS UPDATED</h2>
          </div>
          <p>
            Target-model KV entries created during verification are tentative.
            Only the longest accepted prefix becomes authoritative; cache state
            belonging to the rejected suffix is rolled back.
          </p>
        </header>

        <div className="kv-lifecycle">
          <article>
            <label>01 · BEFORE VERIFICATION</label>
            <div className="kv-row">
              <span className="kv-prefix">x₁ … xₙ</span>
              <i>COMMITTED TARGET KV</i>
            </div>
          </article>
          <b>→</b>
          <article>
            <label>02 · TENTATIVE TARGET PASS</label>
            <div className="kv-row">
              <span className="kv-prefix">x₁ … xₙ</span>
              <span className="kv-tentative">d₁</span>
              <span className="kv-tentative">d₂</span>
              <span className="kv-tentative">d₃</span>
              <span className="kv-tentative">d₄</span>
            </div>
          </article>
          <b>→</b>
          <article>
            <label>03 · COMMIT / ROLLBACK</label>
            <div className="kv-row">
              <span className="kv-prefix">x₁ … xₙ</span>
              <span className="kv-accepted">✓ d₁</span>
              <span className="kv-accepted">✓ d₂</span>
              <span className="kv-rejected">× d₃</span>
              <span className="kv-discarded">— d₄</span>
            </div>
          </article>
        </div>

        <div className="kv-explanation-grid">
          <article>
            <b>WHY ACCEPTED KVs ARE REUSABLE</b>
            <p>
              Causal masking prevents later draft tokens from affecting earlier
              positions. If d₁ and d₂ match the target, their target K/V tensors
              are the same states ordinary autoregressive decoding would have
              produced.
            </p>
          </article>
          <article>
            <b>WHAT ROLLBACK MEANS</b>
            <p>
              The runtime truncates the logical cache length or releases pages
              assigned to the first mismatch and its descendants. Accepted
              target KVs remain in place and require no recomputation.
            </p>
          </article>
          <article>
            <b>THE BONUS-TOKEN DETAIL</b>
            <p>
              A correction token is initially produced as a target logit, so its
              KV state is normally materialized when that token is processed as
              the next input. Fused runtimes may hide this one-token lag.
            </p>
          </article>
        </div>

        <div className="kv-authority">
          <div>
            <span>DRAFT CACHE</span>
            <strong>TEMPORARY PROPOSAL STATE</strong>
          </div>
          <i>≠</i>
          <div>
            <span>TARGET CACHE</span>
            <strong>AUTHORITATIVE CAUSAL STATE</strong>
          </div>
        </div>

        <div className="table-scroll">
          <table className="terminal-table kv-method-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Target KV update</th>
                <th>Drafter-side state</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Vanilla AR</td>
                <td>Append one processed token per target pass.</td>
                <td>No separate draft cache.</td>
              </tr>
              <tr>
                <td>Gemma-style MTP</td>
                <td>
                  Retain accepted verification KVs; truncate the rejected
                  suffix.
                </td>
                <td>
                  Autoregressive draft KV grows through d₁ → d₂ → … and restarts
                  or truncates after rejection.
                </td>
              </tr>
              <tr>
                <td>EAGLE-3</td>
                <td>Use the same accepted-prefix commit rule.</td>
                <td>
                  Temporary branch/tree KVs and proxy features are freed for
                  rejected branches; verified target features become
                  authoritative.
                </td>
              </tr>
              <tr>
                <td>DFlash</td>
                <td>
                  Target verification constructs the authoritative causal KVs.
                </td>
                <td>
                  Bidirectional masked-block states are temporary and cannot be
                  copied into the causal target cache.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <aside>
          <b>IMPLEMENTATION NOTE</b>
          Physical storage differs across runtimes—contiguous tensors, paged KV
          blocks, or reserved verification slots—but the logical operation is
          always retain accepted prefix, discard rejected suffix, continue from
          the corrected boundary.
        </aside>
      </section>

      <section className="docs-grid">
        <MethodDoc
          index="PROC 01"
          name="VANILLA AUTOREGRESSIVE"
          kind="REFERENCE PATH"
          pipeline={
            <>
              <code>T₁</code>
              <i>→</i>
              <code>T₂</code>
              <i>→</i>
              <code>T₃</code>
              <i>→</i>
              <code>T₄</code>
            </>
          }
          detail={
            <>
              <b>DEPENDENCY</b>
              <span>Every token needs the preceding target token.</span>
              <b>COST</b>
              <span>
                N target passes for N output tokens; no speculative waste.
              </span>
            </>
          }
        >
          The target model produces exactly one token per decoding pass. Its KV
          cache avoids recomputing the verified prefix, but the next pass cannot
          begin until the current token is selected. This is the lossless
          baseline used to calculate speculative speedup and sequential depth.
        </MethodDoc>

        <MethodDoc
          index="PROC 02"
          name="GEMMA-STYLE MTP"
          kind="SEQUENTIAL DRAFTER"
          pipeline={
            <>
              <code>TARGET hₜ + e(xₜ)</code>
              <i>→</i>
              <code>PROJECT</code>
              <i>→</i>
              <code>d₁ → d₂ → d₃ → d₄</code>
            </>
          }
          detail={
            <>
              <b>CONDITIONING</b>
              <span>
                Target/previous-depth representation plus the sampled-token
                embedding.
              </span>
              <b>TRADEOFF</b>
              <span>
                Cheap and tightly coupled, but serial across draft depth and
                target-specific.
              </span>
            </>
          }
        >
          Multi-token prediction can refer to several future-token training
          losses. At inference, the trained lightweight module becomes a
          drafter. Gemma 4 shares input embeddings, consumes the target's
          last-layer activation and can reuse target KV states. GLM-family NEXTN
          modules recursively reuse one lightweight Transformer block. Despite
          its name, this path drafts left-to-right rather than predicting the
          whole block independently.
        </MethodDoc>

        <MethodDoc
          index="PROC 03"
          name="EAGLE-3"
          kind="FEATURE DRAFTER"
          pipeline={
            <>
              <code>LOW + MID + HIGH</code>
              <i>→</i>
              <code>FUSE</code>
              <i>→</i>
              <code>d₁ → d₂ → d₃ → d₄</code>
            </>
          }
          detail={
            <>
              <b>FEATURES</b>
              <span>
                Fused low-, middle-, and high-layer target states for verified
                tokens.
              </span>
              <b>TRADEOFF</b>
              <span>
                Strong target alignment and tree expansion; deeper branches
                still add draft steps.
              </span>
            </>
          }
        >
          EAGLE-3 is a separately trained, target-specific drafter. It fuses
          features from several target depths, then directly predicts token
          logits through a lightweight decoder and the target LM head. Target
          features do not exist for unverified positions, so the drafter feeds
          back its own output vector as a proxy. Drafts may be extended
          autoregressively or expanded as a candidate tree before one target
          verification pass.
        </MethodDoc>

        <MethodDoc
          index="PROC 04"
          name="DFLASH"
          kind="PARALLEL BLOCK DRAFTER"
          pipeline={
            <>
              <code>ANCHOR</code>
              <i>→</i>
              <code>[MASK] [MASK] [MASK] [MASK]</code>
              <i>⇢</i>
              <code>d₁ d₂ d₃ d₄</code>
            </>
          }
          detail={
            <>
              <b>CONDITIONING</b>
              <span>
                Selected target layers projected and injected as keys/values at
                every draft layer.
              </span>
              <b>TRADEOFF</b>
              <span>
                Maximum draft parallelism; later positions cannot condition on
                sampled earlier slots.
              </span>
            </>
          }
        >
          DFlash projects selected target hidden states into the draft hidden
          space and injects them as extra KV context. The anchor embedding and
          all future mask positions are present simultaneously; bidirectional
          block attention coordinates the future slots and reveals γ logits
          vectors in one pass. Position quality can decay across the block, and
          work after the first verifier mismatch is discarded.
        </MethodDoc>
      </section>

      <section id="mtp-architecture" className="doc-section mtp-figure-section">
        <header>
          <span>ARCHITECTURE DETAIL</span>
          <h2>GEMMA-STYLE MTP DRAFTS SEQUENTIALLY</h2>
        </header>
        <div className="mtp-figure-layout">
          <figure>
            <div className="figure-frame">
              <img
                src={gemmaMtpFigure}
                alt="Gemma-style MTP architecture showing target layers producing t2, followed by MTP layer stacks producing t3 and t4 sequentially"
              />
            </div>
            <figcaption>
              Target-model state produces <b>t₂</b>; the first MTP application
              consumes that result to produce <b>t₃</b>, and the next
              application consumes the updated state to produce <b>t₄</b>.
            </figcaption>
          </figure>
          <div className="mtp-figure-notes">
            <div className="mtp-sequence">
              <code>TARGET → t₂</code>
              <i>then</i>
              <code>MTP(t₂) → t₃</code>
              <i>then</i>
              <code>MTP(t₃) → t₄</code>
            </div>
            <article>
              <b>SEQUENTIAL ACROSS TOKEN POSITIONS</b>
              <p>
                Each future token is sampled before the following draft step can
                begin. The blue up-projection path carries the previous MTP
                representation into the next prediction depth.
              </p>
            </article>
            <article>
              <b>NOT INDEPENDENT FUTURE-TOKEN HEADS</b>
              <p>
                The repeated stacks do not represent several heads predicting
                t₂, t₃, and t₄ simultaneously. They illustrate autoregressive
                applications conditioned on the token and state produced by the
                preceding step.
              </p>
            </article>
            <article>
              <b>PARALLELISM COMES DURING VERIFICATION</b>
              <p>
                After the assistant finishes the draft chain, the large target
                model scores all proposed positions together in one causal
                verification pass.
              </p>
            </article>
            <aside>
              <b>DRAFT</b> t₂ → t₃ → t₄ is sequential
              <span>·</span>
              <b>VERIFY</b> [t₂ t₃ t₄] is parallel
            </aside>
          </div>
        </div>
      </section>

      <section className="doc-section distinction">
        <header>
          <span>ARCHITECTURAL DISTINCTION</span>
          <h2>WHERE THE SERIAL CHAIN LIVES</h2>
        </header>
        <div className="distinction-grid">
          <p>
            <b>MTP</b>
            <span>target state → small recurrent draft chain</span>
          </p>
          <p>
            <b>EAGLE-3</b>
            <span>
              multi-layer fusion → feature-conditioned draft chain / tree
            </span>
          </p>
          <p>
            <b>DFLASH</b>
            <span>target KV context → one coordinated parallel block</span>
          </p>
        </div>
        <aside>
          <b>NOTE</b> It is not automatically γ times faster. Drafter cost,
          rejected suffixes, memory traffic, batch shape, and verifier
          utilization all determine realized speedup.
        </aside>
      </section>

      <section className="doc-section model-table-section">
        <header>
          <span>RELEASED SUPPORT · 2026</span>
          <h2>APPROACH — OPEN-SOURCE MODEL</h2>
        </header>
        <div className="table-scroll">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Approach</th>
                <th>Open-source model support</th>
                <th>How it is packaged</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>EAGLE / EAGLE-3</td>
                <td>
                  Llama 3.1 8B; Llama 3.3 70B; Llama 4 Scout/Maverick;
                  DeepSeek-R1-Distill-Llama 8B; Qwen3 1.7B–30B-A3B; Gemma 4 12B
                </td>
                <td>Separately trained, target-specific feature drafter.</td>
              </tr>
              <tr>
                <td>DFlash</td>
                <td>Qwen3 4B, 8B, and 14B; Gemma 4 12B</td>
                <td>
                  Separately trained block-diffusion drafter paired with each
                  target.
                </td>
              </tr>
              <tr>
                <td>DSpark</td>
                <td>Qwen3 4B, 8B, and 14B; Gemma 4 12B</td>
                <td>
                  Semi-autoregressive drafter plus confidence-based verification
                  scheduling.
                </td>
              </tr>
              <tr>
                <td>MTP</td>
                <td>Gemma 4; DeepSeek-V3; GLM 5.2</td>
                <td>
                  Native target-attached module shipped with or alongside model
                  weights.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="source-note">
          Availability means released drafter support or a native MTP module; it
          does not imply that every inference stack enables speculation by
          default.
        </p>
      </section>

      <section className="doc-section references-section">
        <header>
          <span>PRIMARY SOURCES</span>
          <h2>REFERENCES</h2>
        </header>
        <ol className="reference-list">
          <li>
            <span>01</span>
            <div>
              <b>Li, Wei, Zhang &amp; Zhang · 2024</b>
              <a
                href="https://arxiv.org/abs/2401.15077"
                target="_blank"
                rel="noopener noreferrer"
              >
                EAGLE: Speculative Sampling Requires Rethinking Feature
                Uncertainty ↗
              </a>
              <small>arXiv:2401.15077</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <b>Li, Wei, Zhang &amp; Zhang · 2025</b>
              <a
                href="https://arxiv.org/abs/2503.01840"
                target="_blank"
                rel="noopener noreferrer"
              >
                EAGLE-3: Scaling up Inference Acceleration via Training-Time
                Test ↗
              </a>
              <small>arXiv:2503.01840</small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <b>Chen, Liang &amp; Liu · 2026</b>
              <a
                href="https://arxiv.org/abs/2602.06036"
                target="_blank"
                rel="noopener noreferrer"
              >
                DFlash: Block Diffusion for Flash Speculative Decoding ↗
              </a>
              <small>arXiv:2602.06036</small>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <b>Cheng, Yu, Shao, Li, Xiong et al. · 2026</b>
              <a
                href="https://github.com/deepseek-ai/DeepSpec/blob/main/DSpark_paper.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                DSpark: Confidence-Scheduled Speculative Decoding with
                Semi-Autoregressive Generation ↗
              </a>
              <small>DeepSeek-AI</small>
            </div>
          </li>
          <li>
            <span>05</span>
            <div>
              <b>DeepSeek-AI · 2024</b>
              <a
                href="https://arxiv.org/abs/2412.19437"
                target="_blank"
                rel="noopener noreferrer"
              >
                DeepSeek-V3 Technical Report ↗
              </a>
              <small>
                Section 2.2: sequential MTP modules and speculative decoding
              </small>
            </div>
          </li>
          <li>
            <span>06</span>
            <div>
              <b>GLM-5 Team · 2026</b>
              <a
                href="https://arxiv.org/abs/2602.15763"
                target="_blank"
                rel="noopener noreferrer"
              >
                GLM-5: From Vibe Coding to Agentic Engineering ↗
              </a>
              <small>
                Recursive parameter sharing for the GLM-family MTP drafter
              </small>
            </div>
          </li>
          <li>
            <span>07</span>
            <div>
              <b>Google AI for Developers · 2026</b>
              <a
                href="https://ai.google.dev/gemma/docs/mtp/overview"
                target="_blank"
                rel="noopener noreferrer"
              >
                Speed up Gemma 4 with Multi-Token Prediction ↗
              </a>
              <a
                href="https://ai.google.dev/gemma/docs/mtp/mtp"
                target="_blank"
                rel="noopener noreferrer"
              >
                Gemma 4 MTP with Transformers ↗
              </a>
            </div>
          </li>
          <li>
            <span>08</span>
            <div>
              <b>Z.ai · 2026</b>
              <a
                href="https://huggingface.co/zai-org/GLM-5.2"
                target="_blank"
                rel="noopener noreferrer"
              >
                GLM 5.2 model card ↗
              </a>
              <a
                href="https://huggingface.co/zai-org/GLM-5.2/blob/main/config.json"
                target="_blank"
                rel="noopener noreferrer"
              >
                Checkpoint configuration ↗
              </a>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}

const EvalMetric = ({
  code,
  title,
  formula,
  children,
}: {
  code: string;
  title: string;
  formula: string;
  children: React.ReactNode;
}) => (
  <article className="eval-card">
    <header>
      <span>{code}</span>
      <h3>{title}</h3>
    </header>
    <code>{formula}</code>
    <p>{children}</p>
  </article>
);

function EvalsPage() {
  return (
    <div className="page-shell evals-page">
      <header className="page-intro">
        <div>
          <span className="page-kicker">$ specdec-eval --protocol</span>
          <h1>EVALUATION METRICS</h1>
        </div>
        <p>
          No single number identifies the best speculative decoder. Compare
          draft quality, critical-path efficiency, total work, serving behavior,
          memory, and exact output equivalence under the same target and
          workload.
        </p>
      </header>

      <section className="eval-band">
        <b>RULE 00</b>
        <strong>HOLD THE TARGET ORACLE CONSTANT</strong>
        <span>
          Same target checkpoint · tokenizer · prompts · output lengths ·
          sampling policy · hardware · serving stack
        </span>
      </section>

      <section className="reported-results">
        <header>
          <div>
            <span>PRIMARY-SOURCE SURVEY</span>
            <h2>REPORTED EVALUATION VALUES</h2>
          </div>
          <p>
            These are published measurements, not simulator defaults. Rows use
            different targets, workloads, runtimes, and hardware; compare values
            within a row or a shared source setup, not as a universal
            leaderboard.
          </p>
        </header>
        <div className="table-scroll">
          <table className="terminal-table evidence-table">
            <thead>
              <tr>
                <th>Approach</th>
                <th>Draft-quality result</th>
                <th>Speed result</th>
                <th>Evaluation context</th>
                <th>Original source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="method-chip baseline-chip">VANILLA AR</span>
                </td>
                <td>No draft proposal; one target token per decoding step.</td>
                <td>
                  <strong>1.00× baseline</strong>
                </td>
                <td>
                  Reference denominator used by each speculative-decoding study.
                </td>
                <td>
                  <a
                    href="https://arxiv.org/abs/2503.01840"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    EAGLE-3 §4 ↗
                  </a>
                  <a
                    href="https://arxiv.org/abs/2602.06036"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    DFlash §5 ↗
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="method-chip mtp-chip">MTP</span>
                </td>
                <td>
                  DeepSeek-V3 reports <strong>85–90%</strong> acceptance for its
                  additional second-token prediction across generation topics.
                </td>
                <td>
                  DeepSeek-V3: <strong>1.8× TPS</strong>.<br />
                  Gemma 4: up to <strong>2.2× GPU</strong> and{" "}
                  <strong> 1.5× CPU</strong> decode speedup on mobile devices.
                </td>
                <td>
                  DeepSeek-V3 native two-token MTP; report does not specify the
                  hardware for the 1.8× figure. Gemma figures use LiteRT-LM
                  mobile CPU/GPU backends and report zero quality degradation.
                </td>
                <td>
                  <a
                    href="https://arxiv.org/abs/2412.19437"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    DeepSeek-V3 §5.4.3 ↗
                  </a>
                  <a
                    href="https://developers.google.com/edge/litert-lm/models/gemma-4"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Gemma 4 official results ↗
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="method-chip eagle-chip">EAGLE-3</span>
                </td>
                <td>
                  Original paper reports average accepted length
                  <strong> τ up to 7.5</strong> on HumanEval. On Llama 3.1 8B, τ
                  = <strong>6.13</strong> for MT-Bench and
                  <strong> 6.23</strong> for GSM8K.
                </td>
                <td>
                  <strong>3.0–6.5×</strong> over vanilla across evaluated models
                  and tasks. SGLang H100 MT-Bench: <strong>373.25 tok/s</strong>
                  versus 158.34 at batch 1; <strong>1.38×</strong> throughput at
                  batch 64.
                </td>
                <td>
                  Five chat/reasoning/code tasks; temperature 0 for headline
                  latency results. SGLang v0.4.4 uses one H100 and Llama 3.1 8B.
                </td>
                <td>
                  <a
                    href="https://arxiv.org/abs/2503.01840"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    EAGLE-3 Tables 1–4 ↗
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="method-chip dflash-chip">DFLASH</span>
                </td>
                <td>
                  Greedy seven-task average τ = <strong>6.54</strong> on
                  Qwen3-4B and <strong>6.49</strong> on Qwen3-8B with block size
                  16.
                </td>
                <td>
                  Average <strong>4.91×</strong> and <strong>4.86×</strong>
                  respectively; individual tasks reach <strong>6.09×</strong>.
                  All results are lossless against the target output.
                </td>
                <td>
                  NVIDIA H200, Transformers backend, temperature 0, thinking
                  disabled, ≤2048 generated tokens; GSM8K, MATH-500, AIME25,
                  HumanEval, MBPP, LiveCodeBench, and MT-Bench.
                </td>
                <td>
                  <a
                    href="https://arxiv.org/abs/2602.06036"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    DFlash Table 1 ↗
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="evidence-notes">
          <p>
            <b>τ</b>
            <span>
              Average accepted tokens per verification cycle, including the
              target bonus token where defined by the paper.
            </span>
          </p>
          <p>
            <b>SPEEDUP</b>
            <span>
              Wall-clock or throughput ratio against that source's own optimized
              autoregressive baseline.
            </span>
          </p>
          <p>
            <b>QUALITY</b>
            <span>
              “Lossless” means verification preserves the target distribution;
              numerical implementation details can still matter.
            </span>
          </p>
        </div>
      </section>

      <section className="eval-group">
        <header>
          <span>GROUP A</span>
          <h2>DRAFT QUALITY</h2>
        </header>
        <div className="eval-grid">
          <EvalMetric
            code="A1"
            title="Acceptance ratio"
            formula="accepted draft tokens / proposed draft tokens"
          >
            Measures token-level usefulness. Report by proposal position too:
            one aggregate can hide a strong first token and weak block tail.
          </EvalMetric>
          <EvalMetric
            code="A2"
            title="Mean accepted length"
            formula="Σ accepted-prefix length / verification cycles"
          >
            The average number of draft tokens committed per verifier call.
            Include the target-produced bonus token separately.
          </EvalMetric>
          <EvalMetric
            code="A3"
            title="Full-block acceptance"
            formula="fully accepted proposal blocks / all proposal blocks"
          >
            Useful for distinguishing consistently coherent blocks from methods
            that usually fail near the tail.
          </EvalMetric>
          <EvalMetric
            code="A4"
            title="Position-wise accuracy"
            formula="P(dᵢ = yᵢ) for i = 1…γ"
          >
            Reveals agreement decay, MTP/EAGLE error propagation, and DFlash
            degradation across simultaneous mask positions.
          </EvalMetric>
        </div>
      </section>

      <section className="eval-group">
        <header>
          <span>GROUP B</span>
          <h2>ALGORITHMIC EFFICIENCY</h2>
        </header>
        <div className="eval-grid">
          <EvalMetric
            code="B1"
            title="Accepted tokens / verification"
            formula="accepted draft tokens / target verification passes"
          >
            Directly measures how much useful progress each expensive target
            call unlocks.
          </EvalMetric>
          <EvalMetric
            code="B2"
            title="Proposal efficiency"
            formula="accepted draft tokens / draft work units"
          >
            Penalizes an accurate drafter if its autoregressive chain or
            candidate tree costs too much.
          </EvalMetric>
          <EvalMetric
            code="B3"
            title="Wasted speculative work"
            formula="rejected tokens + discarded descendants"
          >
            Count both the first mismatch and every downstream token that can no
            longer be committed.
          </EvalMetric>
          <EvalMetric
            code="B4"
            title="Critical-path speedup"
            formula="vanilla critical path / speculative critical path"
          >
            The simulator's normalized estimate. Keep it separate from total
            work and measured wall-clock speedup.
          </EvalMetric>
        </div>
      </section>

      <section className="eval-group">
        <header>
          <span>GROUP C</span>
          <h2>SYSTEMS PERFORMANCE</h2>
        </header>
        <div className="eval-grid">
          <EvalMetric
            code="C1"
            title="Inter-token latency"
            formula="p50 / p95 / p99 milliseconds per emitted token"
          >
            Captures user-visible cadence. Report time-to-first-token separately
            because prefill and drafter initialization differ.
          </EvalMetric>
          <EvalMetric
            code="C2"
            title="Throughput"
            formula="accepted output tokens / wall-clock second"
          >
            Measure across concurrency levels and request-length distributions;
            a single-request gain may disappear under saturation.
          </EvalMetric>
          <EvalMetric
            code="C3"
            title="Verifier utilization"
            formula="useful verified positions / scheduled positions"
          >
            Tracks padding, fixed block tails, tree nodes, and load-aware
            truncation that affect GPU efficiency.
          </EvalMetric>
          <EvalMetric
            code="C4"
            title="Memory overhead"
            formula="peak bytes: target KV + draft KV + features"
          >
            Include assistant weights, projected feature caches, candidate
            trees, and temporary verification tensors.
          </EvalMetric>
        </div>
      </section>

      <section className="eval-group">
        <header>
          <span>GROUP D</span>
          <h2>LOSSLESSNESS &amp; ROBUSTNESS</h2>
        </header>
        <div className="eval-grid">
          <EvalMetric
            code="D1"
            title="Greedy sequence equality"
            formula="speculative output === vanilla target output"
          >
            Must be 100% for exact greedy verification. Any mismatch indicates a
            verifier, cache, or token-alignment bug.
          </EvalMetric>
          <EvalMetric
            code="D2"
            title="Distributional correctness"
            formula="sampling distribution matches target distribution"
          >
            For nonzero temperature, token equality is insufficient. Exact
            methods need rejection sampling and residual-distribution
            correction.
          </EvalMetric>
          <EvalMetric
            code="D3"
            title="Domain breakdown"
            formula="metrics by code / chat / math / long context"
          >
            Acceptance depends heavily on entropy and repetition. Always publish
            per-domain and prompt-length slices.
          </EvalMetric>
          <EvalMetric
            code="D4"
            title="Seed reproducibility"
            formula="same config + seed → identical trace"
          >
            Required for simulation debugging and paired comparisons. Hardware
            benchmarks should report variance and warm-up policy.
          </EvalMetric>
        </div>
      </section>

      <section className="doc-section eval-protocol">
        <header>
          <span>MINIMUM REPORT</span>
          <h2>RECOMMENDED COMPARISON MATRIX</h2>
        </header>
        <table className="terminal-table">
          <thead>
            <tr>
              <th>Axis</th>
              <th>Report</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Quality</td>
              <td>acceptance ratio, accepted length, accuracy by position</td>
              <td>Explains where proposals fail.</td>
            </tr>
            <tr>
              <td>Work</td>
              <td>
                draft passes, target passes, verification width, rejected
                descendants
              </td>
              <td>Separates useful progress from computation.</td>
            </tr>
            <tr>
              <td>Latency</td>
              <td>TTFT, ITL p50/p95/p99, end-to-end latency</td>
              <td>Captures user-visible behavior.</td>
            </tr>
            <tr>
              <td>Serving</td>
              <td>tokens/s at concurrency 1…N, GPU utilization, peak memory</td>
              <td>Tests whether gains survive batching and saturation.</td>
            </tr>
            <tr>
              <td>Correctness</td>
              <td>greedy equality or sampling-distribution test</td>
              <td>Confirms lossless acceleration.</td>
            </tr>
          </tbody>
        </table>
        <aside>
          <b>SIMULATOR CAVEAT</b> Values shown in the simulator are normalized
          illustrations—not empirical GPU measurements. Use identical runtime
          kernels and paired prompts for hardware claims.
        </aside>
      </section>
    </div>
  );
}

function App() {
  const s = useSim();
  const initialView =
    location.hash === "#docs" || location.hash === "#mtp-architecture"
      ? "DOCS"
      : location.hash === "#evals"
        ? "EVALS"
        : "SIMULATOR";
  const [view, setView] = useState<"SIMULATOR" | "DOCS" | "EVALS">(initialView);
  const [contentScale, setContentScale] = useState(100);
  const [tab, setTab] = useState<
    "EVENT LOG" | "METRIC MATRIX" | "TOKEN INSPECTOR"
  >("EVENT LOG");
  const [config, setConfig] = useState(false);
  useEffect(() => {
    document.title = "Speculative Decoding Lab · LLM Explainers";
  }, []);
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
    <>
      <SiteHeader current="specdec-lab" />
      <main
        style={
          {
            "--content-scale": contentScale / 100,
            "--content-font-size": `${(14 * contentScale) / 100}px`,
          } as React.CSSProperties
        }
      >
        <div className="topline">
          <b>
            SPECDEC-LAB <sup>1.0</sup>
          </b>
          <a className="dl-entry" href="/">
            ALL EXPLAINERS ↗
          </a>
          <span>MODEL=DEMO-ORACLE</span>
          <span>SEED={s.seed}</span>
          <span>MODE=GREEDY</span>
          <strong>
            ● {s.playing ? "RUNNING" : done ? "COMPLETE" : "READY"}
          </strong>
        </div>
        <div
          className="app-tabs"
          role="tablist"
          aria-label="Application sections"
        >
          {(["SIMULATOR", "DOCS", "EVALS"] as const).map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={view === item}
              className={view === item ? "active" : ""}
              onClick={() => {
                setView(item);
                history.replaceState(
                  null,
                  "",
                  item === "SIMULATOR"
                    ? location.pathname
                    : `#${item.toLowerCase()}`,
                );
              }}
            >
              <span>
                {item === "SIMULATOR" ? "01" : item === "DOCS" ? "02" : "03"}
              </span>
              {item}
            </button>
          ))}
          {view === "SIMULATOR" ? (
            <em>SELECT MODULE // STATE PERSISTS BETWEEN TABS</em>
          ) : (
            <label className="content-size-control">
              <span>CONTENT TYPE</span>
              <input
                type="range"
                min="90"
                max="140"
                step="5"
                value={contentScale}
                aria-label="Content font size"
                onChange={(event) =>
                  setContentScale(Number(event.target.value))
                }
              />
              <output>{contentScale}%</output>
            </label>
          )}
        </div>
        {view === "SIMULATOR" ? (
          <>
            <div className="prompt">
              <span>PROMPT›</span>
              <input
                value={s.prompt}
                onChange={(e) => s.setPrompt(e.target.value)}
              />
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
                <select
                  value={s.speed}
                  onChange={(e) => s.setSpeed(+e.target.value)}
                >
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
                        style={{
                          width: m === "AR" ? 28 : m === "DFLASH" ? 74 : 58,
                        }}
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
                {(
                  ["EVENT LOG", "METRIC MATRIX", "TOKEN INSPECTOR"] as const
                ).map((x) => (
                  <button
                    className={tab === x ? "active" : ""}
                    onClick={() => setTab(x)}
                    key={x}
                  >
                    {x}
                  </button>
                ))}
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
                  Click any token to inspect its display index, source, match
                  status, and cycle metadata.
                </p>
              )}
            </section>
            <footer>
              <div>
                <b>GREEDY MODE</b> Candidate tokens are accepted only when they
                match the target model's argmax prediction. Stochastic
                speculative sampling is not simulated in v1.
              </div>
              <div>
                <b>DISPLAY TOKENIZATION</b> Token boundaries are generated
                locally and may differ from the target API tokenizer.
              </div>
            </footer>
          </>
        ) : view === "DOCS" ? (
          <DocsPage />
        ) : (
          <EvalsPage />
        )}
      </main>
    </>
  );
}
const requestedExplainer = new URLSearchParams(location.search).get(
  "explainer",
);
const legacyLabRoute =
  ["#docs", "#evals", "#mtp-architecture"].includes(location.hash) ||
  location.hash.startsWith("#state=");
const rootElement = document.getElementById("root")! as HTMLElement & {
  appRoot?: ReturnType<typeof createRoot>;
};
const appRoot = rootElement.appRoot ?? createRoot(rootElement);
rootElement.appRoot = appRoot;
appRoot.render(
  requestedExplainer === "diffusion" ? (
    <DiffusionPage />
  ) : requestedExplainer === "speculative-decoding" || legacyLabRoute ? (
    <App />
  ) : (
    <HomePage />
  ),
);
