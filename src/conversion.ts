import { PublicKey } from "@solana/web3.js";
import { readFileSync, writeFileSync } from "fs";
import { IPointsHistory, PointsData, SwapPointsData } from "./types";

export class PointsBinaryConverter {
  private static readonly ADDRESS_SIZE = 32;
  private static readonly TOTAL_POINTS_SIZE = 8;
  private static readonly POSITIONS_AMOUNT_SIZE = 4;
  private static readonly HISTORY_LENGTH_SIZE = 1;
  private static readonly TIMESTAMP_SIZE = 8;
  private static readonly DIFF_SIZE = 8;
  private static readonly MAX_HISTORY_SIZE =
    2 ** (8 * this.HISTORY_LENGTH_SIZE) - 1;
  private static readonly HISTORY_ENTRY_SIZE =
    this.TIMESTAMP_SIZE + this.DIFF_SIZE;

  private static readonly ENTRY_HEADER_SIZE =
    this.ADDRESS_SIZE +
    this.TOTAL_POINTS_SIZE +
    this.POSITIONS_AMOUNT_SIZE +
    this.HISTORY_LENGTH_SIZE;

  public static toBinary(data: PointsData): Uint8Array {
    const entriesCount = Object.keys(data).length;
    const headerSize = 4; // Total length prefix
    const entriesSize = entriesCount * this.ENTRY_HEADER_SIZE;
    const historiesSize = Object.values(data).reduce(
      (sum, entry) =>
        sum + entry.points24HoursHistory.length * this.HISTORY_ENTRY_SIZE,
      0
    );

    const totalSize = headerSize + entriesSize + historiesSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;

    // Write total entries count
    view.setUint32(offset, entriesCount, true);
    offset += 4;

    for (const [pubkeyStr, entry] of Object.entries(data)) {
      // Write public key
      const pubkey = new PublicKey(pubkeyStr);
      const pubkeyBytes = pubkey.toBytes();
      new Uint8Array(buffer, offset, this.ADDRESS_SIZE).set(pubkeyBytes);
      offset += this.ADDRESS_SIZE;

      // Write total points (u64)
      const totalPoints = BigInt(`0x${entry.totalPoints}`);
      view.setBigUint64(offset, totalPoints, true);
      offset += this.TOTAL_POINTS_SIZE;

      // Write positions amount (u32)
      view.setUint32(offset, entry.positionsAmount, true);
      offset += this.POSITIONS_AMOUNT_SIZE;

      // Write history length (u8)
      if (entry.points24HoursHistory.length > this.MAX_HISTORY_SIZE) {
        throw new Error(
          `History length exceeds ${this.MAX_HISTORY_SIZE} maximum`
        );
      }
      view.setUint8(offset, entry.points24HoursHistory.length);
      offset += this.HISTORY_LENGTH_SIZE;

      // Write history entries
      for (const history of entry.points24HoursHistory) {
        const timestamp = BigInt(`0x${history.timestamp}`);
        const diff = BigInt(`0x${history.diff}`);

        view.setBigUint64(offset, timestamp, true);
        offset += this.TIMESTAMP_SIZE;

        view.setBigUint64(offset, diff, true);
        offset += this.DIFF_SIZE;
      }
    }

    return new Uint8Array(buffer);
  }

