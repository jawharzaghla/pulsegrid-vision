import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send, RefreshCw, Copy, Loader2, FileText, MessageSquare, Brain, Sun } from "lucide-react";
import { analyzeWithAI, buildAnalysisRequest, AIError } from "@/services/groq.service";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeModal } from "@/components/UpgradeModal";
import { TypewriterText } from "@/components/ui/TypewriterText";
import type { AnalysisMode, CleanedMetricPayload } from "@/types/models";
import ReactMarkdown from "react-markdown";

interface AIPanelProps {
  projectId: string;
  widgetPayloads: CleanedMetricPayload[];
  onClose: () => void;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

const tabs: { mode: AnalysisMode; label: string; icon: React.ReactNode }[] = [
  { mode: "project-brief", label: "Project Brief", icon: <FileText size={14} /> },
  { mode: "widget", label: "Widget Analysis", icon: <Brain size={14} /> },
  { mode: "ask", label: "Ask a Question", icon: <MessageSquare size={14} /> },
  { mode: "daily-brief", label: "Daily Brief", icon: <Sun size={14} /> },
];

const AIPanel = ({ projectId, widgetPayloads, onClose }: AIPanelProps) => {
  const { tier } = useAuth();
  const [activeTab, setActiveTab] = useState<AnalysisMode>("project-brief");
  const [analysisContent, setAnalysisContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    // Auto-generate project brief on initial open
    if (!analysisContent["project-brief"] && !loading["project-brief"]) {
      handleAnalyze("project-brief");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = async (mode: AnalysisMode) => {
    setLoading((prev) => ({ ...prev, [mode]: true }));
    setError(null);
    try {
      const request = buildAnalysisRequest(projectId, mode, widgetPayloads);
      const response = await analyzeWithAI(request);
      setAnalysisContent((prev) => ({ ...prev, [mode]: response.content }));
    } catch (err) {
      if (err instanceof AIError && err.code === 'RATE_LIMITED') {
        setError(err.message);
        setShowUpgradeModal(true);
      } else if (err instanceof AIError) {
        setError(err.message);
      } else {
        setError('AI service is currently unavailable. Please check your backend proxy and try again.');
      }
    } finally {
      setLoading((prev) => ({ ...prev, [mode]: false }));
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setChatMessages((prev) => [...prev, { role: "user", content: q }]);

    try {
      const request = buildAnalysisRequest(projectId, "ask", widgetPayloads, q);
      const response = await analyzeWithAI(request);
      setChatMessages((prev) => [...prev, { role: "ai", content: response.content }]);
    } catch (err) {
      const message = err instanceof AIError
        ? err.message
        : 'AI service is currently unavailable. Please check your backend proxy and try again.';
      setChatMessages((prev) => [...prev, { role: 'ai', content: message }]);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const currentContent = analysisContent[activeTab];
  const isLoading = loading[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            <h2 className="text-lg font-bold">AI Analysis</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.mode}
              onClick={() => setActiveTab(tab.mode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.mode
                ? "bg-accent/10 text-accent border border-accent/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 px-4 py-3 bg-warning/10 border border-warning/30 rounded-lg text-xs text-warning">
            {error}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "ask" ? (
            /* Chat interface */
            <div className="space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare size={32} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Ask anything about your data.</p>
                  <p className="text-xs text-muted-foreground mt-1">e.g., "Why did revenue drop this month?"</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted/50 text-foreground rounded-bl-md border border-border"
                    }`}>
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <TypewriterText
                        text={msg.content}
                        speed={25}
                        delay={0}
                      />
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          ) : (
            /* Analysis content */
            <div>
              {!currentContent && !isLoading && (
                <div className="text-center py-12">
                  <Brain size={32} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Generate an AI analysis of your data.</p>
                  <button
                    onClick={() => handleAnalyze(activeTab)}
                    className="px-4 py-2 bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent rounded-lg text-sm font-medium transition-all flex items-center gap-2 mx-auto"
                  >
                    <Sparkles size={14} /> Generate {tabs.find((t) => t.mode === activeTab)?.label}
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="text-accent animate-spin" />
                  <p className="text-sm text-muted-foreground ml-3">Analyzing your data...</p>
                </div>
              )}

              {currentContent && !isLoading && (
                <div>
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4 prose-ul:space-y-3 prose-li:my-1 prose-strong:text-foreground prose-strong:font-semibold tracking-wide">
                    <ReactMarkdown>{currentContent}</ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
                    <button
                      onClick={() => handleAnalyze(activeTab)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw size={12} /> Regenerate
                    </button>
                    <button
                      onClick={() => handleCopy(currentContent)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat input (only for Ask tab) */}
        {activeTab === "ask" && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                placeholder="Ask about your data..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                className="flex-1 px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim()}
                className="w-10 h-10 bg-accent text-accent-foreground rounded-lg flex items-center justify-center transition-all hover:bg-accent/90 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Quota IA Atteint"
        description="Vous avez atteint votre limite d'analyses IA pour aujourd'hui. Passez à un plan supérieur pour des analyses illimitées."
      />
    </div>
  );
};

export default AIPanel;
