import { useState } from 'nuxt/app';
import { useCredentialContract } from './useCredentialContract';

export const useWallet = () => {
    const address = useState<string>('wallet-address', () => '');
    const { connectWallet, getCurrentAddress } = useCredentialContract();

    async function checkConnection() {
        if (!process.client) return;
        address.value = await getCurrentAddress();
        return address.value;
    }

    async function login() {
        if (!process.client) return;
        try {
            address.value = await connectWallet();
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to connect wallet.");
        }
    }

    function disconnect() {
        address.value = '';
    }

    return { address, checkConnection, login, disconnect };
};
