import {PacketTransferContext} from "../DataTransferContext";

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export abstract class BasePacket<T> {
	/**
	 * Builds the transfer context for this packet.
	 * @param transfer The transfer context to build
	 * @param args Additional arguments to pass to the transfer context
	 */
	public abstract buildTransferContext(transfer: PacketTransferContext<T>, ...args: unknown[]): void;
}

export interface BasePacket<T> {
	id: number;
	transferContext: PacketTransferContext<T>;
}
