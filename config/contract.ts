import { HeirloomABI } from "@/lib/abi";

export const HEIRLOOM_ADDRESS = process.env.NEXT_PUBLIC_HEIRLOOM_ADDRESS as `0x${string}`;

export const heirloomContract = {
  address: HEIRLOOM_ADDRESS,
  abi: HeirloomABI,
} as const;
