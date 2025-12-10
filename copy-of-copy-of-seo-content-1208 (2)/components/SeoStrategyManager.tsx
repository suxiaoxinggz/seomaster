import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { RobotIcon, GlobeIcon, DocumentIcon, DownloadIcon, CheckIcon, DatabaseIcon, WandIcon } from './icons';
import { RobotsRule, SitemapEntry, LlmsTxtConfig, SeoGlobalConfig, JsonLdConfig } from '../types';
import { toast } from 'react-hot-toast';

// --- Helper Functions ---

const downloadFile = (content: string, filename: string, type: string = 'text/plain') => {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const generateRobotsTxt = (rules: RobotsRule[], sitemaps: string[]): string => {
    let content = '';
    rules.forEach(rule => {
        content += `User-agent: ${rule.userAgent}\n`;
        rule.allow.forEach(path => content += `Allow: ${path}\n`);
        rule.disallow.forEach(path => content += `Disallow: ${path}\n`);
        content += '\n';
    });
    sitemaps.forEach(url => content += `Sitemap: ${url}\n`);
    return content;
};

const generateRobotsTsCode = (rules: RobotsRule[], sitemaps: string[]): string => {
    const rulesString = JSON.stringify(rules, null, 4).replace(/"([^"]+)":/g, '$1:'); // Simple cleanup
    const sitemapsString = JSON.stringify(sitemaps, null, 4);
    
    return `// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: ${rulesString},
    sitemap: ${sitemapsString},
  };
}`;
};

const generateSitemapXml = (entries: SitemapEntry[]): string => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    entries.forEach(entry => {
        xml += `  <url>\n    <loc>${entry.url}</loc>\n    <lastmod>${new Date().toISOString()}</lastmod>\n    <changefreq>${entry.changeFrequency}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>\n`;
    });
    xml += `</urlset>`;
    return xml;
};

const generateSitemapTsCode = (entries: SitemapEntry[]): string => {
    const entriesCode = entries.map(e => `    {
      url: "${e.url}",
      lastModified: new Date(),
      changeFrequency: "${e.changeFrequency}",
      priority: ${e.priority},
    }`).join(',\n');

    return `// app/sitemap.ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
${entriesCode}
  ];
}`;
};

const generateLlmsTxt = (config: LlmsTxtConfig): string => {
    let content = `# ${config.projectName}\n\n> ${config.summary}\n\n## Introduction\n\n${config.intro}\n\n## Documentation\n\n`;
    config.docs.forEach(doc => {
        content += `- [${doc.title}](${doc.url})\n`;
    });
    return content;
};

// --- Components ---

const GlobalConfigTab: React.FC = () => {
    const [config, setConfig] = useState<SeoGlobalConfig>({
        siteName: 'Mistorify | Practical Tools for Amazon & DTC',
        baseUrl: 'https://mistorify.com',
        titleTemplate: '%s | Mistorify',
        defaultDescription: 'Mistorify provides practical tools and guides for Amazon FBA and independent stores, including 2026 rule-ready calculators.',
        twitterHandle: '@mistorify'
    });

    const generateLayoutCode = () => {
        return `
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("${config.baseUrl}"),
  title: {
    default: "${config.siteName}",
    template: "${config.titleTemplate}",
  },
  description:
    "${config.defaultDescription}",
  openGraph: {
    siteName: "Mistorify",
    type: "website",
    locale: "en_US",
    url: "${config.baseUrl}",
  },
  twitter: {
    card: "summary_large_image",
    // site: "${config.twitterHandle}",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
        `.trim();
    };

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Global Metadata Configuration (App Router)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Site Name (Default Title)" value={config.siteName} onChange={e => setConfig({...config, siteName: e.target.value})} />
                    <Input label="Base URL (metadataBase)" value={config.baseUrl} onChange={e => setConfig({...config, baseUrl: e.target.value})} />
                    <Input label="Title Template (%s)" value={config.titleTemplate} onChange={e => setConfig({...config, titleTemplate: e.target.value})} />
                    <Input label="Twitter Handle (Optional)" value={config.twitterHandle} onChange={e => setConfig({...config, twitterHandle: e.target.value})} />
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Default Description</label>
                        <textarea 
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 text-sm"
                            value={config.defaultDescription} 
                            onChange={e => setConfig({...config, defaultDescription: e.target.value})} 
                        />
                    </div>
                </div>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-blue-400">Generated app/layout.tsx Code</h4>
                    <Button size="sm" variant="secondary" onClick={() => {navigator.clipboard.writeText(generateLayoutCode()); toast.success("Copied!");}}>Copy Code</Button>
                </div>
                <pre className="text-xs text-gray-300 font-mono overflow-x-auto p-4 bg-black/50 rounded-lg border border-gray-700">
                    {generateLayoutCode()}
                </pre>
            </Card>
        </div>
    );
};

