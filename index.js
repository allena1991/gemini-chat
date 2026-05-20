const express = require('express');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const categories = [
  { id: 'in-conclusion', name: 'In-Conclusion Framing', patterns: [/\bin conclusion\b/gi, /\bto conclude\b/gi, /\bin summary\b/gi] },
  { id: 'furthermore', name: 'Transition Overuse', patterns: [/\bfurthermore\b/gi, /\bmoreover\b/gi, /\badditionally\b/gi] },
  { id: 'delve', name: 'Delve Verb', patterns: [/\bdelve\b/gi, /\bdelves\b/gi, /\bdelving\b/gi] },
  { id: 'tapestry', name: 'Tapestry Metaphor', patterns: [/\btapestry\b/gi, /\bintricately woven\b/gi] },
  { id: 'landscape', name: 'Landscape Cliche', patterns: [/\b(?:digital|modern|evolving|dynamic) landscape\b/gi] },
  { id: 'crucial', name: 'Crucial/Paramount Intensifiers', patterns: [/\bcrucial\b/gi, /\bparamount\b/gi, /\bvital\b/gi] },
  { id: 'embark', name: 'Embark/Journey Framing', patterns: [/\bembark\b/gi, /\bjourney\b/gi, /\bnavigate\b/gi] },
  { id: 'unlock', name: 'Unlock Potential Framing', patterns: [/\bunlock(?:ing)?\b/gi, /\bpotential\b/gi] },
  { id: 'realm', name: 'Realm Terminology', patterns: [/\brealm\b/gi, /\bsphere\b/gi, /\bdomain\b/gi] },
  { id: 'elevate', name: 'Elevate/Leverage Business-speak', patterns: [/\belevate\b/gi, /\bleverage\b/gi, /\benhance\b/gi] },
  { id: 'underscore', name: 'Underscore/Highlight Verbs', patterns: [/\bunderscore\b/gi, /\bhighlights?\b/gi] },
  { id: 'testament', name: 'Testament Construction', patterns: [/\ba testament to\b/gi] },
  { id: 'seamless', name: 'Seamless Adjective', patterns: [/\bseamless\b/gi, /\beffortless\b/gi] },
  { id: 'robust', name: 'Robust Solution Cliche', patterns: [/\brobust\b/gi, /\bcomprehensive\b/gi] },
  { id: 'it-is-important', name: 'It Is Important To', patterns: [/\bit is important to\b/gi, /\bit is essential to\b/gi] },
  { id: 'not-only-but-also', name: 'Not Only...But Also', patterns: [/\bnot only\b[\s\S]{0,50}?\bbut also\b/gi] },
  { id: 'today-world', name: 'In Today\'s World', patterns: [/\bin today'?s world\b/gi, /\bin the modern era\b/gi] },
  { id: 'whether-you', name: 'Whether You\'re...', patterns: [/\bwhether you(?: are|'re)\b/gi] },
  { id: 'let-us', name: 'Let\'s Explore Prompting', patterns: [/\blet'?s explore\b/gi, /\blet'?s dive in\b/gi] },
  { id: 'overall', name: 'Overall/Ultimately Wrap-up', patterns: [/\boverall\b/gi, /\bultimately\b/gi] },
  { id: 'repetitive-hedging', name: 'Hedging Fillers', patterns: [/\bit is worth noting that\b/gi, /\barguably\b/gi, /\bnotably\b/gi] },
];

const replacements = [
  ['in conclusion', ''], ['to conclude', ''], ['in summary', ''], ['furthermore', 'also'], ['moreover', 'also'],
  ['additionally', 'also'], ['delve into', 'look at'], ['delve', 'look'], ['tapestry', 'mix'], ['intricately woven', 'connected'],
  ['landscape', 'environment'], ['crucial', 'important'], ['paramount', 'important'], ['vital', 'important'], ['embark on', 'start'],
  ['journey', 'process'], ['navigate', 'handle'], ['unlock', 'use'], ['potential', 'opportunity'], ['realm', 'area'],
  ['sphere', 'area'], ['domain', 'field'], ['elevate', 'improve'], ['leverage', 'use'], ['enhance', 'improve'],
  ['underscore', 'show'], ['highlights', 'shows'], ['highlight', 'show'], ['a testament to', 'evidence of'], ['seamless', 'smooth'],
  ['effortless', 'simple'], ['robust', 'solid'], ['comprehensive', 'thorough'], ['it is important to', 'you should'],
  ['it is essential to', 'you should'], ['not only', ''], ['but also', 'and'], ["in today's world", 'today'], ['in the modern era', 'today'],
  ["whether you're", 'if you are'], ['let\'s explore', 'here is'], ["let's dive in", 'here is'], ['overall', ''], ['ultimately', ''],
];

function detect(text) {
  const flags = [];
  for (const cat of categories) {
    let hits = 0;
    const highlights = [];
    for (const pattern of cat.patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        hits += 1;
        highlights.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
      }
    }
    const confidence = Math.min(0.99, hits === 0 ? 0 : 0.2 + hits * 0.16);
    flags.push({ id: cat.id, name: cat.name, hits, confidence, highlights });
  }
  return flags;
}

function rewriteText(text) {
  let rewritten = text;
  for (const [from, to] of replacements) {
    rewritten = rewritten.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), to);
  }
  rewritten = rewritten.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
  return rewritten;
}

function detectabilityScore(flags) {
  const total = flags.reduce((sum, flag) => sum + flag.hits * flag.confidence, 0);
  return Math.min(100, Math.round(total * 8));
}

app.post('/api/audit', (req, res) => {
  const { text = '' } = req.body || {};
  const originalFlags = detect(text);
  const rewritten = rewriteText(text);
  const rewrittenFlags = detect(rewritten);

  res.json({
    categories: categories.length,
    replacementRules: replacements.length,
    original: {
      text,
      flags: originalFlags,
      detectability: detectabilityScore(originalFlags),
    },
    rewritten: {
      text: rewritten,
      flags: rewrittenFlags,
      detectability: detectabilityScore(rewrittenFlags),
    },
  });
});

app.get('*', (_req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

app.listen(3000, () => {
  console.log('AI Writing Auditor listening on http://localhost:3000');
});
