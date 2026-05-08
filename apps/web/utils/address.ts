export function isAddress(value: string): value is `0x${string}` {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function shortAddress(address: `0x${string}`): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
