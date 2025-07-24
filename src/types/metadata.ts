export interface DailyApy {
    apy: number;
    unix_second_timestamp: number;
    timestamp: string;
}

export interface VaultMetadata {
    dailyApys: DailyApy[];
    tvl: string;
    sharePrice: number;
    timestamp: string;
}

export interface TokenMeta {
    symbol: string;
    decimals: number;
    name: string;
}


