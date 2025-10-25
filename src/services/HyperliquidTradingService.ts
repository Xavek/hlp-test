import * as hl from "@nktkas/hyperliquid";
import { randomUUID } from "node:crypto";
import { SymbolConverter } from "@nktkas/hyperliquid/utils";
import { privateKeyToAccount } from "viem/accounts";

export interface TradeResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class HyperliquidTradingService {
  private infoClient: hl.InfoClient;
  private exchangeClient: hl.ExchangeClient;
  private coin: string = "ETH";
  private walletAddress: string;
  
  constructor(privateKey: string, walletAddress: string, isTestnet: boolean = true) {
    this.walletAddress = walletAddress;

    // Initialize Info Client for market data
    this.infoClient = new hl.InfoClient({
      transport: new hl.HttpTransport({
        isTestnet: true,
        timeout: 10_000,
      }),
    });

    // Initialize Exchange Client for trading
    this.exchangeClient = new hl.ExchangeClient({
      wallet: privateKeyToAccount(privateKey as `0x${string}`),
      transport: new hl.HttpTransport({
        isTestnet: true,
        timeout: 10_000
      }),
    });
  }

  async getCurrentPrice(): Promise<number> {
    const l2Book = await this.infoClient.l2Book({ coin: this.coin });
    
    if (l2Book.levels[0].length > 0) {
      return parseFloat(l2Book.levels[0][0].px);
    }
    
    throw new Error("Unable to fetch current price");
  }

  async getAccountState(): Promise<any> {
    return await this.infoClient.clearinghouseState({ user: this.walletAddress as `0x${string}` });
  }

  calculatePositionSize(usdcAmount: number, price: number, leverage: number): number {
    const notionalValue = usdcAmount * leverage;
    return notionalValue / price;
  }

  async openLongPosition(
    usdcAmount: number = 500,
    leverage: number = 1,
    slippage: number = 0.5
  ): Promise<TradeResult> {
    try {
      console.log(`\n🚀 Opening ${this.coin} long position...`);
      console.log(`💰 Margin: ${usdcAmount} USDC`);
      console.log(`📊 Leverage: ${leverage}x`);
      
      // Get current price
      const currentPrice = await this.getCurrentPrice();
      
      // Calculate position size
      const positionSize = this.calculatePositionSize(usdcAmount, currentPrice, leverage);
      
      // Add slippage to get maximum acceptable price
      const maxPrice = currentPrice * (1 + slippage / 100);
      
      console.log(`📏 Position size: ${positionSize.toFixed(4)} ${this.coin}`);
      console.log(`💵 Entry price: ~$${currentPrice}`);
      console.log(`⚠️  Max price (with slippage): $${maxPrice.toFixed(2)}`);
      
      // Prepare order
      const order = {
        a: await this.getAssetId(this.coin), // asset
        b: true, // is buy
        p: currentPrice.toString(), // price
        s: positionSize.toString(), // size
        t: {
          limit: {
            tif: "Ioc" as const, 
          }
        },
        r: false, // reduce only
        c: `0x${randomUUID().replace(/-/g, "").slice(0, 32)}` as `0x${string}`
      };

      // Set leverage first
      console.log(`\n⚙️  Setting leverage to ${leverage}x...`);
      const leverageResult = await this.exchangeClient.updateLeverage({
        asset: await this.getAssetId(this.coin),
        isCross: true,
        leverage: leverage,
      });
      console.log("Leverage set:", leverageResult);

      // Place order
      console.log("\n📤 Placing order...");
      const result = await this.exchangeClient.order({
        orders: [order],
        grouping: "na",
      });

      console.log("\n✅ Order result:");
      console.log(JSON.stringify(result, null, 2));
      
      return {
        success: true,
        message: `Successfully opened long position: ${positionSize.toFixed(4)} ${this.coin}`,
        data: {
          positionSize: positionSize.toFixed(4),
          entryPrice: currentPrice,
          usdcAmount,
          leverage,
          orderResult: result
        }
      };
    } catch (error: any) {
      console.error("\n❌ Error opening position:", error);
      return {
        success: false,
        message: "Failed to open long position",
        error: error.message || String(error)
      };
    }
  }

  async getOpenOrders(): Promise<any> {
    return await this.infoClient.openOrders({ user: this.walletAddress as `0x${string}` });
  }

  async getAssetId(name:string):Promise<number>{
    const transport = new hl.HttpTransport({isTestnet:true});
    const converter = await SymbolConverter.create({ transport });
    return await converter.getAssetId(name)
  }

  async closePosition(): Promise<TradeResult> {
    try {
      console.log(`\n🔒 Closing ${this.coin} position...`);
      
      const state = await this.infoClient.clearinghouseState({ user: this.walletAddress as `0x${string}`});
      const position = state.assetPositions.find((pos: any) => pos.position.coin === this.coin);
      
      if (!position || parseFloat(position.position.szi) === 0) {
        return {
          success: false,
          message: "No open position found"
        };
      }

      const positionSize = Math.abs(parseFloat(position.position.szi));
      const currentPrice = await this.getCurrentPrice();
      const minPrice = currentPrice * 0.995;

      console.log(`📏 Closing ${positionSize} ${this.coin}`);
      
      const order = {
        a: await this.getAssetId(this.coin), // asset
        b: true, // is buy
        p: currentPrice.toString(), // price
        s: positionSize.toString(), // size
        t: {
          limit: {
            tif: "Ioc" as const, 
          }
        },
        r: false, // reduce only
        c: `0x${randomUUID().replace(/-/g, "").slice(0, 32)}` as `0x${string}`
      };

      const result = await this.exchangeClient.order({
        orders: [order],
        grouping: "na",
      });

      console.log("\n✅ Position closed:");
      console.log(JSON.stringify(result, null, 2));
      
      return {
        success: true,
        message: `Successfully closed position: ${positionSize} ${this.coin}`,
        data: {
          positionSize,
          exitPrice: currentPrice,
          orderResult: result
        }
      };
    } catch (error: any) {
      console.error("\n❌ Error closing position:", error);
      return {
        success: false,
        message: "Failed to close position",
        error: error.message || String(error)
      };
    }
  }
}
