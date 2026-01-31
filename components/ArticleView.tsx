import React, { useState, useEffect, useRef } from 'react';
import { ArticleData, FontType, FontSize, PageWidth, HighlightOptions } from '../types';
import { addCommentToDb, getCommentsFromDb } from '../services/firebase';
import { fetchAudioForChunk, splitTextIntoChunks, askAiAboutArticle } from '../services/parserService';

interface ArticleViewProps {
  data: ArticleData;
  loading: boolean;
  onSave?: (article: ArticleData) => void;
  isSaved?: boolean;
  isDarkMode?: boolean;
  font: FontType;
  fontSize?: FontSize;
  pageWidth?: PageWidth;
  onTitleChange?: (newTitle: string) => void;
  globalAiQuery?: string;
  onGlobalAiQueryHandled?: () => void;
  triggerAiPanel?: number;
  highlightOptions?: HighlightOptions;
  t: (key: string) => string;
  onNavigateLibrary?: () => void;
  onNavigateHome?: () => void;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
}

interface Term {
  text: string;
  def: string;
  element?: HTMLElement;
}

interface ActiveTermState {
  text: string;
  def: string;
  x: number;
  y: number;
  position: 'top' | 'bottom';
}

interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
}

const ArticleView: React.FC<ArticleViewProps> = ({ 
    data, 
    loading, 
    onSave, 
    isSaved, 
    isDarkMode = false, 
    font, 
    fontSize = 'standard',
    pageWidth = 'standard',
    onTitleChange,
    globalAiQuery,
    onGlobalAiQueryHandled,
    triggerAiPanel,
    highlightOptions,
    t,
    onNavigateLibrary,
    onNavigateHome
}) => {
  const [chunks, setChunks] = useState<string[]>([]);
  const [visibleChunks, setVisibleChunks] = useState(1);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const commentsRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Interactive Terms State
  const [activeTerm, setActiveTerm] = useState<ActiveTermState | null>(null);
  const [allTerms, setAllTerms] = useState<Term[]>([]);
  const [showGlossary, setShowGlossary] = useState(false);
  
  // Table of Contents State
  const [toc, setToc] = useState<{id: string, text: string}[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(true);

  // Media Zoom State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Share/More Menu State
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showHighlights, setShowHighlights] = useState(true);
  const [isCleanMode, setIsCleanMode] = useState(false);

  // AI Assistant State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiChat, setAiChat] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedFaqs, setExpandedFaqs] = useState<Record<number, boolean>>({});
  const aiChatContainerRef = useRef<HTMLDivElement>(null);

  // Audio State
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [playbackProgress, setPlaybackProgress] = useState(0); 
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Audio Queue State
  const chunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef(0);

  // Handle Global AI Query (from Navbar)
  useEffect(() => {
    if (globalAiQuery && globalAiQuery.trim()) {
        setShowAiPanel(true);
        handleAiAsk(globalAiQuery);
        if (onGlobalAiQueryHandled) onGlobalAiQueryHandled();
    }
  }, [globalAiQuery]);

  // Handle Trigger from Navbar star icon using Ref to avoid auto-open on remount
  const lastTriggerRef = useRef(triggerAiPanel);
  useEffect(() => {
    if (triggerAiPanel !== undefined && triggerAiPanel !== lastTriggerRef.current) {
        setShowAiPanel(true);
        lastTriggerRef.current = triggerAiPanel;
    }
  }, [triggerAiPanel]);

  // Handle navigation clicks inside AI chat
  useEffect(() => {
      const handleAiLinkClick = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const actionBtn = target.closest('[data-action]');
          if (actionBtn) {
              const action = actionBtn.getAttribute('data-action');
              if (action === 'library' && onNavigateLibrary) {
                  onNavigateLibrary();
                  setShowAiPanel(false);
              } else if (action === 'home' && onNavigateHome) {
                  onNavigateHome();
                  setShowAiPanel(false);
              }
          }
      };

      const container = aiChatContainerRef.current;
      if (container) {
          container.addEventListener('click', handleAiLinkClick);
      }
      return () => {
          if (container) container.removeEventListener('click', handleAiLinkClick);
      };
  }, [showAiPanel, aiChat, onNavigateLibrary, onNavigateHome]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowHighlights(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Effect to apply custom highlights client-side for robust coloring
  useEffect(() => {
    if (!articleRef.current || !showHighlights || isCleanMode) return;
    const marks = articleRef.current.querySelectorAll('mark');
    marks.forEach(mark => {
        mark.style.backgroundColor = highlightOptions?.color || '#cffafe';
    });
  }, [showHighlights, contentToRender, highlightOptions?.color, isCleanMode]); 

  // Toggle Highlights visibility
  useEffect(() => {
     if (articleRef.current) {
         const marks = articleRef.current.querySelectorAll('mark');
         marks.forEach(mark => {
             mark.style.backgroundColor = (showHighlights && !isCleanMode) ? (highlightOptions?.color || '#cffafe') : 'transparent';
         });
     }
  }, [showHighlights, highlightOptions?.color, isCleanMode]);

  // Parse TOC when content changes
  useEffect(() => {
    if (data.content) {
       const doc = new DOMParser().parseFromString(data.content, 'text/html');
       const headers = Array.from(doc.querySelectorAll('h2'));
       const tocItems = headers.map(h => ({ 
           id: h.id, 
           text: h.textContent || 'Section' 
       })).filter(item => item.id); // Only include headers with IDs
       setToc(tocItems);
    } else {
        setToc([]);
    }
  }, [data.content]);

  useEffect(() => {
    const loadComments = async () => {
        if (data.id && data.id !== 'error') {
            const savedLocal = localStorage.getItem(`comments-${data.id}`);
            if (savedLocal) setComments(JSON.parse(savedLocal));

            const dbComments = await getCommentsFromDb(data.id);
            if (dbComments.length > 0) {
                setComments(dbComments);
            }
        } else {
            setComments([]);
        }
    };
    loadComments();
    
    const baseUrl = window.location.href.split('?')[0];
    const friendId = Math.random().toString(36).substring(7);
    setShareLink(`${baseUrl}?source=friends_link&sk=${friendId}&article=${data.id || 'draft'}`);

    stopAudio();
    setActiveTerm(null);
    setShowGlossary(false);
    setShowAiPanel(false);
    setAiChat([]);
    setIsCleanMode(false);

  }, [data.id]);

  useEffect(() => {
    if (titleTextareaRef.current) {
        titleTextareaRef.current.style.height = 'auto';
        titleTextareaRef.current.style.height = titleTextareaRef.current.scrollHeight + 'px';
    }
  }, [data.title]);

  useEffect(() => {
    if (data.content) {
      const totalLength = data.content.length;
      const minChunkSize = 600;
      const maxChunkSize = 1500;
      
      let calculatedChunkSize = Math.floor(totalLength / 3);
      let finalChunkSize = Math.min(maxChunkSize, Math.max(minChunkSize, calculatedChunkSize));
      
      if (totalLength < minChunkSize) finalChunkSize = totalLength;

      // Ensure colors are preserved or set default if missing
      const processedContent = data.content.replace(
          /<mark style="background-color: ([^;]+);/g, 
          '<mark data-bg="$1" style="background-color: $1;'
      );

      const rawChunks = processedContent.split(/(?<=<\/(?:p|div|section|blockquote|h1|h2|h3|h4|details|table|figure)>)/i);
      
      const organizedChunks: string[] = [];
      let currentChunk = "";
      
      rawChunks.forEach(part => {
        currentChunk += part;
        if (currentChunk.length >= finalChunkSize) {
           organizedChunks.push(currentChunk);
           currentChunk = "";
        }
      });
      if (currentChunk) organizedChunks.push(currentChunk);
      
      setChunks(organizedChunks);
      setVisibleChunks(1);
    }
  }, [data.content]);

  useEffect(() => {
     // Re-apply highlight colors when chunks change or visibility changes
     if (articleRef.current) {
         const marks = articleRef.current.querySelectorAll('mark');
         marks.forEach(mark => {
             if (!mark.getAttribute('data-bg')) {
                 const styleBg = mark.style.backgroundColor;
                 if (styleBg) mark.setAttribute('data-bg', styleBg);
             }
             // Force override from settings if user changed color
             if (highlightOptions?.color) {
                 mark.style.backgroundColor = (showHighlights && !isCleanMode) ? highlightOptions.color : 'transparent';
             }
         });
     }
  }, [chunks, visibleChunks, highlightOptions?.color, isCleanMode]);

  var contentToRender = chunks.slice(0, visibleChunks).join('');
  const hasMore = visibleChunks < chunks.length;

  // --- CLEAN MODE LOGIC ---
  if (isCleanMode) {
      // Remove marks but keep content
      contentToRender = contentToRender.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
      // Remove explain-term spans but keep content
      contentToRender = contentToRender.replace(/<span class="explain-term"[^>]*>(.*?)<\/span>/gi, '$1');
  }

  useEffect(() => {
    const container = articleRef.current;
    if (!container) return;

    if (!isCleanMode) {
        const termElements = container.querySelectorAll('.explain-term');
        const termsData: Term[] = [];
        termElements.forEach((el) => {
            const text = el.textContent || '';
            const def = el.getAttribute('data-def') || '';
            if (text && def) {
                termsData.push({ text, def, element: el as HTMLElement });
            }
        });
        setAllTerms(termsData);
    }

    const images = container.querySelectorAll('img');
    images.forEach(img => {
        img.style.cursor = 'zoom-in';
        img.onclick = (e) => {
            e.stopPropagation();
            setZoomedImage(img.src);
        };
        
        img.onerror = () => {
             const currentSrc = img.src;
             if (!currentSrc.includes('corsproxy.io') && !currentSrc.startsWith('data:')) {
                 img.src = `https://corsproxy.io/?${encodeURIComponent(currentSrc)}`;
             } else {
                 img.style.display = 'none'; 
             }
        };
        img.loading = "lazy";
    });

    const iframes = container.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        let src = iframe.getAttribute('src') || '';
        if (src.includes('youtube.com/watch?v=')) {
            const videoId = src.split('v=')[1]?.split('&')[0];
            if (videoId) src = `https://www.youtube.com/embed/${videoId}`;
        } else if (src.includes('youtu.be/')) {
            const videoId = src.split('youtu.be/')[1]?.split('?')[0];
            if (videoId) src = `https://www.youtube.com/embed/${videoId}`;
        }
        if (src.includes('youtube.com/embed/') || src.includes('player.vimeo.com')) {
            iframe.src = src;
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
            iframe.setAttribute('allowfullscreen', 'true');
        }
    });

    const handleTermClick = (e: Event) => {
        if (isCleanMode) return;
        const target = e.target as HTMLElement;
        const termEl = target.closest('.explain-term') as HTMLElement;
        
        if (termEl) {
            e.preventDefault();
            e.stopPropagation();
            const rect = termEl.getBoundingClientRect();
            const definition = termEl.getAttribute('data-def') || 'No definition found.';
            const text = termEl.innerText;

            const tooltipHeight = 120;
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;
            
            let position: 'top' | 'bottom' = 'top';
            if (spaceAbove < tooltipHeight && spaceBelow > spaceAbove) {
                position = 'bottom';
            }

            setActiveTerm({
                x: rect.left + (rect.width / 2),
                y: position === 'top' ? rect.top : rect.bottom,
                text: text,
                def: definition,
                position: position
            });
        } else {
            setActiveTerm(null);
        }
    };

    container.addEventListener('click', handleTermClick);
    return () => container.removeEventListener('click', handleTermClick);

  }, [contentToRender, isCleanMode]);
  
  useEffect(() => {
    const handleScroll = () => {
        if (activeTerm) setActiveTerm(null);
    };
    const handleClickOutside = () => {
        if (activeTerm) setActiveTerm(null);
    }
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('click', handleClickOutside);
    return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('click', handleClickOutside);
    };
  }, [activeTerm]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    const commentObj = {
        author: 'You',
        text: newComment,
        date: new Date().toLocaleDateString()
    };
    const tempComment = { id: Date.now().toString(), ...commentObj };
    const updatedComments = [...comments, tempComment];
    setComments(updatedComments);
    setNewComment('');
    localStorage.setItem(`comments-${data.id}`, JSON.stringify(updatedComments));
    if (data.id && data.id !== 'error') {
        await addCommentToDb(data.id, commentObj);
    }
  };

  const handleDownloadHtml = () => {
    // Generate clean content for download if Clean Mode is active, or standard otherwise
    let downloadContent = data.content;
    if (isCleanMode) {
        downloadContent = downloadContent.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
        downloadContent = downloadContent.replace(/<span class="explain-term"[^>]*>(.*?)<\/span>/gi, '$1');
    }

    const element = document.createElement("a");
    const file = new Blob([`
      <html>
        <head>
          <title>${data.title}</title>
          <style>
             body { font-family: 'Georgia', serif; max-width: 680px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #242424; }
             img, iframe, video { width: 100%; height: auto; margin: 20px 0; border-radius: 4px; }
             h1 { font-size: 42px; line-height: 1.2; margin-bottom: 20px; font-family: Helvetica, Arial, sans-serif; }
             ${!isCleanMode ? 'mark { background-color: #cffafe; }' : ''}
             details { margin-bottom: 10px; border-bottom: 1px solid #eee; padding: 10px 0; }
             summary { cursor: pointer; font-weight: bold; font-family: Helvetica, Arial, sans-serif; }
             figure { margin: 30px 0; width: 100%; }
             figcaption { font-style: italic; color: #757575; font-size: 0.9em; text-align: center; margin-top: 10px; }
             ${!isCleanMode ? '.explain-term { text-decoration: underline; text-decoration-style: dotted; cursor: help; }' : ''}
          </style>
        </head>
        <body>
          <h1>${data.title}</h1>
          ${downloadContent}
          ${data.citation ? `<div style="margin-top: 40px; padding: 20px; border-left: 4px solid #eee; background: #f9f9f9;"><b>Source Citation:</b><br/>${data.citation}</div>` : ''}
          <div style="margin-top: 50px; font-size: 12px; color: #888;">Generated by MediumClone</div>
        </body>
      </html>
    `], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(shareLink).then(() => {
          alert("Link copied to clipboard!");
          setIsShareOpen(false);
      });
  };

  const shareToSocial = (platform: string) => {
      let url = "";
      const text = encodeURIComponent(`Check out this article: ${data.title}`);
      const link = encodeURIComponent(shareLink);

      switch(platform) {
          case 'twitter': url = `https://twitter.com/intent/tweet?text=${text}&url=${link}`; break;
          case 'facebook': url = `https://www.facebook.com/sharer/sharer.php?u=${link}`; break;
          case 'linkedin': url = `https://www.linkedin.com/shareArticle?mini=true&url=${link}&title=${encodeURIComponent(data.title)}`; break;
          case 'bluesky': url = `https://bsky.app/intent/compose?text=${text}%20${link}`; break;
          case 'threads': url = `https://threads.net/intent/post?text=${text}%20${link}`; break;
      }
      if (url) window.open(url, '_blank', 'width=600,height=400');
      setIsShareOpen(false);
  };

  const handleAiAsk = async (manualQuestion?: string) => {
      const questionToAsk = manualQuestion || aiInput;
      if (!questionToAsk.trim()) return;
      
      const userMsg: ChatMessage = { role: 'user', content: questionToAsk };
      setAiChat(prev => [...prev, userMsg]);
      setAiInput('');
      setAiLoading(true);

      const answer = await askAiAboutArticle(data.content || "", userMsg.content, 'chat');
      
      const aiMsg: ChatMessage = { role: 'ai', content: answer };
      setAiChat(prev => [...prev, aiMsg]);
      setAiLoading(false);
  };

  const handleAiSummary = async () => {
      if (!data.content) return;
      setShowAiPanel(true);
      setAiLoading(true);
      const summary = await askAiAboutArticle(data.content, "", 'summary');
      setAiChat(prev => [...prev, { role: 'ai', content: `Here is a quick summary:\n\n${summary}` }]);
      setAiLoading(false);
  };

  const handleTocClick = (id: string) => {
      // 1. Reveal all chunks to ensure the target ID exists in the DOM
      if (hasMore) {
          setVisibleChunks(chunks.length);
      }
      
      // 2. Wait for render cycle then scroll
      setTimeout(() => {
          const el = document.getElementById(id);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      }, 100);
  };

  const handleGlossaryDeepDive = (term: string) => {
      setShowGlossary(false);
      setShowAiPanel(true);
      handleAiAsk(`Could you explain the term "${term}" in more detail within the context of this article?`);
  };

  const playNextChunk = async () => {
      const index = currentChunkIndexRef.current;
      const chunksToPlay = chunksRef.current;
      if (index >= chunksToPlay.length) {
          stopAudio();
          return;
      }
      setAudioState('loading');
      setPlaybackProgress(0);
      try {
          const audio = await fetchAudioForChunk(chunksToPlay[index]);
          audioRef.current = audio;
          audio.ontimeupdate = () => {
              if (audio.duration) {
                  const progress = (audio.currentTime / audio.duration) * 100;
                  setPlaybackProgress(progress);
                  setCurrentTime(audio.currentTime);
                  setDuration(audio.duration);
              }
          };
          audio.onended = () => {
              currentChunkIndexRef.current++;
              playNextChunk();
          };
          audio.onpause = () => {
             if (!audio.ended) setAudioState('paused');
          };
          audio.onplay = () => {
             setAudioState('playing');
          };
          audio.onerror = (e) => {
              console.error("Chunk Playback Error", e);
              stopAudio();
              alert("Error playing audio chunk. Please check connection.");
          }
          await audio.play();
      } catch (e) {
          console.error("Audio generation failed", e);
          stopAudio();
          alert("Could not generate audio for this section.");
      }
  };

  const handleAudioToggle = async () => {
    if (audioState === 'paused' && audioRef.current) {
        audioRef.current.play();
        return;
    }
    if (audioState === 'idle') {
        const tmpDiv = document.createElement("div");
        tmpDiv.innerHTML = data.content;
        const plainText = tmpDiv.textContent || "";
        const textChunks = splitTextIntoChunks(plainText, 4000);
        chunksRef.current = textChunks;
        currentChunkIndexRef.current = 0;
        if (textChunks.length > 0) {
            playNextChunk();
        } else {
            alert("No text found to read.");
        }
    }
  };

  const pauseAudio = () => {
      if (audioRef.current) {
          audioRef.current.pause();
          setAudioState('paused');
      }
  };

  const stopAudio = () => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }
      setAudioState('idle');
      setPlaybackProgress(0);
      setCurrentTime(0);
      setDuration(0);
      chunksRef.current = [];
      currentChunkIndexRef.current = 0;
  };

  const skipAudio = (seconds: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime += seconds;
      }
  };

  const scrollToTerm = (term: Term) => {
      if (term.element) {
          term.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          term.element.style.backgroundColor = isDarkMode ? '#1a8917' : '#cffafe';
          setTimeout(() => {
              if (term.element) term.element.style.backgroundColor = '';
          }, 1500);
      }
  };

  const getFontClass = () => {
      switch(font) {
          case 'sans': return 'font-sans';
          case 'system': return 'font-system';
          case 'dyslexic': return 'font-dyslexic';
          default: return 'font-serif';
      }
  };
  
  const getFontSizeClass = () => {
      switch(fontSize) {
          case 'small': return 'text-[16px] leading-[28px]';
          case 'large': return 'text-[24px] leading-[38px]';
          default: return 'text-[20px] leading-[32px]';
      }
  };

  const getContainerWidthClass = () => {
      return pageWidth === 'full' ? 'max-w-[960px]' : 'max-w-[680px]';
  };

  const textMain = isDarkMode ? 'text-medium-darkText' : 'text-medium-black';
  const textSecondary = isDarkMode ? 'text-medium-darkGray' : 'text-medium-gray';
  const borderCol = isDarkMode ? 'border-gray-800' : 'border-gray-100';
  const bgSurface = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const hoverBg = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  const faqList = data.topQuestions || [];

  const AiPanelOverlay = showAiPanel && (
        <div className="fixed inset-0 z-50 flex justify-end no-print">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAiPanel(false)}></div>
            <div className={`relative w-full max-w-md h-full ${bgSurface} border-l ${borderCol} shadow-2xl animate-in slide-in-from-right-10 duration-300 flex flex-col`}>
                <div className={`p-5 border-b ${borderCol} flex items-center gap-3`}>
                    <div className="text-blue-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                    </div>
                    <h2 className={`text-xl font-bold font-sans ${textMain}`}>MediumClone AI</h2>
                    <button onClick={() => setShowAiPanel(false)} className={`ml-auto ${textSecondary} hover:${textMain}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5" ref={aiChatContainerRef}>
                    <div className="flex gap-2 mb-6">
                        <button 
                            onClick={handleAiSummary}
                            disabled={!data.content}
                            className={`flex-1 py-2 px-3 border border-blue-600 text-blue-600 rounded font-medium text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex justify-center items-center gap-2 ${!data.content ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            {t('quickSummary')}
                        </button>
                    </div>

                    {aiChat.map((msg, i) => (
                        <div key={i} className={`mb-4 ${msg.role === 'ai' ? '' : 'flex justify-end'}`}>
                            <div className={`rounded-lg p-3 text-sm ${msg.role === 'ai' ? `${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} ${textMain} ai-message-content` : 'bg-blue-600 text-white'}`}>
                                <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                            </div>
                        </div>
                    ))}

                    {faqList.length > 0 && (
                        <div className="mt-8">
                            <h3 className={`font-bold text-sm mb-3 ${textMain}`}>{t('topQuestions')}</h3>
                            <div className="space-y-2">
                                {faqList.map((item, index) => (
                                    <div key={index} className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} overflow-hidden`}>
                                        <button 
                                            onClick={() => setExpandedFaqs(prev => ({...prev, [index]: !prev[index]}))}
                                            className={`w-full flex justify-between items-center p-3 text-left font-medium text-sm ${textMain} hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                                        >
                                            {item.question}
                                            <svg className={`transform transition-transform ${expandedFaqs[index] ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </button>
                                        {expandedFaqs[index] && (
                                            <div className={`p-3 pt-0 text-sm ${textSecondary} leading-relaxed border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                                {item.answer}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {aiLoading && (
                         <div className="flex justify-center mt-4">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mr-1"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mr-1 delay-100"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                         </div>
                    )}
                </div>

                <div className={`p-4 border-t ${borderCol}`}>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
                            placeholder="Ask anything..."
                            className={`w-full pl-4 pr-10 py-3 rounded-full border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'} focus:outline-none focus:border-blue-500`}
                        />
                        <button 
                            onClick={() => handleAiAsk()}
                            className="absolute right-3 top-3 text-blue-600 hover:text-blue-700"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
  );

  if (loading) {
    return (
      <div className={`${getContainerWidthClass()} mx-auto mt-12 animate-pulse space-y-8`}>
        <div className={`h-12 rounded-sm w-3/4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
        <div className="space-y-4">
            <div className={`h-4 rounded w-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
            <div className={`h-4 rounded w-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
            <div className={`h-4 rounded w-5/6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
        </div>
      </div>
    );
  }

  if (!data.title && !data.content) {
    return (
      <div className={`${getContainerWidthClass()} mx-auto mt-24 text-center font-sans ${isDarkMode ? 'text-gray-400' : 'text-medium-gray'}`}>
        {AiPanelOverlay}
        <h3 className={`text-xl mb-4 font-medium ${isDarkMode ? 'text-gray-200' : 'text-medium-black'}`}>{t('ready')}</h3>
        <p>{t('readyDesc')}</p>
        <p className="mt-2 text-sm text-gray-500">{t('customize')}</p>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'bg-[#121212]' : 'bg-white'}>
      <style>{`
        @media print {
            nav, button, .no-print { display: none !important; }
            article { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
            body { background: white; color: black; }
            .print-only-visible { display: block !important; }
        }
        details > summary { list-style: none; }
        details > summary::-webkit-details-marker { display: none; }
        details[open] summary ~ * { animation: fadeIn 0.3s ease-in-out; }
        details[open] summary span { transform: rotate(180deg); }
        @keyframes fadeIn { 0% { opacity: 0; transform: translateY(-5px); } 100% { opacity: 1; transform: translateY(0); } }
        /* AI Message Styling */
        .ai-message-content p { margin-bottom: 0.5em; }
        .ai-message-content ul { list-style-type: disc; padding-left: 1.2em; margin-bottom: 0.5em; }
        .ai-message-content li { margin-bottom: 0.2em; }
      `}</style>
      
      {/* TOC Sidebar - Enhanced Style (Strictly Left) */}
      {toc.length > 0 && (
          <div className={`hidden xl:block fixed left-10 top-32 w-56 no-print animate-in fade-in slide-in-from-left-4`}>
              <div className="mb-4">
                  <div className="flex items-center gap-3 mb-4">
                      <h3 className={`font-bold text-base ${isDarkMode ? 'text-gray-200' : 'text-black'}`}>{t('tableOfContents')}</h3>
                      <button 
                          onClick={() => setIsTocOpen(!isTocOpen)} 
                          className={`text-xs px-2 py-1 rounded-sm ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-black'}`}
                      >
                          {isTocOpen ? t('hide') : t('show')}
                      </button>
                  </div>
                  
                  {isTocOpen && (
                      <nav>
                          <ul className={`space-y-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {toc.map((item) => (
                                  <li key={item.id} className="leading-tight">
                                      <button 
                                          onClick={() => handleTocClick(item.id)}
                                          className={`text-left w-full hover:underline hover:text-blue-600 transition-colors ${isDarkMode ? 'hover:text-blue-400' : ''}`}
                                          title={item.text}
                                      >
                                          {item.text}
                                      </button>
                                  </li>
                              ))}
                          </ul>
                      </nav>
                  )}
              </div>
          </div>
      )}

      {/* Rest of the component (zoom, share, article header/body) remains same but re-rendered to ensure props are used */}
      {zoomedImage && (
          <div 
            className="fixed inset-0 z-[100] bg-white/95 dark:bg-black/95 flex items-center justify-center cursor-zoom-out animate-in fade-in duration-200"
            onClick={() => setZoomedImage(null)}
          >
              <img src={zoomedImage} className="max-w-full max-h-[95vh] w-auto h-auto object-contain shadow-2xl" alt="Zoomed" />
              <button className="absolute top-5 right-5 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
          </div>
      )}

      {isShareOpen && (
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsShareOpen(false)}></div>
      )}
      
      {isMoreOpen && (
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMoreOpen(false)}></div>
      )}

      {activeTerm && !showGlossary && (
          <div 
             className={`fixed z-50 p-4 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-w-xs animate-in fade-in zoom-in-95 border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
             style={{ 
                 left: activeTerm.x + 'px', 
                 top: activeTerm.y + 'px',
                 transform: `translate(-50%, ${activeTerm.position === 'top' ? '-100%' : '10px'})`,
                 marginTop: activeTerm.position === 'top' ? '-12px' : '0'
             }}
             onClick={(e) => e.stopPropagation()}
          >
              <div className="font-bold text-sm mb-1 text-medium-green">{activeTerm.text}</div>
              <div className="text-sm font-sans leading-snug mb-2">{activeTerm.def}</div>
              <button 
                onClick={() => handleGlossaryDeepDive(activeTerm.text)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                  Ask AI for details
              </button>
              <div 
                  className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-r border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                  style={{
                      bottom: activeTerm.position === 'top' ? '-8px' : 'auto',
                      top: activeTerm.position === 'bottom' ? '-8px' : 'auto',
                      transform: activeTerm.position === 'bottom' ? 'translateX(-50%) rotate(225deg)' : 'translateX(-50%) rotate(45deg)',
                      borderRight: activeTerm.position === 'bottom' ? '1px solid ' + (isDarkMode ? '#374151' : '#e5e7eb') : '1px solid ' + (isDarkMode ? '#374151' : '#e5e7eb'),
                      borderBottom: activeTerm.position === 'bottom' ? '1px solid ' + (isDarkMode ? '#374151' : '#e5e7eb') : '1px solid ' + (isDarkMode ? '#374151' : '#e5e7eb'),
                      borderLeft: 'none',
                      borderTop: 'none',
                  }}
              ></div>
          </div>
      )}

      {AiPanelOverlay}

      {showGlossary && (
        <div className="fixed inset-0 z-50 flex justify-end no-print">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowGlossary(false)}></div>
            <div className={`relative w-full max-w-md h-full ${bgSurface} border-l ${borderCol} shadow-2xl animate-in slide-in-from-right-10 duration-300 flex flex-col`}>
                <div className={`p-5 border-b ${borderCol} flex justify-between items-center`}>
                    <h2 className={`text-xl font-bold font-serif ${textMain}`}>Glossary</h2>
                    <button onClick={() => setShowGlossary(false)} className={`${textSecondary} hover:${textMain}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div className={`px-5 py-3 ${isDarkMode ? 'bg-blue-900/20 text-blue-100' : 'bg-blue-50 text-blue-800'} text-xs flex items-start gap-2 border-b ${borderCol}`}>
                    <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <p>Click a term to jump to it in the text, or use "Ask AI" for a deeper explanation.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {allTerms.length === 0 ? (
                        <p className={`text-sm ${textSecondary} text-center mt-10`}>No terms identified in this article yet.</p>
                    ) : (
                        allTerms.map((term, i) => (
                            <div key={i} className={`group pb-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-50'} last:border-0`}>
                                <div className="cursor-pointer" onClick={() => scrollToTerm(term)}>
                                    <h3 className={`font-bold font-sans text-base mb-1 ${textMain} group-hover:text-medium-green transition-colors`}>{term.text}</h3>
                                    <p className={`text-sm ${textSecondary} leading-relaxed`}>{term.def}</p>
                                </div>
                                
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleGlossaryDeepDive(term.text);
                                    }} 
                                    className={`mt-2 text-xs font-medium flex items-center gap-1 ${textMain} opacity-60 hover:opacity-100 hover:text-blue-600 transition-all`}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                                    ✨ Ask AI for deep dive
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      <article className={`${getContainerWidthClass()} mx-auto mt-12 mb-24 px-6 md:px-0 relative`}>
        <header className="mb-10">
          <textarea
            ref={titleTextareaRef}
            value={data.title}
            onChange={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
                if (onTitleChange) onTitleChange(e.target.value);
            }}
            placeholder="Article Title"
            rows={1}
            className={`w-full bg-transparent resize-none overflow-hidden outline-none text-[42px] leading-[52px] font-bold ${getFontClass()} tracking-tight ${textMain} mb-6 placeholder-gray-300 dark:placeholder-gray-700`}
            style={{ minHeight: '52px' }}
          />

          {/* NEW AI BUTTONS (Britannica Style) */}
          <div className="flex gap-3 mb-8 no-print">
              <button 
                onClick={() => setShowAiPanel(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold font-sans text-sm transition-colors"
              >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                  {t('askAnything')}
              </button>
              <button 
                onClick={handleAiSummary}
                className={`flex items-center gap-2 px-4 py-2 border rounded font-bold font-sans text-sm transition-colors ${isDarkMode ? 'border-blue-500 text-blue-400 hover:bg-blue-900/20' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}`}
              >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                  {t('quickSummary')}
              </button>
          </div>
          
          <div className="flex items-center justify-between mb-8 no-print border-b pb-8 border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-500">
                      <span>RB</span>
                  </div>
                  <div className="flex flex-col font-sans text-[14px]">
                      <div className="flex items-center space-x-2">
                          <span className={`font-medium ${textMain}`}>Reader Bot</span>
                          <span className="text-medium-green text-sm cursor-pointer">Follow</span>
                      </div>
                      <div className={textSecondary}>
                          <span>{data.readTime || '4 min read'}</span>
                          <span className="mx-1">·</span>
                          <span>{data.date || 'Just now'}</span>
                      </div>
                  </div>
              </div>
              
              <div className="flex items-center space-x-6">
                 <button 
                   onClick={() => setShowAiPanel(true)}
                   className={`relative ${textSecondary} hover:${textMain} hover:text-blue-600 transition-colors`}
                   title="MediumClone AI"
                 >
                     <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                 </button>

                 <button 
                   onClick={() => setShowGlossary(true)}
                   disabled={isCleanMode}
                   className={`relative ${allTerms.length > 0 ? textMain : textSecondary} hover:${textMain} transition-colors disabled:opacity-30`}
                   title="Open Glossary"
                 >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    {allTerms.length > 0 && !isCleanMode && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-medium-green opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-medium-green"></span>
                        </span>
                    )}
                 </button>

                 {audioState === 'idle' ? (
                     <button 
                       onClick={handleAudioToggle}
                       className={`hover:${textMain} transition-colors text-gray-500`}
                       title="Listen"
                     >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                     </button>
                 ) : (
                     <div className={`flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5 animate-in fade-in slide-in-from-left-2`}>
                        <button onClick={() => skipAudio(-10)} className="hover:text-medium-green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg></button>
                        <button onClick={audioState === 'playing' ? pauseAudio : handleAudioToggle} className="text-medium-green">
                           {audioState === 'loading' ? (<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : audioState === 'playing' ? (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>) : (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>)}
                        </button>
                        <button onClick={stopAudio} className="hover:text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg></button>
                        <button onClick={() => skipAudio(10)} className="hover:text-medium-green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg></button>
                     </div>
                 )}

                 {onSave && (
                    <button 
                      onClick={() => onSave(data)}
                      className={`hover:${textMain} transition-colors ${isSaved ? 'text-black dark:text-white' : 'text-gray-500'}`}
                      title="Save to Library"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                      </svg>
                    </button>
                  )}

                 <div className="relative">
                     <button 
                        onClick={() => setIsShareOpen(!isShareOpen)}
                        className={`text-gray-500 hover:text-black dark:hover:text-white transition-colors ${isShareOpen ? 'text-black dark:text-white' : ''}`}
                        title="Share"
                     >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                     </button>
                     {isShareOpen && (
                         <div className={`absolute right-0 top-10 z-50 w-64 ${bgSurface} rounded shadow-xl border ${borderCol} animate-in fade-in slide-in-from-top-2 font-sans`}>
                             <div className="p-2">
                                 <button onClick={copyToClipboard} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${hoverBg} ${textMain} transition-colors`}>
                                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                     <span className="text-sm font-medium">Copy link</span>
                                 </button>
                             </div>
                             
                             <div className={`border-t ${borderCol} p-2`}>
                                 <button onClick={copyToClipboard} className={`w-full flex items-center justify-between px-4 py-3 rounded ${hoverBg} ${textMain} transition-colors group`}>
                                    <div className="flex items-center gap-3">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                        <div className="text-left">
                                            <div className="text-sm font-medium">Friend Link</div>
                                        </div>
                                    </div>
                                    <svg className={`text-gray-400 group-hover:${textMain}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                 </button>
                             </div>

                             <div className={`border-t ${borderCol} p-2`}>
                                 <button onClick={() => shareToSocial('bluesky')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded ${hoverBg} ${textMain} transition-colors`}>
                                     <span className="text-sm">Share on Bluesky</span>
                                 </button>
                                 <button onClick={() => shareToSocial('facebook')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded ${hoverBg} ${textMain} transition-colors`}>
                                     <span className="text-sm">Share on Facebook</span>
                                 </button>
                                 <button onClick={() => shareToSocial('linkedin')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded ${hoverBg} ${textMain} transition-colors`}>
                                     <span className="text-sm">Share on LinkedIn</span>
                                 </button>
                                 <button onClick={() => shareToSocial('threads')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded ${hoverBg} ${textMain} transition-colors`}>
                                     <span className="text-sm">Share on Threads</span>
                                 </button>
                                 <button onClick={() => shareToSocial('twitter')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded ${hoverBg} ${textMain} transition-colors`}>
                                     <span className="text-sm">Share on X</span>
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>

                 <div className="relative">
                     <button 
                        onClick={() => setIsMoreOpen(!isMoreOpen)}
                        className={`text-gray-500 hover:text-black dark:hover:text-white transition-colors ${isMoreOpen ? 'text-black dark:text-white' : ''}`}
                     >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                     </button>
                     {isMoreOpen && (
                         <div className={`absolute right-0 top-10 z-50 w-56 ${bgSurface} rounded shadow-xl border ${borderCol} animate-in fade-in slide-in-from-top-2 font-sans`}>
                            <div className="p-2">
                                <button onClick={() => setShowHighlights(!showHighlights)} disabled={isCleanMode} className={`w-full flex items-center justify-between px-3 py-2 rounded ${hoverBg} ${textMain} transition-colors text-sm mb-1 disabled:opacity-50`}>
                                    <span>{showHighlights ? 'Hide highlights' : 'Show highlights'}</span>
                                    {!isCleanMode && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>⌘ /</span>}
                                </button>
                                
                                {/* New Clean Text Toggle */}
                                <button onClick={() => setIsCleanMode(!isCleanMode)} className={`w-full flex items-center justify-between px-3 py-2 rounded ${hoverBg} ${textMain} transition-colors text-sm`}>
                                    <div className="flex items-center gap-2">
                                        {isCleanMode ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        ) : (
                                            <div className="w-4 h-4 border border-gray-400 rounded-sm"></div>
                                        )}
                                        <span>Clean Text Mode</span>
                                    </div>
                                </button>
                                
                            </div>
                         </div>
                     )}
                 </div>
              </div>
          </div>
          
          {/* Article Content Container */}
          <div 
          ref={articleRef}
          className={`
              ${getFontClass()} ${getFontSizeClass()} ${textMain}
              [&>p]:mb-8 [&>p]:font-normal
              [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-4
              [&>p>mark]:bg-transparent
              [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-6 [&>ul]:space-y-2
              [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-6 [&>ol]:space-y-2
              [&>li]:pl-1
              [&>blockquote]:border-l-4 [&>blockquote]:border-current [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-2xl [&>blockquote]:font-serif [&>blockquote]:my-8 [&>blockquote]:opacity-80
              [&>figure]:my-10 [&>figure]:w-full
              [&>figure>img]:w-full [&>figure>img]:h-auto [&>figure>img]:rounded-sm
              [&>figure>iframe]:w-full [&>figure>iframe]:aspect-video [&>figure>iframe]:rounded-sm
              [&>figure>video]:w-full [&>figure>video]:aspect-video [&>figure>video]:rounded-sm
              [&>figure>figcaption]:mt-3 [&>figure>figcaption]:text-sm [&>figure>figcaption]:text-center [&>figure>figcaption]:text-gray-500 [&>figure>figcaption]:font-sans [&>figure>figcaption]:italic
              [&>iframe]:w-full [&>iframe]:rounded-sm [&>iframe]:my-8 [&>iframe]:aspect-video
              [&>video]:w-full [&>video]:rounded-sm [&>video]:my-8 [&>video]:aspect-video
              [&>.pdf-page-visual]:my-8 [&>.pdf-page-visual]:p-4 [&>.pdf-page-visual]:bg-gray-50 [&>.pdf-page-visual]:rounded [&>.pdf-page-visual]:border [&>.pdf-page-visual>img]:w-full [&>.pdf-page-visual>img]:border [&>.pdf-page-visual>p]:text-xs [&>.pdf-page-visual>p]:font-bold [&>.pdf-page-visual>p]:uppercase [&>.pdf-page-visual>p]:text-gray-400 [&>.pdf-page-visual>p]:mb-2
          `}
          dangerouslySetInnerHTML={{ __html: contentToRender }} 
        />
        
        {/* Remaining sections (citation, comments, etc) */}
        {data.citation && !hasMore && (
             <div className="mt-12 mb-8 no-print animate-in fade-in slide-in-from-bottom-2">
                <div className={`p-6 border-l-[3px] ${isDarkMode ? 'bg-[#1e1e1e] border-gray-600' : 'bg-[#f9f9f9] border-[#d0d0d0]'} rounded-r-sm`}>
                   <div className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${isDarkMode ? 'text-gray-400' : 'text-[#757575]'}`}>
                      {t('sourceCitation')}
                   </div>
                   <div className={`font-serif italic text-[15px] leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-[#242424]'}`}>
                      {data.citation}
                   </div>
                </div>
             </div>
        )}

        {hasMore && (
          <div className="flex justify-center mt-12 mb-12 animate-in fade-in no-print">
             <button 
               onClick={() => setVisibleChunks(prev => prev + 1)}
               className={`group flex items-center gap-2 px-6 py-3 rounded-full border ${isDarkMode ? 'border-gray-700 bg-gray-800 hover:border-gray-500' : 'border-gray-200 bg-white hover:border-medium-black'} shadow-sm hover:shadow-md transition-all`}
             >
               <div className={`w-6 h-6 rounded-full bg-medium-green text-white flex items-center justify-center ${isDarkMode ? '' : 'group-hover:bg-black'} transition-colors`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
               </div>
               <span className={`font-sans font-medium text-sm ${textMain}`}>{t('generateMore')}</span>
             </button>
          </div>
        )}
        
        <div className="flex justify-center mb-10 no-print">
            <button 
                onClick={handleDownloadHtml}
                className={`text-gray-400 hover:text-medium-green text-sm font-sans flex items-center gap-2 underline`}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                {t('download')}
            </button>
        </div>
        
        <div ref={commentsRef} className={`mt-10 border-t ${borderCol} pt-10 no-print`}>
            <h3 className="font-sans font-bold text-lg mb-6">{t('responses')} ({comments.length})</h3>
            
            <div className={`rounded shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} p-4 mb-8`}>
                <div className="flex items-center gap-3 mb-3">
                   <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-500">
                     <span>YOU</span>
                   </div>
                   <span className="text-sm font-sans font-medium">You</span>
                </div>
                <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="What are your thoughts?"
                    className={`w-full resize-none outline-none ${getFontClass()} text-sm h-20 placeholder:font-sans placeholder:text-gray-400 bg-transparent ${textMain}`}
                />
                <div className="flex justify-end mt-2">
                    <button 
                        onClick={handlePostComment}
                        className={`px-4 py-1.5 rounded-full text-sm font-sans transition-colors ${newComment.trim() ? 'bg-medium-green text-white hover:bg-green-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'}`}
                        disabled={!newComment.trim()}
                    >
                        {t('respond')}
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {comments.map(comment => (
                    <div key={comment.id} className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-50'} pb-6 last:border-0`}>
                        <div className="flex items-center gap-3 mb-2">
                             <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                <span>{comment.author.substring(0, 2).toUpperCase()}</span>
                             </div>
                             <div>
                                 <div className="text-sm font-sans font-medium">{comment.author}</div>
                                 <div className="text-xs text-gray-400 font-sans">{comment.date}</div>
                             </div>
                        </div>
                        <p className={`${getFontClass()} ${textMain} text-sm leading-relaxed`}>{comment.text}</p>
                    </div>
                ))}
            </div>
        </div>

      </article>
    </div>
  );
};

export default ArticleView;