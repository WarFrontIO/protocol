import {PacketException} from "./util/PacketException";
import {PacketRegistry} from "./PacketRegistry";
import {GameActionPacket} from "./packet/game/GameActionPacket";
import {BasePacket} from "./packet/BasePacket";

export class DataTransferContext<T> {
	private staticLength: number = 0;
	private dynamicLength: ((obj: T) => number)[] = [];
	private readTasks: ((obj: T) => void)[] = [];
	private writeTasks: ((obj: T) => void)[] = [];

	/**
	 * Transfers a boolean property
	 * @param property The property to transfer
	 * @returns This transfer context for chaining
	 */
	boolean(property: PropertyOfType<T, boolean>): this {
		this.lock(property).boolean()
		return this;
	}

	/**
	 * Transfers a number property
	 * @param property The property to transfer
	 * @param bits The number of bits to use for the number
	 * @returns This transfer context for chaining
	 * @throws Error if bits is greater than 32
	 */
	number(property: PropertyOfType<T, number>, bits: number): this {
		this.lock(property).number(bits);
		return this;
	}

	/**
	 * Transfers a string property (utf-8)
	 * Any characters beyond maxLength will be ignored
	 * @param property The property to transfer
	 * @param maxLength The maximum length of the string (inclusive)
	 * @returns This transfer context for chaining
	 * @throws Error if maxLength is less than 1 or greater than 2^32
	 */
	string(property: PropertyOfType<T, string>, maxLength: number): this {
		this.lock(property).string(maxLength);
		return this;
	}

	/**
	 * Transfers an arbitrary object property
	 * Warning: Element only has the transferred properties, but e.g. no methods
	 * @param property The property to transfer
	 * @param buildTransferContext The function to build the transfer context for the object
	 * @returns This transfer context for chaining
	 */
	object(property: PropertyOfType<T, Record<string, unknown>>, buildTransferContext: (transfer: DataTransferContext<T[typeof property]>) => void): this {
		this.lock(property).object(buildTransferContext as unknown as (transfer: DataTransferContext<Record<string, unknown>>) => void);
		return this;
	}

	/**
	 * Transfers an arbitrary object property
	 * Warning: Element only has the transferred properties, but e.g. no methods
	 * @param property The property to transfer
	 * @returns The transfer context for the object
	 */
	objectChained(property: PropertyOfType<T, Record<string, unknown>>): DataTransferContext<T[typeof property]> {
		return this.lock(property).objectChained() as unknown as DataTransferContext<T[typeof property]>;
	}

	/**
	 * Transfers an array property
	 * @param property The property to transfer
	 * @param maxLength The maximum length of the array
	 * @returns The transfer context for the array
	 * @throws Error if maxLength is less than 1 or greater than 2^32
	 */
	array<P extends PropertyOfType<T, unknown[]>>(property: P, maxLength: number): LockedTransfer<UnrollArray<T[P]>> {
		return this.lock<unknown[]>(property).array(maxLength) as unknown as LockedTransfer<UnrollArray<T[P]>>;
	}

	/**
	 * Transfers a greedy array property
	 * This array does not have a maximum length and will be read until the end of the packet
	 * This needs to be the last property in the packet
	 * All elements must be larger than 8 bits (otherwise some elements might be missed at the end)
	 * @param property The property to transfer
	 */
	arrayGreedy<P extends PropertyOfType<T, unknown[]>>(property: P): LockedTransfer<UnrollArray<T[P]>> {
		return this.lock<unknown[]>(property).arrayGreedy() as unknown as LockedTransfer<UnrollArray<T[P]>>;
	}

	/**
	 * Transfers an optional property, essentially prepends a boolean on whether the property is present
	 * @param property The property to transfer
	 * @returns The transfer context for the property
	 */
	optional<P extends PropertyAccepting<T, undefined> & string>(property: P): LockedTransfer<Exclude<T[P], undefined>> {
		return this.lock(property).optional() as unknown as LockedTransfer<Exclude<T[P], undefined>>;
	}

