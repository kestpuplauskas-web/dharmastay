import { createFileRoute } from "@tanstack/react-router";
import demoVideo from "@/assets/demo-video.mp4.asset.json";
import demoPoster from "@/assets/demo-poster.jpg.asset.json";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Rentivo — Demo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  return (
    <main className="min-h-screen w-full bg-[#0F172A] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[1200px] aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
        <video
          className="w-full h-full"
          src={demoVideo.url}
          poster={demoPoster.url}
          controls
          preload="metadata"
          playsInline
        />
      </div>
    </main>
  );
}
