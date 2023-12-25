import { networkInterfaces } from "os";

import { getMachineIdByIp } from "./getMachineIdByIp";

jest.mock("os");

describe("getMachineIdByIp", () => {
  it("should return null if no IPv4 external network interface is found", () => {
    (networkInterfaces as jest.Mock).mockReturnValue({
      lo: [
        {
          address: "127.0.0.1",
          netmask: "255.0.0.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: true,
          cidr: "127.0.0.1/8",
        },
      ],
    });

    expect(getMachineIdByIp()).toBeNull();
  });

  it("should return a BigInt representing the last 16 bits of the IP address if an IPv4 external network interface is found", () => {
    (networkInterfaces as jest.Mock).mockReturnValue({
      eth0: [
        {
          address: "192.168.1.2",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: false,
          cidr: "192.168.1.2/24",
        },
      ],
    });

    expect(getMachineIdByIp()).toBe(
      BigInt(parseInt(["00000001", "00000010"].join(""), 2))
    );
  });
});
