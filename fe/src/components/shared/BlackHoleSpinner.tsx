

export type BlackHoleSpinnerProps = {
  phase: "idle" | "login" | "success";
  onClick: () => void;
  className?: string;
};

// A 2D Black Hole component made with Tailwind CSS
export default function BlackHoleSpinner({ phase, onClick, className = "" }: BlackHoleSpinnerProps) {
  const size = phase === "login" ? "w-48 h-48" : "w-64 h-64";
  const transition = "transition-all duration-1000 ease-in-out";

  return (
    <div
      className={`relative flex items-center justify-center ${size} ${transition} ${className}`}
      onClick={onClick}
    >
      {/* 1. Outer spinning spectral ring */}
      <div
        className={`absolute inset-0 rounded-full animate-spin-slow border-8 border-transparent ${
          phase === "success" ? "opacity-0 scale-150" : "opacity-70"
        } ${transition}`}
        style={{
          borderTopColor: "#fde047", // yellow-300
          borderRightColor: "#67e8f9", // cyan-300
          borderBottomColor: "#d8b4fe", // purple-300
          borderLeftColor: "#fde047", // yellow-300
        }}
      />
      {/* 2. Inner soft glow */}
      <div
        className={`absolute inset-2 rounded-full bg-gradient-to-r from-cyan-400/80 via-purple-500/80 to-yellow-400/80 blur-xl ${
          phase === "success" ? "opacity-0 scale-200" : "opacity-60"
        } ${transition}`}
      />
      {/* 3. Central black hole core */}
      <div
        className={`absolute w-1/3 h-1/3 bg-black rounded-full shadow-2xl shadow-black ${
          phase === "success" ? "scale-300" : ""
        } ${transition}`}
      />
      {/* 4. Photon ring / Lensing effect */}
      <div
        className={`absolute w-[36%] h-[36%] rounded-full border-2 border-yellow-200/90 ${
          phase === "success" ? "opacity-0" : "opacity-90"
        } ${transition}`}
      />
    </div>
  );
}
