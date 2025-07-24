#!/usr/bin/env bash
set -euo pipefail

RPC_URL="http://127.0.0.1:8545"
WBTC=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
WHALE=0xf335788b2251dEc93332310d96d15500cdC4C34b   # holds wBTC
AMOUNT=20000000                                   # 0.2 wBTC (8‑dec)

ACCOUNTS=(
  0xf39fd6e51aad88F6F4ce6aB8827279cffFb92266
  0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
)

cast rpc anvil_setBalance  $WHALE 0xDE0B6B3A7640000 --rpc-url $RPC_URL

echo "💰  Impersonating whale and transferring wBTC on fork…"
cast rpc anvil_impersonateAccount "$WHALE" --rpc-url "$RPC_URL"

for ACC in "${ACCOUNTS[@]}"; do
  cast send --rpc-url "$RPC_URL" --from "$WHALE" --unlocked \
       "$WBTC" "transfer(address,uint256)" "$ACC" "$AMOUNT"
  echo "   → 0.2 wBTC → $ACC"
done

cast rpc anvil_stopImpersonatingAccount "$WHALE" --rpc-url "$RPC_URL"
echo "✅  Funding complete."