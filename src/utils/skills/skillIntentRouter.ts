import { feature } from 'bun:bundle'
import { logEvent } from '../../services/analytics/index.js'

/**
 * Skill intent routing — automatically map natural-language input to slash
 * commands based on semantic keyword matching.  Runs entirely locally (no
 * LLM side-query) so latency is negligible and it works offline.
 *
 * Architecture:
 * - Each skill declares a set of trigger patterns (keywords / phrases).
 * - User input is scored against every skill via a composite matcher.
 * - If the best score exceeds the confidence threshold, the input is
 *   rewritten to `/<skill> <originalInput>` and processed as a slash command.
 *
 * Thresholds:
 * - Exact phrase match  → score 1.0   (always routes)
 * - Word overlap        → score 0.5+  (routes if above threshold)
 * - No match            → score 0.0   (falls through to normal prompt)
 *
 * Disable via env: SKILL_INTENT_ROUTER=0
 * Tune threshold:   SKILL_INTENT_THRESHOLD=0.6  (default 0.55)
 */

/* ── Trigger Pattern Database ── */

export type SkillTrigger = {
  skill: string
  patterns: string[]
  description: string
}

/**
 * Built-in trigger patterns for bundled / common skills.
 * Users can extend this by placing a `.skill-intents.json` in their
 * ~/.claude/ directory (not yet implemented — extend here for now).
 */