const TechSeoTab: React.FC = () => {
    const context = useContext(AppContext);
    const { articles } = context || { articles: [] };

    // Robots State
    const [rules, setRules] = useState<RobotsRule[]>([
        { userAgent: '*', allow: ['/'], disallow: ['/api/', '/internal/', '/admin/'] }
    ]);
    const [sitemaps, setSitemaps] = useState([
        'https://mistorify.com/sitemap.xml',
        'https://fbatool.mistorify.com/sitemap.xml'
    ]);

    // Sitemap State
    const [sitemapEntries, setSitemapEntries] = useState<SitemapEntry[]>([
        { url: 'https://mistorify.com/', priority: 1.0, changeFrequency: 'weekly' },
        { url: 'https://fbatool.mistorify.com/', priority: 0.9, changeFrequency: 'weekly' },
        { url: 'https://fbatool.mistorify.com/fba-2026-calculator', priority: 1.0, changeFrequency: 'weekly' }
    ]);

    // LLMs.txt State
    const [llmsConfig, setLlmsConfig] = useState<LlmsTxtConfig>({
        projectName: 'Mistorify',
        summary: 'Practical tools for Amazon FBA & DTC sellers, including 2026 FBA Fee Calculator.',
        intro: 'Mistorify offers calculators, guides, and data tools for e-commerce professionals. The core tool is the privacy-first FBA Fee Calculator updated for 2026 rules.',
        docs: [
            { title: '2026 FBA Calculator', url: 'https://fbatool.mistorify.com/fba-2026-calculator' },
            { title: 'Size Tier Guides', url: 'https://mistorify.com/docs/size-tiers' },
            { title: 'Fee API', url: 'https://mistorify.com/docs/api' }
        ]
    });

    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

    const handleDownloadRobots = () => downloadFile(generateRobotsTxt(rules, sitemaps), 'robots.txt');
    const handleDownloadSitemap = () => downloadFile(generateSitemapXml(sitemapEntries), 'sitemap.xml', 'application/xml');
    const handleDownloadLlms = () => downloadFile(generateLlmsTxt(llmsConfig), 'llms.txt', 'text/markdown');

    // --- Database Integration Handlers ---
    const handleSyncSitemap = () => {
        if (!articles || articles.length === 0) {
            toast.error("No articles found in database.");
            return;
        }
        
        const baseUrl = 'https://mistorify.com/blog'; // Default base
        const newEntries = articles.map(article => ({
            url: `${baseUrl}/${article.id}`, // Simplified slug generation
            priority: 0.8,
            changeFrequency: 'monthly' as const
        }));

        setSitemapEntries(prev => {
            // Merge unique URLs
            const existingUrls = new Set(prev.map(e => e.url));
            const uniqueNew = newEntries.filter(e => !existingUrls.has(e.url));
            return [...prev, ...uniqueNew];
        });
        
        toast.success(`Synced ${newEntries.length} articles to Sitemap!`);
    };

    const handleSyncLlms = () => {
        if (!articles || articles.length === 0) {
            toast.error("No articles found in database.");
            return;
        }

        const baseUrl = 'https://mistorify.com/blog';
        const newDocs = articles.map(article => ({
            title: article.title,
            url: `${baseUrl}/${article.id}`
        }));

        setLlmsConfig(prev => {
            const existingUrls = new Set(prev.docs.map(d => d.url));
            const uniqueNew = newDocs.filter(d => !existingUrls.has(d.url));
            return {
                ...prev,
                docs: [...prev.docs, ...uniqueNew]
            };
        });

        toast.success(`Synced ${newDocs.length} articles to LLMs.txt!`);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2 flex justify-end mb-2">
                <div className="bg-gray-800 rounded p-1 flex">
                    <button onClick={() => setViewMode('preview')} className={`px-3 py-1 text-xs rounded ${viewMode === 'preview' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>File Preview</button>
                    <button onClick={() => setViewMode('code')} className={`px-3 py-1 text-xs rounded ${viewMode === 'code' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Next.js Code</button>
                </div>
            </div>

            {/* Robots.txt / robots.ts */}
            <Card className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <RobotIcon className="w-5 h-5" /> 
                        {viewMode === 'code' ? 'app/robots.ts' : 'robots.txt'}
                    </h3>
                    <div className="flex gap-2">
                        {viewMode === 'code' && (
                            <Button size="sm" variant="secondary" onClick={() => {navigator.clipboard.writeText(generateRobotsTsCode(rules, sitemaps)); toast.success("Copied TS code!");}}>Copy TS</Button>
                        )}
                        <Button size="sm" onClick={handleDownloadRobots}><DownloadIcon className="w-4 h-4 mr-1"/> Download .txt</Button>
                    </div>
                </div>
                
                {viewMode === 'preview' ? (
                    <div className="space-y-3">
                        {rules.map((rule, idx) => (
                            <div key={idx} className="p-3 bg-gray-900 rounded border border-gray-700 text-sm">
                                <p className="text-blue-300 font-mono">User-agent: {rule.userAgent}</p>
                                <p className="text-green-400 font-mono">Allow: {rule.allow.join(', ')}</p>
                                <p className="text-red-400 font-mono">Disallow: {rule.disallow.join(', ')}</p>
                            </div>
                        ))}
                        <div className="p-3 bg-gray-900 rounded border border-gray-700 text-sm">
                            <p className="text-gray-400 mb-1 font-semibold">Sitemaps:</p>
                            {sitemaps.map(s => <p key={s} className="text-yellow-400 font-mono">{s}</p>)}
                        </div>
                    </div>
                ) : (
                    <pre className="text-xs text-gray-300 font-mono overflow-auto p-4 bg-black/50 rounded-lg border border-gray-700 h-64">
                        {generateRobotsTsCode(rules, sitemaps)}
                    </pre>
                )}
            </Card>

            {/* Sitemap.xml / sitemap.ts */}
            <Card className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <GlobeIcon className="w-5 h-5" /> 
                        {viewMode === 'code' ? 'app/sitemap.ts' : 'sitemap.xml'}
                    </h3>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={handleSyncSitemap} className="text-teal-400 border-teal-500/30 bg-teal-900/10">
                            <DatabaseIcon className="w-4 h-4 mr-1" />
                            从数据库同步
                        </Button>
                        {viewMode === 'code' && (
                            <Button size="sm" variant="secondary" onClick={() => {navigator.clipboard.writeText(generateSitemapTsCode(sitemapEntries)); toast.success("Copied TS code!");}}>Copy TS</Button>
                        )}
                        <Button size="sm" onClick={handleDownloadSitemap}><DownloadIcon className="w-4 h-4 mr-1"/> .xml</Button>
                    </div>
                </div>

                {viewMode === 'preview' ? (
                    <div className="max-h-64 overflow-y-auto bg-gray-900 rounded border border-gray-700 p-2">
                        {sitemapEntries.map((entry, i) => (
                            <div key={i} className="flex justify-between text-xs py-2 border-b border-gray-800 last:border-0 hover:bg-gray-800/50 px-2">
                                <span className="text-gray-300 truncate w-2/3" title={entry.url}>{entry.url}</span>
                                <span className="text-gray-500 font-mono">{entry.priority} ({entry.changeFrequency})</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <pre className="text-xs text-gray-300 font-mono overflow-auto p-4 bg-black/50 rounded-lg border border-gray-700 h-64">
                        {generateSitemapTsCode(sitemapEntries)}
                    </pre>
                )}
            </Card>

            {/* LLMs.txt */}
            <Card className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><DatabaseIcon className="w-5 h-5" /> LLMs.txt</h3>
                        <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded border border-green-800">AI Crawler Optimized</span>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={handleSyncLlms} className="text-teal-400 border-teal-500/30 bg-teal-900/10">
                            <WandIcon className="w-4 h-4 mr-1" />
                            Sync Docs from Articles
                        </Button>
                        <Button size="sm" onClick={handleDownloadLlms}><DownloadIcon className="w-4 h-4 mr-1"/> Download public/llms.txt</Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <Input label="Project Name" value={llmsConfig.projectName} onChange={e => setLlmsConfig({...llmsConfig, projectName: e.target.value})} />
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Short Summary (For context window)</label>
                            <textarea 
                                className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-gray-300 h-20 resize-none"
                                value={llmsConfig.summary}
                                onChange={e => setLlmsConfig({...llmsConfig, summary: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Introduction (Detailed)</label>
                            <textarea 
                                className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-gray-300 h-32"
                                value={llmsConfig.intro}
                                onChange={e => setLlmsConfig({...llmsConfig, intro: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col">
                        <h4 className="text-sm font-bold text-gray-400 mb-2">File Preview</h4>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono flex-1 overflow-auto">{generateLlmsTxt(llmsConfig)}</pre>
                    </div>
                </div>
            </Card>
        </div>
    );
};

const StructuredDataTab: React.FC = () => {
    const [pagePath, setPagePath] = useState('/fba-2026-calculator');
    const [appName, setAppName] = useState('Mistorify 2026 FBA Fee Calculator');
    const [appDesc, setAppDesc] = useState('A privacy-first Amazon FBA calculator to classify 2026 size tiers and estimate fulfillment fees based on dimension and unit-weight rules.');
    
    // FAQ State
    const [faqs, setFaqs] = useState<{q: string, a: string}[]>([
        { q: "Does the calculator check both dimensions and unit weight?", a: "Yes. It validates Amazon 2026 size-tier thresholds using both dimension rules and unit-weight rules, and flags oversize edge cases." },
        { q: "Is my data uploaded to the server?", a: "No. Calculation runs locally in your browser to protect seller data privacy." }
    ]);

    const generateSoftwareJsonLd = () => {
        return JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": appName,
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": appDesc,
            "url": `https://fbatool.mistorify.com${pagePath}`,
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
        }, null, 2);
    };

    const generateFaqJsonLd = () => {
        return JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(f => ({
                "@type": "Question",
                "name": f.q,
                "acceptedAnswer": { "@type": "Answer", "text": f.a }
            }))
        }, null, 2);
    };

    const generateComponentCode = () => {
        return `
// components/seo/SoftwareAppLd.tsx
export function SoftwareAppLd() {
  const jsonLd = ${generateSoftwareJsonLd()};

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// components/seo/FaqLd.tsx
export function FaqLd() {
  const faqLd = ${generateFaqJsonLd()};

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
    />
  );
}
        `.trim();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Page Configuration</h3>
                    <Input label="Page Path" value={pagePath} onChange={e => setPagePath(e.target.value)} />
                </Card>

                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">SoftwareApplication Schema</h3>
                    <div className="space-y-3">
                        <Input label="App Name" value={appName} onChange={e => setAppName(e.target.value)} />
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                            <textarea 
                                className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-gray-300 h-24"
                                value={appDesc}
                                onChange={e => setAppDesc(e.target.value)}
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">FAQ Schema</h3>
                    {faqs.map((f, i) => (
                        <div key={i} className="mb-4 pb-4 border-b border-gray-700 last:border-0">
                            <Input label={`Question ${i+1}`} value={f.q} onChange={e => {
                                const newFaqs = [...faqs];
                                newFaqs[i].q = e.target.value;
                                setFaqs(newFaqs);
                            }} className="mb-2" />
                            <textarea 
                                className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={f.a} 
                                onChange={e => {
                                const newFaqs = [...faqs];
                                newFaqs[i].a = e.target.value;
                                setFaqs(newFaqs);
                            }} rows={3} placeholder="Answer" />
                        </div>
                    ))}
                    <Button size="sm" variant="secondary" onClick={() => setFaqs([...faqs, {q:'', a:''}])}>Add Question</Button>
                </Card>
            </div>

            <div className="flex flex-col gap-6">
                <Card className="flex-1 bg-gray-900 border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-purple-400">React Component Code</h4>
                        <Button size="sm" variant="secondary" onClick={() => {navigator.clipboard.writeText(generateComponentCode()); toast.success("Copied!");}}>Copy Components</Button>
                    </div>
                    <pre className="text-xs text-gray-300 font-mono overflow-auto p-4 bg-black/50 rounded-lg border border-gray-700 h-[600px]">
                        {generateComponentCode()}
                    </pre>
                </Card>
            </div>
        </div>
    );
};

const ContentStructureTab: React.FC = () => {
    // This is a static generator based on the prompt's requirement for Server-Side Rendered content structure
    const semanticStructure = `
// app/(tool)/fba-2026-calculator/page.tsx
import { SoftwareAppLd } from "@/components/seo/SoftwareAppLd";
import { FaqLd } from "@/components/seo/FaqLd";
import CalculatorClient from "./CalculatorClient";

export const metadata = {
  title: "2026 FBA Fee Calculator",
  description:
    "Calculate Amazon 2026 FBA fees, detect size tier traps, and validate dimensional and unit-weight thresholds with privacy-first local processing.",
  alternates: {
    canonical: "https://fbatool.mistorify.com/fba-2026-calculator",
  },
  openGraph: {
    title: "2026 FBA Fee Calculator | Mistorify",
    description:
      "Accurately classify 2026 size tiers and estimate FBA costs with edge-case warnings.",
    url: "https://fbatool.mistorify.com/fba-2026-calculator",
    siteName: "Mistorify",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "2026 FBA Fee Calculator | Mistorify",
    description:
      "Calculate 2026 FBA fees and detect oversize risks.",
  },
};

export default function Page() {
  return (
    <>
      <SoftwareAppLd />
      <FaqLd />

      {/* 交互区 client */}
      <CalculatorClient />

      {/* 说明区 server - MUST BE VISIBLE FOR SEO */}
      <section className="prose prose-invert max-w-4xl mx-auto mt-12 px-4">
        <h2>What this calculator does</h2>
        <p>
          This calculator helps Amazon sellers accurately estimate 2026 FBA fees by processing...
        </p>
        
        <h3>How to use</h3>
        <ol>
          <li>Enter product dimensions (L x W x H) and unit weight.</li>
          <li>Select your product category to determine referral fees.</li>
          <li>Review the size tier classification and estimated fees.</li>
        </ol>

        <h3>2026 rules coverage</h3>
        <p>
          We have updated our algorithms to reflect the latest 2026 policies, including...
        </p>

        <h3>Edge cases</h3>
        <ul>
          <li><strong>Oversize items:</strong> Be aware of the new dimensional weight divisors...</li>
          <li><strong>Low-price mall:</strong> Special rates apply for items under...</li>
        </ul>

        <h3>FAQ</h3>
        <details>
          <summary className="cursor-pointer font-medium">Does the calculator check both dimensions and unit weight?</summary>
          <p className="mt-2">Yes. It validates Amazon 2026 size-tier thresholds using both dimension rules and unit-weight rules, and flags oversize edge cases.</p>
        </details>
        <details>
          <summary className="cursor-pointer font-medium">Is my data uploaded to the server?</summary>
          <p className="mt-2">No. Calculation runs locally in your browser to protect seller data privacy.</p>
        </details>
      </section>
    </>
  );
}
    `.trim();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Semantic Content Strategy</h3>
                <p className="text-gray-400 text-sm mb-4">
                    For optimal SEO in Next.js 16, content must be rendered on the server. 
                    Ensure your tool pages include these semantic sections visible even without JavaScript.
                </p>
                <ul className="space-y-2 text-sm text-gray-300 list-disc pl-5">
                    <li><strong className="text-white">Overview:</strong> What the tool solves.</li>
                    <li><strong className="text-white">Steps:</strong> Ordered list of usage instructions.</li>
                    <li><strong className="text-white">Rules Coverage:</strong> Specific keyword targeting (e.g. "2026 FBA").</li>
                    <li><strong className="text-white">Edge Cases:</strong> Helpful content for complex scenarios.</li>
                    <li><strong className="text-white">FAQ:</strong> Accordion or list matching your Schema.</li>
                </ul>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-purple-400">Semantic Page Template (page.tsx)</h4>
                    <Button size="sm" variant="secondary" onClick={() => {navigator.clipboard.writeText(semanticStructure); toast.success("Copied!");}}>Copy Code</Button>
                </div>
                <pre className="text-xs text-gray-300 font-mono overflow-auto p-4 bg-black/50 rounded-lg border border-gray-700 h-96">
                    {semanticStructure}
                </pre>
            </Card>
        </div>
    );
};

const SeoStrategyManager: React.FC = () => {
    // Default to 'tech' to highlight Robots/LLMs
    const [activeTab, setActiveTab] = useState<'global' | 'tech' | 'data' | 'content'>('tech');

    return (
        <div className="p-8 h-full flex flex-col">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <RobotIcon className="w-8 h-8 text-green-400" />
                SEO Strategy & Code Generator
            </h1>
            <p className="text-gray-400 mb-6">
                Manage your application's SEO strategy and generate Next.js 16 compatible configurations, metadata, and artifacts.
            </p>

            <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg border border-gray-700 w-fit mb-6">
                {[
                    { id: 'global', label: 'Global Metadata', icon: <GlobeIcon className="w-4 h-4" /> },
                    { id: 'tech', label: 'Tech SEO (Robots/Maps)', icon: <RobotIcon className="w-4 h-4" /> },
                    { id: 'data', label: 'Structured Data', icon: <DatabaseIcon className="w-4 h-4" /> },
                    { id: 'content', label: 'Semantic Content', icon: <DocumentIcon className="w-4 h-4" /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === tab.id 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {activeTab === 'global' && <GlobalConfigTab />}
                {activeTab === 'tech' && <TechSeoTab />}
                {activeTab === 'data' && <StructuredDataTab />}
                {activeTab === 'content' && <ContentStructureTab />}
            </div>
        </div>
    );
};

export default SeoStrategyManager;