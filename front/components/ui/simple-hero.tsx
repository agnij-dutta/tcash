"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { useRef, useEffect, useState } from "react";

gsap.registerPlugin(SplitText);

export default function SimpleHero() {
	const [isClient, setIsClient] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const bgRef = useRef<HTMLDivElement>(null);
	const h1Ref = useRef<HTMLHeadingElement>(null);
	const pRef = useRef<HTMLParagraphElement>(null);
	const ctaRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setIsClient(true);
	}, []);

	useGSAP(
		() => {
			if (!h1Ref.current || !pRef.current) return;
			
			const ctas = ctaRef.current ? Array.from(ctaRef.current.children) : [];

			const h1Split = new SplitText(h1Ref.current, { type: "lines" });
			const pSplit = new SplitText(pRef.current, { type: "lines" });

			gsap.set(bgRef.current, { filter: "blur(28px)" });
			gsap.set(h1Split.lines, {
				opacity: 0,
				y: 24,
				filter: "blur(8px)",
			});
			gsap.set(pSplit.lines, {
				opacity: 0,
				y: 16,
				filter: "blur(6px)",
			});
			if (ctas.length) gsap.set(ctas, { opacity: 0, y: 16 });

			const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
			tl.to(bgRef.current, { filter: "blur(0px)", duration: 1.2 }, 0)
				.to(
					h1Split.lines,
					{
						opacity: 1,
						y: 0,
						filter: "blur(0px)",
						duration: 0.8,
						stagger: 0.1,
					},
					0.3,
				)
				.to(
					pSplit.lines,
					{
						opacity: 1,
						y: 0,
						filter: "blur(0px)",
						duration: 0.6,
						stagger: 0.08,
					},
					"-=0.3",
				)
				.to(ctas, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, "-=0.2");

			return () => {
				h1Split.revert();
				pSplit.revert();
			};
		},
		{ scope: rootRef },
	);

	return (
		<div
			ref={rootRef}
			className="relative h-svh w-full overflow-hidden bg-black text-white"
		>
			<div className="absolute inset-0" ref={bgRef}>
				<div className="h-full w-full bg-gradient-to-br from-gray-900 via-black to-gray-800 animate-pulse" />
			</div>

			<div className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_80%_at_50%_50%,_transparent_40%,_black_100%)]" />

			<div className="relative z-10 flex h-svh w-full items-center justify-center px-6">
				<div className="text-center">
					<h1
						ref={h1Ref}
						className="mx-auto max-w-2xl lg:max-w-4xl text-[clamp(2.25rem,6vw,4rem)] font-extralight leading-[0.95] tracking-tight"
					>
						The road dissolves in light, the horizon remains unseen.
					</h1>
					<p
						ref={pRef}
						className="mx-auto mt-4 max-w-2xl md:text-balance text-sm/6 md:text-base/7 font-light tracking-tight text-white/70"
					>
						Minimal structures fade into a vast horizon where presence and
						absence merge. A quiet tension invites the eye to wander without
						end.
					</p>

					<div
						ref={ctaRef}
						className="mt-8 flex flex-row items-center justify-center gap-4"
					>
						<button
							type="button"
							className="group relative overflow-hidden border border-white/30 bg-gradient-to-r from-white/20 to-white/10 px-4 py-2 text-sm rounded-lg font-medium tracking-wide text-white backdrop-blur-sm transition-[border-color,background-color,box-shadow] duration-500 hover:border-white/50 hover:bg-white/20 hover:shadow-lg hover:shadow-white/10 cursor-pointer"
						>
							Learn more
						</button>

						<button
							type="button"
							className="group relative px-4 py-2 text-sm font-medium tracking-wide text-white/90 transition-[filter,color] duration-500 hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)] hover:text-white cursor-pointer"
						>
							View portfolio
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

