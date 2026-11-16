export type PlatformCategory =
  | "chat"
  | "image"
  | "video"
  | "coding"
  | "audio"
  | "research"
  | "social"
  | "web";

export interface PlatformEntry {
  id: string;
  name: string;
  company: string;
  category: PlatformCategory;
  url: string;
  description: string;
  isCustom?: boolean;
}

export const CATEGORY_LABELS: Record<PlatformCategory, string> = {
  chat: "كتابة ومحادثة",
  image: "صور وفنون",
  video: "فيديو وحركة",
  coding: "برمجة وتطوير",
  audio: "صوت وموسيقى",
  research: "بحث علمي وتحليل",
  social: "التواصل والنشر",
  web: "منصات الويب",
};

export const INITIAL_PLATFORMS: PlatformEntry[] = [
  // Writing & Chat
  {
    id: "gemini",
    name: "Google Gemini",
    company: "Google",
    category: "chat",
    url: "https://gemini.google.com",
    description: "مساعد جوجل للمحادثة والكتابة والتحليل متعدد الوسائط.",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    company: "OpenAI",
    category: "chat",
    url: "https://chatgpt.com",
    description: "منصة المحادثة وتحليل البيانات من OpenAI بنماذج GPT.",
  },
  {
    id: "claude",
    name: "Claude",
    company: "Anthropic",
    category: "chat",
    url: "https://claude.ai",
    description: "مساعد ذكي للكتابة والتحليل والبرمجة مع مساحة Artifacts.",
  },
  {
    id: "meta-ai",
    name: "Meta AI",
    company: "Meta",
    category: "chat",
    url: "https://www.meta.ai",
    description: "المساعد الذكي من ميتا المبني على نماذج Llama.",
  },
  {
    id: "grok",
    name: "Grok",
    company: "xAI",
    category: "chat",
    url: "https://grok.com",
    description: "مساعد المحادثة والبحث الفوري من شركة xAI.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    company: "DeepSeek",
    category: "chat",
    url: "https://chat.deepseek.com",
    description: "نموذج استنتاج ومحادثة متقدم للأسئلة والبرمجة.",
  },
  {
    id: "mistral",
    name: "Mistral Le Chat",
    company: "Mistral AI",
    category: "chat",
    url: "https://chat.mistral.ai",
    description: "منصة المحادثة السريعة من Mistral AI.",
  },
  {
    id: "copilot",
    name: "Microsoft Copilot",
    company: "Microsoft",
    category: "chat",
    url: "https://copilot.microsoft.com",
    description: "المساعد اليومي من مايكروسوفت للبحث والإنتاجية.",
  },
  {
    id: "perplexity",
    name: "Perplexity AI",
    company: "Perplexity",
    category: "chat",
    url: "https://www.perplexity.ai",
    description: "محرك بحث وإجابات موثقة بالمصادر المباشرة.",
  },
  {
    id: "qwen",
    name: "Qwen Chat",
    company: "Alibaba",
    category: "chat",
    url: "https://chat.qwen.ai",
    description: "سلسلة نماذج Qwen للمحادثة والترجمة والبرمجة.",
  },
  {
    id: "cohere",
    name: "Cohere Coral",
    company: "Cohere",
    category: "chat",
    url: "https://coral.cohere.com",
    description: "واجهة نماذج Command R للبحث المؤسسي والتلخيص.",
  },

  // Image & Art
  {
    id: "midjourney",
    name: "Midjourney",
    company: "Midjourney",
    category: "image",
    url: "https://www.midjourney.com",
    description: "منصة متخصصة في توليد الصور الفنية عالية التفاصيل.",
  },
  {
    id: "firefly",
    name: "Adobe Firefly",
    company: "Adobe",
    category: "image",
    url: "https://firefly.adobe.com",
    description: "توليد وتعديل الصور للتصميم الإبداعي من أدوبي.",
  },
  {
    id: "leonardo",
    name: "Leonardo.ai",
    company: "Leonardo",
    category: "image",
    url: "https://leonardo.ai",
    description: "استوديو تصميم وتوليد صور وأصول فنية رقمية.",
  },
  {
    id: "ideogram",
    name: "Ideogram",
    company: "Ideogram",
    category: "image",
    url: "https://ideogram.ai",
    description: "توليد صور مع دقة عالية في رسم النصوص والشعارات.",
  },
  {
    id: "flux",
    name: "Black Forest Labs (Flux)",
    company: "Black Forest Labs",
    category: "image",
    url: "https://bfl.ai",
    description: "نماذج Flux المتقدمة لتوليد الصور الواقعية.",
  },
  {
    id: "stability",
    name: "Stability AI",
    company: "Stability AI",
    category: "image",
    url: "https://stability.ai",
    description: "مطور نماذج Stable Diffusion لتوليد الصور والرسوم.",
  },

  // Video & Motion
  {
    id: "sora",
    name: "Sora",
    company: "OpenAI",
    category: "video",
    url: "https://sora.com",
    description: "توليد مقاطع الفيديو من النصوص بواسطة OpenAI.",
  },
  {
    id: "runway",
    name: "Runway",
    company: "Runway",
    category: "video",
    url: "https://runwayml.com",
    description: "أدوات إنتاج وتحرير الفيديو عبر نماذج Gen-3.",
  },
  {
    id: "kling",
    name: "Kling AI",
    company: "Kuaishou",
    category: "video",
    url: "https://klingai.com",
    description: "توليد مقاطع فيديو حركية عالية الجودة.",
  },
  {
    id: "hailuo",
    name: "Hailuo AI",
    company: "MiniMax",
    category: "video",
    url: "https://hailuoai.video",
    description: "توليد الفيديو بالذكاء الاصطناعي من MiniMax.",
  },
  {
    id: "pika",
    name: "Pika",
    company: "Pika Labs",
    category: "video",
    url: "https://pika.art",
    description: "تحويل الصور والنصوص إلى مشاهد فيديو قصيرة.",
  },
  {
    id: "luma",
    name: "Luma Dream Machine",
    company: "Luma AI",
    category: "video",
    url: "https://lumalabs.ai/dream-machine",
    description: "إنشاء مشاهد فيديو سلسة وحركية ثلاثية الأبعاد.",
  },

  // Coding Assistants
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    company: "GitHub",
    category: "coding",
    url: "https://github.com/features/copilot",
    description: "مساعد كتابة ومراجعة الشيفرات البرمجية داخل المحررات.",
  },
  {
    id: "cursor",
    name: "Cursor",
    company: "Anysphere",
    category: "coding",
    url: "https://www.cursor.com",
    description: "محرر أكواد مبني للتعاون المباشر مع نماذج البرمجة.",
  },
  {
    id: "devin",
    name: "Devin",
    company: "Cognition",
    category: "coding",
    url: "https://cognition.ai",
    description: "وكيل تطوير برمجي لتنفيذ مهام الهندسة والاختبار.",
  },
  {
    id: "replit",
    name: "Replit",
    company: "Replit",
    category: "coding",
    url: "https://replit.com",
    description: "بيئة تطوير سحابية لبناء وتشغيل التطبيقات عبر المتصفح.",
  },
  {
    id: "tabnine",
    name: "Tabnine",
    company: "Tabnine",
    category: "coding",
    url: "https://www.tabnine.com",
    description: "إكمال تلقائي ذكي ومساعد برمجي للفرق والشركات.",
  },
  {
    id: "cody",
    name: "Sourcegraph Cody",
    company: "Sourcegraph",
    category: "coding",
    url: "https://sourcegraph.com/cody",
    description: "مساعد برمجي يفهم قواعد الشيفرات الكبيرة.",
  },

  // Audio & Music
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    company: "ElevenLabs",
    category: "audio",
    url: "https://elevenlabs.io",
    description: "تحويل النصوص إلى صوت بشري واقعي ودبلجة متعددة اللغات.",
  },
  {
    id: "suno",
    name: "Suno",
    company: "Suno",
    category: "audio",
    url: "https://suno.com",
    description: "تأليف وتوليد المقاطع الموسيقية والأغاني من النصوص.",
  },
  {
    id: "udio",
    name: "Udio",
    company: "Udio",
    category: "audio",
    url: "https://www.udio.com",
    description: "استوديو إنتاج موسيقي تفاعلي عبر المتصفح.",
  },
  {
    id: "mubert",
    name: "Mubert",
    company: "Mubert",
    category: "audio",
    url: "https://mubert.com",
    description: "توليد موسيقى خلفية لمقاطع الفيديو والمحتوى.",
  },

  // Research & Analysis
  {
    id: "notebooklm",
    name: "Google NotebookLM",
    company: "Google",
    category: "research",
    url: "https://notebooklm.google.com",
    description: "دفتر بحث وتلخيص يعتمد على ملفاتك ومصادرك الخاصة.",
  },
  {
    id: "elicit",
    name: "Elicit",
    company: "Elicit",
    category: "research",
    url: "https://elicit.com",
    description: "مساعد بحث علمي لتحليل الأوراق الأكاديمية واستخلاص النتائج.",
  },
  {
    id: "consensus",
    name: "Consensus",
    company: "Consensus",
    category: "research",
    url: "https://consensus.app",
    description: "محرك بحث يستخرج الإجابات من الدراسات العلمية المحكمة.",
  },
  {
    id: "semantic-scholar",
    name: "Semantic Scholar",
    company: "Allen Institute",
    category: "research",
    url: "https://www.semanticscholar.org",
    description: "فهرس علمي ذكي لاستكشاف الأبحاث والاستشهادات.",
  },
  {
    id: "chatpdf",
    name: "ChatPDF",
    company: "ChatPDF",
    category: "research",
    url: "https://www.chatpdf.com",
    description: "قراءة ملفات PDF وتلخيصها وطرح أسئلة مباشرة حولها.",
  },

  // Everyday Web Platforms
  {
    id: "google",
    name: "Google",
    company: "Google",
    category: "web",
    url: "https://www.google.com",
    description: "محرك البحث العالمي والوصول السريع لخدمات جوجل.",
  },
  {
    id: "youtube",
    name: "YouTube",
    company: "Google",
    category: "web",
    url: "https://www.youtube.com",
    description: "منصة الفيديو والشروحات والمحتوى المرئي.",
  },
  {
    id: "facebook",
    name: "Facebook",
    company: "Meta",
    category: "web",
    url: "https://www.facebook.com",
    description: "منصة التواصل والمجموعات والصفحات الاجتماعية.",
  },

  // Social Media & Creator Publishing Platforms
  {
    id: "instagram",
    name: "Instagram",
    company: "Meta",
    category: "social",
    url: "https://www.instagram.com",
    description: "نشر الصور ومقاطع Reels والقصص والتفاعل مع المتابعين.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    company: "ByteDance",
    category: "social",
    url: "https://www.tiktok.com",
    description: "منصة الفيديوهات القصيرة والانتشار السريع وصناعة المحتوى.",
  },
  {
    id: "tiktok-studio",
    name: "TikTok Studio",
    company: "ByteDance",
    category: "social",
    url: "https://www.tiktok.com/tiktokstudio/upload",
    description: "رفع ونشر وجدولة مقاطع تيك توك ومتابعة إحصائيات المشاهدات.",
  },
  {
    id: "meta-business",
    name: "Meta Business Suite",
    company: "Meta",
    category: "social",
    url: "https://business.facebook.com",
    description: "إدارة ونشر المحتوى وجدولة المنشورات على فيسبوك وإنستجرام معًا.",
  },
  {
    id: "youtube-studio",
    name: "YouTube Studio",
    company: "Google",
    category: "social",
    url: "https://studio.youtube.com",
    description: "إدارة قناة يوتيوب ورفع الفيديوهات ومتابعة الأرباح والتحليلات.",
  },
  {
    id: "google-business",
    name: "Google Business Profile",
    company: "Google",
    category: "social",
    url: "https://business.google.com",
    description: "نشر التحديثات والمنشورات والعروض مباشرة عبر بحث وخرائط جوجل.",
  },
  {
    id: "x-twitter",
    name: "X (Twitter)",
    company: "X Corp",
    category: "social",
    url: "https://x.com",
    description: "نشر التغريدات السريعة والأخبار والمحتوى النصي والمرئي.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    company: "Microsoft",
    category: "social",
    url: "https://www.linkedin.com",
    description: "الشبكة المهنية لنشر المقالات والأعمال وبناء الحضور الوظيفي.",
  },
  {
    id: "threads",
    name: "Threads",
    company: "Meta",
    category: "social",
    url: "https://www.threads.net",
    description: "منصة المحادثات النصية والمنشورات القصيرة المرتبطة بإنستجرام.",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    company: "Snap",
    category: "social",
    url: "https://www.snapchat.com",
    description: "نشر القصص والمقاطع العمودية السريعة عبر سناب شات.",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    company: "Pinterest",
    category: "social",
    url: "https://www.pinterest.com",
    description: "نشر الدبابيس والصور الإبداعية والروابط لتوليد زيارات مستمرة.",
  },
];
