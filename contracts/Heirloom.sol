// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {FHE, externalEuint256, euint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Heirloom - Confidential Credential Inheritance System
/// @notice Based on FHEVM fully homomorphic encryption, supports encrypted storage and inheritance authorization of credentials
/// @dev extra field uses 2 euint256 storage, supports up to 64 characters
contract Heirloom is ZamaEthereumConfig, Ownable2Step {
    // Credential structure (extra uses 2 euint256 to support 64 characters)
    struct Credential {
        string name; // Credential name (public)
        euint256 account; // Account (encrypted, 31 characters)
        euint256 password; // Password (encrypted, 31 characters)
        euint256 extra1; // Extra info first 32 bytes (encrypted)
        euint256 extra2; // Extra info last 32 bytes (encrypted)
        uint256 createdAt;
        uint256 updatedAt;
    }

    // Authorization type
    enum AuthType {
        None, // No authorization
        Single, // Single credential authorization
        All // All credentials authorization
    }

    // Authorization record
    struct Authorization {
        address owner; // Credential owner
        address authorized; // Authorized user
        AuthType authType; // Authorization type
        uint256 credentialIndex; // Credential index for single authorization
        uint256 createdAt;
    }

    // User credential list
    mapping(address => Credential[]) private _credentials;

    // Authorization mapping: owner => authorized => index => is authorized single
    mapping(address => mapping(address => mapping(uint256 => bool))) private _singleAuths;
    // All authorization mapping: owner => authorized => is authorized all
    mapping(address => mapping(address => bool)) private _allAuths;

    // User authorization record list
    mapping(address => Authorization[]) private _givenAuths; // Authorizations I gave to others
    mapping(address => Authorization[]) private _receivedAuths; // Authorizations others gave to me

    // Authorized user list (for automatic re-authorization on update)
    mapping(address => address[]) private _allAuthList; // owner => list of addresses authorized for all
    mapping(address => mapping(uint256 => address[])) private _singleAuthList; // owner => index => list of addresses authorized for this credential

    // Events
    event CredentialCreated(address indexed owner, uint256 index, string name);
    event CredentialUpdated(address indexed owner, uint256 index, string name);
    event CredentialRenamed(address indexed owner, uint256 index, string oldName, string newName);
    event SingleAuthGranted(address indexed owner, address indexed authorized, uint256 index);
    event AllAuthGranted(address indexed owner, address indexed authorized);

    constructor(address owner_) Ownable(owner_) {}

    // ==================== Credential Management ====================

    /// @notice Create new credential (extra field supports 64 characters)
    function createCredential(
        string calldata name,
        externalEuint256 encAccount,
        externalEuint256 encPassword,
        externalEuint256 encExtra1,
        externalEuint256 encExtra2,
        bytes calldata inputProof
    ) external {
        require(bytes(name).length > 0, "HL: name empty");
        require(bytes(name).length <= 64, "HL: name too long");

        euint256 account = FHE.fromExternal(encAccount, inputProof);
        euint256 password = FHE.fromExternal(encPassword, inputProof);
        euint256 extra1 = FHE.fromExternal(encExtra1, inputProof);
        euint256 extra2 = FHE.fromExternal(encExtra2, inputProof);

        _credentials[msg.sender].push(
            Credential({
                name: name,
                account: account,
                password: password,
                extra1: extra1,
                extra2: extra2,
                createdAt: block.timestamp,
                updatedAt: block.timestamp
            })
        );

        uint256 index = _credentials[msg.sender].length - 1;

        // Authorize contract and user access
        _allowCredential(msg.sender, index);

        // Automatically authorize users who have been authorized "All"
        _autoAllowToAllAuthList(msg.sender, index);

        emit CredentialCreated(msg.sender, index, name);
    }

    /// @notice Update credential (extra supports 64 characters)
    function updateCredential(
        uint256 index,
        externalEuint256 encAccount,
        externalEuint256 encPassword,
        externalEuint256 encExtra1,
        externalEuint256 encExtra2,
        bytes calldata inputProof
    ) external {
        require(index < _credentials[msg.sender].length, "HL: invalid index");

        euint256 account = FHE.fromExternal(encAccount, inputProof);
        euint256 password = FHE.fromExternal(encPassword, inputProof);
        euint256 extra1 = FHE.fromExternal(encExtra1, inputProof);
        euint256 extra2 = FHE.fromExternal(encExtra2, inputProof);

        Credential storage cred = _credentials[msg.sender][index];
        cred.account = account;
        cred.password = password;
        cred.extra1 = extra1;
        cred.extra2 = extra2;
        cred.updatedAt = block.timestamp;

        // Re-authorize
        _allowCredential(msg.sender, index);

        // Automatically re-authorize authorized users
        _reauthorizeCredential(msg.sender, index);

        emit CredentialUpdated(msg.sender, index, cred.name);
    }

    /// @notice Update account only
    function updateAccount(uint256 index, externalEuint256 encAccount, bytes calldata inputProof) external {
        require(index < _credentials[msg.sender].length, "HL: invalid index");

        euint256 account = FHE.fromExternal(encAccount, inputProof);
        Credential storage cred = _credentials[msg.sender][index];
        cred.account = account;
        cred.updatedAt = block.timestamp;

        FHE.allowThis(account);
        FHE.allow(account, msg.sender);

        // Automatically re-authorize
        _reauthorizeAccount(msg.sender, index);

        emit CredentialUpdated(msg.sender, index, cred.name);
    }

    /// @notice Update password only
    function updatePassword(uint256 index, externalEuint256 encPassword, bytes calldata inputProof) external {
        require(index < _credentials[msg.sender].length, "HL: invalid index");

        euint256 password = FHE.fromExternal(encPassword, inputProof);
        Credential storage cred = _credentials[msg.sender][index];
        cred.password = password;
        cred.updatedAt = block.timestamp;

        FHE.allowThis(password);
        FHE.allow(password, msg.sender);

        // Automatically re-authorize
        _reauthorizePassword(msg.sender, index);

        emit CredentialUpdated(msg.sender, index, cred.name);
    }

    /// @notice Update extra info only (2 euint256)
    function updateExtra(
        uint256 index,
        externalEuint256 encExtra1,
        externalEuint256 encExtra2,
        bytes calldata inputProof
    ) external {
        require(index < _credentials[msg.sender].length, "HL: invalid index");

        euint256 extra1 = FHE.fromExternal(encExtra1, inputProof);
        euint256 extra2 = FHE.fromExternal(encExtra2, inputProof);
        Credential storage cred = _credentials[msg.sender][index];
        cred.extra1 = extra1;
        cred.extra2 = extra2;
        cred.updatedAt = block.timestamp;

        FHE.allowThis(extra1);
        FHE.allowThis(extra2);
        FHE.allow(extra1, msg.sender);
        FHE.allow(extra2, msg.sender);

        // Automatically re-authorize
        _reauthorizeExtra(msg.sender, index);

        emit CredentialUpdated(msg.sender, index, cred.name);
    }

    /// @notice Rename credential
    function renameCredential(uint256 index, string calldata newName) external {
        require(index < _credentials[msg.sender].length, "HL: invalid index");
        require(bytes(newName).length > 0, "HL: name empty");
        require(bytes(newName).length <= 64, "HL: name too long");

        string memory oldName = _credentials[msg.sender][index].name;
        _credentials[msg.sender][index].name = newName;
        _credentials[msg.sender][index].updatedAt = block.timestamp;

        emit CredentialRenamed(msg.sender, index, oldName, newName);
    }

    // ==================== Authorization Management ====================

    /// @notice Authorize single credential to other address
    function grantSingleAuth(address authorized, uint256 index) external {
        require(authorized != address(0), "HL: zero address");
        require(authorized != msg.sender, "HL: self auth");
        require(index < _credentials[msg.sender].length, "HL: invalid index");
        require(!_singleAuths[msg.sender][authorized][index], "HL: already authorized");

        _singleAuths[msg.sender][authorized][index] = true;
        _singleAuthList[msg.sender][index].push(authorized);

        // Authorize authorized user to access encrypted data (4 fields)
        Credential storage cred = _credentials[msg.sender][index];
        FHE.allow(cred.account, authorized);
        FHE.allow(cred.password, authorized);
        FHE.allow(cred.extra1, authorized);
        FHE.allow(cred.extra2, authorized);

        // Record authorization
        _givenAuths[msg.sender].push(
            Authorization({
                owner: msg.sender,
                authorized: authorized,
                authType: AuthType.Single,
                credentialIndex: index,
                createdAt: block.timestamp
            })
        );

        _receivedAuths[authorized].push(
            Authorization({
                owner: msg.sender,
                authorized: authorized,
                authType: AuthType.Single,
                credentialIndex: index,
                createdAt: block.timestamp
            })
        );

        emit SingleAuthGranted(msg.sender, authorized, index);
    }

    /// @notice Authorize all credentials to other address
    function grantAllAuth(address authorized) external {
        require(authorized != address(0), "HL: zero address");
        require(authorized != msg.sender, "HL: self auth");
        require(!_allAuths[msg.sender][authorized], "HL: already authorized");

        _allAuths[msg.sender][authorized] = true;
        _allAuthList[msg.sender].push(authorized);

        // Authorize authorized user to access all encrypted data (4 fields)
        Credential[] storage creds = _credentials[msg.sender];
        for (uint256 i = 0; i < creds.length; i++) {
            FHE.allow(creds[i].account, authorized);
            FHE.allow(creds[i].password, authorized);
            FHE.allow(creds[i].extra1, authorized);
            FHE.allow(creds[i].extra2, authorized);
        }

        // Record authorization
        _givenAuths[msg.sender].push(
            Authorization({
                owner: msg.sender,
                authorized: authorized,
                authType: AuthType.All,
                credentialIndex: 0,
                createdAt: block.timestamp
            })
        );

        _receivedAuths[authorized].push(
            Authorization({
                owner: msg.sender,
                authorized: authorized,
                authType: AuthType.All,
                credentialIndex: 0,
                createdAt: block.timestamp
            })
        );

        emit AllAuthGranted(msg.sender, authorized);
    }

    // ==================== Query Functions ====================

    /// @notice Get user credential count
    function getCredentialCount(address user) external view returns (uint256) {
        return _credentials[user].length;
    }

    /// @notice Get credential name
    function getCredentialName(address user, uint256 index) external view returns (string memory) {
        require(index < _credentials[user].length, "HL: invalid index");
        return _credentials[user][index].name;
    }

    /// @notice Get all credential names
    function getAllCredentialNames(address user) external view returns (string[] memory names) {
        Credential[] storage creds = _credentials[user];
        names = new string[](creds.length);
        for (uint256 i = 0; i < creds.length; i++) {
            names[i] = creds[i].name;
        }
    }

    /// @notice Get credential metadata
    function getCredentialMeta(
        address user,
        uint256 index
    ) external view returns (string memory name, uint256 createdAt, uint256 updatedAt) {
        require(index < _credentials[user].length, "HL: invalid index");
        Credential storage cred = _credentials[user][index];
        return (cred.name, cred.createdAt, cred.updatedAt);
    }

    /// @notice Check if single credential authorization exists
    function hasSingleAuth(address owner, address authorized, uint256 index) external view returns (bool) {
        return _singleAuths[owner][authorized][index];
    }

    /// @notice Check if all credential authorization exists
    function hasAllAuth(address owner, address authorized) external view returns (bool) {
        return _allAuths[owner][authorized];
    }

    /// @notice Check if access permission exists (single or all)
    function hasAccess(address owner, address accessor, uint256 index) external view returns (bool) {
        if (owner == accessor) return true;
        if (_allAuths[owner][accessor]) return true;
        if (_singleAuths[owner][accessor][index]) return true;
        return false;
    }

    /// @notice Get authorizations I gave to others
    function getGivenAuthorizations(address user) external view returns (Authorization[] memory) {
        return _givenAuths[user];
    }

    /// @notice Get authorizations others gave to me
    function getReceivedAuthorizations(address user) external view returns (Authorization[] memory) {
        return _receivedAuths[user];
    }

    // ==================== Decryption Related ====================

    /// @notice Get own single credential handles (for decryption, extra returns 2 handles)
    function getMyCredentialHandles(
        uint256 index
    )
        external
        view
        returns (bytes32 accountHandle, bytes32 passwordHandle, bytes32 extra1Handle, bytes32 extra2Handle)
    {
        require(index < _credentials[msg.sender].length, "HL: invalid index");
        Credential storage cred = _credentials[msg.sender][index];

        if (FHE.isInitialized(cred.account)) {
            accountHandle = FHE.toBytes32(cred.account);
        }
        if (FHE.isInitialized(cred.password)) {
            passwordHandle = FHE.toBytes32(cred.password);
        }
        if (FHE.isInitialized(cred.extra1)) {
            extra1Handle = FHE.toBytes32(cred.extra1);
        }
        if (FHE.isInitialized(cred.extra2)) {
            extra2Handle = FHE.toBytes32(cred.extra2);
        }
    }

    /// @notice Get authorized credential handles (for decryption, extra returns 2 handles)
    function getAuthorizedCredentialHandles(
        address owner,
        uint256 index
    )
        external
        view
        returns (bytes32 accountHandle, bytes32 passwordHandle, bytes32 extra1Handle, bytes32 extra2Handle)
    {
        require(index < _credentials[owner].length, "HL: invalid index");
        require(_allAuths[owner][msg.sender] || _singleAuths[owner][msg.sender][index], "HL: not authorized");

        Credential storage cred = _credentials[owner][index];

        if (FHE.isInitialized(cred.account)) {
            accountHandle = FHE.toBytes32(cred.account);
        }
        if (FHE.isInitialized(cred.password)) {
            passwordHandle = FHE.toBytes32(cred.password);
        }
        if (FHE.isInitialized(cred.extra1)) {
            extra1Handle = FHE.toBytes32(cred.extra1);
        }
        if (FHE.isInitialized(cred.extra2)) {
            extra2Handle = FHE.toBytes32(cred.extra2);
        }
    }

    /// @notice Get all my credential handles (extra returns 2 arrays)
    function getAllMyCredentialHandles()
        external
        view
        returns (
            bytes32[] memory accountHandles,
            bytes32[] memory passwordHandles,
            bytes32[] memory extra1Handles,
            bytes32[] memory extra2Handles
        )
    {
        Credential[] storage creds = _credentials[msg.sender];
        uint256 len = creds.length;

        accountHandles = new bytes32[](len);
        passwordHandles = new bytes32[](len);
        extra1Handles = new bytes32[](len);
        extra2Handles = new bytes32[](len);

        for (uint256 i = 0; i < len; i++) {
            if (FHE.isInitialized(creds[i].account)) {
                accountHandles[i] = FHE.toBytes32(creds[i].account);
            }
            if (FHE.isInitialized(creds[i].password)) {
                passwordHandles[i] = FHE.toBytes32(creds[i].password);
            }
            if (FHE.isInitialized(creds[i].extra1)) {
                extra1Handles[i] = FHE.toBytes32(creds[i].extra1);
            }
            if (FHE.isInitialized(creds[i].extra2)) {
                extra2Handles[i] = FHE.toBytes32(creds[i].extra2);
            }
        }
    }

    // ==================== Internal Functions ====================

    /// @dev Authorize contract and user to access credential encrypted data (4 fields)
    function _allowCredential(address user, uint256 index) internal {
        Credential storage cred = _credentials[user][index];

        FHE.allowThis(cred.account);
        FHE.allowThis(cred.password);
        FHE.allowThis(cred.extra1);
        FHE.allowThis(cred.extra2);

        FHE.allow(cred.account, user);
        FHE.allow(cred.password, user);
        FHE.allow(cred.extra1, user);
        FHE.allow(cred.extra2, user);
    }

    /// @dev Automatically authorize new credential to users who have been authorized "All" (4 fields)
    function _autoAllowToAllAuthList(address user, uint256 index) internal {
        address[] storage authList = _allAuthList[user];
        Credential storage cred = _credentials[user][index];

        for (uint256 i = 0; i < authList.length; i++) {
            FHE.allow(cred.account, authList[i]);
            FHE.allow(cred.password, authList[i]);
            FHE.allow(cred.extra1, authList[i]);
            FHE.allow(cred.extra2, authList[i]);
        }
    }

    /// @dev Re-authorize credential to all authorized users (4 fields)
    function _reauthorizeCredential(address user, uint256 index) internal {
        Credential storage cred = _credentials[user][index];

        // Re-authorize to all authorization list
        address[] storage allList = _allAuthList[user];
        for (uint256 i = 0; i < allList.length; i++) {
            FHE.allow(cred.account, allList[i]);
            FHE.allow(cred.password, allList[i]);
            FHE.allow(cred.extra1, allList[i]);
            FHE.allow(cred.extra2, allList[i]);
        }

        // Re-authorize to single authorization list
        address[] storage singleList = _singleAuthList[user][index];
        for (uint256 i = 0; i < singleList.length; i++) {
            FHE.allow(cred.account, singleList[i]);
            FHE.allow(cred.password, singleList[i]);
            FHE.allow(cred.extra1, singleList[i]);
            FHE.allow(cred.extra2, singleList[i]);
        }
    }

    /// @dev Re-authorize account field
    function _reauthorizeAccount(address user, uint256 index) internal {
        euint256 account = _credentials[user][index].account;

        address[] storage allList = _allAuthList[user];
        for (uint256 i = 0; i < allList.length; i++) {
            FHE.allow(account, allList[i]);
        }

        address[] storage singleList = _singleAuthList[user][index];
        for (uint256 i = 0; i < singleList.length; i++) {
            FHE.allow(account, singleList[i]);
        }
    }

    /// @dev Re-authorize password field
    function _reauthorizePassword(address user, uint256 index) internal {
        euint256 password = _credentials[user][index].password;

        address[] storage allList = _allAuthList[user];
        for (uint256 i = 0; i < allList.length; i++) {
            FHE.allow(password, allList[i]);
        }

        address[] storage singleList = _singleAuthList[user][index];
        for (uint256 i = 0; i < singleList.length; i++) {
            FHE.allow(password, singleList[i]);
        }
    }

    /// @dev Re-authorize extra info fields (2 euint256)
    function _reauthorizeExtra(address user, uint256 index) internal {
        euint256 extra1 = _credentials[user][index].extra1;
        euint256 extra2 = _credentials[user][index].extra2;

        address[] storage allList = _allAuthList[user];
        for (uint256 i = 0; i < allList.length; i++) {
            FHE.allow(extra1, allList[i]);
            FHE.allow(extra2, allList[i]);
        }

        address[] storage singleList = _singleAuthList[user][index];
        for (uint256 i = 0; i < singleList.length; i++) {
            FHE.allow(extra1, singleList[i]);
            FHE.allow(extra2, singleList[i]);
        }
    }
}
