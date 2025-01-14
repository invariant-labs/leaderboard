export NODE_OPTIONS="--max-old-space-size=8192"

# npx tsx ./src/snap-points.ts
ts-node ./src/snap-swaps.ts
npx tsx ./src/prepare-data.ts