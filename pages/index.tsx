import { getAmountWei } from "@/utils/number";
import {
  Button,
  Code,
  Heading,
  Input,
  InputGroup,
  InputRightAddon,
  Select,
  Spinner,
  Stack,
  StatDownArrow,
  Text,
  useToast,
} from "@chakra-ui/react";
import { SkipRouter } from "@skip-router/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getChainInfo,
  getWallet,
  useAccount,
  useChainInfo,
  useDisconnect,
  useSuggestChainAndConnect,
} from "graz";
import { useEffect, useMemo, useState } from "react";
import {
  JsonView,
  collapseAllNested,
  defaultStyles,
} from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { Layout } from "@/components/Layout";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Home() {
  const toast = useToast();

  const [source, setSource] = useState<{
    chainID?: string;
    assetDenom?: string;
  }>();
  const [destination, setDestination] = useState<{
    chainID?: string;
    assetDenom?: string;
    destinationAddress?: string;
  }>();
  const [amount, setAmount] = useState<string>();
  const [txInfo, setTxInfo] = useState<
    {
      txHash: string;
      chainID: string;
    }[]
  >([]);

  const chainInfo = useChainInfo({
    chainId: source?.chainID,
  });

  useEffect(() => {
    if (!window.keplr) return;
    window.keplr.defaultOptions = {
      sign: {
        preferNoSetFee: true,
        preferNoSetMemo: true,
      },
    };
  }, []);

  const { disconnect } = useDisconnect();
  const { suggestAndConnect } = useSuggestChainAndConnect();

  const skipClient = new SkipRouter({
    getCosmosSigner: async (chainID) => getWallet().getOfflineSigner(chainID),
    endpointOptions: {
      getRpcEndpointForChain: async (chainID) => {
        const chainInfo = getChainInfo({ chainId: chainID });
        return `${
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : `https://${window.location.hostname}`
        }/api/rpc?endpoint=${chainInfo?.rpc!}`;
      },
    },
  });

  // querying chains
  const { data: chains, isLoading: chainsLoading } = useQuery({
    queryKey: ["chains"],
    queryFn: async () => {
      return skipClient.chains();
    },
    select: (data) => {
      return data.sort((a, b) => a.chainName.localeCompare(b.chainName));
    },
  });

  // querying assets
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      return skipClient.assets();
    },
    select: (data) => {
      //sort by symbol
      return Object.fromEntries(
        Object.entries(data).map(([chainID, assets]) => [
          chainID,
          assets.sort((a, b) =>
            (a.recommendedSymbol ?? a.denom).localeCompare(
              b.recommendedSymbol ?? b.denom
            )
          ),
        ])
      );
    },
  });

  const sourceAsset = useMemo(() => {
    return (
      (source?.chainID &&
        assets?.[source?.chainID].find(
          (asset) => asset.denom === source?.assetDenom
        )) ||
      undefined
    );
  }, [source, assets]);

  const amountIn = getAmountWei(amount, sourceAsset?.decimals);

  // querying route
  const { data: route } = useQuery({
    queryKey: ["route", source, destination, amountIn],
    queryFn: async () => {
      if (
        !destination?.chainID ||
        !destination?.assetDenom ||
        !source?.chainID ||
        !source?.assetDenom
      )
        return;
      return skipClient.route({
        destAssetChainID: destination?.chainID,
        destAssetDenom: destination?.assetDenom,
        amountIn: amountIn,
        sourceAssetChainID: source?.chainID,
        sourceAssetDenom: source?.assetDenom,
        smartRelay: true,
        allowMultiTx: true,
        allowUnsafe: true,
      });
    },
    enabled: !!source && !!destination && !!amountIn,
  });

  const { data: account } = useAccount({
    chainId: route?.chainIDs,
    multiChain: true,
  });

  const userAddresses = useMemo(() => {
    let userAddresses: Record<string, string> = {};
    route?.chainIDs.forEach((chainID, i) => {
      if (i === route.chainIDs.length - 1) {
        if (destination?.destinationAddress) {
          userAddresses[chainID] = destination?.destinationAddress;
        } else {
          return;
        }
      }
      if (Boolean(account?.[chainID]?.bech32Address)) {
        userAddresses[chainID] = account?.[chainID]!.bech32Address!;
      }
    });
    return userAddresses;
  }, [route?.chainIDs, destination?.destinationAddress, account]);

  const execRoute = useMutation({
    mutationKey: ["executeRoute", { route }],
    mutationFn: async () => {
      if (!route) return;
      return skipClient.executeRoute({
        route: route,
        userAddresses,
        onTransactionTracked: async (txInfo) => {
          setTxInfo((prev) => [...prev, txInfo]);
        },
        onTransactionCompleted: async (tx) => {
          toast({
            title: "Success",
            description: "Transaction Successful" + " " + tx,
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        },
      });
    },
    onError: (error) => {
      console.log("Error", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const trackTx = useMutation({
    mutationKey: ["trackTx", { txInfo }],
    mutationFn: async () => {
      if (!txInfo) return;
      return skipClient.transactionStatus({
        txHash: txInfo[0].txHash,
        chainID: txInfo[0].chainID,
      });
    },
    onError: (error) => {
      console.log("Error", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  return (
    <Layout>
      <Stack spacing={8}>
        <Header />
        <Stack>
          <Heading size="md">Install</Heading>
          <Code px={4} py={2}>
            npm i @skip-router/core
          </Code>
        </Stack>
        <Stack>
          <Heading size="md">Init Client</Heading>
          <Code px={4} py={2}>
            const skipClient = new SkipRouter()
          </Code>
        </Stack>
        <Stack spacing={4}>
          <Stack>
            <Heading size="md">From</Heading>
            <Code px={4} py={2}>
              skipClient.chains()
            </Code>
            <Select
              placeholder="Select Chain"
              value={source?.chainID}
              onChange={(e) =>
                setSource((prev) => ({
                  ...prev,
                  chainID: e.target.value,
                }))
              }
              icon={chainsLoading ? <Spinner /> : undefined}
              isDisabled={chainsLoading}
            >
              {chains?.map((chain) => (
                <option value={chain.chainID} key={chain.chainID}>
                  {chain.chainName}
                </option>
              ))}
            </Select>
          </Stack>
          <Stack>
            <Code px={4} py={2}>
              skipClient.assets()
            </Code>
            <Select
              placeholder="Select Asset"
              value={source?.assetDenom}
              onChange={(e) =>
                setSource((prev) => ({
                  ...prev,
                  assetDenom: e.target.value,
                }))
              }
              icon={assetsLoading ? <Spinner /> : undefined}
              disabled={!source?.chainID || assetsLoading}
            >
              {source?.chainID &&
                assets?.[source?.chainID]?.map((asset) => (
                  <option value={asset.denom} key={asset.denom}>
                    {asset.recommendedSymbol}
                  </option>
                ))}
            </Select>
          </Stack>
          {chainInfo &&
            source?.chainID &&
            account?.[source?.chainID]?.bech32Address && (
              <>
                <Heading size="md">Account</Heading>
                <Code px={4} py={2}>
                  {account?.[chainInfo.chainId]?.bech32Address}
                </Code>

                <InputGroup>
                  <Input
                    type="number"
                    placeholder="Amount"
                    onChange={(e) => setAmount(e.target.value)}
                    value={amount}
                  />
                  <InputRightAddon>{sourceAsset?.symbol}</InputRightAddon>
                </InputGroup>
              </>
            )}
          {chainInfo &&
            (source?.chainID && account?.[source?.chainID]?.bech32Address ? (
              <Button colorScheme="orange" onClick={() => disconnect()}>
                Disconnect
              </Button>
            ) : (
              <Button
                colorScheme="blue"
                onClick={() => {
                  console.log("chainInfo", chainInfo);
                  suggestAndConnect({
                    chainInfo: chainInfo,
                  });
                }}
              >
                Connect Keplr
              </Button>
            ))}
        </Stack>
        <Stack spacing={4}>
          <Stack>
            <Heading size="md">To</Heading>
            <Select
              placeholder="Select Chain"
              value={destination?.chainID}
              onChange={(e) =>
                setDestination((prev) => ({
                  ...prev,
                  chainID: e.target.value,
                }))
              }
              icon={chainsLoading ? <Spinner /> : undefined}
              isDisabled={chainsLoading}
            >
              {chains?.map((chain) => (
                <option value={chain.chainID} key={chain.chainID}>
                  {chain.chainName}
                </option>
              ))}
            </Select>
          </Stack>
          <Stack>
            <Select
              placeholder="Select Asset"
              value={destination?.assetDenom}
              onChange={(e) =>
                setDestination((prev) => ({
                  ...prev,
                  assetDenom: e.target.value,
                }))
              }
              icon={assetsLoading ? <Spinner /> : undefined}
              disabled={!destination?.chainID || assetsLoading}
            >
              {destination?.chainID &&
                assets?.[destination?.chainID]?.map((asset) => (
                  <option value={asset.denom} key={asset.denom}>
                    {asset.recommendedSymbol}
                  </option>
                ))}
            </Select>
          </Stack>
          <Input
            placeholder="Destination Address"
            type="text"
            onChange={(e) =>
              setDestination((prev) => ({
                ...prev,
                destinationAddress: e.target.value,
              }))
            }
          />
        </Stack>
        <Stack>
          <Code px={4} py={2}>
            skipClient.route()
          </Code>
          <JsonView
            data={route!}
            shouldExpandNode={collapseAllNested}
            style={defaultStyles}
          />
        </Stack>
        <Stack>
          {route && (
            <>
              <Heading size="md">Route</Heading>
              <Stack>
                {route?.chainIDs.map((chainID, i) => (
                  <>
                    {i !== 0 && <StatDownArrow color="gray" />}
                    <Stack key={i}>
                      <Text fontWeight="bold">
                        {getChainInfo({ chainId: chainID })?.chainName}
                      </Text>
                      {userAddresses[chainID] ? (
                        <Code>
                          <Text>
                            {route.chainIDs.length - 1 === i
                              ? destination?.destinationAddress
                              : userAddresses[chainID]}
                          </Text>
                        </Code>
                      ) : (
                        <Button
                          onClick={() => {
                            const chainInfo = getChainInfo({
                              chainId: chainID,
                            });
                            if (chainInfo) {
                              suggestAndConnect({
                                chainInfo,
                              });
                            }
                          }}
                        >
                          Connect
                        </Button>
                      )}
                    </Stack>
                  </>
                ))}
              </Stack>
            </>
          )}

          <Code px={4} py={2}>
            skipClient.executeRoute()
          </Code>
          <Button
            isDisabled={
              !destination?.chainID ||
              !destination?.assetDenom ||
              !destination?.destinationAddress ||
              !source?.chainID ||
              !source?.assetDenom ||
              !route
            }
            isLoading={execRoute.isPending}
            onClick={() => execRoute.mutate()}
            colorScheme="green"
          >
            Execute Route
          </Button>
        </Stack>
        {txInfo.length > 0 && (
          <Stack spacing={4}>
            <Stack>
              <Heading size="md">Transaction Info</Heading>
              <Code px={4} py={2}>
                chainID: {txInfo[0].chainID}
                <br />
                txHash: {txInfo[0].txHash}
              </Code>
            </Stack>
            <Stack>
              <Code px={4} py={2}>
                skipClient.transactionStatus()
              </Code>
              <Button
                colorScheme="cyan"
                onClick={() => trackTx.mutate()}
                isLoading={trackTx.isPending}
              >
                Transaction Status
              </Button>
              <JsonView
                data={trackTx.data!}
                shouldExpandNode={collapseAllNested}
                style={defaultStyles}
              />
            </Stack>
          </Stack>
        )}
      </Stack>

      <Footer />
    </Layout>
  );
}
