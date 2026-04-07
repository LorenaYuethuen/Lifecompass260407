# 十七、LOOP-12~16 精细化

## LOOP-12 · 健身 Tracker 完成 → OKR KR 进度

```tsx
// 触发条件：DB-09b Tracker.completedAt 写入（用户点击「完成训练」）
// 前置字段：DB-09b.linkedKRId（来自 DB-09a.linkedKRId 继承）

function executeLoop12(tracker: WorkoutTrackerEntry): void {
  if (!tracker.linkedKRId) return;  // 无 KR 关联，静默跳过

  const idempotencyKey = `${tracker.id}:loop12`;
  if (pendingOps.has(idempotencyKey)) return;   // 防重复

  // P1 写入 DB-05：
  // 原子加法：currentValue += actualVolume
  // 注意：volumeUnit 须与 KR.unit 一致（DB-09a.volumeUnit === DB-05.unit）
  DB05.patch(tracker.linkedKRId, {
    currentValue:  increment(tracker.actualVolume),
    lastUpdatedBy: 'workout',
    lastUpdatedAt: tracker.completedAt,
  });

  // 触发 DB-04.overallProgress 公式重算（服务端自动）
  // 若 overallProgress 达到 100% → 触发 ManifestationCelebration 候选通知
}

// 与 LOOP-16 的去重规则：
// - LOOP-12：单次训练完成时即时触发（实时）
// - LOOP-16：周回顾 Step③ 时批量核对（不重复加）
// 去重机制：DB-05.lastUpdatedBy = 'workout' 时，LOOP-16 检查本周已有记录则跳过
```

## LOOP-13 · 营养合规 → HSI energyBoostFactor

```tsx
// 触发条件：DB-11 MealLog 写入后（每次进餐记录）
// 影响周期：当日 energyBoostFactor，次日凌晨重置

function executeLoop13(dailyMealLogs: MealLog[]): void {
  // 当日所有 MealLog 营养合规均值
  const dailyNutritionScore = mean(dailyMealLogs.map(m => m.nutritionScore));

  // energyBoostFactor 公式：
  //   完美饮食（score=1.0）→ factor=1.20  →  rawEnergy +0.6（约 +0.3~0.6 档）
  //   基线（score=0.5）  → factor=1.00  →  无影响
  //   很差饮食（score=0）→ factor=0.80  →  rawEnergy -0.4（约 -0.2~0.4 档）
  const energyBoostFactor = clamp(1.0 + (dailyNutritionScore - 0.5) * 0.4, 0.8, 1.2);

  // P1 写入 DB-08 当日日志：
  DB08.patchToday({ energyBoostFactor });

  // HSIInferenceInput 内存更新（立即生效于下次 inferHSI()）：
  hsiInputCache.energyBoostFactor = energyBoostFactor;

  // 数据可视化（ReviewScreen WeeklyDataSummary）：
  // weeklyNutritionScore = mean(近7天 dailyNutritionScore)
  // 展示为「🥗 本周饮食合规率：XX%」
}
```

## LOOP-14 · 进餐时间戳 → HSI 饥饿惩罚

```tsx
// 触发条件：DB-11 MealLog.mealTimestamp 写入（即时触发）
// 影响字段：HSIInferenceInput.lastMealTimestamp

function executeLoop14(mealTimestamp: Date): void {
  // P1 写入内存（立即）：
  hsiInputCache.lastMealTimestamp = mealTimestamp;

  // 若距今 < 30min → 立即重算 HSI（避免用餐后仍显示「饥饿惩罚」）
  const minutesSinceMeal = (Date.now() - mealTimestamp.getTime()) / 60000;
  if (minutesSinceMeal < 30) {
    triggerHSIRecalculation();
    // → inferHSI() 重算 hungerPenalty
    // → hoursHungry ≈ 0 → hungerPenalty ≈ 0 → rawEnergy 恢复
  }

  // P2 写入 DB-08 当日快照（批量，每小时一次）：
  DB08.patchToday({ lastMealTimestamp: mealTimestamp });

  // 注：DB-11 中连续 > 6 小时无记录 → hoursHungry=6 → hungerPenalty=0.33
  //   → overallEnergy 可能下降 1 档 → TaskRecommendList 过滤高认知任务
  //   → TodayZone 顶部提示「你有一段时间没有进食了，先补充能量？🍃」（可关闭）
}
```

## LOOP-15 · Habits Streak 里程碑 → Wishlist / 里程碑 DB

```tsx
// 触发条件：DB-02.streak 更新后命中 STREAK_MILESTONES 阈值
// 触发时机：completedDates arrayUnion 写入完成后

const LOOP15_MILESTONE_ACTIONS: Record<number, {
  createMilestoneRecord: boolean;
  pushNotification:      string;
  wishlistUpdateHint?:   string;  // 若 DB-07 有关联愿望，推荐更新状态
}> = {
  7:   { createMilestoneRecord: false, pushNotification: '🌱 连续 7 天，小苗已发芽！' },
  21:  { createMilestoneRecord: true,  pushNotification: '🔥 连续 21 天，习惯正在成型',
         wishlistUpdateHint: '这与你的愿望「{wishTitle}」紧密相关，要更新进展吗？' },
  66:  { createMilestoneRecord: true,  pushNotification: '✨ 连续 66 天，神经回路已重塑！',
         wishlistUpdateHint: '「{wishTitle}」感觉已经可以标记为「孕育中」了 🌿' },
  100: { createMilestoneRecord: true,  pushNotification: '🏆 100 天！这是一个值得庆祝的时刻。' },
};

function executeLoop15(habit: HabitRecord): void {
  const action = LOOP15_MILESTONE_ACTIONS[habit.streak];
  if (!action) return;

  // 写入里程碑 DB（REL-09）
  if (action.createMilestoneRecord) {
    MilestoneDB.create({
      title:           `[${habit.title}] 连续 ${habit.streak} 天`,
      linkedHabitId:   habit.id,
      linkedOKRId:     habit.linkedOKRId,
      date:            today(),
      milestoneType:   'streak',
    });
  }

  // 推送通知
  NotificationThrottler.push({
    message:  action.pushNotification,
    priority: 'P1',
    action:   action.wishlistUpdateHint ? '更新愿望进展' : '查看里程碑',
  });

  // 若有关联 Wishlist 且 wishlistUpdateHint 存在：
  if (action.wishlistUpdateHint && habit.linkedOKRId) {
    const linkedWish = DB07.findByLinkedOKRId(habit.linkedOKRId);
    if (linkedWish && linkedWish.manifestStatus === '🌱 种子') {
      // 推送带行动按钮的提醒，点击 → WishlistForm 预填
      NotificationThrottler.pushActionable({
        message:        action.wishlistUpdateHint.replace('{wishTitle}', linkedWish.title),
        onAccept:       () => navigateTo('WishlistForm', { prefilledStatus: '🌱 孕育中', wishId: linkedWish.id }),
        onDismiss:      () => {},
      });
    }
  }
}
```

## LOOP-16 · 周运动统计 → ReviewScreen KR 自动填充

```tsx
// 触发条件：ReviewScreen Step③ OKRProgressPanel 渲染时
// 触发时机：WeeklyData 五库并行查询完成后，用户查看 KR 明细时

function executeLoop16(weekStart: Date, weekEnd: Date): Promise<void> {
  // 查询本周 DB-09b Tracker 记录
  const weeklyTrackers = await DB09b.query({
    filter: `completedAt >= '${weekStart}' AND completedAt <= '${weekEnd}'`,
    fields: ['actualVolume', 'linkedKRId', 'completedAt'],
  });

  // 按 KR 分组聚合本周总量
  const krVolumeMap: Record<string, number> = {};
  for (const tracker of weeklyTrackers) {
    if (tracker.linkedKRId) {
      krVolumeMap[tracker.linkedKRId] = (krVolumeMap[tracker.linkedKRId] ?? 0) + tracker.actualVolume;
    }
  }

  // 与 DB-05 KR 当前值核对（避免与 LOOP-12 重复加）
  for (const [krId, weeklyVolume] of Object.entries(krVolumeMap)) {
    const kr = await DB05.get(krId);

    // 去重检查：本周 LOOP-12 已更新过的量不再重复加
    const alreadyUpdatedByLoop12 = await DB09b.countByKRAndWeek(krId, weekStart, weekEnd);
    // 若 LOOP-12 每次训练都已即时写入，则 LOOP-16 理论上 delta=0
    // 实际处理：读取 DB-05.lastUpdatedByWorkout 时间戳，仅在缺失时补录
    if (kr.lastUpdatedBy !== 'workout' || kr.lastUpdatedAt < weekStart) {
      // 补录情形：用户删除了 LOOP-12 写入，或 LOOP-12 失败降级
      await DB05.patch(krId, {
        currentValue:  kr.currentValue + weeklyVolume,
        lastUpdatedBy: 'loop16-review',
        lastUpdatedAt: new Date(),
      });
    }
    // 否则静默跳过（LOOP-12 已处理，LOOP-16 幂等）
  }

  // 在 OKRProgressPanel 展示补录结果：
  // 若有补录发生 → 显示「📊 根据本周健身记录已自动更新 KR」（提示条）
}

// ── LOOP 依赖关系总表 ─────────────────────────────────────────────
const LOOP_DEPENDENCY_GRAPH = {
  'LOOP-11': { source: 'DB-09b.actualVolume', target: 'DB-05.currentValue',     timing: '即时（训练完成后）' },
  'LOOP-12': { source: 'DB-09b.completedAt',  target: 'DB-05.currentValue',     timing: '即时（与 LOOP-11 并行）' },
  'LOOP-13': { source: 'DB-11.nutritionScore',target: 'DB-08.energyBoostFactor',timing: '每次进餐后（当日累计）' },
  'LOOP-14': { source: 'DB-11.mealTimestamp', target: 'HSI.lastMealTimestamp',  timing: '即时（< 50ms）' },
  'LOOP-15': { source: 'DB-02.streak',        target: '里程碑DB / DB-07',        timing: '打卡后触发里程碑检测' },
  'LOOP-16': { source: 'DB-09c.weeklyVolume', target: 'DB-05.currentValue',     timing: '周回顾 Step③（幂等补录）' },
};
```

---

# 十、真实数据源映射总表

