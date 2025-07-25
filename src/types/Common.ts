import {getAddress} from "ethers";

export type Address = `0x${string}`;

export const asAddress = (a: string) => getAddress(a) as Address;
