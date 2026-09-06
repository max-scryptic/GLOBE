import { CobeGlobeCard } from "@/components/cobe-globe-card";
import { D3GlobeCard } from "@/components/d3-globe-card";
import { ReactGlobeCard } from "@/components/react-globe-card";

export default function Home() {
  return (
    <main className="flex-1 bg-[#f4f4f4] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="py-2">
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
            Globe comparison
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Three globe implementations shown in matching cards on the main
            page.
          </p>
        </header>
        <ReactGlobeCard />
        <D3GlobeCard />
        <CobeGlobeCard />
      </div>
    </main>
  );
}
