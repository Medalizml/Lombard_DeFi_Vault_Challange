import {setTimeout as delay} from "node:timers/promises";
import {META_URL} from "../config";
import {VaultMetadata} from "../types/metadata";


const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

export class MetadataService {
    async fetch(): Promise<VaultMetadata> {
        let lastErr: unknown;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const res = await fetch(META_URL, {cache: "no-store"});

                // Retry on server errors (500‑599)
                if (res.status >= 500) {
                    const body = await res.text().catch(() => "<unreadable>");
                    console.warn(
                        `[fetchVaultMetadata] attempt ${attempt} – server error ${res.status}. Response body: ${body}`,
                    );
                    throw new Error(`server error ${res.status}`);
                }

                // 2xx / 3xx = success; 4xx = permanent client error – bail out immediately.
                if (!res.ok) {
                    throw new Error(`permanent HTTP error ${res.status}`);
                }

                return (await res.json()) as VaultMetadata;          // success
            } catch (err) {
                lastErr = err;

                // Network failure or server‑side error already handled above – decide to retry.
                if (attempt < MAX_RETRIES) {
                    const wait = BASE_DELAY_MS * 2 ** (attempt - 1);
                    console.info(
                        `[fetchVaultMetadata] attempt ${attempt} failed (${String(
                            err,
                        )}). Retrying in ${wait} ms…`,
                    );
                    await delay(wait);
                    continue;
                }

                // Exhausted retries – log and propagate.
                console.error(
                    `[fetchVaultMetadata] giving up after ${MAX_RETRIES} attempts:`,
                    err,
                );
                throw err;
            }
        }

        // This should be unreachable
        throw lastErr ?? new Error("unreachable");
    }

    static latestApy(meta: VaultMetadata): string {
        const entry = meta.dailyApys.find(d => d.apy > 0);
        return entry ? entry.apy.toFixed(2) : "0.00";
    }
}