"use client";

import { useState } from "react";
import { CobeGlobeCard } from "@/components/cobe-globe-card";
import { D3GlobeCard } from "@/components/d3-globe-card";
import { ReactGlobeCard } from "@/components/react-globe-card";
import { cn } from "@/lib/utils";

const tabs = ["Globes", "Country Selector", "Flight Paths"] as const;

type Tab = (typeof tabs)[number];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Globes");

  return (
    <main className="flex-1 bg-[#f4f4f4] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-md px-4 py-2.5 text-sm font-semibold text-zinc-600 transition-colors",
                activeTab === tab
                  ? "bg-zinc-950 text-white shadow-sm"
                  : "hover:bg-zinc-100 hover:text-zinc-950",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Globes" ? (
          <>
            <ReactGlobeCard />
            <D3GlobeCard />
            <CobeGlobeCard />
          </>
        ) : activeTab === "Country Selector" ? (
          <D3GlobeCard
            description="Track visited countries directly on the globe."
            globeClassName="h-[620px] min-h-[460px]"
            selectable
            title="Country Selector"
          />
        ) : (
          <D3GlobeCard
            description="Select countries while animated routes mimic international flight paths."
            globeClassName="h-[620px] min-h-[460px]"
            selectable
            showFlightPaths
            title="Flight Paths"
          />
        )}
      </div>
    </main>
  );
}