const SKILL_TRIGGERS: readonly SkillTrigger[] = [
  {
    skill: 'brainstorming',
    patterns: [
      'brainstorm',
      '头脑风暴',
      '脑暴',
      '创意',
      '想法',
      'ideate',
      'explore idea',
      '发散思维',
      '想一些点子',
    ],
    description: 'Creative brainstorming and ideation',
  },
  {
    skill: 'chinese-code-review',
    patterns: [
      'code review',
      '审查代码',
      'review code',
      '代码审查',
      '审代码',
      'cr ',
      '/cr',
      '走查代码',
      '检查代码',
    ],
    description: 'Chinese code review',
  },
  {
    skill: 'chinese-commit-conventions',
    patterns: [
      'commit',
      '提交规范',
      'commit message',
      'changelog',
      '提交信息',
      'git commit',
      '规范提交',
    ],
    description: 'Chinese Git commit conventions',
  },
  {
    skill: 'chinese-documentation',
    patterns: [
      '写文档',
      'documentation',
      '技术文档',
      '写作规范',
      '文档写作',
      'readme',
      '写 readme',
    ],
    description: 'Chinese technical documentation',
  },
  {
    skill: 'chinese-git-workflow',
    patterns: [
      'git 工作流',
      'git workflow',
      '分支策略',
      '工作流规范',
      'git 规范',
      'gitee',
      'coding',
      'gitlab',
    ],
    description: 'Chinese Git workflow',
  },
  {
    skill: 'design-system',
    patterns: [
      'design system',
      '设计系统',
      '设计令牌',
      'design token',
      '组件规范',
      '幻灯片',
      'slide',
    ],
    description: 'Design system architecture',
  },
  {
    skill: 'dispatching-parallel-agents',
    patterns: [
      '并行',
      'parallel',
      '同时执行',
      '多个任务',
      '并行处理',
      '并行代理',
      '一起执行',
    ],
    description: 'Dispatch parallel agents',
  },
  {
    skill: 'executing-plans',
    patterns: [
      '执行计划',
      '实施计划',
      '按计划执行',
      '执行方案',
    ],
    description: 'Execute written plans',
  },
  {
    skill: 'finishing-a-development-branch',
    patterns: [
      '完成开发',
      '收尾',
      '合并分支',
      '结束开发',
      'finish branch',
      '开发收尾',
      '结束工作',
    ],
    description: 'Finish development branch',
  },
  {
    skill: 'frontend-design',
    patterns: [
      '前端设计',
      'ui 设计',
      '界面设计',
      'frontend design',
      '网页设计',
      '页面设计',
      'web design',
    ],
    description: 'Frontend interface design',
  },
  {
    skill: 'mcp-builder',
    patterns: [
      'mcp',
      '构建 mcp',
      'mcp 服务器',
      'mcp server',
      'mcp 工具',
      'model context protocol',
    ],
    description: 'MCP server builder',
  },
  {
    skill: 'receiving-code-review',
    patterns: [
      '收到审查',
      '处理反馈',
      'review 反馈',
      '代码反馈',
      '评审意见',
    ],
    description: 'Receiving code review feedback',
  },
  {
    skill: 'requesting-code-review',
    patterns: [
      '请求审查',
      '发起 cr',
      '发起 review',
      '请求 code review',
      '请人审查',
    ],
    description: 'Requesting code review',
  },
  {
    skill: 'subagent-driven-development',
    patterns: [
      '子代理',
      'subagent',
      '子智能体',
      '多代理',
      'multi agent',
    ],
    description: 'Subagent-driven development',
  },
  {
    skill: 'svg-design',
    patterns: [
      'svg',
      '图标设计',
      'logo',
      '矢量图',
      'svg 动画',
      'icon',
      '矢量图标',
    ],
    description: 'SVG design',
  },
  {
    skill: 'systematic-debugging',
    patterns: [
      '调试',
      'debug',
      '排查问题',
      'bug',
      '定位问题',
      ' troubleshooting',
      '修复 bug',
      '找 bug',
    ],
    description: 'Systematic debugging',
  },
  {
    skill: 'test-driven-development',
    patterns: [
      'tdd',
      '测试驱动',
      '先写测试',
      'test driven',
      '单元测试',
      '测试先行',
    ],
    description: 'Test-driven development',
  },
  {
    skill: 'ui-ux-pro-max',
    patterns: [
      'ui/ux',
      '界面优化',
      '用户体验',
      'ux 设计',
      'ui 优化',
      '交互设计',
      '审查 ui',
      '检查界面',
      'gui',
      'glassmorphism',
      '配色',
    ],
    description: 'UI/UX pro max design',
  },
  {
    skill: 'using-git-worktrees',
    patterns: [
      'git worktree',
      'worktree',
      '隔离开发',
      '并行开发',
      '多个工作区',
    ],
    description: 'Git worktrees',
  },
  {
    skill: 'using-superpowers',
    patterns: [
      'superpowers',
      '技能使用',
      '怎么用 skill',
      'skill 怎么用',
      '使用技能',
      '有哪些技能',
      '有什么 skill',
    ],
    description: 'Using superpowers/skills',
  },
  {
    skill: 'verification-before-completion',
    patterns: [
      '验证',
      '检查完成',
      '确认完成',
      '验证通过',
      '完成检查',
      '验收',
    ],
    description: 'Verification before completion',
  },
  {
    skill: 'workflow-runner',
    patterns: [
      'workflow',
      '工作流',
      'yaml 工作流',
      'agency orchestrator',
      '运行工作流',
      '执行 workflow',
    ],
    description: 'Workflow runner',
  },
  {
    skill: 'writing-plans',
    patterns: [
      '写计划',
      '制定计划',
      '做规划',
      '写方案',
      '实施方案',
      '开发计划',
    ],
    description: 'Writing implementation plans',
  },
  {
    skill: 'writing-skills',
    patterns: [
      '创建 skill',
      '写 skill',
      '创建技能',
      '自定义 skill',
      'skill 开发',
      '新技能',
    ],
    description: 'Writing skills',
  },
  {
    skill: 'kimi-cli-help',
    patterns: [
      'kimi 帮助',
      'kimi 怎么用',
      'cli 帮助',
      '快捷键',
      'keyboard shortcut',
      'mcp 集成',
      'provider',
      '环境变量',
    ],
    description: 'Kimi CLI help',
  },
  {
    skill: 'skill-creator',
    patterns: [
      'skill creator',
      '技能创建器',
      'skill 指南',
      'skill 教程',
    ],
    description: 'Skill creator guide',
  },
  {
    skill: 'frontend-design',
    patterns: [
      '构建网页',
      'landing page',
      'dashboard',
      'react component',
      'html css',
      '海报',
      'artifact',
    ],
    description: 'Frontend design (creative)',
  },
]

