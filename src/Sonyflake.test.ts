import { getMachineIdByIp } from "./getMachineIdByIp";
import { Sonyflake } from "./Sonyflake";

jest.mock("./getMachineIdByIp");

describe("Sonyflake", () => {
  const machineId = 1;
  const startTime = new Date("2014-09-01T00:00:00Z");
  const generatedTime = new Date("2023-09-01T00:00:00Z");

  let originalDateNow: () => number;

  beforeAll(() => {
    originalDateNow = Date.now;
  });

  afterAll(() => {
    Date.now = originalDateNow;
  });

  beforeEach(() => {
    Date.now = jest.fn(() => generatedTime.getTime());
    (getMachineIdByIp as jest.Mock).mockReturnValue(BigInt(machineId));
  });

  it("should construct with default options", () => {
    const sonyflake = new Sonyflake();
    expect(sonyflake).toBeInstanceOf(Sonyflake);
  });

  it("should construct with custom options", () => {
    const sonyflake = new Sonyflake({
      startTime: new Date("2015-01-01T00:00:00Z"),
      machineId: 2n,
    });
    expect(sonyflake).toBeInstanceOf(Sonyflake);
  });

  it("should throw error if machine id is null", () => {
    (getMachineIdByIp as jest.Mock).mockReturnValue(null);
    expect(() => new Sonyflake()).toThrow("Cannot get machine id");
  });

  it("should throw error if machine id is out of range", () => {
    expect(() => new Sonyflake({ machineId: -1n })).toThrow(
      "Machine id must be between 0 and 2 ** 16 - 1"
    );
    expect(() => new Sonyflake({ machineId: 2n ** 16n })).toThrow(
      "Machine id must be between 0 and 2 ** 16 - 1"
    );
  });

  it("should throw error if clock moved backwards", () => {
    const sonyflake = new Sonyflake();
    sonyflake.next();
    Date.now = jest.fn(() => 1633024799000); // 999ms earlier
    expect(() => sonyflake.next()).toThrow(
      "Clock moved backwards. Refusing to generate id"
    );
  });

  it("should generate next id from static method", () => {
    expect(Sonyflake.parse(Sonyflake.next())).toEqual({
      timestamp: generatedTime.getTime() - startTime.getTime(),
      machineId,
      sequence: 0,
      startTime,
      generatedTime,
    });
  });
});
