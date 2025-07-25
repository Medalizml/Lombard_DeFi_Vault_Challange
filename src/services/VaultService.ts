import {Contract, JsonRpcProvider, NonceManager} from "ethers";
import {Address} from "../types/Common";
import {TokenMeta} from "../types/Metadata";
import {loadAbi} from "../helpers/Loaders";
import {ensureAllowance} from "../helpers/Allowance";
import {Addresses} from "../config";

export class VaultService {
    constructor(
        readonly provider: JsonRpcProvider,
        readonly signer: NonceManager,
        readonly ADDR: Addresses
    ) {
        this.erc20 = new Contract(ADDR.ERC20, loadAbi("ERC20"), signer);
        this.vault = new Contract(ADDR.VAULT, loadAbi("Vault"), signer);
        this.teller = new Contract(ADDR.TELLER, loadAbi("Teller"), signer);
    }

    private erc20: Contract;
    private vault: Contract;
    private teller: Contract;

    async tokenMeta(): Promise<TokenMeta> {
        const [symbol, decimals, name] = await Promise.all([
            this.vault.symbol(),
            this.vault.decimals(),
            this.vault.name(),
        ]);
        return {symbol, decimals, name};
    }

    async sharesOf(user?: Address): Promise<bigint> {
        const u = user ?? (await this.signer.getAddress());
        return this.vault.balanceOf(u);
    }

    async shareUnlockRemaining(user?: Address): Promise<bigint> {
        const u = user ?? (await this.signer.getAddress());
        const now = BigInt((await this.provider.getBlock("latest"))!.timestamp);
        const unlock = BigInt(await this.teller.shareUnlockTime(u));
        return unlock > now ? unlock - now : 0n;
    }

    async depositWBTC(rawAmount: bigint) {
        const user = (await this.signer.getAddress()) as Address;

        if (await this.teller.isPaused()) throw new Error("Teller paused");
        const {allowDeposits} = await this.teller.assetData(this.ADDR.ERC20);
        if (!allowDeposits) throw new Error("wBTC deposits disabled");

        const bal = await this.erc20.balanceOf(user);
        if (bal < rawAmount) throw new Error("insufficient wBTC");

        await ensureAllowance(this.erc20, user, this.ADDR.VAULT, rawAmount);
        await (await this.teller.deposit(this.ADDR.ERC20, rawAmount, 0n)).wait();
    }

    async approveSharesToQueue(amount: bigint, user?: Address) {
        const u = user ?? (await this.signer.getAddress());
        const allowance = await this.vault.allowance(u, this.ADDR.ATOMIC_QUEUE);
        if (allowance < amount) {
            await (await this.vault.approve(this.ADDR.ATOMIC_QUEUE, amount)).wait();
        }
    }

    contracts() {
        return {wbtc: this.erc20, vault: this.vault, teller: this.teller};
    }
}