/* ── Scoring Engine ── */

const DEFAULT_THRESHOLD = 0.55

function getThreshold(): number {
  const env = process.env.SKILL_INTENT_THRESHOLD
  if (!env) return DEFAULT_THRESHOLD
  const n = Number.parseFloat(env)
  return Number.isNaN(n) ? DEFAULT_THRESHOLD : Math.max(0.1, Math.min(1.0, n))
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\-_]+/g, ' ')
    .trim()
}

function tokenize(text: string): Set<string> {
  return new Set(normalize(text).split(/\s+/).filter(Boolean))
}

/**
 * Compute Jaccard similarity between two token sets.
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const x of a) {
    if (b.has(x)) intersection++
  }
  return intersection / (a.size + b.size - intersection)
}

/**
 * Score a single pattern against user input.
 * Returns 0.0–1.0.
 */
function scorePattern(input: string, pattern: string): number {
  const nInput = normalize(input)
  const nPattern = normalize(pattern)

  // Exact substring match (highest confidence)
  if (nInput.includes(nPattern)) {
    // Longer patterns matched in full are stronger signals
    const coverage = nPattern.length / Math.max(nInput.length, 1)
    return 0.7 + 0.3 * coverage
  }

  // Token-level Jaccard for partial overlap
  const inputTokens = tokenize(input)
  const patternTokens = tokenize(pattern)
  const sim = jaccard(inputTokens, patternTokens)
  return sim * 0.6 // cap at 0.6 for non-exact matches
}

/**
 * Score a skill against user input.
 * Returns the maximum score across all patterns.
 */
function scoreSkill(input: string, trigger: SkillTrigger): number {
  let best = 0
  for (const pattern of trigger.patterns) {
    const s = scorePattern(input, pattern)
    if (s > best) best = s
  }
  return best
}

/* ── Public API ── */

export type IntentRouterResult =
  | { matched: true; skill: string; score: number; rewrittenInput: string }
  | { matched: false }

/**
 * Analyze user input and route to the best-matching skill if confidence
 * exceeds the threshold.
 *
 * @param input Raw user input (non-slash-command, non-empty)
 */
export function routeSkillIntent(input: string): IntentRouterResult {
  if (!feature('SKILL_INTENT_ROUTER')) return { matched: false }
  if (process.env.SKILL_INTENT_ROUTER === '0') return { matched: false }

  const trimmed = input.trim()
  if (trimmed.length < 3) return { matched: false }

  const threshold = getThreshold()
  let bestSkill = ''
  let bestScore = 0

  for (const trigger of SKILL_TRIGGERS) {
    const score = scoreSkill(trimmed, trigger)
    if (score > bestScore) {
      bestScore = score
      bestSkill = trigger.skill
    }
  }

  if (bestScore >= threshold) {
    logEvent('tengu_skill_intent_route', {
      score: Math.round(bestScore * 100),
      threshold: Math.round(threshold * 100),
    })
    return {
      matched: true,
      skill: bestSkill,
      score: bestScore,
      rewrittenInput: `/${bestSkill} ${trimmed}`,
    }
  }

  return { matched: false }
}

/**
 * Preview which skill (if any) would match, without rewriting.
 * Useful for UI hints (e.g. "Press Enter to invoke /brainstorming").
 */
export function previewSkillIntent(input: string): {
  skill: string | null
  score: number
} {
  if (!feature('SKILL_INTENT_ROUTER')) return { skill: null, score: 0 }
  if (process.env.SKILL_INTENT_ROUTER === '0') return { skill: null, score: 0 }

  const trimmed = input.trim()
  if (trimmed.length < 3) return { skill: null, score: 0 }

  let bestSkill = ''
  let bestScore = 0

  for (const trigger of SKILL_TRIGGERS) {
    const score = scoreSkill(trimmed, trigger)
    if (score > bestScore) {
      bestScore = score
      bestSkill = trigger.skill
    }
  }

  return { skill: bestSkill || null, score: bestScore }
}
