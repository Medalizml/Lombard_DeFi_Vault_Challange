import {readFileSync} from "fs";
import {resolve} from "path";
import {Interface, type InterfaceAbi} from "ethers/lib.commonjs/abi";

export function loadAbi(name: string): Interface | InterfaceAbi {
    return JSON.parse(readFileSync(resolve("src/abi", `${name}.json`), "utf8"));
}