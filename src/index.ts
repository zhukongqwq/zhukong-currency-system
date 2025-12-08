import { Context, Schema, h } from 'koishi'

// 扩展 Koishi 的类型定义 - 核心修复：声明自定义表
declare module 'koishi' {
  // 1. 声明自定义数据库表的结构
  interface Tables {
    currency: CurrencyData
    daily: DailyRecord
  }

  // 2. 声明现有 Events 接口（用于 monetary 兼容）
  interface Events {
    'currency/get'(userId: string): Promise<number> | number
    'currency/set'(userId: string, amount: number): Promise<void> | void
    'currency/add'(userId: string, amount: number): Promise<void> | void
  }
}

// 定义货币数据表结构
interface CurrencyData {
  id: number
  userId: string
  platform: string
  money: number
}

// 定义签到记录表结构  
interface DailyRecord {
  id: number
  userId: string
  platform: string
  date: string  // 格式: YYYY-MM-DD
  claimedAt: Date
}

// 消息提示词配置接口
export interface MessageConfig {
  balanceSelf: string
  balanceOther: string
  transferSuccess: string
  transferInsufficient: string
  transferInvalid: string
  transferSelf: string
  dailySuccess: string
  dailyCooldown: string
  adminAddSuccess: string
  adminRemoveSuccess: string
  adminSetSuccess: string
  rankTitle: string
  rankEmpty: string
  userNotFound: string
}

// 主配置接口
export interface Config {
  defaultMoney: number
  dailyAmount: number
  dailyCooldown: number
  rankListSize: number
  commandPrefix: string
  currencyName: string
  messages: MessageConfig
}

// 配置架构
export const Config: Schema<Config> = Schema.object({
  defaultMoney: Schema.number().default(1000).description('新用户初始货币数量'),
  dailyAmount: Schema.number().default(100).description('每日签到获得货币数量'),
  dailyCooldown: Schema.number().default(24).description('每日签到冷却时间(小时)'),
  rankListSize: Schema.number().default(10).description('排行榜显示人数'),
  commandPrefix: Schema.string().default('$').description('货币指令前缀'),
  currencyName: Schema.string()
    .default('货币')
    .description('自定义货币名称（如：金币、积分、钻石）'),
  messages: Schema.object({
    balanceSelf: Schema.string()
      .default('你当前拥有{currencyName}: {money}')
      .description('查询自己余额的回复'),
    balanceOther: Schema.string()
      .default('用户{target}当前拥有{currencyName}: {money}')
      .description('查询他人余额的回复'),
    transferSuccess: Schema.string()
      .default('成功向{target}转账{amount}{currencyName}。你的余额: {balance}')
      .description('转账成功的回复'),
    transferInsufficient: Schema.string()
      .default('余额不足。')
      .description('余额不足的回复'),
    transferInvalid: Schema.string()
      .default('转账金额必须大于0。')
      .description('金额无效的回复'),
    transferSelf: Schema.string()
      .default('不能向自己转账。')
      .description('向自己转账的回复'),
    dailySuccess: Schema.string()
      .default('签到成功！获得{amount}{currencyName}。当前余额: {balance}')
      .description('签到成功的回复'),
    dailyCooldown: Schema.string()
      .default('今日已签到，下次签到时间: {nextTime}')
      .description('签到冷却中的回复'),
    adminAddSuccess: Schema.string()
      .default('已为用户{target}增加{amount}{currencyName}。')
      .description('管理员增加货币成功的回复'),
    adminRemoveSuccess: Schema.string()
      .default('已为用户{target}减少{amount}{currencyName}，剩余: {balance}')
      .description('管理员减少货币成功的回复'),
    adminSetSuccess: Schema.string()
      .default('已将用户{target}的{currencyName}设置为{amount}。')
      .description('管理员设置货币成功的回复'),
    rankTitle: Schema.string()
      .default('💰 {currencyName}排行榜 (第{page}页)')
      .description('排行榜标题'),
    rankEmpty: Schema.string()
      .default('暂无排行榜数据。')
      .description('排行榜为空时的回复'),
    userNotFound: Schema.string()
      .default('用户{target}不存在。')
      .description('用户不存在的回复'),
  }).description('消息提示词配置'),
})

