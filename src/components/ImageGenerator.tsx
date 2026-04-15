import React, { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Play, 
  Download, 
  Image as ImageIcon, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Trash2,
  Zap,
  Layers,
  Activity,
  Clock,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { generateImage } from '@/src/services/gemini';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImagePrompt {
  article_slug: string;
  article_title: string;
  image_id: string;
  image_role: string;
  prompt: string;
  width: string;
  height: string;
  output_path: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  resultUrl?: string;
  error?: string;
}

const DEFAULT_CSV = `article_slug,article_file,article_title,primary_keyword,image_role,image_id,output_path,width,height,output_format,prompt
23-percent-reply-rate-examples,public/blogs/23-percent-reply-rate-examples/23-percent-reply-rate-examples.md,What a 23% Reply Rate Actually Looks Like,23% reply rate cold email,featured,hero-intro,./images/featured.png,1536,864,png,"Vee guiding Nova through a clean dashboard where one clear signal curve rises above baseline bands, with visual storytelling of precision outreach and calm control. FluxBot is analyzing the data points."
23-percent-reply-rate-examples,public/blogs/23-percent-reply-rate-examples/23-percent-reply-rate-examples.md,What a 23% Reply Rate Actually Looks Like,23% reply rate cold email,content,signal-system-map,./images/content-signal-system-map.png,1536,864,png,"Playful scene showing the system behind repeatable high reply rates: targeting quality, trigger relevance, message clarity, and follow-up discipline as four connected modules. Vee and Nova are collaborating on the modules."
23-percent-reply-rate-examples,public/blogs/23-percent-reply-rate-examples/23-percent-reply-rate-examples.md,What a 23% Reply Rate Actually Looks Like,23% reply rate cold email,content,message-anatomy-cutaway,./images/content-message-anatomy-cutaway.png,1536,864,png,"Clean cutaway-style infographic that breaks one outreach message into visual layers: trigger opening, relevance bridge, value hypothesis, and low-friction CTA. Nova points to each layer while Vee checks alignment."`;

export default function ImageGenerator() {
  const [prompts, setPrompts] = useState<ImagePrompt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activePromptIndex, setActivePromptIndex] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = useCallback((csvContent: string) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mappedData = results.data.map((row: any) => ({
          article_slug: row.article_slug || '',
          article_title: row.article_title || '',
          image_id: row.image_id || row.image_role || 'asset',
          image_role: row.image_role || 'content',
          prompt: row.prompt || '',
          width: row.width || '1024',
          height: row.height || '1024',
          output_path: row.output_path || '',
          status: 'pending' as const,
        })).filter(p => p.prompt);
        setPrompts(mappedData);
        toast.success(`Loaded ${mappedData.length} image prompts`);
      },
      error: (error) => {
        toast.error("Failed to parse CSV: " + error.message);
      }
    });
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        parseCSV(content);
      };
      reader.readAsText(file);
    }
  };

  const loadDefault = () => {
    parseCSV(DEFAULT_CSV);
  };

  const runGeneration = async (indicesToProcess: number[]) => {
    if (indicesToProcess.length === 0) return;
    setIsGenerating(true);
    setProgress(0);
    setCooldownRemaining(null);

    const updatedPrompts = [...prompts];
    
    const GLOBAL_STYLE_LOCK = `GLOBAL STYLE LOCK (must apply): Create a premium minimal playful infographic illustration for VranceFlex with consistent recurring characters in every image: 1) Vee (purple fox strategist), 2) Nova (human SDR in dark-violet blazer), 3) FluxBot (small analytical robot). Maintain character identity consistency across all article images. Strict palette lock: #300080, #4000A0, #0B0021, #DCB9FF, #FFFFFF.`;

    const COLOR_CONSTRAINTS = `Color control requirement: keep the image strongly brand-led and mostly monochromatic violet-indigo. Primary surfaces should use #300080 and #4000A0, deep structure and shadows should use #0B0021, highlights should use #DCB9FF, and clean supporting type or accents may use #FFFFFF. Do not introduce warm oranges, greens, reds, or unrelated palettes unless tiny neutral details are unavoidable. At least 85 percent of visible design language must use this palette. Do not let unrelated colors dominate. Keep the composition clean, icon-led, no clutter, no logos, no watermarks, and no photorealistic people. Use polished flat-isometric cartoon style with enterprise editorial quality. IMPORTANT: THE COLOR PALETTE VISUALIZATION (LIKE A VIOLET PALETTE SWATCH OR COLOR BLOCKS) MUST BE NOWHERE VISIBLE ON THE IMAGES.`;

    for (let j = 0; j < indicesToProcess.length; j++) {
      const i = indicesToProcess[j];
      setActivePromptIndex(i);
      updatedPrompts[i].status = 'generating';
      setPrompts([...updatedPrompts]);

      const isFeatured = updatedPrompts[i].image_role === 'featured';
      const textConstraints = isFeatured 
        ? `Text rendering requirement for featured image: include this exact title verbatim with perfect spelling: "${updatedPrompts[i].article_title}". Keep the title clean, legible, professionally typeset, and visually integrated into the design.`
        : `Default text policy: avoid text unless truly necessary. If text appears, spelling and typography must be perfectly correct.`;

      const finalPrompt = `${GLOBAL_STYLE_LOCK}\n\n${textConstraints}\n\n${COLOR_CONSTRAINTS}\n\nImage-specific instruction: ${updatedPrompts[i].prompt}`;

      try {
        const resultUrl = await generateImage({
          prompt: finalPrompt,
          aspectRatio: "16:9",
        });
        updatedPrompts[i].status = 'completed';
        updatedPrompts[i].resultUrl = resultUrl;
        updatedPrompts[i].error = undefined;
      } catch (error) {
        updatedPrompts[i].status = 'error';
        updatedPrompts[i].error = error instanceof Error ? error.message : String(error);
        toast.error(`Failed to generate: ${updatedPrompts[i].image_id}`);
      }

      setProgress(((j + 1) / indicesToProcess.length) * 100);
      setPrompts([...updatedPrompts]);

      // Batching and rate limit cooldown logic
      if (j < indicesToProcess.length - 1) {
        if ((j + 1) % 10 === 0) {
          // Wait 30 seconds after every 10 images
          for (let c = 30; c > 0; c--) {
            setCooldownRemaining(c);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          setCooldownRemaining(null);
        } else {
          // Small 1.5s buffer between individual images to prevent burst limits
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }

    setIsGenerating(false);
    setActivePromptIndex(null);
    setCooldownRemaining(null);
    toast.success("Generation complete");
  };

  const generateAll = () => {
    const indices = prompts.map((p, i) => p.status !== 'completed' ? i : -1).filter(i => i !== -1);
    runGeneration(indices);
  };

  const regenerateFailed = () => {
    const indices = prompts.map((p, i) => p.status === 'error' ? i : -1).filter(i => i !== -1);
    if (indices.length === 0) {
      toast.info("No failed images to regenerate");
      return;
    }
    runGeneration(indices);
  };

  const clearAll = () => {
    setPrompts([]);
    setProgress(0);
    setActivePromptIndex(null);
    setCooldownRemaining(null);
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllZip = async () => {
    const completedPrompts = prompts.filter(p => p.status === 'completed' && p.resultUrl);
    if (completedPrompts.length === 0) {
      toast.info("No completed images to download");
      return;
    }

    const zip = new JSZip();
    const toastId = toast.loading("Preparing ZIP file...");

    try {
      for (const prompt of completedPrompts) {
        const response = await fetch(prompt.resultUrl!);
        const blob = await response.blob();
        
        let filename = prompt.output_path;
        if (!filename) {
          filename = `${prompt.image_id}.png`;
        } else if (filename.startsWith('./')) {
          filename = filename.substring(2);
        }
        
        zip.file(filename, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "vranceflex-images.zip");
      toast.success("ZIP downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("Error creating ZIP:", error);
      toast.error("Failed to create ZIP file", { id: toastId });
    }
  };

  const activePrompt = activePromptIndex !== null ? prompts[activePromptIndex] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Bento Grid Controls & Status */}
      <div className="bento-grid">
        {/* Active Generation - Large Card */}
        <div className="bento-card bento-card-large relative overflow-hidden">
          <div className="bento-label">
            {cooldownRemaining !== null 
              ? `Cooling Down (${cooldownRemaining}s)` 
              : isGenerating 
                ? `Generating Image #${(activePromptIndex || 0) + 1}` 
                : 'Engine Idle'}
          </div>
          <div className="active-preview relative">
            {cooldownRemaining !== null && (
              <div className="absolute inset-0 bg-indigo-950/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm rounded-xl">
                <Clock className="w-12 h-12 text-bento-accent mb-4 animate-pulse" />
                <div className="text-3xl font-bold text-white">{cooldownRemaining}s</div>
                <div className="text-sm text-bento-dim mt-2">Rate limit cooldown</div>
                <div className="text-xs text-bento-dim/70 mt-1">You can download completed images now</div>
              </div>
            )}
            {activePrompt?.resultUrl ? (
              <img src={activePrompt.resultUrl} alt="preview" />
            ) : (
              <div className="w-full h-full bg-indigo-950/50 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-white/10" />
              </div>
            )}
            {isGenerating && (
              <div className="progress-overlay">
                <div className="percentage">{Math.round(progress)}%</div>
                <div className="bento-stat-desc">Diffusion sampling...</div>
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium">Prompt Content:</p>
            <p className="text-[13px] text-bento-dim truncate mt-1">
              {activePrompt ? `"${activePrompt.prompt}"` : "No active prompt in engine."}
            </p>
          </div>
        </div>

        {/* Completed Stats */}
        <div className="bento-card">
          <div className="bento-label">Completed</div>
          <div className="bento-stat-value">
            {prompts.filter(p => p.status === 'completed').length} 
            <span className="text-base text-bento-dim ml-2">/ {prompts.length}</span>
          </div>
          <div className="bento-stat-desc">
            {isGenerating ? "Estimated 12 mins left" : "Ready for batch"}
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bento-card">
          <div className="bento-label">Performance</div>
          <div className="bento-stat-value">4.2s</div>
          <div className="bento-stat-desc">Average per image</div>
        </div>

        {/* Processing Queue - Tall Card */}
        <div className="bento-card bento-card-tall">
          <div className="bento-label">Processing Queue</div>
          <ScrollArea className="flex-grow pr-4">
            <div className="space-y-3">
              {prompts.map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-bento-border last:border-0">
                  <div className={`w-2 h-2 rounded-full ${
                    p.status === 'completed' ? 'bg-bento-success' : 
                    p.status === 'generating' ? 'bg-bento-accent animate-pulse' : 
                    p.status === 'error' ? 'bg-destructive' : 'bg-zinc-600'
                  }`} />
                  <div className="text-[13px] text-bento-dim truncate flex-grow">
                    {p.image_id || `Prompt #${i+1}`}
                  </div>
                </div>
              ))}
              {prompts.length === 0 && (
                <div className="text-center py-10 text-bento-dim text-xs italic">
                  Queue is empty
                </div>
              )}
            </div>
          </ScrollArea>
          {prompts.length > 10 && (
            <div className="mt-auto pt-4 text-[12px] text-center text-bento-dim">
              +{prompts.length - 10} more in queue
            </div>
          )}
        </div>

        {/* Configuration - Wide Card */}
        <div className="bento-card bento-card-wide">
          <div className="bento-label">Global Model Settings</div>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-grow flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-0">Gemini 3.1 Flash</Badge>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-0">Aspect: 16:9</Badge>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-0">Size: 1K</Badge>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-0">Batch Mode</Badge>
            </div>
            <div className="w-full md:w-auto flex gap-2">
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 md:flex-none border-bento-border hover:bg-zinc-800"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 md:flex-none border-bento-border hover:bg-zinc-800"
                onClick={loadDefault}
              >
                Sample
              </Button>
            </div>
          </div>
          <Button 
            disabled={prompts.length === 0 || isGenerating}
            onClick={generateAll}
            className="w-full mt-4 bg-bento-accent hover:bg-bento-accent/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-bento-accent/20"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Play className="w-5 h-5 mr-2" />
            )}
            {isGenerating ? "FORGING ASSETS..." : "IGNITE ENGINE"}
          </Button>
          {prompts.some(p => p.status === 'error') && (
            <Button 
              disabled={isGenerating}
              onClick={regenerateFailed}
              variant="outline"
              className="w-full mt-2 border-destructive text-destructive hover:bg-destructive/10 font-bold h-12 rounded-xl"
            >
              <Zap className="w-5 h-5 mr-2" />
              REGENERATE FAILED
            </Button>
          )}
        </div>

        {/* Output Actions */}
        <div className="bento-card">
          <div className="bento-label">Output</div>
          <Button 
            variant="outline"
            className="mt-auto border-bento-border hover:bg-zinc-800 h-12 rounded-xl"
            disabled={prompts.filter(p => p.status === 'completed').length === 0}
            onClick={downloadAllZip}
          >
            <Download className="w-4 h-4 mr-2" />
            Download .ZIP
          </Button>
        </div>

        {/* System Status */}
        <div className="bento-card bg-bento-accent">
          <div className="bento-label text-white/70">System Status</div>
          <div className="bento-stat-value text-white">Healthy</div>
          <div className="bento-stat-desc text-white/80 flex items-center gap-2">
            <Activity className="w-3 h-3" />
            GPU: A100 @ 42%
          </div>
        </div>
      </div>

      {/* Asset Manifest - Results Grid */}
      <div className="space-y-6 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-bento-accent" />
            Asset Manifest
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive/10" onClick={clearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Manifest
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {prompts.map((prompt, index) => (
              <motion.div
                key={`${prompt.image_id}-${index}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <div className="bento-card group h-full">
                  <div className="aspect-video relative bg-zinc-900 rounded-xl overflow-hidden mb-4">
                    {prompt.resultUrl ? (
                      <img 
                        src={prompt.resultUrl} 
                        alt={prompt.image_id}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-bento-dim/30">
                        {prompt.status === 'generating' ? (
                          <Loader2 className="w-8 h-8 animate-spin text-bento-accent" />
                        ) : prompt.status === 'error' ? (
                          <AlertCircle className="w-8 h-8 text-destructive" />
                        ) : (
                          <ImageIcon className="w-8 h-8" />
                        )}
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3">
                      {prompt.status === 'completed' && (
                        <div className="bg-bento-success text-white p-1 rounded-full shadow-lg">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 flex-grow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-bento-accent">{prompt.image_id}</span>
                      <span className="text-[10px] text-bento-dim font-mono">{prompt.width}x{prompt.height}</span>
                    </div>
                    <h3 className="font-bold text-sm line-clamp-1" title={prompt.article_title}>
                      {prompt.article_title}
                    </h3>
                    <p className="text-xs text-bento-dim line-clamp-2 italic">
                      "{prompt.prompt}"
                    </p>
                  </div>

                  <div className="pt-4 flex items-center gap-2">
                    {prompt.resultUrl && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs h-8"
                        onClick={() => downloadImage(prompt.resultUrl!, `${prompt.image_id}.png`)}
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {prompts.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-bento-dim/20 space-y-4 border-2 border-dashed border-bento-border rounded-[20px]">
            <Layers className="w-16 h-16" />
            <p className="font-bold">No Assets in Manifest</p>
          </div>
        )}
      </div>
    </div>
  );
}
