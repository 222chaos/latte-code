# 综合审评报告：Latte Code 改造计划 vs 实际完成状态

## 评审概述

对以下两个文档进行综合审评：
1. **Latte Code 认证机制改造方案** (LATTE_CODE_AUTH_PLAN.md)
2. **自定义模型接入改造指南** (docs/plan.md)

评审日期：2026-04-09

---

## 一、任务完成状态总览

| 任务编号 | 任务描述 | 计划来源 | 完成状态 | 完成度 |
|---------|---------|---------|---------|--------|
| 1 | 使用 subagent:code-explorer 复核影响面 | docs/plan.md | ❌ 未完成 | 0% |
| 2 | 扩展 config 与安全存储 | docs/plan.md | ✅ 已完成 | 100% |
| 3 | 实现 OpenAI-compatible adapter | docs/plan.md | ✅ 已完成 | 100% |
| 4 | 打通 providers/modelOptions/validateModel/status | docs/plan.md | ✅ 已完成 | 100% |
| 5 | 新增 /add-model 与接入 ConsoleOAuthFlow | docs/plan.md | ⚠️ 部分完成 | 70% |
| 6 | 回归验证 | docs/plan.md | ❌ 未完成 | 0% |
| 7 | 环境变量替换 (ANTHROPIC_* → LATTE_*) | LATTE_CODE_AUTH_PLAN.md | ❌ 未完成 | 0% |
| 8 | ConsoleOAuthFlow 默认状态改造 | LATTE_CODE_AUTH_PLAN.md | ❌ 未完成 | 20% |
| 9 | isAnthropicAuthEnabled() 门控 | LATTE_CODE_AUTH_PLAN.md | ❌ 未完成 | 0% |
| 10 | ApproveApiKey 审批页集成 | LATTE_CODE_AUTH_PLAN.md | ⚠️ 部分完成 | 50% |
| 11 | latteConfig 安全存储 | LATTE_CODE_AUTH_PLAN.md | ❌ 未完成 | 0% |
| 12 | 配置目录修改 (~/.claude → ~/.latte) | LATTE_CODE_AUTH_PLAN.md | ❌ 未完成 | 0% |
| 13 | Onboarding 流程改造 | LATTE_CODE_AUTH_PLAN.md | ❌ 未完成 | 0% |

---

## 二、详细审评结果

### ✅ 已完成的任务

#### 任务 2：扩展 config 与安全存储

**计划要求：**
- 增加自定义模型元数据类型与持久化字段
- 安全存储中的密钥
- 建立自定义模型配置解析层

**实际完成：**
```typescript
// src/utils/config.ts:187-195
export type CustomModelConfig = {
  name: string
  provider: CustomModelProvider
  baseURL: string
  model: string
  apiMode: OpenAICompatibleMode
  createdAt: number
  updatedAt: number
}

// src/utils/config.ts:594
customModels?: CustomModelConfig[]

// src/utils/customApiStorage.ts - 完整实现
- saveCustomModel()
- getSavedCustomModels()
- getResolvedCustomModelConfig()
- 环境变量合并逻辑
- 安全存储集成
```

**完成度：100%** ✅

---

#### 任务 3：实现 OpenAI-compatible adapter

**计划要求：**
- 实现 OpenAI-compatible fetch adapter
- 接入 client.ts
- 支持 Chat Completions 协议

**实际完成：**
```typescript
// src/services/api/openai-compatible-fetch-adapter.ts (827行)
- translateMessages()      // Anthropic → OpenAI 消息转换
- translateTools()         // 工具转换
- buildOpenAIChatCompletionsBody()
- translateOpenAIStreamToAnthropic()
- createOpenAICompatibleFetch()

// src/services/api/client.ts:311-328
if (openAISubMode === 'compatible') {
  const compatibleConfig = getResolvedCustomModelConfig(model)
  const compatibleFetch = createOpenAICompatibleFetch(compatibleConfig)
  // ... 创建 Anthropic 客户端并注入 adapter
}
```

**完成度：100%** ✅

---

#### 任务 4：打通 providers/modelOptions/validateModel/status

**计划要求：**
- 扩展 provider 与 openai 子模式判定
- 追加到模型列表
- 复用 validateModel 做兼容模型校验
- 状态面板展示

**实际完成：**
```typescript
// src/utils/model/providers.ts
- getOpenAISubMode()          // 检查自定义模型配置
- isOpenAICompatibleProvider()
- getAPIProvider()            // 支持 'openai' provider

// src/utils/model/modelOptions.ts:337, 540
getConfiguredCompatibleModelOptions()  // 注入自定义模型到列表

// src/utils/model/validateModel.ts:14, 136
getResolvedCustomModelConfig()         // 验证时使用自定义配置

// src/utils/status.tsx:244
getResolvedCustomModelConfig()         // 状态面板显示兼容配置
```

