import Link from "next/link";
import { ConnectButton } from "@/components/connect-button";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden font-mono selection:bg-amber-500/30">
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 animate-[pulse_8s_ease-in-out_infinite]" />
      
      {/* Ambient Light */}
      <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] animate-[pulse_10s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px] animate-[pulse_12s_ease-in-out_infinite]" />

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <div className="w-3 h-3 bg-amber-500/80" />
          </div>
          <span className="text-white font-bold tracking-wider uppercase">Heirloom</span>
        </div>
        <ConnectButton />
      </header>

      {/* Main Terminal Interface */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-88px)] px-4">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-20 items-center">
          
          {/* Left: Text Content */}
          <div className="space-y-8 text-left relative z-20">
            <div className="inline-block px-3 py-1 text-xs text-zinc-500 border border-zinc-800 tracking-widest uppercase">
              FHEVM • ZAMA • V0.9
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tighter leading-[0.9]">
              DIGITAL<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700">
                LEGACY
              </span>
            </h1>
            
            <p className="text-zinc-500 text-lg max-w-md leading-relaxed">
              Your digital assets, secured by homomorphic encryption.
              Create your legacy vault today.
            </p>

            <div className="flex items-center gap-6 pt-4">
              <Link 
                href="/dashboard"
                className="h-12 px-8 bg-white hover:bg-zinc-200 text-black font-medium tracking-wide transition-colors flex items-center justify-center"
              >
                Create Vault
              </Link>
              
              <a href="#" className="text-zinc-500 hover:text-white text-sm tracking-widest uppercase transition-colors">
                Documentation
              </a>
            </div>
          </div>

          {/* Right: Minimalist Vault Visual */}
          <div className="relative aspect-square w-full max-w-sm mx-auto lg:ml-auto flex items-center justify-center group cursor-pointer perspective-1000">
            {/* Outer Data Rings */}
            <div className="absolute w-[140%] h-[140%] border border-zinc-800/30 rounded-full animate-[spin_30s_linear_infinite]" />
            <div className="absolute w-[120%] h-[120%] border border-dashed border-zinc-800/30 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
            
            {/* Floating Data Bits */}
            <div className="absolute inset-0 animate-[spin_15s_linear_infinite]">
              <div className="absolute top-0 left-1/2 w-1 h-3 bg-amber-500/50 -translate-x-1/2 blur-[1px]" />
              <div className="absolute bottom-0 left-1/2 w-1 h-3 bg-amber-500/50 -translate-x-1/2 blur-[1px]" />
              <div className="absolute left-0 top-1/2 w-3 h-1 bg-amber-500/50 -translate-y-1/2 blur-[1px]" />
              <div className="absolute right-0 top-1/2 w-3 h-1 bg-amber-500/50 -translate-y-1/2 blur-[1px]" />
            </div>

            {/* The Cube / Vault */}
            <div className="relative w-56 h-56 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 shadow-2xl shadow-black transform transition-all duration-500 group-hover:scale-105 group-hover:border-amber-500/50 group-hover:shadow-amber-500/20 rotate-45 group-hover:rotate-0 overflow-hidden">
              {/* Internal Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20" />
              
              {/* Inner Glow */}
              <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors duration-500" />
              
              {/* Scanning Laser */}
              <div className="absolute left-0 right-0 h-[2px] bg-amber-400/50 blur-[2px] animate-[scan_3s_ease-in-out_infinite]" />
              
              {/* Corner Accents */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-amber-500/30" />
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-amber-500/30" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-amber-500/30" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-amber-500/30" />
              
              {/* Center Core */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border border-amber-500/20 bg-amber-500/5 flex items-center justify-center relative">
                  <div className="w-8 h-8 bg-amber-500/20 blur-md absolute animate-pulse" />
                  <div className="w-2 h-2 bg-amber-500 rotate-45" />
                </div>
              </div>
            </div>

            {/* Holographic Base */}
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-24 bg-gradient-to-t from-transparent to-amber-500/10 blur-xl rounded-[100%] opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          </div>

        </div>

        {/* Footer Stats */}
        <div className="absolute bottom-0 left-0 right-0 p-8 border-t border-white/5 flex justify-between text-xs text-zinc-600 uppercase tracking-widest">
          <div>Sepolia Testnet</div>
          <div>FHE Status: Active</div>
        </div>
      </main>
    </div>
  );
}
