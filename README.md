# Heirloom

**Confidential Credential Inheritance System based on FHEVM Fully Homomorphic Encryption**

Heirloom is a decentralized application that allows users to securely store encrypted credentials (account, password, extra info) on-chain and authorize inheritance access to designated addresses. All sensitive data is encrypted using Zama's FHEVM technology, ensuring that even the blockchain nodes cannot read the plaintext.

## Features

- **Fully Homomorphic Encryption**: All credentials are encrypted using `euint256` types, never stored in plaintext
- **Credential Management**: Create, update, and rename encrypted credentials
- **Inheritance Authorization**: Authorize single or all credentials to designated heirs
- **User Decryption**: Only authorized users can decrypt credentials via EIP712 signatures
- **Automatic Re-authorization**: When credentials are updated, heirs automatically retain access

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  My Vault   │  │  Inherited  │  │   Relayer SDK (FHE)     │  │
│  │  - Create   │  │  - View     │  │   - Encrypt inputs      │  │
│  │  - View     │  │  - Decrypt  │  │   - User decrypt        │  │
│  │  - Heir     │  │             │  │   - EIP712 signatures   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Heirloom Smart Contract                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Credential Storage (euint256 encrypted)                 │    │
│  │  - account (31 chars max)                                │    │
│  │  - password (31 chars max)                               │    │
│  │  - extra1 + extra2 (64 chars max combined)               │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Authorization System                                    │    │
│  │  - Single credential authorization                       │    │
│  │  - All credentials authorization                         │    │
│  │  - FHE.allow() for access control                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FHEVM (Zama) Network                          │
│  - Encrypted computation on euint256                             │
│  - Gateway for user decryption                                   │
│  - ZamaEthereumConfig for network parameters                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Technical Implementation

### Data Structures

#### Credential Structure
```solidity
struct Credential {
    string name;        // Public credential name (max 64 chars)
    euint256 account;   // Encrypted account (max 31 chars as BigInt)
    euint256 password;  // Encrypted password (max 31 chars as BigInt)
    euint256 extra1;    // Encrypted extra info part 1 (32 bytes)
    euint256 extra2;    // Encrypted extra info part 2 (32 bytes)
    uint256 createdAt;
    uint256 updatedAt;
}
```

#### Authorization Types
```solidity
enum AuthType {
    None,    // No authorization
    Single,  // Single credential authorization
    All      // All credentials authorization
}

struct Authorization {
    address owner;           // Credential owner
    address authorized;      // Heir address
    AuthType authType;       // Authorization type
    uint256 credentialIndex; // Credential index (for Single type)
    uint256 createdAt;
}
```

### Storage Mappings

| Mapping | Purpose |
|---------|---------|
| `_credentials[address]` | User's credential array |
| `_singleAuths[owner][authorized][index]` | Single credential authorization check |
| `_allAuths[owner][authorized]` | All credentials authorization check |
| `_givenAuths[address]` | Authorizations given by user |
| `_receivedAuths[address]` | Authorizations received by user |
| `_allAuthList[owner]` | List of addresses with all-access |
| `_singleAuthList[owner][index]` | List of addresses with single-access |

### Core Functions

#### Credential Management

| Function | Description |
|----------|-------------|
| `createCredential()` | Create new encrypted credential with 4 euint256 fields |
| `updateCredential()` | Update all encrypted fields |
| `updateAccount()` | Update only account field |
| `updatePassword()` | Update only password field |
| `updateExtra()` | Update only extra fields |
| `renameCredential()` | Rename credential (public name) |

#### Authorization Management

| Function | Description |
|----------|-------------|
| `grantSingleAuth(address, index)` | Authorize single credential to heir |
| `grantAllAuth(address)` | Authorize all credentials (including future) to heir |

#### Query Functions

| Function | Description |
|----------|-------------|
| `getCredentialCount(address)` | Get user's credential count |
| `getAllCredentialNames(address)` | Get all credential names |
| `getCredentialMeta(address, index)` | Get credential metadata |
| `hasAccess(owner, accessor, index)` | Check if accessor has permission |
| `getGivenAuthorizations(address)` | Get authorizations given by user |
| `getReceivedAuthorizations(address)` | Get authorizations received by user |

#### Decryption Handles

| Function | Description |
|----------|-------------|
| `getMyCredentialHandles(index)` | Get own credential handles for decryption |
| `getAuthorizedCredentialHandles(owner, index)` | Get authorized credential handles |
| `getAllMyCredentialHandles()` | Get all own credential handles |

