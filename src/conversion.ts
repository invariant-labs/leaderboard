import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { readFileSync, writeFileSync } from "fs";
import { IPointsJson, IPointsHistoryJson } from "./types";

export type PointsData = Record<string, IPointsJson>;

export class PointsBinaryConverter {
  // Constants for binary structure
  private static readonly PUBKEY_SIZE = 32;
  private static readonly TOTAL_POINTS_SIZE = 16;
  private static readonly POSITIONS_AMOUNT_SIZE = 4;
  private static readonly HISTORY_LENGTH_SIZE = 1;
  private static readonly TIMESTAMP_SIZE = 4;
  private static readonly DIFF_SIZE = 8;
  private static readonly HISTORY_ENTRY_SIZE =
    this.TIMESTAMP_SIZE + this.DIFF_SIZE;
  private static readonly ENTRY_HEADER_SIZE =
    this.PUBKEY_SIZE +
    this.TOTAL_POINTS_SIZE +
    this.POSITIONS_AMOUNT_SIZE +
    this.HISTORY_LENGTH_SIZE;

  public static toBinary(data: PointsData): Uint8Array {
    // Calculate total size with validation
    const entriesCount = Object.keys(data).length;
    const headerSize = 4;
    const entriesSize = entriesCount * this.ENTRY_HEADER_SIZE;
    const historiesSize = Object.values(data).reduce(
      (sum, entry) =>
        sum + entry.points24HoursHistory.length * this.HISTORY_ENTRY_SIZE,
      0
    );

    const totalSize = headerSize + entriesSize + historiesSize;
    if (totalSize > Number.MAX_SAFE_INTEGER) {
      throw new Error("Total binary size exceeds safe limits");
    }

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;

    // Write entries count
    view.setUint32(offset, entriesCount, true);
    offset += 4;

    // Write each entry
    for (const [pubkeyStr, entry] of Object.entries(data)) {
      try {
        // Write public key with validation
        const pubkey = new PublicKey(pubkeyStr);

        const pubkeyBytes = pubkey.toBytes();
        new Uint8Array(buffer, offset, this.PUBKEY_SIZE).set(pubkeyBytes);
        offset += this.PUBKEY_SIZE;

        // Write total points as u128
        const totalPoints = BigInt(`0x${entry.totalPoints}`);
        view.setBigUint64(
          offset,
          totalPoints & BigInt("0xFFFFFFFFFFFFFFFF"),
          true
        );
        view.setBigUint64(offset + 8, totalPoints >> BigInt(64), true);
        offset += this.TOTAL_POINTS_SIZE;

        // Write positions amount
        if (entry.positionsAmount > 0xffffffff) {
          throw new Error("Positions amount exceeds u32 maximum");
        }
        view.setUint32(offset, entry.positionsAmount, true);
        offset += this.POSITIONS_AMOUNT_SIZE;

        // Write history length with validation
        const historyLength = entry.points24HoursHistory.length;
        if (historyLength > 255) {
          throw new Error("History length exceeds u8 maximum");
        }
        view.setUint8(offset, historyLength);
        offset += this.HISTORY_LENGTH_SIZE;

        // Write history entries
        for (const history of entry.points24HoursHistory) {
          const timestamp = new BN(history.timestamp, 16).toNumber();
          const diff = BigInt(`0x${history.diff}`);

          view.setUint32(offset, timestamp, true);
          offset += this.TIMESTAMP_SIZE;

          view.setBigUint64(offset, diff, true);
          offset += this.DIFF_SIZE;
        }
      } catch (error) {
        throw new Error(
          `Error processing entry for pubkey ${pubkeyStr}: ${error}`
        );
      }
    }

    return new Uint8Array(buffer);
  }