**完成度：100%** ✅

---

### ⚠️ 部分完成的任务

#### 任务 5：新增 /add-model 与接入 ConsoleOAuthFlow

**已完成部分：**
```typescript
// src/commands/add-model/index.ts - 命令定义 ✅
// src/commands/add-model/add-model.tsx - 命令实现 ✅
// src/components/CustomModelSetupFlow.tsx - 五步交互流程 ✅

// ConsoleOAuthFlow.tsx 中添加选项 ✅
{
  label: <Text>Custom API · <Text dimColor>OpenAI-compatible endpoint</Text></Text>,
  value: "custom_api"
}
```

**未完成部分：**

| 缺失项 | 当前状态 | 期望状态 |
|-------|---------|---------|
| 默认入口状态 | `'idle'` (OAuth 选择) | `'provider_select'` (API 格式选择) |
| `provider_select` 状态实现 | ❌ 不存在 | 需要实现完整 UI |
| `custom_config` 状态实现 | ❌ 不存在 | 需要三步输入流程 |
| 默认状态处理 | 仍显示 OAuth | 应显示 API 格式选择 |

**关键代码缺失：**
```typescript
// ConsoleOAuthFlow.tsx:77 - 当前代码
return { state: 'idle' }  // ❌ 仍是 OAuth 入口

// 应为：
return { state: 'provider_select' }  // ✅ 需要修改
```

**完成度：70%** ⚠️

---

#### 任务 10：ApproveApiKey 审批页集成

**已完成部分：**
- `src/components/ApproveApiKey.tsx` 组件存在 ✅
- Onboarding.tsx 中有 `api-key` 步骤 ✅

**未完成部分：**
- 审批页只检查 `ANTHROPIC_API_KEY`，不检查 `LATTE_API_KEY`
- Onboarding 入口逻辑未修改为优先检查 `LATTE_API_KEY`

**当前代码：**
```typescript
// Onboarding.tsx:98-109
const apiKeyNeedingApproval = useMemo(() => {
  // 只检查 ANTHROPIC_API_KEY
  if (!process.env.ANTHROPIC_API_KEY || isRunningOnHomespace()) {
    return ''
  }
  // ...
}, [])
```

**完成度：50%** ⚠️

---

### ❌ 未开始的任务

#### 任务 1：使用 subagent:code-explorer 复核影响面

**计划要求：**
- 复核命令注册、provider 判定、模型选项与鉴权调用链
- 输出准确的影响面清单

**实际状态：** 未执行

**影响：** 可能存在遗漏的联动文件未被发现

---

#### 任务 6：回归验证

**计划要求：**
- 验证 DeepSeek API 连接
- 验证 Ollama 本地模型
- 验证 OpenRouter 多模型
- 验证 Anthropic/Codex 原生路径（确保未破坏）

**实际状态：** 未执行

---

#### 任务 7：环境变量替换

**计划要求：**
| 原变量 | 新变量 | 状态 |
|-------|--------|------|
| `ANTHROPIC_API_KEY` | `LATTE_API_KEY` | ❌ 未替换 |
| `ANTHROPIC_BASE_URL` | `LATTE_BASE_URL` | ❌ 未替换 |
| `ANTHROPIC_MODEL` | `LATTE_MODEL` | ❌ 未替换 |
| `CLAUDE_CONFIG_DIR` | `LATTE_CONFIG_DIR` | ❌ 未替换 |

**当前代码状态：**
```typescript
// src/utils/customApiStorage.ts:15
const CUSTOM_MODEL_API_KEY_ENV = 'DOGE_API_KEY'  // ⚠️ 甚至不是 LATTE_API_KEY

// 全局仍使用 ANTHROPIC_* 变量
```

**影响：** 
- 品牌一致性缺失
- 与 Doge Code 方案偏离

---

#### 任务 8：ConsoleOAuthFlow 默认状态改造

**计划要求：**
- 默认状态从 `'idle'` 改为 `'provider_select'`
- 实现 `provider_select` 状态（API 格式选择）
- 实现 `custom_config` 状态（三步输入）

**实际状态：**
```typescript
// ConsoleOAuthFlow.tsx 第 66-80 行
type OAuthStatus = {
  state: 'idle';
} | {
  state: 'platform_setup';
} | {
  state: 'custom_api_setup';  // ← 仅信息展示，非配置收集
} | {
  state: 'ready_to_start';
}
// ❌ 缺少 'provider_select' 和 'custom_config'

// 默认状态
return { state: 'idle' }  // ❌ 未改为 'provider_select'
```