	/**
	 * Transfers a packet as inline data
	 */
	inlinePacket<R>(packetRegistry: PacketRegistry<R>): void {
		this.readTasks.push((obj: T) => {
			const id = packetRegistry.reverseActionId(readBits(packetRegistry.getActionTypeBits()));
			packetRegistry.getTransferContext(packetRegistry.reverseActionId(id)).deserialize(obj);
			//Restore required packet id, needed to identify the packet
			(obj as BasePacket<unknown>).id = id;
		});

		this.writeTasks.push((obj: T) => {
			if (!(obj as GameActionPacket<unknown>).transferContext || (obj as GameActionPacket<unknown>).actionId === undefined) {
				throw new PacketException("Packet transfer context or ID is not set");
			}
			writeBits(packetRegistry.getActionTypeBits(), (obj as GameActionPacket<unknown>).actionId);
			(obj as GameActionPacket<unknown>).transferContext.serializeInternal(obj as GameActionPacket<unknown>);
		});

		this.dynamicLength.push((obj: T) => {
			if (!(obj as GameActionPacket<unknown>).transferContext) {
				throw new PacketException("Packet transfer context is not set");
			}
			return packetRegistry.getActionTypeBits() + (obj as GameActionPacket<unknown>).transferContext.getLength(obj as GameActionPacket<unknown>);
		});
	}

