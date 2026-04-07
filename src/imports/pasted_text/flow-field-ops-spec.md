六大 Flow 字段级操作动线完整规范
标准化格式：Step N → 读取字段（来源 DB）→ 判断/计算 → 写入字段（目标 DB）→ 触发 LOOP / 时序
每步精确到字段名 × 操作类型 × SyncQueue 优先级 × T+Xms 时序约束。
Flow 1 · CheckIn 打卡 · 字段级操作动线
// ── 触发入口：DashboardScreen → CheckInTable checkbox 勾选 ─────────────

// Step 0  前置读取（组件挂载时）
//   READ  DB-01: [fieldName]（11项boolean）/ linkedOKRId / linkedPlanId
//   READ  DB-02: streak / completionRate / completedDates
//   READ  DB-04: checkInContribution（展示用）
//   READ  DB-08: swipScore / dailyRecoveryCardCount（CrashRisk 初始化）

// Step 1  用户勾选 checkbox（T+0ms）
//   本地乐观更新：checkInItem.checked = true
//   UI：scale 动效 1→1.05→1 + Haptics.impact('light')
//   幂等键生成：`${checkInId}:${today()}:toggle`（已存在则 abort）

// Step 2  P0 写入 DB-01（T<50ms）
//   PATCH { [checkInItem.fieldName]: true, updatedAt: now() }
//   服务端公式重算：checkInScore = checkedCount / totalItemCount
//   → checkInScore 变化 → HSIProvider confidence 提升
//   → TaskRecommendList 静默重排（内存，不触发 DB 写入）

// Step 3  P1 并行写入 DB-02（T<50ms，仅 linkedHabits 存在时）
//   PATCH { completedDates: array-union([today()]) }（去重）
//   服务端公式重算：
//     completionRate = count(completedDates ∩ 近28d) / (targetCount × 4)
//     streak = 连续天数（服务端计算，前一天已完成则+1）
//   → streak 变化 → 检查 LOOP-15 触发条件（streak ∈ {7, 30, 100}）

// Step 4  P1 写入 DB-04（T<200ms，仅 linkedOKRId 存在时，LOOP-01）
//   atomic-increment { checkInContribution: +checkInWeight(默认1) }
//   幂等键：`${checkInId}:${today()}:loop01`
//   → 触发 overallProgress 公式重算（DB-04 服务端公式）
//   → LOOP-07 (P0, T<100ms)：DB-05.progress → DB-04.overallProgress 更新

// Step 5  P1 写入 DB-09b（T<200ms，仅 linkedPlanId 存在时，LOOP-06）
//   PATCH { completedAt: now(), linkedCheckInField: checkInItem.fieldName }
//   幂等键：`${checkInId}:${today()}:loop06`
//   → 后续用户在 WorkoutTrackerScreen 补录 actualVolume / actualSets
//   → 补录后触发 LOOP-11(P1)：DB-05.currentValue += actualVolume × actualSets

// Step 6  P2 异步（T<500ms）
//   CrashRiskMonitor 重算 swipScore（基于新 checkInScore）
//   checkInProtection = newCheckInScore × 5（swipScore 保护分）
//   若 swipScore 下降出 medium 区 → TodayZone.isHighStress 可能变 false

// Step 7  LOOP-15 触发检查（T<1000ms，仅 streak 达阈值时）
//   条件：DB-02.streak ∈ {7, 30, 100}
//   P2 写入 DB-07：create {
//     title: `[习惯里程碑] ${habitName} 连续 ${streak} 天`,
//     linkedHabitId: habitId,
//     date: today()
//   }
//   幂等键：`${habitId}:streak${streak}:loop15`

// ── 回滚规则 ──────────────────────────────────────────────────────────
// P0/P1 写入失败 → rollbackPatch({ [fieldName]: false }) + Toast
// P2 写入失败    → 静默写入 DB-08.errorLog，不影响主流程
​
Flow 2 · 崩溃干预 · 字段级操作动线
// ── 触发入口：CrashRiskMonitor 60s 后台轮询 ───────────────────────────