  public static fromBinary(binary: Uint8Array): PointsData {
    if (binary.length < 4) {
      throw new Error("Invalid binary data: too short");
    }

    const view = new DataView(binary.buffer);
    let offset = 0;

    // Read entries count
    const entriesCount = view.getUint32(offset, true);
    offset += 4;

    // Validate total size
    const minimumSize = 4 + entriesCount * this.ENTRY_HEADER_SIZE;
    if (binary.length < minimumSize) {
      throw new Error(
        "Invalid binary data: insufficient size for declared entries"
      );
    }

    const result: PointsData = {};

    try {
      for (let i = 0; i < entriesCount; i++) {
        const pubkeyBytes = binary.slice(offset, offset + this.PUBKEY_SIZE);
        const pubkey = new PublicKey(pubkeyBytes).toBase58();

        offset += this.PUBKEY_SIZE;

        const totalPointsLow = view.getBigUint64(offset, true);
        const totalPointsHigh = view.getBigUint64(offset + 8, true);
        const totalPoints = (totalPointsHigh << BigInt(64)) | totalPointsLow;
        offset += this.TOTAL_POINTS_SIZE;

        const positionsAmount = view.getUint32(offset, true);
        offset += this.POSITIONS_AMOUNT_SIZE;

        const historyLength = view.getUint8(offset);
        offset += this.HISTORY_LENGTH_SIZE;

        const remainingSize = binary.length - offset;
        const requiredSize = historyLength * this.HISTORY_ENTRY_SIZE;
        if (remainingSize < requiredSize) {
          throw new Error(
            `Insufficient data for history entries at entry ${i}`
          );
        }

        const points24HoursHistory: IPointsHistoryJson[] = [];
        for (let j = 0; j < historyLength; j++) {
          const timestamp = view.getUint32(offset, true);
          offset += this.TIMESTAMP_SIZE;

          const diff = view.getBigUint64(offset, true);
          offset += this.DIFF_SIZE;

          points24HoursHistory.push({
            timestamp: timestamp.toString(16).padStart(8, "0"),
            diff: diff.toString(16).padStart(16, "0"),
          });
        }

        result[pubkey] = {
          totalPoints: totalPoints.toString(16).padStart(32, "0"),
          positionsAmount,
          points24HoursHistory,
        };
      }
    } catch (error) {
      throw new Error(
        `Error deserializing binary data at offset ${offset}: ${error}`
      );
    }

    return result;
  }

  public static convertFileToBinary(
    jsonPath: string,
    binaryPath: string
  ): void {
    try {
      const jsonData = readFileSync(jsonPath, "utf8");
      let data: PointsData;

      try {
        data = JSON.parse(jsonData);
      } catch (error) {
        throw new Error(`Invalid JSON format: ${error}`);
      }

      const binary = this.toBinary(data);

      writeFileSync(binaryPath, binary);

      const compressionRatio = (
        (binary.length / jsonData.length) *
        100
      ).toFixed(2);
      console.log("Conversion completed successfully:");
      console.log(`Input JSON size: ${jsonData.length.toLocaleString()} bytes`);
      console.log(
        `Output binary size: ${binary.length.toLocaleString()} bytes`
      );
      console.log(`Compression ratio: ${compressionRatio}%`);
    } catch (error) {
      console.error("Error during file conversion:", error);
      throw error;
    }
  }

  public static readBinaryFile(binaryPath: string): PointsData {
    try {
      const binary = readFileSync(binaryPath);
      return this.fromBinary(new Uint8Array(binary));
    } catch (error) {
      console.error("Error reading binary file:", error);
      throw error;
    }
  }

  public static writeBinaryFile(binaryPath: string, data: PointsData): void {
    try {
      const binary = this.toBinary(data);
      writeFileSync(binaryPath, binary);
    } catch (error) {
      console.error("Error writing binary file:", error);
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
      const jsonString = JSON.stringify(data);
      writeFileSync(jsonPath, jsonString);
    } catch (error) {
      console.error("Error during file conversion:", error);
      throw error;
    }
  }
}
