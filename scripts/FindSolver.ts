import {ethers} from "ethers";
import {ADDR, DEFAULT_RPC_URL} from "../src/config";

const RPC_URL = process.env.RPC_URL ?? DEFAULT_RPC_URL;
const provider = new ethers.JsonRpcProvider(RPC_URL);

const QUEUE = ADDR.ATOMIC_QUEUE;
const ATOMIC_REQUEST_FULFILLED_TOPIC  = ethers.id("AtomicRequestFulfilled(address,address,address,uint256,uint256,uint256)");

const MAX_WINDOW = 500;

export async function getLogsChunked(
    provider: ethers.Provider,
    params: {
        address?: string | string[];
        topics?: (string | string[] | null)[];
        fromBlock: number;
        toBlock: number;
    },
    maxWindow: number = MAX_WINDOW
): Promise<ethers.Log[]> {
    const {fromBlock, toBlock, ...rest} = params;
    const logs: ethers.Log[] = [];

    for (let start = fromBlock; start <= toBlock; start += maxWindow) {
        const end = Math.min(start + maxWindow - 1, toBlock); // <-- inclusive, so -1

        try {
            const chunk = await provider.getLogs({
                ...rest,
                fromBlock: start,
                toBlock: end,
            });
            logs.push(...chunk);
        } catch (e: any) {
            // Provider still complains? Shrink the window and retry recursively.
            const msg = (e?.message ?? "").toLowerCase();
            if (msg.includes("500 block range") || msg.includes("block range")) {
                // halve and retry this slice
                if (maxWindow === 1) throw e; // cannot shrink anymore
                const half = Math.floor(maxWindow / 2);
                const retry = await getLogsChunked(
                    provider,
                    {...params, fromBlock: start, toBlock: end},
                    half
                );
                logs.push(...retry);
            } else {
                throw e;
            }
        }
    }

    return logs;
}
async function findSolvers(depth = 10_000) {
    const latest = await provider.getBlockNumber();
    const from = Math.max(0, latest - depth);

    const logs = await getLogsChunked(provider, {
        address: QUEUE,
        topics: [ATOMIC_REQUEST_FULFILLED_TOPIC],
        fromBlock: from,
        toBlock: latest,
    });

    const receipts = await Promise.all(
        logs.map(l => provider.getTransactionReceipt(l.transactionHash))
    );

    const solvers = new Set<string>();
    for (const r of receipts) {
        if (!r) continue;
        solvers.add(r.from.toLowerCase());
    }
    return [...solvers];
}

findSolvers().then(console.log).catch(console.error);