	/**
	 * Locks a property for transfer
	 * This encapsulates the property and allows for chaining of transfer methods for that property
	 * @param property The property to transfer
	 * @returns The locked transfer context
	 */
	private lock<R>(property: PropertyOfType<T, R>): LockedTransfer<R> {
		// eslint-disable-next-line @typescript-eslint/no-this-alias -- This can't be converted into an arrow function...
		const parent = this;
		return new class {
			// noinspection JSUnusedGlobalSymbols -- This is used (by type casting)
			/**
			 * Allows switching the property to transfer without creating a new transfer context
			 * This method is only accessible using type casting
			 * @param newProperty The new property to transfer
			 * @internal
			 */
			switchProperty(newProperty: PropertyOfType<T, R>): void {
				property = newProperty;
			}

			boolean() {
				parent.readTasks.push((obj: T) => {
					obj[property] = (readBits(1) === 1) as T[typeof property]
				});

				parent.writeTasks.push((obj: T) => {
					writeBits(1, obj[property] ? 1 : 0);
				});

				parent.staticLength++;
			}

			number(bits: number) {
				if (bits > 32) throw new Error("Cannot write more than 32 bits at a time");

				parent.readTasks.push((obj: T) => {
					obj[property] = readBits(bits) as T[typeof property];
				});

				parent.writeTasks.push((obj: T) => {
					writeBits(bits, obj[property] as number);
				});

				parent.staticLength += bits;
			}

			//TODO: The following should be restricted (and as such compressed) to the allowed character ranges
			string(maxLength: number) {
				if (maxLength < 1) throw new Error("Cannot write strings of length 0 or less"); // This breaks the index length calculation
				if (maxLength >= 2 ** 32) throw new Error("Cannot write strings longer than 2^32 characters"); // yeah, I don't think this is a limitation in practice
				const indexLength = Math.floor(Math.log2(maxLength)) + 1;

				parent.readTasks.push((obj: T) => {
					const max = Math.min(maxLength, readBits(indexLength));
					tryAllocate(max * 8);
					let value = "";
					for (let i = 0; i < max; i++) {
						value += String.fromCharCode(readBits(8));
					}
					obj[property] = value as T[typeof property];
				});

				parent.writeTasks.push((obj: T) => {
					const value = obj[property] as string;
					const max = Math.min(maxLength, value.length);
					writeBits(indexLength, max);
					for (let i = 0; i < max; i++) {
						writeBits(8, value.charCodeAt(i));
					}
				});

				parent.staticLength += indexLength;
				parent.dynamicLength.push((obj: T) => Math.min(maxLength, (obj[property] as string).length) * 8);
			}

			objectChained(): DataTransferContext<R> {
				const child = new DataTransferContext<R>();
				parent.readTasks.push((obj: T) => {
					const element = {} as R;
					child.deserialize(element);
					obj[property] = element as T[typeof property];
				});

				parent.writeTasks.push((obj: T) => {
					child.serializeInternal(obj[property] as R);
				});

				parent.dynamicLength.push((obj: T) => child.getLength(obj[property] as R));
				return child;
			}

			object(buildTransferContext: (transfer: DataTransferContext<R>) => void) {
				buildTransferContext(this.objectChained());
				return this;
			}

			array(maxLength: number): LockedTransfer<UnrollArray<R>> {
				if (maxLength < 1) throw new Error("Cannot write arrays of length 0 or less");
				if (maxLength >= 2 ** 32) throw new Error("Cannot write arrays longer than 2^32 elements");
				const indexLength = Math.floor(Math.log2(maxLength)) + 1;

				const child = new DataTransferContext<R>();
				const locked = child.lock<UnrollArray<R>>(undefined as unknown as PropertyOfType<R, UnrollArray<R>>) as LockedTransfer<UnrollArray<R>> & { switchProperty: (newProperty: PropertyOfType<R, UnrollArray<R>>) => void };
				parent.readTasks.push((obj: T) => {
					const max = Math.min(maxLength, readBits(indexLength));
					const array = new Array(max) as R;
					for (let i = 0; i < max; i++) {
						locked.switchProperty(i as unknown as PropertyOfType<R, UnrollArray<R>>);
						child.deserialize(array);
					}
					obj[property] = array as T[typeof property];
				});

				parent.writeTasks.push((obj: T) => {
					const value = obj[property] as R & unknown[];
					const max = Math.min(maxLength, value.length);
					writeBits(indexLength, max);
					for (let i = 0; i < max; i++) {
						locked.switchProperty(i as unknown as PropertyOfType<R, UnrollArray<R>>);
						child.serializeInternal(value);
					}
				});

				parent.staticLength += indexLength;
				parent.dynamicLength.push((obj: T) => {
					const value = obj[property] as R & UnrollArray<R>[];
					return value.reduce((sum, _element, i) => {
						if (i >= maxLength) {
							return sum;
						}
						locked.switchProperty(i as unknown as PropertyOfType<R, UnrollArray<R>>);
						return sum + child.getLength(value);
					}, 0);
				});
				return locked;
			}

			arrayGreedy(): LockedTransfer<UnrollArray<R>> {
				const child = new DataTransferContext<R>();
				const locked = child.lock<UnrollArray<R>>(undefined as unknown as PropertyOfType<R, UnrollArray<R>>) as LockedTransfer<UnrollArray<R>> & { switchProperty: (newProperty: PropertyOfType<R, UnrollArray<R>>) => void };
				parent.readTasks.push((obj: T) => {
					const array = [] as R;
					for (let i = 0; offset < (buffer.length - 1) << 3; i++) {
						locked.switchProperty(i as unknown as PropertyOfType<R, UnrollArray<R>>);
						child.deserialize(array);
					}
					obj[property] = array as T[typeof property];
				});

				parent.writeTasks.push((obj: T) => {
					const value = obj[property] as R & unknown[];
					for (let i = 0; i < value.length; i++) {
						locked.switchProperty(i as unknown as PropertyOfType<R, UnrollArray<R>>);
						child.serializeInternal(value);
					}
				});

				parent.dynamicLength.push((obj: T) => {
					const value = obj[property] as R & UnrollArray<R>[];
					return value.reduce((sum, _element, i) => {
						locked.switchProperty(i as unknown as PropertyOfType<R, UnrollArray<R>>);
						return sum + child.getLength(value);
					}, 0);
				});
				return locked;
			}

			optional(): LockedTransfer<Exclude<R, undefined>> {
				//This transfer will only be called when the property is present
				const child = new DataTransferContext<ForcePropertyDefined<T, typeof property>>();
				parent.readTasks.push((obj: T) => {
					if (readBits(1) === 1) {
						child.deserialize(obj as ForcePropertyDefined<T, typeof property>);
					} else {
						obj[property] = undefined as T[typeof property];
					}
				});

				parent.writeTasks.push((obj: T) => {
					if (obj[property] !== undefined) {
						writeBits(1, 1);
						child.serializeInternal(obj as ForcePropertyDefined<T, typeof property>);
					} else {
						writeBits(1, 0);
					}
				});

				parent.staticLength++;
				parent.dynamicLength.push((obj: T) => obj[property] !== undefined ? child.getLength(obj as ForcePropertyDefined<T, typeof property>) : 0);
				return child.lock<Exclude<R, undefined>>(property as unknown as PropertyOfType<ForcePropertyDefined<T, typeof property>, Exclude<R, undefined>>);
			}
		};
	}

