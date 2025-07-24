import "dotenv/config";
import {Address} from "./types/common";

export const RPC_URL = process.env.RPC_URL!;
export const PRIVATE_KEY = process.env.PRIVATE_KEY!;

// ───── Lombard contracts (main‑net) ─────

type Addresses = {
    VAULT: Address;
    TELLER: Address;
    ACCOUNTANT: Address;
    WBTC: Address;
    LBTC: Address;
    ATOMIC_QUEUE: Address;
    SOLVER: Address;
};
export const ADDR = {
    VAULT: "0x5401b8620E5FB570064CA9114fd1e135fd77D57c",
    TELLER: "0x4E8f5128F473C6948127f9Cbca474a6700F99bab",
    ACCOUNTANT: "0xcB762D7bedfA78c725f2F347220d41062b6B0A4A",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    LBTC: "0x8236a87084f8b84306f72007f36f2618a5634494",
    ATOMIC_QUEUE: "0x3b4aCd8879fb60586cCd74bC2F831A4C5E7DbBf8",
    SOLVER: "0xf8553c8552f906c19286f21711721e206ee4909e"
} as const satisfies Addresses;

// Metadata API endpoint
export const META_URL =
    `https://app.veda.tech/api/individual-vault-metadata` +
    `?chainId=1&vaultAddress=${ADDR.VAULT}`;