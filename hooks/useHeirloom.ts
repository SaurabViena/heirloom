"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { heirloomContract } from "@/config/contract";

// Get user credential count
export function useCredentialCount(address?: `0x${string}`) {
  return useReadContract({
    ...heirloomContract,
    functionName: "getCredentialCount",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// Get all credential names
export function useAllCredentialNames(address?: `0x${string}`) {
  return useReadContract({
    ...heirloomContract,
    functionName: "getAllCredentialNames",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// Get credential metadata
export function useCredentialMeta(address?: `0x${string}`, index?: number) {
  return useReadContract({
    ...heirloomContract,
    functionName: "getCredentialMeta",
    args: address && index !== undefined ? [address, BigInt(index)] : undefined,
    query: { enabled: !!address && index !== undefined },
  });
}

// Get authorizations I gave to others
export function useGivenAuthorizations(address?: `0x${string}`) {
  return useReadContract({
    ...heirloomContract,
    functionName: "getGivenAuthorizations",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// Get authorizations others gave to me
export function useReceivedAuthorizations(address?: `0x${string}`) {
  return useReadContract({
    ...heirloomContract,
    functionName: "getReceivedAuthorizations",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// Get my credential handles (for decryption)
export function useMyCredentialHandles(index?: number) {
  const { address } = useAccount();
  return useReadContract({
    ...heirloomContract,
    functionName: "getMyCredentialHandles",
    args: index !== undefined ? [BigInt(index)] : undefined,
    account: address,
    query: { enabled: index !== undefined },
  });
}

// Write operation hook
export function useHeirloomWrite() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    writeContract,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