// Step 0  轮询读取（每 60s）
//   READ  HSIProvider.swipScore（内存，已由 inferHSI 维护）
//   READ  DB-08（当日行）: dailyOverlayCount / lastOverlayShownAt
//   计算：slope = computeSwipSlope(recentLogs_5min)

// Step 1  频率门禁判断（T+0ms，纯内存）
//   if dailyOverlayCount >= 2: → silent mode，skip 渲染，continue 轮询
//   if now - lastOverlayShownAt < 1800000(30min): → skip，continue 轮询

// Step 2  风险等级判定（T+0ms，纯内存）
//   level = resolveRiskLevel(swipScore, slope)
//   low:      → 仅写 DB-08.swipScore 日志（P2），不渲染 UI
//   medium:   → 内存触发三项静默干预（Step 3），不渲染 overlay
//   high:     → 渲染 <CrashInterventionOverlay mode="suggestion">
//   critical: → 渲染 <CrashInterventionOverlay mode="fullscreen">

// Step 3  medium 静默自动干预（T+0ms，纯内存，不写 DB）
//   TaskMatcherEngine.hardFilter.maxCognitiveLoad = 3（过滤 ≥4 任务）
//   NotificationThrottler.muteNonP0 = true
//   TodayZone.isHighStress = true（视觉降密度）

// Step 4  high/critical 渲染前写入 DB-08（T+0ms，P1）
//   幂等键：`intervention:${today()}:${Math.floor(now/60000)}`（同分钟防重）
//   PATCH 当日行 {
//     dailyOverlayCount: atomic-increment +1,
//     lastOverlayShownAt: now(),
//     interventionLog: array-union {
//       shownAt, swipScore, riskLevel, mode
//     }
//   }

// Step 5  critical 附加：AppFSM 状态写入（T+0ms，纯内存）
//   { forcedScreen: 'RecoveryScreen',
//     disabledRoutes: ['DO', 'PLAN'],
//     disabledUntil: now() + 20 * 60_000 }
//   → PDCANavBar DO/PLAN 显示倒计时

// Step 6  用户点击「去休息」onRest（T+0ms）
//   P1 写入 DB-08 {
//     dailyRecoveryCardCount: atomic-increment +1,
//     interventionLog[-1].acceptedAt: now()
//   }
//   TaskMatcherEngine.hardFilter = { maxCognitiveLoad: 2 }（20min 冷却）
//   AppFSM.disableNav('DO', 20min)
//   → 20min 后 AppFSM 自动恢复（内存定时器，不写 DB）
​
Flow 3 · 任务执行 · 字段级操作动线
// ── 触发入口：PDCANavBar「DO」→ TaskManagerScreen ─────────────────────

// Step 0  进入屏幕读取（T+0ms，< 100ms 内完成 TaskMatcher）
//   READ  DB-03: title / cognitiveLoad / energyRequired / estimatedMinutes
//               / dueDate / bestTimeSlot / priority / weeklyPriority
//               / rejectionLog / linkedOKRId / linkedKRId / status
//               （过滤：status ≠ '✅完成' AND status ≠ '🗑放弃'）
//   READ  HSIProvider: energy.overallEnergy / focus.mentalCapacity
//                     / emotion.stressLevel / temporal.timeOfDay / swipScore
//   TaskMatcher 7步评分 → Top3 finalScore

// Step 1  用户点击任务「▶ 开始」（T+0ms）
//   本地乐观更新：task.status = '⏳进行中'
//   P0 写入 DB-03 {
//     status: '⏳进行中',
//     startedAt: now(),
//     startedHSISnapshot: {
//       energyLevel: hsi.energy.overallEnergy,
//       mentalCapacity: hsi.focus.mentalCapacity,
//       stressLevel: hsi.emotion.stressLevel
//     }
//   }
//   幂等键：`${taskId}:${today()}:start`

// Step 2  用户完成任务（T+0ms）
//   P0 写入 DB-03 {
//     status: '✅完成',
//     completedAt: now(),
//     completedHSISnapshot: { ...当前 HSI 快照 },
//     actualMinutes: now() - startedAt
//   }
//   幂等键：`${taskId}:${today()}:complete`

