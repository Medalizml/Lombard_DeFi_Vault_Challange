import { Contract, NonceManager } from "ethers";
import { Address } from "../types/Common";
import { AtomicRequestRead, AtomicRequestWrite, encodeAtomicRequest } from "../types/AtomicQueue";
import { loadAbi } from "../helpers/Loaders";

export class QueueService {
    constructor(
        readonly signer: NonceManager,
        readonly queue: Address
    ) {
        this.atomicQueue = new Contract(queue, loadAbi("AtomicQueue"), signer);
    }

    private atomicQueue: Contract;

    async readRequest(user: Address, offer: Address, want: Address): Promise<AtomicRequestRead> {
        const r = await this.atomicQueue.userAtomicRequest(user, offer, want);
        return {
            deadline: BigInt(r.deadline ?? r[0]),
            atomicPrice: BigInt(r.atomicPrice ?? r[1]),
            offerAmount: BigInt(r.offerAmount ?? r[2]),
            inSolve: Boolean(r.inSolve ?? r[3]),
        };
    }

    async updateRequest(offer: Address, want: Address, req: AtomicRequestWrite) {
        const tuple = encodeAtomicRequest(req);
        // requiresAuth on mainnet; fork or router needed
        return this.atomicQueue.updateAtomicRequest(offer, want, tuple);
    }

    raw() {
        return this.atomicQueue;
    }
}
