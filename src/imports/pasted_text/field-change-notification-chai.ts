## 八、关键字段变更通知链（字段-订阅方对照）

```tsx
// ============================================================
// 当某个 DB 字段发生变更时，哪些 UI 组件 / 内存状态必须更新
// ============================================================
const FIELD_CHANGE_NOTIFICATION_CHAIN: Record<string, string[]> = {
  // DB-03.status → 已完成
  'DB-03.status=✅已完成': [
    '→ TaskPool.remove(task.id)',
    '→ RecommendedList 重排（补位）',
    '→ DB-05.currentValue += okrContribution（P1）',
    '→ DB-04.overallProgress 重算（debounce 500ms）',
    '→ OKRProgressToggle 重渲染',
    '→ ReviewCache.taskCompletionRate 失效',
  ],
  // DB-03.rejectionCount 变化
  'DB-03.rejectionCount': [
    '→ TaskPool.update(task.id, { rejectionCount })',
    '→ TaskMatcherEngine 重算 rejectionPenalty',
    '→ RecommendedList 重排',
    '→ HSIProvider.mentalCapacity -= 0.05（仅今日首次）',
  ],
  // DB-03.weeklyPriority 批量写入（周回顾后）
  'DB-03.weeklyPriority（批量）': [
    '→ TaskPool 全量刷新（weeklyBoostScore 变化）',
    '→ TaskMatcherEngine 全量重排',
    '→ RecommendedList 完全重排（影响最大）',
  ],
  // DB-04.overallProgress 变化
  'DB-04.overallProgress': [
    '→ OKRProgressToggle.okrProgress 更新',
    '→ 若 >= 100 → OKR_COMPLETED 事件 → DB-07.manifestStatus=已显化',
    '→ ManifestationCelebration 触发（若 Wishlist 关联）',
    '→ ReviewCache.okrProgress 失效',
  ],
  // DB-05.currentValue 变化
  'DB-05.currentValue': [
    '→ DB-05.progress 重算（公式字段）',
    '→ KR_PROGRESS_UPDATED 事件 → DB-04.overallProgress 重算',
    '→ OKRScreen KR 进度条重渲染',
  ],
  // HSI.energy.overallEnergy 变化
  'HSI.energy.overallEnergy': [
    '→ EnergyIndicator 色块重渲染',
    '→ TodayZone.isLowEnergy 重计算',
    '→ TaskMatcherEngine energyFitScore 重算',
    '→ RecommendedList 重排（低能量过滤 cognitiveLoad>=4）',
    '→ FitnessTracker.lowEnergyVariant 切换',
    '→ UIMode 重计算（normal/low-energy/high-stress/focused）',
  ],
  // HSI.swipScore 变化（跨 60/70/90 阈值）
  'HSI.swipScore（跨阈值）': [
    '→ CrashRiskMonitor 触发等级切换',
    '→ 60–70: TaskMatcherEngine.applyHardFilter(maxCogLoad=3)',
    '→ >70: CrashInterventionOverlay mode=suggestion',
    '→ >90: CrashInterventionOverlay mode=fullscreen',
  ],
  // DB-01.checkInScore 变化
  'DB-01.checkInScore': [
    '→ CheckInTable 进度条重渲染',
    '→ ReviewCache.checkInRate 失效（当日数据变化）',
    '→ swipScore 重计算（checkInRate_7d 分项）',
  ],
  // DB-07.manifestStatus → 已显化
  'DB-07.manifestStatus=✨已显化': [
    '→ WishlistScreen 卡片状态更新',
    '→ ManifestationCelebration 触发（全屏3s动效）',
    '→ ReviewCache.milestones 追加',
    '→ OKRProgressToggle 里程碑角标显示',
  ],
};
```

---

<aside>
📋

**文档元信息**

<aside>
🔗

**设诡目标** 本节解决“模块内字段清晰、但模块间怎么传数据仍不明”的问题。明确每对模块的边界字段契约、事件总线 Payload、实体全状态机、HSI 全局广播机制以及六大跨模块时序图。

</aside>

## 一、模块边界字段契约总表

> **读法**：每行表示一对模块的数据传递契约。「传出字段」是生产模块写入的字段名，「接收字段」是消费模块读取的字段名，两者必须对齐。
> 

