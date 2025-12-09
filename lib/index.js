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
  adminUsers: import_koishi.Schema.array(import_koishi.Schema.string()).default([]).description("管理员用户列表（用户名）"),
  messages: import_koishi.Schema.object({
    balanceSelf: import_koishi.Schema.string().default("你当前拥有{currencyName}: {money}").description("查询自己余额的回复"),
    balanceOther: import_koishi.Schema.string().default("用户{target}当前拥有{currencyName}: {money}").description("查询他人余额的回复"),
    transferSuccess: import_koishi.Schema.string().default("成功向{target}转账{amount}{currencyName}。你的余额: {balance}").description("转账成功的回复"),
    transferInsufficient: import_koishi.Schema.string().default("余额不足。").description("余额不足的回复"),
    transferInvalid: import_koishi.Schema.string().default("转账金额必须大于0。").description("金额无效的回复"),
    transferSelf: import_koishi.Schema.string().default("不能向自己转账。").description("向自己转账的回复"),
    dailySuccess: import_koishi.Schema.string().default("签到成功！获得{amount}{currencyName}。当前余额: {balance}").description("签到成功的回复"),
    dailyCooldown: import_koishi.Schema.string().default("今日已签到，下次签到时间: {nextTime}").description("签到冷却中的回复"),
    rankTitle: import_koishi.Schema.string().default("💰 {currencyName}排行榜 (第{page}页)").description("排行榜标题"),
    rankEmpty: import_koishi.Schema.string().default("暂无排行榜数据。").description("排行榜为空时的回复"),
    userNotFound: import_koishi.Schema.string().default("用户{target}不存在。").description("用户不存在的回复"),
    // 新增管理员消息配置
    adminAddSuccess: import_koishi.Schema.string().default("已为用户 {target} 增加 {amount}{currencyName}。当前余额: {balance}").description("管理员增加货币成功的回复"),
    adminRemoveSuccess: import_koishi.Schema.string().default("已为用户 {target} 减少 {amount}{currencyName}。当前余额: {balance}").description("管理员减少货币成功的回复"),
    adminSetSuccess: import_koishi.Schema.string().default("已将用户 {target} 的{currencyName}设置为 {amount}。").description("管理员设置货币成功的回复"),
    adminListTitle: import_koishi.Schema.string().default("📊 用户{currencyName}列表 (第{page}页/共{totalPages}页)").description("管理员列表标题"),
    adminListEmpty: import_koishi.Schema.string().default("暂无用户数据。").description("管理员列表为空时的回复"),
    adminListItem: import_koishi.Schema.string().default("{index}. 用户: {userId} | {currencyName}: {money}").description("管理员列表项格式"),
    adminSearchNotFound: import_koishi.Schema.string().default("未找到用户 {keyword}。").description("管理员搜索用户未找到的回复"),
    adminOperationNoPermission: import_koishi.Schema.string().default("权限不足，只有管理员可以使用此命令。").description("无权限操作的回复")
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
async function getUserCurrency(ctx, userId) {
  const [currency] = await ctx.database.get("currency", { userId });
  return currency;
}
__name(getUserCurrency, "getUserCurrency");
async function setUserCurrency(ctx, userId, money) {
  const existing = await getUserCurrency(ctx, userId);
  if (existing) {
    await ctx.database.set("currency", { id: existing.id }, { money });
  } else {
    await ctx.database.create("currency", { userId, money });
  }
}
__name(setUserCurrency, "setUserCurrency");
async function checkDailyClaimed(ctx, userId, date) {
  const records = await ctx.database.get("daily", { userId, date });
  return records.length > 0;
}
__name(checkDailyClaimed, "checkDailyClaimed");
async function recordDailyClaim(ctx, userId, date) {
  await ctx.database.create("daily", {
    userId,
    date,
    claimedAt: /* @__PURE__ */ new Date()
  });
}
__name(recordDailyClaim, "recordDailyClaim");
function isAdminUser(session, config) {
  const userId = session.userId;
  if (!userId) return false;
  return config.adminUsers.includes(userId);
}
__name(isAdminUser, "isAdminUser");
function apply(ctx, config) {
  ctx.model.extend("currency", {
    id: { type: "integer", nullable: false, initial: 0 },
    userId: { type: "string", nullable: false },
    money: { type: "integer", initial: config.defaultMoney }
  }, {
    primary: "id",
    autoInc: true,
    unique: ["userId"]
  });
  ctx.model.extend("daily", {
    id: { type: "integer", nullable: false, initial: 0 },
    userId: { type: "string", nullable: false },
    date: "string",
    claimedAt: "timestamp"
  }, {
    primary: "id",
    autoInc: true,
    unique: [["userId", "date"]]
  });
  ctx.command(`${config.commandPrefix}balance [targetUser]`, `查询${config.currencyName}余额`).alias("余额").action(async ({ session }, targetUser) => {
    const selfId = session.userId;
    const targetId = targetUser || selfId;
    const currency = await getUserCurrency(ctx, targetId);
    if (!currency) {
      if (targetId === selfId) {
        await setUserCurrency(ctx, selfId, config.defaultMoney);
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
    const selfId = session.userId;
    const selfCurrency = await getUserCurrency(ctx, selfId);
    const selfBalance = selfCurrency?.money || config.defaultMoney;
    if (amount > selfBalance) return config.messages.transferInsufficient;
    const targetCurrency = await getUserCurrency(ctx, targetUser);
    if (!targetCurrency) {
      return formatMessage(config.messages.userNotFound, { target: targetUser }, config);
    }
    await setUserCurrency(ctx, selfId, selfBalance - amount);
    await setUserCurrency(ctx, targetUser, targetCurrency.money + amount);
    return formatMessage(config.messages.transferSuccess, {
      target: targetUser,
      amount,
      balance: selfBalance - amount
    }, config);
  });
  ctx.command(`${config.commandPrefix}daily`, `每日签到获取${config.currencyName}`).alias("签到").action(async ({ session }) => {
    const userId = session.userId;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const hasClaimed = await checkDailyClaimed(ctx, userId, today);
    if (hasClaimed) {
      const now = /* @__PURE__ */ new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const timeLeft = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(timeLeft / (1e3 * 60 * 60));
      const minutes = Math.floor(timeLeft % (1e3 * 60 * 60) / (1e3 * 60));
      let timeStr = "";
      if (hours > 0) {
        timeStr += `${hours}小时`;
      }
      if (minutes > 0) {
        timeStr += `${minutes}分钟`;
      }
      if (hours === 0 && minutes === 0) {
        timeStr = "小于1分钟";
      }
      return formatMessage(config.messages.dailyCooldown, {
        nextTime: `${timeStr}后`
      }, config);
    }
    const currency = await getUserCurrency(ctx, userId);
    const currentBalance = currency?.money || config.defaultMoney;
    const newBalance = currentBalance + config.dailyAmount;
    await setUserCurrency(ctx, userId, newBalance);
    await recordDailyClaim(ctx, userId, today);
    return formatMessage(config.messages.dailySuccess, {
      amount: config.dailyAmount,
      balance: newBalance
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
      const displayId = currency.userId.length > 8 ? `${currency.userId.slice(0, 8)}...` : currency.userId;
      const barLength = 10;
      const filled = Math.round(money / maxMoney * barLength);
      const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
      message += `${rank}. ${displayId}
`;
      message += `   ${bar} ${money.toLocaleString()}
`;
    });
    message += `
使用 "${config.commandPrefix}rank ${page + 1}" 查看下一页`;
    return message;
  });
  const admin = ctx.command(`${config.commandPrefix}admin`, `${config.currencyName}管理操作`).alias("货币管理").action(({ session }) => {
    if (!session) return "会话错误。";
    if (!isAdminUser(session, config)) {
      return config.messages.adminOperationNoPermission;
    }
    return `💰 ${config.currencyName}管理命令：
================================
1. 增加货币: .add <用户ID> <数量>
2. 减少货币: .remove <用户ID> <数量>
3. 设置货币: .set <用户ID> <数量>
4. 查询用户: .search <用户ID或关键词>
5. 查看列表: .list [页码]
6. 重置签到: .resetdaily <用户ID>`;
  });
  admin.subcommand(".add <userId> <amount:number>", `为用户增加${config.currencyName}`).action(async ({ session }, userId, amount) => {
    if (!session) return "会话错误。";
    if (!isAdminUser(session, config)) {
      return config.messages.adminOperationNoPermission;
    }
    if (!userId || !amount) {
      return "请指定用户ID和金额。格式: .add <用户ID> <数量>";
    }
    if (amount <= 0) {
      return "金额必须大于0。";
    }
    const currency = await getUserCurrency(ctx, userId);
    const currentBalance = currency?.money || config.defaultMoney;
    const newBalance = currentBalance + amount;
    await setUserCurrency(ctx, userId, newBalance);
    return formatMessage(config.messages.adminAddSuccess, {
      target: userId,
      amount,
      balance: newBalance
    }, config);
  });
  admin.subcommand(".remove <userId> <amount:number>", `减少用户${config.currencyName}`).action(async ({ session }, userId, amount) => {
    if (!session) return "会话错误。";
    if (!isAdminUser(session, config)) {
      return config.messages.adminOperationNoPermission;
    }
    if (!userId || !amount) {
      return "请指定用户ID和金额。格式: .remove <用户ID> <数量>";
    }
    if (amount <= 0) {
      return "金额必须大于0。";
    }
    const currency = await getUserCurrency(ctx, userId);
    const currentBalance = currency?.money || config.defaultMoney;
    const newBalance = Math.max(0, currentBalance - amount);
    await setUserCurrency(ctx, userId, newBalance);
    return formatMessage(config.messages.adminRemoveSuccess, {
      target: userId,
      amount,
      balance: newBalance
    }, config);
  });
  admin.subcommand(".set <userId> <amount:number>", `设置用户${config.currencyName}数量`).action(async ({ session }, userId, amount) => {
    if (!session) return "会话错误。";
    if (!isAdminUser(session, config)) {
      return config.messages.adminOperationNoPermission;
    }
    if (!userId || amount === void 0) {
      return "请指定用户ID和金额。格式: .set <用户ID> <数量>";
    }
    if (amount < 0) {
      return "金额不能为负数。";
    }
    await setUserCurrency(ctx, userId, amount);
    return formatMessage(config.messages.adminSetSuccess, {
      target: userId,
      amount
    }, config);
  });
  admin.subcommand(".search <keyword>", `搜索用户${config.currencyName}信息`).action(async ({ session }, keyword) => {
    if (!session) return "会话错误。";
    if (!isAdminUser(session, config)) {
      return config.messages.adminOperationNoPermission;
    }
    if (!keyword) {
      return "请指定搜索关键词。";
    }
    const currencies = await ctx.database.select("currency").where({
      userId: { $regex: new RegExp(keyword, "i") }
    }).limit(10).execute();
    if (currencies.length === 0) {
      return formatMessage(config.messages.adminSearchNotFound, { keyword }, config);
    }
    let message = `🔍 搜索结果 (共${currencies.length}个用户)
`;
    message += "=".repeat(40) + "\n";
    currencies.forEach((currency, index) => {
      const userId = currency.userId;
      const money = currency.money || 0;
      message += `${index + 1}. 用户: ${userId}
`;
      message += `   ${config.currencyName}: ${money}
`;
      message += "-".repeat(20) + "\n";
    });
    return message;
  });
  admin.subcommand(".list [page:number]", `查看所有用户${config.currencyName}列表`).action(async ({ session }, page = 1) => {
    if (!session) return "会话错误。";
    if (!isAdminUser(session, config)) {
      return config.messages.adminOperationNoPermission;
    }
    const pageSize = 10;
    const skip = (page - 1) * pageSize;
    const currencies = await ctx.database.select("currency").orderBy("money", "desc").limit(pageSize).offset(skip).execute();
    const allCurrencies = await ctx.database.select("currency").execute();
    const totalUsers = allCurrencies.length;
    const totalPages = Math.ceil(totalUsers / pageSize);
    if (currencies.length === 0) {
      return page === 1 ? config.messages.adminListEmpty : "该页没有数据。";
    }
    let message = formatMessage(config.messages.adminListTitle, {
      page,
      totalPages
    }, config) + "\n";
    message += "=".repeat(40) + "\n";
    currencies.forEach((currency, index) => {
      const rank = skip + index + 1;
      const userId = currency.userId;
      const money = currency.money || 0;
      message += formatMessage(config.messages.adminListItem, {
        index: rank,
        userId,
        money
      }, config) + "\n";
    });
    if (totalPages > 1) {
      message += `
使用 "${config.commandPrefix}admin.list ${page < totalPages ? page + 1 : 1}" 查看下一页`;
    }
    return message;
  });
  admin.subcommand(".resetdaily <userId>", `重置用户签到状态`).action(async ({ session }, userId) => {
    if (!session) return "会话错误。";
    if (!isAdminUser(session, config)) {
      return config.messages.adminOperationNoPermission;
    }
    if (!userId) {
      return "请指定用户ID。";
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const hasClaimed = await checkDailyClaimed(ctx, userId, today);
    if (!hasClaimed) {
      return `用户 ${userId} 今天尚未签到，无需重置。`;
    }
    await ctx.database.remove("daily", { userId, date: today });
    return `✅ 已重置用户 ${userId} 的签到状态，现在可以重新签到。`;
  });
  ctx.middleware(async (session, next) => {
    const { userId } = session;
    const currency = await getUserCurrency(ctx, userId);
    if (!currency) {
      await setUserCurrency(ctx, userId, config.defaultMoney);
    }
    return next();
  });
  ctx.on("ready", () => {
    ctx.logger.info(`${config.currencyName}插件已启动`);
    if (config.adminUsers.length > 0) {
      ctx.logger.info(`已配置 ${config.adminUsers.length} 个管理员`);
    }
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
