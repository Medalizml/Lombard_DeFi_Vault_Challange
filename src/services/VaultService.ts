import {Contract, ethers, JsonRpcProvider, NonceManager} from "ethers";
import {ADDR, DEFAULT_RPC_URL, PRIVATE_KEY, RPC_URL} from "../config";
import {loadAbi} from "../helpers/Loaders";
import {TokenMeta} from "../types/Metadata";
import {
    AtomicRequestWrite,
    encodeAtomicRequest,
    SolveArgs,
    toSolveTuple,
    toUint64,
    toUint88,
    toUint96,
    validateSolveArgs
} from "../types/AtomicQueue";
import {withImpersonatedSigner} from "../helpers/Impersonate";

export class VaultService {
    private provider: JsonRpcProvider;
    signer: NonceManager;

    // contracts
    private wbtc: Contract;
    private vault: Contract;
    private teller: Contract;
    private atomicQueue: Contract;

    constructor(provider: JsonRpcProvider) {
        this.provider = provider;
        const baseSigner = new ethers.Wallet(PRIVATE_KEY, this.provider);
        this.signer = new NonceManager(baseSigner);

        this.wbtc = new Contract(ADDR.WBTC, loadAbi("ERC20"), this.signer);
        this.vault = new Contract(ADDR.VAULT, loadAbi("Vault"), this.signer);
        this.teller = new Contract(ADDR.TELLER, loadAbi("Teller"), this.signer);
        this.atomicQueue = new Contract(ADDR.ATOMIC_QUEUE, loadAbi("AtomicQueue"), this.signer);
    }

    async tokenMeta(): Promise<TokenMeta> {
        const [symbol, decimals, name] = await Promise.all([
            this.vault.symbol(),
            this.vault.decimals(),
            this.vault.name(),
        ]);
        return {symbol, decimals, name};
    }

    async vaultBalance(): Promise<bigint> {
        const addr = await this.signer.getAddress();
        return this.vault.balanceOf(addr);
    }

    async ensureToken(rawAmount: bigint) {
        const addr = await this.signer.getAddress();
        const bal = await this.wbtc.balanceOf(addr);
        if (bal < rawAmount)
            throw new Error(`Need ${ethers.formatUnits(rawAmount, 8)} wBTC, have ${ethers.formatUnits(bal, 8)}`);
        const allowance = await this.wbtc.allowance(addr, ADDR.VAULT);
        if (allowance < rawAmount)
            await (await this.wbtc.approve(ADDR.VAULT, rawAmount)).wait();
    }

    async deposit(rawAmount: bigint) {
        await this.ensureToken(rawAmount);

        if (await this.teller.isPaused()) throw new Error("Teller is currently paused");

        const {allowDeposits} = await this.teller.assetData(ADDR.WBTC);
        if (!allowDeposits) throw new Error("wBTC deposits not allowed");

        const addr = await this.signer.getAddress();
        const allowance = await this.wbtc.allowance(addr, ADDR.VAULT);
        if (allowance < rawAmount) {
            await (await this.wbtc.approve(ADDR.VAULT, rawAmount)).wait();
        }

        await (await this.teller.deposit(ADDR.WBTC, rawAmount, 0n)).wait();
    }

    /** Queue full withdrawal of the caller’s current share balance */
    async withdrawAll() {
        const shares = await this.vaultBalance();
        if (shares === 0n) throw new Error("nothing to withdraw");

        const offer = ADDR.VAULT;
        const user = await this.signer.getAddress();

        // approve queue
        const allowance = await this.vault.allowance(user, ADDR.ATOMIC_QUEUE);
        if (allowance < shares) {
            await (await this.vault.approve(ADDR.ATOMIC_QUEUE, shares)).wait();
        }

        const now = BigInt((await this.provider.getBlock("latest"))!.timestamp);
        const unlockEnds = BigInt(await this.teller.shareUnlockTime(user));
        const left = now < unlockEnds ? (unlockEnds - now) : 0n;

        const accountant = new Contract(
            ADDR.ACCOUNTANT,
            ["function getRateInQuoteSafe(address) view returns (uint256)"],
            this.signer
        );
        const rate = BigInt(await accountant.getRateInQuoteSafe(ADDR.WBTC));
        const price = toUint88(rate);

        const deadline = toUint64(now + left + 86_400n);
        const offerAmount = toUint96(shares);

        const req: AtomicRequestWrite = {deadline, atomicPrice: price, offerAmount};
        const tuple = encodeAtomicRequest(req);

        await this.atomicQueue.isAtomicRequestValid(offer, user, tuple);
        await (await this.atomicQueue.updateAtomicRequest(offer, ADDR.WBTC, tuple)).wait();
    }

    async solveOnForkViaQueue(
        args: SolveArgs,
        opts: {
            topUpEthWeiHex?: string;
            autoApproveWant?: boolean;
        } = {}
    ): Promise<void> {
        const {topUpEthWeiHex = "0x0", autoApproveWant = true,} = opts;

        validateSolveArgs(args);

        if (RPC_URL != DEFAULT_RPC_URL) {
            throw new Error("solveOnForkViaQueue must not be called on mainnet");
        }


        const [offer, want, users, runData, solver] = toSolveTuple(args);
        const user = users[0];

        // Ensure there is something to solve
        const req = await this.atomicQueue.userAtomicRequest(user, offer, want);
        const offerAmount: bigint = BigInt(req.offerAmount ?? req[2]);
        if (offerAmount === 0n) {
            throw new Error("No pending atomic request for this (user, offer, want)");
        }

        await withImpersonatedSigner(this.provider, solver, async (solverSigner) => {
           console.log("solverSigner.getAddress()")
            if (autoApproveWant) {
                const wantErc20 = new Contract(want, loadAbi("ERC20"), solverSigner);
                const allowance = await wantErc20.allowance(solver, ADDR.ATOMIC_QUEUE);
                if (allowance < offerAmount) {
                    await (await wantErc20.approve(ADDR.ATOMIC_QUEUE, ethers.MaxUint256)).wait();
                }
            }

            this.atomicQueue.connect(solverSigner);
            await (await this.atomicQueue.solve(offer, want, users, runData, solver)).wait();
        }, topUpEthWeiHex);
    }
}