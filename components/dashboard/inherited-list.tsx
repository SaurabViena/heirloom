"use client";

import { useAccount, useReadContract } from "wagmi";
import { Key, User, Shield } from "lucide-react";
import { heirloomContract } from "@/config/contract";

interface Authorization {
  owner: string;
  authorized: string;
  authType: number; // 0=None, 1=Single, 2=All
  credentialIndex: bigint;
  createdAt: bigint;
}

interface InheritedListProps {
  onViewCredential: (owner: string, index: number, authType: "single" | "all") => void;
}

export function InheritedList({ onViewCredential }: InheritedListProps) {
  const { address, isConnected } = useAccount();

  // Get received authorizations
  const { data: authorizations, isLoading } = useReadContract({
    ...heirloomContract,
    functionName: "getReceivedAuthorizations",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  if (!isConnected) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
        <p className="text-zinc-500">Please connect your wallet to view inherited credentials.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <InheritedCardSkeleton key={i} />
        ))}
      </>
    );
  }

  const authList = authorizations as Authorization[] | undefined;

  if (!authList || authList.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center mb-4">
          <Key className="w-8 h-8 text-zinc-600" />
        </div>
        <h3 className="text-lg font-medium text-zinc-300 mb-2">No inherited credentials</h3>
        <p className="text-sm text-zinc-500 max-w-sm">
          When someone authorizes you to access their credentials, they will appear here.
        </p>
      </div>
    );
  }

  // Group by owner
  const groupedByOwner = authList.reduce((acc, auth) => {
    const key = auth.owner;
    if (!acc[key]) acc[key] = [];
    acc[key].push(auth);
    return acc;
  }, {} as Record<string, Authorization[]>);

  return (
    <>
      {Object.entries(groupedByOwner).map(([owner, auths]) => (
        <InheritedOwnerCard
          key={owner}
          owner={owner}
          authorizations={auths}
          onViewCredential={onViewCredential}
        />
      ))}
    </>
  );
}

interface InheritedOwnerCardProps {
  owner: string;
  authorizations: Authorization[];
  onViewCredential: (owner: string, index: number, authType: "single" | "all") => void;
}

function InheritedOwnerCard({ owner, authorizations, onViewCredential }: InheritedOwnerCardProps) {
  const { data: credentialCount } = useReadContract({
    ...heirloomContract,
    functionName: "getCredentialCount",
    args: [owner as `0x${string}`],
  });

  const { data: credentialNames } = useReadContract({
    ...heirloomContract,
    functionName: "getAllCredentialNames",
    args: [owner as `0x${string}`],
  });

  const hasAllAccess = authorizations.some((a) => a.authType === 2);
  const singleAuths = authorizations.filter((a) => a.authType === 1);
  const count = credentialCount ? Number(credentialCount) : 0;
  const names = (credentialNames as string[]) || [];

  const shortAddress = `${owner.slice(0, 6)}...${owner.slice(-4)}`;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-5 hover:border-zinc-700 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{shortAddress}</p>
            <p className="text-xs text-zinc-500">
              {hasAllAccess ? "Full Access" : `${singleAuths.length} credential(s)`}
            </p>
          </div>
        </div>
        {hasAllAccess && (
          <span className="px-2 py-1 text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20">
            ALL
          </span>
        )}
      </div>

      <div className="space-y-2">
        {hasAllAccess ? (
          // Show all credentials
          names.length > 0 ? (
            names.map((name, index) => (
              <button
                key={index}
                onClick={() => onViewCredential(owner, index, "all")}
                className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
              >
                <Shield className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">{name}</span>
                <span className="text-xs text-zinc-600 ml-auto">#{index}</span>
              </button>
            ))
          ) : (
            <p className="text-xs text-zinc-500 py-2">No credentials yet</p>
          )
        ) : (
          // Show only authorized credentials
          singleAuths.map((auth, i) => {
            const index = Number(auth.credentialIndex);
            const name = names[index] || `Credential #${index}`;
            return (
              <button
                key={i}
                onClick={() => onViewCredential(owner, index, "single")}
                className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
              >
                <Shield className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">{name}</span>
                <span className="text-xs text-zinc-600 ml-auto">#{index}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function InheritedCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-10 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-10 bg-zinc-800/50 rounded animate-pulse" />
      </div>
    </div>
  );
}
