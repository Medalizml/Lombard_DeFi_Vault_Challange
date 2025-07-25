import { Address } from "./Common";

export type AtomicRequestRead = {
    deadline: bigint;
    atomicPrice: bigint;
    offerAmount: bigint;
    inSolve: boolean;
};

export type AtomicRequestWrite = {
    deadline: bigint;     // uint64
    atomicPrice: bigint;  // uint88
    offerAmount: bigint;  // uint96
};

export const toUint64 = (v: bigint) => {
    if (v < 0n || v > (1n << 64n) - 1n) throw new Error("uint64 overflow");
    return v;
};
export const toUint88 = (v: bigint) => {
    if (v < 0n || v > (1n << 88n) - 1n) throw new Error("uint88 overflow");
    return v;
};
export const toUint96 = (v: bigint) => {
    if (v < 0n || v > (1n << 96n) - 1n) throw new Error("uint96 overflow");
    return v;
};

export const encodeAtomicRequest = (r: AtomicRequestWrite) => [
    r.deadline,
    r.atomicPrice,
    r.offerAmount,
    false, // inSolve always false
] as const;

export type RedeemSolveOpts = {
    callerEOA: Address;
    solverContract: Address;
    want: Address;
    teller: Address;
    minimumAssetsOut?: bigint;
    maxAssets?: bigint;
    topUpEthWeiHex?: string;
    checkPending?: boolean;
};

