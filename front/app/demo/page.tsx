import dynamic from "next/dynamic"

const InfiniteHero = dynamic(() => import("@/components/ui/infinite-hero"), {
  ssr: false,
  loading: () => (
    <div className="relative h-[80vh] w-full overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_50%,_rgba(255,255,255,0.06)_0%,_transparent_60%)] animate-pulse" />
    </div>
  ),
})

export default function DemoOne() {
  return <InfiniteHero />
}
