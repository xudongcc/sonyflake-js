import { networkInterfaces } from "os";

/**
 * Retrieves the machine ID based on the IP address.
 * @returns The machine ID as a bigint or null if the IP address is not found.
 */
export function getMachineIdByIp(): bigint | null {
  const ip = Object.values(networkInterfaces())
    .flat()
    .find(
      (networkInterfaceInfo) =>
        networkInterfaceInfo.family === "IPv4" &&
        networkInterfaceInfo.internal === false
    )?.address;

  if (!ip) {
    return null;
  }

  const fragments = ip
    .split(".")
    .map((fragment) => parseInt(fragment).toString(2).padStart(8, "0"))
    .join("");

  return BigInt(parseInt(fragments.slice(-16), 2));
}