  public static fromBinary(binary: Uint8Array): PointsData {
    const view = new DataView(binary.buffer);
    let offset = 0;

    // Read total entries count
    const entriesCount = view.getUint32(offset, true);
    offset += 4;

    const result: PointsData = {};

    for (let i = 0; i < entriesCount; i++) {
      // Read public key
      const pubkeyBytes = binary.slice(offset, offset + this.ADDRESS_SIZE);
      const pubkey = new PublicKey(pubkeyBytes).toBase58();
      offset += this.ADDRESS_SIZE;

      // Read total points
      const totalPoints = view.getBigUint64(offset, true);
      offset += this.TOTAL_POINTS_SIZE;

      // Read positions amount
      const positionsAmount = view.getUint32(offset, true);
      offset += this.POSITIONS_AMOUNT_SIZE;

      // Read history length
      const historyLength = view.getUint8(offset);
      offset += this.HISTORY_LENGTH_SIZE;

      // Read history entries
      const points24HoursHistory: IPointsHistory[] = [];
      for (let j = 0; j < historyLength; j++) {
        const timestamp = view.getBigUint64(offset, true);
        offset += this.TIMESTAMP_SIZE;

        const diff = view.getBigUint64(offset, true);
        offset += this.DIFF_SIZE;

        points24HoursHistory.push({
          timestamp: timestamp.toString(16).padStart(16, "0"),
          diff: diff.toString(16).padStart(16, "0"),
        });
      }

      result[pubkey] = {
        totalPoints: totalPoints.toString(16).padStart(16, "0"),
        positionsAmount,
        points24HoursHistory,
      };
    }

    return result;
  }

  public static convertFileToBinary(
    jsonPath: string,
    binaryPath: string
  ): void {
    try {
      const jsonData = readFileSync(jsonPath, "utf8");
      const data: PointsData = JSON.parse(jsonData);
      const binary = this.toBinary(data);
      writeFileSync(binaryPath, binary);
    } catch (error) {
      console.error("Error during file conversion:", error);
      throw error;
    }
  }

  public static convertBinaryToFile(
    binaryPath: string,
    jsonPath: string
  ): void {
    try {
      const binary = readFileSync(binaryPath);
      const data = this.fromBinary(new Uint8Array(binary));
      writeFileSync(jsonPath, JSON.stringify(data));
    } catch (error) {
      console.error("Error during file conversion:", error);
      throw error;
    }
  }

  public static readBinaryFile(binaryPath: string): PointsData {
    try {
      const binary = readFileSync(binaryPath);
      const data = this.fromBinary(new Uint8Array(binary));
      return data;
    } catch (error) {
      console.error("Error during file conversion:", error);
      throw error;
    }
  }

  public static writeBinaryFile(binaryPath: string, data: PointsData): void {
    try {
      const binary = this.toBinary(data);
      writeFileSync(binaryPath, binary);
    } catch (error) {
      console.error("Error during file conversion:", error);
      throw error;
    }
  }
}

export class SwapPointsBinaryConverter {
  private static readonly ADDRESS_SIZE = 32;
  private static readonly TOTAL_POINTS_SIZE = 8;
  private static readonly HISTORY_LENGTH_SIZE = 1;
  private static readonly TIMESTAMP_SIZE = 8;
  private static readonly DIFF_SIZE = 8;
  private static readonly MAX_HISTORY_SIZE =
    2 ** (8 * this.HISTORY_LENGTH_SIZE) - 1;
  private static readonly HISTORY_ENTRY_SIZE =
    this.TIMESTAMP_SIZE + this.DIFF_SIZE;

  private static readonly ENTRY_HEADER_SIZE =
    this.ADDRESS_SIZE + this.TOTAL_POINTS_SIZE + this.HISTORY_LENGTH_SIZE;