export const name = 'zhukong-currency-system'
export const inject = ['database']

// 工具函数：应用消息模板
function formatMessage(template: string, params: Record<string, any>, config: Config): string {
  let message = template.replace(/{currencyName}/g, config.currencyName)
  for (const [key, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`{${key}}`, 'g'), value)
  }
  return message
}

// 辅助函数：获取用户货币数据
async function getUserCurrency(ctx: Context, platform: string, userId: string): Promise<CurrencyData | undefined> {
  const [currency] = await ctx.database.get('currency', { platform, userId })
  return currency
}

// 辅助函数：设置用户货币
async function setUserCurrency(ctx: Context, platform: string, userId: string, money: number) {
  const existing = await getUserCurrency(ctx, platform, userId)
  if (existing) {
    await ctx.database.set('currency', { id: existing.id }, { money })
  } else {
    await ctx.database.create('currency', { platform, userId, money })
  }
}

// 辅助函数：检查是否已签到
async function checkDailyClaimed(ctx: Context, platform: string, userId: string, date: string): Promise<boolean> {
  const records = await ctx.database.get('daily', { platform, userId, date })
  return records.length > 0
}

// 辅助函数：记录签到
async function recordDailyClaim(ctx: Context, platform: string, userId: string, date: string) {
  await ctx.database.create('daily', { 
    platform, 
    userId, 
    date,
    claimedAt: new Date()
  })
}