**完成内容：**
- 在 `idle` 状态的选择列表中添加了 "Custom API" 选项
- 添加了 `custom_api_setup` 状态（仅显示帮助信息）

**缺失内容：**
- 默认状态未改变
- 完整的 `provider_select` 状态实现
- 完整的 `custom_config` 三步输入实现

---

#### 任务 9：isAnthropicAuthEnabled() 门控

**计划要求：**
```typescript
export function isAnthropicAuthEnabled(): boolean {
  // 如果设置了 LATTE_API_KEY，禁用 Anthropic OAuth
  if (process.env[LATTE_API_KEY_ENV]) {
    return false
  }
  
  // 如果存在有效的自定义端点配置，也禁用
  if (getLatteConfig().hasValidConfig) {
    return false
  }
  
  return true
}
```

**实际状态：**
```typescript
// src/utils/auth.ts:101-152
export function isAnthropicAuthEnabled(): boolean {
  if (isBareMode()) return false
  
  // ❌ 没有检查 LATTE_API_KEY
  // ❌ 没有检查自定义配置
  
  const is3P = ... // 只检查 Bedrock/Vertex/Foundry/OpenAI
  const hasExternalAuthToken = process.env.ANTHROPIC_AUTH_TOKEN || ...
  const hasExternalApiKey = apiKeySource === 'ANTHROPIC_API_KEY' || ...
  
  const shouldDisableAuth = is3P || hasExternalAuthToken || hasExternalApiKey
  return !shouldDisableAuth
}
```

**关键缺失：**
- 不识别 `LATTE_API_KEY` 环境变量
- 不识别持久化的自定义模型配置

**影响：**
- 即使配置了自定义 API，仍可能尝试 OAuth 流程
- Onboarding 仍会显示 OAuth 步骤

---

#### 任务 11：latteConfig 安全存储

**计划要求：**
- 新建 `src/utils/latteConfig.ts`
- 定义 `LATTE_CONFIG_STORAGE_KEY = 'latteApiKeys'`
- 实现 `saveLatteConfig()` 和 `getLatteConfig()`
- 实现 `applyLatteConfigToEnv()`

**实际状态：**
- ❌ `src/utils/latteConfig.ts` 文件不存在
- ✅ 使用 `src/utils/customApiStorage.ts` 替代
- ⚠️ 存储 key 为 `'customModelApiKeys'` 而非 `'latteApiKeys'`
- ⚠️ 使用 `DOGE_API_KEY` 而非 `LATTE_API_KEY`

**对比：**
| 计划 | 实际 |
|------|------|
| `latteConfig.ts` | `customApiStorage.ts` |
| `'latteApiKeys'` | `'customModelApiKeys'` |
| `LATTE_API_KEY` | `DOGE_API_KEY` |

---

#### 任务 12：配置目录修改

**计划要求：**
```typescript
// ~/.claude → ~/.latte
export function getLatteConfigHomeDir(): string {
  return process.env.LATTE_CONFIG_DIR || join(homedir(), '.latte')
}

export function getGlobalLatteFile(): string {
  return join(getLatteConfigHomeDir(), 'latte.json')
}
```

**实际状态：**
```typescript
// src/utils/env.ts - 仍为原版
export function getClaudeConfigHomeDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
}

export function getGlobalClaudeFile(): string {
  return join(getClaudeConfigHomeDir(), 'claude.json')  // ❌ 未改为 .latte
}
```

**完成度：0%** ❌

---

#### 任务 13：Onboarding 流程改造

**计划要求：**
```
theme → provider_select → custom_config → security → [terminal-setup]
```

**实际状态：**
```
theme → [api-key approval] → [oauth] → security → [terminal-setup]
       ↑
   仍是 OAuth 流程！
```

**缺失步骤：**
1. ❌ `provider_select` 步骤（API 格式选择）
2. ❌ `custom_config` 步骤（三步输入 BaseURL/API Key/Model）
3. ❌ 步骤条件判断逻辑

**当前步骤构建代码：**
```typescript
// Onboarding.tsx:116-144
const steps: OnboardingStep[] = [];
if (oauthEnabled) {
  steps.push({ id: 'preflight', component: preflightStep });
}
steps.push({ id: 'theme', component: themeStep });
if (apiKeyNeedingApproval) {
  steps.push({ id: 'api-key', component: apiKeyStep });
}
if (oauthEnabled) {
  steps.push({ id: 'oauth', component: oauthStep });
}
steps.push({ id: 'security', component: securityStep });
```

