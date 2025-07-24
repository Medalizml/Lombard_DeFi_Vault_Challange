import { ethers} from "ethers";
import {MetadataService} from "./services/MetadataService";
import {VaultService} from "./services/VaultService";
import {ADDR, RPC_URL} from "./config";
import {asAddress} from "./types/common";

async function run() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const metaSvc = new MetadataService();
    const vaultSvc = new VaultService(provider);

    const [meta, tokenInfo] = await Promise.all([
        metaSvc.fetch(),
        vaultSvc.tokenMeta()
    ]);

    const {symbol, decimals, name} = tokenInfo;
    console.log(`Vault: ${name}`);
    console.log(`APY:  ${MetadataService.latestApy(meta)}%`);
    console.log(`TVL:  $${Number(meta.tvl).toLocaleString(undefined, {maximumFractionDigits: 2})}`);
    console.log(`Token: ${symbol} (${decimals} decimals)\n`);


    const human = (n: bigint) => ethers.formatUnits(n, decimals);
    const wallet = (await vaultSvc["signer"].getAddress());
    const before = await vaultSvc.vaultBalance();
    console.log(`Wallet: ${wallet}`);
    console.log(`Balance before: ${human(before)}`);

    const raw = ethers.parseUnits("0.0001", decimals);
    console.log("Depositing...");
    await vaultSvc.deposit(raw);

    const after = await vaultSvc.vaultBalance();
    console.log(`Balance after:  ${human(after)}`);

    console.log("Withdrawing...");
    await vaultSvc.withdrawAll();
    const signer = await vaultSvc.signer.getAddress()
    console.log(`Signer: ${signer}`);
    await vaultSvc.solveOnForkViaQueue(
        {
            offer: ADDR.VAULT,          // shares token
            want:  ADDR.WBTC,           // asset you want back
            users: [asAddress(signer)],
            runData: "0x",              // nothing special for fork tests
            solver: ADDR.SOLVER,
        },
        { autoApproveWant: true }
    );

    const final = await vaultSvc.vaultBalance();
    console.log(`Balance final: ${human(final)}`);
    console.log("✅ Complete!");

}

run().catch(console.error);