	/**
	 * Serializes the packet
	 * @param packet The packet to compress (must be of the same type as this transfer was built for)
	 * @param packetRegistry The packet registry to use
	 * @returns The compressed packet
	 */
	serialize<F extends BasePacket<F>, R>(packet: T & F, packetRegistry: PacketRegistry<R>): Uint8Array {
		buffer = new Uint8Array((packetRegistry.getPacketTypeBits() + this.getLength(packet) + 7) >>> 3);
		offset = 0;
		writeBits(packetRegistry.getPacketTypeBits(), packet.id);
		this.serializeInternal(packet);
		return buffer;
	}

	/**
	 * Serializes a transfer object
	 * @param obj The object to compress
	 * @private
	 */
	private serializeInternal(obj: T): void {
		this.writeTasks.forEach((task) => task(obj));
	}

	/**
	 * Deserializes a transfer object
	 * @param obj The object to fill
	 * @private
	 */
	deserialize(obj: T): void {
		tryAllocate(this.staticLength);
		this.readTasks.forEach((task) => task(obj));
	}

	/**
	 * Gets the length of the packet in bits
	 * @returns The length of the packet in bits
	 * @private
	 */
	private getLength(obj: T): number {
		return this.staticLength + this.dynamicLength.reduce((sum, length) => sum + length(obj), 0);
	}
}

export type PacketTransferContext<T> = DataTransferContext<Omit<T, "id" | "transferContext" | "buildTransferContext" | "actionId">>;

/**
 * Deserializes the packet from a compressed packet
 *
 * Huge Warning: The returned packet will not actually be an instance of the packet class,
 * only the properties and a handle method will be set.
 *
 * @param data The compressed packet
 * @param packetRegistry The packet registry to use
 * @returns The deserialized packet
 * @throws PacketException if the packet is too short
 */
export function deserializePacket<T>(data: Uint8Array, packetRegistry: PacketRegistry<T>): { handle: (client: T) => void } {
	buffer = data;
	offset = 0;
	allocatedLength = 0;

	tryAllocate(packetRegistry.getPacketTypeBits());
	const id = readBits(packetRegistry.getPacketTypeBits());
	const context = packetRegistry.getTransferContext(id);

	const packet = {} as { handle: (client: T) => void };
	context.deserialize(packet);

	packet.handle = packetRegistry.getPacketHandler(id);
	return packet;
}

type PropertyOfType<T, R> = {
	[K in keyof T]: T[K] extends R ? K : never;
}[keyof T] & string;

type PropertyAccepting<T, R> = {
	[K in keyof T]: R extends T[K] ? K : never;
}[keyof T];

type ForcePropertyDefined<T, K extends keyof T> = {
	[P in keyof T]: P extends K ? Exclude<T[P], undefined> : T[P];
};

type UnrollArray<T> = T extends (infer U)[] ? U : never;

interface LockedBooleanTransfer {
	/**
	 * Transfers a boolean property
	 */
	boolean(): void;
}

