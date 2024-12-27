## Add new pool

Add a pool configuration to the `PROMOTED_POOLS_MAINNET` variable in `consts.ts`. Additionally, configure the transaction hash in `./data/pools_last_tx_hashes_mainnet.json`. Points will be awarded for all opened and closed positions starting from the provided transaction hash.

## Add new pool with existing positions

1. Setup desired pool and provider in `snap-state.ts`
2. Run script `ts-node ./scripts/snap-state.ts`
3. Setup desired pool and network in `insert-create-position-events.ts`
4. Run script `ts-node ./scripts/insert-create-position-events.ts`
5. Add recent tx hash to file `pools_last_tx_hashes_mainnet.json` as `"pool" : "txHash"`
6. Add pool to promoted pools in `consts.ts`

## Cleanup previous points

### Files to clean:

- `events_full_snap_mainnet.json`
- `events_snap_mainnet.json`
- `final_data_mainnet.json`
- `points_mainnet.json`

Afterwards set transaction hash from which the counting will start in `previous_config_mainnet.json` and `consts.ts`, `FULL_SNAP_START_TX_HASH`

To ensure correctness of new snapshot data, first snap be taken by running `npm run snap` or by CI job `Create Snapshot of Points`