| **上游模块** | **下游模块** | **传出字段** | **接收字段** | **传递载体** | **触发时机** |
| --- | --- | --- | --- | --- | --- |
| CheckIn 打卡 | HSIProvider | `DB-01.hsiSnapshot.energyAtMorning`
`DB-01.hsiSnapshot.stressLevel` | `hsi.energy.overallEnergy`
`hsi.emotion.stressLevel` | `CHECK_IN_COMPLETED` 事件 | 早間打卡勾选 |
| CheckIn 打卡 | OKR 模块 | `DB-01.linkedOKRId`
`DB-01.isDone`
`DB-01.checkInWeight` | `DB-04.checkInContribution` | `CHECKIN_OKR_CONTRIBUTE` 事件 | `isDone` 切换为 true |
| CheckIn 打卡 | Habits 辅表 | `DB-01.linkedHabitId`
`DB-01.isDone`
`DB-01.date` | `DB-02.completedDates[]` | `HABIT_CHECKED` 事件 | `isDone` 切换为 true |
| Knowledge 模块 | Task 模块 | `DB-06.A_action`
`DB-06.id`
`DB-06.linkedOKRId`
`DB-06.tags` | `DB-03.title`
`DB-03.linkedKnowledgeIds`
`DB-03.linkedOKRId` | `KNOWLEDGE_ACTION_SAVED` 事件 | `A_action` 保存非空 |
| Knowledge 模块 | OKR 模块 | `DB-06.linkedOKRId`
`DB-06.id` | `DB-04.linkedKnowledgeCount` | `KNOWLEDGE_OKR_LINKED` 事件 | 用户确认 AI 匹配 |
| Task 模块 | KR 模块 | `DB-03.linkedKRId`
`DB-03.okrContribution`
`DB-03.completedAt` | `DB-05.currentValue`
`DB-05.lastUpdatedBy`
`DB-05.lastUpdatedAt` | `TASK_COMPLETED` 事件 | `status` → `'✅ 已完成'` |
| Task 模块 | OKR 模块 | `DB-03.linkedOKRId`
`DB-03.okrContribution` | `DB-04.taskContribution`
`DB-04.overallProgress` | `TASK_COMPLETED` 事件 | `status` → `'✅ 已完成'` |
| Task 模块 | HSIProvider | `DB-03.rejectionLog[-1].reason`
`DB-03.rejectionLog[-1].hsiSnapshot` | `hsi 内存中 rejectionPenalty 字段` | `TASK_REJECTED` 事件 | 用户拒绝任务 |
| KR 模块 | OKR 模块 | `DB-05.progress`
`DB-05.linkedOKRId` | `DB-04.overallProgress`
`DB-04.status` | `KR_PROGRESS_UPDATED` 事件 | `DB-05.currentValue` 写入后 |
| OKR 模块 | Wishlist 模块 | `DB-04.status = '✨ 已完成'`
`DB-04.linkedWishlistId` | `DB-07.manifestStatus`
`DB-07.manifestedDate` | `OKR_COMPLETED` 事件 | `DB-04.status` → 已完成 |
| OKR 模块 | ReviewScreen | `DB-04.overallProgress`
`DB-04.reviewNote`
`DB-04.linkedKRIds` | `WeeklyData.okrProgress[]` | 周回顾开启时一次性读取 | CHECK 模块打开 |
| FitnessTracker | CheckIn 打卡 | `DB-09.linkedCheckInField`
`DB-09.completedAt` | `DB-01.[linkedCheckInField]` | `WORKOUT_COMPLETED` 事件 | 健身完成确认 |
| FitnessTracker | KR 模块 | `DB-09.totalVolume`
`DB-09.linkedOKRKRId`
`DB-09.durationMinutes` | `DB-05.currentValue` | `WORKOUT_COMPLETED` 事件 | 健身完成确认 |
| NutritionPlanner | HSIProvider | `DB-10.energyBoostFactor` | `hsi.energy.overallEnergy`（重算） | `NUTRITION_LOGGED` 事件 | 最后一餐打卡 |
| ActivityPlanner | Task 模块 | `DB-14.taskTemplates[]`
`DB-14.scheduledDate`
`DB-14.linkedOKRId` | `DB-03`（批量新建） | `ACTIVITY_CREATED` 事件 | 活动保存 |
| FinanceWidget | Wishlist 模块 | `DB-13.amount`
`DB-13.linkedWishlistId`
`DB-13.category` | `DB-07.linkedBudget.savedAmount` | `EXPENSE_SAVED` 事件 | `category = '存錢'` 且关联愿望 |
| ReviewScreen | Task 模块 | `weeklyPriorityMap: Map<taskId, 1–5>` | `DB-03.weeklyPriority`（批量） | `REVIEW_CONFIRMED` 事件 | 周回顾用户确认 |
| HSIProvider | TaskMatcherEngine | `hsi.focus.mentalCapacity`
`hsi.energy.overallEnergy`
`hsi.swipScore`
`hsi.temporal.timeOfDay` | TaskMatcher 评分公式四个分项 | HSI 状态变化时自动推送 | HSI 任意字段变更 |
| HSIProvider | UIMode 引擎 | `hsi.energy.overallEnergy`
`hsi.emotion.stressLevel`
`hsi.focus.mentalCapacity` | `UIMode: normal/low-energy/high-stress/focused` | HSI 状态变化时自动计算 | HSI 任意字段变更 |

---

## 二、跨模块事件总线规范

### 2·1 事件定义与 Payload 字段清单

