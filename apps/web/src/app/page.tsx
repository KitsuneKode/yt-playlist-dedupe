"use client";

import { useRef } from "react";
import {
  Terminal,
  Chrome,
  ShieldAlert,
  Zap,
  Layers,
  HelpCircle,
  ChevronRight,
  Github,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Home() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Hero Entrance Animation
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.from(".nav-item", {
        y: -20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.05,
      })
        .from(".hero-badge", { scale: 0, opacity: 0, duration: 0.5 }, "-=0.4")
        .from(
          ".hero-text-line",
          {
            y: 100,
            opacity: 0,
            rotateZ: 5,
            duration: 0.8,
            stagger: 0.1,
          },
          "-=0.3",
        )
        .from(".hero-desc", { opacity: 0, x: -20, duration: 0.6 }, "-=0.4")
        .from(".hero-card", { y: 50, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.4");

      // Scroll Animations
      gsap.utils.toArray<HTMLElement>(".reveal-up").forEach((elem) => {
        gsap.from(elem, {
          scrollTrigger: {
            trigger: elem,
            start: "top 85%",
          },
          y: 50,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
        });
      });

      gsap.utils.toArray<HTMLElement>(".feature-card").forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          },
          y: 40,
          opacity: 0,
          rotation: i % 2 === 0 ? -2 : 2,
          duration: 0.5,
          ease: "back.out(1.4)",
        });
      });

      // Install Banner Parallax
      gsap.to(".install-bg-text", {
        scrollTrigger: {
          trigger: ".install-section",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
        x: -300,
      });
    },
    { scope: container },
  );

  return (
    <div ref={container} className="min-h-screen relative font-sans text-brutal-fg bg-brutal-bg">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 bg-brutal-bg border-b-thick flex items-center justify-between px-6 py-4">
        <div className="nav-item font-display text-4xl tracking-tighter uppercase leading-none">
          YT<span className="text-brutal-accent">DDP</span>
        </div>
        <div className="hidden md:flex gap-8 font-mono text-sm font-bold uppercase">
          <a href="#how-it-works" className="nav-item hover:text-brutal-accent transition-colors">
            Architecture
          </a>
          <a href="#cli" className="nav-item hover:text-brutal-accent transition-colors">
            CLI
          </a>
          <a href="#extension" className="nav-item hover:text-brutal-accent transition-colors">
            Extension
          </a>
          <a href="#faq" className="nav-item hover:text-brutal-accent transition-colors">
            FAQ
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/KitsuneKode/yt-playlist-dedupe"
            target="_blank"
            rel="noreferrer"
            className="nav-item hidden md:flex items-center gap-2 hover:text-brutal-accent font-mono text-sm font-bold uppercase transition-colors"
          >
            <Github className="w-4 h-4" /> Code
          </a>
          <a
            href="#install"
            className="nav-item border-thick bg-brutal-accent text-white px-5 py-2 font-display text-lg uppercase tracking-wide hover:bg-brutal-fg hover:text-brutal-bg transition-colors brutal-shadow hover:brutal-shadow-hover"
          >
            Deploy
          </a>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 md:px-12 max-w-[1600px] mx-auto relative z-10">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-thick brutal-shadow bg-white relative overflow-hidden">
          <div className="lg:col-span-8 p-8 md:p-16 lg:border-r-thick flex flex-col justify-center relative z-10 bg-white">
            <div className="hero-badge inline-flex items-center gap-2 bg-brutal-fg text-brutal-bg font-mono text-xs font-bold uppercase px-3 py-1.5 mb-8 self-start border-thick">
              <span className="w-2 h-2 rounded-full bg-brutal-accent2 animate-pulse" />
              System Utility V1.0
            </div>

            <h1 className="font-display text-[5.5rem] sm:text-[7rem] lg:text-[9rem] leading-[0.85] tracking-tighter uppercase mb-8">
              <div className="overflow-hidden">
                <div className="hero-text-line">Nuke</div>
              </div>
              <div className="overflow-hidden">
                <div className="hero-text-line text-stroke-thick hover:text-brutal-accent transition-colors duration-300">
                  Duplicates.
                </div>
              </div>
              <div className="overflow-hidden">
                <div className="hero-text-line text-brutal-accent">Instantly.</div>
              </div>
            </h1>

            <p className="hero-desc text-xl md:text-2xl font-medium max-w-2xl leading-snug font-mono">
              The definitive engineering tool to clean massive YouTube playlists. Available as a
              headless CLI or a native DOM-bypassing browser extension.
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col z-10">
            <div className="hero-card flex-1 p-8 md:p-12 flex flex-col justify-center border-b-thick bg-brutal-bg hover:bg-brutal-accent hover:text-white transition-colors group cursor-pointer relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-150 transition-transform duration-500">
                <Chrome className="w-64 h-64" />
              </div>
              <Chrome className="w-12 h-12 mb-6 group-hover:-translate-y-2 transition-transform duration-300 relative z-10" />
              <h3 className="font-display text-5xl uppercase leading-none mb-4 relative z-10">
                Extension
              </h3>
              <p className="font-mono text-sm leading-tight relative z-10 font-bold">
                Natively simulates DOM clicks to bypass Google Cloud API limits completely.
              </p>
            </div>

            <div className="hero-card flex-1 p-8 md:p-12 flex flex-col justify-center bg-white hover:bg-brutal-fg hover:text-brutal-bg transition-colors group cursor-pointer relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 group-hover:scale-150 transition-transform duration-500">
                <Terminal className="w-64 h-64" />
              </div>
              <Terminal className="w-12 h-12 mb-6 group-hover:-translate-y-2 transition-transform duration-300 relative z-10" />
              <h3 className="font-display text-5xl uppercase leading-none mb-4 relative z-10">
                CLI Tool
              </h3>
              <p className="font-mono text-sm leading-tight relative z-10 font-bold">
                Automated cron-ready deduplication with smart local quota ledgers.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div id="how-it-works" className="mt-32">
          <div className="overflow-hidden mb-12">
            <h2 className="reveal-up font-display text-6xl md:text-8xl uppercase leading-none tracking-tighter">
              Architecture
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldAlert,
                title: "Quota Safe-Stop",
                desc: "YouTube caps API deletions at ~198/day. Our CLI tracks a local ledger and intercepts execution before you hit 403 errors.",
                color: "bg-[#FF3300]",
              },
              {
                icon: Layers,
                title: "Smart Caching",
                desc: "Playlist metadata is cached locally for 24 hours. The cache automatically invalidates at Midnight PT to match Google's quota reset.",
                color: "bg-[#00E676]",
              },
              {
                icon: Zap,
                title: "DOM Extractor",
                desc: "The extension reads rendered videos directly from the DOM, requiring zero OAuth setup and consuming zero API units.",
                color: "bg-[#3300FF]",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="feature-card border-thick p-8 bg-white brutal-shadow hover:brutal-shadow-hover transition-shadow relative overflow-hidden group"
              >
                <div
                  className={`absolute top-0 right-0 w-32 h-32 ${feature.color} rounded-bl-full -mr-16 -mt-16 opacity-20 group-hover:scale-150 transition-transform duration-500`}
                />
                <feature.icon className="w-12 h-12 text-brutal-fg mb-8 relative z-10" />
                <h4 className="font-display text-4xl uppercase mb-4 leading-none relative z-10">
                  {feature.title}
                </h4>
                <p className="font-mono text-sm leading-relaxed font-medium relative z-10">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Installation Section */}
        <div
          id="install"
          className="install-section mt-32 border-thick bg-brutal-fg text-brutal-bg p-8 md:p-20 brutal-shadow-accent relative overflow-hidden"
        >
          <div className="install-bg-text absolute left-0 top-1/2 -translate-y-1/2 font-display text-[300px] text-white/5 whitespace-nowrap pointer-events-none leading-none">
            DEPLOY DEPLOY DEPLOY
          </div>

          <div className="relative z-10">
            <h2 className="reveal-up font-display text-7xl md:text-9xl uppercase mb-16 tracking-tighter text-white">
              Deploy Now.
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="reveal-up">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 border-thick bg-brutal-accent flex items-center justify-center font-display text-2xl text-white">
                    01
                  </div>
                  <h3 id="cli" className="font-display text-4xl text-white uppercase tracking-wide">
                    The CLI Package
                  </h3>
                </div>
                <p className="mb-6 font-mono text-brutal-bg/70 text-sm">
                  For developers, automation, and massive headless scanning.
                </p>
                <div className="bg-black border-thick border-white/20 p-6 font-mono text-sm text-[#00E676] overflow-x-auto relative group">
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Terminal className="w-5 h-5 text-white/50" />
                  </div>
                  <span className="text-gray-500 select-none">$</span> npm install -g
                  @kitsunekode/yt-ddp
                  <br />
                  <span className="text-gray-500 select-none">$</span> yt-ddp
                  &quot;PLAYLIST_URL&quot; --execute
                </div>
              </div>

              <div className="reveal-up">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 border-thick bg-white text-brutal-fg flex items-center justify-center font-display text-2xl">
                    02
                  </div>
                  <h3
                    id="extension"
                    className="font-display text-4xl text-white uppercase tracking-wide"
                  >
                    The Extension
                  </h3>
                </div>
                <p className="mb-6 font-mono text-brutal-bg/70 text-sm">
                  For end-users. Nuke duplicates directly from your browser without limits.
                </p>
                <a
                  href="#"
                  className="w-full bg-white text-brutal-fg border-thick border-white p-6 font-display text-3xl uppercase tracking-wider hover:bg-brutal-accent hover:border-brutal-accent hover:text-white transition-colors flex items-center justify-center gap-4 group"
                >
                  <Chrome className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  Add to Browser
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="mt-32">
          <div className="flex items-center gap-6 mb-16 overflow-hidden">
            <HelpCircle className="reveal-up w-16 h-16 text-brutal-accent" />
            <h2 className="reveal-up font-display text-6xl md:text-8xl uppercase leading-none tracking-tighter">
              F.A.Q.
            </h2>
          </div>

          <div className="border-t-thick border-brutal-fg">
            <FAQItem
              question="How does the extension bypass the API quota?"
              answer="Google Cloud limits the official YouTube Data API v3 to 10,000 units per day (which translates to roughly 198 video deletions). The browser extension completely circumvents this by parsing the DOM on your active YouTube tab and simulating native clicks on the 'Remove from playlist' UI, effectively giving you unlimited deletions."
            />
            <FAQItem
              question="Why should I use the CLI instead of the extension?"
              answer="The CLI is designed for developers who want to automate deduplication via cron jobs or CI/CD pipelines. It features a smart local quota ledger, 24-hour intelligent caching, and programmatic JSON output. It runs completely headless."
            />
            <FAQItem
              question="Is it safe? Will it delete my original videos?"
              answer="Yes, it is extremely safe. The algorithm strictly identifies identical video IDs within a single playlist and guarantees that the very first occurrence of the video is always preserved. It only deletes the subsequent copies."
            />
            <FAQItem
              question="Which browsers are supported?"
              answer="The extension is built with Manifest V3 and is fully compatible with Google Chrome, Microsoft Edge, Brave, Arc, and any other Chromium-based browser."
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-thick border-brutal-fg bg-brutal-fg text-white px-6 py-12 mt-20 flex flex-col md:flex-row justify-between items-center font-mono text-sm uppercase relative z-20">
        <div className="font-bold flex items-center gap-4">
          <div className="w-3 h-3 bg-brutal-accent2 rounded-full animate-pulse" />© 2026 YouTube
          Playlist Deduplicator
        </div>
        <div className="flex gap-8 mt-8 md:mt-0 font-bold">
          <a href="#" className="hover:text-brutal-accent transition-colors">
            Privacy Policy
          </a>
          <a
            href="https://github.com/KitsuneKode/yt-playlist-dedupe"
            className="hover:text-brutal-accent transition-colors flex items-center gap-2"
          >
            <Github className="w-4 h-4" /> Source Code
          </a>
        </div>
      </footer>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  return (
    <div className="border-b-thick border-brutal-fg group">
      <button
        onClick={(e) => {
          const content = e.currentTarget.nextElementSibling as HTMLElement;
          const icon = e.currentTarget.querySelector(".faq-icon");
          const isOpen = content.style.height && content.style.height !== "0px";

          if (isOpen) {
            gsap.to(content, { height: 0, opacity: 0, duration: 0.4, ease: "power3.inOut" });
            gsap.to(icon, { rotation: 0, duration: 0.3 });
          } else {
            gsap.set(content, { height: "auto" });
            const height = content.offsetHeight;
            gsap.fromTo(
              content,
              { height: 0, opacity: 0 },
              { height, opacity: 1, duration: 0.4, ease: "power3.inOut" },
            );
            gsap.to(icon, { rotation: 90, duration: 0.3 });
          }
        }}
        className="w-full py-8 flex items-center justify-between text-left hover:text-brutal-accent transition-colors"
      >
        <span className="font-display text-3xl md:text-4xl uppercase tracking-tight">
          {question}
        </span>
        <ChevronRight className="faq-icon w-10 h-10 shrink-0" />
      </button>
      <div className="overflow-hidden" style={{ height: 0, opacity: 0 }}>
        <div className="pb-8 font-mono text-base leading-relaxed max-w-4xl font-medium text-brutal-fg/80">
          {answer}
        </div>
      </div>
    </div>
  );
}
