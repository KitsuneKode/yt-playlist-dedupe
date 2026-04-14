import { useEffect, useState, useMemo } from "react";
import {
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MousePointer2,
  Settings2,
  Square,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type ScanStatus = "idle" | "scanning" | "scrolling" | "ready" | "deleting" | "done";
type Speed = "fast" | "normal" | "safe";

interface DuplicateItem {
  id: string;
  videoId: string;
  title: string;
  index: number;
  originalIndex: number;
  selected: boolean;
  status?: "queued" | "processing" | "success" | "failed";
  error?: string;
}

export default function App() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [isPlaylistPage, setIsPlaylistPage] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [currentAction, setCurrentAction] = useState<string>("");
  const [speed, setSpeed] = useState<Speed>("normal");
  const [totalScanned, setTotalScanned] = useState(0);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url?.includes("youtube.com/playlist")) {
        setIsPlaylistPage(true);
      }
    });
  }, []);

  const handleScrollAndScan = async () => {
    setStatus("scrolling");
    setCurrentAction("Scrolling to load all videos...");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      setStatus("idle");
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { action: "SCROLL_TO_BOTTOM" });
      handleScan();
    } catch (err) {
      console.error("[YT-DDP] Scroll failed:", err);
      handleScan(); // Try to scan anyway
    }
  };

  const handleScan = async () => {
    setStatus("scanning");
    setCurrentAction("Analyzing DOM for duplicates...");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      setStatus("idle");
      return;
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: "SCAN_DOM" });

      if (response && typeof response === "object" && "duplicates" in response) {
        const found = (response.duplicates || []).map((d: any) => ({
          ...d,
          selected: true,
          status: "queued",
        }));
        setDuplicates(found);
        setTotalScanned(response.totalScanned || 0);
        setStatus("ready");
      } else {
        setStatus("idle");
      }
    } catch (err) {
      console.error("[YT-DDP] Scan failed:", err);
      setStatus("idle");
    }
  };

  const handleExecute = async () => {
    const selectedItems = duplicates.filter((d) => d.selected);
    if (selectedItems.length === 0) return;

    setStatus("deleting");
    setDeletedCount(0);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      setStatus("idle");
      return;
    }

    const listener = (msg: any) => {
      if (msg.action === "DELETE_PROGRESS") {
        setDeletedCount(msg.count);
        setCurrentAction(`Deleting: ${msg.currentTitle}`);

        setDuplicates((prev) =>
          prev.map((d) => {
            if (d.title === msg.currentTitle) {
              return { ...d, status: msg.status, error: msg.error };
            }
            return d;
          }),
        );
      } else if (msg.action === "DELETE_COMPLETE") {
        setStatus("done");
        chrome.runtime.onMessage.removeListener(listener);
      }
    };

    try {
      chrome.runtime.onMessage.addListener(listener);
      await chrome.tabs.sendMessage(tab.id, {
        action: "EXECUTE_DELETE",
        items: selectedItems,
        options: { speed },
      });
    } catch (err) {
      console.error("[YT-DDP] Delete failed:", err);
      chrome.runtime.onMessage.removeListener(listener);
      setStatus("idle");
    }
  };

  const handleStop = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { action: "STOP_EXECUTION" });
    }
  };

  const toggleSelect = (id: string) => {
    setDuplicates((prev) => prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)));
  };

  const toggleAll = () => {
    const allSelected = duplicates.every((d) => d.selected);
    setDuplicates((prev) => prev.map((d) => ({ ...d, selected: !allSelected })));
  };

  const handleReset = () => {
    setStatus("idle");
    setDuplicates([]);
    setDeletedCount(0);
    setCurrentAction("");
  };

  const selectedCount = useMemo(() => duplicates.filter((d) => d.selected).length, [duplicates]);

  if (!isPlaylistPage) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center space-y-6 bg-transparent">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-destructive/20 rounded-full blur-3xl" />
          <AlertCircle className="size-16 text-destructive relative" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Not a Playlist</h2>
          <p className="text-sm text-muted-foreground max-w-[250px] leading-relaxed mx-auto">
            Navigate to a YouTube Playlist to begin scanning for duplicates.
          </p>
        </div>
      </div>
    );
  }

  const progressPercentage = selectedCount > 0 ? (deletedCount / selectedCount) * 100 : 0;

  const springTransition = { type: "spring", bounce: 0.2, duration: 0.6 } as const;

  // For lists staggered entry
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 } as const,
    },
  };

  return (
    <div className="flex flex-col h-[600px] w-[400px] bg-transparent p-4 box-border">
      <Card className="flex flex-col h-full glass-panel border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between pb-4 pt-5 px-5 space-y-0 shrink-0 relative z-10">
          <div className="flex items-center space-x-3">
            <motion.div
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="size-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(170,59,255,0.4)] text-white font-bold text-sm border border-white/20"
            >
              YT
            </motion.div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-white mb-0.5">
                Playlist Dedupe
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)] animate-pulse-slow" />
                <p className="text-[11px] text-primary/80 font-semibold uppercase tracking-[0.1em]">
                  DOM Scanner
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <select
              value={speed}
              onChange={(e) => setSpeed(e.target.value as Speed)}
              className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/50 text-white font-medium cursor-pointer transition-colors hover:bg-white/10 backdrop-blur-md"
              disabled={status === "deleting"}
            >
              <option value="safe" className="bg-background text-foreground">
                🛡️ Safe
              </option>
              <option value="normal" className="bg-background text-foreground">
                ⚖️ Normal
              </option>
              <option value="fast" className="bg-background text-foreground">
                ⚡ Fast
              </option>
            </select>
          </div>
        </CardHeader>

        <Separator className="bg-white/5" />

        <CardContent className="flex-1 overflow-hidden flex flex-col p-5 relative z-10">
          <AnimatePresence mode="wait">
            {(status === "idle" || status === "scrolling" || status === "scanning") && (
              <motion.div
                key="scanning-state"
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={springTransition}
                className="flex flex-col items-center justify-center h-full space-y-8"
              >
                <div className="relative">
                  <motion.div
                    animate={
                      status !== "idle"
                        ? {
                            scale: [1, 1.2, 1],
                            rotate: [0, 180, 360],
                          }
                        : {}
                    }
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -inset-8 bg-primary/20 rounded-full blur-3xl"
                  />
                  <div className="size-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-inner relative">
                    {status !== "idle" ? (
                      <RefreshCw className="size-8 text-primary animate-spin" />
                    ) : (
                      <MousePointer2 className="size-8 text-white relative z-10" />
                    )}
                  </div>
                </div>
                <div className="text-center space-y-3 px-2">
                  <h2 className="text-xl font-bold text-white text-glow">
                    {status === "idle" ? "Ready to Analyze" : "Intercepting DOM..."}
                  </h2>
                  <p className="text-sm text-white/50 max-w-[240px] mx-auto leading-relaxed h-[40px]">
                    {status === "idle"
                      ? "Scrolls to the bottom and builds an exact footprint of all unique videos."
                      : currentAction}
                  </p>
                </div>

                <div className="flex flex-col w-full gap-3 pt-4">
                  <Button
                    onClick={handleScrollAndScan}
                    disabled={status !== "idle"}
                    className="rounded-xl h-12 text-sm font-semibold shadow-[0_0_15px_rgba(170,59,255,0.3)] bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {status === "scrolling" ? (
                      <RefreshCw className="animate-spin mr-2" />
                    ) : (
                      <Play className="mr-2 fill-current size-4" />
                    )}
                    Deep Auto Scan
                  </Button>
                  <Button
                    onClick={handleScan}
                    disabled={status !== "idle"}
                    variant="outline"
                    className="rounded-xl h-12 text-sm border-white/10 hover:bg-white/5 bg-transparent"
                  >
                    Quick Scan (Visible Only)
                  </Button>
                </div>
              </motion.div>
            )}

            {(status === "ready" || status === "deleting" || status === "done") && (
              <motion.div
                key="results-state"
                initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={springTransition}
                className="flex flex-col h-full space-y-5"
              >
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <div className="p-3 rounded-2xl glass-input flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-xl font-bold text-white tabular-nums drop-shadow-sm">
                      {totalScanned}
                    </span>
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.1em] mt-1.5">
                      Total
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 flex flex-col items-center justify-center text-center shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
                    <span className="text-xl font-bold text-destructive tabular-nums drop-shadow-sm">
                      {duplicates.length}
                    </span>
                    <span className="text-[10px] text-destructive/70 font-bold uppercase tracking-[0.1em] mt-1.5">
                      Duplicates
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-center shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
                    <span className="text-xl font-bold text-primary tabular-nums drop-shadow-sm text-glow">
                      {selectedCount}
                    </span>
                    <span className="text-[10px] text-primary/70 font-bold uppercase tracking-[0.1em] mt-1.5">
                      Selected
                    </span>
                  </div>
                </div>

                <div className="flex-1 rounded-2xl border border-white/10 overflow-hidden flex flex-col bg-black/20 shadow-inner relative">
                  <div className="p-3 border-b border-white/5 shrink-0 bg-white/[0.02] flex justify-between items-center z-10 backdrop-blur-md">
                    <h3 className="text-[11px] font-bold text-white/50 uppercase tracking-[0.15em] px-2 shadow-sm">
                      Targets
                    </h3>
                    <button
                      onClick={toggleAll}
                      disabled={status === "deleting"}
                      className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider px-2"
                    >
                      {duplicates.every((d) => d.selected) ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <ScrollArea className="flex-1 relative">
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="p-3 space-y-2"
                    >
                      {duplicates.map((dup) => (
                        <motion.div
                          variants={itemVariants}
                          key={dup.id}
                          className={`flex items-center space-x-3 p-3 rounded-xl transition-[background-color,box-shadow,border-color] duration-300 border border-transparent ${
                            dup.status === "processing"
                              ? "bg-primary/10 border-primary/30 shadow-[inset_0_0_15px_rgba(170,59,255,0.15)]"
                              : dup.status === "success"
                                ? "bg-emerald-500/10 border-emerald-500/20"
                                : dup.status === "failed"
                                  ? "bg-destructive/10 border-destructive/20"
                                  : "bg-white/5 hover:bg-white/10 hover:border-white/10"
                          }`}
                        >
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={dup.selected}
                              onChange={() => toggleSelect(dup.id)}
                              disabled={status === "deleting" || status === "done"}
                              className="size-4 rounded-md border-white/20 bg-black/50 text-primary focus:ring-primary/50 focus:ring-offset-0 disabled:opacity-50 appearance-none outline-none cursor-pointer checked:bg-primary transition-colors"
                            />
                            {dup.selected && (
                              <CheckCircle2
                                className="absolute size-3 text-white pointer-events-none"
                                strokeWidth={3}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/90 truncate font-semibold">
                              {dup.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="text-[9px] bg-white/5 border-white/10 text-white/50 px-1.5 py-0 h-4 uppercase font-mono tracking-tighter"
                              >
                                #{dup.index} → #{dup.originalIndex}
                              </Badge>
                              {dup.status === "success" && (
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                  Nuked
                                </span>
                              )}
                              {dup.status === "failed" && (
                                <span
                                  className="text-[10px] text-destructive font-bold uppercase tracking-wider"
                                  title={dup.error}
                                >
                                  Failed
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </ScrollArea>
                  {/* Subtle fade out at bottom of scroll area */}
                  <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        <CardFooter className="shrink-0 p-5 pt-1 space-y-3 flex-col z-10 relative bg-gradient-to-t from-card to-transparent">
          {status === "deleting" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="w-full bg-white/5 rounded-2xl p-4 border border-white/10 shadow-inner flex flex-col gap-3"
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[11px] text-white/60 font-bold uppercase tracking-[0.1em]">
                  <span className="truncate max-w-[200px]">{currentAction}</span>
                  <span className="tabular-nums text-white">
                    {deletedCount} <span className="text-white/30">/</span> {selectedCount}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2 bg-black/50" />
              </div>
              <Button
                onClick={handleStop}
                variant="outline"
                size="sm"
                className="w-full h-10 text-xs font-bold border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/10"
              >
                <Square className="size-3.5 mr-2 fill-current" />
                Abort Mission
              </Button>
            </motion.div>
          )}

          {status === "ready" && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Button
                onClick={handleExecute}
                disabled={selectedCount === 0}
                className="w-full h-12 text-[15px] font-bold bg-destructive text-white hover:bg-destructive/90 shadow-[0_0_20px_rgba(220,38,38,0.4)] rounded-xl"
              >
                <Trash2 className="size-4 mr-2" />
                Nuke {selectedCount} Duplicates
              </Button>
            </div>
          )}

          {status === "done" && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full flex flex-col gap-3"
            >
              <div className="w-full flex items-center justify-center p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]">
                <CheckCircle2 className="size-4 mr-2" />
                <span className="font-bold text-xs tracking-wide">
                  Mission Accomplished: {deletedCount} Nuked
                </span>
              </div>
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full h-11 text-xs font-semibold rounded-xl bg-white/5 border-white/10 hover:bg-white/10 shadow-lg"
              >
                <RefreshCw className="size-3.5 mr-2" />
                Scan Again
              </Button>
            </motion.div>
          )}

          {status === "ready" && (
            <button
              onClick={handleReset}
              className="w-full py-1 text-[11px] text-white/40 hover:text-white font-medium transition-colors outline-none cursor-pointer"
            >
              Cancel and restart
            </button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
