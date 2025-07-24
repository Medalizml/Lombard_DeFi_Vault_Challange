import {getAddress} from "ethers";

export type Hex = `0x${string}`;
export type Address = `0x${string}`;

export const addr = <const T extends Address>(a: T) => a;
export function asAddress(a: string): Address {
    // getAddress also checksum-normalizes it
    return getAddress(a) as Address;
}
