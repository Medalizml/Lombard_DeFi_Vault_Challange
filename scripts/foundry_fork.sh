#!/usr/bin/env bash
set -euo pipefail

RPC_URL=https://eth-mainnet.g.alchemy.com/v2/jcLLUyVkMldmG-nWkSjvlT5PqKxSN53D
export RPC_URL

LATEST=$(cast block-number --rpc-url $RPC_URL)

anvil --fork-url $RPC_URL --fork-block-number "$LATEST" --chain-id 1 \
      --balance 1000 --mnemonic "test test test test test test test test test test test junk"
