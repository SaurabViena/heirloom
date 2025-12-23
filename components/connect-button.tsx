"use client";

import { useSyncExternalStore } from "react";
import { ConnectKitButton } from "connectkit";
import { useAccount, useBalance } from "wagmi";
import { useFhe } from "@/components/providers/fhe-provider";

const emptySubscribe = () => () => {};

export function ConnectButton() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const { loading: fheLoading, instance: fheInstance, error: fheError } = useFhe();

  if (!mounted) {
    return <div className="h-10 w-32 bg-zinc-800 rounded-lg animate-pulse" />;
  }

  const getFheStatus = () => {
    if (fheError) return { text: "SDK ×", color: "text-red-400" };
    if (fheLoading) return { text: "SDK ○", color: "text-yellow-400" };
    if (fheInstance) return { text: "SDK ✓", color: "text-green-400" };
    return { text: "SDK -", color: "text-zinc-500" };
  };

  const fheStatus = getFheStatus();

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, truncatedAddress }) => (
        <button
          onClick={show}
          className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors"
        >
          {/* FHE Status */}
          <div className={`px-3 py-2 text-xs font-mono border-r border-zinc-700 ${fheStatus.color}`}>
            {fheStatus.text}
          </div>

          {/* Balance */}
          {isConnected && balance && (
            <div className="px-3 py-2 text-sm text-zinc-300 font-mono border-r border-zinc-700">
              {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </div>
          )}

          {/* Address */}
          <div className="px-3 py-2 text-sm text-white">
            {isConnecting ? (
              "Connecting..."
            ) : isConnected ? (
              truncatedAddress
            ) : (
              "Connect Wallet"
            )}
          </div>
        </button>
      )}
    </ConnectKitButton.Custom>
  );
}
