var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var Config = import_koishi.Schema.object({
  defaultMoney: import_koishi.Schema.number().default(1e3).description("新用户初始货币数量"),
  dailyAmount: import_koishi.Schema.number().default(100).description("每日签到获得货币数量"),
  dailyCooldown: import_koishi.Schema.number().default(24).description("每日签到冷却时间(小时)"),
  rankListSize: import_koishi.Schema.number().default(10).description("排行榜显示人数"),
  commandPrefix: import_koishi.Schema.string().default("$").description("货币指令前缀"),
  currencyName: import_koishi.Schema.string().default("货币").description("自定义货币名称（如：金币、积分、钻石）"),
  messages: import_koishi.Schema.object({
    balanceSelf: import_koishi.Schema.string().default("你当前拥有{currencyName}: {money}").description("查询自己余额的回复"),
    balanceOther: import_koishi.Schema.string().default("用户{target}当前拥有{currencyName}: {money}").description("查询他人余额的回复"),
    transferSuccess: import_koishi.Schema.string().default("成功向{target}转账{amount}{currencyName}。你的余额: {balance}").description("转账成功的回复"),
    transferInsufficient: import_koishi.Schema.string().default("余额不足。").description("余额不足的回复"),
    transferInvalid: import_koishi.Schema.string().default("转账金额必须大于0。").description("金额无效的回复"),
    transferSelf: import_koishi.Schema.string().default("不能向自己转账。").description("向自己转账的回复"),
    dailySuccess: import_koishi.Schema.string().default("签到成功！获得{amount}{currencyName}。当前余额: {balance}").description("签到成功的回复"),
    dailyCooldown: import_koishi.Schema.string().default("今日已签到，下次签到时间: {nextTime}").description("签到冷却中的回复"),
    adminAddSuccess: import_koishi.Schema.string().default("已为用户{target}增加{amount}{currencyName}。").description("管理员增加货币成功的回复"),
    adminRemoveSuccess: import_koishi.Schema.string().default("已为用户{target}减少{amount}{currencyName}，剩余: {balance}").description("管理员减少货币成功的回复"),
    adminSetSuccess: import_koishi.Schema.string().default("已将用户{target}的{currencyName}设置为{amount}。").description("管理员设置货币成功的回复"),
    rankTitle: import_koishi.Schema.string().default("💰 {currencyName}排行榜 (第{page}页)").description("排行榜标题"),
    rankEmpty: import_koishi.Schema.string().default("暂无排行榜数据。").description("排行榜为空时的回复"),
    userNotFound: import_koishi.Schema.string().default("用户{target}不存在。").description("用户不存在的回复")
  }).description("消息提示词配置")
});
var name = "zhukong-currency-system";
var inject = ["database"];
function formatMessage(template, params, config) {
  let message = template.replace(/{currencyName}/g, config.currencyName);
  for (const [key, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return message;
}
__name(formatMessage, "formatMessage");
async function getUserCurrency(ctx, platform, userId) {
  const [currency] = await ctx.database.get("currency", { platform, userId });
  return currency;
}
__name(getUserCurrency, "getUserCurrency");
async function setUserCurrency(ctx, platform, userId, money) {
  const existing = await getUserCurrency(ctx, platform, userId);
  if (existing) {
    await ctx.database.set("currency", { id: existing.id }, { money });
  } else {
    await ctx.database.create("currency", { platform, userId, money });
  }
}
__name(setUserCurrency, "setUserCurrency");
async function checkDailyClaimed(ctx, platform, userId, date) {
  const records = await ctx.database.get("daily", { platform, userId, date });
  return records.length > 0;
}
__name(checkDailyClaimed, "checkDailyClaimed");
async function recordDailyClaim(ctx, platform, userId, date) {
  await ctx.database.create("daily", {
    platform,
    userId,
    date,
    claimedAt: /* @__PURE__ */ new Date()
  });
}
__name(recordDailyClaim, "recordDailyClaim");
function apply(ctx, config) {
  ctx.model.extend("currency", {
    // 修正：使用正确的自增主键定义
    id: { type: "integer", nullable: false, initial: 0 },
    userId: "string",
    platform: "string",
    money: { type: "integer", initial: config.defaultMoney }
  }, {
    // 修正：确保主键配置正确
    primary: "id",
    autoInc: true,
    // 添加自增属性
    unique: [["platform", "userId"]]
  });
  ctx.model.extend("daily", {
    // 修正：使用正确的自增主键定义
    id: { type: "integer", nullable: false, initial: 0 },
    userId: "string",
    platform: "string",
    date: "string",
    claimedAt: "timestamp"
  }, {
    // 修正：确保主键配置正确
    primary: "id",
    autoInc: true,
    // 添加自增属性
    unique: [["platform", "userId", "date"]]
  });
  ctx.command(`${config.commandPrefix}balance [targetUser]`, `查询${config.currencyName}余额`).alias("余额").action(async ({ session }, targetUser) => {
    const { platform, userId: selfId } = session;
    const targetId = targetUser || selfId;
    const currency = await getUserCurrency(ctx, platform, targetId);
    if (!currency) {
      if (targetId === selfId) {
        await setUserCurrency(ctx, platform, selfId, config.defaultMoney);
        return formatMessage(config.messages.balanceSelf, {
          money: config.defaultMoney
        }, config);
      }
      return formatMessage(config.messages.userNotFound, { target: targetId }, config);
    }
    const message = targetId === selfId ? config.messages.balanceSelf : config.messages.balanceOther;
    const params = targetId === selfId ? { money: currency.money } : { target: targetId, money: currency.money };
    return formatMessage(message, params, config);
  });
  ctx.command(`${config.commandPrefix}transfer <targetUser> <amount:number>`, `向其他用户转账${config.currencyName}`).alias("转账").action(async ({ session }, targetUser, amount) => {
    if (!targetUser || !amount) return "请指定转账目标和金额。";
    if (amount <= 0) return config.messages.transferInvalid;
    if (targetUser === session.userId) return config.messages.transferSelf;
    const { platform, userId: selfId } = session;
    const selfCurrency = await getUserCurrency(ctx, platform, selfId);
    const selfBalance = selfCurrency?.money || config.defaultMoney;
    if (amount > selfBalance) return config.messages.transferInsufficient;
    const targetCurrency = await getUserCurrency(ctx, platform, targetUser);
    if (!targetCurrency) {
      return formatMessage(config.messages.userNotFound, { target: targetUser }, config);
    }
    await setUserCurrency(ctx, platform, selfId, selfBalance - amount);
    await setUserCurrency(ctx, platform, targetUser, targetCurrency.money + amount);
    return formatMessage(config.messages.transferSuccess, {
      target: targetUser,
      amount,
      balance: selfBalance - amount
    }, config);
  });
  ctx.command(`${config.commandPrefix}daily`, `每日签到获取${config.currencyName}`).alias("签到").action(async ({ session }) => {
    const { platform, userId } = session;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const hasClaimed = await checkDailyClaimed(ctx, platform, userId, today);
    if (hasClaimed) {
      const nextDate = new Date(Date.now() + config.dailyCooldown * 60 * 60 * 1e3);
      return formatMessage(config.messages.dailyCooldown, {
        nextTime: nextDate.toLocaleString()
      }, config);
    }
    const currency = await getUserCurrency(ctx, platform, userId);
    const currentBalance = currency?.money || config.defaultMoney;
    const newBalance = currentBalance + config.dailyAmount;
    await setUserCurrency(ctx, platform, userId, newBalance);
    await recordDailyClaim(ctx, platform, userId, today);
    return formatMessage(config.messages.dailySuccess, {
      amount: config.dailyAmount,
      balance: newBalance
    }, config);
  });
  const admin = ctx.command(`${config.commandPrefix}admin`, `${config.currencyName}管理操作`).alias("货币管理");
  admin.subcommand(".add <target> <amount:number>", `为用户增加${config.currencyName}`).action(async ({ session }, target, amount) => {
    if (!target || !amount) return "请指定用户和金额。格式: 平台:用户ID 或 用户ID";
    const [platform, userId] = target.includes(":") ? target.split(":", 2) : [session.platform, target];
    if (!userId) return '用户ID格式错误，请使用"平台:用户ID"格式或直接输入用户ID';
    const currency = await getUserCurrency(ctx, platform, userId);
    const current = currency?.money || config.defaultMoney;
    await setUserCurrency(ctx, platform, userId, current + amount);
    return formatMessage(config.messages.adminAddSuccess, {
      target: `${platform}:${userId}`,
      amount
    }, config);
  });
  admin.subcommand(".remove <target> <amount:number>", `减少用户${config.currencyName}`).action(async ({ session }, target, amount) => {
    if (!target || !amount) return "请指定用户和金额。格式: 平台:用户ID 或 用户ID";
    const [platform, userId] = target.includes(":") ? target.split(":", 2) : [session.platform, target];
    if (!userId) return '用户ID格式错误，请使用"平台:用户ID"格式或直接输入用户ID';
    const currency = await getUserCurrency(ctx, platform, userId);
    const current = currency?.money || config.defaultMoney;
    const newAmount = Math.max(0, current - amount);
    await setUserCurrency(ctx, platform, userId, newAmount);
    return formatMessage(config.messages.adminRemoveSuccess, {
      target: `${platform}:${userId}`,
      amount,
      balance: newAmount
    }, config);
  });
  admin.subcommand(".set <target> <amount:number>", `设置用户${config.currencyName}数量`).action(async ({ session }, target, amount) => {
    if (!target || amount === void 0) return "请指定用户和金额。格式: 平台:用户ID 或 用户ID";
    const [platform, userId] = target.includes(":") ? target.split(":", 2) : [session.platform, target];
    if (!userId) return '用户ID格式错误，请使用"平台:用户ID"格式或直接输入用户ID';
    await setUserCurrency(ctx, platform, userId, amount);
    return formatMessage(config.messages.adminSetSuccess, {
      target: `${platform}:${userId}`,
      amount
    }, config);
  });
  ctx.command(`${config.commandPrefix}rank [page:number]`, `${config.currencyName}排行榜`).alias("富豪榜").action(async (_, page = 1) => {
    const pageSize = config.rankListSize;
    const skip = (page - 1) * pageSize;
    const currencies = await ctx.database.select("currency").where({ money: { $gt: 0 } }).orderBy("money", "desc").limit(pageSize).offset(skip).execute();
    if (currencies.length === 0) {
      return page === 1 ? config.messages.rankEmpty : "该页没有数据。";
    }
    let message = formatMessage(config.messages.rankTitle, { page }, config) + "\n";
    message += "=".repeat(20) + "\n";
    const maxMoney = currencies[0].money;
    currencies.forEach((currency, index) => {
      const rank = skip + index + 1;
      const money = currency.money || 0;
      const displayId = currency.userId.length > 6 ? `${currency.userId.slice(0, 6)}...` : currency.userId;
      const name2 = `${currency.platform}:${displayId}`;
      const barLength = 10;
      const filled = Math.round(money / maxMoney * barLength);
      const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
      message += `${rank}. ${name2}
`;
      message += `   ${bar} ${money.toLocaleString()}
`;
    });
    message += `
使用 "${config.commandPrefix}rank ${page + 1}" 查看下一页`;
    return message;
  });
  ctx.on("currency/get", async (userId) => {
    if (userId.includes(":")) {
      const [platform, targetId] = userId.split(":", 2);
      const currency = await getUserCurrency(ctx, platform, targetId);
      return currency?.money || config.defaultMoney;
    }
    return config.defaultMoney;
  });
  ctx.on("currency/set", async (userId, amount) => {
    if (userId.includes(":")) {
      const [platform, targetId] = userId.split(":", 2);
      await setUserCurrency(ctx, platform, targetId, amount);
    }
  });
  ctx.on("currency/add", async (userId, amount) => {
    if (userId.includes(":")) {
      const [platform, targetId] = userId.split(":", 2);
      const currency = await getUserCurrency(ctx, platform, targetId);
      const current = currency?.money || config.defaultMoney;
      await setUserCurrency(ctx, platform, targetId, current + amount);
    }
  });
  ctx.middleware(async (session, next) => {
    const { platform, userId } = session;
    const currency = await getUserCurrency(ctx, platform, userId);
    if (!currency) {
      await setUserCurrency(ctx, platform, userId, config.defaultMoney);
    }
    return next();
  });
  ctx.on("ready", () => {
    ctx.logger.info(`${config.currencyName}插件已启动，使用独立数据库表`);
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
