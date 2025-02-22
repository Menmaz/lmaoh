import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { WalletData,BalanceResult } from "../types";

// generate wallet
export const generateWallet = (): WalletData => {
  const account = Account.generate();
  return {
    privateKey: account.privateKey.toString(),
    address: account.accountAddress.toString(),
  };
};

// get account data
export async function fetchAccountData(address:any): Promise<BalanceResult> {
  const aptosConfig = new AptosConfig({ network: Network.MAINNET });
  const aptos = new Aptos(aptosConfig);

  try {
    // get apt balance
    const accountCoinAmount = await aptos.getAccountCoinAmount({
      accountAddress: address,
      coinType: "0x1::aptos_coin::AptosCoin",
    });
    const aptBalance = Number(accountCoinAmount) / 1e8;

    //get usdc balance
    const balances = await aptos.getCurrentFungibleAssetBalances({
      options: {
        where: {
          owner_address: { _eq: address },
          asset_type: {
            _eq: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
          },
        },
      },
    });

    const usdcBalance =
      balances.length > 0 ? Number(balances[0].amount) / 1e6 : undefined;
    return { aptBalance, usdcBalance };

  } catch (error) {
    console.error("Error", error);
    throw error;
  }
}