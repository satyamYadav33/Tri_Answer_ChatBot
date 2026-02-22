import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap, BookOpen, Sparkles, User, Bot, Copy, Check, Loader2, RefreshCcw, LayoutTemplate, Sun, Moon, Mic, MicOff, Download, Trash2, Terminal, Command, Play, Menu, Plus, MessageSquare, ExternalLink, X, Brain, Network, Cpu } from 'lucide-react';

const apiKey = ""; // The execution environment provides the key at runtime

// Exponential backoff retry logic as per requirements
const fetchWithRetry = async (url, options, retries = 5, delay = 1000) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
};

// Generates a specific response style using the Gemini API
const generateStyleResponse = async (prompt, style) => {
  const systemPrompts = {
    concise: "You are a concise AI assistant. Provide a highly summarized, 1-3 sentence response. Use bullet points for key facts. Get straight to the point without pleasantries.",
    detailed: "You are a detailed, analytical AI assistant. Provide a comprehensive, well-structured explanation. Include step-by-step breakdowns, technical deep dives, pros/cons, and consider edge cases. Structure with clear headings.",
    creative: "You are a creative, out-of-the-box thinking AI assistant. Provide an innovative response. Use analogies, alternative perspectives, 'what if' scenarios, and unique ideas. If relevant, add a SaaS, entrepreneurial, or business twist.",
    agent: "You are a local computer agent similar to Claude. The user wants to perform a local task on their computer. Provide the exact shell commands (Bash/PowerShell) or a short script (Python/Node) to accomplish this. Be highly accurate. Explain briefly what the script does, then provide the code block."
  };

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemPrompts[style] }] }
  };

  try {
    const result = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
  } catch (error) {
    return `Error generating ${style} response. Please try again.`;
  }
};