### FHE Access Control Flow

```
1. User encrypts data on frontend using Relayer SDK
   └── createEncryptedInput() → add256() → encrypt()

2. Contract receives external encrypted data
   └── FHE.fromExternal(encData, inputProof) → euint256

3. Contract grants access permissions
   └── FHE.allowThis(euint256)  // Allow contract to read
   └── FHE.allow(euint256, user) // Allow user to decrypt

4. User requests decryption via frontend
   └── generateKeypair() → createEIP712() → signTypedData()
   └── userDecrypt(handles, keypair, signature)

5. Gateway returns decrypted values
   └── BigInt → Text conversion on frontend
```

### Automatic Re-authorization

When credentials are updated, the contract automatically re-authorizes all previously authorized users:

```solidity
function _reauthorizeCredential(address user, uint256 index) internal {
    // Re-authorize to all-access list
    for (uint256 i = 0; i < _allAuthList[user].length; i++) {
        FHE.allow(cred.account, _allAuthList[user][i]);
        FHE.allow(cred.password, _allAuthList[user][i]);
        FHE.allow(cred.extra1, _allAuthList[user][i]);
        FHE.allow(cred.extra2, _allAuthList[user][i]);
    }
    
    // Re-authorize to single-access list
    for (uint256 i = 0; i < _singleAuthList[user][index].length; i++) {
        FHE.allow(cred.account, _singleAuthList[user][index][i]);
        // ... other fields
    }
}
```

---

## Frontend Implementation

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Wallet**: RainbowKit + Wagmi v2
- **FHE**: Zama Relayer SDK (CDN)

### Key Components

| Component | Purpose |
|-----------|---------|
| `FheProvider` | Load and initialize Relayer SDK |
| `CredentialList` | Display user's credentials |
| `CreateCredentialModal` | Create new encrypted credential |
| `ViewCredentialModal` | View and decrypt own credential |
| `AuthorizeHeirModal` | Authorize single credential |
| `AuthorizeAllModal` | Authorize all credentials |
| `InheritedList` | Display inherited credentials |
| `ViewInheritedModal` | View and decrypt inherited credential |

### Encryption Flow (Frontend)

```typescript
// 1. Convert text to BigInt (max 31 chars for account/password)
const textToBigInt = (text: string): bigint => {
  const bytes = new TextEncoder().encode(text.slice(0, 31));
  return BigInt("0x" + bytesToHex(bytes));
};

// 2. Create encrypted input
const input = instance.createEncryptedInput(contractAddress, userAddress);
input.add256(accountBigInt);
input.add256(passwordBigInt);
input.add256(extra1BigInt);
input.add256(extra2BigInt);

// 3. Encrypt and get handles + proof
const encrypted = await input.encrypt();
// encrypted.handles[0..3], encrypted.inputProof
```

### Decryption Flow (Frontend)

```typescript
// 1. Get handles from contract
const handles = await contract.getMyCredentialHandles(index);

// 2. Generate keypair and EIP712 signature
const keypair = instance.generateKeypair();
const eip712 = instance.createEIP712(keypair.publicKey, contracts, timestamp, duration);
const signature = await walletClient.signTypedData(eip712);

// 3. Request decryption
const decrypted = await instance.userDecrypt(
  handleContractPairs, keypair.privateKey, keypair.publicKey,
  signature, contracts, userAddress, timestamp, duration
);

// 4. Convert BigInt back to text
const text = bigIntToText(decrypted[handle]);
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- MetaMask or compatible wallet

### Installation

```bash
pnpm install
```

### Environment Variables

```env
NEXT_PUBLIC_HEIRLOOM_ADDRESS=0x...  # Deployed contract address
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...  # WalletConnect project ID
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deployment

```bash
pnpm build
```

Deploy to Vercel or any static hosting.

---

## Contract Deployment

The contract is deployed on Ethereum Sepolia testnet using Zama's FHEVM infrastructure.

```bash
cd fhevm-hardhat-template-main
npx hardhat run deploy/deployHeirloom.ts --network sepolia
```

---

## Security Considerations

1. **Encrypted Storage**: All sensitive data uses `euint256` types, never plaintext
2. **Access Control**: Only authorized addresses can call `FHE.allow()` to grant access
3. **EIP712 Signatures**: Decryption requires user signature, preventing unauthorized access
4. **No Plaintext Logging**: Frontend never logs decrypted values to console in production

---

## License

BSD-3-Clause-Clear
