import HeirloomJson from "./Heirloom.json";
import type { Abi } from "viem";

export const HeirloomABI = HeirloomJson.abi as Abi;
export const HeirloomContractName = HeirloomJson.contractName;
