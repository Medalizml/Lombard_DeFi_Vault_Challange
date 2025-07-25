import {DEFAULT_RPC_URL, RPC_URL} from "../config";

export async function assertFork() {
    if (RPC_URL != DEFAULT_RPC_URL) throw new Error("This function must not be called on mainnet");
}