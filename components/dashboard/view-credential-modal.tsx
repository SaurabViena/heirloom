"use client";

import { useState, useEffect } from "react";
import { X, Key, User, Lock, FileText, Loader2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { heirloomContract } from "@/config/contract";
import { useFhe } from "@/components/providers/fhe-provider";

interface ViewCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentialIndex: number;
  credentialName: string;
}

// BigInt to string
const bigIntToText = (value: bigint): string => {
  if (value === BigInt(0)) return "";
  let hex = value.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
};

export function ViewCredentialModal({ isOpen, onClose, credentialIndex, credentialName }: ViewCredentialModalProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { instance, loading } = useFhe();

  const [decryptedData, setDecryptedData] = useState<{
    account: string | null;
    password: string | null;
    extra: string | null;
  }>({ account: null, password: null, extra: null });

  const [decrypting, setDecrypting] = useState(false);
  const [decryptStep, setDecryptStep] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state
  useEffect(() => {
    if (!isOpen) {
      setDecryptedData({ account: null, password: null, extra: null });
      setShowPassword(false);
      setError(null);
      setDecryptStep("");
    }
  }, [isOpen]);

  // Decrypt multiple handles with userDecrypt
  const userDecryptHandles = async (handleList: string[]): Promise<Record<string, bigint>> => {
    if (!instance || !walletClient || !address) throw new Error("Not ready");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inst = instance as any;
    
    const keypair = inst.generateKeypair();
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "1";
    const contractAddresses = [heirloomContract.address];

    const eip712 = inst.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    );

    const signature = await walletClient.signTypedData({
      account: walletClient.account!,
      domain: eip712.domain,
      types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      primaryType: "UserDecryptRequestVerification",
      message: eip712.message,
    });

    const handleContractPairs = handleList.map(h => ({
      handle: h,
      contractAddress: heirloomContract.address,
    }));

    const result = await inst.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      address,
      startTimeStamp,
      durationDays
    );

    const decrypted: Record<string, bigint> = {};
    for (const h of handleList) {
      const val = result[h] ?? result[h.toLowerCase()];
      decrypted[h] = BigInt(val ?? 0);
    }
    return decrypted;
  };

  // Decrypt all data
  const handleDecrypt = async () => {
    if (!publicClient) {
      setError("Wallet not connected");
      return;
    }
    if (!instance) {
      setError("FHE instance not ready");
      return;
    }
    if (!walletClient) {
      setError("Wallet not connected");
      return;
    }

    setDecrypting(true);
    setError(null);
    setDecryptStep("Fetching handles...");

    setTimeout(async () => {
      try {
        // Get handles directly from contract (need account to ensure msg.sender is correct)
        const result = await publicClient.readContract({
          ...heirloomContract,
          functionName: "getMyCredentialHandles",
          args: [BigInt(credentialIndex)],
          account: address,
        }) as [string, string, string, string];

        const [accountHandle, passwordHandle, extra1Handle, extra2Handle] = result;
        console.log("[Heirloom] Handles:", { accountHandle, passwordHandle, extra1Handle, extra2Handle });

        // Filter empty handles
        const zeroHandle = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const validHandles = [accountHandle, passwordHandle, extra1Handle, extra2Handle]
          .filter(h => h && h !== zeroHandle);

        if (validHandles.length === 0) {
          setDecryptedData({ account: "", password: "", extra: "" });
          setDecryptStep("");
          setDecrypting(false);
          return;
        }

        console.log("[Heirloom] Decrypting handles:", validHandles);
        setDecryptStep("Signing decrypt request...");

        const decrypted = await Promise.race([
          userDecryptHandles(validHandles),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Decrypt timeout (60s)")), 60000)
          )
        ]);

        console.log("[Heirloom] Decrypted values:", decrypted);
        setDecryptStep("Processing...");

        // Convert to text
        const account = bigIntToText(decrypted[accountHandle] ?? BigInt(0));
        const password = bigIntToText(decrypted[passwordHandle] ?? BigInt(0));
        const extra1 = bigIntToText(decrypted[extra1Handle] ?? BigInt(0));
        const extra2 = bigIntToText(decrypted[extra2Handle] ?? BigInt(0));
        const extra = extra1 + extra2;

        setDecryptedData({ account, password, extra });
        setDecryptStep("");
        console.log("[Heirloom] Decryption complete");
      } catch (err) {
        console.error("[Heirloom] Decryption failed:", err);
        const msg = err instanceof Error ? err.message : "Decryption failed";
        if (msg.includes("User denied") || msg.includes("User rejected")) {
          setError("User cancelled");
        } else {
          setError(msg.length > 60 ? msg.slice(0, 60) + "..." : msg);
        }
        setDecryptStep("");
      } finally {
        setDecrypting(false);
      }
    }, 50);
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  // Format date
  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  if (!isOpen) return null;

  const isDecrypted = decryptedData.account !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-zinc-950 border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700">
              <Key className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{credentialName}</h2>
              <p className="text-xs text-zinc-500">Credential #{credentialIndex}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Account Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <User className="w-4 h-4 text-zinc-500" />
              Account
            </label>
            <div className="relative">
              <div className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 text-white min-h-[48px] flex items-center">
                {isDecrypted ? (
                  <span>{decryptedData.account || "-"}</span>
                ) : (
                  <span className="text-zinc-600 select-none">{"*".repeat(16)}</span>
                )}
              </div>
              {isDecrypted && decryptedData.account && (
                <button
                  onClick={() => copyToClipboard(decryptedData.account!, "account")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {copied === "account" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Lock className="w-4 h-4 text-zinc-500" />
              Password
            </label>
            <div className="relative">
              <div className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 pr-20 text-white min-h-[48px] flex items-center">
                {isDecrypted ? (
                  <span>{showPassword ? decryptedData.password || "-" : "*".repeat(decryptedData.password?.length || 8)}</span>
                ) : (
                  <span className="text-zinc-600 select-none">{"*".repeat(16)}</span>
                )}
              </div>
              {isDecrypted && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {decryptedData.password && (
                    <button
                      onClick={() => copyToClipboard(decryptedData.password!, "password")}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      {copied === "password" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Extra Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <FileText className="w-4 h-4 text-zinc-500" />
              Extra Info
            </label>
            <div className="relative">
              <div className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 text-white min-h-[64px]">
                {isDecrypted ? (
                  <span className="whitespace-pre-wrap">{decryptedData.extra || "-"}</span>
                ) : (
                  <span className="text-zinc-600 select-none">{"*".repeat(24)}</span>
                )}
              </div>
              {isDecrypted && decryptedData.extra && (
                <button
                  onClick={() => copyToClipboard(decryptedData.extra!, "extra")}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-white transition-colors"
                >
                  {copied === "extra" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          {!isDecrypted ? (
            <button
              onClick={handleDecrypt}
              disabled={decrypting}
              className="w-full py-3 bg-amber-500 text-black font-bold uppercase tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {decrypting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {decryptStep || "Decrypting..."}
                </>
              ) : loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading FHE...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Decrypt Credential
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 bg-zinc-800 text-white font-bold uppercase tracking-wide hover:bg-zinc-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
