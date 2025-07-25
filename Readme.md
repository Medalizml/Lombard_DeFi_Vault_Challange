## Quick run

### 1) Install

```bash
    npm install        # or: npm i
```

### 2) Configure .env

```dotenv
    RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<YOUR_KEY>
    PRIVATE_KEY=0x...                           # any key for fork, funded key for mainnet
```

### 3) Run on the fork node

In the first terminal we run the fork node

```bash 
  ./scripts/foundry_fork.sh
````

In a second Terminal we will add wBTC to the first three accounts in the anvil node.

```bash
  ./fund_wbtc
```

Remember to change the .env with anvil node and use one of the three accounts that were funded

```bash
  npm run dev
````

