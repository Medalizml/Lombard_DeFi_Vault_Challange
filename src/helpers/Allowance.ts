import { Contract, ethers } from "ethers";
import { Address } from "../types/Common";

export async function ensureAllowance(
    token: Contract,
    owner: Address,
    spender: Address,
    amount: bigint
) {
    const cur = await token.allowance(owner, spender);
    if (cur < amount) {
        await (await token.approve(spender, ethers.MaxUint256)).wait();
    }
}