// Step 3  P1 写入 DB-04（T<200ms，仅 linkedOKRId 存在时）
//   atomic-increment { taskContribution: +1 }
//   → 触发 overallProgress 公式重算（LOOP-07 P0, T<100ms）

// Step 4  P1 写入 DB-05（T<200ms，仅 linkedKRId 存在时）
//   PATCH { currentValue: currentValue + taskKRIncrement,
//           lastUpdatedBy: 'task-complete' }
//   → LOOP-07(P0)：DB-04.overallProgress 公式重算 T<100ms

// Step 5  用户拒绝任务「换一批」（T+0ms，内存操作）
//   sessionRejections.push(taskId)（内存，不写 DB）
//   → TaskMatcher 重排次优推荐（内存重算，< 100ms）

// Step 6  用户选择拒绝原因（可选，T<200ms，P1 写入 DB-03）
//   array-union { rejectionLog: {
//     taskId, timestamp: now(),
//     reason: '太难'|'太简单'|'不想做',
//     hsiSnapshot: { energyLevel: hsi.energy.overallEnergy }
//   }}
//   幂等键：`${taskId}:${now()}:reject`
//   → 7日内同能量状态 rejectionPenalty 生效
//   → rejectionPenalty = max(0.1, 1.0 - recentRejections × 0.25)

// Step 7  SWIP 触发 RecoveryCard 插入（条件触发）
//   触发条件之一：连续拒绝次数 ≥ 3 且 swipScore > 60
//   P1 写入 DB-08 { dailyRecoveryCardCount: atomic-increment +1 }
//   TaskMatcherEngine 强制插入 category='恢复/休息' 任务至列表第1位
​
Flow 4 · 愿景显化 · 字段级操作动线
// ── 触发入口：WishlistScreen ──────────────────────────────────────────

// Step 0  进入屏幕读取
//   READ  DB-07: title / manifestStatus / seedDate / linkedOKRId
//               / visionAlignmentRating / visionAlignmentQuickAnswer
//               / reviewSkippedByUIMode（过滤：未删除行）
//   READ  DB-04: title / status（OKR 下拉关联候选）

// Step 1  新建心愿（WishlistForm submit）
//   P1 写入 DB-07（create）{
//     title, seedDate: today(),
//     manifestStatus: '🌱 种下',
//     linkedOKRId: selectedOKRId || null,
//     category, evidence: '',
//     visionAlignmentRating: null
//   }
//   幂等键：`wishlist:${title}:${today()}:create`

// Step 2  用户将 manifestStatus 变更为「✨ 已显化」
//   P0 本地乐观更新：task.manifestStatus = '✨ 已显化'
//   P1 写入 DB-07 {
//     manifestStatus: '✨ 已显化',
//     manifestedDate: today(),
//     evidence: userInputEvidence
//   }
//   幂等键：`${wishId}:loop04`

// Step 3  LOOP-04：P1 写入 DB-04（T<200ms，仅 linkedOKRId 存在时）
//   PATCH { manifested: true, overallProgress: 100 }
//   → <ManifestationCelebration> 全屏动效触发（3000ms，可由 DB-12.celebrationDuration 覆盖）

// Step 4  Flow 6 周回顾 Step④ 反向写入 DB-07（愿景对齐）
//   P1 写入 DB-07（来自 VisionAlignmentPanel）{
//     visionAlignmentRating: 1|2|3|4|5,
//     visionAlignmentQuickAnswer: userText,
//     reviewSkippedByUIMode: uiMode === 'low-energy' ? true : false
//   }
//   → ManifestationHistory 可查阅历史对齐评分趋势
​
Flow 5 · 知识录入 · 字段级操作动线
// ── 触发入口：PDCANavBar「WRITE」→ KnowledgeScreen ────────────────────

// Step 0  进入屏幕读取
//   READ  DB-06: 最近10条（title / R_reading / aiMatchScore / linkedOKRId）
//   READ  DB-04: title / status='进行中'（OKR 候选下拉列表）