  public static toBinary(data: SwapPointsData): Uint8Array {
    const entriesCount = Object.keys(data).length;
    const headerSize = 4; // Total length prefix
    const entriesSize = entriesCount * this.ENTRY_HEADER_SIZE;
    const historiesSize = Object.values(data).reduce(
      (sum, entry) =>
        sum + entry.points24HoursHistory.length * this.HISTORY_ENTRY_SIZE,
      0
    );

    const totalSize = headerSize + entriesSize + historiesSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;

    // Write total entries count
    view.setUint32(offset, entriesCount, true);
    offset += 4;

    for (const [pubkeyStr, entry] of Object.entries(data)) {
      // Write public key
      const pubkey = new PublicKey(pubkeyStr);
      const pubkeyBytes = pubkey.toBytes();
      new Uint8Array(buffer, offset, this.ADDRESS_SIZE).set(pubkeyBytes);
      offset += this.ADDRESS_SIZE;

      // Write total points (u64)
      const totalPoints = BigInt(`0x${entry.totalPoints}`);
      view.setBigUint64(offset, totalPoints, true);
      offset += this.TOTAL_POINTS_SIZE;

      // Write history length (u8)
      if (entry.points24HoursHistory.length > this.MAX_HISTORY_SIZE) {
        throw new Error(
          `History length exceeds ${this.MAX_HISTORY_SIZE} maximum`
        );
      }
      view.setUint8(offset, entry.points24HoursHistory.length);
      offset += this.HISTORY_LENGTH_SIZE;

      // Write history entries
      for (const history of entry.points24HoursHistory) {
        const timestamp = BigInt(`0x${history.timestamp}`);
        const diff = BigInt(`0x${history.diff}`);

        view.setBigUint64(offset, timestamp, true);
        offset += this.TIMESTAMP_SIZE;

        view.setBigUint64(offset, diff, true);
        offset += this.DIFF_SIZE;
      }
    }

    return new Uint8Array(buffer);
  }

  public static fromBinary(binary: Uint8Array): SwapPointsData {
    const view = new DataView(binary.buffer);
    let offset = 0;

    // Read total entries count
    const entriesCount = view.getUint32(offset, true);
    offset += 4;

    const result: SwapPointsData = {};

    for (let i = 0; i < entriesCount; i++) {
      // Read public key
      const pubkeyBytes = binary.slice(offset, offset + this.ADDRESS_SIZE);
      const pubkey = new PublicKey(pubkeyBytes).toBase58();
      offset += this.ADDRESS_SIZE;

      // Read total points
      const totalPoints = view.getBigUint64(offset, true);
      offset += this.TOTAL_POINTS_SIZE;

      // Read history length
      const historyLength = view.getUint8(offset);
      offset += this.HISTORY_LENGTH_SIZE;

      // Read history entries
      const points24HoursHistory: IPointsHistory[] = [];
      for (let j = 0; j < historyLength; j++) {
        const timestamp = view.getBigUint64(offset, true);
        offset += this.TIMESTAMP_SIZE;

        const diff = view.getBigUint64(offset, true);
        offset += this.DIFF_SIZE;

        points24HoursHistory.push({
          timestamp: timestamp.toString(16).padStart(16, "0"),
          diff: diff.toString(16).padStart(16, "0"),
        });
      }

      result[pubkey] = {
        totalPoints: totalPoints.toString(16).padStart(16, "0"),
        points24HoursHistory,
      };
    }

    return result;
  }

  public static convertFileToBinary(
    jsonPath: string,
    binaryPath: string
  ): void {
    try {
      const jsonData = readFileSync(jsonPath, "utf8");
      const data: SwapPointsData = JSON.parse(jsonData);
      const binary = this.toBinary(data);
      writeFileSync(binaryPath, binary);
    } catch (error) {
      console.error("Error during file conversion:", error);
      throw error;
    }
  }

  public static convertBinaryToFile(
    binaryPath: string,
    jsonPath: string
  ): void {
    try {
      const binary = readFileSync(binaryPath);
      const data = this.fromBinary(new Uint8Array(binary));
      writeFileSync(jsonPath, JSON.stringify(data));
    } catch (error) {
      console.error("Error during file conversion:", error);
      throw error;
    }
  }

  public static readBinaryFile(binaryPath: string): SwapPointsData {
    try {
      const binary = readFileSync(binaryPath);
      const data = this.fromBinary(new Uint8Array(binary));
      return data;
    } catch (error) {
      console.error("Error during file conversion:", error);
      throw error;
    }
  }

  public static writeBinaryFile(
    binaryPath: string,
    data: SwapPointsData
  ): void {
    try {
      const binary = this.toBinary(data);
      writeFileSync(binaryPath, binary);
    } catch (error) {
      console.error("Error during file conversion:", error);
      throw error;
    }
  }
}
