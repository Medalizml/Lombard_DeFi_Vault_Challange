import {Contract, ethers, JsonRpcProvider, NonceManager} from "ethers";
import {Address} from "../types/Common";
import {RedeemSolveOpts} from "../types/AtomicQueue";
import {withImpersonatedSigner} from "../helpers/Impersonate";
import {assertFork} from "../helpers/Fork";
import {loadAbi} from "../helpers/Loaders";

export class SolverService {
    constructor(
        readonly provider: JsonRpcProvider,
        readonly signer: NonceManager,
        readonly ADDR: {
            VAULT: Address;
            ATOMIC_QUEUE: Address;
        }
    ) {
    }

    async redeemSolveOnFork(opts: RedeemSolveOpts) {
        await assertFork();

        const {
            callerEOA,
            solverContract,
            want,
            teller,
            minimumAssetsOut = 0n,
            maxAssets = ethers.MaxUint256,
            topUpEthWeiHex = "0xDE0B6B3A7640000",
            checkPending = true,
        } = opts;

        const offer = this.ADDR.VAULT;
        const user = (await this.signer.getAddress()) as Address;

        const queueAbi = loadAbi("AtomicQueue");
        const atomicQueue = new Contract(this.ADDR.ATOMIC_QUEUE, queueAbi, this.provider);
        const req = await atomicQueue.userAtomicRequest(user, offer, want);
        const offerAmount = BigInt(req.offerAmount ?? req[2] ?? 0n);
        const deadline = BigInt(req.deadline ?? req[0] ?? 0n);

        if (checkPending && offerAmount === 0n) throw new Error("No pending request");
        const now = BigInt((await this.provider.getBlock("latest"))!.timestamp);
        if (checkPending && deadline !== 0n && now > deadline) throw new Error("Request expired");

        const vaultAbi = loadAbi("Vault");
        const vault = new Contract(this.ADDR.VAULT, vaultAbi, this.signer);
        const allowance = await vault.allowance(user, this.ADDR.ATOMIC_QUEUE);
        if (allowance < offerAmount) {
            await (await vault.approve(this.ADDR.ATOMIC_QUEUE, offerAmount)).wait();
        }

        await withImpersonatedSigner(this.provider, callerEOA, async (authSigner) => {
            const erc20 = new Contract(want, loadAbi("ERC20"), authSigner);
            const a = await erc20.allowance(callerEOA, solverContract);
            if (a < maxAssets) await (await erc20.approve(solverContract, ethers.MaxUint256)).wait();
        }, topUpEthWeiHex);

        await withImpersonatedSigner(this.provider, callerEOA, async (authSigner) => {
            const solver = new Contract(
                solverContract,
                loadAbi("Solver"),
                authSigner
            );
            const tellerC = new Contract(teller, loadAbi("Teller"), this.provider);
            const tellerVault = (await tellerC.vault()).toLowerCase();
            if (tellerVault !== offer.toLowerCase()) {
                throw new Error(`offer (${offer}) != teller.vault() (${tellerVault})`);
            }

            await (await solver.redeemSolve(
                this.ADDR.ATOMIC_QUEUE,
                offer,
                want,
                [user],
                minimumAssetsOut,
                maxAssets,
                teller
            )).wait();
        }, topUpEthWeiHex);
    }
}
