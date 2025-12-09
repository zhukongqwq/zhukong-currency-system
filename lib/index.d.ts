import { Context, Schema } from 'koishi';
declare module 'koishi' {
    interface Tables {
        currency: CurrencyData;
        daily: DailyRecord;
    }
}
interface CurrencyData {
    id: number;
    userId: string;
    money: number;
}
interface DailyRecord {
    id: number;
    userId: string;
    date: string;
    claimedAt: Date;
}
export interface MessageConfig {
    balanceSelf: string;
    balanceOther: string;
    transferSuccess: string;
    transferInsufficient: string;
    transferInvalid: string;
    transferSelf: string;
    dailySuccess: string;
    dailyCooldown: string;
    rankTitle: string;
    rankEmpty: string;
    userNotFound: string;
    adminAddSuccess: string;
    adminRemoveSuccess: string;
    adminSetSuccess: string;
    adminListTitle: string;
    adminListEmpty: string;
    adminListItem: string;
    adminSearchNotFound: string;
    adminOperationNoPermission: string;
}
export interface Config {
    defaultMoney: number;
    dailyAmount: number;
    dailyCooldown: number;
    rankListSize: number;
    commandPrefix: string;
    currencyName: string;
    adminUsers: string[];
    messages: MessageConfig;
}
export declare const Config: Schema<Config>;
export declare const name = "zhukong-currency-system";
export declare const inject: string[];
export declare function apply(ctx: Context, config: Config): void;
export {};