```tsx
// ============================================================
// 全局事件总线（EventBus）完整规范
// 每个事件：生产模块、事件名、Payload 字段、消费模块
// ============================================================
// Ⅰ 打卡类事件
interface CheckInCompletedEvent {
  type: 'CHECK_IN_COMPLETED';
  producer: 'CheckInTable';
  payload: {
    recordId:       string;    // DB-01 页面 ID
    date:           Date;
    fieldName:      string;    // 打卡项字段名，如 'morning_meditation'
    isDone:         boolean;
    linkedOKRId?:   string;    // 若存在，触发 LOOP-01
    linkedHabitId?: string;    // 若存在，触发 LOOP-01b
    checkInWeight:  number;    // 默认 1，可配置
    hsiSnapshot: {
      energy:         number;
      stressLevel:    number;
    };
  };
  consumers: ['OKRModule', 'HabitsModule', 'HSIProvider', 'WeeklyReviewCache'];
}
// Ⅱ 任务类事件
interface TaskCompletedEvent {
  type: 'TASK_COMPLETED';
  producer: 'TaskManagerScreen';
  payload: {
    taskId:           string;   // DB-03 页面 ID
    completedAt:      Date;
    linkedKRId?:      string;   // 若存在，触发 LOOP-02
    linkedOKRId?:     string;   // 若存在，触发 LOOP-02b
    okrContribution:  number;   // 默认 1
    source:           string;   // 任务来源标记
  };
  consumers: ['KRModule', 'OKRModule', 'ReviewCache', 'TaskMatcherEngine'];
}
interface TaskRejectedEvent {
  type: 'TASK_REJECTED';
  producer: 'TaskManagerScreen';
  payload: {
    taskId:     string;
    reason:     'too-hard' | 'too-easy' | 'not-now';
    hsiSnapshot: {
      energy:         number;
      mentalCapacity: number;
      stressLevel:    number;
      timeOfDay:      string;
    };
    newRejectionCount: number;  // 写入后的最新値
  };
  consumers: ['HSIProvider', 'TaskMatcherEngine'];
  // HSIProvider: rejectionPenalty 提升，TaskMatcher 即时重排
}
// Ⅲ 知识类事件
interface KnowledgeActionSavedEvent {
  type: 'KNOWLEDGE_ACTION_SAVED';
  producer: 'KnowledgeScreen';
  payload: {
    knowledgeId:   string;   // DB-06 页面 ID
    aAction:       string;   // A_action 内容
    linkedOKRId?:  string;   // 已关联的 OKR
    tags:          string[];
  };
  consumers: ['TaskModule'];
  // TaskModule: 自动新建 Task, title = aAction
}
interface KnowledgeOKRLinkedEvent {
  type: 'KNOWLEDGE_OKR_LINKED';
  producer: 'KnowledgeScreen';
  payload: {
    knowledgeId:  string;
    okrId:        string;
    matchScore:   number;    // AI 置信度
    confirmedBy:  'user' | 'auto'; // 用户确认或自动
  };
  consumers: ['OKRModule'];
  // OKRModule: linkedKnowledgeCount += 1
}
// Ⅳ KR / OKR 类事件
interface KRProgressUpdatedEvent {
  type: 'KR_PROGRESS_UPDATED';
  producer: 'KRModule';
  payload: {
    krId:         string;
    linkedOKRId:  string;
    prevValue:    number;
    newValue:     number;
    newProgress:  number;  // 0–1
    updatedBy:    'task' | 'checkin' | 'fitness' | 'manual';
  };
  consumers: ['OKRModule'];
  // OKRModule: 重算 overallProgress，推进 status
}
interface OKRCompletedEvent {
  type: 'OKR_COMPLETED';
  producer: 'OKRModule';
  payload: {
    okrId:             string;
    linkedWishlistId?: string;
    completedAt:       Date;
    finalProgress:     number;
  };
  consumers: ['WishlistModule', 'ReviewCache', 'NotificationThrottler'];
  // WishlistModule: manifestStatus → '✨ 已显化'
}
// Ⅴ 健身 / 饮食类事件
interface WorkoutCompletedEvent {
  type: 'WORKOUT_COMPLETED';
  producer: 'FitnessTracker';
  payload: {
    planId:              string;   // DB-09 页面 ID
    linkedCheckInField:  string;   // 对应 LIFEMATRICES 字段
    linkedOKRKRId?:      string;   // KR 关联
    totalVolume:         number;   // Σ sets×reps×weight
    durationMinutes:     number;
    completedAt:         Date;
  };
  consumers: ['CheckInModule', 'KRModule', 'HSIProvider'];
}
interface NutritionLoggedEvent {
  type: 'NUTRITION_LOGGED';
  producer: 'NutritionPlanner';
  payload: {
    goalId:             string;   // DB-10 目标
    date:               Date;
    totalCalories:      number;
    totalProtein:       number;
    energyBoostFactor:  number;  // 计算完成后的系数
  };
  consumers: ['HSIProvider'];
  // HSIProvider: overallEnergy 重算
}
// Ⅵ 周回顾类事件
interface ReviewConfirmedEvent {
  type: 'REVIEW_CONFIRMED';
  producer: 'ReviewScreen';
  payload: {
    weekStart:           Date;
    weekEnd:             Date;
    weeklyPriorityMap:   Record<string, number>;  // taskId → 1–5
    reviewNotes:         Record<string, string>;  // okrId → 备注
    cycleId?:            string;
  };
  consumers: ['TaskModule', 'OKRModule', 'CycleModule'];
}
```

### 2·2 事件总线路由表

```mermaid
flowchart LR
    subgraph 生产模块
        P1[CheckInTable]
        P2[TaskManager]
        P3[KnowledgeScreen]
        P4[FitnessTracker]
        P5[NutritionPlanner]
        P6[ReviewScreen]
        P7[FinanceWidget]
        P8[ActivityPlanner]
        P9[WishlistScreen]
    end
    subgraph EventBus
        E1[CHECK_IN_COMPLETED]
        E2[TASK_COMPLETED]
        E3[TASK_REJECTED]
        E4[KNOWLEDGE_ACTION_SAVED]
        E5[KNOWLEDGE_OKR_LINKED]
        E6[KR_PROGRESS_UPDATED]
        E7[OKR_COMPLETED]
        E8[WORKOUT_COMPLETED]
        E9[NUTRITION_LOGGED]
        E10[REVIEW_CONFIRMED]
        E11[EXPENSE_SAVED]
        E12[ACTIVITY_CREATED]
    end
    subgraph 消费模块
        C1[OKRModule]
        C2[HabitsModule]
        C3[HSIProvider]
        C4[KRModule]
        C5[TaskModule]
        C6[WishlistModule]
        C7[ReviewCache]
        C8[TaskMatcherEngine]
    end
    P1 --> E1 --> C1 & C2 & C3 & C7
    P2 --> E2 --> C4 & C1 & C7
    P2 --> E3 --> C3 & C8
    P3 --> E4 --> C5
    P3 --> E5 --> C1
    C4 --> E6 --> C1
    C1 --> E7 --> C6 & C7
    P4 --> E8 --> C2 & C4 & C3
    P5 --> E9 --> C3
    P6 --> E10 --> C5 & C1
    P7 --> E11 --> C6
    P8 --> E12 --> C5
```

---

## 三、实体完整状态机

### 3·1 Task 实体状态机

