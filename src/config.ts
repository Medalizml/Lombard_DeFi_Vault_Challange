import "dotenv/config";
import {Address} from "./types/Common";

export const RPC_URL = process.env.RPC_URL!;
export const PRIVATE_KEY = process.env.PRIVATE_KEY!;

export const DEFAULT_RPC_URL = "http://127.0.0.1:8545"
// ───── Lombard contracts (main‑net) ─────

export type Addresses = {
    VAULT: Address;
    TELLER: Address;
    ACCOUNTANT: Address;
    ERC20: Address;
    ATOMIC_QUEUE: Address;
    SOLVER: Address;
    CALLER: Address;
};
export const ADDR = {
    VAULT: "0x5401b8620E5FB570064CA9114fd1e135fd77D57c",
    TELLER: "0x4E8f5128F473C6948127f9Cbca474a6700F99bab",
    ACCOUNTANT: "0xcB762D7bedfA78c725f2F347220d41062b6B0A4A",
    ERC20: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // we simulate using wBTC
    ATOMIC_QUEUE: "0x3b4aCd8879fb60586cCd74bC2F831A4C5E7DbBf8",
    SOLVER: "0x370d253f2e3d1d23c6f900928920a470eed8f876",
    CALLER: "0xf8553c8552f906c19286f21711721e206ee4909e"
} as const satisfies Addresses;

// Metadata API endpoint
export const META_URL =
    `https://app.veda.tech/api/individual-vault-metadata` +
    `?chainId=1&vaultAddress=${ADDR.VAULT}`;