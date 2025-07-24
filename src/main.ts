import { ethers} from "ethers";
import {MetadataService} from "./services/MetadataService";
import {VaultService} from "./services/VaultService";
import {ADDR, RPC_URL} from "./config";
import {asAddress} from "./types/Common";

async function run() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const metadataService = new MetadataService();
    const vaultService = new VaultService(provider);

    const [meta, tokenInfo] = await Promise.all([
        metadataService.fetch(),
        vaultService.tokenMeta()
    ]);

    const {symbol, decimals, name} = tokenInfo;
    console.log(`Vault: ${name}`);
    console.log(`APY:  ${MetadataService.latestApy(meta)}%`);
    console.log(`TVL:  $${Number(meta.tvl).toLocaleString(undefined, {maximumFractionDigits: 2})}`);
    console.log(`Token: ${symbol} (${decimals} decimals)\n`);


    const human = (n: bigint) => ethers.formatUnits(n, decimals);
    const wallet = (await vaultService["signer"].getAddress());
    const before = await vaultService.vaultBalance();
    console.log(`Wallet: ${wallet}`);
    console.log(`Balance before: ${human(before)}`);

    const raw = ethers.parseUnits("0.0001", decimals);
    console.log("Depositing...");
    await vaultService.deposit(raw);

    const after = await vaultService.vaultBalance();
    console.log(`Balance after:  ${human(after)}`);

    console.log("Withdrawing...");
    await vaultService.withdrawAll();
    const signer = await vaultService.signer.getAddress()
    console.log(`Signer: ${signer}`);
    await vaultService.solveOnForkViaQueue(
        {
            offer: ADDR.VAULT,          // shares token
            want:  ADDR.WBTC,           // asset you want back
            users: [asAddress(signer)],
            runData: "0x",              // nothing special for fork tests
            solver: ADDR.SOLVER,
        },
        { autoApproveWant: true }
    );

    const final = await vaultService.vaultBalance();
    console.log(`Balance final: ${human(final)}`);
    console.log("✅ Complete!");

}

run().catch(console.error);