| `<SystemNavToggle>` Step 4 | [就医与药品](https://www.notion.so/ceb546123a6d83bcaca9811b1e7022f5?pvs=21) / [健身运动管理](https://www.notion.so/599546123a6d82ac82be015c0bdda069?pvs=21) / [营养与健康](https://www.notion.so/f14546123a6d82ec8840819f3baa7006?pvs=21) / [饮食计划器](https://www.notion.so/4a6546123a6d82a28fda81ddab76a3ef?pvs=21) / [收支管理](https://www.notion.so/7ef546123a6d8366b3188133cca041d9?pvs=21) / [LIFE COMPASS 系统优化 · 需求说明书 & 设计说明书](https://www.notion.so/LIFE-COMPASS-19d546123a6d8306a1ce8161b9480ac9?pvs=21) / [LIFE COMPASS · 产品设计文档 v4.0](https://www.notion.so/LIFE-COMPASS-v4-0-c49546123a6d83e9ad6081dd3dff942f?pvs=21) | 🌿 生活方式实践页面群 |
| --- | --- | --- |
| `<SystemNavToggle>` Step 2 | [收集箱](https://www.notion.so/19c546123a6d8317a3a48183b94f82f2?pvs=21) / [OKR](https://www.notion.so/OKR-848546123a6d8373ae86819312d55995?pvs=21) / [执行](https://www.notion.so/f64546123a6d83518c76012b41c95a1f?pvs=21) / [知识管理](https://www.notion.so/0db546123a6d825f8e8b81896835880b?pvs=21) / [回顾纠偏](https://www.notion.so/f76546123a6d829f9e6401e2865a64d3?pvs=21) | ⚒️ 方法论 SOP 页面群 |
| `<OKRScreen>` (PLAN 入口) | [](https://www.notion.so/bd2546123a6d82159523017fa9476d40?pvs=21) / [](https://www.notion.so/388546123a6d82cebd3901c675a7a9fe?pvs=21) / [](https://www.notion.so/ff9546123a6d83589f9281bdbaec3ed8?pvs=21) | 🎯 目标执行数据库 |
| `<TaskPlanScreen>` (PLAN 入口) | [](https://www.notion.so/a9a546123a6d8273b7b78126db3e74a3?pvs=21) / [](https://www.notion.so/90a546123a6d83f6b50381edc53c0d39?pvs=21) | 🔃 任务计划数据库 |
| `<OKRProgressToggle>` / `<OKRProgressPanel>` | [](https://www.notion.so/888546123a6d828fa6d181445f493cd1?pvs=21) | 📊 当前进行中 OKR 目标 |
| `<TaskRecommendList>` / `<TaskManagerScreen>` | [](https://www.notion.so/b06546123a6d82f1895781a03baf1fb4?pvs=21) | ✅ 进行中任务 |
| `<CheckInTable>` | [](https://www.notion.so/abf546123a6d8315bf59012c4ff11db5?pvs=21) / [](https://www.notion.so/b3f546123a6d831093c781e134fc24dd?pvs=21) | 📆 今日打卡（LIFEMATRICES + Habits） |
| `<TaskRecommendList>` / `<TaskManagerScreen>` | [](https://www.notion.so/b06546123a6d82f1895781a03baf1fb4?pvs=21) | ✅ 进行中任务 |
| `<LifestyleScreen>` (Step 4) | [](https://www.notion.so/07b546123a6d827daaaa81851e6819bc?pvs=21) / [](https://www.notion.so/d2f546123a6d8339973d8151a1d3ea08?pvs=21) | 🗓 活动计划数据库 |
| `<SystemNavToggle>` Step 2 | [收集箱](https://www.notion.so/19c546123a6d8317a3a48183b94f82f2?pvs=21) / [OKR](https://www.notion.so/OKR-848546123a6d8373ae86819312d55995?pvs=21) / [执行](https://www.notion.so/f64546123a6d83518c76012b41c95a1f?pvs=21) / [知识管理](https://www.notion.so/0db546123a6d825f8e8b81896835880b?pvs=21) / [回顾纠偏](https://www.notion.so/f76546123a6d829f9e6401e2865a64d3?pvs=21) | ⚒️ 方法论 SOP 页面群 |
| `<SystemNavToggle>` Step 2 | [收集箱](https://www.notion.so/19c546123a6d8317a3a48183b94f82f2?pvs=21) / [OKR](https://www.notion.so/OKR-848546123a6d8373ae86819312d55995?pvs=21) / [执行](https://www.notion.so/f64546123a6d83518c76012b41c95a1f?pvs=21) / [知识管理](https://www.notion.so/0db546123a6d825f8e8b81896835880b?pvs=21) / [回顾纠偏](https://www.notion.so/f76546123a6d829f9e6401e2865a64d3?pvs=21) | ⚒️ 方法论 SOP 页面群 |
| `<WishlistScreen>` | [Wishlist](https://www.notion.so/Wishlist-aed546123a6d82a7a443815730aedb95?pvs=21) | 🌌 愿景 + 🎯 目标页面 |
| `<LifestyleScreen>` (Step 4) | [](https://www.notion.so/07b546123a6d827daaaa81851e6819bc?pvs=21) / [](https://www.notion.so/d2f546123a6d8339973d8151a1d3ea08?pvs=21) | 🗓 活动计划数据库 |
| `<TaskRecommendList>` / `<TaskManagerScreen>` | [](https://www.notion.so/b06546123a6d82f1895781a03baf1fb4?pvs=21) | ✅ 进行中任务 |
| `<CheckInTable>` | [](https://www.notion.so/abf546123a6d8315bf59012c4ff11db5?pvs=21) / [](https://www.notion.so/b3f546123a6d831093c781e134fc24dd?pvs=21) | 📆 今日打卡（LIFEMATRICES + Habits） |
| `<CheckInTable>` | [](https://www.notion.so/abf546123a6d8315bf59012c4ff11db5?pvs=21) / [](https://www.notion.so/b3f546123a6d831093c781e134fc24dd?pvs=21) | 📆 今日打卡（LIFEMATRICES + Habits） |
| **组件** | **Notion 数据库 / 页面** | **用途** |
| `<CheckInTable>` | [](https://www.notion.so/abf546123a6d8315bf59012c4ff11db5?pvs=21) / [](https://www.notion.so/b3f546123a6d831093c781e134fc24dd?pvs=21) | 📆 今日打卡（LIFEMATRICES + Habits） |
| `<TaskRecommendList>` / `<TaskManagerScreen>` | [](https://www.notion.so/b06546123a6d82f1895781a03baf1fb4?pvs=21) | ✅ 进行中任务 |
| `<OKRProgressToggle>` / `<OKRProgressPanel>` | [](https://www.notion.so/888546123a6d828fa6d181445f493cd1?pvs=21) | 📊 当前进行中 OKR 目标 |
| `<OKRProgressToggle>` / `<OKRProgressPanel>` | [](https://www.notion.so/888546123a6d828fa6d181445f493cd1?pvs=21) | 📊 当前进行中 OKR 目标 |
| `<OKRProgressToggle>` / `<OKRProgressPanel>` | [](https://www.notion.so/888546123a6d828fa6d181445f493cd1?pvs=21) | 📊 当前进行中 OKR 目标 |
| `<KnowledgeEntryForm>` / `<KnowledgeScreen>` | [](https://www.notion.so/3c4546123a6d825b9dd381968c0c45a4?pvs=21) | 📚 知识输入数据库 |
| `<TaskPlanScreen>` (PLAN 入口) | [](https://www.notion.so/a9a546123a6d8273b7b78126db3e74a3?pvs=21) / [](https://www.notion.so/90a546123a6d83f6b50381edc53c0d39?pvs=21) | 🔃 任务计划数据库 |
| `<OKRScreen>` (PLAN 入口) | [](https://www.notion.so/bd2546123a6d82159523017fa9476d40?pvs=21) / [](https://www.notion.so/388546123a6d82cebd3901c675a7a9fe?pvs=21) / [](https://www.notion.so/ff9546123a6d83589f9281bdbaec3ed8?pvs=21) | 🎯 目标执行数据库 |
| `<OKRScreen>` (PLAN 入口) | [](https://www.notion.so/bd2546123a6d82159523017fa9476d40?pvs=21) / [](https://www.notion.so/388546123a6d82cebd3901c675a7a9fe?pvs=21) / [](https://www.notion.so/ff9546123a6d83589f9281bdbaec3ed8?pvs=21) | 🎯 目标执行数据库 |
| `<OKRScreen>` (PLAN 入口) | [](https://www.notion.so/bd2546123a6d82159523017fa9476d40?pvs=21) / [](https://www.notion.so/388546123a6d82cebd3901c675a7a9fe?pvs=21) / [](https://www.notion.so/ff9546123a6d83589f9281bdbaec3ed8?pvs=21) | 🎯 目标执行数据库 |
| `<WishlistScreen>` | [](https://www.notion.so/d28546123a6d83e89a9881b1dbbde3a2?pvs=21) | 📦 物品财务（愿景显化关联） |
| `<LifestyleScreen>` (Step 4) | [](https://www.notion.so/07b546123a6d827daaaa81851e6819bc?pvs=21) / [](https://www.notion.so/d2f546123a6d8339973d8151a1d3ea08?pvs=21) | 🗓 活动计划数据库 |
| `<LifestyleScreen>` (Step 4) | [](https://www.notion.so/07b546123a6d827daaaa81851e6819bc?pvs=21) / [](https://www.notion.so/d2f546123a6d8339973d8151a1d3ea08?pvs=21) | 🗓 活动计划数据库 |
| `<WishlistScreen>` | [Wishlist](https://www.notion.so/Wishlist-aed546123a6d82a7a443815730aedb95?pvs=21) | 🌌 愿景 + 🎯 目标页面 |
| `<SystemNavToggle>` Step 2 | [收集箱](https://www.notion.so/19c546123a6d8317a3a48183b94f82f2?pvs=21) / [OKR](https://www.notion.so/OKR-848546123a6d8373ae86819312d55995?pvs=21) / [执行](https://www.notion.so/f64546123a6d83518c76012b41c95a1f?pvs=21) / [知识管理](https://www.notion.so/0db546123a6d825f8e8b81896835880b?pvs=21) / [回顾纠偏](https://www.notion.so/f76546123a6d829f9e6401e2865a64d3?pvs=21) | ⚒️ 方法论 SOP 页面群 |
| `<SystemNavToggle>` Step 4 | [就医与药品](https://www.notion.so/ceb546123a6d83bcaca9811b1e7022f5?pvs=21) / [健身运动管理](https://www.notion.so/599546123a6d82ac82be015c0bdda069?pvs=21) / [营养与健康](https://www.notion.so/f14546123a6d82ec8840819f3baa7006?pvs=21) / [饮食计划器](https://www.notion.so/4a6546123a6d82a28fda81ddab76a3ef?pvs=21) / [收支管理](https://www.notion.so/7ef546123a6d8366b3188133cca041d9?pvs=21) / [LIFE COMPASS 系统优化 · 需求说明书 & 设计说明书](https://www.notion.so/LIFE-COMPASS-19d546123a6d8306a1ce8161b9480ac9?pvs=21) / [LIFE COMPASS · 产品设计文档 v4.0](https://www.notion.so/LIFE-COMPASS-v4-0-c49546123a6d83e9ad6081dd3dff942f?pvs=21) | 🌿 生活方式实践页面群 |
| `<SystemNavToggle>` Step 4 | [就医与药品](https://www.notion.so/ceb546123a6d83bcaca9811b1e7022f5?pvs=21) / [健身运动管理](https://www.notion.so/599546123a6d82ac82be015c0bdda069?pvs=21) / [营养与健康](https://www.notion.so/f14546123a6d82ec8840819f3baa7006?pvs=21) / [饮食计划器](https://www.notion.so/4a6546123a6d82a28fda81ddab76a3ef?pvs=21) / [收支管理](https://www.notion.so/7ef546123a6d8366b3188133cca041d9?pvs=21) / [LIFE COMPASS 系统优化 · 需求说明书 & 设计说明书](https://www.notion.so/LIFE-COMPASS-19d546123a6d8306a1ce8161b9480ac9?pvs=21) / [LIFE COMPASS · 产品设计文档 v4.0](https://www.notion.so/LIFE-COMPASS-v4-0-c49546123a6d83e9ad6081dd3dff942f?pvs=21) | 🌿 生活方式实践页面群 |
| `<SystemNavToggle>` Step 4 | [就医与药品](https://www.notion.so/ceb546123a6d83bcaca9811b1e7022f5?pvs=21) / [健身运动管理](https://www.notion.so/599546123a6d82ac82be015c0bdda069?pvs=21) / [营养与健康](https://www.notion.so/f14546123a6d82ec8840819f3baa7006?pvs=21) / [饮食计划器](https://www.notion.so/4a6546123a6d82a28fda81ddab76a3ef?pvs=21) / [收支管理](https://www.notion.so/7ef546123a6d8366b3188133cca041d9?pvs=21) / [LIFE COMPASS 系统优化 · 需求说明书 & 设计说明书](https://www.notion.so/LIFE-COMPASS-19d546123a6d8306a1ce8161b9480ac9?pvs=21) / [LIFE COMPASS · 产品设计文档 v4.0](https://www.notion.so/LIFE-COMPASS-v4-0-c49546123a6d83e9ad6081dd3dff942f?pvs=21) | 🌿 生活方式实践页面群 |

---

# 十一、六大核心数据库完整字段 Schema

> 每个数据库的完整字段定义，包含字段名、类型、公式伪代码、读写方向与跨库关联。所有字段名以 `DB-XX.fieldName` 格式引用。
> 

## DB-01 · LIFEMATRICES（打卡主表）

```tsx
// 主键：date（每行对应一天）
// 读写方：CheckInTable（写）/ CrashRiskMonitor（读）/ ReviewScreen（读聚合）

interface DB01_LIFEMATRICES {
  // ── 基础标识字段 ─────────────────────────────────────────────
  date:                    Date;          // 🔑 主键，格式 YYYY-MM-DD
  title:                   string;        // 页面标题，等于 date 字符串

  // ── 打卡字段（CheckIn 每次勾选写入 true）───────────────────
  morning_meditation:      boolean;       // ☀️ 早晨冥想 / 听金刚经
  morning_exercise:        boolean;       // 🧘 八段锦 / 拉伸 + 瑜伽
  morning_learning:        boolean;       // 📚 学一小时
  morning_breakfast:       boolean;       // 🥣 早饭制备（豆浆/玉米/鸡蛋）
  commute_bike:            boolean;       // 🚴 骑车上/下班
  evening_workout:         boolean;       // 💪 下班无氧训练
  evening_review:          boolean;       // 📝 无氧动作复盘 15min
  presleep_meditation:     boolean;       // 🌙 睡前冥想
  presleep_reading:        boolean;       // 📖 睡前阅读
  presleep_skincare:       boolean;       // 🛁 洗澡 + 护肤

  // ── 计算字段（服务端公式，不允许客户端直接写入）────────────
  checkInScore: number;
  // 公式：checkedCount / totalItemCount（0–1 小数）
  // checkedCount = count of boolean fields where value = true
  // totalItemCount = 10（固定）
  // 写入时机：每次任一 boolean 字段变更后服务端触发重算

  streakDays: number;
  // 公式：连续天数（当日 checkInScore >= 0.5 才计入连续）
  // 逻辑：从今日往前遍历，直到遇到 checkInScore < 0.5 的日期
  // 写入时机：每日 23:59 由定时任务写入当日行

  // ── 跨库关联字段 ─────────────────────────────────────────────
  linkedOKRIds:    string[];   // REL-01：关联 DB-04.id[]（OKR 进度贡献）
  linkedHabitIds:  string[];   // REL-02：关联 DB-02.id[]（Habits 更新）
  linkedPlanIds:   string[];   // REL-06：关联 DB-09.id[]（健身计划）

  // ── 写入权限 ──────────────────────────────────────────────────
  // boolean 字段：Client-write（CheckInTable 直接写，幂等键保护）
  // checkInScore：Server-computed（公式字段，禁止客户端写入）
  // streakDays：Cron-computed（每日定时计算）
  // linkedXxxIds：Client-write（首次配置时写入，后续只读）

  // ── 补签标记 ──────────────────────────────────────────────────
  retroactive:     boolean;    // 是否为补签（onBatchComplete 写入时附加）
  updatedAt:       Date;       // 最近更新时间戳（每次写入均更新）
}
```

## DB-02 · Habits（习惯追踪辅表）

```tsx
// 主键：id（每行对应一个习惯项目，非日期）
// 读写方：CheckInTable（写 completedDates）/ ReviewScreen（读 completionRate）

interface DB02_Habits {
  // ── 基础字段 ─────────────────────────────────────────────────
  id:               string;          // 🔑 主键
  name:             string;          // 习惯名称，如「冥想」「骑行」
  category:         HabitCategory;   // 'morning' | 'exercise' | 'sleep' | 'nutrition' | 'learning'
  targetCount:      number;          // 目标每周次数（如 5 = 每周 5 次）
  linkedCheckInField: string;        // 对应 DB-01 的字段名（如 'morning_meditation'）

  // ── 完成记录字段（客户端写入，数组追加）────────────────────
  completedDates:  string[];         // 已完成日期数组，格式 'YYYY-MM-DD'
  // 写入规则：arrayUnion(today())（去重，已存在则跳过）
  // 单次上限：一日内同一习惯最多追加 1 次

  // ── 计算字段 ─────────────────────────────────────────────────
  completionRate: number;
  // 公式：近 28d 完成次数 / (targetCount × 4)
  // 近 28d 完成次数 = completedDates.filter(d => d >= 28daysAgo).length
  // 写入时机：completedDates 变更后服务端触发重算

  currentStreak: number;
  // 公式：从今日往前连续出现在 completedDates 中的天数
  // 间隔容忍：非目标日（如周末非 commute 日）不断链

  // ── 跨库关联 ─────────────────────────────────────────────────
  linkedOKRId?:    string;           // REL-02：关联 DB-04.id（影响 OKR checkInContribution）

  // ── 写入权限 ──────────────────────────────────────────────────
  // completedDates：Client-write（arrayUnion 追加，幂等）
  // completionRate, currentStreak：Server-computed
  // 其余字段：Admin-write（初始配置时写入，运行期只读）
}
```

## DB-03 · 任务管理（Task Management）

```tsx
// 主键：id（每行对应一个任务）
// 读写方：TaskMatcherEngine（读）/ CheckInTable（读）/ ReviewScreen（读写）

interface DB03_Task {
  // ── 基础标识字段 ─────────────────────────────────────────────
  id:                    string;
  title:                 string;        // 🔑 任务名称
  description?:          string;        // 富文本描述
  status:                TaskStatus;    // '🕐 待处理'|'▶ 进行中'|'✅ 已完成'|'⏸ 暂停'|'🗑 放弃'

  // ── 优先级与调度字段（TaskMatcher 核心读取字段）────────────
  priority:              TaskPriority;  // 'P0-极高'|'P1-高'|'P2-中'|'P3-低'
  weeklyPriority?:       number;        // 1–5，本周权重（ReviewScreen Step② 写入）
  scheduledDate?:        Date;          // 计划执行日期
  dueDate?:              Date;          // 截止日期（过期则 urgencyFactor=2.0）
  bestTimeSlot:          TimeSlot;      // 'morning'|'forenoon'|'afternoon'|'evening'|'any'

  // ── 认知/能量需求字段（TaskMatcher 匹配核心）────────────────
  cognitiveLoad:         number;        // 1–5（1=极低，5=高专注）
  energyRequired:        number;        // 1–5（对应 HSI.energy.overallEnergy 匹配）
  estimatedMinutes:      number;        // 预计耗时（分钟）
  category?:             string;        // '恢复/休息'|'创作'|'学习'|'运动' 等

  // ── 拒绝记忆字段（AI 推荐系统使用）────────────────────────
  rejectionLog:          RejectionEntry[];  // 拒绝历史数组
  // RejectionEntry = { timestamp: Date, reason: string, hsiSnapshot: { energyLevel: number } }
  // 写入时机：TaskRecommendList 拒绝操作 → 追加到数组
  // 读取时机：TaskMatcherEngine Step 6 rejectionPenalty 计算

  // ── 跨库关联字段 ─────────────────────────────────────────────
  linkedOKRId?:          string;        // REL-03：关联 DB-04.id
  linkedProjectId?:      string;        // 关联父任务 id（子任务拆解场景）
  generatedFromKnowledge?: string;      // LOOP-03：来源 DB-06.id（知识→任务）

  // ── 完成时间戳 ──────────────────────────────────────────────
  completedAt?:          Date;          // 完成时写入（status→已完成时附加）

  // ── 写入权限 ──────────────────────────────────────────────────
  // status, weeklyPriority, completedAt：Client-write（各操作界面）
  // rejectionLog：Client-write（TaskRecommendList 拒绝时追加）
  // generatedFromKnowledge：AI-write（LOOP-03 自动写入）
  // cognitiveLoad, energyRequired：Admin-write（创建时配置）
}
```

## DB-04 · 目标管理 OKR

```tsx
// 主键：id（每行对应一个 OKR 目标）
// 读写方：OKRProgressToggle（读）/ ReviewScreen（读写）/ KnowledgeScreen（写关联）

interface DB04_OKR {
  // ── 基础标识字段 ─────────────────────────────────────────────
  id:                    string;
  title:                 string;        // OKR 目标名称
  description?:          string;
  status:                OKRStatus;     // '🚀 进行中'|'✅ 已完成'|'⏸ 暂停'|'🗑 放弃'
  quarter:               string;        // 如 '2026-Q1'

  // ── 进度计算字段（服务端公式）──────────────────────────────
  overallProgress: number;
  // 公式（三源加权）：
  //   krWeight      = linkedKRIds.length > 0 ? 0.6 : 0
  //   checkInWeight = linkedCheckInIds.length > 0 ? 0.25 : 0
  //   taskWeight    = 1 - krWeight - checkInWeight  // 通常 0.15
  //   krProgress    = mean(DB-05[linkedKRIds].progress)
  //   checkInProg   = checkInContribution / checkInTargetCount
  //   taskProg      = taskContribution / taskTargetCount
  //   overallProgress = krProgress * krWeight
  //                   + checkInProg * checkInWeight
  //                   + taskProg * taskWeight
  //   范围：0–1（UI 显示时 × 100 取百分比）
  // 写入时机：任一来源字段变更后服务端触发重算（< 200ms SLA）

  checkInContribution:   number;        // 打卡累计贡献次数（CheckInTable 写入时原子加法）
  checkInTargetCount:    number;        // 目标打卡总次数（Admin 配置，默认 30）
  taskContribution:      number;        // 完成任务累计数（任务完成时原子加法）
  taskTargetCount:       number;        // 目标完成任务数（Admin 配置，默认 10）

  // ── 跨库关联字段 ─────────────────────────────────────────────
  linkedKRIds:           string[];      // REL-05：关联 DB-05.id[]（Key Results）
  linkedWishlistId?:     string;        // REL-09：关联 DB-07.id（愿望关联）
  linkedKnowledgeCount:  number;        // LOOP-12：关联知识条目数（OKRLinkSuggestionCard 写入时 +1）

  // ── 回顾字段（ReviewScreen 写入）───────────────────────────
  reviewNote?:           string;        // 追加模式文本：`[weekEnd] note\n` + existing
  manifested:            boolean;       // LOOP-04：Wishlist 显化时写入 true

  // ── 写入权限 ──────────────────────────────────────────────────
  // overallProgress：Server-computed（禁止客户端直接写入）
  // checkInContribution, taskContribution：Client-write（原子加法）
  // linkedKnowledgeCount：Client-write（OKRLinkSuggestionCard confirm 时原子加法）
  // reviewNote：Client-write（追加模式，不覆盖）
  // manifested：Client-write（WishlistScreen 标记显化时写入）
}
```

## DB-05 · 关键成果 KR（Key Results）

```tsx
// 主键：id（每行对应一个 KR）
// 读写方：ReviewScreen（读写 currentValue）/ CheckInTable（写）/ TaskManager（写）

interface DB05_KR {
  // ── 基础标识字段 ─────────────────────────────────────────────
  id:               string;
  title:            string;           // KR 描述，如「本季度完成 20 次无氧训练」
  linkedOKRId:      string;           // 🔑 所属 DB-04.id（必填关联）
  unit:             string;           // 度量单位，如「次」「天」「%」

  // ── 进度计量字段 ─────────────────────────────────────────────
  targetValue:      number;           // 目标值（Admin 配置）
  currentValue:     number;           // 当前值（多路写入）
  // 写入来源：
  //   ReviewScreen 手动更新 → PATCH { currentValue: userInput, lastUpdatedBy: 'manual' }
  //   CheckInTable 勾选 → += checkInContributionValue（默认 1）
  //   TaskManager 任务完成 → += actualVolume（DB-09.actualVolume）
  startValue:       number;           // 起始基线值（Admin 配置，默认 0）

  // ── 计算字段 ─────────────────────────────────────────────────
  progress: number;
  // 公式：(currentValue - startValue) / (targetValue - startValue)
  // 范围：0–1（超过 1 时 clamp 到 1）
  // 写入时机：currentValue 变更后服务端触发重算，同时触发 DB-04.overallProgress 重算

  // ── 审计字段 ─────────────────────────────────────────────────
  lastUpdatedBy:    'task' | 'checkin' | 'manual';  // 最近一次更新来源
  lastUpdatedAt:    Date;

  // ── 写入权限 ──────────────────────────────────────────────────
  // currentValue：Multi-source write（ReviewScreen/CheckInTable/TaskManager）
  // progress：Server-computed
  // lastUpdatedBy, lastUpdatedAt：Client-write（写入 currentValue 时同步附带）
}
```

## DB-06 · 知识管理（Knowledge）

```tsx
// 主键：id
// 读写方：KnowledgeEntryForm（写）/ OKRLinkSuggestionCard（写关联）/ AI 语义引擎（写向量）

interface DB06_Knowledge {
  // ── 基础内容字段 ─────────────────────────────────────────────
  id:               string;
  title:            string;           // 知识条目标题
  source?:          string;           // 来源出处，如书名/文章名
  sourceType:       SourceType;       // 'book'|'article'|'video'|'experience'|'podcast'
  tags?:            string[];         // 自由标签
  createdAt:        Date;

  // ── R.I.A. 三阶段内容字段 ────────────────────────────────────
  R_reading:        string;           // 原文摘录（Reading）
  I_insight:        string;           // 个人洞察（Insight）
  A_action?:        string;           // 行动调整（Action，可选，有值时触发 LOOP-03）

  // ── AI 语义字段（后台写入，用户不可见）────────────────────
  semanticEmbedding?:  number[];      // 768 维向量（text-embedding-3-small）
  // 写入时机：保存后 < 2s 异步写入
  // 读取时机：AI OKR 匹配时余弦相似度计算

  aiSuggestedOKRId?:   string;        // AI 匹配得分最高的进行中 OKR id
  aiMatchScore?:        number;       // 0–1，匹配置信度
  // 写入时机：语义分析完成后写入

  // ── 用户决策字段 ─────────────────────────────────────────────
  linkedOKRId?:         string;       // 用户确认关联的 OKR id（OKRLinkSuggestionCard confirm）
  userRejectedOKRIds:   string[];     // 用户拒绝关联的 OKR id 数组（arrayUnion 追加）
  // 降权规则：rejectedOKR 的 aiMatchScore × 0.3

  // ── 自动生成字段 ─────────────────────────────────────────────
  generatedTaskId?:     string;       // LOOP-03：从 A_action 生成的 DB-03.id

  // ── 写入权限 ──────────────────────────────────────────────────
  // R/I/A 字段：Client-write（KnowledgeEntryForm 保存时写入）
  // semanticEmbedding, aiSuggestedOKRId, aiMatchScore：AI-write（异步）
  // linkedOKRId：Client-write（用户 confirm 时写入）
  // userRejectedOKRIds：Client-write（arrayUnion，reject 时追加）
  // generatedTaskId：AI-write（LOOP-03 回写）
}
```

## DB-07 · Wishlist（愿望清单）

```tsx
// 主键：id
// 读写方：WishlistScreen（读写）/ ReviewScreen VisionAlignment（读）

interface DB07_Wishlist {
  // ── 基础字段 ─────────────────────────────────────────────────
  id:               string;
  title:            string;           // 愿望名称
  description?:     string;
  category:         WishCategory;     // '💗 健康'|'🌌 事业'|'💰 财务'|'🌿 生活'|'🤝 关系'

  // ── 显化状态机字段 ───────────────────────────────────────────
  manifestStatus:   ManifestStatus;   // '🌱 种子'|'🌱 孕育中'|'✨ 已显化'
  seedDate:         Date;             // 种子阶段创建日期
  manifestedDate?:  Date;             // 已显化时写入（LOOP-04）
  evidence?:        string;           // 显化证明（富文本）

  // ── 情感与愿景字段 ───────────────────────────────────────────
  affirmation?:     string;           // 肯定句，如「我拥有健康的身体」
  visualUrl?:       string;           // 愿景图片 URL
  emotionNote?:     string;           // 创建时的心情备注

  // ── AI 生成字段 ──────────────────────────────────────────────
  celebrationCopy?: string;           // AI 生成的个性化庆祝文案
  // 写入时机：用户标记已显化后 < 200ms 异步生成并写入
  // 生成 input：title, category, seedDate, manifestedDate, emotionNote

  // ── 跨库关联字段 ─────────────────────────────────────────────
  linkedOKRId?:     string;           // REL-08：关联 DB-04.id
  linkedMilestoneId?: string;         // REL-09：显化后自动写入里程碑 id

  // ── 写入权限 ──────────────────────────────────────────────────
  // manifestStatus：Client-write（用户手动更新或 WishlistScreen 自动提示后确认）
  // manifestedDate, evidence：Client-write（标记显化时写入）
  // celebrationCopy：AI-write（异步）
  // linkedMilestoneId：AI-write（LOOP REL-09 回写）
}
```

## DB-08 · HSI 日志（Human State Index Log）

```tsx
// 主键：id（每条记录对应一次 HSI 快照，60s 写入一次）
// 读写方：HSIProvider（写）/ CrashRiskMonitor（读）/ ReviewScreen（读聚合）

interface DB08_HSILog {
  // ── 时间标识字段 ─────────────────────────────────────────────
  id:               string;
  date:             Date;             // 快照日期（YYYY-MM-DD，用于按天聚合）
  timestamp:        Date;             // 精确时间戳（毫秒级，用于 slope 计算）
  timeSlot:         TimeSlot;         // 当前时段（getTimeOfDay() 结果）

  // ── HSI 状态快照字段 ─────────────────────────────────────────
  energyLevel:      number;           // 1–5，来自 overallEnergy
  stressLevel:      number;           // 0–1，来自 emotion.stressLevel
  mentalCapacity:   number;           // 0–1，来自 focus.mentalCapacity
  confidence:       number;           // 0–1，HSI 置信度
  swipScore:        number;           // 0–100，崩溃风险分

  // ── 来源标记字段 ─────────────────────────────────────────────
  physioAvailable:  boolean;          // 是否有生理信号输入（Layer 1 是否激活）
  checkInScore?:    number;           // 写入时刻的 DB-01.checkInScore 快照

  // ── RecoveryCard 频率控制字段 ─────────────────────────────────
  dailyRecoveryCardCount:   number;   // 今日 RecoveryCard 触发次数（默认 0）
  lastRecoveryDismissAt?:   Date;     // 最近 dismiss 时间戳（5min 内不重复）
  recoveryAccepted?:        boolean;  // 当次是否接受休息建议

  // ── 周回顾字段 ──────────────────────────────────────────────
  weeklyReviewDone:   boolean;        // 周末回顾完成标记（ReviewScreen Step④ 写入）
  reviewCompletedAt?: Date;           // 回顾完成时间

  // ── 节律基线学习字段（近 30 日聚合，由 CircadianBaselineLearner 写入）──
  baselineSnapshot?: {
    timeOfDay:        string;         // 时段 key
    typicalEnergy:    number;         // 该时段历史均值 energy（1–5）
    typicalStress:    number;         // 该时段历史均值 stress（0–1）
    sampleCount:      number;         // 样本数（< 7 置信度下调）
  };

  // ── 写入权限 ──────────────────────────────────────────────────
  // HSI 状态字段：HSIProvider-write（每 60s 一次，CrashRiskMonitor 轮询同步）
  // dailyRecoveryCardCount：Client-write（RecoveryCard 渲染时原子加法）
  // lastRecoveryDismissAt：Client-write（dismiss 操作时写入）
  // weeklyReviewDone, reviewCompletedAt：Client-write（ReviewScreen Step④）
  // baselineSnapshot：Cron-write（每日 00:00 定时任务写入前一日聚合结果）
}
```

# 十一、组件与 Flow 对应索引

| **Flow** | **核心组件** | **触发入口** | **操作步数** |
| --- | --- | --- | --- |
| Flow 1 · 工作日动线 | `DashboardScreen` → `TodayZone` → `CheckInTable` | 打开 App 首页 | 1步（勾选打卡） |
| Flow 2 · 崩溃预警 | `CrashRiskMonitor` → `CrashInterventionOverlay` | 自动触发（用户无感知） | 1步（3选响应） |
| Flow 3 · 任务匹配 | `TaskRecommendList` / `TaskManagerScreen` | 首页今日区 / DO 按钮 | 2步 |
| Flow 4 · 愿景显化 | `WishlistScreen` → `ManifestationCelebration` | 任意时刻 / 手动标记 | 3步（新建种子） |
| Flow 5 · 知识关联 | `KnowledgeEntryForm` → `OKRLinkSuggestionCard` | 知识录入后自动触发 | 3步 |
| Flow 6 · 周回顾 | `ReviewScreen`（四个子面板） | CHECK 按钮 / 周末自动提示 | 四步流程 60–90min |

---

# 十二、数据闭环总览

## LOOP-01~16 完整字段级触发链路总表

> **读法**：每行描述一条闭环路径。「源字段」→「目标字段」→「写入条件」三列精细到具体数据库字段名。
> 

```tsx
// ── LOOP 编号规范 ─────────────────────────────────────────────────
// LOOP-01~06：核心闭环（每日必触发）
// LOOP-07~11：健身/营养/习惯专项闭环
// LOOP-12~16：知识/显化/审计/节律扩展闭环
```

| LOOP | 闭环名称 | 源库 → 源字段 | 目标库 → 目标字段 | 写入条件 | 写入时机 | 幂等键 |
| --- | --- | --- | --- | --- | --- | --- |
| **LOOP-01** | 打卡 → OKR 进度 | DB-01.checkInScore（今日 0–1）
DB-01.[checkIn_field]（boolean） | DB-04.checkInContribution（原子加法 +checkInWeight）
DB-04.overallProgress（公式重算） | CheckInItem.linkedOKRId ≠ null
且 checked 从 false → true
且今日尚未写入（幂等校验） | T+200ms（CheckIn P1 异步） | `checkin:${checkInId}:${okrId}:${today()}` |
| **LOOP-02** | 任务完成 → OKR 进度 | DB-03.status（'✅ 已完成'）
DB-03.linkedOKRId
DB-03.linkedKRId | DB-04.taskContribution（原子加法 +1）
DB-05.currentValue（+task.krProgressDelta）
DB-04.overallProgress（公式重算） | DB-03.status 变更为 '✅ 已完成'
且 linkedOKRId ≠ null
且 task.krProgressDelta > 0 | T+200ms（任务完成 P1 异步） | `task:${taskId}:loop02:complete` |
| **LOOP-03** | 知识 A 行动 → 任务生成 | DB-06.A_action（文本，非空）
[DB-06.id](http://DB-06.id)（知识条目 id） | DB-03.title（= A_action）
DB-03.generatedFromKnowledge（= knowledgeId）
DB-03.status（= '🕐 待处理'）
DB-03.cognitiveLoad（= 2，默认） | DB-06.A_action 字符数 ≥ 3
且 DB-03 中不存在 generatedFromKnowledge = knowledgeId 的行 | T+2000ms（知识保存 P2 异步） | `${knowledgeId}:loop03` |
| **LOOP-04** | 愿望显化 → OKR 完成 | DB-07.manifestStatus（→ '✨ 已显化'）
DB-07.linkedOKRId | DB-04.manifested（= true）
DB-04.overallProgress（= 100）
DB-07.manifestedDate（= now()） | DB-07.manifestStatus 变更为 '✨ 已显化'
且 linkedOKRId ≠ null | T+200ms（显化标记 P1 异步） | `wishlist:${wishId}:loop04` |
| **LOOP-05** | 周回顾 → 下周任务优先级 | DB-08.weeklyReviewDone（= true）
ReviewScreen.Step②.weeklyPriority[]（用户输入） | DB-03.weeklyPriority（批量写入，1–5 排序） | DB-08.weeklyReviewDone 变更为 true
且 Step② 至少有 1 条任务被排序 | Step④ 完成后批量写入 | `review:${weekEnd}:loop05:${taskId}` |
| **LOOP-06** | HSI 日志 → 节律基线更新 | DB-08.energyLevel（当日快照）
DB-08.stressLevel
DB-08.timeSlot | DB-08.circadianBaseline[timeSlot].typicalEnergyLevel（滚动均值）
DB-08.circadianBaseline[timeSlot].sampleCount（+1） | 每日 23:30 定时触发
当日 DB-08 快照数 ≥ 5（数据充分） | 每日 23:30 后台 Job | `baseline:${timeSlot}:${today()}` |
| **LOOP-07** | 健身打卡 → KR 进度 | DB-09.completedAt（健身计划完成时间戳）
DB-09.actualVolume（实际训练量）
DB-09.linkedKRId | DB-05.currentValue（+actualVolume）
DB-05.lastUpdatedBy（= 'checkin'）
DB-04.overallProgress（公式重算） | DB-09.completedAt ≠ null（由 CheckIn 联动触发）
且 linkedKRId ≠ null | T+500ms（健身完成 P2 异步） | `workout:${planId}:loop07:${krId}` |
| **LOOP-08** | 饮食记录 → HSI 能量修正 | DB-10.meal_nutritionScore（营养评分 0–1）
DB-10.loggedAt（进餐时间戳） | HSIProvider.energyBoostFactor（内存，0.8–1.3）
DB-08 快照写入修正值 | DB-10 新增饮食记录
且 loggedAt 距今 < 3h（有效饮食窗口） | T+60s（HSI 下次轮询时读取） | 无（HSI 内存状态，不幂等） |
| **LOOP-09** | 里程碑生成 → Wishlist 回写 | DB-07.manifestedDate（显化时间戳）
DB-07.linkedOKRId
DB-07.category | 里程碑DB.title（= `[{category}] ${title} 已显化`）
DB-07.linkedMilestoneId（回写里程碑 id） | LOOP-04 触发后 P2 异步执行
且里程碑 DB 中不存在 linkedWishlistId = wishId 的行 | T+500ms（显化 P2 异步） | `wishlist:${wishId}:loop09:milestone` |
| **LOOP-10** | HSI 崩溃预警 → 任务过滤 | DB-08.swipScore（≥ 70）
CrashRiskMonitor.slope（≥ 0.03） | TaskMatcherEngine.hardFilter.maxCognitiveLoad（= 2，临时内存）
DB-08 写入 type='crash-risk-triggered' | resolveRiskLevel() ≥ 'medium'
且距上次触发 > 20min（冷却期） | T+0ms（CrashRiskMonitor 轮询完成后同步） | `crash:${Math.floor(now/1200000)}` （20min 时间桶） |
| **LOOP-11** | 健身统计 → OKR 汇总 | DB 健身统计.weeklyVolume（本周训练总量）
DB 健身统计.linkedOKRId | DB-04.taskContribution（+weeklyVolumeDelta）
DB-05.currentValue（更新运动 KR 值） | 每周日 23:00 定时汇总触发
且 weeklyVolume > 0 | 每周日 23:00 后台 Job | `fitness:stats:${weekEnd}:loop11` |
| **LOOP-12** | 知识关联 → OKR 知识计数 | DB-06.linkedOKRId（用户确认后写入）
DB-06.aiMatchScore（确认时快照） | DB-04.linkedKnowledgeCount（原子 +1）
DB-04.lastKnowledgeLinkedAt（= now()） | 用户点击 OKRLinkSuggestionCard「✅ 关联」
且该 knowledgeId 未曾关联该 OKR | T+200ms（确认 P1 同步） | `knowledge:${knowledgeId}:loop12:${okrId}` |
| **LOOP-13** | Habits 完成 → Habits 统计 | DB-02.completedDates（日期数组，追加 today()）
DB-02.targetCount（目标频率） | DB-02.completionRate（公式：近28d完成数 / (targetCount×4)）
DB-02.currentStreak（公式：连续完成天数）
DB-01.checkInScore（间接影响，公式重算） | DB-02.completedDates 新增今日日期
且今日尚未记录（去重 upsert） | T+50ms（CheckIn P1 并行） | `habits:${habitId}:${today()}` |
| **LOOP-14** | AI 语义匹配 → 知识降权记忆 | DB-06.userRejectedOKRIds（用户拒绝的 OKR id 数组） | AI 匹配侧：候选 OKR 的 adjustedScore（× 0.3 惩罚系数）
不写数据库，仅影响推断结果 | 用户点击「✕ 不关联」
且 okrId 不在 userRejectedOKRIds 中（arrayUnion） | T+0ms（拒绝 P2 异步） | 无（arrayUnion 自带幂等） |
| **LOOP-15** | 周回顾 → 愿景对齐记录 | ReviewScreen.Step④.alignmentText（用户输入）
DB-08.weeklyReviewDone（= true） | DB-04.reviewNote（追加 `[愿景对齐] ${alignmentText}`）
DB-08.reviewCompletedAt（= now()） | 用户完成 Step④ 并点击「完成本周回顾」
且 alignmentText 字符数 ≥ 1 | Step④ 完成后 P1 同步 | `review:${weekEnd}:loop15` |
| **LOOP-16** | 营养评分 → Habits 营养打卡 | DB-10.meal_nutritionScore（0–1）
DB-10.loggedAt
DB-10.linkedHabitId | DB-02.completedDates（追加 today()，营养 Habit）
DB-01.[nutrition_checkin_field]（= true） | DB-10 新增饮食记录
且 meal_nutritionScore ≥ 0.6（合格饮食才触发打卡）
且 linkedHabitId ≠ null | T+50ms（饮食记录 P1 异步） | `meal:${mealId}:loop16:${habitId}:${today()}` |

## LOOP 触发链路依赖图（单次打卡完整级联）

```tsx
// 以「单次 CheckIn 勾选」为例，追踪所有下游级联触发
//
// T+0ms    用户勾选 CheckInItem（DB-01.[field] = true）
//           ├─ 本地乐观更新
//           └─ 幂等键生成 → 防重复写入
//
// T+50ms   P1 并行写入（三库同步）：
//           ├─ DB-01.checkInScore 重算（LOOP-01 源）
//           ├─ DB-02.completedDates 追加（LOOP-13）
//           └─ DB-10 营养 Habit 触发（LOOP-16，若 linkedHabitId）
//
// T+200ms  P1 异步：
//           ├─ DB-04.checkInContribution +1（LOOP-01）
//           │    └─ DB-04.overallProgress 公式重算
//           │         └─ DB-05.currentValue 间接影响（KR 进度条刷新）
//           └─ DB-09.linkedCheckIn 写入（LOOP-07，若 linkedPlanId）
//                └─ DB-05.currentValue += actualVolume（LOOP-07 → LOOP-11 前驱）
//
// T+500ms  P2 异步：
//           ├─ CrashRiskMonitor 重新评估 swipScore（LOOP-10 前驱）
//           │    └─ 若 swipScore > 70 → LOOP-10 触发（TaskMatcher 硬过滤）
//           └─ DB-08 快照写入（含新 checkInScore 字段值）
//                └─ 每日 23:30 → LOOP-06（节律基线更新）
//
// 级联深度：最深 4 层（CheckIn → OKR → KR → HSI基线）
// 总写入操作数（最大路径）：DB-01 + DB-02 + DB-04 + DB-05 + DB-08 + DB-09 = 6 库并发
```

## LOOP 触发矩阵（组件 × LOOP 编号）

| 触发组件 / 操作 | LOOP-01 | LOOP-02 | LOOP-03 | LOOP-04 | LOOP-05 | LOOP-06 | LOOP-07 | LOOP-08 | LOOP-09 | LOOP-10 | LOOP-11 | LOOP-12 | LOOP-13 | LOOP-14 | LOOP-15 | LOOP-16 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<CheckInTable>` 勾选 | ✅ | — | — | — | — | ⏰ | ✅ | — | — | ✅ | — | — | ✅ | — | — | ✅ |
| `<TaskManagerScreen>` 完成任务 | — | ✅ | — | — | — | ⏰ | — | — | — | ✅ | — | — | — | — | — | — |
| `<KnowledgeEntryForm>` 保存 | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | ✅ | — | — |
| `<WishlistScreen>` 标记显化 | — | — | — | ✅ | — | — | — | — | ✅ | — | — | — | — | — | — | — |
| `<ReviewScreen>` Step④ 完成 | — | — | — | — | ✅ | — | — | — | — | — | — | — | — | — | ✅ | — |
| 饮食记录（DB-10） | — | — | — | — | — | — | — | ✅ | — | — | — | — | — | — | — | ✅ |
| 定时 Job（每日/每周） | — | — | — | — | — | ✅ | — | — | — | — | ✅ | — | — | — | — | — |

> ⏰ = 定时触发（非实时）｜✅ = 直接触发｜— = 不触发
> 

## 六大闭环路径

```mermaid
flowchart TD
    A[📱 用户打开 App] --> B[HSIProvider 推断状态]
    B --> C[✅ CheckIn 打卡]
    C -->|linkedOKRId 写入| D[🎯 目标管理 DB]
    C -->|linkedPlanId 写入| E[🏃 健身运动管理]

    B --> F[📝 任务推荐 TaskMatcher]
    F -->|读取| G[任务管理 DB]
    G -->|完成写入 completedAt| D
    G -->|生成关联任务| H[知识管理 DB]

    H -->|AI 语义匹配| D
    H -->|写入 linkedKnowledgeCount| D

    I[🌱 Wishlist 愿望种子] -->|创建关联 OKR| D
    D -->|显化完成写入| I
    I -->|显化庆祝动效| J[里程碑 DB]

    K[📍 ReviewScreen 周回顾] -->|读取汇聚| C
    K -->|读取汇聚| G
    K -->|读取汇聚| D
    K -->|写入 weeklyPriority| G
    K -->|写入 reviewNote| D

    L[CrashRiskMonitor] -->|写入 swipScore 日志| M[健康状态日志 DB]
    M -->|回读历史趋势| B
```

## 闭环路径说明

| **闭环编号** | **数据路径** | **源字段** | **写入目标字段** | **触发时机** | **写入优先级** |
| --- | --- | --- | --- | --- | --- |
| LOOP-01 | CheckIn 打卡 → OKR 进度 | `DB-01.linkedOKRIds[]` | `DB-04.checkInContribution += checkInWeight`
→ 重算 `DB-04.overallProgress` | 用户勾选打卡 checkbox，`linkedOKRId` 非空 | P1（< 200ms） |
| LOOP-01b | CheckIn 打卡 → Habits 完成日期 | `DB-01.linkedHabits[]` | `DB-02.completedDates.push(today)`（去重 upsert）
→ 重算 `DB-02.completionRate` | 同 LOOP-01 并行触发 | P1（< 200ms） |
| LOOP-02 | Task 完成 → KR 关键成果进度 | `DB-03.linkedKRId`  • `DB-03.okrContribution` | `DB-05.currentValue += okrContribution`（原子加法）
→ 重算 `DB-05.progress` | `DB-03.status` 变为 `✅ 已完成`，`linkedKRId` 非空 | P1（< 200ms） |
| LOOP-02b | Task 完成 → OKR 任务贡献 | `DB-03.linkedOKRId` | `DB-04.taskContribution += 1`
→ 重算 `DB-04.overallProgress` | 同 LOOP-02 并行触发，`linkedOKRId` 非空 | P1（< 200ms） |
| LOOP-03 | 知识录入 → 自动生成任务 | `DB-06.A_action`（非空） | `DB-03` 新建行：`title=A_action`, `generatedFromKnowledge=knowledgeId`, `cognitiveLoad=2`, `status=待处理`
回写 `DB-06.generatedTaskId` | 知识保存时 `A_action` 字段非空（幂等键 `knowledgeId:loop03`） | P2（异步，< 2s） |
| LOOP-04 | Wishlist 显化 → OKR 完成 | `DB-07.linkedOKRId`  • `DB-07.manifestStatus=已显化` | `DB-04.manifested = true`
`DB-04.overallProgress = 100`
触发 ManifestationCelebration UI | 用户将 `manifestStatus` 标记为 `✨ 已显化`，`linkedOKRId` 非空 | P1（< 200ms） |
| LOOP-05 | 周回顾确认 → 任务下周优先级 | ReviewScreen Step ② 用户操作 | `DB-03.weeklyPriority` 批量写入（1–5 整数）
`DB-04.reviewNote` 追加本周回顾文本 | ReviewScreen Step ④ 用户点击「确认」完成回顾 | P1（批量，< 500ms） |
| LOOP-06 | HSI 推断 → HSI 日志快照 | `LifeCompassStateVector`（全字段） | `DB-08` upsert：`date+timeSlot` 为幂等键
写入 `energyLevel / stressLevel / swipScore / mentalCapacity / source / confidence` | 每 60s CrashRiskMonitor 轮询 / MiniCheckIn 手动 / CheckIn 勾选后 | P3（批量征移写入） |
| LOOP-07 | 健身完成 → LIFEMATRICES 打卡 | `DB-09.linkedCheckInField`（动态字段名） | `DB-01.[linkedCheckInField] = true`
→ 重算 `DB-01.checkInScore` | FitnessTracker `onWorkoutComplete` 回调 | P1（< 200ms） |
| LOOP-08 | 饮食执行 → HSI 能量系数 | `DB-10.proteinRatio`  • `DB-10.carbGlycemicLoad` | `HSIProvider.energyBoostFactor`（0.8–1.2，内存状态）
写入 `DB-10.energyBoostFactor` | NutritionPlanner 每餐 `eaten=true` 打卡后汇总计算 | P2（异步，不阻塞 UI） |
| LOOP-09 | 活动创建 → 准备任务批量生成 | `DB-14.taskTemplates[]`  • `DB-14.autoGenerateTasks=true` | `DB-03` 批量新建行（幂等键 `activityId:tasks:idx`）
回写 `DB-14.linkedTaskIds[]` | ActivityPlanner `onActivityCreate` 保存 | P2（异步批量） |
| LOOP-09B | 库存低阈值 → 补货任务 | `DB-12.quantity <= DB-12.restockThreshold` | `DB-03` 新建行：`title=购买[name]`, `cognitiveLoad=1`, `priority=P2`
回写 `DB-12.restockTaskId`（防重复门禁） | InventoryWidget `onRestock` 点击 / 每日 09:00 自动扫描 | P2（异步） |
| LOOP-10 | 存钱记录 → Wishlist 预算进度 | `DB-13.category=存钱`  • `DB-13.linkedWishlistId` | `DB-07.linkedBudget.savedAmount += DB-13.amount`
触发 Wishlist 进度条刷新 | FinanceWidget 存钱类支出保存，`linkedWishlistId` 非空 | P1（< 200ms） |
| LOOP-11 | 运动记录 → OKR 健身 KR 进度 | `DB-09.totalVolume`  • `DB-09.linkedOKRKRId` | `DB-05.currentValue += actualVolume`（原子加法）
→ 重算 `DB-05.progress` | FitnessTracker 完成写入 DB-09 后 | P1（< 200ms） |
| LOOP-12 | 知识 AI 关联确认 → OKR 知识数 | `DB-06.linkedOKRId`（用户确认后） | `DB-04.linkedKnowledgeCount += 1` | OKRLinkSuggestionCard 用户点击「✅ 关联」 | P1（< 200ms） |

---

# 十三、数据库字段架构设计

## DB-01 · LIFEMATRICES 打卡主表 [](https://www.notion.so/abf546123a6d8315bf59012c4ff11db5?pvs=21)

```tsx
interface LIFEMATRICESRecord {
  // 核心识别
  id: string;
  date: Date;                          // 打卡日期（主键）

  // 时段打卡项（每项对应 DailyRoutine 一条）
  morning_meditation:    boolean;      // 早晨冥想
  morning_exercise:      boolean;      // 八段锦 / 拉伸 / 瑜伽
  morning_learning:      boolean;      // 学一小时（营养学/神经科学/历史人文）
  commute_bike:          boolean;      // 骑车通勤
  evening_workout:       boolean;      // 晚间无氧
  evening_review:        boolean;      // 复盘 15min
  presleep_meditation:   boolean;      // 入眠冥想
  presleep_reading:      boolean;      // 入眠阅读

  // 聚合字段（公式计算）
  checkInScore:          number;
  // 公式：checkedCount / totalItemCount
  // checkedCount = [morning_meditation, morning_exercise, morning_learning,
  //                 commute_bike, evening_workout, evening_review,
  //                 presleep_meditation, presleep_reading].filter(v => v === true).length
  // totalItemCount = 8（固定，后续可扩展为配置项）
  // 写入时机：任意布尔字段变更后，服务端公式自动重算

  streakDays:            number;
  // 公式：从 today 向前连续查找 date-1d 记录，
  //       每条 checkInScore >= 0.5 则 streak+1，直到中断
  // 写入时机：每日 00:00 定时任务重算，或当日 checkInScore 首次 >= 0.5 时触发

  // 关联字段
  linkedOKRIds:          string[];     // LOOP-01 OKR 关联 → https://www.notion.so/2840dfc8e62182b1a1b681caa51d9b22
  linkedHabits:          string[];     // 关联 Habits 展开项 → https://www.notion.so/3030dfc8e6218161af3bd57f4c922ab1

  // HSI 快照（供周回顾分析）
  hsiSnapshot: {
    energyAtMorning:     1|2|3|4|5;
    energyAtEvening:     1|2|3|4|5;
    stressLevel:         number;       // 0–1
    swipScore:           number;       // 0–100
  };
}
```

## DB-02 · 习惯追踪辅表 [](https://www.notion.so/b3f546123a6d831093c781e134fc24dd?pvs=21)

```tsx
interface HabitsRecord {
  id: string;
  name: string;                        // 习惯名称，如「冥想」「游泳」
  category: 'body' | 'mind' | 'social' | 'creative' | 'spiritual';
  frequency: 'daily' | 'weekday' | 'weekend' | 'weekly' | 'monthly';
  targetCount: number;                 // 目标次数（每周循环内）
  completedDates: Date[];              // 实际完成日期数组
  completionRate: number;              // 公式：最近 4 周内完成率
  linkedLIFEMATRICS: string;          // 关联到 LIFEMATRICES 对应字段
  linkedOKRId?: string;               // LOOP-01 进入目标 → https://www.notion.so/2840dfc8e62182b1a1b681caa51d9b22
  linkedFitnessId?: string;           // REL-06 健身运动管理 → https://www.notion.so/89d0dfc8e6218365af778125f4ab6568
  notes?: string;                      // 可选备注
}
```

## DB-03 · 任务管理 [](https://www.notion.so/90a546123a6d83f6b50381edc53c0d39?pvs=21)

```tsx
interface TaskRecord {
  id: string;
  title: string;
  status: '🕐 待处理' | '🔄 进行中' | '✅ 已完成' | '⏸ 暂停' | '🗑 放弃';
  priority: 'P0-极高' | 'P1-高' | 'P2-中' | 'P3-低';

  // HSI 匹配字段（LOOP-02 核心）
  cognitiveLoad:   1 | 2 | 3 | 4 | 5;  // 认知负荷等级
  estimatedMinutes: number;             // 预估时长
  energyRequired:  1 | 2 | 3 | 4 | 5;  // 所需能量层级
  bestTimeSlot: 'morning' | 'forenoon' | 'afternoon' | 'evening' | 'any';

  // 时间字段
  dueDate?:        Date;
  scheduledDate?:  Date;
  completedAt?:    Date;               // LOOP-02 完成时写入
  weeklyPriority?: number;
  weeklyPrioritySource?: 'user' | 'ai-auto'; // v4.4 LOOP-05：来源标记（用户手动 or AI 自动推断）             // LOOP-05 周回顾后写入（下周排序分）

  // 关联字段（闭环关键）
  linkedProjectId?: string;            // → https://www.notion.so/54c0dfc8e62183e4a77101c2b11d1c92 项目管理
  linkedOKRId?:     string;            // LOOP-02 → https://www.notion.so/2840dfc8e62182b1a1b681caa51d9b22
  linkedKRId?:      string;            // → https://www.notion.so/ee00dfc8e62183ebbe4e81e437350159 关键成果
  linkedKnowledgeIds?: string[];       // → https://www.notion.so/3850dfc8e621839095c0011d4e295881 知识管理
  generatedFromKnowledge?: string;     // LOOP-03 知识输入自动生成标记

  // OKR 贡献量
  okrContribution?: number;            // LOOP-02 完成时对关联 KR 的贡献单位

  // 拒绝日志（HSI 学习用）
  rejectionLog?: Array<{
    reason: 'too-hard' | 'too-easy' | 'not-now';
    hsiSnapshot: object;
    timestamp: Date;
  }>;
}
```

## DB-04 · 目标管理 / OKR [](https://www.notion.so/bd2546123a6d82159523017fa9476d40?pvs=21)

```tsx
interface OKRRecord {
  id: string;
  title: string;
  description?: string;
  status: '🌱 耐候' | '🚀 进行中' | '✨ 已完成' | '⏸ 暂停';
  cycle: string;                        // 如 '2026-Q1'、2026-年度目标'
  startDate: Date;
  targetDate: Date;

  // 进度计算（LOOP-01 / LOOP-02 写入）
  overallProgress: number;
  // 公式（三源加权）：
  //   krAvg        = mean(linkedKRIds.map(k => k.progress)) × 100
  //                  // 若无关联 KR → krAvg = 0
  //   ciWeight     = min(checkInContribution, 20)           // 打卡上限贡献 20 分
  //   taskWeight   = min(taskContribution × 2, 20)          // 任务完成上限贡献 20 分
  //   overallProgress = clamp(krAvg × 0.6 + ciWeight + taskWeight, 0, 100)
  //   写入时机：LOOP-01 / LOOP-02 / 手动更新 currentValue 任一触发

  checkInContribution: number;          // LOOP-01 汇入分，每次打卡 +1，不设上限（clamp 在公式中处理）
  taskContribution: number;             // LOOP-02 汇入分，每次 Task Done +1
  reviewNote?: string;                  // LOOP-05 周回顾后写入

  // 关联字段
  linkedKRIds: string[];               // → https://www.notion.so/ee00dfc8e62183ebbe4e81e437350159 关键成果数组
  linkedTaskIds: string[];             // → https://www.notion.so/9a00dfc8e62182769ec381ed9a265b9e 任务管理
  linkedKnowledgeCount: number;        // LOOP-03 AI 自动累加
  linkedWishlistId?: string;           // LOOP-04 → https://www.notion.so/1c80dfc8e6218308a12801abb96a52a4 Wishlist

  // 愿景对齐
  visionTag?: string;                  // 对应 Wishlist 类别
  manifested: boolean;                 // 目标完成 → 显化 flag
}
```

## DB-05 · 关键成果 [](https://www.notion.so/ff9546123a6d83589f9281bdbaec3ed8?pvs=21)

```tsx
interface KeyResultRecord {
  id: string;
  title: string;
  linkedOKRId: string;                 // → https://www.notion.so/2840dfc8e62182b1a1b681caa51d9b22 父目标

  // 量化目标
  metricType: 'number' | 'percentage' | 'boolean' | 'currency';
  startValue: number;                  // 起始基线（创建时设定，不自动变更）
  targetValue: number;                 // 目标值
  currentValue: number;
  // 写入来源优先级：
  //   manual > task(LOOP-02) > checkin(LOOP-01)
  // 原子写入规范（防并发覆盖）：
  //   所有来源均使用：UPDATE SET currentValue = currentValue + delta
  //   不得使用：UPDATE SET currentValue = newAbsoluteValue（除手动外）
  // 边界保护：clamp(currentValue, startValue, targetValue × 2)
  unit?: string;                       // 单位，如 '公里' '本' '天'

  // 进度
  progress: number;
  // 公式：clamp((currentValue - startValue) / (targetValue - startValue), 0, 1)
  // 注意：currentValue 超过 targetValue 时 progress 仍为 1.0（不超 100%）
  // 写入时机：currentValue 每次变更后服务端公式立即重算
  lastUpdatedBy: 'task' | 'checkin' | 'manual';
  lastUpdatedAt: Date;
  // delta 历史（可选，用于 ReviewScreen 趋势图）：
  valueChangeLog?: Array<{
    delta: number;
    source: 'task' | 'checkin' | 'manual';
    sourceId: string;    // taskId / checkInId / 'manual'
    timestamp: Date;
  }>;

  // 关联字段
  linkedTaskIds: string[];             // → https://www.notion.so/9a00dfc8e62182769ec381ed9a265b9e
  linkedCycleId?: string;              // → https://www.notion.so/e950dfc8e62182abae6981555b1d3e66 目标周期
}
```

## DB-06 · 知识管理 [](https://www.notion.so/3c4546123a6d825b9dd381968c0c45a4?pvs=21)

```tsx
interface KnowledgeRecord {
  id: string;
  title: string;
  source: string;                      // 书名 / 文章标题 / URL
  sourceType: 'book' | 'article' | 'video' | 'podcast' | 'experience' | 'other';

  // R.I.A. 三层结构
  R_reading: string;                   // R: 原文摘录 / 局部知识
  I_insight: string;                   // I: 个人洞察 / 层次理解
  A_action: string;                    // A: 行动调整 → LOOP-03 完成后生成任务

  // AI 处理字段
  semanticEmbedding?: number[];        // AI 语义向量（内部用）
  aiSuggestedOKRId?: string;           // AI 匹配建议 → https://www.notion.so/2840dfc8e62182b1a1b681caa51d9b22
  aiMatchScore?: number;               // 匹配置信度 0–1
  userRejectedOKRIds?: string[];       // 用户拒绝的匹配，降权用

  // 关联字段（LOOP-03 / LOOP-05）
  linkedOKRId?: string;               // 用户确认关联 → https://www.notion.so/2840dfc8e62182b1a1b681caa51d9b22
  generatedTaskId?: string;           // LOOP-03 生成的任务 ID → https://www.notion.so/9a00dfc8e62182769ec381ed9a265b9e
  tags: string[];                      // 自由标签
  createdAt: Date;
}
```

## DB-07 · Wishlist 愿望清单 [Wishlist](https://www.notion.so/Wishlist-aed546123a6d82a7a443815730aedb95?pvs=21)

```tsx
interface WishlistRecord {
  id: string;
  title: string;
  description?: string;
  category: '💗 健康' | '🏠 环境' | '💼 事业' | '🌍 旅行' | '📚 学习' | '🌙 精神' | '💰 财富' | '🤝 关系';

  // 显化状态机
  manifestStatus: '🌱 种子' | '🌱 孕育中' | '✨ 已显化' | '⏸ 暂停';
  seedDate: Date;                      // 创建时间（显化起点）
  manifestedDate?: Date;               // LOOP-04 显化时写入

  // 居中证明内容
  evidence?: string;
  visionAlignmentRating?: number;      // v4.4 Step ④ 愿景对齐评分（1–5）
  visionAlignmentQuickAnswer?: string; // v4.4 Step ④ 快速文字输入（≤ 50 字）
  reviewSkippedByUIMode?: UIMode;      // v4.4 UIMode=low-energy 时跳过，记录跳过时的模式                   // 显化后填写：这件事是怎么发生的
  celebrationCopy?: string;           // AI 生成的庆祝文案

  // 关联字段（LOOP-04）
  linkedOKRId?: string;               // 显化关联 OKR → https://www.notion.so/2840dfc8e62182b1a1b681caa51d9b22
  linkedMilestoneId?: string;         // REL-09 → 里程碑 DB

  // 情绪赋能
  emotionNote?: string;               // 写下当时心情
  visualUrl?: string;                 // 愿景图片 URL
  affirmation?: string;               // 对应肯定句
}
```

## DB-08 · 健康状态日志（HSI 快照存储）

```tsx
// 新建辅助数据库，专为 HSI 历史节律学习使用（LOOP-06）
// 对应健身运动管理 https://www.notion.so/89d0dfc8e6218365af778125f4ab6568 扩展

interface HSILogRecord {
  id: string;
  date: Date;
  timeSlot: 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

  // 快照字段
  energyLevel:      1 | 2 | 3 | 4 | 5;
  stressLevel:      number;            // 0–1
  mentalCapacity:   number;            // 0–1
  swipScore:        number;            // 0–100
  activityPattern:  'still' | 'light' | 'active';

  // 输入来源
  source: 'hsi-auto' | 'checkin-manual' | 'mini-checkin';
  confidence:       number;            // 0–1

  // 节律基线（AI 学习用）
  circadianPhaseTag?: string;          // 如 'high-energy-morning'
  weekdayPattern?:   boolean;          // 工作日 / 周末 区别
}
```

---

## 13.1 Phase 字段依赖演进矩阵

> 各 Phase 新增字段对已有字段的依赖关系全量表。「必须先有」= 该字段写入的前提字段；「触发写入」= 该字段上线后新增的下游写入链路。
> 

| Phase | 新增字段 | 所在 DB | 必须先有（前置字段） | 触发写入（新增下游） | 降级策略（前置缺失时） |
| --- | --- | --- | --- | --- | --- |
| P1 | `cognitiveLoad` | DB-03 | —（首发字段） | `mentalCapacity` 匹配过滤（HSIProvider） | 默认 3（中等） |
| P1 | `swipScore` | DB-08 | `stressLevel`, `mentalCapacity`, `overallEnergy` | `RecoveryCard` 触发，`UIMode` 切换 | 默认 50（中性） |
| P2 | `streakDays` | DB-01 | `checkInScore`（连续 N 天非零） | ReviewScreen `streakAtWeekEnd` 展示 | 默认 0 |
| **P3 · OKR 闭环** | `linkedOKRId` | DB-03/06 | `DB-04` 行存在 | `checkInContribution`（DB-04）, `linkedKnowledgeCount` | null → 跳过关联写入 |
| P3 | `currentValue` | DB-05 | DB-05 行存在，`linkedOKRId`（DB-04） | `overallProgress` 加权重算（DB-04） | 保留上次值 |
| P4 | `aiMatchScore` | DB-06 | `semanticEmbedding`, 至少 1 条进行中 OKR | `OKRLinkSuggestionCard` 渲染（>0.65 阈值） | 0 → 卡片不出现 |
| **P5 · 显化闭环** | `manifestStatus` | DB-07 | DB-07 行存在 | `ManifestationCelebration` 触发，里程碑写入 | 默认 `🌱 种子` |
| **P6 · 生理闭环** | `heartRateVariability` | HSIProvider（内存） | Synheart SDK 已连接 | Layer1 权重 0.5 激活，`confidence` 提升 | Layer1 weight=0，fallback 历史节律 |
| P6 | `behaviorVsCheckIn` | DB-08（SYN-05） | `tapFrequency`, `checkInScore`（同日） | `BehaviorVerificationReport` 渲染 | 不渲染报告，不记录偏差 |

## 13.2 Phase 字段上线顺序与依赖图（Mermaid）

```mermaid
graph TD
  subgraph P1_MVP["P1 · MVP"]
    F1["checkInScore\n(DB-01)"]
    F2["cognitiveLoad\n(DB-03)"]
    F3["overallProgress\n(DB-04)"]
    F4["swipScore\n(DB-08)"]
  end
  subgraph P2_Habits["P2 · 习惯闭环"]
    F5["completionRate\n(DB-02)"]
    F6["streakDays\n(DB-01)"]
    F7["weeklyPriority\n(DB-03)"]
  end
  subgraph P3_OKR["P3 · OKR 闭环"]
    F8["linkedOKRId\n(DB-03/06)"]
    F9["checkInContribution\n(DB-04)"]
    F10["currentValue\n(DB-05)"]
  end
  subgraph P4_Know["P4 · 知识闭环"]
    F11["semanticEmbedding\n(DB-06)"]
    F12["aiMatchScore\n(DB-06)"]
    F13["userRejectedOKRIds\n(DB-06)"]
  end
  subgraph P5_Wish["P5 · 显化闭环"]
    F14["manifestStatus\n(DB-07)"]
    F15["celebrationCopy\n(DB-07)"]
  end
  subgraph P6_Bio["P6 · 生理闭环"]
    F16["heartRateVariability\n(HSI Layer1)"]
    F17["energyBoostFactor\n(DB-10)"]
    F18["behaviorVsCheckIn\n(DB-08)"]
  end

  F1 --> F3
  F1 --> F5
  F1 --> F6
  F2 --> F4
  F3 --> F9
  F5 --> F4
  F7 --> F3
  F8 --> F9
  F8 --> F10
  F9 --> F3
  F10 --> F3
  F11 --> F12
  F12 --> F13
  F14 --> F15
  F16 --> F4
  F17 --> F4
  F18 --> F1
```

## 13.3 字段启用条件检查表（运行时 Gate）

```tsx
// 每个 Phase 字段上线前，系统在首次写入时执行 Gate 检查
// 未通过 → 写入 SyncQueue 延迟队列，不报错
const PHASE_FIELD_GATES: Record<string, {
  db:          string;
  prerequisiteCheck: () => boolean;
  fallbackValue:     unknown;
  onGateFail:        'skip' | 'queue' | 'default';
}> = {
  'checkInContribution': {
    db:                'DB-04',
    prerequisiteCheck: () => currentPage.linkedOKRId != null,
    fallbackValue:     0,
    onGateFail:        'skip',
  },
  'semanticEmbedding': {
    db:                'DB-06',
    prerequisiteCheck: () => aiService.isAvailable() && (
      knowledgeRecord.R_reading?.length ?? 0) >= 20,
    fallbackValue:     null,
    onGateFail:        'queue',  // 等 AI 服务可用时重试
  },
  'heartRateVariability': {
    db:                'HSIProvider',
    prerequisiteCheck: () => SynheartSDK.isConnected(),
    fallbackValue:     undefined,
    onGateFail:        'default',  // 使用行为层 + 历史节律兜底
  },
  'energyBoostFactor': {
    db:                'DB-10',
    prerequisiteCheck: () => todayMealCount >= 1,
    fallbackValue:     1.0,
    onGateFail:        'default',
  },
};
```

# 十四、跨库数据写入规则

## 自动写入条件一览

| **触发事件** | **写入目标** | **写入字段** | **前置条件** |
| --- | --- | --- | --- |
| CheckIn 项勾选 | DB-04 目标管理 | `checkInContribution += checkInWeight` | `linkedOKRId` 存在 |
| CheckIn 项勾选 | DB-02 Habits | `completedDates.push(today)` | `linkedHabits` 存在 |
| Task status → Done | DB-05 关键成果 | `currentValue += okrContribution` | `linkedKRId` 存在 |
| Task status → Done | DB-04 目标管炂 | `taskContribution += 1`, 重算 `overallProgress` | `linkedOKRId` 存在 |
| 知识保存 + A 部分有内容 | DB-03 任务管理 | 新建 Task，`generatedFromKnowledge = knowledgeId` | `A_action` 非空 |
| 知识 OKR 关联确认 | DB-04 目标管理 | `linkedKnowledgeCount += 1` | AI 匹配分 > 0.65 且用户点击确认 |
| Wishlist 状态 → 已显化 | DB-04 目标管理 | `manifested = true`, `overallProgress = 100` | `linkedOKRId` 存在 |
| 周回顾完成确认 | DB-03 任务管理 | `weeklyPriority` 批量写入 (1–5) | Step ⑤ 用户确认 |
| CrashRiskMonitor 轮询 | DB-08 HSI 日志 | 新建 HSILogRecord | 每 60s 无条件 |

## 写入优先级规则