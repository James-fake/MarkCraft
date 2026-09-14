// dashboard module — public API (barrel)
//
// 说明：DashboardPanel / BookmarkContent 两个组件已随仪表盘面板退役删除。
// 本模块现存唯一活体 = useDashboardData（数据 hook），由 GraphPanel 消费做链接健康。

export * from './useDashboardData'
