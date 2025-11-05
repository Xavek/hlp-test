import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { HyperliquidTradingService } from "./services/HyperliquidTradingService";
import {doTrade} from "./services/ParadexTradingService";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS!;
const IS_TESTNET = process.env.IS_TESTNET === "true";

// Validate environment variables
// if (!PRIVATE_KEY || !WALLET_ADDRESS) {
//   console.error("❌ Missing required environment variables: PRIVATE_KEY and WALLET_ADDRESS");
//   process.exit(1);
// }

// // Initialize trading service
// const tradingService = new HyperliquidTradingService(
//   PRIVATE_KEY,
//   WALLET_ADDRESS,
//   IS_TESTNET
// );

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", testnet: IS_TESTNET });
});


app.get("/strk", async (req: Request, res: Response) => {
  await doTrade();
  res.json({ status: "ok"});
});



// Get account state
// app.get("/api/account", async (req: Request, res: Response) => {
//   try {
//     const state = await tradingService.getAccountState();
//     res.json({ success: true, data: state });
//   } catch (error: any) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// // Get current ETH price
// app.get("/api/price", async (req: Request, res: Response) => {
//   try {
//     const price = await tradingService.getCurrentPrice();
//     res.json({ success: true, data: { coin: "ETH", price } });
//   } catch (error: any) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// // Get open orders
// app.get("/api/orders", async (req: Request, res: Response) => {
//   try {
//     const orders = await tradingService.getOpenOrders();
//     res.json({ success: true, data: orders });
//   } catch (error: any) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// // Open long position - THIS IS THE TEST ENDPOINT
// app.post("/api/trade", async (req: Request, res: Response) => {
//   try {
//     const { usdcAmount = 500, leverage = 1, slippage = 0.5 } = req.body;
    
//     console.log(`\n📥 Received trade request:`);
//     console.log(`   USDC Amount: ${usdcAmount}`);
//     console.log(`   Leverage: ${leverage}x`);
//     console.log(`   Slippage: ${slippage}%`);
    
//     const result = await tradingService.openLongPosition(
//       usdcAmount,
//       leverage,
//       slippage
//     );
    
//     if (result.success) {
//       res.json(result);
//     } else {
//       res.status(400).json(result);
//     }
//   } catch (error: any) {
//     res.status(500).json({ 
//       success: false, 
//       message: "Internal server error",
//       error: error.message 
//     });
//   }
// });

// // Close position
// app.post("/api/close", async (req: Request, res: Response) => {
//   try {
//     const result = await tradingService.closePosition();
    
//     if (result.success) {
//       res.json(result);
//     } else {
//       res.status(400).json(result);
//     }
//   } catch (error: any) {
//     res.status(500).json({ 
//       success: false, 
//       message: "Internal server error",
//       error: error.message 
//     });
//   }
// });

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Hyperliquid Trading Server`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Testnet mode: ${IS_TESTNET ? "ENABLED ✅" : "DISABLED ⚠️"}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health          - Health check`);
  console.log(`   GET  /api/account     - Get account state`);
  console.log(`   GET  /api/price       - Get current ETH price`);
  console.log(`   GET  /api/orders      - Get open orders`);
  console.log(`   POST /api/trade       - Open long position (TEST ENDPOINT)`);
  console.log(`   POST /api/close       - Close position`);
  console.log(`\n💡 Test the strategy with:`);
  console.log(`   pnpm run test:trade`);
  console.log(`   OR`);
  console.log(`   curl -X POST http://localhost:${PORT}/api/trade -H "Content-Type: application/json" -d '{"usdcAmount": 500, "leverage": 1}'`);
  console.log(`\n`);
});

export default app;
