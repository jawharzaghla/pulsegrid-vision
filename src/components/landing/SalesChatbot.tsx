import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Minus, Sparkles, HelpCircle, Briefcase, Zap } from "lucide-react";
import { callSalesChatbot } from "@/services/groq.service";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const PRESET_QUESTIONS = [
    { text: "How does it work?", icon: <Zap size={14} /> },
    { text: "Pricing for scale?", icon: <Briefcase size={14} /> },
    { text: "Live demo?", icon: <HelpCircle size={14} /> },
];

const SalesChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hi! I'm PulseGrid's AI Assistant. How can I help you scaling your business today?" },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (text: string) => {
        if (!text.trim() || loading) return;

        const newMsgs: Message[] = [...messages, { role: "user", content: text }];
        setMessages(newMsgs);
        setInput("");
        setLoading(true);

        try {
            const resp = await callSalesChatbot(text, messages.slice(-5).map(m => ({
                role: m.role,
                content: m.content
            })));
            setMessages([...newMsgs, { role: "assistant", content: resp.content }]);
        } catch (err) {
            console.error("Sales Chat error:", err);
            setMessages([...newMsgs, { role: "assistant", content: "Sorry, I'm having a bit of trouble connecting. Try again in a second?" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="p-4 bg-primary/10 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-bold leading-none">PulseGrid Sales AI</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Online • Ready to help</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded-md transition-colors">
                                <Minus size={16} className="text-muted-foreground" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-muted text-foreground rounded-tl-none"
                                    }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-muted p-3 rounded-2xl rounded-tl-none flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Preset Questions */}
                    {messages.length === 1 && !loading && (
                        <div className="px-4 py-2 flex flex-wrap gap-2">
                            {PRESET_QUESTIONS.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(q.text)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-primary/10 border border-border rounded-full text-xs transition-all hover:border-primary/30"
                                >
                                    {q.icon}
                                    {q.text}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Footer Input */}
                    <div className="p-4 border-t border-border">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                            className="flex items-center gap-2"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask us anything..."
                                className="flex-1 bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                        <p className="text-[10px] text-center text-muted-foreground mt-3">
                            Powered by PulseGrid Vision AI
                        </p>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? "bg-background text-foreground border border-border" : "bg-primary text-primary-foreground pulse-glow"
                    }`}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>
        </div>
    );
};

export default SalesChatbot;
