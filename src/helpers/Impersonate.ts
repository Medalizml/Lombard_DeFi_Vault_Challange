import {ethers} from "ethers";
import {assertFork} from "./Fork";

const ONE_ETH_HEX = "0xDE0B6B3A7640000"; // 1 ETH in wei

/**
 * Start impersonating `addr` on an Anvil fork and (optionally) top it up with ETH.
 * Returns the signer you can use to send transactions as that address.
 *
 * NEVER call this on mainnet – anvil_* methods only exist on a local fork.
 */
export async function impersonate(
    provider: ethers.JsonRpcProvider,
    addr: string,
    topUpWeiHex: string = ONE_ETH_HEX
): Promise<ethers.Signer> {
    await assertFork();

    await provider.send("anvil_impersonateAccount", [addr]);
    if (topUpWeiHex !== "0x0") {
        await provider.send("anvil_setBalance", [addr, topUpWeiHex]);
    }
    return provider.getSigner(addr);
}

export async function stopImpersonate(
    provider: ethers.JsonRpcProvider,
    addr: string
): Promise<void> {
    await provider.send("anvil_stopImpersonatingAccount", [addr]);
}

export async function withImpersonatedSigner<T>(
    provider: ethers.JsonRpcProvider,
    addr: string,
    fn: (signer: ethers.Signer) => Promise<T>,
    topUpWeiHex: string = ONE_ETH_HEX
): Promise<T> {
    const signer = await impersonate(provider, addr, topUpWeiHex);
    try {
        return await fn(signer);
    } finally {
        await stopImpersonate(provider, addr);
    }
}
