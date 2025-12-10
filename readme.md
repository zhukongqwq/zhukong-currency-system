# koishi-plugin-zhukong-currency-system

[![npm](https://img.shields.io/npm/v/koishi-plugin-zhukong-currency-system?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-zhukong-currency-system)

竹空自用的通用货币系统插件。支持完整的货币增删改查、排行榜、每日签到等功能，并高度可配置。

> **自用说明**：此插件主要为个人需求开发，功能稳定但可能随性更新，不提供长期维护保证。

---

## 功能简介

这是一个为 Koishi 机器人框架设计的货币/经济系统插件，核心功能包括：

*   **用户货币管理**：查询余额、用户间转账。
*   **每日签到**：可配置冷却时间和奖励金额。
*   **管理员工具**：支持直接为指定用户增加、减少或设置货币数量。
*   **财富排行榜**：查看服务器内的货币排名，支持分页。
*   **高度可定制**：可自定义货币名称、指令前缀及所有交互提示词。
*   **独立数据表**：使用独立的 `currency` 和 `daily` 数据库表，不与核心用户表耦合。
*   **兼容性接口**：提供事件接口，兼容需要调用货币系统的其他插件。

---

## 安装与启用

在 Koishi 项目目录中运行以下命令安装：

```bash
npm install koishi-plugin-zhukong-currency-system
```

随后，在 Koishi 控制台（Web UI）的“插件配置”页面中，找到 zhukong-currency-system 并启用即可。

---

## 配置说明

在插件配置界面，你可以调整以下参数：

|配置项 |类型 |默认值 |描述
|---|---|---|---|
defaultMoney |number |1000 |新用户注册时获得的初始货币数量。
dailyAmount |number |100 |每日签到成功后可获得的货币数量。
dailyCooldown |number |24 |每日签到的冷却时间（单位：小时）。
rankListSize &number |10 |排行榜每页显示的用户数量。
commandPrefix |string |$ |插件指令的前缀（例如 $ 对应 $balance）。
currencyName |string |货币 |自定义货币的名称（如：金币、积分、钻石），此名称会替换所有相关回复中的“货币”一词。
messages |object |- |高级定制：可以完全自定义插件回复的每一句提示文本。

#### 高级提示词定制 (messages)

在 messages 配置组中，你可以修改所有机器人回复的文本。提示词支持变量插值，例如：

· {currencyName}: 会被替换为上面配置的 currencyName。
· {money}, {amount}, {target}, {balance}, {page}, {nextTime}: 会在运行时被替换为对应的具体值。

---

## 使用指令

启用插件后，用户和管理员可以使用以下指令（假设使用默认前缀 $）：

### 用户指令

|指令 |别名 |参数 |说明 |示例
|---|---|---|---|---|
|$balance [用户] |余额 |[用户]: 可选，查询他人的用户ID。 |查询自己或指定用户的货币余额。 |$balance (查自己)   $balance @某人 (查他人)
$transfer <目标> <金额> |转账| <目标>: 对方用户ID。 <金额>: 转账数量。 |向其他用户转账。 |$transfer @某人 500
$daily |签到 |无| 每日签到，获取货币。| $daily
$rank [页码] |富豪榜 |[页码]: 可选，查看排行榜第几页。 |查看全服货币排行榜。 |$rank   $rank 2

### 管理员指令

**管理员使用 $admin（或别名货币管理）来管理用户货币。**

|指令 |参数格式 |说明| 示例
|---|---|---|---
|$admin.add <目标> <金额>| <目标>: 用户ID或 平台:用户ID。 |<金额>: 增加的货币数。 为指定用户增加货币。| $admin.add 123456 100   $admin.add onebot:123456 100
|$admin.remove <目标> <金额> |同上 |减少指定用户的货币（不会减到负数以下）。| $admin.remove 123456 50
|$admin.set <目标> <金额> |同上| 直接将指定用户的货币设置为指定数量。| $admin.set 123456 9999

#### 注意：管理员命令中的 <目标> 支持简写（仅用户ID，默认在当前平台操作）和完整格式（平台:用户ID，用于跨平台精确操作）。

---

## 常见问题 (Q&A)

Q: 插件启用后指令没有反应？
A:请确保已正确安装并启用了数据库插件（如 database-sqlite），因为本插件依赖数据库服务。

Q: 如何修改指令前缀？
A:在插件配置中修改 commandPrefix 项，例如改为 #，则所有指令将变为 #余额、#签到。

Q: 管理员命令提示“user not found”？
A:请检查用户ID是否正确，或尝试使用 平台:用户ID 的完整格式（如 onebot:123456）。

Q: 如何从旧版（使用user表）迁移数据？
A:当前版本使用独立表，暂无自动迁移脚本。如需迁移旧数据，请手动编写脚本或联系作者。


---

**插件由竹空制作，仅供学习和自用。**
**如有任何问题或建议，欢迎通过 GitHub Issues 或相关渠道反馈（但不保证及时回复）。**