**期望的步骤构建：**
```typescript
const steps: OnboardingStep[] = [];
steps.push({ id: 'theme', component: themeStep });

// 新增逻辑
if (!hasValidCustomConfig() && !process.env.LATTE_API_KEY) {
  steps.push({ id: 'provider_select', component: providerSelectStep });
  steps.push({ id: 'custom_config', component: customConfigStep });
}

if (oauthEnabled && selectedProvider === 'oauth') {
  steps.push({ id: 'oauth', component: oauthStep });
}

steps.push({ id: 'security', component: securityStep });
```

---

## 三、关键问题分析

### 问题 1：品牌一致性缺失

**现象：**
- 环境变量仍使用 `ANTHROPIC_API_KEY`
- 配置目录仍为 `~/.claude`
- 代码中使用 `DOGE_API_KEY` 而非 `LATTE_API_KEY`

**影响：**
- 与 "Latte Code" 品牌定位不符
- 用户可能造成混淆

### 问题 2：默认入口未改变

**现象：**
- 首次启动仍显示 OAuth 登录界面
- 需要用户主动选择 "Custom API" 选项

**影响：**
- 无法达到 Doge Code 那种开箱即用的无 OAuth 体验
- 新用户首次使用仍需面对 Anthropic 登录

### 问题 3：门控逻辑不完整

**现象：**
- `isAnthropicAuthEnabled()` 不识别自定义配置
- Onboarding 无法自动跳过 OAuth

**影响：**
- 即使用户配置了自定义 API，仍可能看到 OAuth 步骤
- 自动登录逻辑无法生效

---

## 四、修复优先级建议

### P0（关键 - 阻止无 OAuth 体验）

| 优先级 | 任务 | 修复难度 | 影响 |
|-------|------|---------|------|
| P0-1 | 修改 `isAnthropicAuthEnabled()` 识别自定义配置 | 低 | 高 |
| P0-2 | 修改 `ConsoleOAuthFlow.tsx` 默认状态 | 中 | 高 |
| P0-3 | 在 `Onboarding.tsx` 中添加配置步骤 | 中 | 高 |

### P1（重要 - 品牌一致性）

| 优先级 | 任务 | 修复难度 | 影响 |
|-------|------|---------|------|
| P1-1 | 环境变量替换 (`ANTHROPIC_*` → `LATTE_*`) | 低 | 中 |
| P1-2 | 配置目录修改 (`~/.claude` → `~/.latte`) | 低 | 中 |
| P1-3 | 统一使用 `LATTE_API_KEY` 而非 `DOGE_API_KEY` | 低 | 中 |

### P2（优化 - 完善功能）

| 优先级 | 任务 | 修复难度 | 影响 |
|-------|------|---------|------|
| P2-1 | 完善 ApproveApiKey 集成 | 低 | 低 |
| P2-2 | 创建 `latteConfig.ts` 包装层 | 低 | 低 |
| P2-3 | 执行 subagent:code-explorer 复核 | 中 | 中 |
| P2-4 | 回归验证测试 | 高 | 高 |

---

## 五、最小可行修复方案

如果只需要实现"跳过 OAuth"的核心功能，只需完成以下修改：

### 修改 1：门控函数 (auth.ts)
```typescript
export function isAnthropicAuthEnabled(): boolean {
  if (isBareMode()) return false
  
  // 添加这两行
  if (process.env.LATTE_API_KEY) return false
  if (getGlobalConfig().customModels?.length > 0) return false
  
  // ... 原有逻辑
}
```

### 修改 2：默认入口 (ConsoleOAuthFlow.tsx)
```typescript
const [oauthStatus, setOAuthStatus] = useState<OAuthStatus>(() => {
  // ... 其他条件
  return { state: 'provider_select' }  // 修改这里
})
```

### 修改 3：Onboarding 步骤
- 添加 `provider_select` 和 `custom_config` 步骤
- 复用 `CustomModelSetupFlow` 组件

---

## 六、总结

### 已完成（可正常工作）
1. ✅ 自定义模型配置存储 (`customApiStorage.ts`)
2. ✅ OpenAI-compatible 适配器
3. ✅ Provider 判定和模型选项集成
4. ✅ `/add-model` 命令
5. ✅ `CustomModelSetupFlow` 交互组件

### 未完成（阻止无 OAuth 体验）
1. ❌ 默认入口仍为 OAuth
2. ❌ 门控函数不识别自定义配置
3. ❌ Onboarding 缺少配置步骤

### 未完成（品牌一致性）
4. ❌ 环境变量未替换为 `LATTE_*`
5. ❌ 配置目录仍为 `~/.claude`

### 结论

**当前状态：** 已完成基础设施搭建，但"临门一脚"的入口改造未完成。

**效果：** 用户可以通过 `/add-model` 命令添加模型，但**首次启动仍会看到 OAuth 登录界面**。

**要达到 Doge Code 效果，必须完成 P0 级别的三个关键修改。**
