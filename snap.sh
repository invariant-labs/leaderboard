export NODE_OPTIONS="--max-old-space-size=8192"

npx tsx ./src/snap-points.ts
npx tsx ./src/prepare-data.ts
npx tsx ./src/get-top-100-domains.ts