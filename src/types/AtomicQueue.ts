import {Address, Hex} from "./Common";

export interface AtomicRequestWrite {
    deadline: bigint;     // uint64
    atomicPrice: bigint;  // uint88
    offerAmount: bigint;  // uint96
}

export type AtomicRequestTuple = readonly [bigint, bigint, bigint, boolean];

const UINT64_MAX = (1n << 64n) - 1n;
const UINT88_MAX = (1n << 88n) - 1n;
const UINT96_MAX = (1n << 96n) - 1n;

export const toUint64 = (x: bigint) => {
    if (x < 0n || x > UINT64_MAX) throw new Error("uint64 overflow");
    return x;
};
export const toUint88 = (x: bigint) => {
    if (x < 0n || x > UINT88_MAX) throw new Error("uint88 overflow");
    return x;
};
export const toUint96 = (x: bigint) => {
    if (x < 0n || x > UINT96_MAX) throw new Error("uint96 overflow");
    return x;
};

export function encodeAtomicRequest(req: AtomicRequestWrite): AtomicRequestTuple {
    return [
        toUint64(req.deadline),
        toUint88(req.atomicPrice),
        toUint96(req.offerAmount),
        false // inSolve
    ] as const;
}

export type ForkBulkWithdrawParams = {
    solver: string;
    withdrawAsset: string;
    minAssets?: bigint;
    topUpWeiHex?: string;
};

export interface SolveArgs {
    offer: Address;
    want: Address;
    users: readonly Address[];
    runData: Hex;
    solver: Address;
}

export type SolveTuple = readonly [Address, Address, readonly Address[], Hex, Address];

export function toSolveTuple(a: SolveArgs): SolveTuple {
    return [a.offer, a.want, [...a.users], a.runData, a.solver] as const;
}

export function validateSolveArgs(a: SolveArgs) {
    if (!a.users.length) throw new Error("SolveArgs.users cannot be empty");
    if (!a.runData.startsWith("0x")) throw new Error("SolveArgs.runData must be hex-prefixed");
}