// New CopyButton Component with a success state
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <button 
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 dark:text-zinc-400 hover:text-[#D97757] dark:hover:text-[#D97757] hover:bg-[#D97757]/10 dark:hover:bg-[#D97757]/10 rounded-md transition-all border border-stone-200 dark:border-zinc-700 shadow-sm bg-white dark:bg-[#252525]"
      title="Copy current response"
    >
      {copied ? (
        <>
          <Check size={16} className="text-[#D97757]" />
          <span className="text-[#D97757]">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={16} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
};

// Advanced Markdown Formatter for the UI
const FormattedText = ({ text }) => {
  if (!text) return null;
  
  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);
  
  return (
    <div className="whitespace-pre-wrap font-sans text-stone-800 dark:text-zinc-200 leading-relaxed space-y-1">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3);
          const firstLineBreak = content.indexOf('\n');
          const code = firstLineBreak > -1 ? content.slice(firstLineBreak + 1) : content;
          
          const handleSimulatedRun = (e) => {
            const btn = e.currentTarget;
            const originalText = btn.innerHTML;
            
            // Copy to clipboard
            const textArea = document.createElement("textarea");
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            btn.innerHTML = `<span class="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg><span class="text-emerald-500">Copied to run locally!</span></span>`;
            setTimeout(() => {
              btn.innerHTML = originalText;
            }, 3000);
          };

          return (
            <div key={index} className="my-4 rounded-lg overflow-hidden bg-[#252525] border border-zinc-700 shadow-sm group">
              <div className="flex items-center justify-between px-4 py-2 bg-[#1E1E1E] border-b border-zinc-700/50">
                <span className="text-xs font-mono text-zinc-400">Terminal / Script</span>
                <button 
                  onClick={handleSimulatedRun}
                  className="flex items-center gap-1.5 px-2 py-1 bg-[#D97757]/10 hover:bg-[#D97757]/20 text-[#D97757] rounded text-xs font-medium transition-colors border border-[#D97757]/20"
                  title="Web browsers cannot run local code. This copies it to your clipboard."
                >
                  <Play size={12} fill="currentColor" />
                  <span>Run Command</span>
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-sm font-mono text-zinc-50">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        
        // Process normal text line by line to handle headings and lists
        const lines = part.split('\n');
        return lines.map((line, lineIndex) => {
          let Element = 'p';
          let className = 'my-1.5 text-stone-800 dark:text-zinc-200';
          let formattedLine = line;
          const uniqueKey = `${index}-${lineIndex}`;

          // Parse headings and lists
          if (line.startsWith('# ')) {
            Element = 'h1';
            className = 'text-2xl font-semibold text-stone-900 dark:text-zinc-50 mt-6 mb-4 font-serif';
            formattedLine = line.replace(/^#\s+/, '');
          } else if (line.startsWith('## ')) {
            Element = 'h2';
            className = 'text-xl font-semibold text-stone-800 dark:text-zinc-100 mt-5 mb-3 border-b border-stone-200 dark:border-zinc-800 pb-2 font-serif';
            formattedLine = line.replace(/^##\s+/, '');
          } else if (line.startsWith('### ')) {
            Element = 'h3';
            className = 'text-lg font-medium text-stone-800 dark:text-zinc-200 mt-4 mb-2 font-serif';
            formattedLine = line.replace(/^###\s+/, '');
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            Element = 'div';
            className = 'ml-6 list-item list-disc marker:text-[#D97757]';
            formattedLine = line.replace(/^[-*]\s+/, '');
          } else if (line.match(/^\d+\.\s+/)) {
            Element = 'div';
            className = 'ml-6 list-item list-decimal marker:text-stone-500 font-medium';
            formattedLine = line.replace(/^\d+\.\s+/, '');
          }

          // Parse inline formatting (bold, italic, inline code)
          let htmlStr = formattedLine
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-stone-900 dark:text-zinc-100">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic text-stone-700 dark:text-zinc-300">$1</em>')
            .replace(/__(.*?)__/g, '<strong class="font-semibold text-stone-900 dark:text-zinc-100">$1</strong>')
            .replace(/_(.*?)_/g, '<em class="italic text-stone-700 dark:text-zinc-300">$1</em>')
            .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-zinc-800 text-[#D97757] font-mono text-[13px] border border-stone-200 dark:border-zinc-700">$1</code>');

          if (!line.trim()) return <div key={uniqueKey} className="h-2"></div>;

          return (
            <Element key={uniqueKey} className={className} dangerouslySetInnerHTML={{ __html: htmlStr }} />
          );
        });
      })}
    </div>
  );
};

// Main Application Component
export default function App() {
  const [theme, setTheme] = useState('dark');
  const [appMode, setAppMode] = useState('chat'); // 'chat' or 'agent'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const suggestedQueries = [
    "Explain the differences between RNNs and Transformers",
    "Design an architecture for an automated NLP pipeline",
    "How to handle vanishing gradients in deep neural networks"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Persistence: Load from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('trianswer_theme');
    if (savedTheme) setTheme(savedTheme);

    const savedMessages = localStorage.getItem('trianswer_messages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Persistence: Save to localStorage
  useEffect(() => {
    localStorage.setItem('trianswer_messages', JSON.stringify(messages));
    localStorage.setItem('trianswer_theme', theme);
  }, [messages, theme]);

  // Voice Input Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(prev => (prev + ' ' + finalTranscript).trim() + ' ');
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleExport = (text, style) => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TriAnswer_${style}_response.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear the conversation history?")) {
      setMessages([]);
      localStorage.removeItem('trianswer_messages');
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setAppMode('chat');
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleSend = async (queryText = input) => {
    if (!queryText.trim() || isTyping) return;

    const userMsg = { id: Date.now(), role: 'user', text: queryText, mode: appMode };
    const botMsgId = Date.now() + 1;
    
    // Inject bot message immediately with null (loading) responses
    const botMsg = {
      id: botMsgId,
      role: 'bot',
      mode: appMode,
      responses: appMode === 'chat' 
        ? { concise: null, detailed: null, creative: null }
        : { agent: null },
      activeTab: appMode === 'chat' ? 'concise' : 'agent'
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput('');
    setIsTyping(true);

    if (appMode === 'chat') {
      let completed = 0;
      const checkDone = () => {
        completed++;
        if (completed === 3) setIsTyping(false);
      };

      ['concise', 'detailed', 'creative'].forEach(async (style) => {
        try {
          const res = await generateStyleResponse(queryText, style);
          setMessages(prev => prev.map(msg =>
            msg.id === botMsgId ? { ...msg, responses: { ...msg.responses, [style]: res } } : msg
          ));
        } catch (error) {
          setMessages(prev => prev.map(msg =>
            msg.id === botMsgId ? { ...msg, responses: { ...msg.responses, [style]: `Error generating ${style} response.` } } : msg
          ));
        } finally {
          checkDone();
        }
      });
    } else {
      // Agent Mode Flow
      try {
        const res = await generateStyleResponse(queryText, 'agent');
        setMessages(prev => prev.map(msg =>
          msg.id === botMsgId ? { ...msg, responses: { agent: res } } : msg
        ));
      } catch (error) {
        setMessages(prev => prev.map(msg =>
          msg.id === botMsgId ? { ...msg, responses: { agent: "Error contacting agent server." } } : msg
        ));
      } finally {
        setIsTyping(false);
      }
    }
  };

  const switchTab = (messageId, tabName) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, activeTab: tabName } : msg
    ));
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans selection:bg-[#D97757]/30 transition-colors duration-300 animate-in fade-in duration-1000 ease-out ${theme === 'dark' ? 'dark bg-[#1E1E1E]' : 'bg-[#FAF9F6]'}`}>
      
      {/* Global Styles for Custom Claude-Themed Scrollbar */}
      <style>{`
        ::-webkit-scrollbar {
          width: 14px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #d6d3d1; /* stone-300 */
          border-radius: 10px;
          border: 4px solid ${theme === 'dark' ? '#1E1E1E' : '#FAF9F6'};
          background-clip: padding-box;
          transition: background-color 0.3s;
        }
        ::-webkit-scrollbar-thumb:hover {
          background-color: #D97757;
        }
        .dark ::-webkit-scrollbar-thumb {
          background-color: #3f3f46; /* zinc-700 */
        }
        .dark ::-webkit-scrollbar-thumb:hover {
          background-color: #D97757;
        }
      `}</style>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/30 dark:bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`flex-shrink-0 fixed md:static inset-y-0 left-0 z-30 flex flex-col bg-stone-50 dark:bg-[#181818] border-r border-stone-200 dark:border-zinc-800 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0'
        } overflow-hidden`}
      >
        <div className="w-64 h-full flex flex-col">
          <div className="flex items-center justify-between p-4 md:hidden">
             <span className="font-serif font-semibold text-stone-900 dark:text-zinc-100">Menu</span>
             <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-stone-500 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded-md transition-colors">
                <X size={20} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <button 
              onClick={handleNewChat}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-stone-700 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-stone-200 dark:border-zinc-700 bg-white dark:bg-[#252525] shadow-sm mb-4"
            >
              <Plus size={16} className="text-[#D97757]" />
              Start New Chat
            </button>

            <button 
              onClick={handleOpenNewTab}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-transparent"
            >
              <ExternalLink size={16} />
              Open in New Browser Tab
            </button>

            {/* Simulated Recent History for aesthetic completeness */}
            <div className="pt-6 mt-4 border-t border-stone-200 dark:border-zinc-800/60">
               <p className="px-3 text-[11px] font-bold text-stone-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Recent</p>
               {messages.length > 0 ? (
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-left group">
                     <MessageSquare size={16} className="flex-shrink-0 text-stone-400 group-hover:text-[#D97757] transition-colors" />
                     <span className="truncate">{messages.find(m => m.role === 'user')?.text || 'Current Session'}</span>
                  </button>
               ) : (
                  <div className="px-3 py-2 text-sm text-stone-500 dark:text-zinc-600 italic">No recent chats.</div>
               )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen transition-colors duration-300 bg-[#FAF9F6] dark:bg-[#1E1E1E]">
        {/* Header */}
        <header className="flex-none bg-[#FAF9F6] dark:bg-[#1E1E1E] border-b border-stone-200 dark:border-zinc-800 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 -ml-2 text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Toggle Sidebar"
            >
               <Menu size={22} />
            </button>

            <div className="flex items-center gap-3">
              <div className="bg-[#D97757] text-white p-2 rounded-xl shadow-sm hidden sm:block">
                {appMode === 'chat' ? <LayoutTemplate size={20} /> : <Terminal size={20} />}
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-stone-900 dark:text-zinc-50 tracking-tight font-serif">
                  {appMode === 'chat' ? 'TriAnswer' : 'Local Agent'}
                </h1>
                <p className="text-[10px] md:text-xs text-stone-500 dark:text-zinc-400 font-medium hidden sm:block">
                  {appMode === 'chat' ? 'AI & ML Research Assistant' : 'Local Automation Center'}
                </p>
              </div>
            </div>
            
            {/* Mode Toggle */}
            <div className="hidden md:flex ml-4 bg-stone-200/50 dark:bg-zinc-800/50 p-1 rounded-lg border border-stone-200 dark:border-zinc-700/50">
              <button
                onClick={() => setAppMode('chat')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${appMode === 'chat' ? 'bg-white dark:bg-[#252525] text-stone-900 dark:text-zinc-100 shadow-sm border border-stone-200 dark:border-zinc-700' : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-300'}`}
              >
                <LayoutTemplate size={16} />
                Multi-View
              </button>
              <button
                onClick={() => setAppMode('agent')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${appMode === 'agent' ? 'bg-white dark:bg-[#252525] text-stone-900 dark:text-zinc-100 shadow-sm border border-stone-200 dark:border-zinc-700' : 'text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-300'}`}
              >
                <Terminal size={16} />
                Local Agent
              </button>
            </div>
          </div>

          <div className="flex gap-1 md:gap-2 items-center">
             <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-stone-200 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300 border border-stone-300 dark:border-zinc-700">
               <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] animate-pulse"></span>
               {appMode === 'chat' ? 'Ready' : 'Agent Sandboxed'}
             </span>
             {messages.length > 0 && (
               <button
                 onClick={clearHistory}
                 className="p-1.5 md:ml-2 rounded-full text-stone-500 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors border border-transparent"
                 title="Clear History"
               >
                 <Trash2 size={18} />
               </button>
             )}
             <button 
               onClick={toggleTheme}
               className="p-1.5 md:ml-2 rounded-full text-stone-500 hover:bg-stone-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-stone-300 dark:hover:border-zinc-700"
               title="Toggle Theme"
             >
               {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
             </button>
          </div>
        </header>

        {/* Chat Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-[#D97757]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#D97757]/20">
                  {appMode === 'chat' ? <LayoutTemplate size={32} className="text-[#D97757]" /> : <Terminal size={32} className="text-[#D97757]" />}
                </div>
                <h2 className="text-3xl font-semibold text-stone-900 dark:text-zinc-50 mb-3 tracking-tight font-serif">
                  {appMode === 'chat' ? 'How can I help you?' : 'Command your computer.'}
                </h2>
                <p className="text-stone-600 dark:text-zinc-400 max-w-lg mb-8 text-lg">
                  {appMode === 'chat' 
                    ? <><span className="font-medium text-stone-800 dark:text-zinc-200">Concise</span>, <span className="font-medium text-stone-800 dark:text-zinc-200">Detailed</span>, and <span className="font-medium text-stone-800 dark:text-zinc-200">Creative</span> perspectives.</>
                    : "Enter a task. The agent will write the shell commands to execute it."}
                </p>
                
                <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-3">
                  {appMode === 'chat' ? (
                    suggestedQueries.map((q, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSend(q)}
                        className="p-4 rounded-xl text-sm font-medium text-left bg-white dark:bg-[#252525] border border-stone-200 dark:border-zinc-800 hover:border-[#D97757]/50 dark:hover:border-[#D97757]/50 hover:shadow-sm transition-all text-stone-800 dark:text-zinc-200 group"
                      >
                        <span className="text-[#D97757] mb-2 block group-hover:scale-110 transition-transform origin-left">
                          {i === 0 ? <Network size={18} /> : i === 1 ? <Cpu size={18} /> : <Brain size={18} />}
                        </span>
                        {q}
                      </button>
                    ))
                  ) : (
                    [
                      "Write a Python script to automate data preprocessing",
                      "Setup a Python virtual env with PyTorch & CUDA",
                      "Batch convert a folder of text files to JSON"
                    ].map((q, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSend(q)}
                        className="p-4 rounded-xl text-sm font-medium text-left bg-white dark:bg-[#252525] border border-stone-200 dark:border-zinc-800 hover:border-[#D97757]/50 dark:hover:border-[#D97757]/50 hover:shadow-sm transition-all text-stone-800 dark:text-zinc-200 group"
                      >
                        <span className="text-[#D97757] mb-2 block group-hover:scale-110 transition-transform origin-left">
                          <Command size={18} />
                        </span>
                        {q}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300`}>
                  
                  {msg.role === 'bot' && (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#D97757] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                      {msg.mode === 'agent' ? <Terminal size={18} className="text-[#FAF9F6] md:w-5 md:h-5" /> : <Bot size={18} className="text-[#FAF9F6] md:w-5 md:h-5" />}
                    </div>
                  )}

                  <div className={`max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'order-1' : 'order-2 w-full'}`}>
                    {msg.role === 'user' ? (
                      <div className="bg-white dark:bg-[#252525] border border-stone-200 dark:border-zinc-800 text-stone-800 dark:text-zinc-100 px-5 md:px-6 py-3.5 md:py-4 rounded-2xl shadow-sm text-sm md:text-[15px] font-medium leading-relaxed">
                        {msg.text}
                      </div>
                    ) : msg.error ? (
                      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-2xl text-sm">
                        {msg.error}
                      </div>
                    ) : (
                      <div className={`bg-white dark:bg-[#252525] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col ${msg.mode === 'agent' ? 'w-full' : ''}`}>
                        
                        {/* Header (Tabs for Chat, Title for Agent) */}
                        <div className="flex border-b border-stone-200 dark:border-zinc-800 bg-[#FAF9F6] dark:bg-[#1E1E1E] overflow-x-auto hide-scrollbar">
                          {msg.mode === 'chat' ? (
                            [
                              { id: 'concise', icon: Zap, label: 'Concise' },
                              { id: 'detailed', icon: BookOpen, label: 'Detailed' },
                              { id: 'creative', icon: Sparkles, label: 'Creative' }
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => switchTab(msg.id, tab.id)}
                                className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-3 md:py-3.5 text-xs md:text-sm font-medium transition-colors relative whitespace-nowrap
                                  ${msg.activeTab === tab.id 
                                    ? 'text-stone-900 dark:text-zinc-100' 
                                    : 'text-stone-500 hover:text-stone-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
                                  }`}
                              >
                                <tab.icon size={14} className={`md:w-4 md:h-4 ${msg.activeTab === tab.id ? 'text-[#D97757]' : 'opacity-70'}`} />
                                {tab.label}
                                {msg.activeTab === tab.id && (
                              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D97757]"></span>
                            )}
                          </button>
                        ))) : (
                          <div className="flex items-center gap-2 px-6 py-3.5 text-sm font-medium text-stone-900 dark:text-zinc-100 relative whitespace-nowrap">
                            <Terminal size={16} className="text-[#D97757]" />
                            Agent Shell Protocol
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D97757]"></span>
                          </div>
                        )}
                        
                        <div className="ml-auto px-2 md:px-4 flex items-center gap-1 md:gap-2 py-1.5 md:py-2">
                           <button
                             onClick={() => handleExport(msg.responses[msg.activeTab], msg.activeTab)}
                             disabled={!msg.responses[msg.activeTab]}
                             className="flex items-center gap-2 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium text-stone-600 dark:text-zinc-400 hover:text-[#D97757] dark:hover:text-[#D97757] hover:bg-[#D97757]/10 dark:hover:bg-[#D97757]/10 rounded-md transition-all border border-stone-200 dark:border-zinc-700 shadow-sm bg-white dark:bg-[#252525] disabled:opacity-50"
                             title="Export as Markdown"
                           >
                             <Download size={14} className="md:w-4 md:h-4" />
                             <span className="hidden sm:inline">Export</span>
                           </button>
                           {msg.responses[msg.activeTab] && <CopyButton text={msg.responses[msg.activeTab]} />}
                        </div>
                      </div>

                      {/* Content */}
                        <div className="p-4 md:p-6 text-sm md:text-base">
                          {msg.responses[msg.activeTab] === null ? (
                            <div className="animate-pulse flex flex-col gap-4 py-2">
                              <div className="flex items-center gap-3 mb-2">
                                <Loader2 size={18} className="animate-spin text-[#D97757]" />
                                <span className="text-sm font-medium text-stone-500 dark:text-zinc-400">
                                  {msg.mode === 'chat' ? `Synthesizing ${msg.activeTab} perspective...` : 'Generating system execution script...'}
                                </span>
                              </div>
                              <div className="h-4 bg-stone-200 dark:bg-zinc-800 rounded w-3/4"></div>
                              <div className="h-4 bg-stone-200 dark:bg-zinc-800 rounded w-full"></div>
                              <div className="h-4 bg-stone-200 dark:bg-zinc-800 rounded w-5/6"></div>
                              {msg.mode === 'agent' && (
                                <div className="h-24 bg-stone-300 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-lg w-full mt-4"></div>
                              )}
                            </div>
                          ) : (
                            <FormattedText text={msg.responses[msg.activeTab]} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-stone-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-stone-300 dark:border-zinc-700 order-2">
                      <User size={18} className="text-stone-600 dark:text-zinc-400 md:w-5 md:h-5" />
                    </div>
                  )}
                </div>
              ))
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <footer className="flex-none p-4 md:p-6 bg-[#FAF9F6]/90 dark:bg-[#1E1E1E]/90 backdrop-blur-sm border-t border-stone-200 dark:border-zinc-800">
          <div className="max-w-4xl mx-auto relative group">
            <div className="relative flex items-center bg-white dark:bg-[#252525] border border-stone-300 dark:border-zinc-700 focus-within:border-[#D97757] dark:focus-within:border-[#D97757] focus-within:ring-1 focus-within:ring-[#D97757]/30 rounded-xl shadow-sm overflow-hidden transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask anything (e.g., 'Explain backpropagation')..."
                className="flex-1 bg-transparent border-none py-3.5 md:py-4 pl-4 md:pl-6 pr-4 focus:outline-none text-stone-800 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-500 text-sm md:text-base"
                disabled={isTyping}
              />
              <div className="pr-2 md:pr-3 flex items-center gap-1 md:gap-2">
                 <button
                    onClick={toggleListening}
                    className={`p-2 md:p-2.5 rounded-lg transition-all ${
                      isListening 
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 animate-pulse' 
                        : 'text-stone-400 hover:text-stone-600 dark:hover:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
                    }`}
                    title={isListening ? "Stop dictating" : "Start dictating"}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                 <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="bg-[#D97757] hover:bg-[#c2684b] disabled:bg-stone-200 dark:disabled:bg-zinc-800 disabled:text-stone-400 dark:disabled:text-zinc-600 text-white p-2 md:p-2.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2 dark:focus:ring-offset-[#1E1E1E]"
                  >
                    <Send size={18} className={!input.trim() ? 'opacity-50' : 'translate-x-0.5 -translate-y-0.5'} />
                  </button>
              </div>
            </div>
            <div className="text-center mt-2.5 md:mt-3">
               <span className="text-[10px] md:text-[11px] text-stone-400 dark:text-zinc-500 font-medium tracking-wide uppercase">
                 Generates 3 simultaneous responses to save you time.
               </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
