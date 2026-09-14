type Props = { id: string };

/** Small topic marks, using each card's existing accent color. */
export default function ExplainerLogo({ id }: Props) {
  return (
    <svg
      className="explainer-logo"
      viewBox="0 0 240 112"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {id === "speculative-decoding" ? (
        <>
          {/* Several draft tokens converge on one verification pass. */}
          <path d="M40 32h58m-48 24h48M40 80h58" opacity=".35" />
          <path d="m92 26 6 6-6 6m0 12 6 6-6 6m0 12 6 6-6 6" />
          <path d="M110 32h8l20 24-20 24h-8m0-24h28" opacity=".6" />
          <path
            d="m169 23 26 10v22c0 17-13 28-26 34-13-6-26-17-26-34V33z"
            fill="currentColor"
            fillOpacity=".07"
          />
          <path d="m157 55 9 9 17-20" strokeWidth="3" />
          <rect
            x="28"
            y="27"
            width="10"
            height="10"
            rx="2"
            fill="currentColor"
            stroke="none"
          />
          <rect
            x="38"
            y="51"
            width="10"
            height="10"
            rx="2"
            fill="currentColor"
            stroke="none"
          />
          <rect
            x="28"
            y="75"
            width="10"
            height="10"
            rx="2"
            fill="currentColor"
            stroke="none"
          />
        </>
      ) : id === "diffusion-language-models" ? (
        <>
          {/* A noisy field resolves into an ordered canvas. */}
          <g fill="currentColor" stroke="none">
            <circle cx="35" cy="31" r="2" opacity=".35" />
            <circle cx="59" cy="23" r="3" opacity=".6" />
            <circle cx="78" cy="37" r="2" />
            <circle cx="44" cy="53" r="3" opacity=".65" />
            <circle cx="68" cy="57" r="2" opacity=".35" />
            <circle cx="28" cy="72" r="2" opacity=".5" />
            <circle cx="53" cy="84" r="2" />
            <circle cx="83" cy="77" r="3" opacity=".65" />
            <circle cx="24" cy="49" r="1.5" />
            <circle cx="71" cy="92" r="1.5" opacity=".4" />
          </g>
          <path d="M97 56h28m-7-7 7 7-7 7" opacity=".6" />
          <g transform="translate(147 26)">
            {[0, 1, 2].flatMap((row) =>
              [0, 1, 2].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={col * 22}
                  y={row * 22}
                  width="16"
                  height="16"
                  rx="3"
                  fill="currentColor"
                  fillOpacity={(row + col) % 2 === 0 ? ".25" : ".08"}
                />
              )),
            )}
          </g>
        </>
      ) : (
        <>
          {/* Smooth values become a small set of discrete levels. */}
          <path d="M27 83V28m0 55h66" opacity=".2" />
          <path
            d="M31 76c12 0 10-38 23-38s12 25 22 25 8-30 18-30"
            strokeWidth="2.5"
          />
          <path d="M107 56h26m-7-7 7 7-7 7" opacity=".6" />
          <path d="M149 83h61m-61-18h61m-61-18h61m-61-18h61" opacity=".16" />
          <path d="M150 80h13V44h15v18h15V26h16" strokeWidth="2.5" />
          <g fill="currentColor" stroke="none">
            <circle cx="150" cy="80" r="3" />
            <circle cx="163" cy="44" r="3" />
            <circle cx="178" cy="62" r="3" />
            <circle cx="193" cy="26" r="3" />
          </g>
        </>
      )}
    </svg>
  );
}