```tsx
// Task 每次状态转履封装的字段变更清单
const TASK_STATE_MACHINE = {
  transitions: [
    {
      from:   '初始化',
      to:     '🕐 待处理',
      trigger: 'onTaskCreate',
      writes: [
        { field: 'DB-03.status',           value: '🕐 待处理' },
        { field: 'DB-03.priority',         value: 'draft.priority ?? "P2-中"' },
        { field: 'DB-03.cognitiveLoad',    value: 'draft.cognitiveLoad ?? 2' },
        { field: 'DB-03.energyRequired',   value: 'draft.energyRequired ?? 2' },
        { field: 'DB-03.rejectionCount',   value: '0' },
        { field: 'DB-03.source',           value: 'draft.source ?? "manual"' },
        { field: 'DB-03.linkedOKRId',      value: 'draft.linkedOKRId' },
        { field: 'DB-03.linkedKRId',       value: 'draft.linkedKRId' },
        { field: 'DB-03.okrContribution',  value: 'draft.okrContribution ?? 1' },
      ],
      emits: [],
    },
    {
      from:   '🕐 待处理',
      to:     '🔄 进行中',
      trigger: 'onTaskStart',
      writes: [
        { field: 'DB-03.status',     value: '🔄 进行中' },
        { field: 'DB-03.startedAt',  value: 'new Date()' },
      ],
      emits: [],
    },
    {
      from:   '🔄 进行中',
      to:     '✅ 已完成',
      trigger: 'onTaskComplete',
      writes: [
        { field: 'DB-03.status',       value: '✅ 已完成' },
        { field: 'DB-03.completedAt',  value: 'new Date()' },
        { field: 'DB-03.rejectionCount', value: '0 (重置)' },
      ],
      emits:  ['TASK_COMPLETED'],
      // TASK_COMPLETED 递播路径：
      //   → KRModule:  DB-05.currentValue += okrContribution
      //   → OKRModule: DB-04.taskContribution += 1
      //                DB-04.overallProgress 重算
    },
    {
      from:   ['*'],
      to:     '➪拒绝记录',
      trigger: 'onTaskRejected',
      writes: [
        { field: 'DB-03.rejectionLog',   value: 'append { reason, hsiSnapshot, timestamp }' },
        { field: 'DB-03.rejectionCount', value: '+= 1' },
        // 条件写入：
        { field: 'DB-03.cognitiveLoad',  value: '-= 1 （当 reason=too-hard && count>=3）' },
        { field: 'DB-03.priority',       value: 'demote （当 reason=too-easy && count>=3）' },
      ],
      emits: ['TASK_REJECTED'],
    },
    {
      from:   ['*'],
      to:     '⏸ 暂停',
      trigger: 'onTaskPause',
      writes: [
        { field: 'DB-03.status',     value: '⏸ 暂停' },
        { field: 'DB-03.pausedAt',   value: 'new Date()' },
        { field: 'DB-03.pauseNote',  value: 'userInput' },
      ],
      emits: [],
    },
    {
      from:   ['*'],
      to:     '🗑 放弃',
      trigger: 'onTaskAbandon',
      writes: [
        { field: 'DB-03.status',       value: '🗑 放弃' },
        { field: 'DB-03.abandonedAt',  value: 'new Date()' },
        { field: 'DB-03.abandonReason', value: 'userInput' },
      ],
      emits: [],
    },
  ],
};
```

```mermaid
stateDiagram-v2
    [*] --> 待处理 : onTaskCreate
    note right of 待处理
        写入: status priority cognitiveLoad
        energyRequired rejectionCount=0
        linkedKRId linkedOKRId okrContribution
    end note
    待处理 --> 进行中 : onTaskStart
    note right of 进行中
        写入: startedAt
    end note
    进行中 --> 已完成 : onTaskComplete
    note right of 已完成
        写入: completedAt rejectionCount=0
        发出: TASK_COMPLETED
        → DB-05.currentValue += contribution
        → DB-04.overallProgress 重算
    end note
    待处理 --> 拒绝记录 : onTaskRejected
    进行中 --> 拒绝记录 : onTaskRejected
    拒绝记录 --> 待处理 : TaskMatcher 下次轮转
    note right of 拒绝记录
        写入: rejectionLog++ rejectionCount++
        条件: cognitiveLoad-- / priority降级
        发出: TASK_REJECTED
        → HSI rejectionPenalty 提升
    end note
    待处理 --> 暂停 : onTaskPause
    进行中 --> 暂停 : onTaskPause
    暂停 --> 待处理 : onTaskResume
    待处理 --> 放弃 : onTaskAbandon
    进行中 --> 放弃 : onTaskAbandon
    已完成 --> [*]
    放弃 --> [*]
```

### 3·2 OKR 实体状态机

```mermaid
stateDiagram-v2
    [*] --> 耙候 : onOKRCreate
    note right of 耙候
        写入: title cycle startDate targetDate
        visionTag linkedWishlistId
        overallProgress=0 manifested=false
    end note
    耙候 --> 进行中 : 任一 KR 创建时
    note right of 进行中
        写入: status linkedKRIds[]
        接收: KR_PROGRESS_UPDATED
        触发: overallProgress = avg(KRs.progress)
    end note
    进行中 --> 已完成 : overallProgress >= 100
    note right of 已完成
        写入: status=已完成 manifested=true
        发出: OKR_COMPLETED
        → Wishlist manifestStatus → 已显化
        → ReviewCache 更新里程碑
    end note
    进行中 --> 暂停 : 超期未完成
    note right of 暂停
        写入: status=暂停 pausedAt
    end note
    暂停 --> 进行中 : 用户重启
    已完成 --> [*]
```

### 3·3 Wishlist 实体状态机

```mermaid
stateDiagram-v2
    [*] --> 种子 : onWishlistCreate
    note right of 种子
        写入: title category seedDate=now
        manifestStatus='🌱 种子' manifested=false
    end note
    种子 --> 孕育中 : 用户建立关联 OKR
    note right of 孕育中
        写入: linkedOKRId manifestStatus='🌱 孕育中'
        接收: EXPENSE_SAVED (category=存錢)
        → linkedBudget.savedAmount +=
    end note
    孕育中 --> 已显化 : OKR_COMPLETED 事件 / 手动标记
    note right of 已显化
        写入: manifestStatus='✨ 已显化'
        manifestedDate=now evidence=userInput
        触发: ManifestationCelebration
        写入: Milestone DB 新建行
    end note
    已显化 --> [*]
    孕育中 --> 暂停 : 用户主动暂停
    暂停 --> 孕育中 : 用户重启
```

### 3·4 KR 实体状态机