export function apply(ctx: Context, config: Config) {
  // 1. 修正数据库表定义 - 关键修复！
  // currency 表
  ctx.model.extend('currency', {
    // 修正：使用正确的自增主键定义
    id: { type: 'integer', nullable: false, initial: 0 },
    userId: 'string',
    platform: 'string',
    money: { type: 'integer', initial: config.defaultMoney },
  }, {
    // 修正：确保主键配置正确
    primary: 'id',
    autoInc: true, // 添加自增属性
    unique: [['platform', 'userId']],
  })
  
  // daily 表
  ctx.model.extend('daily', {
    // 修正：使用正确的自增主键定义
    id: { type: 'integer', nullable: false, initial: 0 },
    userId: 'string',
    platform: 'string',
    date: 'string',
    claimedAt: 'timestamp',
  }, {
    // 修正：确保主键配置正确
    primary: 'id',
    autoInc: true, // 添加自增属性
    unique: [['platform', 'userId', 'date']],
  })
  
  // 2. 查询余额指令
  ctx.command(`${config.commandPrefix}balance [targetUser]`, `查询${config.currencyName}余额`)
    .alias('余额')
    .action(async ({ session }, targetUser) => {
      const { platform, userId: selfId } = session
      const targetId = targetUser || selfId
      
      const currency = await getUserCurrency(ctx, platform, targetId)
      if (!currency) {
        if (targetId === selfId) {
          // 自己还没有记录，创建默认记录
          await setUserCurrency(ctx, platform, selfId, config.defaultMoney)
          return formatMessage(config.messages.balanceSelf, {
            money: config.defaultMoney
          }, config)
        }
        return formatMessage(config.messages.userNotFound, { target: targetId }, config)
      }
      
      const message = targetId === selfId ? config.messages.balanceSelf : config.messages.balanceOther
      const params = targetId === selfId 
        ? { money: currency.money }
        : { target: targetId, money: currency.money }
      
      return formatMessage(message, params, config)
    })
  
  // 3. 转账指令
  ctx.command(`${config.commandPrefix}transfer <targetUser> <amount:number>`, `向其他用户转账${config.currencyName}`)
    .alias('转账')
    .action(async ({ session }, targetUser, amount) => {
      if (!targetUser || !amount) return '请指定转账目标和金额。'
      if (amount <= 0) return config.messages.transferInvalid
      if (targetUser === session.userId) return config.messages.transferSelf
      
      const { platform, userId: selfId } = session
      
      // 获取自己余额
      const selfCurrency = await getUserCurrency(ctx, platform, selfId)
      const selfBalance = selfCurrency?.money || config.defaultMoney
      
      if (amount > selfBalance) return config.messages.transferInsufficient
      
      // 获取目标用户
      const targetCurrency = await getUserCurrency(ctx, platform, targetUser)
      if (!targetCurrency) {
        return formatMessage(config.messages.userNotFound, { target: targetUser }, config)
      }
      
      // 执行转账
      await setUserCurrency(ctx, platform, selfId, selfBalance - amount)
      await setUserCurrency(ctx, platform, targetUser, targetCurrency.money + amount)
      
      return formatMessage(config.messages.transferSuccess, {
        target: targetUser,
        amount,
        balance: selfBalance - amount
      }, config)
    })
  
  // 4. 每日签到指令 - 修改：冷却时间改为每天0点刷新
  ctx.command(`${config.commandPrefix}daily`, `每日签到获取${config.currencyName}`)
    .alias('签到')
    .action(async ({ session }) => {
      const { platform, userId } = session
      const today = new Date().toISOString().split('T')[0]
      
      // 检查是否已签到
      const hasClaimed = await checkDailyClaimed(ctx, platform, userId, today)
      if (hasClaimed) {
        // 计算次日0点的时间
        const now = new Date()
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        const timeLeft = tomorrow.getTime() - now.getTime()
        const hours = Math.floor(timeLeft / (1000 * 60 * 60))
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
        
        // 格式化时间显示
        let timeStr = ''
        if (hours > 0) {
          timeStr += `${hours}小时`
        }
        if (minutes > 0) {
          timeStr += `${minutes}分钟`
        }
        if (hours === 0 && minutes === 0) {
          timeStr = '小于1分钟'
        }
        
        return formatMessage(config.messages.dailyCooldown, {
          nextTime: `${timeStr}后`
        }, config)
      }
      
      // 获取当前余额并增加
      const currency = await getUserCurrency(ctx, platform, userId)
      const currentBalance = currency?.money || config.defaultMoney
      const newBalance = currentBalance + config.dailyAmount
      
      // 更新余额并记录签到
      await setUserCurrency(ctx, platform, userId, newBalance)
      await recordDailyClaim(ctx, platform, userId, today)
      
      return formatMessage(config.messages.dailySuccess, {
        amount: config.dailyAmount,
        balance: newBalance
      }, config)
    })
  
  // 5. 管理员操作指令组
  const admin = ctx.command(`${config.commandPrefix}admin`, `${config.currencyName}管理操作`)
    .alias('货币管理')
  
  // 管理员命令格式: $admin.set <platform:userId> <amount>
  // 示例: $admin.set onebot:123456 100
  // 简写格式: $admin.set 123456 100 (默认使用当前平台)
  
  admin.subcommand('.add <target> <amount:number>', `为用户增加${config.currencyName}`)
    .action(async ({ session }, target, amount) => {
      if (!target || !amount) return '请指定用户和金额。格式: 平台:用户ID 或 用户ID'
      
      // 解析平台和用户ID
      const [platform, userId] = target.includes(':') 
        ? target.split(':', 2) 
        : [session.platform, target]
      
      if (!userId) return '用户ID格式错误，请使用"平台:用户ID"格式或直接输入用户ID'
      
      const currency = await getUserCurrency(ctx, platform, userId)
      const current = currency?.money || config.defaultMoney
      await setUserCurrency(ctx, platform, userId, current + amount)
      
      return formatMessage(config.messages.adminAddSuccess, {
        target: `${platform}:${userId}`,
        amount
      }, config)
    })
  
  admin.subcommand('.remove <target> <amount:number>', `减少用户${config.currencyName}`)
    .action(async ({ session }, target, amount) => {
      if (!target || !amount) return '请指定用户和金额。格式: 平台:用户ID 或 用户ID'
      
      const [platform, userId] = target.includes(':') 
        ? target.split(':', 2) 
        : [session.platform, target]
      
      if (!userId) return '用户ID格式错误，请使用"平台:用户ID"格式或直接输入用户ID'
      
      const currency = await getUserCurrency(ctx, platform, userId)
      const current = currency?.money || config.defaultMoney
      const newAmount = Math.max(0, current - amount)
      await setUserCurrency(ctx, platform, userId, newAmount)
      
      return formatMessage(config.messages.adminRemoveSuccess, {
        target: `${platform}:${userId}`,
        amount,
        balance: newAmount
      }, config)
    })
  
  admin.subcommand('.set <target> <amount:number>', `设置用户${config.currencyName}数量`)
    .action(async ({ session }, target, amount) => {
      if (!target || amount === undefined) return '请指定用户和金额。格式: 平台:用户ID 或 用户ID'
      
      const [platform, userId] = target.includes(':') 
        ? target.split(':', 2) 
        : [session.platform, target]
      
      if (!userId) return '用户ID格式错误，请使用"平台:用户ID"格式或直接输入用户ID'
      
      await setUserCurrency(ctx, platform, userId, amount)
      return formatMessage(config.messages.adminSetSuccess, {
        target: `${platform}:${userId}`,
        amount
      }, config)
    })
  
  // 6. 货币排行榜
  ctx.command(`${config.commandPrefix}rank [page:number]`, `${config.currencyName}排行榜`)
    .alias('富豪榜')
    .action(async (_, page = 1) => {
      const pageSize = config.rankListSize
      const skip = (page - 1) * pageSize
      
      // 从 currency 表获取数据
      const currencies = await ctx.database
        .select('currency')
        .where({ money: { $gt: 0 } })
        .orderBy('money', 'desc')
        .limit(pageSize)
        .offset(skip)
        .execute() as CurrencyData[]
      
      if (currencies.length === 0) {
        return page === 1 ? config.messages.rankEmpty : '该页没有数据。'
      }
      
      let message = formatMessage(config.messages.rankTitle, { page }, config) + '\n'
      message += '='.repeat(20) + '\n'
      
      // 获取最高金额用于进度条计算
      const maxMoney = currencies[0].money
      
      currencies.forEach((currency, index) => {
        const rank = skip + index + 1
        const money = currency.money || 0
        
        // 显示格式: 平台:用户ID片段
        const displayId = currency.userId.length > 6 
          ? `${currency.userId.slice(0, 6)}...`
          : currency.userId
        const name = `${currency.platform}:${displayId}`
        
        const barLength = 10
        const filled = Math.round((money / maxMoney) * barLength)
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled)
        
        message += `${rank}. ${name}\n`
        message += `   ${bar} ${money.toLocaleString()}\n`
      })
      
      message += `\n使用 "${config.commandPrefix}rank ${page + 1}" 查看下一页`
      return message
    })
  
  // 7. 兼容 monetary 系统的接口
  ctx.on('currency/get', async (userId: string) => {
    // userId 格式为 "平台:用户ID"
    if (userId.includes(':')) {
      const [platform, targetId] = userId.split(':', 2)
      const currency = await getUserCurrency(ctx, platform, targetId)
      return currency?.money || config.defaultMoney
    }
    return config.defaultMoney
  })
  
  ctx.on('currency/set', async (userId: string, amount: number) => {
    if (userId.includes(':')) {
      const [platform, targetId] = userId.split(':', 2)
      await setUserCurrency(ctx, platform, targetId, amount)
    }
  })
  
  ctx.on('currency/add', async (userId: string, amount: number) => {
    if (userId.includes(':')) {
      const [platform, targetId] = userId.split(':', 2)
      const currency = await getUserCurrency(ctx, platform, targetId)
      const current = currency?.money || config.defaultMoney
      await setUserCurrency(ctx, platform, targetId, current + amount)
    }
  })
  
  // 8. 用户首次发言时初始化货币
  ctx.middleware(async (session, next) => {
    const { platform, userId } = session
    const currency = await getUserCurrency(ctx, platform, userId)
    if (!currency) {
      await setUserCurrency(ctx, platform, userId, config.defaultMoney)
    }
    return next()
  })
  
  // 9. 启动日志
  ctx.on('ready', () => {
    ctx.logger.info(`${config.currencyName}插件已启动，使用独立数据库表`)
  })
}