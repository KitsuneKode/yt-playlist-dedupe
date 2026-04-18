import {
  AlertCircle,
  CheckCircle2,
  MousePointer2,
  Play,
  RefreshCw,
  Square,
  Trash2,
  Settings,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DeletionMessage, DuplicateItem, Speed } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ScanStatus = "idle" | "scanning" | "scrolling" | "ready" | "deleting" | "done" | "error";

export default function App() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [isPlaylistPage, setIsPlaylistPage] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [currentAction, setCurrentAction] = useState<string>("");
  const [speed, setSpeed] = useState<Speed>("normal");
  const [totalScanned, setTotalScanned] = useState(0);
  const [error, setError] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url?.includes("youtube.com/playlist")) {
        setIsPlaylistPage(true);
        // Check permissions immediately
        try {
          const res = await chrome.tabs.sendMessage(activeTab.id!, { action: "CHECK_PERMISSIONS" });
          if (res && !res.canEdit) {
            setError(res.reason || "You do not have permission to edit this playlist.");
            setStatus("error");
          }
        } catch (err) {
          // Content script might not be injected yet or other error, fallback to normal flow
          console.warn("[YT-DDP] Permission check failed:", err);
        }
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
      handleScan();
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
    setError("");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      setStatus("idle");
      return;
    }

    const listener = (msg: DeletionMessage) => {
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
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "EXECUTE_DELETE",
        items: selectedItems,
        options: { speed },
      });

      if (response && !response.ok) {
        chrome.runtime.onMessage.removeListener(listener);
        setError(response.error || "Failed to start deletion");
        setStatus("error");
      }
    } catch (err: any) {
      console.error("[YT-DDP] Delete failed:", err);
      chrome.runtime.onMessage.removeListener(listener);
      setError(err.message || "Failed to communicate with content script");
      setStatus("error");
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

  const toggleAll = useCallback(() => {
    if (status !== "ready") return;
    setDuplicates((prev) => {
      const allSelected = prev.every((d) => d.selected);
      return prev.map((d) => ({ ...d, selected: !allSelected }));
    });
  }, [status]);

  const handleReset = () => {
    setStatus("idle");
    setDuplicates([]);
    setDeletedCount(0);
    setCurrentAction("");
    setError("");
  };

  const selectedCount = useMemo(() => duplicates.filter((d) => d.selected).length, [duplicates]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        toggleAll();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") {
        e.preventDefault();
        if (status === "ready" && selectedCount > 0) {
          handleExecute();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, selectedCount, toggleAll]);

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
  const circumference = 2 * Math.PI * 24;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const springTransition = { type: "spring", bounce: 0.15, duration: 0.5 } as const;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10, filter: "blur(4px)" },
    show: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 300, damping: 24 } as const,
    },
  };

  return (
    <div className="flex flex-col h-[600px] w-[400px] bg-transparent p-3 box-border">
      <Card className="flex flex-col h-full ethereal-glass rounded-2xl overflow-hidden relative">
        <CardHeader className="flex flex-row items-center justify-between pb-4 pt-5 px-5 space-y-0 shrink-0 relative z-20">
          <div className="flex items-center space-x-3">
            <motion.div
              layoutId="header-icon"
              className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-[0_0_20px_rgba(var(--color-primary),0.3)] text-primary-foreground font-bold text-sm border border-white/20 backdrop-blur-md"
            >
              YT
            </motion.div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground mb-0.5">
                Playlist Dedupe
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)] animate-pulse-glow" />
                <p className="text-[11px] text-primary font-bold uppercase tracking-[0.1em] text-ethereal-glow">
                  Scanner Active
                </p>
              </div>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full hover:bg-white/5 transition-colors outline-none text-muted-foreground hover:text-foreground"
              disabled={status === "deleting"}
            >
              <Settings className="size-4" />
            </button>
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                  className="absolute right-0 top-full mt-2 w-32 ethereal-glass rounded-xl p-2 z-50 shadow-2xl origin-top-right"
                >
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    Speed
                  </div>
                  {["safe", "normal", "fast"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSpeed(s as Speed);
                        setShowSettings(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                        speed === s
                          ? "bg-primary/20 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardHeader>

        <Separator className="bg-border opacity-50 relative z-10" />

        <CardContent className="flex-1 overflow-hidden flex flex-col p-4 relative z-10">
          <AnimatePresence mode="wait">
            {status === "idle" && (
              <motion.div
                key="idle-state"
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={springTransition}
                className="flex flex-col items-center justify-center h-full space-y-8"
              >
                <div className="relative">
                  <div className="absolute -inset-10 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
                  <div
                    className="size-24 rounded-full bg-secondary/80 border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-inner relative"
                    style={{ transform: "translateZ(0)", willChange: "transform" }}
                  >
                    <MousePointer2 className="size-10 text-primary relative z-10 svg-ethereal-glow" />
                  </div>
                </div>
                <div className="text-center space-y-3 px-2">
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">
                    Ready to Analyze
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                    Builds an exact footprint of all unique videos and isolates duplicates.
                  </p>
                </div>
              </motion.div>
            )}

            {(status === "scrolling" || status === "scanning") && (
              <motion.div
                key="scanning-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full space-y-4"
              >
                <div className="flex items-center justify-between px-2">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] flex items-center gap-2">
                    <RefreshCw className="size-3 animate-spin" />
                    {currentAction}
                  </span>
                </div>
                <div className="flex-1 rounded-xl border border-white/5 bg-black/20 overflow-hidden flex flex-col p-3 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-14 w-full rounded-lg skeleton-wave border border-white/5 opacity-70"
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full space-y-6"
              >
                <div className="size-20 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(var(--color-destructive),0.2)]">
                  <AlertCircle className="size-10 text-destructive" />
                </div>
                <div className="text-center space-y-2 px-4">
                  <h2 className="text-xl font-bold text-foreground">Mission Aborted</h2>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </motion.div>
            )}

            {(status === "ready" || status === "deleting" || status === "done") && (
              <motion.div
                key="results-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col h-full space-y-4"
              >
                {duplicates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
                      <Sparkles className="size-16 text-primary relative z-10" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-foreground tracking-tight">
                        All Clean!
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        No duplicates found in this playlist.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 shrink-0">
                      <div className="p-3 rounded-xl ethereal-input flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-bold text-foreground mono-number">
                          {totalScanned}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em] mt-1">
                          Total
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-bold text-destructive mono-number">
                          {duplicates.length}
                        </span>
                        <span className="text-[10px] text-destructive/70 font-bold uppercase tracking-[0.1em] mt-1">
                          Duplicates
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-bold text-primary mono-number text-ethereal-glow">
                          {selectedCount}
                        </span>
                        <span className="text-[10px] text-primary/70 font-bold uppercase tracking-[0.1em] mt-1">
                          Selected
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 rounded-xl border border-white/5 overflow-hidden flex flex-col bg-black/30 relative shadow-inner">
                      <div className="p-2.5 border-b border-white/5 shrink-0 bg-white/[0.02] flex justify-between items-center z-10 backdrop-blur-md">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-2">
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
                          className="p-2 space-y-1.5"
                        >
                          {duplicates.map((dup) => (
                            <motion.div
                              variants={itemVariants}
                              layoutId={dup.id}
                              key={dup.id}
                              className={`flex items-center space-x-3 p-2.5 rounded-lg transition-all duration-300 border ${
                                dup.status === "processing"
                                  ? "bg-primary/10 border-primary/30 shadow-[inset_0_0_15px_rgba(var(--color-primary),0.15)]"
                                  : dup.status === "success"
                                    ? "bg-emerald-500/10 border-emerald-500/20"
                                    : dup.status === "failed"
                                      ? "bg-destructive/10 border-destructive/20"
                                      : "bg-white/[0.03] hover:bg-white/[0.06] border-transparent"
                              }`}
                            >
                              <div
                                className="relative flex items-center justify-center cursor-pointer"
                                onClick={() => {
                                  if (status !== "deleting" && status !== "done")
                                    toggleSelect(dup.id);
                                }}
                              >
                                <div
                                  className={`size-4.5 rounded border flex items-center justify-center transition-colors ${dup.selected ? "bg-primary border-primary" : "border-white/20 bg-black/40"}`}
                                >
                                  {dup.selected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    >
                                      <CheckCircle2
                                        className="size-3.5 text-primary-foreground"
                                        strokeWidth={3}
                                      />
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground truncate font-medium">
                                  {dup.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] bg-black/40 border-white/10 text-muted-foreground px-1.5 py-0 h-4 uppercase font-mono tracking-tighter"
                                  >
                                    #{dup.index} → #{dup.originalIndex}
                                  </Badge>
                                  {dup.status === "success" && (
                                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                                      Nuked
                                    </span>
                                  )}
                                  {dup.status === "failed" && (
                                    <span
                                      className="text-[9px] text-destructive font-bold uppercase tracking-wider"
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
                      <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none z-10" />
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        <CardFooter className="shrink-0 p-4 pt-0 space-y-3 flex-col z-20 relative">
          {status === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col gap-2"
            >
              <Button
                onClick={handleScrollAndScan}
                className="w-full h-12 text-[15px] font-bold shadow-[0_0_20px_rgba(var(--color-primary),0.3)] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all hover:scale-[1.02]"
              >
                <Play className="mr-2 fill-current size-4" /> Deep Auto Scan
              </Button>
              <Button
                onClick={handleScan}
                variant="outline"
                className="w-full h-11 text-sm font-semibold rounded-xl bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
              >
                Quick Scan (Visible Only)
              </Button>
            </motion.div>
          )}

          {status === "deleting" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full ethereal-glass rounded-xl p-4 border border-primary/20 flex items-center gap-4"
            >
              <div
                className="relative size-12 flex shrink-0 items-center justify-center"
                style={{ transform: "translateZ(0)" }}
              >
                <svg className="size-full transform -rotate-90" viewBox="0 0 52 52">
                  <circle
                    cx="26"
                    cy="26"
                    r="24"
                    className="stroke-white/10"
                    strokeWidth="4"
                    fill="none"
                  />
                  <motion.circle
                    cx="26"
                    cy="26"
                    r="24"
                    className="stroke-primary"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold mono-number text-foreground">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-[0.1em] truncate">
                  {currentAction}
                </span>
                <span className="text-sm font-bold text-foreground mono-number">
                  {deletedCount} <span className="text-muted-foreground">/</span> {selectedCount}
                </span>
              </div>
              <Button
                onClick={handleStop}
                variant="ghost"
                size="icon"
                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full size-8"
              >
                <Square className="size-4 fill-current" />
              </Button>
            </motion.div>
          )}

          {status === "ready" && duplicates.length > 0 && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Button
                onClick={handleExecute}
                disabled={selectedCount === 0}
                className="w-full h-12 text-[15px] font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_20px_rgba(var(--color-destructive),0.4)] rounded-xl group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center">
                  <Trash2 className="size-4 mr-2" />
                  Nuke {selectedCount} Duplicates
                </span>
                <div className="absolute right-4 text-[10px] opacity-50 font-mono tracking-tighter">
                  ⌘⌫
                </div>
              </Button>
              <div className="mt-3 text-center">
                <button
                  onClick={handleReset}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors outline-none cursor-pointer"
                >
                  Cancel and restart
                </button>
              </div>
            </div>
          )}

          {status === "ready" && duplicates.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full h-11 text-sm font-semibold rounded-xl bg-white/5 border-white/10 hover:bg-white/10"
              >
                Scan Another Playlist
              </Button>
            </motion.div>
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
                className="w-full h-11 text-xs font-semibold rounded-xl ethereal-input hover:bg-white/10 shadow-lg"
              >
                <RefreshCw className="size-3.5 mr-2" /> Scan Again
              </Button>
            </motion.div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
