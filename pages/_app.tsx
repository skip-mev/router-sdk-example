import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { GrazProvider } from "graz";
import type { AppProps } from "next/app";
import { mainnetChainsArray } from "graz/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function App({ Component, pageProps }: AppProps) {
  const queryClient = new QueryClient();

  return (
    <ChakraProvider>
      <GrazProvider
        grazOptions={{
          chains: mainnetChainsArray,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <Component {...pageProps} />
        </QueryClientProvider>
      </GrazProvider>
    </ChakraProvider>
  );
}