```tsx
// KR 不有显式 status 字段，但 progress 字段自身就是它的"状态"
const KR_PROGRESS_THRESHOLDS = {
  'not_started':  { range: [0, 0],    color: 'gray',   label: '未开始' },
  'in_progress':  { range: [0.01, 0.7], color: 'blue',   label: '进行中' },
  'near_goal':    { range: [0.7, 0.99], color: 'orange', label: '接近目标' },
  'completed':    { range: [1, 1],    color: 'green',  label: '已完成' },
};
// 每次 currentValue 更新都要走完这个函数
async function updateKRValue(
  krId: string,
  delta: number,
  updatedBy: 'task' | 'checkin' | 'fitness' | 'manual'
) {
  const kr = await db.keyResults.get(krId);
  // Step 1：写入 DB-05
  const newValue    = kr.currentValue + delta;
  const newProgress = clamp(
    (newValue - kr.startValue) / (kr.targetValue - kr.startValue), 0, 1
  );
  await db.keyResults.update(krId, {
    currentValue:  newValue,      // DB-05.currentValue
    progress:      newProgress,   // DB-05.progress
    lastUpdatedBy: updatedBy,     // DB-05.lastUpdatedBy
    lastUpdatedAt: new Date(),    // DB-05.lastUpdatedAt
  });
  // Step 2：发出事件 → OKRModule 监听
  eventBus.emit('KR_PROGRESS_UPDATED', {
    krId,
    linkedOKRId: kr.linkedOKRId,
    prevValue:   kr.currentValue,
    newValue,
    newProgress,
    updatedBy,
  });
}
```

---

## 四、HSI 全局广播机制

### 4·1 HSI 变更 → 各模块嗍应字段清单

```tsx
// 每当 HSI 状态变更（包括任一字段），各模块订阅 HSI_STATE_CHANGED 事件
// 并从 payload 中读取订阅的字段
const HSI_BROADCAST_SUBSCRIPTIONS = [
  // 1）TaskMatcherEngine
  {
    subscriber:    'TaskMatcherEngine',
    watchedFields: [
      'energy.overallEnergy',
      'focus.mentalCapacity',
      'swipScore',
      'temporal.timeOfDay',
    ],
    reaction:      '全量任务池重新评分 → TopN 列表刷新',
    triggerThreshold: '任意字段变化奇 > 0.1',
  },
  // 2）UIMode 引擎
  {
    subscriber:    'UIMode',
    watchedFields: [
      'energy.overallEnergy',
      'emotion.stressLevel',
      'focus.mentalCapacity',
    ],
    reaction:      '重算 UIMode → low-energy / high-stress / focused / normal',
    triggerThreshold: '任意字段跨过阈倦',
  },
  // 3）CrashRiskMonitor
  {
    subscriber:    'CrashRiskMonitor',
    watchedFields: [
      'swipScore',
      'focus.mentalCapacity',
      'emotion.stressLevel',
    ],
    reaction:      '评估风险等级 → 自动干预 / 弹出事件',
    triggerThreshold: 'swipScore 跨过 60/70/90 任一阈倦',
  },
  // 4）FitnessTracker
  {
    subscriber:    'FitnessTracker',
    watchedFields: [
      'energy.overallEnergy',
    ],
    reaction:      'energy <= 2 → 切换为 lowEnergyVariant 训练方案',
    triggerThreshold: 'overallEnergy 跨过 2 阈倦',
  },
  // 5）MiniCheckIn 显隐控制
  {
    subscriber:    'MiniCheckIn',
    watchedFields: [
      'confidence',
    ],
    reaction:      'confidence < 0.75 → visible = true',
    triggerThreshold: 'confidence 跨过 0.75 阈倦',
  },
  // 6）DashboardScreen 背景色调
  {
    subscriber:    'TodayZone',
    watchedFields: [
      'energy.overallEnergy',
      'emotion.stressLevel',
    ],
    reaction: [
      'energy <= 2 → isLowEnergy=true → 降饱和度 + 折叠次要模块',
      'stressLevel > 0.7 → isHighStress=true → 关闭动画 + 过渡降速',
    ],
    triggerThreshold: '跨过阈倦',
  },
];
```

### 4·2 HSI 内部字段更新流

```tsx
// 所有导致 HSI 内部字段变更的来源和更新方式
const HSI_UPDATE_SOURCES = [
  // 来源 A：用户手动覆盖（最高优先级）
  {
    source:      'EnergyIndicator 手动选择',
    writes: [
      { field: 'energy.manualOverride',   value: 'selectedValue (1–5)' },
      { field: 'energy.overallEnergy',    value: 'manualOverride' },
      { field: 'confidence',              value: '0.95' },
    ],
  },
  // 来源 B：MiniCheckIn 小签到
  {
    source:      'MiniCheckIn 选择',
    writes: [
      { field: 'energy.overallEnergy',    value: '{ good:5, okay:3, tired:2 }[selection]' },
      { field: 'confidence',              value: '0.85' },
      { field: 'energy.computedFromHSI',  value: 'false' },
    ],
  },
  // 来源 C：DB-08 历史快照（定期读取）
  {
    source:      'DB-08 最近一条 HSILogRecord',
    writes: [
      { field: 'energy.overallEnergy',    value: 'HSILog.energyLevel（加权融合）' },
      { field: 'focus.mentalCapacity',    value: 'HSILog.mentalCapacity（EWMA）' },
      { field: 'emotion.stressLevel',     value: 'HSILog.stressLevel（EWMA）' },
      { field: 'swipScore',               value: '重算' },
      { field: 'confidence',              value: 'timeFactor 线性衰减' },
    ],
  },
  // 来源 D：NutritionPlanner 饮食系数
  {
    source:      'NUTRITION_LOGGED 事件',
    writes: [
      { field: 'energy.overallEnergy',    value: 'clamp(round(base × energyBoostFactor), 1, 5)' },
    ],
  },
  // 来源 E：CheckIn 打卡扩充
  {
    source:      'CHECK_IN_COMPLETED 事件（早間冠悳/健身）',
    writes: [
      { field: 'energy.overallEnergy',    value: 'morning_meditation 加成 +0.1' },
      { field: 'focus.mentalCapacity',    value: 'morning_meditation 加成 +0.05' },
    ],
  },
  // 来源 F：任务拒绝学习
  {
    source:      'TASK_REJECTED 事件',
    writes: [
      { field: 'focus.mentalCapacity',    value: '-= 0.05 × rejectionCount (24h第一次)' },
      // TaskMatcher 内存中 rejectionPenalty 字段 += 3（当召）
    ],
  },
];
```

---

## 五、六大跨模块核心时序图

### 5·1 开启 App 到首屏渲染完成（全链路时序）

