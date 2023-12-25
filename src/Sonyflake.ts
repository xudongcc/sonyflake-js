import { getMachineIdByIp } from "./getMachineIdByIp";

export interface SonyflakeIdPayload {
  timestamp: number;
  sequence: number;
  machineId: number;
  startTime: Date;
  generatedTime: Date;
}

export interface SonyflakeOptions {
  startTime?: Date;
  machineId?: number | bigint;
}

/**
 * Sonyflake ID generator.
 */
export class Sonyflake {
  /**
   * The number of bits used for the timestamp component of the ID.
   */
  private readonly timestampBits = 39n;

  /**
   * The number of bits used for the sequence component of the ID.
   */
  private readonly sequenceBits = 8n;

  /**
   * The number of bits used for the machine ID component of the ID.
   */
  private readonly machineIdBits = 16n;

  /**
   * The number of bits to shift the timestamp component to the left.
   */
  private readonly timestampShift = this.sequenceBits + this.machineIdBits;

  /**
   * The number of bits to shift the sequence component to the left.
   */
  private readonly sequenceShift = this.machineIdBits;

  /**
   * The bitmask for the timestamp component.
   */
  private readonly timestampMask = 2n ** this.timestampBits - 1n;

  /**
   * The bitmask for the sequence component.
   */
  private readonly sequenceMask = 2n ** this.sequenceBits - 1n;

  /**
   * The bitmask for the machine ID component.
   */
  private readonly machineIdMask = 2n ** this.machineIdBits - 1n;

  /**
   * The start time for generating IDs.
   */
  private readonly startTime: Date;

  /**
   * The start timestamp calculated from the start time.
   */
  private readonly startTimestamp: bigint;

  /**
   * The machine ID used for generating IDs.
   */
  private readonly machineId: bigint;

  /**
   * The current sequence number.
   */
  private sequence = 0n;

  /**
   * The current timestamp.
   */
  private timestamp = 0n;

  /**
   * Creates a new instance of the Sonyflake class.
   * @param options Optional configuration options for the Sonyflake instance.
   * @throws Error if the machine ID is not available or invalid.
   */
  public constructor(options?: SonyflakeOptions) {
    // Set the start time for generating IDs
    this.startTime = options?.startTime || new Date("2014-09-01T00:00:00Z");
    this.startTimestamp = BigInt(this.startTime.getTime());

    // Get the machine ID
    const machineId =
      typeof options?.machineId !== "undefined"
        ? BigInt(options.machineId)
        : getMachineIdByIp();

    // Throw an error if machine ID is not available
    if (machineId === null) {
      throw new Error("Cannot get machine id");
    }

    this.machineId = machineId;

    // Validate the machine ID
    if (this.machineId < 0n || this.machineId >= this.machineIdMask) {
      throw new Error("Machine id must be between 0 and 2 ** 16 - 1");
    }
  }

  /**
   * Calculates the elapsed timestamp since the start time.
   * @returns The elapsed timestamp.
   * @throws Error if the timestamp exceeds the storage range.
   */
  private calculateElapsedTimestamp(): bigint {
    // Calculate the elapsed timestamp since the start time
    const timestamp = (BigInt(Date.now()) - this.startTimestamp) / 10n;

    // Throw an error if the timestamp exceeds the storage range
    if (timestamp > this.timestampMask) {
      throw new Error("Timestamp offset overflow");
    }

    return timestamp;
  }

  /**
   * Generates the next Sonyflake ID.
   * @returns The generated Sonyflake ID.
   * @throws Error if the clock moves backwards.
   */
  public next(): bigint {
    let timestamp = this.calculateElapsedTimestamp();

    // If the current timestamp is smaller than the previous one, it indicates a clock rollback, which is usually not allowed
    if (timestamp < this.timestamp) {
      throw new Error("Clock moved backwards. Refusing to generate id");
    }

    // If the current timestamp is the same as the previous one, increment the sequence number
    if (timestamp === this.timestamp) {
      this.sequence = (this.sequence + 1n) & this.sequenceMask;

      // Sequence number overflow (i.e., the number of IDs generated in the same millisecond exceeds the maximum value of the sequence number)
      if (this.sequence === 0n) {
        while (timestamp <= this.timestamp) {
          timestamp = this.calculateElapsedTimestamp();
        }
      }
    } else {
      // If the current timestamp is different from the previous one, reset the sequence number
      this.sequence = 0n;
    }

    // Update the previous elapsed time for generating IDs
    this.timestamp = timestamp;

    // Combine the components to form the ID
    return (
      (timestamp << this.timestampShift) |
      (this.sequence << this.sequenceShift) |
      this.machineId
    );
  }

  /**
   * Parses a Sonyflake ID into its components.
   * @param id The Sonyflake ID to parse.
   * @returns The parsed Sonyflake ID components.
   */
  public parse(id: bigint): SonyflakeIdPayload {
    // Parse the ID into its components
    const timestamp = Number((id >> this.timestampShift) * 10n);
    const sequence = Number((id >> this.sequenceShift) & this.sequenceMask);
    const machineId = Number(id & this.machineIdMask);

    return {
      startTime: this.startTime,
      generatedTime: new Date(this.startTime.getTime() + timestamp),
      timestamp,
      sequence,
      machineId,
    };
  }

  /**
   * The singleton instance of the Sonyflake class.
   */
  private static instance: Sonyflake;

  /**
   * Sets the options for the Sonyflake instance.
   * @param options The configuration options for the Sonyflake instance.
   */
  public static set(options: SonyflakeOptions): void {
    // Set the options for the Sonyflake instance
    this.instance = new this(options);
  }

  /**
   * Generates the next Sonyflake ID using the singleton instance.
   * @returns The generated Sonyflake ID.
   */
  public static next(): bigint {
    // Get the next ID from the Sonyflake instance
    this.instance = this.instance || new this();
    return this.instance.next();
  }

  /**
   * Parses a Sonyflake ID using the singleton instance.
   * @param id The Sonyflake ID to parse.
   * @returns The parsed Sonyflake ID components.
   */
  public static parse(id: bigint): SonyflakeIdPayload {
    // Parse the ID using the Sonyflake instance
    this.instance = this.instance || new this();
    return this.instance.parse(id);
  }
}
