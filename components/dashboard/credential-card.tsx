"use client";

import { Key, UserPlus } from "lucide-react";

interface CredentialCardProps {
  name: string;
  index: number;
  onView: (index: number, name: string) => void;
  onAuthorize: (index: number, name: string) => void;
}

export function CredentialCard({ name, index, onView, onAuthorize }: CredentialCardProps) {
  return (
    <div 
      className="group relative bg-zinc-900/50 border border-zinc-800 p-5 hover:border-zinc-700 transition-all hover:bg-zinc-900 cursor-pointer"
      onClick={() => onView(index, name)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700 group-hover:border-amber-500/30 group-hover:bg-amber-500/5 transition-colors">
          <Key className="w-5 h-5 text-zinc-400 group-hover:text-amber-500 transition-colors" />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAuthorize(index, name);
            }}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 border border-zinc-700 hover:border-green-500/50 hover:text-green-400 transition-colors flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" />
            Heir
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onView(index, name);
            }}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 border border-zinc-700 hover:border-amber-500/50 hover:text-amber-500 transition-colors"
          >
            View
          </button>
        </div>
      </div>
      
      <div className="space-y-1 mb-4">
        <h3 className="font-medium text-white">{name}</h3>
        <p className="text-xs text-zinc-500">#{index}</p>
      </div>

      <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Encrypted
        </span>
      </div>
    </div>
  );
}

export function CredentialCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="w-8 h-8 bg-zinc-800 rounded animate-pulse" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
        <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse" />
      </div>
      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="h-3 w-16 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-3 w-20 bg-zinc-800/50 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center mb-4">
        <Key className="w-8 h-8 text-zinc-600" />
      </div>
      <h3 className="text-lg font-medium text-zinc-300 mb-2">No credentials yet</h3>
      <p className="text-sm text-zinc-500 mb-6 max-w-sm">
        Start securing your digital legacy by creating your first encrypted credential.
      </p>
      <button 
        onClick={onCreateClick}
        className="px-4 py-2 bg-amber-500 text-black text-sm font-bold uppercase tracking-wide hover:bg-amber-400 transition-colors"
      >
        Create First Credential
      </button>
    </div>
  );
}