// Step 1  用户填写知识表单并保存（P0 写入 DB-06，T+0ms）
//   PATCH / CREATE {
//     title, sourceType,
//     R_reading:  用户填写的阅读摘要,
//     I_insight:  用户填写的洞见,
//     A_action:   用户填写的行动项（可为空）,
//     createdAt: now()
//   }
//   幂等键：`knowledge:${title}:${today()}:save`

// Step 2  AI 语义分析（后台异步，T<2000ms）
//   输入：R_reading + I_insight 文本
//   计算：semanticEmbedding（向量），aiMatchScore（与各 OKR 余弦相似度）
//   P1 写入 DB-06 {
//     semanticEmbedding: vector,
//     aiSuggestedOKRId: bestMatchOKRId,
//     aiMatchScore: score（0–1）
//   }
//   → 若 aiMatchScore > 0.65：渲染 <OKRLinkSuggestionCard>（30s 无操作自动收起）
//   → 若 aiMatchScore < 0.65：静默写入 aiSuggestedOKRId，不显示卡片

// Step 3  A_action 非空 → LOOP-03（T<2000ms，P2 写入 DB-03）
//   CREATE DB-03 {
//     title: A_action 文本,
//     cognitiveLoad: 2,
//     status: '🕐 待处理',
//     priority: 'P2-中',
//     generatedFromKnowledge: knowledgeId
//   }
//   幂等键：`${knowledgeId}:loop03`
//   P2 写回 DB-06：{ generatedTaskId: newTaskId }（回写关联）
//   → 新任务进入 TaskMatcher 推荐池（下次进入 DO 时生效）

// Step 4  用户在 OKRLinkSuggestionCard 点击「确认关联」onConfirm
//   P1 写入 DB-06：{ linkedOKRId: confirmedOKRId }
//   P1 写入 DB-04（LOOP-09，T<200ms）：{ linkedKnowledgeCount: atomic-increment +1 }
//   幂等键：`${knowledgeId}:loop09`
//   → OKR 知识关联数更新，Flow 6 周回顾 Step③ 可见

// Step 5  用户在 OKRLinkSuggestionCard 点击「不相关」onReject
//   P1 写入 DB-06：{ userRejectedOKRIds: array-union([suggestedOKRId]) }
//   → 后续 AI 推荐时该 OKR 命中 userRejectedOKRIds → adjustedScore × 0.3
//   （卡片 30s 无操作：静默收起，不写 userRejectedOKRIds）
​
Flow 6 · 周回顾 · 字段级操作动线
// ── 触发入口：PDCANavBar「CHECK」→ ReviewScreen ───────────────────────
// UIMode 强制设为 normal（避免 low-energy 折叠数据）

// Step 0  进入屏幕：聚合读取（SQL 实时计算）
//   SQL 聚合 DB-01（本周7天）:
//     SELECT date, checkInScore FROM DB-01
//     WHERE date BETWEEN weekStart AND weekEnd
//   SQL 聚合 DB-03:
//     completionRate = count(status='✅完成') / count(*) WHERE week=本周
//     completedTasks[] = 本周完成任务列表
//     pendingTasks[]   = status='🕐待处理' OR '⏳进行中'
//   SQL 聚合 DB-04（进行中 OKR）:
//     SELECT title, overallProgress, taskContribution,
//            checkInContribution, linkedKnowledgeCount
//   SQL 聚合 DB-05（关联 KR）:
//     SELECT title, currentValue, targetValue, progress, unit
//   SQL 聚合 DB-08:
//     energyLevelAvg = avg(energyLevel) WHERE date ∈ 本周
//   SQL 聚合 DB-11:
//     avgNutritionScore = avg(nutritionScore) WHERE mealTimestamp ∈ 本周
//   渲染 <WeeklyDataSummary>（纯只读展示）

// Step 1  Step① BrainDumpBox（自由输入，不写 DB，仅本地 session）
//   用户输入本周脑内残留想法
//   清空后可选「转为任务」→ 跳转 Flow 5 KnowledgeEntryForm

