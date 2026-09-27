# 布局切换生命周期（Wave B）

串行 owner 在 `src/app/layouts/layout-switch-runtime.ts`。本页锁定 quarantine
语义、stage-canvas 监管域，以及相对 v10 §3.2:74 的已批准偏差。

## Quarantine

`getSwitchState() === 'quarantined'` 表示当前事务的 effectful 阶段没有安全
ack，coordinator 不能再启动新的 switch / setScene。

离开隔离只有两条路：

1. **`resetSwitchQuarantine()`** — 仅当（a）未完成的 effectful 阶段已 ack、
   （b）协调器持有的 **stage** canvas 唯一（见下）、（c）恢复目标已知。
   图区 / 仪器上的额外 `<canvas>` 不参与 uniqueness。
2. **整页重载** — 不满足复位条件时，quarantine 是终态。生产面通过
   `layout:switch-error` 把这条路径表面化（容器状态条 + `console.error`）。

`enterQuarantine` / `resetSwitchQuarantine` 都会清空 `pendingSwitchId` 与
`pendingScene`，避免隔离前入队的目标在下一次成功 switch 的 `finally` 被
drain。`drainPending` 的顺序是 **pendingScene 先、pendingSwitchId 后**；
C4 将把 `savePreference: true` 硬编码改为按 queued reason 传递，不得调换
这两步。

## Stage canvas 监管域

`hasUniqueCanvasOwner` 只看协调器持有的 stage canvas（`canvasOwner` /
snapshot / 当前与 incoming 布局的 **animation** slot），不扫
`container.querySelectorAll('canvas')`。

持有 node 且容器内 0 个 stage canvas → unique（`true`）。普通 mount 抛错后
`abandonIncoming` 清空树、走 rollback、不进 quarantine
（`scene-container-registry.spec.ts` 锁定）。

## 已批准偏差：enter-abort after `incomingMounted`（v10 §3.2:74）

v10 §3.2:74 要求 detach 后失败则拆掉目标、把 canvas 交回旧布局。Wave B 裁定：
`setupIncoming` 已把新树挂上之后（`incomingMounted`）再 abort，**保留新树**，
并补发 `onLayoutDidChange` / `layout:change` / `savePreference`。acked enter
之后 rollback 比留在新树上更差。

## throw-before-teardown

`onLayoutWillChange` 在 snapshot / dispose 之前抛错：保持旧布局、回 `idle`、
经 `layout:switch-error`（`state: 'idle'`）上报。不 ack-and-quarantine。

## dispose 取消在途 switch

`container.dispose()` 调用 runtime `dispose()`，abort 当前 `AbortSignal`。
`setupIncoming` / `finalize` 在每个真实 await 之后、写入
`dataset` / `setCurrentLayout` 之前检查 `isDisposed()` + signal。
