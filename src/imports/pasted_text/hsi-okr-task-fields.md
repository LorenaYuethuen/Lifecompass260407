A · HSI 推断层核心字段生命周期
字段名
所属 DB / 层
Owner 模块
初始化时机
写入模块 & 操作
变换公式 / 计算逻辑
读取模块
级联触发
最终 UI 消费方
checkInScore
DB-01
CheckIn Flow 1
用户勾选第一个 checkbox 时服务端公式首次计算
CheckIn Flow 1（P0 PATCH，每次勾选）
checkedCount / 11（服务端公式，精度2位小数）
HSIProvider Layer2 / CrashRiskMonitor
→ HSI confidence 重算 → swipScore 保护分更新（-5）
HSIStatusBar · EnergyIndicator · MiniCheckIn 显隐
confidence
HSI 内存
HSIProvider
App 启动时 inferHSI 首次执行
inferHSI()（每次触发，T<40ms）
有效数据源数 / 4（HRV / tapFreq / checkInScore / circadianBaseline）
MiniCheckIn · UIMode 解析器
≥0.75 → MiniCheckIn 隐藏；<0.5 → 强制渲染 MiniCheckIn
MiniCheckIn 组件 · HSIStatusBar 置信度标注
overallEnergy
HSI 内存
HSIProvider
inferHSI 首次执行
inferHSI() 三层加权融合：L1×0.5 + L2×0.3 + L3×0.2
L1×w1 + L2×w2 + L3×w3 - hungerPenalty（hungerPenalty = clamp((hoursHungry-2)/6, 0, 0.5)）
TaskMatcherEngine Step1 · UIMode 解析器
energyGap = task.energyRequired - overallEnergy > 2 → 硬性过滤
EnergyIndicator · TodayZone 背景色 · RecommendedTaskList
swipScore
DB-08 / HSI 内存
CrashRiskMonitor
每日 00:00 重置为 0
CrashRiskMonitor 60s 轮询：computeSwipScore(stressLevel, workload, checkInProtection)
stressFactor×40 + workloadFactor×30 + sleepDebt×20 + nutritionDebt×10 - checkInProtection（上限100）
CrashInterventionOverlay · TaskMatcherEngine hardFilter
>60 → medium 干预；>90 → critical 全屏；onRest → hardFilter.maxCogLoad=2（20min）
CrashInterventionOverlay 进度条 · PDCANavBar DO 按钮状态
energyBoostFactor
DB-08
LOOP-13 / LOOP-08
用户首次保存 MealLog 时写入
LOOP-13（P2）：每次 Meal Log 保存后；LOOP-08（P2）：30日节律学习器更新
LOOP-13：nutritionScore / 10 × 1.5 + 0.85；LOOP-08：rollingMean(30天 energyBoostFactor 样本)
HSIProvider Layer3（inferHSI 历史节律基线）
→ Layer3 权重变化 → 次日 overallEnergy 基线上调/下调
无直接 UI（后台影响 EnergyIndicator）
circadianBaseline
DB-08
LOOP-08
sampleCount ≥ 7 后首次写入（7日安全阈值）
LOOP-08（P2，T<1000ms）：每日节律学习器 30日滑动窗口
{ typicalEnergyLevel: rollingMean, typicalStressLevel: rollingMean, sampleCount: n }
HSIProvider Layer3
sampleCount<7 → confidence 下调；≥7 → 正常权重 L3=0.2（无生理信号时 L3=0.5）
无直接 UI（后台影响 HSIStatusBar 置信度）
B · OKR / KR 进度层核心字段生命周期
字段名
所属 DB
Owner 模块
初始化时机
写入模块 & 操作
变换公式 / 计算逻辑
读取模块
级联触发
最终 UI 消费方
overallProgress
DB-04 OKR
LOOP-07（服务端公式）
OKR 创建时服务端公式首次计算（初始值=0）
LOOP-07（P0，T<100ms）：任何 DB-05.currentValue 变更后触发；LOOP-04：直接 patch=100（显化）
mean(KR.progress[]) = mean((currentValue/targetValue)×100) — targetValue=0 时 healOverallProgress() 兜底
PDCANavBar OKR 角标 / Flow 6 OKRProgressPanel / WeeklyDataSummary
=100 + manifested=true → ManifestationCelebration 全屏动效触发
OKRProgressToggle 进度条 · PDCANavBar 角标数字
currentValue
DB-05 KR
多写方（详见右列）
KR 创建时 = 0（或用户手动设置初始值）
① Flow 3 任务完成（P0，+taskKRIncrement）② LOOP-11（P1，+actualVolume×actualSets）③ LOOP-12（P1，+1次）④ LOOP-16（P1，覆盖=weeklyVolume）⑤ Flow 6 Step③ 手动输入（P0）
增量：atomic-increment；覆盖：LOOP-16 isIdempotent=true patch；公式触发：→ progress = clamp(currentValue/targetValue×100, 0, 100)
LOOP-07 → DB-04.overallProgress 公式
任意变更 → LOOP-07(P0) 立即触发（isIdempotent=false）
KR 进度条（Flow 6 Step③）· OKRProgressPanel
checkInContribution
DB-04 OKR
LOOP-01 / LOOP-02
OKR 创建时 = 0
LOOP-01（P1，atomic-increment +checkInWeight）/ LOOP-02（P1，+bonus，streak≥7 或 completionRate≥0.8）
纯计数字段，不参与 overallProgress 公式（OKR 贡献度展示用，非进度驱动）
Flow 6 Step③ OKRProgressPanel（贡献度展示）
—（不触发 LOOP-07，独立贡献度统计）
OKRProgressPanel「打卡贡献：X次」
manifested
DB-04 OKR
LOOP-04
OKR 创建时 = false
LOOP-04（P1，T<200ms）：DB-07.manifestStatus 变更为「已显化」时 patch=true
直接 patch（非公式）；同时 overallProgress 强制 patch=100
ManifestationCelebration · PDCANavBar · Flow 6 OKR 展示
→ ManifestationCelebration 全屏动效（3000ms）→ OKR 卡片「✨已显化」标注
WishlistScreen ManifestationHistory · OKRProgressToggle 状态徽章
linkedKnowledgeCount
DB-04 OKR
LOOP-09
OKR 创建时 = 0
LOOP-09（P1，atomic-increment +1）：OKRLinkSuggestionCard onConfirm 后触发
纯计数，不参与 overallProgress 公式
Flow 6 Step③ OKRProgressPanel
—（独立知识关联数统计）
OKRProgressPanel「关联知识：X条」
C · 任务执行层核心字段生命周期
字段名
所属 DB
Owner 模块
初始化时机
写入模块 & 操作
变换公式 / 计算逻辑
读取模块
级联触发
最终 UI 消费方
cognitiveLoad
DB-03 任务
Flow 3 TaskManager / LOOP-03
任务创建时：用户手动输入（1–5）或 LOOP-03 自动生成时默认 = 2
用户编辑（P0 PATCH）/ LOOP-03 CREATE 时写入（固定=2）
无服务端公式，直接存储值 ∈ {1,2,3,4,5}
TaskMatcherEngine Step1 能量门禁 / hardFilter
energyGap = task.energyRequired - overallEnergy > 2 → 直接过滤；hardFilter.maxCogLoad 生效时进一步截断
FullTaskPool 认知负荷标签 · RecommendedTaskList 能量匹配说明
rejectionLog
DB-03 任务
Flow 3 TaskManager（用户拒绝）
空数组 []（任务创建时）
Flow 3 B-8 拒绝操作（P1 array-union）：{ taskId, timestamp, reason, hsiSnapshot.energyLevel }
无服务端公式；客户端计算：recentRejections = count(log WHERE hsiSnapshot.energyLevel ∈ [current±1] AND timestamp > now()-7days) → rejectionPenalty = max(0.1, 1.0 - recentRejections×0.25)
TaskMatcherEngine Step6 拒绝惩罚计算
→ rejectionPenalty ∈ [0.1, 1.0] 降低 finalScore
RecommendedTaskList（不直接显示；影响推荐顺序）
weeklyPriority
DB-03 任务
Flow 6 Review LOOP-05
任务创建时 = null
LOOP-05（P1 批量 PATCH）：周回顾 Step② 用户拖拽或 AI 自动分配
无服务端公式，直接存储用户排序值（1–N 整数）；同步写入 weeklyPrioritySource（'user'/'ai-auto'）
TaskMatcherEngine Step5 周优先级加权
→ baseScore += weeklyPriority × 0.2（下周 DO 进入时生效）
TaskReviewPanel（周回顾 Step② 拖拽排序 UI）· RecommendedTaskList 顺序
startedHSISnapshot
DB-03 任务
Flow 3 TaskManager
任务开始时写入（null 初始值）
Flow 3 B-2 开始任务（P0）：{ energyLevel, mentalCapacity, stressLevel } 三字段快照
无计算，纯快照存储
Flow 3 完成后对比 / DB-08 节律学习
completedHSISnapshot vs startedHSISnapshot：stressLevel↑ > 0.2 → 下次 inferHSI Layer2 tapFreq 权重修正
无直接 UI（后台用于 HSI 学习反馈）
D · 健康数据层核心字段生命周期
字段名
所属 DB
Owner 模块
初始化时机
写入模块 & 操作
变换公式 / 计算逻辑
读取模块
级联触发
最终 UI 消费方
mealTimestamp
DB-11 Meal Log
Flow 8 MealLog
用户提交进餐记录时 CREATE
Flow 8（P1）：表单提交时 mealTimestamp = now()
无计算，直接存储 Unix ms
LOOP-14（纯内存）/ LOOP-10 联动
LOOP-14：lastMealTimestamp = now() → hungerPenalty = 0 → inferHSI() 重调 → overallEnergy↑（T<50ms，不入 SyncQueue）
MealLog 历史列表 · WeeklyDataSummary 进餐时间分布（仅周回顾可见）
nutritionScore
DB-11 Meal Log
Flow 8 MealLog / LOOP-10
用户提交时手动评分（0–10）或 LOOP-10 从 Recipe 营养字段聚合计算
Flow 8（P1）：用户评分直接写入；LOOP-10（P2）：Recipe 营养字段聚合覆盖写入
聚合公式（LOOP-10）：calories/targetCalories×4 + protein/targetProtein×3 + ...（满分10）
LOOP-13 → DB-08.energyBoostFactor
LOOP-13（P2）：energyBoostFactor = score/10×1.5+0.85 → Layer3 基线上调（次日生效）
MealLog 营养评分显示 · WeeklyDataSummary 周均营养分
actualVolume / actualSets
DB-09b Workout Tracker
Flow 7 WorkoutTracker
用户补录训练详情时写入（计划完成后填写）
Flow 7（P1 PATCH）：WorkoutTrackerScreen 补录表单提交
无服务端公式；客户端：totalVolume = actualVolume × actualSets
LOOP-11 → DB-05.currentValue（运动量类型 KR）
LOOP-11（P1）：DB-05.currentValue += totalVolume → LOOP-07(P0) → DB-04.overallProgress 重算（全链路 T<300ms）
WorkoutTrackerScreen 训练详情 · Flow 6 周训练量统计
streak
DB-02 Habits
CheckIn Flow 1 / 服务端公式
Habit 创建时 = 0；每日 00:00 服务端公式重算
Flow 1（P1 array-union）：completedDates 追加今日 → 服务端公式重算 streak = 连续天数
服务端公式：max(n) WHERE completedDates 包含 [today-1, today-2, ..., today-n] 连续序列
LOOP-02 奖励检查 / LOOP-15 里程碑检查
streak ∈ {7,30,100} → LOOP-15(P2)：DB-07 新建里程碑行；streak≥7 → LOOP-02(P1)：OKR checkInContribution +bonus
CheckInTable habit 标注 · WeeklyDataSummary 连续打卡天数
weeklyVolume
DB-09c Workout Statistics
DB-09b 服务端聚合公式
每周日 00:00 服务端公式汇总本周 DB-09b 记录
服务端自动聚合（非用户写入）：SUM(actualVolume×actualSets) WHERE completedAt ∈ 本周
聚合公式，isIdempotent=true 标记防止 LOOP-16 重复写入
LOOP-16 → DB-05.currentValue（周统计覆盖）/ Flow 6 Step③ 展示
LOOP-16（P1，周回顾触发）：DB-05.currentValue = weeklyVolume（覆盖写，非增量）→ LOOP-07(P0)
WeeklyDataSummary 周训练量 · Flow 6 Step③ KR 进度展示
E · 愿景与知识层核心字段生命周期
字段名
所属 DB
Owner 模块
初始化时机
写入模块 & 操作
变换公式 / 计算逻辑
读取模块
级联触发
最终 UI 消费方
manifestStatus
DB-07 Wishlist
Flow 4 Wishlist
心愿创建时 = '🌱 播种'
Flow 4（P1）：用户下拉选择枚举值；状态只能单向推进（播种→萌芽→盛开→已显化）
无服务端公式，枚举状态机；FC-06 违约检测：不允许状态倒退
LOOP-04 / ManifestationCelebration / ManifestationHistory
'✨已显化' → LOOP-04(P1)：DB-04.manifested=true + overallProgress=100 → 全屏庆祝 3000ms
WishlistForm 状态选择器 · ManifestationHistory 历史墙
aiMatchScore
DB-06 知识管理
AI 语义引擎（后台 worker）
知识保存后 T<2000ms 异步写入
AI 语义引擎（P1 异步）：cosine_similarity(semanticEmbedding, OKR.embedding[]) 最大值
cosine_similarity(vec_knowledge, vec_okr) ∈ [0,1]；FC-09 违约：>1 或 <0 触发 warn+clamp
OKRLinkSuggestionCard 渲染判断
>0.85 → 「高度匹配」文案；0.65–0.85 → 「可能相关」；<0.65 → 静默（不渲染卡片）
OKRLinkSuggestionCard 卡片 + 匹配度文案
A_action
DB-06 知识管理
Flow 5 Knowledge
知识条目创建时用户输入（可为空）
Flow 5（P0）：KnowledgeEntryForm 保存时写入用户填写的行动项文本
无服务端公式；客户端检测：A_action.trim().length > 0 → 触发 LOOP-03
LOOP-03（条件触发）
非空 → LOOP-03(P2，T<2000ms)：DB-03 自动生成 { title=A_action, cognitiveLoad=2, status='待处理', generatedFromKnowledge=knowledgeId }
KnowledgeEntryForm（用户填写）· FullTaskPool（生成的任务）
visionAlignmentRating
DB-07 Wishlist
Flow 6 Review Step④
null（心愿创建时）
Flow 6 Step④（P1）：VisionAlignmentPanel 用户评分 1–5；若 UIMode='low-energy' → reviewSkippedByUIMode=true，rating 不写入
无计算，直接存储 1–5 整数；同步写入 visionAlignmentQuickAnswer（文字回答）
ManifestationHistory / Flow 4 历史趋势展示
—（无级联，纯历史记录字段）
ManifestationHistory 愿景对齐历史折线图 · VisionAlignmentPanel 历史回顾
F · 字段流转热力图 · 跨模块引用次数排行
引用热度 = 写入次数 + 被读次数。高热度字段是系统数据总线的核心节点，变更前必须评估全局影响。
字段名
所属 DB
写入方数量
读取方数量
级联触发数量
综合热度
核心风险点
currentValue
DB-05 KR
5个（Flow3/LOOP-11/12/16/手动）
3个（LOOP-07/Flow6/OKRPanel）
1个（LOOP-07 P0 必触发）
🔥🔥🔥🔥🔥 最高
多写竞态（# 一·十四 仲裁）/ NaN 除零（FC-05 自愈）
overallProgress
DB-04 OKR
2个（LOOP-07公式/LOOP-04直接patch）
4个（PDCANavBar/Flow6/OKRToggle/HSIProvider）
1个（=100 → 庆祝动效）
🔥🔥🔥🔥🔥 最高
除零 NaN（FC-04 fatal 自愈）/ 并发写入顺序
swipScore
DB-08
1个（CrashRiskMonitor 60s轮询）
4个（Overlay/TaskMatcher/PDCANavBar/Flow6）
2个（干预触发/hardFilter启用）
🔥🔥🔥🔥 高
slope 计算精度 / daily 频率门禁（≤2次/天）
checkInScore
DB-01
1个（Flow1 服务端公式）
3个（HSIProvider/CrashRisk/LOOP-01）
2个（LOOP-01贡献/HSI confidence更新）
🔥🔥🔥🔥 高
FC-01：值域[0,1]越界检测
overallEnergy
HSI 内存
1个（inferHSI 三层加权）
3个（TaskMatcher Step1/UIMode/EnergyIndicator）
1个（能量门禁 energyGap 过滤）
🔥🔥🔥🔥 高
hungerPenalty 实时叠加（LOOP-14 内存）/ 置信度过低时 MiniCheckIn 强制渲染
weeklyPriority
DB-03 任务
1个（Flow6 LOOP-05 批量PATCH）
2个（TaskMatcher Step5/TaskReviewPanel）
1个（→ baseScore += ×0.2 影响推荐）
🔥🔥🔥 中高
批量写入幂等键规范（review:weekEnd:loop05:taskId）
energyBoostFactor
DB-08
2个（LOOP-13/LOOP-08）
1个（HSIProvider Layer3）
1个（→ Layer3 次日基线变化）
🔥🔥🔥 中高
LOOP-13 与 LOOP-08 写入顺序（LOOP-08 为30日均值，应在 LOOP-13 后执行）
manifestStatus
DB-07 Wishlist
1个（Flow4 用户操作）
2个（LOOP-04/ManifestHistory）
1个（'已显化' → LOOP-04 → DB-04）
🔥🔥🔥 中高
FC-06：状态倒退检测（不允许从「已显化」回退）
rejectionLog
DB-03 任务
1个（Flow3 B-8 array-union）
1个（TaskMatcher Step6）
1个（→ rejectionPenalty 7日衰减）
🔥🔥 中
7日滚动窗口计算性能 / 最低值0.1（不完全屏蔽）
aiMatchScore
DB-06 知识
1个（AI语义引擎 异步P1）
1个（OKRLinkSuggestionCard）
1个（>0.65 → 卡片渲染）
🔥🔥 中
FC-09：模型输出越界检测（[0,1]）/ 超时2000ms降级（不渲染卡片）
字段变更影响评估 SOP（修改任意高热度字段前执行）：① 查本表「写入方」列确认竞态风险（# 一·十四）② 查「级联触发」列确认下游副作用（# 一·六 LOOP 矩阵）③ 查 # 一·十五 FC 契约编号确认违约检测覆盖 ④ 查 # 一·十三 状态机确认状态转换合法性