interface LockedNumberTransfer {
	/**
	 * Transfers a number property
	 * @param bits The number of bits to use for the number
	 * @throws Error if bits is greater than 32
	 */
	number(bits: number): void;
}

interface LockedStringTransfer {
	/**
	 * Transfers a string property (utf-8)
	 * Any characters beyond maxLength will be ignored
	 * @param maxLength The maximum length of the string (inclusive)
	 * @throws Error if maxLength is less than 1 or greater than 2^32
	 */
	string(maxLength: number): void;
}

interface LockedObjectTransfer<R> {
	/**
	 * Transfers an arbitrary object property
	 * Warning: Element only has the transferred properties, but e.g. no methods
	 * @returns The transfer context for the object
	 */
	objectChained(): DataTransferContext<R>;

	/**
	 * Transfers an arbitrary object property
	 * Warning: Element only has the transferred properties, but e.g. no methods
	 * @param buildTransferContext The function to build the transfer context for the object
	 * @param buildTransferContext
	 */
	object(buildTransferContext: (transfer: DataTransferContext<R>) => void): void;
}

interface LockedArrayTransfer<R> {
	/**
	 * Transfers an array property
	 * @param maxLength The maximum length of the array
	 * @returns The transfer context for the array
	 * @throws Error if maxLength is less than 1 or greater than 2^32
	 */
	array(maxLength: number): LockedTransfer<UnrollArray<R>>;

	/**
	 * Transfers a greedy array property
	 * This array does not have a maximum length and will be read until the end of the packet
	 * This needs to be the last property in the packet
	 * All elements must be larger than 8 bits (otherwise some elements might be missed at the end)
	 * @returns The transfer context for the array
	 */
	arrayGreedy(): LockedTransfer<UnrollArray<R>>;
}

interface LockedOptionalTransfer<R> {
	/**
	 * Transfers an optional property, essentially prepends a boolean on whether the property is present
	 * @returns The transfer context for the property
	 */
	optional(): LockedTransfer<Exclude<R, undefined>>;
}

type LockedTransfer<R> =
	(R extends boolean ? LockedBooleanTransfer : {}) &
	(R extends number ? LockedNumberTransfer : {}) &
	(R extends string ? LockedStringTransfer : {}) &
	([R] extends [Record<keyof R, unknown> & { length?: never }] ? LockedObjectTransfer<R> : {}) & //Hack to not handle each union type separately
	({ [T in keyof R]: R[T] } extends unknown[] ? LockedArrayTransfer<R> : {}) &
	(undefined extends R ? LockedOptionalTransfer<R> : {}); //This is intentionally the other way around

let buffer: Uint8Array;
let offset: number;
let allocatedLength: number;

/**
 * Marks a number of bits as required
 * @param length number of bits to allocate
 * @throws PacketException if the buffer is too short
 */
function tryAllocate(length: number) {
	allocatedLength += length;
	if (allocatedLength > buffer.length << 3) throw new PacketException("Buffer is too short");
}

/**
 * Warning: JavaScript bitwise operations are limited to 32 bits
 * Note: We use Little-endian bit order
 *
 * The following functions do not check for length or buffer bounds,
 * as they are only called internally and the length is known beforehand
 */

/**
 * Reads a number of bits from the buffer
 * @param length number of bits to read, must be less than or equal to 32
 * @returns number of value read
 * @internal
 */
function readBits(length: number): number {
	let value = 0;
	for (let i = offset; i < offset + length; i++) {
		value |= ((buffer[i >>> 3] >>> (~i & 7)) & 1) << i - offset;
	}
	offset += length;
	return value >>> 0;
}

/**
 * Writes a number of bits to the buffer
 * @param length number of bits to write, must be less than or equal to 32
 * @param value number to write
 * @internal
 */
function writeBits(length: number, value: number) {
	for (let i = offset; i < offset + length; i++) {
		buffer[i >>> 3] |= ((value >>> i - offset) & 1) << (~i & 7);
	}
	offset += length;
}