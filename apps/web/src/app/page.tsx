"use client";

import { useRef } from "react";
import {
  Terminal,
  Chrome,
  ShieldAlert,
  Zap,
  HelpCircle,
  ChevronRight,
  CheckCircle2,
  ListFilter,
  PlayCircle,
  Lock,
  Gauge,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.082.824-.26.824-.578 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

export default function Home() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // 1. Loading Entrance - Orchestrated Power
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.from(".nav-item", {
        y: -20,
        autoAlpha: 0,
        duration: 1,
        stagger: 0.08,
      })
        .from(".hero-badge", { scale: 0.8, autoAlpha: 0, duration: 0.8 }, "-=0.6")
        .from(
          ".hero-title-part",
          {
            y: 150,
            skewY: 7,
            autoAlpha: 0,
            duration: 1.2,
            stagger: 0.1,
          },
          "-=0.7",
        )
        .from(".hero-desc", { autoAlpha: 0, x: -40, duration: 1 }, "-=0.8")
        .from(".hero-cta", { y: 20, autoAlpha: 0, duration: 0.8, stagger: 0.1 }, "-=0.6");

      // 2. Magnetic Button Effect
      const magneticButtons = gsap.utils.toArray<HTMLElement>(".magnetic-btn");
      magneticButtons.forEach((btn) => {
        btn.addEventListener("mousemove", (e) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(btn, {
            x: x * 0.3,
            y: y * 0.3,
            duration: 0.4,
            ease: "power2.out",
          });
        });
        btn.addEventListener("mouseleave", () => {
          gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
        });
      });

      // 3. Horizontal Scroll with smooth snap
      const horizontalSections = gsap.utils.toArray<HTMLElement>(".horizontal-card");
      gsap.to(horizontalSections, {
        xPercent: -100 * (horizontalSections.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: ".horizontal-container",
          pin: true,
          scrub: 1,
          snap: 1 / (horizontalSections.length - 1),
          end: () =>
            "+=" +
            (document.querySelector<HTMLElement>(".horizontal-container")?.offsetWidth || 1000),
        },
      });

      // 4. Reveal Text on Scroll
      gsap.utils.toArray<HTMLElement>(".reveal-text").forEach((text) => {
        gsap.from(text, {
          scrollTrigger: {
            trigger: text,
            start: "top 90%",
          },
          y: 100,
          autoAlpha: 0,
          skewY: 2,
          duration: 1,
          ease: "power4.out",
        });
      });

      // 5. Grid Item stagger
      gsap.from(".manual-step", {
        scrollTrigger: {
          trigger: ".manual-section",
          start: "top 60%",
        },
        scale: 0.9,
        autoAlpha: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: "back.out(1.2)",
      });
    },
    { scope: container },
  );

  return (
    <div
      ref={container}
      className="min-h-screen relative font-sans text-brutal-fg bg-brutal-bg selection:bg-brutal-accent selection:text-white"
    >
      {/* Dynamic Background Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-multiply"></div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-brutal-bg/90 backdrop-blur-xl border-b-thick flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="nav-item flex items-center gap-4 group cursor-pointer">
          <div className="size-12 bg-brutal-fg border-thick flex items-center justify-center font-display text-2xl text-white transition-colors group-hover:bg-brutal-accent text-white font-black">
            YT
          </div>
          <span className="font-display text-4xl tracking-tighter uppercase font-black text-brutal-fg transition-colors group-hover:text-brutal-accent">
            Dedupe
          </span>
        </div>

        <div className="hidden lg:flex gap-12 font-mono text-[10px] font-black uppercase tracking-[0.3em]">
          {["Experience", "Capability", "CLI", "FAQ"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="nav-item hover:text-brutal-accent transition-all hover:scale-110"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/KitsuneKode/yt-playlist-dedupe"
            target="_blank"
            rel="noreferrer"
            className="nav-item hidden md:flex items-center gap-2 hover:bg-brutal-fg hover:text-brutal-bg border-thick px-5 py-2.5 transition-all font-mono text-xs font-black uppercase"
          >
            <GithubIcon />
            <span>Repository</span>
          </a>
          <a
            href="#install"
            className="nav-item border-thick bg-brutal-accent text-white px-8 py-2.5 font-display text-2xl uppercase tracking-wider hover:bg-brutal-fg hover:text-brutal-bg transition-all brutal-shadow-sm hover:brutal-shadow"
          >
            Deploy
          </a>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <section className="hero-section min-h-screen pt-52 pb-32 px-6 lg:px-12 max-w-[1800px] mx-auto flex flex-col items-center text-center relative">
          {/* Decorative floating elements */}
          <div className="floating-shape absolute -left-40 top-60 size-[500px] bg-brutal-accent/5 border-[1px] border-brutal-fg/10 rounded-full blur-3xl -z-10 animate-pulse" />
          <div className="floating-shape absolute -right-40 bottom-60 size-[600px] bg-brutal-accent2/5 border-[1px] border-brutal-fg/10 rounded-full blur-3xl -z-10" />

          <div className="hero-badge inline-flex items-center gap-4 bg-white border-thick px-6 py-2.5 mb-14 brutal-shadow-sm rotate-[-1deg]">
            <span className="flex size-3 rounded-full bg-brutal-accent2 shadow-[0_0_15px_rgba(0,230,118,0.5)]" />
            <span className="font-mono text-sm font-black uppercase tracking-[0.25em]">
              Version 1.0.0 Global Release
            </span>
          </div>

          <h1 className="font-display text-[clamp(4rem,15vw,12rem)] leading-[0.8] tracking-tighter uppercase font-black mb-14 text-brutal-fg">
            <div className="overflow-hidden py-2">
              <div className="hero-title-part">Nuke the</div>
            </div>
            <div className="overflow-hidden py-2">
              <div className="hero-title-part text-stroke-thick hover:text-brutal-fg transition-colors duration-500 italic">
                Duplicates.
              </div>
            </div>
            <div className="overflow-hidden py-2">
              <div className="hero-title-part text-brutal-accent">Own your library.</div>
            </div>
          </h1>

          <p className="hero-desc text-2xl md:text-4xl max-w-4xl font-medium leading-tight mb-20 font-mono tracking-tight text-brutal-fg/80">
            Stop letting the algorithm clutter your experience. Clean 10,000+ items instantly via{" "}
            <span className="text-brutal-fg font-black underline decoration-brutal-accent2 underline-offset-8 transition-all hover:text-brutal-accent2">
              unlimited browser automation
            </span>{" "}
            or headless CLI.
          </p>

          <div className="hero-cta flex flex-wrap justify-center gap-10">
            <button className="magnetic-btn bg-brutal-fg text-white border-thick px-14 py-7 font-display text-4xl uppercase tracking-tighter hover:bg-brutal-accent transition-all brutal-shadow hover:brutal-shadow-hover group flex items-center gap-6">
              <span>Browser Extension</span>
              <Chrome className="size-10 group-hover:rotate-12 transition-transform" />
            </button>
            <button className="magnetic-btn bg-white text-brutal-fg border-thick px-14 py-7 font-display text-4xl uppercase tracking-tighter hover:bg-brutal-accent2 transition-all brutal-shadow hover:brutal-shadow-hover group flex items-center gap-6">
              <span>Developer CLI</span>
              <Terminal className="size-10 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </section>

        {/* HORIZONTAL CAPABILITY SECTION */}
        <section
          id="experience"
          className="horizontal-container h-screen overflow-hidden bg-brutal-fg text-white flex border-y-[12px] border-brutal-fg"
        >
          <div className="horizontal-card min-w-full h-full p-8 md:p-32 flex flex-col justify-center border-r-thick border-white/10">
            <div className="mb-14 text-brutal-accent font-mono text-xl uppercase font-black tracking-[0.4em] flex items-center gap-6 text-brutal-accent">
              <span className="w-20 h-[6px] bg-brutal-accent" />
              CAPABILITY _ 01
            </div>
            <h2 className="font-display text-8xl md:text-[12rem] uppercase leading-[0.85] font-black tracking-tighter mb-12 text-white">
              Bypass <br />
              Limits.
            </h2>
            <p className="font-mono text-xl md:text-3xl max-w-3xl text-white/50 leading-relaxed font-bold italic">
              Standard API tools crash at 198 deletions. <br />
              <span className="text-white not-italic">
                Our Extension uses native browser DOM injection
              </span>{" "}
              to handle thousands of requests with zero quota cost.
            </p>
          </div>

          <div className="horizontal-card min-w-full h-full p-8 md:p-32 flex flex-col justify-center border-r-thick border-white/10 bg-brutal-accent">
            <div className="mb-14 text-white font-mono text-xl uppercase font-black tracking-[0.4em] flex items-center gap-6 text-white">
              <span className="w-20 h-[6px] bg-white" />
              CAPABILITY _ 02
            </div>
            <h2 className="font-display text-8xl md:text-[12rem] uppercase leading-[0.85] font-black tracking-tighter mb-12 text-white">
              Surgical <br />
              Safety.
            </h2>
            <p className="font-mono text-xl md:text-3xl max-w-3xl text-white/80 leading-relaxed font-bold italic">
              Built by engineers for engineers. We strictly identify{" "}
              <span className="text-brutal-fg bg-white px-2 not-italic">
                exact video collisions
              </span>{" "}
              and preserve the original metadata while nuking the noise.
            </p>
          </div>

          <div className="horizontal-card min-w-full h-full p-8 md:p-32 flex flex-col justify-center bg-brutal-accent2 text-brutal-fg font-black">
            <div className="mb-14 text-brutal-fg font-mono text-xl uppercase font-black tracking-[0.4em] flex items-center gap-6 text-brutal-fg">
              <span className="w-20 h-[6px] bg-brutal-fg" />
              CAPABILITY _ 03
            </div>
            <h2 className="font-display text-8xl md:text-[12rem] uppercase leading-[0.85] font-black tracking-tighter mb-12 text-brutal-fg">
              Headless <br />
              Precision.
            </h2>
            <p className="font-mono text-xl md:text-3xl max-w-3xl text-brutal-fg/60 leading-relaxed italic">
              The CLI is optimized for{" "}
              <span className="text-brutal-fg underline decoration-white decoration-4 underline-offset-8 font-black not-italic">
                automation pipelines
              </span>
              . Secure OAuth2 authentication, 24h smart caching, and local usage ledger.
            </p>
          </div>
        </section>

        {/* HOW TO USE SECTION */}
        <section
          id="capability"
          className="manual-section py-44 px-6 lg:px-12 max-w-[1800px] mx-auto overflow-hidden"
        >
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-32 gap-12">
            <div className="overflow-hidden text-brutal-fg">
              <h2 className="reveal-text font-display text-[6rem] md:text-[11rem] uppercase font-black tracking-tighter leading-none">
                The Manual.
              </h2>
            </div>
            <div className="reveal-text flex items-center gap-6 bg-white border-thick p-6 brutal-shadow-sm max-w-xl">
              <ShieldAlert className="size-14 text-brutal-accent shrink-0" />
              <p className="font-mono text-sm uppercase font-black text-brutal-fg/60 leading-snug">
                The most straightforward protocol to reclaiming your digital library from the
                clutter.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-thick brutal-shadow relative bg-white">
            {[
              {
                icon: ListFilter,
                title: "Initialize",
                desc: "Navigate to your target playlist. Activate the extension to scan the current DOM state instantly.",
              },
              {
                icon: PlayCircle,
                title: "Validate",
                desc: "The engine identifies every redundancy. Review the targets before the execution protocol begins.",
              },
              {
                icon: Zap,
                title: "Execute",
                desc: "Natively interacts with the YouTube UI. No API units consumed. No rate limits encountered.",
              },
              {
                icon: Lock,
                title: "Secure",
                desc: "Your data stays local. We use your existing session or secure OAuth2. No backend tracking.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="manual-step p-12 bg-white border-thick md:border-r-0 last:border-r-thick group hover:bg-brutal-fg hover:text-white transition-all duration-500 cursor-help"
              >
                <div className="mb-16 flex justify-between items-start">
                  <div className="p-4 bg-brutal-bg border-thick group-hover:bg-brutal-accent transition-colors">
                    <step.icon className="size-14 text-brutal-fg group-hover:text-white transition-transform duration-700 group-hover:rotate-[360deg]" />
                  </div>
                  <span className="font-display text-6xl opacity-10 font-black italic">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-display text-5xl uppercase mb-6 leading-none tracking-tight">
                  {" "}
                  {step.title}
                </h3>
                <p className="font-mono text-sm leading-relaxed font-bold opacity-50 uppercase tracking-tight">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CLI SECTION */}
        <section id="cli" className="py-44 bg-brutal-fg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 size-[800px] bg-brutal-accent/10 blur-[150px] -z-0" />

          <div className="max-w-[1800px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-32 relative z-10 text-white">
            <div className="reveal-text">
              <div className="inline-block bg-brutal-accent text-white px-4 py-1.5 font-mono text-xs font-black uppercase mb-10 border-thick border-white tracking-widest">
                Technical Specification
              </div>
              <h2 className="font-display text-8xl md:text-[10rem] leading-[0.8] uppercase tracking-tighter mb-14 font-black italic text-white">
                Automated <br /> <span className="text-brutal-accent">Dedupe.</span>
              </h2>
              <p className="font-mono text-2xl mb-16 text-white/60 font-bold leading-snug italic">
                Engineered for power users who require cron-ready precision and absolute local data
                sovereignty.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                {[
                  { title: "JSON Output", desc: "Pipe results into your custom tools." },
                  { title: "Smart Cache", desc: "24h persistence with PT reset." },
                  { title: "Quota Guard", desc: "Proactive limit interception." },
                  { title: "OAuth2 Secure", desc: "Industry standard authorization." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5 items-start text-white">
                    <CheckCircle2 className="size-8 text-brutal-accent2 shrink-0 mt-1" />
                    <div>
                      <h4 className="font-display text-2xl uppercase text-white mb-2">
                        {item.title}
                      </h4>
                      <p className="font-mono text-xs text-white/40 uppercase font-black tracking-tight">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-text flex items-center">
              <div className="w-full bg-black border-[6px] border-white/10 p-10 md:p-16 brutal-shadow-accent relative group overflow-hidden">
                <Terminal className="absolute -right-10 -top-10 size-64 text-white/5 group-hover:scale-110 transition-transform duration-1000 rotate-[-15deg]" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-12">
                    <div className="size-4 rounded-full bg-[#FF5F56] shadow-[0_0_10px_#FF5F56]" />
                    <div className="size-4 rounded-full bg-[#FFBD2E] shadow-[0_0_10px_#FFBD2E]" />
                    <div className="size-4 rounded-full bg-[#27C93F] shadow-[0_0_10px_#27C93F]" />
                    <span className="ml-4 font-mono text-xs text-white/30 font-black uppercase tracking-[0.3em]">
                      bash — release v1.0
                    </span>
                  </div>
                  <div className="font-mono text-lg md:text-2xl text-brutal-accent2 space-y-8">
                    <div className="space-y-2">
                      <p className="text-white/30 text-sm italic font-medium tracking-tight uppercase">
                        # install globally
                      </p>
                      <p className="font-black tracking-tight flex items-center gap-4 text-white">
                        <span className="text-white opacity-50 select-none">$</span>
                        <span>npm install -g @kitsunekode/yt-ddp</span>
                      </p>
                    </div>
                    <div className="space-y-2 pt-4">
                      <p className="text-white/30 text-sm italic font-medium tracking-tight uppercase">
                        # initialize security layer
                      </p>
                      <p className="font-black tracking-tight flex items-center gap-4 text-white">
                        <span className="text-white opacity-50 select-none">$</span>
                        <span>yt-ddp setup</span>
                      </p>
                    </div>
                    <div className="space-y-2 pt-4">
                      <p className="text-white/30 text-sm italic font-medium tracking-tight uppercase">
                        # execute full sweep
                      </p>
                      <p className="font-black tracking-tight flex items-center gap-4 text-white text-brutal-accent2">
                        <span className="text-white opacity-50 select-none">$</span>
                        <span>yt-ddp PLAYLIST_URL --execute</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-44 px-6 lg:px-12 max-w-[1800px] mx-auto overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-10 mb-32 text-center md:text-left text-brutal-fg">
            <div className="p-8 bg-brutal-accent border-thick brutal-shadow-sm rotate-[-3deg]">
              <HelpCircle className="size-20 text-white" />
            </div>
            <h2 className="reveal-text font-display text-7xl md:text-[11rem] uppercase font-black tracking-tighter leading-none">
              Inquiries.
            </h2>
          </div>

          <div className="border-t-thick border-brutal-fg">
            <FAQItem
              question="How is this service unlimited?"
              answer="By design. The official Google Cloud API is charged per operation. Our Browser Extension utilizes native DOM manipulation and internal YouTube protocols, enabling thousands of removals with zero API cost and zero impact on your project's 10,000 unit daily limit."
            />
            <FAQItem
              question="Is my account data safe?"
              answer="Absolute security is our baseline. The tool operates strictly on the client-side. The Extension uses your existing browser session (no login required), and the CLI utilizes official Google OAuth2. We never see, store, or transmit your credentials to any external server."
            />
            <FAQItem
              question="Which browsers are supported?"
              answer="The suite is built on the Manifest V3 architecture, ensuring native support for Chrome, Edge, Brave, Arc, Vivaldi, and any Chromium-based browser. We also provide a specialized build for Mozilla Firefox."
            />
            <FAQItem
              question="Can I automate this on a server?"
              answer="Precisely. The CLI package is built for server environments. It supports headless execution, JSON logging, and persistent caching, making it the ideal choice for scheduled deduplication tasks in CI/CD or Linux cron environments."
            />
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-brutal-fg text-white px-6 lg:px-12 py-32 relative z-20 border-t-thick border-brutal-fg text-white">
        <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row justify-between items-start gap-24">
          <div className="max-w-xl">
            <div className="flex items-center gap-5 mb-12">
              <div className="size-12 bg-brutal-accent border-thick border-white flex items-center justify-center font-display text-3xl text-white brutal-shadow-sm">
                YT
              </div>
              <span className="font-display text-5xl tracking-tighter uppercase font-black">
                Dedupe
              </span>
            </div>
            <p className="font-mono text-sm uppercase font-black opacity-40 leading-relaxed max-w-sm mb-10">
              Engineered by KitsuneLabs. <br />
              The definitive standard for playlist management. <br />
              Distributed under the MIT License.
            </p>
            <div className="flex gap-4">
              <div className="size-10 border-thick border-white/20 flex items-center justify-center text-white/40 font-mono text-xs font-black transition-colors hover:text-white hover:border-white">
                26
              </div>
              <div className="size-10 border-thick border-white/20 flex items-center justify-center text-white/40 font-mono text-xs font-black transition-colors hover:text-white hover:border-white">
                HQ
              </div>
              <div className="size-10 border-thick border-white/20 flex items-center justify-center text-white/40 font-mono text-xs font-black transition-colors hover:text-white hover:border-white">
                OSS
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-20 lg:gap-40 w-full xl:w-auto">
            <div className="space-y-8 font-mono text-xs font-black uppercase tracking-[0.2em]">
              <div className="text-brutal-accent2 mb-12 flex items-center gap-3 underline decoration-2 underline-offset-8">
                Navigation
              </div>
              <a href="#" className="block hover:text-brutal-accent transition-colors">
                Home
              </a>
              <a
                href="#experience"
                className="block hover:text-brutal-accent transition-colors tracking-tighter"
              >
                Experience Hub
              </a>
              <a
                href="#cli"
                className="block hover:text-brutal-accent transition-colors tracking-tighter"
              >
                Technical Tooling
              </a>
            </div>
            <div className="space-y-8 font-mono text-xs font-black uppercase tracking-[0.2em]">
              <div className="text-brutal-accent2 mb-12 flex items-center gap-3 underline decoration-2 underline-offset-8">
                Resources
              </div>
              <a
                href="https://github.com/KitsuneKode/yt-playlist-dedupe"
                className="block hover:text-brutal-accent transition-all flex items-center gap-3 group"
              >
                <GithubIcon /> <span>Github Src</span>
              </a>
              <a
                href="https://www.npmjs.com/package/@kitsunekode/yt-ddp"
                className="block hover:text-brutal-accent transition-colors tracking-tighter text-brutal-accent2"
              >
                NPM Distribution
              </a>
              <a
                href="#"
                className="block hover:text-brutal-accent transition-colors text-white/20 pointer-events-none tracking-tighter italic"
              >
                Documentation
              </a>
            </div>
            <div className="space-y-8 font-mono text-xs font-black uppercase tracking-[0.2em]">
              <div className="text-brutal-accent2 mb-12 flex items-center gap-3 underline decoration-2 underline-offset-8">
                Legal
              </div>
              <a href="#" className="block hover:text-brutal-accent transition-colors">
                Privacy Policy
              </a>
              <a
                href="#"
                className="block hover:text-brutal-accent transition-colors tracking-tighter"
              >
                Security Protocols
              </a>
              <a href="#" className="block hover:text-brutal-accent transition-colors">
                MIT License
              </a>
            </div>
          </div>
        </div>

        <div className="mt-32 pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-8 font-mono text-[10px] uppercase font-black tracking-[0.5em] opacity-20">
          <span>PROJECT: YT-DDP-2026-STABLE</span>
          <div className="flex items-center gap-4">
            <Gauge className="size-4" />
            <span>OPERATIONAL STATUS: NOMINAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);

  const toggle = () => {
    const isOpen = gsap.getProperty(contentRef.current, "height") !== 0;

    if (isOpen) {
      gsap.to(contentRef.current, { height: 0, autoAlpha: 0, duration: 0.6, ease: "expo.inOut" });
      gsap.to(iconRef.current, { rotation: 0, duration: 0.5, ease: "back.out(1.7)" });
    } else {
      gsap.set(contentRef.current, { height: "auto" });
      gsap.from(contentRef.current, { height: 0, autoAlpha: 0, duration: 0.6, ease: "expo.inOut" });
      gsap.to(iconRef.current, { rotation: 90, duration: 0.5, ease: "back.out(1.7)" });
    }
  };

  return (
    <div className="border-b-thick border-brutal-fg group overflow-hidden bg-white/5 transition-colors hover:bg-white/10">
      <button
        onClick={toggle}
        className="w-full py-14 flex items-center justify-between text-left hover:bg-white transition-all group-hover:px-6 duration-500"
      >
        <span className="font-display text-4xl md:text-7xl uppercase tracking-tighter font-black leading-[0.85] text-brutal-fg">
          {question}
        </span>
        <div className="size-16 border-thick flex items-center justify-center bg-brutal-bg group-hover:bg-brutal-accent group-hover:text-white transition-colors">
          <ChevronRight ref={iconRef} className="size-10 shrink-0" />
        </div>
      </button>
      <div ref={contentRef} className="overflow-hidden h-0 opacity-0 bg-white px-12 border-x-thick">
        <div className="pb-16 pt-10 font-mono text-xl md:text-3xl leading-snug max-w-6xl font-black text-brutal-fg italic tracking-tighter uppercase">
          {answer}
        </div>
      </div>
    </div>
  );
}
