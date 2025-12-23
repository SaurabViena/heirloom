"use client";

import { useState } from "react";
import { X, Key, User, Lock, FileText, Loader2, Eye, EyeOff } from "lucide-react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { bytesToHex } from "viem";
import { heirloomContract } from "@/config/contract";
import { useFhe } from "@/components/providers/fhe-provider";

interface CreateCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// String to BigInt (max 31 bytes)
const textToBigInt = (text: string): bigint => {
  const bytes = new TextEncoder().encode(text.slice(0, 31));
  let hex = "";
  bytes.forEach(b => { hex += b.toString(16).padStart(2, "0"); });
  return hex ? BigInt("0x" + hex) : BigInt(0);
};

// String to two BigInts (max 64 bytes total, for extra)
const textToTwoBigInts = (text: string): [bigint, bigint] => {
  const bytes = new TextEncoder().encode(text.slice(0, 64));
  const part1Bytes = bytes.slice(0, 32);
  const part2Bytes = bytes.slice(32, 64);
  
  let hex1 = "";
  part1Bytes.forEach(b => { hex1 += b.toString(16).padStart(2, "0"); });
  
  let hex2 = "";
  part2Bytes.forEach(b => { hex2 += b.toString(16).padStart(2, "0"); });
  
  return [
    hex1 ? BigInt("0x" + hex1) : BigInt(0),
    hex2 ? BigInt("0x" + hex2) : BigInt(0)
  ];
};

// Handle to hex string
const toHex = (handle: unknown): `0x${string}` => {
  if (typeof handle === "string") {
    return handle.startsWith("0x") ? handle as `0x${string}` : `0x${handle}`;
  }
  if (typeof handle === "bigint") {
    return `0x${handle.toString(16).padStart(64, "0")}`;
  }
  if (handle instanceof Uint8Array) {
    return bytesToHex(handle);
  }
  return `0x${String(handle)}`;
};

export function CreateCredentialModal({ isOpen, onClose, onSuccess }: CreateCredentialModalProps) {
  const { address } = useAccount();
  const { instance, loading: fheLoading } = useFhe();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [formData, setFormData] = useState({
    name: "",
    account: "",
    password: "",
    extra: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = isPending || isConfirming || encrypting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!instance || !address) {
      setError("Please connect wallet and wait for FHE initialization");
      return;
    }

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    // Update button state first
    setEncrypting(true);

    // Delay encryption to let UI update
    setTimeout(async () => {
      try {
        console.log("[Heirloom] Starting encryption...");

        // account and password: 1 BigInt each (31 chars)
        const accountBigInt = textToBigInt(formData.account);
        const passwordBigInt = textToBigInt(formData.password);
        // extra uses 2 BigInts (64 chars)
        const [extra1, extra2] = textToTwoBigInts(formData.extra);

        console.log("[Heirloom] Text encoded, creating encrypted input...");

        // Create encrypted input (4 euint256)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const input = (instance as any).createEncryptedInput(
          heirloomContract.address,
          address
        );
        
        input.add256(accountBigInt);
        input.add256(passwordBigInt);
        input.add256(extra1);
        input.add256(extra2);

        console.log("[Heirloom] Encrypting 4 fields...");
        const encrypted = await input.encrypt();
        console.log("[Heirloom] Encrypted, handles:", encrypted.handles);

        setEncrypting(false);

        // Call contract (4 encrypted parameters)
        writeContract({
          ...heirloomContract,
          functionName: "createCredential",
          args: [
            formData.name,
            toHex(encrypted.handles[0]),
            toHex(encrypted.handles[1]),
            toHex(encrypted.handles[2]),
            toHex(encrypted.handles[3]),
            toHex(encrypted.inputProof),
          ],
        });
      } catch (err) {
        setEncrypting(false);
        console.error("[Heirloom] Encryption failed:", err);
        setError(err instanceof Error ? err.message : "Encryption failed");
      }
    }, 50);
  };

  // Close on success
  if (isSuccess) {
    setTimeout(() => {
      onSuccess?.();
      onClose();
      setFormData({ name: "", account: "", password: "", extra: "" });
    }, 1000);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">New Credential</h2>
              <p className="text-xs text-zinc-500">Encrypted with FHE</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <FileText className="w-4 h-4 text-zinc-500" />
              Name
              <span className="text-amber-500">*</span>
              <span className="ml-auto text-xs text-zinc-600 font-normal">Public</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Gmail, Twitter, Bank..."
              className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
              maxLength={64}
            />
          </div>

          {/* Account Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <User className="w-4 h-4 text-zinc-500" />
              Account
              <span className="text-xs text-zinc-600 font-normal">({formData.account.length}/31)</span>
              <span className="ml-auto text-xs text-green-500 font-normal flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Encrypted
              </span>
            </label>
            <input
              type="text"
              value={formData.account}
              onChange={(e) => setFormData({ ...formData, account: e.target.value.slice(0, 31) })}
              placeholder="Username or email"
              maxLength={31}
              className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Lock className="w-4 h-4 text-zinc-500" />
              Password
              <span className="text-xs text-zinc-600 font-normal">({formData.password.length}/31)</span>
              <span className="ml-auto text-xs text-green-500 font-normal flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Encrypted
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value.slice(0, 31) })}
                placeholder="Your password"
                maxLength={31}
                className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 pr-12 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Extra Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <FileText className="w-4 h-4 text-zinc-500" />
              Extra Info
              <span className="text-xs text-zinc-600 font-normal">({formData.extra.length}/64)</span>
              <span className="ml-auto text-xs text-green-500 font-normal flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Encrypted
              </span>
            </label>
            <textarea
              value={formData.extra}
              onChange={(e) => setFormData({ ...formData, extra: e.target.value.slice(0, 64) })}
              placeholder="Recovery codes, notes, etc."
              maxLength={64}
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {isSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              Credential created successfully!
            </div>
          )}

          {/* FHE Status Warning */}
          {fheLoading && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Initializing encryption...
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || fheLoading || !instance}
              className="flex-1 px-4 py-3 bg-amber-500 text-black text-sm font-bold uppercase tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {encrypting ? "Encrypting..." : isConfirming ? "Confirming..." : "Sending..."}
                </>
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <p className="text-xs text-zinc-600 text-center">
            Your credentials are encrypted client-side using Fully Homomorphic Encryption.
            Only you and authorized addresses can decrypt them.
          </p>
        </div>
      </div>
    </div>
  );
}
