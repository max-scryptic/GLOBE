type GlobeVariant = "classic" | "cartoon" | "night";

const globes: GlobeVariant[] = ["classic", "cartoon", "night"];

function ReactGlobe({ variant }: { variant: GlobeVariant }) {
  const styles = {
    classic: {
      water: "#6ea8fe",
      land: "#f2c879",
      border: "#ffffff",
      grid: "#ffffff",
      glow: "#a9cdfd",
      background: "from-sky-50 to-white",
    },
    cartoon: {
      water: "#9edcff",
      land: "#47b653",
      border: "#ffd735",
      grid: "#dff5ff",
      glow: "#c7edff",
      background: "from-blue-50 to-emerald-50",
    },
    night: {
      water: "#28335f",
      land: "#9ccf86",
      border: "#f5d66b",
      grid: "#8793c9",
      glow: "#59649a",
      background: "from-slate-100 to-white",
    },
  }[variant];

  return (
    <div
      className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-linear-to-br ${styles.background}`}
    >
      <div
        className="absolute inset-[11%] rounded-full blur-2xl"
        style={{ backgroundColor: styles.glow, opacity: 0.28 }}
      />
      <svg
        viewBox="0 0 320 320"
        className="relative h-[82%] w-[82%] drop-shadow-[0_18px_22px_rgba(34,43,69,0.18)]"
        role="img"
        aria-label="Stylized globe"
      >
        <defs>
          <clipPath id={`globe-clip-${variant}`}>
            <circle cx="160" cy="160" r="124" />
          </clipPath>
        </defs>

        <circle
          cx="160"
          cy="160"
          r="124"
          fill={styles.water}
          stroke="#1f2937"
          strokeOpacity={variant === "cartoon" ? 0.08 : 0.16}
          strokeWidth="3"
        />

        <g
          clipPath={`url(#globe-clip-${variant})`}
          fill="none"
          stroke={styles.grid}
          strokeOpacity={variant === "cartoon" ? 0.24 : 0.34}
          strokeWidth={variant === "cartoon" ? 4 : 2}
        >
          <ellipse cx="160" cy="160" rx="88" ry="124" />
          <ellipse cx="160" cy="160" rx="42" ry="124" />
          <path d="M37 160H283" />
          <path d="M54 105C89 125 122 135 160 135C198 135 231 125 266 105" />
          <path d="M54 215C89 195 122 185 160 185C198 185 231 195 266 215" />
        </g>

        <g
          clipPath={`url(#globe-clip-${variant})`}
          fill={styles.land}
          stroke={styles.border}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={variant === "cartoon" ? 5 : 2.4}
        >
          <path d="M82 98C98 78 129 74 146 91C158 104 149 123 166 134C180 143 195 138 207 151C221 166 210 191 188 190C168 190 166 171 145 171C124 170 122 190 102 184C79 177 73 118 82 98Z" />
          <path d="M203 76C221 82 244 96 254 116C264 137 247 154 226 148C211 144 211 130 196 127C181 124 169 113 175 98C180 85 190 72 203 76Z" />
          <path d="M207 205C222 197 248 207 254 227C260 248 238 264 216 253C198 244 190 214 207 205Z" />
          <path d="M55 168C68 157 87 159 96 175C105 191 94 207 76 203C58 199 44 178 55 168Z" />
        </g>

        {variant === "cartoon" ? (
          <g
            clipPath={`url(#globe-clip-${variant})`}
            fill="none"
            stroke={styles.border}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.5"
          >
            <path d="M111 92C117 112 110 132 129 145" />
            <path d="M143 91C135 110 139 128 158 138" />
            <path d="M98 176C118 165 127 178 144 171" />
            <path d="M198 83C209 101 229 103 248 116" />
            <path d="M211 207C221 224 238 229 250 241" />
          </g>
        ) : null}

        <circle
          cx="160"
          cy="160"
          r="124"
          fill="none"
          stroke="#ffffff"
          strokeOpacity={variant === "cartoon" ? 0.65 : 0.48}
          strokeWidth={variant === "cartoon" ? 7 : 4}
        />
        <path
          d="M73 82C111 39 181 27 231 61"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeOpacity={variant === "cartoon" ? 0.45 : 0.34}
          strokeWidth={variant === "cartoon" ? 12 : 9}
        />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-1 items-center bg-[#f4f4f4] px-5 py-8 sm:px-8">
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 sm:grid-cols-3">
        {globes.map((variant) => (
          <article
            key={variant}
            className="rounded-lg border border-black/10 bg-white p-4 shadow-sm"
          >
            <ReactGlobe variant={variant} />
          </article>
        ))}
      </section>
    </main>
  );
}
