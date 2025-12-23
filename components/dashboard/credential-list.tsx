"use client";

import { useAccount, useReadContract } from "wagmi";
import { CredentialCard, CredentialCardSkeleton, EmptyState } from "./credential-card";
import { heirloomContract } from "@/config/contract";

interface CredentialListProps {
  onCreateClick: () => void;
  onViewCredential: (index: number, name: string) => void;
  onAuthorizeHeir: (index: number, name: string) => void;
}

export function CredentialList({ onCreateClick, onViewCredential, onAuthorizeHeir }: CredentialListProps) {
  const { address, isConnected } = useAccount();
  
  const { data: names, isLoading } = useReadContract({
    ...heirloomContract,
    functionName: "getAllCredentialNames",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  if (!isConnected) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
        <p className="text-zinc-500">Please connect your wallet to view credentials.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <CredentialCardSkeleton key={i} />
        ))}
      </>
    );
  }

  const nameList = names as string[] | undefined;

  if (!nameList || nameList.length === 0) {
    return <EmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <>
      {nameList.map((name: string, index: number) => (
        <CredentialCard
          key={index}
          name={name}
          index={index}
          onView={onViewCredential}
          onAuthorize={onAuthorizeHeir}
        />
      ))}
    </>
  );
}
