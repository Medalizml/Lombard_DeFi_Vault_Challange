import {ethers, JsonRpcProvider, NonceManager, Wallet} from "ethers";
import {ADDR, PRIVATE_KEY, RPC_URL} from "./config";
import {VaultService} from "./services/VaultService";
import {QueueService} from "./services/QueueService";
import {SolverService} from "./services/SolverService";
import {AtomicRequestWrite, toUint64, toUint88, toUint96} from "./types/AtomicQueue";
import {Address} from "./types/Common";
import {MetadataService} from "./services/MetadataService";

(async () => {
    const provider = new JsonRpcProvider(RPC_URL);
    const signer = new NonceManager(new Wallet(PRIVATE_KEY, provider));

    const vault = new VaultService(provider, signer, ADDR);
    const queue = new QueueService(signer, ADDR.ATOMIC_QUEUE);
    const solver = new SolverService(provider, signer, {VAULT: ADDR.VAULT, ATOMIC_QUEUE: ADDR.ATOMIC_QUEUE});
    const metadataService = new MetadataService();

    const want: Address = ADDR.ERC20;

    const metadata = await metadataService.fetch();

    const tokenInfo = await vault.tokenMeta();
    const user = (await signer.getAddress()) as Address;


    const {symbol, decimals, name} = tokenInfo;
    console.log(`Vault: ${name}`);
    console.log(`APY:  ${MetadataService.latestApy(metadata)}%`);
    console.log(`TVL:  $${Number(metadata.tvl).toLocaleString(undefined, {maximumFractionDigits: 2})}`);
    console.log(`Token: ${symbol} (${decimals} decimals)\n`);

    const human = (n: bigint) => ethers.formatUnits(n, decimals);
    const wallet = (await vault["signer"].getAddress());
    const before = await vault.sharesOf(user);
    console.log(`Wallet: ${wallet}`);
    console.log(`Balance before: ${human(before)}`);

    // deposit demo
    console.log("Depositing...");
    await vault.depositWBTC(10_000n); // e.g. 0.0001 wBTC
    const after = await vault.sharesOf();
    console.log(`Balance after:  ${human(after)}`);

    // enqueue withdraw
    console.log("Withdrawing...");
    const now = BigInt((await provider.getBlock("latest"))!.timestamp);
    const left = await vault.shareUnlockRemaining(user);

    const accountant = new ethers.Contract(
        ADDR.ACCOUNTANT,
        ["function getRateInQuoteSafe(address) view returns (uint256)"],
        signer
    );
    const rate = BigInt(await accountant.getRateInQuoteSafe(want));

    const shares = await vault.sharesOf(user);
    await vault.approveSharesToQueue(shares);

    const req: AtomicRequestWrite = {
        deadline: toUint64(now + left + 86_400n),
        atomicPrice: toUint88(rate),
        offerAmount: toUint96(shares),
    };
    await (await queue.updateRequest(ADDR.VAULT, want, req)).wait();


    await solver.redeemSolveOnFork({
        callerEOA: ADDR.CALLER,
        solverContract: ADDR.SOLVER,
        want,
        teller: ADDR.TELLER,
    });
    const final = await vault.sharesOf();
    console.log(`Balance final: ${human(final)}`);
    console.log("✅ Complete!");
})();
