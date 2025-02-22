import { Aptos, AptosConfig, Network, AccountAddress } from "@aptos-labs/ts-sdk";

async function fetchAccountData(address: string) {
    const aptosConfig = new AptosConfig({ network: Network.MAINNET });
    const aptos = new Aptos(aptosConfig);

    try {
        // Lấy số dư APT
        const accountCoinAmount = await aptos.getAccountCoinAmount({
            accountAddress: address, // Sử dụng tham số address
            coinType: "0x1::aptos_coin::AptosCoin", // Loại coin APT
        });
        const aptBalance = Number(accountCoinAmount) / 10 ** 8; // Chuyển từ Octa sang APT
        console.log("Số dư APT:", aptBalance.toFixed(6)); // In số dư với 6 chữ số thập phân

        // Lấy số dư token fungible (giả sử là USDC hoặc token khác)
        const balances = await aptos.getCurrentFungibleAssetBalances({
            options: {
                where: {
                    owner_address: { _eq: address }, // Sử dụng tham số address
                    asset_type: { _eq: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b" }, // Asset type cụ thể
                },
            },
        });

        // Kiểm tra và tính toán số dư token
        if (balances.length > 0) {
            const tokenBalance = Number(balances[0].amount) / 10 ** 6; // Giả sử token dùng 6 decimals
            console.log("Số dư token:", tokenBalance.toFixed(4)); // In số dư với 4 chữ số thập phân
        } else {
            console.log("Không tìm thấy số dư cho token này.");
        }

    } catch (error) {
        console.error("Lỗi:", error);
    }
}

// Gọi hàm với địa chỉ thực tế
fetchAccountData("0x35f3b99a94ea685b06f04932d2e4c2a0a42a7f5803f239569152eaec1a0a17da");