```tsx
// 目标：< 40ms 展示首屏，< 200ms 展示全部内容
async function appBootstrap() {
  // ===== T+0ms: 应用启动 =====
  // 层级 1：读取本地缓存（同步，< 5ms）
  const [cachedHSI, cachedTasks, cachedCheckIns] = await Promise.all([
    LocalCache.get('hsi'),              // 上次关闭时保存的 HSI 快照
    LocalCache.get('tasks_pending'),    // 待处理任务列表
    LocalCache.get('checkins_today'),   // 今日打卡字段
  ]);
  // 写入：内存 (HSIProvider.state / TaskPool / CheckInStore)
  // ===== T+5ms: 首屏渲染（缓存数据）=====
  render('<DashboardScreen />');
  // 此时 UI 可见，但是旧数据
  // 层级 2：并行读取 P0 网络数据
  const [freshHSI, freshTasks, freshCheckIns] = await Promise.all([
    // HSI：读取 DB-08 最新快照
    fetchHSISnapshot(),          // 读字段: DB-08.energyLevel/stressLevel/mentalCapacity
    // 任务：读取 DB-03 待处理 + 进行中
    fetchPendingTasks(),         // 读字段: 包含 TASK_MATCHER_READ_FIELDS 全集
    // 打卡：读取 DB-01 今日记录
    fetchTodayCheckIns(),        // 读字段: isDone label timeSlot linkedOKRId
  ]);
  // ===== T+40ms: 刷新首屏（新数据）=====
  HSIProvider.setState(freshHSI);
  // 发出 HSI_STATE_CHANGED → TaskMatcherEngine 重排
  TaskMatcherEngine.run(freshTasks, freshHSI);
  // 写入 TopN 列表 → <TaskRecommendList /> 重渲染
  // 层级 3：并行读取 P1 数据（封面渲染后 200ms 内）
  await Promise.all([
    fetchActiveOKRs(),           // 读字段: DB-04 id title overallProgress status
    fetchTodayFitnessPlan(),     // 读字段: DB-09 scheduledDate energyRequired
    fetchTodayMealPlan(),        // 读字段: DB-11 mealSlot title eaten
  ]);
  // 写入内存，触发 P1 区块刷新（OKRProgressToggle / FitnessWidget / NutritionWidget）
  // 层级 4：并行读取 P2 数据（不阻塞交互）
  Promise.all([
    fetchHSIHistory(),           // 读字段: DB-08 最近 5 条
    fetchWishlistActive(),       // 读字段: DB-07 manifestStatus != 已显化
    fetchLowStockItems(),        // 读字段: DB-12 quantity <= restockThreshold
  ]).then(updateP2Blocks);
}
```

### 5·2 周回顾完成 → 下周任务排序（LOOP-05 完整时序）

```tsx
// 全时序：周回顾 Step⑤ 用户点击「确认」 → 下周任务序列重排完成
async function onReviewConfirmed(payload: ReviewConfirmedEvent['payload']) {
  // Step 1：ReadCache: 获取当前周所有未完成任务
  const unfinishedTasks = await db.tasks.getFiltered({
    filter: { status: { $in: ['🕐 待处理', '🔄 进行中', '⏸ 暂停'] } },
  });
  // 读取字段：id title priority dueDate linkedOKRId status
  // Step 2：任务 weeklyPriority 批量写入（LOOP-05 核心）
  await Promise.all(
    Object.entries(payload.weeklyPriorityMap).map(([taskId, priority]) =>
      db.tasks.update(taskId, {
        weeklyPriority: priority,  // DB-03.weeklyPriority (1–5)
        // 注：未在 weeklyPriorityMap 中的任务保持原値
      })
    )
  );
  // Step 3：OKR 周回顾备注写入
  await Promise.all(
    Object.entries(payload.reviewNotes).map(([okrId, note]) =>
      db.okrs.update(okrId, {
        reviewNote: note,          // DB-04.reviewNote
      })
    )
  );
  // Step 4：TaskMatcherEngine 重启（因为 weeklyPriority 已变）
  // TaskMatcher weeklyBoostScore 公式：(6 - weeklyPriority) × 5
  // priority=1 → +25，秒入下周 Top3 的概率大幅提升
  const freshTasks = await db.tasks.getFiltered({ status: $in(['🕐', '🔄']) });
  eventBus.emit('HSI_STATE_CHANGED', { source: 'review_confirmed' });
  // 触发 TaskMatcherEngine 全量重排
  // Step 5：循环周期注册（如有周期 ID）
  if (payload.cycleId) {
    await db.cycles.update(payload.cycleId, {
      lastReviewedAt:    new Date(),
      weeklyReviewCount: (cycle.weeklyReviewCount ?? 0) + 1,
    });
  }
  // Step 6：发出 REVIEW_CONFIRMED 事件
  eventBus.emit('REVIEW_CONFIRMED', payload);
}
```

### 5·3 知识录入 → 任务生成 → OKR 关联（LOOP-03 全时序）

