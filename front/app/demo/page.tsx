import dynamic from "next/dynamic";

const InfiniteHero = dynamic(() => import("@/components/ui/infinite-hero"), {
  ssr: false,
  loading: () => <div className="h-screen w-full bg-black flex items-center justify-center text-white">Loading...</div>
});

export default function DemoOne() {
  return <InfiniteHero />;
}
