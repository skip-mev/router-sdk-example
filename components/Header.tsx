import { HStack, Heading, Button, useColorMode } from "@chakra-ui/react";

export const Header = () => {
  const { toggleColorMode, colorMode } = useColorMode();
  return (
    <HStack justifyContent="space-between">
      <Heading as="h1" size="lg">
        Skip Router SDK Frontend Example
      </Heading>
      <Button onClick={toggleColorMode} textTransform="capitalize" size="sm">
        {colorMode}
      </Button>
    </HStack>
  );
};