```tsx
// 最具代表性的跨三模块时序：Knowledge → Task → OKR
async function knowledgeToTaskToOKR(knowledgeDraft: KnowledgeDraft) {
  // ① Knowledge 模块：P0 写入
  const knowledge = await db.knowledge.create({
    title:      knowledgeDraft.title,
    R_reading:  knowledgeDraft.R_reading,  // DB-06.R_reading
    I_insight:  knowledgeDraft.I_insight,  // DB-06.I_insight
    A_action:   knowledgeDraft.A_action,   // DB-06.A_action
    source:     knowledgeDraft.source,
    tags:       knowledgeDraft.tags ?? [],
    createdAt:  new Date(),
  });
  // 字段流出：knowledge.A_action → 事件 payload
  eventBus.emit('KNOWLEDGE_ACTION_SAVED', {
    knowledgeId: knowledge.id,
    aAction:     knowledge.A_action,
    linkedOKRId: knowledge.linkedOKRId,
    tags:        knowledge.tags,
  });
  // ② Task 模块：监听 KNOWLEDGE_ACTION_SAVED，P1 写入
  //  (这部分属于 TaskModule.onKnowledgeActionSaved)
  const newTask = await db.tasks.create({
    title:              knowledge.A_action,         // 字段接收：aAction → title
    source:             'knowledge',               // DB-03.source
    linkedKnowledgeIds: [knowledge.id],            // DB-03.linkedKnowledgeIds
    linkedOKRId:        knowledge.linkedOKRId,     // 字段传递：knowledge.linkedOKRId → task
    cognitiveLoad:      2,
    status:             '🕐 待处理',
    priority:           'P2-中',
    okrContribution:    1,
  });
  // 回写字段：knowledge.generatedTaskId
  await db.knowledge.update(knowledge.id, {
    generatedTaskId: newTask.id,                  // DB-06.generatedTaskId
  });
  // ③ AI 异步：P2 语义分析 → 匹配 OKR
  const aiResult = await aiAnalyze(knowledge.id);
  await db.knowledge.update(knowledge.id, {
    semanticEmbedding: aiResult.embedding,        // DB-06.semanticEmbedding
    aiSuggestedOKRId:  aiResult.topMatchOKRId,    // DB-06.aiSuggestedOKRId
    aiMatchScore:      aiResult.matchScore,        // DB-06.aiMatchScore
  });
  if (aiResult.matchScore > 0.65) {
    // 推送给用户：弹出 OKRLinkSuggestionCard
    dispatch('SHOW_OKR_SUGGESTION', { knowledgeId: knowledge.id, okrId: aiResult.topMatchOKRId });
    // 用户确认后进入 ④
  }
  // ④ OKR 模块：用户确认关联后
  //  (用户点击确认按钮 → onOKRLinkConfirmed)
  async function onOKRLinkConfirmed(okrId: string) {
    // 字段写入：DB-06
    await db.knowledge.update(knowledge.id, { linkedOKRId: okrId });
    // 字段写入：DB-03（已生成的 Task 补充 OKR 关联）
    await db.tasks.update(newTask.id,     { linkedOKRId: okrId });
    // 字段写入：DB-04
    const okr = await db.okrs.get(okrId);
    await db.okrs.update(okrId, {
      linkedKnowledgeCount: okr.linkedKnowledgeCount + 1,  // LOOP-03 最终写入
    });
    // 发出事件
    eventBus.emit('KNOWLEDGE_OKR_LINKED', {
      knowledgeId: knowledge.id,
      okrId,
      matchScore:  aiResult.matchScore,
      confirmedBy: 'user',
    });
  }
}
```

### 5·4 HSI 崩溃间接工作流（Flow 2 全时序）

```tsx
// CrashRiskMonitor 每 60s 运行一次
async function crashRiskTick() {
  // Step 1：读取当前 HSI（内存读，无网络请求）
  const hsi = HSIProvider.getState();
  // 读取字段：swipScore focus.mentalCapacity emotion.stressLevel energy.overallEnergy
  // Step 2：评估风险级别
  const level = evaluateRiskLevel(hsi);
  // 内部读取字段：
  //   swipScore、mentalCapacity、stressLevel、
  //   checkInRate_7d（来自 DB-01 缓存）、tasksRejected_today（来自内存拒绝记录）
  // Step 3：写入 DB-08 HSI 快照（P3 批量）
  HSILogBuffer.push({
    energyLevel:     hsi.energy.overallEnergy,
    stressLevel:     hsi.emotion.stressLevel,
    mentalCapacity:  hsi.focus.mentalCapacity,
    swipScore:       hsi.swipScore,
    source:          'hsi-auto',
    confidence:      hsi.confidence,
    timestamp:       new Date(),
  });
  // HSILogBuffer 每分钟批量写入 DB-08（P3）
  // Step 4：根据级别分发事件
  switch (level) {
    case 'low':
      break; // 无操作
    case 'medium':
      // 自动干预（用户无感知）
      // 不调用任何 API，只更新内存字段：
      TaskMatcherEngine.applyHardFilter({ maxCognitiveLoad: 3 }); // 屏蔽 认知负荷>=4 任务
      NotificationThrottler.setLevel('throttled'); // 非紧肥推送全部延迟
      break;
    case 'high':
      // 建议干预
      dispatch('SHOW_CRASH_INTERVENTION', { mode: 'suggestion', swipScore: hsi.swipScore });
      // 写入字段：内存 intervention_shown_at = now（防重复触发）
      break;
    case 'critical':
      // 全屏干预
      dispatch('SHOW_CRASH_INTERVENTION', { mode: 'fullscreen', swipScore: hsi.swipScore });
      TaskMatcherEngine.applyHardFilter({ maxCognitiveLoad: 1 }); // 只显示 认知负荷=1 任务
      break;
  }
}
// 用户响应干预处理
async function onInterventionResponse(
  choice: 'accept' | 'ignore' | 'detail'
) {
  if (choice === 'accept') {
    // 用户选择休息 20min
    // 写入内存：
    const lockUntil = new Date(Date.now() + 20 * 60 * 1000);
    TaskMatcherEngine.applyTimeLock({ until: lockUntil, maxCognitiveLoad: 1 });
    // 写入字段：DB-08 最新一条 record.interventionAccepted = true
    await db.hsiLogs.updateLatest({ interventionAccepted: true });
  }
  if (choice === 'ignore') {
    // 写入内存：忽略次数 += 1，提高下次触发阈倦
    HSIProvider.setState(s => ({ ...s, ignoreCount: (s.ignoreCount ?? 0) + 1 }));
    // 阐倦提升： 每忽略一次，下次触发需要 swipScore 再高 5 分
  }
}
```

### 5·5 活动创建 → 任务生成 → 库存检查 → 打卡闭环（Flow 7 全时序）