// Step 2  Step② TaskReviewPanel · 任务回顾 + 优先级排序（P1 批量 PATCH，LOOP-05）
//   READ  DB-03: 本周 pendingTasks（title / priority / dueDate / weeklyPriority）
//   用户拖拽排序 OR AI 一键分配
//   P1 批量写入 DB-03（LOOP-05）:
//     foreach task:
//       PATCH { weeklyPriority: userAssignedRank,
//               weeklyPrioritySource: 'user' | 'ai-auto' }
//   幂等键：`review:${weekEnd}:loop05:${taskId}`（每任务独立幂等）
//   → 下周进入 DO 时 TaskMatcher baseScore 纳入 weeklyPriority

// Step 3  Step③ OKR 进度面板（KR 手动 patch 可选）
//   展示：DB-04.overallProgress / DB-05.currentValue×targetValue
//   若用户手动修改 KR.currentValue:
//     P0 写入 DB-05: { currentValue, lastUpdatedBy: 'user-manual', updatedAt: now() }
//     → LOOP-07(P0, T<100ms)：DB-04.overallProgress 公式重算
//   LOOP-16 触发（如本周有 DB-09c 数据）:
//     P1 写入 DB-05: { currentValue: weeklyVolume }（覆盖写入，幂等）
//     幂等键：`stats:${weekEnd}:${krId}:loop16`

// Step 4  Step④ VisionAlignmentPanel · 愿景对齐反思
//   READ  DB-07: manifestStatus ≠ '✨已显化' AND reviewSkippedByUIMode ≠ true
//   foreach wishItem:
//     P1 写入 DB-07 {
//       visionAlignmentRating: 1|2|3|4|5,
//       visionAlignmentQuickAnswer: userText（可选），
//       reviewSkippedByUIMode: false
//     }

// Step 5  完成周回顾（「完成本周回顾」按钮）
//   P1 写入 DB-08（当周行）:
//     { weeklyReviewDone: true, reviewCompletedAt: now() }
//   幂等键：`review:${weekEnd}:done`
//   → CrashRiskMonitor checkInProtection 下周基线重置
//   → PDCANavBar「CHECK」按钮显示绿色完成标记
​
跨 Flow 字段写入冲突解决矩阵
当多个 Flow 同时写入同一 DB 字段时，按以下规则解决冲突：
冲突场景
字段
冲突 Flow
解决策略
幂等键设计
Flow 1 打卡 + Flow 6 周回顾同时写 DB-04.checkInContribution
checkInContribution
Flow1(LOOP-01) vs Flow6(读取展示)
Flow6 只读 · Flow1 原子加法 · 无冲突
${checkInId}:${today()}:loop01
Flow 3 完成任务 + Flow 6 周回顾同时修改 DB-05.currentValue
currentValue
Flow3(LOOP-07) vs Flow6(LOOP-16 覆盖写)
LOOP-16 在 Step③ 用户确认后触发，timestamp 更晚 → 服务端 last-write-wins
stats:${weekEnd}:${krId}:loop16（isIdempotent=true）
Flow 5 知识保存 + Flow 3 任务拒绝同时写 DB-06.userRejectedOKRIds
userRejectedOKRIds
Flow5(array-union) vs Flow5(同一字段)
两次均为 array-union，天然幂等，后写结果为两次集合的并集
${knowledgeId}:reject:${okrId}
Flow 1 & Flow 7 同时写 DB-08.energyBoostFactor
energyBoostFactor
Flow1(LOOP-13 饮食) vs Flow7(运动 +0.1)
两者均为 PATCH，最后写入覆盖 → 建议改为 atomic-add，两项独立叠加
meallog:${mealId}:loop13 / workout:${today()}:energyboost
Flow 2 崩溃干预与 Flow 3 任务接受同时修改 TaskMatcher hardFilter
内存 hardFilter
Flow2(maxCogLoad=2) vs Flow3(用户主动选)
hardFilter 为内存状态，Flow2 设置 20min 冷却 timer；timer 到期后 Flow3 恢复自由选择
无（内存，不持久化）
一·十、模块间字段级接口契约 & 单日端到端数据流