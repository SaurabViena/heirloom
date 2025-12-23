"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Users, Loader2, Check } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress } from "viem";
import { heirloomContract } from "@/config/contract";

interface AuthorizeAllModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthorizeAllModal({ isOpen, onClose }: AuthorizeAllModalProps) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isLoading = isPending || isConfirming;

  const handleClose = useCallback(() => {
    setAddress("");
    setError(null);
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(handleClose, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address.trim()) {
      setError("Please enter an address");
      return;
    }

    if (!isAddress(address)) {
      setError("Invalid Ethereum address");
      return;
    }

    try {
      writeContract({
        ...heirloomContract,
        functionName: "grantAllAuth",
        args: [address as `0x${string}`],
      });
    } catch (err) {
      console.error("[AuthorizeAll] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to authorize");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative w-full max-w-md mx-4 bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Authorize All Credentials</h2>
              <p className="text-xs text-zinc-500">Grant access to all your credentials</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            This will authorize access to ALL your current and future credentials.
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Heir Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              disabled={isLoading || isSuccess}
            />
            <p className="text-xs text-zinc-500">
              This address will inherit access to decrypt all your credentials.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {isSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              All credentials authorized successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className="w-full py-3 bg-amber-500 text-black font-bold uppercase tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isPending ? "Confirming..." : "Processing..."}
              </>
            ) : isSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Authorized
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Authorize All
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