```tsx
async function activityFullFlow(activityDraft: ActivityDraft) {
  // ① DB-14 写入（P0）
  const activity = await db.activities.create({
    title:              activityDraft.title,
    activityType:       activityDraft.activityType,
    scheduledDate:      activityDraft.scheduledDate,
    status:             '计划中',
    autoGenerateTasks:  true,
    taskTemplates:      getBuiltInTemplates(activityDraft.activityType),
    linkedOKRId:        activityDraft.linkedOKRId,
  });
  eventBus.emit('ACTIVITY_CREATED', { activityId: activity.id, ...activity });
  // ② TaskModule 监听 ACTIVITY_CREATED → 批量创建任务（P1）
  const generatedTasks: string[] = [];
  for (const tpl of activity.taskTemplates) {
    const task = await db.tasks.create({
      title:           tpl.title,
      cognitiveLoad:   tpl.cognitiveLoad,
      scheduledDate:   subtractDays(activity.scheduledDate, tpl.daysBeforeActivity),
      linkedActivityId: activity.id,
      linkedOKRId:     activity.linkedOKRId,
      status:          '🕐 待处理',
      priority:        'P2-中',
    });
    generatedTasks.push(task.id);
    // ③ 库存检查：找到关联的库存物品，检查是否需补货
    if (tpl.linkedInventoryIds?.length) {
      const items = await db.inventory.getByIds(tpl.linkedInventoryIds);
      for (const item of items) {
        // 读取字段：DB-12.quantity / restockThreshold / restockTaskId
        if (item.quantity <= item.restockThreshold && !item.restockTaskId) {
          // LOOP-09B: 生成补货任务
          const restockTask = await db.tasks.create({
            title:         `购买 ${item.name}`,    // DB-03.title
            cognitiveLoad: 1,
            priority:      'P2-中',
            source:        'manual',
          });
          // 回写 DB-12.restockTaskId（防重复）
          await db.inventory.update(item.id, { restockTaskId: restockTask.id });
        }
      }
    }
  }
  // ④ 回写 DB-14.linkedTaskIds
  await db.activities.update(activity.id, { linkedTaskIds: generatedTasks });
  // ⑤ 活动当天：健身计划完成 → CheckIn 打卡 → OKR KR 进度
  // （连接 FitnessTracker 发出 WORKOUT_COMPLETED → LOOP-07 + LOOP-11）
  // 参见 § 5·2 LOOP-07+11 时序
}
```

### 5·6 完整数据字段流转汇总 Mermaid

```mermaid
sequenceDiagram
    actor 用户
    participant CheckIn
    participant HSI as HSIProvider
    participant TM as TaskMatcher
    participant Task as TaskModule
    participant KR as KRModule
    participant OKR as OKRModule
    participant WL as WishlistModule
    participant Review as ReviewScreen
    Note over 用户,WL: 典型工作日数据流转全时序
    用户->>CheckIn: 早間打卡勾选
    CheckIn->>HSI: hsiSnapshot.energyAtMorning
    CheckIn->>OKR: checkInContribution += 1（linkedOKRId）
    CheckIn->>CheckIn: DB-02.completedDates.push
    HSI-->>TM: HSI_STATE_CHANGED
    TM-->>TM: 重新评分全量任务
    TM-->>Task: TopN 列表刷新
    用户->>Task: 完成任务
    Task->>Task: status=已完成 completedAt=now
    Task->>KR: currentValue += okrContribution
    KR->>OKR: KR_PROGRESS_UPDATED
    OKR->>OKR: overallProgress=avg(KRs)
    OKR->>OKR: status 自动推进
    alt OKR status → 已完成
        OKR->>WL: manifestStatus → 已显化
        WL-->用户: ManifestationCelebration
    end
    用户->>Review: 周回顾确认
    Review->>Task: weeklyPriority 批量写入
    Review->>OKR: reviewNote 写入
    Review->>TM: HSI_STATE_CHANGED（触发全量重排）
```

---

## 六、数据架构补充设计：跨库字段一致性规则

### 6·1 公共字段命名规范

```tsx
// 所有 DB 共同遵守的字段命名规范，避免模块间字段名冲突
const GLOBAL_FIELD_NAMING = {
  // 识别字段
  'id':              '每个 DB 的主黨，类型 string，格式 UUID',
  'createdAt':       '创建时间，类型 Date，所有 DB 必填',
  'updatedAt':       '最后修改时间，类型 Date',
  // 状态字段
  'status':          '实体状态，类型 string (enum)，必填',
  'isActive':        '当前是否忽用，类型 boolean，默认 true',
  // 关联字段 (命名规范： linked + 目标实体 + Id/Ids)
  'linkedXXXId':     '单个关联，类型 string',
  'linkedXXXIds':    '多个关联，类型 string[]，默认 []',
  // 进度字段
  'progress':        '0–1 浮点数，公式字段，禁止直接写入',
  'XXXProgress':     '特定维度进度，同上',
  'overallProgress': '0–100 整数，展示用百分比',
  // 时间字段 (名词 + At)
  'completedAt':     '完成时间，类型 Date，可空',
  'manifestedDate':  '显化时间，类型 Date，可空',
  'lastUpdatedAt':   '最后更新时间，类型 Date',
  // 贡献量字段
  'XXXContribution': '对某目标的贡献单位量，类型 number，默认 1',
};
```

### 6·2 禁止直接写入的公式字段

```tsx
// 以下字段必须通过对应函数计算并写入，禁止任何模块直接赋値
const FORMULA_FIELDS: Record<string, string> = {
  // DB-05
  'KeyResultRecord.progress':   'computeKRProgress(kr)    = (currentValue-start)/(target-start)',
  // DB-04
  'OKRRecord.overallProgress':  'computeOKRProgress(krs)  = round(avg(KRs.progress) × 100)',
  'OKRRecord.status':           'computeOKRStatus(okr, progress)',
  // DB-08
  'HSILogRecord.swipScore':     '按 HSI 六分项公式计算',
  // DB-01
  'LIFEMATRICESRecord.checkInScore': 'done_count / CHECKIN_FIELDS.length',
  'LIFEMATRICESRecord.streakDays':   '回查连续打卡最大天数',
  // DB-10
  'NutritionGoalRecord.energyBoostFactor': '根据萤白质比例和兮糖负荷计算 (0.8–1.2)',
  // DB-09
  'FitnessPlanRecord.totalVolume': 'Σ(actualSets × actualReps × actualWeight)',
  // HSI 内部
  'hsi.swipScore':              '六分项加权公式',
  'hsi.confidence':             '时间衰减因子 × 来源权重',
};
```

### 6·3 字段锁定规则（防并发冲突）

</aside>