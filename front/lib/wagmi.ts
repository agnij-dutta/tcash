import { http, createConfig } from "wagmi";
import { avalancheFuji } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: http("https://api.avax-test.network/ext/bc/C/rpc"),
  },
});


