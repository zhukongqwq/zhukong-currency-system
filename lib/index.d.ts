import { Context, Schema } from 'koishi';
declare module 'koishi' {
    interface Tables {
        currency: CurrencyData;
        daily: DailyRecord;
    }
    interface Events {
        'currency/get'(userId: string): Promise<number> | number;
        'currency/set'(userId: string, amount: number): Promise<void> | void;
        'currency/add'(userId: string, amount: number): Promise<void> | void;
    }
}
interface CurrencyData {
    id: number;
    userId: string;
    platform: string;
    money: number;
}
interface DailyRecord {
    id: number;
    userId: string;
    platform: string;
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
    adminAddSuccess: string;
    adminRemoveSuccess: string;
    adminSetSuccess: string;
    rankTitle: string;
    rankEmpty: string;
    userNotFound: string;
}
export interface Config {
    defaultMoney: number;
    dailyAmount: number;
    dailyCooldown: number;
    rankListSize: number;
    commandPrefix: string;
    currencyName: string;
    messages: MessageConfig;
}
export declare const Config: Schema<Config>;
export declare const name = "zhukong-currency-system";
export declare const inject: string[];
export declare function apply(ctx: Context, config: Config): void;
export {};
