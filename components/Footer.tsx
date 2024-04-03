import { HStack, Button } from "@chakra-ui/react";
import Image from "next/image";
import Link from "next/link";

export const Footer = () => {
  return (
    <HStack mt={8} w="full" justifyContent="space-between">
      <Link href="https://skip.money/" target="_blank">
        <Button bgColor="rgba(255,255,255,0.5)" p={4} py={2} borderRadius="md">
          <Image src="/skip-logo.png" alt="Skip Logo" width={80} height={80} />
        </Button>
      </Link>
      <HStack>
        <Link
          href="https://github.com/skip-mev/router-sdk-example"
          target="_blank"
        >
          <Button textTransform="capitalize">Github</Button>
        </Link>
        <Link
          href="https://api-docs.skip.money/docs/typescript-sdk"
          target="_blank"
        >
          <Button textTransform="capitalize">Docs</Button>
        </Link>
      </HStack>
    </HStack>
  );
};
