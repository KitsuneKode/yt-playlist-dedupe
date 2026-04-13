import { useEffect, useState, useRef } from "react";
import { Play, Trash2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type ScanStatus = "idle" | "scanning" | "ready" | "deleting" | "done";

interface DuplicateItem {
  id: string;
  title: string;
  index: number;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [isPlaylistPage, setIsPlaylistPage] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [deletedCount, setDeletedCount] = useState(0);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab.url?.includes("youtube.com/playlist")) {
        setIsPlaylistPage(true);
      }
    });
  }, []);

  useGSAP(
    () => {
      // Animate elements based on status changes
      if (status === "idle") {
        gsap.fromTo(
          ".idle-view",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.2, ease: "power3.out" },
        );
      } else if (status === "scanning") {
        gsap.fromTo(
          ".scanning-view",
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.2, ease: "power3.out" },
        );
      } else if (status === "ready" || status === "deleting" || status === "done") {
        gsap.fromTo(
          ".results-view",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" },
        );

        if (duplicates.length > 0 && status === "ready") {
          gsap.fromTo(
            ".duplicate-item",
            { opacity: 0, x: -8 },
            { opacity: 1, x: 0, duration: 0.3, stagger: 0.02, ease: "power3.out" },
          );
        }

        if (status === "done") {
          gsap.fromTo(
            ".done-view",
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" },
          );
        }
      }
    },
    { dependencies: [status, duplicates.length], scope: containerRef },
  );

  const handleScan = async () => {
    setStatus("scanning");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: "SCAN_DOM" });
      setDuplicates(response.duplicates || []);
      setStatus("ready");
    } catch {
      setStatus("idle");
    }
  };

  const handleExecute = async () => {
    setStatus("deleting");
    setDeletedCount(0);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    try {
      chrome.runtime.onMessage.addListener(function listener(msg) {
        if (msg.action === "DELETE_PROGRESS") {
          setDeletedCount(msg.count);
        } else if (msg.action === "DELETE_COMPLETE") {
          setStatus("done");
          chrome.runtime.onMessage.removeListener(listener);
        }
      });

      await chrome.tabs.sendMessage(tab.id, { action: "EXECUTE_DELETE", items: duplicates });
    } catch {
      setStatus("idle");
    }
  };

  if (!isPlaylistPage) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 bg-background">
        <AlertCircle className="size-12 text-destructive opacity-80" />
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Not a Playlist</h2>
        <p className="text-sm text-muted-foreground">
          Navigate to a YouTube Playlist to begin scanning for duplicates.
        </p>
      </div>
    );
  }

  const progressPercentage = duplicates.length > 0 ? (deletedCount / duplicates.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-background p-4" ref={containerRef}>
      <Card className="flex flex-col h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-destructive to-rose-600 flex items-center justify-center shadow-lg shadow-destructive/20 text-white font-bold">
              YT
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-card-foreground">
                YT Dedupe
              </CardTitle>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                DOM Extractor
              </p>
            </div>
          </div>
          {status === "ready" && (
            <Badge variant="secondary" className="font-mono text-[10px]">
              v1.0.0
            </Badge>
          )}
        </CardHeader>

        <Separator className="bg-border/50" />

        <CardContent className="flex-1 overflow-hidden flex flex-col p-4 relative">
          {status === "idle" && (
            <div className="idle-view flex flex-col items-center justify-center h-full space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-medium text-foreground">Ready to Scan</h2>
                <p className="text-sm text-muted-foreground max-w-[250px] mx-auto leading-relaxed">
                  Scroll to the bottom of the playlist to ensure all videos are loaded in the DOM.
                </p>
              </div>
              <Button onClick={handleScan} size="lg" className="rounded-full px-8 h-12">
                <Play className="fill-current" data-icon="inline-start" />
                Scan Playlist
              </Button>
            </div>
          )}

          {status === "scanning" && (
            <div className="scanning-view flex flex-col items-center justify-center h-full space-y-4">
              <RefreshCw className="size-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Scanning DOM Elements...</p>
            </div>
          )}

          {(status === "ready" || status === "deleting" || status === "done") && (
            <div className="results-view flex flex-col h-full space-y-4">
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-emerald-500 tracking-tighter tabular-nums leading-none">
                    {duplicates.length > 0 ? "✓" : "0"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1.5">
                    Kept
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-destructive tracking-tighter tabular-nums leading-none">
                    {duplicates.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1.5">
                    Duplicates
                  </span>
                </div>
              </div>

              {duplicates.length > 0 ? (
                <div className="flex-1 rounded-xl border border-border/50 overflow-hidden flex flex-col bg-background/50">
                  <div className="p-2 border-b border-border/50 shrink-0 bg-muted/20">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">
                      Identified Targets
                    </h3>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {duplicates.map((dup, i) => (
                        <div
                          key={dup.id + i}
                          className="duplicate-item flex items-center space-x-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group opacity-0"
                        >
                          <div className="size-1.5 rounded-full bg-destructive shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-200" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate font-medium leading-tight">
                              {dup.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Position #{dup.index}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-muted/10 rounded-xl border border-border/50 border-dashed">
                  <p className="text-sm text-muted-foreground text-center px-6 leading-relaxed">
                    No duplicates found. <br />
                    Ensure you scrolled to the bottom.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {duplicates.length > 0 &&
          (status === "ready" || status === "deleting" || status === "done") && (
            <div className="results-view shrink-0">
              <CardFooter className="pt-0 pb-4 px-4 flex flex-col gap-3">
                {status === "deleting" && (
                  <div className="w-full space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      <span>Nuking duplicates...</span>
                      <span className="tabular-nums">
                        {deletedCount} / {duplicates.length}
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-1.5" />
                  </div>
                )}

                {status === "done" ? (
                  <div className="done-view w-full flex items-center justify-center p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 opacity-0">
                    <CheckCircle2 className="size-5 mr-2" />
                    <span className="font-semibold text-sm tracking-tight">Successfully Nuked</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleExecute}
                    disabled={status === "deleting"}
                    variant="default"
                    size="lg"
                    className="w-full h-12 text-base font-bold bg-destructive text-white hover:bg-destructive/90"
                  >
                    {status === "deleting" ? (
                      <>
                        <RefreshCw className="animate-spin" data-icon="inline-start" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Trash2 data-icon="inline-start" />
                        Nuke Duplicates
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </div>
          )}
      </Card>
    </div>
  );
}
