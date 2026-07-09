function Mascot({
  className,
  width,
  height,
  eyeClassName,
  eyeShape = "dot",
}: {
  className: string;
  width: number;
  height: number;
  eyeClassName: string;
  eyeShape?: "dot" | "dash";
}) {
  return (
    <div
      className={`relative rounded-t-full ${className}`}
      style={{ width, height }}
    >
      <div className="absolute left-1/2 top-[36%] flex -translate-x-1/2 gap-2.5">
        {eyeShape === "dot" ? (
          <>
            <span className={`h-2.5 w-2.5 rounded-full ${eyeClassName}`} />
            <span className={`h-2.5 w-2.5 rounded-full ${eyeClassName}`} />
          </>
        ) : (
          <>
            <span className={`h-[3px] w-3.5 rounded-full ${eyeClassName}`} />
            <span className={`h-[3px] w-3.5 rounded-full ${eyeClassName}`} />
          </>
        )}
      </div>
    </div>
  );
}

export function MascotCluster() {
  return (
    <div className="flex items-end justify-center">
      <Mascot
        className="-mr-8 z-0 bg-slate-300"
        width={100}
        height={170}
        eyeClassName="bg-black"
        eyeShape="dot"
      />
      <Mascot
        className="-mr-10 z-10 bg-white"
        width={110}
        height={250}
        eyeClassName="bg-black"
        eyeShape="dash"
      />
      <Mascot
        className="-mr-8 z-20 border border-neutral-700 bg-neutral-900"
        width={100}
        height={200}
        eyeClassName="bg-white"
        eyeShape="dot"
      />
      <Mascot
        className="z-30 bg-brand"
        width={100}
        height={225}
        eyeClassName="bg-black"
        eyeShape="dot"
      />
    </div>
  );
}
