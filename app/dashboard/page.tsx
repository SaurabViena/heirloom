"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@/components/connect-button";
import { Plus, Shield, Search, Users, Key, LayoutGrid, List } from "lucide-react";
import { CredentialList } from "@/components/dashboard/credential-list";
import { CreateCredentialModal } from "@/components/dashboard/create-credential-modal";
import { ViewCredentialModal } from "@/components/dashboard/view-credential-modal";
import { AuthorizeHeirModal } from "@/components/dashboard/authorize-heir-modal";
import { AuthorizeAllModal } from "@/components/dashboard/authorize-all-modal";
import { InheritedList } from "@/components/dashboard/inherited-list";
import { ViewInheritedModal } from "@/components/dashboard/view-inherited-modal";

type Tab = "vault" | "inherited";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("vault");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState<{ index: number; name: string } | null>(null);
  const [heirModal, setHeirModal] = useState<{ index: number; name: string } | null>(null);
  const [showAuthorizeAllModal, setShowAuthorizeAllModal] = useState(false);
  const [inheritedModal, setInheritedModal] = useState<{ owner: string; index: number } | null>(null);

  const handleCreateClick = () => {
    setShowCreateModal(true);
  };

  const handleViewCredential = (index: number, name: string) => {
    setViewModal({ index, name });
  };

  const handleAuthorizeHeir = (index: number, name: string) => {
    setHeirModal({ index, name });
  };

  const handleViewInherited = (owner: string, index: number) => {
    setInheritedModal({ owner, index });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-mono selection:bg-amber-500/30 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-zinc-900/50 p-6 flex flex-col gap-8 fixed h-full">
        <Link href="/" className="flex items-center gap-3 px-2">
          <div className="w-6 h-6 bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <div className="w-2 h-2 bg-amber-500" />
          </div>
          <span className="font-bold tracking-wider uppercase text-sm">Heirloom</span>
        </Link>

        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "vault" ? "bg-amber-500/10 text-amber-500" : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Shield className="w-4 h-4" />
            My Vault
          </button>
          <button 
            onClick={() => setActiveTab("inherited")}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "inherited" ? "bg-amber-500/10 text-amber-500" : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Key className="w-4 h-4" />
            Inherited
          </button>
        </nav>

        <div className="mt-auto">
          <div className="px-3 py-4 border-t border-white/5">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Vault Status</div>
            <div className="flex items-center gap-2 text-sm text-green-500">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Secure
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span>/</span>
            <span className="text-white">Dashboard</span>
            <span>/</span>
            <span className="text-amber-500">
              {activeTab === "vault" && "My Vault"}
              {activeTab === "inherited" && "Inherited"}
            </span>
          </div>
          <ConnectButton />
        </header>

        {/* Content Area */}
        <div className="p-8 max-w-6xl mx-auto">
          
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">
              {activeTab === "vault" && "Credentials"}
              {activeTab === "inherited" && "Received Access"}
            </h1>
            {activeTab === "vault" && (
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAuthorizeAllModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-amber-500/50 text-amber-500 text-sm font-bold uppercase tracking-wide hover:bg-amber-500/10 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Authorize All
                </button>
                <button 
                  onClick={handleCreateClick}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold uppercase tracking-wide hover:bg-zinc-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Credential
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
            <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
              <button className="p-1.5 bg-zinc-800 rounded text-zinc-200"><LayoutGrid className="w-4 h-4" /></button>
              <button className="p-1.5 text-zinc-500 hover:text-zinc-300"><List className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === "vault" && (
              <CredentialList
                onCreateClick={handleCreateClick}
                onViewCredential={handleViewCredential}
                onAuthorizeHeir={handleAuthorizeHeir}
              />
            )}
            {activeTab === "inherited" && (
              <InheritedList onViewCredential={handleViewInherited} />
            )}
          </div>
        </div>
      </main>

      {/* Create Credential Modal */}
      <CreateCredentialModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {/* View Credential Modal */}
      <ViewCredentialModal
        isOpen={!!viewModal}
        onClose={() => setViewModal(null)}
        credentialIndex={viewModal?.index ?? 0}
        credentialName={viewModal?.name ?? ""}
      />

      {/* Authorize Heir Modal */}
      <AuthorizeHeirModal
        isOpen={!!heirModal}
        onClose={() => setHeirModal(null)}
        credentialIndex={heirModal?.index ?? 0}
        credentialName={heirModal?.name ?? ""}
      />

      {/* Authorize All Modal */}
      <AuthorizeAllModal
        isOpen={showAuthorizeAllModal}
        onClose={() => setShowAuthorizeAllModal(false)}
      />

      {/* View Inherited Modal */}
      <ViewInheritedModal
        isOpen={!!inheritedModal}
        onClose={() => setInheritedModal(null)}
        owner={inheritedModal?.owner ?? ""}
        credentialIndex={inheritedModal?.index ?? 0}
      />
    </div>
  );
}
